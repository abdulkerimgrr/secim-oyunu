// Genişletilmiş eylemler (gruplu): buluşmalar, saha turları, medya programları, vaatler,
// rakip operasyonları, seçim altyapısı. Her eylem oydan başka güven, görünürlük, moral ve
// saldırı riski gibi göstergeleri de etkiler (engine/metrics.js).
import { CLUSTERS, PARTY_TO_CLUSTER } from '../data/clusters.js';
import { MEET_TYPES, FIELD_MODES, MEDIA_FORMATS, PROMISES, PROMISE_CAPACITY, INFRA, INFRA_COSTS, OPPO_OPS } from '../data/campaign2.js';
import { segmentById } from '../data/segments.js';
import { PROVINCE_BY_PLATE, playerParty } from './state.js';
import { addNews } from './news.js';
import { clamp, addDays, fmtMoney, daysBetween, pct } from './util.js';
import { charMod, isHometown } from './character.js';
import { staffMod } from './staff.js';
import { addClusterMom } from './social.js';
import { ideologyDistance } from './model.js';
import { applyFx, fxPreview, segsAudience, segAudience, actionBoost, infraLevel, infraNextCost, promiseLoad, econCredibility, addPromiseMom, addDirty, ensureMetrics, volunteers } from './metrics.js';
import { schedule } from './crisis.js';
import { provinceInfo, fatigue, bumpFatigue, addCamp, addRecognition, gaffeChance, diff, skill, CHANNELS, channelFriendliness } from './actions.js';
import { ensurePresidency } from './presidency.js';
import { applyEcon } from './government.js';

const f2 = v => v.toFixed(2).replace('.', ',');
const visMult = p => 0.85 + 0.3 * (p.visibility ?? 30) / 100;
const segLabel = id => segmentById(id)?.label || id;
const byId = (list, id) => list.find(x => x.id === id) || list[0];

// Partinin kendi tabanı: ideolojik olarak yakın kümeler
function baseAudience(p) {
  const aud = {};
  for (const c of CLUSTERS) { const a = Math.exp(-c.lambda * ideologyDistance(c.ideo, p.ideology)); if (a > 0.35) aud[c.id] = a; }
  return aud;
}
function ruralFactor(state, plate) {
  const info = provinceInfo(state, plate);
  const i = id => CLUSTERS.findIndex(c => c.id === id);
  return clamp(0.6 + 1.6 * (info.clusters[i('muhafazakar')] + info.clusters[i('dindar')]), 0.6, 1.8);
}
function gaffe(state, rng, base, p, lines, label) {
  if (!base || !rng.chance(gaffeChance(state, base))) return false;
  const im = rng.range(0.01, 0.03);
  p.leader.image = clamp(p.leader.image - im, 0, 1); p.momentum -= 0.02; state.stats.gaffes++;
  lines.push(`⚠️ ${label} sırasında söylediğin bir söz tartışma yarattı (imaj −${pct(im, 1)})`);
  addNews(state, 'player', `${p.short} liderinin ${label.toLocaleLowerCase('tr')} sırasındaki sözleri tartışma yarattı`);
  return true;
}
const rivalsOf = state => Object.values(state.parties).filter(p => !p.aggregate && !p.dissolved && p.id !== state.player.partyId);

export const EXTRA_ACTIONS = {
  saha: [
    { id: 'meet', cat: 'Saha', icon: '🤝', label: 'Buluşma', ap: 1, params: ['province', 'choice:meet'],
      desc: 'Bir seçmen grubuyla buluş: esnaf, işçi, gençler, kadınlar, emekliler, STK, şehit ve gazi aileleri, çiftçiler.',
      choices(state) { return { meet: MEET_TYPES.map(t => ({ id: t.id, icon: t.icon, label: t.label, meta: `${segLabel(t.seg)} · ${fmtMoney(t.cost)}${t.gaffe ? ' · gaf riski' : ''}` })) }; },
      cost: (state, { meet } = {}) => byId(MEET_TYPES, meet).cost,
      estimate(state, { province, meet }) {
        const t = byId(MEET_TYPES, meet), p = playerParty(state);
        const f = fatigue(state, 'meet:' + t.id, province);
        const b = diff(state).effect * f * actionBoost(state) * charMod(state, 'visit') * staffMod(state, 'field') * (isHometown(state, province) ? 1.3 : 1);
        return { camp: [0.025 * b, 0.05 * b], segPower: 0.012 * b, audience: segAudience(t.seg), fxPrev: fxPreview(t.fx), risk: t.gaffe ? gaffeChance(state, t.gaffe) : 0, fatigue: f, segName: segLabel(t.seg) };
      },
      run(state, prm, rng) {
        const t = byId(MEET_TYPES, prm.meet), p = playerParty(state), e = this.estimate(state, prm);
        const name = PROVINCE_BY_PLATE[prm.province].name;
        const camp = rng.range(...e.camp);
        addCamp(state, prm.province, p.id, camp);
        addClusterMom(state, p.id, segAudience(t.seg), e.segPower * rng.range(0.7, 1.3));
        addRecognition(p, 0.001);
        bumpFatigue(state, 'meet:' + t.id, prm.province);
        const lines = [`${e.segName} arasında destek arttı`, `${name} kampanya etkisi +${f2(camp)}`];
        const fx = applyFx(state, t.fx, rng, actionBoost(state));
        let bad = gaffe(state, rng, t.gaffe, p, lines, t.label);
        if (t.side && rng.chance(t.side.chance)) {
          lines.push('⚠️ ' + t.side.text);
          fx.push(...applyFx(state, t.side.fx, rng));
          if (t.side.money) state.flags.donorChill = addDays(state.date, 28);
        }
        if (p.orgs[prm.province]) p.orgs[prm.province] = clamp(p.orgs[prm.province] + 0.005, 0, 1);
        return { title: `${name}: ${t.label}`, bad, lines, fx, anim: { kind: 'visit', province: name, label: t.label, icons: [t.icon, '🤝', '👋', '😊', '☕'], color: p.color } };
      } },
    { id: 'field', cat: 'Saha', icon: '🚶', label: 'Saha turu', ap: 1, apFor: prm => byId(FIELD_MODES, prm.field).ap, params: ['province', 'choice:field'],
      desc: 'Pazar yeri, köy turu ya da kapı kapı kampanya. Halkla doğrudan temas; kararsız seçmeni ikna etmenin en etkili yolu.',
      choices() { return { field: FIELD_MODES.map(m => ({ id: m.id, icon: m.icon, label: m.label, meta: `${m.ap} puan · ${fmtMoney(m.cost)}`, desc: m.desc })) }; },
      cost: (state, { field } = {}) => byId(FIELD_MODES, field).cost,
      estimate(state, { province, field }) {
        const m = byId(FIELD_MODES, field), p = playerParty(state);
        const f = fatigue(state, 'field:' + m.id, province);
        let k = diff(state).effect * f * actionBoost(state) * charMod(state, 'visit') * (isHometown(state, province) ? 1.3 : 1);
        if (m.id === 'koy') k *= ruralFactor(state, province);
        if (m.id === 'kapi') k *= 0.4 + 1.2 * (p.orgs[province] || 0) + 0.002 * Math.sqrt(volunteers(state));
        return { camp: [m.camp * 0.7 * k, m.camp * 1.3 * k], audience: m.seg ? segAudience(m.seg) : m.id === 'kapi' ? { kararsiz: 1 } : null, fxPrev: fxPreview(m.fx), fatigue: f,
          note: m.id === 'pazar' ? (state.government.includes(p.id) ? 'İktidardasın: pahalılık şikâyetleri sana yönelebilir' : 'Muhalefettesin: pahalılık şikâyetleri iktidarı hedef alır') : m.id === 'kapi' && !p.orgs[province] ? 'Bu ilde teşkilatın yok; etkisi düşük' : null };
      },
      run(state, prm, rng) {
        const m = byId(FIELD_MODES, prm.field), p = playerParty(state), e = this.estimate(state, prm);
        const name = PROVINCE_BY_PLATE[prm.province].name;
        const camp = rng.range(...e.camp);
        addCamp(state, prm.province, p.id, camp);
        if (m.id === 'kapi') addClusterMom(state, p.id, { kararsiz: 1 }, 0.004 * camp / m.camp);
        if (m.seg) addClusterMom(state, p.id, segAudience(m.seg), 0.008 * camp / m.camp);
        bumpFatigue(state, 'field:' + m.id, prm.province);
        const lines = [`${name} kampanya etkisi +${f2(camp)}`];
        const fx = applyFx(state, m.fx, rng, actionBoost(state));
        let bad = false;
        if (m.id === 'pazar' && rng.chance(0.25)) {
          if (state.government.includes(p.id)) {
            bad = true; lines.push('⚠️ Pazarda bir vatandaşın pahalılık tepkisi kameralara yansıdı; video yayıldı.');
            fx.push(...applyFx(state, { trust: -2, momentum: -0.012 }, rng));
            addNews(state, 'player', `${name} pazarında ${p.short} liderine pahalılık tepkisi`);
          } else {
            lines.push('Pazarda pahalılık şikâyetleri iktidarı hedef aldı; görüntüler yayıldı.');
            fx.push(...applyFx(state, { visibility: 3, momentum: 0.01 }, rng));
          }
        }
        if (m.id === 'kapi') lines.push(`${p.orgs[prm.province] ? 'Teşkilat ve gönüllüler kapı kapı dolaştı' : 'Teşkilat olmadığı için ekip küçük kaldı'}; kararsızlar hedeflendi.`);
        return { title: `${name}: ${m.label}`, bad, lines, fx, anim: { kind: 'visit', province: name, label: m.label, icons: m.id === 'koy' ? ['🌾', '🚜', '☕', '👋', '🐄'] : m.id === 'kapi' ? ['🚪', '📄', '🗣️', '🙂', '🚪'] : ['🧺', '🍅', '🗣️', '💸', '🍞'], color: p.color } };
      } },
  ],
  medya: [
    { id: 'media', cat: 'Medya', icon: '🎙️', label: 'Medya programı', ap: 1, params: ['choice:format', 'channel'],
      showParam: (prm, k) => k !== 'channel' || !!byId(MEDIA_FORMATS, prm.format).tv,
      desc: 'Sabah programı, ekonomi programı, podcast, radyo, gazete röportajı, belgesel ya da rakibe cevap videosu. Her biri farklı kitleye ulaşır.',
      choices(state) {
        const recent = state.flags.lastCrisis && daysBetween(state.flags.lastCrisis, state.date) <= 21;
        return { format: MEDIA_FORMATS.map(m => ({ id: m.id, icon: m.icon, label: m.label, meta: m.tv ? 'TV · kanal seç' : m.cost ? fmtMoney(m.cost) : 'ücretsiz', desc: m.desc, disabled: m.crisisOnly && !recent ? 'Son 3 haftada kriz yok' : false })) };
      },
      cost: (state, { format } = {}) => byId(MEDIA_FORMATS, format).cost,
      available(state, { format, channel } = {}) {
        const m = byId(MEDIA_FORMATS, format);
        if (m.crisisOnly && !(state.flags.lastCrisis && daysBetween(state.flags.lastCrisis, state.date) <= 21)) return 'Son 3 haftada yaşanmış bir kriz yok.';
        if (m.tv && channel === 'yerel') return 'Bu program için ulusal bir kanal seç.';
        return true;
      },
      estimate(state, { format, channel = 'tarafsiz' }) {
        const m = byId(MEDIA_FORMATS, format), p = playerParty(state);
        const fr = m.tv ? channelFriendliness(state, channel) : 0.7;
        const f = fatigue(state, 'media:' + m.id);
        const gain = (m.tv ? (1.3 - 0.5 * fr) * (CHANNELS[channel]?.reach || 0.5) * 1.6 : 1) * diff(state).effect * f * visMult(p) * actionBoost(state);
        const risk = m.gaffe ? gaffeChance(state, m.gaffe * (m.tv ? 1.6 - fr : 1) * (m.econ && skill(state, 'ekonomist') > 0.3 ? 0.6 : 1) * (m.econ ? staffMod(state, 'economy') > 1 ? 0.7 : 1 : 1)) : 0;
        return { segPower: 0.012 * gain, gainMult: gain, audience: m.base ? baseAudience(p) : segsAudience(m.seg || {}), fxPrev: fxPreview(m.fx, Math.min(1.35, gain)), risk, fatigue: f, recognition: [0.002 * gain, 0.006 * gain] };
      },
      run(state, prm, rng) {
        prm = { channel: 'tarafsiz', ...prm };
        const m = byId(MEDIA_FORMATS, prm.format), p = playerParty(state), e = this.estimate(state, prm);
        bumpFatigue(state, 'media:' + m.id);
        const lines = [];
        const fx = applyFx(state, m.fx, rng, Math.min(1.35, e.gainMult));
        addRecognition(p, rng.range(...e.recognition));
        if (Object.keys(e.audience).length) { const v = e.segPower * rng.range(0.7, 1.3); addClusterMom(state, p.id, e.audience, v); lines.push(`Hedef kitlede ivme +${v.toFixed(3).replace('.', ',')}`); }
        if (m.tv) lines.push(`${CHANNELS[prm.channel].label} · ${channelFriendliness(state, prm.channel) > 0.6 ? 'dost kanal: rahat geçti' : 'karşıt kanal: sorular sertti'}`);
        if (m.id === 'gazete') { state.flags.pressBoostUntil = addDays(state.date, 14); lines.push('Gündem senin elinde: 2 hafta içindeki basın açıklaman daha etkili olacak.'); }
        if (m.id === 'cevap') {
          const la = state.flags.lastAttack;
          if (la && daysBetween(la.date, state.date) <= 14) { p.momentum += la.dmg * 0.8; lines.push(`${state.parties[la.party]?.short || 'Rakip'} saldırısına cevap verildi; kaybedilen ivme büyük ölçüde geri alındı.`); state.flags.lastAttack = null; }
          else lines.push('Taban motive oldu; karşı cephede tepki büyüdü.');
        }
        if (m.id === 'kriz') {
          const ok = rng.chance(clamp(0.45 + ((p.trust ?? 50) - 50) / 100 + (p.leader.image - 0.5) * 0.5, 0.15, 0.85));
          lines.push(ok ? 'Canlı yayın krizi toparladı.' : '⚠️ Canlı yayın krizi büyüttü.');
          fx.push(...applyFx(state, ok ? { trust: [4, 8] } : { trust: [-6, -3] }, rng));
        }
        const bad = gaffe(state, rng, m.gaffe && e.risk ? e.risk / gaffeChance(state, 1) : 0, p, lines, m.label);
        state.stats.tv++;
        return { title: m.label, bad, lines, fx, anim: { kind: 'studio', label: m.label, icon: m.icon, channel: m.tv ? CHANNELS[prm.channel].label : null, color: p.color, bad } };
      } },
  ],
  vaat: [
    { id: 'promise', cat: 'Vaatler', icon: '📜', label: 'Vaat açıkla', ap: 1, params: ['choice:promise'],
      desc: 'Bir seçim vaadi açıkla. Hedef grupta kalıcı destek getirir ama bütçeye yük bindirir; toplam yük inandırıcılık sınırını aşarsa güven ve ekonomik inandırıcılık düşer.',
      choices(state) {
        ensureMetrics(state);
        const done = new Set(state.player.promises.map(x => x.id));
        return { promise: PROMISES.map(pr => ({ id: pr.id, icon: pr.icon, label: pr.label, meta: `₺${pr.cost} milyar/yıl · ${Object.keys(pr.seg).map(segLabel).join(', ')}`, disabled: done.has(pr.id) ? 'Zaten açıklandı' : false })) };
      },
      cost: () => 200000,
      available(state, { promise } = {}) { ensureMetrics(state); return state.player.promises.some(x => x.id === promise) ? 'Bu vaadi zaten açıkladın.' : true; },
      estimate(state, { promise }) {
        const pr = byId(PROMISES, promise), p = playerParty(state);
        const load = promiseLoad(state), after = load + pr.cost;
        const cred = clamp(1.15 - Math.max(0, after - PROMISE_CAPACITY) / PROMISE_CAPACITY * 1.5, 0.25, 1.15);
        let cons = 1;
        for (const [ax, dir] of Object.entries(pr.axis || {})) cons *= 1 + 0.4 * dir * (p.ideology[ax] || 0);
        const power = 0.03 * diff(state).effect * cred * clamp(cons, 0.6, 1.3);
        return { audience: segsAudience(pr.seg), promisePower: power, load, after, cap: PROMISE_CAPACITY, cred, cons,
          fxPrev: fxPreview({ visibility: [2, 4], ...(after > PROMISE_CAPACITY ? { trust: [-Math.round((after - Math.max(load, PROMISE_CAPACITY)) / 40) - 1, -Math.round((after - Math.max(load, PROMISE_CAPACITY)) / 60)] } : {}) }) };
      },
      run(state, prm, rng) {
        const pr = byId(PROMISES, prm.promise), p = playerParty(state), e = this.estimate(state, prm);
        ensureMetrics(state);
        const power = e.promisePower * rng.range(0.85, 1.15);
        state.player.promises.push({ id: pr.id, date: state.date, power });
        addPromiseMom(state, p.id, e.audience, power);
        if (pr.anti) addPromiseMom(state, p.id, pr.anti, -power * 0.6);
        addClusterMom(state, p.id, e.audience, power * 0.4); // ilk günlerin haber etkisi
        const fx = applyFx(state, { visibility: [2, 4] }, rng);
        const lines = [`Hedef gruplarda kalıcı destek: ${Object.keys(pr.seg).map(segLabel).join(', ')}`, `Toplam vaat yükü: ₺${e.after} milyar / inandırıcı sınır ₺${e.cap} milyar`];
        let bad = false;
        if (e.after > e.cap) {
          const over = e.after - Math.max(e.load, e.cap);
          fx.push(...applyFx(state, { trust: -(over / 50 + 1), heat: 5 }, rng));
          lines.push('⚠️ Ekonomistler vaatlerin finansmanını sorguluyor; inandırıcılığın zedelendi.');
          addNews(state, 'rival', `Rakipler ${p.short} vaatlerinin maliyetini sorguluyor: "Bu paranın kaynağı ne?"`);
          bad = true;
        } else addNews(state, 'player', `${p.short} yeni vaadini açıkladı: ${pr.label}`);
        if (e.cons < 0.85) { fx.push(...applyFx(state, { trust: -2 }, rng)); lines.push('⚠️ Vaat partinin çizgisiyle çelişiyor; "U dönüşü" yorumları yapıldı.'); }
        lines.push(`Ekonomik inandırıcılık: ${econCredibility(state)}/100`);
        return { title: `Vaat: ${pr.label}`, bad, lines, fx, anim: { kind: 'promise', icon: pr.icon, label: pr.label, cost: pr.cost, color: p.color, bad } };
      } },
  ],
  rakip: [
    { id: 'oppo', cat: 'Rakip operasyonları', icon: '♟️', label: 'Rakibe karşı hamle', ap: 1, apFor: prm => byId(OPPO_OPS, prm.op).ap, params: ['rival', 'choice:op'],
      desc: 'Rakibin vaatlerini sorgula, kalesinde miting yap, kararsızlarını hedefle, negatif reklam ya da kirli operasyonlar. Saldırgan hamleler rakiplerin seni hedef alma riskini artırır.',
      choices(state) { return { op: OPPO_OPS.map(o => ({ id: o.id, icon: o.icon, label: o.label, meta: `${o.ap} puan · ${o.cost ? fmtMoney(o.cost) : 'ücretsiz'}${o.dirty ? ` · ⚠️ etik dışı, yakalanma %${Math.round(o.dirty * 100)}` : ''}`, dirty: !!o.dirty })) }; },
      cost: (state, { op } = {}) => byId(OPPO_OPS, op).cost,
      available(state, { rival } = {}) { if (rival && !state.parties[rival]) return 'Rakip seç.'; return true; },
      estimate(state, { rival, op }) {
        const o = byId(OPPO_OPS, op), t = state.parties[rival];
        const dossier = state.flags.dossier?.[rival] && daysBetween(state.flags.dossier[rival], state.date) <= 84 ? 1.5 : 1;
        const k = diff(state).effect * actionBoost(state);
        return { fxPrev: fxPreview(o.fx), hit: o.hit ? [o.hit[0] * dossier * k, o.hit[1] * dossier * k] : null, dossier: dossier > 1, dirtyRisk: o.dirty || 0, backfire: o.backfire || 0,
          audience: o.poach && t ? { ...Object.fromEntries(Object.entries(PARTY_TO_CLUSTER[t.id] || {}).map(([c, v]) => [c, v * 0.7])), kararsiz: 1 } : null, target: t?.short };
      },
      run(state, prm, rng) {
        const o = byId(OPPO_OPS, prm.op), p = playerParty(state), t = state.parties[prm.rival], e = this.estimate(state, prm);
        const lines = [], fx = applyFx(state, o.fx, rng);
        let bad = false;
        bumpFatigue(state, 'oppo:' + o.id);
        if (o.backfire && rng.chance(o.backfire)) {
          bad = true; p.momentum -= 0.02; fx.push(...applyFx(state, { trust: -3 }, rng));
          lines.push('⚠️ Reklam ters tepti; seçmen saldırgan dili cezalandırdı.');
          addNews(state, 'player', `${p.short} reklamı tepki çekti`);
        } else if (e.hit) {
          const h = rng.range(...e.hit);
          t.momentum -= h;
          lines.push(`${t.short} ivmesi −${(h * 100).toFixed(1).replace('.', ',')}${e.dossier ? ' (hazırlanan dosya etkiyi artırdı)' : ''}`);
        }
        if (o.selfMom) p.momentum += o.selfMom;
        if (o.rally) {
          const prov = state.lastProjection?.provinces || {};
          const top = Object.entries(prov).sort((a, b) => (b[1].shares?.[t.id] || 0) - (a[1].shares?.[t.id] || 0))[0]?.[0] || 34;
          addCamp(state, top, p.id, rng.range(0.04, 0.08) * diff(state).effect);
          addCamp(state, top, t.id, -rng.range(0.02, 0.04));
          lines.push(`${PROVINCE_BY_PLATE[top].name}: ${t.short} kalesinde miting yapıldı`);
          addNews(state, 'player', `${p.short}, ${t.short} kalesi ${PROVINCE_BY_PLATE[top].name}'da miting yaptı`);
        }
        if (o.poach) { const v = 0.018 * diff(state).effect * actionBoost(state) * rng.range(0.7, 1.3); addClusterMom(state, p.id, e.audience, v); lines.push(`${t.short} seçmenine yakın kararsızlar hedeflendi (+${v.toFixed(3).replace('.', ',')})`); }
        if (o.reply) {
          const la = state.flags.lastAttack;
          if (la && la.party === t.id && daysBetween(la.date, state.date) <= 14) { p.momentum += la.dmg; state.flags.lastAttack = null; lines.push(`${t.short} saldırısı anında cevaplandı; ivme kaybı telafi edildi.`); }
          else lines.push(`${t.short} son zamanda seni hedef almadı; cevap sınırlı ilgi gördü.`);
        }
        if (o.dossier) { (state.flags.dossier ||= {})[t.id] = state.date; lines.push(`${t.short} hakkında 12 hafta geçerli bir dosya hazırlandı: maliyet analizi ve negatif reklam %50 daha etkili.`); }
        if (o.unity) { const u = rng.range(...o.unity); t.unity = clamp((t.unity ?? 70) - u, 0, 100); t.momentum -= 0.008; lines.push(`${t.short} içinde huzursuzluk arttı`); }
        if (o.dirty) {
          if (rng.chance(o.dirty / 2)) {
            bad = true;
            fx.push(...applyFx(state, { trust: [-16, -10], image: -0.04, momentum: -0.05, heat: 20 }, rng));
            lines.push('⚠️ Operasyon hemen ortaya çıktı! Skandal büyüyor.');
            addNews(state, 'player', `SKANDAL: ${p.short} kampanyasının ${t.short}'ye yönelik gizli operasyonu ortaya çıktı`);
          } else {
            addDirty(state, { id: 'oppo-' + o.id, label: o.label.toLocaleLowerCase('tr') + ' operasyonu', chance: o.dirty / 4, weeks: 4 });
            lines.push('Operasyon şimdilik gizli kaldı; önümüzdeki haftalarda ortaya çıkma riski sürüyor.');
          }
        }
        return { title: `${o.label} · ${t.short}`, bad, lines, fx, anim: { kind: 'oppo', label: o.label, icon: o.icon, target: t.short, targetColor: t.color, color: p.color, bad, dirty: !!o.dirty } };
      } },
  ],
  teskilat: [
    { id: 'infra', cat: 'Teşkilat', icon: '🏗️', label: 'Seçim altyapısı', ap: 1, params: ['choice:infra'],
      desc: 'Gönüllü ağı, müşahitler, telefon bankası, koordinasyon merkezi, veri analitiği, mobil uygulama, gençlik ve kadın kolları. Her biri 4 seviye; seçim günü sandığa taşıma oranını belirler.',
      choices(state) { ensureMetrics(state); return { infra: INFRA.map(d => { const l = infraLevel(state, d.id), c = infraNextCost(state, d.id); return { id: d.id, icon: d.icon, label: d.label, meta: `Seviye ${l}/4${c ? ` → ${fmtMoney(c)}` : ' · tamamlandı'}`, desc: d.desc, level: l, disabled: c ? false : 'En üst seviyede' }; }) }; },
      cost: (state, { infra } = {}) => { ensureMetrics(state); return INFRA_COSTS[infraLevel(state, infra || INFRA[0].id)] || 0; },
      available(state, { infra } = {}) { ensureMetrics(state); return infraNextCost(state, infra || INFRA[0].id) ? true : 'Bu altyapı en üst seviyede.'; },
      estimate(state, { infra }) {
        const d = byId(INFRA, infra), l = infraLevel(state, d.id);
        const out = { note: d.desc, levelInfo: `${l} → ${l + 1} / 4` };
        if (d.mob) out.mobInfo = `Sandığa taşıma +${(d.mob * 100).toFixed(1).replace('.', ',')} puan (seçim günü, göreli)`;
        if (d.security) out.securityInfo = `Sandık güvenliği +${Math.round(d.security * 100)}`;
        return out;
      },
      run(state, prm, rng) {
        const d = byId(INFRA, prm.infra), p = playerParty(state);
        ensureMetrics(state);
        const l = (state.player.infra[d.id] = infraLevel(state, d.id) + 1);
        const lines = [`${d.label}: seviye ${l}/4`];
        const fx = applyFx(state, { morale: d.morale || 2 }, rng);
        if (d.security) { state.ballotSecurity = clamp(state.ballotSecurity + d.security, 0, 1); lines.push(`Sandık güvenliği %${Math.round(state.ballotSecurity * 100)}`); }
        if (d.id === 'gonullu') lines.push(`Gönüllü sayısı: ${volunteers(state).toLocaleString('tr-TR')}`);
        if (d.id === 'uygulama') { const m = Math.round(2000 * l * (0.5 + p.recognition)); p.members += m; lines.push(`Uygulama üzerinden ${m.toLocaleString('tr-TR')} yeni üye`); }
        if (d.mob) lines.push('Seçim günü oylarını sandığa taşıma gücün arttı.');
        addNews(state, 'player', `${p.short} ${d.label.toLocaleLowerCase('tr')} çalışmasını genişletti`);
        return { title: `${d.label} · seviye ${l}`, lines, fx, anim: { kind: 'infra', icon: d.icon, label: d.label, level: l, color: p.color } };
      } },
  ],
  cb: [
    { id: 'cbPromise', cat: 'Cumhurbaşkanlığı', icon: '📜', label: 'Seçim vaadini hayata geçir', ap: 1, presidentOnly: true, params: ['choice:promise'],
      desc: 'Seçimde verdiğin bir vaadi uygula. Onay oranı ve güven artar; bütçeye yük olarak enflasyonu biraz yükseltir. Bir yıldan uzun bekleyen vaatler onayını aşındırır.',
      choices(state) { ensureMetrics(state); const open = state.player.promises.filter(x => !x.fulfilled); return { promise: open.length ? open.map(x => { const pr = byId(PROMISES, x.id); return { id: pr.id, icon: pr.icon, label: pr.label, meta: `₺${pr.cost} milyar/yıl` }; }) : [{ id: 'yok', icon: '—', label: 'Bekleyen vaat yok', disabled: 'Vaat yok' }] }; },
      cost: () => 0,
      available(state, { promise } = {}) { ensureMetrics(state); return state.player.promises.some(x => x.id === promise && !x.fulfilled) ? true : 'Bekleyen bir vaat seç.'; },
      estimate(state, { promise }) { const pr = PROMISES.find(x => x.id === promise); return pr ? { econNote: `Onay +3 … +5 · güven +3 · enflasyon +${(pr.cost / 120).toFixed(1).replace('.', ',')} puan` } : {}; },
      run(state, prm, rng) {
        const pr = byId(PROMISES, prm.promise), pres = ensurePresidency(state);
        const x = state.player.promises.find(y => y.id === pr.id);
        x.fulfilled = state.date;
        applyEcon(state, { inflation: pr.cost / 120, growth: pr.cost / 1500 });
        const d = rng.range(3, 5);
        pres.approval = clamp(pres.approval + d, 5, 95);
        const fx = applyFx(state, { trust: 3 }, rng);
        addNews(state, 'gov', `Cumhurbaşkanı ${state.player.name} seçim vaadini hayata geçirdi: ${pr.label}`);
        return { title: `Vaat yerine getirildi`, lines: [pr.label, `Onay oranı +${d.toFixed(1).replace('.', ',')}`, 'Bütçe yükü enflasyonu bir miktar artırdı.'], fx, anim: { kind: 'cb', icon: pr.icon, label: pr.label } };
      } },
  ],
};
