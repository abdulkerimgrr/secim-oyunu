// Yeni oyun durumu oluşturma.
import { RULES } from '../data/rules.js';
import { PARTIES_2023, ALLIANCES_2023, ELECTION_DAY_ALLIANCES_2023 } from '../data/parties2023.js';
import { SCENARIO_2023 } from '../data/scenario2023.js';
import { SCENARIO_TODAY, PARTY_OVERRIDES, NEW_PARTIES, SEATS_TODAY, POLL_TARGETS } from '../data/scenarioToday.js';
import { RESULTS_2023 } from '../data/generated/results2023.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { FIRST_NAMES, LAST_NAMES, SKILLS } from '../data/founders.js';
import { clusterSharesFromVotes, calibrate, project, misery } from './model.js';
import { createRng } from './rng.js';
import { DIFFICULTY, TURN } from './params.js';
import { deepClone, clamp, addDays } from './util.js';
import { takePoll } from './polls.js';
import { computeSeats } from './election.js';
import { initKurultay, recalcSupport } from './kurultay.js';
import { charMod } from './character.js';
import { randomCharacter } from '../data/character.js';
import { ensureGovState } from './government.js';

export const PLAYER_ID = 'OYUNCU';
export const SAVE_VERSION = 2;

export const PROVINCE_BY_PLATE = Object.fromEntries(PROVINCES.map(p => [p.plate, p]));

export function generateFounders(seed, n = 6) {
  const rng = createRng(seed);
  const skills = Object.keys(SKILLS);
  const used = new Set();
  const out = [];
  while (out.length < n) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push({
      id: 'k' + out.length, name,
      skill: skills[(out.length + rng.int(0, skills.length - 1)) % skills.length],
      level: +rng.range(0.4, 0.9).toFixed(2),
      loyalty: rng.int(50, 90), reputation: rng.int(20, 70),
    });
  }
  return out;
}

function makeParty(def, scenario, provShares) {
  const orgs = {};
  for (const pv of PROVINCES) {
    const s = provShares[pv.plate]?.[def.id] ?? 0;
    orgs[pv.plate] = def.aggregate ? 0.5 : +clamp(0.3 + 2.5 * s, 0.1, 1).toFixed(3);
  }
  const image = clamp(0.45 + 0.35 * def.charisma, 0, 1);
  return {
    id: def.id, name: def.name, short: def.short, color: def.color,
    leader: { name: def.leader, charisma: def.charisma, image, image0: image },
    ideology: deepClone(def.ideology), ideology0: null,
    media: def.media, recognition: def.recognition, govWeight: def.govWeight || 0,
    alliance: def.alliance, resources: def.resources, aggregate: !!def.aggregate,
    money: def.budget, members: 0, unity: 70, momentum: 0, orgs, building: {},
    onBallot: true, isPlayer: false, seats: 0, lastShare: 0, kurultay: def.kurultay || null,
    note: def.note || null,
  };
}

export const SCENARIOS = { '2023': SCENARIO_2023, bugun: SCENARIO_TODAY };

// Senaryoya göre parti tanımları (yeni oyun ekranındaki listeler için de kullanılır)
export function scenarioParties(id) {
  if (id !== 'bugun') return PARTIES_2023;
  const base = PARTIES_2023.map(d => ({ ...d, ...(PARTY_OVERRIDES[d.id] || {}) }));
  const out = [...base.filter(d => !d.aggregate), ...NEW_PARTIES, ...base.filter(d => d.aggregate)];
  return out.sort((a, b) => (POLL_TARGETS[b.id] || 0) - (POLL_TARGETS[a.id] || 0) || (a.aggregate ? 1 : 0) - (b.aggregate ? 1 : 0));
}
export const scenarioShares = id => id === 'bugun' ? POLL_TARGETS : null;

// "Bugün" senaryosu: 2023 kalibrasyonunun üzerine sonradan kurulan partileri ekle ve ulusal eğilimi anketlere yaklaştır
function applyToday(state, provShares) {
  for (const def of NEW_PARTIES) {
    const p = makeParty(def, SCENARIO_TODAY, provShares);
    const src = state.parties[def.baseFrom];
    for (const pl of Object.keys(src.orgs)) { p.orgs[pl] = +(src.orgs[pl] * 0.85).toFixed(3); src.orgs[pl] = +(src.orgs[pl] * 0.6).toFixed(3); }
    state.parties[def.id] = p;
    for (const u of state.units) u.E[def.id] = u.E[def.baseFrom];
  }
  for (let it = 0; it < 40; it++) {
    const pr = project(state);
    let err = 0;
    for (const [id, t] of Object.entries(POLL_TARGETS)) {
      const cur = Math.max(1e-6, pr.national[id] || 0);
      const d = Math.log(t / cur) * 0.9;
      err = Math.max(err, Math.abs(t - cur));
      for (const u of state.units) u.E[id] = (u.E[id] ?? -14) + d;
    }
    if (err < 0.0005) break;
  }
}

export function newGame(opts) {
  const seed = opts.seed ?? (Date.now() % 2147483647);
  const scenario = SCENARIOS[opts.scenario] || SCENARIO_2023;
  const today = scenario.id === 'bugun';
  const diff = DIFFICULTY[opts.difficulty || 'zor'];
  const rng = createRng(seed);

  // Seçim bölgeleri ve hedef paylar
  const targets = {};
  const provVotes = {};
  const units = RESULTS_2023.map(r => {
    const tot = Object.values(r.votes).reduce((a, b) => a + b, 0);
    targets[r.id] = Object.fromEntries(Object.entries(r.votes).map(([k, v]) => [k, v / tot]));
    const pv = provVotes[r.plate] || (provVotes[r.plate] = {});
    for (const [k, v] of Object.entries(r.votes)) pv[k] = (pv[k] || 0) + v;
    return {
      id: r.id, plate: r.plate, name: r.name, region: PROVINCE_BY_PLATE[r.plate].region,
      seats: r.seats, registered: r.registered, turnout0: r.turnout,
      validRatio: clamp(r.valid / (r.registered * r.turnout), 0.9, 1),
      clusters: clusterSharesFromVotes(r.votes), E: {},
    };
  });
  const provShares = {};
  for (const [pl, v] of Object.entries(provVotes)) {
    const t = Object.values(v).reduce((a, b) => a + b, 0);
    provShares[pl] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x / t]));
  }

  const state = {
    version: SAVE_VERSION, seed, rngState: 0,
    scenario: scenario.id, difficulty: opts.difficulty || 'zor',
    date: scenario.startDate, turn: 1, phase: 'normal',
    nextElection: scenario.nextGeneralElection,
    localElection: scenario.localElection,
    rules: deepClone(RULES),
    parties: {}, alliances: deepClone(ALLIANCES_2023),
    units, camp: {}, newPartyE: 0, turnoutShift: 0,
    economy: { ...scenario.economy, misery0: 0, history: [] },
    government: [...scenario.government], president: scenario.president, presidentTerms: 2, // 2018 ve 2023 seçimleri (2017 anayasa değişikliği sonrası) — tahmini yorum
    polls: [], news: [], events: { active: [], seen: {}, history: [] },
    parliament: { seats: {}, date: '2023-05-14' }, elections: [], mayors: {},
    adapt: { types: {}, provs: {} }, intel: 0, ballotSecurity: 0.3,
    stats: { rallies: 0, tv: 0, weeks: 0, gaffes: 0, moneySpent: 0, peakPoll: 0 },
    flags: {}, gameOver: null, log: [],
    player: null,
  };
  state.economy.misery0 = misery(state.economy);
  if (scenario.policyRate) state.economy.policyRate = scenario.policyRate;
  ensureGovState(state);
  for (const def of scenarioParties(scenario.id).filter(d => !NEW_PARTIES.includes(d))) state.parties[def.id] = makeParty(def, scenario, provShares);
  calibrate(state, targets);

  // 2023 meclisi: kalibre edilmiş model + D'Hondt (gürültüsüz) = gerçek sonuç
  const base = project(state);
  const current = Object.fromEntries(Object.values(state.parties).map(p => [p.id, p.alliance]));
  for (const p of Object.values(state.parties)) p.alliance = ELECTION_DAY_ALLIANCES_2023[p.id] || null;
  const seats = computeSeats(state, base);
  for (const p of Object.values(state.parties)) p.alliance = current[p.id];
  state.parliament.seats = seats.seats;
  for (const p of Object.values(state.parties)) {
    p.seats = seats.seats[p.id] || 0;
    p.lastShare = base.national[p.id] || 0;
    p.members = Math.round(p.lastShare * 11_000_000); // üye sayısı: kabaca orantılı — tahmini
  }
  state.elections.push({ date: '2023-05-14', type: 'genel', national: base.national, seats: seats.seats, real: true });
  if (today) {
    applyToday(state, provShares);
    state.parliament = { seats: { ...SEATS_TODAY }, date: scenario.parliamentDate };
    for (const p of Object.values(state.parties)) {
      p.seats = SEATS_TODAY[p.id] || 0;
      p.lastShare = POLL_TARGETS[p.id] || 0;
      p.members = Math.round(p.lastShare * 11_000_000); // — tahmini
    }
  }

  // Oyuncu
  const character = opts.character ? deepClone(opts.character) : randomCharacter(() => rng.next());
  if (opts.mode === 'found') {
    const pd = opts.party;
    const founders = (opts.founders || []).map(deepClone);
    const has = s => founders.some(f => f.skill === s);
    state.parties[PLAYER_ID] = {
      id: PLAYER_ID, name: pd.name, short: pd.short, color: pd.color, slogan: pd.slogan || '',
      leader: { name: opts.playerName, charisma: 0.5, image: 0.5, image0: 0.5, character },
      ideology: deepClone(pd.ideology), ideology0: null,
      media: 0.08, recognition: 0.01, govWeight: 0, alliance: null, resources: 0, aggregate: false,
      money: Math.round(5_000_000 * diff.money), members: 150, unity: 80, momentum: 0,
      orgs: {}, building: {}, onBallot: false, isPlayer: true, seats: 0, lastShare: 0,
      founded: state.date, congressDate: null, founders,
    };
    state.player = {
      mode: 'found', partyId: PLAYER_ID, name: opts.playerName, isLeader: true, character,
      apMax: TURN.apMonth + (has('saha') ? 2 : 0), ap: 0,
    };
    state.player.apMax += 2 * charMod(state, 'ap');
    const lp = state.parties[PLAYER_ID].leader;
    lp.image = lp.image0 = 0.5 + charMod(state, 'image');
    state.camp[character.hometown] = { [PLAYER_ID]: 0.15 }; // memleket etkisi
    state.newPartyE = 0;
  } else {
    const party = state.parties[opts.joinPartyId];
    const kDate = party.kurultay || addDays(state.date, 150); // olağanüstü kurultay: ~5 ay
    const k = initKurultay(party.id, kDate, !!party.kurultay);
    recalcSupport(k);
    k.startSupport = k.support;
    state.player = {
      mode: 'join', partyId: party.id, name: opts.playerName, isLeader: false, character,
      apMax: TURN.apMonth, ap: 0, personalMoney: 0, kurultay: k,
    };
    state.player.apMax += 2 * charMod(state, 'ap');
    state.player.personalMoney = Math.round(1_500_000 * diff.money * charMod(state, 'money'));
    party.isPlayer = true;
  }
  character.pinColor = state.parties[state.player.partyId].color;
  state.player.ap = state.player.apMax;
  state.player.difficulty = state.difficulty;

  state.rngState = rng.state;
  takePoll(state, rng);
  state.rngState = rng.state;
  for (const t of scenario.news || ['TBMM 28. Dönem çalışmalarına başladı. Cumhur İttifakı meclis çoğunluğunu korudu.']) state.news.push({ date: state.date, kind: 'info', text: t });
  if (opts.mode === 'found') state.news.push({ date: state.date, kind: 'player', text: `${state.parties[PLAYER_ID].name} kuruluş dilekçesini İçişleri Bakanlığı'na verdi.` });
  return state;
}

export function playerParty(state) { return state.parties[state.player.partyId]; }
