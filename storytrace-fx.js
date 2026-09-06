/* 賓客端舞台特效 A：冷焰火／勝利之花（地面往上噴的噴泉，不是紙花）。不改控台。 */
(function (global) {
  'use strict';

  var canvas, ctx, w = 0, h = 0, dpr = 1, raf = 0, lastTs = 0;
  var sparks = [];
  var jets = [];
  var motes = [];
  var lastColorAt = 0, lastLyricAt = 0;
  var reduced = false;
  var ambientOn = false;

  function boot() {
    if (canvas) return;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) return;
    canvas = document.createElement('canvas');
    canvas.id = 'storytraceFx';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:45;pointer-events:none;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else loop(0);
    });
    loop(0);
  }

  function onResize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ambientOn) seedMotes();
  }

  function seedMotes() {
    motes = [];
    var n = Math.min(96, Math.max(36, Math.floor((w * h) / 16000)));
    var i;
    for (i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        s: 0.35 + Math.random() * 1.45,
        vy: -0.07 - Math.random() * 0.18,
        vx: (Math.random() - 0.5) * 0.1,
        a: 0.12 + Math.random() * 0.4,
        tw: Math.random() * Math.PI * 2,
        ts: 0.7 + Math.random() * 1.5
      });
    }
  }

  function ambient() {
    boot();
    if (!canvas) return;
    ambientOn = true;
    if (!motes.length) seedMotes();
  }

  function hueOf(color) {
    if (!color) return null;
    var m = String(color).match(/hsl\(\s*(-?[\d.]+)/i);
    if (m) return ((parseFloat(m[1]) % 360) + 360) % 360;
    return null;
  }

  function sparkColor(kind) {
    if (kind === 'rose') {
      var r = ['#FFE8EE', '#FFD0C8', '#FFF6E8', '#C9A84C', '#FFC9A0'];
      return r[(Math.random() * r.length) | 0];
    }
    var g = ['#FFFBE6', '#FFE9A0', '#FFFFFF', '#C9A84C', '#E8C97A', '#FFD36A'];
    return g[(Math.random() * g.length) | 0];
  }

  function kindFromColor(color) {
    var hue = hueOf(color);
    if (hue == null) return 'gold';
    if (hue >= 320 || hue <= 18) return 'rose';
    return 'gold';
  }

  function startJets(opts) {
    boot();
    if (!canvas) return;
    opts = opts || {};
    var n = opts.count || 5;
    var now = Date.now();
    var dur = opts.ms || 2400;
    var height = (opts.height || 0.62) * h;
    var kind = opts.kind || 'gold';
    var i, x;
    jets = [];
    for (i = 0; i < n; i++) {
      x = n === 1 ? w * 0.5 : w * (0.10 + i * (0.80 / (n - 1)));
      jets.push({
        x: x,
        until: now + dur,
        h: height * (0.88 + Math.random() * 0.14),
        kind: kind,
        rate: opts.rate || 14
      });
    }
  }

  function emitFrom(jet, dt) {
    var n = Math.max(1, Math.round(jet.rate * (dt / 16)));
    var i, speed, spread, life;
    for (i = 0; i < n; i++) {
      speed = 4.2 + Math.random() * 5.5;
      spread = (Math.random() - 0.5) * 0.55;
      life = 0.55 + Math.random() * 0.45;
      sparks.push({
        x: jet.x + (Math.random() - 0.5) * 6,
        y: h - 2,
        vx: spread * speed * 0.35,
        vy: -speed * (0.85 + Math.random() * 0.45) * (jet.h / (h * 0.55)),
        g: 0.085 + Math.random() * 0.03,
        life: life,
        max: life,
        s: 0.7 + Math.random() * 1.6,
        col: sparkColor(jet.kind)
      });
    }
    if (sparks.length > 520) sparks.splice(0, sparks.length - 520);
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!ctx) return;
    var dt = lastTs ? Math.min(32, ts - lastTs) : 16;
    lastTs = ts;
    var now = Date.now();
    var i, j, p, a, tail;

    for (j = jets.length - 1; j >= 0; j--) {
      if (now > jets[j].until) jets.splice(j, 1);
      else emitFrom(jets[j], dt);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    for (i = sparks.length - 1; i >= 0; i--) {
      p = sparks[i];
      p.life -= dt / 900;
      if (p.life <= 0 || p.y > h + 8) { sparks.splice(i, 1); continue; }
      p.vy += p.g * (dt / 16);
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx *= 0.995;
      a = Math.max(0, p.life / p.max);
      tail = Math.max(4, -p.vy * 1.6);
      ctx.strokeStyle = p.col;
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = p.s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2 + tail * 0.15);
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ambientOn) {
      for (i = 0; i < motes.length; i++) {
        p = motes[i];
        p.tw += 0.018 * p.ts;
        p.x += p.vx + Math.sin(p.tw) * 0.14;
        p.y += p.vy;
        if (p.y < -8) { p.y = h + 6; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 6;
        if (p.x > w + 8) p.x = -6;
        a = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = sparkColor('gold');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function onColor(color) {
    var t = Date.now();
    if (t - lastColorAt < 1000) return;
    lastColorAt = t;
    startJets({
      kind: kindFromColor(color),
      count: 5,
      height: 0.58,
      ms: 2600,
      rate: 13
    });
  }

  function onLyric() {
    var t = Date.now();
    if (t - lastLyricAt < 850) return;
    lastLyricAt = t;
    startJets({ kind: 'gold', count: 3, height: 0.42, ms: 1200, rate: 10 });
  }

  function onWin() {
    startJets({ kind: 'gold', count: 7, height: 0.82, ms: 4200, rate: 18 });
  }

  function off() {
    jets = [];
    var i;
    for (i = 0; i < sparks.length; i++) sparks[i].life *= 0.35;
  }

  global.StorytraceFX = { onColor: onColor, onLyric: onLyric, onWin: onWin, off: off, ambient: ambient };
})(window);
