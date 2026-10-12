// Katman 1 — kural tabanlı rakip parti yapay zekâsı.
// Her rakip kaynağına göre her hafta 1–3 hamle yapar: miting (rekabetçi ve kritik illere),
// TV, hükümeti eleştirme veya yükselen oyuncu partisine saldırı. Oyuncunun sık kullandığı
// illerde karşı miting düzenler (öğrenen rakip).
import { NEWS_TEMPLATES } from '../data/events.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { DIFFICULTY } from '../engine/params.js';
import { ideologyDistance } from '../engine/model.js';
import { addNews } from '../engine/news.js';
import { loc } from '../engine/util.js';

function fill(t, o) { return t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? ''); }

export function rivalsAct(state, rng, scale = 1) {
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.zor;
  const me = state.parties[state.player.partyId];
  const poll = state.polls.length ? state.polls[state.polls.length - 1].shares : {};
  const myPoll = poll[me.id] || 0;
  const myIsLeader = state.player.isLeader;
  const misery = state.economy.inflation + 2 * state.economy.unemployment - state.economy.misery0;
  const prov = state.lastProjection?.provinces || {};
  const hotProvs = state.flags.lastPlayerProvs || [];
  let newsBudget = 3;

  for (const p of Object.values(state.parties)) {
    if (p.dissolved || p.aggregate || (p.isPlayer && myIsLeader) || p.resources <= 0) continue;
    const n = Math.max(0, Math.round((p.resources * 0.8 + rng.range(-0.3, 0.6)) * diff.rival * scale + (rng.next() < (scale % 1) ? 1 : 0)));
    const isOpp = !state.government.includes(p.id);
    const threat = myIsLeader && me.id !== p.id && myPoll > 0.02 && ideologyDistance(p.ideology, me.ideology) < 0.75;
    for (let i = 0; i < n; i++) {
      const r = rng.next();
      const eff = (0.6 + 0.4 * p.media) * diff.rival;
      if (threat && r < 0.15 + Math.min(0.25, myPoll * 3)) {
        me.momentum -= rng.range(0.005, 0.02) * eff;
        if (newsBudget-- > 0) addNews(state, 'rival', fill(rng.pick(NEWS_TEMPLATES.attackPlayer), { party: p.short, target: me.short }));
      } else if (isOpp && misery > 3 && r < 0.4) {
        p.momentum += rng.range(0.003, 0.012) * eff;
        if (newsBudget-- > 0 && rng.chance(0.4)) addNews(state, 'rival', fill(rng.pick(NEWS_TEMPLATES.attackGov), { party: p.short }));
      } else if (r < 0.7) {
        // miting: kendi tabanı güçlü ve sandalye sayısı yüksek iller + oyuncunun yoğunlaştığı iller
        const pv = rng.weighted(PROVINCES, x => {
          const s = prov[x.plate]?.shares?.[p.id] || 0.01;
          return x.seats * (0.2 + s) * (hotProvs.includes(x.plate) && threat ? 3 : 1);
        });
        const c = state.camp[pv.plate] || (state.camp[pv.plate] = {});
        c[p.id] = (c[p.id] || 0) + rng.range(0.02, 0.06) * eff;
        if (newsBudget > 0 && rng.chance(0.25)) { newsBudget--; addNews(state, 'rival', fill(rng.pick(NEWS_TEMPLATES.rally), { party: p.short, prov: pv.name, provLoc: loc(pv.name) })); }
      } else {
        p.momentum += rng.range(0.002, 0.008) * eff;
        if (newsBudget > 0 && rng.chance(0.15)) { newsBudget--; addNews(state, 'rival', fill(rng.pick(NEWS_TEMPLATES.tv), { party: p.short })); }
      }
    }
  }
  // İktidar icraat açıklaması
  for (const id of state.government) {
    const p = state.parties[id];
    if (p && !(p.isPlayer && myIsLeader) && rng.chance(0.15 * scale)) {
      p.momentum += rng.range(0.005, 0.02);
      if (rng.chance(0.3)) addNews(state, 'gov', `Hükümet yeni bir yatırım paketini duyurdu`);
    }
  }
}
