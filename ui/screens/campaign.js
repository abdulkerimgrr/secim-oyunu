// Kampanya sekmesi: eylem kartları ve parametre/önizleme sayfası.
import { esc, sheet, toast } from '../dom.js';
import { availableActions, canRun, describeEstimate, CHANNELS, actionCost } from '../../engine/actions.js';
import { TOPICS } from '../../data/clusters.js';
import { PROVINCES } from '../../data/generated/provinces.js';
import { REGION_NAMES } from '../../engine/regions.js';
import { fmtMoney } from '../../engine/util.js';
import { playerParty } from '../../engine/state.js';

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
      ${params.includes('tone') ? `<div class="f">Ton<div class="chips">${TONES.map(([k, l]) => `<button class="chip ${prm.tone === k ? 'on' : ''}" data-tone="${k}">${l}</button>`).join('')}</div></div>` : ''}
      <div class="card" style="background:var(--bg);box-shadow:none"><div class="eyebrow" style="margin-bottom:6px">Beklenen etki <span style="text-transform:none;letter-spacing:0;font-weight:500">(gerçek sonuç şansa ve gizli etkenlere bağlı)</span></div>
        <dl class="kv"><dt>Eylem puanı</dt><dd>${action.ap}</dd><dt>Maliyet</dt><dd>${cost ? fmtMoney(cost) : 'Ücretsiz'}${action.personal ? ' (kişisel)' : ''}</dd>${est.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
      ${ok !== true ? `<p class="small" style="color:var(--bad);margin:0">${esc(ok)}</p>` : ''}
      <button class="btn red block" id="p-go" ${ok === true ? '' : 'disabled'}>Uygula</button>`;
    body.querySelector('#p-prov')?.addEventListener('change', e => { prm.province = +e.target.value; draw(); });
    body.querySelectorAll('[data-faction]').forEach(b => b.onclick = () => { prm.faction = b.dataset.faction; draw(); });
    body.querySelectorAll('[data-region]').forEach(b => b.onclick = () => { prm.region = b.dataset.region; draw(); });
    body.querySelectorAll('[data-channel]').forEach(b => b.onclick = () => { prm.channel = b.dataset.channel; prm = defaults(action, prm); draw(); });
    body.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => { prm.topic = b.dataset.topic; draw(); });
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
  const r = sheet(`<div class="eyebrow">${esc(action.label)}${res.cost ? ' · ' + esc(fmtMoney(res.cost)) : ''}</div>
    <h2 style="color:${res.bad ? 'var(--bad)' : 'var(--ink)'}">${esc(res.title)}</h2>
    <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${res.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="grid2"><button class="btn" data-a="close">Tamam</button>${ctx.state.player.ap > 0 ? '<button class="btn primary" data-a="more">Başka eylem</button>' : '<button class="btn primary" data-a="end">Turu bitir</button>'}</div>`);
  r.root.querySelector('[data-a=close]').onclick = () => r.close();
  r.root.querySelector('[data-a=more]')?.addEventListener('click', () => { r.close(); ctx.go('kampanya'); });
  r.root.querySelector('[data-a=end]')?.addEventListener('click', () => { r.close(); ctx.endTurn(); });
}

export function renderCampaign(view, ctx) {
  const s = ctx.state;
  const acts = availableActions(s);
  const cats = [...new Set(acts.map(a => a.cat))];
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>${pre ? 'Kurultay kampanyası' : 'Bu turun eylemleri'}</h2>
    <p class="small muted" style="margin:0">Kalan eylem puanı: <b style="color:var(--ink)">${s.player.ap}</b>. ${s.phase === 'campaign' ? 'Kampanya döneminde her tur bir gün ve 3 puandır.' : 'Her hafta puanların yenilenir; kullanılmayan puan aktarılmaz.'}
    ${pre ? ' Önce partinin kurultayını kazanmalısın; parti eylemleri genel başkan olunca açılır.' : ' Aynı ilde veya aynı eylemi arka arkaya yapmak seçmen yorgunluğu yaratır.'}</p></section>`);
  for (const cat of cats) {
    const sec = document.createElement('section');
    sec.className = 'card';
    sec.innerHTML = `<h2>${esc(cat)}</h2><div class="list">${acts.filter(a => a.cat === cat).map(a => {
      const c = a.params ? null : actionCost(s, a, {});
      return `<button class="li" data-action="${a.id}" style="background:none;border:0;text-align:left;width:100%">
        <span style="font-size:24px;width:32px;text-align:center" aria-hidden="true">${a.icon}</span>
        <div class="grow"><div class="t">${esc(a.label)}</div><div class="small muted">${esc(a.desc)}</div></div>
        <div style="text-align:right;white-space:nowrap"><div class="small"><b>${a.ap}</b> puan</div><div class="small muted">${c === null ? 'değişken' : c ? esc(fmtMoney(c)) : 'ücretsiz'}</div></div></button>`;
    }).join('')}</div>`;
    view.appendChild(sec);
  }
  view.querySelectorAll('[data-action]').forEach(b => b.onclick = () => openAction(ctx, acts.find(a => a.id === b.dataset.action), ctx.prefill || {}));
  ctx.prefill = null;
}
