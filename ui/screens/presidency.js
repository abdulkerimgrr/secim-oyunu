// Cumhurbaşkanlığı makamı ekranı
import { esc, sheet, toast } from '../dom.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { pollTrend, hemicycle } from '../charts.js';
import { CABINET_POSTS } from '../../data/cabinet.js';
import { ensurePresidency, ministerCandidates, appoint, approvalTarget } from '../../engine/presidency.js';
import { policyById } from '../../engine/government.js';
import { actionById } from '../../engine/actions.js';
import { playerParty } from '../../engine/state.js';
import { saveGame } from '../../engine/save.js';
import { fmtDate, daysBetween } from '../../engine/util.js';
import { foreignCard } from './agenda.js';
import { openAction } from './campaign.js';
import { sfx } from '../sound.js';

function gauge(v) {
  const a = Math.PI * (1 - v / 100);
  const x = 100 + 80 * Math.cos(a), y = 100 - 80 * Math.sin(a);
  const col = v >= 50 ? '#1F8A4C' : v >= 35 ? '#C77700' : '#C0262D';
  return `<svg viewBox="0 0 200 115" width="100%" style="max-width:260px;display:block;margin:0 auto" role="img" aria-label="Onay oranı %${Math.round(v)}">
    <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#E9EDF3" stroke-width="16" stroke-linecap="round"/>
    <path d="M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round"/>
    <text x="100" y="92" text-anchor="middle" font-size="34" font-weight="700" fill="#14213D" font-family="Barlow Condensed, sans-serif">%${Math.round(v)}</text>
    <text x="100" y="110" text-anchor="middle" font-size="10" fill="#4A5672">onay oranı</text></svg>`;
}

export function renderPresidency(view, ctx) {
  const s = ctx.state, me = playerParty(s);
  const p = ensurePresidency(s);
  const tgt = approvalTarget(s);
  const seats = s.government.reduce((a, id) => a + (s.parliament.seats[id] || 0), 0);
  const termDays = daysBetween(s.date, s.nextElection);
  view.insertAdjacentHTML('beforeend', `<section class="card makam">
    <div class="makam-head"><div class="seal">☾★</div><div><div class="eyebrow" style="color:var(--hi)">Türkiye Cumhuriyeti</div><h2 style="color:#fff;margin:0">Cumhurbaşkanlığı</h2><div class="small" style="opacity:.8">${fmtDate(p.since || s.date)} tarihinden beri · seçime ${Math.ceil(termDays / 7)} hafta</div></div>
      <div class="portrait" style="margin-left:auto">${avatarSvg(s.player.character, { size: 64, bg: mixColor('#FFFFFF', me.color, 0.25) })}</div></div>
    ${gauge(p.approval)}
    <p class="small muted" style="text-align:center;margin:0">Eğilim: ${tgt > p.approval + 1 ? '▲ yükseliyor' : tgt < p.approval - 1 ? '▼ düşüyor' : '● sabit'} · Onay; ekonomi, dış ilişkiler, partinin anketi ve kabineye bağlıdır.</p>
    ${p.history.length > 1 ? pollTrend([{ id: 'ap', color: me.color, bold: true, values: p.history.map(h => h.approval / 100) }], p.history.map(h => h.date), { height: 120 }) : ''}
  </section>`);
  // Hızlı kararlar
  const acts = ['cbEconomy', 'cbLaw', 'cbWage', 'cbSummit', 'cbAddress'].map(actionById);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kararlar <small>eylem puanı kullanır · kalan ${s.player.ap}</small></h2><div class="grid2">${acts.map(a => `<button class="select-card" data-cb="${a.id}" style="padding:10px;flex-direction:column;gap:2px"><span style="font-size:24px">${a.icon}</span><b class="small">${esc(a.label)}</b><span class="small muted">${a.ap} puan</span></button>`).join('')}</div></section>`);
  // Kabine
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kabine</h2><div class="list">${CABINET_POSTS.map(post => { const m = p.cabinet[post.id]; return `<div class="li"><span style="font-size:22px;width:28px;text-align:center">${post.icon}</span>
    <div class="grow"><div class="t small">${esc(m.name)} <span class="muted">· ${esc(m.profile)}</span></div><div class="small muted">${esc(post.label)} · ${esc(post.effect)}</div>
    <div class="row small" style="gap:10px;flex-wrap:nowrap"><span>Yetkinlik</span><div class="kfbar" style="flex:1"><div style="width:${m.comp * 100}%;background:var(--good)"></div></div><span>Sadakat</span><div class="kfbar" style="flex:1"><div style="width:${m.loyalty * 100}%;background:var(--ink-2)"></div></div></div></div>
    <button class="btn small-btn" data-post="${post.id}">Değiştir</button></div>`; }).join('')}</div></section>`);
  // Ekonomi paneli
  const e = s.economy;
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Ekonomi yönetimi <small>para politikası: ${{ siki: 'sıkı', dengeli: 'dengeli', gevsek: 'gevşek' }[p.econStance]}</small></h2><div class="grid3">
    <div class="stat"><div class="v">%${e.inflation.toFixed(1).replace('.', ',')}</div><div class="l">Enflasyon</div></div>
    <div class="stat"><div class="v">%${e.policyRate.toFixed(1).replace('.', ',')}</div><div class="l">Politika faizi</div></div>
    <div class="stat"><div class="v">%${e.growth.toFixed(1).replace('.', ',')}</div><div class="l">Büyüme</div></div>
    <div class="stat"><div class="v">%${e.unemployment.toFixed(1).replace('.', ',')}</div><div class="l">İşsizlik</div></div>
    <div class="stat"><div class="v">${e.usdTry.toFixed(1).replace('.', ',')}</div><div class="l">Dolar/TL</div></div>
    <div class="stat"><div class="v">${p.wageYear === s.date.slice(0, 4) ? '✓' : '—'}</div><div class="l">Asgari ücret</div></div></div></section>`);
  view.insertAdjacentHTML('beforeend', foreignCard(s));
  // Meclis
  const order = Object.entries(s.parliament.seats).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, color: s.parties[id].color, k: s.parties[id].ideology.din + s.parties[id].ideology.milli + s.parties[id].ideology.eko })).sort((a, b) => a.k - b.k);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Meclis <small>ittifakının sandalyesi: ${seats}</small></h2>${hemicycle(order)}
    <p class="small" style="margin:0">${seats >= 360 ? '✅ Anayasa değişikliği için 360 çoğunluğun var.' : seats >= 301 ? '✅ Kanunları geçirecek salt çoğunluğun var.' : '⚠️ Meclis\'te çoğunluğun yok; kanun teklifleri zor geçer.'}</p></section>`);
  if (p.laws.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kanunlar ve kararlar</h2><div class="list">${p.laws.slice(0, 8).map(l => `<div class="li small"><span class="pill ${l.passed ? 'good' : 'bad'}">${l.passed ? 'Kabul' : 'Ret'}</span><div class="grow">${esc(policyById(l.id).title)}</div><span class="muted">${fmtDate(l.date)}</span></div>`).join('')}</div></section>`);

  view.querySelectorAll('[data-cb]').forEach(b => b.onclick = () => openAction(ctx, actionById(b.dataset.cb), {}));
  view.querySelectorAll('[data-post]').forEach(b => b.onclick = () => {
    const post = CABINET_POSTS.find(x => x.id === b.dataset.post);
    const cands = ministerCandidates(s, post.id);
    const sh = sheet(`<div class="eyebrow">${post.icon} ${esc(post.label)}</div><h2>Bakan ata</h2>
      <div class="list">${cands.map(c => `<div class="li"><div class="grow"><div class="t">${esc(c.name)} <span class="small muted">· ${esc(c.profile)}</span></div>
        <div class="small muted">Yetkinlik ${Math.round(c.comp * 100)} · sadakat ${Math.round(c.loyalty * 100)} · kamuoyu ${Math.round(c.pop * 100)}</div></div><button class="btn small-btn primary" data-app="${c.id}">Ata</button></div>`).join('')}</div>
      <p class="small muted" style="margin:0">Bakan adayları kurgusaldır. Her kabine değişikliğinde yeni adaylar gelir.</p>`);
    sh.root.querySelectorAll('[data-app]').forEach(x => x.onclick = () => { appoint(s, cands.find(c => c.id === x.dataset.app)); sfx('gavel'); saveGame(s, 'oto'); sh.close(); toast('Atama yapıldı'); ctx.render(); });
  });
}
