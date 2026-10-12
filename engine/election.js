// Milletvekili genel seçimi: baraj, ittifak kuralı, seçim bölgesi bazında D'Hondt.
import { dhondt } from './dhondt.js';
import { project, allianceShare } from './model.js';
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
  const pr = project(state, { ballotOnly: true, noise });
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
  state.elections.push({ date: result.date, type: 'genel', national: result.national, seats });
  // Aynı gün cumhurbaşkanlığı seçimi (hükümeti cumhurbaşkanının ittifakı kurar)
  result.cb = runPresidential(state, rng, pr);
  if (result.cb) result.government = state.government.slice();
  return result;
}

// Basitleştirilmiş yerel seçim: her ilde il/büyükşehir belediye başkanlığı (en çok oy alan).
// Tam yerel seçim (ilçe, belde, meclis) Aşama 6'da.
export function runLocalElection(state, rng) {
  const noise = electionNoise(state, rng);
  const pr = project(state, { ballotOnly: true, noise });
  const mayors = {};
  for (const [pl, v] of Object.entries(pr.provinces)) {
    // yerelde aday etkisi: her partiye ek il bazlı gürültü
    let best = null, bv = -1;
    for (const [id, s] of Object.entries(v.shares)) {
      if (state.parties[id].aggregate) continue;
      const val = s * Math.exp(rng.normal(0, 0.12));
      if (val > bv) { bv = val; best = id; }
    }
    mayors[pl] = best;
  }
  state.mayors = mayors;
  const count = {};
  for (const id of Object.values(mayors)) count[id] = (count[id] || 0) + 1;
  const res = { date: state.date, type: 'yerel', mayors, count, national: pr.national };
  state.elections.push({ date: state.date, type: 'yerel', count, national: pr.national });
  return res;
}
