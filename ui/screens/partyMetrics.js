// Parti sekmesi: kampanya göstergeleri, seçmen grupları, vaatler, seçim altyapısı ve sandık etkisi.
import { esc, toast } from '../dom.js';
import { playerParty } from '../../engine/state.js';
import { project } from '../../engine/model.js';
import { ensureMetrics, segmentSupport, promiseLoad, econCredibility, infraLevel, infraNextCost, mobilizer, volunteers, withdrawPromise } from '../../engine/metrics.js';
import { PROMISES, PROMISE_CAPACITY, INFRA } from '../../data/campaign2.js';
import { fmtMoney, fmtDate, pct } from '../../engine/util.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { actionById } from '../../engine/actions.js';
import { openAction } from './campaign.js';

const METERS = [
  ['trust', 'Güven', '🤝', 'Seçmenin sana inanması. Oya doğrudan etki eder; vaat yükü, skandal ve rakip saldırıları düşürür.'],
  ['visibility', 'Medya görünürlüğü', '📡', 'Gündemde ne kadar varsın. Tanınırlığı büyütür, medya ve sosyal medya eylemlerinin etkisini artırır; zamanla söner.'],
  ['morale', 'Teşkilat morali', '🚩', 'İl ve ilçe teşkilatının şevki. Seçim günü sandığa taşıma oranını belirler; düşükse teşkilat erir.'],
  ['heat', 'Saldırı riski', '🎯', 'Rakiplerin seni hedef alma olasılığı. Sert dil, negatif reklam ve kirli operasyonlar artırır; zamanla söner.'],
];
const meterCol = (k, v) => k === 'heat' ? (v > 60 ? 'var(--bad)' : v > 30 ? 'var(--warn)' : 'var(--good)') : (v < 35 ? 'var(--bad)' : v < 55 ? 'var(--warn)' : 'var(--good)');

export function metricsMini(s) {
  ensureMetrics(s);
  const p = playerParty(s);
  return `<div class="mini-meters">${METERS.map(([k, l, ic]) => { const v = k === 'heat' ? s.player.heat : p[k]; return `<div class="mm" title="${l}"><span>${ic}</span><div class="mmbar"><i style="width:${Math.round(v)}%;background:${meterCol(k, v)}"></i></div><b>${Math.round(v)}</b></div>`; }).join('')}</div>`;
}

export function renderPartyMetrics(view, ctx) {
  const s = ctx.state, p = playerParty(s);
  ensureMetrics(s);
  const pr = project(s);
  const prMob = project(s, { mobilize: mobilizer(s) });
  const poll = pr.national[p.id] || 0, mob = prMob.national[p.id] || 0;
  // Göstergeler
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kampanya göstergeleri <small>oyu etkileyen gizli değişkenler</small></h2>
    <div class="meters">${METERS.map(([k, l, ic, d]) => { const v = k === 'heat' ? s.player.heat : p[k]; return `<div class="meter"><div class="row" style="justify-content:space-between"><b>${ic} ${l}</b><b class="num">${Math.round(v)}</b></div>
      <div class="mbar"><i style="width:${Math.round(v)}%;background:${meterCol(k, v)}"></i></div><div class="small muted">${d}</div></div>`; }).join('')}</div>
    ${s.player.dirty.length ? `<p class="small" style="color:var(--bad);margin:8px 0 0">⚠️ ${s.player.dirty.length} gizli operasyon sürüyor: her hafta ortaya çıkma riski var.</p>` : ''}</section>`);
  // Seçmen grupları
  const segs = segmentSupport(s, pr);
  const mx = Math.max(0.01, ...segs.map(x => x.share));
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Seçmen grupları <small>partinin gruplardaki tahmini oyu</small></h2>
    <div class="list">${segs.map(x => `<div class="segrow"><span>${x.icon}</span><span class="sl">${esc(x.label)}</span><div class="mbar"><i style="width:${Math.round(100 * x.share / mx)}%;background:${p.color}"></i></div><b class="num">%${(100 * x.share).toFixed(1).replace('.', ',')}</b></div>`).join('')}</div>
    <p class="small muted" style="margin:6px 0 0">Gruplar seçmen kümelerinin ağırlıklı birleşimidir (oyun varsayımı). Buluşmalar, vaatler ve medya biçimleri belirli grupları hedefler.</p></section>`);
  // Vaatler
  const load = promiseLoad(s);
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Vaatler <small>ekonomik inandırıcılık ${econCredibility(s)}/100</small></h2>
    <div class="row" style="justify-content:space-between"><span class="small">Toplam yıllık yük</span><b class="num">₺${load} / ₺${PROMISE_CAPACITY} milyar</b></div>
    <div class="mbar"><i style="width:${Math.min(100, Math.round(100 * load / PROMISE_CAPACITY))}%;background:${load > PROMISE_CAPACITY ? 'var(--bad)' : load > PROMISE_CAPACITY * 0.8 ? 'var(--warn)' : 'var(--good)'}"></i></div>
    ${s.player.promises.length ? `<div class="list" style="margin-top:8px">${s.player.promises.map(x => { const d = PROMISES.find(y => y.id === x.id); return `<div class="li"><span style="font-size:20px">${d.icon}</span><div class="grow"><div class="t small">${esc(d.label)}</div><div class="small muted">₺${d.cost} milyar/yıl · ${fmtDate(x.date)}${x.fulfilled ? ' · ✅ yerine getirildi' : ''}</div></div>${x.fulfilled ? '' : `<button class="btn small-btn" data-withdraw="${x.id}">Geri çek</button>`}</div>`; }).join('')}</div>` : '<p class="small muted" style="margin:8px 0 0">Henüz vaat açıklamadın. Kampanya → Vaatler.</p>'}
    <p class="small muted" style="margin:6px 0 0">Vaatler hedef gruplarda kalıcı destek getirir. Toplam yük sınırı aşarsa güven ve inandırıcılık düşer. Geri çekmek güvene zarar verir. Tutarlar oyun varsayımıdır.</p></section>`);
  // Seçim altyapısı
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Seçim altyapısı <small>sandığa taşıma</small></h2>
    <div class="mob"><div><span class="small muted">Ankette</span><b>%${(100 * poll).toFixed(1).replace('.', ',')}</b></div><span class="arrow">→</span><div><span class="small muted">Sandıkta (tahmini)</span><b style="color:${mob >= poll ? 'var(--good)' : 'var(--bad)'}">%${(100 * mob).toFixed(1).replace('.', ',')}</b></div></div>
    <p class="small muted" style="margin:4px 0 8px">Teşkilat gücü, moral ve altyapı seçim günü seçmenini sandığa taşır. Rakiplerin teşkilatı da hesaba katılır.</p>
    <div class="list">${INFRA.map(d => { const l = infraLevel(s, d.id), c = infraNextCost(s, d.id); return `<div class="li"><span style="font-size:20px">${d.icon}</span><div class="grow"><div class="t small">${esc(d.label)}</div><div class="lvl">${[1, 2, 3, 4].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</div><div class="small muted">${esc(d.desc)}${d.id === 'gonullu' && l ? ` · ${volunteers(s).toLocaleString('tr-TR')} gönüllü` : ''}</div></div>${c ? `<button class="btn small-btn" data-infra="${d.id}">${fmtMoney(c)}</button>` : '<span class="pill good">Tamam</span>'}</div>`; }).join('')}</div>
    <p class="small muted" style="margin:6px 0 0">Sandık güvenliği: %${Math.round(s.ballotSecurity * 100)} · altyapının haftalık bakım gideri bütçeye yansır.</p></section>`);

  view.querySelectorAll('[data-withdraw]').forEach(b => b.onclick = () => {
    if (!confirm('Bu vaadi geri çekmek güvenine zarar verir (−5). Emin misin?')) return;
    withRng(s, rng => withdrawPromise(s, b.dataset.withdraw, rng));
    saveGame(s, 'oto'); toast('Vaat geri çekildi'); ctx.render();
  });
  view.querySelectorAll('[data-infra]').forEach(b => b.onclick = () => openAction(ctx, actionById('infra'), { infra: b.dataset.infra }));
}
