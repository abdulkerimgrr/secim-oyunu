// Yeni oyun durumu oluşturma.
import { RULES } from '../data/rules.js';
import { PARTIES_2023, ALLIANCES_2023, ELECTION_DAY_ALLIANCES_2023 } from '../data/parties2023.js';
import { SCENARIO_2023 } from '../data/scenario2023.js';
import { RESULTS_2023 } from '../data/generated/results2023.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { FIRST_NAMES, LAST_NAMES, SKILLS } from '../data/founders.js';
import { clusterSharesFromVotes, calibrate, project, misery } from './model.js';
import { createRng } from './rng.js';
import { DIFFICULTY } from './params.js';
import { deepClone, clamp, addDays } from './util.js';
import { takePoll } from './polls.js';
import { computeSeats } from './election.js';

export const PLAYER_ID = 'OYUNCU';
export const SAVE_VERSION = 1;

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

export function newGame(opts) {
  const seed = opts.seed ?? (Date.now() % 2147483647);
  const scenario = SCENARIO_2023;
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
    government: [...scenario.government], president: scenario.president,
    polls: [], news: [], events: { active: [], seen: {}, history: [] },
    parliament: { seats: {}, date: '2023-05-14' }, elections: [], mayors: {},
    adapt: { types: {}, provs: {} }, intel: 0, ballotSecurity: 0.3,
    stats: { rallies: 0, tv: 0, weeks: 0, gaffes: 0, moneySpent: 0, peakPoll: 0 },
    flags: {}, gameOver: null, log: [],
    player: null,
  };
  state.economy.misery0 = misery(state.economy);
  for (const def of PARTIES_2023) state.parties[def.id] = makeParty(def, scenario, provShares);
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

  // Oyuncu
  if (opts.mode === 'found') {
    const pd = opts.party;
    const founders = (opts.founders || []).map(deepClone);
    const has = s => founders.some(f => f.skill === s);
    state.parties[PLAYER_ID] = {
      id: PLAYER_ID, name: pd.name, short: pd.short, color: pd.color, slogan: pd.slogan || '',
      leader: { name: opts.playerName, charisma: 0.5, image: 0.5, image0: 0.5 },
      ideology: deepClone(pd.ideology), ideology0: null,
      media: 0.08, recognition: 0.01, govWeight: 0, alliance: null, resources: 0, aggregate: false,
      money: Math.round(5_000_000 * diff.money), members: 150, unity: 80, momentum: 0,
      orgs: {}, building: {}, onBallot: false, isPlayer: true, seats: 0, lastShare: 0,
      founded: state.date, congressDate: null, founders,
    };
    state.player = {
      mode: 'found', partyId: PLAYER_ID, name: opts.playerName, isLeader: true,
      apMax: 5 + (has('saha') ? 1 : 0), ap: 0,
    };
    state.newPartyE = 0;
  } else {
    const party = state.parties[opts.joinPartyId];
    const kDate = party.kurultay || addDays(state.date, 7 * 14);
    const baseSupport = { AKP: 3, MHP: 4, CHP: 22, IYI: 14, YSP: 12, YRP: 10, ZP: 10, TIP: 14, BBP: 8, MP: 15 }[party.id] ?? 10;
    state.player = {
      mode: 'join', partyId: party.id, name: opts.playerName, isLeader: false,
      apMax: 5, ap: 0, personalMoney: Math.round(1_500_000 * diff.money),
      kurultay: { date: kDate, support: baseSupport, startSupport: baseSupport, official: !!party.kurultay },
    };
    party.isPlayer = true;
  }
  state.player.ap = state.player.apMax;
  state.player.difficulty = state.difficulty;

  state.rngState = rng.state;
  takePoll(state, rng);
  state.rngState = rng.state;
  state.news.push({ date: state.date, kind: 'info', text: 'TBMM 28. Dönem çalışmalarına başladı. Cumhur İttifakı meclis çoğunluğunu korudu.' });
  if (opts.mode === 'found') state.news.push({ date: state.date, kind: 'player', text: `${state.parties[PLAYER_ID].name} kuruluş dilekçesini İçişleri Bakanlığı'na verdi.` });
  return state;
}

export function playerParty(state) { return state.parties[state.player.partyId]; }
