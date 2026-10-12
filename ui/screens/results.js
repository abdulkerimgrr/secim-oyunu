// Sonuç ekranları: seçim gecesi (il il açılan harita), yerel seçim, kurultay, oyun sonu.
import { esc, el } from '../dom.js';
import { createMap, mixColor } from '../map.js';
import { hemicycle } from '../charts.js';
import { PROVINCES } from '../../data/generated/provinces.js';
import { playerParty } from '../../engine/state.js';
import { pct, fmtDate, fmtMoney } from '../../engine/util.js';
import { ctx } from '../app.js';
import { avatarSvg } from '../avatar.js';
import { sfx } from '../sound.js';

function overlay(html) {
  const o = el(`<div class="night" role="dialog" aria-modal="true"><div class="inner">${html}</div></div>`);
  document.body.appendChild(o);
  return o;
}
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function bars(s, shares) {
  const list = Object.entries(shares).filter(([id]) => !s.parties[id].aggregate).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(0.1, ...list.map(x => x[1]));
  const thr = s.rules.parliament.threshold;
  return `<div class="bars">${list.map(([id, v]) => `<div class="bar"><span class="name" style="color:${s.parties[id].isPlayer ? 'var(--hi)' : '#fff'}">${esc(s.parties[id].short)}</span>
    <div class="track" style="background:rgba(255,255,255,.12)"><div class="fill" style="width:${100 * v / max}%;background:${s.parties[id].color}"></div><div class="thr" style="left:${100 * thr / max}%"></div></div>
    <span class="val" style="color:#fff">${(100 * v).toFixed(1).replace('.', ',')}</span></div>`).join('')}</div>`;
}

function order(s, seats) {
  return Object.entries(seats).filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n, color: s.parties[id].color, k: s.parties[id].ideology.din + s.parties[id].ideology.milli + s.parties[id].ideology.eko }))
    .sort((a, b) => a.k - b.k);
}

function playerVerdict(s, r) {
  const me = playerParty(s);
  const share = r.national[me.id] || 0;
  const seats = r.seats[me.id] || 0;
  const thr = s.rules.parliament.threshold;
  let blocSeats = 0;
  for (const p of Object.values(s.parties)) if ((me.alliance && p.alliance === me.alliance) || p.id === me.id) blocSeats += r.seats[p.id] || 0;
  if (s.player.mode === 'found' && r.national[me.id] === undefined) return ['Oy pusulasında yoktun', 'Partin seçime katılma şartlarını sağlayamadı. Bir sonraki seçim için 41 il teşkilatını ve büyük kongreyi zamanında tamamla.'];
  if (r.government.includes(me.id) && blocSeats >= 301) return ['İKTİDARDASIN', `${esc(me.short)} ${seats} milletvekili çıkardı; ittifakınla ${blocSeats} sandalye. Şimdi asıl zor kısım başlıyor.`];
  if (seats > 0) return [`Meclisteyiz: ${seats} milletvekili`, `${esc(me.short)} oy oranı: ${pct(share)}. ${share < thr ? 'İttifak sayesinde barajı aştın.' : 'Barajı tek başına geçtin.'}`];
  if (s.player.mode === 'found') return [`Barajın altında: ${pct(share)}`, share >= 0.03 ? '%3\'ü geçtiğin için Hazine yardımı alacaksın. Bu yeni bir parti için ciddi bir başarı.' : 'Yeni bir parti için ilk seçim zordur. Tanınırlık ve teşkilat bir sonraki seçimde fark yaratır.'];
  return [`${esc(me.short)}: ${pct(share)}`, `${seats} milletvekili.`];
}

export function showResult(s, r, done) {
  if (r.type === 'kurultay') { showKurultay(s, r, done); return; }
  if (r.type === 'cb') { showPresidential(s, r, done); return; }
  if (r.type === 'yerel') {
    const o = overlay(`<span class="live">YEREL SEÇİM</span><h1>Belediye başkanlıkları</h1><div id="m"></div>
      <div class="card"><div class="small muted" style="margin-bottom:6px">İl/büyükşehir belediye başkanlıkları (basitleştirilmiş: ilçe ve meclisler Aşama 6'da)</div>
      <div class="list">${Object.entries(r.count).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<div class="li"><i class="swatch" style="background:${s.parties[id].color}"></i><div class="grow t">${esc(s.parties[id].short)}</div><b class="num">${n} il</b></div>`).join('')}</div></div>
      <button class="btn-end" style="padding:14px" data-a="ok">Devam</button>`);
    sfx('sting');
    const m = createMap();
    m.setInteractive(false);
    m.paint(pl => s.parties[r.mayors[pl]]?.color);
    o.querySelector('#m').appendChild(m.node);
    o.querySelector('[data-a=ok]').onclick = () => { o.remove(); ctx.render(); done(); };
    return;
  }
  // Genel seçim gecesi
  const o = overlay(`<div class="row" style="justify-content:space-between"><span class="live">● CANLI · SEÇİM GECESİ</span><span class="counter num" id="cnt">Açılan sandık %0</span></div>
    <h1>${fmtDate(r.date)} milletvekili genel seçimi</h1><div id="m"></div><div id="bars"></div><div id="final"></div>`);
  const m = createMap();
  m.setInteractive(false);
  m.paint(() => '#2A3A60');
  o.querySelector('#m').appendChild(m.node);
  const regs = {};
  for (const u of s.units) regs[u.plate] = (regs[u.plate] || 0) + u.registered;
  const order_ = [...PROVINCES].sort(() => Math.random() - 0.5);
  const totalReg = Object.values(regs).reduce((a, b) => a + b, 0);
  const shown = {};
  let regDone = 0, i = 0;
  const colorOf = pl => {
    const sh = r.provinces[pl]?.shares; if (!sh || !shown[pl]) return '#2A3A60';
    const [id, v] = Object.entries(sh).filter(([k]) => !s.parties[k].aggregate).sort((a, b) => b[1] - a[1])[0];
    return mixColor('#FFFFFF', s.parties[id].color, Math.min(1, 0.45 + v));
  };
  const tally = () => {
    const t = {}; let tot = 0;
    for (const pl in shown) { const w = regs[pl] * r.provinces[pl].turnout; tot += w; for (const [id, v] of Object.entries(r.provinces[pl].shares)) t[id] = (t[id] || 0) + v * w; }
    for (const id in t) t[id] /= tot || 1;
    return t;
  };
  const finish = () => {
    if (o.dataset.fin) return; o.dataset.fin = '1';
    const meId = playerParty(s).id;
    sfx((r.seats[meId] || 0) > 0 || r.government.includes(meId) ? 'win' : 'lose');
    for (const p of PROVINCES) shown[p.plate] = true;
    m.paint(colorOf);
    o.querySelector('#cnt').textContent = 'Açılan sandık %100';
    o.querySelector('#bars').innerHTML = bars(s, r.national);
    const [h, txt] = playerVerdict(s, r);
    const passed = Object.entries(r.pass).filter(([, v]) => v).map(([id]) => s.parties[id].short);
    o.querySelector('#final').innerHTML = `<div class="card"><h2>Yeni meclis</h2>${hemicycle(order(s, r.seats))}
      <div class="list">${Object.entries(r.seats).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => {
        const d = n - (r.prevSeats[id] || 0);
        return `<div class="li"><i class="swatch" style="background:${s.parties[id].color}"></i><div class="grow t">${esc(s.parties[id].short)}</div><span class="small num" style="color:${d >= 0 ? 'var(--good)' : 'var(--bad)'}">${d >= 0 ? '+' : ''}${d}</span><b class="num" style="width:40px;text-align:right">${n}</b></div>`;
      }).join('')}</div><p class="small muted">Katılım ${pct(r.turnout)} · Barajı geçenler: ${passed.map(esc).join(', ')}</p></div>
      <div class="card"><div class="eyebrow">Senin için</div><h2>${h}</h2><p style="margin:0">${txt}</p></div>
      <button class="btn-end" style="padding:14px;width:100%" data-a="ok">Yeni döneme başla</button>`;
    o.querySelector('[data-a=ok]').onclick = () => { o.remove(); ctx.render(); done(); };
  };
  sfx('drumroll', 0, 2.2);
  if (reduced()) return finish();
  const step = () => {
    if (i >= order_.length) return finish();
    const batch = order_.slice(i, i + 3); i += 3;
    for (const p of batch) { shown[p.plate] = true; regDone += regs[p.plate]; }
    m.paint(colorOf);
    o.querySelector('#cnt').textContent = `Açılan sandık %${Math.round(100 * regDone / totalReg)}`;
    o.querySelector('#bars').innerHTML = bars(s, tally());
    setTimeout(step, 180);
  };
  o.querySelector('#final').innerHTML = '<button class="btn" style="width:100%;background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" id="skip">Sonuçları hemen göster</button>';
  o.querySelector('#skip').onclick = () => { i = order_.length; finish(); };
  step();
}

export function showGameOver(s) {
  if (document.querySelector('.night')) return;
  const g = s.gameOver;
  const me = playerParty(s);
  sfx('lose');
  const o = overlay(`<span class="live">OYUN SONU</span><h1>${esc(g.title)}</h1>
    <div class="card"><p style="margin-top:0">${esc(g.text)}</p><dl class="kv">
      <dt>Parti</dt><dd>${esc(me.name)}</dd><dt>Süre</dt><dd>${Math.round(s.stats.weeks)} hafta</dd><dt>Tarih</dt><dd>${fmtDate(s.date)}</dd>
      <dt>En yüksek anket</dt><dd>${pct(s.stats.peakPoll)}</dd><dt>Miting / TV</dt><dd>${s.stats.rallies} / ${s.stats.tv}</dd>
      <dt>Gaf</dt><dd>${s.stats.gaffes}</dd><dt>Toplam harcama</dt><dd>${fmtMoney(s.stats.moneySpent)}</dd>
      <dt>Seçimler</dt><dd>${s.elections.filter(e => !e.real).length}</dd></dl></div>
    <button class="btn-end" style="padding:14px" data-a="menu">Ana menü</button>`);
  o.querySelector('[data-a=menu]').onclick = () => { o.remove(); ctx.quit(); };
}

// Kurultay günü: delegeler oy kullanır, sayım canlı ilerler; gerekirse ikinci tur
function showKurultay(s, r, done) {
  const me = playerParty(s);
  const names = { player: s.player.name, incumbent: r.oldLeader, third: 'Üçüncü aday' };
  const cols = { player: me.color, incumbent: '#8C96A8', third: '#C9A227' };
  const o = overlay(`<div class="row" style="justify-content:space-between"><span class="live">● CANLI · ${esc(me.short)} KURULTAYI</span><span class="counter num" id="kc"></span></div>
    <h1 id="kt">1. tur oylaması</h1>
    <div class="row" style="flex-wrap:nowrap;gap:12px"><div class="portrait" style="border:2px solid var(--hi)">${avatarSvg(s.player.character, { size: 72, bg: '#22345E' })}</div>
      <p style="margin:0;opacity:.85">${r.delegates.toLocaleString('tr-TR')} delege sandık başında. Salonda bayraklar ve sloganlar; sayım masası kuruldu.</p></div>
    <div class="card" id="kbars"></div><div id="kfinal"></div>`);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const draw = (round, t) => {
    const ids = Object.keys(round).filter(k => k !== 'valid');
    const counted = Math.round(round.valid * t);
    o.querySelector('#kc').textContent = `Sayılan oy ${counted.toLocaleString('tr-TR')} / ${round.valid.toLocaleString('tr-TR')}`;
    o.querySelector('#kbars').innerHTML = ids.sort((a, b) => round[b] - round[a]).map(id => {
      const v = round[id] * t;
      return `<div style="margin:6px 0"><div class="row" style="justify-content:space-between"><b style="color:${id === 'player' ? 'var(--accent)' : 'var(--ink)'}">${esc(names[id])}</b>
        <span class="num" style="font-family:var(--f-display);font-weight:700;font-size:20px">${Math.round(round[id] * round.valid * t).toLocaleString('tr-TR')} <span class="small muted">(%${(100 * (t ? round[id] : 0)).toFixed(1).replace('.', ',')})</span></span></div>
        <div class="kbar" style="height:16px"><div style="width:${100 * v}%;background:${cols[id]}"></div><i style="left:50%"></i></div></div>`;
    }).join('');
  };
  const animate = (round, cb) => {
    if (reduced) { draw(round, 1); return cb(); }
    let t = 0;
    const step = () => { t = Math.min(1, t + 0.035); draw(round, t); if (t < 1) setTimeout(step, 60); else cb(); };
    step();
  };
  const final = () => {
    const last = r.rounds[r.rounds.length - 1];
    o.querySelector('#kt').textContent = r.won ? 'Genel başkansın!' : 'Kurultay kaybedildi';
    sfx(r.won ? 'win' : 'lose');
    o.querySelector('#kfinal').innerHTML = `<div class="card"><p style="margin:0">${r.won
      ? `${esc(me.name)} artık senin. Parti eylemleri açıldı: teşkilat, miting, ittifak. Önceki yönetimin tabanı küskün; verdiğin ${s.player.kurultay.promises} söz iç huzuru zorlayacak.`
      : `${esc(r.oldLeader)} görevini sürdürüyor. Son turda delegelerin %${(100 * last.player).toFixed(1).replace('.', ',')} oyunu aldın.`}</p></div>
      <button class="btn-end" style="padding:14px;width:100%" data-a="ok">Devam</button>`;
    o.querySelector('[data-a=ok]').onclick = () => { o.remove(); ctx.render(); done(); };
  };
  sfx('drumroll', 0, 2.4);
  animate(r.rounds[0], () => {
    if (r.rounds.length > 1) {
      o.querySelector('#kt').textContent = 'Kimse yarıyı geçemedi: 2. tur!';
      setTimeout(() => { o.querySelector('#kt').textContent = '2. tur oylaması'; animate(r.rounds[1], final); }, reduced ? 0 : 1400);
    } else final();
  });
}

// Cumhurbaşkanlığı seçimi sonuç ekranı (1. ve gerekirse 2. tur)
function showPresidential(s, r, done) {
  const byId = Object.fromEntries(r.candidates.map(c => [c.id, c]));
  const o = overlay(`<div class="row" style="justify-content:space-between"><span class="live">● CANLI · CUMHURBAŞKANLIĞI SEÇİMİ</span><span class="counter" id="pt"></span></div>
    <h1 id="ph">1. tur sonuçları</h1><div id="pm"></div><div class="card" id="pb"></div><div id="pf"></div>`);
  const m = createMap();
  m.setInteractive(false);
  o.querySelector('#pm').appendChild(m.node);
  const draw = (round, label) => {
    o.querySelector('#ph').textContent = label;
    m.paint(pl => byId[round.provinces[pl]]?.color);
    o.querySelector('#pb').innerHTML = Object.entries(round.shares).sort((a, b) => b[1] - a[1]).map(([id, v]) => { const c = byId[id];
      return `<div style="margin:8px 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px">
        ${c.isPlayer ? `<div class="portrait" style="width:36px;height:42px">${avatarSvg(s.player.character, { size: 36, bg: '#E6EBF3' })}</div>` : `<span class="badge" style="background:${c.color}">${esc(c.short)}</span>`}
        <b style="flex:1;color:${c.isPlayer ? 'var(--accent)' : 'var(--ink)'}">${esc(c.name)}</b><span class="num" style="font-family:var(--f-display);font-size:22px;font-weight:700">%${(100 * v).toFixed(1).replace('.', ',')}</span></div>
        <div class="kbar" style="height:14px"><div style="width:${100 * v}%;background:${c.color}"></div><i style="left:50%"></i></div></div>`; }).join('');
  };
  sfx('drumroll', 0, 2);
  draw(r.rounds[0], '1. tur sonuçları');
  const final = () => {
    const w = byId[r.winner];
    sfx(r.playerWon ? 'win' : r.playerRan ? 'lose' : 'ding');
    o.querySelector('#pf').innerHTML = `<div class="card"><div class="eyebrow">Yeni Cumhurbaşkanı</div><h2>${esc(w.name)}</h2>
      <p style="margin:0">${r.playerWon ? 'Tebrikler! Artık Cumhurbaşkanısın. Alt menüdeki <b>Makam</b> sekmesinden kabineni kur, ekonomiyi ve dış politikayı yönet. Onay oranını yüksek tut; beş yıl sonra yeniden seçime gideceksin.' : r.playerRan ? 'Bu sefer olmadı. Muhalefet liderliğini sürdürerek bir sonraki seçime hazırlanabilirsin.' : `${esc(w.short)} ittifakı hükümeti kuracak.`}</p></div>
      <button class="btn-end" style="padding:14px;width:100%" data-a="ok">Devam</button>`;
    o.querySelector('[data-a=ok]').onclick = () => { o.remove(); ctx.render(); done(); };
  };
  if (r.rounds.length > 1) {
    o.querySelector('#pt').textContent = 'Kimse %50\'yi geçemedi';
    setTimeout(() => { draw(r.rounds[1], '2. tur sonuçları (iki hafta sonra)'); sfx('drumroll', 0, 1.5); setTimeout(final, 1700); }, 2600);
  } else setTimeout(final, 1500);
}
