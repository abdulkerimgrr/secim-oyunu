// Hükümet gündemi (yapay zekâ iktidar), dış ilişkiler, ekonomi bültenleri ve dünya haberleri.
import { POLICIES, FOREIGN_START, WORLD_NEWS } from '../data/policies.js';
import { CLUSTERS } from '../data/clusters.js';
import { clamp, addDays } from './util.js';
import { addNews } from './news.js';

export const policyById = id => POLICIES.find(p => p.id === id);

export function ensureGovState(state) {
  if (!state.govAgenda) state.govAgenda = { active: [], history: [], nextAt: addDays(state.date, 21) };
  if (!state.foreign) state.foreign = { ...FOREIGN_START };
  if (state.economy.policyRate === undefined) state.economy.policyRate = 15; // Haziran 2023 — tahmini
  if (!state.relations) state.relations = {};
  if (!state.flags.policyStances) state.flags.policyStances = {};
}

let clusterCache = null;
export function nationalClusters(state) {
  if (clusterCache && clusterCache.n === state.units.length) return clusterCache.v;
  const tot = state.units.reduce((a, u) => a + u.registered, 0);
  const v = CLUSTERS.map((_, i) => state.units.reduce((a, u) => a + u.clusters[i] * u.registered, 0) / tot);
  clusterCache = { n: state.units.length, v };
  return v;
}

// Kamuoyu desteği (0–1)
export function publicSupport(state, pol) {
  const nc = nationalClusters(state);
  let sc = 0;
  CLUSTERS.forEach((c, i) => { sc += nc[i] * ((pol.pro[c.id] || 0) - (pol.anti[c.id] || 0)); });
  return clamp(0.5 + 0.45 * sc, 0.12, 0.88);
}

export function foreignScore(state) {
  const f = state.foreign || FOREIGN_START;
  return Object.values(f).reduce((a, b) => a + b, 0) / Object.values(f).length;
}

export function applyForeign(state, delta = {}, mult = 1) {
  for (const [k, v] of Object.entries(delta)) state.foreign[k] = clamp((state.foreign[k] ?? 50) + v * mult, 0, 100);
}

export function applyEcon(state, econ = {}, mult = 1) {
  const e = state.economy;
  if (econ.inflation) { e.inflation = clamp(e.inflation + econ.inflation * mult, 3, 130); e.target = clamp(e.target + econ.inflation * 0.6 * mult, 5, 100); }
  if (econ.target) e.target = clamp(e.target + econ.target * mult, 5, 100);
  if (econ.growth) e.growth = clamp(e.growth + econ.growth * mult, -8, 10);
  if (econ.unemployment) e.unemployment = clamp(e.unemployment + econ.unemployment * mult, 5, 20);
  if (econ.usd) e.usdTry = +(e.usdTry * (1 + econ.usd * mult)).toFixed(2);
  if (econ.rate) e.policyRate = clamp(e.policyRate + econ.rate * mult, 0, 70);
}

const govParty = state => state.parties[state.government.find(id => state.parties[id]?.govWeight === 1) || state.government[0]];

function govSeats(state) {
  return state.government.reduce((a, id) => a + (state.parliament.seats[id] || 0), 0);
}

// Hükümet planına oyuncunun tutumunu soran olay
function policyQuestion(state, pol, support) {
  const p = state.parties[state.player.partyId];
  return {
    uid: `pol-${pol.id}-${state.turn}`, id: 'pol:' + pol.id, date: state.date, title: `Hükümet gündemi: ${pol.title}`, source: 'hükümet gündemi',
    body: `${pol.plan} İlk anketlere göre kamuoyunun yaklaşık %${Math.round(support * 100)}'i destekliyor. ${p.short} olarak tutumun ne olacak?`,
    options: [
      { i: 0, label: 'Destekle', ideologyHint: pol.axis, effects: { cluster: { aud: pol.pro, power: [0.012, 0.03] }, policyStance: { id: pol.id, stance: 'destek' } } },
      { i: 1, label: 'Karşı çık', ideologyHint: pol.axis ? Object.fromEntries(Object.entries(pol.axis).map(([k, v]) => [k, -v])) : undefined, effects: { cluster: { aud: pol.anti, power: [0.012, 0.03] }, policyStance: { id: pol.id, stance: 'karsi' } } },
      { i: 2, label: 'Şartlı destek: değişiklik önergesi ver', effects: { cluster: { aud: { kararsiz: 1 }, power: [0.004, 0.012] }, recognition: [0.002, 0.006], policyStance: { id: pol.id, stance: 'sartli' } } },
    ],
  };
}

export function govTick(state, rng, f, { playerGoverns = false } = {}) {
  ensureGovState(state);
  const e = state.economy;
  const gp = govParty(state);
  // --- Aylık ekonomi bülteni ---
  const month = state.date.slice(0, 7);
  if (state.flags.lastBulletin !== month) {
    const prev = state.flags.lastInflation ?? e.inflation;
    state.flags.lastBulletin = month;
    state.flags.lastInflation = e.inflation;
    addNews(state, 'econ', `TÜİK: Yıllık enflasyon %${e.inflation.toFixed(1).replace('.', ',')} oldu (önceki ay %${prev.toFixed(1).replace('.', ',')}); işsizlik %${e.unemployment.toFixed(1).replace('.', ',')}`);
    // Merkez Bankası kararı (oyuncu cumhurbaşkanı değilse kural tabanlı)
    if (!playerGoverns) {
      const want = clamp(e.inflation * 0.95 + 3 + (state.flags.tight ? 6 : 0), 5, 70);
      const step = Math.round(clamp((want - e.policyRate) * 0.35, -5, 7.5) * 2) / 2;
      e.policyRate = clamp(e.policyRate + step, 0, 70);
      const rt = `%${e.policyRate.toFixed(1).replace('.', ',')}`;
      addNews(state, 'econ', step > 0 ? `Merkez Bankası politika faizini ${step.toFixed(1).replace('.', ',')} puan artırdı; yeni faiz ${rt}` : step < 0 ? `Merkez Bankası faiz indirdi; yeni politika faizi ${rt}` : `Merkez Bankası politika faizini sabit tuttu (${rt})`);
    }
    addNews(state, 'econ', `Piyasalar: Dolar/TL ${e.usdTry.toFixed(2).replace('.', ',')}; büyüme beklentisi %${e.growth.toFixed(1).replace('.', ',')}`);
  }
  // Reel faiz enflasyon hedefini etkiler
  e.target = clamp(e.target - 0.008 * (e.policyRate - e.inflation) * f, 8, 95);

  // --- Dış ilişkiler: yavaş ortalamaya dönüş, ekonomiye etki ---
  for (const k of Object.keys(state.foreign)) state.foreign[k] += (50 - state.foreign[k]) * 0.004 * f + rng.normal(0, 0.3) * Math.sqrt(f);
  const fs = foreignScore(state);
  e.usdTry = +(e.usdTry * (1 + (50 - fs) * 0.00004 * f)).toFixed(2);

  // --- Dünya gündemi ---
  if (rng.chance(0.1 * f)) {
    const w = rng.pick(WORLD_NEWS);
    applyForeign(state, w.foreign || {});
    applyEcon(state, w.econ || {});
    addNews(state, 'world', `Dünya: ${w.text}`);
  }

  if (playerGoverns || !gp) return;
  // --- Hükümet gündemi ---
  const ag = state.govAgenda;
  for (const a of [...ag.active]) {
    if (state.date < a.voteAt) continue;
    const pol = policyById(a.id);
    ag.active = ag.active.filter(x => x !== a);
    let outcome;
    if (a.support < 0.35 && rng.chance(0.45)) outcome = 'geri';
    else outcome = rng.chance(govSeats(state) >= (pol.needs || 301) ? 0.9 : 0.3) ? 'kabul' : 'red';
    a.outcome = outcome; a.end = state.date;
    ag.history.unshift(a);
    if (ag.history.length > 30) ag.history.length = 30;
    if (outcome === 'kabul') {
      applyEcon(state, pol.econ || {});
      applyForeign(state, pol.foreign || {});
      if (pol.id === 'sikilastirma') state.flags.tight = true;
      const mom = (pol.popularity || 0) + (a.support - 0.5) * 0.06;
      for (const id of state.government) state.parties[id].momentum += mom * (state.parties[id].govWeight || 0.5);
      addNews(state, 'gov', `TBMM: "${pol.title}" kabul edildi`);
    } else {
      gp.momentum -= 0.01;
      addNews(state, 'gov', outcome === 'geri' ? `Hükümet tepkiler üzerine "${pol.title}" planını geri çekti` : `TBMM: "${pol.title}" reddedildi`);
    }
    // Oyuncunun tutumu haklı çıktı mı?
    const st = state.flags.policyStances[pol.id];
    if (st) {
      const me = state.parties[state.player.partyId];
      const right = (st === 'destek' && a.support >= 0.5) || (st === 'karsi' && a.support < 0.5);
      if (right) { me.momentum += 0.015; addNews(state, 'player', `${me.short}, "${pol.title}" konusundaki tutumuyla kamuoyunun nabzını tuttu`); }
      delete state.flags.policyStances[pol.id];
    }
  }
  if (state.date >= ag.nextAt && ag.active.length < 2) {
    const recent = new Set([...ag.active.map(a => a.id), ...ag.history.filter(h => addDays(h.end, 365) > state.date).map(h => h.id)]);
    const cands = POLICIES.filter(p => !recent.has(p.id));
    if (cands.length) {
      const pol = rng.pick(cands);
      const support = clamp(publicSupport(state, pol) + rng.normal(0, 0.04), 0.1, 0.9);
      ag.active.push({ id: pol.id, start: state.date, voteAt: addDays(state.date, 7 * rng.int(3, 7)), support });
      addNews(state, 'gov', `Hükümet planı: ${pol.title}`);
      const pl = state.player;
      if (pl.isLeader && !state.government.includes(pl.partyId) && state.events.active.length < 3) {
        state.events.active.push(policyQuestion(state, pol, support));
      }
    }
    ag.nextAt = addDays(state.date, 7 * rng.int(3, 6));
  }
}
