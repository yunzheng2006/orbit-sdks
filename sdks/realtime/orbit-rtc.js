/* Orbit Realtime SDK 1.3.0 — https://orbit.yunzheng.space/docs/realtime/ */
(function (global) {
  'use strict';
  var VERSION = "1.3.0";
  var DEFAULT_API = "https://rtc.yunzheng.space";
  // The appdata the node reads as "this m-line is a shared screen". One word,
  // in one place, on both sides (screenAppData in mediad/sfu.go).
  var SCREEN = 'screen';
  // The three encodings a camera is published as, LOWEST FIRST — which is not
  // a style choice: browsers require sendEncodings in ascending resolution and
  // reject the offer otherwise. The names are the node's (layer.go) and the
  // bitrates are what each resolution is worth: a quarter-size picture given
  // 1.5 Mbit/s would spend a phone's uplink on detail nobody can see at that
  // size.
  var LAYERS = ['q', 'h', 'f'];
  function simulcastEncodings() {
    return [
      { rid: 'q', scaleResolutionDownBy: 4, maxBitrate: 150000 },
      { rid: 'h', scaleResolutionDownBy: 2, maxBitrate: 500000 },
      { rid: 'f', scaleResolutionDownBy: 1, maxBitrate: 1500000 }
    ];
  }

  function noop() {}
  function fnOf(f) { return typeof f === 'function' ? f : noop; }

  // The node speaks HTTPS on its own port, not 443: 443 on every point of
  // presence is already the content edge. A browser does not care about the
  // port, and putting media on its own keeps a media node's restart from
  // touching anything a website depends on.
  //
  // The port comes from the join, not from here. Which ports are free is a
  // property of the machine — the second node already had something on 8443 —
  // and 8443 remains the default only so a control plane that has not been
  // updated still works.
  function nodeURL(host, port, path) { return 'https://' + host + ':' + (port || 8443) + path; }

  function post(url, body, timeoutMs) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, timeoutMs || 15000) : 0;
    return fetch(url, {
      method: 'POST', mode: 'cors', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) {}
        if (!r.ok) {
          var err = new Error((j && (j.message || j.error)) || ('HTTP ' + r.status));
          err.code = (j && j.error) || String(r.status);
          err.status = r.status;
          throw err;
        }
        return j || {};
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      var err = new Error(e && e.name === 'AbortError' ? 'The request timed out.' : 'The network request did not complete.');
      err.code = 'network';
      throw err;
    });
  }

  // A request to the media node carrying the join token.
  //
  // The SAME token the handshake used, presented again — the node answers
  // these two endpoints only while the connection that token names is still
  // open, which is what bounds them (parseJoin in mediad/token.go). There is
  // no second credential to hold and nothing extra to leak.
  function nodeAsk(self, method, path, body) {
    var headers = { 'Authorization': 'Bearer ' + (self._token || '') };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(nodeURL(self.mediaHost, self.mediaPort, path), {
      method: method, mode: 'cors', credentials: 'omit', headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status);
        err.status = r.status;
        throw err;
      }
      if (r.status === 204) return {};
      return r.text().then(function (t) {
        try { return JSON.parse(t) || {}; } catch (e) { return {}; }
      });
    });
  }

  // A placeholder picture, so that the share m-line exists in the offer with
  // an msid and an SSRC on it.
  //
  // This is the one piece of this file that looks like a trick and is not. A
  // sendonly transceiver with NO track attached is offered without those
  // lines, and without them the node has nothing to read the mark off and no
  // SSRC to bind when media finally starts — the share would arrive as an
  // unannounced stream on an m-line nobody claimed. So a 2x2 canvas is
  // attached for as long as it takes to create the offer, and released the
  // moment the offer has been read: nothing is captured, nothing is sent,
  // and the sender keeps the identity the node was told about.
  function dummyVideo(global) {
    try {
      var doc = global.document;
      if (!doc || typeof doc.createElement !== 'function') return null;
      var canvas = doc.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      if (typeof canvas.captureStream !== 'function') return null;
      var stream = canvas.captureStream(1);
      var tracks = stream.getVideoTracks ? stream.getVideoTracks() : [];
      return tracks.length ? tracks[0] : null;
    } catch (e) { return null; }
  }

  // Mark one m-line as the share.
  //
  // The browser picks the msid's appdata (it is the track's own id, a GUID)
  // and there is no API to choose it, so the copy of the offer that goes to
  // the NODE has it rewritten — the local description is untouched, and the
  // node's whole reading of "which of these is a screen" is this one word.
  // A transceiver whose mid cannot be found is left exactly as it was: an
  // offer this function could not understand must not be an offer it edits.
  function markShare(sdp, mid) {
    if (!sdp || mid === null || mid === undefined) return sdp;
    var eol = sdp.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    var lines = sdp.split(/\r?\n/);
    var out = [], inSection = false, mine = false, i;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('m=') === 0) {
        inSection = true;
        mine = false;
      } else if (inSection && line.indexOf('a=mid:') === 0) {
        mine = line.slice(6).trim() === String(mid);
      }
      if (mine) {
        if (line.indexOf('a=msid:') === 0) {
          line = 'a=msid:' + line.slice(7).trim().split(/\s+/)[0] + ' ' + SCREEN;
        } else if (line.indexOf('a=ssrc:') === 0 && line.indexOf(' msid:') > 0) {
          var parts = line.split(/\s+/);
          if (parts.length >= 3) line = parts[0] + ' ' + parts[1] + ' ' + SCREEN;
        }
      }
      out.push(line);
    }
    return out.join(eol);
  }

  function Session(opts) {
    this.opts = opts;
    this.api = (opts.api || DEFAULT_API).replace(/\/+$/, '');
    this.state = 'new';
    this.pc = null;
    this.local = null;
    this.peerId = null;
    this.mediaHost = null;
    this.mediaPort = 0;
    this.room = null;
    // What the token was signed to permit, REPORTED by the join and never
    // decided here. 'rw' publishes and receives, 'ro' only receives.
    this.perm = 'rw';
    this.readonly = false;
    // The shared screen. canShare is the ROOM's answer and not this page's
    // wish: a button that is enabled where the seat may not publish one is a
    // button that fails at the moment somebody needs it.
    this.canShare = false;
    this.sharing = false;
    this.screen = null;
    // What the room told this page to use to reach the media, when there is
    // anything — a relay for the seats that cannot dial out directly. Empty
    // is the direct-only behaviour every version before this one had.
    this.iceServers = [];
    this.onState = fnOf(opts.onState);
    this.onTrack = fnOf(opts.onTrack);
    this.onScreen = fnOf(opts.onScreen);
    this.onBinding = fnOf(opts.onBinding);
    this.onError = fnOf(opts.onError);
    this.senders = { audio: null, video: null, screen: null };
    this._shareTx = null;    // the sendonly m-line this page shares on
    this._screenTx = null;   // ...and the recvonly one it receives a share on
    this._dummy = null;
    this._token = '';
    // mid -> who is on that slot, and mid -> what onTrack was last given for
    // it. Two maps rather than one because a slot is announced before
    // anybody is bound to it, and is bound and released again many times in
    // a long call.
    this._bind = {};
    this._tiles = {};
    this._layer = {};
    this._binding = null;    // a bindings request in flight
    this._bindAgain = false;
  }

  Session.prototype._to = function (s, detail) {
    if (this.state === 'closed' && s !== 'closed') return;
    this.state = s;
    try { this.onState(s, detail || null); } catch (e) {}
  };

  Session.prototype._fail = function (e) {
    this._to('failed', e);
    try { this.onError(e); } catch (x) {}
    throw e;
  };

  // How many people this peer may hear and see.
  //
  // One slot per OTHER participant, decided before the offer is built because
  // it is the m-line count and an m-line cannot be added later without a
  // renegotiation this product deliberately does not do. Rooms are small by
  // design; a room that needs hundreds of listeners is a broadcast, and a
  // broadcast is Orbit Stream.
  Session.prototype._slots = function (join) {
    var room = join.room || {};
    var peers = Math.max(2, Math.min(50, Number(room.max_peers) || 10));
    // One slot per OTHER participant — except for an observer, which is not
    // one of them: a watcher given max_peers-1 slots in a full room would be
    // missing exactly one person, and never the same one twice.
    var audio = Math.max(1, Math.min(49, this.readonly ? peers : peers - 1));
    var vmax = Number(room.max_video) || 0;
    var video = this.opts.video === false ? 0 : Math.max(0, Math.min(audio, vmax ? vmax : 0));
    // The screen slot count comes from the JOIN, not from the room summary:
    // it is the control plane saying this room can carry a share at all, and
    // an older control plane that does not send it asks for none — which is
    // exactly the node 1.1 clients talk to.
    var screen = Math.max(0, Math.min(1, Number(join.sslots) || 0));
    // ...and publishing one is asked for by the page AND allowed by the seat.
    var share = screen > 0 && join.share === true && !this.readonly && this.opts.screen === true;
    return { audio: audio, video: video, screen: screen, share: share };
  };

  // Where the token comes from. Two doors, per the design:
  //   - the public one: this SDK asks the join endpoint with a room key, and
  //     whoever holds the key may ask;
  //   - the backend one: the application's own server minted the token (it
  //     decided who this person is, and whether they may only watch) and
  //     hands the WHOLE join reply over through fetchJoin.
  Session.prototype._join = function () {
    var self = this;
    if (typeof self.opts.fetchJoin === 'function') {
      return Promise.resolve(self.opts.fetchJoin()).then(function (j) {
        if (!j || !j.token || !j.media_host) {
          var e = new Error('This call could not be opened.');
          e.code = 'no-token';
          throw e;
        }
        return j;
      });
    }
    return post(self.api + '/api/join', {
      room: self.opts.room,
      label: self.opts.label || '',
      passcode: self.opts.passcode || '',
      verify_token: self.opts.verifyToken || self.opts.verify_token || '',
      want_video: self.opts.video === true
    });
  };

  Session.prototype.connect = function () {
    var self = this;
    if (self.state !== 'new') return Promise.reject(new Error('This session has already been used.'));
    self._to('joining');
    return self._join().then(function (j) {
      self.room = j.room || {};
      self.peerId = j.peer_id;
      self.mediaHost = j.media_host;
      self.mediaPort = j.media_port || 8443;
      // The reply REPORTS what was signed. It is read rather than asked for:
      // an unknown word is not a permission this client invents a meaning
      // for, so anything that is not 'ro' is an ordinary participant and the
      // node is the thing that has the final say either way.
      self.perm = j.perm === 'ro' ? 'ro' : 'rw';
      self.readonly = self.perm === 'ro';
      self._token = j.token || '';
      // Passed to the browser as it stands, and validated only for shape:
      // which relays exist, on which ports, with which credential, is the
      // room's answer and not this file's. An older control plane sends
      // nothing and the connection is exactly what it was.
      self.iceServers = Array.isArray(j.ice_servers) ? j.ice_servers : [];
      var want = self._slots(j);
      self.canShare = want.share;
      return self._openMedia(want).then(function () { return { j: j, want: want }; });
    }).then(function (ctx) {
      return self._offer(ctx.j.token, ctx.want);
    }).then(function () {
      // The detail says which seat this is, on the one transition every page
      // already listens to. A page that only ever renders participants keeps
      // working; a page that wants to say "watching" has somewhere to read it.
      self._to('connecting', { perm: self.perm, readonly: self.readonly });
      return self;
    }, function (e) { return self._fail(e); });
  };

  Session.prototype._openMedia = function (want) {
    var self = this;
    // An observer opens nothing. Asking for a microphone and then not sending
    // it would put a recording indicator in front of somebody who is watching,
    // and leave a track on the page that one later line could attach.
    if (self.readonly) { self.local = null; return Promise.resolve(); }
    var wantAudio = self.opts.audio !== false;
    var wantVideo = self.opts.video === true;
    if (!wantAudio && !wantVideo) { self.local = null; return Promise.resolve(); }
    if (!global.navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var e = new Error('This browser cannot capture a microphone or camera on this page. A secure (https) page is required.');
      e.code = 'no-capture';
      return Promise.reject(e);
    }
    return navigator.mediaDevices.getUserMedia({
      audio: wantAudio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      video: wantVideo ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } : false
    }).then(function (stream) { self.local = stream; }, function (err) {
      var e = new Error(err && err.name === 'NotAllowedError'
        ? 'Microphone or camera access was not granted.'
        : 'No microphone or camera is available on this device.');
      e.code = 'no-device';
      throw e;
    });
  };

  Session.prototype._offer = function (token, want) {
    var self = this;
    // Usually none, and that is still the design: the node publishes one
    // public address as its only candidate, so the browser dials outward and
    // the reply comes back through the mapping its own NAT just created. A
    // STUN round trip would add a dependency and buy nothing.
    //
    // What the room may add is a RELAY, for the seats that cannot dial out at
    // all — a corporate network with UDP blocked, where every call before this
    // simply failed. It costs nothing when it is not needed: the browser
    // prefers the direct candidate and only falls back.
    var pc = new RTCPeerConnection({ iceServers: self.iceServers || [], bundlePolicy: 'max-bundle' });
    self.pc = pc;

    // onTrack(stream, info).
    //
    // The first argument is something you can attach to an element without
    // building anything, because that is what nearly every caller does with it
    // and a callback whose first argument needs unwrapping is a callback people
    // get wrong once each. info carries the rest: the track itself, its kind,
    // whether media is arriving on it right now, the m-line it came in on
    // ('mid') and WHOSE it is ('peer_id', or null while nobody is bound to
    // that slot and on a browser that does not report the transceiver).
    //
    // peer_id can arrive after the track does — the node is asked separately —
    // so this callback fires again for the same track when the name lands.
    pc.ontrack = function (ev) {
      var stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
      // The screen slot, by the transceiver this session reserved for it —
      // and, for a browser that does not put the transceiver on the event, by
      // the stream the node gives only to that slot.
      var shared = (self._screenTx && ev.transceiver === self._screenTx)
        || (stream && typeof stream.id === 'string' && /-screen$/.test(stream.id));
      // The m-line this track arrived on, which is the one name this page and
      // the node can both use for a slot: the node allocated it, the browser
      // reports it here, and /rtc/bindings answers in the same currency. A
      // browser that does not put the transceiver on the event leaves it
      // null, and the peer id stays null with it — a missing name, never a
      // wrong one.
      var mid = (ev.transceiver && ev.transceiver.mid != null) ? String(ev.transceiver.mid) : null;
      var info = { track: ev.track, kind: ev.track.kind, screen: !!shared, streams: ev.streams,
        live: !ev.track.muted, mid: mid, peer_id: mid ? (self._bind[mid] || null) : null };
      if (mid) self._tiles[mid] = { stream: stream, info: info };
      var fire = function () {
        try { self.onTrack(stream, info); } catch (e) {}
        if (!shared) return;
        // onScreen(peerId, track). The peer id is null and that is not an
        // omission: the node never says WHOSE share this is — there is no
        // channel for it to say anything on — so the only honest answer is
        // "somebody is sharing". A page that needs the name has it from its
        // own application, which is where names live in this product.
        //
        // Only on a CHANGE. The screen slot is announced when the connection
        // comes up, carrying nothing, exactly like every other unbound slot;
        // reporting that as "the share stopped" would have every call begin
        // by ending a share nobody started.
        var now = info.live ? ev.track : null;
        if (now === self.screen) return;
        self.screen = now;
        try { self.onScreen(null, now); } catch (e) {}
      };
      fire();
      // A receive slot the server has not bound to anybody yet is a live track
      // that carries nothing. It is announced anyway, with live:false, so a
      // page can decide whether to show a tile for it; when somebody is bound
      // to it the callback fires again with live:true.
      //
      // Those two transitions are also the ONLY moments a slot changes hands
      // — the node binds a publisher into a free slot and the track unmutes,
      // it releases one and the track mutes — so they are where the bindings
      // are re-read. Polling would be a request every few seconds for a
      // question whose answer almost never changes.
      ev.track.onunmute = function () { info.live = true; fire(); self._bindings(); };
      ev.track.onmute = function () { info.live = false; fire(); self._bindings(); };
    };
    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === 'connected') self._to('connected');
      else if (s === 'failed') self._to('failed', new Error('The media connection could not be established.'));
      else if (s === 'disconnected') self._to('reconnecting');
      else if (s === 'closed') self._to('closed');
    };

    // Send first, then the receive slots. The order is the m-line order, and
    // the node fills the receive m-lines in the order it sees them.
    var i, tracks = self.local ? self.local.getTracks() : [];
    for (i = 0; i < tracks.length; i++) {
      var init = { direction: 'sendonly', streams: self.local ? [self.local] : [] };
      // The CAMERA, three times. Not the microphone (Opus is 40 kbit/s and
      // there is nothing to choose between) and not the share, which is one
      // picture of a document that everybody needs legible.
      //
      // A fresh array each time: browsers take ownership of the encodings
      // they are given. simulcast:false is here for the page that knows its
      // room is two people on a desk and would rather spend the uplink once.
      if (tracks[i].kind === 'video' && self.opts.simulcast !== false) init.sendEncodings = simulcastEncodings();
      var tr = pc.addTransceiver(tracks[i], init);
      self.senders[tracks[i].kind] = tr.sender;
    }
    // The share m-line, reserved whether or not anything is being shared yet.
    // This is the entire reason starting a share later costs no
    // renegotiation: the m-line a share needs cannot be added afterwards, so
    // it is offered now and filled with replaceTrack when somebody clicks.
    if (want.share) {
      self._dummy = dummyVideo(global);
      self._shareTx = self._dummy
        ? pc.addTransceiver(self._dummy, { direction: 'sendonly' })
        : pc.addTransceiver('video', { direction: 'sendonly' });
      self.senders.screen = self._shareTx.sender;
    }
    for (i = 0; i < want.audio; i++) pc.addTransceiver('audio', { direction: 'recvonly' });
    for (i = 0; i < want.video; i++) pc.addTransceiver('video', { direction: 'recvonly' });
    // ...and the screen slot last of all, matching the order the node adds
    // its own tracks in. Its identity is kept so an arriving share can be
    // told from a ninth camera.
    for (i = 0; i < want.screen; i++) self._screenTx = pc.addTransceiver('video', { direction: 'recvonly' });

    return pc.createOffer().then(function (offer) {
      return pc.setLocalDescription(offer);
    }).then(function () {
      return self._gathered(pc);
    }).then(function () {
      var sdp = pc.localDescription.sdp;
      if (self._shareTx) {
        sdp = markShare(sdp, self._shareTx.mid);
        // The placeholder has done its work the moment the offer is read.
        // Releasing it here rather than later is what makes "joined with
        // sharing available" and "sharing" two different states on the wire
        // instead of a black rectangle everybody can see.
        self._stopDummy();
      }
      return post(nodeURL(self.mediaHost, self.mediaPort, '/rtc/join'), {
        token: token,
        // An observer has no name at the node. It is not in the room's
        // participant list, so a label could only ever end up somewhere it
        // was not meant to be.
        label: self.readonly ? '' : (self.opts.label || ''),
        slots: want.audio,
        vslots: want.video,
        sslots: want.screen,
        sdp: sdp
      }, 20000);
    }).then(function (ans) {
      return pc.setRemoteDescription({ type: 'answer', sdp: ans.sdp });
    }).then(function () {
      // Once, at join. Most slots are empty at this moment, but somebody
      // already speaking when this page arrives is bound before its first
      // unmute fires, and would otherwise sit unlabelled until they stopped.
      self._bindings();
    });
  };

  // Who is on each of this connection's own receive slots.
  //
  // Resolves to the node's answer — [{mid, kind, peer_id}] — and updates what
  // onTrack reports on the way past. Failures are swallowed on purpose: a
  // page whose tiles lose their names is worse than one whose tiles have no
  // names, and neither is a reason to end a call.
  Session.prototype.bindings = function () { return this._bindings(); };

  Session.prototype._bindings = function () {
    var self = this;
    if (!self._token || !self.mediaHost || self.state === 'closed') return Promise.resolve([]);
    // One request at a time. Nine tracks unmuting in the same tick is nine
    // calls to this and one question; the last of them is answered after the
    // one in flight, so the answer cannot be older than the event.
    if (self._binding) { self._bindAgain = true; return self._binding; }
    self._binding = nodeAsk(self, 'GET', '/rtc/bindings', null).then(function (j) {
      self._binding = null;
      var slots = (j && j.slots) || [];
      self._applyBindings(slots);
      if (self._bindAgain) { self._bindAgain = false; self._bindings(); }
      return slots;
    }, function () { self._binding = null; return []; });
    return self._binding;
  };

  Session.prototype._applyBindings = function (slots) {
    var self = this;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i] || {};
      if (s.mid === null || s.mid === undefined) continue;
      var mid = String(s.mid);
      var who = s.peer_id || null;
      if ((self._bind[mid] || null) === who) continue;
      self._bind[mid] = who;
      var tile = self._tiles[mid];
      // The object a page was handed is UPDATED rather than replaced, so a
      // caller that kept the reference sees the name appear without being
      // told twice.
      if (tile) tile.info.peer_id = who;
      try { self.onBinding(mid, who); } catch (e) {}
      // ...and onTrack fires again for that slot, because a page that only
      // implements onTrack is the common one and it has no other way to
      // learn the name. Same track, same stream: the callback is already
      // called more than once per track (an unbound slot, then a bound one),
      // so this is not a new shape for a caller to handle.
      if (tile) { try { self.onTrack(tile.stream, tile.info); } catch (e) {} }
    }
  };

  // Which encoding of one publisher this page wants on its own screen.
  //
  // 'q', 'h' or 'f' — a quarter, a half, the full picture. It changes nothing
  // for anybody else in the room, which is the whole point: the person on a
  // phone and the person with this tile full-screen are watching the same
  // camera at two different sizes. Resolves to false when the node would not
  // take it, which is an ordinary answer and not an error.
  Session.prototype.setLayer = function (peerId, layer) {
    var self = this;
    if (!peerId || LAYERS.indexOf(layer) < 0) return Promise.resolve(false);
    self._layer[peerId] = layer;
    return nodeAsk(self, 'POST', '/rtc/layer', { peer_id: peerId, layer: layer })
      .then(function () { return true; }, function () { return false; });
  };

  // Which layer this page last asked for of somebody, or the node's default.
  Session.prototype.layerOf = function (peerId) { return this._layer[peerId] || 'h'; };

  Session.prototype._stopDummy = function () {
    if (!this._dummy) return;
    try { if (this.senders.screen) this.senders.screen.replaceTrack(null); } catch (e) {}
    try { this._dummy.stop(); } catch (e) {}
    this._dummy = null;
  };

  // Wait for candidate gathering, but never longer than three seconds.
  //
  // One request carries the whole handshake, so a candidate that has not
  // arrived by the time the offer is sent is a candidate that is never sent.
  // In practice there is exactly one host candidate and it is immediate; the
  // timeout is for the browser that decides to go looking for more.
  Session.prototype._gathered = function (pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      var finish = function () { if (!done) { done = true; resolve(); } };
      var t = setTimeout(finish, 3000);
      pc.onicegatheringstatechange = function () {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); finish(); }
      };
      pc.onicecandidate = function (e) { if (!e.candidate) { clearTimeout(t); finish(); } };
    });
  };

  Session.prototype.setMicrophone = function (on) { return this._enable('audio', on); };
  Session.prototype.setCamera = function (on) { return this._enable('video', on); };
  Session.prototype._enable = function (kind, on) {
    if (!this.local) return false;
    var t = kind === 'audio' ? this.local.getAudioTracks() : this.local.getVideoTracks();
    if (!t.length) return false;
    // enabled=false keeps the transceiver and keeps sending silence, so muting
    // never costs a renegotiation and never drops the other side's slot.
    for (var i = 0; i < t.length; i++) t[i].enabled = !!on;
    return true;
  };

  // Start, replace or stop sharing a screen.
  //
  // Pass the stream getDisplayMedia() gave you, or null to stop. Nothing here
  // renegotiates: the m-line was offered at join time and this only changes
  // what is written into it, which is why a share can start four minutes into
  // a call without anybody else's connection noticing.
  //
  // It resolves to false when this seat may not share — the room said so —
  // rather than throwing, because "the host has turned sharing off" is an
  // ordinary answer a page shows, not an error it reports.
  Session.prototype.shareScreen = function (stream) {
    var self = this;
    if (!self.senders.screen) return Promise.resolve(false);
    var track = null;
    if (stream) {
      var list = stream.getVideoTracks ? stream.getVideoTracks() : [];
      track = list.length ? list[0] : (stream.kind === 'video' ? stream : null);
      if (!track) return Promise.resolve(false);
    }
    self._stopDummy();
    return Promise.resolve(self.senders.screen.replaceTrack(track)).then(function () {
      // The browser ends a share when the user clicks its own "stop sharing"
      // bar, and that is the ONLY notice a page gets. Without this the tile
      // would freeze on the last frame for everybody, which looks exactly
      // like a network problem.
      if (track) {
        var stop = function () { if (self.sharing) self.shareScreen(null); };
        try { track.addEventListener('ended', stop); } catch (e) { track.onended = stop; }
      } else if (self._shared) {
        try { self._shared.stop(); } catch (e) {}
      }
      self._shared = track;
      self.sharing = !!track;
      return true;
    }, function () { return false; });
  };

  Session.prototype.leave = function () {
    if (this.state === 'closed') return;
    try { if (this.pc) this.pc.close(); } catch (e) {}
    if (this.local) { try { this.local.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    this._stopDummy();
    if (this._shared) { try { this._shared.stop(); } catch (e) {} }
    this.pc = null;
    this.local = null;
    this._shared = null;
    this.sharing = false;
    this.screen = null;
    this._bind = {};
    this._tiles = {};
    this._token = '';
    this._to('closed');
  };

  var OrbitRTC = {
    version: VERSION,
    // What the room needs before anyone may ask to join: a passcode, a human
    // check, or neither. A page calls this to render the right form once
    // instead of discovering each requirement by being refused.
    room: function (roomKey, opts) {
      var api = ((opts && opts.api) || DEFAULT_API).replace(/\/+$/, '');
      return fetch(api + '/api/room/' + encodeURIComponent(roomKey), { mode: 'cors', credentials: 'omit' })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.message || 'This room is not available.'); e.code = j.error; throw e; } return j; }); });
    },
    // Who the control plane currently believes is in the room. Lags the nodes'
    // report cycle; it is a participant list, not a presence signal, and a page
    // that drove its audio tiles from it would show people who had just left.
    peers: function (roomKey, opts) {
      var api = ((opts && opts.api) || DEFAULT_API).replace(/\/+$/, '');
      return fetch(api + '/api/room/' + encodeURIComponent(roomKey) + '/peers', { mode: 'cors', credentials: 'omit' })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.message || 'This room is not available.'); e.code = j.error; throw e; } return j; }); });
    },
    join: function (opts) {
      var s = new Session(opts || {});
      return s.connect();
    },
    Session: Session
  };

  if (typeof module === 'object' && module.exports) module.exports = OrbitRTC;
  global.OrbitRTC = OrbitRTC;
})(typeof window !== 'undefined' ? window : this);
