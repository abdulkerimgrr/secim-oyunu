// Basın açıklaması: etkiler ve kurgusal medya tepkileri.
import { PRESS_STANCES, PAPERS, HEADLINES, SUBHEADS, CITIZENS, CITIZEN_LINES, PUNDITS, PUNDIT_LINES } from '../data/press.js';
import { TOPICS, CLUSTERS } from '../data/clusters.js';
import { DIFFICULTY } from './params.js';
import { clamp } from './util.js';
import { addClusterMom } from './social.js';
import { charMod } from './character.js';
import { staffMod } from './staff.js';

export const stancesFor = topic => PRESS_STANCES[topic] || [];

function fill(t, o) { return t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? ''); }

// Tutumun parti ideolojisiyle uyumu (−1 … +1)
function ideologyFit(p, st) {
  let f = 0, n = 0;
  for (const [ax, dir] of Object.entries(st.axis || {})) { f += dir * (p.ideology[ax] || 0); n++; }
  return n ? f / n : 0.2;
}

export function pressStatement(state, topic, stanceId, rng, fatigueMul = 1) {
  const p = state.parties[state.player.partyId];
  const st = stancesFor(topic).find(s => s.id === stanceId) || stancesFor(topic)[0];
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const isGov = state.government.includes(p.id);
  const fit = ideologyFit(p, st);
  const reach = 0.3 + p.media + p.recognition;
  let quality = (0.7 + 0.5 * fit) * (st.critical && isGov ? 0.3 : 1) * rng.range(0.6, 1.4);
  if (topic === 'ekonomi') quality *= charMod(state, 'economy');
  if (topic === 'hizmet') quality *= charMod(state, 'service');
  // U dönüşü: aynı konuda farklı tutum
  const stances = state.flags.pressStances || (state.flags.pressStances = {});
  const uturn = stances[topic] && stances[topic] !== st.id && rng.chance(0.5);
  stances[topic] = st.id;
  if (uturn) quality *= 0.4;
  const gaffe = st.tone === 'sert' && rng.chance(0.08 * charMod(state, 'gaffe'));
  if (gaffe) quality *= 0.3;
  const power = 0.03 * reach * quality * diff.effect * fatigueMul * staffMod(state, 'press');
  addClusterMom(state, p.id, st.audience, power);
  p.momentum += power * 0.25;
  p.recognition = clamp(p.recognition + 0.004 * reach * (1 - p.recognition), 0, 1);
  if (gaffe || uturn) p.leader.image = clamp(p.leader.image - 0.015, 0, 1);
  const score = clamp((quality - 0.6) / 0.8, -1, 1); // genel karşılanma
  return { stance: st, power, quality, score, uturn, gaffe, reactions: reactions(state, p, topic, st, score, isGov, rng) };
}

function reactions(state, p, topic, st, score, isGov, rng) {
  const vars = { SHORT: p.short, NAME: state.player.name, TOPIC: (TOPICS.find(t => t.id === topic)?.label || topic).toLocaleLowerCase('tr') };
  const toneOf = v => (v > 0.25 ? 'pos' : v < -0.25 ? 'neg' : 'neu');
  // Gazeteler: çizgiye göre eğilim
  const lean = { iktidar: isGov ? 0.6 : -0.5 + 0.4 * ((st.axis?.milli || 0) + (st.axis?.din || 0)), muhalif: isGov ? -0.6 : (st.critical ? 0.6 : 0.2),
    tarafsiz: 0, milli: 0.5 * ((st.axis?.milli || 0)) + 0.2 * ((st.axis?.din || 0)) };
  const papers = PAPERS.map(pp => {
    const t = toneOf(score * 0.7 + (lean[pp.line] || 0) + rng.normal(0, 0.2));
    return { ...pp, tone: t, headline: fill(rng.pick(HEADLINES[t]), vars), sub: rng.pick(SUBHEADS[t]) };
  });
  // Vatandaşlar: kümelerin hedef kitlede olup olmamasına göre
  const people = [...CITIZENS].sort(() => rng.next() - 0.5).slice(0, 4).map(c => {
    const aud = st.audience[c.cluster] || 0;
    const cl = CLUSTERS.find(x => x.id === c.cluster);
    let near = 0;
    for (const [ax, dir] of Object.entries(st.axis || {})) near += dir * (cl.ideo[ax] || 0);
    const t = toneOf(score * 0.5 + aud * 0.6 + near * 0.5 - 0.25 + rng.normal(0, 0.25));
    return { ...c, tone: t, text: rng.pick(CITIZEN_LINES[t]), likes: Math.round(rng.range(20, 900) * (1 + p.recognition * 8)) };
  });
  // Hükümet ve rakip: özet (alıntı yok)
  const gov = isGov
    ? { tone: 'pos', text: 'Hükümet kanadı açıklamaya destek verdi; atılan adımların sürdürüleceği vurgulandı.' }
    : st.critical || st.tone === 'sert'
      ? { tone: 'neg', text: 'Hükümet kanadı açıklamayı eleştirdi; göstergelerin olumlu seyrettiğini savundu.' }
      : { tone: 'neu', text: 'Hükümet kanadından açıklamaya ilişkin resmi bir değerlendirme gelmedi.' };
  const rivals = Object.values(state.parties).filter(x => !x.aggregate && !x.dissolved && x.id !== p.id && x.lastShare > 0.05);
  const rv = rivals.length ? rng.pick(rivals) : null;
  const rival = rv ? { party: rv.short, color: rv.color, tone: score > 0.3 ? 'neg' : 'neu', text: score > 0.3 ? `${rv.short} çevreleri açıklamaya mesafeli durdu; benzer önerileri daha önce dile getirdiklerini hatırlattı.` : `${rv.short} çevrelerinden açıklamaya kayda değer bir tepki gelmedi.` } : null;
  const pundit = { name: rng.pick(PUNDITS), text: rng.pick(PUNDIT_LINES[toneOf(score + rng.normal(0, 0.2))]) };
  const yes = clamp(0.35 + 0.25 * score + rng.normal(0, 0.05), 0.1, 0.8);
  const no = clamp(0.4 - 0.2 * score + rng.normal(0, 0.05), 0.08, 0.8);
  const poll = { yes, no, dk: Math.max(0.05, 1 - yes - no) };
  return { papers, people, gov, rival, pundit, poll };
}
