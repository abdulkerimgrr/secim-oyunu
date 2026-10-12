// Uygulama iskeleti: üst bar, son dakika şeridi, sekmeler, tur bitirme, kayıt.
import { esc, el, toast, sheet } from './dom.js';
import { fmtDate, fmtMoney, fmtMoneyShort, pct, daysBetween } from '../engine/util.js';
import { endTurn, withRng } from '../engine/turn.js';
import { runAction } from '../engine/actions.js';
import { saveGame, loadGame } from '../engine/save.js';
import { storeProjection } from '../engine/polls.js';
import { playerParty } from '../engine/state.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { renderHome } from './screens/home.js';
import { renderParty } from './screens/party.js';
import { renderAgenda } from './screens/agenda.js';
import { renderCampaign } from './screens/campaign.js';
import { renderParliament } from './screens/parliament.js';
import { renderSettings } from './screens/settings.js';
import { renderPresidency } from './screens/presidency.js';
import { renderNewGame } from './screens/newgame.js';
import { showResult, showGameOver } from './screens/results.js';
import { showBroadcast } from './screens/broadcast.js';
import { showDebate } from './screens/debate.js';
import { mountBackgroundMap } from './bgmap.js';
import { avatarSvg } from './avatar.js';
import { mixColor } from './map.js';
import { sfx, soundToggleHtml, bindSoundToggle, duckMusic } from './sound.js';
import { initMusic, playTrack } from './music.js';

const ICONS = {
  harita: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  parti: '<path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  gundem: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 4h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  kampanya: '<path d="M3 10v4l11 5V5L3 10Zm11 0h3a3 3 0 0 1 0 6h-3M6 14.5 7.5 20h3l-1.2-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  meclis: '<path d="M3 20h18M5 20v-7m4 7v-7m6 7v-7m4 7v-7M3 11h18L12 4 3 11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  makam: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  ayarlar: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};
const TABS = [
  ['harita', 'Harita', renderHome], ['parti', 'Parti', renderParty], ['gundem', 'Gündem', renderAgenda],
  ['kampanya', 'Kampanya', renderCampaign], ['meclis', 'Meclis', renderParliament], ['ayarlar', 'Ayarlar', renderSettings],
];

export const ctx = {
  state: null,
  tab: 'harita',
  prefill: null,
  render() { render(); },
  go(tab, prefill = null) { ctx.tab = tab; ctx.prefill = prefill; render(); window.scrollTo(0, 0); },
  start(state) {
    ctx.state = state;
    storeProjection(state);
    ctx.tab = 'harita';
    saveGame(state, 'oto');
    render();
  },
  quit() { ctx.state = null; render(); },
  act(action, prm) {
    const s = ctx.state;
    const meId = s.player.partyId;
    const bNat = s.lastProjection?.national?.[meId] ?? 0;
    const bProv = prm.province ? s.lastProjection?.provinces?.[prm.province]?.shares?.[meId] ?? 0 : null;
    const res = withRng(s, rng => runAction(s, action, prm, rng));
    if (res.error) { toast(res.error); return null; }
    storeProjection(s);
    res.impact = { nat: (s.lastProjection.national[meId] ?? 0) - bNat, prov: bProv === null ? null : (s.lastProjection.provinces[prm.province]?.shares?.[meId] ?? 0) - bProv, provName: prm.province ? PROVINCES.find(p => p.plate === +prm.province)?.name : '' };
    saveGame(s, 'oto');
    render();
    if (res.interactive === 'broadcast') showBroadcast(ctx, res.broadcast);
    if (res.interactive === 'debate') showDebate(ctx, res.debate);
    return res;
  },
  endTurn() {
    const s = ctx.state;
    if (s.events.active.length && !ctx.skipEventWarn) {
      const sh = sheet(`<h2>Bekleyen gündem</h2><p>Yanıt bekleyen ${s.events.active.length} olay var. Yanıtlamazsan fırsat kaçar ve olay gündemden düşer.</p>
        <div class="grid2"><button class="btn" data-a="go">Gündeme git</button><button class="btn primary" data-a="end">Yine de bitir</button></div>`);
      sh.root.querySelector('[data-a=go]').onclick = () => { sh.close(); ctx.go('gundem'); };
      sh.root.querySelector('[data-a=end]').onclick = () => { sh.close(); s.events.active = []; doEnd(); };
      return;
    }
    doEnd();
  },
  // test: true → para ve seçime katılım şartları otomatik sağlanır (seçim gecesini denemek için)
  fastForward(weeks, { test = false } = {}) {
    const s = ctx.state;
    if (test) s.flags.testMode = true;
    for (let i = 0; i < weeks && !s.gameOver; i++) {
      s.events.active = [];
      if (test) testAssist(s);
      const out = endTurn(s);
      if (out.results.length) { afterTurn(out); return; }
    }
    afterTurn({ results: [] });
  },
};

function testAssist(s) {
  const me = playerParty(s);
  const pi = s.economy.priceIndex || 1;
  if (me.money < 3_000_000 * pi) me.money = 3_000_000 * pi;
  if (s.player.mode === 'found') {
    for (const pv of PROVINCES.slice(0, 45)) if (!me.orgs[pv.plate]) me.orgs[pv.plate] = 0.15;
    if (!me.congressDate) me.congressDate = s.date;
  }
  if (s.player.mode === 'join' && !s.player.isLeader) {
    const k = s.player.kurultay;
    for (const f of k.factions) f.support = Math.max(f.support, 62);
    k.signatures = Math.max(k.signatures, 30);
    k.support = k.factions.reduce((a, f) => a + f.weight * f.support, 0);
  }
}

function doEnd() {
  const out = endTurn(ctx.state);
  afterTurn(out);
}

function afterTurn(out) {
  const s = ctx.state;
  saveGame(s, 'oto');
  render();
  const queue = [...out.results];
  const next = () => {
    const r = queue.shift();
    if (r) showResult(s, r, next);
    else if (s.gameOver) showGameOver(s);
    else {
      const me = playerParty(s);
      const poll = s.polls[s.polls.length - 1].shares[me.id] || 0;
      sfx(s.events.active.length ? 'sting' : 'ping');
      toast(s.player.mode === 'join' && !s.player.isLeader
        ? `Yeni tur · delege desteği %${s.player.kurultay.support.toFixed(1).replace('.', ',')}`
        : `Yeni tur · anket ${pct(poll)}${s.events.active.length ? ' · yeni gündem!' : ''}`);
    }
  };
  next();
}

function topbar(s) {
  const me = playerParty(s);
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  const money = pre ? s.player.personalMoney : me.money;
  const pips = Array.from({ length: s.player.apMax > 5 ? s.player.apMax : (s.phase === 'campaign' ? 3 : s.player.apMax) }, (_, i) => `<i class="${i < s.player.ap ? 'on' : ''}"></i>`).join('');
  const days = daysBetween(s.date, s.nextElection);
  const av = s.player.character ? `<div class="topav">${avatarSvg(s.player.character, { size: 36, bg: mixColor('#FFFFFF', me.color, 0.3) })}</div>` : '';
  return `<header class="topbar">${av}
    <div class="tb-main"><div class="date num">${fmtDate(s.date)}</div><div class="sub">${s.phase === 'campaign' ? `Seçime ${days} gün` : `Seçime ${Math.ceil(days / 7)} hf`} · ${esc(fmtMoneyShort(money))}</div></div>
    <div title="Eylem puanı"><div class="ap">${pips}</div><div class="sub" style="text-align:right">${s.player.ap} puan</div></div>
    ${soundToggleHtml()}
    <button class="btn-end" id="btn-end">${s.phase === 'campaign' ? 'Günü bitir' : 'Bitir ▸'}</button>
  </header>`;
}

function ticker(s) {
  const items = s.news.slice(0, 8).map(n => `<span>${esc(n.text)}</span>`).join('');
  return `<div class="ticker" aria-label="Son dakika"><div class="tag">SON DAKİKA</div><div class="track"><div class="run">${items}</div></div></div>`;
}

function tabsFor(s) {
  return s.player.isPresident ? TABS.map(t => t[0] === 'meclis' ? ['makam', 'Makam', renderPresidency] : t) : TABS;
}

function tabbar(s) {
  return `<div class="tabbar"><nav>${tabsFor(s).map(([id, label]) => `<button data-tab="${id}" class="${ctx.tab === id ? 'on' : ''}" aria-label="${label}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>${label}${id === 'gundem' && s.events.active.length ? '<span class="dot"></span>' : ''}</button>`).join('')}</nav></div>`;
}

let lastTicker = '';
function render() {
  const app = document.getElementById('app');
  const s = ctx.state;
  playTrack(pickTrack());
  duckMusic(!!document.querySelector('.tv'));
  if (!s) {
    app.innerHTML = '';
    const v = el('<main class="view" style="padding-bottom:32px"></main>');
    app.appendChild(v);
    renderNewGame(v, ctx);
    return;
  }
  const tickerHtml = ticker(s);
  const keepTicker = lastTicker === tickerHtml && app.querySelector('.ticker');
  const oldTicker = keepTicker ? app.querySelector('.ticker') : null;
  app.innerHTML = topbar(s);
  if (oldTicker) app.appendChild(oldTicker); else app.insertAdjacentHTML('beforeend', tickerHtml);
  lastTicker = tickerHtml;
  const view = el('<main class="view"></main>');
  app.appendChild(view);
  app.insertAdjacentHTML('beforeend', tabbar(s));
  app.querySelector('#btn-end').onclick = () => { sfx('whoosh'); ctx.endTurn(); };
  bindSoundToggle(app);
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => ctx.go(b.dataset.tab));
  const tab = tabsFor(s).find(t => t[0] === ctx.tab) || (ctx.tab === 'meclis' ? ['meclis', 'Meclis', renderParliament] : null) || TABS[0];
  tab[2](view, ctx);
  if (s.gameOver && !document.querySelector('.night')) showGameOver(s);
}

function pickTrack() {
  const s = ctx.state;
  if (!s) return 'menu';
  if (s.player.isPresident) return 'president';
  if (s.phase === 'campaign') return 'campaign';
  return 'game';
}

export function boot() {
  initMusic();
  globalThis.__sandik = ctx; // hata ayıklama ve otomatik testler için
  mountBackgroundMap();
  const saved = loadGame('oto');
  ctx.saved = !!saved;
  render();
}
