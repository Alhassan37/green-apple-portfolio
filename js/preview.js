/* Runs after data/*.js and before app.js:
   1) ?preview=1 → show the unpublished draft from the private dashboard (only in this tab)
   2) fill every [data-k] text, the stats, phones and WhatsApp links from window.SITE */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.has('preview')) {
    let stored = null;
    try { stored = sessionStorage.getItem('ga-preview-draft'); } catch (e) {}
    const asker = window.opener || (window.parent !== window ? window.parent : null);
    if (!stored && asker) {
      // ask the dashboard window that opened this tab for its draft, keep it for this tab, reload with it
      window.addEventListener('message', e => {
        if (e.source !== asker || !e.data || e.data.type !== 'ga-draft') return;
        // only the dashboard opened from a file on the computer (origin "null") or a local test server
        if (!(e.origin === 'null' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.origin))) return;
        try { sessionStorage.setItem('ga-preview-draft', JSON.stringify(e.data.draft)); } catch (err) {}
        location.reload();
      });
      asker.postMessage('ga-need-draft', '*');
    }
    try {
      const draft = JSON.parse(stored || 'null');
      if (draft && draft.data) {
        // newly uploaded photos are not on the server yet: show them from the draft
        const up = draft.uploads || {};
        const swap = v => typeof v === 'string' ? (up[v] ? up[v].url : v)
          : Array.isArray(v) ? v.map(swap)
          : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
        Object.entries(draft.data).forEach(([k, v]) => { window[k] = swap(v); });
        const bar = document.createElement('div');
        bar.className = 'preview-bar';
        bar.innerHTML = '👁 معاينة — التعديلات دي لسه ما اتنشرتش. ارجع للوحة التحكم واضغط «احفظ وانشر».';
        document.body.appendChild(bar);
      }
    } catch (e) { /* no draft: show the published site */ }
  }

  const S = window.SITE; if (!S) return;
  const get = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
  document.querySelectorAll('[data-k]').forEach(el => {
    const v = get(el.dataset.k);
    if (typeof v === 'string' && v.trim()) el.textContent = v;
  });

  const stats = document.getElementById('heroStats');
  if (stats && Array.isArray(S.stats)) {
    stats.innerHTML = S.stats.map(s => `<div class="stat"><b data-count="${+s.n || 0}">0</b><span></span></div>`).join('');
    stats.querySelectorAll('.stat span').forEach((sp, i) => sp.textContent = S.stats[i].label || '');
  }

  const c = S.contact || {};
  const wa = String(c.whatsapp || '').replace(/\D/g, '');
  if (wa) {
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => a.href = 'https://wa.me/' + wa);
    const mm = document.getElementById('mmWa');
    if (mm) mm.textContent = 'واتساب ' + (c.phones && c.phones[0] || wa);
  }
  const info = document.getElementById('contactInfo');
  if (info) {
    const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const phones = (c.phones || []).filter(Boolean).map(p => `<a href="tel:${esc(p.replace(/\s/g, ''))}" data-hover><span>اتصل</span><b>${esc(p)}</b></a>`);
    const site = c.website ? [`<a href="https://${esc(c.website.replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener" data-hover><span>الموقع</span><b>${esc(c.website.replace(/^https?:\/\//, ''))}</b></a>`] : [];
    info.innerHTML = phones.concat(site).join('');
  }
})();
