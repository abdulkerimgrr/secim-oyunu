// Kurultay sistemi (katıl modu): hizip bazlı delege desteği, imza şartı, yönetimin karşı hamlesi,
// iki turlu oylama. Destek = Σ ağırlık × hizip desteği.
import { FACTION_TYPES, PARTY_KURULTAY } from '../data/factions.js';
import { DIFFICULTY } from './params.js';
import { clamp, addDays } from './util.js';

export function kurultayConfig(partyId) { return PARTY_KURULTAY[partyId] || PARTY_KURULTAY.DEFAULT; }

export function initKurultay(partyId, date, official) {
  const cfg = kurultayConfig(partyId);
  const factions = Object.entries(cfg.factions).map(([id, [weight, start]]) => ({
    id, weight, support: start,
    label: id === 'cekirdek' ? cfg.cekirdek : FACTION_TYPES[id].label,
    desc: FACTION_TYPES[id].desc,
  }));
  return {
    date, official, factions, signatures: 0, sigNeed: cfg.signatures, delegates: cfg.delegates,
    sigDeadline: addDays(date, -14), promises: 0, support: 0, startSupport: 0, tvAnswers: [],
  };
}

export function recalcSupport(k) {
  k.support = k.factions.reduce((a, f) => a + f.weight * f.support, 0);
  return k.support;
}

// Hizip desteğini değiştir; azalan verim: yüksek destekte kazanmak zorlaşır
export function bumpFaction(k, id, delta) {
  const f = k.factions.find(x => x.id === id);
  if (!f) return 0;
  const d = delta > 0 ? delta * (1 - f.support / 92) : delta;
  f.support = clamp(f.support + d, 0, 95);
  recalcSupport(k);
  return d;
}

export function bumpAll(k, delta, weights = {}) {
  let tot = 0;
  for (const f of k.factions) tot += f.weight * bumpFaction(k, f.id, delta * (weights[f.id] ?? 1));
  return tot;
}

// Canlı yayın cevabının hizip etkileri
export function answerFactionEffects(k, tags, scale = 1) {
  const out = {};
  for (const f of k.factions) {
    const prefs = FACTION_TYPES[f.id].prefs;
    let s = 0;
    for (const [t, v] of Object.entries(tags)) s += (prefs[t] || 0) * v;
    out[f.id] = s * scale;
  }
  return out;
}

// Haftalık: mevcut yönetimin karşı hamlesi (hizip başına geri çekme)
export function weeklyPull(state, k, partyId, rng, f = 1) {
  const cfg = kurultayConfig(partyId);
  const rival = DIFFICULTY[state.difficulty]?.rival ?? 1;
  const mult = { yonetim: 1.2, teskilat: 0.9, degisimci: 0.45, cekirdek: 0.7 };
  for (const fa of k.factions) {
    const pull = (cfg.pull * mult[fa.id] + rng.range(0, 0.35)) * rival * f + 0.006 * fa.support * f;
    fa.support = clamp(fa.support - pull, 0, 95);
  }
  // İmzalar yavaşça erir (bazı delegeler geri çekilir)
  k.signatures = clamp(k.signatures - 0.2 * f * rival, 0, 100);
  recalcSupport(k);
}

// Kurultay oylaması: 1. tur (mevcut genel başkan, oyuncu, üçüncü aday), gerekirse 2. tur
export function runKurultayVote(state, k, rng) {
  const D = k.delegates;
  const noisy = k.factions.map(f => ({ ...f, s: clamp(f.support + rng.normal(0, 4), 0, 98) }));
  const third = clamp(rng.range(2, 9) + (k.factions.find(f => f.id === 'degisimci')?.weight || 0) * 10 * rng.next(), 0, 15);
  const playerShare = noisy.reduce((a, f) => a + f.weight * f.s, 0) / 100;
  const thirdShare = (1 - playerShare) * third / 100;
  const r1 = { player: playerShare, third: thirdShare, incumbent: 1 - playerShare - thirdShare };
  const rounds = [{ ...r1, valid: D - rng.int(5, 25) }];
  let winner = Object.entries(r1).sort((a, b) => b[1] - a[1])[0];
  if (winner[1] <= 0.5) {
    // 2. tur: ilk iki aday; üçüncü adayın delegeleri değişimci eğilimine göre bölünür
    const top2 = Object.entries(r1).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
    const r2 = {};
    if (top2.includes('player') && top2.includes('incumbent')) {
      const toPlayer = clamp(0.55 + rng.normal(0, 0.12), 0.2, 0.9);
      r2.player = r1.player + r1.third * toPlayer;
      r2.incumbent = 1 - r2.player;
    } else if (top2.includes('player')) {
      r2.player = r1.player + r1.incumbent * 0.35; r2.third = 1 - r2.player;
    } else {
      r2.incumbent = r1.incumbent + r1.player * 0.3; r2.third = 1 - r2.incumbent;
    }
    rounds.push({ ...r2, valid: D - rng.int(10, 40) });
    winner = Object.entries(r2).sort((a, b) => b[1] - a[1])[0];
  }
  return { rounds, won: winner[0] === 'player', vote: 100 * (rounds[rounds.length - 1].player || 0), delegates: D };
}
