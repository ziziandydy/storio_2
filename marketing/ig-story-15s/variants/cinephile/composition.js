/* Variant A — cinephiles 25-44. Trailer grammar: letterbox, anamorphic flares,
 * ticking tension, a hard cut to silence, then the final hit. */
(async function () {
  const K = await StorioKit.create({
    seed: 90, fonts: ['400 100px Anton', '500 50px "Barlow Condensed"', '700 50px "Barlow Condensed"'],
    fx: { ringColor: '63,198,209', burstColors: ['255,180,84', '63,198,209', '238,243,244'], burstShape: 'dot', shakeAmp: 22 },
  });
  const { $, tl, B, H, R, slam, charsIn, charsOut, splitChars, scene, buildLogo, impact, ring, flash, kick, burst, onFrame } = K;
  const flares = [];
  const flare = (b, y, s = 1) => flares.push({ t: B(b), y, s });

  // letterbox opens like a projector
  tl.fromTo(['#barT', '#barB'], { height: 960 }, { height: 250, duration: 0.55, ease: 'expo.out' }, 0);

  // ============ S1 hook: numbers, question, brand stinger
  scene('#s1', 0, B(H.everyFilm) - 0.02);
  gsap.set(['#hookB', '#question'], { opacity: 0 });
  tl.fromTo('#hookA', { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'expo.out' }, 0.02);
  impact(H.hookA, 0.5); kick(H.hookA);
  slam('#hookB', { y: 260, scale: 0.6, opacity: 0 }, H.hookB, { lead: 0.22 });
  impact(H.hookB, 0.4); kick(H.hookB);
  tl.to(['#hookA', '#hookB'], { scale: 0.6, opacity: 0, filter: 'blur(14px)', duration: 0.16, ease: 'power3.in' }, B(H.question) - 0.16);
  const q = splitChars($('#question'));
  tl.set('#question', { opacity: 1 }, B(H.question) - 0.3);
  charsIn(q, H.question, { stagger: 0.02 });
  impact(H.question, 1.0); flare(H.question, 900, 1.2); flash(H.question, 0.35); kick(H.question, 1.2);
  charsOut(q, H.brand);
  const LS = buildLogo($('#logoS'));
  const conv = { frame: { scale: 2.6, rotation: 90 }, reel_left: { x: -700, rotation: -500 }, reel_right: { x: 700, rotation: 500 }, book_top: { y: -800 }, book_bottom: { y: 800 }, wordmark: { scale: 3, opacity: 0 } };
  Object.entries(conv).forEach(([k, f]) => slam(LS[k], f, H.brand, { lead: 0.24, ease: 'power4.in', squash: 0 }));
  impact(H.brand, 0.9); ring(H.brand, 540, 900, 0.8); flare(H.brand, 900, 0.9); kick(H.brand);
  tl.to([LS.reel_left, LS.reel_right], { rotation: '+=200', duration: 0.8, ease: 'expo.out' }, B(H.brand));
  tl.to('#logoS', { scale: 7, opacity: 0, duration: 0.3, ease: 'power3.in' }, B(H.everyFilm) - 0.3);

  // ============ S2 film strip: every film, every season
  scene('#s2', B(H.everyFilm) - 0.32, B(H.seasons) - 0.02);
  const FR = ['night_shift', 'orbit', 'pale_harbor', 'quiet_house', 'signal_lost', 'wildfire_season', 'high_noon_club', 'second_act'];
  const frames = FR.map((n, i) => {
    const d = document.createElement('div');
    d.className = 'frame'; d.style.left = `${60 + i * 340}px`; d.style.backgroundImage = `url(../../art/out/${n}.jpg)`;
    $('#strip').appendChild(d); return d;
  });
  const hF = splitChars($('#hFilm')), hS = splitChars($('#hSeason'));
  charsIn(hF, H.everyFilm); charsOut(hF, H.everySeason); charsIn(hS, H.everySeason, { dir: 'down' });
  gsap.set('#strip', { x: 330 + 1500, rotation: -4 });
  tl.to('#strip', { x: 330, rotation: 0, duration: 0.3, ease: 'power3.in' }, B(H.everyFilm) - 0.3);
  for (let i = 0; i < 8; i++) {
    const b = H.everyFilm + i * 0.5;
    if (i) tl.to('#strip', { x: 330 - 340 * i, duration: 0.2, ease: 'power3.inOut' }, B(b) - 0.2);
    tl.set(frames[i], { attr: { class: 'frame on' } }, B(b));
    if (i) tl.set(frames[i - 1], { attr: { class: 'frame' } }, B(b));
    tl.fromTo(frames[i], { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.4)', immediateRender: false }, B(b));
    impact(b, i % 2 ? 0.15 : 0.35); kick(b, i % 2 ? 0.5 : 1);
  }
  flare(H.everyFilm, 1080, 0.8); flare(H.everySeason, 1080, 0.8);
  tl.to(['#strip', '#head2'], { y: '-=380', opacity: 0, filter: 'blur(16px)', duration: 0.2, ease: 'power3.in', stagger: 0.02 }, B(H.seasons) - 0.22);

  // ============ S3 season by season (real Seasons feature)
  scene('#s3', B(H.seasons) - 0.3, B(H.rate) - 0.02);
  gsap.set(['#sPoster', '#chipCap', '#addBtn'], { opacity: 0 });
  gsap.set('#sPoster', { transformPerspective: 1400 });
  charsIn(splitChars($('#head3')), H.seasons);
  slam('#sPoster', { rotationY: -75, scale: 0.4, y: 200 }, H.seasons, { lead: 0.28, squash: 0.08 });
  impact(H.seasons, 0.7); kick(H.seasons);
  const chips = [];
  for (let i = 0; i < 5; i++) {
    const c = document.createElement('div');
    c.className = 'chip'; c.textContent = `S${i + 1}`; c.style.left = `${i * 157}px`;
    $('#chips').appendChild(c); chips.push(c);
    gsap.set(c, { opacity: 0 });
    tl.fromTo(c, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)', immediateRender: false }, B(H.seasons) + 0.12 + i * 0.04);
    if (i < 3) {
      const b = H.seasonChip + i * 0.5;
      tl.set(c, { attr: { class: 'chip on' } }, B(b));
      tl.fromTo(c, { scale: 1.3 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1.2,0.35)', immediateRender: false }, B(b));
      impact(b, 0.2); burst(b, 540 - 380 + 66 + i * 157, 1210, 8, 260, 0.5);
    }
  }
  tl.fromTo('#chipCap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', immediateRender: false }, B(H.seasonChip + 1.2));
  slam('#addBtn', { y: 220, scale: 0.5 }, H.addBtn - 0.5, { lead: 0.2 });
  tl.to('#addBtn', { scale: 0.86, duration: 0.05, ease: 'power2.in' }, B(H.addBtn) - 0.05);
  tl.to('#addBtn', { scale: 1, duration: 0.5, ease: 'elastic.out(1.2,0.35)' }, B(H.addBtn));
  ring(H.addBtn, 540, 1440, 0.5); impact(H.addBtn, 0.5); kick(H.addBtn);
  tl.to(['#sPoster', '#chips', '#chipCap', '#addBtn', '#head3'], { y: '-=420', scale: 0.4, opacity: 0, duration: 0.24, ease: 'power3.in', stagger: 0.02 }, B(H.rate) - 0.28);

  // ============ S4 rate it
  scene('#s4', B(H.rate) - 0.3, B(H.ticket) - 0.02);
  gsap.set(['#rPoster', '#stamp', '#quote'], { opacity: 0 });
  gsap.set('#rPoster', { transformPerspective: 1400 });
  charsIn(splitChars($('#head4')), H.rate);
  slam('#rPoster', { rotationY: 70, scale: 0.4, y: 200 }, H.rate, { lead: 0.28, squash: 0.08 });
  impact(H.rate, 0.8); flare(H.rate, 830, 0.7); kick(H.rate);
  const STAR = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'star'; s.style.left = `${i * 87 + 4}px`;
    s.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="${STAR}" fill="none" stroke="rgba(255,180,84,.45)" stroke-width="1.4" stroke-linejoin="round"/><polygon class="f" points="${STAR}" fill="#ffb454" stroke="#ffb454" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    $('#stars').appendChild(s);
    const f = s.querySelector('.f');
    gsap.set(s, { opacity: 0 }); gsap.set(f, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(s, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)', immediateRender: false }, B(H.rate) + 0.1 + i * 0.02);
    if (i < 9) {
      const b = H.starsStart + i * 0.125;
      tl.fromTo(f, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1.2,0.35)', immediateRender: false }, B(b));
      tl.fromTo(s, { scale: 1.4 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1.1,0.4)', immediateRender: false }, B(b));
      burst(b, 540 - 430 + 40 + i * 87, 1225, 6, 180, 0.45);
    }
  }
  slam('#stamp', { scale: 3.2, rotation: 26, opacity: 0 }, H.stamp, { lead: 0.16, ease: 'power4.in', squash: 0.2, to: { rotation: -12 } });
  impact(H.stamp, 1.1); ring(H.stamp, 770, 650, 0.7); flash(H.stamp, 0.3); kick(H.stamp, 1.2);
  tl.fromTo('#quote', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', immediateRender: false }, B(H.stamp) + 0.15);
  tl.to(['#head4', '#rPoster', '#stamp', '#stars', '#quote'], { y: '-=380', opacity: 0, filter: 'blur(14px)', duration: 0.2, ease: 'power3.in', stagger: 0.02 }, B(H.ticket) - 0.24);

  // ============ S5 keep the ticket (real ticket + retro TV share templates)
  scene('#s5', B(H.ticket) - 0.32, B(H.deadAir));
  gsap.set(['#tTicket', '#tTv'], { left: 540, top: 1000, xPercent: -50, yPercent: -50, opacity: 0, transformPerspective: 1400 });
  charsIn(splitChars($('#head5')), H.ticket);
  slam('#tTicket', { y: 1000, rotation: -10 }, H.ticket, { lead: 0.3, squash: 0.1 });
  impact(H.ticket, 0.9); flare(H.ticket, 1000, 0.9); kick(H.ticket, 1.2);
  slam('#tTv', { x: 800, rotationY: -60, scale: 0.8, filter: 'blur(14px)' }, H.tv, { lead: 0.2, squash: 0.08, axis: 'x', to: { filter: 'blur(0px)' } });
  tl.to('#tTicket', { x: -800, rotationY: 60, scale: 0.8, opacity: 0, filter: 'blur(14px)', duration: 0.2, ease: 'power3.in' }, B(H.tv) - 0.2);
  impact(H.tv, 0.6); kick(H.tv);
  tl.fromTo('#s5', { scale: 1 }, { scale: 1.1, duration: B(H.deadAir - H.riser), ease: 'power2.in', immediateRender: false }, B(H.riser));

  // ============ S6 finale after the dead-air cut
  scene('#s6', B(H.finale) - 0.28);
  const L = buildLogo($('#logo'));
  gsap.set(['#tag', '#cta'], { opacity: 0 });
  Object.entries(conv).forEach(([k, f]) => slam(L[k], f, H.finale, { lead: 0.26, ease: 'power4.in', squash: 0 }));
  tl.fromTo('#logo', { scale: 1.12 }, { scale: 1, duration: 1.2, ease: 'elastic.out(1,0.3)', immediateRender: false }, B(H.finale));
  tl.to(L.reel_left, { rotation: '+=420', duration: 3, ease: 'expo.out' }, B(H.finale));
  tl.to(L.reel_right, { rotation: '-=420', duration: 3, ease: 'expo.out' }, B(H.finale));
  impact(H.finale, 1.5); ring(H.finale, 540, 760, 1.3); flash(H.finale, 0.55); flare(H.finale, 760, 1.6); burst(H.finale, 540, 760, 50, 1000, 1.1); kick(H.finale, 1.5);
  const tag = splitChars($('#tag'));
  tl.set('#tag', { opacity: 1 }, B(H.tagline) - 0.3);
  charsIn(tag, H.tagline, { stagger: 0.012, lead: 0.16 });
  kick(H.tagline, 0.6);
  slam('#cta', { scale: 0.4, y: 80 }, H.cta, { lead: 0.2, squash: 0.15 });
  kick(H.cta, 0.6);
  tl.fromTo('#s6', { scale: 1 }, { scale: 1.04, duration: 15 - B(H.finale), ease: 'none', immediateRender: false }, B(H.finale));

  // ============ procedural: counters, anamorphic flares, gate weave, flicker
  const cv = $('#fxCanvas'), ctx = cv.getContext('2d');
  const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  onFrame((t, { kp }) => {
    $('#numA').textContent = Math.round(312 * ease(t / B(0.9)));
    $('#numB').textContent = t < B(H.hookB) - 0.25 ? '0' : Math.round(48 * ease((t - B(H.hookB) + 0.25) / B(0.8)));
    for (const f of flares) {
      const d = t - f.t; if (d < 0 || d > 0.8) continue;
      const a = f.s * Math.exp(-d / 0.18);
      for (const [h, al, col] of [[70, 0.12, '63,198,209'], [22, 0.35, '120,220,235'], [5, 0.9, '235,250,255']]) {
        const g = ctx.createLinearGradient(0, 0, 1080, 0);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${al * a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(-200, f.y - h / 2, 1480, h);
      }
    }
    const fr = Math.floor(t * 24);
    const wx = (K.hash(fr) - 0.5) * 2, wy = (K.hash(fr + 7) - 0.5) * 2;
    gsap.set('#bg', { x: wx * 3, y: wy * 3, opacity: 0.85 + 0.15 * kp });
    $('#grade').style.opacity = 0.9 + 0.1 * K.hash(fr + 3);
    const dead = t >= B(H.deadAir) && t < B(H.finale) - 0.28;
    $('#root').style.filter = dead ? 'brightness(0.4)' : `brightness(${0.97 + 0.05 * K.hash(fr + 11)})`;
  });

  await K.ready(['../../art/out/night_shift.jpg', '../../art/out/wildfire_season.jpg']);
})();
