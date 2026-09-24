/* Orbit Talk SDK 1.1.0 — https://orbit.yunzheng.space/docs/talk/ */
(function (global) {
  'use strict';
  var VERSION = "1.1.0";
  var DEFAULT_API = "https://talk.yunzheng.space";
  // The customer API is a different origin from the join path on purpose:
  // one is a door strangers knock on, the other is your account.
  var DEFAULT_CONTROL = "https://dash.yunzheng.space";

  function noop() {}
  function fnOf(f) { return typeof f === 'function' ? f : noop; }

  // The node speaks WSS on its own port, not 443: 443 on every point of
  // presence is already the content edge. The port comes from the join, not
  // from here — which ports are free is a property of the machine — and the
  // default below only keeps a control plane that has not been updated
  // working.
  function nodeURL(host, port, token) {
    return 'wss://' + host + ':' + (port || 8643) + '/v1?token=' + encodeURIComponent(token);
  }

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
          var err = new Error((j && j.message) || ('HTTP ' + r.status));
          err.code = (j && j.error) || 'http-' + r.status;
          err.status = r.status;
          throw err;
        }
        return j || {};
      });
    }, function (e) {
      if (timer) clearTimeout(timer);
      var err = new Error(e && e.name === 'AbortError' ? 'The request timed out.' : 'The network request failed.');
      err.code = 'network';
      throw err;
    });
  }

  function get(url, headers) {
    return fetch(url, { mode: 'cors', credentials: 'omit', headers: headers || {} }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) {}
        if (!r.ok) {
          var err = new Error((j && j.message) || ('HTTP ' + r.status));
          err.code = (j && j.error) || 'http-' + r.status;
          err.status = r.status;
          throw err;
        }
        return j || {};
      });
    });
  }

  // What a conversation asks for before anyone may join. One request, so a
  // page can render the right form instead of discovering each requirement by
  // being refused.
  function room(key, opts) {
    var api = (opts && opts.api) || DEFAULT_API;
    return get(api + '/api/room/' + encodeURIComponent(key));
  }

  // A local id for a message the server has not numbered yet. It is what makes
  // a resend idempotent, so it has to be unique per sender and stable across
  // a reconnect — which rules out anything derived from the connection.
  var seqLocal = 0;
  function localId() {
    seqLocal += 1;
    var r = '';
    if (global.crypto && global.crypto.getRandomValues) {
      var b = new Uint8Array(6);
      global.crypto.getRandomValues(b);
      for (var i = 0; i < b.length; i++) r += (b[i] + 256).toString(16).slice(1);
    } else {
      r = Math.random().toString(16).slice(2, 14);
    }
    return r + '-' + seqLocal;
  }

  // How long to wait before trying again, growing but bounded, with jitter so
  // a node coming back does not take the whole room's reconnects in one
  // instant.
  function backoff(n) {
    var base = Math.min(30000, 500 * Math.pow(2, Math.min(n, 6)));
    return base * (0.7 + Math.random() * 0.6);
  }

  function join(opts) {
    opts = opts || {};
    var api = opts.api || DEFAULT_API;
    var onMessage = fnOf(opts.onMessage);
    var onState = fnOf(opts.onState);
    var onPresence = fnOf(opts.onPresence);
    var onError = fnOf(opts.onError);

    var ws = null;
    var closed = false;
    var attempt = 0;
    // The cursor is the whole reason this client can be reconnected at all:
    // it is the last sequence number this page has SEEN, and every reconnect
    // resumes from it. Starting a new connection at zero would replay the
    // conversation from the beginning on every network blip.
    var cursor = Number(opts.cursor) || 0;
    var outbox = [];           // sent, not yet acknowledged
    var session = null;        // the last successful join
    var timer = 0;

    function fail(code, message) {
      var e = new Error(message);
      e.code = code;
      onError(e);
    }

    // Where the token comes from. Two doors, per the design:
    //   - the public one: this SDK asks the join endpoint with a room key,
    //     and whoever holds the key may ask;
    //   - the backend one: the application's own server minted the token
    //     (it decided who this person is), and hands it to the SDK through
    //     fetchJoin. It is called again on every reconnect, because a token
    //     is good for two minutes and a reconnect an hour later needs a new one.
    function fresh() {
      if (typeof opts.fetchJoin === 'function') {
        return Promise.resolve(opts.fetchJoin()).then(function (j) {
          if (!j || !j.token || !j.host) { var e = new Error('fetchJoin returned no token.'); e.code = 'no-token'; throw e; }
          return j;
        });
      }
      return post(api + '/api/join', {
        room: opts.room, label: opts.label || '',
        passcode: opts.passcode || '', verify_token: opts.verify_token || '',
        peer_id: opts.peer_id || ''
      });
    }

    function open() {
      if (closed) return;
      onState('connecting');
      fresh().then(function (j) {
        if (closed) return;
        session = j;
        var sock = new WebSocket(nodeURL(j.host, j.port, j.token));
        ws = sock;
        sock.onopen = function () {
          attempt = 0;
          // hello first, always. The node answers with what it can actually
          // serve, which may be LATER than the cursor asked for when history
          // has aged out — a client that assumed otherwise would show a gap
          // as if it were the start of the conversation.
          // The name travels HERE, not in the token: the token names a peer
          // and a room and nothing a person reads. The node stamps every
          // message with what arrived in hello, so a hello without it is a
          // participant everybody sees as nobody.
          sock.send(JSON.stringify({ t: 'hello', cursor: cursor, label: String((j && j.label) || opts.label || '').slice(0, 40) }));
        };
        sock.onmessage = function (ev) {
          var m = null;
          try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (!m || typeof m !== 'object') return;
          if (m.t === 'ready') {
            // m.room is the node's own identifier for the conversation and is
            // deliberately not passed on: the application asked for a room key
            // and would reasonably assume this was one. (No backticks in this
            // file: every line of it is inside a template literal.)
            // members / signed: how many people are in the conversation, and
            // how many of them joined under a name. Both come straight off
            // the node's ready frame, and both are repeated in every presence
            // frame after it — a page that read only presence would show
            // nothing until the next arrival, which in a quiet room is never.
            onState('open', { kind: m.kind, members: m.members, signed: m.signed, peer: m.peer, cursor: m.cursor, gap: m.cursor > cursor });
            // Everything still unacknowledged goes back out. The node dedupes
            // on id, so a message that did land is answered with the sequence
            // it already has rather than stored twice.
            for (var i = 0; i < outbox.length; i++) sock.send(JSON.stringify(outbox[i]));
            return;
          }
          if (m.t === 'msg') {
            if (m.seq > cursor) cursor = m.seq;
            onMessage(m);
            return;
          }
          if (m.t === 'ack') {
            for (var k = 0; k < outbox.length; k++) {
              if (outbox[k].id === m.id) { outbox.splice(k, 1); break; }
            }
            if (m.seq > cursor) cursor = m.seq;
            return;
          }
          // The presence frame, whole: { t, members, signed }. Passed through
          // rather than rebuilt, so a field the node gains reaches the
          // application without this file having to be edited first.
          if (m.t === 'presence') { onPresence(m); return; }
          if (m.t === 'error') { fail(m.code || 'error', m.message || 'This conversation refused the request.'); return; }
        };
        sock.onclose = function () {
          if (ws === sock) ws = null;
          if (closed) return;
          onState('closed');
          attempt += 1;
          timer = setTimeout(open, backoff(attempt));
        };
        sock.onerror = function () { /* onclose always follows; nothing useful here */ };
      }, function (e) {
        if (closed) return;
        // A refusal with a status is the control plane saying no, and trying
        // again will get the same answer: a wrong passcode does not become
        // right by waiting. Only a network failure is worth a retry.
        if (e.status && e.status !== 503 && e.status !== 429) { fail(e.code, e.message); return; }
        onError(e);
        attempt += 1;
        timer = setTimeout(open, backoff(attempt));
      });
    }

    open();

    return {
      version: VERSION,
      send: function (body) {
        var text = String(body == null ? '' : body);
        if (!text) return null;
        var frame = { t: 'msg', id: localId(), body: text };
        outbox.push(frame);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(frame));
        // Not an error when the socket is down: it is in the outbox and goes
        // out on the next connection. A send that threw here would make every
        // application have to write this buffer itself.
        return frame.id;
      },
      cursor: function () { return cursor; },
      pending: function () { return outbox.length; },
      peer: function () { return session && session.peer_id; },
      leave: function () {
        closed = true;
        if (timer) clearTimeout(timer);
        if (ws) { try { ws.close(1000, 'left'); } catch (e) {} ws = null; }
        onState('left');
      }
    };
  }

  // Reading a conversation back — the BACKEND door and only that door.
  //
  // join() has two doors because a stranger holding a room key may ask to
  // come in. Reading what was already said is not that: it is your account
  // asking for your own room's history, so it presents your API key and
  // nothing else will do. The key is an account credential, so this call
  // belongs on YOUR SERVER. Putting one in a page hands every visitor the
  // ability to read every conversation you have, which is the reason
  // fetchJoin exists rather than a key option on join().
  //
  // Paging is a cursor walk, oldest first: start with no cursor and pass back
  // the "next" of the page you just read until it comes back null. A short
  // page is proof there is no more, so it carries no cursor.
  //
  //   var page = await OrbitTalk.history({ room: 12, key: process.env.ORBIT_KEY });
  //   page.messages.forEach(function (m) { console.log(m.seq, m.label, m.body); });
  //   if (page.next != null) // read on from page.next
  //
  // Every call is written to your account's audit log, with the cursor, the
  // limit and how many messages came back.
  function history(opts) {
    opts = opts || {};
    var key = opts.key || opts.token;
    var reject = function (code, message) {
      var e = new Error(message);
      e.code = code;
      return Promise.reject(e);
    };
    if (opts.room == null || opts.room === '') return reject('no-room', 'history needs the conversation id.');
    if (!key) return reject('no-key', 'history needs your API key, and belongs on your server rather than in a page.');
    var api = opts.api || DEFAULT_CONTROL;
    var q = '?cursor=' + encodeURIComponent(String(opts.cursor || 0));
    if (opts.limit) q += '&limit=' + encodeURIComponent(String(opts.limit));
    return get(api + '/api/v1/talk/rooms/' + encodeURIComponent(String(opts.room)) + '/history' + q,
      { Authorization: 'Bearer ' + key });
  }

  global.OrbitTalk = { version: VERSION, room: room, join: join, history: history };
})(typeof window !== 'undefined' ? window : globalThis);
