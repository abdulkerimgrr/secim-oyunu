// Gündem: bekleyen olaylar (manşet kartları), haber akışı, geçmiş kararlar.
import { esc, sheet, toast } from '../dom.js';
import { describeOption, resolveEvent } from '../../ai/events.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { storeProjection } from '../../engine/polls.js';
import { fmtDate } from '../../engine/util.js';
import { policyById, foreignScore, publicSupport } from '../../engine/government.js';
import { FOREIGN_AXES } from '../../data/policies.js';
import { staffLevel } from '../../engine/staff.js';

export function foreignCard(s) {
  const f = s.foreign || {};
  const sc = foreignScore(s);
  return `<section class="card"><h2>Dış ilişkiler <small>genel puan ${Math.round(sc)}/100</small></h2>
    <div class="bars">${FOREIGN_AXES.map(a => { const v = f[a.id] ?? 50; const col = v >= 60 ? 'var(--good)' : v < 40 ? 'var(--bad)' : 'var(--warn)';
      return `<div class="bar" style="grid-template-columns:120px 1fr 40px"><span class="name">${a.icon} ${a.label}</span><div class="track"><div class="fill" style="width:${v}%;background:${col}"></div></div><span class="val">${Math.round(v)}</span></div>`; }).join('')}</div>
    <p class="small muted" style="margin:6px 0 0">Dış ilişkiler kur, büyüme ve iktidarın itibarını etkiler. Hükümet politikaları ve dünya gündemiyle değişir.</p></section>`;
}

function govAgendaCard(s) {
  const ag = s.govAgenda || { active: [], history: [] };
  const lab = { kabul: ['Kabul edildi', 'good'], red: ['Reddedildi', 'bad'], geri: ['Geri çekildi', 'warn'] };
  return `<section class="card"><h2>Hükümet gündemi <small>${s.player.isPresident ? 'sen yönetiyorsun' : 'iktidarın planları'}</small></h2>
    ${ag.active.length ? `<div class="list">${ag.active.map(a => { const p = policyById(a.id); return `<div class="li"><span class="pill warn">Planlanıyor</span><div class="grow"><div class="t small">${esc(p.title)}</div><div class="small muted">${esc(p.cat)} · Meclis oylaması ${fmtDate(a.voteAt)} · kamuoyu desteği %${Math.round(a.support * 100)}${s.flags.policyStances?.[a.id] ? ` · tutumun: ${{ destek: 'destek', karsi: 'karşı', sartli: 'şartlı' }[s.flags.policyStances[a.id]]}` : ''}</div></div></div>`; }).join('')}</div>` : '<p class="small muted" style="margin:0">Şu an bekleyen bir hükümet planı yok.</p>'}
    ${ag.history.length ? `<div class="eyebrow" style="margin-top:8px">Son kararlar</div><div class="list">${ag.history.slice(0, 6).map(h => { const p = policyById(h.id); const [l, c] = lab[h.outcome]; return `<div class="li small"><span class="pill ${c}">${l}</span><div class="grow">${esc(p.title)}</div><span class="muted">${fmtDate(h.end)}</span></div>`; }).join('')}</div>` : ''}
    <p class="small muted" style="margin:6px 0 0">Hükümet planları ilan edildiğinde Gündem'de tutumun sorulur. Kamuoyunun nabzını tutarsan ödüllendirilirsin. Politikalar oyun içi senaryodur.</p></section>`;
}

// Asistan önerisi: beklenen faydası en yüksek seçenek
function advise(s, ev) {
  if (staffLevel(s, 'asistan') <= 0) return -1;
  const m = r => r ? (r[0] + r[1]) / 2 : 0;
  const val = o => { const e = o.effects || {}; return m(e.momentum) * 30 + m(e.recognition) * 40 + m(e.image) * 50 + m(e.unity) * 0.15 + m(e.support) * 0.8 + (e.cluster ? m(e.cluster.power) * 20 : 0) - (e.scandalRisk || 0) * 3 + m(e.money) / 2e6; };
  if (ev.id?.startsWith('pol:')) { const p = policyById(ev.id.slice(4)); const sup = publicSupport(s, p); return sup >= 0.55 ? 0 : sup <= 0.45 ? 1 : 2; }
  return ev.options.reduce((bi, o, i) => val(o) > val(ev.options[bi]) ? i : bi, 0);
}

const KIND_LABEL = { player: 'Biz', rival: 'Rakip', gov: 'Hükümet', econ: 'Ekonomi', world: 'Dünya', event: 'Gündem', info: 'Bilgi' };
let filter = 'all';

export function renderAgenda(view, ctx) {
  const s = ctx.state;
  const isOpp = !s.government.includes(s.player.partyId);
  if (!s.events.active.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Bekleyen gündem yok</h2><p class="small muted" style="margin:0">Yeni olaylar tur sonunda düşer. Olaylar oyun içi kurgusal senaryolardır.</p></section>`);
  for (const ev of s.events.active) {
    const card = document.createElement('article');
    card.className = 'headline';
    card.innerHTML = `<div class="flag"><span>SON DAKİKA</span><span>${fmtDate(ev.date)}</span></div><div class="body">
      <h3>${esc(ev.title)}</h3>${ev.crisis ? `<div class="crisis-timer ${ev.crisis.escalated ? 'hot' : ''}">⏱ ${ev.crisis.escalated ? 'Son şans: bu tur yanıt vermezsen kriz kapanır ve ağır güven kaybı yaşarsın.' : 'Bu tur içinde yanıt ver; yoksa kriz büyür.'}${s.player.ap ? ` · kalan eylem puanı ${s.player.ap}` : ''}</div>` : ''}<p>${esc(ev.body)}</p>
      <div class="eyebrow">Tutumun ne olacak?</div>
      ${ev.options.filter(o => !(o.oppositionOnly && !isOpp)).map(o => `<button class="opt" data-opt="${o.i}"><div class="ol">${esc(o.label)}${advise(s, ev) === o.i ? ' <span class="pill good">🗂️ asistan önerisi</span>' : ''}</div><div class="oe">${esc(describeOption(s, o).join(' · ') || 'Belirgin etkisi yok')}</div></button>`).join('')}
      <p class="small muted" style="margin:8px 0 0;font-family:var(--f-body)">Kurgusal senaryo · kaynak: ${ev.source === 'havuz' ? 'kural tabanlı olay havuzu' : esc(ev.source)}</p></div>`;
    card.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
      const r = withRng(s, rng => resolveEvent(s, ev.uid, +b.dataset.opt, rng));
      if (!r || r.error) return toast(r?.error || 'Seçenek uygulanamadı.');
      storeProjection(s); saveGame(s, 'oto'); ctx.render();
      sheet(`<div class="eyebrow">${esc(r.title)}</div><h2>${esc(r.choice)}</h2><ul style="margin:0;padding-left:18px">${r.lines.map(l => `<li>${esc(l)}</li>`).join('') || '<li>Kayda değer bir etki olmadı.</li>'}</ul>`);
    });
    view.appendChild(card);
  }
  view.insertAdjacentHTML('beforeend', govAgendaCard(s));
  view.insertAdjacentHTML('beforeend', foreignCard(s));
  const kinds = ['all', 'player', 'rival', 'gov', 'econ', 'world', 'event', 'info'];
  const news = s.news.filter(n => filter === 'all' || n.kind === filter);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Haber akışı</h2>
    <div class="chips" style="margin-bottom:6px">${kinds.map(k => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'Tümü' : KIND_LABEL[k]}</button>`).join('')}</div>
    <div class="list">${news.slice(0, 40).map(n => `<div class="news-item ${n.kind}"><div class="d">${fmtDate(n.date).replace(/ \d{4}$/, '')}</div><div class="x">${esc(n.text)}</div></div>`).join('') || '<p class="muted small">Haber yok.</p>'}</div></section>`);
  if (s.events.history.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Verdiğin kararlar</h2><div class="list">${s.events.history.slice(0, 15).map(h => `<div class="li"><div class="small num" style="width:80px">${fmtDate(h.date)}</div><div class="grow"><div class="t small">${esc(h.title)}</div><div class="small muted">${esc(h.choice)}</div></div></div>`).join('')}</div></section>`);
  view.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; ctx.render(); });
}
