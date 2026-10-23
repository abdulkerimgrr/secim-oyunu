// Eylem animasyonları: her eylem türü için kısa sahne + animasyonlu sonuç paneli.
// Sahneye dokunmak animasyonu atlar; "hareketi azalt" ayarında doğrudan son kare gösterilir.
import { MEDIA } from '../data/media.js';
import { fmtFxValue } from '../engine/metrics.js';
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
  const fill = Math.max(0.03, Math.min(1.1, a.crowd / a.capacity));
  const salon = a.venue === 'salon';
  const shirts = ['#2B3A55', '#6B7280', '#9CA3AF', '#B91C1C', '#1D4ED8', '#F5F5F4', '#065F46', '#7C2D12', a.color, a.color, '#111827'];
  const skins = ['#F2C6A6', '#D9A47F', '#B07A55', '#8A5A3B'];
  const hairs = ['#1E1A18', '#3B2A20', '#6B4A2E', '#9A9A9A'];
  let people = '', k = 0;
  // 8 sıra: arkada küçük, önde büyük; doluluk kadar kişi
  for (let row = 0; row < 8; row++) {
    const y = 112 + row * row * 1.35 + row * 6.5;
    const sz = 2.6 + row * 0.9;
    const step = sz * 2.3;
    for (let x = -6 + (row % 2) * step / 2; x < 366; x += step) {
      if (Math.random() > fill * (a.empty ? 0.25 : 1)) continue;
      const xx = x + rnd(-1.5, 1.5), d = (k++ * 6) % 1400;
      const shirt = shirts[(Math.random() * shirts.length) | 0];
      people += `<g class="pop" style="animation-delay:${d}ms">
        <ellipse cx="${xx.toFixed(1)}" cy="${(y + sz * 1.9).toFixed(1)}" rx="${(sz * 1.25).toFixed(1)}" ry="${(sz * 1.4).toFixed(1)}" fill="${shirt}"/>
        <circle cx="${xx.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz.toFixed(1)}" fill="${skins[(Math.random() * 4) | 0]}"/>
        <path d="M${(xx - sz).toFixed(1)} ${(y - sz * 0.2).toFixed(1)} A${sz} ${sz} 0 0 1 ${(xx + sz).toFixed(1)} ${(y - sz * 0.2).toFixed(1)}" fill="${hairs[(Math.random() * 4) | 0]}"/>
        ${Math.random() < 0.18 && !a.empty ? `<line class="arm" x1="${(xx + sz).toFixed(1)}" y1="${(y + sz).toFixed(1)}" x2="${(xx + sz * 1.6).toFixed(1)}" y2="${(y - sz * 1.8).toFixed(1)}" stroke="${skins[0]}" stroke-width="${(sz * 0.55).toFixed(1)}" stroke-linecap="round"/>` : ''}
        ${Math.random() < 0.08 && !a.empty ? `<rect class="phone-flash" style="animation-delay:${rnd(600, 2400) | 0}ms" x="${(xx + sz * 1.3).toFixed(1)}" y="${(y - sz * 2.4).toFixed(1)}" width="${(sz * 0.8).toFixed(1)}" height="${(sz * 1.2).toFixed(1)}" fill="#E8F0FF"/>` : ''}
        ${Math.random() < 0.05 && !a.empty ? `<g class="flag"><line x1="${xx}" y1="${y}" x2="${xx}" y2="${y - sz * 6}" stroke="#555" stroke-width="0.8"/><rect x="${xx}" y="${y - sz * 6}" width="${sz * 3}" height="${sz * 1.9}" fill="${a.color}"/></g>` : ''}
      </g>`;
    }
  }
  let chairs = '';
  if (a.empty) for (let r = 0; r < 5; r++) for (let c = 0; c < 16; c++) chairs += `<rect x="${14 + c * 21 + r * 2}" y="${126 + r * 14}" width="${11 + r}" height="${6 + r}" rx="1.5" fill="#8C95A8" opacity=".75"/>`;
  return {
    cls: 'sc-rally real',
    html: `<svg viewBox="0 0 360 200" class="sc-svg" preserveAspectRatio="xMidYMax slice">
        <defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${salon ? '#0C1226' : '#18264D'}"/><stop offset=".7" stop-color="${salon ? '#151E3D' : '#C9714A'}"/><stop offset="1" stop-color="${salon ? '#1B2647' : '#E9A25F'}"/></linearGradient>
          <radialGradient id="spot" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#FFF6D5" stop-opacity=".55"/><stop offset="1" stop-color="#FFF6D5" stop-opacity="0"/></radialGradient></defs>
        <rect width="360" height="200" fill="url(#sky2)"/>
        ${salon ? '' : '<path d="M0 104 L0 66 L18 66 L18 50 L40 50 L40 74 L64 74 L64 44 L76 36 L88 44 L88 80 L122 80 L122 58 L150 58 L150 86 L210 86 L210 54 L222 46 L234 54 L234 84 L272 84 L272 62 L300 62 L300 78 L330 78 L330 56 L360 56 L360 104 Z" fill="#101A36" opacity=".9"/>'}
        <!-- sahne, truss ve LED ekran -->
        <rect x="96" y="96" width="168" height="16" fill="#0A0F1F"/><rect x="92" y="93" width="176" height="4" fill="${a.color}"/>
        <path d="M100 96 V22 H260 V96" fill="none" stroke="#5B6478" stroke-width="2.5"/><path d="M100 30 H260 M100 40 L112 22 M248 22 L260 40" stroke="#5B6478" stroke-width="1"/>
        <rect x="128" y="34" width="104" height="52" rx="2" fill="#05070D"/>
        <rect x="104" y="24" width="152" height="9" fill="${a.color}"/><text x="180" y="31.5" text-anchor="middle" font-size="7" font-weight="700" fill="${textOn(a.color)}" font-family="Barlow Condensed, sans-serif" letter-spacing="1">${esc(a.short)} · ${esc(a.province.toLocaleUpperCase('tr'))}</text>
        <path class="beam" d="M106 26 L60 200 L150 200 Z" fill="url(#spot)"/><path class="beam b2" d="M254 26 L210 200 L300 200 Z" fill="url(#spot)"/>
        ${chairs}${people}
      </svg>
      <div class="sc-led">${avatarSvg(s.player.character, { size: 120, bg: mixColor('#101828', a.color, 0.35) })}</div>
      <div class="sc-speaker">${avatarSvg(s.player.character, { size: 56, bg: 'transparent' })}</div>
      ${a.gaffe ? '<div class="sc-alert">⚠️</div>' : ''}${(a.packed || (!a.empty && a.fit > 1.05)) ? confetti(a.color) : ''}
      ${a.weather === 'yagmur' ? precip('rain') : a.weather === 'kar' ? precip('snow') : ''}
      ${a.transport ? '<div class="sc-bus">🚌🚌🚌</div>' : ''}
      ${a.speech ? `<div class="sc-speech">“${esc(a.speech)}”</div>` : ''}
      <div class="sc-counter"><span>Katılım</span><b id="cnt">0</b></div>`,
    start(stage) { countUp(stage.querySelector('#cnt'), a.crowd, { ms: 1800 }); },
    ms: 2600,
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
      ${(a.icons || ['🤝', '☕', '👋', '🫖', '😊']).map((e, i) => `<span class="sc-bubble" style="left:${12 + i * 19}%;animation-delay:${400 + i * 300}ms">${e}</span>`).join('')}
      <div class="sc-counter"><span>${esc(a.province)}</span><b>${esc(a.label || 'Mahalle ziyareti')}</b></div>`,
    ms: 2200,
  };
}

function sceneSocial(s, a) {
  const def = SOCIAL_CAMPAIGNS.find(d => d.id === a.def);
  const me = playerParty(s);
  const tone = a.viral ? 'pos' : a.backfire ? 'neg' : 'neu';
  const cmtList = [...CITIZENS].sort(() => Math.random() - 0.5).slice(0, 3).map((c, i) => {
    const t = i === 2 && !a.viral ? 'neg' : tone === 'neu' ? (i ? 'neu' : 'pos') : tone;
    return [c.name, CITIZEN_LINES[t][Math.floor(Math.random() * CITIZEN_LINES[t].length)]];
  });
  const cmts = cmtList.map(([n, t], i) => `<div class="ph-cmt" style="animation-delay:${900 + i * 450}ms"><b>${esc(n)}</b> ${esc(t)}</div>`).join('');
  const handle = '@' + me.short.toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşöçı]/g, '') + 'genelmerkez';
  const av = avatarSvg(s.player.character, { size: 30, bg: mixColor('#FFFFFF', me.color, 0.3) });
  const stats = `<div class="ph-stats"><span>👁 <b id="sv">0</b></span><span>❤️ <b id="sl">0</b></span><span>🔁 <b id="ss">0</b></span><span>💬 <b id="sc">0</b></span></div>`;
  const media = `<div class="ph-media" style="background:linear-gradient(135deg, ${me.color}, ${mixColor(me.color, '#14213D', 0.5)})"><span>${def.icon}</span></div>`;
  let inner;
  switch (def.skin || def.id) {
    case 'kisavideo': inner = `<div class="tt"><div class="tt-video" style="background:linear-gradient(160deg, ${me.color}, #0B0F1A)">${avatarSvg(s.player.character, { size: 110, bg: 'transparent', mood: 'smile' })}</div>
      <div class="tt-side"><span>❤️<b id="sl">0</b></span><span>💬<b id="sc">0</b></span><span>↗️<b id="ss">0</b></span></div>
      <div class="tt-cap"><b>${esc(handle)}</b><p>${esc(def.post)} #siyaset #seçim</p><small>♪ kampanya müziği · orijinal ses</small></div><div class="tt-views">▶ <b id="sv">0</b></div></div>`; break;
    case 'etiket': inner = `<div class="xw"><div class="x-head">𝕏</div><div class="x-post"><div class="row" style="gap:6px;flex-wrap:nowrap"><div class="ph-av">${av}</div><div><b>${esc(me.short)}</b> <span class="muted">${esc(handle)} · 1 dk</span></div></div>
      <p>${esc(def.post)} 🇹🇷</p><div class="x-trend">Gündemde: <b>#DeğişimZamanı</b></div>${stats}</div><div class="ph-cmts">${cmts}</div></div>`; break;
    case 'hedefli': inner = `<div class="fb"><div class="fb-head">facebook</div><div class="ph-post"><div class="row" style="gap:6px;flex-wrap:nowrap"><div class="ph-av">${av}</div><div><b>${esc(me.name)}</b><div class="small muted">Sponsorlu · 🌐</div></div></div><p>${esc(def.post)}</p>${media}<div class="fb-cta">Daha fazla bilgi al</div>${stats}</div><div class="ph-cmts">${cmts}</div></div>`; break;
    case 'gorsel': case 'canli': inner = `<div class="ig"><div class="ig-bars"><i></i><i></i><i></i></div><div class="row ig-top" style="gap:6px;flex-wrap:nowrap"><div class="ph-av ig-ring">${av}</div><b>${esc(handle)}</b>${def.id === 'canli' ? '<span class="ig-live">CANLI</span>' : ''}</div>
      <div class="ig-img" style="background:linear-gradient(200deg, ${me.color}, #F58529, #DD2A7B)">${avatarSvg(s.player.character, { size: 110, bg: 'transparent', mood: 'smile' })}</div>
      <div class="ig-cap">${esc(def.post)}</div>${stats}<div class="ph-cmts">${cmts}</div></div>`; break;
    case 'uzunvideo': inner = `<div class="yt"><div class="yt-player" style="background:linear-gradient(135deg, #111, ${mixColor('#111111', me.color, 0.5)})">${avatarSvg(s.player.character, { size: 90, bg: 'transparent' })}<div class="yt-prog"><i></i></div><span class="yt-time">12:34 / 48:10</span></div>
      <div class="yt-meta"><b>${esc(def.post)}</b><div class="row" style="gap:6px;flex-wrap:nowrap;margin-top:4px"><div class="ph-av">${av}</div><span class="small">${esc(me.short)} TV</span><span class="yt-sub">Abone ol</span></div></div>${stats}<div class="ph-cmts">${cmts}</div></div>`; break;
    case 'mesajlasma': inner = `<div class="wa"><div class="wa-head">💬 Mahalle Dayanışma Grubu <small>256 üye</small></div><div class="wa-chat">
      <div class="wa-msg out" style="animation-delay:200ms"><small>↪ İletildi</small>${esc(def.post)}</div>
      ${cmtList.map(([n, t], i) => `<div class="wa-msg in" style="animation-delay:${700 + i * 450}ms"><b>${esc(n)}</b>${esc(t)}</div>`).join('')}
      <div class="wa-msg out" style="animation-delay:2100ms">📍 Konum paylaşıldı</div></div><div class="wa-foot">👁 <b id="sv">0</b> · ↪ <b id="ss">0</b> kez iletildi <span style="display:none"><b id="sl"></b><b id="sc"></b></span></div></div>`; break;
    case 'sarki': inner = `<div class="sp"><div class="sp-cover" style="background:linear-gradient(135deg, ${me.color}, #191414)"><span>🎵</span><b>${esc(me.short)}</b></div><div class="sp-title"><b>${esc(me.short)} Marşı</b><small>${esc(me.name)} · Kampanya şarkısı</small></div>
      <div class="sp-wave">${Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${i * 60}ms"></i>`).join('')}</div><div class="sp-bar"><i></i></div>${stats}</div>`; break;
    case 'teyit': inner = `<div class="tey"><div class="tey-head">🛡️ Teyit Masası</div><div class="tey-row"><span>Tespit edilen yanlış iddia</span><b id="sc">0</b></div><div class="tey-row"><span>Yayılan düzeltme</span><b id="ss">0</b></div><div class="tey-row"><span>Erişim</span><b id="sv">0</b></div><div class="tey-row"><span>Destek</span><b id="sl">0</b></div><div class="tey-shield">KALKAN AKTİF · 6 hafta</div></div>`; break;
    default: inner = `<div class="ph-bar" style="background:${def.color}">${def.icon} ${esc(def.platform)}</div><div class="ph-post"><p>${esc(def.post)}</p>${media}${stats}</div><div class="ph-cmts">${cmts}</div>`;
  }
  const aud = Object.entries(def.audience).sort((x, y) => y[1] - x[1]).filter(([, v]) => v >= 0.5).map(([k]) => CLUSTERS.find(c => c.id === k).label);
  return {
    cls: 'sc-social',
    html: `<div class="phone p-${def.id}"><div class="ph-notch"></div>${inner}
        ${a.viral ? '<div class="ph-viral">🔥 VİRAL</div>' : a.backfire ? '<div class="ph-viral bad">😬 TERS TEPTİ</div>' : ''}
        ${a.viral || def.id === 'canli' ? hearts() : ''}
      </div>
      <div class="sc-aud">${def.platform} · ${aud.length ? 'Hedef kitle: ' + aud.map(esc).join(' · ') : 'dezenformasyonla mücadele'}</div>`,
    start(stage) {
      countUp(stage.querySelector('#sv'), a.views, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#sl'), a.likes, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#ss'), a.shares, { ms: 2000, fmt: compact });
      countUp(stage.querySelector('#sc'), a.comments, { ms: 2000, fmt: compact });
    },
    ms: 2700,
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

function scenePolVisit(s, a) {
  const me = playerParty(s);
  if (!a.ok) return { cls: 'sc-polvisit', html: `<div class="pv-door"><div class="pv-sign">Randevu verilmedi</div><span>🚪</span></div>`, ms: 1400 };
  return {
    cls: 'sc-polvisit',
    html: `<div class="pv-room"><div class="pv-flag l" style="background:${me.color}"></div><div class="pv-flag r" style="background:${a.hostColor}"></div><div class="pv-flag tr"></div>
      <div class="pv-table"></div>
      <div class="pv-guest">${avatarSvg(s.player.character, { size: 80, bg: 'transparent', mood: a.mood === 'mesafeli' ? 'serious' : 'smile' })}</div>
      <div class="pv-host"><div class="pv-host-head" style="background:${a.hostColor}">${esc(a.hostShort)}</div><div class="pv-host-body"></div></div>
      <div class="pv-shake">🤝</div></div>
      <div class="pr-quote" style="top:auto;bottom:10px">${esc(a.host)} · görüşme ${esc(a.mood)} geçti</div>
      ${Array.from({ length: 6 }, () => `<i class="flash" style="left:${rnd(5, 92)}%;top:${rnd(10, 60)}%;animation-delay:${rnd(300, 1800) | 0}ms"></i>`).join('')}`,
    ms: 2200,
  };
}

const CITY_POS = { bruksel: [22, 30], washington: [6, 40], berlin: [30, 26], moskova: [48, 18], doha: [60, 62], baku: [62, 40] };
function sceneForeign(s, a) {
  const [x, y] = CITY_POS[a.dest] || [30, 30];
  const ax = 46, ay = 46; // Ankara
  return {
    cls: 'sc-foreign',
    html: `<svg viewBox="0 0 100 70" class="sc-svg" preserveAspectRatio="xMidYMid slice"><rect width="100" height="70" fill="#0B1A33"/>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${8 + i * 7} Q50 ${4 + i * 7} 100 ${8 + i * 7}" stroke="rgba(255,255,255,.05)" fill="none"/>`).join('')}
        <path d="M5 30 Q20 18 40 22 Q55 15 70 22 Q85 26 96 34 L96 52 Q80 60 60 56 Q40 64 20 54 Q8 48 5 30Z" fill="#1F3A64"/>
        <path id="route" class="route" d="M${ax} ${ay} Q${(ax + x) / 2} ${Math.min(ay, y) - 16} ${x} ${y}" stroke="#FFC93C" stroke-width=".7" stroke-dasharray="2 1.5" fill="none"/>
        <circle cx="${ax}" cy="${ay}" r="1.4" fill="#D7263D"/><text x="${ax + 2}" y="${ay + 3}" font-size="3" fill="#fff">Ankara</text>
        <circle class="dest" cx="${x}" cy="${y}" r="1.8" fill="#FFC93C"/><text x="${x + 2.4}" y="${y - 1.5}" font-size="3.4" fill="#fff" font-weight="700">${esc(a.city)}</text>
        <text font-size="5" text-anchor="middle" dominant-baseline="middle">✈️<animateMotion dur="2s" fill="freeze" rotate="auto" path="M${ax} ${ay} Q${(ax + x) / 2} ${Math.min(ay, y) - 16} ${x} ${y}"/></text></svg>
      <div class="fg-flag">${a.icon}</div>`,
    ms: 2300,
  };
}

function sceneCb(s, a) {
  return {
    cls: 'sc-cb',
    html: `<div class="cb-desk"><div class="cb-seal">☾★</div><div class="cb-doc"><b>T.C. CUMHURBAŞKANLIĞI</b><span>${esc(a.label)}</span><svg viewBox="0 0 120 20"><path class="sig" d="M2 14 C12 2 18 18 28 8 S44 4 52 12 S70 2 80 10 S100 16 118 6" fill="none" stroke="#1F3A8A" stroke-width="2"/></svg></div><div class="cb-pen">🖊️</div></div>
      ${a.ok === false ? '<div class="stamp">RET</div>' : ''}`,
    ms: 1800,
  };
}

function sceneStudio(s, a) {
  const me = playerParty(s);
  return {
    cls: 'sc-studio',
    html: `<div class="st-bg" style="background:radial-gradient(120% 90% at 50% 10%, ${mixColor('#1B2A4A', me.color, 0.25)}, #070C18)"></div>
      <div class="st-onair">● ${a.channel ? 'CANLI' : 'YAYINDA'}</div>
      <div class="st-logo">${a.icon} ${esc(a.channel || a.label)}</div>
      <div class="st-host">${avatarSvg(s.player.character, { size: 110, bg: 'transparent', mood: a.bad ? 'tense' : 'smile' })}</div>
      <div class="st-desk" style="border-top-color:${me.color}"></div>
      <div class="st-lower"><b>${esc(s.player.name)}</b><span>${esc(me.short)} Genel Başkanı · ${esc(a.label)}</span></div>
      <div class="st-meter"><span>İzlenme</span><b id="st-v">0</b></div>`,
    ms: 2200,
    start(stage) { countUp(stage.querySelector('#st-v'), Math.round(rnd(180, 2400)) * 1000, { ms: 1800 }); },
  };
}

function scenePromise(s, a) {
  const me = playerParty(s);
  return {
    cls: 'sc-promise',
    html: `<div class="pm-stage" style="background:linear-gradient(180deg, ${mixColor('#0E1730', me.color, 0.35)}, #0E1730)">
      <div class="pm-banner" style="background:${me.color}"><span>${a.icon}</span><b>${esc(a.label)}</b></div>
      <div class="pm-speaker">${avatarSvg(s.player.character, { size: 96, bg: 'transparent' })}</div>
      <div class="pm-cost ${a.bad ? 'bad' : ''}">Yıllık maliyet<b>₺${a.cost} milyar</b></div></div>`,
    ms: 2200,
  };
}

function sceneOppo(s, a) {
  return {
    cls: 'sc-oppo',
    html: `<div class="op-desk"><div class="op-file ${a.dirty ? 'dirty' : ''}"><span class="op-tab" style="background:${a.targetColor}">${esc(a.target)}</span><b>${a.dirty ? 'GİZLİ' : 'DOSYA'}</b><i>${a.icon}</i><small>${esc(a.label)}</small></div>
      ${a.bad ? '<div class="stamp">İFŞA</div>' : ''}</div>`,
    ms: 1900,
  };
}

function sceneInfra(s, a) {
  return {
    cls: 'sc-infra',
    html: `<div class="if-card"><span class="if-ico">${a.icon}</span><b>${esc(a.label)}</b><div class="if-lvl">${[1, 2, 3, 4].map(i => `<i class="${i <= a.level ? 'on' : ''}" style="animation-delay:${i * 220}ms;${i <= a.level ? `background:${a.color}` : ''}"></i>`).join('')}</div><small>Seviye ${a.level} / 4</small></div>`,
    ms: 1700,
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
    case 'polvisit': return scenePolVisit(s, a);
    case 'foreign': return sceneForeign(s, a);
    case 'cb': return sceneCb(s, a);
    case 'studio': return sceneStudio(s, a);
    case 'promise': return scenePromise(s, a);
    case 'oppo': return sceneOppo(s, a);
    case 'infra': return sceneInfra(s, a);
    default: return sceneGeneric(s, action);
  }
}

// Eylem metrikleri
const AGE_BY_CLUSTER = { kararsiz: [0.45, 0.3, 0.17, 0.08], sol: [0.35, 0.35, 0.2, 0.1], laik_kentli: [0.2, 0.35, 0.3, 0.15], muhafazakar: [0.1, 0.2, 0.38, 0.32], milliyetci: [0.18, 0.27, 0.33, 0.22], dindar: [0.12, 0.22, 0.36, 0.3], kurt: [0.3, 0.3, 0.25, 0.15] };
function metrics(s, action, res) {
  const a = res.anim || {}, out = [];
  const im = res.impact;
  if (a.kind === 'rally') {
    out.push(['Katılım', fmtInt(a.crowd)], ['Doluluk', '%' + Math.round(Math.min(1.15, a.crowd / a.capacity) * 100)],
      ['Haber sayısı', fmtInt(Math.round(6 + a.crowd / 1500 + (a.packed ? 18 : 0) + (a.gaffe ? 25 : 0) + (a.empty ? 12 : 0)))],
      ['Sosyal medya etkileşimi', compact(a.crowd * rnd(4, 9))], ['Kişi başı maliyet', res.cost ? fmtMoney(res.cost / Math.max(1, a.crowd)) : '—']);
  } else if (a.kind === 'social') {
    const def = SOCIAL_CAMPAIGNS.find(d => d.id === a.def);
    const eng = (a.likes + a.shares + a.comments) / Math.max(1, a.views);
    out.push(['Erişim', compact(a.views)], ['Etkileşim oranı', '%' + (100 * eng).toFixed(1).replace('.', ',')], ['Yeni takipçi', compact(a.views * 0.004)], ['Bin gösterim maliyeti', res.cost ? fmtMoney(res.cost / Math.max(1, a.views / 1000)) : '—']);
    const age = [0, 0, 0, 0]; let tot = 0;
    for (const [k, w] of Object.entries(def.audience)) { const d = AGE_BY_CLUSTER[k] || [0.25, 0.25, 0.25, 0.25]; d.forEach((v, i) => age[i] += v * w); tot += w; }
    if (tot) out.age = age.map(v => v / tot);
  } else if (a.kind === 'press') {
    const P = a.reactions.papers; const pos = P.filter(p => p.tone === 'pos').length, neg = P.filter(p => p.tone === 'neg').length;
    out.push(['Olumlu manşet', `${pos}/${P.length}`], ['Olumsuz manşet', `${neg}/${P.length}`], ['Flaş anket desteği', '%' + Math.round(a.reactions.poll.yes * 100)], ['Haber sayısı', fmtInt(Math.round(15 + rnd(0, 30) + Math.max(0, a.score) * 40))]);
  }
  if (im && Math.abs(im.nat) > 0.00001) out.push(['Tahmini oy etkisi (Türkiye)', `${im.nat >= 0 ? '+' : '−'}${Math.abs(100 * im.nat).toFixed(2).replace('.', ',')} puan`]);
  if (im && im.prov !== null && im.prov !== undefined && Math.abs(im.prov) > 0.00001) out.push([`Tahmini oy etkisi (${im.provName})`, `${im.prov >= 0 ? '+' : '−'}${Math.abs(100 * im.prov).toFixed(2).replace('.', ',')} puan`]);
  return out;
}
function metricsHtml(m) {
  if (!m.length && !m.age) return '';
  return `<div class="mgrid">${m.map(([l, v], i) => `<div class="mtile" style="animation-delay:${200 + i * 90}ms"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${m.age ? `<div class="mw-h">Erişilen kitlenin yaş dağılımı (tahmini)</div><div class="fpoll">${['18–24', '25–34', '35–54', '55+'].map((l, i) => `<div class="fp"><span>${l}</span><div class="fpbar"><div style="--w:${Math.round(m.age[i] * 100)}%;background:var(--ink-2)"></div></div><b>%${Math.round(m.age[i] * 100)}</b></div>`).join('')}</div>` : ''}`;
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
    case 'polvisit': if (a.ok) { sfx('flashes', 0.3); sfx('applause', 0.6, 1); } else sfx('lose'); break;
    case 'foreign': sfx('whoosh'); sfx('whoosh', 0.8); sfx('ding', 2); break;
    case 'cb': sfx('gavel'); sfx(a.ok === false ? 'lose' : 'ding', 1.2); break;
    case 'studio': sfx('jingle'); if (a.bad) sfx('murmur', 1.2); break;
    case 'promise': sfx('applause', 0.4); if (a.bad) sfx('murmur', 1.4); break;
    case 'oppo': sfx('whoosh'); sfx(a.bad ? 'lose' : 'ding', 1.1); break;
    case 'infra': [0.2, 0.42, 0.64, 0.86].slice(0, a.level).forEach(t => sfx('pop', t)); sfx('ding', 1.1); break;
    default: sfx('click');
  }
  if (res.bad && !['rally', 'money', 'social'].includes(a?.kind)) sfx('lose', 1);
}

export function playCinema(ctx, action, res, { onClose } = {}) {
  const s = ctx.state;
  const a = res.anim;
  let sc = buildScene(s, action, a);
  // Üretilmiş medya varsa (tools/openai-*.mjs → data/media.js) sahneyi onunla değiştir
  const pick = pre => a?.kind && (MEDIA[`${pre}:${a.kind}:${a.sub}`] || MEDIA[`${pre}:${a.kind}`]);
  const vid = pick('video'), pic = pick('scene');
  if (vid || pic) sc = { cls: 'sc-media', ms: vid ? 3200 : 2200, html: `${vid ? `<video class="cine-media" src="${vid}" autoplay muted playsinline></video>` : `<img class="cine-media kb" src="${pic}" alt="">`}<div class="cine-cap">${esc(res.title)}</div>` };
  const o = el(`<div class="cine" role="dialog" aria-modal="true" aria-label="${esc(action.label)}">
    <div class="cine-stage ${sc.cls}" id="cstage">${sc.html}<div class="cine-skip">Atlamak için dokun</div></div>
    <div class="cine-panel" id="cpanel" hidden>
      <div class="eyebrow">${esc(action.label)}${res.cost ? ' · ' + esc(fmtMoney(res.cost)) : ''}</div>
      <h2 class="${res.bad ? 'bad' : ''}">${esc(res.title)}</h2>
      <ul class="cine-lines">${res.lines.map((l, i) => `<li style="animation-delay:${120 + i * 140}ms">${esc(l)}</li>`).join('')}</ul>
      ${res.fx?.length ? `<div class="fx-chips">${res.fx.map((x, i) => `<span class="fx ${(x.k === 'heat' ? -x.v : x.v) >= 0 ? 'up' : 'down'}" style="animation-delay:${150 + i * 90}ms">${esc(x.label)} <b>${esc(fmtFxValue(x.k, x.v))}</b></span>`).join('')}</div>` : ''}
      ${metricsHtml(metrics(s, action, res))}
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
