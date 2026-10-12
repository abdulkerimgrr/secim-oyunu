// Gündem: bekleyen olaylar (manşet kartları), haber akışı, geçmiş kararlar.
import { esc, sheet } from '../dom.js';
import { describeOption, resolveEvent } from '../../ai/events.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { storeProjection } from '../../engine/polls.js';
import { fmtDate } from '../../engine/util.js';

const KIND_LABEL = { player: 'Biz', rival: 'Rakip', gov: 'Hükümet', event: 'Gündem', info: 'Bilgi' };
let filter = 'all';

export function renderAgenda(view, ctx) {
  const s = ctx.state;
  const isOpp = !s.government.includes(s.player.partyId);
  if (!s.events.active.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Bekleyen gündem yok</h2><p class="small muted" style="margin:0">Yeni olaylar tur sonunda düşer. Olaylar oyun içi kurgusal senaryolardır.</p></section>`);
  for (const ev of s.events.active) {
    const card = document.createElement('article');
    card.className = 'headline';
    card.innerHTML = `<div class="flag"><span>SON DAKİKA</span><span>${fmtDate(ev.date)}</span></div><div class="body">
      <h3>${esc(ev.title)}</h3><p>${esc(ev.body)}</p>
      <div class="eyebrow">Tutumun ne olacak?</div>
      ${ev.options.filter(o => !(o.oppositionOnly && !isOpp)).map(o => `<button class="opt" data-opt="${o.i}"><div class="ol">${esc(o.label)}</div><div class="oe">${esc(describeOption(s, o).join(' · ') || 'Belirgin etkisi yok')}</div></button>`).join('')}
      <p class="small muted" style="margin:8px 0 0;font-family:var(--f-body)">Kurgusal senaryo · kaynak: ${ev.source === 'havuz' ? 'kural tabanlı olay havuzu' : esc(ev.source)}</p></div>`;
    card.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
      const r = withRng(s, rng => resolveEvent(s, ev.uid, +b.dataset.opt, rng));
      storeProjection(s); saveGame(s, 'oto'); ctx.render();
      sheet(`<div class="eyebrow">${esc(r.title)}</div><h2>${esc(r.choice)}</h2><ul style="margin:0;padding-left:18px">${r.lines.map(l => `<li>${esc(l)}</li>`).join('') || '<li>Kayda değer bir etki olmadı.</li>'}</ul>`);
    });
    view.appendChild(card);
  }
  const kinds = ['all', 'player', 'rival', 'gov', 'event', 'info'];
  const news = s.news.filter(n => filter === 'all' || n.kind === filter);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Haber akışı</h2>
    <div class="chips" style="margin-bottom:6px">${kinds.map(k => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'Tümü' : KIND_LABEL[k]}</button>`).join('')}</div>
    <div class="list">${news.slice(0, 40).map(n => `<div class="news-item ${n.kind}"><div class="d">${fmtDate(n.date).replace(/ \d{4}$/, '')}</div><div class="x">${esc(n.text)}</div></div>`).join('') || '<p class="muted small">Haber yok.</p>'}</div></section>`);
  if (s.events.history.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Verdiğin kararlar</h2><div class="list">${s.events.history.slice(0, 15).map(h => `<div class="li"><div class="small num" style="width:80px">${fmtDate(h.date)}</div><div class="grow"><div class="t small">${esc(h.title)}</div><div class="small muted">${esc(h.choice)}</div></div></div>`).join('')}</div></section>`);
  view.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; ctx.render(); });
}
