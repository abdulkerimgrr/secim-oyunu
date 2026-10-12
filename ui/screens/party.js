// Parti sekmesi: kimlik, göstergeler, seçime katılım şartları, bütçe, kadro, ideoloji, anket trendi.
import { esc, partyBadge } from '../dom.js';
import { AXES } from '../../data/parties2023.js';
import { SKILLS } from '../../data/founders.js';
import { playerParty } from '../../engine/state.js';
import { eligibility, weeklyBudget, treasuryAid } from '../../engine/turn.js';
import { fmtMoney, pct, fmtInt, fmtDate } from '../../engine/util.js';
import { pollTrend } from '../charts.js';
import { avatarSvg } from '../avatar.js';
import { mixColor } from '../map.js';
import { PROFESSIONS, TRAITS, EDUCATION } from '../../data/character.js';
import { PROVINCE_BY_PLATE } from '../../engine/state.js';

export function renderParty(view, ctx) {
  const s = ctx.state;
  const me = playerParty(s);
  const pre = s.player.mode === 'join' && !s.player.isLeader;
  view.insertAdjacentHTML('beforeend', `<section class="card"><div class="row">${partyBadge(me)}<div style="flex:1;min-width:0"><h2 style="margin:0">${esc(me.name)}</h2>
    <div class="small muted">Genel başkan: ${esc(me.leader.name)}${me.founded ? ` · kuruluş ${fmtDate(me.founded)}` : ''}</div></div></div>
    <div class="grid3" style="margin-top:10px">
      <div class="stat"><div class="v">${pct(me.recognition, 0)}</div><div class="l">Tanınırlık</div></div>
      <div class="stat"><div class="v">${Math.round(me.leader.image * 100)}</div><div class="l">Lider imajı</div></div>
      <div class="stat"><div class="v">${Math.round(me.unity)}</div><div class="l">İç huzur</div></div>
      <div class="stat"><div class="v">${fmtInt(me.members)}</div><div class="l">Üye</div></div>
      <div class="stat"><div class="v">${Object.keys(me.orgs).length}</div><div class="l">İl teşkilatı</div></div>
      <div class="stat"><div class="v">${me.seats}</div><div class="l">Milletvekili</div></div></div>
    ${me.alliance ? `<p class="small" style="margin:8px 0 0">İttifak: <b>${esc(s.alliances[me.alliance]?.name)}</b></p>` : ''}
    ${pre ? `<p class="small muted" style="margin:8px 0 0">Henüz genel başkan değilsin; parti yönetimi mevcut liderde. Kişisel bütçen: <b>${fmtMoney(s.player.personalMoney)}</b>.</p>` : ''}</section>`);

  const c = s.player.character;
  if (c) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>${pre ? 'Aday profili' : 'Genel başkan'}</h2>
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="portrait">${avatarSvg(c, { size: 96, bg: mixColor('#FFFFFF', me.color, 0.25) })}</div>
    <dl class="kv" style="flex:1"><dt>Ad</dt><dd>${esc(s.player.name)}</dd><dt>Yaş</dt><dd>${c.age}</dd><dt>Memleket</dt><dd>${esc(PROVINCE_BY_PLATE[c.hometown]?.name || '')}</dd>
      <dt>Meslek</dt><dd>${esc(PROFESSIONS.find(p => p.id === c.profession)?.label || '')}</dd><dt>Eğitim</dt><dd>${esc(EDUCATION.find(e => e[0] === c.education)?.[1] || '')}</dd></dl></div>
    ${c.traits.length ? `<div class="row" style="margin-top:8px">${c.traits.map(t => { const x = TRAITS.find(y => y.id === t); return `<span class="pill good" title="${esc(x.desc)}">${esc(x.label)}</span><span class="small muted">${esc(x.desc)}</span>`; }).join('')}</div>` : ''}
    <p class="small muted" style="margin:8px 0 0">${esc(PROFESSIONS.find(p => p.id === c.profession)?.desc || '')}</p></section>`);

  if (s.player.mode === 'found') {
    const el = eligibility(s);
    view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Seçime katılım şartları <small>2839 s. Kanun / SPK (doğrulanacak)</small></h2>
      <div class="list">
        <div class="li"><span class="pill ${el.orgsOk ? 'good' : 'warn'}">${el.orgsOk ? 'Tamam' : 'Eksik'}</span><div class="grow">İllerin en az yarısında il teşkilatı <b>(${el.orgs}/${el.needOrgs})</b></div></div>
        <div class="li"><span class="pill ${el.congressOk ? 'good' : el.congressPossible ? 'warn' : 'bad'}">${el.congressOk ? 'Tamam' : el.congressPossible ? 'Eksik' : 'Süre geçti'}</span><div class="grow">Seçimden en az 6 ay önce büyük kongre${me.congressDate ? ` (son: ${fmtDate(me.congressDate)})` : ''}</div></div>
      </div><p class="small muted" style="margin:6px 0 0">Şartlar kampanya başında YSK tarafından kontrol edilir. Sağlanmazsa partin oy pusulasında yer almaz.</p></section>`);
  }

  if (!pre) {
    const b = weeklyBudget(s);
    const L = { aidat: 'Üye aidatları', hazine: 'Hazine yardımı', bagis: 'Düzenli bağışlar', genelMerkez: 'Genel merkez', teskilat: 'Teşkilat giderleri', personel: 'Personel' };
    view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Bütçe <small>haftalık</small></h2>
      <div class="row" style="justify-content:space-between;margin-bottom:6px"><span>Kasa</span><b class="num" style="font-family:var(--f-display);font-size:24px;color:${me.money < 0 ? 'var(--bad)' : 'var(--ink)'}">${fmtMoney(me.money)}</b></div>
      <dl class="kv">${Object.entries(b.income).map(([k, v]) => `<dt>+ ${L[k]}</dt><dd style="color:var(--good)">${fmtMoney(v)}</dd>`).join('')}
      ${Object.entries(b.expense).filter(([, v]) => v > 0).map(([k, v]) => `<dt>− ${L[k]}</dt><dd style="color:var(--bad)">${fmtMoney(v)}</dd>`).join('')}
      <dt><b>Net</b></dt><dd style="color:${b.net >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(b.net)}</dd></dl>
      <p class="small muted" style="margin:8px 0 0">Hazine yardımı yalnızca son genel seçimde %3'ü geçen partilere verilir${treasuryAid(s, me.id) ? '' : ' (şu an almıyorsun)'}. 16 hafta üst üste borçta kalan parti dağılır. Tutarlar oyun içi tahminlerdir.</p></section>`);
  }

  if (me.founders?.length) view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Kurucu kadro</h2><div class="list">${me.founders.map(f => `<div class="li"><div class="grow"><div class="t">${esc(f.name)} <span class="pill good">${SKILLS[f.skill].label}</span></div><div class="small muted">${SKILLS[f.skill].desc}</div></div><div class="small num" style="text-align:right">Yetkinlik ${Math.round(f.level * 100)}<br>Sadakat ${f.loyalty}</div></div>`).join('')}</div></section>`);

  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>İdeoloji</h2><div style="display:flex;flex-direction:column;gap:8px">${AXES.map(a => {
    const v = me.ideology[a.id];
    return `<div><div class="row" style="justify-content:space-between;font-size:12px"><span class="muted">${a.neg}</span><b>${a.label}</b><span class="muted">${a.pos}</span></div>
      <div style="position:relative;height:8px;background:var(--muted);border-radius:4px"><div style="position:absolute;left:50%;top:-2px;bottom:-2px;border-left:1px solid var(--line)"></div>
      <div style="position:absolute;left:calc(${(v + 1) * 50}% - 7px);top:-3px;width:14px;height:14px;border-radius:50%;background:${me.color};border:2px solid #fff;box-shadow:var(--shadow)"></div></div></div>`;
  }).join('')}</div>${me.ideology0 ? '<p class="small muted" style="margin:8px 0 0">Partinin çizgisinden uzaklaşmak geleneksel tabanı küstürür.</p>' : ''}</section>`);

  const polls = s.polls.slice(-60);
  const top = Object.values(s.parties).filter(p => !p.aggregate && (p.lastShare > 0.05 || p.isPlayer));
  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Anket trendi <small>son ${polls.length} anket</small></h2>
    ${pollTrend(top.map(p => ({ id: p.id, color: p.color, bold: p.isPlayer, values: polls.map(q => q.shares[p.id] || 0) })), polls.map(q => q.date), { threshold: s.rules.parliament.threshold })}
    <div class="legend">${top.map(p => `<span><i class="swatch" style="background:${p.color}"></i>${esc(p.short)}</span>`).join('')}</div></section>`);

  view.insertAdjacentHTML('beforeend', `<section class="card"><h2>Dönem istatistikleri</h2><dl class="kv">
    <dt>Miting</dt><dd>${s.stats.rallies}</dd><dt>TV programı</dt><dd>${s.stats.tv}</dd><dt>Gaf</dt><dd>${s.stats.gaffes}</dd>
    <dt>Toplam harcama</dt><dd>${fmtMoney(s.stats.moneySpent)}</dd><dt>En yüksek anket</dt><dd>${pct(s.stats.peakPoll)}</dd></dl></section>`);
}
