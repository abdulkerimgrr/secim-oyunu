// Cumhurbaşkanlığı modu: onay oranı, kabine, ekonomi tutumu, kanunlar, zirveler, ulusa sesleniş.
import { CABINET_POSTS, MINISTER_FIRST, MINISTER_LAST, PROFILES } from '../data/cabinet.js';
import { POLICIES } from '../data/policies.js';
import { DESTINATIONS } from '../data/diplomacy.js';
import { clamp, addDays } from './util.js';
import { addNews } from './news.js';
import { applyEcon, applyForeign, foreignScore, publicSupport, policyById } from './government.js';
import { addClusterMom } from './social.js';
import { staffMod } from './staff.js';
import { misery } from './model.js';

export function ministerCandidates(state, post) {
  const key = post + (state.presidency?.since || '') + (state.presidency?.reshuffles || 0);
  let h = 0;
  for (const c of key + state.seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const r = () => (h = (Math.imul(h ^ (h >>> 13), 1274126177) + 0x6D2B79F5) >>> 0) / 4294967296;
  return [0, 1, 2].map(i => {
    const prof = PROFILES[Math.floor(r() * PROFILES.length)];
    const comp = prof[0] === 'teknokrat' || prof[0] === 'akademisyen' ? 0.55 + 0.4 * r() : 0.3 + 0.45 * r();
    const loy = prof[0] === 'siyasetci' ? 0.6 + 0.35 * r() : 0.35 + 0.5 * r();
    const pop = prof[0] === 'siyasetci' ? 0.5 + 0.4 * r() : 0.25 + 0.4 * r();
    return { id: `${post}-${i}`, post, name: `${MINISTER_FIRST[Math.floor(r() * 16)]} ${MINISTER_LAST[Math.floor(r() * 16)]}`, profile: prof[1], comp: +comp.toFixed(2), loyalty: +loy.toFixed(2), pop: +pop.toFixed(2) };
  });
}

export function ensurePresidency(state) {
  const p = state.presidency || (state.presidency = {});
  p.approval ??= 55; p.history ??= []; p.cabinet ??= {}; p.econStance ??= 'dengeli'; p.laws ??= []; p.reshuffles ??= 0;
  for (const post of CABINET_POSTS) if (!p.cabinet[post.id]) {
    const c = ministerCandidates(state, post.id);
    p.cabinet[post.id] = c.slice().sort((a, b) => (b.comp + b.loyalty) - (a.comp + a.loyalty))[0];
  }
  return p;
}

export function appoint(state, cand) {
  const p = ensurePresidency(state);
  p.cabinet[cand.post] = cand;
  p.reshuffles++;
  p.approval = clamp(p.approval + (cand.pop - 0.5) * 4, 5, 95);
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name}, ${CABINET_POSTS.find(x => x.id === cand.post).label.toLocaleLowerCase('tr')}lığına ${cand.name}'ı atadı`);
}

export function approvalTarget(state) {
  const me = state.parties[state.player.partyId];
  const poll = state.polls.length ? state.polls[state.polls.length - 1].shares[me.id] || 0 : me.lastShare;
  const p = ensurePresidency(state);
  const cab = Object.values(p.cabinet).reduce((a, m) => a + m.pop + m.comp * 0.5, 0) / CABINET_POSTS.length;
  return clamp(48 + 70 * (poll - 0.33) - 0.6 * (misery(state.economy) - state.economy.misery0) + 0.35 * (foreignScore(state) - 50) + 40 * me.momentum + 10 * (cab - 0.75), 8, 92);
}

export function presidencyTick(state, rng, f) {
  if (!state.player.isPresident) return;
  const p = ensurePresidency(state);
  const e = state.economy;
  // Kabine etkileri
  const c = p.cabinet;
  e.target = clamp(e.target - (c.hazine.comp - 0.5) * 0.12 * f, 8, 95);
  e.growth = clamp(e.growth + (c.hazine.comp - 0.5) * 0.02 * f, -8, 10);
  for (const k of Object.keys(state.foreign)) state.foreign[k] = clamp(state.foreign[k] + (c.disisleri.comp - 0.5) * 0.15 * f, 0, 100);
  state.foreign.ab = clamp(state.foreign.ab + (c.adalet.comp - 0.5) * 0.06 * f, 0, 100);
  // Aylık para politikası (Merkez Bankası'na yaklaşım)
  const month = state.date.slice(0, 7);
  if (p.lastRateMonth !== month) {
    p.lastRateMonth = month;
    const off = { siki: 7, dengeli: 3, gevsek: -6 }[p.econStance] ?? 3;
    const want = clamp(e.inflation * 0.95 + off, 3, 75);
    const step = Math.round(clamp((want - e.policyRate) * 0.4, -6, 8) * 2) / 2;
    e.policyRate = clamp(e.policyRate + step, 0, 75);
    if (p.econStance === 'gevsek') { e.growth = clamp(e.growth + 0.15, -8, 10); e.usdTry = +(e.usdTry * 1.01).toFixed(2); }
    if (p.econStance === 'siki') { e.growth = clamp(e.growth - 0.1, -8, 10); }
    addNews(state, 'econ', `Merkez Bankası politika faizini ${step > 0 ? 'artırdı' : step < 0 ? 'indirdi' : 'sabit tuttu'}; yeni faiz %${e.policyRate.toFixed(1).replace('.', ',')}`);
    p.history.push({ date: state.date, approval: Math.round(p.approval) });
    if (p.history.length > 72) p.history.shift();
  }
  // Onay oranı hedefe yaklaşır
  p.approval = clamp(p.approval + (approvalTarget(state) - p.approval) * 0.08 * f + rng.normal(0, 0.4) * f, 5, 95);
  // Düşük onayda iç huzur ve kabine sadakati
  if (p.approval < 30) state.parties[state.player.partyId].unity = clamp(state.parties[state.player.partyId].unity - 0.5 * f, 0, 100);
}

function govSeats(state) { return state.government.reduce((a, id) => a + (state.parliament.seats[id] || 0), 0); }

export function enactLaw(state, polId, rng) {
  const p = ensurePresidency(state);
  const pol = policyById(polId);
  const seats = govSeats(state);
  const need = pol.needs || 301;
  const passes = rng.chance(seats >= need ? 0.92 : seats >= 280 ? 0.45 : 0.15);
  const support = publicSupport(state, pol);
  p.laws.unshift({ id: pol.id, date: state.date, passed: passes, support });
  if (p.laws.length > 30) p.laws.length = 30;
  if (!passes) {
    p.approval = clamp(p.approval - 2, 5, 95);
    addNews(state, 'gov', `TBMM: Cumhurbaşkanlığı'nın desteklediği "${pol.title}" teklifi reddedildi`);
    return { passes, support, seats, need };
  }
  applyEcon(state, pol.econ || {});
  applyForeign(state, pol.foreign || {});
  addClusterMom(state, state.player.partyId, pol.pro, 0.02);
  addClusterMom(state, state.player.partyId, Object.fromEntries(Object.entries(pol.anti).map(([k, v]) => [k, v])), -0.015);
  const d = (support - 0.5) * 12 + (pol.popularity || 0) * 40;
  p.approval = clamp(p.approval + d, 5, 95);
  addNews(state, 'gov', `TBMM: "${pol.title}" kabul edildi ve yürürlüğe girdi`);
  return { passes, support, seats, need, approvalDelta: d };
}

export function setMinimumWage(state, pct, rng) {
  const p = ensurePresidency(state);
  const e = state.economy;
  p.wageYear = state.date.slice(0, 4);
  const infl = (pct - 30) * 0.08;
  applyEcon(state, { inflation: infl, unemployment: pct > 50 ? 0.4 : 0 });
  const d = (pct - 35) * 0.25 + rng.normal(0, 1);
  p.approval = clamp(p.approval + d, 5, 95);
  addClusterMom(state, state.player.partyId, { kararsiz: 1, sol: 0.8, kurt: 0.6, muhafazakar: 0.5 }, 0.0006 * (pct - 30));
  addNews(state, 'gov', `Asgari ücrete %${pct} zam yapıldı`);
  return { infl, approvalDelta: d };
}

export function summit(state, destId, rng) {
  const p = ensurePresidency(state);
  const d = DESTINATIONS.find(x => x.id === destId);
  const ok = rng.chance(0.75 * Math.min(1.3, staffMod(state, 'foreign')) + (p.cabinet.disisleri.comp - 0.5) * 0.3);
  applyForeign(state, { [d.foreign]: ok ? 8 : 2 });
  if (ok && d.foreign === 'ab') applyEcon(state, { growth: 0.2 });
  if (ok && d.foreign === 'ortadogu') applyEcon(state, { growth: 0.25 });
  p.approval = clamp(p.approval + (ok ? 1.5 : -0.5), 5, 95);
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name} ${d.city} ziyaretinde ${ok ? 'önemli anlaşmalar imzaladı' : 'beklenen sonucu alamadı'}`);
  return { ok, dest: d };
}

export function addressNation(state, topic, rng) {
  const p = ensurePresidency(state);
  const last = p.lastAddress;
  const fatigue = last && addDays(last, 42) > state.date ? 0.4 : 1;
  const d = rng.range(0.5, 3.5) * fatigue;
  p.approval = clamp(p.approval + d, 5, 95);
  state.parties[state.player.partyId].momentum += 0.02 * fatigue;
  p.lastAddress = state.date;
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name} ulusa seslendi`);
  return { approvalDelta: d, fatigue: fatigue < 1 };
}

export const lawOptions = state => POLICIES.filter(pol => !(state.presidency?.laws || []).some(l => l.id === pol.id && addDays(l.date, 365) > state.date));
