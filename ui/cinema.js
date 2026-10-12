// Eylem animasyonları: her eylem türü için kısa sahne + animasyonlu sonuç paneli.
// Sahneye dokunmak animasyonu atlar; "hareketi azalt" ayarında doğrudan son kare gösterilir.
import { esc, el } from './dom.js';
import { avatarSvg } from './avatar.js';
import { mixColor } from './map.js';
import { PROVINCES, MAP_VIEWBOX } from '../data/generated/provinces.js';
import { SOCIAL_CAMPAIGNS } from '../data/social.js';
import { CLUSTERS } from '../data/clusters.js';
import { CITIZENS, CITIZEN_LINES } from '../data/press.js';
import { fmtMoney, fmtInt, fmtDate } from '../engine/util.js';
import { playerParty } from '../engine/state.js';
import { sfx } from './sound.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);

export function countUp(node, to, { ms = 1400, fmt = v => fmtInt(v), from = 0 } = {}) {
  if (!node) return;
  if (reduced()) { node.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const compact = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' Mn' : v >= 1e3 ? Math.round(v / 1e3) + ' B' : String(Math.round(v));

// ---------- Sahneler ----------
function sceneRally(s, a) {
  const me = playerParty(s);
  const ratio = Math.max(0.04, Math.min(1, a.crowd / a.capacity));
  const n = a.empty ? 14 : Math.round(40 + 220 * Math.sqrt(ratio));
  const skins = ['#F2C6A6', '#D9A47F', '#B07A55', '#8A5A3B', '#2B2420', '#3D2B22'];
  let heads = '', chairs = '';
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 26), col = i % 26;
    const x = 12 + col * 13.5 + (row % 2) * 6 + rnd(-2, 2), y = 118 + row * 9 + rnd(-1.5, 1.5);
    if (y > 196) break;
    heads += `<circle class="pop" style="animation-delay:${(i * 9) | 0}ms" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3.6 + row * 0.25).toFixed(1)}" fill="${skins[i % skins.length]}"/>`;
    if (i % 9 === 4 && !a.empty) heads += `<g class="pop flag" style="animation-delay:${(i * 9) | 0}ms;transform-origin:${x}px ${y}px"><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 18}" stroke="#555" stroke-width="1"/><rect x="${x}" y="${y - 18}" width="11" height="7" fill="${a.color}"/></g>`;
  }
  if (a.empty) for (let r = 0; r < 6; r++) for (let c = 0; c < 18; c++) chairs += `<rect x="${20 + c * 18}" y="${122 + r * 12}" width="10" height="7" rx="1.5" fill="#9AA5B8" opacity=".7"/>`;
  return {
    cls: 'sc-rally',
    html: `<svg viewBox="0 0 360 200" class="sc-svg" preserveAspectRatio="xMidYMax slice">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C2C55"/><stop offset="1" stop-color="#E9895B"/></linearGradient></defs>
        <rect width="360" height="200" fill="url(#sky)"/>
        ${a.venue === 'salon' ? '<rect width="360" height="200" fill="#121A33"/><path d="M0 0 L120 110 L0 110 Z M360 0 L240 110 L360 110 Z" fill="rgba(255,255,255,.05)"/><rect x="0" y="100" width="360" height="100" fill="#1B2647"/>' : ''}
        <path ${a.venue === 'salon' ? 'opacity="0"' : ''} d="M0 110 L0 70 L20 70 L20 55 L45 55 L45 80 L70 80 L70 48 L82 40 L94 48 L94 85 L130 85 L130 62 L160 62 L160 90 L200 90 L200 58 L215 50 L230 58 L230 88 L270 88 L270 66 L300 66 L300 82 L330 82 L330 60 L360 60 L360 110 Z" fill="#14213D" opacity=".85"/>
        <rect x="110" y="88" width="140" height="26" fill="#0E1730"/><rect x="104" y="84" width="152" height="6" fill="${a.color}"/>
        <rect x="120" y="20" width="120" height="20" rx="3" fill="${a.color}"/><text x="180" y="34" text-anchor="middle" font-size="12" font-weight="700" fill="${textOn(a.color)}" font-family="Barlow Condensed, sans-serif">${esc(a.short)} · ${esc(a.province.toLocaleUpperCase('tr'))}</text>
        ${chairs}${heads}
      </svg>
      <div class="sc-speaker">${avatarSvg(s.player.character, { size: 56, bg: 'transparent' })}</div>
      ${a.gaffe ? '<div class="sc-alert">⚠️</div>' : ''}${(a.packed || (!a.empty && a.fit > 1.05)) ? confetti(a.color) : ''}
      ${a.weather === 'yagmur' ? precip('rain') : a.weather === 'kar' ? precip('snow') : ''}
      ${a.transport ? '<div class="sc-bus">🚌🚌🚌</div>' : ''}
      ${a.speech ? `<div class="sc-speech">“${esc(a.speech)}”</div>` : ''}
      <div class="sc-counter"><span>Katılım</span><b id="cnt">0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.crowd, { ms: 1800 }); },
    ms: 2400,
  };
}

function precip(kind) {
  let h = `<div class="sc-precip ${kind}" aria-hidden="true">`;
  for (let i = 0; i < 50; i++) h += `<i style="left:${rnd(0, 100)}%;animation-delay:${rnd(0, 1500) | 0}ms;animation-duration:${kind === 'rain' ? rnd(500, 800) | 0 : rnd(1800, 3000) | 0}ms"></i>`;
  return h + '</div>';
}

function confetti(color) {
  let h = '<div class="sc-confetti" aria-hidden="true">';
  const cols = [color, '#FFC93C', '#FFFFFF', '#D7263D'];
  for (let i = 0; i < 26; i++) h += `<i style="left:${rnd(0, 100)}%;background:${cols[i % 4]};animation-delay:${rnd(0, 900) | 0}ms;animation-duration:${rnd(1400, 2400) | 0}ms"></i>`;
  return h + '</div>';
}
function textOn(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 160 ? '#14213D' : '#FFFFFF'; }

function sceneVisit(s, a) {
  const shops = [['Fırın', '#C2410C'], ['Kahvehane', '#0F766E'], ['Manav', '#15803D'], ['Berber', '#1D4ED8'], ['Kırtasiye', '#7C3AED']];
  return {
    cls: 'sc-visit',
    html: `<svg viewBox="0 0 360 200" class="sc-svg" preserveAspectRatio="xMidYMax slice"><rect width="360" height="200" fill="#CFE3F5"/>
      ${shops.map(([n, c], i) => `<g transform="translate(${8 + i * 70},40)"><rect width="64" height="120" fill="#F1E7D8"/><rect y="0" width="64" height="18" fill="#3A3A3A"/><text x="32" y="13" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">${n}</text>
        <path d="M0 18 h64 v12 ${[0, 1, 2, 3].map(k => `l-8 6 l-8 -6`).join(' ')} z" fill="${c}"/><rect x="8" y="44" width="22" height="30" fill="#9EC1E0"/><rect x="36" y="56" width="20" height="64" fill="#7A5236"/></g>`).join('')}
      <rect y="160" width="360" height="40" fill="#8C8F96"/><rect y="158" width="360" height="4" fill="#B8BBC2"/></svg>
      <div class="sc-walker">${avatarSvg(s.player.character, { size: 64, bg: 'transparent' })}</div>
      ${['🤝', '☕', '👋', '🫖', '😊'].map((e, i) => `<span class="sc-bubble" style="left:${12 + i * 19}%;animation-delay:${400 + i * 300}ms">${e}</span>`).join('')}
      <div class="sc-counter"><span>${esc(a.province)}</span><b>Esnaf turu</b></div>`,
    ms: 2200,
  };
}

function sceneSocial(s, a) {
  const def = SOCIAL_CAMPAIGNS.find(d => d.id === a.def);
  const me = playerParty(s);
  const tone = a.viral ? 'pos' : a.backfire ? 'neg' : 'neu';
  const cmts = [...CITIZENS].sort(() => Math.random() - 0.5).slice(0, 3).map((c, i) => {
    const t = i === 2 && !a.viral ? 'neg' : tone === 'neu' ? (i ? 'neu' : 'pos') : tone;
    return `<div class="ph-cmt" style="animation-delay:${900 + i * 450}ms"><b>${esc(c.name)}</b> ${esc(CITIZEN_LINES[t][Math.floor(Math.random() * CITIZEN_LINES[t].length)])}</div>`;
  }).join('');
  const aud = Object.entries(def.audience).sort((x, y) => y[1] - x[1]).filter(([, v]) => v >= 0.5).map(([k]) => CLUSTERS.find(c => c.id === k).label);
  return {
    cls: 'sc-social',
    html: `<div class="phone"><div class="ph-notch"></div>
        <div class="ph-bar" style="background:${def.color}">${def.icon} ${esc(def.platform)}</div>
        <div class="ph-post"><div class="row" style="gap:6px;flex-wrap:nowrap"><div class="ph-av">${avatarSvg(s.player.character, { size: 30, bg: mixColor('#FFFFFF', me.color, 0.3) })}</div><div style="min-width:0"><b>${esc(s.player.name)}</b> <span class="muted">· ${esc(me.short)}</span><div class="small muted">şimdi</div></div></div>
          <p>${esc(def.post)}</p>
          <div class="ph-media" style="background:linear-gradient(135deg, ${me.color}, ${mixColor(me.color, '#14213D', 0.5)})"><span>${def.icon}</span></div>
          <div class="ph-stats"><span>👁 <b id="sv">0</b></span><span>❤️ <b id="sl">0</b></span><span>🔁 <b id="ss">0</b></span><span>💬 <b id="sc">0</b></span></div>
        </div>
        <div class="ph-cmts">${cmts}</div>
        ${a.viral ? '<div class="ph-viral">🔥 VİRAL</div>' : a.backfire ? '<div class="ph-viral bad">😬 TERS TEPTİ</div>' : ''}
        ${a.viral ? hearts() : ''}
      </div>
      <div class="sc-aud">${aud.length ? 'Hedef kitle: ' + aud.map(esc).join(' · ') : 'Hedef: dezenformasyonla mücadele'}</div>`,
    start(stage) {
      countUp(stage.querySelector('#sv'), a.views, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#sl'), a.likes, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#ss'), a.shares, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#sc'), a.comments, { ms: 2000, fmt: compact });
    },
    ms: 2600,
  };
}
function hearts() { let h = ''; for (let i = 0; i < 14; i++) h += `<i class="heart" style="left:${rnd(10, 90)}%;animation-delay:${rnd(0, 1600) | 0}ms">${['❤️', '🔥', '👏'][i % 3]}</i>`; return h; }

function scenePress(s, a) {
  const me = playerParty(s);
  let flashes = '';
  for (let i = 0; i < 14; i++) flashes += `<i class="flash" style="left:${rnd(2, 95)}%;top:${rnd(55, 92)}%;animation-delay:${rnd(100, 2200) | 0}ms"></i>`;
  let wall = '';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) wall += `<span style="left:${c * 17 + (r % 2) * 8}%;top:${r * 22 + 4}%">${esc(me.short)}</span>`;
  return {
    cls: 'sc-press',
    html: `<div class="pr-wall" style="background:${mixColor('#0E1730', me.color, 0.35)}">${wall}</div>
      <div class="pr-speaker">${avatarSvg(s.player.character, { size: 92, bg: 'transparent', mood: a.score < -0.25 ? 'tense' : 'serious' })}</div>
      <div class="pr-podium" style="border-top-color:${me.color}"><span>${esc(me.short)}</span></div>
      <div class="pr-mics">🎤🎙️🎤</div>
      ${flashes}
      <div class="pr-quote"><b>${esc(s.player.name)}:</b> “${esc(a.quote)}”</div>`,
    ms: 2600,
  };
}

function sceneOrg(s, a) {
  const [x, y, w, h] = MAP_VIEWBOX;
  const set = new Set(a.plates.map(Number));
  const me = playerParty(s);
  let i = 0;
  const paths = PROVINCES.map(p => {
    const on = set.has(p.plate) || me.orgs[p.plate];
    const isNew = set.has(p.plate);
    return `<path d="${p.path}" fill="${on && !isNew ? mixColor('#2A3A60', a.color, 0.6) : '#2A3A60'}" ${isNew ? `class="lightup" style="--c:${a.color};animation-delay:${200 + (i++) * 140}ms"` : ''}/>`;
  }).join('');
  return {
    cls: 'sc-org',
    html: `<svg viewBox="${x} ${y} ${w} ${h}" class="sc-map">${paths}</svg>
      <div class="sc-ribbon"><span>✂️</span> ${esc(a.label)}</div>
      <div class="sc-counter"><span>Yeni il başkanlığı</span><b id="cnt">0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.plates.length, { ms: 200 + a.plates.length * 140 }); },
    ms: Math.min(3200, 900 + a.plates.length * 140),
  };
}

function sceneStrengthen(s, a) {
  const N = 40, from = Math.round(a.from * N), to = Math.round(a.to * N);
  let g = '';
  for (let i = 0; i < N; i++) {
    const on = i < to, fresh = i >= from && i < to;
    g += `<div class="vol ${on ? 'on' : ''} ${fresh ? 'fresh' : ''}" style="--c:${a.color};animation-delay:${(i - from) * 90}ms">👤</div>`;
  }
  return {
    cls: 'sc-grid',
    html: `<div class="volgrid">${g}</div><div class="sc-counter"><span>${esc(a.province)} teşkilatı</span><b id="cnt">%0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.to * 100, { from: a.from * 100, fmt: v => '%' + Math.round(v) }); },
    ms: 2000,
  };
}

function sceneMembers(s, a) {
  const names = ['A. Yıldız', 'M. Kaya', 'E. Demir', 'Z. Aksoy', 'H. Polat', 'S. Kurt'];
  return {
    cls: 'sc-members',
    html: `${names.map((n, i) => `<div class="mcard" style="--c:${a.color};animation-delay:${i * 220}ms;--r:${rnd(-14, 14)}deg"><b>ÜYE KARTI</b><span>${n}</span><i>No ${Math.floor(rnd(100000, 999999))}</i></div>`).join('')}
      <div class="sc-counter"><span>Yeni üye</span><b id="cnt">0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.count, { fmt: v => '+' + fmtInt(v) }); },
    ms: 2100,
  };
}

function sceneMoney(s, a) {
  let coins = '';
  for (let i = 0; i < 18; i++) coins += `<i class="coin" style="left:${rnd(38, 58)}%;animation-delay:${i * 90}ms">₺</i>`;
  return {
    cls: 'sc-money',
    html: `<div class="jar"><div class="jar-fill" style="--c:${a.color}"></div></div>${coins}
      ${a.bad ? '<div class="stamp">SORU İŞARETİ</div>' : ''}
      <div class="sc-counter"><span>Bağış</span><b id="cnt">₺0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.amount, { fmt: v => fmtMoney(v) }); },
    ms: 2200,
  };
}

function sceneCongress(s, a) {
  let dots = '';
  for (let r = 0; r < 7; r++) for (let c = 0; c < 22; c++) dots += `<circle class="wave" style="animation-delay:${(c * 40 + r * 70) % 900}ms" cx="${18 + c * 15.5}" cy="${118 + r * 11}" r="4" fill="${(r + c) % 5 ? '#D9DEE8' : a.color}"/>`;
  return {
    cls: 'sc-congress',
    html: `<svg viewBox="0 0 360 200" class="sc-svg"><rect width="360" height="200" fill="#0E1730"/><rect x="40" y="18" width="280" height="70" rx="4" fill="${a.color}"/>
      <text x="180" y="50" text-anchor="middle" font-size="22" font-weight="700" fill="${textOn(a.color)}" font-family="Barlow Condensed, sans-serif">${esc(a.short)}</text>
      <text x="180" y="72" text-anchor="middle" font-size="12" fill="${textOn(a.color)}" font-family="Barlow, sans-serif">1. OLAĞAN BÜYÜK KONGRE</text>
      <rect x="150" y="92" width="60" height="14" fill="#2A3A60"/>${dots}</svg>${confetti(a.color)}`,
    ms: 2400,
  };
}

function sceneMeeting(s, a) {
  let seats = '';
  for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; seats += `<circle cx="${180 + Math.cos(t) * 110}" cy="${100 + Math.sin(t) * 62}" r="12" fill="${i === 0 ? a.color : '#C9D1DE'}"/>`; }
  return {
    cls: 'sc-meeting',
    html: `<svg viewBox="0 0 360 200" class="sc-svg"><rect width="360" height="200" fill="#E9EDF3"/><ellipse cx="180" cy="100" rx="88" ry="46" fill="#7A5236"/>${seats}</svg>
      ${['Teşkilat raporu', 'Bütçe', 'Saha planı', 'Uyum!'].map((t, i) => `<span class="sc-bubble txt" style="left:${15 + i * 20}%;animation-delay:${300 + i * 380}ms">${t}</span>`).join('')}`,
    ms: 2000,
  };
}

function sceneTraining(s, a) {
  const items = ['Zor sorulara hazırlık', 'Kamera önü provası', 'Mesaj disiplini', 'Kriz iletişimi'];
  return {
    cls: 'sc-training',
    html: `<div class="board"><b>KADRO EĞİTİMİ</b>${items.map((t, i) => `<div class="tick" style="animation-delay:${300 + i * 380}ms"><span>✔</span>${t}</div>`).join('')}</div>`,
    ms: 2100,
  };
}

function sceneSignatures(s, a) {
  let lines = '';
  for (let i = 0; i < 6; i++) lines += `<div class="sigline"><span>${['Delege', 'İl delegesi', 'İlçe delegesi'][i % 3]} ${i + 1}</span><svg viewBox="0 0 120 20"><path class="sig" style="animation-delay:${i * 260}ms" d="M2 14 C12 2 18 18 28 8 S44 4 52 12 S70 2 80 10 S100 16 118 6" fill="none" stroke="#1F3A8A" stroke-width="2"/></svg></div>`;
  return {
    cls: 'sc-sign',
    html: `<div class="paper"><b>ADAYLIK İMZA LİSTESİ</b>${lines}</div>
      <div class="sc-counter"><span>İmza oranı (gereken %${Math.round(a.need)})</span><b id="cnt">%0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.value, { fmt: v => '%' + v.toFixed(1).replace('.', ',') }); },
    ms: 2000,
  };
}

function sceneDelegates(s, a) {
  const n = 36, conv = Math.max(1, Math.min(n, Math.round(Math.abs(a.change) * 6)));
  let ring = '';
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; ring += `<circle class="${i < conv ? 'convert' : ''}" style="--c:${a.color};animation-delay:${400 + i * 60}ms" cx="${180 + Math.cos(t) * 120}" cy="${100 + Math.sin(t) * 70}" r="7" fill="#C9D1DE"/>`; }
  return {
    cls: 'sc-deleg',
    html: `<svg viewBox="0 0 360 200" class="sc-svg"><rect width="360" height="200" fill="#16264D"/>${ring}</svg>
      <div class="sc-center">🤝</div><div class="sc-counter"><span>${esc(a.province || a.faction || '')}</span><b id="cnt">0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.change, { fmt: v => (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' puan' }); },
    ms: 2000,
  };
}

function sceneGeneric(s, action) {
  return { cls: 'sc-generic', html: `<div class="sc-center big">${action.icon}</div>`, ms: 900 };
}

function buildScene(s, action, a) {
  switch (a?.kind) {
    case 'rally': return sceneRally(s, a);
    case 'visit': return sceneVisit(s, a);
    case 'social': return sceneSocial(s, a);
    case 'press': return scenePress(s, a);
    case 'org': return sceneOrg(s, a);
    case 'strengthen': return sceneStrengthen(s, a);
    case 'members': return sceneMembers(s, a);
    case 'money': return sceneMoney(s, a);
    case 'congress': return sceneCongress(s, a);
    case 'meeting': return sceneMeeting(s, a);
    case 'training': return sceneTraining(s, a);
    case 'signatures': return sceneSignatures(s, a);
    case 'delegates': case 'faction': return sceneDelegates(s, a);
    default: return sceneGeneric(s, action);
  }
}

// Basın açıklaması sonrası medya duvarı
function mediaWall(s, a) {
  const R = a.reactions;
  const toneCls = t => t === 'pos' ? 'pos' : t === 'neg' ? 'neg' : 'neu';
  return `<section class="mw"><div class="mw-h">Yarının manşetleri</div>
    <div class="papers">${R.papers.map((p, i) => `<article class="paper-mini ${p.font} ${toneCls(p.tone)}" style="animation-delay:${i * 180}ms">
      <header style="border-color:${p.color}"><b style="color:${p.color}">${esc(p.name)}</b><span>${esc(p.motto)} · ${fmtDate(s.date)}</span></header>
      <h4>${esc(p.headline)}</h4><p>${esc(p.sub)}</p><div class="pm-photo"></div></article>`).join('')}</div>
    <div class="mw-h">Sosyal medyada halk</div>
    <div class="posts">${R.people.map((c, i) => `<div class="post ${toneCls(c.tone)}" style="animation-delay:${600 + i * 160}ms"><div><b>${esc(c.name)}</b> <span class="muted">· ${esc(c.who)}</span></div><p>${esc(c.text)}</p><span class="muted small">❤ ${fmtInt(c.likes)}</span></div>`).join('')}</div>
    <div class="mw-h">Siyasi tepkiler <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">(oyun içi kurgu, özet)</span></div>
    <div class="reacts">
      <div class="react ${toneCls(R.gov.tone)}"><b>🏛️ Hükümet kanadı</b><p>${esc(R.gov.text)}</p></div>
      ${R.rival ? `<div class="react ${toneCls(R.rival.tone)}"><b><i class="swatch" style="background:${R.rival.color}"></i> ${esc(R.rival.party)}</b><p>${esc(R.rival.text)}</p></div>` : ''}
      <div class="react"><b>📺 ${esc(R.pundit.name)}</b><p>“${esc(R.pundit.text)}”</p></div>
    </div>
    <div class="mw-h">Flaş anket: Açıklamaya katılıyor musunuz?</div>
    <div class="fpoll">${[['Evet', R.poll.yes, 'var(--good)'], ['Hayır', R.poll.no, 'var(--bad)'], ['Fikrim yok', R.poll.dk, '#8C96A8']].map(([l, v, c]) => `<div class="fp"><span>${l}</span><div class="fpbar"><div style="--w:${(100 * v).toFixed(0)}%;background:${c}"></div></div><b>%${Math.round(100 * v)}</b></div>`).join('')}</div>
  </section>`;
}

function playSound(a, res) {
  switch (a?.kind) {
    case 'rally':
      if (a.empty) sfx('murmur'); else sfx(a.packed ? 'cheer' : 'applause', 0.2);
      if (a.weather === 'yagmur') sfx('rain');
      if (a.gaffe) sfx('boo', 1.3);
      break;
    case 'visit': [0.4, 0.7, 1.0, 1.3].forEach(t => sfx('pop', t)); break;
    case 'social': sfx('notif', 0.3); if (a.viral) sfx('cheer', 1.1); else if (a.backfire) sfx('boo', 1.1); break;
    case 'press': sfx('flashes', 0.1); break;
    case 'org': sfx('whoosh'); for (let i = 0; i < Math.min(8, a.plates.length); i++) sfx('ding', 0.3 + i * 0.14); break;
    case 'strengthen': case 'members': sfx('whoosh'); sfx('pop', 0.6); sfx('pop', 0.9); break;
    case 'money': if (a.bad) { sfx('coins'); sfx('lose', 1.4); } else sfx('coins'); break;
    case 'congress': sfx('cheer', 0.2); break;
    case 'meeting': sfx('murmur'); sfx('gavel', 1.6); break;
    case 'training': [0.3, 0.7, 1.1, 1.5].forEach(t => sfx('tick', t)); sfx('ding', 1.8); break;
    case 'signatures': for (let i = 0; i < 6; i++) sfx('tick', i * 0.26); break;
    case 'delegates': case 'faction': sfx(a.change >= 0 ? 'applause' : 'murmur', 0.4); break;
    default: sfx('click');
  }
  if (res.bad && !['rally', 'money', 'social'].includes(a?.kind)) sfx('lose', 1);
}

export function playCinema(ctx, action, res, { onClose } = {}) {
  const s = ctx.state;
  const a = res.anim;
  const sc = buildScene(s, action, a);
  const o = el(`<div class="cine" role="dialog" aria-modal="true" aria-label="${esc(action.label)}">
    <div class="cine-stage ${sc.cls}" id="cstage">${sc.html}<div class="cine-skip">Atlamak için dokun</div></div>
    <div class="cine-panel" id="cpanel" hidden>
      <div class="eyebrow">${esc(action.label)}${res.cost ? ' · ' + esc(fmtMoney(res.cost)) : ''}</div>
      <h2 class="${res.bad ? 'bad' : ''}">${esc(res.title)}</h2>
      <ul class="cine-lines">${res.lines.map((l, i) => `<li style="animation-delay:${120 + i * 140}ms">${esc(l)}</li>`).join('')}</ul>
      ${a?.kind === 'press' ? mediaWall(s, a) : ''}
      <div class="grid2"><button class="btn" data-a="close">Tamam</button>${s.player.ap > 0 ? '<button class="btn primary" data-a="more">Başka eylem</button>' : '<button class="btn primary" data-a="end">Turu bitir</button>'}</div>
    </div></div>`);
  document.body.appendChild(o);
  const stage = o.querySelector('#cstage');
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    stage.classList.add('done');
    o.querySelector('#cpanel').hidden = false;
    o.querySelector('#cpanel').scrollIntoView?.({ block: 'nearest' });
  };
  playSound(a, res);
  if (reduced()) { stage.classList.add('instant'); sc.start?.(stage); finish(); }
  else { sc.start?.(stage); setTimeout(finish, sc.ms); }
  stage.addEventListener('click', () => { stage.classList.add('instant'); finish(); });
  const close = () => { o.remove(); onClose && onClose(); };
  o.querySelector('[data-a=close]').onclick = close;
  o.querySelector('[data-a=more]')?.addEventListener('click', () => { close(); ctx.go('kampanya'); });
  o.querySelector('[data-a=end]')?.addEventListener('click', () => { close(); ctx.endTurn(); });
}
