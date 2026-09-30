/* Shared motion kit for the audience variants.
 * Mechanics only (seekable GSAP timeline, beat math, slams, text splitting, deterministic FX).
 * Each variant owns its own look: palette, type, particle shape and procedural extras.
 */
window.StorioKit = {
  async create(opts = {}) {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const TIMING = await (await fetch('timing.json')).json();
    const BEAT = 60 / TIMING.bpm;
    const H = TIMING.hits;
    const B = (b) => b * BEAT;
    const tl = gsap.timeline({ paused: true });
    gsap.ticker.lagSmoothing(0);

    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rnd = mulberry32(opts.seed || 1234);
    const R = (a, b) => a + (b - a) * rnd();
    const hash = (n) => mulberry32(n * 9973 + 17)();

    $$('[style*="translateX(-50%)"]').forEach((el) => { el.style.transform = ''; gsap.set(el, { xPercent: -50 }); });
    // Zero the px offsets GSAP parses from the CSS translate(-50%,-50%), otherwise elements whose
    // tweens never touch x/y end up double-offset by half their size.
    gsap.set('.c', { x: 0, y: 0, xPercent: -50, yPercent: -50 });

    function splitChars(el, accentClass = 'accent') {
      const out = [];
      const walk = (node, acc) => {
        [...node.childNodes].forEach((ch) => {
          if (ch.nodeType === 3) {
            const frag = document.createDocumentFragment();
            [...ch.textContent].forEach((c) => {
              const s = document.createElement('span');
              s.className = 'char' + (acc ? ' ' + accentClass : '');
              s.textContent = c === ' ' ? ' ' : c;
              frag.appendChild(s); out.push(s);
            });
            node.replaceChild(frag, ch);
          } else if (ch.nodeType === 1) {
            const a = acc || ch.classList.contains(accentClass);
            ch.classList.remove(accentClass);
            walk(ch, a);
          }
        });
      };
      const acc = el.classList.contains(accentClass);
      el.classList.remove(accentClass);
      walk(el, acc);
      gsap.set(out, { transformPerspective: 700, opacity: 0 });
      return out;
    }

    function splitWords(el) {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
      const ws = [...el.querySelectorAll('.word')];
      gsap.set(ws, { opacity: 0, display: 'inline-block' });
      return ws;
    }

    // Motion arrives at full speed ON the beat, then squash + elastic settle.
    function slam(el, from, hitB, o = {}) {
      const hit = B(hitB), lead = o.lead ?? 0.24;
      const to = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, opacity: 1, ...(o.to || {}) };
      tl.set(el, { opacity: 1 }, hit - lead);
      tl.fromTo(el, from, { ...to, duration: lead, ease: o.ease || 'power3.in', immediateRender: false }, hit - lead);
      const sq = o.squash ?? 0.16;
      if (sq) {
        const s = o.axis === 'x' ? { scaleX: 1 - sq, scaleY: 1 + sq } : { scaleX: 1 + sq, scaleY: 1 - sq };
        tl.fromTo(el, s, { scaleX: to.scale, scaleY: to.scale, duration: o.settle ?? 0.6, ease: o.settleEase || 'elastic.out(1.1,0.32)', immediateRender: false }, hit);
      }
    }

    // Gentle arrival for calm edits: eased in ahead of the beat, settles exactly on it.
    function glide(el, from, hitB, o = {}) {
      const hit = B(hitB), dur = o.dur ?? 0.7;
      const to = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, ...(o.to || {}) };
      tl.fromTo(el, from, { ...to, duration: dur, ease: o.ease || 'expo.out', immediateRender: false }, hit - (o.pre ?? 0.05));
    }

    function charsIn(chars, hitB, o = {}) {
      const st = o.stagger ?? 0.018, lead = o.lead ?? 0.17, n = chars.length;
      chars.forEach((c, i) => {
        const hit = hitB + (i - (n - 1) / 2) * st / BEAT;
        const up = o.dir !== 'down';
        slam(c, { yPercent: up ? 130 : -130, rotationX: up ? -95 : 95, opacity: 0, ...(o.from || {}) }, hit,
          { lead, squash: o.squash ?? 0.22, settle: 0.5, to: { yPercent: 0 } });
      });
    }

    function charsOut(chars, atB, o = {}) {
      tl.to(chars, { yPercent: o.dir === 'down' ? 140 : -140, rotationX: 70, opacity: 0, duration: 0.18, ease: 'power3.in',
        stagger: { each: 0.01, from: 'center' } }, B(atB) - 0.2);
    }

    function scene(id, fromS, toS) {
      gsap.set(id, { autoAlpha: 0 });
      tl.set(id, { autoAlpha: 1 }, Math.max(0, fromS));
      if (toS !== undefined) tl.set(id, { autoAlpha: 0 }, toS);
    }

    const PARTS = [
      ['frame', '50% 50%'], ['reel_left', '27.8% 50.5%'], ['reel_right', '72% 50.5%'],
      ['book_top', '50% 28.8%'], ['book_bottom', '50% 70.8%'], ['wordmark', '50% 50.6%'],
    ];
    function buildLogo(host, base = '../../assets/logo') {
      const p = {};
      PARTS.forEach(([n, o]) => {
        const d = document.createElement('div');
        d.className = 'part'; d.style.transformOrigin = o;
        d.innerHTML = `<img src="${base}/${n}.png" alt="">`;
        host.appendChild(d); p[n] = d;
      });
      gsap.set(Object.values(p), { opacity: 0 });
      return p;
    }

    // ---- FX registry + deterministic procedural renderer
    const fx = { impacts: [], rings: [], bursts: [], kicks: [], flashes: [] };
    const impact = (b, s) => fx.impacts.push({ t: B(b), s });
    const ring = (b, x, y, s = 1) => fx.rings.push({ t: B(b), x, y, s });
    const flash = (b, s = 0.5) => fx.flashes.push({ t: B(b), s });
    const kick = (b, s = 1) => fx.kicks.push({ t: B(b), s });
    const burst = (b, x, y, n, speed, life = 0.9, kind) => {
      const parts = [];
      for (let i = 0; i < n; i++) parts.push({ a: R(0, Math.PI * 2), v: speed * R(0.35, 1), size: R(6, 16), spin: R(-8, 8), rot: R(0, 6.28), c: Math.floor(R(0, 1000)) });
      fx.bursts.push({ t: B(b), x, y, parts, life, kind });
    };

    const env = (list, t, tau) => { let m = 0; for (const k of list) { const d = t - k.t; if (d >= 0 && d < 1.5) m = Math.max(m, k.s * Math.exp(-d / tau)); } return m; };
    const expo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

    const cv = $('#fxCanvas'), ctx = cv ? cv.getContext('2d') : null;
    const grainEl = $('#grain');
    if (grainEl) {
      const g = document.createElement('canvas'); g.width = g.height = 256;
      const gx = g.getContext('2d'), id = gx.createImageData(256, 256), gr = mulberry32(42);
      for (let i = 0; i < id.data.length; i += 4) { const v = gr() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gx.putImageData(id, 0, 0);
      grainEl.style.backgroundImage = `url(${g.toDataURL()})`;
    }

    const shape = {
      dot: (x, y, s) => { ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, 6.283); ctx.fill(); },
      diamond: (x, y, s, r) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.62, 0); ctx.closePath(); ctx.fill(); ctx.restore(); },
      rect: (x, y, s, r) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillRect(-s * 0.7, -s * 0.35, s * 1.4, s * 0.7); ctx.restore(); },
      streak: (x, y, s, r) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillRect(-s * 1.6, -1.5, s * 3.2, 3); ctx.restore(); },
    };

    const style = { ringColor: '226,192,122', burstColors: ['226,192,122'], burstShape: 'diamond', shakeAmp: 26, flashEl: '#flash', stage: '#stage', ...opts.fx };

    function procedural(t) {
      let sx = 0, sy = 0, sr = 0;
      for (const k of fx.impacts) {
        const d = t - k.t; if (d < 0 || d > 0.7) continue;
        const a = k.s * Math.exp(-d / 0.1);
        sx += a * style.shakeAmp * Math.sin(d * 97 + k.t * 7); sy += a * style.shakeAmp * 0.85 * Math.cos(d * 83 + k.t * 3); sr += a * 0.6 * Math.sin(d * 71 + k.t);
      }
      gsap.set(style.stage, { x: sx, y: sy, rotation: sr });
      const fl = $(style.flashEl); if (fl) fl.style.opacity = Math.min(0.8, env(fx.flashes, t, 0.08));
      if (grainEl) { const fr = Math.floor(t * 24); grainEl.style.backgroundPosition = `${Math.floor(hash(fr) * 256)}px ${Math.floor(hash(fr + 999) * 256)}px`; }
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const r of fx.rings) {
        const d = t - r.t; if (d < 0 || d > 0.75) continue;
        const p = d / 0.75, rad = 40 + 900 * r.s * expo(p);
        ctx.strokeStyle = `rgba(${style.ringColor},${0.85 * (1 - p) ** 2})`; ctx.lineWidth = 3 + 20 * (1 - p) ** 2;
        ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 6.283); ctx.stroke();
      }
      for (const b of fx.bursts) {
        const d = t - b.t; if (d < 0 || d > b.life) continue;
        const p = d / b.life;
        for (const q of b.parts) {
          const dist = q.v * 0.5 * (1 - Math.exp(-d / 0.16));
          const x = b.x + Math.cos(q.a) * dist, y = b.y + Math.sin(q.a) * dist + 300 * d * d;
          ctx.fillStyle = `rgba(${style.burstColors[q.c % style.burstColors.length]},${(1 - p) ** 1.4})`;
          shape[b.kind || style.burstShape](x, y, q.size * (1 - p * 0.5), q.rot + q.spin * d);
        }
      }
    }

    const extras = [];
    const onFrame = (fn) => extras.push(fn);
    const renderAt = (t) => { tl.seek(t, false); procedural(t); extras.forEach((fn) => fn(t, { kp: env(fx.kicks, t, 0.11), env })); };

    async function ready(extraUrls = []) {
      const urls = new Set(extraUrls.map((u) => new URL(u, location.href).href));
      $$('img').forEach((i) => urls.add(i.src));
      $$('*').forEach((el) => { const m = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/); if (m && !m[1].startsWith('data:')) urls.add(m[1]); });
      await Promise.all([...urls].map((u) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => im.decode().then(res, res); im.src = u; })));
      for (const f of opts.fonts || []) await document.fonts.load(f);
      await document.fonts.ready;
      tl.set({}, {}, TIMING.duration);
      window.renderAt = renderAt;
      window.DURATION = TIMING.duration;
      renderAt(0);
      window.__ready = true;
    }

    return { $, $$, tl, B, H, BEAT, TIMING, R, hash, splitChars, splitWords, slam, glide, charsIn, charsOut, scene, buildLogo,
      impact, ring, flash, kick, burst, onFrame, ready, env, expo };
  },
};
