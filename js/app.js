/* Green Apple portfolio — interactions & animation */
(() => {
  gsap.registerPlugin(ScrollTrigger, Flip);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const P = window.PRODUCTS, A = window.AGENCIES, N = window.NEEDS;
  const AG = Object.fromEntries(A.map(a => [a.id, a]));
  const NEED = Object.fromEntries(N.map(n => [n.id, n]));
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '201023653671';
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };

  /* ---------- logos ---------- */
  $('#navLogo').innerHTML = window.LOGO;
  $('#loaderLogo').innerHTML = window.LOGO_MARK;

  /* ---------- word splitting (keeps Arabic letters joined) ---------- */
  function splitWords(el) {
    if (el.dataset.split) return $$('.w > span', el);
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
    el.dataset.split = 1;
    return $$('.w > span', el);
  }
  $$('.split').forEach(splitWords);

  /* ---------- smooth scroll ---------- */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = $(id); if (!t) return; e.preventDefault();
    lenis.scrollTo(t, { offset: id === '#top' ? 0 : -10, duration: 1.6 });
  }));

  /* =========================================================
     LOADER
  ========================================================= */
  (function loader() {
    const imgs = P.slice(0, 30).map(p => p.img).concat(['assets/crops/strawberry-before.webp', 'assets/crops/strawberry-after.webp']);
    let done = 0; const total = imgs.length + 1;
    const prog = { v: 0 };
    const tick = () => { done++; gsap.to(prog, { v: done / total * 100, duration: .4, onUpdate: upd }); };
    const upd = () => { $('#loadNum').textContent = Math.round(prog.v); $('#loadBar').style.width = prog.v + '%'; };
    imgs.forEach(src => { const i = new Image(); i.onload = i.onerror = tick; i.src = src; });
    document.fonts.ready.then(tick);
    gsap.fromTo('#loaderLogo path', { opacity: 0, scale: .9, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 1.4, stagger: .2, ease: 'expo.out' });
    const minTime = new Promise(r => setTimeout(r, 1500));
    const all = new Promise(r => { const iv = setInterval(() => { if (done >= total) { clearInterval(iv); r(); } }, 80); setTimeout(r, 6000); });
    Promise.all([minTime, all]).then(() => {
      gsap.to(prog, { v: 100, duration: .3, onUpdate: upd });
      $('#loaderEnter').classList.add('show');
    });
    $('#enterSound').addEventListener('click', () => { Music.start(); enter(); });
    $('#enterMute').addEventListener('click', enter);
  })();

  function enter() {
    if (document.body.dataset.entered) return; document.body.dataset.entered = 1;
    Music.whoosh(true);
    const tl = gsap.timeline();
    tl.to('.loader-inner', { y: -40, opacity: 0, duration: .5, ease: 'power2.in' })
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .add(() => { $('#loader').remove(); document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); })
      .add(heroIntro(), '-=.55');
  }

  function heroIntro() {
    const tl = gsap.timeline();
    tl.from('.hero-title .w > span', { yPercent: 115, rotate: -4, duration: 1.3, stagger: .09, ease: 'expo.out' })
      .from('.hero .reveal-up', { y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out' }, '-=1')
      .from('.hero-stats .stat', { y: 30, opacity: 0, duration: .9, stagger: .08, ease: 'expo.out' }, '-=.8')
      .add(() => $$('[data-count]').forEach(el => {
        const o = { v: 0 }; gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) });
      }), '-=.8')
      .from('#nav', { y: -80, opacity: 0, duration: 1, ease: 'expo.out' }, 0.2);
    hero.intro = 0; gsap.to(hero, { intro: 1, duration: 2.6, ease: 'expo.out' });
    return tl;
  }

  /* =========================================================
     HERO PARTICLE APPLE (3D point cloud, reacts to mouse, scroll & music)
  ========================================================= */
  const hero = { intro: 0, scatter: 0 };
  (function heroCanvas() {
    const cv = $('#heroCanvas'), cx = cv.getContext('2d');
    let W, H, DPR, pts = [], cxp, cyp, R;
    const count = innerWidth < 700 ? 1300 : 2600;
    function shape() {
      pts = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      const body = Math.floor(count * .86);
      for (let i = 0; i < body; i++) {
        const y = 1 - (i / (body - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
        let x = Math.cos(th) * rad, z = Math.sin(th) * rad, yy = y;
        const t = Math.acos(y); // 0 top .. PI bottom
        const widen = 1 + .16 * Math.sin(t) * (t < 1.7 ? 1 : .55) - .1 * (t > 2.2 ? 1 : 0);
        const dimpleTop = .38 * Math.exp(-Math.pow(t / .42, 2));
        const dimpleBot = .2 * Math.exp(-Math.pow((Math.PI - t) / .45, 2));
        x *= widen; z *= widen; yy = yy - dimpleTop + dimpleBot;
        yy *= .9;
        pts.push(mk(x, yy, z, i % 9 === 0 ? 2 : 0));
      }
      // stem
      for (let i = 0; i < count * .03; i++) { const k = i / (count * .03); pts.push(mk(.04 * Math.sin(k * 3), .5 + k * .38, 0, 1)); }
      // leaf
      const leafN = count - pts.length;
      for (let i = 0; i < leafN; i++) {
        const u = Math.random(), v = (Math.random() * 2 - 1) * Math.sin(Math.PI * u) * .22;
        const lx = .08 + u * .62, ly = .78 + u * .22 + Math.sin(u * 3.1) * .06;
        pts.push(mk(lx * Math.cos(.5) - v * .2, ly + v * .5, v * .9, 3));
      }
    }
    function mk(x, y, z, kind) {
      const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 5;
      return { x, y: -y, z, kind, sx: Math.cos(a) * d, sy: Math.sin(a) * d, sz: (Math.random() - .5) * 6, px: 0, py: 0, vx: 0, vy: 0, ox: 0, oy: 0, s: Math.random() };
    }
    function size() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR;
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const wide = W > 900;
      cxp = wide ? W * .24 : W * .5; cyp = wide ? H * .5 : H * .42; R = wide ? Math.min(W * .17, H * .3) : Math.min(W, H) * .36;
      cv.style.opacity = W > 1200 ? 1 : wide ? .8 : .4;
    }
    shape(); size(); addEventListener('resize', size);
    ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => hero.scatter = s.progress });
    let rotY = 0, tiltX = 0, tiltY = 0, visible = true, pulse = 0;
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);
    const COL = ['155,225,93', '0,166,80', '214,255,170', '120,220,120'];
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const lvl = Music.level(); pulse += (lvl - pulse) * .2;
      rotY += .0035 + pulse * .02;
      tiltX += ((mouse.ny * .35) - tiltX) * .05; tiltY += ((mouse.nx * .6) - tiltY) * .05;
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'lighter';
      const cy = Math.cos(rotY + tiltY), sy = Math.sin(rotY + tiltY), cxr = Math.cos(tiltX), sxr = Math.sin(tiltX);
      const intro = hero.intro, sc = hero.scatter, scale = R * (1 + pulse * .25);
      const mx = mouse.x - cv.getBoundingClientRect().left, my = mouse.y - cv.getBoundingClientRect().top;
      for (const p of pts) {
        const mixv = 1 - intro + sc * 1.2;
        let x = p.x + (p.sx - p.x) * mixv, y = p.y + (p.sy - p.y) * mixv, z = p.z + (p.sz - p.z) * mixv;
        const breathe = 1 + Math.sin(t * .0015 + p.s * 6) * .012;
        x *= breathe; y *= breathe; z *= breathe;
        let X = x * cy - z * sy, Z = x * sy + z * cy;
        let Y = y * cxr - Z * sxr; Z = y * sxr + Z * cxr;
        const persp = 2.6 / (2.6 + Z);
        let px = cxp + X * scale * persp, py = cyp + Y * scale * persp;
        // mouse repulsion
        const dx = px + p.ox - mx, dy = py + p.oy - my, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 4; p.vx += dx / Math.sqrt(d2 + 1) * f; p.vy += dy / Math.sqrt(d2 + 1) * f; }
        p.vx += -p.ox * .06; p.vy += -p.oy * .06; p.vx *= .82; p.vy *= .82; p.ox += p.vx; p.oy += p.vy;
        px += p.ox; py += p.oy;
        const depth = (1 - Z) * .5;
        const a = Math.max(.08, Math.min(1, .25 + depth * .75)) * (1 - sc * .7);
        const sz = (p.kind === 3 ? 1.6 : 1.2) * persp * (1 + pulse * 1.5) * (p.kind === 2 ? 1.6 : 1);
        cx.fillStyle = `rgba(${COL[p.kind]},${a})`;
        cx.fillRect(px, py, sz, sz);
      }
      cx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(frame);
  })();

  /* =========================================================
     CURSOR + MAGNETIC + SOUND HOOKS
  ========================================================= */
  const cur = $('#cursor'), dot = $('#cursorDot'), curLabel = $('#cursorLabel');
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  if (!isTouch) {
    const xTo = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
    addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); dx(e.clientX); dy(e.clientY); });
  }
  function hoverables(root = document) {
    $$('[data-hover], .chip, .card, .need, .a-panel', root).forEach(el => {
      if (el.dataset.hb) return; el.dataset.hb = 1;
      el.addEventListener('mouseenter', () => {
        Music.hover();
        const lbl = el.dataset.cursor;
        if (lbl) { cur.classList.add('label'); curLabel.textContent = lbl; } else cur.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => { cur.classList.remove('hover', 'label'); });
      el.addEventListener('click', () => Music.click());
    });
    if (!isTouch) $$('[data-magnetic]', root).forEach(el => {
      if (el.dataset.mg) return; el.dataset.mg = 1;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .5, ease: 'power3' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.4)' }));
    });
  }
  function tilt(root = document) {
    if (isTouch) return;
    $$('[data-tilt], .card', root).forEach(el => {
      if (el.dataset.tl) return; el.dataset.tl = 1;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(el, { rotateY: x * 14, rotateX: -y * 14, duration: .5, ease: 'power2' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: .9, ease: 'elastic.out(1,.5)' }));
    });
  }

  /* ---------- sound toggle ---------- */
  const st = $('#soundToggle'), bars = $$('#soundToggle .bars i');
  st.addEventListener('click', () => Music.toggle());
  document.addEventListener('music', e => { st.classList.toggle('on', e.detail); $('#soundLabel').textContent = e.detail ? 'SOUND ON' : 'SOUND OFF'; });
  (function barsLoop() {
    requestAnimationFrame(barsLoop);
    const b = Music.bands(5);
    bars.forEach((el, i) => el.style.height = (3 + (Music.on ? b[i] * 14 + Math.random() * 1.5 : 0)) + 'px');
  })();

  /* =========================================================
     NAV / PROGRESS
  ========================================================= */
  let lastY = 0;
  lenis.on('scroll', ({ scroll, limit }) => {
    $('#nav').classList.toggle('scrolled', scroll > 40);
    $('#nav').classList.toggle('hide', scroll > lastY && scroll > 400);
    lastY = scroll;
    $('#scrollProg').style.transform = `scaleX(${limit ? scroll / limit : 0})`;
  });

  /* =========================================================
     MARQUEE (speed follows scroll velocity)
  ========================================================= */
  (function marquee() {
    const names = A.map(a => a.name);
    const row1 = names.map((n, i) => `<span class="${i % 2 ? 'o' : ''}">${n}</span><span class="star">✦</span>`).join('');
    const row2 = ['منشطات حيوية', 'جذور أقوى', 'تزهير وعقد', 'تحجيم وتلوين', 'مقاومة الإجهاد', 'علاج الملوحة', 'حماية ومناعة', 'عناصر صغرى'].map(n => `<span>${n}</span><span class="star">●</span>`).join('');
    const m1 = $('#marquee1'), m2 = $('#marquee2');
    m1.innerHTML = `<div class="item">${row1}</div>`.repeat(4);
    m2.innerHTML = `<div class="item">${row2}</div>`.repeat(4);
    let x1 = 0, x2 = 0, boost = 0;
    lenis.on('scroll', ({ velocity }) => boost = Math.min(Math.abs(velocity) * .4, 12));
    gsap.ticker.add(() => {
      const w1 = m1.firstElementChild.offsetWidth, w2 = m2.firstElementChild.offsetWidth;
      x1 -= .6 + boost; x2 += .45 + boost * .7; boost *= .92;
      if (-x1 >= w1) x1 += w1; if (x2 >= 0) x2 -= w2;
      m1.style.transform = `translateX(${x1}px)`; m2.style.transform = `translateX(${x2}px)`;
    });
  })();

  /* =========================================================
     SECTION TITLES & MANIFESTO
  ========================================================= */
  $$('.big-title, .mega').forEach(t => {
    gsap.from($$('.w > span', t), { yPercent: 115, rotate: -3, duration: 1.2, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 82%' } });
  });
  $$('.about-label').forEach(l => gsap.from(l, { x: 40, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 88%' } }));
  (function manifesto() {
    const el = $('#manifesto');
    const HL = ['الوكالات', 'العالمية', 'المزارع', 'المصري', 'علمي', 'الجذر', 'الحصاد،', 'الحصاد', 'معاك.'];
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="mw${HL.includes(w) ? ' hl' : ''}">${w}</span>`).join(' ');
    const ws = $$('.mw', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: s => { const n = Math.round(s.progress * ws.length); ws.forEach((w, i) => w.classList.toggle('lit', i < n)); }
    });
  })();
  gsap.from('.pillar', { y: 80, opacity: 0, rotateX: -20, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.pillars', start: 'top 85%' } });

  /* =========================================================
     AGENCIES — horizontal pinned scroll
  ========================================================= */
  const byAgency = id => P.filter(p => p.a === id);
  (function agencies() {
    const track = $('#hTrack');
    track.innerHTML = A.map((a, i) => {
      const ps = byAgency(a.id), pick = [ps[0], ps[Math.floor(ps.length / 3)], ps[Math.floor(ps.length * 2 / 3)], ps[ps.length - 1]].filter((v, k, arr) => v && arr.indexOf(v) === k);
      return `<article class="a-panel" data-agency="${a.id}" data-cursor="البروفايل" style="--c:${a.color};--c2:${a.color2}">
        <span class="a-idx">0${i + 1} / 0${A.length}</span>
        <div class="a-word">${a.name}</div>
        <div class="a-info">
          <span class="a-origin">${a.origin}</span>
          <h3 class="a-name">${a.name}</h3>
          <p class="a-ar">${a.ar}</p>
          <p class="a-short">${a.short}</p>
          <div class="a-count"><b>${ps.length}</b><span>مركب</span></div>
          <button class="a-open">افتح البروفايل <span>←</span></button>
        </div>
        <div class="a-stage">${pick.map(p => `<div class="a-bottle"><img src="${p.img}" alt="${p.en}" loading="lazy"></div>`).join('')}</div>
      </article>`;
    }).join('');
    $$('.a-panel', track).forEach(p => p.addEventListener('click', () => openProfile(p.dataset.agency)));

    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => dist(), ease: 'none',
      scrollTrigger: { trigger: '#hPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    // parallax driven by each panel's on-screen position (works for RTL movement)
    const panels = $$('.a-panel').map(panel => ({
      panel, bottles: $$('.a-bottle', panel), word: $('.a-word', panel), info: $$('.a-info > *', panel), shown: false
    }));
    panels.forEach(o => gsap.set(o.info, { y: 40, opacity: 0 }));
    gsap.ticker.add(() => {
      for (const o of panels) {
        const r = o.panel.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const p = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; // 0 = centered
        o.bottles.forEach((b, k) => {
          const base = [0, 8, -9, -4][k] || 0;
          b.style.transform = `translate3d(${p * (40 + k * 30)}px, ${p * (90 + k * 50)}px, 0) rotate(${base + p * (k % 2 ? -18 : 18)}deg)`;
        });
        o.word.style.transform = `translateX(${p * -30}%)`;
        if (!o.shown && Math.abs(p) < .45) {
          o.shown = true;
          gsap.to(o.info, { y: 0, opacity: 1, stagger: .07, duration: .9, ease: 'expo.out' });
          Music.hover();
        }
      }
    });
  })();

  /* =========================================================
     CARDS
  ========================================================= */
  function card(p) {
    const a = AG[p.a];
    const el = document.createElement('button');
    el.className = 'card'; el.dataset.id = p.id; el.dataset.cursor = 'افتح';
    el.style.setProperty('--c', a.color);
    el.innerHTML = `<div class="c-img"><img src="${p.img}" alt="${p.en}" loading="lazy"></div>
      <div class="c-body"><span class="c-ag"><i></i>${a.name}</span><h4 class="c-en">${p.en}</h4><p class="c-ar">${p.ar}</p><p class="c-t">${p.t}</p></div>`;
    return el;
  }

  /* =========================================================
     NEEDS
  ========================================================= */
  (function needs() {
    const g = $('#needsGrid');
    g.innerHTML = N.map(n => {
      const ps = P.filter(p => p.c.includes(n.id));
      return `<button class="need" data-need="${n.id}" data-cursor="الحلول">
        <span class="n-count">${ps.length}</span>
        <svg viewBox="0 0 64 64"><path d="${n.ico}"/></svg>
        <div><h3>${n.ar}</h3><small>${n.en}</small></div>
        <div class="n-thumbs">${ps.slice(0, 3).map(p => `<img src="${p.img}" alt="" loading="lazy">`).join('')}</div>
      </button>`;
    }).join('');
    $$('.need', g).forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
      b.addEventListener('click', () => { state.need = b.dataset.need; state.agency = 'all'; syncChips(); render(); Music.whoosh(false); lenis.scrollTo('#explorer', { duration: 1.6 }); });
    });
    gsap.from('.need', { y: 70, opacity: 0, duration: 1, stagger: { each: .06, from: 'start' }, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 85%' } });
  })();

  /* =========================================================
     EXPLORER (filter + search + Flip)
  ========================================================= */
  const state = { agency: 'all', need: 'all', q: '' };
  const grid = $('#grid');
  const cards = P.map(p => { const c = card(p); grid.appendChild(c); c.addEventListener('click', () => openModal(p.id, currentList())); return c; });
  const norm = s => (s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[-\s]+/g, ' ');
  const hay = Object.fromEntries(P.map(p => [p.id, norm([p.en, p.ar, p.t, AG[p.a].name, AG[p.a].ar, ...p.comp.map(c => c[0]), ...p.chips, ...p.c.map(c => NEED[c].ar)].join(' '))]));
  const match = p => (state.agency === 'all' || p.a === state.agency) && (state.need === 'all' || p.c.includes(state.need)) && (!state.q || norm(state.q).split(' ').every(w => hay[p.id].includes(w)));
  const currentList = () => P.filter(match).map(p => p.id);

  $('#agencyChips').innerHTML = `<button class="chip active" data-agency="all">كل الوكالات</button>` + A.map(a => `<button class="chip" data-agency="${a.id}" style="--c:${a.color}"><i></i>${a.name}</button>`).join('');
  $('#needChips').innerHTML = `<button class="chip active" data-need="all">كل الاحتياجات</button>` + N.map(n => `<button class="chip" data-need="${n.id}">${n.ar}</button>`).join('');
  function syncChips() {
    $$('#agencyChips .chip').forEach(c => c.classList.toggle('active', c.dataset.agency === state.agency));
    $$('#needChips .chip').forEach(c => c.classList.toggle('active', c.dataset.need === state.need));
  }
  $$('#agencyChips .chip').forEach(c => c.addEventListener('click', () => { state.agency = c.dataset.agency; syncChips(); render(); }));
  $$('#needChips .chip').forEach(c => c.addEventListener('click', () => { state.need = c.dataset.need; syncChips(); render(); }));
  let qT; $('#search').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 160); });

  function render(first) {
    const fState = Flip.getState(cards);
    let n = 0;
    cards.forEach((c, i) => { const ok = match(P[i]); c.style.display = ok ? '' : 'none'; if (ok) n++; });
    let empty = $('.empty', grid);
    if (!n && !empty) { empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'مفيش مركبات بالبحث ده — جرّب كلمة تانية 🌱'; grid.appendChild(empty); }
    if (n && empty) empty.remove();
    $('#resultCount').textContent = `${n} مركب` + (state.agency !== 'all' ? ` من ${AG[state.agency].name}` : '') + (state.need !== 'all' ? ` · ${NEED[state.need].ar}` : '');
    if (!first) Flip.from(fState, { duration: .7, ease: 'expo.out', scale: true, absolute: false, onEnter: els => gsap.fromTo(els, { opacity: 0, scale: .7 }, { opacity: 1, scale: 1, duration: .6, ease: 'expo.out' }) });
    ScrollTrigger.refresh();
  }
  render(true);
  ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: b => gsap.from(b, { y: 70, opacity: 0, rotateX: -25, duration: 1, stagger: .06, ease: 'expo.out', overwrite: true }) });

  /* =========================================================
     AGENCY PROFILE OVERLAY
  ========================================================= */
  const pf = $('#profile'), pfScroll = $('#profileScroll');
  let pfOpen = false;
  function openProfile(id) {
    const a = AG[id], ps = byAgency(id);
    pf.style.setProperty('--pc', a.color);
    $('#pfWord').textContent = a.name;
    $('#pfOrigin').textContent = a.origin;
    $('#pfName').innerHTML = [...a.name].map(ch => `<span style="display:inline-block">${ch}</span>`).join('');
    $('#pfAr').textContent = a.ar + ' — ' + a.short;
    $('#pfDesc').innerHTML = a.desc.replace(/[A-Za-z][A-Za-z0-9\-]*/g, m => `<bdi>${m}</bdi>`);
    const needsCount = new Set(ps.flatMap(p => p.c)).size;
    $('#pfMeta').innerHTML = `<div><b>${ps.length}</b><span>مركب</span></div><div><b>${needsCount}</b><span>محاور حلول</span></div>`;
    $('#pfFocus').innerHTML = a.focus.map(f => `<span>${f}</span>`).join('');
    $('#pfCount').textContent = `(${ps.length})`;
    const g = $('#pfGrid'); g.innerHTML = '';
    ps.forEach(p => { const c = card(p); c.addEventListener('click', () => openModal(p.id, ps.map(x => x.id))); g.appendChild(c); });
    hoverables(pf); tilt(pf);
    pfScroll.scrollTop = 0;
    pf.classList.add('open'); pf.setAttribute('aria-hidden', 'false'); pfOpen = true;
    lenis.stop(); document.body.classList.add('lock');
    Music.whoosh(true); setTimeout(() => Music.chime(), 350);
    const tl = gsap.timeline();
    tl.set('.profile-wipe', { transformOrigin: 'bottom' })
      .fromTo('.profile-wipe', { scaleY: 0 }, { scaleY: 1, duration: .6, ease: 'expo.in' })
      .set(pfScroll, { opacity: 1 })
      .set('.profile-wipe', { transformOrigin: 'top' })
      .to('.profile-wipe', { scaleY: 0, duration: .8, ease: 'expo.out' })
      .from('#pfName span', { yPercent: 110, opacity: 0, rotate: 10, duration: 1, stagger: .05, ease: 'expo.out' }, '-=.6')
      .from('#pfWord', { xPercent: -30, opacity: 0, duration: 1.6, ease: 'expo.out' }, '<')
      .from(['.profile-hero .eyebrow', '#pfAr', '#pfDesc', '#pfMeta', '#pfFocus span'], { y: 30, opacity: 0, stagger: .05, duration: .8, ease: 'expo.out' }, '-=1.1')
      .from('#pfGrid .card', { y: 80, opacity: 0, rotateX: -20, stagger: .04, duration: .9, ease: 'expo.out' }, '-=.8');
    $$('#pfMeta b').forEach(b => { const o = { v: 0 }, to = +b.textContent; gsap.to(o, { v: to, duration: 1.6, delay: 1, ease: 'power3.out', onUpdate: () => b.textContent = Math.round(o.v) }); });
  }
  function closeProfile() {
    if (!pfOpen) return; pfOpen = false;
    Music.whoosh(false);
    gsap.timeline()
      .set('.profile-wipe', { transformOrigin: 'top' })
      .to('.profile-wipe', { scaleY: 1, duration: .5, ease: 'expo.in' })
      .set(pfScroll, { opacity: 0 })
      .set('.profile-wipe', { transformOrigin: 'bottom' })
      .to('.profile-wipe', { scaleY: 0, duration: .7, ease: 'expo.out' })
      .add(() => { pf.classList.remove('open'); pf.setAttribute('aria-hidden', 'true'); if (!modalOpen) { lenis.start(); document.body.classList.remove('lock'); } });
  }
  $('#profileClose').addEventListener('click', closeProfile);

  /* =========================================================
     PRODUCT MODAL
  ========================================================= */
  const modal = $('#modal'), mc = $('#modalCard');
  let modalOpen = false, mList = [], mIdx = 0;
  function fillModal(id) {
    const p = P.find(x => x.id === id), a = AG[p.a];
    mc.style.setProperty('--c', a.color);
    $('#mImg').src = p.img; $('#mImg').alt = p.en;
    $('#mAgency').textContent = `${a.name} · ${a.ar}`;
    $('#mEn').textContent = p.en; $('#mAr').textContent = p.ar; $('#mTag').textContent = p.t;
    $('#mCats').innerHTML = p.c.map(c => `<span>${NEED[c].ar}</span>`).join('');
    const max = Math.max(...p.comp.map(c => c[1]), 1);
    $('#mComp').innerHTML = p.comp.length
      ? p.comp.map(([k, v]) => `<div class="bar-row"><span>${k}</span><div class="track"><div class="fill" data-w="${Math.max(3, v / Math.max(max, 30) * 100)}"></div></div><b>${v}%</b></div>`).join('')
      : `<div class="m-chips">${p.chips.map(c => `<span>${c}</span>`).join('')}</div>`;
    $('#mWa').href = `https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، عايز أعرف أكتر عن مركب ${p.en} (${p.ar}) من ${a.name}`)}`;
    gsap.fromTo('#mImg', { scale: .6, rotate: -12, opacity: 0, y: 40 }, { scale: 1, rotate: 0, opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
    gsap.fromTo('.modal-info > *', { x: -30, opacity: 0 }, { x: 0, opacity: 1, stagger: .04, duration: .7, ease: 'expo.out' });
    $$('#mComp .fill').forEach((f, i) => gsap.to(f, { width: f.dataset.w + '%', duration: 1.2, delay: .3 + i * .07, ease: 'expo.out' }));
    gsap.from('#mComp .m-chips span', { scale: .5, opacity: 0, stagger: .06, duration: .6, ease: 'back.out(2)', delay: .3 });
  }
  function openModal(id, list) {
    mList = list && list.length ? list : P.map(p => p.id); mIdx = Math.max(0, mList.indexOf(id));
    fillModal(id);
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); modalOpen = true;
    lenis.stop(); document.body.classList.add('lock');
    Music.whoosh(true);
    gsap.to('.modal-backdrop', { opacity: 1, duration: .5 });
    gsap.fromTo(mc, { opacity: 0, y: 80, scale: .92, rotateX: 12 }, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: .9, ease: 'expo.out' });
    hoverables(modal);
  }
  function closeModal() {
    if (!modalOpen) return; modalOpen = false;
    gsap.to('.modal-backdrop', { opacity: 0, duration: .4 });
    gsap.to(mc, { opacity: 0, y: 60, scale: .95, duration: .45, ease: 'power3.in', onComplete: () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); } });
    if (!pfOpen) { lenis.start(); document.body.classList.remove('lock'); }
  }
  function stepModal(d) { mIdx = (mIdx + d + mList.length) % mList.length; Music.hover(); fillModal(mList[mIdx]); }
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', closeModal);
  $('#mNext').addEventListener('click', () => stepModal(1));
  $('#mPrev').addEventListener('click', () => stepModal(-1));
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (modalOpen) closeModal(); else closeProfile(); }
    if (modalOpen && e.key === 'ArrowLeft') stepModal(1);
    if (modalOpen && e.key === 'ArrowRight') stepModal(-1);
  });
  // swipe on touch
  let sx = null;
  mc.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  mc.addEventListener('touchend', e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 60) stepModal(d < 0 ? 1 : -1); sx = null; });

  /* =========================================================
     BEFORE / AFTER COMPARE
  ========================================================= */
  (function compare() {
    const box = $('#compare'), before = $('#cmpBefore'), handle = $('#cmpHandle');
    let drag = false;
    const set = pct => { pct = Math.max(4, Math.min(96, pct)); before.style.clipPath = `inset(0 0 0 ${pct}%)`; handle.style.left = pct + '%'; };
    const fromEv = e => { const r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    box.addEventListener('pointerdown', e => { drag = true; box.setPointerCapture(e.pointerId); fromEv(e); Music.hover(); });
    box.addEventListener('pointermove', e => drag && fromEv(e));
    box.addEventListener('pointerup', () => drag = false);
    const o = { v: 50 };
    gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 65%' } })
      .to(o, { v: 22, duration: 1, ease: 'power3.inOut', onUpdate: () => set(o.v) })
      .to(o, { v: 78, duration: 1.3, ease: 'power3.inOut', onUpdate: () => set(o.v) })
      .to(o, { v: 50, duration: 1, ease: 'power3.inOut', onUpdate: () => set(o.v) });
    gsap.from(box, { clipPath: 'inset(30% 30% 30% 30% round 28px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: box, start: 'top 85%' } });
  })();

  /* =========================================================
     CONTACT — rising seeds that dance to the music
  ========================================================= */
  (function contactCanvas() {
    const cv = $('#contactCanvas'), cx = cv.getContext('2d');
    let W, H, seeds = [], visible = false;
    const size = () => { const d = Math.min(devicePixelRatio, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    for (let i = 0; i < 90; i++) seeds.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, v: .0006 + Math.random() * .0016, w: Math.random() * 6 });
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);
    (function f(t) {
      requestAnimationFrame(f); if (!visible) return;
      const lvl = Music.level();
      cx.clearRect(0, 0, W, H);
      for (const s of seeds) {
        s.y -= s.v * (1 + lvl * 6); if (s.y < -.05) { s.y = 1.05; s.x = Math.random(); }
        const x = s.x * W + Math.sin(t * .001 + s.w) * 20, y = s.y * H;
        cx.beginPath(); cx.arc(x, y, s.r * (1 + lvl * 2), 0, 7);
        cx.fillStyle = `rgba(155,225,93,${.15 + .5 * (1 - s.y)})`; cx.fill();
      }
    })(0);
  })();

  /* ---------- final wiring ---------- */
  $$('.nav-links a').forEach(a => {
    const s = $(a.getAttribute('href'));
    ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: e => a.classList.toggle('active', e.isActive) });
  });
  ScrollTrigger.sort();
  hoverables(); tilt();
  addEventListener('load', () => ScrollTrigger.refresh());
  if (reduce) gsap.globalTimeline.timeScale(3);
})();
