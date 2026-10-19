// Seçmen modeli: her seçim bölgesinde seçmen kümeleri, her küme partiler arasında
// çok terimli logit (softmax) ile oy dağıtır.
//
// Fayda = E[bölge][parti]            (başlangıçta 2023 sonucunu tam üreten kalibrasyon sabiti)
//       + K.recog·log(tanınırlık)     + K.org·log(teşkilat+0.03)  + K.image·Δimaj
//       − λ(küme)·ideolojik mesafe    − ekonomik hoşnutsuzluk (iktidar partileri)
//       + esneklik(küme)·(ulusal ivme + il kampanya etkisi)       − taktik oy cezası  (+ seçimde gürültü)
import { CLUSTERS, PARTY_TO_CLUSTER } from '../data/clusters.js';
import { K } from './params.js';

export const AX = ['eko', 'din', 'milli', 'yerel', 'dis', 'ozg', 'deger'];

export function ideologyDistance(a, b) {
  let s = 0;
  for (const k of AX) s += Math.abs((a[k] || 0) - (b[k] || 0));
  return s / AX.length; // 0 … 2
}

export function misery(econ) { return econ.inflation + 2 * econ.unemployment; }

// Seçmenin iktidara yönelik ekonomik şikâyeti (sefalet endeksi puanı, −4 … 25):
// hareketli ortalama sefaletin seçim dönemi başına göre artışı; yaşanan zirve yavaş unutulur
// (yaklaşık yılda %55 söner). Ekonomi düzelince iktidar ödüllendirilir ama sınırlı.
export function econGrievance(e) {
  const cur = (e.miserySm ?? misery(e)) - e.misery0;
  return Math.max(Math.max(-4, Math.min(25, cur)), Math.min(25, e.pain || 0));
}

// 2023 parti oylarından küme payları
export function clusterSharesFromVotes(votes) {
  const tot = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
  const w = Object.fromEntries(CLUSTERS.map(c => [c.id, 0]));
  const ysp = (votes.YSP || 0) / tot;
  for (const [k, v] of Object.entries(votes)) {
    const map = PARTY_TO_CLUSTER[k] || PARTY_TO_CLUSTER.DIGER;
    let share = v / tot;
    if (k === 'AKP') {
      const kf = Math.min(0.45, 0.03 + 0.7 * ysp);
      w.kurt += share * kf;
      share *= (1 - kf);
    }
    for (const [c, f] of Object.entries(map)) w[c] += share * f;
  }
  const s = Object.values(w).reduce((a, b) => a + b, 0);
  return CLUSTERS.map(c => w[c.id] / s);
}

export function activeParties(state, { ballotOnly = false } = {}) {
  return Object.values(state.parties).filter(p => !p.dissolved && (!ballotOnly || p.onBallot));
}

// Her tur bir kez hesaplanan parti bazlı terimler
function precompute(state, parties) {
  const m = econGrievance(state.economy);
  const near = electionProximity(state);
  const lastPoll = state.polls.length ? state.polls[state.polls.length - 1].shares : null;
  const thr = state.rules.parliament.threshold;
  return parties.map(p => {
    let tactical = 0;
    if (near > 0 && lastPoll && !p.aggregate) {
      const poll = lastPoll[p.id] ?? 0;
      const al = p.alliance ? allianceShare(state, lastPoll, p.alliance) : poll;
      if (Math.max(poll, al) < thr) tactical = K.tactical * near * (1 - Math.max(poll, al) / thr);
    }
    const imageDelta = p.leader.image - p.leader.image0;
    const shift = p.ideology0 ? ideologyDistance(p.ideology, p.ideology0) : 0;
    return {
      p,
      base: K.recog * Math.log(Math.max(0.003, p.recognition)) + K.image * imageDelta
            - K.ideologyShift * shift * shift * 4
            + (p.trust !== undefined ? 0.12 * (p.trust - 50) / 50 : 0), // güven (yalnızca oyuncu partisinde tanımlı)
      mom: p.momentum,
      econ: (p.govWeight || 0) * m * K.econ,
      tactical,
      cmom: sumArr(state.clusterMom?.[p.id], state.promiseMom?.[p.id]),
      dist: CLUSTERS.map(c => ideologyDistance(c.ideo, p.ideology)),
    };
  });
}

function sumArr(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a.map((v, i) => v + (b[i] || 0));
}

export function allianceShare(state, shares, allianceId) {
  let s = 0;
  for (const p of Object.values(state.parties)) if (p.alliance === allianceId && !p.dissolved) s += shares[p.id] || 0;
  return s;
}

// Seçime kalan süreye göre 0–1 (son 12 hafta yükselir)
export function electionProximity(state) {
  if (!state.nextElection) return 0;
  const days = (Date.parse(state.nextElection) - Date.parse(state.date)) / 86400000;
  if (days > 84) return 0;
  return Math.min(1, Math.max(0, 1 - days / 84) * 0.7 + 0.3);
}

// Tüm seçim bölgeleri için oy payı. noise: {nat:{k}, reg:{region:{k}}, unit(u,k)} (seçim günü)
// mobilize: seçim günü sandığa taşıma farkı (teşkilat, seçim altyapısı, moral) — engine/metrics.js
export function project(state, { ballotOnly = false, noise = null, mobilize = null } = {}) {
  const parties = activeParties(state, { ballotOnly });
  const pre = precompute(state, parties);
  const nC = CLUSTERS.length, nP = parties.length;
  const out = { units: [], national: {}, provinces: {} };
  const natVotes = Object.fromEntries(parties.map(p => [p.id, 0]));
  let natTotal = 0;
  const util = new Float64Array(nP);
  const clVotes = CLUSTERS.map(() => new Float64Array(nP));
  for (let ui = 0; ui < state.units.length; ui++) {
    const u = state.units[ui];
    const turnout = Math.min(0.97, Math.max(0.4, u.turnout0 * (1 + (state.turnoutShift || 0))));
    const valid = u.registered * turnout * u.validRatio;
    const camp = state.camp[u.plate] || {};
    const shares = new Float64Array(nP);
    const unitBase = new Float64Array(nP);
    for (let j = 0; j < nP; j++) {
      const q = pre[j], p = q.p;
      const org = p.orgs[u.plate] || 0;
      let b = (u.E[p.id] ?? state.newPartyE) + q.base + K.org * Math.log(org + 0.03) - q.tactical;
      if (noise) b += (noise.nat[p.id] || 0) + (noise.reg[u.region]?.[p.id] || 0) + noise.unit(u, p.id);
      unitBase[j] = b;
    }
    for (let c = 0; c < nC; c++) {
      const w = u.clusters[c];
      if (w <= 0) continue;
      const cl = CLUSTERS[c];
      let mx = -Infinity;
      for (let j = 0; j < nP; j++) {
        const q = pre[j];
        const v = unitBase[j] - cl.lambda * q.dist[c] - q.econ * cl.econ + cl.flex * (q.mom + (camp[q.p.id] || 0) + (q.cmom ? q.cmom[c] : 0));
        util[j] = v; if (v > mx) mx = v;
      }
      let s = 0;
      for (let j = 0; j < nP; j++) { util[j] = Math.exp(util[j] - mx); s += util[j]; }
      for (let j = 0; j < nP; j++) { shares[j] += w * util[j] / s; clVotes[c][j] += w * valid * util[j] / s; }
    }
    if (mobilize) {
      let t = 0;
      for (let j = 0; j < nP; j++) { shares[j] *= mobilize(parties[j], u.plate); t += shares[j]; }
      for (let j = 0; j < nP; j++) shares[j] /= t;
    }
    const rec = { id: u.id, plate: u.plate, seats: u.seats, turnout, valid, shares: {}, votes: {} };
    for (let j = 0; j < nP; j++) {
      const id = parties[j].id;
      rec.shares[id] = shares[j];
      rec.votes[id] = shares[j] * valid;
      natVotes[id] += rec.votes[id];
    }
    natTotal += valid;
    out.units.push(rec);
    const pv = out.provinces[u.plate] || (out.provinces[u.plate] = { votes: {}, valid: 0, registered: 0, voters: 0 });
    pv.valid += valid; pv.registered += u.registered; pv.voters += u.registered * turnout;
    for (const id in rec.votes) pv.votes[id] = (pv.votes[id] || 0) + rec.votes[id];
  }
  for (const id in natVotes) out.national[id] = natVotes[id] / natTotal;
  // Küme bazında ulusal paylar (seçmen grubu desteği için)
  out.clusters = clVotes.map(arr => {
    const t = arr.reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(parties.map((p, j) => [p.id, arr[j] / t]));
  });
  for (const pl in out.provinces) {
    const pv = out.provinces[pl];
    pv.shares = {};
    for (const id in pv.votes) pv.shares[id] = pv.votes[id] / pv.valid;
    pv.turnout = pv.voters / pv.registered;
  }
  out.natVotes = natVotes; out.natTotal = natTotal;
  return out;
}

// Başlangıç kalibrasyonu: E sabitlerini, model 2023 bölge sonuçlarını üretene kadar ayarla
export function calibrate(state, targets, iterations = 60) {
  for (const u of state.units) {
    u.E = {};
    for (const p of Object.values(state.parties)) u.E[p.id] = (targets[u.id][p.id] ?? 0) > 0 ? 0 : -14;
  }
  for (let it = 0; it < iterations; it++) {
    const pr = project(state);
    let maxErr = 0;
    pr.units.forEach((r, i) => {
      const u = state.units[i];
      for (const id in r.shares) {
        const t = targets[u.id][id] ?? 0;
        if (t <= 0) continue;
        const ratio = t / Math.max(1e-9, r.shares[id]);
        u.E[id] += Math.log(ratio);
        maxErr = Math.max(maxErr, Math.abs(t - r.shares[id]));
      }
    });
    if (maxErr < 2e-5) break;
  }
  // Bölge başına normalize: payı %1'in üzerindeki partilerin E medyanı = 0.
  // Yeni kurulan parti E = 0 ile başlar (tam tanınır ve örgütlü olursa "orta boy" bir parti gibi davranır).
  for (const u of state.units) {
    const vals = Object.keys(u.E).filter(id => (targets[u.id][id] ?? 0) > 0.01).map(id => u.E[id]).sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)] || 0;
    for (const id in u.E) u.E[id] = +(u.E[id] - med).toFixed(4);
  }
}
