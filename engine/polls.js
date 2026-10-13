import { project } from './model.js';
import { K } from './params.js';

export function takePoll(state, rng) {
  const pr = project(state);
  const shares = {};
  let tot = 0;
  for (const [id, s] of Object.entries(pr.national)) {
    const sd = K.pollSd * Math.sqrt(Math.max(s, 0.005) / 0.1);
    shares[id] = Math.max(0, s + rng.normal(0, sd));
    tot += shares[id];
  }
  for (const id in shares) shares[id] /= tot;
  state.polls.push({ date: state.date, shares });
  if (state.polls.length > 400) state.polls.shift();
  const me = state.player && shares[state.player.partyId];
  if (me && me > state.stats.peakPoll) state.stats.peakPoll = me;
  storeProjection(state, pr);
  return shares;
}

export function storeProjection(state, pr = project(state)) {
  state.lastProjection = { national: pr.national, clusters: pr.clusters, provinces: Object.fromEntries(Object.entries(pr.provinces).map(([k, v]) => [k, { shares: v.shares, turnout: v.turnout }])) };
}
