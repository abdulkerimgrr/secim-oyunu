// Milletvekili genel seçimi: baraj, ittifak kuralı, seçim bölgesi bazında D'Hondt.
import { mobilizer } from './metrics.js';
import { dhondt } from './dhondt.js';
import { project, allianceShare, ideologyDistance, econGrievance } from './model.js';
import { K, DIFFICULTY } from './params.js';
import { REGION_NAMES } from './regions.js';
import { runPresidential } from './presidential.js';

export function thresholdStatus(state, national) {
  const thr = state.rules.parliament.threshold;
  const pass = {};
  for (const p of Object.values(state.parties)) {
    if (p.dissolved || !p.onBallot || p.aggregate) { pass[p.id] = false; continue; }
    const own = national[p.id] || 0;
    const al = p.alliance && state.rules.parliament.allianceThreshold ? allianceShare(state, national, p.alliance) : 0;
    pass[p.id] = own >= thr || al >= thr;
  }
  return pass;
}

export function computeSeats(state, pr) {
  const pass = thresholdStatus(state, pr.national);
  const seats = {};
  const unitSeats = {};
  for (const u of pr.units) {
    const v = {};
    for (const id in u.votes) if (pass[id]) v[id] = u.votes[id];
    const r = dhondt(v, u.seats);
    unitSeats[u.id] = r;
    for (const id in r) seats[id] = (seats[id] || 0) + r[id];
  }
  return { seats, pass, unitSeats };
}

export function electionNoise(state, rng) {
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const nat = {}, reg = {};
  for (const id in state.parties) nat[id] = rng.normal(0, K.noiseNat * diff.noise);
  for (const r of REGION_NAMES) {
    reg[r] = {};
    for (const id in state.parties) reg[r][id] = rng.normal(0, K.noiseReg * diff.noise);
  }
  const cache = {};
  return {
    nat, reg,
    unit: (u, id) => {
      const key = u.id + id;
      if (!(key in cache)) cache[key] = rng.normal(0, K.noiseUnit * diff.noise);
      return cache[key];
    },
  };
}

export function runGeneralElection(state, rng) {
  const noise = electionNoise(state, rng);
  state.turnoutShift = rng.normal(0, 0.015);
  const pr = project(state, { ballotOnly: true, noise, mobilize: mobilizer(state) });
  const { seats, pass, unitSeats } = computeSeats(state, pr);
  const prev = state.parliament.seats;
  const result = {
    date: state.date, type: 'genel', national: pr.national, natVotes: pr.natVotes, natTotal: pr.natTotal,
    seats, pass, prevSeats: prev,
    provinces: Object.fromEntries(Object.entries(pr.provinces).map(([pl, v]) => [pl, { shares: v.shares, turnout: v.turnout }])),
    units: pr.units.map(u => ({ id: u.id, plate: u.plate, shares: u.shares, seats: unitSeats[u.id] })),
    turnout: pr.units.reduce((a, u) => a + u.turnout * state.units.find(x => x.id === u.id).registered, 0) /
             state.units.reduce((a, u) => a + u.registered, 0),
  };
  state.parliament = { seats, date: state.date };
  for (const p of Object.values(state.parties)) {
    p.seats = seats[p.id] || 0;
    p.lastShare = pr.national[p.id] || 0;
  }
  // Hükümet: en çok sandalyeli ittifak/parti (cumhurbaşkanlığı sistemi bu sürümde basitleştirilmiştir)
  const blocs = {};
  for (const p of Object.values(state.parties)) {
    const key = p.alliance || p.id;
    blocs[key] = (blocs[key] || 0) + (seats[p.id] || 0);
  }
  const top = Object.entries(blocs).sort((a, b) => b[1] - a[1])[0][0];
  const gov = Object.values(state.parties).filter(p => (p.alliance || p.id) === top).map(p => p.id);
  state.government = gov;
  for (const p of Object.values(state.parties)) {
    const biggest = gov.reduce((a, b) => (seats[a] || 0) >= (seats[b] || 0) ? a : b);
    p.govWeight = gov.includes(p.id) ? (p.id === biggest ? 1 : 0.5) : 0;
    p.momentum *= 0.3;
  }
  result.government = gov;
  state.camp = {};
  state.economy.misery0 = state.economy.inflation + 2 * state.economy.unemployment; // yeni dönem: beklentiler sıfırlanır
  state.economy.miserySm = state.economy.misery0; state.economy.pain = (state.economy.pain || 0) * 0.4; // eski şikâyetin bir kısmı yeni döneme taşınır
  state.elections.push({ date: result.date, type: 'genel', national: result.national, seats });
  // Aynı gün cumhurbaşkanlığı seçimi (hükümeti cumhurbaşkanının ittifakı kurar)
  result.cb = runPresidential(state, rng, pr);
  if (result.cb) result.government = state.government.slice();
  return result;
}

// Basitleştirilmiş yerel seçim: her ilde il/büyükşehir belediye başkanlığı (en çok oy alan).
// Tam yerel seçim (ilçe, belde, meclis) Aşama 6'da.
// Yerel seçim gerçekçiliği:
//  1) İttifak içi aday paylaşımı: ittifak üyeleri her ilde tek aday çıkarır (genelde en güçlü üye;
//     küçük ortak, büyük ortağın oyunun %60'ına ulaştığı illerde aday olur). Ortakların oyu %90 aktarılır.
//  2) Stratejik oy: ilde ilk iki dışında kalan partilerin seçmeninin bir kısmı (en fazla %45),
//     ideolojik olarak yakın olan güçlü adaya kayar (belediye başkanlığı tek turludur).
//  3) Yerel aday etkisi: il bazında ek sapma. Katsayılar oyun tasarımıdır.
export function localRace(state, shares, rng) {
  const P = state.parties;
  const v = {};
  // Ekonomik protesto: hayat pahalılığına kızgın iktidar seçmeninin bir kısmı yerel seçimde sandığa gitmez
  const protest = 1 - 0.007 * Math.max(0, econGrievance(state.economy));
  const gov = new Set(state.government);
  for (const [id, s] of Object.entries(shares)) if (!P[id].aggregate) v[id] = s * Math.exp(rng.normal(0, 0.12)) * (gov.has(id) || (P[id].alliance && state.government.some(g => P[g]?.alliance === P[id].alliance)) ? protest : 1);
  const isGovSide = id => gov.has(id) || (P[id].alliance && state.government.some(g => P[g]?.alliance === P[id].alliance));
  const groups = {};
  for (const id of Object.keys(v)) { const a = P[id].alliance; if (a) (groups[a] ||= []).push(id); }
  for (const ids of Object.values(groups)) {
    if (ids.length < 2) continue;
    ids.sort((a, b) => v[b] - v[a]);
    const seniorOverall = ids.slice().sort((a, b) => (P[b].lastShare || 0) - (P[a].lastShare || 0))[0];
    let cand = seniorOverall;
    if (v[ids[0]] !== v[seniorOverall] && v[ids[0]] >= 0.6 * v[seniorOverall]) cand = ids[0];
    else if (ids.find(x => x !== seniorOverall && v[x] >= 0.6 * v[seniorOverall])) cand = ids.find(x => x !== seniorOverall && v[x] >= 0.6 * v[seniorOverall]);
    let pool = 0;
    for (const id of ids) if (id !== cand) { pool += v[id] * 0.9; v[id] = 0; }
    v[cand] += pool;
  }
  const order = Object.entries(v).sort((a, b) => b[1] - a[1]);
  const top = order.slice(0, 2).map(([id]) => id);
  for (const [id, s] of order.slice(2)) {
    if (!s) continue;
    // Önce aynı bloktaki (iktidar/muhalefet) güçlü adaya; yoksa ideolojik olarak yakın olana
    const same = top.filter(t => isGovSide(t) === isGovSide(id));
    let to, k;
    if (same.length === 1) { to = same[0]; k = isGovSide(id) ? 0.4 : 0.55; }
    else {
      const d = top.map(t => ideologyDistance(P[id].ideology, P[t].ideology));
      const near = d[0] <= d[1] ? 0 : 1;
      to = top[near]; k = 0.35 * Math.max(0, 1 - d[near] / 1.2);
    }
    v[to] += s * k; v[id] -= s * k;
  }
  return v;
}

export function runLocalElection(state, rng) {
  const noise = electionNoise(state, rng);
  state.turnoutShift = -0.09 + rng.normal(0, 0.015); // yerel seçimde katılım genel seçimden düşük (2024: %78)
  const pr = project(state, { ballotOnly: true, noise, mobilize: mobilizer(state) });
  state.turnoutShift = 0;
  const mayors = {};
  for (const [pl, pv] of Object.entries(pr.provinces)) {
    const v = localRace(state, pv.shares, rng);
    mayors[pl] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
  }
  state.mayors = mayors;
  const count = {};
  for (const id of Object.values(mayors)) count[id] = (count[id] || 0) + 1;
  const res = { date: state.date, type: 'yerel', mayors, count, national: pr.national };
  state.elections.push({ date: state.date, type: 'yerel', count, national: pr.national });
  return res;
}
