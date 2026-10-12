// Canlı yayın ekranı: stüdyo, sunucu, sorular, anlık delege nabzı / izleyici tepkisi.
import { esc, el } from '../dom.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { questionById, applyAnswer } from '../../engine/broadcast.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { storeProjection } from '../../engine/polls.js';
import { playerParty } from '../../engine/state.js';
import { randomCharacter } from '../../data/character.js';

function seeded(seed) { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function showBroadcast(ctx, b) {
  const s = ctx.state;
  const me = playerParty(s);
  const pre = b.kind === 'kurultay';
  const hostChar = randomCharacter(seeded(b.seed));
  hostChar.traits = [];
  const myChar = s.player.character;
  const title = pre ? `${me.short} Genel Başkan Adayı` : `${me.short} Genel Başkanı`;
  const startSupport = pre ? s.player.kurultay.support : 0;
  const startFactions = pre ? Object.fromEntries(s.player.kurultay.factions.map(f => [f.id, f.support])) : {};
  let mood = 'serious';
  const o = el(`<div class="tv" role="dialog" aria-modal="true" aria-label="Canlı yayın">
    <div class="tv-screen">
      <div class="tv-top"><span class="tv-bug">${esc(b.channelName)}</span><span class="tv-live">● CANLI</span><span class="tv-prog">${esc(b.program)}</span></div>
      <div class="tv-stage">
        <div class="tv-desk"></div>
        <figure class="tv-guest"><div class="tv-frame" id="tv-host">${avatarSvg(hostChar, { size: 120, bg: '#22345E', mood: 'serious' })}</div><figcaption>${esc(b.host)}<small>Sunucu</small></figcaption></figure>
        <figure class="tv-guest"><div class="tv-frame me" id="tv-me">${avatarSvg(myChar, { size: 120, bg: mixColor('#22345E', me.color, 0.35), mood })}</div><figcaption>${esc(s.player.name)}<small>${esc(title)}</small></figcaption></figure>
      </div>
      <div class="tv-lower"><span class="tv-lower-tag">${pre ? 'KURULTAY YARIŞI' : 'GÜNDEM'}</span><span id="tv-lower-text">${esc(s.player.name)} · ${esc(title)}</span></div>
      <div class="tv-crawl"><span>${esc(s.news.slice(0, 4).map(n => n.text).join('   •   '))}</span></div>
    </div>
    <div class="tv-panel">
      <div class="tv-meter">
        <div class="row" style="justify-content:space-between"><b class="small">${pre ? 'Delege nabzı' : 'İzleyici tepkisi'}</b><span class="tv-meter-v num" id="tv-mv">${pre ? '%' + startSupport.toFixed(1).replace('.', ',') : '—'}</span></div>
        <div class="tv-bar"><div id="tv-bar" style="width:${pre ? startSupport : 50}%"></div>${pre ? '<i style="left:50%"></i>' : ''}</div>
        ${pre ? `<div class="tv-factions" id="tv-fac"></div>` : ''}
      </div>
      <div id="tv-body"></div>
    </div>
  </div>`);
  document.body.appendChild(o);
  const body = o.querySelector('#tv-body');

  const drawFactions = (deltas = {}) => {
    if (!pre) return;
    o.querySelector('#tv-fac').innerHTML = s.player.kurultay.factions.map(f => {
      const d = deltas[f.id];
      return `<div class="tv-fac"><span>${esc(f.label)}</span><div class="tv-fbar"><div style="width:${f.support}%"></div></div><b class="num">${Math.round(f.support)}</b>${d !== undefined && Math.abs(d) >= 0.05 ? `<em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}</em>` : '<em></em>'}</div>`;
    }).join('');
  };
  drawFactions();

  const setMood = m => { mood = m; o.querySelector('#tv-me').innerHTML = avatarSvg(myChar, { size: 120, bg: mixColor('#22345E', me.color, 0.35), mood: m }); };

  const ask = () => {
    const q = questionById(b.questions[b.step]);
    body.innerHTML = `<div class="tv-qnum">Soru ${b.step + 1}/${b.questions.length}${q.hostile ? ' · <span style="color:var(--accent)">zor soru</span>' : ''}</div>
      <p class="tv-q" id="tv-q"></p>
      <div class="tv-answers">${q.answers.map((a, i) => `<button class="tv-ans" data-i="${i}" disabled>${esc(a.label)}</button>`).join('')}</div>`;
    // daktilo efekti
    const full = `“${q.text}”`;
    const qel = body.querySelector('#tv-q');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let i = reduced ? full.length : 0;
    const enable = () => body.querySelectorAll('.tv-ans').forEach(x => x.disabled = false);
    const type = () => { qel.textContent = full.slice(0, i); if (i < full.length) { i += 2; setTimeout(type, 18); } else enable(); };
    type();
    qel.onclick = () => { i = full.length; };
    body.querySelectorAll('.tv-ans').forEach(btn => btn.onclick = () => answer(+btn.dataset.i));
  };

  const answer = idx => {
    const r = withRng(s, rng => applyAnswer(s, b, idx, rng));
    storeProjection(s);
    saveGame(s, 'oto');
    setMood(r.mood);
    if (pre) {
      o.querySelector('#tv-mv').textContent = '%' + r.meter.toFixed(1).replace('.', ',');
      o.querySelector('#tv-bar').style.width = r.meter + '%';
      drawFactions(r.deltas);
    } else {
      o.querySelector('#tv-mv').textContent = r.mood === 'smile' ? 'Olumlu' : r.mood === 'tense' ? 'Olumsuz' : 'Ilımlı';
      o.querySelector('#tv-bar').style.width = r.meter + '%';
    }
    const last = b.step >= b.questions.length;
    body.innerHTML = `<div class="tv-react ${r.change > 0.05 ? 'up' : r.change < -0.05 ? 'down' : ''}">
        <b>${pre ? `${r.change >= 0 ? '+' : ''}${r.change.toFixed(1).replace('.', ',')} puan` : esc(r.reaction)}</b>
        ${pre ? `<span>${esc(r.reaction)}</span>` : ''}${r.lines.map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <button class="btn-end tv-next" id="tv-next">${last ? 'Yayını bitir' : 'Sonraki soru →'}</button>`;
    body.querySelector('#tv-next').onclick = () => last ? summary() : ask();
  };

  const summary = () => {
    if (pre) {
      const k = s.player.kurultay;
      const tot = k.support - startSupport;
      body.innerHTML = `<div class="tv-react ${tot > 0 ? 'up' : 'down'}"><b>Yayın sonu: ${tot >= 0 ? '+' : ''}${tot.toFixed(1).replace('.', ',')} puan</b>
        <span>${k.factions.map(f => `${esc(f.label)} ${f.support - startFactions[f.id] >= 0 ? '+' : ''}${(f.support - startFactions[f.id]).toFixed(1).replace('.', ',')}`).join(' · ')}</span></div>
        <button class="btn-end tv-next" id="tv-close">Stüdyodan çık</button>`;
    } else {
      body.innerHTML = `<div class="tv-react"><b>Yayın tamamlandı</b><span>Etkiler ulusal ivmene ve tanınırlığına işlendi.</span></div><button class="btn-end tv-next" id="tv-close">Stüdyodan çık</button>`;
    }
    body.querySelector('#tv-close').onclick = () => { o.remove(); ctx.render(); };
  };
  ask();
}
