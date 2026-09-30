/* Storio — 15s IG Story motion piece.
 * One paused GSAP timeline (seeked per frame) + a deterministic procedural
 * layer computed purely from time t, so every frame renders identically.
 */
(async function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const TIMING = await (await fetch('timing.json')).json();
  const BEAT = 60 / TIMING.bpm;
  const H = TIMING.hits;
  const B = (b) => b * BEAT;
  const tl = gsap.timeline({ paused: true });
  gsap.ticker.lagSmoothing(0);

  // ---------- deterministic randomness
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260929);
  const R = (a, b) => a + (b - a) * rnd();
  const hash = (n) => { const r = mulberry32(n * 9973 + 17); return r(); };

  // ---------- centering: GSAP owns transforms, so move CSS centering into xPercent/yPercent
  $$('[style*="translateX(-50%)"]').forEach((el) => { el.style.transform = ''; gsap.set(el, { xPercent: -50 }); });
  gsap.set('.c', { xPercent: -50, yPercent: -50 });

  // ---------- helpers
  function splitChars(el) {
    const out = [];
    const walk = (node, gold) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...ch.textContent].forEach((c) => {
            const s = document.createElement('span');
            s.className = 'char' + (gold ? ' goldGrad' : '');
            s.textContent = c === ' ' ? ' ' : c;
            frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          const g = gold || ch.classList.contains('goldGrad');
          ch.classList.remove('goldGrad');
          walk(ch, g);
        }
      });
    };
    const gold = el.classList.contains('goldGrad');
    el.classList.remove('goldGrad');
    walk(el, gold);
    gsap.set(out, { transformPerspective: 700, opacity: 0 });
    return out;
  }

  // Motion arrives at full speed ON the beat (ease-in), then squash & elastic settle.
  function slam(el, from, hitB, o = {}) {
    const hit = B(hitB), lead = o.lead ?? 0.24;
    const to = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, opacity: 1, ...(o.to || {}) };
    tl.set(el, { opacity: 1 }, hit - lead);
    tl.fromTo(el, from, { ...to, duration: lead, ease: o.ease || 'power3.in', immediateRender: false }, hit - lead);
    const sq = o.squash ?? 0.16;
    if (sq) {
      const horiz = o.axis === 'x';
      const s = horiz ? { scaleX: 1 - sq, scaleY: 1 + sq } : { scaleX: 1 + sq, scaleY: 1 - sq };
      tl.fromTo(el, s, { scaleX: to.scale, scaleY: to.scale, duration: o.settle ?? 0.6, ease: 'elastic.out(1.1,0.32)', immediateRender: false }, hit);
    }
  }

  function charsIn(chars, hitB, o = {}) {
    const st = o.stagger ?? 0.018, lead = o.lead ?? 0.17, n = chars.length;
    chars.forEach((c, i) => {
      const hit = hitB + (i - (n - 1) / 2) * st / BEAT;
      slam(c, { yPercent: o.dir === 'down' ? -130 : 130, rotationX: o.dir === 'down' ? 95 : -95, opacity: 0 }, hit,
        { lead, squash: o.squash ?? 0.22, settle: 0.5, to: { yPercent: 0 } });
    });
  }

  function charsOut(chars, atB, o = {}) {
    tl.to(chars, { yPercent: o.dir === 'down' ? 140 : -140, rotationX: 70, opacity: 0, duration: 0.18, ease: 'power3.in',
      stagger: { each: 0.01, from: 'center' } }, B(atB) - 0.2);
  }

  function sceneWindow(id, fromS, toS) {
    tl.set(id, { autoAlpha: 1 }, Math.max(0, fromS));
    if (toS !== undefined) tl.set(id, { autoAlpha: 0 }, toS);
  }

  // ---------- logo from real split parts
  const PARTS = [
    ['frame', '50% 50%'], ['reel_left', '27.8% 50.5%'], ['reel_right', '72% 50.5%'],
    ['book_top', '50% 28.8%'], ['book_bottom', '50% 70.8%'], ['wordmark', '50% 50.6%'],
  ];
  function buildLogo(host) {
    const p = {};
    PARTS.forEach(([n, o]) => {
      const d = document.createElement('div');
      d.className = 'part'; d.style.transformOrigin = o;
      d.innerHTML = `<img src="assets/logo/${n}.png" alt="">`;
      host.appendChild(d); p[n] = d;
    });
    const g = document.createElement('div'); g.className = 'glint'; host.appendChild(g); p.glint = g;
    gsap.set(Object.values(p).filter((x) => x !== g), { opacity: 0 });
    return p;
  }

  // ---------- FX registry (consumed by the procedural layer)
  const impacts = [];   // camera shake + flash
  const rings = [];     // shockwaves
  const bursts = [];    // particle bursts
  const kicks = [];     // background pulse
  const impact = (b, s, x = 540, y = 820, ringN = 1) => {
    impacts.push({ t: B(b), s });
    for (let i = 0; i < ringN; i++) rings.push({ t: B(b) + i * 0.07, x, y, s: s * (1 - i * 0.2) });
  };
  const burst = (b, x, y, n, speed, kind = 'diamond', life = 0.9) => {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2);
      parts.push({ a, v: speed * R(0.35, 1), size: R(6, 16), spin: R(-8, 8), rot: R(0, 6.28), tw: R(0, 6.28) });
    }
    bursts.push({ t: B(b), x, y, parts, kind, life });
  };
  for (const b of [0, 1, 1.5, 2, 2.5, 3]) kicks.push({ t: B(b), s: 0.6 });
  for (let b = 4; b < 18; b++) kicks.push({ t: B(b), s: 1 });
  for (const b of [18, 20]) kicks.push({ t: B(b), s: 0.8 });
  for (let b = 22; b < 26; b++) kicks.push({ t: B(b), s: 1 });
  kicks.push({ t: B(26), s: 1.4 });

  // ============================================================ SCENE 1 — assembly
  const L1 = buildLogo($('#logo1'));
  sceneWindow('#s1', 0, B(H.movies));
  gsap.set('#logo1', { left: 540, top: 820 });
  gsap.set('#tagWrap', { top: 1120 });

  tl.fromTo('#frameLines', { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'expo.out' }, 0);
  tl.fromTo('.hud', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }, 0.15);

  // frame: impact pop on the downbeat
  tl.set(L1.frame, { opacity: 1 }, 0);
  tl.fromTo(L1.frame, { scale: 2.5, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'expo.out' }, 0);
  impact(H.frameSlam, 1.0, 540, 820, 2);
  slam(L1.reel_left, { x: -900, rotation: -600 }, H.reelLeft, { axis: 'x', lead: 0.26 });
  slam(L1.reel_right, { x: 900, rotation: 600 }, H.reelRight, { axis: 'x', lead: 0.26 });
  slam(L1.book_top, { y: -1100, rotation: -25 }, H.bookTop, { lead: 0.24 });
  slam(L1.book_bottom, { y: 1100, rotation: 25 }, H.bookBottom, { lead: 0.24 });
  for (const [k, x] of [['reelLeft', 345], ['reelRight', 735], ['bookTop', 540], ['bookBottom', 540]]) impacts.push({ t: B(H[k]), s: 0.35 });
  // reels keep turning, then whip on the drop
  for (const r of [L1.reel_left, L1.reel_right]) {
    const land = r === L1.reel_left ? H.reelLeft : H.reelRight, dir = r === L1.reel_left ? 1 : -1;
    tl.to(r, { rotation: `+=${dir * 140}`, duration: B(H.drop - land), ease: 'none' }, B(land) + 0.01);
    tl.to(r, { rotation: `+=${dir * 520}`, duration: 1.8, ease: 'expo.out' }, B(H.drop));
  }
  // wordmark: centre-out wipe + pop
  tl.set(L1.wordmark, { opacity: 1 }, B(H.wordmark));
  tl.fromTo(L1.wordmark, { clipPath: 'inset(0% 50% 0% 50%)', scale: 1.5 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.45, ease: 'expo.out' }, B(H.wordmark));
  impacts.push({ t: B(H.wordmark), s: 0.4 });
  // anticipation -> DROP
  tl.to('#logo1', { scale: 0.88, rotation: -4, duration: B(0.5), ease: 'power2.in' }, B(H.drop - 0.5));
  tl.to('#logo1', { scale: 1.16, rotation: 0, duration: 0.05, ease: 'power2.out' }, B(H.drop));
  tl.to('#logo1', { scale: 1, duration: 0.9, ease: 'elastic.out(1.1,0.28)' }, B(H.drop) + 0.05);
  impact(H.drop, 1.3, 540, 820, 3);
  burst(H.drop, 540, 820, 46, 900);
  // logo docks upward to make room for the tagline
  tl.to('#logo1', { y: -450, scale: 0.56, duration: B(0.62), ease: 'power4.inOut' }, B(H.tagCollect) - B(0.72));

  const tag1 = splitChars($('#tag1')), tag2 = splitChars($('#tag2')), tag3 = splitChars($('#tag3'));
  charsIn(tag1, H.tagCollect);
  charsIn(tag2, H.tagStories, { dir: 'down' });
  tag3.forEach((c, i) => {
    const hit = B(H.tagFolio) + (i - tag3.length / 2) * 0.012;
    tl.set(c, { opacity: 1 }, hit - 0.12);
    tl.fromTo(c, { scale: 0, rotation: R(-40, 40), y: 40 }, { scale: 1, rotation: 0, y: 0, duration: 0.5, ease: 'back.out(3)', immediateRender: false }, hit - 0.12);
  });
  const sw = $('#swoosh path'), swLen = sw.getTotalLength();
  gsap.set(sw, { strokeDasharray: swLen, strokeDashoffset: swLen });
  tl.to(sw, { strokeDashoffset: 0, duration: 0.35, ease: 'expo.out' }, B(H.tagFolio) + 0.05);
  for (const k of ['tagCollect', 'tagStories', 'tagFolio']) impacts.push({ t: B(H[k]), s: 0.45 });
  // whip exit
  tl.to(['#logo1', '#tagWrap'], { y: '-=320', scale: 1.3, opacity: 0, filter: 'blur(20px)', duration: 0.22, ease: 'power3.in', stagger: 0.03 }, B(H.movies) - 0.25);

  // ============================================================ SCENE 2 — movies / series / books
  sceneWindow('#s2', B(H.movies) - 0.3, B(H.rate) - 0.05);
  const grid = $('#grid');
  const COLS = [210, 540, 870], ROWS = [880, 1360];
  const cards = [];
  for (let i = 0; i < 6; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="face front" style="background-image:url(assets/posters/movie_${i}.jpg)"></div>
                      <div class="face back" style="background-image:url(assets/posters/series_${i}.jpg)"></div>`;
    grid.appendChild(card);
    gsap.set(card, { left: COLS[i % 3], top: ROWS[Math.floor(i / 3)], xPercent: -50, yPercent: -50, opacity: 0 });
    cards.push(card);
  }
  const catM = splitChars($('#catMovies')), catS = splitChars($('#catSeries')), catBk = splitChars($('#catBooks'));
  gsap.set(['#catKick', '#catCap'], { opacity: 0 });
  tl.fromTo('#catKick', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, B(H.movies) - 0.1);
  tl.fromTo('#catCap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, B(H.movies) + 0.1);
  charsIn(catM, H.movies);
  charsOut(catM, H.series);
  charsIn(catS, H.series, { dir: 'down' });
  charsOut(catS, H.books, { dir: 'down' });
  charsIn(catBk, H.books);
  const capSwap = (b, text, n) => {
    tl.to(['#catCap', '#catKick'], { opacity: 0, y: -14, duration: 0.12, ease: 'power2.in' }, B(b) - 0.14);
    tl.set('#catCap', { textContent: text }, B(b) - 0.02);
    tl.set('#catKick', { textContent: `YOUR FOLIO / 0${n}` }, B(b) - 0.02);
    tl.fromTo(['#catCap', '#catKick'], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', immediateRender: false }, B(b));
  };
  capSwap(H.series, 'every season you binge', 2);
  capSwap(H.books, 'every page you turn', 3);

  cards.forEach((card, i) => {
    const hit = H.movies + i * 0.25;
    const side = i % 3 === 0 ? -1 : i % 3 === 2 ? 1 : (i < 3 ? -0.3 : 0.3);
    slam(card, { x: side * R(700, 1000), y: R(-900, 900), rotation: R(-55, 55), rotationY: R(-70, 70), scale: 0.45 }, hit, { lead: 0.3, squash: 0.12 });
    impacts.push({ t: B(hit), s: 0.18 });
    tl.to(card, { y: '-=16', duration: B(1), ease: 'sine.inOut', yoyo: true, repeat: 3 }, B(hit) + 0.45);
    // flip to series
    const f1 = H.series + i * 0.25;
    tl.to(card, { rotationY: 180, duration: 0.42, ease: 'back.out(1.7)' }, B(f1) - 0.08);
    tl.fromTo(card, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)', immediateRender: false }, B(f1));
    // flip to books (front image swapped while it faces away)
    const f2 = H.books + i * 0.25;
    tl.set(card.querySelector('.front'), { backgroundImage: `url(assets/posters/book_${i}.jpg)` }, B(f2) - 0.1);
    tl.to(card, { rotationY: 360, duration: 0.42, ease: 'back.out(1.7)' }, B(f2) - 0.08);
    tl.fromTo(card, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)', immediateRender: false }, B(f2));
  });
  impact(H.movies, 0.7, 540, 1120, 1);
  impact(H.series, 0.6, 540, 1120, 1);
  impact(H.books, 0.6, 540, 1120, 1);
  // bento beat: tilt the wall into a floor, then drop it away
  tl.to('#grid', { rotationX: 58, y: 160, scale: 0.84, transformPerspective: 1400, duration: B(0.6), ease: 'power2.inOut', transformOrigin: '50% 60%' }, B(H.bento) - 0.05);
  tl.to(cards, { y: '+=1100', rotation: () => R(-30, 30), opacity: 0, duration: 0.32, ease: 'power3.in', stagger: { each: 0.025, from: 'center' } }, B(H.rate) - 0.42);
  tl.to('#catHead', { y: '-=240', opacity: 0, filter: 'blur(16px)', duration: 0.22, ease: 'power3.in' }, B(H.rate) - 0.26);

  // ============================================================ SCENE 3 — rate
  sceneWindow('#s3', B(H.rate) - 0.32, B(H.reflect) - 0.02);
  $('#hero').style.backgroundImage = 'url(assets/posters/movie_0.jpg)';
  gsap.set(['#hero', '#stamp', '#heroMeta'], { opacity: 0 });
  charsIn(splitChars($('#rateHead')), H.rate);
  slam('#hero', { scale: 0.25, rotationY: -80, rotation: -12, y: 300 }, H.rate, { lead: 0.3, squash: 0.1 });
  impact(H.rate, 0.8, 540, 900, 1);
  tl.to('#hero', { rotationY: 7, rotationX: -4, duration: B(1.2), ease: 'sine.inOut', yoyo: true, repeat: 1 }, B(H.rate) + 0.5);
  tl.fromTo('#heroMeta', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, B(H.rate) + 0.15);

  const STAR = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
  const starsHost = $('#stars');
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = `${i * 87}px`; s.style.top = '7px';
    s.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="${STAR}" fill="none" stroke="rgba(197,160,89,.45)" stroke-width="1.4" stroke-linejoin="round"/>
      <polygon class="fill" points="${STAR}" fill="#e2c07a" stroke="#e2c07a" stroke-width="1.4" stroke-linejoin="round" style="transform-origin:12px 12px"/></svg>`;
    starsHost.appendChild(s);
    const fill = s.querySelector('.fill');
    gsap.set(s, { opacity: 0 }); gsap.set(fill, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(s, { opacity: 0, scale: 0, rotation: -90 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.5)', immediateRender: false }, B(H.rate) + 0.1 + i * 0.025);
    if (i < 9) {
      const hit = B(H.starsStart) + i * B(0.25);
      tl.fromTo(fill, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'elastic.out(1.2,0.35)', immediateRender: false }, hit);
      tl.fromTo(s, { scale: 1.45, rotation: 36 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'elastic.out(1.1,0.4)', immediateRender: false }, hit);
      burst(H.starsStart + i * 0.25, 148 + 87 * i, 1470, 7, 190, 'spark', 0.5);
    }
  }
  // stamp slam
  slam('#stamp', { scale: 3.4, rotation: 28, opacity: 0 }, H.stamp, { lead: 0.16, ease: 'power4.in', squash: 0.2, to: { rotation: -12 } });
  impact(H.stamp, 1.2, 780, 560, 2);
  burst(H.stamp, 780, 560, 30, 520);
  tl.to(['#rateHead', '#hero', '#stamp', '#heroMeta', '#stars'], { y: '-=320', opacity: 0, filter: 'blur(18px)', duration: 0.22, ease: 'power3.in', stagger: 0.02 }, B(H.reflect) - 0.28);

  // ============================================================ SCENE 4 — reflect
  sceneWindow('#s4', B(H.reflect) - 0.3, B(H.share) - 0.02);
  gsap.set(['#refCard', '#aiPill', '#polished'], { opacity: 0 });
  gsap.set('#refCard', { transformPerspective: 1200 });
  charsIn(splitChars($('#refHead')), H.reflect);
  slam('#refCard', { scale: 0.55, rotationX: 45, y: 260 }, H.reflect, { lead: 0.26, squash: 0.08 });
  impact(H.reflect, 0.6, 540, 960, 1);
  slam('#aiPill', { scale: 0, rotation: -20 }, H.reflect + 1, { lead: 0.15, squash: 0.2 });
  tl.to('#aiPill', { scale: 1.06, duration: B(0.5), ease: 'sine.inOut' }, B(H.aiRefine - 0.5));
  tl.to('#aiPill', { scale: 0.84, duration: 0.05, ease: 'power2.in' }, B(H.aiRefine) - 0.05);
  tl.to('#aiPill', { scale: 1, duration: 0.7, ease: 'elastic.out(1.2,0.3)' }, B(H.aiRefine));
  tl.fromTo('#aiPill', { backgroundColor: 'rgba(197,160,89,1)', color: '#0d0d0d' }, { backgroundColor: 'rgba(0,0,0,0.55)', color: '#c5a059', duration: 0.9, ease: 'power2.out', immediateRender: false }, B(H.aiRefine));
  tl.fromTo('#refCard', { boxShadow: '0 40px 90px rgba(0,0,0,.7), 0 0 0 3px rgba(226,192,122,1), 0 0 160px rgba(197,160,89,.55)' },
    { boxShadow: '0 40px 90px rgba(0,0,0,.7), 0 0 0 0px rgba(226,192,122,0), 0 0 0px rgba(197,160,89,0)', duration: 1.2, ease: 'power2.out', immediateRender: false }, B(H.aiRefine));
  impact(H.aiRefine, 0.5, 800, 1200, 1);
  burst(H.aiRefine, 800, 1200, 34, 620, 'spark', 1.2);
  slam('#polished', { scale: 0, rotation: -35, y: 60 }, H.aiRefine + 1, { lead: 0.14, squash: 0.2, to: { rotation: -6 } });
  tl.to(['#refHead', '#refCard', '#polished'], { scale: 0.5, opacity: 0, filter: 'blur(16px)', duration: 0.22, ease: 'power3.in', stagger: 0.02 }, B(H.share) - 0.26);

  // ============================================================ SCENE 5 — share
  sceneWindow('#s5', B(H.share) - 0.3, B(H.finale) - 0.02);
  const TPL = [['default', H.share], ['ticket', H.tplTicket], ['tv', H.tplTv], ['pure', H.tplPure], ['desk', H.tplDesk]];
  const tpls = TPL.map(([name]) => {
    const d = document.createElement('div');
    d.className = 'tpl'; d.style.backgroundImage = `url(assets/share/${name}.png)`;
    $('#tplStage').appendChild(d);
    gsap.set(d, { left: 540, top: 1035, xPercent: -50, yPercent: -50, opacity: 0 });
    return d;
  });
  const chips = $$('#chips .chip');
  gsap.set(chips, { opacity: 0 }); gsap.set(['#shareBtn'], { opacity: 0 });
  charsIn(splitChars($('#shareL1')), H.share);
  charsIn(splitChars($('#shareL2')), H.share + 0.5, { dir: 'down', stagger: 0.012 });
  tl.fromTo(chips, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)', stagger: 0.035, immediateRender: false }, B(H.share) + 0.05);
  TPL.forEach(([, hitB], j) => {
    const el = tpls[j];
    if (j === 0) slam(el, { scale: 0.3, rotationY: -70, y: 200 }, hitB, { lead: 0.26, squash: 0.1 });
    else {
      slam(el, { x: 780, rotationY: -60, scale: 0.8, filter: 'blur(16px)' }, hitB, { lead: 0.18, squash: 0.08, axis: 'x', to: { filter: 'blur(0px)' } });
      tl.to(tpls[j - 1], { x: -780, rotationY: 60, scale: 0.8, opacity: 0, filter: 'blur(16px)', duration: 0.18, ease: 'power3.in' }, B(hitB) - 0.18);
      tl.set(chips[j - 1], { attr: { class: 'chip' } }, B(hitB));
    }
    tl.set(chips[j], { attr: { class: 'chip on' } }, B(hitB));
    tl.fromTo(chips[j], { scale: 1.25 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1.2,0.35)', immediateRender: false }, B(hitB));
    impacts.push({ t: B(hitB), s: j === 0 ? 1.0 : 0.4 });
  });
  rings.push({ t: B(H.share), x: 540, y: 1010, s: 1 });
  slam('#shareBtn', { y: 260, scale: 0.6 }, H.share + 1, { lead: 0.2, squash: 0.15 });
  tl.to('#shareBtn', { scale: 0.88, duration: 0.05, ease: 'power2.in' }, B(25.5) - 0.05);
  tl.to('#shareBtn', { scale: 1, duration: 0.5, ease: 'elastic.out(1.2,0.35)' }, B(25.5));
  rings.push({ t: B(25.5), x: 540, y: 1560, s: 0.5 });
  tl.to(tpls[4], { scale: 0.05, y: 540, opacity: 0, duration: 0.24, ease: 'power3.in' }, B(H.finale) - 0.24);
  tl.to(['#shareHead', '#chips', '#shareBtn'], { opacity: 0, y: '-=160', filter: 'blur(14px)', duration: 0.2, ease: 'power3.in' }, B(H.finale) - 0.22);

  // ============================================================ SCENE 6 — finale
  sceneWindow('#s6', B(H.finale) - 0.26);
  const L2 = buildLogo($('#logo2'));
  gsap.set('#logo2', { left: 540, top: 760, scale: 0.86 });
  const scatter = { frame: [0, 0, 180], reel_left: [-760, -380, -540], reel_right: [760, -380, 540], book_top: [0, -1100, -60], book_bottom: [0, 1100, 60], wordmark: [0, 0, 0] };
  Object.entries(scatter).forEach(([k, [x, y, r]]) => {
    const from = k === 'wordmark' ? { scale: 3.2, opacity: 0 } : k === 'frame' ? { scale: 2.8, rotation: r } : { x, y, rotation: r, scale: 1.3 };
    slam(L2[k], from, H.finale, { lead: 0.24, ease: 'power4.in', squash: k === 'frame' ? 0.1 : 0 });
  });
  tl.fromTo('#logo2', { scale: 1.02 }, { scale: 0.86, duration: 1.1, ease: 'elastic.out(1.1,0.3)', immediateRender: false }, B(H.finale));
  for (const [r, d] of [[L2.reel_left, 1], [L2.reel_right, -1]]) tl.to(r, { rotation: `+=${d * 400}`, duration: 3, ease: 'expo.out' }, B(H.finale));
  impact(H.finale, 1.5, 540, 760, 3);
  burst(H.finale, 540, 760, 64, 1100);
  const word = splitChars($('#word'));
  charsIn(word, H.finale + 1, { stagger: 0.03, lead: 0.18 });
  gsap.set(['#tagline', '#avail'], { opacity: 0 });
  tl.fromTo('#tagline', { opacity: 0, y: 40, clipPath: 'inset(0% 100% 0% 0%)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.out', immediateRender: false }, B(H.finale + 2));
  slam('#avail', { scale: 0.4, y: 60 }, H.finale + 3, { lead: 0.18, squash: 0.15 });
  tl.fromTo(L2.glint, { opacity: 1, backgroundPosition: '120% 0%' }, { backgroundPosition: '-60% 0%', duration: 0.9, ease: 'power2.inOut', immediateRender: false }, B(H.glint));
  tl.to(L2.glint, { opacity: 0, duration: 0.1 }, B(H.glint) + 0.9);
  tl.fromTo('#s6', { scale: 1 }, { scale: 1.035, duration: TIMING.duration - B(H.finale), ease: 'none', immediateRender: false }, B(H.finale));
  tl.set({}, {}, TIMING.duration);

  // ============================================================ procedural layer
  const cv = $('#fxCanvas'), ctx = cv.getContext('2d');
  const dust = Array.from({ length: 70 }, () => ({ x: R(0, 1080), y: R(0, 1920), v: R(14, 60), a: R(4, 26), f: R(0.2, 0.9), ph: R(0, 6.28), s: R(1, 3.4), o: R(0.15, 0.55) }));

  // film grain tile
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const gx = g.getContext('2d'), id = gx.createImageData(256, 256), gr = mulberry32(42);
  for (let i = 0; i < id.data.length; i += 4) { const v = gr() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gx.putImageData(id, 0, 0);
  $('#grain').style.backgroundImage = `url(${g.toDataURL()})`;

  const TEXT1 = 'A slow-burn nightmare that never lets go.';
  const TEXT2 = 'A slow-burn nightmare that never lets go — that final act still lives rent-free in my head.';
  const GLYPHS = '#%&@$*+=<>/?!ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const scenes = [[0, 1], [B(H.movies), 2], [B(H.rate), 3], [B(H.reflect), 4], [B(H.share), 5], [B(H.finale), 6]];
  const pulseEls = ['#catHead', '#rateHead', '#refHead', '#shareHead'].map((s) => $(s));

  function env(list, t, tau) { let m = 0; for (const k of list) { const d = t - k.t; if (d >= 0 && d < 1.5) m = Math.max(m, k.s * Math.exp(-d / tau)); } return m; }
  const expo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

  function diamond(x, y, s, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.62, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function spark(x, y, s, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? s * 0.28 : s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function procedural(t) {
    // camera shake (+ chromatic split on strong hits)
    let sx = 0, sy = 0, sr = 0, chroma = 0;
    for (const k of impacts) {
      const d = t - k.t; if (d < 0 || d > 0.7) continue;
      const a = k.s * Math.exp(-d / 0.1);
      sx += a * 26 * Math.sin(d * 97 + k.t * 7); sy += a * 22 * Math.cos(d * 83 + k.t * 3); sr += a * 0.7 * Math.sin(d * 71 + k.t);
      if (k.s >= 1 && d < 0.1) chroma = Math.max(chroma, k.s * (1 - d / 0.1));
    }
    gsap.set('#stage', { x: sx, y: sy, rotation: sr, filter: chroma > 0.02 ? `drop-shadow(${9 * chroma}px 0 0 rgba(255,40,80,.55)) drop-shadow(${-9 * chroma}px 0 0 rgba(0,210,255,.5))` : 'none' });
    $('#flash').style.opacity = Math.min(0.85, env(impacts.filter((k) => k.s >= 0.6), t, 0.07) * 0.65);

    // kick-driven pulses
    const kp = env(kicks, t, 0.11);
    $('#bg').style.opacity = 0.62 + 0.38 * kp;
    gsap.set('#bg', { scale: 1 + 0.025 * kp });
    pulseEls.forEach((el) => gsap.set(el, { scale: 1 + 0.028 * kp }));
    if (t >= B(H.share)) gsap.set('#shareBtn', { boxShadow: `0 0 ${40 + 70 * kp}px rgba(197,160,89,${0.25 + 0.4 * kp})` });
    gsap.set('#bgType', { xPercent: -50, yPercent: -50, x: 180 - t * 26, rotation: -8 });
    $('#bgType').textContent = t < B(H.movies) ? 'FOLIO' : t < B(H.rate) ? 'STORIES' : t < B(H.reflect) ? 'RATE' : t < B(H.share) ? 'REFLECT' : t < B(H.finale) ? 'SHARE' : 'STORIO';

    // HUD
    const sc = scenes.filter(([s]) => t >= s).pop()[1];
    $('#hudTR').textContent = `0${sc} / 06`;
    const beat = Math.floor(t / BEAT);
    $('#hudBR').textContent = `BAR ${Math.floor(beat / 4) + 1} · ${(beat % 4) + 1}`;

    // grain
    const fr = Math.floor(t * 24);
    $('#grain').style.backgroundPosition = `${Math.floor(hash(fr) * 256)}px ${Math.floor(hash(fr + 999) * 256)}px`;

    // reflect: typing -> AI scramble -> refined
    if (t >= B(H.reflect) - 0.3 && t < B(H.share)) {
      let html = '', count = 0;
      if (t < B(H.aiRefine)) {
        const ticks = t < B(H.reflect) ? 0 : Math.floor((t - B(H.reflect)) / B(0.25)) + 1;
        count = Math.min(TEXT1.length, ticks * 3);
        html = TEXT1.slice(0, count).replace(/&/g, '&amp;') + `<span id="caret" style="opacity:${Math.floor(t * 3) % 2 === 0 || count < TEXT1.length ? 1 : 0}"></span>`;
      } else {
        const t0 = B(H.aiRefine), span = 0.62, n = TEXT2.length, fr30 = Math.floor(t * 30);
        for (let i = 0; i < n; i++) {
          const resolve = t0 + (i / n) * span + 0.04;
          if (t >= resolve) html += TEXT2[i];
          else if (TEXT2[i] === ' ') html += ' ';
          else html += `<span class="gold">${GLYPHS[Math.floor(hash(i * 131 + fr30) * GLYPHS.length)]}</span>`;
        }
        count = n;
      }
      $('#refText').innerHTML = html;
      $('#refCount').textContent = `${count} / 300`;
    }

    // canvas FX
    ctx.clearRect(0, 0, 1080, 1920);
    for (const d of dust) {
      const y = ((d.y - t * d.v) % 1920 + 1920) % 1920, x = d.x + Math.sin(t * d.f + d.ph) * d.a;
      ctx.fillStyle = `rgba(226,192,122,${d.o * (0.55 + 0.45 * Math.sin(t * 3 + d.ph)) * (0.6 + 0.8 * kp)})`;
      ctx.beginPath(); ctx.arc(x, y, d.s, 0, 6.283); ctx.fill();
    }
    for (const r of rings) {
      const d = t - r.t; if (d < 0 || d > 0.75) continue;
      const p = d / 0.75, rad = 40 + 900 * r.s * expo(p);
      ctx.strokeStyle = `rgba(226,192,122,${0.9 * (1 - p) ** 2})`; ctx.lineWidth = 3 + 22 * (1 - p) ** 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 6.283); ctx.stroke();
    }
    for (const b of bursts) {
      const d = t - b.t; if (d < 0 || d > b.life) continue;
      const p = d / b.life;
      for (const q of b.parts) {
        const dist = q.v * 0.5 * (1 - Math.exp(-d / 0.16));
        const x = b.x + Math.cos(q.a) * dist, y = b.y + Math.sin(q.a) * dist + 260 * d * d;
        const alpha = (1 - p) ** 1.5 * (b.kind === 'spark' ? 0.6 + 0.4 * Math.sin(d * 40 + q.tw) : 1);
        ctx.fillStyle = b.kind === 'spark' ? `rgba(255,236,190,${alpha})` : `rgba(226,192,122,${alpha})`;
        (b.kind === 'spark' ? spark : diamond)(x, y, q.size * (1 - p * 0.5), q.rot + q.spin * d);
      }
    }
  }

  window.renderAt = (t) => { tl.seek(t, false); procedural(t); };
  window.DURATION = TIMING.duration;

  // wait for fonts + every image (including CSS backgrounds) before declaring ready
  const urls = new Set();
  $$('img').forEach((i) => urls.add(i.src));
  $$('.face, .tpl, #hero').forEach((el) => { const m = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/); if (m) urls.add(m[1]); });
  for (let i = 0; i < 6; i++) urls.add(new URL(`assets/posters/book_${i}.jpg`, location.href).href);
  await Promise.all([...urls].map((u) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => im.decode().then(res, res); im.src = u; })));
  await document.fonts.load('900 100px Inter');
  await document.fonts.load('500 40px Inter');
  await document.fonts.load('500 24px "JetBrains Mono"');
  await document.fonts.ready;
  window.renderAt(0);
  window.__ready = true;
})();
