/* Green Apple — farm-gate entrance.
   The site opens on the gate of the Green Apple farm: orchards of our crops behind the fence,
   our products hanging on the fence posts. Click / tap / scroll → the doors swing open and the
   camera walks through the gate into the site. */
(() => {
  const gate = document.getElementById('gate');
  if (!gate) return;
  const stage = document.getElementById('gStage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const SW = 1600, HZ = 640, VX = 800, GY = 912;     // stage size, horizon, vanishing point, ground line at the gate

  if (window.Music) Music.autoplay();

  // editing preview (from the private dashboard): skip the entrance
  if (new URLSearchParams(location.search).has('preview')) {
    gate.remove(); if (window.GA_enterSite) GA_enterSite(); return;
  }

  /* ---------- helpers ---------- */
  let seed = 11;   // seeded random → the farm looks the same on every visit
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = (a, b) => a + rnd() * (b - a);
  const n1 = v => Math.round(v * 10) / 10;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, f) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HAZE = '#efe0aa';
  const svg = (inner, cls = '') => `<svg class="${cls}" viewBox="0 0 1600 1300" width="1600" height="1300" overflow="visible" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  /* ---------- trees of our crops ---------- */
  const TREE = {
    citrus: { trunk: '#5a3d24', base: '#3c7a35', hi: '#64a04a', fruit: ['#f59a23', '#f7b23b'], r: .34, fr: .032, n: 8 },
    mango:  { trunk: '#5a3d24', base: '#2d6631', hi: '#4e8c3e', fruit: ['#f2b632', '#e5762c', '#d9a52b'], r: .4, fr: .03, n: 7 },
    olive:  { trunk: '#6b5a45', base: '#7d9868', hi: '#a9bd92', fruit: ['#4a3b55'], r: .38, fr: .017, n: 9 }
  };
  function tree(type, x, y, h, haze) {
    const c = col => mix(col, HAZE, haze);
    let s = '';
    if (type === 'palm') {
      const lean = R(-.12, .12) * h, tx = x + lean, ty = y - h * 1.25;
      s += `<path d="M${n1(x - h * .035)} ${n1(y)}Q${n1(x + lean * .2)} ${n1(y - h * .7)} ${n1(tx - h * .015)} ${n1(ty)}L${n1(tx + h * .015)} ${n1(ty)}Q${n1(x + lean * .2 + h * .04)} ${n1(y - h * .7)} ${n1(x + h * .035)} ${n1(y)}Z" fill="${c('#7a5634')}"/>`;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * .42 + R(-.1, .1), len = h * R(.42, .56);
        const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * .55 + len * .35;
        const mx = tx + Math.cos(a) * len * .5, my = ty + Math.sin(a) * len * .5 - len * .12;
        s += `<path d="M${n1(tx)} ${n1(ty)}Q${n1(mx)} ${n1(my)} ${n1(ex)} ${n1(ey)}" stroke="${c(i % 2 ? '#3f7a3a' : '#2f6830')}" stroke-width="${n1(h * .035)}" fill="none" stroke-linecap="round"/>`;
      }
      if (h > 40) for (let i = 0; i < 5; i++) s += `<circle cx="${n1(tx + R(-.06, .06) * h)}" cy="${n1(ty + R(.03, .09) * h)}" r="${n1(h * .022)}" fill="${c('#c0602a')}"/>`;
      return s;
    }
    const T = TREE[type], th = h * (type === 'olive' ? .42 : .36), tw = h * (type === 'olive' ? .065 : .048);
    s += `<path d="M${n1(x - tw)} ${n1(y)}L${n1(x - tw * .55)} ${n1(y - th)}L${n1(x + tw * .55)} ${n1(y - th)}L${n1(x + tw)} ${n1(y)}Z" fill="${c(T.trunk)}"/>`;
    const cx = x, cy = y - h * .62, Rr = h * T.r, sx = type === 'olive' ? 1.25 : type === 'mango' ? 1.08 : 1;
    const dk = mix(T.base, '#0f220e', .32);
    if (h < 26) {   // far away: just a soft crown
      s += `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(Rr * sx)}" ry="${n1(Rr * .92)}" fill="${c(T.base)}"/>`;
      return s;
    }
    for (let i = 0; i < T.n; i++) {
      const a = i / T.n * Math.PI * 2 + R(-.2, .2), d = Rr * R(.45, .6), r = Rr * R(.42, .58);
      const px = cx + Math.cos(a) * d * sx, py = cy + Math.sin(a) * d * .85;
      s += `<circle cx="${n1(px)}" cy="${n1(py)}" r="${n1(r)}" fill="${c(Math.sin(a) > .3 ? dk : T.base)}"/>`;
    }
    s += `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(Rr * .72 * sx)}" ry="${n1(Rr * .7)}" fill="${c(T.base)}"/>`;
    const toward = Math.sign(VX - x) || 1;   // the sun sits behind the gate: crowns are lit on the side facing it
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * .7 + toward * .35, d = Rr * .5;
      s += `<circle cx="${n1(cx + Math.cos(a) * d * sx)}" cy="${n1(cy + Math.sin(a) * d)}" r="${n1(Rr * R(.24, .32))}" fill="${c(T.hi)}" opacity=".85"/>`;
    }
    const nf = type === 'olive' ? 10 : Math.round(R(6, 10));
    for (let i = 0; i < nf; i++) {
      const a = R(0, Math.PI * 2), d = Rr * Math.sqrt(rnd()) * .82;
      const fx = cx + Math.cos(a) * d * sx, fy = cy + Math.sin(a) * d * .85, col = c(T.fruit[i % T.fruit.length]);
      s += type === 'mango'
        ? `<ellipse cx="${n1(fx)}" cy="${n1(fy)}" rx="${n1(h * T.fr * .8)}" ry="${n1(h * T.fr * 1.15)}" fill="${col}"/>`
        : `<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(h * T.fr)}" fill="${col}"/>`;
    }
    return s;
  }

  /* ---------- far hills + distant palms + birds ---------- */
  function farLayer() {
    let s = '';
    [[598, 34, '#ddd5a6', 1.3], [618, 24, '#cbcb98', 2.6], [634, 12, '#b9c38e', 4.1]].forEach(([yb, amp, col, ph], k) => {
      let d = `M-300 ${HZ + 60}`;
      for (let x = -300; x <= 1900; x += 40) d += `L${x} ${n1(yb - amp * (Math.sin(x * .0042 + ph) * .6 + Math.sin(x * .011 + ph * 2) * .4))}`;
      s += `<path d="${d}L1900 ${HZ + 60}Z" fill="${col}"/>`;
      if (k === 1) for (let i = 0; i < 14; i++) {
        const x = R(-250, 1850); if (Math.abs(x - VX) < 160) continue;
        const y = yb - amp * (Math.sin(x * .0042 + ph) * .6 + Math.sin(x * .011 + ph * 2) * .4) + 4;
        s += tree('palm', x, y, R(18, 30), .62);
      }
    });
    const bird = (x, y, sc, d) => `<g class="g-bird" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${sc})"><path d="M-9 0Q-4.5 -6 0 0Q4.5 -6 9 0" stroke="#3b3a2c" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
    s += `<g class="g-birds">${bird(0, 0, 1, 0)}${bird(26, -14, .8, .2)}${bird(48, 6, .7, .4)}</g>`;
    return `<div class="g-sun"></div><div class="g-rays"></div>` + svg(s);
  }

  /* ---------- the farm behind the fence: rows of crops + orchards ---------- */
  function fieldLayer() {
    let s = `<defs><linearGradient id="gField" x1="0" y1="${HZ}" x2="0" y2="${GY}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cfc98e"/><stop offset=".35" stop-color="#9fb46a"/><stop offset="1" stop-color="#5f9443"/></linearGradient></defs>`;
    s += `<rect x="-400" y="${HZ - 2}" width="2400" height="${GY - HZ + 12}" fill="url(#gField)"/>`;
    for (let k = 2; k <= 18; k++) [-1, 1].forEach(sd => {   // crop rows running to the horizon
      const a = VX + sd * k * 118, b = VX + sd * (k + .45) * 118;
      s += `<path d="M${VX} ${HZ}L${a} ${GY + 6}L${b} ${GY + 6}Z" fill="#2f5d24" opacity=".16"/>`;
    });
    const L = ['citrus', 'mango', 'olive', 'citrus', 'palm', 'mango'], Rt = ['mango', 'citrus', 'palm', 'olive', 'mango', 'citrus'];
    const OFF = [300, 470, 650, 860, 1100, 1400], items = [];
    for (let k = 0; k < 12; k++) {
      const t0 = .06 * Math.pow(1.3, k); if (t0 > .97) break;
      OFF.forEach((off, ri) => [-1, 1].forEach(sd => {
        const t = t0 * R(.96, 1.04), x = VX + sd * off * t + R(-6, 6) * t;
        if (x < -220 || x > 1820) return;
        items.push({ t, x, type: (sd < 0 ? L : Rt)[ri] });
      }));
    }
    items.sort((a, b) => a.t - b.t).forEach(it => {
      const y = HZ + (GY - HZ) * it.t, h = 300 * it.t * R(.9, 1.1);
      s += tree(it.type, it.x, y, h, Math.max(0, .75 - it.t * 1.1));
    });
    s += `<rect x="-400" y="${HZ - 30}" width="2400" height="70" fill="url(#gHaze)"/><defs><linearGradient id="gHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${HAZE}" stop-opacity="0"/><stop offset=".45" stop-color="${HAZE}" stop-opacity=".55"/><stop offset="1" stop-color="${HAZE}" stop-opacity="0"/></linearGradient></defs>`;
    return svg(s);
  }

  /* ---------- the stone path: inside the gate (behind the doors) and outside (to the visitor) ---------- */
  const pcx = t => VX + 24 * Math.sin(Math.min(t, 1) * Math.PI * 1.5) * (1 - Math.min(t, 1));
  const pw = t => 3 + 107 * t;
  const py = t => HZ + (GY - HZ) * t;
  function pathShape(t0, t1) {
    const L = [], Rr = [];
    for (let t = t0; t <= t1 + 1e-6; t += (t1 - t0) / 40) { L.push(`${n1(pcx(t) - pw(t))} ${n1(py(t))}`); Rr.unshift(`${n1(pcx(t) + pw(t))} ${n1(py(t))}`); }
    return `M${L.join('L')}L${Rr.join('L')}Z`;
  }
  function stones(t0, t1) {
    let s = '', t = t1, row = 0;
    while (t > t0) {
      const tn = t * .9, y0 = py(tn), y1 = py(t), w = pw((t + tn) / 2), cx = pcx((t + tn) / 2);
      const n = row % 2 ? 2 : 3, gap = 3 * t, sw = (2 * w - gap * (n + 1)) / n, hh = (y1 - y0) - gap;
      for (let i = 0; i < n; i++) {
        const x = cx - w + gap + i * (sw + gap) + R(-1, 1) * t;
        s += `<rect x="${n1(x)}" y="${n1(y0 + gap / 2)}" width="${n1(sw)}" height="${n1(Math.max(hh, .5))}" rx="${n1(Math.min(hh, sw) * .4)}" fill="${mix(rnd() < .5 ? '#e0ca98' : '#cdb27c', HAZE, Math.max(0, .5 - t))}"/>`;
      }
      t = tn; row++;
    }
    return s;
  }
  function pathLayer() {
    return svg(`<path d="${pathShape(.02, 1)}" fill="#a8925f"/>${stones(.05, 1)}`) + `<div class="g-bloom"></div>`;
  }

  /* ---------- fence with our products hanging on the posts ---------- */
  function pickProducts() {
    const P = window.PRODUCTS || [], A = window.AGENCIES || [];
    const first = A.map(a => P.find(p => p.a === a.id)).filter(Boolean);
    const second = A.map(a => P.filter(p => p.a === a.id)[1]).filter(Boolean);
    return first.concat(second).slice(0, 8).map(p => ({ ...p, color: (A.find(a => a.id === p.a) || {}).color || '#00A650' }));
  }
  function plaque(cx, p, i) {
    const w = 118, h = 150, top = 760, ny = top - 24;
    return `<g class="g-plq" data-i="${i}" data-o="${cx} ${ny}">
      <path d="M${cx - 46} ${top + 3}L${cx} ${ny}L${cx + 46} ${top + 3}" fill="none" stroke="#3b2a1a" stroke-width="2.2"/>
      <rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="9" fill="#6c4325"/>
      <rect x="${cx - w / 2 + 3}" y="${top + 3}" width="${w - 6}" height="${h - 6}" rx="7" fill="none" stroke="#94643a" stroke-width="2"/>
      <rect x="${cx - w / 2 + 9}" y="${top + 9}" width="${w - 18}" height="${h - 18}" rx="5" fill="#fdfaf2"/>
      <image href="${esc(p.img)}" x="${cx - w / 2 + 13}" y="${top + 12}" width="${w - 26}" height="${h - 52}" preserveAspectRatio="xMidYMid meet"/>
      <rect x="${cx - w / 2 + 9}" y="${top + h - 13}" width="${w - 18}" height="4" fill="${esc(p.color)}"/>
      <text x="${cx}" y="${top + h - 22}" text-anchor="middle" class="g-plq-t" direction="rtl">${esc(p.ar || p.en)}</text>
      <circle cx="${cx}" cy="${ny}" r="3.6" fill="#2a2622"/>
    </g>`;
  }
  function fenceLayer() {
    let s = `<defs><linearGradient id="gRail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47e4b"/><stop offset=".35" stop-color="#8b5c34"/><stop offset="1" stop-color="#5c3a1f"/></linearGradient></defs>`;
    s += `<ellipse cx="380" cy="${GY + 2}" rx="560" ry="10" fill="#1f3a14" opacity=".25"/><ellipse cx="1220" cy="${GY + 2}" rx="560" ry="10" fill="#1f3a14" opacity=".25"/>`;
    [[-300, 592], [1008, 1900]].forEach(([a, b]) => [780, 840].forEach(y => { s += `<rect x="${a}" y="${y}" width="${b - a}" height="15" fill="url(#gRail)"/>`; }));
    const posts = [];
    for (let x = 520; x > -320; x -= 75) posts.push(x, 2 * VX - x);
    posts.forEach(x => {
      const lit = x < VX ? 1 : -1;
      s += `<path d="M${x - 8} ${GY + 4}V748L${x} 737L${x + 8} 748V${GY + 4}Z" fill="#875a33"/><rect x="${lit > 0 ? x + 4 : x - 8}" y="747" width="4" height="${GY - 743}" fill="#b07a48" opacity=".75"/>`;
    });
    const P = pickProducts(), spots = [520, 1080, 370, 1230, 220, 1380, 70, 1530];
    P.forEach((p, i) => { s += plaque(spots[i], p, i); });
    return svg(s);
  }

  /* ---------- the gate: stone pillars, iron arch with the name, hanging sign, grape vine ---------- */
  const LEAF = 'M0 0C-.36 -.08 -.58 -.42 -.46 -.7C-.33 -.63 -.26 -.8 -.13 -.9C-.07 -.82 0 -1 0 -1C0 -1 .07 -.82 .13 -.9C.26 -.8 .33 -.63 .46 -.7C.58 -.42 .36 -.08 0 0Z';
  function grapes() {
    let s = '';
    [[0, 0], [-.5, -.1], [.5, -.1], [-.95, -.35], [0, -.25], [.95, -.35], [-.5, -.5], [.5, -.5], [0, -.7], [-.25, .35], [.25, .35], [0, .7]].forEach(([x, y], i) =>
      s += `<circle cx="${x}" cy="${-y + .4}" r=".36" fill="${['#4a2160', '#5d2c77', '#6b3685'][i % 3]}"/><circle cx="${x - .11}" cy="${-y + .29}" r=".09" fill="#b089c6" opacity=".7"/>`);
    return `<g id="gGr"><path d="M0 -1.1V-.4" stroke="#4a5f2a" stroke-width=".12"/>${s}</g>`;
  }
  function pillar(x0) {
    const w = 72, top = 428, bot = GY;
    let s = `<rect x="${x0}" y="${top}" width="${w}" height="${bot - top}" fill="url(#gStone)"/>`;
    for (let y = top + 30, r = 0; y < bot - 36; y += 32, r++) {
      s += `<path d="M${x0} ${y}H${x0 + w}" stroke="#a48f68" stroke-width="1.6" opacity=".75"/>`;
      const vx = x0 + (r % 2 ? 26 : 48); s += `<path d="M${vx} ${y}V${y + 32}" stroke="#a48f68" stroke-width="1.4" opacity=".6"/>`;
    }
    s += `<rect x="${x0 - 10}" y="${bot - 38}" width="${w + 20}" height="41" rx="3" fill="#c3ad85"/><rect x="${x0 - 10}" y="${bot - 38}" width="${w + 20}" height="5" fill="#e0d0aa"/>`;
    s += `<rect x="${x0 - 10}" y="${top - 22}" width="${w + 20}" height="24" rx="3" fill="#d9c79f"/><path d="M${x0 - 6} ${top - 22}L${x0 + w / 2} ${top - 46}L${x0 + w + 6} ${top - 22}Z" fill="#c4b088"/>`;
    const lx = x0 + w / 2, ly = top - 46;
    s += `<circle class="g-lamp" cx="${lx}" cy="${ly - 18}" r="46" fill="url(#gLamp)"/><rect x="${lx - 2.5}" y="${ly - 6}" width="5" height="8" fill="#2a2622"/>
      <path d="M${lx - 10} ${ly - 6}H${lx + 10}L${lx + 8} ${ly - 32}H${lx - 8}Z" fill="#ffd772" stroke="#2a2622" stroke-width="2.4"/><path d="M${lx - 12} ${ly - 32}H${lx + 12}L${lx} ${ly - 42}Z" fill="#2a2622"/>`;
    return s;
  }
  function vine() {
    const pts = [];
    for (let y = 880; y > 440; y -= 14) pts.push([663 + Math.sin(y * .05) * 5, y]);
    for (let t = 0; t <= 1.0001; t += .03) { const x = (1 - t) ** 2 * 660 + 2 * t * (1 - t) * 800 + t * t * 940, y = (1 - t) ** 2 * 432 + 2 * t * (1 - t) * 320 + t * t * 432; pts.push([x, y + Math.sin(t * 30) * 4]); }
    for (let y = 440; y < 880; y += 14) pts.push([937 + Math.sin(y * .05 + 1) * 5, y]);
    let s = `<path d="M${pts.map(p => p.map(n1).join(' ')).join('L')}" stroke="#4a5f2a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const cols = ['#3f7d34', '#4f9240', '#2f6528', '#5a9c46'];
    pts.forEach(([x, y], i) => {
      if (i % 2 && rnd() < .35) return;
      const side = i % 2 ? 1 : -1, sc = R(14, 21);
      s += `<use href="#gLf" fill="${cols[i % 4]}" transform="translate(${n1(x + side * 4)} ${n1(y)}) rotate(${n1(side * R(35, 80) + R(-15, 15))}) scale(${n1(sc)})"/>`;
    });
    [[pts[8], 13], [pts[20], 12], [pts[39], 12], [pts[46], 11], [pts[pts.length - 12], 13], [pts[pts.length - 24], 12]].forEach(([p, sc]) => {
      s += `<use href="#gGr" transform="translate(${n1(p[0])} ${n1(p[1] + 16)}) scale(${sc})"/>`;
    });
    return s;
  }
  const doorSvg = side => {
    const L = side === 'l', id = 'gD' + side;
    const shape = L ? 'M0 36Q70 10 140 4V316H0Z' : 'M0 4Q70 10 140 36V316H0Z';
    let planks = '';
    for (let i = 0; i < 5; i++) {
      const x = i * 28;
      planks += `<rect x="${x}" y="0" width="28" height="316" fill="${['#8f603a', '#966740', '#875934', '#93633b', '#8a5c36'][(i + (L ? 0 : 2)) % 5]}"/>`;
      for (let g = 0; g < 3; g++) planks += `<path d="M${x + R(5, 23)} ${R(0, 60)}Q${x + R(4, 24)} ${R(120, 200)} ${x + R(5, 23)} 316" stroke="#5e3c21" stroke-width=".9" fill="none" opacity=".4"/>`;
      planks += `<path d="M${x} 0V316" stroke="#4b2f18" stroke-width="1.6"/>`;
    }
    const hx = L ? 0 : 140, dir = L ? 1 : -1, lx = L ? 124 : 16;
    const rail = y => `<rect x="0" y="${y}" width="140" height="24" fill="#73482a"/><rect x="0" y="${y}" width="140" height="3" fill="#a2703f"/>`;
    const brace = L ? 'M4 262L28 262L136 92L112 92Z' : 'M136 262L112 262L4 92L28 92Z';
    const strap = y => `<path d="M${hx} ${y}H${hx + dir * 78}l${dir * 8} 4.5l${-dir * 8} 4.5H${hx}Z" fill="#2a2724"/>` + [18, 40, 62].map(o => `<circle cx="${hx + dir * o}" cy="${y + 4.5}" r="2" fill="#5b5650"/>`).join('');
    return `<svg viewBox="0 0 140 316" width="140" height="316" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="${id}"><path d="${shape}"/></clipPath><linearGradient id="${id}s" x1="${L ? 0 : 1}" y1="0" x2="${L ? 1 : 0}" y2="0"><stop offset="0" stop-color="#1d1208" stop-opacity=".45"/><stop offset=".25" stop-color="#1d1208" stop-opacity="0"/><stop offset=".85" stop-color="#fff2c8" stop-opacity="0"/><stop offset="1" stop-color="#fff2c8" stop-opacity=".22"/></linearGradient></defs>
      <g clip-path="url(#${id})">${planks}${rail(66)}${rail(262)}<path d="${brace}" fill="#73482a"/><path d="${brace}" fill="none" stroke="#4b2f18" stroke-width="1.4"/>
      ${strap(73)}${strap(269)}<rect x="0" y="0" width="140" height="316" fill="url(#${id}s)"/><rect x="0" y="286" width="140" height="30" fill="#1d1208" opacity=".25"/></g>
      <path d="${shape}" fill="none" stroke="#3f2713" stroke-width="2.5"/>
      <rect x="${lx - 5}" y="160" width="10" height="34" rx="3" fill="#2a2724"/><circle cx="${lx}" cy="${L ? 188 : 188}" r="9" fill="none" stroke="#2a2724" stroke-width="3.6"/>
    </svg>`;
  };
  function gateLayer() {
    const name = [...'GREEN APPLE'].map(ch => `<tspan fill-opacity="0" stroke-opacity="0">${ch === ' ' ? ' ' : ch}</tspan>`).join('');
    const mark = (window.LOGO_MARK || '').replace('<svg ', '<svg x="906" y="467" width="40" height="35" ');
    let s = `<defs>
      <linearGradient id="gStone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bea984"/><stop offset=".55" stop-color="#e6d6b0"/><stop offset="1" stop-color="#b09b74"/></linearGradient>
      <radialGradient id="gLamp"><stop offset="0" stop-color="#fff1b8" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd772" stop-opacity=".45"/><stop offset="1" stop-color="#ffd772" stop-opacity="0"/></radialGradient>
      <linearGradient id="gBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d4c28"/><stop offset="1" stop-color="#5a341a"/></linearGradient>
      <path id="gLf" d="${LEAF}"/>${grapes()}
      <path id="gArchTxt" d="M612 392Q800 236 988 392"/>
    </defs>`;
    s += `<ellipse cx="${VX}" cy="${GY + 3}" rx="230" ry="9" fill="#1f3a14" opacity=".35"/>`;
    s += pillar(588) + pillar(940);
    // iron arch
    s += `<path d="M652 410Q800 282 948 410" stroke="#2a2622" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M660 432Q800 320 940 432" stroke="#2a2622" stroke-width="6" fill="none"/>`;
    for (let t = .08; t < .93; t += .07) {
      const a = (1 - t) ** 2 * 410 + 2 * t * (1 - t) * 282 + t * t * 410, b = (1 - t) ** 2 * 432 + 2 * t * (1 - t) * 320 + t * t * 432;
      const x1 = (1 - t) ** 2 * 652 + 2 * t * (1 - t) * 800 + t * t * 948, x2 = (1 - t) ** 2 * 660 + 2 * t * (1 - t) * 800 + t * t * 940;
      s += `<path d="M${n1(x1)} ${n1(a)}L${n1(x2)} ${n1(b)}" stroke="#2a2622" stroke-width="3"/>`;
    }
    s += `<text class="g-arch-t" direction="ltr"><textPath href="#gArchTxt" startOffset="50%" text-anchor="middle">${name}</textPath></text>`;
    // hanging sign
    s += `<g class="g-board"><path d="M712 397V456M888 397V456" stroke="#2d2a25" stroke-width="2.6" stroke-dasharray="5 3"/>
      <rect x="638" y="454" width="324" height="62" rx="8" fill="url(#gBoard)"/><rect x="643" y="459" width="314" height="52" rx="6" fill="none" stroke="#9a6838" stroke-width="1.6"/>
      <circle cx="926" cy="485" r="23" fill="#f8f1df"/>${mark}
      <text x="784" y="492" text-anchor="middle" class="g-board-t" direction="rtl">جرين ابل للاستثمار الزراعي</text></g>`;
    s += vine();
    return svg(s) + `<div class="g-doors" id="gDoors"><div class="g-crack"></div><div class="g-door l">${doorSvg('l')}</div><div class="g-door r">${doorSvg('r')}</div></div>`;
  }

  /* ---------- foreground: grass, the outer path, framing branches ---------- */
  function frontLayer() {
    let s = `<defs><linearGradient id="gGround" x1="0" y1="${GY}" x2="0" y2="1700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#609645"/><stop offset=".35" stop-color="#4a7f36"/><stop offset="1" stop-color="#26501f"/></linearGradient></defs>`;
    s += `<rect x="-500" y="${GY - 1}" width="2600" height="900" fill="url(#gGround)"/>`;
    s += `<path d="${pathShape(1, 4)}" fill="#a28c5a"/>${stones(1, 4)}`;
    for (let x = -300; x < 1900; x += 13) {      // tufts along the fence line
      if (x > 680 && x < 920) continue;
      for (let b = 0; b < 3; b++) {
        const bx = x + R(-5, 5), hh = R(8, 22), lean = R(-6, 6), y = GY + R(-1, 10);
        s += `<path d="M${n1(bx)} ${n1(y)}q${n1(lean * .4)} ${n1(-hh * .6)} ${n1(lean)} ${n1(-hh)}" stroke="${rnd() < .5 ? '#4f8a3a' : '#6aa148'}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      }
    }
    [[948, .9], [992, 1.05], [1040, 1.2]].forEach(([y, sc]) => {   // beds of strawberries & tomatoes in front of the fence
      const t = (y - HZ) / (GY - HZ), edge = pw(t) + 70 * sc;
      for (let x = -260; x < 1860; x += 30 * sc) {
        const px = x + R(-6, 6); if (Math.abs(px - VX) < edge) continue;
        const r = 11 * sc, red = rnd() < .5;
        s += `<ellipse cx="${n1(px)}" cy="${n1(y + 6 * sc)}" rx="${n1(r * 1.6)}" ry="${n1(r * .35)}" fill="#1f3a14" opacity=".25"/>`;
        for (let k = 0; k < 4; k++) s += `<circle cx="${n1(px + R(-.9, .9) * r)}" cy="${n1(y - R(0, 1) * r)}" r="${n1(r * R(.6, .85))}" fill="${['#2f6a2b', '#3c7d33', '#4d8f3c', '#2a5f27'][k]}"/>`;
        for (let k = 0; k < 3; k++) s += `<circle cx="${n1(px + R(-.9, .9) * r)}" cy="${n1(y - R(-.2, .9) * r)}" r="${n1(r * .22)}" fill="${red ? '#e2362f' : '#f0642a'}"/>`;
      }
    });
    for (let i = 0; i < 40; i++) {               // wild flowers
      const x = rnd() < .5 ? R(-200, 600) : R(1000, 1800), y = R(GY + 20, GY + 160);
      if (Math.abs(x - VX) < pw((y - HZ) / (GY - HZ)) + 20) continue;
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(R(2.5, 4.5))}" fill="${rnd() < .6 ? '#ffd84a' : '#fff6e0'}"/>`;
    }
    return svg(s);
  }
  function branch(mirror) {
    // a fruit branch reaching into the frame from the top corner (mirrored for the other side)
    const X = x => mirror ? SW - x : x;
    let s = `<path d="M${X(-80)} 150Q${X(120)} 186 ${X(340)} 170" stroke="#3b2a1a" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path d="M${X(150)} 182Q${X(220)} 240 ${X(250)} 318" stroke="#3b2a1a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    const lv = ['#1f4a22', '#2b5e2a', '#3a7232', '#2b5e2a', '#6f9f3c'];
    for (let i = 0; i < 46; i++) {
      const t = rnd(), onTwig = rnd() < .35;
      const bx = onTwig ? 150 + 100 * t : -60 + 400 * t, by = onTwig ? 182 + 136 * t : 160 + Math.sin(t * 3) * 14;
      s += `<ellipse cx="${n1(X(bx + R(-18, 18)))}" cy="${n1(by + R(-22, 26))}" rx="${n1(R(20, 30))}" ry="${n1(R(7, 10))}" fill="${lv[i % 5]}" transform="rotate(${n1(R(-70, 70))} ${n1(X(bx))} ${n1(by)})"/>`;
    }
    [[90, 205], [210, 232], [262, 330], [318, 200]].forEach(([x, y], i) => {
      if (mirror) s += `<ellipse cx="${X(x)}" cy="${y}" rx="12" ry="16" fill="${i % 2 ? '#f2b632' : '#e98a2e'}"/><ellipse cx="${X(x) + 4}" cy="${y - 5}" rx="3.5" ry="5" fill="#fff2b0" opacity=".55"/>`;
      else s += `<circle cx="${X(x)}" cy="${y}" r="15" fill="#f39a1e"/><circle cx="${X(x) - 5}" cy="${y - 5}" r="4.5" fill="#ffe2a0" opacity=".6"/>`;
    });
    return `<g class="g-sway b${mirror ? 2 : 1}">${s}</g>`;
  }
  function grassCorner(mirror) {
    const X = x => mirror ? SW - x : x;
    let s = '';
    for (let i = 0; i < 34; i++) {
      const x = R(-120, 330), h = R(110, 280) * (1 - Math.max(0, x - 120) / 420), lean = R(-30, 50);
      s += `<path d="M${n1(X(x - 4))} 1330Q${n1(X(x + lean * .3))} ${n1(1330 - h * .6)} ${n1(X(x + lean))} ${n1(1330 - h)}Q${n1(X(x + lean * .3 + 6))} ${n1(1330 - h * .55)} ${n1(X(x + 5))} 1330Z" fill="${['#2a5226', '#3d7a32', '#4f8f3a', '#1f4a1f'][i % 4]}"/>`;
    }
    return `<g class="g-sway g${mirror ? 2 : 1}">${s}</g>`;
  }

  /* ---------- build ---------- */
  const layers = [
    ['far', farLayer(), 5, 1.18],
    ['field', fieldLayer(), 9, 1.6],
    ['path', pathLayer(), 12, 2.3],
    ['fence', fenceLayer(), 18, 5.2],
    ['gate', gateLayer(), 20, 7.5],
    ['front', frontLayer(), 30, 9],
    ['frame', svg(branch(false) + branch(true) + grassCorner(false) + grassCorner(true)), 44, 11]
  ];
  stage.innerHTML = layers.map(([k, html]) => `<div class="g-ly g-${k}">${html}</div>`).join('');
  // long product names: squeeze to fit the card
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => stage.querySelectorAll('.g-plq-t').forEach(t => {
    try { if (t.getComputedTextLength() > 94) { t.setAttribute('textLength', 94); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) {}
  }));
  const L = Object.fromEntries(layers.map(([k], i) => [k, stage.children[i]]));
  const q = s => stage.querySelector(s), qa = s => [...stage.querySelectorAll(s)];

  /* fit the 1600-wide stage to any screen, keeping the gate in view on phones */
  function fit() {
    const W = innerWidth, H = innerHeight;
    const s = Math.max(W / 1600, Math.min(H / 1300, W / 680));
    const ox = (W - 1600 * s) / 2;
    // tall phones: lift the scene so the arch sits near the top; short screens: keep the arch in view
    const oy = Math.max(Math.min(H * .5 - 650 * s, H * .13 - 280 * s), H * .03 - 265 * s);
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
    gate.style.setProperty('--hz', (oy + HZ * s) + 'px');
  }
  fit(); addEventListener('resize', fit);

  /* ---------- floating pollen ---------- */
  const cv = document.getElementById('gMotes'), cx2 = cv.getContext('2d');
  let motes = [], running = true;
  function sizeMotes() {
    const d = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; cx2.setTransform(d, 0, 0, d, 0, 0);
    motes = Array.from({ length: isTouch ? 34 : 64 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: .6 + Math.random() * 1.8, v: .12 + Math.random() * .3, p: Math.random() * 6.28 }));
  }
  sizeMotes(); addEventListener('resize', sizeMotes);
  (function draw(t) {
    if (!running) return; requestAnimationFrame(draw);
    cx2.clearRect(0, 0, innerWidth, innerHeight); cx2.globalCompositeOperation = 'lighter';
    motes.forEach(m => {
      if (!reduce) { m.y -= m.v; m.x += Math.sin(t / 1400 + m.p) * .25; }
      if (m.y < -10) { m.y = innerHeight + 10; m.x = Math.random() * innerWidth; }
      const a = .35 + .35 * Math.sin(t / 700 + m.p);
      cx2.fillStyle = `rgba(255,236,170,${a})`; cx2.beginPath(); cx2.arc(m.x, m.y, m.r, 0, 6.283); cx2.fill();
    });
  })(0);

  /* ---------- intro + idle life ---------- */
  const letters = qa('.g-arch-t tspan'), plq = qa('.g-plq'), hint = document.getElementById('gHint');
  gsap.set('.g-door.l', { rotationY: 0, transformOrigin: '0% 50%' });
  gsap.set('.g-door.r', { rotationY: 0, transformOrigin: '100% 50%' });
  plq.forEach(el => gsap.set(el, { svgOrigin: el.dataset.o }));
  gsap.set(q('.g-board'), { svgOrigin: '800 397' });
  const intro = gsap.timeline({ delay: .1 });
  intro.to('#gDark', { opacity: 0, duration: reduce ? .4 : 1.6, ease: 'power2.out' }, 0);
  if (!reduce) {
    intro.from(Object.values(L), { scale: 1.07, transformOrigin: '800px 760px', duration: 2.6, ease: 'expo.out' }, 0)
      .to(letters, { attr: { 'fill-opacity': 1, 'stroke-opacity': 1 }, duration: .5, stagger: .07, ease: 'power1.out' }, .7)
      .from(q('.g-board'), { rotation: -9, duration: 2.2, ease: 'elastic.out(1, .3)' }, .9)
      .from(plq, { rotation: i => (i % 2 ? 1 : -1) * 22, opacity: 0, duration: 1.8, stagger: .09, ease: 'elastic.out(1, .35)' }, 1);
  } else gsap.set(letters, { attr: { 'fill-opacity': 1, 'stroke-opacity': 1 } });
  intro.to(hint, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' }, reduce ? .3 : 1.7);

  // mouse / tilt parallax: nearer layers move more
  const movers = layers.map(([k, , depth]) => ({ x: gsap.quickTo(L[k], 'x', { duration: 1.1, ease: 'power3' }), y: gsap.quickTo(L[k], 'y', { duration: 1.1, ease: 'power3' }), depth }));
  const onMove = e => {
    if (reduce || entered) return;
    const nx = e.clientX / innerWidth * 2 - 1, ny = e.clientY / innerHeight * 2 - 1;
    movers.forEach(m => { m.x(-nx * m.depth); m.y(-ny * m.depth * .45); });
  };
  addEventListener('pointermove', onMove, { passive: true });

  // the doors open a crack when you hover the gate
  const doors = document.getElementById('gDoors');
  if (!isTouch && !reduce) {
    doors.addEventListener('pointerenter', () => { if (entered) return; gsap.to('.g-door.l', { rotationY: 15, duration: .9, ease: 'power3.out' }); gsap.to('.g-door.r', { rotationY: -15, duration: .9, ease: 'power3.out' }); gate.classList.add('ajar'); });
    doors.addEventListener('pointerleave', () => { if (entered) return; gsap.to('.g-door', { rotationY: 0, duration: 1, ease: 'power3.out' }); gate.classList.remove('ajar'); });
  }

  // birdsong while you stand at the gate
  let birdT = setTimeout(function chirp() { if (window.Music && Music.birds) Music.birds(); birdT = setTimeout(chirp, 2600 + Math.random() * 4200); }, 1800);

  /* ---------- walk in ---------- */
  let entered = false;
  function go() {
    if (entered) return; entered = true;
    clearTimeout(birdT);
    if (window.Music && Music.on) { Music.start(); Music.creak(); }   // respects a visitor who muted it before
    gate.classList.add('opening'); gate.removeAttribute('data-hover');
    const tl = gsap.timeline();
    tl.to(hint, { opacity: 0, y: 12, duration: .35 }, 0);
    if (reduce) {
      tl.to('.g-door.l', { rotationY: 80, duration: .8 }, 0).to('.g-door.r', { rotationY: -80, duration: .8 }, 0)
        .add(() => window.GA_enterSite && GA_enterSite(), .7).to(gate, { opacity: 0, duration: .6 }, .7).add(done);
      return;
    }
    const at = .7, push = 2.1;
    tl.to('.g-door.l', { rotationY: 86, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to('.g-door.r', { rotationY: -86, duration: 1.8, ease: 'power2.inOut' }, .06)
      .to(q('.g-crack'), { opacity: 0, duration: .5 }, .4)
      .to(q('.g-bloom'), { opacity: 1, scale: 1.8, duration: 2.4, ease: 'power1.in' }, .4)
      .to(movers.map((m, i) => stage.children[i]), { x: 0, y: 0, duration: 1, ease: 'power2.out' }, 0);
    layers.forEach(([k, , , sc]) => tl.to(L[k], { scale: sc, transformOrigin: '800px 760px', duration: push, ease: 'power3.in' }, at));
    tl.to([L.front, L.frame], { opacity: 0, duration: .8, ease: 'power1.in' }, at + 1)
      .to(cv, { opacity: 0, duration: .6 }, at + 1)
      .to('#gFlash', { opacity: 1, duration: .55, ease: 'power2.in' }, at + push - .5)
      .add(() => { if (window.GA_enterSite) GA_enterSite(); if (window.Music) Music.whoosh(true); }, at + push - .05)
      .to(gate, { opacity: 0, duration: 1, ease: 'power2.out' }, at + push + .05)
      .add(done);
  }
  function done() {
    running = false;
    removeEventListener('pointermove', onMove); removeEventListener('resize', fit); removeEventListener('resize', sizeMotes);
    removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey);
    const c = document.getElementById('cursor'); if (c) c.classList.remove('hover', 'label');
    gate.remove();
  }
  gate.addEventListener('click', go);
  const onKey = e => { if (['Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); go(); } };
  const onWheel = e => { if (e.deltaY > 4) go(); };
  addEventListener('keydown', onKey); addEventListener('wheel', onWheel, { passive: true });
  let ty0 = null;
  gate.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
  gate.addEventListener('touchmove', e => { if (ty0 != null && ty0 - e.touches[0].clientY > 40) { ty0 = null; go(); } }, { passive: true });
})();
