/* Variant B — literary readers 35-54. Calm, tactile, editorial: ink-settle type,
 * a hand-drawn underline, page turns, lamp-lit dust. Rhythm is gentle but still on the beat. */
(async function () {
  const K = await StorioKit.create({
    seed: 76, fonts: ['400 70px "Playfair Display"', '600 90px "Playfair Display"', 'italic 400 80px "Playfair Display"', '500 44px Karla', '700 30px Karla', '600 78px Caveat'],
    fx: { burstColors: ['197,160,89', '255,217,160'], burstShape: 'dot', shakeAmp: 5 },
  });
  const { $, $$, tl, B, H, R, slam, glide, scene, buildLogo, impact, burst, kick, onFrame } = K;

  // word-level split that keeps <em> styling
  function words(el) {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'word'; s.style.display = 'inline-block'; s.textContent = w;
            frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    };
    walk(el);
    gsap.set(out, { opacity: 0 });
    return out;
  }
  // ink settling onto paper: blur + drift -> sharp, landing on the beat
  function inkIn(ws, hitB, stagger = 0.07, dur = 0.8) {
    ws.forEach((w, i) => tl.fromTo(w, { opacity: 0, y: 26, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: dur, ease: 'expo.out', immediateRender: false }, B(hitB) - 0.12 + i * stagger));
  }
  const inkOut = (targets, atS) => tl.to(targets, { opacity: 0, y: -50, filter: 'blur(14px)', duration: 0.4, ease: 'power2.in', stagger: 0.03 }, atS);

  // ============ S1 page, underline, margin note, question, brand
  scene('#s1', 0, B(H.shelf) - 0.05);
  gsap.set(['#note', '#brandName', '#brandLine'], { opacity: 0 });
  gsap.set('#page', { transformPerspective: 1800, transformOrigin: '0% 50%' });
  tl.fromTo('#page', { opacity: 0, y: 60, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: 'expo.out' }, 0);
  const qw = words($('#page .quote'));
  inkIn(qw, 0.15, 0.05, 0.7);
  const up = $('#uPath');
  up.setAttribute('pathLength', '1');
  gsap.set(up, { strokeDasharray: 1, strokeDashoffset: 1 });
  tl.to(up, { strokeDashoffset: 0, duration: B(0.6), ease: 'power2.inOut' }, B(H.underline) - 0.1);
  tl.fromTo('#note', { opacity: 0, scale: 0.6, rotation: -20 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, B(H.margin) - 0.05);
  kick(H.underline, 0.4); kick(H.margin, 0.5);
  const qq = words($('#question'));
  inkIn(qq, H.question, 0.06);
  // page turns away to reveal the brand (brand lands inside the first 3 seconds)
  tl.to('#page', { rotationY: -105, opacity: 0, duration: B(0.9), ease: 'power2.in' }, B(H.brand) - B(0.9));
  inkOut(qq, B(H.brand) - 0.45);
  const LB = buildLogo($('#logoB'));
  Object.values(LB).forEach((p, i) => tl.fromTo(p, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out', immediateRender: false }, B(H.brand) - 0.1 + i * 0.05));
  tl.to([LB.reel_left, LB.reel_right], { rotation: 90, duration: 2, ease: 'power2.out' }, B(H.brand));
  tl.set(['#brandName', '#brandLine'], { opacity: 1 }, B(H.brand));
  inkIn(words($('#brandName')), H.brand + 0.25);
  inkIn(words($('#brandLine')), H.brand + 0.5, 0.05);
  kick(H.brand, 1);
  inkOut(['#logoB', '#brandName', '#brandLine'], B(H.shelf) - 0.5);

  // ============ S2 the shelf
  scene('#s2', B(H.shelf) - 0.45, B(H.reflect) - 0.05);
  const COV = ['pride_prejudice', 'moby_dick', 'walden', 'jane_eyre', 'great_gatsby', 'frankenstein'];
  const covers = COV.map((n, i) => {
    const d = document.createElement('div');
    d.className = 'cover'; d.style.backgroundImage = `url(../../art/out/${n}.jpg)`;
    d.style.left = `${215 + i * 130 - 150}px`; d.style.top = '120px'; d.style.zIndex = String(i < 3 ? i : 6 - i);
    $('#shelf').appendChild(d);
    gsap.set(d, { opacity: 0, transformOrigin: '50% 100%' });
    const hit = H.shelf + i * 0.5;
    slam(d, { y: -900, rotation: R(-25, 25) }, hit, { lead: 0.38, ease: 'power2.in', squash: 0.05, settle: 0.7, settleEase: 'back.out(3)', to: { rotation: -10 + i * 4 } });
    kick(hit, 0.6);
    return d;
  });
  tl.set('#head2', { opacity: 1 }, 0);
  inkIn(words($('#head2')), H.shelf);
  tl.fromTo('#plank', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, ease: 'expo.out', immediateRender: false }, B(H.shelf) - 0.2);
  tl.to(covers, { x: -1100, rotationY: -70, transformPerspective: 1600, duration: 0.5, ease: 'power2.in', stagger: 0.04 }, B(H.reflect) - 0.7);
  inkOut(['#head2', '#plank'], B(H.reflect) - 0.5);

  // ============ S3 reflection, stars, stamp
  scene('#s3', B(H.reflect) - 0.4, B(H.share) - 0.05);
  gsap.set(['#refCard', '#stamp'], { opacity: 0 });
  tl.set('#head3', { opacity: 1 }, 0);
  inkIn(words($('#head3')), H.reflect);
  glide('#refCard', { opacity: 0, y: 90, rotation: 1.5 }, H.reflect, { dur: 0.9, pre: 0.25 });
  kick(H.reflect, 0.8);
  const STAR = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'star'; s.style.left = `${i * 87 + 11}px`;
    s.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="${STAR}" fill="none" stroke="rgba(245,244,239,.4)" stroke-width="1.3" stroke-linejoin="round"/><polygon class="f" points="${STAR}" fill="#d9b56a" stroke="#d9b56a" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    $('#stars').appendChild(s);
    const f = s.querySelector('.f');
    gsap.set(s, { opacity: 0 }); gsap.set(f, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(s, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', immediateRender: false }, B(H.stars) - 0.3 + i * 0.02);
    const b = H.stars + i * 0.125;
    tl.fromTo(f, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, B(b));
    burst(b, 540 - 430 + 43 + i * 87, 1340, 4, 120, 0.6);
  }
  slam('#stamp', { scale: 1.35, rotation: 4, opacity: 0 }, H.stamp, { lead: 0.16, ease: 'power2.in', squash: 0.06, settleEase: 'back.out(2)', to: { rotation: -10 } });
  impact(H.stamp, 0.5); kick(H.stamp, 1);
  inkOut(['#head3', '#refCard', '#stars', '#stamp'], B(H.share) - 0.55);

  // ============ S4 share: real desk template, page-turn to a second card
  scene('#s4', B(H.share) - 0.12, B(H.finale) - 0.05);
  gsap.set(['#tDesk', '#tBook'], { left: 540, top: 1010, xPercent: -50, yPercent: -50, opacity: 0 });
  gsap.set('#tDesk', { transformPerspective: 1800, transformOrigin: '0% 50%', zIndex: 2 });
  tl.set('#head4', { opacity: 1 }, 0);
  inkIn(words($('#head4')), H.share);
  glide('#tDesk', { opacity: 0, y: 260, rotation: -6 }, H.share, { dur: 1.0, pre: 0.1 });
  kick(H.share, 1);
  tl.fromTo('#tBook', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out', immediateRender: false }, B(H.share2) - 0.5);
  tl.to('#tDesk', { rotationY: -110, opacity: 0, duration: B(0.7), ease: 'power2.in' }, B(H.share2) - B(0.7));
  kick(H.share2, 0.8);
  inkOut(['#head4', '#tBook'], B(H.finale) - 0.5);

  // ============ S5 finale
  scene('#s5', B(H.finale) - 0.35);
  gsap.set(['#cta'], { opacity: 0 });
  const L = buildLogo($('#logo'));
  Object.values(L).forEach((p, i) => tl.fromTo(p, { opacity: 0, y: 40, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'expo.out', immediateRender: false }, B(H.finale) - 0.2 + i * 0.06));
  tl.to([L.reel_left, L.reel_right], { rotation: 120, duration: 3, ease: 'power2.out' }, B(H.finale));
  kick(H.finale, 1.2);
  tl.set('#tag', { opacity: 1 }, 0);
  inkIn(words($('#tag')), H.tagline, 0.08);
  glide('#cta', { opacity: 0, y: 40 }, H.cta, { dur: 0.9, pre: 0.2 });
  tl.fromTo('#s5', { scale: 1 }, { scale: 1.03, duration: 15 - B(H.finale), ease: 'none', immediateRender: false }, B(H.finale));

  // ============ procedural: underline geometry, typing, lamp-lit dust
  const TEXT = 'Read it slowly, one chapter a morning. It changed how I spend my days.';
  const cv = $('#fxCanvas'), ctx = cv.getContext('2d');
  const dust = Array.from({ length: 80 }, () => ({ x: R(300, 1080), y: R(0, 1300), v: R(4, 18), a: R(6, 30), f: R(0.2, 0.6), ph: R(0, 6.28), s: R(1, 3), o: R(0.15, 0.5) }));
  let lined = false;
  onFrame((t, { kp }) => {
    if (!lined) {
      const pg = $('#page').getBoundingClientRect(), w = $('#uWord').getBoundingClientRect();
      const sx = 840 / pg.width, x0 = (w.left - pg.left) * sx - 6, x1 = (w.right - pg.left) * sx - 18, y = (w.bottom - pg.top) * sx - 4;
      $('#uPath').setAttribute('d', `M${x0} ${y} C ${x0 + (x1 - x0) * 0.3} ${y - 10}, ${x0 + (x1 - x0) * 0.7} ${y + 12}, ${x1} ${y - 4}`);
      lined = true;
    }
    if (t >= B(H.reflect) - 0.4 && t < B(H.share)) {
      const p = Math.min(1, Math.max(0, (t - B(H.typeStart)) / B(2)));
      const n = Math.floor(TEXT.length * p);
      $('#refText').innerHTML = TEXT.slice(0, n) + `<span id="caret" style="opacity:${n < TEXT.length || Math.floor(t * 2.4) % 2 === 0 ? 1 : 0}"></span>`;
      $('#refCount').textContent = `${n} / 300`;
    }
    for (const d of dust) {
      const y = ((d.y - t * d.v) % 1400 + 1400) % 1400, x = d.x + Math.sin(t * d.f + d.ph) * d.a;
      const near = Math.max(0, 1 - Math.hypot(x - 760, y - 340) / 700);
      ctx.fillStyle = `rgba(255,225,170,${d.o * near * (0.6 + 0.4 * Math.sin(t * 2 + d.ph))})`;
      ctx.beginPath(); ctx.arc(x, y, d.s, 0, 6.283); ctx.fill();
    }
    $('#bg').style.opacity = 0.9 + 0.1 * kp;
  });

  await K.ready(COV.map((n) => `../../art/out/${n}.jpg`));
})();
