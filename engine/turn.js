// Tur döngüsü: rakipler, ekonomi, sönümler, teşkilat, bütçe, olaylar, takvim, anket.
import { createRng } from './rng.js';
import { K, DIFFICULTY } from './params.js';
import { economyStep } from './economy.js';
import { takePoll } from './polls.js';
import { runGeneralElection, runLocalElection } from './election.js';
import { rivalsAct } from '../ai/rivals.js';
import { maybeTriggerEvent } from '../ai/events.js';
import { addNews } from './news.js';
import { clamp, addDays, daysBetween, fmtMoney, priceIndex } from './util.js';
import { PROVINCE_BY_PLATE, playerParty, PLAYER_ID } from './state.js';
import { allianceShare } from './model.js';

export function withRng(state, fn) {
  const rng = createRng(state.seed);
  rng.state = state.rngState;
  const r = fn(rng);
  state.rngState = rng.state;
  return r;
}

export function eligibility(state) {
  const p = playerParty(state);
  const rules = state.rules.partyEligibility;
  const orgs = Object.keys(p.orgs).length;
  const congressOk = !!p.congressDate && daysBetween(p.congressDate, state.nextElection) >= rules.congressMonthsBefore * 30;
  const congressPossible = daysBetween(state.date, state.nextElection) >= rules.congressMonthsBefore * 30;
  return { orgs, needOrgs: rules.minProvinceOrgs, orgsOk: orgs >= rules.minProvinceOrgs, congressOk, congressPossible, ok: orgs >= rules.minProvinceOrgs && congressOk };
}

// Hazine yardımı (yıllık) — son genel seçimde %3'ü geçen partilere oy oranıyla
export function treasuryAid(state, partyId) {
  const last = [...state.elections].reverse().find(e => e.type === 'genel');
  if (!last) return 0;
  const min = state.rules.treasuryAid.minVoteShare;
  const share = last.national[partyId] || 0;
  if (share < min || state.parties[partyId]?.aggregate) return 0;
  const tot = Object.entries(last.national).filter(([id, s]) => s >= min && !state.parties[id]?.aggregate).reduce((a, [, s]) => a + s, 0);
  const total = state.rules.treasuryAid.annualTotal2023 * priceIndex(state);
  return total * share / tot;
}

export function weeklyBudget(state) {
  const p = playerParty(state);
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const infl = priceIndex(state);
  const big = state.player.mode === 'join';
  const lastPoll = state.polls.length ? state.polls[state.polls.length - 1].shares[p.id] || 0 : 0;
  const orgN = Object.keys(p.orgs).length;
  const orgCost = Object.values(p.orgs).reduce((a, o) => a + 2000 + 8000 * o, 0) * infl;
  const income = {
    aidat: p.members * 50 * 0.4 * infl / 4.33,           // aylık ₺50 aidat, %40 tahsilat — tahmini
    hazine: treasuryAid(state, p.id) / 52,
    bagis: (big ? 0 : (15000 + 150000 * p.recognition + 1_500_000 * lastPoll)) * diff.money * infl,
  };
  const expense = {
    genelMerkez: (big ? 0.55 * income.hazine + 300000 : 40000 + 800 * orgN) * infl,
    teskilat: big ? 0 : orgCost,
    personel: (big ? 200000 : 15000 + 4000 * (p.founders?.length || 0)) * infl,
  };
  return { income, expense, net: Object.values(income).reduce((a, b) => a + b, 0) - Object.values(expense).reduce((a, b) => a + b, 0) };
}

function finances(state, f) {
  const p = playerParty(state);
  if (state.player.mode === 'join' && !state.player.isLeader) {
    state.player.personalMoney += 25000 * f * priceIndex(state); // milletvekili maaşı ve destekçiler — tahmini
    return;
  }
  const b = weeklyBudget(state);
  p.money += b.net * f;
  if (p.money < 0) state.flags.debtWeeks = (state.flags.debtWeeks || 0) + f;
  else state.flags.debtWeeks = 0;
}

function kurultayResult(state, rng) {
  const k = state.player.kurultay;
  const party = playerParty(state);
  const vote = clamp(k.support + rng.normal(0, 3.5), 1, 97);
  const won = vote > 50;
  const res = { type: 'kurultay', party: party.id, vote, won, oldLeader: party.leader.name };
  if (won) {
    state.player.isLeader = true;
    party.leader = { name: state.player.name, charisma: 0.5, image: 0.55, image0: party.leader.image };
    party.ideology0 = { ...party.ideology };
    party.momentum += 0.08;
    party.unity = clamp(party.unity - (60 - Math.min(60, vote)) * 0.6, 20, 100);
    party.money = Math.max(party.money, 50_000_000 * priceIndex(state));
    addNews(state, 'player', `${party.short} kurultayında ${state.player.name} genel başkan seçildi (oyların %${vote.toFixed(1).replace('.', ',')})`);
  } else {
    addNews(state, 'player', `${party.short} kurultayında ${res.oldLeader} yeniden genel başkan seçildi`);
    state.gameOver = { reason: 'kurultay', title: 'Kurultayı kaybettin', text: `Kurultayda aldığın oy: %${vote.toFixed(1).replace('.', ',')}. ${party.short} genel başkanlığı şimdilik başka bahara kaldı.` };
  }
  return res;
}

function checkEnd(state) {
  if (state.gameOver) return;
  const p = playerParty(state);
  if ((state.flags.debtWeeks || 0) >= 16) {
    state.gameOver = { reason: 'iflas', title: 'Parti borç batağında', text: '16 haftadır borçtasın. Kurucular istifa etti, parti fiilen dağıldı.' };
  } else if (state.player.isLeader && p.unity <= 0) {
    state.gameOver = { reason: state.player.mode === 'found' ? 'bolunme' : 'devrildin', title: state.player.mode === 'found' ? 'Parti bölündü' : 'Genel başkanlıktan düşürüldün',
      text: state.player.mode === 'found' ? 'İç çatışmalar sonunda kurucuların çoğu ayrılıp yeni bir parti kurdu.' : 'Delegeler olağanüstü kurultayı topladı ve görevden alındın.' };
  }
}

// Bir tur ilerlet. Dönüş: { results: [seçim/kurultay sonuçları] }
export function endTurn(state) {
  return withRng(state, rng => {
    const out = { results: [] };
    const days = state.phase === 'campaign' ? 1 : 7;
    const f = days / 7;
    rivalsAct(state, rng, f);
    economyStep(state, rng, days);

    // Sönümler
    const cd = Math.pow(K.campDecay, f), md = Math.pow(K.momDecay, f);
    for (const pl in state.camp) for (const id in state.camp[pl]) {
      state.camp[pl][id] *= cd;
      if (Math.abs(state.camp[pl][id]) < 0.002) delete state.camp[pl][id];
    }
    for (const p of Object.values(state.parties)) {
      p.momentum *= md;
      p.leader.image += (p.leader.image0 - p.leader.image) * 0.01 * f; // imaj yavaşça normale döner
      if (p.isPlayer && p.id === PLAYER_ID) {
        // Medya ilgisi: anketteki payla orantılı doğal tanınırlık; ilgisizlikte hafif erime
        const poll = state.polls.length ? state.polls[state.polls.length - 1].shares[p.id] || 0 : 0;
        p.recognition = clamp(p.recognition + (0.001 + 0.04 * poll) * (1 - p.recognition) * f - 0.003 * p.recognition * f, 0.003, 1);
        p.media = clamp(0.08 + 0.4 * p.recognition + 3 * poll, 0, 0.8);
      }
    }
    const ad = Math.pow(0.85, f);
    for (const k in state.adapt.types) state.adapt.types[k] *= ad;
    for (const k in state.adapt.provs) state.adapt.provs[k] *= Math.pow(0.7, f);

    // Teşkilat inşaatı
    const me = playerParty(state);
    for (const [pl, w] of Object.entries(me.building || {})) {
      const left = w - f;
      if (left <= 0.01) {
        delete me.building[pl];
        me.orgs[pl] = 0.12;
        addNews(state, 'player', `${me.short} ${PROVINCE_BY_PLATE[pl].name} il başkanlığı açıldı`);
      } else me.building[pl] = left;
    }
    finances(state, f);

    // Kurultay öncesi: mevcut yönetimin karşı hamlesi
    if (state.player.mode === 'join' && !state.player.isLeader) {
      const k = state.player.kurultay;
      const pull = { AKP: 1.0, MHP: 1.0 }[me.id] ?? 0.45;
      k.support = clamp(k.support - (pull + rng.range(0, 0.5)) * f * (DIFFICULTY[state.difficulty]?.rival ?? 1), 0, 95);
    }

    // Olaylar
    maybeTriggerEvent(state, rng, state.phase === 'campaign' ? 0.2 : 0.45);
    if (state.intel > 0) state.intel -= f;

    // Takvim
    state.date = addDays(state.date, days);
    state.turn++;
    state.stats.weeks += f;

    if (state.player.mode === 'join' && !state.player.isLeader && state.date >= state.player.kurultay.date) {
      out.results.push(kurultayResult(state, rng));
    }
    if (state.localElection && state.date >= state.localElection) {
      const r = runLocalElection(state, rng);
      addNews(state, 'info', `Yerel seçimler yapıldı. İl belediye başkanlıklarında ilk sıra: ${Object.entries(r.count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${state.parties[id].short} ${n}`).join(', ')}`);
      for (const [id, n] of Object.entries(r.count)) state.parties[id].momentum += 0.004 * n;
      state.localElection = null;
      out.results.push(r);
    }
    const toElection = daysBetween(state.date, state.nextElection);
    if (toElection <= state.rules.campaignDays && state.phase !== 'campaign' && toElection > 0) {
      state.phase = 'campaign';
      if (state.player.mode === 'found') {
        const el = eligibility(state);
        me.onBallot = el.ok;
        addNews(state, 'info', el.ok ? `YSK açıkladı: ${me.short} seçime katılabilecek` : `YSK listesinde ${me.short} yok: seçime katılma şartları sağlanamadı`);
      }
      addNews(state, 'info', 'Seçim kampanyası resmen başladı. Artık her tur bir gün.');
    }
    if (toElection <= 0) {
      const r = runGeneralElection(state, rng);
      state.phase = 'normal';
      state.nextElection = addDays(state.nextElection, 365 * 5 + 1);
      state.localElection = addDays(state.nextElection, -365 * 4); // yaklaşık
      out.results.push(r);
      if (state.player.mode === 'found') me.onBallot = false;
    }

    // Anket (normalde haftalık, kampanyada 2 günde bir)
    if (state.phase !== 'campaign' || state.turn % 2 === 0) takePoll(state, rng);

    state.player.ap = state.phase === 'campaign' ? 3 : state.player.apMax;
    checkEnd(state);
    return out;
  });
}

// İttifak teklifi (Meclis sekmesi)
export function proposeAlliance(state, targetId) {
  return withRng(state, rng => {
    const me = playerParty(state), t = state.parties[targetId];
    if (state.player.ap < 2) return { error: 'Yeterli eylem puanı yok (2 gerekli).' };
    state.player.ap -= 2;
    const p = allianceChance(state, targetId);
    if (!rng.chance(p)) {
      addNews(state, 'player', `${t.short}, ${me.short} ile ittifak önerisini kabul etmedi`);
      return { ok: false, chance: p, text: `${t.short} teklifini şimdilik reddetti.` };
    }
    let aid = t.alliance;
    if (!aid) {
      aid = 'A' + state.turn;
      state.alliances[aid] = { name: `${t.short}–${me.short} İttifakı`, color: t.color };
      t.alliance = aid;
    }
    me.alliance = aid;
    addNews(state, 'player', `${me.short} artık ${state.alliances[aid].name} içinde`);
    return { ok: true, chance: p, text: `${state.alliances[aid].name} kuruldu/genişledi.` };
  });
}

export function leaveAlliance(state) {
  const me = playerParty(state);
  if (!me.alliance) return;
  const name = state.alliances[me.alliance]?.name;
  me.alliance = null;
  addNews(state, 'player', `${me.short} ittifaktan ayrıldı (${name})`);
}

export function allianceChance(state, targetId) {
  const me = playerParty(state), t = state.parties[targetId];
  const poll = state.polls[state.polls.length - 1].shares;
  const dist = Object.keys(me.ideology).reduce((a, k) => a + Math.abs(me.ideology[k] - t.ideology[k]), 0) / 7;
  const thr = state.rules.parliament.threshold;
  const theirs = t.alliance ? allianceShare(state, poll, t.alliance) : poll[t.id] || 0;
  const mine = me.alliance ? allianceShare(state, poll, me.alliance) : poll[me.id] || 0;
  // Karşı taraf, oyuncunun getireceği oya ve ideolojik yakınlığa bakar; küçük ve tanınmayan partiye ilgi azdır
  let p = 0.1 - 1.0 * dist + (theirs < thr ? 0.2 : 0) + Math.min(0.5, mine * 6) + 0.1 * me.recognition - (theirs > 0.2 ? 0.2 : 0);
  if (state.government.includes(t.id) && !state.government.includes(me.id)) p -= 0.3;
  return clamp(p, 0.02, 0.9);
}
