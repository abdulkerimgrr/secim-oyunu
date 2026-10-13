// Kriz yönetimi: rastgele krizler (bu tur yanıt verilmezse büyür), zincirleme olaylar ve
// gecikmeli sonuçlar. Olaylar Gündem'deki olay kartlarıyla aynı şemayı kullanır (ai/events.js).
import { CRISES, CHAINS } from '../data/crises.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { DEPREM, SANAYI } from './speechgen.js';
import { applyEconShock } from './economy.js';
import { addNews } from './news.js';
import { addDays, loc } from './util.js';
import { applyFx, ensureMetrics } from './metrics.js';

function pickProvince(where, rng) {
  if (where === 'deprem') return PROVINCES.find(p => p.plate === rng.pick(DEPREM));
  if (where === 'sanayi') return PROVINCES.find(p => p.plate === rng.pick(SANAYI));
  return rng.weighted(PROVINCES, p => p.seats);
}

// Seçenek tanımını olay seçeneğine çevir (etkiler resolveEvent'te uygulanır)
function toOption(o, i, plate) {
  const effects = {};
  if (o.fx) effects.fx = o.fx;
  if (o.ap) effects.ap = o.ap;
  if (o.money) effects.cash = o.money;
  if (o.seg) effects.seg = o.seg;
  if (o.camp && plate) effects.camp = { plate, value: o.camp };
  if (o.gamble) effects.gamble = o.gamble;
  if (o.schedule) effects.schedule = o.schedule;
  if (o.flag) effects.flag = o.flag;
  if (o.dirty) effects.dirty = o.dirty;
  if (o.econ) effects.econBonus = true;
  if (o.charisma) effects.charisma = true;
  return { i, label: o.label, effects, oppositionOnly: o.oppositionOnly };
}

function fill(t, pv) { return pv ? t.replace(/\{prov\}/g, pv.name).replace(/\{provLoc\}/g, loc(pv.name)) : t; }

export function spawnCrisis(state, rng, def = rng.pick(CRISES)) {
  const pv = def.where ? pickProvince(def.where, rng) : null;
  if (def.econShock) applyEconShock(state, def.econShock, rng);
  const inst = {
    uid: `kriz-${def.id}-${state.turn}`, id: 'kriz:' + def.id, date: state.date, source: 'kriz',
    title: `${def.icon} ${fill(def.title, pv)}`, body: fill(def.body, pv),
    options: def.options.map((o, i) => toOption(o, i, pv?.plate)),
    crisis: { deadline: state.turn + 1, escalated: false, ignore: def.ignore, plate: pv?.plate || null },
  };
  state.events.active.push(inst);
  state.flags.lastCrisis = state.date;
  addNews(state, 'event', `SON DAKİKA: ${fill(def.title, pv)}`);
  return inst;
}

export function spawnChain(state, id) {
  const def = CHAINS[id];
  if (!def) return null;
  const inst = { uid: `zincir-${id}-${state.turn}`, id: 'zincir:' + id, date: state.date, source: 'zincir', title: `${def.icon} ${def.title}`, body: def.body,
    options: def.options.map((o, i) => toOption(o, i, null)) };
  state.events.active.push(inst);
  return inst;
}

export function schedule(state, item) {
  ensureMetrics(state);
  state.pending.push({ at: addDays(state.date, 7 * (item.weeks || 4)), id: item.id, chance: item.chance ?? 1 });
}

// Tur sonunda: yanıtsız krizleri büyüt, vadesi gelen zincirleri başlat, yeni kriz üret
export function crisisTick(state, rng) {
  ensureMetrics(state);
  if (!state.player.isLeader) return;
  const p = state.parties[state.player.partyId];
  for (const ev of [...state.events.active]) {
    const c = ev.crisis;
    if (!c || c.deadline > state.turn) continue;
    if (!c.escalated) {
      applyFx(state, c.ignore, rng);
      c.escalated = true; c.deadline = state.turn + 1;
      ev.title = ev.title.replace(/^(\S+) /, '$1 BÜYÜYOR: ');
      ev.body = `Geçen tur sessiz kalman eleştirildi; kriz büyüdü. ${ev.body}`;
      addNews(state, 'player', `${p.short}, krize geç tepki vermekle eleştiriliyor`);
    } else {
      const ig = Object.fromEntries(Object.entries(c.ignore || {}).map(([k, v]) => [k, v * 1.5]));
      applyFx(state, ig, rng);
      state.events.active = state.events.active.filter(x => x !== ev);
      state.events.history.unshift({ date: state.date, title: ev.title, choice: 'Yanıt verilmedi' });
      addNews(state, 'player', `${p.short} krize sessiz kaldı; güven kaybı büyüdü`);
    }
  }
  for (const it of [...state.pending]) {
    if (state.date < it.at) continue;
    state.pending = state.pending.filter(x => x !== it);
    if (rng.chance(it.chance)) spawnChain(state, it.id);
  }
  const active = state.events.active;
  if (!active.some(e => e.crisis) && active.length < 3 && rng.chance(state.phase === 'campaign' ? 0.03 : 0.07)) spawnCrisis(state, rng);
  // Seçime yaklaşırken ve geride kalırken etik dışı bir teklif gelebilir
  const weeksToElection = (Date.parse(state.nextElection) - Date.parse(state.date)) / 6048e5;
  if (!state.flags.deepfakeOffered && weeksToElection < 26 && (state.player.heat > 35 || rng.chance(0.3)) && rng.chance(0.05)) {
    state.flags.deepfakeOffered = state.date;
    spawnChain(state, 'deepfake');
  }
}
