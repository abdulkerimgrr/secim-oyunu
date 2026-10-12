// Siyasi ziyaretler (partiler arası ilişki) ve dış temaslar.
import { CLUSTERS, PARTY_TO_CLUSTER } from '../data/clusters.js';
import { DESTINATIONS } from '../data/diplomacy.js';
import { clamp } from './util.js';
import { ideologyDistance } from './model.js';
import { addClusterMom } from './social.js';
import { addNews } from './news.js';
import { staffMod } from './staff.js';
import { applyForeign } from './government.js';

export function relation(state, partyId) {
  state.relations = state.relations || {};
  if (state.relations[partyId] === undefined) {
    const me = state.parties[state.player.partyId], t = state.parties[partyId];
    state.relations[partyId] = Math.round(clamp(30 - 45 * ideologyDistance(me.ideology, t.ideology), -40, 40));
  }
  return state.relations[partyId];
}
export function bumpRelation(state, partyId, d) { relation(state, partyId); state.relations[partyId] = clamp(state.relations[partyId] + d, -100, 100); }

export function visitChance(state, target) {
  if (target === 'cb') return clamp(0.25 + state.parties[state.player.partyId].recognition * 0.5, 0.1, 0.85) * staffMod(state, 'foreign');
  const rel = relation(state, target);
  const me = state.parties[state.player.partyId], t = state.parties[target];
  const gap = (t.lastShare || 0) - (me.lastShare || 0);
  return clamp(0.55 + rel / 160 - Math.max(0, gap) * 0.9 + me.recognition * 0.2, 0.05, 0.95) * Math.min(1.2, staffMod(state, 'foreign'));
}

export function politicalVisit(state, target, rng) {
  const me = state.parties[state.player.partyId];
  const isCb = target === 'cb';
  const t = isCb ? null : state.parties[target];
  const host = isCb ? `Cumhurbaşkanı ${state.president}` : `${t.short} Genel Başkanı ${t.leader.name}`;
  const ok = rng.chance(Math.min(0.97, visitChance(state, target)));
  if (!ok) {
    if (!isCb) bumpRelation(state, target, -3);
    addNews(state, 'player', `${me.short} liderinin randevu talebine ${isCb ? 'Cumhurbaşkanlığından' : t.short + ' cephesinden'} olumlu yanıt gelmedi`);
    return { ok: false, host, mood: 'red', relation: isCb ? null : relation(state, target) };
  }
  const warm = rng.next();
  const mood = warm > 0.6 ? 'samimi' : warm > 0.25 ? 'olumlu' : 'mesafeli';
  const d = (mood === 'samimi' ? 14 : mood === 'olumlu' ? 9 : 3) * staffMod(state, 'foreign');
  if (!isCb) {
    bumpRelation(state, target, d);
    // Ziyaret edilen partinin tabanına köprü
    const aud = PARTY_TO_CLUSTER[target] || {};
    addClusterMom(state, me.id, aud, 0.008 * (mood === 'mesafeli' ? 0.4 : 1));
  } else {
    // Cumhurbaşkanı ziyareti: devlet adamlığı imajı, muhalif tabanda hafif tepki
    me.leader.image = clamp(me.leader.image + 0.01, 0, 1);
  }
  me.recognition = clamp(me.recognition + 0.004 * (1 - me.recognition), 0, 1);
  // Muhalefetteyken iktidar liderini ziyaret etmek kendi tabanında tartışma yaratabilir
  let baseCost = 0;
  if ((isCb || state.government.includes(target)) && !state.government.includes(me.id) && rng.chance(0.35)) { baseCost = rng.range(1, 4); me.unity = clamp(me.unity - baseCost, 0, 100); }
  addNews(state, 'player', `${me.short} lideri ${state.player.name}, ${host} ile görüştü; görüşmenin ${mood} geçtiği bildirildi`);
  return { ok: true, host, mood, relation: isCb ? null : relation(state, target), baseCost, delta: d };
}

export function foreignVisit(state, destId, rng) {
  const me = state.parties[state.player.partyId];
  const d = DESTINATIONS.find(x => x.id === destId);
  const success = rng.next() < 0.75 * Math.min(1.3, staffMod(state, 'foreign'));
  // Kümelerin tepkisi: dış politika ekseni + (varsa) milliyetçilik/din yakınlığı
  const aud = {};
  for (const c of CLUSTERS) {
    let a = d.dis * c.ideo.dis;
    if (d.milli) a += d.milli * c.ideo.milli * 0.5;
    if (d.din) a += d.din * c.ideo.din * 0.5;
    if (d.diaspora) a += 0.2;
    aud[c.id] = a;
  }
  const power = (success ? 0.02 : 0.006) * staffMod(state, 'foreign');
  addClusterMom(state, me.id, aud, power);
  me.recognition = clamp(me.recognition + (success ? 0.01 : 0.004) * (1 - me.recognition), 0, 1);
  state.flags.intlRep = clamp((state.flags.intlRep || 10) + (success ? 6 : 2) * staffMod(state, 'foreign'), 0, 100);
  if (state.government.includes(me.id) || state.player.isPresident) applyForeign(state, { [d.foreign]: success ? 4 : 1 });
  addNews(state, 'player', `${me.short} lideri ${state.player.name} ${d.city} temaslarını ${success ? 'tamamladı; görüşmeler uluslararası basında yer aldı' : 'tamamladı; temaslar sınırlı ilgi gördü'}`);
  const likes = Object.entries(aud).filter(([, v]) => v > 0.15).map(([k]) => CLUSTERS.find(c => c.id === k).label);
  const dislikes = Object.entries(aud).filter(([, v]) => v < -0.15).map(([k]) => CLUSTERS.find(c => c.id === k).label);
  return { success, dest: d, likes, dislikes, intlRep: state.flags.intlRep };
}
