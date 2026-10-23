// Yeni oyun sihirbazı
import { esc, toast } from '../dom.js';
import { START_YEARS } from '../../data/scenario2023.js';
import { PARTIES_2023, AXES } from '../../data/parties2023.js';
import { SKILLS } from '../../data/founders.js';
import { RESULTS_2023 } from '../../data/generated/results2023.js';
import { DIFFICULTY } from '../../engine/params.js';
import { newGame, generateFounders, scenarioParties, scenarioShares } from '../../engine/state.js';
import { loadGame, slotInfo, SLOTS, deleteSlot } from '../../engine/save.js';
import { soundToggleHtml, bindSoundToggle, sfx } from '../sound.js';
import { sheet } from '../dom.js';
import { audioSettingsHtml, bindAudioSettings } from '../audioSettings.js';
import { fmtDate, pct } from '../../engine/util.js';
import { LOOKS, PROFESSIONS, EDUCATION, TRAITS, ARCHETYPES, archetypeLook, randomCharacter } from '../../data/character.js';
import { charStats } from '../../engine/character.js';
import { MEDIA } from '../../data/media.js';
import { PROVINCES } from '../../data/generated/provinces.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { winners2023 } from '../bgmap.js';
import { MAP_VIEWBOX } from '../../data/generated/provinces.js';

const COLORS = ['#0B7A75', '#2E5EAA', '#6A3FA0', '#D9480F', '#C2185B', '#2F9E44', '#E8590C', '#1C7ED6', '#5C940D', '#862E9C', '#495057', '#B08900'];
const PRESETS = {
  'Merkez sağ': { eko: 0.5, din: 0.1, milli: 0.4, yerel: 0, dis: -0.2, ozg: 0.2, deger: -0.2 },
  'Sosyal demokrat': { eko: -0.5, din: -0.5, milli: 0.1, yerel: 0.3, dis: -0.3, ozg: 0.6, deger: 0.5 },
  'Milliyetçi laik': { eko: 0.2, din: -0.5, milli: 0.9, yerel: -0.6, dis: 0, ozg: -0.2, deger: 0 },
  'Muhafazakâr': { eko: 0, din: 0.8, milli: 0.4, yerel: -0.2, dis: 0.3, ozg: -0.2, deger: -0.7 },
  'Liberal': { eko: 0.8, din: -0.3, milli: -0.1, yerel: 0.4, dis: -0.7, ozg: 0.8, deger: 0.4 },
  'Yeşil sol': { eko: -0.8, din: -0.6, milli: -0.5, yerel: 0.7, dis: -0.1, ozg: 0.9, deger: 0.8 },
};
const JOIN_DIFF = { AKP: 'Neredeyse imkânsız', MHP: 'Neredeyse imkânsız', CHP: 'Zor', IYI: 'Çok zor', YSP: 'Çok zor', YENI: 'Çok zor', YRP: 'Çok zor', ZP: 'Çok zor', TIP: 'Zor', BBP: 'Çok zor', MP: 'Zor' };

let w = null;
function reset() {
  const seed = Date.now() % 2147483647;
  w = { step: 'splash', year: '2023', mode: null, joinPartyId: null, playerName: '', difficulty: 'zor', seed,
    party: { name: '', short: '', color: COLORS[0], slogan: '', ideology: { ...PRESETS['Merkez sağ'] } },
    founderPool: generateFounders(seed), founders: [], character: randomCharacter() };
}

export function renderNewGame(view, ctx) {
  if (!w) reset();
  const go = step => { w.step = step; renderNewGame(view, ctx); window.scrollTo(0, 0); };
  const back = to => `<button class="btn" data-back="${to}">← Geri</button>`;
  let html = '';

  if (w.step === 'splash') {
    html = splashHtml();
  } else if (w.step === 'year') {
    html = `<h1 style="font-size:30px">Başlangıç yılı</h1><p class="muted">Seçtiğin yılın partileri, meclisi ve ekonomisi yüklenir.</p>
      <div class="grid2">${START_YEARS.map(y => `<button class="select-card ${w.year === y.id ? 'on' : ''}" data-year="${y.id}" ${y.available ? '' : 'disabled'}>
        <div><div style="font-family:var(--f-display);font-size:26px;font-weight:700">${y.label}</div><div class="small muted">${y.id === 'bugun' ? 'Ekim 2026: güncel meclis ve ekonomi' : y.available ? 'Haziran 2023: seçim sonrası' : 'Sonraki aşamada'}</div></div></button>`).join('')}</div>
      <div class="grid2">${back('splash')}<button class="btn primary" data-next="mode">Devam</button></div>`;
  } else if (w.step === 'mode') {
    html = `<h1 style="font-size:30px">Yolunu seç</h1>
      <button class="select-card ${w.mode === 'found' ? 'on' : ''}" data-mode="found"><div><div class="t" style="font-weight:700;font-size:18px">Yeni parti kur</div>
        <div class="small muted">Sıfırdan başla: tanınırlık %1, teşkilat yok, para kısıtlı. Seçime girebilmek için 41 ilde teşkilat ve büyük kongre gerekir.</div></div></button>
      <button class="select-card ${w.mode === 'join' ? 'on' : ''}" data-mode="join"><div><div class="t" style="font-weight:700;font-size:18px">Mevcut bir partiye katıl</div>
        <div class="small muted">Gerçek bir partide kurultaya aday ol. Delege desteğini kazanırsan genel başkan olursun; kaybedersen oyun biter.</div></div></button>
      <div class="grid2">${back('year')}<button class="btn primary" data-next="${w.mode || ''}" ${w.mode ? '' : 'disabled'}>Devam</button></div>`;
  } else if (w.step === 'found') {
    const p = w.party;
    html = `<h1 style="font-size:30px">Partini kur</h1>
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <label class="f">Parti adı<input class="in" id="f-name" maxlength="40" value="${esc(p.name)}" placeholder="ör. Yarın Partisi"></label>
        <div class="grid2"><label class="f">Kısaltma<input class="in" id="f-short" maxlength="5" value="${esc(p.short)}" placeholder="ör. YP"></label>
        <label class="f">Slogan<input class="in" id="f-slogan" maxlength="50" value="${esc(p.slogan)}" placeholder="ör. Herkes için adalet"></label></div>
        <div class="f" style="font-size:13px;font-weight:600">Renk<div class="colors">${COLORS.map(c => `<button type="button" data-color="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}" aria-label="Renk ${c}"></button>`).join('')}</div></div>
      </div>
      <div class="card"><h2>İdeoloji <small>hangi seçmen kümelerine hitap edeceğini belirler</small></h2>
        <div class="chips" style="margin-bottom:10px">${Object.keys(PRESETS).map(k => `<button class="chip" data-preset="${k}">${k}</button>`).join('')}</div>
        <div style="display:flex;flex-direction:column;gap:10px">${AXES.map(a => `<div class="axis"><div class="row" style="justify-content:space-between"><b class="small">${a.label}</b></div>
          <input type="range" id="ax-${a.id}" min="-100" max="100" step="5" value="${Math.round(p.ideology[a.id] * 100)}" aria-label="${a.label}">
          <div class="ends"><span>${a.neg}</span><span>${a.pos}</span></div></div>`).join('')}</div>
      </div>
      <div class="card"><h2>Kurucu kadro <small>3 kişi seç (${w.founders.length}/3)</small></h2>
        <div class="list">${w.founderPool.map(f => `<label class="li" style="cursor:pointer"><input type="checkbox" data-founder="${f.id}" ${w.founders.includes(f.id) ? 'checked' : ''} ${!w.founders.includes(f.id) && w.founders.length >= 3 ? 'disabled' : ''}>
          <div class="grow"><div class="t">${esc(f.name)} <span class="pill good">${SKILLS[f.skill].label}</span></div><div class="small muted">${SKILLS[f.skill].desc} · yetkinlik ${Math.round(f.level * 100)} · sadakat ${f.loyalty}</div></div></label>`).join('')}</div>
        <p class="small muted">Kurucular kurgusal karakterlerdir.</p>
      </div>
      <div class="grid2">${back('mode')}<button class="btn primary" data-a="found-next">Devam</button></div>`;
  } else if (w.step === 'join') {
    const tot = {};
    for (const r of RESULTS_2023) for (const [k, v] of Object.entries(r.votes)) tot[k] = (tot[k] || 0) + v;
    const T = Object.values(tot).reduce((a, b) => a + b, 0);
    const sh = scenarioShares(w.year);
    const shareTxt = p => sh ? `anket ort.: ${pct(sh[p.id] || 0)}` : `2023: ${pct(tot[p.id] / T)}`;
    html = `<h1 style="font-size:30px">Hangi partiye?</h1><p class="muted">Genel başkan adayı olarak kurultaya gideceksin. Mevcut liderin etkisi ve delege yapısı zorluğu belirler.</p>
      <div class="list card">${scenarioParties(w.year).filter(p => !p.aggregate).map(p => `<button class="li" data-join="${p.id}" style="background:${w.joinPartyId === p.id ? '#EEF2F9' : 'none'};border:0;text-align:left;width:100%">
        <span class="badge" style="background:${p.color}">${esc(p.short)}</span>
        <div class="grow"><div class="t">${esc(p.name)}</div><div class="small muted">Genel başkan: ${esc(p.leader)} · ${shareTxt(p)}${p.kurultay ? ` · kurultay ${fmtDate(p.kurultay)}` : ' · olağanüstü kurultay senaryosu (5 ay)'}</div>${p.note ? `<div class="small muted" style="opacity:.8">${esc(p.note)}</div>` : ''}</div>
        <span class="pill ${(JOIN_DIFF[p.id] || 'Zor').startsWith('Zor') ? 'warn' : 'bad'}">${JOIN_DIFF[p.id] || 'Zor'}</span></button>`).join('')}</div>
      <div class="grid2">${back('mode')}<button class="btn primary" data-next="character" ${w.joinPartyId ? '' : 'disabled'}>Devam</button></div>`;
  } else if (w.step === 'final') {
    const c = w.character;
    html = `<h1 style="font-size:30px">Son ayarlar</h1>
      <div class="card row" style="flex-wrap:nowrap">${avatarSvg(c, { size: 84, bg: avatarBg() })}<div style="min-width:0"><div class="eyebrow">${w.mode === 'join' ? 'Genel başkan adayı' : 'Kurucu genel başkan'}</div>
        <div style="font-family:var(--f-display);font-size:24px;font-weight:700">${esc(w.playerName)}</div>
        <div class="small muted">${c.age} yaşında · ${esc(PROFESSIONS.find(p => p.id === c.profession).label)} · ${esc(PROVINCES.find(p => p.plate === +c.hometown).name)} doğumlu${c.traits.length ? ' · ' + c.traits.map(t => TRAITS.find(x => x.id === t).label).join(', ') : ''}</div></div></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        <div class="f" style="font-size:13px;font-weight:600">Zorluk<div class="chips">${Object.entries(DIFFICULTY).map(([k, d]) => `<button class="chip ${w.difficulty === k ? 'on' : ''}" data-diff="${k}">${d.label}</button>`).join('')}</div>
        <span class="small muted" style="font-weight:400">Varsayılan "Zor": küçük partiyle barajı geçmek bile büyük başarıdır.</span></div>
      </div>
      <div class="grid2">${back('character')}<button class="btn red" data-a="start">Oyunu başlat</button></div>`;
  } else if (w.step === 'character') {
    html = characterStep();
  }
  view.innerHTML = html;

  // olaylar
  view.querySelectorAll('[data-back]').forEach(b => b.onclick = () => go(b.dataset.back));
  view.querySelectorAll('[data-next]').forEach(b => b.onclick = () => b.dataset.next && go(b.dataset.next));
  view.querySelector('[data-a=new]')?.addEventListener('click', () => { reset(); go('year'); });
  view.querySelector('[data-a=continue]')?.addEventListener('click', () => { const s = loadGame('oto'); if (s) ctx.start(s); else toast('Kayıt okunamadı.'); });
  view.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { const s = loadGame(b.dataset.load); if (s) ctx.start(s); else toast('Kayıt okunamadı.'); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmDelete(b.dataset.del, () => renderNewGame(view, ctx)));
  view.querySelectorAll('[data-howto]').forEach(b => b.onclick = () => { w.howto = !w.howto; renderNewGame(view, ctx); });
  bindSoundToggle(view);
  view.querySelector('[data-a=audio]')?.addEventListener('click', () => { const sh = sheet(`<h2>Ses ve müzik</h2>${audioSettingsHtml()}`); bindAudioSettings(sh.root, { onChange: () => renderNewGame(view, ctx) }); });
  view.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { w.year = b.dataset.year; renderNewGame(view, ctx); });
  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { w.mode = b.dataset.mode; renderNewGame(view, ctx); });
  view.querySelectorAll('[data-join]').forEach(b => b.onclick = () => { w.joinPartyId = b.dataset.join; renderNewGame(view, ctx); });
  view.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { w.difficulty = b.dataset.diff; renderNewGame(view, ctx); });
  const saveForm = () => {
    const v = id => view.querySelector('#' + id);
    if (v('f-name')) { w.party.name = v('f-name').value.trim(); w.party.short = v('f-short').value.trim().toLocaleUpperCase('tr'); w.party.slogan = v('f-slogan').value.trim(); }
    for (const a of AXES) if (v('ax-' + a.id)) w.party.ideology[a.id] = +v('ax-' + a.id).value / 100;
    if (v('f-player')) w.playerName = v('f-player').value.trim();
  };
  view.querySelectorAll('input').forEach(i => i.addEventListener('change', saveForm));
  view.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { saveForm(); w.party.color = b.dataset.color; renderNewGame(view, ctx); });
  view.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { saveForm(); w.party.ideology = { ...PRESETS[b.dataset.preset] }; renderNewGame(view, ctx); });
  view.querySelectorAll('[data-founder]').forEach(c => c.onchange = () => {
    saveForm();
    const id = c.dataset.founder;
    w.founders = c.checked ? [...w.founders, id].slice(0, 3) : w.founders.filter(x => x !== id);
    renderNewGame(view, ctx);
  });
  view.querySelector('[data-a=found-next]')?.addEventListener('click', () => {
    saveForm();
    if (w.party.name.length < 3) return toast('Parti adı en az 3 harf olmalı.');
    if (w.party.short.length < 2) return toast('Kısaltma en az 2 harf olmalı.');
    if (scenarioParties(w.year).some(p => p.short.toLocaleUpperCase('tr') === w.party.short)) return toast('Bu kısaltma başka bir partiye ait.');
    if (w.founders.length !== 3) return toast('3 kurucu üye seç.');
    go('character');
  });
  if (w.step === 'character') bindCharacter(view, ctx, go);
  view.querySelector('[data-a=start]')?.addEventListener('click', () => {
    saveForm();
    const state = newGame({ character: w.character, scenario: w.year,
      mode: w.mode, seed: w.seed, difficulty: w.difficulty, playerName: w.playerName, joinPartyId: w.joinPartyId,
      party: w.party, founders: w.founderPool.filter(f => w.founders.includes(f.id)),
    });
    reset();
    ctx.start(state);
  });
}

function pinColor() { return w.mode === 'join' ? (scenarioParties(w.year).find(p => p.id === w.joinPartyId)?.color || '#C8102E') : w.party.color; }

function avatarBg() {
  const col = w.mode === 'join' ? (scenarioParties(w.year).find(p => p.id === w.joinPartyId)?.color || '#14213D') : w.party.color;
  return mixColor('#FFFFFF', col, 0.22);
}

function swatches(key, list, cur, square = false) {
  return `<div class="cc-sw ${square ? 'sq' : ''}">${list.map(c => `<button type="button" data-ch="${key}" data-v="${c}" class="${cur === c ? 'on' : ''}" style="--c:${c}" aria-label="${key} ${c}"></button>`).join('')}</div>`;
}
function chips(key, list, cur) {
  return `<div class="cc-chips">${list.map(([v, l]) => `<button type="button" class="${cur === v ? 'on' : ''}" data-ch="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
// Seçenek küçük resmi: karakterin o seçenekle hâli, ilgili bölgeden kırpılmış
const CROPS = {
  face: [24, 20, 72, 76], hairStyle: [18, 6, 84, 84], facial: [30, 48, 60, 50], eyeColor: [41, 49, 38, 17], brows: [40, 43, 40, 20],
  nose: [46, 52, 28, 24], lips: [45, 67, 30, 17], glasses: [34, 42, 52, 28], outfit: [0, 86, 120, 54], accent: [28, 94, 64, 46], earring: [62, 48, 34, 30],
};
function thumbs(key, list, cur, extra = {}) {
  const c = w.character;
  return `<div class="cc-thumbs ${key}">${list.map(([v, l]) => `<button type="button" class="cc-thumb ${cur === v ? 'on' : ''}" data-ch="${key}" data-v="${v}" title="${esc(l)}" aria-label="${esc(l)}">
    ${avatarSvg({ ...c, ...extra, [key]: v, photo: null }, { size: 100, bg: '#C9D3E3', crop: CROPS[key], pin: null })}<span>${esc(l)}</span></button>`).join('')}</div>`;
}

// Arka plan sahnesi: Meclis silueti ve bayrak (kurgusal çizim)
function sceneSvg(id) {
  const cols = Array.from({ length: 9 }, (_, i) => `<rect x="${118 + i * 18}" y="118" width="8" height="70" fill="url(#${id}b)"/>`).join('');
  return `<svg class="cc-scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2A4A"/><stop offset=".55" stop-color="#5B5A6E"/><stop offset="1" stop-color="#C08A52"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9CBB2"/><stop offset="1" stop-color="#8C7A62"/></linearGradient>
      <filter id="${id}f"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <rect width="400" height="300" fill="url(#${id}s)"/>
    <g filter="url(#${id}f)" opacity=".75">
      <path d="M100 118 L280 118 L268 100 L112 100 Z" fill="#CDBEA4"/><rect x="104" y="188" width="176" height="20" fill="#9C8A70"/>${cols}
      <rect x="182" y="70" width="16" height="30" fill="#BFAE92"/><rect x="0" y="208" width="400" height="92" fill="#3A3A44"/>
      <rect x="40" y="40" width="3" height="180" fill="#ccc"/><path d="M43 42 Q75 34 105 44 Q118 48 128 44 L128 96 Q100 104 74 94 Q58 90 43 96 Z" fill="#E30A17"/>
      <circle cx="78" cy="69" r="13" fill="#fff"/><circle cx="82" cy="69" r="10.4" fill="#E30A17"/><path d="M94 69 l-6.5 2.1 4 -5.5 v6.8 l-4 -5.5 z" fill="#fff"/>
    </g><rect width="400" height="300" fill="#0B1428" opacity=".25"/></svg>`;
}

function characterStep() {
  const c = w.character;
  const female = c.gender === 'k';
  const tab = w.charTab || 'gorunum';
  const provs = [...PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const arch = ARCHETYPES.find(a => a.id === c.archetype);
  const motto = arch?.motto || 'Bu ülke daha iyisini hak ediyor.';
  const pin = c.pin !== false ? pinColor() : null;
  const archCards = ARCHETYPES.map(a => {
    const look = archetypeLook(a);
    return `<button type="button" class="cc-arch ${c.archetype === a.id ? 'on' : ''}" data-arch="${a.id}">
      ${MEDIA['archetype:' + a.id] ? `<img class="cc-arch-img" src="${MEDIA['archetype:' + a.id]}" alt="">` : `${sceneSvg('ar' + a.id)}<div class="cc-arch-p">${avatarSvg({ ...look, pinColor: pinColor() }, { size: 150, bg: 'transparent', pin: look.pin === false ? null : pinColor() })}</div>`}
      <div class="cc-arch-t"><b>${esc(a.title.toLocaleUpperCase('tr'))}</b><span>${esc(a.tagline)}</span><i>${a.icon}</i></div></button>`;
  }).join('') + `<label class="cc-arch photo ${c.photo ? 'on' : ''}"><div class="cc-arch-t" style="position:static;background:none"><i style="font-size:34px">📷</i><b>KENDİ FOTOĞRAFIN</b><span>Yalnızca bu cihazda saklanır.</span></div><input type="file" id="f-photo" accept="image/*" hidden></label>`;

  let panel = '';
  if (tab === 'gorunum') {
    panel = `
      <div class="cc-f"><h4>Cinsiyet</h4>${chips('gender', LOOKS.gender, c.gender)}</div>
      ${c.hairStyle !== 'basortu' ? `<div class="cc-f"><h4>Yüz şekli</h4>${thumbs('face', LOOKS.face, c.face)}</div>` : ''}
      <div class="cc-f"><h4>${female ? 'Saç / başörtüsü' : 'Saç modeli'}</h4>${thumbs('hairStyle', LOOKS.hairStyle[c.gender], c.hairStyle)}</div>
      ${c.hairStyle === 'basortu' ? `<div class="cc-f"><h4>Başörtüsü rengi</h4>${swatches('scarf', LOOKS.scarf, c.scarf)}</div>` : `<div class="cc-f"><h4>Saç rengi</h4>${swatches('hairColor', LOOKS.hairColor.map(h => h[0]), c.hairColor)}</div>`}
      ${!female ? `<div class="cc-f"><h4>Sakal / bıyık</h4>${thumbs('facial', LOOKS.facial, c.facial)}</div>` : ''}
      <div class="cc-f"><h4>Ten rengi</h4>${swatches('skin', LOOKS.skin, c.skin)}</div>
      <div class="cc-f"><h4>Göz rengi</h4>${thumbs('eyeColor', LOOKS.eyeColor, c.eyeColor)}</div>
      <div class="cc-f"><h4>Kaşlar</h4>${thumbs('brows', LOOKS.brows, c.brows || 'normal')}</div>
      <div class="cc-f"><h4>Burun</h4>${thumbs('nose', LOOKS.nose, c.nose || 'orta')}</div>
      <div class="cc-f"><h4>Dudaklar</h4>${thumbs('lips', LOOKS.lips, c.lips || 'orta')}</div>`;
  } else if (tab === 'kiyafet') {
    const accentVisible = !['kazak', 'kapusonlu'].includes(c.outfit) && c.hairStyle !== 'basortu';
    panel = `
      <div class="cc-f"><h4>Kıyafet stili</h4>${thumbs('outfit', LOOKS.outfit[c.gender], c.outfit || 'takim')}</div>
      <div class="cc-f"><h4>${['gomlek', 'bluz', 'kapusonlu', 'kazak'].includes(c.outfit) ? 'Kıyafet rengi' : 'Takım rengi'}</h4>${swatches('suit', LOOKS.suit, c.suit, true)}</div>
      ${accentVisible ? `<div class="cc-f"><h4>${female ? 'Bluz / aksesuar' : 'Kravat'}</h4>${thumbs('accent', LOOKS.accent.map(a => [a, a]), c.accent)}</div>` : ''}
      <div class="cc-f"><h4>Gözlük</h4>${thumbs('glasses', LOOKS.glasses, c.glasses)}</div>
      ${c.hairStyle !== 'basortu' ? `<div class="cc-f"><h4>Küpe</h4>${thumbs('earring', LOOKS.earring, c.earring || 'yok')}</div>` : ''}
      <label class="cc-toggle"><span>Yakada parti rozeti <i class="cc-dot" style="background:${pinColor()}"></i></span><input type="checkbox" id="f-pin" ${c.pin !== false ? 'checked' : ''}></label>`;
  } else {
    panel = `
      <label class="cc-f"><h4>Memleket <small>· memleketinde miting ve delege görüşmeleri daha etkili</small></h4>
        <select class="cc-in" id="f-home">${provs.map(p => `<option value="${p.plate}" ${+c.hometown === p.plate ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <div class="cc-f"><h4>Eğitim</h4>${chips('education', EDUCATION, c.education)}</div>
      <div class="cc-f"><h4>Meslek</h4><div class="cc-cards">${PROFESSIONS.map(p => `<button type="button" class="${c.profession === p.id ? 'on' : ''}" data-ch="profession" data-v="${p.id}"><b>${p.label}</b><span>${p.desc}</span></button>`).join('')}</div></div>
      <div class="cc-f"><h4>Kişilik <small>en fazla 2 (${c.traits.length}/2)</small></h4><div class="cc-cards">${TRAITS.map(t => { const on = c.traits.includes(t.id); return `<button type="button" class="${on ? 'on' : ''}" data-trait="${t.id}" ${!on && c.traits.length >= 2 ? 'disabled' : ''}><b>${t.label}</b><span>${t.desc}</span></button>`; }).join('')}</div></div>`;
  }
  const stats = charStats(c);
  return `<div class="cc">
    <div class="cc-top"><button class="cc-back" data-back="${w.mode}" aria-label="Geri">‹</button><div class="cc-kicker">HALK<br>FİKİR<br>LİDERLİK<br>DEĞİŞİM<i></i></div></div>
    <h1 class="cc-title">ADAYINI SEÇ</h1>
    <p class="cc-sub">Farklı geçmişler. Farklı vizyonlar. Farklı bir gelecek.</p>
    <div class="cc-archs" id="cc-archs">${archCards}</div>
    <section class="cc-main">
      <div class="cc-hero">${MEDIA['bg:character'] ? `<img class="cc-arch-img" src="${MEDIA['bg:character']}" alt="">` : sceneSvg('hero')}
        <div class="cc-hero-txt"><h2>ADAYINI<br>ÖZELLEŞTİR</h2><p>Kimliğini şekillendir. Hikâyeni kur. Kendi yolunu çiz.</p></div>
        <div class="cc-hero-p" id="char-preview">${avatarSvg(c, { size: 300, bg: 'transparent', pin })}</div>
        <blockquote>“${esc(motto)}”</blockquote>
      </div>
      <div class="cc-id">
        <label class="cc-f"><h4>Ad soyad</h4><input class="cc-in" id="f-player" maxlength="30" value="${esc(w.playerName)}" placeholder="ör. Deniz Arslan" autocomplete="off"></label>
        <label class="cc-f"><h4>Yaş <b id="age-l">${c.age}</b></h4><input type="range" id="f-age" min="30" max="78" value="${c.age}"></label>
        ${c.photo ? `<button type="button" class="cc-link" data-a="photo-del">Fotoğrafı kaldır, çizimi kullan</button>` : ''}
      </div>
      <div class="cc-panel">
        <div class="cc-tabs">${[['gorunum', '👤', 'Görünüm'], ['kiyafet', '👔', 'Kıyafet'], ['kimlik', '📊', 'Kimlik']].map(([id, ic, l]) => `<button type="button" class="${tab === id ? 'on' : ''}" data-ctab="${id}"><span>${ic}</span>${l.toLocaleUpperCase('tr')}</button>`).join('')}</div>
        <div class="cc-body">${panel}</div>
      </div>
    </section>
    <section class="cc-stats"><h3>TEMEL ÖZELLİKLER</h3>${stats.map(s => `<div class="cc-stat"><span class="ic">${s.icon}</span><span class="l">${s.label}</span><div class="cc-bar"><i style="width:${s.v}%"></i></div><b>${s.v}</b></div>`).join('')}
      <p>Meslek, eğitim ve kişilik seçimlerinden hesaplanır.</p></section>
    <div class="cc-foot"><button type="button" class="cc-rand" data-a="random">🔀 RASTGELE</button><button type="button" class="cc-ok" data-a="char-next">ADAYI ONAYLA <span>›</span></button></div>
  </div>`;
}

function bindCharacter(view, ctx, go) {
  const c = w.character;
  const rerender = () => {
    const y = window.scrollY, x = view.querySelector('#cc-archs')?.scrollLeft || 0;
    renderNewGame(view, ctx);
    window.scrollTo(0, y);
    const a = view.querySelector('#cc-archs'); if (a) a.scrollLeft = x;
  };
  const preview = () => { const el = view.querySelector('#char-preview'); if (el) el.innerHTML = avatarSvg(c, { size: 300, bg: 'transparent', pin: c.pin !== false ? pinColor() : null }); };
  view.querySelector('#f-player').addEventListener('input', e => { w.playerName = e.target.value.trim(); });
  view.querySelector('#f-age').addEventListener('input', e => { c.age = +e.target.value; view.querySelector('#age-l').textContent = c.age; preview(); });
  view.querySelector('#f-age').addEventListener('change', () => { delete c.portraitKey; rerender(); });
  view.querySelector('#f-home')?.addEventListener('change', e => { c.hometown = +e.target.value; });
  view.querySelector('#f-pin')?.addEventListener('change', e => { c.pin = e.target.checked; rerender(); });
  view.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { w.charTab = b.dataset.ctab; rerender(); });
  view.querySelectorAll('[data-arch]').forEach(b => b.onclick = () => {
    const a = ARCHETYPES.find(x => x.id === b.dataset.arch);
    Object.assign(c, archetypeLook(a), { profession: a.profession, education: a.education, traits: [...a.traits], archetype: a.id });
    delete c.photo;
    if (MEDIA['archetype:' + a.id]) c.portraitKey = 'archetype:' + a.id; else delete c.portraitKey;
    sfx('click');
    rerender();
  });
  view.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => {
    const key = b.dataset.ch, v = b.dataset.v;
    c[key] = v;
    if (!['education', 'profession'].includes(key)) delete c.portraitKey; // görünüm değişti: hazır fotoğraf yerine çizim
    if (key === 'gender') {
      const styles = LOOKS.hairStyle[v].map(h => h[0]);
      if (!styles.includes(c.hairStyle)) c.hairStyle = styles[0];
      if (v === 'k') c.facial = 'yok';
      if (!LOOKS.outfit[v].some(o => o[0] === c.outfit)) c.outfit = 'takim';
    }
    rerender();
  });
  view.querySelectorAll('[data-trait]').forEach(b => b.onclick = () => {
    const id = b.dataset.trait;
    c.traits = c.traits.includes(id) ? c.traits.filter(t => t !== id) : [...c.traits, id].slice(0, 2);
    rerender();
  });
  view.querySelector('[data-a=photo-del]')?.addEventListener('click', () => { delete c.photo; rerender(); });
  view.querySelector('#f-photo')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // 240×280'e kırp ve küçült (kayıt boyutu küçük kalsın)
      const W = 240, H = 280, cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const r = Math.max(W / img.width, H / img.height);
      const sw = W / r, sh = H / r;
      cv.getContext('2d').drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.3), sw, sh, 0, 0, W, H);
      c.photo = cv.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      rerender();
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Fotoğraf okunamadı.'); };
    img.src = url;
  });
  view.querySelector('[data-a=random]').onclick = () => {
    const keep = { hometown: c.hometown };
    const a = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    w.character = { ...randomCharacter(), ...keep, profession: a.profession, education: a.education, traits: [...a.traits] }; // fotoğraf da kaldırılır
    rerender();
  };
  view.querySelector('[data-a=char-next]').onclick = () => {
    w.playerName = view.querySelector('#f-player').value.trim();
    if (w.playerName.length < 3) { view.querySelector('#f-player').focus(); return toast('Ad soyad yaz (en az 3 harf).'); }
    go('final');
  };
}

function splashMap() {
  const w = winners2023();
  const col = Object.fromEntries(PARTIES_2023.map(p => [p.id, p.color]));
  const [x, y, vw, vh] = MAP_VIEWBOX;
  const count = {};
  for (const id of Object.values(w)) count[id] = (count[id] || 0) + 1;
  return `<div class="splashmap"><svg viewBox="${x} ${y} ${vw} ${vh}" role="img" aria-label="2023 seçim haritası">${PROVINCES.map(p => `<path d="${p.path}" fill="${col[w[p.plate]]}"/>`).join('')}</svg>
    <div class="legend" style="color:#fff">${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<span><i class="swatch" style="background:${col[id]}"></i>${esc(PARTIES_2023.find(p => p.id === id).short)} ${n} il</span>`).join('')}<span style="opacity:.7">· 14 Mayıs 2023, illerde birinci parti</span></div></div>`;
}

const SLOT_NAME = sl => sl === 'oto' ? 'Otomatik kayıt' : `Yuva ${sl}`;

function confirmDelete(slot, after) {
  const i = slotInfo(slot);
  const sh = sheet(`<h2>${SLOT_NAME(slot)} silinsin mi?</h2>
    <p style="margin:0">${i ? `${esc(i.partyName || i.party)} · ${esc(i.name)} · ${fmtDate(i.date)}` : ''}</p>
    <p class="small muted" style="margin:0">Bu işlem geri alınamaz.</p>
    <div class="grid2"><button class="btn" data-a="no">Vazgeç</button><button class="btn red" data-a="yes">🗑 Sil</button></div>`);
  sh.root.querySelector('[data-a=no]').onclick = sh.close;
  sh.root.querySelector('[data-a=yes]').onclick = () => { deleteSlot(slot); sfx('whoosh'); sh.close(); toast('Kayıt silindi'); after(); };
}

function slotRow(sl) {
  const i = slotInfo(sl);
  const por = i?.character ? `<div class="slot-por">${avatarSvg(i.character, { size: 44, bg: mixColor('#FFFFFF', i.color, 0.3) })}</div>` : `<div class="slot-por empty">${sl === 'oto' ? '⟳' : sl}</div>`;
  return `<div class="li slot">${por}
    <div class="grow"><div class="t">${SLOT_NAME(sl)}</div>
      <div class="small muted">${i ? `<span class="badge" style="background:${i.color};height:18px;min-width:0;font-size:12px">${esc(i.party)}</span> ${esc(i.name)} · ${fmtDate(i.date)}${i.gameOver ? ' · <b style="color:var(--bad)">oyun bitti</b>' : ''}` : 'Boş'}</div></div>
    ${i ? `<button class="btn small-btn" data-load="${sl}">Yükle</button><button class="btn small-btn icon" data-del="${sl}" aria-label="${SLOT_NAME(sl)} kaydını sil" title="Sil">🗑</button>` : ''}</div>`;
}

function splashHtml() {
  const auto = slotInfo('oto');
  const tot = {};
  for (const r of RESULTS_2023) for (const [k, v] of Object.entries(r.votes)) tot[k] = (tot[k] || 0) + v;
  const T = Object.values(tot).reduce((a, b) => a + b, 0);
  const facts = PARTIES_2023.filter(p => !p.aggregate).sort((a, b) => (tot[b.id] || 0) - (tot[a.id] || 0)).slice(0, 7)
    .map(p => `<span><i class="swatch" style="background:${p.color}"></i>${esc(p.short)} ${pct(tot[p.id] / T)}</span>`).join('');
  const cont = auto ? `<section class="card cont anim-in">
      <div class="eyebrow">Kaldığın yerden devam et</div>
      <div class="row" style="flex-wrap:nowrap;align-items:center;gap:12px;margin-top:6px">
        ${auto.character ? `<div class="portrait">${avatarSvg(auto.character, { size: 70, bg: mixColor('#FFFFFF', auto.color, 0.28) })}</div>` : ''}
        <div style="flex:1;min-width:0"><div class="row" style="gap:6px"><span class="badge" style="background:${auto.color}">${esc(auto.party)}</span><span class="small muted">${auto.mode === 'join' ? (auto.isLeader ? 'Genel başkan' : 'Genel başkan adayı') : 'Kurucu genel başkan'}</span></div>
          <div class="pname">${esc(auto.name)}</div>
          <div class="small muted">${fmtDate(auto.date)} · ${auto.support !== null && auto.support !== undefined ? `delege desteği %${auto.support.toFixed(1).replace('.', ',')}` : `anket ${pct(auto.poll)}`} · ${DIFFICULTY[auto.difficulty]?.label || ''}</div></div>
      </div>
      <div class="row" style="margin-top:10px;flex-wrap:nowrap"><button class="btn primary" style="flex:1" data-a="continue">▶ Devam et</button><button class="btn icon" data-del="oto" aria-label="Otomatik kaydı sil" title="Sil">🗑</button></div>
    </section>` : '';
  const features = [
    ['🗺️', '81 il, 600 sandalye', 'Gerçek 2023 sonuçları, D\'Hondt ve %7 baraj'],
    ['♟️', 'Kurultay ve hizipler', 'İmza topla, delegeleri ikna et, iki turlu oylama'],
    ['📺', 'Canlı TV ve tartışma', 'Sunucu soruları, liderler tartışması, reyting'],
    ['📱', 'Sosyal medya', 'TikTok, X, Instagram, YouTube, WhatsApp kampanyaları'],
    ['📣', 'Miting ve saha', 'Meydan, konuşma metni, hava, rakip çakışması'],
    ['🗳️', 'Seçim gecesi', 'İl il açılan sandıklar ve yeni meclis'],
  ];
  const steps = [
    ['Karakterini oluştur', 'Görünüm, meslek, memleket ve kişilik seç.'],
    ['Partini kur ya da kurultayı kazan', 'Yeni partiyle 41 ilde teşkilat kur veya gerçek bir partinin delegelerini ikna et.'],
    ['Her ay 12 eylem puanını kullan', 'Miting, buluşma, medya, sosyal medya, vaat, teşkilat ve bağış. Seçimden önceki son 8 hafta turlar haftalık olur.'],
    ['Gündeme cevap ver, turu bitir', 'Olaylara ve krizlere tutum al; anketler, rakipler ve ekonomi her ay değişir.'],
    ['Seçim gecesi', '%7 barajı geç, sandalye kazan, iktidarı hedefle.'],
  ];
  return `<section class="splash" ${MEDIA['bg:splash'] ? `style="background:linear-gradient(rgba(20,33,61,.55),rgba(20,33,61,.9)),url(${MEDIA['bg:splash']}) center/cover"` : ''}><div class="stripe" aria-hidden="true"></div>
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div class="eyebrow" style="color:var(--hi)">Siyasi simülasyon · Türkiye</div><div class="row" style="gap:6px;position:relative;z-index:2">${soundToggleHtml()}<button class="snd-toggle" type="button" data-a="audio" aria-label="Ses ve müzik ayarları" title="Ses ve müzik ayarları">⚙️</button></div></div>
      <h1>Sandık<br><em>ve</em> Kürsü</h1>
      <p>Parti kur ya da bir partinin başına geç. 81 il, 600 sandalye, %7 baraj. Küçük başlamak neredeyse umutsuz; iktidar ise çok uzak.</p>
      ${splashMap()}
      <div class="splash-ticker"><b>14 MAYIS 2023</b><div class="st-track"><div class="st-run">${facts}${facts}</div></div></div>
    </section>
    ${cont}
    <button class="btn ${auto ? '' : 'primary'} block newgame-btn anim-in" data-a="new"><b>＋ Yeni oyun</b><span>2023 başlangıcı · parti kur veya partiye katıl</span></button>
    <section class="card anim-in"><h2>Kayıtlar <small>bu tarayıcıda saklanır</small></h2><div class="list">${SLOTS.map(slotRow).join('')}</div></section>
    <section class="card anim-in"><h2>Neler var?</h2><div class="feat">${features.map(([i, t, d]) => `<div class="feat-i"><span>${i}</span><b>${t}</b><small>${d}</small></div>`).join('')}</div></section>
    <section class="card anim-in"><button class="howto-h" data-howto aria-expanded="${!!w.howto}"><h2 style="margin:0">Nasıl oynanır?</h2><span>${w.howto ? '▲' : '▼'}</span></button>
      ${w.howto ? `<ol class="howto">${steps.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>` : ''}</section>
    <p class="small muted" style="text-align:center">Gerçek parti ve kişiler olgusal, tarafsız bağlamda yer alır; olaylar, programlar ve medya kurgusaldır.<br>Sürüm: Aşama 1.7 · Veri: YSK 2023 sonuçları</p>`;
}
