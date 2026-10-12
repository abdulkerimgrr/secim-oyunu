// Yeni oyun sihirbazı
import { esc, toast } from '../dom.js';
import { START_YEARS } from '../../data/scenario2023.js';
import { PARTIES_2023, AXES } from '../../data/parties2023.js';
import { SKILLS } from '../../data/founders.js';
import { RESULTS_2023 } from '../../data/generated/results2023.js';
import { DIFFICULTY } from '../../engine/params.js';
import { newGame, generateFounders } from '../../engine/state.js';
import { loadGame, slotInfo, SLOTS } from '../../engine/save.js';
import { fmtDate, pct } from '../../engine/util.js';
import { LOOKS, PROFESSIONS, EDUCATION, TRAITS, randomCharacter } from '../../data/character.js';
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
const JOIN_DIFF = { AKP: 'Neredeyse imkânsız', MHP: 'Neredeyse imkânsız', CHP: 'Zor', IYI: 'Çok zor', YSP: 'Çok zor', YRP: 'Çok zor', ZP: 'Çok zor', TIP: 'Zor', BBP: 'Çok zor', MP: 'Zor' };

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
    const auto = slotInfo('oto');
    html = `<section class="splash"><div class="stripe" aria-hidden="true"></div>
        <div class="eyebrow" style="color:var(--hi)">Siyasi simülasyon</div>
        <h1>Sandık<br><em>ve</em> Kürsü</h1>
        <p>Türkiye'de parti kur ya da bir partinin başına geç. 81 il, 600 sandalye, %7 baraj. Küçük başlamak neredeyse umutsuz; iktidar ise çok uzak.</p>
        ${splashMap()}</section>
      ${auto ? `<button class="btn primary block" data-a="continue">Devam et · ${esc(auto.party)} · ${fmtDate(auto.date)}</button>` : ''}
      <button class="btn ${auto ? '' : 'primary'} block" data-a="new">Yeni oyun</button>
      <div class="card"><h2>Kayıtlar</h2><div class="list">${SLOTS.filter(s => s !== 'oto').map(sl => {
        const i = slotInfo(sl);
        return `<div class="li"><div class="grow"><div class="t">Yuva ${sl}</div><div class="small muted">${i ? `${esc(i.party)} · ${esc(i.name)} · ${fmtDate(i.date)}` : 'Boş'}</div></div>${i ? `<button class="btn" data-load="${sl}">Yükle</button>` : ''}</div>`;
      }).join('')}</div></div>
      <p class="small muted">Bu sürüm erken bir prototiptir (Aşama 1). Gerçek parti ve kişiler olgusal, tarafsız bağlamda yer alır; oyundaki olaylar kurgusaldır.</p>`;
  } else if (w.step === 'year') {
    html = `<h1 style="font-size:30px">Başlangıç yılı</h1><p class="muted">Seçtiğin yılın partileri, meclisi ve ekonomisi yüklenir.</p>
      <div class="grid2">${START_YEARS.map(y => `<button class="select-card ${w.year === y.id ? 'on' : ''}" data-year="${y.id}" ${y.available ? '' : 'disabled'}>
        <div><div style="font-family:var(--f-display);font-size:26px;font-weight:700">${y.label}</div><div class="small muted">${y.available ? 'Haziran 2023: seçim sonrası' : 'Sonraki aşamada'}</div></div></button>`).join('')}</div>
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
    html = `<h1 style="font-size:30px">Hangi partiye?</h1><p class="muted">Genel başkan adayı olarak kurultaya gideceksin. Mevcut liderin etkisi ve delege yapısı zorluğu belirler.</p>
      <div class="list card">${PARTIES_2023.filter(p => !p.aggregate).map(p => `<button class="li" data-join="${p.id}" style="background:${w.joinPartyId === p.id ? '#EEF2F9' : 'none'};border:0;text-align:left;width:100%">
        <span class="badge" style="background:${p.color}">${esc(p.short)}</span>
        <div class="grow"><div class="t">${esc(p.name)}</div><div class="small muted">Genel başkan: ${esc(p.leader)} · 2023: ${pct(tot[p.id] / T)}${p.kurultay ? ` · kurultay ${fmtDate(p.kurultay)}` : ' · olağanüstü kurultay senaryosu (14 hafta)'}</div></div>
        <span class="pill ${JOIN_DIFF[p.id].startsWith('Zor') ? 'warn' : 'bad'}">${JOIN_DIFF[p.id]}</span></button>`).join('')}</div>
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
    if (PARTIES_2023.some(p => p.short.toLocaleUpperCase('tr') === w.party.short)) return toast('Bu kısaltma başka bir partiye ait.');
    if (w.founders.length !== 3) return toast('3 kurucu üye seç.');
    go('character');
  });
  if (w.step === 'character') bindCharacter(view, ctx, go);
  view.querySelector('[data-a=start]')?.addEventListener('click', () => {
    saveForm();
    const state = newGame({ character: w.character,
      mode: w.mode, seed: w.seed, difficulty: w.difficulty, playerName: w.playerName, joinPartyId: w.joinPartyId,
      party: w.party, founders: w.founderPool.filter(f => w.founders.includes(f.id)),
    });
    reset();
    ctx.start(state);
  });
}

function avatarBg() {
  const col = w.mode === 'join' ? (PARTIES_2023.find(p => p.id === w.joinPartyId)?.color || '#14213D') : w.party.color;
  return mixColor('#FFFFFF', col, 0.22);
}

function swatches(key, list, cur) {
  return `<div class="colors">${list.map(c => `<button type="button" data-ch="${key}" data-v="${c}" class="${cur === c ? 'on' : ''}" style="background:${c}" aria-label="${key} ${c}"></button>`).join('')}</div>`;
}
function chips(key, list, cur) {
  return `<div class="chips wrap">${list.map(([v, l]) => `<button type="button" class="chip ${cur === v ? 'on' : ''}" data-ch="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
}

function characterStep() {
  const c = w.character;
  const female = c.gender === 'k';
  const provs = [...PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  return `<h1 style="font-size:30px">Karakterini oluştur</h1>
    <div class="charhead card">
      <div id="char-preview" class="charportrait">${avatarSvg(c, { size: 132, bg: avatarBg() })}</div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
        <label class="f">Ad soyad<input class="in" id="f-player" maxlength="30" value="${esc(w.playerName)}" placeholder="ör. Deniz Arslan" autocomplete="off"></label>
        <label class="f">Yaş <span class="muted" id="age-l">${c.age}</span><input type="range" id="f-age" min="30" max="78" value="${c.age}"></label>
        <button class="btn" type="button" data-a="random">🎲 Rastgele görünüm</button>
      </div>
    </div>
    <section class="card charsec"><h2>Görünüm</h2>
      <div class="f">Cinsiyet${chips('gender', LOOKS.gender, c.gender)}</div>
      <div class="f">Ten rengi${swatches('skin', LOOKS.skin, c.skin)}</div>
      ${c.hairStyle !== 'basortu' ? `<div class="f">Yüz şekli${chips('face', LOOKS.face, c.face)}</div>` : ''}
      <div class="f">${female ? 'Saç / başörtüsü' : 'Saç modeli'}${chips('hairStyle', LOOKS.hairStyle[c.gender], c.hairStyle)}</div>
      ${c.hairStyle === 'basortu' ? `<div class="f">Başörtüsü rengi${swatches('scarf', LOOKS.scarf, c.scarf)}</div>` : `<div class="f">Saç rengi${swatches('hairColor', LOOKS.hairColor.map(h => h[0]), c.hairColor)}</div>`}
      ${!female ? `<div class="f">Sakal / bıyık${chips('facial', LOOKS.facial, c.facial)}</div>` : ''}
      <div class="f">Gözlük${chips('glasses', LOOKS.glasses, c.glasses)}</div>
      <div class="f">Takım elbise${swatches('suit', LOOKS.suit, c.suit)}</div>
      <div class="f">${female ? 'Bluz / aksesuar' : 'Kravat'}${swatches('accent', LOOKS.accent, c.accent)}</div>
    </section>
    <section class="card charsec"><h2>Kimlik</h2>
      <label class="f">Memleket <span class="muted" style="font-weight:400">· memleketinde miting ve delege görüşmeleri daha etkili</span>
        <select class="in" id="f-home">${provs.map(p => `<option value="${p.plate}" ${+c.hometown === p.plate ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <div class="f">Eğitim${chips('education', EDUCATION, c.education)}</div>
      <div class="f">Meslek</div>
      <div class="grid2">${PROFESSIONS.map(p => `<button type="button" class="select-card ${c.profession === p.id ? 'on' : ''}" data-ch="profession" data-v="${p.id}" style="padding:10px"><div><b>${p.label}</b><div class="small muted">${p.desc}</div></div></button>`).join('')}</div>
    </section>
    <section class="card charsec"><h2>Kişilik <small>en fazla 2 özellik (${c.traits.length}/2)</small></h2>
      <div class="grid2">${TRAITS.map(t => { const on = c.traits.includes(t.id); return `<button type="button" class="select-card ${on ? 'on' : ''}" data-trait="${t.id}" ${!on && c.traits.length >= 2 ? 'disabled' : ''} style="padding:10px"><div><b>${t.label}</b><div class="small muted">${t.desc}</div></div></button>`; }).join('')}</div>
    </section>
    <div class="grid2"><button class="btn" data-back="${w.mode}">← Geri</button><button class="btn primary" data-a="char-next">Devam</button></div>`;
}

function bindCharacter(view, ctx, go) {
  const c = w.character;
  const rerender = () => { const y = window.scrollY; renderNewGame(view, ctx); window.scrollTo(0, y); };
  const preview = () => { const el = view.querySelector('#char-preview'); if (el) el.innerHTML = avatarSvg(c, { size: 132, bg: avatarBg() }); };
  view.querySelector('#f-player').addEventListener('input', e => { w.playerName = e.target.value.trim(); });
  view.querySelector('#f-age').addEventListener('input', e => { c.age = +e.target.value; view.querySelector('#age-l').textContent = c.age; preview(); });
  view.querySelector('#f-home').addEventListener('change', e => { c.hometown = +e.target.value; });
  view.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => {
    const key = b.dataset.ch, v = b.dataset.v;
    c[key] = v;
    if (key === 'gender') {
      const styles = LOOKS.hairStyle[v].map(h => h[0]);
      if (!styles.includes(c.hairStyle)) c.hairStyle = styles[0];
      if (v === 'k') c.facial = 'yok';
    }
    rerender();
  });
  view.querySelectorAll('[data-trait]').forEach(b => b.onclick = () => {
    const id = b.dataset.trait;
    c.traits = c.traits.includes(id) ? c.traits.filter(t => t !== id) : [...c.traits, id].slice(0, 2);
    rerender();
  });
  view.querySelector('[data-a=random]').onclick = () => {
    const keep = { profession: c.profession, education: c.education, hometown: c.hometown, traits: c.traits };
    w.character = { ...randomCharacter(), ...keep };
    rerender();
  };
  view.querySelector('[data-a=char-next]').onclick = () => {
    w.playerName = view.querySelector('#f-player').value.trim();
    if (w.playerName.length < 3) return toast('Ad soyad yaz (en az 3 harf).');
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
