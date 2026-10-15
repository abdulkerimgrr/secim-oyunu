// Dengeleme simülasyonu: bot oyuncu ile tam dönem oynar. Kullanım: node tests/sim.mjs [found|join] [seed] [difficulty]
import { newGame, generateFounders, playerParty } from '../engine/state.js';
import { endTurn, withRng, eligibility } from '../engine/turn.js';
import { ACTIONS, runAction, canRun, availableActions } from '../engine/actions.js';
import { resolveEvent } from '../ai/events.js';
import { applyAnswer, questionById } from '../engine/broadcast.js';
import { answerFactionEffects } from '../engine/kurultay.js';
const SMART = process.env.SMART === '1';
import { REGION_NAMES } from '../engine/regions.js';
import { PROVINCES } from '../data/generated/provinces.js';

const BOT_RANDOM = process.env.BOT_RANDOM === '1';
const mode = process.argv[2] || 'found', seed = +(process.argv[3] || 7), difficulty = process.argv[4] || 'zor';
const founders = generateFounders(seed).slice(0, 3);
const s = newGame({ mode, seed, difficulty, playerName: 'Bot', joinPartyId: 'CHP', founders,
  party: { name: 'Yeni Yol Partisi', short: 'YYP', color: '#0aa', ideology: { eko: 0.2, din: -0.2, milli: 0.5, yerel: 0, dis: -0.1, ozg: 0.3, deger: 0.1 } } });
const A = id => ACTIONS.find(a => a.id === id);
const big = PROVINCES.slice().sort((a, b) => b.seats - a.seats).map(p => p.plate);
let i = 0;
const results = [];
while (!s.gameOver && i < 400) {
  // olayları ilk seçenekle çöz
  for (const ev of [...s.events.active]) {
    let idx = 0;
    if (SMART) {
      const val = o => { const e = o.effects || {}; const m = r => r ? (r[0] + r[1]) / 2 : 0;
        let v = m(e.momentum) * 30 + m(e.recognition) * 40 + m(e.image) * 50 + m(e.unity) * 0.15 + m(e.support) * 0.8 + (e.cluster ? m(e.cluster.power) * 20 : 0) - (e.scandalRisk || 0) * 3;
        if (e.factions && s.player.kurultay) for (const [fid, r] of Object.entries(e.factions)) { const f = s.player.kurultay.factions.find(x => x.id === fid); v += m(r) * (f?.weight || 0) * 0.8; }
        if (e.kurultayShift) v -= 2; return v; };
      idx = ev.options.reduce((bi, o, i) => val(o) > val(ev.options[bi]) ? i : bi, 0);
    }
    withRng(s, rng => resolveEvent(s, ev.uid, idx, rng));
  }
  let guard = 0;
  while (s.player.ap > 0 && guard++ < 30) {
    const me = playerParty(s);
    let act, prm = {};
    if (mode === 'join' && !s.player.isLeader) {
      const k = s.player.kurultay;
      if (k.signatures < k.sigNeed * 100 + 4 && k.signatures < k.support * 1.6 + 5) act = A('signatures');
      else if (guard === 1 || guard === 5) act = A('vision');
      else if ((guard === 2 || (guard === 3 && i % 2 === 0)) && s.player.ap >= 2) {
        act = A('faction');
        const best = SMART ? k.factions.slice().sort((a, b) => b.weight * (92 - b.support) - a.weight * (92 - a.support))[0].id : ['teskilat', 'degisimci', 'cekirdek'][i % 3];
        prm = { faction: best };
      }
      else { act = A('delegates'); prm = { province: big[(i * 5 + guard) % 25] }; }
    } else if (mode === 'found' && Object.keys(me.orgs).length + Object.keys(me.building).length < 81 && me.money > 3e6) {
      act = A('buildRegion'); prm = { region: REGION_NAMES.find(r => canRun(s, act, { region: r }) === true) };
      if (!prm.region) { act = A('tv'); prm = { channel: 'tarafsiz' }; }
    } else if (mode === 'found' && !me.congressDate && Object.keys(me.orgs).length >= 20 && me.money > 2e6) {
      act = A('congress');
    } else if (me.money < 1.5e6) act = A('fundraise');
    else {
      const r = (i * 7 + guard) % 6;
      if (r === 0) { act = A('rally'); prm = { province: big[(i + guard) % 20], topic: 'ekonomi', tone: 'uzlasmaci' }; }
      else if (r === 1) { act = A('tv'); prm = { channel: ['tarafsiz', 'muhalif', 'iktidara_yakin'][i % 3] }; }
      else if (r === 2) act = A(['social:kisavideo','social:hedefli','social:etiket','press'][i % 4]);
      else if (r === 3) { act = A('strengthenOrg'); prm = { province: big[(i + guard) % 30] }; }
      else if (r === 4) act = A('members');
      else { act = A('visit'); prm = { province: big[(i * 3 + guard) % 40] }; }
    }
    if (!act || canRun(s, act, prm) !== true) { act = A('meeting'); prm = {}; if (canRun(s, act, prm) !== true) break; }
    const res = withRng(s, rng => runAction(s, act, prm, rng));
    if (res.interactive === 'broadcast') {
      const b = res.broadcast;
      while (b.step < b.questions.length) {
        const q = questionById(b.questions[b.step]);
        // bot: kurultayda en çok "uzlaşma/teşkilat/değişim" içeren cevabı seçer
        const score = a => a.tags ? (a.tags.uzlasma || 0) + (a.tags.teskilat || 0) + (a.tags.degisim || 0) * 0.5 - (a.tags.kacamak || 0) * 2 : 0;
        const k = s.player.kurultay;
        const smartScore = a => { if (!a.tags || !k) return score(a); const e = answerFactionEffects(k, a.tags, 1); return k.factions.reduce((t, f) => t + f.weight * (e[f.id] || 0) * (1 - f.support / 92), 0); };
        const sc = SMART ? smartScore : score;
        const best = q.answers.reduce((bi, a, ai) => sc(a) > sc(q.answers[bi]) ? ai : bi, 0);
        withRng(s, rng => applyAnswer(s, b, BOT_RANDOM ? Math.floor(rng.next() * q.answers.length) : best, rng));
      }
    }
  }
  const out = endTurn(s);
  for (const r of out.results) results.push(r);
  if (i % (mode === 'join' && !s.player.isLeader ? 1 : 6) === 0) {
    const me = playerParty(s), poll = s.polls[s.polls.length - 1].shares;
    console.log(s.date, `oy ${(100 * (poll[me.id] || 0)).toFixed(2)}%`, `tanınırlık ${(100 * me.recognition).toFixed(0)}%`, `para ${(me.money / 1e6).toFixed(1)}M`,
      `il ${Object.keys(me.orgs).length}`, `huzur ${me.unity.toFixed(0)}`, `enf ${s.economy.inflation.toFixed(0)}`,
      'AKP', (100 * poll.AKP).toFixed(1), 'CHP', (100 * poll.CHP).toFixed(1), s.player.kurultay ? `destek ${s.player.kurultay.support.toFixed(1)} imza ${s.player.kurultay.signatures.toFixed(1)}` : '');
  }
  if (results.some(r => r.type === 'genel')) break;
  i++;
}
for (const r of results) {
  if (r.type === 'genel') {
    console.log('GENEL SEÇİM', r.date, 'katılım', (100 * r.turnout).toFixed(1));
    for (const [id, v] of Object.entries(r.national).sort((a, b) => b[1] - a[1])) console.log(' ', id.padEnd(7), (100 * v).toFixed(2).padStart(6), String(r.seats[id] || 0).padStart(4));
  } else if (r.type === 'yerel') console.log('YEREL', r.date, JSON.stringify(r.count));
  else if (r.type === 'cb') console.log('CB', r.rounds.map(x => Object.entries(x.shares).map(([k, v]) => k + ' ' + (100 * v).toFixed(1)).join(', ')).join(' | '), '→', r.winner, '| oyuncu:', r.playerRan ? (r.playerWon ? 'KAZANDI' : 'kaybetti') : 'aday değil');
  else console.log(r.type, JSON.stringify(r).slice(0, 160));
}
if (s.gameOver) console.log('OYUN BİTTİ', s.gameOver);
const bad = JSON.stringify(s).includes('NaN') || JSON.stringify(s).includes('null,"x"');
console.log('NaN var mı:', JSON.stringify(s).includes('NaN'), 'kayıt boyutu KB', (JSON.stringify(s).length / 1024).toFixed(0));
