/* Variant C — 18-24, record & show progress. Maximalist sticker collage, hard cuts on the beat,
 * big expanded type. Only real app features: counts, 30-day trend, monthly recap, share. */
(async function () {
  const K = await StorioKit.create({
    seed: 140, fonts: ['900 120px Archivo', '800 120px Archivo', '700 40px "Space Grotesk"', '500 30px "Space Grotesk"'],
    fx: { ringColor: '212,255,58', burstColors: ['212,255,58', '197,160,89', '255,79,163', '251,251,247'], burstShape: 'rect', shakeAmp: 30 },
  });
  const { $, $$, tl, B, H, R, slam, charsIn, splitChars, scene, buildLogo, impact, ring, flash, kick, burst, onFrame } = K;
  const out = (targets, atS, dir = -1) => tl.to(targets, { y: `${dir > 0 ? '+' : '-'}=260`, scale: 0.4, opacity: 0, filter: 'blur(12px)', duration: 0.14, ease: 'power3.in', stagger: 0.015 }, atS);
  const wordSlam = (el, hitB, rot = 0) => slam(el, { scale: 2.8, opacity: 0, rotation: rot * 3 }, hitB, { lead: 0.12, ease: 'power4.in', squash: 0.22, settle: 0.45, to: { rotation: rot } });
  for (let b = 4; b < 21.5; b++) kick(b, 1);
  for (let b = 22; b < 30; b++) kick(b, 1);
  for (let b = 30; b < 35; b++) kick(b, 0.8);

  // ============ S1 hook -> "you finished them" -> "now flex it" -> brand sticker
  scene('#s1', 0, B(H.statA) - 0.02);
  gsap.set(['#countLbl', '#counting', '#w1', '#w2', '#w3', '#flex'], { opacity: 0 });
  tl.fromTo('#count', { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'expo.out' }, 0.02);
  impact(H.hook, 0.7); kick(H.hook);
  slam('#countLbl', { scale: 0, rotation: 25 }, 0.5, { lead: 0.1, to: { rotation: -3 } });
  slam('#counting', { scale: 0, rotation: -30 }, 1, { lead: 0.1, to: { rotation: 7 } });
  kick(0.5, 0.6); kick(1, 0.6); kick(1.5, 0.6);
  out(['#count', '#countLbl', '#counting'], B(H.you) - 0.16);
  wordSlam('#w1', H.you, -2); wordSlam('#w2', H.finished, 2); wordSlam('#w3', H.them, -3);
  for (const k of ['you', 'finished', 'them']) { impact(H[k], 0.5); kick(H[k]); }
  slam('#flex', { y: 420, rotation: -14, scale: 0.6 }, H.flex, { lead: 0.14, ease: 'power4.in', squash: 0.2, to: { rotation: -3 } });
  impact(H.flex, 1.2); flash(H.flex, 0.5); ring(H.flex, 540, 1260, 0.9); burst(H.flex, 540, 1260, 40, 1200, 0.9);
  out(['#w1', '#w2', '#w3', '#flex'], B(H.brand) - 0.16);
  const LS = buildLogo($('#logoS'));
  gsap.set('#logoDisc', { opacity: 0 });
  tl.set([...Object.values(LS), '#logoDisc'], { opacity: 1 }, B(H.brand) - 0.14);
  slam('#logoS', { scale: 2.6, rotation: 45, opacity: 0 }, H.brand, { lead: 0.14, ease: 'power4.in', squash: 0.18, to: { rotation: -6 } });
  tl.to([LS.reel_left, LS.reel_right], { rotation: 360, duration: 0.8, ease: 'expo.out' }, B(H.brand));
  impact(H.brand, 0.9); ring(H.brand, 540, 900, 0.7); kick(H.brand);
  out('#logoS', B(H.statA) - 0.16);

  // ============ S2 numbers + 30-day trend
  scene('#s2', B(H.statA) - 0.2, B(H.every) - 0.02);
  gsap.set(['#cA', '#cB', '#cC', '#chart'], { opacity: 0 });
  charsIn(splitChars($('#head2'), 'lime'), H.statA, { stagger: 0.012, lead: 0.12 });
  [['#cA', H.statA, -1], ['#cB', H.statB, 1], ['#cC', H.statC, -1]].forEach(([el, b, s]) => {
    slam(el, { x: s * 1200, rotation: s * 10 }, b, { lead: 0.14, ease: 'power4.in', axis: 'x', squash: 0.12 });
    impact(b, 0.6);
  });
  slam('#chart', { y: 500, rotation: 6 }, H.chart, { lead: 0.14, ease: 'power4.in', squash: 0.12 });
  impact(H.chart, 0.5);
  const heights = [30, 55, 20, 80, 45, 100, 60, 35, 90, 120, 70, 50, 110, 40, 85, 130, 65, 95, 140, 75, 115, 55, 150, 100, 160, 120, 170, 140, 185, 200];
  heights.forEach((h, i) => {
    const d = document.createElement('div');
    d.className = 'bar' + (i >= 26 ? ' hot' : ''); d.style.left = `${44 + i * 27.6}px`; d.style.height = `${h}px`;
    $('#chart').appendChild(d);
    gsap.set(d, { scaleY: 0 });
    tl.to(d, { scaleY: 1, duration: 0.3, ease: 'back.out(3)' }, B(H.chart) + i * B(2) / 30);
  });
  const plus = document.createElement('div');
  plus.className = 'c sticker pink'; plus.textContent = '+1 this week'; $('#s2').appendChild(plus);
  gsap.set(plus, { left: 800, top: 1180, xPercent: -50, yPercent: -50, opacity: 0 });
  slam(plus, { scale: 0, rotation: -40 }, H.riser, { lead: 0.1, to: { rotation: 8 } });
  tl.to(['#cA', '#cB', '#cC', '#chart', plus], { rotation: (i) => (i % 2 ? 3 : -3), scale: 0.94, duration: B(1.5), ease: 'sine.inOut' }, B(H.riser) + 0.1);
  out(['#head2', '#cA', '#cB', '#cC', '#chart', plus], B(H.every) - 0.16);

  // ============ S3 every. single. one. + collage burst
  scene('#s3', B(H.every) - 0.2, B(H.brk));
  gsap.set(['#e1', '#e2', '#e3'], { opacity: 0 });
  wordSlam('#e1', H.every, -2); tl.set('#e1', { opacity: 0 }, B(H.single) - 0.1);
  wordSlam('#e2', H.single, 2); tl.set('#e2', { opacity: 0 }, B(H.one) - 0.1);
  wordSlam('#e3', H.one, -3);
  impact(H.every, 1.0); flash(H.every, 0.45); impact(H.single, 0.7); impact(H.one, 0.9);
  const ART = ['night_shift', 'walden', 'signal_lost', 'orbit', 'moby_dick', 'quiet_house', 'pride_prejudice', 'wildfire_season',
    'frankenstein', 'high_noon_club', 'jane_eyre', 'second_act', 'great_gatsby', 'pale_harbor', 'little_women', 'room_own'];
  const XS = [165, 415, 665, 915], YS = [640, 975, 1310, 1645];
  const tiles = ART.map((n, i) => {
    const d = document.createElement('div');
    d.className = 'tile'; d.style.backgroundImage = `url(../../art/out/${n}.jpg)`;
    d.style.width = '230px'; d.style.height = '345px';
    $('#collage').appendChild(d);
    gsap.set(d, { left: XS[i % 4], top: YS[Math.floor(i / 4)], xPercent: -50, yPercent: -50, opacity: 0 });
    const order = [5, 10, 0, 15, 6, 9, 3, 12, 1, 14, 7, 8, 2, 13, 4, 11].indexOf(i);
    const hit = H.every + order * 0.25;
    slam(d, { x: R(-900, 900), y: R(-1400, 1400), rotation: R(-90, 90), scale: 0.3 }, hit, { lead: 0.14, ease: 'power4.in', squash: 0.1, to: { rotation: R(-7, 7) } });
    return d;
  });
  const st1 = document.createElement('div'); st1.className = 'c sticker pink'; st1.textContent = 'rated 9/10';
  const st2 = document.createElement('div'); st2.className = 'c sticker lime'; st2.textContent = 'finished!';
  $('#s3').append(st1, st2);
  gsap.set(st1, { left: 330, top: 820, xPercent: -50, yPercent: -50, opacity: 0 });
  gsap.set(st2, { left: 760, top: 1480, xPercent: -50, yPercent: -50, opacity: 0 });
  slam(st1, { scale: 0, rotation: 40 }, H.collageEnd, { lead: 0.1, to: { rotation: -8 } });
  slam(st2, { scale: 0, rotation: -40 }, H.collageEnd + 1, { lead: 0.1, to: { rotation: 6 } });
  impact(H.collageEnd, 0.5); impact(H.collageEnd + 1, 0.5);
  tl.fromTo('#collage', { scale: 1, rotation: 0 }, { scale: 1.14, rotation: -3, duration: B(H.brk - H.collageEnd), ease: 'none', immediateRender: false }, B(H.collageEnd));

  // ============ S4 monthly recap (real templates) + share
  scene('#s4', B(H.recap) - 0.15, B(H.finale) - 0.02);
  const TPL = [['#rCol', H.recap], ['#rCal', H.recapCal], ['#rWf', H.recapWf]];
  gsap.set(TPL.map((x) => x[0]), { left: 540, top: 960, xPercent: -50, yPercent: -50, opacity: 0, transformPerspective: 1400 });
  gsap.set(['#postIt', '#shareBtn'], { opacity: 0 });
  charsIn(splitChars($('#head4'), 'lime'), H.recap, { stagger: 0.012, lead: 0.12 });
  TPL.forEach(([el, b], j) => {
    if (j === 0) slam(el, { scale: 0.3, rotation: -20 }, b, { lead: 0.14, ease: 'power4.in', squash: 0.1, to: { rotation: -3 } });
    else {
      slam(el, { x: 900, rotation: 18, scale: 0.8 }, b, { lead: 0.14, ease: 'power4.in', squash: 0.1, axis: 'x', to: { rotation: j % 2 ? 3 : -3 } });
      tl.to(TPL[j - 1][0], { x: -900, rotation: -18, scale: 0.8, opacity: 0, duration: 0.14, ease: 'power4.in' }, B(b) - 0.14);
    }
    impact(b, j ? 0.6 : 1.1);
  });
  flash(H.recap, 0.45); ring(H.recap, 540, 960, 0.8);
  slam('#postIt', { scale: 0, rotation: 50 }, H.share - 1, { lead: 0.1, to: { rotation: 9 } });
  slam('#shareBtn', { y: 300, scale: 0.5 }, H.share - 0.5, { lead: 0.12, ease: 'power4.in' });
  tl.to('#shareBtn', { scale: 0.85, duration: 0.05, ease: 'power2.in' }, B(H.share) - 0.05);
  tl.to('#shareBtn', { scale: 1, duration: 0.5, ease: 'elastic.out(1.2,0.35)' }, B(H.share));
  impact(H.share, 0.9); ring(H.share, 540, 1470, 0.6); burst(H.share, 540, 1470, 30, 900, 0.8);
  tl.to('#s4', { scale: 1.25, rotation: 4, opacity: 0, filter: 'blur(10px)', duration: B(H.finale - H.riser2), ease: 'power3.in' }, B(H.riser2));

  // ============ S5 finale
  scene('#s5', B(H.finale) - 0.16);
  const L = buildLogo($('#logo'));
  gsap.set(['#cta'], { opacity: 0 });
  tl.set(Object.values(L), { opacity: 1 }, B(H.finale) - 0.14);
  slam('#logo', { scale: 3, rotation: -60, opacity: 0 }, H.finale, { lead: 0.14, ease: 'power4.in', squash: 0.2, to: { rotation: 5 } });
  tl.to([L.reel_left, L.reel_right], { rotation: 540, duration: 1.4, ease: 'expo.out' }, B(H.finale));
  impact(H.finale, 1.5); flash(H.finale, 0.55); ring(H.finale, 540, 720, 1.2); burst(H.finale, 540, 720, 60, 1500, 1.1);
  charsIn(splitChars($('#tag'), 'lime'), H.tagline, { stagger: 0.012, lead: 0.12 });
  slam('#cta', { scale: 0, rotation: 20 }, H.cta, { lead: 0.12, ease: 'power4.in', squash: 0.2, to: { rotation: -2 } });
  impact(H.cta, 0.5);

  // ============ procedural: counters, beat bounce on stickers and logo
  const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const cnt = (t, b, dur, n) => Math.round(n * ease((t - B(b) + 0.14) / B(dur)));
  onFrame((t, { kp }) => {
    $('#count').textContent = Math.round(84 * ease(t / B(1.4)));
    $('#nA').textContent = cnt(t, H.statA, 1, 84);
    $('#nB').textContent = cnt(t, H.statB, 1, 23);
    $('#nC').textContent = cnt(t, H.statC, 1, 20);
    gsap.set('#bgWord', { xPercent: -50, yPercent: -50, scale: 1 + 0.04 * kp, rotation: -10 });
    $('#bgWord').textContent = t < B(H.statA) ? '2026' : t < B(H.every) ? 'STATS' : t < B(H.recap) ? 'ERA' : t < B(H.finale) ? 'RECAP' : 'YOURS';
    $('#bg').style.opacity = 0.6 + 0.4 * kp;
    gsap.set('#bg', { y: -(t * 60) % 34 });
    if (t > B(H.finale) + 1) gsap.set('#logo', { scale: 1 + 0.035 * kp });
  });

  await K.ready(ART.map((n) => `../../art/out/${n}.jpg`));
})();
