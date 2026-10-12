// Liderler tartışması: kampanya döneminde bir kez. Oyuncu cevap seçer, rakiplerin performansı simüle edilir.
import { DEBATE_QUESTIONS } from '../data/debate.js';
import { CLUSTERS } from '../data/clusters.js';
import { DIFFICULTY } from './params.js';
import { clamp } from './util.js';
import { charMod } from './character.js';
import { addNews } from './news.js';

export function debateRivals(state) {
  const poll = state.polls[state.polls.length - 1].shares;
  return Object.values(state.parties).filter(p => !p.aggregate && !p.dissolved && p.id !== state.player.partyId)
    .sort((a, b) => (poll[b.id] || 0) - (poll[a.id] || 0)).slice(0, 2).map(p => p.id);
}

export function prepareDebate(state, rng) {
  return { rivals: debateRivals(state), step: 0, scores: { me: 0, ...Object.fromEntries(debateRivals(state).map(id => [id, 0])) }, log: [], seed: rng.int(1, 1e6) };
}

const lean = p => (p.ideology.eko + p.ideology.milli + p.ideology.din) / 3 > 0.2 ? 'sag' : (p.ideology.eko + p.ideology.milli + p.ideology.din) / 3 < -0.2 ? 'sol' : 'merkez';

export function debateAnswer(state, d, idx, rng) {
  const q = DEBATE_QUESTIONS[d.step];
  const a = q.answers[idx];
  const me = state.parties[state.player.partyId];
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  // Kararsız ve orta seçmene hitap + parti çizgisiyle tutarlılık + karizma
  const und = CLUSTERS.find(c => c.id === 'kararsiz');
  let fit = 0, cons = 0;
  for (const [ax, dir] of Object.entries(a.axis || {})) { fit += dir * (und.ideo[ax] || 0); cons += dir * (me.ideology[ax] || 0); }
  let score = 1 + 0.6 * fit + 0.8 * cons + 0.8 * (me.leader.image - 0.5) + rng.normal(0, 0.35);
  if (a.tone === 'saldiri') score += rng.chance(0.5 * (2 - charMod(state, 'gaffe'))) ? 0.9 : -0.8;
  if (a.tone === 'halkci') score += 0.2 * charMod(state, 'visit');
  if (a.tone === 'teknik') score += 0.2 * charMod(state, 'economy');
  score *= charMod(state, 'tv') * (diff.effect);
  d.scores.me += score;
  const rivals = d.rivals.map(id => {
    const p = state.parties[id];
    const s = 0.9 + 0.9 * (p.leader.charisma - 0.5) + 0.5 * (p.leader.image - 0.5) + rng.normal(0, 0.35);
    d.scores[id] += s * diff.rival;
    return { id, short: p.short, color: p.color, summary: `lideri ${q.summary[lean(p)]}.`, score: s };
  });
  const winners = winShares(d);
  d.log.push({ q: q.id, idx, score });
  d.step++;
  const reaction = score > 1.5 ? 'Salondan alkış; sosyal medyada kesitin paylaşılıyor.' : score > 0.9 ? 'Sağlam bir cevap.' : score > 0.4 ? 'Cevabın biraz sönük kaldı.' : 'Rakiplerin bu cevabı hemen hedef aldı.';
  const mood = score > 1.2 ? 'smile' : score < 0.5 ? 'tense' : 'serious';
  return { score, rivals, winners, reaction, mood, attack: a.tone === 'saldiri' };
}

export function winShares(d) {
  const ids = Object.keys(d.scores);
  const ex = ids.map(id => Math.exp(d.scores[id] * 0.9));
  const t = ex.reduce((x, y) => x + y, 0);
  return Object.fromEntries(ids.map((id, i) => [id, ex[i] / t]));
}

export function finishDebate(state, d) {
  const w = winShares(d);
  const me = state.parties[state.player.partyId];
  const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  const won = top === 'me';
  me.momentum += (w.me - 0.33) * 0.18;
  me.recognition = clamp(me.recognition + 0.03 * (1 - me.recognition), 0, 1);
  for (const id of d.rivals) state.parties[id].momentum += (w[id] - 0.33) * 0.12;
  state.flags.debateDone = state.nextElection;
  addNews(state, 'info', won ? `Liderler tartışmasını izleyicilere göre ${me.short} lideri ${state.player.name} kazandı` : `Liderler tartışmasında öne çıkan isim ${state.parties[top].short} lideri oldu`);
  return { won, shares: w, top };
}
