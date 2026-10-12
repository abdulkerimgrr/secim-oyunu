// Kampanya sekmesi: eylem kartları ve parametre/önizleme sayfası.
import { esc, sheet, toast } from '../dom.js';
import { availableActions, canRun, describeEstimate, CHANNELS, actionCost } from '../../engine/actions.js';
import { TOPICS } from '../../data/clusters.js';
import { PROVINCES } from '../../data/generated/provinces.js';
import { REGION_NAMES } from '../../engine/regions.js';
import { fmtMoney } from '../../engine/util.js';
import { playerParty } from '../../engine/state.js';
import { playCinema } from '../cinema.js';
import { stancesFor } from '../../engine/press.js';
import { SOCIAL_CAMPAIGNS } from '../../data/social.js';
import { CLUSTERS } from '../../data/clusters.js';
import { fmtInt, fmtDate } from '../../engine/util.js';
import { VENUES, TRANSPORT, SPEECHES } from '../../data/rally.js';
import { sfx } from '../sound.js';

const PROV_SORTED = [...PROVINCES].sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name, 'tr'));
const TONES = [['uzlasmaci', 'Uzlaşmacı'], ['sert', 'Sert']];

function defaults(action, prm) {
  const p = { ...prm };
  for (const k of action.params || []) {
    if (p[k] !== undefined) continue;
    if (k === 'province') p.province = 34;
    if (k === 'topic') p.topic = 'ekonomi';
    if (k === 'tone') p.tone = 'uzlasmaci';
    if (k === 'channel') p.channel = 'tarafsiz';
    if (k === 'region') p.region = REGION_NAMES[0];
    if (k === 'faction') p.faction = 'teskilat';
    if (k === 'stance') p.stance = stancesFor(p.topic || 'ekonomi')[0]?.id;
    if (k === 'venue') p.venue = 'meydan';
    if (k === 'speech') p.speech = (SPEECHES[p.topic || 'ekonomi'] || SPEECHES.ekonomi)[0].id;
    if (k === 'transport') p.transport = 'yok';
  }
  if (p.channel === 'yerel' && !p.province) p.province = 34;
  return p;
}

export function openAction(ctx, action, prm0 = {}) {
  const s = ctx.state;
  let prm = defaults(action, prm0);
  const sh = sheet('<div></div>');
  const body = sh.root.lastElementChild;
  const draw = () => {
    const ok = canRun(s, action, prm);
    const cost = actionCost(s, action, prm);
    const est = describeEstimate(s, action, prm);
    const params = action.params || [];
    const needProv = params.includes('province') || (params.includes('channel') && prm.channel === 'yerel');
    body.innerHTML = `<div class="row"><span style="font-size:26px" aria-hidden="true">${action.icon}</span><div style="flex:1;min-width:0"><div class="eyebrow">${esc(action.cat)}</div><h2>${esc(action.label)}</h2></div></div>
      <p class="small" style="margin:0">${esc(action.desc)}</p>
      ${needProv ? `<label class="f">İl<select class="in" id="p-prov">${PROV_SORTED.map(p => `<option value="${p.plate}" ${+prm.province === p.plate ? 'selected' : ''}>${esc(p.name)} · ${p.seats} mv${playerParty(s).orgs[p.plate] ? ' · teşkilat ✓' : ''}</option>`).join('')}</select></label>` : ''}
      ${params.includes('region') ? `<div class="f">Bölge<div class="chips">${REGION_NAMES.map(r => `<button class="chip ${prm.region === r ? 'on' : ''}" data-region="${r}">${r}</button>`).join('')}</div></div>` : ''}
      ${params.includes('faction') ? `<div class="f">Hizip<div class="list">${s.player.kurultay.factions.map(f => `<button class="select-card ${prm.faction === f.id ? 'on' : ''}" data-faction="${f.id}" style="padding:10px;margin-top:6px"><div style="flex:1"><b>${esc(f.label)}</b> <span class="small muted">· ağırlık %${Math.round(f.weight * 100)}</span><div class="small muted">${esc(f.desc)} · desteğin %${Math.round(f.support)}</div></div></button>`).join('')}</div></div>` : ''}
      ${params.includes('channel') ? `<div class="f">Kanal<div class="chips">${Object.entries(CHANNELS).map(([k, c]) => `<button class="chip ${prm.channel === k ? 'on' : ''}" data-channel="${k}">${c.label}</button>`).join('')}</div></div>` : ''}
      ${params.includes('topic') ? `<div class="f">Konu<div class="chips">${TOPICS.map(t => `<button class="chip ${prm.topic === t.id ? 'on' : ''}" data-topic="${t.id}">${t.label}</button>`).join('')}</div></div>` : ''}
      ${params.includes('venue') ? `<div class="f">Mekân<div class="grid3">${VENUES.map(v => `<button class="select-card ${prm.venue === v.id ? 'on' : ''}" data-venue="${v.id}" style="padding:8px;flex-direction:column;gap:2px"><span style="font-size:22px">${v.icon}</span><b class="small">${esc(v.label)}</b><span class="small muted" style="font-size:11px">${esc(v.desc)}</span></button>`).join('')}</div></div>` : ''}
      ${params.includes('stance') ? `<div class="f">Tutum<div class="list">${stancesFor(prm.topic).map(st => `<button class="select-card ${prm.stance === st.id ? 'on' : ''}" data-stance="${st.id}" style="padding:10px;margin-top:6px"><div style="flex:1"><b>${esc(st.label)}</b><div class="small muted" style="font-family:var(--f-news)">“${esc(st.quote)}”</div>${audChips(st.audience)}</div></button>`).join('')}</div></div>` : ''}
      ${params.includes('speech') ? `<div class="f">Konuşma metni<div class="list">${(SPEECHES[prm.topic] || SPEECHES.ekonomi).map(sp => `<button class="select-card ${prm.speech === sp.id ? 'on' : ''}" data-speech="${sp.id}" style="padding:10px;margin-top:6px"><div style="flex:1"><b style="font-family:var(--f-news)">“${esc(sp.text)}”</b>${audChips(sp.audience)}</div></button>`).join('')}</div></div>` : ''}
      ${params.includes('transport') ? `<div class="f">Lojistik / taşıma<div class="chips wrap">${TRANSPORT.map(t => `<button class="chip ${prm.transport === t.id ? 'on' : ''}" data-transport="${t.id}">${t.label}</button>`).join('')}</div></div>` : ''}
      ${params.includes('tone') ? `<div class="f">Ton<div class="chips">${TONES.map(([k, l]) => `<button class="chip ${prm.tone === k ? 'on' : ''}" data-tone="${k}">${l}</button>`).join('')}</div></div>` : ''}
      <div class="card" style="background:var(--bg);box-shadow:none"><div class="eyebrow" style="margin-bottom:6px">Beklenen etki <span style="text-transform:none;letter-spacing:0;font-weight:500">(gerçek sonuç şansa ve gizli etkenlere bağlı)</span></div>
        <dl class="kv"><dt>Eylem puanı</dt><dd>${action.ap}</dd><dt>Maliyet</dt><dd>${cost ? fmtMoney(cost) : 'Ücretsiz'}${action.personal ? ' (kişisel)' : ''}</dd>${est.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
      ${ok !== true ? `<p class="small" style="color:var(--bad);margin:0">${esc(ok)}</p>` : ''}
      <button class="btn red block" id="p-go" ${ok === true ? '' : 'disabled'}>Uygula</button>`;
    body.querySelector('#p-prov')?.addEventListener('change', e => { prm.province = +e.target.value; draw(); });
    body.querySelectorAll('[data-faction]').forEach(b => b.onclick = () => { prm.faction = b.dataset.faction; draw(); });
    body.querySelectorAll('[data-region]').forEach(b => b.onclick = () => { prm.region = b.dataset.region; draw(); });
    body.querySelectorAll('[data-channel]').forEach(b => b.onclick = () => { prm.channel = b.dataset.channel; prm = defaults(action, prm); draw(); });
    body.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => { prm.topic = b.dataset.topic; if (params.includes('stance')) prm.stance = stancesFor(prm.topic)[0].id; if (params.includes('speech')) prm.speech = SPEECHES[prm.topic][0].id; draw(); });
    body.querySelectorAll('[data-venue]').forEach(b => b.onclick = () => { prm.venue = b.dataset.venue; draw(); });
    body.querySelectorAll('[data-speech]').forEach(b => b.onclick = () => { prm.speech = b.dataset.speech; draw(); });
    body.querySelectorAll('[data-transport]').forEach(b => b.onclick = () => { prm.transport = b.dataset.transport; draw(); });
    body.querySelectorAll('[data-stance]').forEach(b => b.onclick = () => { prm.stance = b.dataset.stance; draw(); });
    body.querySelectorAll('[data-tone]').forEach(b => b.onclick = () => { prm.tone = b.dataset.tone; draw(); });
    body.querySelector('#p-go').onclick = () => {
      sh.close();
      const res = ctx.act(action, prm);
      if (!res || res.interactive) return;
      showActionResult(ctx, action, res);
    };
  };
  draw();
}

function showActionResult(ctx, action, res) {
  playCinema(ctx, action, res);
}

export function audChips(aud = {}) {
  const list = Object.entries(aud).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);
  if (!list.length) return '';
  return `<div class="aud-chips">${list.map(([k, v]) => `<span class="aud-chip ${v >= 0.8 ? 'hi' : ''}">${esc(CLUSTERS.find(c => c.id === k).label)}</span>`).join('')}</div>`;
}

function runningCampaigns(s) {
  const run = s.socialCampaigns || [];
  const hist = (s.socialHistory || []).slice(0, 5);
  if (!run.length && !hist.length) return '';
  const def = id => SOCIAL_CAMPAIGNS.find(d => d.id === id);
  const compact = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' Mn' : fmtInt(v);
  return `<section class="card anim-in"><h2>Sosyal medya panosu <small>${run.length} kampanya sürüyor</small></h2>
    ${run.map(c => { const d = def(c.id); const k = 1 - c.weeksLeft / c.weeksTotal; return `<div class="camp-run">
      <div class="row" style="justify-content:space-between"><b>${d.icon} ${esc(d.label)}</b>${c.viral ? '<span class="pill bad">🔥 viral</span>' : c.backfire ? '<span class="pill warn">ters tepti</span>' : ''}</div>
      <div class="kfbar"><div style="width:${Math.round(100 * k)}%"></div></div>
      <div class="row small muted" style="justify-content:space-between"><span>👁 ${compact(c.views)} · ❤️ ${compact(c.likes)} · 🔁 ${compact(c.shares)}</span><span>${Math.ceil(c.weeksLeft)} hafta kaldı</span></div></div>`; }).join('')}
    ${hist.length ? `<div class="eyebrow" style="margin-top:6px">Biten kampanyalar</div><div class="list">${hist.map(h => `<div class="li small"><span>${def(h.id).icon}</span><div class="grow">${esc(def(h.id).label)} <span class="muted">· ${fmtDate(h.start)}</span></div><span class="muted num">👁 ${compact(h.views)}</span></div>`).join('')}</div>` : ''}
  </section>`;
}

export function renderCampaign(view, ctx) {
  const s = ctx.state;
  const acts = availableActions(s);
  const cats = [...new Set(acts.map(a => a.cat))];
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>${pre ? 'Kurultay kampanyası' : 'Bu turun eylemleri'}</h2>
    <p class="small muted" style="margin:0">Kalan eylem puanı: <b style="color:var(--ink)">${s.player.ap}</b>. ${s.phase === 'campaign' ? 'Kampanya döneminde her tur bir gün ve 3 puandır.' : 'Her hafta puanların yenilenir; kullanılmayan puan aktarılmaz.'}
    ${pre ? ' Önce partinin kurultayını kazanmalısın; parti eylemleri genel başkan olunca açılır.' : ' Aynı ilde veya aynı eylemi arka arkaya yapmak seçmen yorgunluğu yaratır.'}</p></section>`);
  if (!pre) view.insertAdjacentHTML('beforeend', runningCampaigns(s));
  cats.forEach((cat, ci) => {
    const sec = document.createElement('section');
    sec.className = 'card anim-in';
    sec.style.animationDelay = `${ci * 70}ms`;
    sec.innerHTML = `<h2>${esc(cat)}${cat === 'Sosyal medya' ? ' <small>her kampanya farklı kitleye ulaşır</small>' : ''}</h2><div class="list">${acts.filter(a => a.cat === cat).map((a, ai) => {
      const c = a.params && !a.social ? null : actionCost(s, a, {});
      const running = a.social && (s.socialCampaigns || []).find(x => x.id === a.social.id);
      return `<button class="li anim-in" data-action="${a.id}" style="background:none;border:0;text-align:left;width:100%;animation-delay:${ci * 70 + ai * 40}ms">
        <span class="act-ico" style="font-size:24px;width:32px;text-align:center" aria-hidden="true">${a.icon}</span>
        <div class="grow"><div class="t">${esc(a.label)}${running ? ' <span class="pill good">sürüyor</span>' : ''}</div>${a.social ? `<div class="small muted">${esc(a.social.platform)} · ${a.social.weeks} hafta</div>` : ''}<div class="small muted">${esc(a.desc)}</div>${a.social ? audChips(a.social.audience) : ''}</div>
        <div style="text-align:right;white-space:nowrap"><div class="small"><b>${a.ap}</b> puan</div><div class="small muted">${c === null ? 'değişken' : c ? esc(fmtMoney(c)) : 'ücretsiz'}</div></div></button>`;
    }).join('')}</div>`;
    view.appendChild(sec);
  });
  view.querySelectorAll('[data-action]').forEach(b => b.onclick = () => openAction(ctx, acts.find(a => a.id === b.dataset.action), ctx.prefill || {}));
  ctx.prefill = null;
}
