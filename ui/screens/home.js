// Harita sekmesi: durum kartı, harita + katmanlar, anket özeti, haber akışı, takvim.
import { esc, sheet, partyBadge } from '../dom.js';
import { createMap, mixColor } from '../map.js';
import { PROVINCES } from '../../data/generated/provinces.js';
import { RESULTS_2023 } from '../../data/generated/results2023.js';
import { REGION_NAMES } from '../../engine/regions.js';
import { fmtDate, fmtMoney, pct, fmtInt, daysBetween, addDays } from '../../engine/util.js';
import { playerParty, PROVINCE_BY_PLATE } from '../../engine/state.js';
import { provinceInfo, actionById } from '../../engine/actions.js';
import { eligibility } from '../../engine/turn.js';
import { CLUSTERS } from '../../data/clusters.js';
import { openAction } from './campaign.js';
import { avatarSvg } from '../avatar.js';
import { PROFESSIONS } from '../../data/character.js';

const LAYERS = [
  ['first', 'Birinci parti'], ['me', 'Benim oyum'], ['alliance', 'İttifak'], ['turnout', 'Katılım'],
  ['org', 'Teşkilatım'], ['region', 'Bölge'], ['mayor', 'Belediyeler'],
];
const REGION_COLORS = ['#4C6EF5', '#12B886', '#F59F00', '#E8590C', '#2B8A3E', '#7048E8', '#C2255C'];
let layer = 'first';
let map = null, selected = null;

export function pollDelta(s, id, weeks = 4) {
  const n = s.polls.length;
  if (n < 2) return 0;
  const prev = s.polls[Math.max(0, n - 1 - weeks)];
  return (s.polls[n - 1].shares[id] || 0) - (prev.shares[id] || 0);
}

export function pollBars(s, shares, { prevFn = null, limit = 9 } = {}) {
  const thr = s.rules.parliament.threshold;
  const list = Object.entries(shares).filter(([id]) => s.parties[id] && !s.parties[id].dissolved)
    .sort((a, b) => (s.parties[a[0]].aggregate ? 1 : 0) - (s.parties[b[0]].aggregate ? 1 : 0) || b[1] - a[1]).slice(0, limit);
  const max = Math.max(...list.map(x => x[1]), 0.1);
  return `<div class="bars">${list.map(([id, v]) => {
    const p = s.parties[id];
    const d = prevFn ? prevFn(id) : 0;
    return `<div class="bar"><span class="name" style="${p.isPlayer ? 'color:var(--accent)' : ''}">${esc(p.short)}</span>
      <div class="track"><div class="fill" style="width:${(100 * v / max).toFixed(1)}%;background:${p.color}"></div><div class="thr" style="left:${(100 * thr / max).toFixed(1)}%"></div></div>
      <span class="val">${(100 * v).toFixed(1).replace('.', ',')}${prevFn && Math.abs(d) >= 0.002 ? `<div class="delta" style="color:${d > 0 ? 'var(--good)' : 'var(--bad)'}">${d > 0 ? '▲' : '▼'}${Math.abs(100 * d).toFixed(1).replace('.', ',')}</div>` : ''}</span></div>`;
  }).join('')}</div>`;
}

function layerColor(s, plate) {
  const proj = s.lastProjection?.provinces?.[plate];
  const me = playerParty(s);
  if (layer === 'region') return REGION_COLORS[REGION_NAMES.indexOf(PROVINCE_BY_PLATE[plate].region)];
  if (layer === 'org') {
    const o = me.orgs[plate];
    if (me.building?.[plate]) return '#FFE8A3';
    return o ? mixColor('#E3E8F0', me.color, 0.25 + 0.75 * o) : '#E3E8F0';
  }
  if (layer === 'mayor') { const m = s.mayors[plate]; return m ? s.parties[m].color : '#E3E8F0'; }
  if (!proj) return '#cfd6e2';
  if (layer === 'turnout') return mixColor('#E3E8F0', '#14213D', Math.max(0, Math.min(1, (proj.turnout - 0.72) / 0.2)));
  if (layer === 'me') {
    const v = proj.shares[me.id] || 0;
    const top = s.player.mode === 'found' ? 0.12 : 0.6;
    return mixColor('#EEF1F6', me.color, Math.min(1, Math.sqrt(v / top)));
  }
  const entries = Object.entries(proj.shares).filter(([id]) => !s.parties[id].aggregate);
  if (layer === 'alliance') {
    const al = {};
    for (const [id, v] of entries) { const k = s.parties[id].alliance || id; al[k] = (al[k] || 0) + v; }
    const [k, v] = Object.entries(al).sort((a, b) => b[1] - a[1])[0];
    const col = s.alliances[k]?.color || s.parties[k]?.color || '#999';
    return mixColor('#FFFFFF', col, Math.min(1, 0.35 + v));
  }
  const [id, v] = entries.sort((a, b) => b[1] - a[1])[0];
  return mixColor('#FFFFFF', s.parties[id].color, Math.min(1, 0.45 + v));
}

function legend(s) {
  const me = playerParty(s);
  if (layer === 'region') return REGION_NAMES.map((r, i) => `<span><i class="swatch" style="background:${REGION_COLORS[i]}"></i>${r}</span>`).join('');
  if (layer === 'me') return `<span class="muted">0</span><div class="gradient" style="background:linear-gradient(90deg,#EEF1F6,${me.color})"></div><span class="muted">${s.player.mode === 'found' ? '12%+' : '60%+'}</span>`;
  if (layer === 'turnout') return `<span class="muted">%72</span><div class="gradient" style="background:linear-gradient(90deg,#E3E8F0,#14213D)"></div><span class="muted">%92</span>`;
  if (layer === 'org') return `<span><i class="swatch" style="background:#E3E8F0"></i>Yok</span><span><i class="swatch" style="background:#FFE8A3"></i>Kuruluyor</span><span><i class="swatch" style="background:${me.color}"></i>Güçlü</span>`;
  if (layer === 'mayor' && !Object.keys(s.mayors).length) return '<span class="muted">Yerel seçim 31 Mart 2024\'te yapılacak.</span>';
  if (layer === 'alliance') {
    const keys = new Set(Object.values(s.parties).filter(p => !p.aggregate && p.lastShare > 0.005 || p.isPlayer).map(p => p.alliance || p.id));
    return [...keys].map(k => `<span><i class="swatch" style="background:${s.alliances[k]?.color || s.parties[k]?.color}"></i>${esc(s.alliances[k]?.name || s.parties[k]?.short)}</span>`).join('');
  }
  const ids = Object.values(s.parties).filter(p => !p.aggregate && (p.lastShare > 0.02 || p.isPlayer));
  return ids.map(p => `<span><i class="swatch" style="background:${p.color}"></i>${esc(p.short)}</span>`).join('');
}

export function openProvince(s, ctx, plate) {
  const info = provinceInfo(s, plate);
  const me = playerParty(s);
  const proj = s.lastProjection.provinces[plate];
  const units = RESULTS_2023.filter(r => r.plate === plate);
  const v23 = {};
  for (const u of units) for (const [k, v] of Object.entries(u.votes)) v23[k] = (v23[k] || 0) + v;
  const t23 = Object.values(v23).reduce((a, b) => a + b, 0);
  const sh23 = Object.fromEntries(Object.entries(v23).map(([k, v]) => [k, v / t23]));
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  const camp = s.camp[plate]?.[me.id] || 0;
  const topCl = CLUSTERS.map((c, i) => [c.label, info.clusters[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const html = `<div class="row" style="justify-content:space-between"><div><div class="eyebrow">${esc(info.region)} · plaka ${String(plate).padStart(2, '0')}</div><h2>${esc(info.name)}</h2></div>
      <div style="text-align:right"><div class="stat" style="background:none;padding:0"><div class="v">${info.seats}</div><div class="l">milletvekili</div></div></div></div>
    <div class="grid3"><div class="stat"><div class="v">${(info.registered / 1e6).toFixed(2).replace('.', ',')}M</div><div class="l">Seçmen</div></div>
      <div class="stat"><div class="v">${pct(proj.turnout, 0)}</div><div class="l">Katılım (tah.)</div></div>
      <div class="stat"><div class="v">${pct(proj.shares[me.id] || 0)}</div><div class="l">${esc(me.short)} (tah.)</div></div></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Bugünkü tahmin ${s.intel > 0 ? '(detaylı il anketi)' : '(model tahmini)'}</div>${pollBars(s, proj.shares, { limit: 6, prevFn: id => (proj.shares[id] || 0) - (sh23[id] || 0) })}
      <div class="small muted" style="margin-top:4px">Oklar: 2023 seçimine göre değişim.</div></div>
    <div class="small"><b>Baskın seçmen kümeleri:</b> ${topCl.map(([l, v]) => `${l} (${pct(v, 0)})`).join(', ')}</div>
    ${!pre ? `<dl class="kv"><dt>Teşkilatın</dt><dd>${me.building?.[plate] ? 'Kuruluyor' : me.orgs[plate] ? pct(me.orgs[plate], 0) : 'Yok'}</dd>
      <dt>Kampanya etkisi</dt><dd>${camp.toFixed(2).replace('.', ',')}</dd>${s.mayors[plate] ? `<dt>Belediye başkanlığı</dt><dd>${esc(s.parties[s.mayors[plate]].short)}</dd>` : ''}</dl>` : ''}
    <div class="grid2">${pre ? `<button class="btn primary" data-act="delegates">Delegelerle görüş</button>` : `<button class="btn primary" data-act="rally">Miting yap</button><button class="btn" data-act="visit">Ziyaret et</button>
      ${s.player.mode === 'found' && !me.orgs[plate] && !me.building?.[plate] ? '<button class="btn" data-act="buildOrg">Teşkilat kur</button>' : me.orgs[plate] ? '<button class="btn" data-act="strengthenOrg">Teşkilatı güçlendir</button>' : ''}`}</div>`;
  const sh = sheet(html, { onClose: () => { selected = null; map?.select(null); } });
  sh.root.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { sh.close(); openAction(ctx, actionById(b.dataset.act), { province: plate }); });
}

function portrait(s, size = 76) {
  const me = playerParty(s);
  return s.player.character ? `<div class="portrait">${avatarSvg(s.player.character, { size, bg: mixColor('#FFFFFF', me.color, 0.25) })}</div>` : partyBadge(me);
}

function statusCard(s) {
  const me = playerParty(s);
  const poll = s.polls[s.polls.length - 1].shares[me.id] || 0;
  const c = s.player.character;
  const who = c ? `${c.age} yaş · ${PROFESSIONS.find(p => p.id === c.profession)?.label || ''} · ${PROVINCE_BY_PLATE[c.hometown]?.name || ''}` : '';
  if (s.player.mode === 'join' && !s.player.isLeader) {
    const k = s.player.kurultay;
    const weeks = Math.max(0, Math.ceil(daysBetween(s.date, k.date) / 7));
    const sigWeeks = Math.max(0, Math.ceil(daysBetween(s.date, k.sigDeadline) / 7));
    const col = k.support >= 50 ? 'var(--good)' : k.support >= 38 ? 'var(--warn)' : 'var(--bad)';
    const sigOk = k.signatures >= k.sigNeed * 100;
    return `<section class="card kcard">
      <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${portrait(s)}
        <div style="flex:1;min-width:0"><div class="eyebrow">${esc(me.short)} genel başkan adayı</div><div class="pname">${esc(s.player.name)}</div><div class="small muted">${esc(who)}</div>
          <div class="kcount"><b class="num">${weeks}</b> hafta kaldı · kurultay ${fmtDate(k.date)}${k.official ? '' : ' <span class="muted">(senaryo)</span>'}</div></div></div>
      <div class="row" style="justify-content:space-between;margin-top:10px"><span class="small"><b>Delege desteği</b> <span class="muted">· ${fmtInt(k.delegates)} delege</span></span><span class="num" style="font-family:var(--f-display);font-size:28px;font-weight:700;color:${col}">%${k.support.toFixed(1).replace('.', ',')}</span></div>
      <div class="kbar"><div style="width:${k.support}%;background:${col}"></div><i style="left:50%"></i></div>
      <div class="kfac">${k.factions.map(f => `<div class="kf"><div class="row" style="justify-content:space-between"><span class="small" style="font-weight:600">${esc(f.label)}</span><span class="small muted num">ağırlık %${Math.round(f.weight * 100)} · <b style="color:var(--ink)">%${Math.round(f.support)}</b></span></div><div class="kfbar"><div style="width:${f.support}%"></div></div></div>`).join('')}</div>
      <div class="ksig ${sigOk ? 'ok' : ''}"><div class="row" style="justify-content:space-between"><span class="small"><b>Adaylık imzası</b> ${sigOk ? '✓' : `· son ${sigWeeks} hafta (${fmtDate(k.sigDeadline)})`}</span><span class="small num"><b>%${k.signatures.toFixed(1).replace('.', ',')}</b> / %${Math.round(k.sigNeed * 100)}</span></div>
        <div class="kfbar"><div style="width:${Math.min(100, k.signatures / (k.sigNeed * 100) * 100)}%;background:${sigOk ? 'var(--good)' : 'var(--warn)'}"></div></div></div>
      <p class="small muted" style="margin:8px 0 0">Kazanmak için ilk turda %50'nin üzeri gerekir; olmazsa ikinci tura kalınır. Genel merkez her hafta desteğini geri çekmeye çalışır.</p></section>`;
  }
  const el = s.player.mode === 'found' ? eligibility(s) : null;
  return `<section class="card"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${portrait(s, 64)}<div style="flex:1;min-width:0"><div class="row" style="gap:6px">${partyBadge(me)}<span class="eyebrow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(me.name)}</span></div>
      <div class="pname">${esc(s.player.name)}</div><div class="small muted">${me.slogan ? `“${esc(me.slogan)}” · ` : ''}${esc(who)}</div></div></div>
    <div class="grid3" style="margin-top:10px">
      <div class="stat"><div class="v" style="color:${poll >= s.rules.parliament.threshold ? 'var(--good)' : 'var(--ink)'}">${pct(poll)}</div><div class="l">Anket</div></div>
      <div class="stat"><div class="v">${pct(me.recognition, 0)}</div><div class="l">Tanınırlık</div></div>
      <div class="stat"><div class="v">${Math.round(me.unity)}</div><div class="l">İç huzur</div></div></div>
    ${el ? `<div class="row small" style="margin-top:8px"><span class="pill ${el.orgsOk ? 'good' : 'warn'}">İl teşkilatı ${el.orgs}/${el.needOrgs}</span><span class="pill ${el.congressOk ? 'good' : el.congressPossible ? 'warn' : 'bad'}">Büyük kongre ${el.congressOk ? 'tamam' : el.congressPossible ? 'yapılmadı' : 'süre geçti'}</span>${me.seats ? `<span class="pill good">${me.seats} milletvekili</span>` : ''}</div>` : ''}
  </section>`;
}

function calendar(s) {
  const items = [];
  if (s.player.mode === 'join' && !s.player.isLeader) items.push([s.player.kurultay.date, `${playerParty(s).short} kurultayı`, 'Kurultay']);
  if (s.localElection) items.push([s.localElection, `${s.localElection.slice(0, 4)} Yerel seçimler (basitleştirilmiş)`, 'Seçim']);
  items.push([addDays(s.nextElection, -s.rules.campaignDays), 'Seçim kampanyası başlar (günlük tur)', 'Takvim']);
  items.push([s.nextElection, 'Milletvekili genel seçimi', 'Seçim']);
  if (s.player.mode === 'found') items.push([addDays(s.nextElection, -s.rules.partyEligibility.congressMonthsBefore * 30), 'Büyük kongre için son tarih', 'Yasal']);
  const m = s.date.slice(5, 7);
  const y = +s.date.slice(0, 4);
  items.push([`${m >= '10' ? y + 1 : y}-10-15`, 'Bütçe görüşmeleri (TBMM)', 'Meclis']);
  items.sort((a, b) => a[0].localeCompare(b[0]));
  return `<section class="card"><h2>Takvim</h2><div class="list">${items.filter(i => i[0] >= s.date).slice(0, 5).map(([d, t, k]) => `<div class="li"><div style="width:84px" class="small num"><b>${fmtDate(d)}</b></div><div class="grow">${esc(t)}</div><span class="pill ${k === 'Seçim' ? 'bad' : k === 'Yasal' ? 'warn' : 'good'}">${k}</span></div>`).join('')}</div></section>`;
}

export function renderHome(view, ctx) {
  const s = ctx.state;
  view.insertAdjacentHTML('beforeend', statusCard(s));
  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = `<h2>Türkiye <small>${layer === 'me' || layer === 'first' || layer === 'alliance' || layer === 'turnout' ? 'model tahmini, il bazında' : ''}</small></h2>
    <div class="chips" style="margin-bottom:8px">${LAYERS.map(([id, l]) => `<button class="chip ${layer === id ? 'on' : ''}" data-layer="${id}">${l}</button>`).join('')}</div>`;
  if (!map) map = createMap({ onSelect: plate => { selected = plate; map.select(plate); openProvince(ctx.state, ctx, plate); } });
  map.paint(pl => layerColor(s, pl));
  map.select(selected);
  card.appendChild(map.node);
  card.insertAdjacentHTML('beforeend', `<div class="legend">${legend(s)}</div><p class="small muted" style="margin:6px 0 0">Bir ile dokun: detay ve eylemler. İki parmakla yakınlaştır.</p>`);
  view.appendChild(card);
  card.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => { layer = b.dataset.layer; ctx.render(); });

  const last = s.polls[s.polls.length - 1];
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Anket <small>${fmtDate(last.date)} · kararsızlar dağıtıldı · kesikli çizgi %7 baraj</small></h2>${pollBars(s, last.shares, { prevFn: id => pollDelta(s, id) })}
    <button class="btn block" style="margin-top:10px" data-go="meclis">Bugün seçim olsa: sandalye tahmini →</button></section>`);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Haberler</h2><div class="list">${s.news.slice(0, 5).map(n => `<div class="news-item ${n.kind}"><div class="d">${fmtDate(n.date).replace(/ \d{4}$/, '')}</div><div class="x">${esc(n.text)}</div></div>`).join('')}</div>
    <button class="btn block" style="margin-top:8px" data-go="gundem">Tüm gündem →</button></section>`);
  view.insertAdjacentHTML('beforeend', calendar(s));
  const e = s.economy;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Ekonomi <small>simülasyon</small></h2><div class="grid2">
    <div class="stat"><div class="v">%${e.inflation.toFixed(1).replace('.', ',')}</div><div class="l">Yıllık enflasyon</div></div>
    <div class="stat"><div class="v">%${e.unemployment.toFixed(1).replace('.', ',')}</div><div class="l">İşsizlik</div></div>
    <div class="stat"><div class="v">${e.usdTry.toFixed(2).replace('.', ',')}</div><div class="l">Dolar/TL</div></div>
    <div class="stat"><div class="v">%${e.growth.toFixed(1).replace('.', ',')}</div><div class="l">Büyüme</div></div></div>
    <p class="small muted" style="margin:8px 0 0">Ekonomik hoşnutsuzluk iktidar partilerinin oyunu aşındırır. Başlangıç değerleri ${s.scenario === 'bugun' ? 'Ekim 2026 resmî verileridir (TÜİK, TCMB)' : 'Haziran 2023\'e yakın tahminlerdir'}.</p></section>`);
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => ctx.go(b.dataset.go));
}
