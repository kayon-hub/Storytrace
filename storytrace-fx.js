/* 賓客端舞台特效（方案 A）。不改控台。對上既有換色／歌詞／中獎。 */
(function (global) {
  'use strict';

  var canvas, ctx, w = 0, h = 0, dpr = 1, raf = 0, lastTs = 0;
  var parts = [];
  var lastColorAt = 0, lastLyricAt = 0;
  var reduced = false;

  function boot() {
    if (canvas) return;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
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
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hueOf(color) {
    if (!color) return null;
    var m = String(color).match(/hsl\(\s*(-?[\d.]+)/i);
    if (m) return ((parseFloat(m[1]) % 360) + 360) % 360;
    var hex = String(color).match(/^#?([0-9a-f]{6})$/i);
    if (!hex) return null;
    var n = parseInt(hex[1], 16);
    var r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.04) return max > 0.85 ? 48 : 0;
    var hue = 0;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = hue * 60;
    if (hue < 0) hue += 360;
    return hue;
  }

  function palette(kind, src) {
    if (kind === 'rose') return ['#F4C1C8', '#E8A0B0', '#C9A84C', '#FFF5F0', '#D4788A'];
    if (kind === 'gold') return ['#C9A84C', '#E8C97A', '#FFF3C4', '#B8923A', '#F0EBE0'];
    if (kind === 'win') return ['#C9A84C', '#FFE08A', '#FFFFFF', '#E8C97A', '#F4C1C8'];
    if (src && String(src).indexOf('hsl') === 0) return [src, '#F0EBE0', '#C9A84C', src];
    return ['#C9A84C', '#F0EBE0', '#E8C97A', '#D4B896'];
  }

  function kindFromColor(color) {
    var hue = hueOf(color);
    if (hue == null) return 'gold';
    if (hue >= 320 || hue <= 20) return 'rose';
    if (hue >= 28 && hue <= 62) return 'gold';
    return 'tint';
  }

  function addPetal(x, y, pal, fall) {
    var col = pal[(Math.random() * pal.length) | 0];
    parts.push({
      t: 'p',
      x: x, y: y,
      vx: (Math.random() - 0.5) * (fall ? 0.6 : 2.4),
      vy: fall ? (0.4 + Math.random() * 0.9) : (-2.2 - Math.random() * 2.4),
      g: fall ? 0.012 : 0.035,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
      s: 5 + Math.random() * 9,
      a: 0.85 + Math.random() * 0.15,
      life: 1,
      decay: 0.0035 + Math.random() * 0.003,
      col: col,
      sway: Math.random() * Math.PI * 2,
      petals: 4 + ((Math.random() * 2) | 0)
    });
  }

  function addSpark(x, y, pal, speed) {
    var ang = Math.random() * Math.PI * 2;
    var sp = speed * (0.45 + Math.random() * 0.7);
    parts.push({
      t: 's',
      x: x, y: y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      g: 0.04,
      a: 1,
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
      col: pal[(Math.random() * pal.length) | 0],
      s: 1.2 + Math.random() * 1.8
    });
  }

  function cap() {
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }

  function petals(opts) {
    if (reduced) return;
    boot();
    opts = opts || {};
    var n = opts.count || 28;
    var pal = palette(opts.kind || 'gold', opts.color);
    var i;
    for (i = 0; i < n; i++) {
      addPetal(Math.random() * w, -20 - Math.random() * 80, pal, true);
    }
    cap();
  }

  function burst(opts) {
    if (reduced) return;
    boot();
    opts = opts || {};
    var pal = palette(opts.kind || 'gold', opts.color);
    var cx = opts.x != null ? opts.x : w * (0.3 + Math.random() * 0.4);
    var cy = opts.y != null ? opts.y : h * (0.28 + Math.random() * 0.2);
    var i;
    for (i = 0; i < (opts.sparks || 36); i++) addSpark(cx, cy, pal, opts.speed || 4.2);
    for (i = 0; i < (opts.flowers || 10); i++) addPetal(cx + (Math.random() - 0.5) * 40, cy, pal, false);
    cap();
  }

  function fireworks() {
    if (reduced) return;
    boot();
    burst({ kind: 'win', sparks: 48, flowers: 14, speed: 5.2, x: w * 0.5, y: h * 0.32 });
    setTimeout(function () { burst({ kind: 'win', sparks: 32, flowers: 8, speed: 4.4, x: w * 0.28, y: h * 0.26 }); }, 180);
    setTimeout(function () { burst({ kind: 'win', sparks: 32, flowers: 8, speed: 4.4, x: w * 0.72, y: h * 0.24 }); }, 340);
    setTimeout(function () { petals({ kind: 'win', count: 36 }); }, 220);
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, p.a * p.life);
    ctx.fillStyle = p.col;
    var i, n = p.petals;
    for (i = 0; i < n; i++) {
      ctx.rotate((Math.PI * 2) / n);
      ctx.beginPath();
      ctx.ellipse(0, -p.s * 0.45, p.s * 0.28, p.s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.globalAlpha = Math.max(0, p.a * p.life * 0.9);
    ctx.fillStyle = '#FFF6D8';
    ctx.arc(0, 0, p.s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!ctx) return;
    var dt = lastTs ? Math.min(32, ts - lastTs) : 16;
    lastTs = ts;
    ctx.clearRect(0, 0, w, h);
    var i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      p.life -= p.decay * (dt / 16);
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.t === 'p') {
        p.sway += 0.04 * (dt / 16);
        p.x += (p.vx + Math.sin(p.sway) * 0.55) * (dt / 16);
        p.vy += p.g * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rot += p.vr * (dt / 16);
        drawPetal(p);
      } else {
        p.vy += p.g * (dt / 16);
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.vx *= 0.992;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function onColor(color) {
    var now = Date.now();
    if (now - lastColorAt < 1100) return;
    lastColorAt = now;
    var kind = kindFromColor(color);
    burst({ kind: kind === 'tint' ? 'gold' : kind, color: color, sparks: 18, flowers: 8, speed: 3.2 });
    petals({ kind: kind === 'tint' ? 'gold' : kind, color: color, count: 22 });
  }

  function onLyric() {
    var now = Date.now();
    if (now - lastLyricAt < 900) return;
    lastLyricAt = now;
    petals({ kind: 'gold', count: 10 });
  }

  function onWin() { fireworks(); }

  function off() {
    var i;
    for (i = 0; i < parts.length; i++) parts[i].decay = 0.04;
  }

  global.StorytraceFX = { onColor: onColor, onLyric: onLyric, onWin: onWin, off: off };

  if (/(?:\?|&)fxdemo=1(?:&|$)/.test(location.search || '')) {
    window.addEventListener('load', function () {
      setTimeout(function () { onColor('hsl(340,100%,50%)'); }, 500);
      setTimeout(function () { onLyric(); }, 2000);
      setTimeout(function () { onColor('hsl(45,100%,50%)'); }, 3600);
      setTimeout(function () { fireworks(); }, 5400);
    });
  }
})(window);
