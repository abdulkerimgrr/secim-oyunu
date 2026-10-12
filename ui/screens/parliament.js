// Meclis ve ittifaklar: mevcut meclis, "bugün seçim olsa", ittifak teklifleri.
import { esc, sheet, toast } from '../dom.js';
import { hemicycle } from '../charts.js';
import { project } from '../../engine/model.js';
import { computeSeats } from '../../engine/election.js';
import { proposeAlliance, leaveAlliance, allianceChance } from '../../engine/turn.js';
import { playerParty } from '../../engine/state.js';
import { saveGame } from '../../engine/save.js';
import { fmtDate, pct, fmtInt } from '../../engine/util.js';
import { relation } from '../../engine/diplomacy.js';
import { nominees, SIGNATURES_NEEDED } from '../../engine/presidential.js';

// Yarım daire sırası: sol → sağ (ideolojik "din + milli" eksenine göre kabaca)
function order(s, seats) {
  return Object.entries(seats).filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n, color: s.parties[id].color, k: s.parties[id].ideology.din + s.parties[id].ideology.milli + s.parties[id].ideology.eko }))
    .sort((a, b) => a.k - b.k);
}

function seatTable(s, seats, shares) {
  return `<div class="list">${Object.entries(seats).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => {
    const p = s.parties[id];
    return `<div class="li"><i class="swatch" style="background:${p.color}"></i><div class="grow"><span class="t">${esc(p.short)}</span>${p.alliance ? ` <span class="small muted">· ${esc(s.alliances[p.alliance]?.name || '')}</span>` : ''}${s.government.includes(id) ? ' <span class="pill good">iktidar</span>' : ''}</div>
      ${shares ? `<span class="small muted num">${pct(shares[id] || 0)}</span>` : ''}<b class="num" style="font-family:var(--f-display);font-size:18px;width:40px;text-align:right">${n}</b></div>`;
  }).join('')}</div>`;
}

export function renderParliament(view, ctx) {
  const s = ctx.state;
  const me = playerParty(s);
  const seats = s.parliament.seats;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>TBMM <small>${fmtDate(s.parliament.date)} seçimi sonrası</small></h2>
    ${hemicycle(order(s, seats))}${seatTable(s, seats)}
    <p class="small muted" style="margin:6px 0 0">Cumhurbaşkanı: ${esc(s.president)}. Cumhurbaşkanlığı seçimi ve hükümet sistemi ayrıntıları sonraki aşamada. Seçim sonrası milletvekili transferleri bu sürümde gösterilmez.</p></section>`);

  // Bugün seçim olsa (gürültüsüz model tahmini, yalnızca seçime girebilen partiler)
  const pr = project(s, { ballotOnly: true });
  const proj = computeSeats(s, pr);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Bugün seçim olsa <small>model tahmini · D'Hondt · %7 baraj</small></h2>
    ${hemicycle(order(s, proj.seats))}${seatTable(s, proj.seats, pr.national)}
    ${s.player.mode === 'found' && !me.onBallot ? `<p class="small" style="color:var(--warn);margin:6px 0 0">${esc(me.short)} şu an seçime katılma şartlarını sağlamadığı için bu tahminde yer almıyor.</p>` : ''}</section>`);

  // İttifaklar
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  const cands = Object.values(s.parties).filter(p => !p.aggregate && !p.dissolved && p.id !== me.id);
  const alls = {};
  for (const p of Object.values(s.parties)) if (p.alliance) (alls[p.alliance] = alls[p.alliance] || []).push(p);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>İttifaklar</h2>
    <div class="list">${Object.entries(alls).map(([id, ps]) => `<div class="li"><i class="swatch" style="background:${s.alliances[id]?.color}"></i><div class="grow"><div class="t">${esc(s.alliances[id]?.name || id)}</div><div class="small muted">${ps.map(p => esc(p.short)).join(' + ')}</div></div></div>`).join('') || '<p class="small muted">Şu an ittifak yok.</p>'}</div>
    <p class="small muted" style="margin:6px 0 0">İttifak toplamı %7'yi geçerse tüm üyeler barajı geçmiş sayılır; sandalyeler her partinin kendi oyuyla dağıtılır (2022 kuralı).</p>
    ${pre ? '' : me.alliance ? `<button class="btn block" style="margin-top:8px" id="leave">İttifaktan ayrıl</button>` : `<div class="eyebrow" style="margin:10px 0 4px">İttifak teklif et (2 puan)</div>
      <div class="list">${cands.map(p => { const c = allianceChance(s, p.id); return `<div class="li"><i class="swatch" style="background:${p.color}"></i><div class="grow"><span class="t">${esc(p.short)}</span> <span class="small muted">${p.alliance ? '· ' + esc(s.alliances[p.alliance]?.name || '') : ''}</span></div>
        <span class="pill ${c > 0.5 ? 'good' : c > 0.2 ? 'warn' : 'bad'}">%${Math.round(c * 100)} şans</span><button class="btn" data-ally="${p.id}">Teklif</button></div>`; }).join('')}</div>`}
  </section>`);
  view.querySelector('#leave')?.addEventListener('click', () => {
    const sh = sheet(`<h2>İttifaktan ayrıl?</h2><p>Barajı tek başına geçmen gerekecek.</p><div class="grid2"><button class="btn" data-a="no">Vazgeç</button><button class="btn red" data-a="yes">Ayrıl</button></div>`);
    sh.root.querySelector('[data-a=no]').onclick = sh.close;
    sh.root.querySelector('[data-a=yes]').onclick = () => { leaveAlliance(s); saveGame(s, 'oto'); sh.close(); ctx.render(); };
  });
  view.querySelectorAll('[data-ally]').forEach(b => b.onclick = () => {
    const r = proposeAlliance(s, b.dataset.ally);
    if (r.error) return toast(r.error);
    saveGame(s, 'oto'); ctx.render();
    sheet(`<h2>${r.ok ? 'Teklif kabul edildi' : 'Teklif reddedildi'}</h2><p>${esc(r.text)}</p>`);
  });

  // İlişkiler
  if (!pre) {
    const ps = Object.values(s.parties).filter(p => !p.aggregate && !p.dissolved && p.id !== me.id);
    view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Partilerle ilişkiler <small>−100 … +100</small></h2><div class="bars">${ps.map(p => { const r = relation(s, p.id); const w = (r + 100) / 2;
      return `<div class="bar" style="grid-template-columns:64px 1fr 44px"><span class="name">${esc(p.short)}</span><div class="track"><div class="fill" style="width:${w}%;background:${r >= 20 ? 'var(--good)' : r <= -20 ? 'var(--bad)' : 'var(--warn)'}"></div><div class="thr" style="left:50%;border-color:var(--ink-2)"></div></div><span class="val">${r}</span></div>`; }).join('')}</div>
      <p class="small muted" style="margin:6px 0 0">Kampanya → Diplomasi → Siyasi ziyaret ile ilişkileri geliştirebilirsin. İyi ilişki ittifak ihtimalini artırır.</p></section>`);
  }
  // Cumhurbaşkanlığı yarışı
  const noms = nominees(s);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Cumhurbaşkanlığı yarışı <small>${fmtDate(s.nextElection)} · iki turlu</small></h2>
    <p class="small" style="margin:0 0 6px">Cumhurbaşkanı: <b>${esc(s.president)}</b>${s.player.isPresident ? ' (sen)' : ''}</p>
    <div class="list">${noms.map(c => `<div class="li"><span class="badge" style="background:${c.color}">${esc(c.short)}</span><div class="grow"><div class="t small">${esc(c.name)}${c.isPlayer ? ' <span class="pill good">sen</span>' : ''}</div><div class="small muted">${c.parties.map(id => s.parties[id].short).join(' + ')}</div></div></div>`).join('')}</div>
    <p class="small muted" style="margin:6px 0 0">Aday gösterebilmek için son seçimde %5 oy ya da 20 milletvekili gerekir; aksi hâlde 100 bin seçmen imzası (Teşkilat → Cumhurbaşkanlığı adaylığı için imza). Toplanan imza: ${fmtInt(s.flags.cbSignatures || 0)} / ${fmtInt(SIGNATURES_NEEDED)}. Görev süresi dolan Cumhurbaşkanı yerine partisi yeni bir aday çıkarır.</p></section>`);
}
