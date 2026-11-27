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

  /* ---------- footer: website, agencies, social media, legal line ---------- */
  const F = S.footer || {}, soc = F.social || {};
  const escF = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const url = u => { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, ''); return /^https:\/\/[^\s"<>]+$/i.test(u.replace(/^http:/i, 'https:')) ? u : ''; };
  const siteA = document.getElementById('sfSite');
  if (siteA && c.website) { const host = c.website.replace(/^https?:\/\//, '').replace(/\/$/, ''); siteA.href = 'https://' + host; siteA.textContent = host; }
  const agBox = document.getElementById('sfAgencies');
  if (agBox && Array.isArray(window.AGENCIES)) {
    agBox.innerHTML = window.AGENCIES.map(a => `<button type="button" data-ag="${escF(a.id)}" data-hover>${escF(a.name)}</button>`).join('');
    agBox.addEventListener('click', e => { const b = e.target.closest('[data-ag]'); if (b && window.GA && GA.openProfile) GA.openProfile(b.dataset.ag); });
  }
  const ICON = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.2-.6.6-.6z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 7v8h2.6v-8H7zm1.3-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 10v8h2.6v-4.3c0-1.1.6-1.8 1.5-1.8s1.3.6 1.3 1.8V18H19v-4.9c0-2.4-1.3-3.3-3-3.3-1.2 0-2 .6-2.4 1.2V10H11z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h4.6l4.2 5.8L17.8 3H20l-6.2 7.2L21 21h-4.6l-4.5-6.2L6.3 21H4l6.9-8L4 3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.2 1.7 3.7 4 4v3c-1.5 0-2.9-.4-4-1.2V15a6 6 0 1 1-6-6v3.1a3 3 0 1 0 3 2.9V3h3z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z"/></svg>'
  };
  const NAMES = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', tiktok: 'TikTok', youtube: 'YouTube', whatsapp: 'WhatsApp' };
  const links = Object.keys(NAMES).map(k => [k, k === 'whatsapp' ? (wa ? 'https://wa.me/' + wa : '') : url(soc[k])]).filter(([, u]) => u);
  const socBox = document.getElementById('sfSocial');
  if (socBox) socBox.innerHTML = links.map(([k, u]) => `<a href="${escF(u)}" target="_blank" rel="noopener" data-hover>${ICON[k]}<span>${NAMES[k]}</span></a>`).join('');
  const addr = document.getElementById('sfAddress');
  if (addr && F.address) { addr.textContent = F.address; addr.hidden = false; }
  const reach = document.getElementById('sfReach');
  if (reach) {
    const phone = (c.phones || []).filter(Boolean)[0];
    const parts = [];
    if (phone) parts.push(`<b><a href="tel:${escF(phone.replace(/\s/g, ''))}" style="color:inherit">${escF(phone)}</a></b>`);
    if (F.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(F.email)) parts.push(`<a href="mailto:${escF(F.email)}">${escF(F.email)}</a>`);
    reach.innerHTML = parts.join(' - ');
  }
})();
