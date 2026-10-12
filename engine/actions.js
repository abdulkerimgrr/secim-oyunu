// Oyuncu eylemleri. Her eylem: maliyet (eylem puanı + para), beklenen etki önizlemesi ve
// rastgelelik içeren gerçek sonuç. Etkiler engine/model.js'deki terimleri değiştirir.
import { CLUSTERS, TOPICS } from '../data/clusters.js';
import { SKILLS } from '../data/founders.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { DIFFICULTY } from './params.js';
import { ideologyDistance } from './model.js';
import { clamp, addDays, fmtMoney, pct, fmtInt, loc, priceIndex, daysBetween } from './util.js';
import { PROVINCE_BY_PLATE, playerParty } from './state.js';
import { addNews } from './news.js';
import { charMod, isHometown } from './character.js';
import { bumpAll, bumpFaction } from './kurultay.js';
import { prepareBroadcast } from './broadcast.js';
import { SOCIAL_CAMPAIGNS } from '../data/social.js';
import { launchCampaign } from './social.js';
import { pressStatement, stancesFor } from './press.js';
import { VENUES, TRANSPORT, SPEECHES } from '../data/rally.js';
import { weatherFor } from './weather.js';
import { prepareDebate } from './debate.js';
import { generateSpeeches } from './speechgen.js';
import { staffMod } from './staff.js';
import { politicalVisit, foreignVisit, visitChance, relation } from './diplomacy.js';
import { DESTINATIONS } from '../data/diplomacy.js';
import { enactLaw, setMinimumWage, summit, addressNation, ensurePresidency, lawOptions } from './presidency.js';
import { policyById, publicSupport } from './government.js';
import { SIGNATURES_NEEDED } from './presidential.js';

const DELEGATE_WEIGHTS = { teskilat: 1.5, yonetim: 0.25, degisimci: 0.8, cekirdek: 0.7 };
const fmtSigned = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')}`;

const TOTAL_REG = () => 60_700_000;

export function provinceInfo(state, plate) {
  const units = state.units.filter(u => u.plate === +plate);
  const registered = units.reduce((a, u) => a + u.registered, 0);
  const seats = units.reduce((a, u) => a + u.seats, 0);
  const clusters = CLUSTERS.map((_, i) => units.reduce((a, u) => a + u.clusters[i] * u.registered, 0) / registered);
  return { plate: +plate, name: PROVINCE_BY_PLATE[plate].name, region: PROVINCE_BY_PLATE[plate].region, registered, seats, clusters, popShare: registered / TOTAL_REG() };
}

export function skill(state, s) {
  if (state.player.mode === 'join') return state.player.isLeader ? 0.55 : 0.3; // köklü parti kadrosu
  const fs = playerParty(state).founders.filter(f => f.skill === s);
  return fs.length ? Math.max(...fs.map(f => f.level)) : 0;
}

function diff(state) { return DIFFICULTY[state.difficulty] || DIFFICULTY.zor; }

// Tekrar cezası: aynı eylem türü ve aynı il arka arkaya kullanıldıkça etki düşer
export function fatigue(state, type, plate) {
  const t = state.adapt.types[type] || 0;
  const p = plate ? (state.adapt.provs[plate] || 0) : 0;
  return 1 / (1 + 0.025 * t) / (1 + 0.45 * p);
}
function bumpFatigue(state, type, plate) {
  state.adapt.types[type] = (state.adapt.types[type] || 0) + 1;
  if (plate) state.adapt.provs[plate] = (state.adapt.provs[plate] || 0) + 1;
}

export function topicFit(state, plate, topic) {
  const info = provinceInfo(state, plate);
  let w = 0;
  CLUSTERS.forEach((c, i) => { w += info.clusters[i] * (c.priorities[topic] || 0); });
  let fit = 0.5 + 2.2 * w; // ortalama öncelik ≈ 0.2 → 0.94
  if (topic === 'ekonomi') fit *= (1 + 0.3 * skill(state, 'ekonomist')) * charMod(state, 'economy') * staffMod(state, 'economy');
  if (topic === 'hizmet') fit *= charMod(state, 'service');
  return fit;
}

// Partinin bir ildeki kümelere ideolojik uyumu (0–1)
export function ideologicalFit(state, plate, party = playerParty(state)) {
  const info = provinceInfo(state, plate);
  let f = 0;
  CLUSTERS.forEach((c, i) => { f += info.clusters[i] * Math.exp(-c.lambda * ideologyDistance(c.ideo, party.ideology)); });
  return f;
}

function addCamp(state, plate, partyId, v) {
  const c = state.camp[plate] || (state.camp[plate] = {});
  c[partyId] = (c[partyId] || 0) + v;
}
function addRecognition(p, v) { p.recognition = clamp(p.recognition + v * (1 - p.recognition), 0, 1); }
function gaffeChance(state, base) {
  const trained = state.flags.trainedUntil && state.flags.trainedUntil >= state.date ? 0.5 : 1;
  return base * trained * (1 - 0.5 * skill(state, 'iletisimci')) * charMod(state, 'gaffe') * staffMod(state, 'gaffe');
}

const R = (a, b, d = 2) => `${a >= 0 ? '+' : ''}${a.toFixed(d).replace('.', ',')} … ${b >= 0 ? '+' : ''}${b.toFixed(d).replace('.', ',')}`;

const CHANNELS = {
  iktidara_yakin: { label: 'İktidara yakın kanal', reach: 1.0, audience: 'muhafazakar' },
  muhalif: { label: 'Muhalif kanal', reach: 0.6, audience: 'laik_kentli' },
  tarafsiz: { label: 'Tarafsız haber kanalı', reach: 0.5, audience: 'kararsiz' },
  yerel: { label: 'Yerel TV / radyo (il seç)', reach: 0.15, audience: null },
};
export { CHANNELS };

function channelFriendliness(state, ch) {
  if (!CHANNELS[ch].audience) return 0.7;
  const cl = CLUSTERS.find(c => c.id === CHANNELS[ch].audience);
  return Math.exp(-2 * ideologyDistance(cl.ideo, playerParty(state).ideology));
}

// ---------- Eylem tanımları ----------
export const ACTIONS = [
  // --- Kurultay öncesi (katıl modu) ---
  { id: 'signatures', cat: 'Kurultay', icon: '✍️', label: 'İmza topla', ap: 1, preKurultay: true,
    desc: 'Aday olabilmek için delegelerin imzası gerekir. Son tarih kurultaydan iki hafta önce.',
    cost: () => 40000, personal: true,
    estimate(state) {
      const k = state.player.kurultay;
      const cap = k.support * 1.6 + 6;
      const g = Math.max(0, Math.min(cap - k.signatures, 3.2 * (0.5 + k.support / 40) * diff(state).effect * charMod(state, 'delegates') * fatigue(state, 'signatures')));
      return { signatures: [g * 0.6, g * 1.3], cap };
    },
    run(state, prm, rng) {
      const k = state.player.kurultay, e = this.estimate(state);
      const d = Math.min(rng.range(...e.signatures), Math.max(0, e.cap - k.signatures));
      k.signatures = clamp(k.signatures + d, 0, 100);
      bumpFatigue(state, 'signatures');
      return { title: 'İmza kampanyası', lines: [`İmza veren delege oranı: %${k.signatures.toFixed(1).replace('.', ',')} (gereken %${Math.round(k.sigNeed * 100)})`,
        d < e.signatures[0] ? 'Seni desteklemeyen delegeler imza vermiyor; önce desteğini artır.' : 'Delegeler imza listesine adını yazdı.'] , anim: { kind: 'signatures', value: k.signatures, need: k.sigNeed * 100 } };
    } },
  { id: 'delegates', cat: 'Kurultay', icon: '🤝', label: 'Delegelerle görüş', ap: 1, preKurultay: true,
    params: ['province'], desc: 'İl delegeleriyle birebir görüşme. En çok il başkanlarını ve teşkilatı etkiler; büyük illerin delegesi daha çok.',
    cost: () => 60000, personal: true,
    estimate(state, { province }) {
      const info = provinceInfo(state, province);
      const base = (0.7 + 15 * info.seats / 600) * diff(state).effect * fatigue(state, 'delegates', province)
        * charMod(state, 'delegates') * (isHometown(state, province) ? 1.5 : 1);
      const k = state.player.kurultay;
      const w = DELEGATE_WEIGHTS;
      const approx = k.factions.reduce((a, f) => a + f.weight * base * (w[f.id] ?? 1) * (1 - f.support / 92), 0);
      return { support: [approx * 0.6, approx * 1.4], base };
    },
    run(state, prm, rng) {
      const e = this.estimate(state, prm);
      const k = state.player.kurultay;
      const before = k.support;
      bumpAll(k, e.base * rng.range(0.6, 1.4), DELEGATE_WEIGHTS);
      bumpFatigue(state, 'delegates', prm.province);
      const name = PROVINCE_BY_PLATE[prm.province].name;
      return { title: `${name} delegeleriyle görüştün`, lines: [`Toplam delege desteği ${fmtSigned(k.support - before)} puan`, isHometown(state, prm.province) ? 'Memleketinde hemşehrilerin seni bağrına bastı.' : 'En çok il ve ilçe başkanları etkilendi.'] , anim: { kind: 'delegates', change: k.support - before, support: k.support, province: name, color: playerParty(state).color } };
    } },
  { id: 'vision', cat: 'Kurultay', icon: '🎙️', label: 'Vizyon konuşması (canlı yayın)', ap: 1, preKurultay: true,
    desc: 'Canlı yayında sunucunun üç sorusunu cevapla. Her cevap hiziplerin delege oyunu anlık değiştirir.', cost: () => 0, personal: true,
    estimate() { return { live: true }; },
    run(state, prm, rng) {
      bumpFatigue(state, 'vision');
      return { interactive: 'broadcast', broadcast: prepareBroadcast(state, 'kurultay', 'tarafsiz', rng), title: 'Canlı yayın', lines: [] };
    } },
  { id: 'faction', cat: 'Kurultay', icon: '♟️', label: 'Hizip liderleriyle pazarlık', ap: 2, preKurultay: true, params: ['faction'],
    desc: 'Bir hizbin desteğini yönetimde yer sözüyle al. Diğer hizipler kıskanır, verdiğin sözler genel başkan olunca iç huzuru zorlar.', cost: () => 150000, personal: true,
    estimate(state, { faction = 'teskilat' }) {
      const k = state.player.kurultay, f = k.factions.find(x => x.id === faction);
      const b = 5 * diff(state).effect * fatigue(state, 'faction:' + faction) * charMod(state, 'faction') * (1 - (f?.support || 0) / 92);
      return { factionGain: [b * 0.5, b * 1.3], weight: f?.weight || 0, unity: [-4, -1] };
    },
    run(state, prm, rng) {
      const k = state.player.kurultay, e = this.estimate(state, prm);
      const before = k.support;
      bumpFaction(k, prm.faction, rng.range(...e.factionGain) / Math.max(0.05, 1 - (k.factions.find(x => x.id === prm.faction).support) / 92));
      for (const f of k.factions) if (f.id !== prm.faction) bumpFaction(k, f.id, -rng.range(0.2, 0.8));
      k.promises++;
      const u = rng.range(...e.unity);
      playerParty(state).unity = clamp(playerParty(state).unity + u, 0, 100);
      bumpFatigue(state, 'faction:' + prm.faction);
      const fl = k.factions.find(x => x.id === prm.faction).label;
      return { title: `${fl} ile pazarlık`, lines: [`Toplam delege desteği ${fmtSigned(k.support - before)} puan`, 'Diğer hizipler bu pazarlıktan rahatsız oldu.', `Verilen söz sayısı: ${k.promises}`] , anim: { kind: 'faction', faction: fl, change: k.support - before, support: k.support, color: playerParty(state).color } };
    } },

  // --- Saha ---
  { id: 'rally', cat: 'Saha', icon: '📣', label: 'Miting', ap: 2, params: ['province', 'venue', 'topic', 'speech', 'tone', 'transport'],
    desc: 'İl, mekân, konuşma metni ve lojistiği seç. Hava durumu ve rakip mitingleri katılımı etkiler; dolmayan meydan manşet olur.',
    cost: (state, { province, venue = 'meydan', transport = 'yok' } = {}) => {
      const v = VENUES.find(x => x.id === venue) || VENUES[0], t = TRANSPORT.find(x => x.id === transport) || TRANSPORT[0];
      return Math.round((150000 + 1_600_000 * Math.sqrt(provinceInfo(state, province || 34).popShare)) * v.cost * (1 + t.cost) * staffMod(state, 'rallyCost'));
    },
    estimate(state, { province, venue = 'meydan', topic = 'ekonomi', speech, tone = 'uzlasmaci', transport = 'yok' }) {
      const p = playerParty(state), info = provinceInfo(state, province);
      const v = VENUES.find(x => x.id === venue) || VENUES[0], t = TRANSPORT.find(x => x.id === transport) || TRANSPORT[0];
      const opts = generateSpeeches(state, province, topic);
      const sp = opts.find(x => x.id === speech) || opts[0];
      const org = p.orgs[province] || 0;
      const quality = 0.6 + 0.5 * org + 0.3 * skill(state, 'saha');
      // konu + konuşma metninin ildeki seçmen kümelerine uyumu
      let spFit = 0;
      CLUSTERS.forEach((c, i) => { spFit += info.clusters[i] * (sp.audience[c.id] || 0); });
      let consistency = 1;
      for (const [ax, dir] of Object.entries(sp.axis || {})) consistency *= 1 + 0.35 * dir * (p.ideology[ax] || 0);
      const fit = topicFit(state, province, topic) * (0.7 + 0.9 * spFit) * clamp(consistency, 0.6, 1.35);
      const toneM = tone === 'sert' ? 1.2 * charMod(state, 'sert') : 1.0;
      const f = fatigue(state, 'rally', province);
      const home = isHometown(state, province) ? 1.4 : 1;
      const weather = weatherFor(state, province, info.region);
      const clash = (state.flags.rivalRallies || []).filter(r => r.plate === +province && daysBetween(r.date, state.date) <= 7).map(r => state.parties[r.party]?.short).filter(Boolean);
      const clashM = clash.length ? 0.78 : 1;
      const wM = v.open ? weather.mult : 1;
      const camp = 0.12 * diff(state).effect * quality * fit * toneM * f * charMod(state, 'rally') * home * v.effect * clashM;
      const rec = (0.003 + 0.012 * Math.sqrt(info.popShare)) * (0.5 + p.media) * diff(state).effect * f * (v.id === 'salon' ? 0.6 : 1) * clashM;
      const crowd = info.registered * 0.004 * (0.15 + p.recognition) * (0.25 + org) * (1 + 0.3 * skill(state, 'saha')) * t.crowd * wM * clashM * staffMod(state, 'crowd');
      const capacity = v.id === 'salon' ? clamp(info.registered * 0.0008, 1500, 9000) : Math.max(2500, info.registered * 0.004 * v.cap);
      return { camp: [camp * 0.6, camp * 1.3], recognition: [rec * 0.7, rec * 1.3], crowd, capacity, fill: crowd / capacity, fit, weather: v.open ? weather : null, clash,
        risk: gaffeChance(state, tone === 'sert' ? 0.1 : 0.05), transportRisk: t.risk * staffMod(state, 'scandal'), fatigue: f, speech: sp, venue: v };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      const name = PROVINCE_BY_PLATE[prm.province].name;
      const crowd = Math.round(Math.min(e.capacity * 1.15, e.crowd * rng.range(0.6, 1.4)) / 50) * 50;
      const fill = crowd / e.capacity;
      const lines = [];
      let camp = rng.range(...e.camp), rec = rng.range(...e.recognition);
      let title = `${name} mitingi`, bad = false, empty = false, packed = false;
      if (fill < 0.3) {
        empty = true; camp *= 0.45; bad = true; p.momentum -= 0.02;
        title = e.venue.id === 'salon' ? `${loc(name)} salon yarı boş kaldı` : `${loc(name)} meydan boş kaldı`;
        addNews(state, 'player', `Manşet: "${p.short} mitinginde sandalyeler boş kaldı" (${name})`);
      } else if (fill > 0.9) {
        packed = true; camp *= 1.2; p.momentum += 0.02;
        title = e.venue.id === 'salon' ? `${loc(name)} salon tıklım tıklım` : `${loc(name)} meydan doldu taştı`;
        addNews(state, 'player', `${p.short}, ${loc(name)} ${e.venue.id === 'salon' ? 'salonu doldurdu' : 'meydanı doldurdu'}`);
      } else addNews(state, 'player', `${p.short} lideri ${state.player.name}, ${loc(name)} konuştu: “${e.speech.text}”`);
      addCamp(state, prm.province, p.id, camp);
      addRecognition(p, rec);
      lines.push(`${e.venue.label} · katılım yaklaşık ${fmtInt(Math.max(crowd, 100))} kişi (doluluk %${Math.round(Math.min(1.15, fill) * 100)})`);
      lines.push(`İl kampanya etkisi +${camp.toFixed(2).replace('.', ',')}`, `Tanınırlık +${pct(rec, 2)}`);
      if (e.weather && e.weather.mult < 1) lines.push(`${e.weather.icon} ${e.weather.label} hava katılımı düşürdü.`);
      if (e.clash.length) lines.push(`Aynı hafta ${e.clash[0]} da bu ilde miting yaptı; ilgi bölündü.`);
      if (e.fit > 1.1) lines.push('Konuşman bu ilin seçmenine çok iyi oturdu.');
      else if (e.fit < 0.8) lines.push('Konuşman bu ilde pek karşılık bulmadı.');
      let gaffe = false, transport = false;
      if (rng.chance(e.transportRisk)) {
        transport = true; bad = true; p.leader.image = clamp(p.leader.image - 0.02, 0, 1); p.momentum -= 0.02;
        lines.push('⚠️ Mitinge otobüslerle taşıma yapıldığı haberlere yansıdı.');
        addNews(state, 'player', `${p.short} mitingine ilçelerden otobüslerle taşıma yapıldığı iddia edildi`);
      }
      if (rng.chance(e.risk)) {
        gaffe = true;
        const im = rng.range(0.015, 0.04);
        p.leader.image = clamp(p.leader.image - im, 0, 1); p.momentum -= 0.03; state.stats.gaffes++;
        lines.push(`⚠️ Konuşmadaki bir ifade tartışma yarattı (imaj −${pct(im, 1)})`);
        addNews(state, 'player', `${p.short} liderinin ${name} konuşmasındaki sözler tartışma yarattı`);
        bad = true;
      }
      if (e.fatigue < 0.75) lines.push('Bu ilde seçmen yorgunluğu var; etki azaldı.');
      bumpFatigue(state, 'rally', prm.province);
      state.stats.rallies++;
      state.flags.lastPlayerProvs = [prm.province, ...(state.flags.lastPlayerProvs || [])].slice(0, 6);
      return { title, bad, lines, anim: { kind: 'rally', crowd: Math.max(crowd, 100), capacity: e.capacity, province: name, empty, packed, gaffe, transport,
        color: p.color, short: p.short, fit: e.fit, venue: e.venue.id, weather: e.weather?.id || null, speech: e.speech.text } };
    } },
  { id: 'visit', cat: 'Saha', icon: '🏪', label: 'Esnaf, STK ve mahalle ziyareti', ap: 1, params: ['province'],
    desc: 'Düşük maliyetli yüz yüze temas. Yerel güven ve teşkilat moralini artırır.',
    cost: () => 40000,
    estimate(state, { province }) {
      const f = fatigue(state, 'visit', province);
      const camp = 0.05 * diff(state).effect * (1 + 0.3 * skill(state, 'saha')) * f * charMod(state, 'visit') * staffMod(state, 'field') * (isHometown(state, province) ? 1.4 : 1);
      return { camp: [camp * 0.6, camp * 1.3], org: [0.005, 0.02], fatigue: f };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      const camp = rng.range(...e.camp);
      addCamp(state, prm.province, p.id, camp);
      if (p.orgs[prm.province]) p.orgs[prm.province] = clamp(p.orgs[prm.province] + rng.range(...e.org), 0, 1);
      addRecognition(p, 0.001);
      bumpFatigue(state, 'visit', prm.province);
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} ziyareti`, lines: [`İl kampanya etkisi +${camp.toFixed(2).replace('.', ',')}`, p.orgs[prm.province] ? 'Teşkilat morali yükseldi.' : 'Bu ilde teşkilatın yok; kalıcı etki sınırlı.'] , anim: { kind: 'visit', province: PROVINCE_BY_PLATE[prm.province].name, color: p.color } };
    } },

  // --- Medya ---
  { id: 'tv', cat: 'Medya', icon: '📺', label: 'Televizyon programı', ap: 1, params: ['channel'],
    desc: 'Kanalın çizgisi önemli: dost kanalda mesaj rahat geçer ama yeni seçmen az; karşıt kanalda sorular serttir.',
    cost: () => 0,
    available(state, { channel } = {}) {
      const p = playerParty(state);
      if (channel === 'iktidara_yakin' && p.media < 0.3 && p.recognition < 0.4) return 'Bu kanallardan davet alacak kadar tanınmıyorsun.';
      return true;
    },
    estimate(state, { channel = 'tarafsiz' }) {
      const p = playerParty(state), ch = CHANNELS[channel];
      const fr = channelFriendliness(state, channel);
      const f = fatigue(state, 'tv:' + channel);
      const rec = 0.013 * ch.reach * (1.3 - 0.5 * fr) * diff(state).effect * f * (1 + 0.3 * skill(state, 'iletisimci'));
      const mom = 0.03 * ch.reach * (0.4 + fr) * diff(state).effect * f;
      return { recognition: [rec * 0.6, rec * 1.3], momentum: [mom * 0.3, mom * 1.2], risk: gaffeChance(state, 0.04 + 0.1 * (1 - fr)), friendly: fr };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm), ch = CHANNELS[prm.channel];
      bumpFatigue(state, 'tv:' + prm.channel);
      state.stats.tv++;
      // Görünürlük kazancının yarısı yayına çıkmakla gelir, kalanı cevaplara bağlı
      addRecognition(p, rng.range(...e.recognition) * 0.6);
      if (prm.channel === 'yerel' && prm.province) addCamp(state, prm.province, p.id, 0.05 * diff(state).effect);
      return { interactive: 'broadcast', broadcast: prepareBroadcast(state, 'genel', prm.channel, rng), title: `${ch.label} konuğu oldun`, lines: [] };
    } },
  { id: 'debate', cat: 'Medya', icon: '🎤', label: 'Liderler tartışması (canlı)', ap: 2, cost: () => 0,
    desc: 'Seçim kampanyasında bir kez: en güçlü iki rakip parti lideriyle ortak canlı yayın. Kazanan anketlerde sıçrar.',
    available(state) {
      if (state.phase !== 'campaign') return 'Yalnızca seçim kampanyası döneminde (son 28 gün) yapılır.';
      if (state.flags.debateDone === state.nextElection) return 'Bu seçim için tartışma yapıldı.';
      return true;
    },
    estimate() { return { live: true, questions: 4 }; },
    run(state, prm, rng) {
      return { interactive: 'debate', debate: prepareDebate(state, rng), title: 'Liderler tartışması', lines: [] };
    } },
  { id: 'press', cat: 'Medya', icon: '🗞️', label: 'Basın açıklaması', ap: 1, params: ['topic', 'stance'],
    desc: 'Bir konuda tutum açıkla. Gazeteler, vatandaşlar, hükümet ve rakipler tepki verir. Tutumun hedef kitlesi farklıdır.', cost: () => 0,
    estimate(state, { topic = 'ekonomi', stance }) {
      const p = playerParty(state), f = fatigue(state, 'press');
      const st = stancesFor(topic).find(x => x.id === stance) || stancesFor(topic)[0];
      const reach = 0.3 + p.media + p.recognition;
      const pw = 0.03 * reach * diff(state).effect * f;
      const prev = state.flags.pressStances?.[topic];
      return { cluster: [pw * 0.4, pw * 1.3], audience: st.audience, recognition: [0.002, 0.006], uturn: prev && prev !== st.id, risk: st.tone === 'sert' ? gaffeChance(state, 0.08) : 0 };
    },
    run(state, prm, rng) {
      prm = { topic: 'ekonomi', ...prm };
      const f = fatigue(state, 'press');
      bumpFatigue(state, 'press');
      const r = pressStatement(state, prm.topic, prm.stance, rng, f);
      const lines = [`Hedef kitlede ivme +${r.power.toFixed(3).replace('.', ',')}`];
      if (r.uturn) lines.push('⚠️ Bu konuda daha önce farklı bir tutum almıştın: "U dönüşü" yorumları yapıldı.');
      if (r.gaffe) lines.push('⚠️ Sert bir ifaden tepki çekti.');
      if (r.score > 0.3) addNews(state, 'player', `${playerParty(state).short} açıklaması gündemde: “${r.stance.quote}”`);
      return { title: `Basın açıklaması: ${TOPICS.find(t => t.id === prm.topic).label}`, bad: r.uturn || r.gaffe, lines,
        anim: { kind: 'press', quote: r.stance.quote, stance: r.stance.label, reactions: r.reactions, score: r.score } };
    } },

  // --- Sosyal medya: her kampanya ayrı eylem ---
  ...SOCIAL_CAMPAIGNS.map(def => ({
    id: 'social:' + def.id, cat: 'Sosyal medya', icon: def.icon, label: def.label, ap: def.ap, params: def.params,
    desc: def.desc, social: def, cost: () => def.cost,
    available(state) {
      const run = (state.socialCampaigns || []).find(c => c.id === def.id);
      return run ? `Bu kampanya zaten sürüyor (${Math.ceil(run.weeksLeft)} hafta kaldı).` : true;
    },
    estimate(state) {
      const p = playerParty(state), f = fatigue(state, 'social');
      const dig = skill(state, 'dijital');
      return { audience: def.audience, weeks: def.weeks, cluster: def.power ? [def.power * 0.75 * diff(state).effect * f, def.power * 1.25 * diff(state).effect * f] : null,
        recognition: [def.rec * 0.6 * (1 - p.recognition), def.rec * 1.3 * (1 - p.recognition)], viral: def.viral * (1 + dig), backfire: def.backfire, shield: def.shield };
    },
    run(state, prm, rng) {
      const f = fatigue(state, 'social');
      bumpFatigue(state, 'social');
      const { campaign: c } = launchCampaign(state, def, prm, rng, f);
      const lines = [];
      if (c.viral) lines.push('🔥 Kampanya viral oldu! Etkisi 2,5 katına çıktı.');
      if (c.backfire) lines.push('⚠️ Kampanya ters tepti; alay konusu oldu, etkisi düşük kaldı.');
      if (def.shield) lines.push(`${def.weeks} hafta boyunca rakip saldırılarının etkisi yarıya inecek.`);
      lines.push(`İlk hafta izlenme: ${fmtInt(c.views)}`, def.weeks > 1 ? `Kampanya ${def.weeks} hafta sürecek; Kampanya sekmesinden izleyebilirsin.` : 'Tek haftalık kampanya tamamlandı.');
      if (c.province) lines.push(`${PROVINCE_BY_PLATE[c.province].name} için yerel etki eklendi.`);
      return { title: def.label, bad: c.backfire, lines,
        anim: { kind: 'social', def: def.id, viral: c.viral, backfire: c.backfire, views: c.views, likes: c.likes, shares: c.shares, comments: c.comments } };
    },
  })),

  // --- Diplomasi ---
  { id: 'polvisit', cat: 'Diplomasi', icon: '🤝', label: 'Siyasi ziyaret', ap: 1, params: ['target'],
    desc: 'Bir parti genel başkanını ya da Cumhurbaşkanını ziyaret et. İlişkiler ittifak ihtimalini artırır, rakip saldırılarını yumuşatır.',
    cost: () => 30000,
    available(state, { target } = {}) { if (target && target !== 'cb' && !state.parties[target]) return 'Geçersiz hedef.'; return true; },
    estimate(state, { target = 'cb' }) { return { visitChance: visitChance(state, target), relation: target === 'cb' ? null : relation(state, target) }; },
    run(state, prm, rng) {
      const r = politicalVisit(state, prm.target || 'cb', rng);
      const lines = r.ok ? [`Görüşme ${r.mood} geçti.`, r.relation !== null ? `İlişki puanı: ${r.relation} (+${Math.round(r.delta)})` : 'Devlet adamlığı imajın güçlendi.', ...(r.baseCost ? [`Kendi tabanında bazı itirazlar oldu (iç huzur −${r.baseCost.toFixed(0)})`] : [])]
        : ['Randevu talebine olumlu yanıt gelmedi.', ...(r.relation !== null ? [`İlişki puanı: ${r.relation}`] : [])];
      const t = prm.target && prm.target !== 'cb' ? state.parties[prm.target] : null;
      return { title: r.ok ? `${r.host} ile görüşme` : 'Ziyaret gerçekleşmedi', bad: !r.ok, lines,
        anim: { kind: 'polvisit', ok: r.ok, mood: r.mood, host: r.host, hostColor: t?.color || '#C8102E', hostShort: t?.short || 'TC', color: playerParty(state).color } };
    } },
  { id: 'foreign', cat: 'Diplomasi', icon: '✈️', label: 'Dış temas', ap: 2, params: ['destination'],
    desc: 'Yurt dışı temasları uluslararası itibarını artırır. Her başkentin seçmen kümelerinde karşılığı farklıdır.',
    cost: () => 400000,
    estimate(state, { destination = 'bruksel' }) {
      const d = DESTINATIONS.find(x => x.id === destination);
      const aud = {};
      for (const c of CLUSTERS) { let a = d.dis * c.ideo.dis; if (d.milli) a += d.milli * c.ideo.milli * 0.5; if (d.din) a += d.din * c.ideo.din * 0.5; if (a > 0.15) aud[c.id] = a; }
      return { audience: aud, intl: true };
    },
    run(state, prm, rng) {
      const r = foreignVisit(state, prm.destination || 'bruksel', rng);
      const lines = [r.success ? 'Temaslar başarılı geçti; uluslararası basında yer aldı.' : 'Temaslar sınırlı ilgi gördü.', `Uluslararası itibar: ${Math.round(r.intlRep)}/100`];
      if (r.likes.length) lines.push(`Olumlu karşılayanlar: ${r.likes.join(', ')}`);
      if (r.dislikes.length) lines.push(`Mesafeli kalanlar: ${r.dislikes.join(', ')}`);
      return { title: `${r.dest.city} temasları`, bad: !r.success, lines, anim: { kind: 'foreign', dest: r.dest.id, city: r.dest.city, icon: r.dest.icon, ok: r.success, color: playerParty(state).color } };
    } },

  // --- Cumhurbaşkanlığı (yalnızca cumhurbaşkanıyken) ---
  { id: 'cbEconomy', cat: 'Cumhurbaşkanlığı', icon: '🏦', label: 'Ekonomi yönetimi: para politikası', ap: 1, presidentOnly: true, params: ['econStance'], cost: () => 0,
    desc: 'Merkez Bankası\'na yaklaşımını belirle. Sıkı politika enflasyonu düşürür ama büyümeyi yavaşlatır; gevşek politika tersini yapar.',
    estimate(state, { econStance = 'dengeli' }) { return { econNote: { siki: 'Enflasyon hedefi düşer, büyüme ve onay biraz azalır', dengeli: 'Mevcut gidişat korunur', gevsek: 'Büyüme artar; enflasyon ve kur yükselir' }[econStance] }; },
    run(state, prm) {
      const p = ensurePresidency(state); p.econStance = prm.econStance || 'dengeli';
      if (p.econStance === 'siki') state.economy.target = Math.max(8, state.economy.target - 3);
      if (p.econStance === 'gevsek') state.economy.target += 3;
      addNews(state, 'gov', `Cumhurbaşkanlığı ekonomi yönetiminde ${{ siki: 'sıkı', dengeli: 'dengeli', gevsek: 'gevşek' }[p.econStance]} para politikasına geçildiğini açıkladı`);
      return { title: 'Ekonomi programı güncellendi', lines: [`Para politikası: ${{ siki: 'Sıkı', dengeli: 'Dengeli', gevsek: 'Gevşek' }[p.econStance]}`, 'Merkez Bankası her ay bu yaklaşıma göre faiz kararı verecek.'], anim: { kind: 'cb', icon: '🏦', label: 'Ekonomi programı' } };
    } },
  { id: 'cbLaw', cat: 'Cumhurbaşkanlığı', icon: '📜', label: 'Kanun teklifi gönder', ap: 2, presidentOnly: true, params: ['policy'], cost: () => 0,
    desc: 'Meclis\'e kanun teklifi gönder. Geçmesi için ittifakının sandalye çoğunluğu gerekir; kamuoyu desteği onay oranını etkiler.',
    estimate(state, { policy }) {
      const pol = policyById(policy) || lawOptions(state)[0];
      const seats = state.government.reduce((a, id) => a + (state.parliament.seats[id] || 0), 0);
      return { lawSupport: publicSupport(state, pol), seats, need: pol.needs || 301, audience: pol.pro };
    },
    run(state, prm, rng) {
      const r = enactLaw(state, prm.policy || lawOptions(state)[0].id, rng);
      const pol = policyById(prm.policy || lawOptions(state)[0].id);
      return { title: r.passes ? `Kabul edildi: ${pol.title}` : `Reddedildi: ${pol.title}`, bad: !r.passes,
        lines: [`Meclis'te ittifak sandalyesi: ${r.seats} (gereken ${r.need})`, `Kamuoyu desteği: %${Math.round(r.support * 100)}`, ...(r.passes ? [`Onay oranı ${r.approvalDelta >= 0 ? '+' : ''}${r.approvalDelta.toFixed(1).replace('.', ',')}`] : ['Onay oranı −2'])],
        anim: { kind: 'cb', icon: '📜', label: pol.title, ok: r.passes } };
    } },
  { id: 'cbWage', cat: 'Cumhurbaşkanlığı', icon: '💵', label: 'Asgari ücret kararı', ap: 1, presidentOnly: true, params: ['wage'], cost: () => 0,
    desc: 'Yılda bir kez asgari ücret artışını belirle. Yüksek artış onay getirir ama enflasyonu körükler.',
    available(state) { return state.presidency?.wageYear === state.date.slice(0, 4) ? 'Bu yıl asgari ücret belirlendi.' : true; },
    estimate(state, { wage = 40 }) { return { econNote: `Enflasyona etkisi yaklaşık +${((wage - 30) * 0.08).toFixed(1).replace('.', ',')} puan` }; },
    run(state, prm, rng) {
      const r = setMinimumWage(state, prm.wage || 40, rng);
      return { title: `Asgari ücrete %${prm.wage || 40} zam`, lines: [`Onay oranı ${r.approvalDelta >= 0 ? '+' : ''}${r.approvalDelta.toFixed(1).replace('.', ',')}`, `Enflasyon etkisi +${r.infl.toFixed(1).replace('.', ',')} puan`], anim: { kind: 'cb', icon: '💵', label: 'Asgari ücret' } };
    } },
  { id: 'cbSummit', cat: 'Cumhurbaşkanlığı', icon: '🛬', label: 'Resmi ziyaret ve zirve', ap: 2, presidentOnly: true, params: ['destination'], cost: () => 0,
    desc: 'Devlet başkanı olarak resmi ziyaret. Dış ilişkileri doğrudan iyileştirir; Dışişleri Bakanının yetkinliği önemlidir.',
    estimate() { return { econNote: 'İlgili dış ilişki puanı +2 … +8' }; },
    run(state, prm, rng) {
      const r = summit(state, prm.destination || 'bruksel', rng);
      return { title: `${r.dest.city} resmi ziyareti`, bad: !r.ok, lines: [r.ok ? 'Anlaşmalar imzalandı; ilişkiler güçlendi.' : 'Ziyaret beklenen sonucu vermedi.'], anim: { kind: 'foreign', dest: r.dest.id, city: r.dest.city, icon: r.dest.icon, ok: r.ok, color: playerParty(state).color } };
    } },
  { id: 'cbAddress', cat: 'Cumhurbaşkanlığı', icon: '🇹🇷', label: 'Ulusa sesleniş', ap: 1, presidentOnly: true, params: ['topic'], cost: () => 0,
    desc: 'Tüm kanallardan canlı yayınla ulusa seslen. Onay oranını yükseltir; sık yapılırsa etkisi azalır.',
    estimate() { return { econNote: 'Onay +0,5 … +3,5 (6 haftada birden sık yapılırsa azalır)' }; },
    run(state, prm, rng) {
      const r = addressNation(state, prm.topic, rng);
      return { title: 'Ulusa sesleniş', lines: [`Onay oranı +${r.approvalDelta.toFixed(1).replace('.', ',')}`, ...(r.fatigue ? ['Son seslenişin üzerinden az zaman geçti; etki sınırlı kaldı.'] : [])], anim: { kind: 'cb', icon: '🇹🇷', label: 'Ulusa sesleniş' } };
    } },
  { id: 'cbSignatures', cat: 'Teşkilat', icon: '🗳️', label: 'Cumhurbaşkanlığı adaylığı için imza', ap: 2, params: [], cost: () => 200000,
    desc: 'Partin %5\'in altındaysa aday olabilmek için 100 bin seçmen imzası gerekir. Seçimden önceki son yılda yapılabilir.',
    available(state) {
      const days = (Date.parse(state.nextElection) - Date.parse(state.date)) / 86400000;
      if (days > 365) return 'Seçime bir yıldan az kaldığında başlar.';
      if ((state.flags.cbSignatures || 0) >= SIGNATURES_NEEDED) return 'Yeterli imza toplandı.';
      return true;
    },
    estimate(state) {
      const p = playerParty(state);
      const g = (8000 + 60000 * p.recognition + 0.08 * p.members + 4000 * Object.keys(p.orgs).length / 10) * diff(state).effect;
      return { signaturesCb: [g * 0.6, g * 1.3] };
    },
    run(state, prm, rng) {
      const e = this.estimate(state);
      const g = Math.round(rng.range(...e.signaturesCb));
      state.flags.cbSignatures = Math.min(SIGNATURES_NEEDED * 1.2, (state.flags.cbSignatures || 0) + g);
      return { title: 'Adaylık imza kampanyası', lines: [`${fmtInt(g)} yeni imza`, `Toplam: ${fmtInt(state.flags.cbSignatures)} / ${fmtInt(SIGNATURES_NEEDED)}`], anim: { kind: 'signatures', value: Math.min(100, state.flags.cbSignatures / SIGNATURES_NEEDED * 100), need: 100 } };
    } },

  // --- Teşkilat ---
  { id: 'buildOrg', cat: 'Teşkilat', icon: '🏢', label: 'İl teşkilatı kur', ap: 1, params: ['province'], foundOnly: true,
    desc: 'İl başkanlığı açar. Seçime girmek için en az 41 ilde teşkilat gerekir.',
    cost: (state) => Math.round(250000 * (1 - 0.3 * skill(state, 'orgutcu'))),
    available(state, { province } = {}) {
      const p = playerParty(state);
      if (province && (p.orgs[province] || p.building[province])) return 'Bu ilde teşkilat zaten var veya kuruluyor.';
      return true;
    },
    estimate(state) { return { weeks: skill(state, 'orgutcu') > 0.5 ? 2 : 3 }; },
    run(state, prm) {
      const p = playerParty(state), w = this.estimate(state).weeks;
      p.building[prm.province] = w;
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} il başkanlığı kuruluyor`, lines: [`${w} hafta içinde faaliyete geçecek.`] , anim: { kind: 'org', plates: [prm.province], label: 'İl başkanlığı açılışı', color: p.color } };
    } },
  { id: 'buildRegion', cat: 'Teşkilat', icon: '🗺️', label: 'Bölge teşkilat hamlesi', ap: 3, params: ['region'], foundOnly: true,
    desc: 'Bir bölgedeki teşkilatı olmayan tüm illerde aynı anda il başkanlığı kur (%10 indirimli).',
    cost(state, { region } = {}) {
      if (!region) return 0;
      const p = playerParty(state);
      const n = PROVINCES.filter(pv => pv.region === region && !p.orgs[pv.plate] && !p.building[pv.plate]).length;
      return Math.round(n * 250000 * 0.9 * (1 - 0.3 * skill(state, 'orgutcu')));
    },
    available(state, { region } = {}) {
      if (!region) return true;
      const p = playerParty(state);
      return PROVINCES.some(pv => pv.region === region && !p.orgs[pv.plate] && !p.building[pv.plate]) || 'Bu bölgede tüm iller kurulmuş.';
    },
    estimate(state) { return { weeks: skill(state, 'orgutcu') > 0.5 ? 3 : 4 }; },
    run(state, prm) {
      const p = playerParty(state), w = this.estimate(state).weeks;
      const list = PROVINCES.filter(pv => pv.region === prm.region && !p.orgs[pv.plate] && !p.building[pv.plate]);
      for (const pv of list) p.building[pv.plate] = w;
      return { title: `${prm.region} bölgesinde teşkilat hamlesi`, lines: [`${list.length} ilde il başkanlığı ${w} hafta içinde açılacak.`] , anim: { kind: 'org', plates: list.map(x => x.plate), label: `${prm.region} teşkilat hamlesi`, color: p.color } };
    } },
  { id: 'strengthenOrg', cat: 'Teşkilat', icon: '💪', label: 'Teşkilatı güçlendir', ap: 1, params: ['province'],
    desc: 'İlçe teşkilatları, gönüllü ağı ve sandık görevlileri. Oy ve sandık güvenliğine etki eder.',
    cost: (state, { province } = {}) => Math.round(120000 * (1 + (province ? (playerParty(state).orgs[province] || 0) : 0)) * (1 - 0.2 * skill(state, 'orgutcu'))),
    available(state, { province } = {}) {
      if (province && !playerParty(state).orgs[province]) return 'Önce il teşkilatı kurmalısın.';
      return true;
    },
    estimate(state, { province }) {
      const o = playerParty(state).orgs[province] || 0;
      const g = 0.12 * (1 - o) * (1 + 0.5 * skill(state, 'orgutcu'));
      return { org: [g * 0.7, g * 1.2], current: o };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      const g = rng.range(...e.org);
      p.orgs[prm.province] = clamp((p.orgs[prm.province] || 0) + g, 0, 1);
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} teşkilatı güçlendi`, lines: [`Teşkilat gücü ${pct(e.current, 0)} → ${pct(p.orgs[prm.province], 0)}`] , anim: { kind: 'strengthen', from: e.current, to: p.orgs[prm.province], province: PROVINCE_BY_PLATE[prm.province].name, color: p.color } };
    } },
  { id: 'members', cat: 'Teşkilat', icon: '🪪', label: 'Üye kampanyası', ap: 1, desc: 'Yeni üyeler aidat geliri ve gönüllü demektir.',
    cost: () => 80000,
    estimate(state) {
      const p = playerParty(state);
      const orgN = Object.keys(p.orgs).length;
      const poll = state.polls.length ? (state.polls[state.polls.length - 1].shares[p.id] || 0) : 0;
      const cap = 30000 + 6_000_000 * poll; // üye tavanı: partinin gücüyle orantılı — oyun varsayımı
      const m = (300 + 4000 * p.recognition + 40 * orgN) * diff(state).effect * fatigue(state, 'members') * Math.max(0.05, 1 - p.members / cap);
      return { members: [m * 0.5, m * 1.4] };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state);
      const m = Math.round(rng.range(...e.members));
      p.members += m; bumpFatigue(state, 'members');
      return { title: 'Üye kampanyası', lines: [`${fmtInt(m)} yeni üye`] , anim: { kind: 'members', count: m, total: p.members, color: p.color } };
    } },
  { id: 'fundraise', cat: 'Teşkilat', icon: '💰', label: 'Bağış kampanyası', ap: 1, desc: 'Bağış toplama yemeği ve kampanya. Küçük bir usulsüzlük riski var.',
    cost: () => 30000,
    estimate(state) {
      const p = playerParty(state);
      const poll = state.polls.length ? (state.polls[state.polls.length - 1].shares[p.id] || 0) : 0;
      const m = (150000 + 2_500_000 * p.recognition + 20_000_000 * poll) * (1 + 0.5 * skill(state, 'finansci')) * diff(state).money * fatigue(state, 'fundraise') * priceIndex(state) * charMod(state, 'fundraise');
      return { money: [m * 0.5, m * 1.4], risk: 0.05 * (1 - 0.7 * skill(state, 'hukukcu')) * charMod(state, 'scandal') * staffMod(state, 'scandal') };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state);
      const m = Math.round(rng.range(...e.money));
      p.money += m; bumpFatigue(state, 'fundraise');
      const lines = [`Toplanan bağış: ${fmtMoney(m)}`];
      let bad = false;
      if (rng.chance(e.risk)) {
        p.leader.image = clamp(p.leader.image - 0.03, 0, 1); p.momentum -= 0.04; bad = true;
        lines.push('⚠️ Bir bağışın kaynağı hakkında soru işaretleri doğdu; haberlere yansıdı.');
        addNews(state, 'player', `${p.short} hesabına yapılan bir bağışın kaynağı tartışma konusu oldu`);
      }
      return { title: 'Bağış kampanyası', bad, lines , anim: { kind: 'money', amount: m, bad, color: p.color } };
    } },
  { id: 'congress', cat: 'Teşkilat', icon: '🏛️', label: 'Büyük kongre düzenle', ap: 3, foundOnly: true,
    desc: 'Seçime katılabilmek için seçimden en az 6 ay önce büyük kongre yapılmış olmalı (en az 20 il teşkilatı gerekir — oyun kuralı).',
    cost: () => 1_200_000,
    available(state) {
      const p = playerParty(state);
      if (Object.keys(p.orgs).length < 20) return 'En az 20 il teşkilatı gerekiyor.';
      if (p.congressDate && addDays(p.congressDate, 365) > state.date) return 'Son kongrenin üzerinden en az 1 yıl geçmeli.';
      return true;
    },
    estimate() { return { unity: [3, 8], recognition: [0.01, 0.03] }; },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate();
      p.congressDate = state.date;
      const u = rng.range(...e.unity), r = rng.range(...e.recognition);
      p.unity = clamp(p.unity + u, 0, 100); addRecognition(p, r); p.momentum += 0.03;
      addNews(state, 'player', `${p.name} ilk büyük kongresini yaptı; ${state.player.name} genel başkanlığa seçildi`);
      return { title: 'Büyük kongre yapıldı', lines: ['Seçime katılım şartlarından biri sağlandı.', `Parti içi huzur +${u.toFixed(0)}`, `Tanınırlık +${pct(r, 1)}`] , anim: { kind: 'congress', color: p.color, short: p.short } };
    } },

  // --- Parti içi ---
  { id: 'meeting', cat: 'Parti içi', icon: '🗣️', label: 'Parti içi toplantı', ap: 1, desc: 'MYK ve il başkanlarıyla toplantı. İç huzuru artırır.',
    cost: () => 20000, estimate() { return { unity: [3, 8] }; },
    run(state, prm, rng) {
      const p = playerParty(state), u = rng.range(3, 8);
      p.unity = clamp(p.unity + u, 0, 100);
      return { title: 'Parti içi toplantı', lines: [`İç huzur +${u.toFixed(0)}`] , anim: { kind: 'meeting', color: p.color } };
    } },
  { id: 'training', cat: 'Parti içi', icon: '🎓', label: 'Kadro eğitimi', ap: 1, desc: '8 hafta boyunca gaf riskini yarıya indirir; soru-cevap provası.',
    cost: () => 250000, estimate() { return { weeks: 8 }; },
    run(state) {
      state.flags.trainedUntil = addDays(state.date, 56);
      return { title: 'Kadro eğitimi tamamlandı', lines: ['8 hafta boyunca gaf riski yarıya indi.'] , anim: { kind: 'training', color: playerParty(state).color } };
    } },
];

export function actionById(id) { return ACTIONS.find(a => a.id === id); }

export function availableActions(state) {
  const pre = state.player.mode === 'join' && !state.player.isLeader;
  return ACTIONS.filter(a => pre ? a.preKurultay : (!a.preKurultay && (!a.foundOnly || state.player.mode === 'found') && (!a.presidentOnly || state.player.isPresident)));
}

// Tüm maliyetler Haziran 2023 fiyatlarıyla tanımlı; oyun içi enflasyonla ölçeklenir
export function actionCost(state, action, prm = {}) { return Math.round(action.cost(state, prm) * priceIndex(state)); }

export function canRun(state, action, prm = {}) {
  if (state.player.ap < action.ap) return `Yeterli eylem puanı yok (${action.ap} gerekli).`;
  const cost = actionCost(state, action, prm);
  const purse = action.personal ? state.player.personalMoney : playerParty(state).money;
  if (cost > 0 && purse < cost) return `Yeterli para yok (${fmtMoney(cost)} gerekli).`;
  if (action.available) { const r = action.available(state, prm); if (r !== true) return r; }
  return true;
}

export function runAction(state, action, prm, rng) {
  const ok = canRun(state, action, prm);
  if (ok !== true) return { error: ok };
  const cost = actionCost(state, action, prm);
  if (action.personal) state.player.personalMoney -= cost; else playerParty(state).money -= cost;
  state.stats.moneySpent += cost;
  state.player.ap -= action.ap;
  const res = action.run(state, prm, rng);
  res.cost = cost;
  state.log.push({ date: state.date, action: action.id, prm, title: res.title });
  if (state.log.length > 300) state.log.shift();
  return res;
}

// Önizleme metni (arayüz için)
export function describeEstimate(state, action, prm) {
  const e = action.estimate(state, prm);
  const out = [];
  if (e.audience && Object.keys(e.audience).length) out.push(['Hedef kitle', Object.entries(e.audience).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.5).map(([k]) => CLUSTERS.find(c => c.id === k).label).join(', ') || 'Geniş kitle']);
  if (e.econNote) out.push(['Etki', e.econNote]);
  if (e.lawSupport !== undefined) out.push(['Kamuoyu desteği', pct(e.lawSupport, 0)], ['Meclis', `${e.seats} sandalye / gereken ${e.need}`]);
  if (e.signaturesCb) out.push(['Yeni imza', `${fmtInt(e.signaturesCb[0])} … ${fmtInt(e.signaturesCb[1])}`], ['Toplanan', `${fmtInt(state.flags.cbSignatures || 0)} / ${fmtInt(SIGNATURES_NEEDED)}`]);
  if (e.visitChance !== undefined) out.push(['Kabul ihtimali', pct(e.visitChance, 0)]);
  if (e.relation !== undefined && e.relation !== null) out.push(['Mevcut ilişki', `${e.relation} / 100`]);
  if (e.intl) out.push(['Uluslararası itibar', `şu an ${Math.round(state.flags.intlRep || 10)}/100`]);
  if (e.cluster) out.push(['Kitle etkisi', R(e.cluster[0], e.cluster[1], 3)]);
  if (e.shield) out.push(['Kalkan', 'Rakip saldırıları −%50']);
  if (e.backfire) out.push(['Ters tepme riski', pct(e.backfire, 0)]);
  if (e.uturn) out.push(['Uyarı', 'Bu konuda farklı tutum almıştın (U dönüşü riski)']);
  if (e.live) out.push(['Biçim', `Canlı yayın, ${e.questions || 3} soru`], ['Etki', e.questions ? 'Kazanan anketlerde sıçrar, kaybeden geriler' : 'Cevaplarına göre her hizipte anlık değişir']);
  if (e.support) out.push(['Delege desteği', R(e.support[0], e.support[1], 1) + ' puan']);
  if (e.signatures) out.push(['İmza', `+${e.signatures[0].toFixed(1).replace('.', ',')} … +${e.signatures[1].toFixed(1).replace('.', ',')} puan`]);
  if (e.factionGain) out.push(['Hizip desteği', `+${e.factionGain[0].toFixed(1).replace('.', ',')} … +${e.factionGain[1].toFixed(1).replace('.', ',')} (ağırlık %${Math.round(e.weight * 100)})`]);
  if (e.camp) out.push(['İl kampanya etkisi', R(e.camp[0], e.camp[1])]);
  if (e.recognition) out.push(['Tanınırlık', `+${pct(e.recognition[0], 2)} … +${pct(e.recognition[1], 2)}`]);
  if (e.momentum) out.push(['Ulusal ivme', R(e.momentum[0], e.momentum[1], 3)]);
  if (e.org) out.push(['Teşkilat gücü', `+${pct(e.org[0], 1)} … +${pct(e.org[1], 1)}`]);
  if (e.members) out.push(['Yeni üye', `${fmtInt(e.members[0])} … ${fmtInt(e.members[1])}`]);
  if (e.money) out.push(['Bağış', `${fmtMoney(e.money[0])} … ${fmtMoney(e.money[1])}`]);
  if (e.unity) out.push(['İç huzur', R(e.unity[0], e.unity[1], 0)]);
  if (e.weeks) out.push(['Süre', `${e.weeks} hafta`]);
  if (e.crowd) out.push(['Beklenen katılım', `~${fmtInt(Math.max(100, e.crowd))} kişi${e.capacity ? ` / kapasite ${fmtInt(e.capacity)}` : ''}`]);
  if (e.fill !== undefined) out.push(['Tahmini doluluk', e.fill < 0.3 ? `%${Math.round(e.fill * 100)} · boş kalma riski!` : e.fill > 0.9 ? `%${Math.round(Math.min(1.15, e.fill) * 100)} · dolup taşar` : `%${Math.round(e.fill * 100)}`]);
  if (e.weather) out.push(['Hava', `${e.weather.icon} ${e.weather.label}${e.weather.mult < 1 ? ' (katılım düşer)' : ''}`]);
  if (e.clash?.length) out.push(['Çakışma', `Son 7 günde burada ${e.clash.join(', ')} mitingi var (ilgi −%22)`]);
  if (e.transportRisk) out.push(['Taşıma haberi riski', pct(e.transportRisk, 0)]);
  if (e.fit) out.push(['Konu uyumu', e.fit > 1.05 ? 'Yüksek' : e.fit < 0.85 ? 'Düşük' : 'Orta']);
  if (e.risk) out.push(['Gaf / risk', pct(e.risk, 0)]);
  if (e.viral) out.push(['Viral olma şansı', pct(e.viral, 0)]);
  if (e.fatigue !== undefined && e.fatigue < 0.85) out.push(['Yorgunluk', `Etki %${Math.round(100 * e.fatigue)}`]);
  return out;
}
