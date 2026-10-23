// Canlı yayın ekranı: jenerik, stüdyo, kamera geçişleri, canlı yorumlar, cevap süresi ve reyting.
import { MEDIA } from '../../data/media.js';
import { esc, el } from '../dom.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { questionById, applyAnswer } from '../../engine/broadcast.js';
import { withRng } from '../../engine/turn.js';
import { saveGame } from '../../engine/save.js';
import { storeProjection } from '../../engine/polls.js';
import { playerParty } from '../../engine/state.js';
import { randomCharacter } from '../../data/character.js';
import { CITIZENS, CITIZEN_LINES } from '../../data/press.js';
import { sfx, duckMusic } from '../sound.js';

const ANSWER_SECONDS = 30;
function seeded(seed) { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function showBroadcast(ctx, b) {
  const s = ctx.state;
  const me = playerParty(s);
  const pre = b.kind === 'kurultay';
  const R = seeded(b.seed);
  const hostChar = randomCharacter(R);
  const myChar = s.player.character;
  const title = pre ? `${me.short} Genel Başkan Adayı` : `${me.short} Genel Başkanı`;
  const startSupport = pre ? s.player.kurultay.support : 0;
  const startFactions = pre ? Object.fromEntries(s.player.kurultay.factions.map(f => [f.id, f.support])) : {};
  let viewers = Math.round((0.4 + 1.6 * me.recognition + R() * 0.6) * 1e6);
  const changes = [];
  let timer = null;
  const guestBg = mixColor('#1B2C55', me.color, 0.35);
  const o = el(`<div class="tv" role="dialog" aria-modal="true" aria-label="Canlı yayın">
    <div class="tv-screen" id="tvs">
      <div class="tv-led" ${MEDIA['bg:tv'] ? `style="background:url(${MEDIA['bg:tv']}) center/cover"` : ''}><div class="tv-sky"></div><svg viewBox="0 0 400 80" preserveAspectRatio="none" class="tv-city"><path d="M0 80 L0 50 L20 50 L20 30 L34 30 L34 44 L52 44 L52 20 L60 12 L68 20 L68 46 L90 46 L90 34 L110 34 L110 56 L130 56 L130 26 L150 26 L150 40 L172 40 L172 14 L178 6 L184 14 L184 44 L210 44 L210 30 L236 30 L236 52 L262 52 L262 22 L284 22 L284 48 L310 48 L310 36 L330 36 L330 54 L352 54 L352 28 L372 28 L372 46 L400 46 L400 80 Z" fill="rgba(255,255,255,.12)"/></svg></div>
      <div class="tv-lights"><i></i><i></i><i></i></div>
      <div class="tv-top"><span class="tv-bug">${esc(b.channelName)}</span><span class="tv-live">● CANLI</span><span class="tv-viewers">👁 <b id="tv-vw">${(viewers / 1e6).toFixed(2).replace('.', ',')} Mn</b></span></div>
      <div class="tv-stage shot-wide" id="tv-stage">
        <div class="tv-desk"><span>${esc(b.program)}</span></div>
        <figure class="tv-guest host"><div class="tv-frame" id="tv-host">${avatarSvg(hostChar, { size: 120, bg: '#22345E', mood: 'serious' })}</div><figcaption>${esc(b.host)}<small>Sunucu</small></figcaption></figure>
        <figure class="tv-guest"><div class="tv-frame me" id="tv-me">${avatarSvg(myChar, { size: 120, bg: guestBg, mood: 'serious' })}</div><figcaption>${esc(s.player.name)}<small>${esc(title)}</small></figcaption></figure>
      </div>
      <div class="tv-emojis" id="tv-emo"></div>
      <div class="tv-lower" id="tv-lower"><span class="tv-lower-tag">${pre ? 'KURULTAY YARIŞI' : 'GÜNDEM'}</span><span id="tv-lower-text">${esc(s.player.name)} · ${esc(title)}</span></div>
      <div class="tv-crawl"><span>${esc(s.news.slice(0, 4).map(n => n.text).join('   •   '))}</span></div>
      <div class="tv-intro" id="tv-intro"><div class="tv-intro-stripes"></div><div class="tv-intro-t"><small>${esc(b.channelName)} sunar</small><b>${esc(b.program)}</b><span>Konuk: ${esc(s.player.name)}</span></div></div>
    </div>
    <div class="tv-panel">
      <div class="tv-meter">
        <div class="row" style="justify-content:space-between"><b class="small">${pre ? 'Delege nabzı' : 'İzleyici tepkisi'}</b><span class="tv-meter-v num" id="tv-mv">${pre ? '%' + startSupport.toFixed(1).replace('.', ',') : 'Bekleniyor'}</span></div>
        <div class="tv-bar"><div id="tv-bar" style="width:${pre ? startSupport : 50}%"></div>${pre ? '<i style="left:50%"></i>' : '<i style="left:50%"></i>'}</div>
        ${pre ? `<div class="tv-factions" id="tv-fac"></div>` : ''}
      </div>
      <div id="tv-body"></div>
      <div class="tv-chat"><div class="tv-chat-h">💬 Canlı yorumlar</div><div id="tv-chat"></div></div>
    </div>
  </div>`);
  document.body.appendChild(o);
  const $ = sel => o.querySelector(sel);
  const body = $('#tv-body');
  const stage = $('#tv-stage');
  const shot = k => { stage.className = `tv-stage shot-${k}`; };

  // İzleyici sayacı ve yorum akışı
  const vwTick = setInterval(() => { viewers = Math.round(viewers * (1 + (Math.random() - 0.45) * 0.01)); $('#tv-vw').textContent = (viewers / 1e6).toFixed(2).replace('.', ',') + ' Mn'; }, 900);
  const chat = (tone, n = 2) => {
    const box = $('#tv-chat');
    for (let i = 0; i < n; i++) {
      const c = CITIZENS[Math.floor(Math.random() * CITIZENS.length)];
      const t = tone === 'mix' ? ['pos', 'neg', 'neu'][Math.floor(Math.random() * 3)] : tone;
      const line = CITIZEN_LINES[t][Math.floor(Math.random() * CITIZEN_LINES[t].length)];
      box.insertAdjacentHTML('afterbegin', `<div class="tv-msg ${t}"><b>${esc(c.name)}</b> ${esc(line)}</div>`);
    }
    while (box.children.length > 5) box.lastElementChild.remove();
  };
  chat('neu', 1);
  const emojis = (list, n = 12) => {
    if (reducedMotion()) return;
    const box = $('#tv-emo');
    for (let i = 0; i < n; i++) {
      const e = document.createElement('i');
      e.textContent = list[i % list.length];
      e.style.left = (8 + Math.random() * 84) + '%';
      e.style.animationDelay = (Math.random() * 700 | 0) + 'ms';
      box.appendChild(e);
      setTimeout(() => e.remove(), 2600);
    }
  };

  const drawFactions = (deltas = {}) => {
    if (!pre) return;
    $('#tv-fac').innerHTML = s.player.kurultay.factions.map(f => {
      const d = deltas[f.id];
      return `<div class="tv-fac"><span>${esc(f.label)}</span><div class="tv-fbar"><div style="width:${f.support}%"></div></div><b class="num">${Math.round(f.support)}</b>${d !== undefined && Math.abs(d) >= 0.05 ? `<em class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}</em>` : '<em></em>'}</div>`;
    }).join('');
  };
  drawFactions();
  const setMood = m => { $('#tv-me').innerHTML = avatarSvg(myChar, { size: 120, bg: guestBg, mood: m }); };

  const ask = () => {
    const q = questionById(b.questions[b.step]);
    shot('host');
    $('#tv-lower-text').textContent = `${b.host}: ${q.text}`;
    body.innerHTML = `<div class="tv-qnum">Soru ${b.step + 1}/${b.questions.length}${q.hostile ? ' · <span style="color:var(--accent)">zor soru</span>' : ''}</div>
      <p class="tv-q" id="tv-q"></p>
      <div class="tv-timer"><div id="tv-t"></div></div>
      <div class="tv-answers">${q.answers.map((a, i) => `<button class="tv-ans" data-i="${i}" disabled><span class="tv-ans-k">${'ABC'[i]}</span>${esc(a.label)}</button>`).join('')}</div>`;
    const full = `“${q.text}”`;
    const qel = $('#tv-q');
    let i = reducedMotion() ? full.length : 0;
    const enable = () => {
      body.querySelectorAll('.tv-ans').forEach(x => x.disabled = false);
      shot('guest');
      // cevap süresi
      const t0 = Date.now();
      const bar = $('#tv-t');
      timer = setInterval(() => {
        const k = 1 - (Date.now() - t0) / (ANSWER_SECONDS * 1000);
        if (bar) { bar.style.width = Math.max(0, k * 100) + '%'; bar.classList.toggle('low', k < 0.3); }
        if (k < 0.3 && k > 0 && Math.round((Date.now() - t0) / 200) % 5 === 0) sfx('tick');
        if (k <= 0) { clearInterval(timer); timeout(q); }
      }, 200);
    };
    const type = () => { qel.textContent = full.slice(0, i); if (i < full.length) { i += 2; setTimeout(type, 18); } else enable(); };
    type();
    qel.onclick = () => { i = full.length; };
    body.querySelectorAll('.tv-ans').forEach(btn => btn.onclick = () => answer(+btn.dataset.i));
  };

  const timeout = q => {
    // Süre doldu: kaçamak/geçiştirici cevap sayılır
    let idx = q.answers.findIndex(a => a.tone === 'kacamak' || a.tags?.kacamak);
    if (idx < 0) idx = q.answers.length - 1;
    answer(idx, true);
  };

  const answer = (idx, timedOut = false) => {
    clearInterval(timer);
    const r = withRng(s, rng => applyAnswer(s, b, idx, rng));
    if (timedOut) r.lines.unshift('⏱️ Süre doldu; cevap vermekte zorlandın, geçiştirdiğin düşünüldü.');
    changes.push(r.change);
    storeProjection(s);
    saveGame(s, 'oto');
    setMood(r.mood);
    shot(r.mood === 'smile' ? 'wide' : 'guest');
    if (r.mood === 'smile') { emojis(['👏', '👍', '🔥', '❤️']); chat('pos', 2); viewers = Math.round(viewers * 1.04); sfx('applause'); }
    else if (r.mood === 'tense') { emojis(['😮', '👎', '🤔'], 8); chat('neg', 2); sfx('boo'); }
    else { chat('mix', 2); sfx('murmur'); }
    if (pre) {
      $('#tv-mv').textContent = '%' + r.meter.toFixed(1).replace('.', ',');
      $('#tv-bar').style.width = r.meter + '%';
      drawFactions(r.deltas);
    } else {
      $('#tv-mv').textContent = r.mood === 'smile' ? 'Olumlu' : r.mood === 'tense' ? 'Olumsuz' : 'Ilımlı';
      $('#tv-bar').style.width = r.meter + '%';
    }
    $('#tv-lower-text').textContent = `${s.player.name}: “${questionById(b.questions[b.step - 1]).answers[idx].label}”`;
    const last = b.step >= b.questions.length;
    body.innerHTML = `<div class="tv-react ${r.change > 0.05 ? 'up' : r.change < -0.05 ? 'down' : ''}">
        <b>${pre ? `${r.change >= 0 ? '+' : ''}${r.change.toFixed(1).replace('.', ',')} puan` : esc(r.reaction)}</b>
        ${pre ? `<span>${esc(r.reaction)}</span>` : ''}${r.lines.map(l => `<span>${esc(l)}</span>`).join('')}</div>
      <button class="btn-end tv-next" id="tv-next">${last ? 'Yayını bitir' : 'Sonraki soru →'}</button>`;
    $('#tv-next').onclick = () => last ? summary() : ask();
  };

  const summary = () => {
    shot('wide');
    sfx('ding');
    $('#tv-lower-text').textContent = `${b.program} · yayın sonu`;
    const best = changes.indexOf(Math.max(...changes));
    const share = Math.max(2, Math.min(28, 6 + 18 * me.recognition + changes.reduce((x, y) => x + y, 0) * (pre ? 1.5 : 0.01) + Math.random() * 3));
    const rating = `<div class="tv-rating"><div><small>Reyting payı</small><b>%${share.toFixed(1).replace('.', ',')}</b></div><div><small>İzleyici</small><b>${(viewers / 1e6).toFixed(2).replace('.', ',')} Mn</b></div><div><small>En çok konuşulan</small><b>Soru ${best + 1}</b></div></div>`;
    if (pre) {
      const k = s.player.kurultay;
      const tot = k.support - startSupport;
      body.innerHTML = `${rating}<div class="tv-react ${tot > 0 ? 'up' : 'down'}"><b>Yayın sonu: ${tot >= 0 ? '+' : ''}${tot.toFixed(1).replace('.', ',')} puan</b>
        <span>${k.factions.map(f => `${esc(f.label)} ${f.support - startFactions[f.id] >= 0 ? '+' : ''}${(f.support - startFactions[f.id]).toFixed(1).replace('.', ',')}`).join(' · ')}</span></div>
        <button class="btn-end tv-next" id="tv-close">Stüdyodan çık</button>`;
    } else {
      body.innerHTML = `${rating}<div class="tv-react"><b>Yayın tamamlandı</b><span>Etkiler ulusal ivmene ve tanınırlığına işlendi.</span></div><button class="btn-end tv-next" id="tv-close">Stüdyodan çık</button>`;
    }
    $('#tv-close').onclick = () => { clearInterval(vwTick); clearInterval(timer); o.remove(); duckMusic(false); ctx.render(); };
  };

  // Jenerik, sonra ilk soru
  const intro = $('#tv-intro');
  sfx('jingle');
  duckMusic(true);
  if (reducedMotion()) { intro.remove(); ask(); }
  else setTimeout(() => { intro.classList.add('out'); setTimeout(() => { intro.remove(); ask(); }, 450); }, 1500);
}
