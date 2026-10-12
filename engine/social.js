// Sosyal medya kampanyaları: başlatma, haftalık etki ve izlenme istatistikleri.
import { SOCIAL_CAMPAIGNS } from '../data/social.js';
import { CLUSTERS } from '../data/clusters.js';
import { DIFFICULTY } from './params.js';
import { clamp, addDays } from './util.js';
import { charMod } from './character.js';
import { addNews } from './news.js';
import { staffMod } from './staff.js';

export const campaignDef = id => SOCIAL_CAMPAIGNS.find(c => c.id === id);

export function addClusterMom(state, partyId, audience, amount) {
  const cm = state.clusterMom || (state.clusterMom = {});
  const arr = cm[partyId] || (cm[partyId] = CLUSTERS.map(() => 0));
  CLUSTERS.forEach((c, i) => { arr[i] += amount * (audience[c.id] || 0); });
}

// Kampanya başlat: hemen etkiler (viral/ters tepme) + sürecek kampanya kaydı
export function launchCampaign(state, def, prm, rng, fatigueMul = 1) {
  const p = state.parties[state.player.partyId];
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const dig = state.player.mode === 'found' ? Math.max(0, ...(p.founders || []).filter(f => f.skill === 'dijital').map(f => f.level)) : 0.4;
  const viral = def.viral ? rng.chance(def.viral * (1 + dig) * (state.player.character?.traits?.includes('medyatik') ? 1.3 : 1) * staffMod(state, 'viral')) : false;
  const backfire = !viral && def.backfire ? rng.chance(def.backfire * charMod(state, 'gaffe') * staffMod(state, 'backfire')) : false;
  const mult = (viral ? 2.5 : backfire ? 0.3 : rng.range(0.75, 1.25)) * diff.effect * fatigueMul * staffMod(state, 'social');
  const c = {
    uid: `${def.id}-${state.turn}-${Math.floor(rng.next() * 1e4)}`, id: def.id, start: state.date,
    weeksTotal: def.weeks, weeksLeft: def.weeks, mult, viral, backfire, province: prm.province || null,
    views: 0, likes: 0, shares: 0, comments: 0,
  };
  // İlk hafta etkisi hemen
  const res = campaignWeek(state, c, 1, rng);
  if (backfire) { p.leader.image = clamp(p.leader.image - 0.02, 0, 1); p.momentum -= 0.02; }
  if (viral) { p.momentum += 0.03; addNews(state, 'player', `${p.short} kampanyası sosyal medyada viral oldu (${def.label})`); }
  if (def.shield) state.flags.shieldUntil = addDays(state.date, def.weeks * 7);
  if (def.momentum) p.momentum += def.momentum * mult;
  if (def.image && !backfire) p.leader.image = clamp(p.leader.image + def.image * mult, 0, 1);
  state.socialCampaigns = state.socialCampaigns || [];
  if (c.weeksLeft > 0) state.socialCampaigns.push(c);
  else archive(state, c);
  return { campaign: c, first: res };
}

function archive(state, c) {
  state.socialHistory = state.socialHistory || [];
  state.socialHistory.unshift({ id: c.id, start: c.start, views: c.views, likes: c.likes, shares: c.shares, viral: c.viral, backfire: c.backfire });
  if (state.socialHistory.length > 20) state.socialHistory.length = 20;
}

// Bir haftalık kampanya etkisi (f: hafta oranı)
export function campaignWeek(state, c, f, rng) {
  const def = campaignDef(c.id);
  const p = state.parties[state.player.partyId];
  const share = f / def.weeks;
  addClusterMom(state, p.id, def.audience, def.power * c.mult * share);
  p.recognition = clamp(p.recognition + def.rec * c.mult * share * (1 - p.recognition), 0, 1);
  if (def.local && c.province) {
    const cc = state.camp[c.province] || (state.camp[c.province] = {});
    cc[p.id] = (cc[p.id] || 0) + def.local * c.mult * share;
  }
  // İzlenme: tanınırlık ve çarpanla
  const v = (0.15 + 2.5 * p.recognition) * c.mult * share * (def.id === 'mesajlasma' ? 0.15 : 1) * 1e6 * rng.range(0.7, 1.3);
  c.views += v; c.likes += v * rng.range(0.03, 0.07); c.shares += v * rng.range(0.004, 0.012); c.comments += v * rng.range(0.002, 0.006);
  c.weeksLeft = Math.max(0, c.weeksLeft - f);
  return { views: v };
}

export function socialTick(state, rng, f) {
  const list = state.socialCampaigns || [];
  for (const c of list) campaignWeek(state, c, Math.min(f, c.weeksLeft), rng);
  const done = list.filter(c => c.weeksLeft <= 0.001);
  for (const c of done) archive(state, c);
  state.socialCampaigns = list.filter(c => c.weeksLeft > 0.001);
  // küme ivmesi sönümü
  const d = Math.pow(0.9, f);
  for (const arr of Object.values(state.clusterMom || {})) for (let i = 0; i < arr.length; i++) arr[i] *= d;
}
