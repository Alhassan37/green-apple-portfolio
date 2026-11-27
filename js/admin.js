/* Green Apple admin: edit data/*.js and upload media, publish as ONE commit through the GitHub API. */
(() => {
  const REPO = { owner: 'Alhassan37', name: 'green-apple-portfolio', branch: 'main' };
  const API = 'https://api.github.com';
  const FILES = {   // data file -> global name
    site: 'SITE', events: 'EVENTS', trials: 'TRIALS', testimonials: 'TESTIMONIALS',
    crops: 'CROPS', products: 'PRODUCTS', agencies: 'AGENCIES', needs: 'NEEDS'
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = p => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  let token = '', data = {}, original = {}, uploads = {};   // uploads: path -> { b64, url (preview), size }
  const changed = new Set();

  /* ---------------- GitHub API ---------------- */
  async function gh(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    if (!res.ok) {
      let msg = res.status + ''; try { msg = (await res.json()).message || msg; } catch (e) {}
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const repoPath = `/repos/${REPO.owner}/${REPO.name}`;
  const b64ToText = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0)));
  const textToB64 = txt => { const bytes = new TextEncoder().encode(txt); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  let readFile = async function (path) {
    const f = await gh(`${repoPath}/contents/${path}?ref=${REPO.branch}&t=${Date.now()}`);
    return b64ToText(f.content);
  };
  const unwrap = (txt, name) => JSON.parse(txt.slice(txt.lastIndexOf(`window.${name} = `) +`window.${name} = `.length).trim().replace(/;\s*$/, ''));
  const wrap = (name, val) => `/* edited from /admin — keep the format: window.${name} = <JSON>; */\nwindow.${name} = ${JSON.stringify(val, null, 1)};\n`;

  /* one commit with every changed file */
  async function commitFiles(files, message) {
    const ref = await gh(`${repoPath}/git/ref/heads/${REPO.branch}`);
    const head = await gh(`${repoPath}/git/commits/${ref.object.sha}`);
    const tree = [];
    let n = 0;
    for (const f of files) {
      progress(`برفع الملفات… ${++n}/${files.length}`);
      const blob = await gh(`${repoPath}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: f.b64, encoding: 'base64' }) });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const t = await gh(`${repoPath}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
    const c = await gh(`${repoPath}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [ref.object.sha] }) });
    await gh(`${repoPath}/git/refs/heads/${REPO.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return c.sha;
  }

  /* ---------------- login ---------------- */
  async function login(t, remember) {
    token = t.trim();
    const repo = await gh(repoPath);
    if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error('المفتاح ده مالوش صلاحية تعديل على الموقع (Contents: Read and write).'), { status: 403 });
    try { (remember ? localStorage : sessionStorage).setItem('ga-admin-token', token); } catch (e) {}
    await loadAll();
    $('#login').hidden = true; $('#app').hidden = false;
    renderTabs(); show(current);
  }
  async function loadAll() {
    progress('بحمّل محتوى الموقع…');
    const entries = await Promise.all(Object.entries(FILES).map(async ([f, name]) => [f, unwrap(await readFile(`data/${f}.js`), name)]));
    original = Object.fromEntries(entries); data = clone(original);
    // restore an unpublished draft from this browser
    try {
      const d = JSON.parse(localStorage.getItem('ga-admin-draft') || 'null');
      if (d && d.files && confirm('فيه تعديلات ما اتنشرتش من المرة اللي فاتت. ترجّعها؟')) {
        Object.entries(d.files).forEach(([f, v]) => { data[f] = v; changed.add(f); });
        uploads = d.uploads || {};
      }
    } catch (e) {}
    toastHide(); updateStatus();
  }
  $('#loginBtn').addEventListener('click', async () => {
    const t = $('#token').value; if (!t.trim()) return;
    $('#loginErr').hidden = true; $('#loginBtn').disabled = true;
    try { await login(t, $('#remember').checked); }
    catch (e) {
      $('#loginErr').hidden = false;
      $('#loginErr').textContent = e.status === 401 ? 'المفتاح غلط أو منتهي. اعمل مفتاح جديد.' : e.status === 404 ? 'المفتاح مش مسموح له بالموقع ده. اختار green-apple-portfolio وانت بتعمله.' : 'مقدرتش أدخل: ' + e.message;
      toastHide();
    }
    $('#loginBtn').disabled = false;
  });
  $('#token').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });
  $('#logoutBtn').addEventListener('click', () => {
    if (changed.size && !confirm('فيه تعديلات ما اتنشرتش. تخرج برضه؟')) return;
    try { localStorage.removeItem('ga-admin-token'); sessionStorage.removeItem('ga-admin-token'); } catch (e) {}
    location.reload();
  });

  /* ---------------- sections ---------------- */
  const cropName = id => (data.crops.find(c => c.id === id) || {}).ar || '';
  const prodName = id => (data.products.find(p => p.id === id) || {}).en || '';
  const agName = id => (data.agencies.find(a => a.id === id) || {}).name || '';
  const SECTIONS = {
    events: {
      title: 'الإيفنتات', file: 'events', hint: 'المعارض والرحلات والمؤتمرات. بتظهر في «من الأرض» مترتبة بالتاريخ.',
      thumb: x => x.cover, line1: x => x.title, line2: x => `${x.dateLabel || x.start || ''} · ${x.place || ''}`,
      blank: () => ({ id: uid('event'), title: '', start: '', end: '', dateLabel: '', place: '', partner: '', cover: '', summary: '', body: [], highlights: [], gallery: [] }),
      fields: () => [
        { k: 'title', label: 'اسم الإيفنت', type: 'text', req: true },
        { row: [{ k: 'start', label: 'تاريخ البداية', type: 'date', req: true }, { k: 'end', label: 'تاريخ النهاية', type: 'date', help: 'سيبه فاضي لو يوم واحد' }] },
        { k: 'dateLabel', label: 'التاريخ زي ما يظهر على الموقع', type: 'text', help: 'سيبه فاضي ويتكتب لوحده (مثلًا «22 – 24 سبتمبر 2026»)' },
        { k: 'place', label: 'المكان', type: 'text' },
        { k: 'partner', label: 'مع وكالة (اختياري)', type: 'select', options: () => [['', '— مفيش —'], ...data.agencies.map(a => [a.id, a.name])] },
        { k: 'summary', label: 'وصف قصير (بيظهر في الكارت)', type: 'textarea', req: true },
        { k: 'body', label: 'التفاصيل', type: 'paragraphs', help: 'كل فقرة سيب بينها وبين اللي بعدها سطر فاضي' },
        { k: 'highlights', label: 'أبرز النقط', type: 'lines', help: 'كل نقطة في سطر' },
        { k: 'cover', label: 'صورة الغلاف', type: 'image', folder: 'events' },
        { k: 'gallery', label: 'صور الإيفنت', type: 'images', folder: 'events' },
        { k: 'video', label: 'فيديو (من آراء العملاء)', type: 'select', options: () => [['', '— مفيش —'], ...data.testimonials.map(v => [v.id, v.who || v.id])] }
      ]
    },
    trials: {
      title: 'التجارب', file: 'trials', hint: 'نتايج المركبات في الأرض. كل تجربة بتظهر في صفحة المحصول وصفحة المركب.',
      thumb: x => x.images && x.images[0] && x.images[0][0], line1: x => x.title, line2: x => [cropName(x.crop), prodName(x.product), x.date].filter(Boolean).join(' · '),
      blank: () => ({ id: uid('trial'), title: '', crop: '', product: '', date: '', text: '', points: [], images: [] }),
      fields: () => [
        { k: 'title', label: 'عنوان التجربة', type: 'text', req: true },
        { row: [{ k: 'crop', label: 'المحصول', type: 'select', options: () => [['', '— اختار —'], ...data.crops.map(c => [c.id, c.ar])] },
                { k: 'product', label: 'المركب', type: 'select', options: () => [['', '— مفيش / مش معروف —'], ...data.products.map(p => [p.id, `${p.en} — ${p.ar}`])] }] },
        { k: 'date', label: 'التاريخ', type: 'text', help: 'بالشكل ده: 2026-09-04 أو 2026-09 أو 2026', ltr: true },
        { k: 'text', label: 'وصف التجربة والنتيجة', type: 'textarea', req: true, tall: true },
        { k: 'points', label: 'نقط مختصرة', type: 'lines', help: 'كل نقطة في سطر (مثلًا: يونايت 0.5 لتر/فدان)' },
        { k: 'images', label: 'الصور (مع تعليق تحت كل صورة)', type: 'images', captions: true, folder: 'trials' },
        { k: 'testimonial', label: 'فيديو رأي عميل مرتبط (اختياري)', type: 'select', options: () => [['', '— مفيش —'], ...data.testimonials.map(v => [v.id, v.who || v.id])] }
      ]
    },
    testimonials: {
      title: 'آراء العملاء', file: 'testimonials', hint: 'فيديوهات العملاء. ارفع فيديو MP4 (يفضل أقل من 25 ميجا)، والصورة بتتعمل لوحدها من الفيديو.',
      thumb: x => `assets/field/videos/${x.id}.webp`, line1: x => x.who || '(من غير اسم)', line2: x => [cropName(x.crop), (x.products || []).map(prodName).join('، ')].filter(Boolean).join(' · '),
      blank: () => ({ id: uid('voice'), crop: '', products: [], who: '', where: '', quote: '' }),
      fields: () => [
        { k: 'who', label: 'مين اللي بيتكلم', type: 'text', req: true, help: 'مثلًا: هشام السيد — مزرعة يوسفي' },
        { k: 'where', label: 'مكان / تفاصيل (اختياري)', type: 'text' },
        { k: 'quote', label: 'جملة من كلامه', type: 'textarea', help: 'بتظهر تحت الفيديو بين «»' },
        { k: 'crop', label: 'المحصول', type: 'select', options: () => [['', '— مفيش —'], ...data.crops.map(c => [c.id, c.ar])] },
        { k: 'products', label: 'المركبات اللي اتكلم عنها', type: 'multi', options: () => data.products.map(p => [p.id, p.en]) },
        { k: '_video', label: 'الفيديو', type: 'video' }
      ]
    },
    crops: {
      title: 'المحاصيل', file: 'crops', hint: 'قايمة المحاصيل اللي بتتربط بيها التجارب وآراء العملاء.',
      thumb: x => { const t = data.trials.find(t => t.crop === x.id && t.images && t.images.length); return t ? t.images[0][0] : ''; },
      line1: x => `${x.ar} · ${x.en}`, line2: x => `${data.trials.filter(t => t.crop === x.id).length} تجربة`,
      blank: () => ({ id: '', ar: '', en: '', intro: '' }),
      fields: () => [
        { row: [{ k: 'ar', label: 'الاسم بالعربي', type: 'text', req: true }, { k: 'en', label: 'الاسم بالإنجليزي', type: 'text', ltr: true, req: true }] },
        { k: 'intro', label: 'مقدمة عن المحصول', type: 'textarea' }
      ],
      beforeSave: x => { if (!x.id) x.id = slug(x.en) || uid('crop'); }
    },
    products: {
      title: 'المركبات', file: 'products', hint: 'الـ 60 مركب: الاسم والتركيبة والصورة. صورة العبوة يفضّل تكون على خلفية بيضا.', filter: true,
      thumb: x => x.img, thumbWhite: true, line1: x => `${x.en} — ${x.ar}`, line2: x => `${agName(x.a)} · ${x.t || ''}`,
      blank: () => ({ id: '', a: data.agencies[0].id, en: '', ar: '', t: '', c: [], img: '', comp: [], chips: [] }),
      fields: () => [
        { row: [{ k: 'en', label: 'الاسم بالإنجليزي', type: 'text', ltr: true, req: true }, { k: 'ar', label: 'الاسم بالعربي', type: 'text', req: true }] },
        { k: 'a', label: 'الوكالة', type: 'select', options: () => data.agencies.map(a => [a.id, a.name]) },
        { k: 't', label: 'وصف قصير', type: 'textarea' },
        { k: 'c', label: 'بيحل إيه؟ (الاحتياجات)', type: 'multi', options: () => data.needs.map(n => [n.id, n.ar]) },
        { k: 'comp', label: 'التركيبة بالنسب', type: 'comp', help: 'العنصر والنسبة %. لو مفيش نسب سيبها فاضية واكتب المكونات تحت.' },
        { k: 'chips', label: 'المكونات (لو مفيش نسب)', type: 'lines' },
        { k: 'img', label: 'صورة العبوة', type: 'image', folder: 'products', white: true }
      ],
      beforeSave: x => { if (!x.id) x.id = slug(x.en) || uid('product'); }
    },
    agencies: {
      title: 'الوكالات', file: 'agencies', hint: 'بيانات كل وكالة ولونها في الموقع.',
      thumb: () => '', swatch: x => x.color, line1: x => `${x.name} — ${x.ar}`, line2: x => `${data.products.filter(p => p.a === x.id).length} مركب · ${x.short || ''}`,
      blank: () => ({ id: '', name: '', ar: '', color: '#9BE15D', color2: '#2E7D32', origin: '', short: '', desc: '', focus: [] }),
      fields: () => [
        { row: [{ k: 'name', label: 'الاسم بالإنجليزي', type: 'text', ltr: true, req: true }, { k: 'ar', label: 'الاسم بالعربي', type: 'text', req: true }] },
        { row: [{ k: 'color', label: 'اللون الأساسي', type: 'color' }, { k: 'color2', label: 'اللون الغامق', type: 'color' }] },
        { k: 'origin', label: 'سطر صغير فوق الاسم', type: 'text', help: 'مثلًا: إسبانيا · Advanced Agro' },
        { k: 'short', label: 'وصف قصير', type: 'text' },
        { k: 'desc', label: 'وصف البروفايل', type: 'textarea' },
        { k: 'focus', label: 'مجالات التخصص', type: 'lines' }
      ],
      beforeSave: x => { if (!x.id) x.id = slug(x.name) || uid('agency'); }
    },
    site: { title: 'نصوص الموقع', file: 'site', hint: 'العناوين والأرقام وأرقام التليفون. اللي بتكتبه هنا بيظهر مكانه على الموقع.' }
  };
  const ORDER = ['events', 'trials', 'testimonials', 'crops', 'products', 'agencies', 'site'];
  let current = 'events';

  function renderTabs() {
    $('#tabs').innerHTML = ORDER.map(k => {
      const n = k === 'site' ? '' : `<b>${data[SECTIONS[k].file].length}</b>`;
      return `<button class="tab ${k === current ? 'active' : ''}" data-k="${k}">${SECTIONS[k].title}${n}</button>`;
    }).join('');
    $$('.tab').forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
  }
  const media = p => !p ? '' : (uploads[p] ? uploads[p].url : p);

  function show(k) {
    current = k; renderTabs();
    const S = SECTIONS[k];
    $('#secTitle').textContent = S.title; $('#secHint').textContent = S.hint;
    $('#filter').hidden = !S.filter; $('#addBtn').hidden = k === 'site';
    $('#list').hidden = k === 'site'; $('#siteForm').hidden = k !== 'site';
    if (k === 'site') return renderSite();
    renderList();
  }
  function renderList() {
    const S = SECTIONS[current], arr = data[S.file], q = $('#filter').value.trim().toLowerCase();
    const items = arr.map((x, i) => [x, i]).filter(([x]) => !q || JSON.stringify(x).toLowerCase().includes(q));
    $('#list').innerHTML = items.length ? items.map(([x, i]) => {
      const th = S.swatch ? `<div class="thumb" style="background:${esc(S.swatch(x))}"></div>`
        : (S.thumb(x) ? `<img class="thumb ${S.thumbWhite ? 'white' : ''}" src="${esc(media(S.thumb(x)))}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb',textContent:'🖼'}))">` : '<div class="thumb">🖼</div>');
      const dirty = JSON.stringify(x) !== JSON.stringify((original[S.file] || []).find(o => o.id === x.id));
      return `<div class="row ${dirty ? 'changed' : ''}">${th}<div><h4>${esc(S.line1(x))}</h4><p>${esc(S.line2(x))}</p></div>
        <div class="row-actions"><button class="btn sm" data-up="${i}" title="لفوق">↑</button><button class="btn sm" data-down="${i}" title="لتحت">↓</button><button class="btn sm primary" data-edit="${i}">تعديل</button></div></div>`;
    }).join('') : '<p class="empty">مفيش حاجة هنا لسه — اضغط «+ إضافة».</p>';
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(+b.dataset.edit)));
    $$('[data-up]').forEach(b => b.addEventListener('click', () => move(+b.dataset.up, -1)));
    $$('[data-down]').forEach(b => b.addEventListener('click', () => move(+b.dataset.down, 1)));
  }
  $('#filter').addEventListener('input', renderList);
  function move(i, d) {
    const arr = data[SECTIONS[current].file], j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; markChanged(SECTIONS[current].file); renderList();
  }
  $('#addBtn').addEventListener('click', () => openEditor(-1));

  /* ---------------- editor ---------------- */
  let edIndex = -1, edItem = null, edPending = {};   // edPending: uploads created while this form is open
  function openEditor(i) {
    const S = SECTIONS[current];
    edIndex = i; edItem = i < 0 ? S.blank() : clone(data[S.file][i]); edPending = {};
    $('#edTitle').textContent = i < 0 ? `إضافة — ${S.title}` : `تعديل — ${S.line1(edItem)}`;
    $('#edDelete').hidden = i < 0;
    $('#edForm').innerHTML = S.fields().map(f => f.row ? `<div class="grid2">${f.row.map(fieldHTML).join('')}</div>` : fieldHTML(f)).join('');
    wireForm($('#edForm'), edItem, S.fields().flatMap(f => f.row || [f]));
    $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
    setTimeout(() => { const first = $('#edForm input, #edForm textarea'); first && first.focus(); }, 250);
  }
  function closeEditor(discard) {
    if (discard) Object.keys(edPending).forEach(p => delete uploads[p]);
    $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true');
  }
  $('#edClose').addEventListener('click', () => closeEditor(true));
  $('#edCancel').addEventListener('click', () => closeEditor(true));
  $('#drawer').addEventListener('click', e => { if (e.target.id === 'drawer') closeEditor(true); });
  $('#edSave').addEventListener('click', () => {
    const S = SECTIONS[current];
    readForm($('#edForm'), edItem, S.fields().flatMap(f => f.row || [f]));
    const missing = S.fields().flatMap(f => f.row || [f]).filter(f => f.req && !String(edItem[f.k] ?? '').trim());
    if (missing.length) { toast('اكتب: ' + missing.map(f => f.label).join('، '), true, 3500); return; }
    if (S.file === 'events') finishEvent(edItem);
    if (S.beforeSave) S.beforeSave(edItem);
    const arr = data[S.file];
    if (edIndex < 0 && arr.some(o => o.id === edItem.id)) edItem.id += '-' + Math.random().toString(36).slice(2, 5);
    if (edIndex < 0) arr.unshift(edItem); else arr[edIndex] = edItem;
    markChanged(S.file); closeEditor(false); renderList(); toast('اتحفظ في المسودة ✓ — اضغط «احفظ وانشر» لما تخلص', false, 2600);
  });
  $('#edDelete').addEventListener('click', () => {
    const S = SECTIONS[current], x = data[S.file][edIndex];
    const used = current === 'crops' ? data.trials.filter(t => t.crop === x.id).length
      : current === 'products' ? data.trials.filter(t => t.product === x.id).length
      : current === 'agencies' ? data.products.filter(p => p.a === x.id).length : 0;
    if (used && !confirm(`فيه ${used} حاجة مربوطة بده. تمسحه برضه؟`)) return;
    if (!used && !confirm('تمسح ده؟')) return;
    data[S.file].splice(edIndex, 1); markChanged(S.file); closeEditor(true); renderList(); renderTabs();
  });

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  function finishEvent(e) {
    if (!e.end) e.end = e.start;
    if (!e.dateLabel && e.start) {
      const [y1, m1, d1] = e.start.split('-').map(Number), [y2, m2, d2] = e.end.split('-').map(Number);
      e.dateLabel = e.start === e.end ? `${d1} ${MONTHS[m1 - 1]} ${y1}`
        : (y1 === y2 && m1 === m2) ? `${d1} – ${d2} ${MONTHS[m1 - 1]} ${y1}`
        : `${d1} ${MONTHS[m1 - 1]}${y1 !== y2 ? ' ' + y1 : ''} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
    }
    if (!e.cover && e.gallery && e.gallery.length) e.cover = e.gallery[0];
    if (!e.partner) delete e.partner;
    if (!e.video) delete e.video;
  }

  /* field rendering */
  function fieldHTML(f) {
    const id = 'f-' + f.k, help = f.help ? `<small>${esc(f.help)}</small>` : '', req = f.req ? ' *' : '';
    const lab = `<span>${esc(f.label)}${req}</span>`;
    switch (f.type) {
      case 'text': return `<label class="fld">${lab}<input type="text" id="${id}" class="${f.ltr ? 'ltr' : ''}">${help}</label>`;
      case 'date': return `<label class="fld">${lab}<input type="date" id="${id}">${help}</label>`;
      case 'color': return `<label class="fld">${lab}<input type="color" id="${id}">${help}</label>`;
      case 'textarea': return `<label class="fld">${lab}<textarea id="${id}" class="${f.tall ? 'tall' : ''}"></textarea>${help}</label>`;
      case 'lines': case 'paragraphs': return `<label class="fld">${lab}<textarea id="${id}" class="tall"></textarea>${help}</label>`;
      case 'select': return `<label class="fld">${lab}<select id="${id}">${f.options().map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>${help}</label>`;
      case 'multi': return `<div class="fld">${lab}<div class="chips" id="${id}">${f.options().map(([v, t]) => `<label><input type="checkbox" value="${esc(v)}">${esc(t)}</label>`).join('')}</div>${help}</div>`;
      case 'comp': return `<div class="fld">${lab}<div class="comp" id="${id}"></div><button type="button" class="btn sm" data-addcomp="${id}">+ عنصر</button>${help}</div>`;
      case 'image': case 'images': return `<div class="fld">${lab}<div class="media" id="${id}"></div>${help}</div>`;
      case 'video': return `<div class="fld">${lab}<div class="media" id="${id}"></div><small>MP4 من الموبايل أو الكمبيوتر. لو الفيديو كبير قوي (أكتر من 40 ميجا) قصّره أو اضغطه الأول.</small></div>`;
    }
    return '';
  }
  function wireForm(form, item, fields) {
    fields.forEach(f => {
      const el = $('#f-' + f.k, form); if (!el) return;
      const v = item[f.k];
      if (['text', 'date', 'textarea', 'select'].includes(f.type)) el.value = v ?? '';
      if (f.type === 'color') el.value = v || '#9BE15D';
      if (f.type === 'lines') el.value = (v || []).join('\n');
      if (f.type === 'paragraphs') el.value = (v || []).join('\n\n');
      if (f.type === 'multi') $$('input', el).forEach(c => c.checked = (v || []).includes(c.value));
      if (f.type === 'comp') { renderComp(el, v || []); $(`[data-addcomp="${el.id}"]`, form).addEventListener('click', () => { const rows = readComp(el); rows.push(['', '']); renderComp(el, rows); }); }
      if (f.type === 'image') renderImages(el, f, item, true);
      if (f.type === 'images') renderImages(el, f, item, false);
      if (f.type === 'video') renderVideo(el, item);
    });
  }
  function readForm(form, item, fields) {
    fields.forEach(f => {
      const el = $('#f-' + f.k, form); if (!el) return;
      if (['text', 'date', 'textarea', 'select', 'color'].includes(f.type)) item[f.k] = el.value.trim();
      if (f.type === 'lines') item[f.k] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      if (f.type === 'paragraphs') item[f.k] = el.value.split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
      if (f.type === 'multi') item[f.k] = $$('input:checked', el).map(c => c.value);
      if (f.type === 'comp') item[f.k] = readComp(el).filter(r => r[0] && r[1] !== '').map(r => [r[0], +r[1]]);
      if (f.type === 'images' && f.captions) item[f.k] = $$('.mitem', el).map(m => [m.dataset.path, $('input', m).value.trim()]);
    });
    if (item.crop === '') item.crop = null;
    if (item.product === '') item.product = null;
    if (item.testimonial === '') delete item.testimonial;
  }
  function renderComp(el, rows) {
    el.innerHTML = rows.map(([k, v]) => `<div class="comp-row"><input type="text" value="${esc(k)}" placeholder="العنصر (مثلًا: بوتاسيوم K₂O)"><input type="number" step="0.01" value="${esc(v)}" placeholder="%" class="ltr"><button type="button" class="btn sm" title="مسح">✕</button></div>`).join('');
    $$('.comp-row button', el).forEach((b, i) => b.addEventListener('click', () => { const r = readComp(el); r.splice(i, 1); renderComp(el, r); }));
  }
  const readComp = el => $$('.comp-row', el).map(r => [$$('input', r)[0].value.trim(), $$('input', r)[1].value.trim()]);

  /* images: single (path string) or list (paths, or [path, caption] when captions) */
  function renderImages(el, f, item, single) {
    const list = single ? (item[f.k] ? [item[f.k]] : []) : (item[f.k] || []);
    const pathOf = x => Array.isArray(x) ? x[0] : x, capOf = x => Array.isArray(x) ? x[1] : '';
    el.innerHTML = `<div class="media-grid">${list.map((x, i) => `<div class="mitem ${f.white ? 'white' : ''}" data-path="${esc(pathOf(x))}">
        <img src="${esc(media(pathOf(x)))}" alt="">${f.captions ? `<input type="text" value="${esc(capOf(x))}" placeholder="تعليق (قبل / بعد…)">` : ''}
        <div class="mbar">${single ? '' : `<button type="button" data-mv="-1" title="قبل">→</button><button type="button" data-mv="1" title="بعد">←</button>`}<button type="button" data-rm title="مسح">🗑</button></div></div>`).join('')}
      <label class="upload">📷 ${single ? (list.length ? 'غيّر الصورة' : 'ارفع صورة') : 'ارفع صور'}<small>من الجهاز أو الموبايل</small><input type="file" accept="image/*" ${single ? '' : 'multiple'}></label></div>`;
    const sync = () => {   // keep captions typed so far
      if (!single && f.captions) item[f.k] = $$('.mitem', el).map(m => [m.dataset.path, $('input', m).value.trim()]);
    };
    $$('.mitem', el).forEach((m, i) => {
      const rm = $('[data-rm]', m); rm && rm.addEventListener('click', () => { sync(); if (single) item[f.k] = ''; else item[f.k].splice(i, 1); renderImages(el, f, item, single); });
      $$('[data-mv]', m).forEach(b => b.addEventListener('click', () => {
        sync(); const j = i + +b.dataset.mv, arr = item[f.k]; if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]]; renderImages(el, f, item, single);
      }));
    });
    const input = $('input[type=file]', el), drop = $('.upload', el);
    const take = async files => {
      sync();
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        toast(`بجهّز الصورة ${file.name}…`, false, 0, true);
        try {
          const max = f.folder === 'products' ? 640 : 1400;
          const { b64, url } = await toWebp(file, max);
          const path = `assets/uploads/${f.folder}/${new Date().toISOString().slice(0, 7)}/${slug(file.name.replace(/\.[^.]+$/, '')) || 'img'}-${Math.random().toString(36).slice(2, 7)}.webp`;
          uploads[path] = { b64, url, size: b64.length * .75 }; edPending[path] = 1;
          if (single) item[f.k] = path; else (item[f.k] = item[f.k] || []).push(f.captions ? [path, ''] : path);
        } catch (e) { toast('الصورة دي مش مدعومة: ' + file.name, true, 3500); }
      }
      toastHide(); renderImages(el, f, item, single);
    };
    input.addEventListener('change', () => take([...input.files]));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); take([...e.dataTransfer.files]); });
  }
  /* resize + convert to WebP in the browser */
  async function toWebp(file, max) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
    let src = bmp;
    if (!src) { src = new Image(); src.src = URL.createObjectURL(file); await src.decode(); }
    const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/webp', .8);
    if (!url.startsWith('data:image/webp')) throw new Error('webp');
    return { b64: url.split(',')[1], url };
  }

  /* testimonial video: fixed paths assets/field/videos/<id>.mp4 + .webp poster */
  function renderVideo(el, item) {
    const vp = `assets/field/videos/${item.id}.mp4`, pp = `assets/field/videos/${item.id}.webp`;
    const has = uploads[vp] || (original.testimonials || []).some(t => t.id === item.id);
    el.innerHTML = `<div class="media-grid">${has ? `<div class="mitem"><video src="${esc(uploads[vp] ? uploads[vp].url : vp)}" poster="${esc(media(pp))}" controls preload="metadata" playsinline></video></div>` : ''}
      <label class="upload">🎬 ${has ? 'غيّر الفيديو' : 'ارفع الفيديو'}<small>MP4</small><input type="file" accept="video/mp4,video/quicktime,video/*"></label></div>`;
    const input = $('input[type=file]', el);
    input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      const mb = file.size / 1048576;
      if (mb > 90) { toast(`الفيديو ${mb.toFixed(0)} ميجا — أكبر من المسموح (90). قصّره أو اضغطه الأول.`, true, 5000); return; }
      if (mb > 40 && !confirm(`الفيديو ${mb.toFixed(0)} ميجا — هيتقل على الموقع. تكمل برضه؟`)) return;
      toast('بجهّز الفيديو…', false, 0, true);
      const url = URL.createObjectURL(file);
      const b64 = await fileToB64(file);
      uploads[vp] = { b64, url, size: file.size }; edPending[vp] = 1;
      try { const poster = await videoPoster(url); uploads[pp] = { b64: poster.split(',')[1], url: poster, size: poster.length * .75 }; edPending[pp] = 1; } catch (e) {}
      toastHide(); renderVideo(el, item);
    });
  }
  const fileToB64 = file => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file); });
  function videoPoster(url) {
    return new Promise((ok, no) => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      v.addEventListener('loadeddata', () => { v.currentTime = Math.min(2, (v.duration || 4) / 3); }, { once: true });
      v.addEventListener('seeked', () => {
        const k = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); ok(c.toDataURL('image/webp', .78));
      }, { once: true });
      v.addEventListener('error', no, { once: true });
      setTimeout(() => no(new Error('timeout')), 15000);
    });
  }

  /* ---------------- site texts ---------------- */
  const SITE_FORM = [
    ['الواجهة', [['hero.eyebrow', 'السطر الصغير فوق العنوان', 'text', true], ['hero.line1', 'العنوان — السطر الأول'], ['hero.line2', 'العنوان — السطر التاني (الأخضر)'], ['hero.sub', 'الجملة تحت العنوان', 'textarea'], ['hero.btn1', 'زرار 1'], ['hero.btn2', 'زرار 2']]],
    ['الأرقام', 'stats'],
    ['مين إحنا', [['about.label', 'اسم القسم'], ['about.manifesto', 'الفقرة الكبيرة', 'textarea'], ['pillars.0.title', 'ميزة 1 — العنوان'], ['pillars.0.text', 'ميزة 1 — الوصف'], ['pillars.1.title', 'ميزة 2 — العنوان'], ['pillars.1.text', 'ميزة 2 — الوصف'], ['pillars.2.title', 'ميزة 3 — العنوان'], ['pillars.2.text', 'ميزة 3 — الوصف']]],
    ['عناوين الأقسام', [['agencies.title1', 'الوكالات — العنوان'], ['agencies.title2', 'الوكالات — السطر الرمادي'], ['agencies.hint', 'الوكالات — الإرشاد'], ['needs.title1', 'الاحتياجات — العنوان'], ['needs.title2', 'الاحتياجات — السطر الرمادي'], ['explorer.title1', 'المركبات — العنوان'], ['explorer.title2', 'المركبات — السطر الرمادي'], ['field.title1', 'من الأرض — العنوان'], ['field.title2', 'من الأرض — السطر الرمادي'], ['field.lead', 'من الأرض — المقدمة', 'textarea'], ['team.title1', 'فريقنا — العنوان'], ['team.title2', 'فريقنا — السطر الرمادي'], ['team.text', 'فريقنا — الكلام', 'textarea'], ['team.groupCaption', 'تعليق صورة الفريق']]],
    ['التواصل', [['contact.eyebrow', 'السطر الصغير'], ['contact.title1', 'العنوان الكبير — سطر 1'], ['contact.title2', 'العنوان الكبير — سطر 2'], ['contact.whatsappLabel', 'كلام زرار الواتساب'], ['contact.whatsapp', 'رقم الواتساب بكود الدولة (مثلًا 201023653671)', 'text', true], ['contact.phones', 'أرقام التليفون (كل رقم في سطر)', 'lines'], ['contact.website', 'الموقع', 'text', true], ['footer.left', 'الفوتر — يسار', 'text', true], ['footer.right', 'الفوتر — يمين']]]
  ];
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
  function renderSite() {
    const S = data.site;
    $('#siteForm').innerHTML = SITE_FORM.map(([title, fields]) => fields === 'stats'
      ? `<div class="group"><h3>${title}</h3><p class="muted">الأرقام اللي بتعد في أول الموقع.</p>${(S.stats || []).map((s, i) => `<div class="grid2"><label class="fld"><span>الرقم ${i + 1}</span><input type="number" data-stat="${i}" data-f="n" value="${esc(s.n)}" class="ltr"></label><label class="fld"><span>الكلام تحته</span><input type="text" data-stat="${i}" data-f="label" value="${esc(s.label)}"></label></div>`).join('')}</div>`
      : `<div class="group"><h3>${title}</h3>${fields.map(([p, label, type, ltr]) => {
          const v = getP(S, p);
          if (type === 'textarea') return `<label class="fld"><span>${esc(label)}</span><textarea data-p="${p}">${esc(v)}</textarea></label>`;
          if (type === 'lines') return `<label class="fld"><span>${esc(label)}</span><textarea data-p="${p}" data-lines class="ltr">${esc((v || []).join('\n'))}</textarea></label>`;
          return `<label class="fld"><span>${esc(label)}</span><input type="text" data-p="${p}" value="${esc(v)}" class="${ltr ? 'ltr' : ''}"></label>`;
        }).join('')}</div>`).join('');
    $$('#siteForm [data-p]').forEach(el => el.addEventListener('input', () => {
      setP(data.site, el.dataset.p, el.hasAttribute('data-lines') ? el.value.split('\n').map(s => s.trim()).filter(Boolean) : el.value);
      markChanged('site');
    }));
    $$('#siteForm [data-stat]').forEach(el => el.addEventListener('input', () => {
      const s = data.site.stats[+el.dataset.stat]; s[el.dataset.f] = el.dataset.f === 'n' ? +el.value || 0 : el.value; markChanged('site');
    }));
  }

  /* ---------------- draft / status ---------------- */
  function markChanged(file) {
    if (JSON.stringify(data[file]) === JSON.stringify(original[file])) changed.delete(file); else changed.add(file);
    saveDraft(); updateStatus();
  }
  function saveDraft() {
    try {
      if (!changed.size && !Object.keys(uploads).length) { localStorage.removeItem('ga-admin-draft'); return; }
      const files = Object.fromEntries([...changed].map(f => [f, data[f]]));
      // small images travel with the draft (preview + recovery); videos stay in memory only
      const small = Object.fromEntries(Object.entries(uploads).filter(([p, u]) => !p.endsWith('.mp4') && u.size < 600000).map(([p, u]) => [p, { b64: u.b64, url: u.url, size: u.size }]));
      localStorage.setItem('ga-admin-draft', JSON.stringify({ files, uploads: small, data: Object.fromEntries(Object.entries(FILES).map(([f, g]) => [g, data[f]])) }));
    } catch (e) { /* storage full: draft only in memory */ }
  }
  function updateStatus() {
    const n = changed.size + (Object.keys(uploads).length ? 1 : 0);
    $('#publishBtn').disabled = !n;
    $('#status').textContent = n ? `فيه تعديلات ما اتنشرتش (${[...changed].map(f => SECTIONS[ORDER.find(k => SECTIONS[k].file === f)].title).join('، ')}${Object.keys(uploads).length ? (changed.size ? '، ' : '') + Object.keys(uploads).length + ' ملف جديد' : ''})` : 'كل حاجة منشورة ✓';
    $('#status').classList.toggle('dirty', !!n);
  }
  addEventListener('beforeunload', e => { if (changed.size || Object.keys(uploads).length) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- preview ---------------- */
  $('#previewBtn').addEventListener('click', () => {
    saveDraft();
    try { localStorage.setItem('ga-admin-draft', localStorage.getItem('ga-admin-draft') || JSON.stringify({ data: Object.fromEntries(Object.entries(FILES).map(([f, g]) => [g, data[f]])) })); } catch (e) {}
    window.open('./?preview=1#field', '_blank');
  });

  /* ---------------- publish ---------------- */
  $('#publishBtn').addEventListener('click', async () => {
    if (!confirm('تنشر التعديلات على الموقع دلوقتي؟')) return;
    $('#publishBtn').disabled = true;
    try {
      const v = Date.now().toString(36);
      const files = [...changed].map(f => ({ path: `data/${f}.js`, b64: textToB64(wrap(FILES[f], data[f])) }));
      // only upload media that is still referenced
      const all = JSON.stringify(data);
      Object.entries(uploads).forEach(([p, u]) => {
        const used = all.includes(p) || (p.startsWith('assets/field/videos/') && data.testimonials.some(t => p.includes(`/${t.id}.`)));
        if (used) files.push({ path: p, b64: u.b64 });
      });
      // new version numbers so every visitor gets the fresh data
      progress('بجهّز النشر…');
      const html = (await readFile('index.html')).replace(/(data\/[a-z]+\.js|js\/[a-z]+\.js|css\/style\.css)\?v=[\w]+/g, `$1?v=${v}`);
      const sw = (await readFile('sw.js')).replace(/const VERSION = '[^']*';/, `const VERSION = 'ga-${v}';`);
      files.push({ path: 'index.html', b64: textToB64(html) }, { path: 'sw.js', b64: textToB64(sw) });
      await commitFiles(files, `تحديث المحتوى من لوحة التحكم (${[...changed].join(', ') || 'media'})`);
      original = clone(data); changed.clear(); uploads = {};
      try { localStorage.removeItem('ga-admin-draft'); } catch (e) {}
      updateStatus(); show(current);
      await waitForPages();
    } catch (e) {
      toast('النشر ما كملش: ' + (e.status === 409 ? 'حد عدّل في نفس الوقت، جرّب تاني.' : e.message), true, 8000);
      updateStatus();
    }
  });
  async function waitForPages() {
    progress('اتحفظ ✓ — بيتنشر على الموقع (حوالي دقيقة)…');
    const t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      await new Promise(r => setTimeout(r, 6000));
      try {
        const b = await gh(`${repoPath}/pages/builds/latest`);
        if (b.status === 'built' && new Date(b.updated_at) > new Date(t0 - 5000)) { toast('اتنشر على الموقع ✓ <a href="./" target="_blank" rel="noopener">افتح الموقع</a> (لو شايف القديم اعمل تحديث للصفحة)', false, 12000); return; }
        if (b.status === 'errored') { toast('GitHub ما قدرش ينشر النسخة دي. جرّب تنشر تاني.', true, 8000); return; }
      } catch (e) {   // the key may not be allowed to read the Pages status: just wait a bit
        await new Promise(r => setTimeout(r, 45000));
        toast('اتحفظ ✓ — هيظهر على الموقع خلال دقيقة. <a href="./" target="_blank" rel="noopener">افتح الموقع</a>', false, 12000); return;
      }
    }
    toast('اتحفظ ✓ — هيظهر على الموقع خلال دقيقتين.', false, 8000);
  }

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(html, err = false, ms = 3000, spin = false) {
    const t = $('#toast'); clearTimeout(toastT);
    t.innerHTML = (spin ? '<span class="spin"></span>' : '') + `<span>${html}</span>`;
    t.classList.toggle('err', err); t.hidden = false;
    if (ms) toastT = setTimeout(() => t.hidden = true, ms);
  }
  const progress = msg => toast(esc(msg), false, 0, true);
  const toastHide = () => { clearTimeout(toastT); $('#toast').hidden = true; };

  /* local test mode (only on localhost with ?local): reads the files next to this page, publishing is off */
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('local');
  if (LOCAL) {
    readFile = async path => (await fetch(path + '?t=' + Date.now())).text();
    $('#publishBtn').title = 'وضع التجربة المحلي — النشر مقفول';
  }

  /* ---------------- start ---------------- */
  if (LOCAL) {
    loadAll().then(() => { $('#login').hidden = true; $('#app').hidden = false; renderTabs(); show(current); $('#publishBtn').onclick = e => { e.stopImmediatePropagation(); toast('وضع التجربة: النشر مقفول هنا', true); }; });
    return;
  }
  let saved = null; try { saved = localStorage.getItem('ga-admin-token') || sessionStorage.getItem('ga-admin-token'); } catch (e) {}
  if (saved) login(saved, !!localStorage.getItem('ga-admin-token')).catch(() => { toastHide(); $('#token').value = ''; });
})();
