/* Elegant re-cut of V1. Same story (brand -> folio -> rate & reflect -> share -> end card),
 * but nothing hits: every element eases in over ~1s, scenes cross-dissolve, the camera never shakes.
 * Motion settles on the beat rather than arriving on it. */
(async function () {
  const K = await StorioKit.create({
    seed: 64,
    fonts: ['400 84px "Cormorant Garamond"', 'italic 400 84px "Cormorant Garamond"', '500 150px "Cormorant Garamond"', '300 26px Jost', '400 28px Jost'],
  });
  const { $, $$, tl, B, H, R, scene, buildLogo, onFrame, hash } = K;
  const SOFT = 'power2.out', DRIFT = 'sine.inOut';

  // word split that keeps <span class="it"> and <br>
  function words(el) {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'word'; s.textContent = w;
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
  const rise = (targets, atS, o = {}) => (gsap.set(targets, { opacity: 0 }), tl.fromTo(targets, { opacity: 0, y: o.y ?? 24, filter: `blur(${o.blur ?? 8}px)` },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: o.dur ?? 1.1, ease: SOFT, stagger: o.stagger ?? 0, immediateRender: false }, atS));
  const fade = (targets, atS, dur = 0.55) => tl.to(targets, { opacity: 0, filter: 'blur(6px)', duration: dur, ease: 'power1.in' }, atS);

  // ============ S1 hairline -> logo -> tagline
  const s1End = B(H.folio) + 0.25;
  scene('#s1', 0, s1End);
  tl.fromTo('#line1', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0.05);
  tl.to('#line1', { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, B(H.frame) + 0.3);
  const LA = buildLogo($('#logoA'));
  tl.fromTo(LA.frame, { opacity: 0, scale: 1.06, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.5, ease: SOFT }, B(H.frame));
  const drift = { reel_left: [-36, 0], reel_right: [36, 0], book_top: [0, -36], book_bottom: [0, 36] };
  Object.entries(drift).forEach(([k, [x, y]], i) => {
    tl.fromTo(LA[k], { opacity: 0, x, y }, { opacity: 1, x: 0, y: 0, duration: 1.6, ease: SOFT, immediateRender: false }, B(H.parts) + i * 0.12);
  });
  tl.fromTo([LA.reel_left, LA.reel_right], { rotation: 0 }, { rotation: (i) => (i ? -1 : 1) * 70, duration: s1End - B(H.parts), ease: 'none', immediateRender: false }, B(H.parts));
  tl.fromTo(LA.wordmark, { opacity: 0, scale: 1.03, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.3, ease: SOFT, immediateRender: false }, B(H.wordmark) - 0.3);
  tl.fromTo('#logoA', { scale: 1 }, { scale: 0.95, y: -30, duration: s1End, ease: 'none', immediateRender: false }, 0);
  rise(words($('#tagA')), B(H.tagline), { stagger: 0.1, dur: 1.0 });
  fade(['#logoA', '#tagA'], s1End - 0.6);

  // ============ S2 the folio: two slow rows, one quiet headline that changes
  const s2In = s1End - 0.35, s2End = B(H.rate) + 0.2;
  scene('#s2', s2In, s2End);
  const FILMS = ['night_shift', 'signal_lost', 'wildfire_season', 'orbit', 'high_noon_club', 'second_act', 'quiet_house', 'pale_harbor'];
  const BOOKS = ['walden', 'moby_dick', 'pride_prejudice', 'great_gatsby', 'jane_eyre', 'frankenstein', 'little_women', 'room_own'];
  const fill = (row, list) => list.forEach((n) => { const d = document.createElement('div'); d.className = 'card'; d.style.backgroundImage = `url(../../art/out/${n}.jpg)`; row.appendChild(d); });
  fill($('#row1'), FILMS); fill($('#row2'), BOOKS);
  tl.fromTo('#row1', { x: -80 }, { x: -640, duration: s2End - s2In, ease: 'none', immediateRender: false }, s2In);
  tl.fromTo('#row2', { x: -1000 }, { x: -440, duration: s2End - s2In, ease: 'none', immediateRender: false }, s2In);
  rise('#row1', s2In, { y: 40, dur: 1.4 });
  rise('#row2', s2In + 0.25, { y: 40, dur: 1.4 });
  rise('#k2', B(H.folio), { y: 12, blur: 4 });
  const heads = [['#wFilms', H.films], ['#wSeries', H.series], ['#wBooks', H.books]];
  gsap.set(heads.map(([id]) => id), { opacity: 0 });
  heads.forEach(([id, b], i) => {
    rise(id, B(b) - 0.2, { y: 18, dur: 0.9 });
    if (i < 2) tl.to(id, { opacity: 0, y: -14, filter: 'blur(6px)', duration: 0.5, ease: 'power1.in' }, B(heads[i + 1][1]) - 0.55);
  });
  fade(['#k2', '#wBooks', '#row1', '#row2'], s2End - 0.6);

  // ============ S3 rate & reflect
  const s3In = s2End - 0.35, s3End = B(H.share) + 0.2;
  scene('#s3', s3In, s3End);
  rise('#k3', s3In + 0.1, { y: 12, blur: 4 });
  rise('#hero', s3In, { y: 50, dur: 1.4 });
  tl.fromTo('#hero', { scale: 1 }, { scale: 1.04, duration: s3End - s3In, ease: 'none', immediateRender: false }, s3In);
  const STAR = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
  const fills = [];
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div'); s.className = 'star'; s.style.left = `${i * 73}px`;
    s.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="${STAR}" fill="none" stroke="rgba(197,160,89,.5)" stroke-width="1" stroke-linejoin="round"/>
      <polygon class="f" points="${STAR}" fill="#d9bf86" stroke="#d9bf86" stroke-width="1" stroke-linejoin="round"/></svg>`;
    $('#stars').appendChild(s); fills.push(s.querySelector('.f'));
  }
  gsap.set(fills, { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' });
  rise('#stars', s3In + 0.3, { y: 10, blur: 4, dur: 0.8 });
  fills.slice(0, 9).forEach((f, i) => tl.to(f, { opacity: 1, scale: 1, duration: 0.5, ease: DRIFT }, B(H.stars) + i * 0.1));
  rise($$('#refl .it'), B(H.reflect), { stagger: 0.35, dur: 1.0, y: 16 });
  fade(['#k3', '#hero', '#stars', '#refl'], s3End - 0.6);

  // ============ S4 share: one template dissolves into the next
  const s4In = s3End - 0.35, s4End = B(H.finale) - 0.1;
  scene('#s4', s4In, s4End);
  rise('#k4', s4In + 0.1, { y: 12, blur: 4 });
  rise(words($('#shareHead')), s4In + 0.2, { stagger: 0.09, dur: 1.0, y: 16 });
  gsap.set('#tplB', { opacity: 0 });
  rise('#tplA', s4In, { y: 60, dur: 1.4 });
  tl.fromTo(['#tplA', '#tplB'], { scale: 1 }, { scale: 1.035, duration: s4End - s4In, ease: 'none', immediateRender: false }, s4In);
  tl.fromTo('#tplB', { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1.0, ease: DRIFT, immediateRender: false }, B(H.share2) - 0.45);
  fade(['#k4', '#shareHead', '#tplA', '#tplB'], s4End - 0.6);

  // ============ S5 end card
  const s5In = s4End - 0.3;
  scene('#s5', s5In);
  const LB = buildLogo($('#logoB'));
  tl.fromTo(Object.values(LB), { opacity: 0, scale: 1.04, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.3, ease: SOFT, stagger: 0.05, immediateRender: false }, s5In);
  tl.fromTo([LB.reel_left, LB.reel_right], { rotation: 0 }, { rotation: (i) => (i ? -1 : 1) * 40, duration: 15 - s5In, ease: 'power1.out', immediateRender: false }, s5In);
  tl.fromTo('#word', { opacity: 0, letterSpacing: '.22em', filter: 'blur(6px)' }, { opacity: 1, letterSpacing: '.02em', filter: 'blur(0px)', duration: 1.6, ease: SOFT, immediateRender: false }, s5In + 0.35);
  rise('#tagB', s5In + 0.8, { y: 14, dur: 1.0 });
  tl.fromTo('#line2', { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, s5In + 1.0);
  rise('#cta', B(H.cta) - 0.2, { y: 12, blur: 4, dur: 1.0 });
  gsap.set(['#word', '#tagB', '#cta'], { opacity: 0 });
  gsap.set('#line2', { scaleX: 0 });
  tl.fromTo('#s5', { scale: 1 }, { scale: 1.02, duration: 15 - s5In, ease: 'none', immediateRender: false }, s5In);

  // ============ ambience: slow gold motes, breathing light
  const cv = $('#fxCanvas'), ctx = cv.getContext('2d');
  const motes = Array.from({ length: 46 }, () => ({ x: R(0, 1080), y: R(0, 1920), v: R(6, 22), a: R(6, 30), f: R(0.1, 0.35), ph: R(0, 6.28), s: R(0.8, 2.4), o: R(0.12, 0.4) }));
  onFrame((t) => {
    $('#bg').style.opacity = 0.85 + 0.15 * Math.sin(t * 0.7);
    ctx.clearRect(0, 0, 1080, 1920);
    for (const d of motes) {
      const y = ((d.y - t * d.v) % 1920 + 1920) % 1920, x = d.x + Math.sin(t * d.f + d.ph) * d.a;
      ctx.fillStyle = `rgba(217,191,134,${d.o * (0.6 + 0.4 * Math.sin(t * 0.9 + d.ph))})`;
      ctx.beginPath(); ctx.arc(x, y, d.s, 0, 6.283); ctx.fill();
    }
  });

  await K.ready();
})();
