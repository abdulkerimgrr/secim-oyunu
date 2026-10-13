// Çok boyutlu kampanya göstergeleri: güven, medya görünürlüğü, teşkilat morali, rakip saldırı riski.
// Ayrıca: seçmen grubu desteği, vaat yükü, seçim altyapısı, sandığa taşıma (mobilizasyon),
// etik dışı operasyonların yakalanma riski ve zincirleme olay zamanlayıcısı.
import { CLUSTERS } from '../data/clusters.js';
import { SEGMENTS, segmentById } from '../data/segments.js';
import { INFRA, INFRA_COSTS, PROMISES, PROMISE_CAPACITY } from '../data/campaign2.js';
import { clamp, addDays, priceIndex } from './util.js';
import { addNews } from './news.js';
import { addClusterMom } from './social.js';

const me = state => state.parties[state.player.partyId];

export function ensureMetrics(state) {
  const p = me(state);
  if (!p) return;
  p.trust ??= 50;
  p.visibility ??= Math.round(12 + 45 * p.recognition);
  p.morale ??= 60;
  const pl = state.player;
  pl.heat ??= 10;
  pl.infra ??= {};
  pl.promises ??= [];
  pl.dirty ??= [];
  state.pending ??= [];
  state.promiseMom ??= {};
}

// ---- Etkiler ----
export const FX_LABELS = { trust: 'Güven', visibility: 'Görünürlük', morale: 'Teşkilat morali', heat: 'Saldırı riski', unity: 'İç huzur', image: 'Lider imajı', momentum: 'Ulusal ivme' };
const BOUNDED = { trust: [0, 100], visibility: [0, 100], morale: [0, 100], heat: [0, 100], unity: [0, 100] };
const val = (x, rng) => Array.isArray(x) ? (rng ? rng.range(x[0], x[1]) : (x[0] + x[1]) / 2) : x;

// Etkiyi uygula; arayüz için [{k, label, v}] döndürür. mult yalnızca olumlu kazanımları ölçekler.
export function applyFx(state, fx = {}, rng, mult = 1) {
  ensureMetrics(state);
  const p = me(state), pl = state.player, out = [];
  for (const [k, raw] of Object.entries(fx)) {
    let v = val(raw, rng);
    if (v > 0 && k !== 'heat') v *= mult;
    if (k === 'heat') { pl.heat = clamp(pl.heat + v, 0, 100); }
    else if (k === 'image') { p.leader.image = clamp(p.leader.image + v, 0, 1); }
    else if (k === 'momentum') { p.momentum += v; }
    else if (k in BOUNDED) {
      // Azalan getiri: 50'nin üzerinde kazanmak, altında kaybetmek zorlaşır (güven, moral, görünürlük)
      if (k !== 'unity') v *= v > 0 ? clamp(Math.pow((100 - p[k]) / 50, 1.5), 0.05, 1.3) : clamp(Math.pow(p[k] / 50, 1.2), 0.2, 1.3);
      p[k] = clamp(p[k] + v, ...BOUNDED[k]);
    }
    else continue;
    if (Math.abs(v) > 1e-6) out.push({ k, label: FX_LABELS[k], v });
  }
  return out;
}

export function fmtFxValue(k, v) {
  const s = v >= 0 ? '+' : '−', a = Math.abs(v);
  if (k === 'image') return `${s}${(a * 100).toFixed(1).replace('.', ',')}`;
  if (k === 'momentum') return `${s}${(a * 100).toFixed(1).replace('.', ',')}`;
  return `${s}${a < 10 ? a.toFixed(1).replace('.', ',').replace(',0', '') : Math.round(a)}`;
}

// Önizleme: [['Güven', '+1 … +3'], ...]
export function fxPreview(fx = {}, mult = 1) {
  const out = [];
  for (const [k, raw] of Object.entries(fx)) {
    if (!FX_LABELS[k]) continue;
    const [a, b] = Array.isArray(raw) ? raw : [raw, raw];
    const m = x => (x > 0 && k !== 'heat' ? x * mult : x);
    out.push([FX_LABELS[k], a === b ? fmtFxValue(k, m(a)) : `${fmtFxValue(k, m(a))} … ${fmtFxValue(k, m(b))}`]);
  }
  return out;
}

// ---- Seçmen grupları ----
export function segAudience(segId) { return segmentById(segId)?.w || {}; }
export function segsAudience(segs = {}) {
  const aud = {};
  for (const [id, w] of Object.entries(segs)) for (const [c, x] of Object.entries(segAudience(id))) aud[c] = Math.max(aud[c] || 0, x * w);
  return aud;
}
// Ulusal küme ağırlıkları
function natWeights(state) {
  const tot = state.units.reduce((a, u) => a + u.registered, 0);
  return CLUSTERS.map((_, i) => state.units.reduce((a, u) => a + u.clusters[i] * u.registered, 0) / tot);
}
// Her grup için partinin tahmini oy payı (projeksiyondaki küme paylarından)
export function segmentSupport(state, pr, partyId = state.player.partyId) {
  if (!pr?.clusters) return [];
  const nw = natWeights(state);
  return SEGMENTS.map(sg => {
    let num = 0, den = 0;
    CLUSTERS.forEach((c, i) => { const w = (sg.w[c.id] || 0) * nw[i]; num += w * (pr.clusters[i][partyId] || 0); den += w; });
    return { ...sg, share: den ? num / den : 0 };
  });
}

// ---- Vaatler ----
export function promiseLoad(state) {
  return (state.player.promises || []).reduce((a, pr) => a + (PROMISES.find(x => x.id === pr.id)?.cost || 0), 0);
}
export const promiseCapacity = () => PROMISE_CAPACITY;
// Ekonomik inandırıcılık (0–100): vaat yükü kapasiteyi aştıkça düşer
export function econCredibility(state) {
  const r = promiseLoad(state) / PROMISE_CAPACITY;
  return Math.round(clamp(100 - 45 * r - Math.max(0, r - 1) * 80, 0, 100));
}
export function addPromiseMom(state, partyId, aud, amount) {
  const pm = state.promiseMom || (state.promiseMom = {});
  const arr = pm[partyId] || (pm[partyId] = CLUSTERS.map(() => 0));
  CLUSTERS.forEach((c, i) => { arr[i] += amount * (aud[c.id] || 0); });
}

// ---- Seçim altyapısı ----
export const infraLevel = (state, id) => state.player.infra?.[id] || 0;
export const infraNextCost = (state, id) => { const l = infraLevel(state, id); return l >= INFRA_COSTS.length ? null : Math.round(INFRA_COSTS[l] * priceIndex(state)); };
export function infraWeeklyCost(state) {
  let c = 0;
  for (const d of INFRA) for (let l = 0; l < infraLevel(state, d.id); l++) c += INFRA_COSTS[l] * 0.004;
  return c * priceIndex(state);
}
export function actionBoost(state) { return 1 + INFRA.reduce((a, d) => a + (d.boost || 0) * infraLevel(state, d.id), 0); }
export function volunteers(state) { const l = infraLevel(state, 'gonullu'); return l ? Math.round(6000 * Math.pow(l, 1.5)) : 0; }

// Sandığa taşıma çarpanı: ilde teşkilat gücü; oyuncu için altyapı ve moral
export function mobilization(state, p, plate) {
  const org = plate !== undefined ? (p.orgs?.[plate] || 0) : avgOrg(p);
  let m = 1 + clamp(0.1 * (org - 0.55), -0.05, 0.04);
  if (p.id === state.player.partyId && state.player.isLeader) {
    for (const d of INFRA) if (d.mob) m += d.mob * infraLevel(state, d.id);
    m *= 0.97 + 0.06 * (p.morale ?? 60) / 100;
  }
  return clamp(m, 0.92, 1.09);
}
function avgOrg(p) { const v = Object.values(p.orgs || {}); return v.length ? v.reduce((a, b) => a + b, 0) / 81 : 0; }
export const mobilizer = state => (p, plate) => mobilization(state, p, plate);

// ---- Etik dışı operasyonlar ----
export function addDirty(state, op) {
  ensureMetrics(state);
  state.player.dirty.push({ ...op, since: state.date, until: addDays(state.date, 7 * (op.weeks || 4)) });
}

// ---- Haftalık güncelleme ----
export function metricsTick(state, rng, f) {
  ensureMetrics(state);
  const p = me(state), pl = state.player;
  if (!pl.isLeader) return [];
  const events = [];
  const visInfra = INFRA.reduce((a, d) => a + (d.vis || 0) * infraLevel(state, d.id), 0);
  const floor = 10 + 45 * p.recognition + visInfra;
  p.visibility = clamp(p.visibility + (floor - p.visibility) * 0.15 * f, 0, 100);
  p.recognition = clamp(p.recognition + 0.0008 * ((p.visibility - 30) / 70) * (1 - p.recognition) * f, 0.003, 1);
  pl.heat = clamp(pl.heat * Math.pow(0.86, f), 0, 100);
  const mTarget = clamp(32 + 0.35 * p.unity + INFRA.reduce((a, d) => a + (d.morale || 0) * infraLevel(state, d.id), 0), 0, 100);
  p.morale = clamp(p.morale + (mTarget - p.morale) * 0.08 * f, 0, 100);
  if (p.morale < 30) for (const k of Object.keys(p.orgs)) p.orgs[k] = clamp(p.orgs[k] * (1 - 0.004 * f), 0.05, 1);
  p.trust = clamp(p.trust + (50 - p.trust) * 0.04 * f, 0, 100);
  // Altyapının haftalık kalıcı etkisi
  for (const d of INFRA) {
    const l = infraLevel(state, d.id);
    if (!l || !d.weekly) continue;
    const aud = d.id === 'telefon' ? { kararsiz: 1 } : segsAudience(d.weekly);
    addClusterMom(state, p.id, aud, 0.0012 * l * f);
  }
  if (infraLevel(state, 'koordinasyon') >= 2 || infraLevel(state, 'veri') >= 3) state.intel = Math.max(state.intel || 0, 1);
  // Vaatlerin etkisi çok yavaş söner (unutulma)
  const pm = state.promiseMom?.[p.id];
  if (pm) for (let i = 0; i < pm.length; i++) pm[i] *= Math.pow(0.995, f);
  // Etik dışı operasyonlar: yakalanma
  for (const op of [...pl.dirty]) {
    if (rng.chance(op.chance * f)) {
      pl.dirty = pl.dirty.filter(x => x !== op);
      const lines = applyFx(state, op.scandal || { trust: -18, image: -0.05, momentum: -0.06, heat: 20 }, rng);
      if (op.fine) p.money -= Math.round(op.fine * priceIndex(state));
      addNews(state, 'player', `SKANDAL: ${p.short} kampanyasının ${op.label} ortaya çıktı`);
      events.push({ kind: 'dirty', label: op.label, lines });
    } else if (state.date >= op.until) pl.dirty = pl.dirty.filter(x => x !== op);
  }
  return events;
}

// Vaadi geri çek: kalıcı etki silinir, güven düşer
export function withdrawPromise(state, id, rng) {
  ensureMetrics(state);
  const x = state.player.promises.find(y => y.id === id);
  if (!x) return null;
  const pr = PROMISES.find(y => y.id === id);
  state.player.promises = state.player.promises.filter(y => y !== x);
  addPromiseMom(state, state.player.partyId, segsAudience(pr.seg), -x.power);
  if (pr.anti) addPromiseMom(state, state.player.partyId, pr.anti, x.power * 0.6);
  const fx = applyFx(state, { trust: -5, heat: 3 }, rng);
  addNews(state, 'player', `${me(state).short} "${pr.label}" vaadinden geri adım attı`);
  return fx;
}
