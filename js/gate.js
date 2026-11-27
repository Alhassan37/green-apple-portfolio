/* Green Apple — entrance: a real arched wooden gate (photo) with the Green Apple stone plaque.
   Click / tap / scroll → the two doors swing open onto a real orange orchard, the camera walks in
   and rises over the farm, then the site opens.
   Media: door photo and orchard footage from Pexels (free licence). */
(() => {
  const gate = document.getElementById('gate');
  if (!gate) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const $ = id => document.getElementById(id);
  const set = $('gSet'), wall = $('gWall'), vid = $('gVid'), hint = $('gHint');

  if (window.Music) Music.autoplay();

  // editing preview (from the private dashboard): skip the entrance
  if (new URLSearchParams(location.search).has('preview')) {
    gate.remove(); if (window.GA_enterSite) GA_enterSite(); return;
  }

  /* ---------- geometry of the photo (door.webp is drawn at 2000 × 2517) ---------- */
  const PW = 2000, PH = 2517;
  const CX = 968, CY = 1076, RX = 728, RY = 700;   // the arch (ellipse) of the doorway
  const X0 = 234, X1 = 1696, SEAM = 984, TOP = 376, BOT = 2242, ZY = 1250;
  const archY = x => CY - RY * Math.sqrt(Math.max(0, 1 - ((x - CX) / RX) ** 2));
  const r1 = v => Math.round(v * 10) / 10;
  const archPts = (a, b, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const x = a + (b - a) * i / n; return [x, archY(x)]; });

  // the wall with a doorway-shaped hole: the orchard video shows through it once the doors open
  const hole = `M${X0} ${BOT}` + archPts(X0, X1, 80).map(([x, y]) => `L${r1(x)} ${r1(y)}`).join('') + `L${X1} ${BOT}Z`;
  wall.style.clipPath = `path(evenodd, 'M-9000 -9000H11000V11500H-9000Z${hole}')`;

  // the two door leaves, cut from the same photo
  // each leaf overlaps the wall edge and the other leaf by a few px, so no hairline of the video shows through
  function leaf(el, a, b) {
    const T = TOP - 6;
    const pts = archPts(a, b, 40).map(([x, y]) => `${r1(x - a)}px ${r1(y - 5 - T)}px`);
    el.style.cssText = `left:${a}px;top:${T}px;width:${b - a}px;height:${BOT + 4 - T}px;background-position:${-a}px ${-T}px;` +
      `clip-path:polygon(${pts.join(',')},${b - a}px ${BOT + 4 - T}px,0px ${BOT + 4 - T}px)`;
  }
  const leafL = gate.querySelector('.g-leaf.l'), leafR = gate.querySelector('.g-leaf.r');
  leaf(leafL, X0 - 5, SEAM + 3); leaf(leafR, SEAM - 3, X1 + 5);
  gsap.set(leafL, { transformOrigin: '0% 50%' }); gsap.set(leafR, { transformOrigin: '100% 50%' });

  const logo = gate.querySelector('.g-plaque-logo');
  if (logo && window.LOGO_MARK) logo.innerHTML = window.LOGO_MARK;

  /* ---------- our products on both sides of the gate ---------- */
  const P = window.PRODUCTS || [], A = window.AGENCIES || [];
  const picks = A.map(a => P.find(p => p.a === a.id)).filter(Boolean).slice(0, 6);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const card = p => {
    const ag = A.find(a => a.id === p.a) || {};
    return `<figure class="g-prod" style="--c:${esc(ag.color || '#00A650')}"><img src="${esc(p.img)}" alt=""><figcaption><b>${esc(p.ar || p.en)}</b><span>${esc(ag.name || '')}</span></figcaption></figure>`;
  };
  const shelfL = $('gShelfL'), shelfR = $('gShelfR'), strip = $('gStrip');
  shelfL.innerHTML = picks.filter((_, i) => i % 2 === 0).map(card).join('');
  shelfR.innerHTML = picks.filter((_, i) => i % 2 === 1).map(card).join('');
  strip.innerHTML = picks.slice(0, 4).map(card).join('');

  /* ---------- fit the photo to any screen ---------- */
  const view = { s: 1, ox: 0, oy: 0, z: 1 };
  function place() {
    const s = view.s * view.z, px = view.ox + CX * view.s, py = view.oy + ZY * view.s;   // zoom around the doorway
    set.style.transform = `translate(${px - CX * s}px, ${py - ZY * s}px) scale(${s})`;
  }
  function fit() {
    const W = innerWidth, H = innerHeight;
    const s = Math.min(W / 1560, H / (PH * 1.01));
    view.s = s; view.ox = (W - PW * s) / 2;
    view.oy = W > H ? (H - PH * s) / 2 : Math.max(0, (H - PH * s) * .22);
    place();
    const side = view.ox + 150 * s;                 // free space beside the doorway
    const columns = side >= 190;
    gate.classList.toggle('cols', columns);
    if (columns) {
      const w = Math.min(230, side - 36);
      [shelfL, shelfR].forEach(el => { el.style.width = w + 'px'; });
      shelfL.style.left = Math.max(14, (side - w) / 2) + 'px';
      shelfR.style.right = Math.max(14, (side - w) / 2) + 'px';
      hint.style.bottom = '';
    } else {
      // phones: products in a row under the doors, the hint just above them
      const top = view.oy + PH * s - 16;
      strip.style.top = top + 'px';
      hint.style.bottom = (H - top + 12) + 'px';
    }
  }
  fit(); addEventListener('resize', fit);

  /* ---------- floating dust in the sunlight ---------- */
  const cv = $('gMotes'), cx2 = cv.getContext('2d');
  let motes = [], running = true;
  function sizeMotes() {
    const d = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; cx2.setTransform(d, 0, 0, d, 0, 0);
    motes = Array.from({ length: isTouch ? 30 : 56 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: .5 + Math.random() * 1.6, v: .08 + Math.random() * .25, p: Math.random() * 6.28 }));
  }
  sizeMotes(); addEventListener('resize', sizeMotes);
  (function draw(t) {
    if (!running) return; requestAnimationFrame(draw);
    cx2.clearRect(0, 0, innerWidth, innerHeight); cx2.globalCompositeOperation = 'lighter';
    motes.forEach(m => {
      if (!reduce) { m.y -= m.v; m.x += Math.sin(t / 1500 + m.p) * .22; }
      if (m.y < -10) { m.y = innerHeight + 10; m.x = Math.random() * innerWidth; }
      cx2.fillStyle = `rgba(255,232,170,${.3 + .3 * Math.sin(t / 800 + m.p)})`; cx2.beginPath(); cx2.arc(m.x, m.y, m.r, 0, 6.283); cx2.fill();
    });
  })(0);

  /* ---------- intro + idle ---------- */
  const shelves = [shelfL, shelfR, strip];
  const intro = gsap.timeline({ delay: .1 });
  intro.to('#gDark', { opacity: 0, duration: reduce ? .4 : 1.6, ease: 'power2.out' }, 0);
  if (!reduce) {
    intro.fromTo(view, { z: 1.08 }, { z: 1, duration: 2.8, ease: 'expo.out', onUpdate: place }, 0)
      .from('.g-plaque', { opacity: 0, y: -30, duration: 1.4, ease: 'expo.out' }, .5)
      .from(gate.querySelectorAll('.g-prod'), { opacity: 0, y: 30, duration: 1, stagger: .08, ease: 'expo.out' }, .9);
  }
  intro.to(hint, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' }, reduce ? .3 : 1.6);

  // the doors open a crack when you hover them
  const doors = $('gDoors');
  if (!isTouch && !reduce) {
    const isLeaf = el => !!(el && el.classList && el.classList.contains('g-leaf'));
    doors.addEventListener('pointerover', e => { if (entered || isLeaf(e.relatedTarget)) return; gsap.to(leafL, { rotationY: 12, duration: .9, ease: 'power3.out' }); gsap.to(leafR, { rotationY: -12, duration: .9, ease: 'power3.out' }); gate.classList.add('ajar'); });
    doors.addEventListener('pointerout', e => { if (entered || isLeaf(e.relatedTarget)) return; gsap.to([leafL, leafR], { rotationY: 0, duration: 1, ease: 'power3.out' }); gate.classList.remove('ajar'); });
  }

  let birdT = setTimeout(function chirp() { if (window.Music && Music.birds) Music.birds(); birdT = setTimeout(chirp, 2600 + Math.random() * 4200); }, 1800);

  /* ---------- walk in ---------- */
  let entered = false, tl = null;
  function go() {
    if (entered) { if (tl && tl.progress() < .85) tl.progress(.85); return; }   // a second click skips ahead
    entered = true; clearTimeout(birdT);
    if (window.Music && Music.on) { Music.start(); Music.creak(); }
    gate.classList.add('opening'); gate.removeAttribute('data-hover');
    tl = gsap.timeline();
    tl.to(hint, { opacity: 0, y: 12, duration: .35 }, 0)
      .to(shelves, { opacity: 0, duration: .6, ease: 'power2.in' }, 0);
    if (reduce) {
      tl.to(leafL, { rotationY: 95, duration: .8 }, 0).to(leafR, { rotationY: -95, duration: .8 }, 0)
        .add(() => window.GA_enterSite && GA_enterSite(), .7).to(gate, { opacity: 0, duration: .6 }, .7).add(done);
      return;
    }
    const playAt = .45;
    tl.to(leafL, { rotationY: 104, duration: 1.9, ease: 'power2.inOut' }, 0)
      .to(leafR, { rotationY: -104, duration: 1.9, ease: 'power2.inOut' }, .06)
      .to('.g-crack', { opacity: 0, duration: .4 }, .3)
      .add(() => { const p = vid.play(); if (p && p.catch) p.catch(() => {}); }, playAt)
      .to(view, { z: 7, duration: 2.3, ease: 'power2.in', onUpdate: place }, .7)
      .to([wall, leafL, leafR], { opacity: 0, duration: .65, ease: 'power1.in' }, innerWidth > innerHeight ? 1.35 : 1)   // dissolve into the orchard
      .to(cv, { opacity: 0, duration: .6 }, 1.4)
      .to('#gFlash', { opacity: 1, duration: .6, ease: 'power2.in' }, playAt + 4.05)
      .add(() => { if (window.GA_enterSite) GA_enterSite(); if (window.Music) Music.whoosh(true); }, playAt + 4.6)
      .to(gate, { opacity: 0, duration: 1, ease: 'power2.out' }, playAt + 4.65)
      .add(done);
  }
  function done() {
    running = false;
    removeEventListener('resize', fit); removeEventListener('resize', sizeMotes);
    removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey);
    const c = document.getElementById('cursor'); if (c) c.classList.remove('hover', 'label');
    try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {}
    gate.remove();
  }
  gate.addEventListener('click', go);
  const onKey = e => { if (['Enter', ' ', 'ArrowDown', 'PageDown', 'Escape'].includes(e.key)) { e.preventDefault(); go(); } };
  const onWheel = e => { if (e.deltaY > 4 && !entered) go(); };
  addEventListener('keydown', onKey); addEventListener('wheel', onWheel, { passive: true });
  let ty0 = null;
  gate.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
  gate.addEventListener('touchmove', e => { if (ty0 != null && ty0 - e.touches[0].clientY > 40) { ty0 = null; go(); } }, { passive: true });
})();
