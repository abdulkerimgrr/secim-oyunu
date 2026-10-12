// Cumhurbaşkanlığı seçimi: adaylık (%5 veya grup veya 100 bin imza), iki tur, oy aktarımı.
import { ideologyDistance } from './model.js';
import { clamp } from './util.js';
import { DIFFICULTY } from './params.js';
import { addNews } from './news.js';

export const SIGNATURES_NEEDED = 100000; // Anayasa m.101 — 100 bin seçmen imzası

function lastGeneral(state) { return [...state.elections].reverse().find(e => e.type === 'genel'); }

// Aday listesi: ittifak/parti grupları
export function nominees(state) {
  const last = lastGeneral(state);
  const groups = {};
  for (const p of Object.values(state.parties)) {
    if (p.aggregate || p.dissolved) continue;
    const key = p.alliance || p.id;
    (groups[key] = groups[key] || []).push(p);
  }
  const out = [];
  for (const [key, ps] of Object.entries(groups)) {
    const share = ps.reduce((a, p) => a + (last?.national?.[p.id] || 0), 0);
    const seats = ps.reduce((a, p) => a + (state.parliament.seats[p.id] || 0), 0);
    const lead = ps.slice().sort((a, b) => (last?.national?.[b.id] || 0) - (last?.national?.[a.id] || 0))[0];
    const playerLeads = lead.id === state.player.partyId && state.player.isLeader;
    const playerSig = ps.some(p => p.id === state.player.partyId) && state.player.isLeader && (state.flags.cbSignatures || 0) >= SIGNATURES_NEEDED;
    if (!(share >= 0.05 || seats >= 20 || playerSig)) continue;
    let name = lead.leader.name;
    if (playerLeads || (playerSig && lead.id === state.player.partyId)) name = state.player.name;
    let image = lead.leader.image;
    if (!playerLeads && name === state.president && (state.presidentTerms || 0) >= 2) { name = `${lead.short} adayı`; image = 0.5; } // görev süresi sınırı: yeni aday
    out.push({ id: key, party: lead.id, parties: ps.map(p => p.id), name, isPlayer: name === state.player.name,
      image, color: lead.color, short: lead.short });
  }
  // Oyuncunun partisi bir ittifakta değil ama imza ile adaysa
  if (!out.some(c => c.isPlayer) && state.player.isLeader && (state.flags.cbSignatures || 0) >= SIGNATURES_NEEDED) {
    const me = state.parties[state.player.partyId];
    out.push({ id: 'P-' + me.id, party: me.id, parties: [me.id], name: state.player.name, isPlayer: true, image: me.leader.image, color: me.color, short: me.short });
  }
  return out.sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0));
}

function candidateTotals(state, cands, partyVotes, rng, noise) {
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const tot = Object.fromEntries(cands.map(c => [c.id, 0]));
  for (const [pid, v] of Object.entries(partyVotes)) {
    const p = state.parties[pid];
    if (!p || v <= 0) continue;
    const own = cands.find(c => c.parties.includes(pid));
    const w = cands.map(c => Math.exp(-3.2 * ideologyDistance(p.ideology, state.parties[c.party].ideology)));
    const ws = w.reduce((a, b) => a + b, 0) || 1;
    cands.forEach((c, i) => {
      const loyal = own ? (c === own ? 0.9 : 0.1 * w[i] / ws) : 0.85 * w[i] / ws;
      tot[c.id] += v * loyal;
    });
  }
  // Ekonomik oy: hoşnutsuzluk iktidar adayını aşındırır, muhalefet adaylarına yarar
  const md = Math.max(-15, Math.min(35, state.economy.inflation + 2 * state.economy.unemployment - state.economy.misery0));
  for (const c of cands) {
    let appeal = Math.exp(1.2 * ((c.image ?? 0.55) - 0.55));
    const incumbent = c.parties.some(id => state.government.includes(id));
    appeal *= Math.exp((incumbent ? -1 : 1) * 0.012 * md);
    if (c.isPlayer) appeal *= (1 + (state.flags.intlRep || 10) * 0.0015) / Math.sqrt(diff.rival);
    tot[c.id] *= appeal * (noise ? Math.exp(noise[c.id]) : 1);
  }
  const s = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  for (const k in tot) tot[k] /= s;
  return tot;
}

export function runPresidential(state, rng, pr) {
  const cands = nominees(state);
  if (cands.length < 2) return null;
  const noise = Object.fromEntries(cands.map(c => [c.id, rng.normal(0, 0.06)]));
  const r1 = candidateTotals(state, cands, pr.natVotes, rng, noise);
  const prov1 = {};
  for (const [pl, v] of Object.entries(pr.provinces)) {
    const t = candidateTotals(state, cands, v.votes, rng, noise);
    prov1[pl] = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0];
  }
  const rounds = [{ shares: r1, provinces: prov1 }];
  let order = Object.entries(r1).sort((a, b) => b[1] - a[1]);
  let winner = order[0][0];
  if (order[0][1] <= 0.5) {
    const top2 = cands.filter(c => c.id === order[0][0] || c.id === order[1][0]);
    const noise2 = Object.fromEntries(top2.map(c => [c.id, noise[c.id] + rng.normal(0, 0.03)]));
    const r2 = candidateTotals(state, top2, pr.natVotes, rng, noise2);
    const prov2 = {};
    for (const [pl, v] of Object.entries(pr.provinces)) {
      const t = candidateTotals(state, top2, v.votes, rng, noise2);
      prov2[pl] = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0];
    }
    rounds.push({ shares: r2, provinces: prov2 });
    winner = Object.entries(r2).sort((a, b) => b[1] - a[1])[0][0];
  }
  const w = cands.find(c => c.id === winner);
  const same = w.name === state.president;
  state.presidentTerms = same ? (state.presidentTerms || 0) + 1 : 1;
  state.president = w.name;
  state.government = w.parties.slice();
  for (const p of Object.values(state.parties)) p.govWeight = state.government.includes(p.id) ? (p.id === w.party ? 1 : 0.5) : 0;
  const wasPresident = !!state.player.isPresident;
  state.player.isPresident = w.isPlayer;
  if (w.isPlayer && !wasPresident) {
    state.presidency = state.presidency || {};
    state.presidency.since = state.date;
    state.presidency.approval = 55;
    state.presidency.history = [];
  }
  state.flags.cbSignatures = 0;
  addNews(state, 'info', `Cumhurbaşkanlığı seçimini ${w.name} kazandı${rounds.length > 1 ? ' (ikinci tur)' : ''}`);
  return { type: 'cb', date: state.date, candidates: cands, rounds, winner, playerWon: w.isPlayer, playerRan: cands.some(c => c.isPlayer) };
}
