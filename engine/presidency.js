// Cumhurbaşkanlığı modu: onay oranı, kabine, ekonomi tutumu, kanunlar, zirveler, ulusa sesleniş.
import { CABINET_POSTS, MINISTER_FIRST, MINISTER_LAST, PROFILES } from '../data/cabinet.js';
import { POLICIES } from '../data/policies.js';
import { DESTINATIONS } from '../data/diplomacy.js';
import { clamp, addDays } from './util.js';
import { addNews } from './news.js';
import { applyEcon, applyForeign, foreignScore, publicSupport, policyById } from './government.js';
import { addClusterMom } from './social.js';
import { staffMod } from './staff.js';
import { misery } from './model.js';

export function ministerCandidates(state, post) {
  const key = post + (state.presidency?.since || '') + (state.presidency?.reshuffles || 0);
  let h = 0;
  for (const c of key + state.seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const r = () => (h = (Math.imul(h ^ (h >>> 13), 1274126177) + 0x6D2B79F5) >>> 0) / 4294967296;
  return [0, 1, 2].map(i => {
    const prof = PROFILES[Math.floor(r() * PROFILES.length)];
    const comp = prof[0] === 'teknokrat' || prof[0] === 'akademisyen' ? 0.55 + 0.4 * r() : 0.3 + 0.45 * r();
    const loy = prof[0] === 'siyasetci' ? 0.6 + 0.35 * r() : 0.35 + 0.5 * r();
    const pop = prof[0] === 'siyasetci' ? 0.5 + 0.4 * r() : 0.25 + 0.4 * r();
    return { id: `${post}-${i}`, post, name: `${MINISTER_FIRST[Math.floor(r() * 16)]} ${MINISTER_LAST[Math.floor(r() * 16)]}`, profile: prof[1], comp: +comp.toFixed(2), loyalty: +loy.toFixed(2), pop: +pop.toFixed(2) };
  });
}

export function ensurePresidency(state) {
  const p = state.presidency || (state.presidency = {});
  p.approval ??= 55; p.history ??= []; p.cabinet ??= {}; p.econStance ??= 'dengeli'; p.laws ??= []; p.reshuffles ??= 0;
  for (const post of CABINET_POSTS) if (!p.cabinet[post.id]) {
    const c = ministerCandidates(state, post.id);
    p.cabinet[post.id] = c.slice().sort((a, b) => (b.comp + b.loyalty) - (a.comp + a.loyalty))[0];
  }
  return p;
}

export function appoint(state, cand) {
  const p = ensurePresidency(state);
  p.cabinet[cand.post] = cand;
  p.reshuffles++;
  p.approval = clamp(p.approval + (cand.pop - 0.5) * 4, 5, 95);
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name}, ${CABINET_POSTS.find(x => x.id === cand.post).label.toLocaleLowerCase('tr')}lığına ${cand.name}'ı atadı`);
}

export function approvalTarget(state) {
  const me = state.parties[state.player.partyId];
  const poll = state.polls.length ? state.polls[state.polls.length - 1].shares[me.id] || 0 : me.lastShare;
  const p = ensurePresidency(state);
  const cab = Object.values(p.cabinet).reduce((a, m) => a + m.pop + m.comp * 0.5, 0) / CABINET_POSTS.length;
  const stale = (state.player.promises || []).filter(x => !x.fulfilled && p.since && addDays(p.since, 365) < state.date).length; // bir yıldır bekleyen vaatler
  return clamp(48 - 1.5 * stale + 70 * (poll - 0.33) - 0.6 * (misery(state.economy) - state.economy.misery0) + 0.35 * (foreignScore(state) - 50) + 40 * me.momentum + 10 * (cab - 0.75), 8, 92);
}

export function presidencyTick(state, rng, f) {
  if (!state.player.isPresident) return;
  const p = ensurePresidency(state);
  const e = state.economy;
  // Kabine etkileri
  const c = p.cabinet;
  e.target = clamp(e.target - (c.hazine.comp - 0.5) * 0.12 * f, 8, 95);
  e.growth = clamp(e.growth + (c.hazine.comp - 0.5) * 0.02 * f, -8, 10);
  for (const k of Object.keys(state.foreign)) state.foreign[k] = clamp(state.foreign[k] + (c.disisleri.comp - 0.5) * 0.15 * f, 0, 100);
  state.foreign.ab = clamp(state.foreign.ab + (c.adalet.comp - 0.5) * 0.06 * f, 0, 100);
  // Aylık para politikası (Merkez Bankası'na yaklaşım)
  const month = state.date.slice(0, 7);
  if (p.lastRateMonth !== month) {
    p.lastRateMonth = month;
    const off = { siki: 7, dengeli: 3, gevsek: -6 }[p.econStance] ?? 3;
    const want = clamp(e.inflation * 0.95 + off, 3, 75);
    const step = Math.round(clamp((want - e.policyRate) * 0.4, -6, 8) * 2) / 2;
    e.policyRate = clamp(e.policyRate + step, 0, 75);
    if (p.econStance === 'gevsek') { e.growth = clamp(e.growth + 0.15, -8, 10); e.usdTry = +(e.usdTry * 1.01).toFixed(2); }
    if (p.econStance === 'siki') { e.growth = clamp(e.growth - 0.1, -8, 10); }
    addNews(state, 'econ', `Merkez Bankası politika faizini ${step > 0 ? 'artırdı' : step < 0 ? 'indirdi' : 'sabit tuttu'}; yeni faiz %${e.policyRate.toFixed(1).replace('.', ',')}`);
    p.history.push({ date: state.date, approval: Math.round(p.approval) });
    if (p.history.length > 72) p.history.shift();
  }
  // Onay oranı hedefe yaklaşır
  p.approval = clamp(p.approval + (approvalTarget(state) - p.approval) * 0.08 * f + rng.normal(0, 0.4) * Math.sqrt(f), 5, 95);
  // Düşük onayda iç huzur ve kabine sadakati
  if (p.approval < 30) state.parties[state.player.partyId].unity = clamp(state.parties[state.player.partyId].unity - 0.5 * f, 0, 100);
  presidencyEvents(state, rng, f);
}

function govSeats(state) { return state.government.reduce((a, id) => a + (state.parliament.seats[id] || 0), 0); }

export function enactLaw(state, polId, rng) {
  const p = ensurePresidency(state);
  const pol = policyById(polId);
  const seats = govSeats(state);
  const need = pol.needs || 301;
  const passes = rng.chance(seats >= need ? 0.92 : seats >= 280 ? 0.45 : 0.15);
  const support = publicSupport(state, pol);
  p.laws.unshift({ id: pol.id, date: state.date, passed: passes, support });
  if (p.laws.length > 30) p.laws.length = 30;
  if (!passes) {
    p.approval = clamp(p.approval - 2, 5, 95);
    addNews(state, 'gov', `TBMM: Cumhurbaşkanlığı'nın desteklediği "${pol.title}" teklifi reddedildi`);
    return { passes, support, seats, need };
  }
  applyEcon(state, pol.econ || {});
  applyForeign(state, pol.foreign || {});
  addClusterMom(state, state.player.partyId, pol.pro, 0.02);
  addClusterMom(state, state.player.partyId, Object.fromEntries(Object.entries(pol.anti).map(([k, v]) => [k, v])), -0.015);
  const d = (support - 0.5) * 12 + (pol.popularity || 0) * 40;
  p.approval = clamp(p.approval + d, 5, 95);
  addNews(state, 'gov', `TBMM: "${pol.title}" kabul edildi ve yürürlüğe girdi`);
  return { passes, support, seats, need, approvalDelta: d };
}

export function setMinimumWage(state, pct, rng) {
  const p = ensurePresidency(state);
  const e = state.economy;
  p.wageYear = state.date.slice(0, 4);
  const infl = (pct - 30) * 0.08;
  applyEcon(state, { inflation: infl, unemployment: pct > 50 ? 0.4 : 0 });
  const d = (pct - 35) * 0.25 + rng.normal(0, 1);
  p.approval = clamp(p.approval + d, 5, 95);
  addClusterMom(state, state.player.partyId, { kararsiz: 1, sol: 0.8, kurt: 0.6, muhafazakar: 0.5 }, 0.0006 * (pct - 30));
  addNews(state, 'gov', `Asgari ücrete %${pct} zam yapıldı`);
  return { infl, approvalDelta: d };
}

export function summit(state, destId, rng) {
  const p = ensurePresidency(state);
  const d = DESTINATIONS.find(x => x.id === destId);
  const ok = rng.chance(0.75 * Math.min(1.3, staffMod(state, 'foreign')) + (p.cabinet.disisleri.comp - 0.5) * 0.3);
  applyForeign(state, { [d.foreign]: ok ? 8 : 2 });
  if (ok && d.foreign === 'ab') applyEcon(state, { growth: 0.2 });
  if (ok && d.foreign === 'ortadogu') applyEcon(state, { growth: 0.25 });
  p.approval = clamp(p.approval + (ok ? 1.5 : -0.5), 5, 95);
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name} ${d.city} ziyaretinde ${ok ? 'önemli anlaşmalar imzaladı' : 'beklenen sonucu alamadı'}`);
  return { ok, dest: d };
}

export function addressNation(state, topic, rng) {
  const p = ensurePresidency(state);
  const last = p.lastAddress;
  const fatigue = last && addDays(last, 42) > state.date ? 0.4 : 1;
  const d = rng.range(0.5, 3.5) * fatigue;
  p.approval = clamp(p.approval + d, 5, 95);
  state.parties[state.player.partyId].momentum += 0.02 * fatigue;
  p.lastAddress = state.date;
  addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name} ulusa seslendi`);
  return { approvalDelta: d, fatigue: fatigue < 1 };
}

export const lawOptions = state => POLICIES.filter(pol => !(state.presidency?.laws || []).some(l => l.id === pol.id && addDays(l.date, 365) > state.date));

// ---- Kabine krizleri, istifalar, Meclis denetimi (olaylar) ----
// Not: Gensoru 2017 anayasa değişikliğiyle kaldırıldı. Bakanlar hakkında Meclis soruşturması önergesi
// TBMM üye tamsayısının salt çoğunluğuyla (301) verilir; soruşturma açılması için 3/5 (360) oy gerekir (AY m.106).
const postLabel = id => CABINET_POSTS.find(x => x.id === id).label;
const oppSeats = state => Object.entries(state.parliament.seats).filter(([id]) => !state.government.includes(id)).reduce((a, [, n]) => a + n, 0);

function bestReplacement(state, post) {
  const p = ensurePresidency(state);
  p.reshuffles++;
  const c = ministerCandidates(state, post);
  return c.sort((a, b) => (b.comp + b.loyalty) - (a.comp + a.loyalty))[0];
}

export function applyPresidencyEffect(state, eff, rng) {
  const p = ensurePresidency(state);
  const lines = [];
  if (eff.approval) { const d = rng.range(eff.approval[0], eff.approval[1]); p.approval = clamp(p.approval + d, 5, 95); lines.push(`Onay oranı ${d >= 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}`); }
  if (eff.loyalty) for (const [post, d] of Object.entries(eff.loyalty)) { const m = p.cabinet[post]; if (m) m.loyalty = clamp(m.loyalty + d, 0.05, 1); }
  if (eff.loyaltyAll) for (const m of Object.values(p.cabinet)) m.loyalty = clamp(m.loyalty + eff.loyaltyAll, 0.05, 1);
  if (eff.econ) applyEcon(state, eff.econ);
  if (eff.foreign) applyForeign(state, eff.foreign);
  if (eff.unity) { const me = state.parties[state.player.partyId]; me.unity = clamp(me.unity + eff.unity, 0, 100); lines.push(`İç huzur ${eff.unity >= 0 ? '+' : ''}${eff.unity}`); }
  for (const post of eff.replace || []) {
    const old = p.cabinet[post], n = bestReplacement(state, post);
    p.cabinet[post] = n;
    lines.push(`${postLabel(post)}: ${old.name} → ${n.name}`);
    addNews(state, 'gov', `${postLabel(post)}lığına ${n.name} atandı`);
  }
  if (eff.inquiry) {
    const opp = oppSeats(state);
    const opened = opp >= 360 || (opp >= 330 && rng.chance(0.35));
    const post = eff.inquiry;
    if (opened) {
      const old = p.cabinet[post], n = bestReplacement(state, post);
      p.cabinet[post] = n;
      p.approval = clamp(p.approval - 3, 5, 95);
      lines.push(`⚠️ Genel Kurul soruşturma açılmasını kabul etti (${opp} muhalefet sandalyesi). ${old.name} görevden ayrıldı; yerine ${n.name} atandı.`);
      addNews(state, 'gov', `TBMM, ${old.name} hakkında Meclis soruşturması açılmasına karar verdi`);
    } else {
      p.approval = clamp(p.approval + 1, 5, 95);
      lines.push(`Önerge Genel Kurul'da reddedildi: soruşturma için 360 oy gerekiyordu (muhalefet ${opp}).`);
      addNews(state, 'gov', `Meclis soruşturması önergesi Genel Kurul'da reddedildi`);
    }
  }
  if (eff.news) addNews(state, 'gov', eff.news);
  return lines;
}

function crisisEvent(state, rng) {
  const p = ensurePresidency(state);
  const cab = Object.entries(p.cabinet);
  const name = state.player.name;
  const kinds = [];
  const disloyal = cab.slice().sort((a, b) => a[1].loyalty - b[1].loyalty)[0];
  const weak = cab.slice().sort((a, b) => a[1].comp - b[1].comp)[0];
  kinds.push(['istifa', 1 + (1 - disloyal[1].loyalty) * 2 + (p.approval < 40 ? 1 : 0)]);
  kinds.push(['skandal', 0.8 + (1 - weak[1].comp) * 1.5]);
  kinds.push(['kriz', 1.2]);
  const opp = oppSeats(state);
  kinds.push([opp >= 301 ? 'sorusturma' : 'arastirma', opp >= 301 ? 1.6 : 0.8]);
  const tot = kinds.reduce((a, k) => a + k[1], 0);
  let r = rng.next() * tot, kind = kinds[0][0];
  for (const [k, w] of kinds) { if ((r -= w) <= 0) { kind = k; break; } }
  const base = { uid: `cb-${kind}-${state.turn}`, date: state.date, source: 'Cumhurbaşkanlığı', presidency: true };

  if (kind === 'istifa') {
    const [post, m] = disloyal;
    return { ...base, id: 'cb:istifa', title: `İstifa: ${postLabel(post)} ${m.name}`,
      body: `${postLabel(post)} ${m.name}, "politika farklılıklarını" gerekçe göstererek istifa dilekçesini Cumhurbaşkanlığına sundu. Kulislerde kabinede başka rahatsızlıklar olduğu da konuşuluyor. (Kurgusal senaryo.)`,
      options: [
        { i: 0, label: 'İstifayı kabul et, yerine yeni isim ata', effects: { presidency: { replace: [post], approval: [-1.5, 0.5], loyaltyAll: 0.03 } } },
        { i: 1, label: 'Görüşüp ikna etmeye çalış', effects: { presidency: { loyalty: { [post]: 0.25 }, approval: [-1, 1] } } },
        { i: 2, label: 'Kabinede geniş değişikliğe git (3 bakanlık)', effects: { presidency: { replace: [post, ...cab.filter(([id]) => id !== post).sort((a, b) => (a[1].comp + a[1].loyalty) - (b[1].comp + b[1].loyalty)).slice(0, 2).map(([id]) => id)], approval: [-2, 2.5], unity: -3, news: `Cumhurbaşkanı ${name} kabinede değişikliğe gitti` } } },
      ] };
  }
  if (kind === 'skandal') {
    const [post, m] = weak;
    return { ...base, id: 'cb:skandal', title: `${postLabel(post)} hakkında iddialar`,
      body: `${postLabel(post)} ${m.name}'in bakanlığındaki bir ihale sürecine ilişkin usulsüzlük iddiaları basında geniş yer buldu. Muhalefet istifa çağrısı yapıyor. (Kurgusal senaryo.)`,
      options: [
        { i: 0, label: 'Görevden al', effects: { presidency: { replace: [post], approval: [0.5, 3], loyaltyAll: -0.04 } } },
        { i: 1, label: 'Arkasında dur', effects: { presidency: { approval: [-4, -1], loyalty: { [post]: 0.2 } } } },
        { i: 2, label: 'Bağımsız denetim başlat, sonucu bekle', effects: { presidency: { approval: [-0.5, 1.5], foreign: { ab: 1 }, news: `Cumhurbaşkanlığı Devlet Denetleme Kurulu, iddiaları incelemeye aldı` } } },
      ] };
  }
  if (kind === 'kriz') {
    const others = cab.filter(([id]) => id !== 'hazine');
    const [post, m] = others[Math.floor(rng.next() * others.length)];
    const h = p.cabinet.hazine;
    return { ...base, id: 'cb:kriz', title: 'Kabinede bütçe krizi',
      body: `Hazine ve Maliye Bakanı ${h.name} harcama kısıntısı isterken ${postLabel(post)} ${m.name} bakanlık bütçesinin artırılmasında ısrar ediyor. Tartışma basına yansıdı. (Kurgusal senaryo.)`,
      options: [
        { i: 0, label: 'Hazine\'yi destekle: mali disiplin', effects: { presidency: { econ: { target: -1.5, growth: -0.1 }, loyalty: { [post]: -0.2, hazine: 0.1 }, approval: [-1.5, 0] } } },
        { i: 1, label: `${postLabel(post).replace(' Bakanı', '')}'nı destekle: ek bütçe`, effects: { presidency: { econ: { target: 1.5, growth: 0.15 }, loyalty: { [post]: 0.15, hazine: -0.25 }, approval: [0, 2] } } },
        { i: 2, label: 'İki bakanı da görevden al', effects: { presidency: { replace: ['hazine', post], approval: [-2.5, 0.5], unity: -2 } } },
      ] };
  }
  if (kind === 'sorusturma') {
    const [post, m] = cab.slice().sort((a, b) => (a[1].comp + a[1].pop) - (b[1].comp + b[1].pop))[0];
    return { ...base, id: 'cb:sorusturma', title: `Meclis soruşturması önergesi: ${m.name}`,
      body: `Muhalefet ${opp} milletvekili ile ${postLabel(post)} ${m.name} hakkında Meclis soruşturması önergesi verdi. Soruşturma açılması için Genel Kurul'da 360 oy gerekiyor. (Gensoru 2017 anayasa değişikliğiyle kaldırıldı; bakanlar için bugünkü denetim yolu budur.)`,
      options: [
        { i: 0, label: 'Bakanı savun, oylamaya gidilsin', effects: { presidency: { inquiry: post, loyalty: { [post]: 0.15 } } } },
        { i: 1, label: 'Bakandan istifasını iste', effects: { presidency: { replace: [post], approval: [-1, 1] } } },
        { i: 2, label: 'Muhalefetle görüş, uzlaşma ara', effects: { presidency: { approval: [0, 1.5], unity: -3, news: `Cumhurbaşkanı ${name} muhalefet grup başkanlarıyla görüştü` } } },
      ] };
  }
  const [post, m] = cab[Math.floor(rng.next() * cab.length)];
  return { ...base, id: 'cb:arastirma', title: `Meclis araştırması: ${postLabel(post).replace(' Bakanı', '')}lığı`,
    body: `Muhalefet, ${postLabel(post).replace(' Bakanı', '').toLocaleLowerCase('tr')}lığının uygulamalarıyla ilgili Meclis araştırması komisyonu kurulmasını önerdi. Komisyon kurulursa ${m.name} yoğun denetimle karşılaşacak. (Kurgusal senaryo.)`,
    options: [
      { i: 0, label: 'Önergeye destek ver: şeffaflık', effects: { presidency: { approval: [0.5, 2], loyalty: { [post]: -0.15 } } } },
      { i: 1, label: 'Grubuna önergeyi reddettir', effects: { presidency: { approval: [-2, 0] } } },
    ] };
}

// presidencyTick'ten çağrılır: kriz olasılığı ve bakan sadakatinin onay oranıyla değişimi
export function presidencyEvents(state, rng, f) {
  const p = ensurePresidency(state);
  if (p.lastLoyMonth !== state.date.slice(0, 7)) {
    p.lastLoyMonth = state.date.slice(0, 7);
    const d = (p.approval - 45) * 0.002;
    for (const m of Object.values(p.cabinet)) m.loyalty = clamp(m.loyalty + d + rng.normal(0, 0.02), 0.05, 1);
  }
  if (state.events.active.some(e => e.presidency)) return;
  if (p.lastCrisis && addDays(p.lastCrisis, 42) > state.date) return;
  const chance = (0.05 + (p.approval < 40 ? 0.02 : 0)) * f;
  if (!rng.chance(chance)) return;
  p.lastCrisis = state.date;
  state.events.active.push(crisisEvent(state, rng));
}
