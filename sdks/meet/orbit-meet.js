/* Orbit Meet SDK 1.0.1 — https://orbit.yunzheng.space/docs/meet/ */
(function (global) {
  'use strict';
  var VERSION = "1.0.1";
  var DEFAULT_HOST = "https://meet.yunzheng.space";
  var EVENTS = ['ready', 'joined', 'left', 'error'];

  function noop() {}

  // The same normalisation the meeting page does: a code, a code without its
  // dashes, or any link that carries one. A site that pastes the link it was
  // given should not have to know which of the three it has.
  function normalise(input) {
    var s = String(input == null ? '' : input).trim().toLowerCase();
    if (!s) return '';
    // One segment at a time, never recursively: a version of this that called
    // itself on every piece of a URL overflowed the stack on 'https:', which
    // still contains a colon.
    var one = function (x) {
      var bare = String(x).replace(/[^a-z]/g, '');
      if (bare.length !== 10) return '';
      if (/[lo]/.test(bare)) return '';
      return bare.slice(0, 3) + '-' + bare.slice(3, 7) + '-' + bare.slice(7);
    };
    if (s.indexOf('/') >= 0 || s.indexOf(':') >= 0) {
      var parts = s.replace(/[?#][\s\S]*$/, '').split(/[/:]/);
      for (var i = parts.length - 1; i >= 0; i--) {
        var got = one(parts[i]);
        if (got) return got;
      }
      return '';
    }
    return one(s);
  }

  function container(where) {
    if (!where) return document.body;
    if (typeof where === 'string') return document.querySelector(where) || document.body;
    if (where.nodeType === 1) return where;
    return document.body;
  }

  function join(opts) {
    opts = opts || {};
    var host = String(opts.host || DEFAULT_HOST).replace(/\/+$/, '');
    var code = normalise(opts.code);
    var handlers = {};
    var frame = null;
    var closed = false;

    function fire(kind, detail) {
      var list = handlers[kind] || [];
      for (var i = 0; i < list.length; i++) {
        try { list[i](detail); } catch (e) {}
      }
    }

    if (!code) {
      // Reported rather than thrown: a bad code in somebody's CMS should put
      // a message in their own error handler, not stop their page's script.
      // The inline callbacks are wired first: onError is exactly where this
      // report is meant to land (1.0.0 returned before wiring them, so it
      // reached only handlers added later with .on()).
      setTimeout(function () { fire('error', { code: 'bad-code', message: 'That is not a meeting code.' }); }, 0);
      return inline(api());
    }

    var url = host + '/e/' + encodeURIComponent(code);
    var q = [];
    if (opts.name) q.push('name=' + encodeURIComponent(String(opts.name).slice(0, 40)));
    if (opts.lang === 'zh' || opts.lang === 'en') q.push('lang=' + opts.lang);
    if (q.length) url += '?' + q.join('&');
    // The fragment is never sent to a server and never appears in a referrer,
    // which is the only reason a seat token may travel in a URL at all.
    if (opts.token) url += '#t=' + encodeURIComponent(String(opts.token));

    frame = document.createElement('iframe');
    frame.src = url;
    frame.title = String(opts.title || 'Orbit Meet');
    frame.allow = 'camera; microphone; display-capture; fullscreen; autoplay';
    frame.allowFullscreen = true;
    frame.setAttribute('allowfullscreen', 'allowfullscreen');
    frame.style.border = '0';
    frame.style.display = 'block';
    frame.style.width = opts.width ? String(opts.width) : '100%';
    frame.style.height = opts.height ? String(opts.height) : '100%';
    frame.style.minHeight = opts.height ? '' : '420px';
    container(opts.el || opts.container).appendChild(frame);

    function onMessage(ev) {
      // Only the meeting host's own frame is listened to. An embed on a page
      // full of other iframes must not be steerable by any of them.
      if (!frame || ev.source !== frame.contentWindow) return;
      if (String(ev.origin).replace(/\/+$/, '') !== host) return;
      var d = ev.data;
      if (!d || d.orbit_meet !== 1 || EVENTS.indexOf(d.t) < 0) return;
      fire(d.t, d.detail || null);
      if (d.t === 'left') leave();
    }
    global.addEventListener('message', onMessage);
    frame.addEventListener('load', function () { fire('ready', { code: code }); });

    function leave() {
      if (closed) return;
      closed = true;
      global.removeEventListener('message', onMessage);
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      frame = null;
    }

    function api() {
      return {
        version: VERSION,
        code: code,
        frame: function () { return frame; },
        on: function (kind, fn) {
          if (EVENTS.indexOf(kind) < 0 || typeof fn !== 'function') return this;
          (handlers[kind] = handlers[kind] || []).push(fn);
          return this;
        },
        off: function (kind, fn) {
          var list = handlers[kind] || [];
          for (var i = list.length - 1; i >= 0; i--) if (list[i] === fn) list.splice(i, 1);
          return this;
        },
        leave: leave
      };
    }

    return inline(api());

    // The four callbacks people pass inline, wired to the same events.
    function inline(out) {
      if (typeof opts.onReady === 'function') out.on('ready', opts.onReady);
      if (typeof opts.onJoined === 'function') out.on('joined', opts.onJoined);
      if (typeof opts.onLeave === 'function') out.on('left', opts.onLeave);
      if (typeof opts.onError === 'function') out.on('error', opts.onError);
      return out;
    }
  }

  // The link to a meeting, for a page that would rather draw its own button
  // than embed the call.
  function link(code, opts) {
    var host = String((opts && opts.host) || DEFAULT_HOST).replace(/\/+$/, '');
    var c = normalise(code);
    return c ? host + '/j/' + c : '';
  }

  var OrbitMeet = { version: VERSION, join: join, link: link, code: normalise, noop: noop };
  if (typeof module === 'object' && module.exports) module.exports = OrbitMeet;
  global.OrbitMeet = OrbitMeet;
})(typeof window !== 'undefined' ? window : this);
