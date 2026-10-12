// Liderler tartışması ekranı.
import { esc, el } from '../dom.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { DEBATE_QUESTIONS, DEBATE_MODERATOR } from '../../data/debate.js';
import { debateAnswer, finishDebate, winShares } from '../../engine/debate.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { storeProjection } from '../../engine/polls.js';
import { playerParty } from '../../engine/state.js';
import { randomCharacter } from '../../data/character.js';
import { sfx, duckMusic } from '../sound.js';

const SECONDS = 30;
function seeded(seed) { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function showDebate(ctx, d) {
  const s = ctx.state, me = playerParty(s);
  const mod = randomCharacter(seeded(d.seed));
  const riv = d.rivals.map(id => s.parties[id]);
  let timer = null;
  const o = el(`<div class="tv debate" role="dialog" aria-modal="true" aria-label="Liderler tartışması">
    <div class="tv-screen db-screen">
      <div class="db-bg"></div>
      <div class="tv-top"><span class="tv-bug">ORTAK YAYIN</span><span class="tv-live">● CANLI</span><span class="tv-viewers">🗳️ Seçim 2028</span></div>
      <div class="db-title">LİDERLER TARTIŞMASI</div>
      <div class="db-mod">${avatarSvg(mod, { size: 60, bg: 'transparent', mood: 'serious' })}<span>${esc(DEBATE_MODERATOR)} · moderatör</span></div>
      <div class="db-podiums">
        ${riv[0] ? podium(riv[0]) : ''}
        <div class="db-pod me" style="--c:${me.color}"><div class="db-face" id="db-me">${avatarSvg(s.player.character, { size: 80, bg: 'transparent' })}</div><div class="db-desk"><b>${esc(me.short)}</b><span>${esc(s.player.name)}</span></div></div>
        ${riv[1] ? podium(riv[1]) : ''}
      </div>
      <div class="tv-lower"><span class="tv-lower-tag">TARTIŞMA</span><span id="db-lower">Tüm partilerin ortak yayını · kurgusal senaryo</span></div>
      <div class="tv-crawl"><span>Liderler canlı yayında karşı karşıya   •   Her lidere eşit süre   •   Tartışmanın kazananı anketlerle belirlenecek</span></div>
    </div>
    <div class="tv-panel">
      <div class="tv-meter"><b class="small">Tartışmayı kim kazanıyor? (anlık izleyici anketi)</b><div id="db-win"></div></div>
      <div id="db-body"></div>
    </div></div>`);
  function podium(p) {
    return `<div class="db-pod" style="--c:${p.color}"><div class="db-face badgeface" style="background:${p.color}">${esc(p.short)}</div><div class="db-desk"><b>${esc(p.short)}</b><span>${esc(p.leader.name)}</span></div></div>`;
  }
  document.body.appendChild(o);
  const $ = q => o.querySelector(q);
  const body = $('#db-body');
  const drawWin = () => {
    const w = winShares(d);
    const rows = [['me', me.short, me.color], ...riv.map(p => [p.id, p.short, p.color])];
    $('#db-win').innerHTML = rows.map(([id, n, c]) => `<div class="tv-fac"><span>${esc(n)}</span><div class="tv-fbar"><div style="width:${(100 * w[id]).toFixed(0)}%;background:${c}"></div></div><b class="num">%${Math.round(100 * w[id])}</b><em></em></div>`).join('');
  };
  drawWin();

  const ask = () => {
    const q = DEBATE_QUESTIONS[d.step];
    $('#db-lower').textContent = `${DEBATE_MODERATOR}: ${q.text}`;
    body.innerHTML = `<div class="tv-qnum">Soru ${d.step + 1}/${DEBATE_QUESTIONS.length}</div><p class="tv-q">“${esc(q.text)}”</p>
      <div class="tv-timer"><div id="db-t"></div></div>
      <div class="tv-answers">${q.answers.map((a, i) => `<button class="tv-ans" data-i="${i}"><span class="tv-ans-k">${'ABC'[i]}</span>${esc(a.label)}${a.tone === 'saldiri' ? ' <span class="pill bad" style="margin-left:4px">riskli</span>' : ''}</button>`).join('')}</div>`;
    const t0 = Date.now();
    timer = setInterval(() => {
      const k = 1 - (Date.now() - t0) / (SECONDS * 1000);
      const bar = $('#db-t'); if (bar) { bar.style.width = Math.max(0, k * 100) + '%'; bar.classList.toggle('low', k < 0.3); }
      if (k <= 0) { clearInterval(timer); answer(1, true); }
    }, 200);
    body.querySelectorAll('.tv-ans').forEach(b => b.onclick = () => answer(+b.dataset.i));
  };

  const answer = (idx, timedOut = false) => {
    clearInterval(timer);
    const r = withRng(s, rng => debateAnswer(s, d, idx, rng));
    $('#db-me').innerHTML = avatarSvg(s.player.character, { size: 80, bg: 'transparent', mood: r.mood });
    sfx(r.mood === 'smile' ? 'applause' : r.mood === 'tense' ? 'boo' : 'murmur');
    drawWin();
    const last = d.step >= DEBATE_QUESTIONS.length;
    body.innerHTML = `<div class="tv-react ${r.score > 1.2 ? 'up' : r.score < 0.5 ? 'down' : ''}"><b>${esc(r.reaction)}</b>
      ${timedOut ? '<span>⏱️ Süre doldu; cevabın yarım kaldı.</span>' : ''}${r.attack ? `<span>${r.score > 1.2 ? 'Saldırın tuttu; rakip savunmaya geçti.' : 'Saldırın ters tepti; seyirci bunu hoş karşılamadı.'}</span>` : ''}</div>
      <div class="db-rivals">${r.rivals.map(x => `<div class="db-rv" style="border-color:${x.color}"><b>${esc(x.short)}</b> ${esc(x.summary)}</div>`).join('')}<div class="small muted">Rakip cevapları özetlenmiştir (kurgusal senaryo).</div></div>
      <button class="btn-end tv-next" id="db-next">${last ? 'Tartışmayı bitir' : 'Sonraki soru →'}</button>`;
    $('#db-next').onclick = () => last ? done() : ask();
  };

  const done = () => {
    const res = finishDebate(s, d);
    storeProjection(s); saveGame(s, 'oto');
    sfx(res.won ? 'win' : 'lose');
    body.innerHTML = `<div class="tv-react ${res.won ? 'up' : 'down'}"><b>${res.won ? 'Tartışmayı sen kazandın!' : `Tartışmanın galibi: ${esc(s.parties[res.top]?.short || '')}`}</b>
      <span>İzleyicilerin %${Math.round(100 * res.shares.me)}'i seni daha başarılı buldu. Bu sonuç önümüzdeki günlerin anketlerine yansıyacak.</span></div>
      <button class="btn-end tv-next" id="db-close">Stüdyodan çık</button>`;
    $('#db-close').onclick = () => { o.remove(); duckMusic(false); ctx.render(); };
  };
  sfx('jingle');
  duckMusic(true);
  setTimeout(ask, 900);
}
