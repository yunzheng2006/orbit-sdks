/* Orbit Verify widget v1.4.0 — https://orbit.yunzheng.space/verify */
(function(){
  'use strict';
  if (window.orbitVerify) return;
  var ORIGIN = 'https://verify.yunzheng.space';
  try { var cs = document.currentScript; if (cs && cs.src) ORIGIN = new URL(cs.src).origin; } catch (e) {}
  // Where the two per-verification calls go. Separate from ORIGIN so they can
  // be answered by the anycast nodes while the script itself still comes from
  // here: the customer's <script src> never changes, and moving them back is
  // changing one string. ORIGIN stays the brand link and the fallback.
  var API = "https://verify.edge.yunzheng.space" || ORIGIN;
  if (API.indexOf('__') === 0) API = ORIGIN;
  // The edge is an OPTIMISATION, never a single point of failure. A page can
  // be unable to reach it for reasons that have nothing to do with us and that
  // we cannot see: a Content-Security-Policy listing only this script's own
  // origin in connect-src, a corporate filter, one anycast prefix withdrawn.
  // All of those surface as a rejected fetch, so the first one falls back to
  // the origin the script itself came from — which every integration already
  // has to allow, or the script would not be here.
  //
  // Only a TRANSPORT failure falls back. fetch does not reject on an HTTP
  // error, so a 403 "hostname-not-allowed" stays a 403: it would be refused at
  // the control plane too, and retrying it would just double the work.
  function call(path, init) {
    var base = API;
    return fetch(base + path, init).catch(function (e) {
      if (base === ORIGIN) throw e;
      API = ORIGIN;           // every later call on this page goes straight here
      return fetch(ORIGIN + path, init);
    });
  }
  var W = {}, SEQ = 0;
  /* The collector is shared verbatim with the Shield presence sensor
     (src/ui/sense-signals.js): one payload shape, one privacy boundary, one
     set of consistency checks at the edge. */
  /* Only counts ever leave the page: how many pointer / key events happened. */
  var EV = { pointer: 0, keys: 0, pi: [0, 0, 0, 0, 0], ki: [0, 0, 0, 0, 0], lp: 0, lk: 0, hidden: false, blurred: false };
  /* Intervals between events go into five buckets (<50, <150, <400, <1000, >=1000 ms): cadence, never positions or keys. */
  function bucket(ms) { return ms < 50 ? 0 : ms < 150 ? 1 : ms < 400 ? 2 : ms < 1000 ? 3 : 4; }
  function onPointer() { var t = now(); if (EV.lp) EV.pi[bucket(t - EV.lp)]++; EV.lp = t; EV.pointer++; }
  function onKey() { var t = now(); if (EV.lk) EV.ki[bucket(t - EV.lk)]++; EV.lk = t; EV.keys++; }
  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  /* Visibility says the tab is in front; focus says the WINDOW is. A browser can
     be visible behind three others, so the strictest site policy wants both. */
  try { if (!document.hasFocus()) EV.blurred = true; } catch (e) {}
  /* Guarded: this runs at load time, and a collector that throws while attaching
     a listener takes the whole script with it. Not every embedding page gives us
     a complete window — a test harness, a sandboxed frame, an old browser
     without the options object. */
  try { window.addEventListener('blur', function () { EV.blurred = true; }, { passive: true }); } catch (e) {}
  if (window.PointerEvent) document.addEventListener('pointerdown', onPointer, { passive: true, capture: true });
  else { document.addEventListener('mousedown', onPointer, true); document.addEventListener('touchstart', onPointer, true); }
  document.addEventListener('keydown', onKey, { passive: true, capture: true });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') EV.hidden = true; });
  var T_MOUNT = now();
  var SUBTLE = !!(window.isSecureContext && window.crypto && window.crypto.subtle);
  function hasFocus() { try { return document.hasFocus(); } catch (e) { return true; } }
  function has(f) { try { return !!f(); } catch (e) { return null; } }
  /* One payload. t0 is when the thing being reported on started (the widget's
     solve, or the sensor's reporting window); action is the caller's label;
     hidden is what the caller knows about its own container. */
  function ovSignals(t0, action, hidden) {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var n1 = now(), perfOk = n1 > 0 && n1 >= t0 && n1 >= T_MOUNT;
    var tLoad = Math.round(T_MOUNT);   /* performance.now() counts from navigation start: this is load -> mount */
    var dnt = ''; try { dnt = String(navigator.doNotTrack || window.doNotTrack || '').slice(0, 3); } catch (e) {}
    return { solve_ms: Math.round(n1 - t0), webdriver: navigator.webdriver === true,
      languages: (navigator.languages || []).length, tz: tz,
      screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio || 1 },
      subtle: SUBTLE, pointer: EV.pointer, keys: EV.keys, origin: location.origin, action: action || '',
      platform: String(navigator.platform || '').slice(0, 32), touch: Number(navigator.maxTouchPoints) || 0,
      hc: Number(navigator.hardwareConcurrency) || 0, dm: Number(navigator.deviceMemory) || 0, cd: Number(screen.colorDepth) || 0,
      vp: { w: window.innerWidth || 0, h: window.innerHeight || 0 }, cookie: navigator.cookieEnabled === true, dnt: dnt,
      apis: { gpu: has(function () { return navigator.gpu; }), chrome: has(function () { return window.chrome; }),
        seg: has(function () { return Intl.Segmenter; }), cmix: has(function () { return CSS.supports('color', 'color-mix(in srgb, red, blue)'); }) },
      t_load: tLoad, t_mount: Math.round(t0 - T_MOUNT), vis: !EV.hidden && !hidden && document.visibilityState !== 'hidden',
      foc: !EV.blurred && hasFocus(), perf_ok: perfOk,
      pi: EV.pi.slice(0), ki: EV.ki.slice(0) };
  }
  var enc = new TextEncoder();

  /* Strings. zh-CN copy is deliberately short; any zh-* tag maps to it. */
  var STR = {
    'en': { verifying: 'Verifying\u2026', verifying_s: 'Checking your browser', checking: 'Confirming\u2026', checking_s: 'One moment',
      verified: 'Verified', verified_s: 'You can continue', human: 'I am human', human_s: 'Click to confirm',
      failed: 'Verification failed', error: 'Could not verify', retry: 'Retry', brand: 'Verified by Orbit \u2014 what this widget collects',
      e_host: 'This page is not allowed to use this key', e_key: 'This site key is not active', e_many: 'Too many attempts, wait a moment',
      e_net: 'Check your connection', e_svc: 'The verification service did not answer', e_again: 'Please try again' },
    'zh-CN': { verifying: '\u6b63\u5728\u9a8c\u8bc1\u2026', verifying_s: '\u6b63\u5728\u68c0\u67e5\u6d4f\u89c8\u5668', checking: '\u6b63\u5728\u786e\u8ba4\u2026', checking_s: '\u8bf7\u7a0d\u5019',
      verified: '\u5df2\u9a8c\u8bc1', verified_s: '\u53ef\u4ee5\u7ee7\u7eed', human: '\u8bf7\u70b9\u51fb\u786e\u8ba4', human_s: '\u786e\u8ba4\u60a8\u662f\u771f\u4eba',
      failed: '\u65e0\u6cd5\u9a8c\u8bc1', error: '\u65e0\u6cd5\u9a8c\u8bc1', retry: '\u91cd\u8bd5', brand: '\u7531 Orbit \u9a8c\u8bc1 \u2014 \u672c\u7ec4\u4ef6\u91c7\u96c6\u7684\u5185\u5bb9',
      e_host: '\u6b64\u9875\u9762\u65e0\u6743\u4f7f\u7528\u8be5\u5bc6\u94a5', e_key: '\u7ad9\u70b9\u5bc6\u94a5\u672a\u542f\u7528', e_many: '\u5c1d\u8bd5\u8fc7\u591a\uff0c\u8bf7\u7a0d\u5019',
      e_net: '\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5', e_svc: '\u9a8c\u8bc1\u670d\u52a1\u65e0\u54cd\u5e94', e_again: '\u8bf7\u91cd\u8bd5' }
  };
  function pickLocale(list12) {
  var i, t;
  for (i = 0; i < (list12 || []).length; i++) {
    t = String(list12[i] || "").toLowerCase().replace(/_/g, "-").trim();
    if (!t) continue;
    if (t === "zh" || t.indexOf("zh-") === 0) return "zh-CN";
    if (t === "en" || t.indexOf("en-") === 0) return "en";
  }
  return "en";
}
  var LOCALE = null;   /* set by orbitVerify.setLocale(); null = per widget */
  function localeOf(w) {
    if (LOCALE) return LOCALE;
    var c = [w && w.opts && w.opts.lang, document.documentElement.lang, navigator.language];
    if (navigator.languages) for (var i = 0; i < navigator.languages.length; i++) c.push(navigator.languages[i]);
    return pickLocale(c);
  }
  function T(w, k) { var l = localeOf(w); return (STR[l] && STR[l][k]) || STR.en[k] || k; }

  /* Pure-JS SHA-256 returning the number of leading zero bits. Synchronous
     hashing is far quicker than one crypto.subtle round-trip per nonce. */
  var K = [], H0 = [];
  (function () { var p = [], n = 2; while (p.length < 64) { var q = true; for (var i = 0; i < p.length && p[i] * p[i] <= n; i++) if (n % p[i] === 0) { q = false; break; }
    if (q) { p.push(n); if (p.length <= 8) H0.push(Math.floor((Math.sqrt(n) % 1) * 4294967296) | 0); K.push(Math.floor((Math.cbrt(n) % 1) * 4294967296) | 0); } n++; } })();
  function sha(bytes) {
    var l = bytes.length, bl = l * 8, w = new Uint32Array(64), h = H0.slice(0), m = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    m.set(bytes); m[l] = 128; for (var i = 0; i < 4; i++) m[m.length - 1 - i] = (bl >>> (8 * i)) & 255;
    for (var o = 0; o < m.length; o += 64) {
      for (var t = 0; t < 16; t++) w[t] = (m[o + t * 4] << 24) | (m[o + t * 4 + 1] << 16) | (m[o + t * 4 + 2] << 8) | m[o + t * 4 + 3];
      for (t = 16; t < 64; t++) { var a = w[t - 15], b = w[t - 2], s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3), s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
      var A = h[0], B = h[1], C = h[2], D = h[3], E = h[4], F = h[5], G = h[6], Hh = h[7];
      for (t = 0; t < 64; t++) { var S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7)), ch = (E & F) ^ (~E & G), t1 = (Hh + S1 + ch + K[t] + w[t]) | 0, S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10)), mj = (A & B) ^ (A & C) ^ (B & C), t2 = (S0 + mj) | 0; Hh = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0; }
      h[0] = (h[0] + A) | 0; h[1] = (h[1] + B) | 0; h[2] = (h[2] + C) | 0; h[3] = (h[3] + D) | 0; h[4] = (h[4] + E) | 0; h[5] = (h[5] + F) | 0; h[6] = (h[6] + G) | 0; h[7] = (h[7] + Hh) | 0;
    }
    return h;
  }
  function lz(bytes) { var h = sha(bytes); return h[0] === 0 ? 32 + Math.clz32(h[1]) : Math.clz32(h[0]); }
  function hex(bytes) { var h = sha(bytes), o = ''; for (var i = 0; i < 8; i++) o += ('00000000' + (h[i] >>> 0).toString(16)).slice(-8); return o; }

  var CSS = ':host{display:inline-block;vertical-align:middle}' +
    '.w{--bg:#0b0b0d;--fg:#ececec;--sec:#8e8e8e;--line:rgba(255,255,255,.16);--ok:#5df0a8;--okglow:rgba(93,240,168,.18);--bad:#ff5c8a;--focus:#5df0a8;box-sizing:border-box;width:300px;height:65px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);font:13px/1.35 inherit;font-family:inherit;display:block;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;animation:ovin .45s cubic-bezier(.16,1,.3,1) both;transition:border-color .35s,box-shadow .35s}' +
    '.w.ok{border-color:var(--ok);box-shadow:0 0 0 3px var(--okglow)}.w.bad{border-color:var(--bad)}' +
    '.body{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:0 12px;opacity:0;transform:translateY(5px);transition:opacity .28s ease,transform .32s cubic-bezier(.16,1,.3,1)}.body.in{opacity:1;transform:none}.body.out{opacity:0;transform:translateY(-5px)}' +
    '@keyframes ovin{from{opacity:0;transform:translateY(6px)}}' +
    '.w.light{--bg:#fff;--fg:#161616;--sec:#5e5e5e;--line:rgba(0,0,0,.16);--ok:#0b7a46;--okglow:rgba(11,122,70,.16);--bad:#c22a52;--focus:#0b7a46}' +
    '.w.compact{width:200px;height:48px;font-size:12px}.w.compact .body{padding:0 10px;gap:8px}.w.compact .s,.w.compact .brand{display:none}' +
    '.ind{width:22px;height:22px;flex:0 0 auto;position:relative}' +
    '.ring{position:absolute;top:0;left:0;right:0;bottom:0;border-radius:50%;border:2px solid var(--line);border-top-color:var(--ok);animation:ovspin 1s linear infinite;transition:border-color .25s}' +
    '.ok .ring{animation:none;border-color:var(--ok)}.bad .ring{animation:none;border-color:var(--bad);opacity:.7}' +
    '.chk{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:opacity .25s,transform .25s cubic-bezier(.16,1,.3,1)}' +
    '.ok .chk{opacity:1;transform:scale(1)}' +
    '.chk svg,.box svg{width:12px;height:12px;stroke:var(--ok);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}' +
    '.txt{flex:1;min-width:0}.t{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.s{font-size:11px;color:var(--sec);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bad .t{color:var(--bad)}' +
    '.brand{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--sec);text-decoration:none;flex:0 0 auto;font-weight:600}.brand:hover{color:var(--fg)}' +
    '.bar{position:absolute;left:0;bottom:0;height:2px;background:var(--ok);width:0;transition:width .5s cubic-bezier(.16,1,.3,1);opacity:.85}.ok .bar{width:100%}' +
    '.cb{display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;min-width:0;background:none;border:none;color:inherit;font:inherit;padding:0;text-align:left;border-radius:6px}' +
    '.box{width:22px;height:22px;border:2px solid var(--sec);border-radius:6px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;transition:border-color .15s}' +
    '.cb.on .box,.cb.on:hover .box{border-color:var(--ok)}.cb.on{pointer-events:none}.cb:hover .box{border-color:var(--fg)}.cb:focus{outline:2px solid var(--focus);outline-offset:3px}.cb:focus:not(:focus-visible){outline:none}' +
    '.rate{font-size:10px;line-height:1.2;color:var(--sec);font-variant-numeric:tabular-nums;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.retry{background:none;border:1px solid var(--line);color:var(--fg);border-radius:999px;padding:3px 10px;font:inherit;font-size:11px;cursor:pointer;flex:0 0 auto}.retry:hover{border-color:var(--fg)}' +
    '@keyframes ovspin{to{transform:rotate(360deg)}}' +
    '@media(prefers-reduced-motion:reduce){.w{animation:none}.ring{animation:none;border-top-color:var(--ok)}.chk,.bar,.ring,.body,.w{transition:none}}';
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>';

  function fnOf(v) {
    if (typeof v === 'function') return v;
    if (typeof v !== 'string' || !v) return null;
    try { return v.split('.').reduce(function (o, k) { return o ? o[k] : null; }, window) || null; } catch (e) { return null; }
  }
  function cb(w, name, arg) { var f = fnOf(w.opts[name]); if (f) { try { f(arg, w.id); } catch (e) { setTimeout(function () { throw e; }); } } }
  function setInput(w, v) { if (w.input) w.input.value = v || ''; }
  // auto: follow the page itself (the colour behind the widget), then the OS.
  function pageIsLight(el) {
    try {
      var n = el;
      while (n && n !== document.documentElement) {
        var bg = getComputedStyle(n).backgroundColor, m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg || '');
        if (m && (m[4] === undefined || Number(m[4]) > .5)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) > 140;
        n = n.parentElement;
      }
    } catch (e) {}
    return null;
  }
  function isLight(w) {
    var t = w.opts.theme || 'auto';
    if (t === 'light') return true; if (t === 'dark') return false;
    var p = pageIsLight(w.el); if (p !== null) return p;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  }
  function paint(w) {
    var root = w.box; if (!root) return;
    var cls = 'w' + (isLight(w) ? ' light' : '') + (w.opts.size === 'compact' ? ' compact' : '') +
      (w.state === 'verified' ? ' ok' : (w.state === 'failed' || w.state === 'error') ? ' bad' : '');
    root.className = cls; root.setAttribute('lang', localeOf(w));
    var brand = '<a class="brand" href="' + ORIGIN + '/" target="_blank" rel="noopener" tabindex="-1" title="' + T(w, 'brand') + '">Orbit</a>';
    var ind = '<div class="ind" aria-hidden="true"><div class="ring"></div><div class="chk">' + TICK + '</div></div>';
    var h;
    if (w.state === 'interactive') {
      h = '<button type="button" class="cb" role="checkbox" aria-checked="false"><span class="box"></span><span class="txt"><div class="t">' + T(w, 'human') + '</div><div class="s">' + T(w, 'human_s') + '</div></span></button>' + brand;
    } else if (w.state === 'failed' || w.state === 'error') {
      h = ind + '<div class="txt"><div class="t">' + T(w, w.state === 'error' ? 'error' : 'failed') + '</div><div class="s">' + errText(w) + '</div></div><button type="button" class="retry">' + T(w, 'retry') + '</button>';
    } else {
      var k = w.state === 'verified' ? 'verified' : w.state === 'checking' ? 'checking' : 'verifying';
      var t = T(w, k), s = T(w, k + '_s');
      var rr = (w.state === 'verifying' && w.opts.size !== 'compact')
        ? '<div class="rate" aria-hidden="true"></div>' : '';
      h = ind + '<div class="txt"><div class="t">' + t + '</div><div class="s">' + s + '</div>' + rr + '</div>' + brand;
    }
    var barEl = root.querySelector('.bar');
    if (!barEl) { barEl = document.createElement('div'); barEl.className = 'bar'; root.appendChild(barEl); }
    barEl.style.width = (w.state === 'verified' ? 100 : Math.round((w.prog || 0) * 90)) + '%';
    // Cross-fade: the previous body slides out while the new one slides in.
    var prev = root.querySelector('.body.in');
    if (prev && prev.getAttribute('data-state') === w.state) { prev.innerHTML = h; }
    else {
      // A body still fading out from an earlier paint goes at once.
      var outs = root.querySelectorAll('.body.out');
      for (var oi = 0; oi < outs.length; oi++) if (outs[oi].parentNode) outs[oi].parentNode.removeChild(outs[oi]);
      if (prev) {
        // Capture the old element itself: prev is reassigned below and a
        // closure over it would remove the NEW body 320 ms later.
        var old = prev; old.className = 'body out';
        setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 320);
      }
      var body = document.createElement('div'); body.className = 'body'; body.setAttribute('data-state', w.state); body.innerHTML = h;
      root.insertBefore(body, barEl);
      void body.offsetWidth; body.className = 'body in';
      prev = body;
    }
    root.setAttribute('aria-busy', w.state === 'verifying' || w.state === 'checking' ? 'true' : 'false');
    var cbx = prev.querySelector('.cb'); if (cbx) cbx.onclick = function () { if (cbx.className.indexOf('on') >= 0) return; cbx.className = 'cb on'; cbx.setAttribute('aria-checked', 'true'); cbx.querySelector('.box').innerHTML = TICK; confirm(w); };
    var rt = prev.querySelector('.retry'); if (rt) rt.onclick = function () { run(w); };
    var live = prev.querySelector('.t'); if (live) live.setAttribute('aria-live', 'polite');
  }
  function bar(w) { var b = w.box && w.box.querySelector('.bar'); if (b) b.style.width = Math.round(Math.min(.9, w.prog || 0) * 100) + '%'; }

  /* Groups a count the way a person reads one: 43,200 / 1.2M. */
  function num(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'k';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* The numeric readout is aria-hidden on purpose: it changes eight times a
     second, and a screen reader announcing that is not information, it is a
     wall of noise. The state line above it is the one that speaks. */
  function rate(w) {
    var el = w.box && w.box.querySelector('.rate');
    if (!el || w.opts.size === 'compact') return;
    el.textContent = num(w.hashes || 0) + ' \u00b7 ' + num(w.rate || 0) + '/s \u00b7 ' + Math.round((w.prog || 0) * 100) + '%';
  }

  function signals(w) {
    var sig = ovSignals(w.t0, w.opts.action || '', !!w.hidden);
    if (w.fp) { sig.fp = w.fp; sig.fpk = w.fpk || ''; }
    return sig;
  }
  /* Tier 2, only when the site key opted in (the challenge says so): canvas,
     WebGL, audio and a 40-font probe, each hashed here; only one digest leaves
     the page. Any part that fails is simply left out. */
  var FONTS = ['Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier New', 'Franklin Gothic', 'Futura', 'Garamond', 'Geneva', 'Georgia',
    'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Console', 'Lucida Grande', 'Menlo', 'Monaco', 'Optima', 'Palatino', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'SimSun', 'SimHei', 'Noto Sans CJK SC', 'Source Han Sans', 'Yu Gothic', 'Meiryo', 'Malgun Gothic'];
  function fpCanvas() {
    var c = document.createElement('canvas'); c.width = 240; c.height = 60; var x = c.getContext('2d'); if (!x) return '';
    x.textBaseline = 'alphabetic'; x.fillStyle = '#f60'; x.fillRect(120, 5, 60, 30); x.fillStyle = '#069'; x.font = '15px Arial'; x.fillText('Orbit Verify \u2014 \u9a8c\u8bc1 0123', 4, 22);
    x.fillStyle = 'rgba(102,204,0,.7)'; x.font = '18px Times New Roman'; x.fillText('Orbit Verify \u2014 \u9a8c\u8bc1 0123', 8, 46);
    x.beginPath(); x.arc(60, 30, 18, 0, Math.PI * 2, true); x.closePath(); x.fill();
    return hex(enc.encode(c.toDataURL()));
  }
  function fpWebgl() {
    var c = document.createElement('canvas'); var g = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!g) return '';
    var d = g.getExtension('WEBGL_debug_renderer_info'), v = '', r = '';
    if (d) { v = g.getParameter(d.UNMASKED_VENDOR_WEBGL) || ''; r = g.getParameter(d.UNMASKED_RENDERER_WEBGL) || ''; }
    var vs = g.createShader(g.VERTEX_SHADER); g.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'); g.compileShader(vs);
    var fs = g.createShader(g.FRAGMENT_SHADER); g.shaderSource(fs, 'precision mediump float;void main(){gl_FragColor=vec4(gl_FragCoord.x/64.,gl_FragCoord.y/64.,.5,1.);}'); g.compileShader(fs);
    var pr = g.createProgram(); g.attachShader(pr, vs); g.attachShader(pr, fs); g.linkProgram(pr); g.useProgram(pr);
    var b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    var loc = g.getAttribLocation(pr, 'p'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0); g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    var px = new Uint8Array(64 * 64 * 4); g.readPixels(0, 0, 64, 64, g.RGBA, g.UNSIGNED_BYTE, px);
    return hex(enc.encode(v + '|' + r + '|' + g.getParameter(g.VERSION) + '|' + g.getParameter(g.SHADING_LANGUAGE_VERSION) + '|' + hex(px)));
  }
  function fpFonts() {
    var span = document.createElement('span'); span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;font-size:72px;white-space:nowrap;visibility:hidden'; span.textContent = 'mmmmmmmmmmlli\u9a8c\u8bc1';
    document.body.appendChild(span);
    var base = {}, bits = '';
    ['monospace', 'sans-serif', 'serif'].forEach(function (b) { span.style.fontFamily = b; base[b] = span.offsetWidth + 'x' + span.offsetHeight; });
    for (var i = 0; i < FONTS.length; i++) { var found = false; for (var b in base) { span.style.fontFamily = '"' + FONTS[i] + '",' + b; if (span.offsetWidth + 'x' + span.offsetHeight !== base[b]) { found = true; break; } } bits += found ? '1' : '0'; }
    document.body.removeChild(span);
    return hex(enc.encode(bits));
  }
  function fpAudio() {
    return new Promise(function (res) {
      var AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return res('');
      var ctx = new AC(1, 4000, 44100), osc = ctx.createOscillator(), comp = ctx.createDynamicsCompressor();
      osc.type = 'triangle'; osc.frequency.value = 1000; osc.connect(comp); comp.connect(ctx.destination); osc.start(0);
      var done = false, t = setTimeout(function () { if (!done) { done = true; res(''); } }, 1200);
      ctx.oncomplete = function (e) { if (done) return; done = true; clearTimeout(t); var d = e.renderedBuffer.getChannelData(0), sum = 0; for (var i = 2000; i < 4000; i++) sum += Math.abs(d[i]); res(hex(enc.encode(sum.toFixed(6)))); };
      try { ctx.startRendering(); } catch (e) { done = true; clearTimeout(t); res(''); }
    });
  }
  function fingerprint(w) {
    var parts = {}, keys = '';
    try { parts.c = fpCanvas(); } catch (e) { parts.c = ''; }
    try { parts.g = fpWebgl(); } catch (e) { parts.g = ''; }
    try { parts.f = document.body ? fpFonts() : ''; } catch (e) { parts.f = ''; }
    return fpAudio().then(function (a) { parts.a = a; })['catch'](function () { parts.a = ''; }).then(function () {
      var all = ''; ['c', 'g', 'a', 'f'].forEach(function (k) { if (parts[k]) { keys += k; all += k + ':' + parts[k] + ';'; } });
      w.fp = all ? hex(enc.encode(all)) : ''; w.fpk = keys;
    });
  }
  // Server reasons become one plain sentence; anything else is a connection problem.
  function errText(w) {
    var e = String(w.err || '');
    if (/hostname-not-allowed/.test(e)) return T(w, 'e_host');
    if (/unknown-sitekey|invalid-sitekey|sitekey-disabled/.test(e)) return T(w, 'e_key');
    if (/429|too-many|rate-limited/.test(e)) return T(w, 'e_many');
    if (w.state === 'error' && /Failed to fetch|NetworkError|Load failed/.test(e)) return T(w, 'e_net');
    return w.state === 'error' ? T(w, 'e_svc') : T(w, 'e_again');
  }
  function solve(w, seed, bits) {
    return new Promise(function (res, rej) {
      var n = 0, MAX = Math.pow(2, bits + 6), expect = Math.pow(2, bits), pre = String(seed), gen = w.gen;
      function tick() {
        if (w.gen !== gen) return rej(new Error('cancelled'));
        var end = Math.min(n + 2500, MAX);
        for (; n < end; n++) if (lz(enc.encode(pre + n)) >= bits) return res(String(n));
        if (n >= MAX) return rej(new Error('no solution'));
        w.prog = Math.min(.9, n / expect);
        // The readout is what the visitor sees instead of a bar that just
        // creeps: how much work has been done, and how fast this device does
        // it. Repainted on a clock rather than on every batch — 2500 hashes go
        // by far faster than a screen refresh, and faster than anyone reads.
        var el = now();
        if (el - (w.lastRate || 0) > 120) {
          w.lastRate = el;
          w.hashes = n;
          w.rate = (el - w.t0) > 0 ? Math.round(n / ((el - w.t0) / 1000)) : 0;
          rate(w);
        }
        bar(w);
        setTimeout(tick, 0);
      }
      setTimeout(tick, 0);
    });
  }
  function post(w, interaction) {
    return call('/v1/solve', { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: w.ch.challenge_id, nonce: w.nonce, interaction: !!interaction, it: interaction ? (w.it || '') : undefined, signals: signals(w) }) })
      .then(function (r) { return r.json().catch(function () { return { status: 'error', error: 'bad response' }; }); });
  }
  function handle(w, j) {
    if (j.status === 'pass' && j.token) {
      w.token = j.token; w.state = 'verified'; w.prog = 1; setInput(w, j.token); paint(w); cb(w, 'callback', j.token);
      clearTimeout(w.expT);
      var ttl = Math.max(10, (Number(j.expires) || 300) - 5) * 1000;
      w.expT = setTimeout(function () { w.token = null; setInput(w, ''); cb(w, 'expired-callback', w.id); if (w.opts['refresh-expired'] !== 'manual') run(w); else { w.state = 'failed'; paint(w); } }, ttl);
      return;
    }
    if (j.status === 'interactive') { w.it = j.it || ''; w.state = 'interactive'; paint(w); return; }
    w.state = 'failed'; w.err = j.reason || j.error || 'failed'; paint(w); cb(w, 'error-callback', w.err);
  }
  function confirm(w) {
    w.state = 'checking'; paint(w);
    post(w, true).then(function (j) { handle(w, j); }).catch(function (e) { w.state = 'error'; w.err = String(e && e.message || e); paint(w); cb(w, 'error-callback', w.err); });
  }
  function run(w) {
    w.gen = (w.gen || 0) + 1; clearTimeout(w.expT);
    w.token = null; w.prog = 0; w.hashes = 0; w.rate = 0; w.lastRate = 0; setInput(w, ''); w.fp = ''; w.fpk = ''; w.hidden = document.visibilityState === 'hidden'; w.state = 'verifying'; paint(w); w.t0 = now();
    var gen = w.gen;
    call('/v1/challenge?sitekey=' + encodeURIComponent(w.opts.sitekey || ''), { mode: 'cors', credentials: 'omit' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.seed) throw new Error((j && j.error) || ('challenge ' + r.status)); return j; }); })
      .then(function (j) { if (w.gen !== gen) throw new Error('cancelled'); w.ch = j; return solve(w, j.seed, j.bits); })
      .then(function (nonce) { w.nonce = nonce; w.prog = .92; bar(w); if (w.ch.fp) return fingerprint(w); })
      .then(function () { return post(w, false); })
      .then(function (j) { if (w.gen === gen) handle(w, j); })
      .catch(function (e) { if (w.gen !== gen || /cancelled/.test(String(e))) return; w.state = 'error'; w.err = String(e && e.message || e); paint(w); cb(w, 'error-callback', w.err); });
  }

  function optsFrom(el, extra) {
    var o = {}; var d = el.dataset || {};
    ['sitekey', 'action', 'theme', 'size', 'lang', 'callback', 'error-callback', 'expired-callback', 'response-field-name', 'refresh-expired'].forEach(function (k) {
      var dk = k.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); if (d[dk] != null) o[k] = d[dk]; });
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k.replace(/([A-Z])/g, function (c) { return '-' + c.toLowerCase(); })] = extra[k];
    return o;
  }
  function render(target, extra) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('orbitVerify.render: container not found');
    if (el.dataset.ovId && W[el.dataset.ovId]) return el.dataset.ovId;
    var opts = optsFrom(el, extra);
    if (!opts.sitekey) throw new Error('orbitVerify.render: sitekey is required');
    var id = 'ov-' + (++SEQ);
    var w = { id: id, el: el, opts: opts, state: 'verifying', token: null, prog: 0, gen: 0 };
    var input = document.createElement('input'); input.type = 'hidden'; input.name = opts['response-field-name'] || 'orbit-verify-response'; el.appendChild(input); w.input = input;
    var root = el.shadowRoot || el.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style><div class="w" role="status"></div>';
    w.box = root.querySelector('.w');
    el.dataset.ovId = id; W[id] = w;
    if (window.matchMedia && (opts.theme || 'auto') === 'auto') { try { var mq = window.matchMedia('(prefers-color-scheme: light)'), onmq = function () { if (W[id]) paint(w); };
      if (mq.addEventListener) mq.addEventListener('change', onmq); else if (mq.addListener) mq.addListener(onmq); } catch (e) {} }
    run(w);
    return id;
  }
  function byId(id) { var w = W[id]; if (!w) throw new Error('orbitVerify: unknown widget ' + id); return w; }
  function reset(id) { run(byId(id)); }
  function getResponse(id) { return byId(id).token || ''; }
  function remove(id) { var w = byId(id); w.gen++; clearTimeout(w.expT); if (w.input && w.input.parentNode) w.input.parentNode.removeChild(w.input); if (w.el.shadowRoot) w.el.shadowRoot.innerHTML = ''; delete w.el.dataset.ovId; delete W[id]; }
  function scan() { var list = document.querySelectorAll('.orbit-verify'); for (var i = 0; i < list.length; i++) if (!list[i].dataset.ovId) { try { render(list[i]); } catch (e) { console.error('[orbit-verify]', e.message); } } }
  var READY = [];
  function setLocale(l) { LOCALE = l ? pickLocale([l]) : null; for (var id in W) if (Object.prototype.hasOwnProperty.call(W, id) && W[id].box) paint(W[id]); return LOCALE; }
  window.orbitVerify = { version: '1.4.0', render: render, reset: reset, getResponse: getResponse, remove: remove, setLocale: setLocale, getLocale: function (id) { return localeOf(id ? W[id] : null); },
    ready: function (f) { if (typeof f === 'function') { READY.push(f); if (document.readyState !== 'loading') f(); } } };
  function boot() { scan(); READY.forEach(function (f) { try { f(); } catch (e) {} }); var g = fnOf(window.onOrbitVerifyLoad); if (g) g(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
