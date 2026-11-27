/* "من الأرض" hub (events · crops · products · testimonials), detail pages, lightbox, team video */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const GA = window.GA, E = window.EVENTS, C = window.CROPS, TR = window.TRIALS, V = window.TESTIMONIALS;
  const PROD = Object.fromEntries(GA.products.map(p => [p.id, p]));
  const CROP = Object.fromEntries(C.map(c => [c.id, c]));
  const VOICE = Object.fromEntries(V.map(v => [v.id, v]));
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // prose: escape, then isolate Latin runs so Arabic "و" + English names keep their order
  const txt = s => esc(s).replace(/(?<![&#\w])[A-Za-z][A-Za-z0-9.\-]*(?: [A-Za-z0-9][A-Za-z0-9.\-]*)*(?!;)/g, m => `<bdi>${m}</bdi>`);
  const fmtDate = d => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    if (day) return `${+day} ${MONTHS[+m - 1]} ${y}`;
    if (m) return `${MONTHS[+m - 1]} ${y}`;
    return `موسم ${y}`;
  };
  const vsrc = id => `assets/field/videos/${id}.mp4`, vposter = id => `assets/field/videos/${id}.webp`;
  const agencyOf = pid => GA.agencies[PROD[pid]?.a] || null;
  const trialsBy = (k, v) => TR.filter(t => t[k] === v);
  const voicesFor = (k, v) => V.filter(t => k === 'crop' ? t.crop === v : t.products.includes(v));
  const productIds = [...new Set([...TR.map(t => t.product), ...V.flatMap(v => v.products)].filter(Boolean))];
  const cropIds = C.map(c => c.id).filter(id => TR.some(t => t.crop === id) || V.some(v => v.crop === id));
  const coverFor = list => (list.find(t => t.images.length)?.images[0][0]) || (list.find(t => t.testimonial) && vposter(list.find(t => t.testimonial).testimonial));

  /* ---------- chips ---------- */
  const prodChip = pid => {
    const p = PROD[pid]; if (!p) return '';
    const a = agencyOf(pid);
    return `<button class="pchip" data-go="product" data-id="${pid}" style="--c:${a.color}" data-hover><i></i>${esc(p.en)}</button>`;
  };
  const cropChip = cid => CROP[cid] ? `<button class="cchip" data-go="crop" data-id="${cid}" data-hover>${esc(CROP[cid].ar)}</button>` : '';

  /* ---------- stats ---------- */
  $('#fieldStats').innerHTML = [
    [E.length, 'إيفنتات'], [TR.filter(t => t.images.length).length, 'تجربة موثقة بالصور'],
    [cropIds.length, 'محصول'], [V.length, 'رأي عميل بالفيديو']
  ].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');

  /* ---------- tabs ---------- */
  const tabs = $$('.ftab'), ink = $('#ftabInk');
  const moveInk = () => {
    const a = $('.ftab.active'); if (!a) return;
    ink.style.width = a.offsetWidth + 'px'; ink.style.height = a.offsetHeight + 'px';
    ink.style.transform = `translate(${a.offsetLeft - a.parentElement.scrollLeft}px, ${a.offsetTop}px)`;
  };
  function showTab(name, instant) {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
    $$('.fpanel').forEach(p => {
      const on = p.dataset.panel === name;
      p.classList.toggle('active', on);
      if (on && !instant) gsap.fromTo(p.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .04, ease: 'power3.out', clearProps: 'transform,opacity' });
    });
    moveInk(); pauseAll();
    setTimeout(() => ScrollTrigger.refresh(), 60);
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  addEventListener('resize', moveInk); $('#fieldTabs').addEventListener('scroll', moveInk, { passive: true });

  /* ---------- panels ---------- */
  $('#panelEvents').innerHTML = `<div class="timeline">${[...E].sort((a, b) => b.start.localeCompare(a.start)).map(ev => {
    const [y, m, d] = ev.start.split('-');
    return `<article class="ev" data-go="event" data-id="${ev.id}" data-cursor="التفاصيل">
      <div class="ev-date"><b>${+d}</b><span>${MONTHS[+m - 1]}</span><em>${y}</em></div>
      <div class="ev-img"><img src="${ev.cover}" alt="${esc(ev.title)}" loading="lazy" decoding="async"></div>
      <div class="ev-info">
        <p class="ev-when">${esc(ev.dateLabel)} · ${esc(ev.place)}</p>
        <h3>${esc(ev.title)}</h3>
        <p>${txt(ev.summary)}</p>
        <div class="ev-tags">${ev.highlights.map(h => `<span>${esc(h)}</span>`).join('')}</div>
        <span class="ev-more">تفاصيل الإيفنت والصور ←</span>
      </div>
    </article>`;
  }).join('')}</div>`;

  $('#panelCrops').innerHTML = `<div class="fgrid">${cropIds.map(id => {
    const c = CROP[id], ts = trialsBy('crop', id), vs = voicesFor('crop', id);
    const prods = [...new Set([...ts.map(t => t.product), ...vs.flatMap(v => v.products)].filter(Boolean))];
    return `<article class="fcard" data-go="crop" data-id="${id}" data-cursor="افتح">
      <div class="fcard-img"><img src="${coverFor(ts) || vposter(vs[0]?.id)}" alt="${esc(c.ar)}" loading="lazy" decoding="async"></div>
      <div class="fcard-body"><small>${esc(c.en)}</small><h3>${esc(c.ar)}</h3>
        <p>${[ts.filter(t => t.images.length).length && `${ts.filter(t => t.images.length).length} تجربة`, vs.length && `${vs.length} رأي عميل`].filter(Boolean).join(' · ')}</p>
        <div class="fcard-prods">${prods.slice(0, 4).map(p => `<span>${esc(PROD[p].en)}</span>`).join('')}</div></div>
    </article>`;
  }).join('')}</div>`;

  $('#panelProducts').innerHTML = `<div class="fgrid">${productIds.map(id => {
    const p = PROD[id], a = agencyOf(id), ts = trialsBy('product', id), vs = voicesFor('product', id);
    const crops = [...new Set([...ts.map(t => t.crop), ...vs.map(v => v.crop)].filter(Boolean))];
    return `<article class="fcard prod" data-go="product" data-id="${id}" data-cursor="النتايج" style="--c:${a.color}">
      <div class="fcard-img white"><img src="${p.img}" alt="${esc(p.en)}" loading="lazy" decoding="async"></div>
      <div class="fcard-body"><small><i></i>${esc(a.name)}</small><h3 class="en">${esc(p.en)}</h3>
        <p>${ts.length + vs.length} نتيجة على: ${crops.map(c => CROP[c].ar).join('، ') || '—'}</p></div>
    </article>`;
  }).join('')}</div>`;

  const voiceCard = v => `<article class="voice">
      <div class="voice-media"><video preload="none" playsinline controls poster="${vposter(v.id)}" data-src="${vsrc(v.id)}"></video>
        <button class="vplay" aria-label="شغّل الفيديو"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>
      <div class="voice-body">
        ${v.quote ? `<blockquote>«${txt(v.quote)}»</blockquote>` : ''}
        <p class="voice-who">${esc(v.who)}${v.where ? ` · ${esc(v.where)}` : ''}</p>
        <div class="voice-chips">${cropChip(v.crop)}${v.products.map(prodChip).join('')}</div>
      </div>
    </article>`;
  $('#panelVoices').innerHTML = `<div class="voices">${V.map(voiceCard).join('')}</div>`;

  /* ---------- video players: lazy src, one at a time, background music steps aside ---------- */
  let musicWasOn = false;
  const playing = () => $$('video').some(v => !v.paused && !v.ended);
  function wireVideos(root) {
    $$('video', root).forEach(v => {
      if (v.dataset.wired) return; v.dataset.wired = 1;
      const btn = v.parentElement.querySelector('.vplay, .team-play');
      const start = () => { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); };
      btn && btn.addEventListener('click', e => { e.stopPropagation(); start(); });
      v.addEventListener('play', () => {
        $$('video').forEach(o => { if (o !== v) o.pause(); });
        v.parentElement.classList.add('is-playing');
        if (window.Music && Music.on) { musicWasOn = true; Music.stop(); }
      });
      const done = () => { v.parentElement.classList.remove('is-playing'); setTimeout(() => { if (musicWasOn && !playing()) { musicWasOn = false; Music.start(); } }, 300); };
      v.addEventListener('pause', done); v.addEventListener('ended', done);
    });
  }
  const pauseAll = () => $$('video').forEach(v => v.pause());
  wireVideos(document);

  /* ---------- detail page ---------- */
  const page = $('#page'), pscroll = $('#pageScroll'), body = $('#pageBody');
  let lbList = [];
  const gallery = imgs => `<div class="pgal">${imgs.map(([src, cap]) =>
    `<figure data-lb="${src}" data-cap="${esc(cap || '')}"><img src="${src}" alt="${esc(cap || '')}" loading="lazy" decoding="async">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`).join('')}</div>`;
  const videoBlock = (id, cap) => `<div class="pvideo"><div class="voice-media"><video preload="none" playsinline controls poster="${vposter(id)}" data-src="${vsrc(id)}"></video>
      <button class="vplay" aria-label="شغّل الفيديو"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>${cap ? `<p class="pcap">${esc(cap)}</p>` : ''}</div>`;
  const trialBlock = (t, ctx) => {
    const voice = t.testimonial && VOICE[t.testimonial];
    return `<section class="trial">
      <header><span class="trial-date">${fmtDate(t.date)}</span><h3>${esc(t.title)}</h3>
        <div class="trial-chips">${ctx !== 'product' && t.product ? prodChip(t.product) : ''}${ctx !== 'crop' && t.crop ? cropChip(t.crop) : ''}</div></header>
      <p>${txt(t.text)}</p>
      ${t.points.length ? `<ul class="trial-points">${t.points.map(p => `<li>${txt(p)}</li>`).join('')}</ul>` : ''}
      ${t.images.length ? gallery(t.images) : ''}
      ${t.video ? videoBlock(t.video, 'فيديو من الحقل') : ''}
      ${voice ? videoBlock(voice.id, voice.quote ? `«${voice.quote}» — ${voice.who}` : voice.who) : ''}
    </section>`;
  };

  function render(type, id) {
    if (type === 'event') {
      const ev = E.find(e => e.id === id); if (!ev) return false;
      const partner = ev.partner && GA.agencies[ev.partner];
      body.innerHTML = `
        <header class="phero" style="--pimg:url('${ev.cover}')">
          <p class="eyebrow"><span class="dot"></span> إيفنت · ${esc(ev.dateLabel)}</p>
          <h2>${esc(ev.title)}</h2>
          <p class="pmeta">${esc(ev.place)}${partner ? ` · مع <b style="color:${partner.color}">${partner.name}</b>` : ''}</p>
        </header>
        <div class="pcols">
          <div class="ptext"><p class="plead">${txt(ev.summary)}</p>${ev.body.map(p => `<p>${txt(p)}</p>`).join('')}</div>
          <aside class="pside"><h4>أبرز اللي حصل</h4><ul>${ev.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
            <h4>التاريخ</h4><p>${esc(ev.dateLabel)}</p><h4>المكان</h4><p>${esc(ev.place)}</p></aside>
        </div>
        ${ev.video ? `<h3 class="psub">من قلب الإيفنت</h3>${videoBlock(ev.video, VOICE[ev.video]?.quote ? `«${VOICE[ev.video].quote}» — ${VOICE[ev.video].who}` : '')}` : ''}
        <h3 class="psub">صور</h3>${gallery(ev.gallery.map(src => [src, '']))}`;
    } else if (type === 'crop') {
      const c = CROP[id]; if (!c) return false;
      const ts = trialsBy('crop', id), shown = new Set(ts.map(t => t.testimonial).filter(Boolean));
      const extra = voicesFor('crop', id).filter(v => !shown.has(v.id));
      body.innerHTML = `
        <header class="phero"><p class="eyebrow"><span class="dot"></span> نتايج حسب المحصول</p>
          <h2>${esc(c.ar)} <small>${esc(c.en)}</small></h2><p class="plead">${esc(c.intro)}</p>
          <p class="pmeta">${ts.length} نتيجة موثقة${extra.length ? ` · ${extra.length} رأي عميل` : ''}</p></header>
        ${ts.map(t => trialBlock(t, 'crop')).join('')}
        ${extra.length ? `<h3 class="psub">آراء العملاء</h3><div class="voices">${extra.map(voiceCard).join('')}</div>` : ''}`;
    } else if (type === 'product') {
      const p = PROD[id]; if (!p) return false;
      const a = agencyOf(id), ts = trialsBy('product', id), shown = new Set(ts.map(t => t.testimonial).filter(Boolean));
      const extra = voicesFor('product', id).filter(v => !shown.has(v.id));
      body.innerHTML = `
        <header class="phero prod" style="--c:${a.color}">
          <div class="pprod-img"><img src="${p.img}" alt="${esc(p.en)}"></div>
          <div><p class="eyebrow"><span class="dot"></span> نتايج المركب في الأرض · ${esc(a.name)}</p>
            <h2 class="en">${esc(p.en)}</h2><p class="pmeta">${esc(p.ar)}</p><p class="plead">${txt(p.t)}</p>
            <button class="btn-line" data-modal="${id}" data-hover>التركيبة والتفاصيل ←</button></div>
        </header>
        ${ts.map(t => trialBlock(t, 'product')).join('')}
        ${extra.length ? `<h3 class="psub">آراء العملاء</h3><div class="voices">${extra.map(voiceCard).join('')}</div>` : ''}`;
    } else return false;
    lbList = $$('[data-lb]', body).map(f => [f.dataset.lb, f.dataset.cap]);
    wireVideos(body); GA.hoverables(page);
    return true;
  }

  let pageOpen = false;
  function openPage(type, id, push = true) {
    pauseAll();
    if (!render(type, id)) return;
    pscroll.scrollTop = 0;
    if (push) history.replaceState(null, '', `#${type}-${id}`);
    if (!pageOpen) {
      pageOpen = true; window.GA_pageOpen = true;
      page.classList.add('open'); page.setAttribute('aria-hidden', 'false');
      GA.lenis.stop(); document.body.classList.add('lock');
      if (window.Music) Music.whoosh(true);
      gsap.fromTo(page, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .7, ease: 'expo.out' });
    }
    gsap.fromTo($$('.phero > *, .phero > div > *, .pcols, .trial, .psub, .pgal', body).slice(0, 14), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .05, ease: 'power3.out', delay: .1, clearProps: 'transform,opacity' });
  }
  function closePage() {
    if (!pageOpen) return;
    pageOpen = false; window.GA_pageOpen = false; pauseAll();
    history.replaceState(null, '', '#field');
    if (window.Music) Music.whoosh(false);
    gsap.to(page, { clipPath: 'inset(100% 0 0 0)', duration: .55, ease: 'expo.in', onComplete: () => {
      page.classList.remove('open'); page.setAttribute('aria-hidden', 'true');
      if (!GA.isOverlayOpen()) { GA.lenis.start(); document.body.classList.remove('lock'); }
    } });
  }
  window.GA_closePage = closePage;
  $('#pageClose').addEventListener('click', closePage);

  // one click handler for every [data-go] (cards, chips) and product-modal buttons
  document.addEventListener('click', e => {
    const lb = e.target.closest('[data-lb]');
    if (lb && body.contains(lb)) { openLb(lbList.findIndex(x => x[0] === lb.dataset.lb)); return; }
    const m = e.target.closest('[data-modal]');
    if (m) { GA.openModal(m.dataset.modal, [m.dataset.modal]); return; }
    const go = e.target.closest('[data-go]');
    if (!go || e.target.closest('video, .vplay')) return;
    openPage(go.dataset.go, go.dataset.id);
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'); let lbi = 0;
  function openLb(i) {
    if (i < 0) return; lbi = i; setLb();
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
  }
  function setLb() {
    const [src, cap] = lbList[lbi]; $('#lbImg').src = src; $('#lbCap').textContent = cap || '';
    gsap.fromTo('#lbImg', { scale: .94, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: 'power3.out' });
  }
  const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); };
  const stepLb = d => { lbi = (lbi + d + lbList.length) % lbList.length; setLb(); };
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbNext').addEventListener('click', () => stepLb(1));
  $('#lbPrev').addEventListener('click', () => stepLb(-1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  let tx = null;
  lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) stepLb(d < 0 ? 1 : -1); tx = null; });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') stepLb(1);
    if (e.key === 'ArrowRight') stepLb(-1);
  }, true);

  /* ---------- deep links: #event-…, #crop-…, #product-… ---------- */
  const fromHash = () => {
    const m = location.hash.match(/^#(event|crop|product)-(.+)$/);
    if (m) { showTab(m[1] === 'event' ? 'events' : m[1] === 'crop' ? 'crops' : 'products', true); openPage(m[1], decodeURIComponent(m[2]), false); }
  };
  addEventListener('hashchange', fromHash);
  const waitEnter = setInterval(() => { if (!document.getElementById('gate')) { clearInterval(waitEnter); fromHash(); } }, 200);

  /* ---------- team ---------- */
  const tv = $('#teamVideo');
  // the script of "في كل مكان" — start times (s) in assets/team/our-team.mp4
  const LINES = [[1.6, 'من المنيا بنقولكم إحنا جرين ابل للاستثمار الزراعي'], [5.08, 'من الصعيد.. عشر سنين وإحنا أصل الحكاية'],
    [8.88, 'من بني سويف.. عشر سنين ومكملين'], [12.12, 'وما وقفناش في الطريق'], [15.74, 'وواجهنا كل التحديات'],
    [18.04, 'وحوّلناها لفرص نجاح'], [19.9, 'بالعلم طوّرنا حلول تصنع الفارق'], [22.72, 'وصلنا لكل مزارع بيدوّر على الأفضل'],
    [25.86, 'كبرنا مع كل أرض زرعناها'], [28.26, 'في كل مكان.. جرين ابل موجودة']];
  $('#teamScript').innerHTML = LINES.map(([t, l], i) => `<li><button data-t="${t}">${l}</button></li>`).join('');
  const lis = $$('#teamScript li');
  if (tv) {
    wireVideos($('.team-video'));
    tv.addEventListener('timeupdate', () => {
      let k = -1; LINES.forEach(([t], i) => { if (tv.currentTime >= t - .1) k = i; });
      lis.forEach((li, i) => li.classList.toggle('on', i === k));
    });
    $$('#teamScript button').forEach(b => b.addEventListener('click', () => {
      const t = +b.dataset.t;
      if (tv.readyState >= 1) tv.currentTime = t;
      else tv.addEventListener('loadedmetadata', () => { tv.currentTime = t; }, { once: true });
      tv.play().catch(() => {});
    }));
  }
  $('#teamFacts').innerHTML = [['10', 'سنين في الأرض'], ['6', 'وكالات عالمية'], ['60', 'مركب متخصص']].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');

  const strip = Array.from({ length: 14 }, (_, i) => `<img src="assets/team/t${String(i + 1).padStart(2, '0')}.webp" alt="" loading="lazy" decoding="async">`).join('');
  $('#teamStrip').innerHTML = strip + strip;   // doubled for a seamless loop

  /* ---------- reveal ---------- */
  gsap.from('.field-lead, .field-stats > div, .ftabs', { y: 30, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '.field-lead', start: 'top 88%' } });
  gsap.from('.team-video', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.team', start: 'top 80%' } });
  showTab('events', true);
  GA.hoverables(document); setTimeout(moveInk, 300);
})();
