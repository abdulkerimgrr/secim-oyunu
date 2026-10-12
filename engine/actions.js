// Oyuncu eylemleri. Her eylem: maliyet (eylem puanı + para), beklenen etki önizlemesi ve
// rastgelelik içeren gerçek sonuç. Etkiler engine/model.js'deki terimleri değiştirir.
import { CLUSTERS, TOPICS } from '../data/clusters.js';
import { SKILLS } from '../data/founders.js';
import { PROVINCES } from '../data/generated/provinces.js';
import { DIFFICULTY } from './params.js';
import { ideologyDistance } from './model.js';
import { clamp, addDays, fmtMoney, pct, fmtInt, loc, priceIndex } from './util.js';
import { PROVINCE_BY_PLATE, playerParty } from './state.js';
import { addNews } from './news.js';
import { charMod, isHometown } from './character.js';
import { bumpAll, bumpFaction } from './kurultay.js';
import { prepareBroadcast } from './broadcast.js';

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
  if (topic === 'ekonomi') fit *= (1 + 0.3 * skill(state, 'ekonomist')) * charMod(state, 'economy');
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
  return base * trained * (1 - 0.5 * skill(state, 'iletisimci')) * charMod(state, 'gaffe');
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
        d < e.signatures[0] ? 'Seni desteklemeyen delegeler imza vermiyor; önce desteğini artır.' : 'Delegeler imza listesine adını yazdı.'] };
    } },
  { id: 'delegates', cat: 'Kurultay', icon: '🤝', label: 'Delegelerle görüş', ap: 1, preKurultay: true,
    params: ['province'], desc: 'İl delegeleriyle birebir görüşme. En çok il başkanlarını ve teşkilatı etkiler; büyük illerin delegesi daha çok.',
    cost: () => 60000, personal: true,
    estimate(state, { province }) {
      const info = provinceInfo(state, province);
      const base = (0.6 + 13 * info.seats / 600) * diff(state).effect * fatigue(state, 'delegates', province)
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
      return { title: `${name} delegeleriyle görüştün`, lines: [`Toplam delege desteği ${fmtSigned(k.support - before)} puan`, isHometown(state, prm.province) ? 'Memleketinde hemşehrilerin seni bağrına bastı.' : 'En çok il ve ilçe başkanları etkilendi.'] };
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
      return { title: `${fl} ile pazarlık`, lines: [`Toplam delege desteği ${fmtSigned(k.support - before)} puan`, 'Diğer hizipler bu pazarlıktan rahatsız oldu.', `Verilen söz sayısı: ${k.promises}`] };
    } },

  // --- Saha ---
  { id: 'rally', cat: 'Saha', icon: '📣', label: 'Miting', ap: 2, params: ['province', 'topic', 'tone'],
    desc: 'Bir ilde meydan mitingi. Konu ilin önceliklerine uyarsa etki artar; boş meydan manşet olur.',
    cost: (state, { province }) => Math.round(150000 + 1_600_000 * Math.sqrt(provinceInfo(state, province || 34).popShare)),
    estimate(state, { province, topic = 'ekonomi', tone = 'uzlasmaci' }) {
      const p = playerParty(state), info = provinceInfo(state, province);
      const org = p.orgs[province] || 0;
      const quality = 0.6 + 0.5 * org + 0.3 * skill(state, 'saha');
      const fit = topicFit(state, province, topic);
      const toneM = tone === 'sert' ? 1.2 * charMod(state, 'sert') : 1.0;
      const f = fatigue(state, 'rally', province);
      const home = isHometown(state, province) ? 1.4 : 1;
      const camp = 0.12 * diff(state).effect * quality * fit * toneM * f * charMod(state, 'rally') * home;
      const rec = (0.003 + 0.012 * Math.sqrt(info.popShare)) * (0.5 + p.media) * diff(state).effect * f;
      const crowd = info.registered * 0.004 * (0.15 + p.recognition) * (0.25 + org) * (1 + 0.3 * skill(state, 'saha'));
      return { camp: [camp * 0.6, camp * 1.3], recognition: [rec * 0.7, rec * 1.3], crowd, fit, risk: gaffeChance(state, tone === 'sert' ? 0.1 : 0.05), fatigue: f };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      const name = PROVINCE_BY_PLATE[prm.province].name;
      const crowd = Math.round(e.crowd * rng.range(0.5, 1.5) / 100) * 100;
      const luck = crowd / Math.max(1, e.crowd);
      const org = p.orgs[prm.province] || 0;
      const lines = [];
      let camp = rng.range(...e.camp), rec = rng.range(...e.recognition);
      let title = `${name} mitingi`, bad = false;
      if (luck < 0.65 && org < 0.15 && p.recognition < 0.6) {
        camp *= 0.4; title = `${loc(name)} meydan boş kaldı`; bad = true;
        p.momentum -= 0.02;
        addNews(state, 'player', `Manşet: "${p.short} mitinginde sandalyeler boş kaldı" (${name})`);
      } else if (luck > 1.25 && crowd > 20000) {
        p.momentum += 0.02;
        addNews(state, 'player', `${p.short}, ${loc(name)} kalabalık bir miting düzenledi`);
      } else addNews(state, 'player', `${p.short} lideri ${state.player.name}, ${loc(name)} konuştu`);
      addCamp(state, prm.province, p.id, camp);
      addRecognition(p, rec);
      lines.push(`Katılım: yaklaşık ${fmtInt(Math.max(crowd, 150))} kişi`);
      lines.push(`İl kampanya etkisi +${camp.toFixed(2)}`, `Tanınırlık +${pct(rec, 2)}`);
      if (e.fit > 1.05) lines.push('Konu bu ilin önceliklerine uydu.');
      else if (e.fit < 0.85) lines.push('Konu bu ilde pek karşılık bulmadı.');
      if (rng.chance(e.risk)) {
        const im = rng.range(0.015, 0.04);
        p.leader.image = clamp(p.leader.image - im, 0, 1); p.momentum -= 0.03; state.stats.gaffes++;
        lines.push(`⚠️ Konuşmadaki bir ifade tartışma yarattı (imaj −${pct(im, 1)})`);
        addNews(state, 'player', `${p.short} liderinin ${name} konuşmasındaki sözler tartışma yarattı`);
        bad = true;
      }
      if (e.fatigue < 0.75) lines.push('Bu ilde/eylemde seçmen yorgunluğu var; etki azaldı.');
      bumpFatigue(state, 'rally', prm.province);
      state.stats.rallies++;
      state.flags.lastPlayerProvs = [prm.province, ...(state.flags.lastPlayerProvs || [])].slice(0, 6);
      return { title, bad, lines };
    } },
  { id: 'visit', cat: 'Saha', icon: '🏪', label: 'Esnaf, STK ve mahalle ziyareti', ap: 1, params: ['province'],
    desc: 'Düşük maliyetli yüz yüze temas. Yerel güven ve teşkilat moralini artırır.',
    cost: () => 40000,
    estimate(state, { province }) {
      const f = fatigue(state, 'visit', province);
      const camp = 0.05 * diff(state).effect * (1 + 0.3 * skill(state, 'saha')) * f * charMod(state, 'visit') * (isHometown(state, province) ? 1.4 : 1);
      return { camp: [camp * 0.6, camp * 1.3], org: [0.005, 0.02], fatigue: f };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      const camp = rng.range(...e.camp);
      addCamp(state, prm.province, p.id, camp);
      if (p.orgs[prm.province]) p.orgs[prm.province] = clamp(p.orgs[prm.province] + rng.range(...e.org), 0, 1);
      addRecognition(p, 0.001);
      bumpFatigue(state, 'visit', prm.province);
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} ziyareti`, lines: [`İl kampanya etkisi +${camp.toFixed(2)}`, p.orgs[prm.province] ? 'Teşkilat morali yükseldi.' : 'Bu ilde teşkilatın yok; kalıcı etki sınırlı.'] };
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
  { id: 'social', cat: 'Medya', icon: '📱', label: 'Sosyal medya kampanyası', ap: 1,
    desc: 'Video ve hedefli reklam. Viral olma şansı var ama kontrol edilemez.', cost: () => 300000,
    estimate(state) {
      const p = playerParty(state), d = skill(state, 'dijital');
      const f = fatigue(state, 'social');
      const rec = 0.006 * (1 + d) * diff(state).effect * f;
      return { recognition: [rec * 0.5, rec * 1.5], viral: 0.06 + 0.12 * d, backfire: 0.03 };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state);
      bumpFatigue(state, 'social');
      let rec = rng.range(...e.recognition);
      const lines = [];
      let title = 'Dijital kampanya yayında', bad = false;
      if (rng.chance(e.viral)) {
        rec += 0.03; p.momentum += 0.05; title = '🔥 Videon viral oldu!';
        addNews(state, 'player', `${p.short} kampanya videosu sosyal medyada milyonlarca kez izlendi`);
      } else if (rng.chance(e.backfire)) {
        p.leader.image = clamp(p.leader.image - 0.02, 0, 1); title = 'Video ters tepti'; bad = true;
        lines.push('Videodaki bir sahne alay konusu oldu.');
      }
      addRecognition(p, rec);
      lines.push(`Tanınırlık +${pct(rec, 2)}`);
      return { title, bad, lines };
    } },
  { id: 'press', cat: 'Medya', icon: '🗞️', label: 'Basın açıklaması', ap: 1, params: ['topic'],
    desc: 'Gündemdeki bir konuda tutum açıkla. Ücretsiz ama etkisi medya erişimine bağlı.', cost: () => 0,
    estimate(state, { topic = 'ekonomi' }) {
      const p = playerParty(state), f = fatigue(state, 'press');
      let mom = 0.012 * (0.3 + p.media + p.recognition) * diff(state).effect * f;
      if (topic === 'ekonomi' && state.economy.inflation > 40) mom *= 1.4;
      return { momentum: [mom * 0.3, mom * 1.3], recognition: [0.001, 0.004] };
    },
    run(state, prm, rng) {
      const p = playerParty(state), e = this.estimate(state, prm);
      bumpFatigue(state, 'press');
      const mom = rng.range(...e.momentum), rec = rng.range(...e.recognition);
      p.momentum += mom; addRecognition(p, rec);
      const t = TOPICS.find(t => t.id === prm.topic);
      return { title: `Basın açıklaması: ${t.label}`, lines: [`Ulusal ivme +${mom.toFixed(3)}`, `Tanınırlık +${pct(rec, 2)}`] };
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
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} il başkanlığı kuruluyor`, lines: [`${w} hafta içinde faaliyete geçecek.`] };
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
      return { title: `${prm.region} bölgesinde teşkilat hamlesi`, lines: [`${list.length} ilde il başkanlığı ${w} hafta içinde açılacak.`] };
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
      return { title: `${PROVINCE_BY_PLATE[prm.province].name} teşkilatı güçlendi`, lines: [`Teşkilat gücü ${pct(e.current, 0)} → ${pct(p.orgs[prm.province], 0)}`] };
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
      return { title: 'Üye kampanyası', lines: [`${fmtInt(m)} yeni üye`] };
    } },
  { id: 'fundraise', cat: 'Teşkilat', icon: '💰', label: 'Bağış kampanyası', ap: 1, desc: 'Bağış toplama yemeği ve kampanya. Küçük bir usulsüzlük riski var.',
    cost: () => 30000,
    estimate(state) {
      const p = playerParty(state);
      const poll = state.polls.length ? (state.polls[state.polls.length - 1].shares[p.id] || 0) : 0;
      const m = (150000 + 2_500_000 * p.recognition + 20_000_000 * poll) * (1 + 0.5 * skill(state, 'finansci')) * diff(state).money * fatigue(state, 'fundraise') * priceIndex(state) * charMod(state, 'fundraise');
      return { money: [m * 0.5, m * 1.4], risk: 0.05 * (1 - 0.7 * skill(state, 'hukukcu')) * charMod(state, 'scandal') };
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
      return { title: 'Bağış kampanyası', bad, lines };
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
      return { title: 'Büyük kongre yapıldı', lines: ['Seçime katılım şartlarından biri sağlandı.', `Parti içi huzur +${u.toFixed(0)}`, `Tanınırlık +${pct(r, 1)}`] };
    } },

  // --- Parti içi ---
  { id: 'meeting', cat: 'Parti içi', icon: '🗣️', label: 'Parti içi toplantı', ap: 1, desc: 'MYK ve il başkanlarıyla toplantı. İç huzuru artırır.',
    cost: () => 20000, estimate() { return { unity: [3, 8] }; },
    run(state, prm, rng) {
      const p = playerParty(state), u = rng.range(3, 8);
      p.unity = clamp(p.unity + u, 0, 100);
      return { title: 'Parti içi toplantı', lines: [`İç huzur +${u.toFixed(0)}`] };
    } },
  { id: 'training', cat: 'Parti içi', icon: '🎓', label: 'Kadro eğitimi', ap: 1, desc: '8 hafta boyunca gaf riskini yarıya indirir; soru-cevap provası.',
    cost: () => 250000, estimate() { return { weeks: 8 }; },
    run(state) {
      state.flags.trainedUntil = addDays(state.date, 56);
      return { title: 'Kadro eğitimi tamamlandı', lines: ['8 hafta boyunca gaf riski yarıya indi.'] };
    } },
];

export function actionById(id) { return ACTIONS.find(a => a.id === id); }

export function availableActions(state) {
  const pre = state.player.mode === 'join' && !state.player.isLeader;
  return ACTIONS.filter(a => pre ? a.preKurultay : (!a.preKurultay && (!a.foundOnly || state.player.mode === 'found')));
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
  if (e.live) out.push(['Biçim', 'Canlı yayın, 3 soru'], ['Etki', 'Cevaplarına göre her hizipte anlık değişir']);
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
  if (e.crowd) out.push(['Beklenen katılım', `~${fmtInt(Math.max(150, e.crowd))} kişi`]);
  if (e.fit) out.push(['Konu uyumu', e.fit > 1.05 ? 'Yüksek' : e.fit < 0.85 ? 'Düşük' : 'Orta']);
  if (e.risk) out.push(['Gaf / risk', pct(e.risk, 0)]);
  if (e.viral) out.push(['Viral olma şansı', pct(e.viral, 0)]);
  if (e.fatigue !== undefined && e.fatigue < 0.85) out.push(['Yorgunluk', `Etki %${Math.round(100 * e.fatigue)}`]);
  return out;
}
