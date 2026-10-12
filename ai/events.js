// Olay üretimi. Katman 1: kural tabanlı havuz (çevrimdışı).
// Katman 2 (Claude API, sunucu/proxy üzerinden) Aşama 7'de eklenecek; aynı olay şemasını kullanacak
// ve bağlantı yoksa bu havuza geri dönecek.
import { EVENT_POOL } from '../data/events.js';
import { applyEconShock } from '../engine/economy.js';
import { clamp, addDays, fmtMoney, pct } from '../engine/util.js';
import { addNews } from '../engine/news.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { bumpAll, bumpFaction } from '../engine/kurultay.js';
import { addClusterMom } from '../engine/social.js';
import { CLUSTERS } from '../data/clusters.js';

function eligible(state, ev) {
  const w = ev.when || {};
  const pl = state.player, p = state.parties[pl.partyId];
  const poll = state.polls.length ? state.polls[state.polls.length - 1].shares[p.id] || 0 : 0;
  const misery = state.economy.inflation + 2 * state.economy.unemployment - state.economy.misery0;
  if (w.mode && w.mode !== pl.mode) return false;
  if (w.leader && !pl.isLeader) return false;
  if (w.preKurultay && (pl.mode !== 'join' || pl.isLeader)) return false;
  if (!w.preKurultay && pl.mode === 'join' && !pl.isLeader && !ev.world) return false;
  if (w.minRec !== undefined && p.recognition < w.minRec) return false;
  if (w.maxRec !== undefined && p.recognition > w.maxRec) return false;
  if (w.minPoll !== undefined && poll < w.minPoll) return false;
  if (w.maxPoll !== undefined && poll > w.maxPoll) return false;
  if (w.minMisery !== undefined && misery < w.minMisery) return false;
  if (w.phase && state.phase !== w.phase) return false;
  const last = state.events.seen[ev.id];
  if (last && addDays(last, 7 * 16) > state.date) return false; // 16 hafta tekrar yok
  return true;
}

export function maybeTriggerEvent(state, rng, prob) {
  if (state.events.active.length >= 2 || !rng.chance(prob)) return null;
  const pool = EVENT_POOL.filter(ev => eligible(state, ev));
  if (!pool.length) return null;
  const ev = rng.weighted(pool, e => e.weight || 1);
  state.events.seen[ev.id] = state.date;
  if (ev.econShock) applyEconShock(state, ev.econShock, rng);
  const inst = { uid: `${ev.id}-${state.turn}`, id: ev.id, date: state.date, title: ev.title, body: ev.body, source: 'havuz',
    options: ev.options.map((o, i) => ({ i, label: o.label, effects: o.effects, ideologyHint: o.ideologyHint, oppositionOnly: o.oppositionOnly })) };
  state.events.active.push(inst);
  addNews(state, 'event', `SON DAKİKA: ${ev.title}`);
  return inst;
}

// Seçeneğin parti ideolojisiyle uyumu (tutarsızlık "U dönüşü" olarak cezalandırılır)
function consistency(state, opt) {
  if (!opt.ideologyHint) return 1;
  const p = state.parties[state.player.partyId];
  let m = 1;
  for (const [ax, dir] of Object.entries(opt.ideologyHint)) {
    const pos = p.ideology[ax] || 0;
    if (dir === 0) m *= 1 - 0.2 * Math.abs(pos);
    else m *= 1 + 0.6 * dir * pos; // aynı yöndeyse >1, terse <1
  }
  return clamp(m, 0.2, 1.6);
}

export function describeOption(state, opt) {
  const e = opt.effects || {}, out = [];
  const c = consistency(state, opt);
  const r = (a, d = 2, s = '') => `${a[0] >= 0 ? '+' : ''}${a[0].toFixed(d)} … ${a[1] >= 0 ? '+' : ''}${a[1].toFixed(d)}${s}`;
  if (e.momentum) out.push(`İvme ${r(e.momentum.map(x => x * c), 2)}`);
  if (e.recognition) out.push(`Tanınırlık +${pct(e.recognition[0], 1)}…+${pct(e.recognition[1], 1)}`);
  if (e.unity) out.push(`İç huzur ${r(e.unity, 0)}`);
  if (e.money) out.push(`Para ${fmtMoney(e.money[0])} … ${fmtMoney(e.money[1])}`);
  if (e.image) out.push(`İmaj ${r(e.image.map(x => x * 100), 0, ' puan')}`);
  if (e.region) out.push(`${e.region.name} bölgesinde etki`);
  if (e.support) out.push(`Delege desteği ${r(e.support, 0)}`);
  if (e.cluster) { const lb = Object.entries(e.cluster.aud || {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.5).map(([k]) => CLUSTERS.find(x => x.id === k)?.label).join(', '); out.push(lb ? `Hedef kitle: ${lb}` : 'Kitle etkisi sınırlı'); }
  if (e.factions) { const k = state.player.kurultay; out.push(Object.entries(e.factions).map(([f, v]) => `${k?.factions.find(x => x.id === f)?.label || f} ${r(v, 0)}`).join(' · ')); }
  if (e.kurultayShift) out.push('Kurultay tarihi öne alınabilir');
  if (e.scandalRisk) out.push(`Skandal riski %${Math.round(e.scandalRisk * 100)}`);
  if (e.orgBoost) out.push('Bir ilde teşkilat güçlenir');
  if (e.members) out.push('Yeni üyeler');
  if (e.ballotSecurity) out.push('Sandık güvenliği artar');
  if (e.intel) out.push('İl bazında detaylı anket');
  if (opt.ideologyHint) out.push(c >= 1 ? 'İdeolojinle tutarlı' : '⚠️ İdeolojinle çelişiyor (U dönüşü riski)');
  return out;
}

export function resolveEvent(state, uid, optIndex, rng) {
  const idx = state.events.active.findIndex(e => e.uid === uid);
  if (idx < 0) return null;
  const ev = state.events.active[idx];
  const opt = ev.options[optIndex];
  const p = state.parties[state.player.partyId];
  const e = opt.effects || {};
  const c = consistency(state, opt);
  const lines = [];
  const R = a => rng.range(a[0], a[1]);
  if (e.momentum) { const v = R(e.momentum) * c; p.momentum += v; lines.push(`İvme ${v >= 0 ? '+' : ''}${v.toFixed(3)}`); }
  if (e.recognition) { const v = R(e.recognition); p.recognition = clamp(p.recognition + v, 0, 1); lines.push(`Tanınırlık +${pct(v, 1)}`); }
  if (e.unity) { const v = R(e.unity); p.unity = clamp(p.unity + v, 0, 100); lines.push(`İç huzur ${v >= 0 ? '+' : ''}${v.toFixed(0)}`); }
  if (e.money) { const v = Math.round(R(e.money)); p.money += v; lines.push(`Para ${fmtMoney(v)}`); }
  if (e.image) { const v = R(e.image); p.leader.image = clamp(p.leader.image + v, 0, 1); lines.push(`İmaj ${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}`); }
  if (e.cluster) { const v = R(e.cluster.power) * c; addClusterMom(state, p.id, e.cluster.aud, v); lines.push(`Hedef kitlede ivme ${v >= 0 ? '+' : ''}${v.toFixed(3).replace('.', ',')}`); }
  if (e.policyStance) state.flags.policyStances = { ...(state.flags.policyStances || {}), [e.policyStance.id]: e.policyStance.stance };
  const k = state.player.kurultay;
  if (e.support && k && !state.player.isLeader) { const b = k.support; bumpAll(k, R(e.support)); lines.push(`Delege desteği ${k.support - b >= 0 ? '+' : ''}${(k.support - b).toFixed(1)}`); }
  if (e.factions && k && !state.player.isLeader) {
    const b = k.support;
    for (const [fid, rg] of Object.entries(e.factions)) bumpFaction(k, fid, R(rg));
    lines.push(`Delege desteği ${k.support - b >= 0 ? '+' : ''}${(k.support - b).toFixed(1)}`);
  }
  if (e.kurultayShift && k && !state.player.isLeader) {
    const d = Math.round(R(e.kurultayShift));
    if (d) {
      k.date = addDays(k.date, d); k.sigDeadline = addDays(k.sigDeadline, d);
      if (k.date <= state.date) k.date = addDays(state.date, 7);
      if (k.sigDeadline <= state.date) k.sigDeadline = state.date;
      lines.push(`Kurultay tarihi ${-d} gün öne alındı.`);
    } else lines.push('Kurultay tarihi değişmedi.');
  }
  if (e.members) { const v = Math.round(R(e.members)); p.members += v; lines.push(`+${v} üye`); }
  if (e.ballotSecurity) { state.ballotSecurity = clamp(state.ballotSecurity + R(e.ballotSecurity), 0, 1); lines.push('Sandık güvenliği arttı'); }
  if (e.intel) { state.intel = 8; lines.push('8 hafta boyunca il bazında detaylı anket görürsün (Harita → Benim oyum).'); }
  if (e.region) {
    const v = R(e.region.value);
    for (const pv of PROVINCES.filter(x => x.region === e.region.name)) {
      const cc = state.camp[pv.plate] || (state.camp[pv.plate] = {});
      cc[p.id] = (cc[p.id] || 0) + v;
    }
    lines.push(`${e.region.name} bölgesinde kampanya etkisi +${v.toFixed(2)}`);
  }
  if (e.orgBoost) {
    const plates = Object.keys(p.orgs);
    const pl = plates.length ? rng.pick(plates) : rng.pick(PROVINCES).plate;
    p.orgs[pl] = clamp((p.orgs[pl] || 0.1) + R(e.orgBoost), 0, 1);
    lines.push(`${PROVINCES.find(x => x.plate === +pl).name} teşkilatı güçlendi`);
  }
  if (e.scandalRisk && rng.chance(e.scandalRisk)) {
    p.leader.image = clamp(p.leader.image - 0.05, 0, 1); p.momentum -= 0.08;
    lines.push('⚠️ Konu basına yansıdı ve skandala dönüştü!');
    addNews(state, 'player', `${p.short} hakkında usulsüzlük iddiaları gündemde`);
  }
  if (c < 0.8) { p.momentum -= 0.02; lines.push('⚠️ Tutumun geçmiş çizginle çelişti; "U dönüşü" yorumları yapıldı.'); }
  state.events.active.splice(idx, 1);
  state.events.history.unshift({ date: state.date, title: ev.title, choice: opt.label });
  if (state.events.history.length > 60) state.events.history.length = 60;
  return { title: ev.title, choice: opt.label, lines };
}
