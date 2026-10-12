// Dinamik miting konuşmaları: il özellikleri, ekonomi, hükümet gündemi ve parti çizgisine göre
// her hafta değişen konuşma seçenekleri üretir (deterministik: tarih + il + konu).
import { PROVINCE_BY_PLATE } from './state.js';
import { policyById } from './government.js';
import { gen, dat, loc } from './util.js';

const DEPREM = [46, 31, 2, 44, 27, 80, 79, 21, 63, 1, 23];
const TURIZM = [7, 48, 9, 35, 17];
const SANAYI = [41, 16, 34, 59, 26, 38, 42, 45, 20, 54];
const TARIM = [42, 3, 70, 51, 40, 66, 58, 19, 60, 68, 71, 10, 45, 1, 63];
const FINDIK = [52, 28, 53, 61, 81, 14];
const MADEN = [67, 74, 78, 45, 43];
const SINIR = [31, 27, 79, 63, 47, 73, 22, 34, 65];
const BUYUK = [34, 6, 35, 16, 7, 1, 27, 42];

function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function prng(seed) { let s = seed || 1; return () => (s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9E3779B9) >>> 0) / 4294967296; }

const pct = v => '%' + Math.round(v);

export function generateSpeeches(state, plate, topic) {
  plate = +plate;
  const pv = PROVINCE_BY_PLATE[plate];
  const il = pv?.name || '';
  const reg = pv?.region || '';
  const e = state.economy;
  const me = state.parties[state.player.partyId];
  const isGov = state.government.includes(me.id);
  const active = (state.govAgenda?.active || []).map(a => policyById(a.id)).filter(Boolean);
  const passed = (state.govAgenda?.history || []).filter(h => h.outcome === 'kabul').slice(0, 3).map(h => policyById(h.id)).filter(Boolean);
  const C = [];
  const add = (text, audience, axis, tag) => C.push({ text, audience, axis, tag });

  if (topic === 'ekonomi') {
    if (e.inflation > 30) add(isGov ? `Enflasyon şu an ${pct(e.inflation)}; tek haneye indirecek programı kararlılıkla uyguluyoruz!` : `Enflasyon ${pct(e.inflation)}! ${loc(il)} mutfak yangın yeri, emekli pazara çıkamıyor!`, { kararsiz: 1, muhafazakar: 0.6, sol: 0.6 }, null, 'enf');
    if (e.usdTry > 28) add(isGov ? 'Kurdaki dalgalanmayı ihracat ve üretimle aşacağız!' : `Dolar ${e.usdTry.toFixed(0)} lirayı aştı; maaşınız eridi, borcunuz büyüdü!`, { laik_kentli: 0.8, kararsiz: 0.8, milliyetci: 0.4 }, null, 'kur');
    if (e.unemployment > 9) add(`${gen(il)} gençleri iş bulamıyor; her üç gençten biri ne okulda ne işte!`, { kararsiz: 1, sol: 0.6, kurt: 0.5 }, null, 'issiz');
    add('Asgari ücret yoksulluk sınırının üzerine çıkacak, vergisi sıfırlanacak!', { kararsiz: 0.9, sol: 0.8, kurt: 0.5 }, { eko: -1 });
    add('Esnafın, çiftçinin, sanayicinin vergi yükünü hafifleteceğiz!', { muhafazakar: 0.9, milliyetci: 0.7, dindar: 0.5 }, { eko: 1 });
    if (SANAYI.includes(plate)) add(`${gen(il)} fabrikaları Türkiye'nin gücü; sanayiciye ucuz kredi, işçiye insanca ücret!`, { muhafazakar: 0.6, laik_kentli: 0.6, sol: 0.5 }, null, 'sanayi');
    if (TARIM.includes(plate)) add(`Mazot, gübre, yem pahalı; ${gen(il)} çiftçisi tarlasını ekemez hâle geldi!`, { muhafazakar: 0.9, dindar: 0.7, milliyetci: 0.6 }, null, 'tarim');
    if (FINDIK.includes(plate)) add('Fındığın, çayın taban fiyatını üretici belirleyecek!', { muhafazakar: 0.8, milliyetci: 0.7, kararsiz: 0.5 }, null, 'findik');
    if (TURIZM.includes(plate)) add(`${il} turizmi ayakta kalmalı; esnafa kira desteği, çalışana kadro!`, { laik_kentli: 0.8, kararsiz: 0.7 }, null, 'turizm');
    if (MADEN.includes(plate)) add('Madenci kardeşlerimizin canı, kömürden değerlidir; iş güvenliği şart!', { sol: 0.8, muhafazakar: 0.6, milliyetci: 0.5 }, null, 'maden');
  }
  if (topic === 'guvenlik') {
    add('Bu ülkenin birliğine kimse göz dikemez!', { milliyetci: 1, muhafazakar: 0.6 }, { milli: 1 });
    add('Kalıcı huzur adalet ve kardeşlikle gelir!', { kurt: 0.9, sol: 0.6, kararsiz: 0.4 }, { milli: -1 });
    if (SINIR.includes(plate)) add(`${il} sınırımızın kalesi; düzensiz göçü kontrol altına alacağız!`, { milliyetci: 0.9, kararsiz: 0.7, laik_kentli: 0.5 }, { milli: 1 }, 'goc');
    else add('Sınırlarımızı koruyacak, göçü kayıt altına alacağız!', { milliyetci: 0.8, kararsiz: 0.6, laik_kentli: 0.4 }, { milli: 1 });
    if (BUYUK.includes(plate)) add(`${gen(il)} sokakları gece de güvenli olacak; mahalleye karakol, okula polis!`, { muhafazakar: 0.7, kararsiz: 0.7, laik_kentli: 0.5 }, null, 'asayis');
    if (reg === 'Güneydoğu Anadolu' || reg === 'Doğu Anadolu') add('Bu topraklarda artık silah değil, kalkınma konuşulacak!', { kurt: 1, kararsiz: 0.6, muhafazakar: 0.4 }, { milli: -1 }, 'baris');
  }
  if (topic === 'kimlik') {
    add('Değerlerimiz, ailemiz ve inancımız bizim pusulamız!', { dindar: 1, muhafazakar: 0.8 }, { din: 1 });
    add('Kimse kimsenin yaşam tarzına karışmayacak!', { laik_kentli: 1, sol: 0.6 }, { din: -1 });
    add(`${loc(il)} ayrım yok; bu meydanda hepimiz bu ülkenin evladıyız!`, { kararsiz: 0.9, muhafazakar: 0.4, kurt: 0.4 });
    if (reg === 'Güneydoğu Anadolu') add('Anadilde eğitim ve kültürel haklar demokrasinin gereğidir!', { kurt: 1, sol: 0.7 }, { milli: -1, ozg: 1 }, 'anadil');
    add('Gençlerimiz dinlenmeden, kadınlarımız eşit olmadan bu ülke ilerlemez!', { kararsiz: 0.8, laik_kentli: 0.7, sol: 0.6 }, { deger: 1 });
  }
  if (topic === 'adalet') {
    add('Bağımsız yargıyı geri getireceğiz!', { laik_kentli: 0.9, sol: 0.8, kurt: 0.6 }, { ozg: 1 });
    add('Suçluya karşı devletin gücünü göstereceğiz!', { muhafazakar: 0.8, milliyetci: 0.8 }, { ozg: -1 });
    add('Torpil değil liyakat, kayırma değil hak!', { kararsiz: 1, laik_kentli: 0.5, muhafazakar: 0.4 });
    add('Gazetecilik suç değil; düşünce özgürlüğü anayasal güvence altında olacak!', { sol: 0.9, laik_kentli: 0.8 }, { ozg: 1 });
  }
  if (topic === 'hizmet') {
    if (DEPREM.includes(plate)) add(`${il} hâlâ konteynerde! Depremzedeye kalıcı ev, şehre yeniden hayat!`, { kararsiz: 1, muhafazakar: 0.7, kurt: 0.6, laik_kentli: 0.5 }, null, 'deprem');
    else add('Depreme dayanıklı şehirler kuracağız; kentsel dönüşümü halk için yapacağız!', { kararsiz: 0.8, laik_kentli: 0.6, muhafazakar: 0.5 });
    add(`Kararlar Ankara'da değil, ${loc(il)} alınacak!`, { kurt: 0.9, laik_kentli: 0.5 }, { yerel: 1 });
    add(`${dat(il)} yeni hastane, okul ve yol getireceğiz!`, { muhafazakar: 0.9, kararsiz: 0.6, dindar: 0.5 });
    if (BUYUK.includes(plate)) add(`${loc(il)} trafik, kira ve ulaşım çilesi bitecek!`, { laik_kentli: 0.9, kararsiz: 0.8 }, null, 'kira');
  }
  // Hükümet gündemine dair (her konuda bir aday)
  const pol = [...active, ...passed][0];
  if (pol) {
    if (isGov) add(`"${pol.title}" ile vatandaşımızın yanında olduğumuzu bir kez daha gösterdik!`, pol.pro, pol.axis, 'gundem');
    else add(`Hükümetin "${pol.title}" planı kimin için? Bu millete hesap verecekler!`, pol.anti && Object.keys(pol.anti).length ? pol.anti : { kararsiz: 0.8 }, null, 'gundem');
  }
  // Haftaya ve ile göre 3 seçenek
  const r = prng(hashStr(`${state.date}|${plate}|${topic}`));
  const pick = [...C].map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  // Gündem ve il özelleri önce gelsin
  pick.sort((a, b) => (b.tag ? 1 : 0) - (a.tag ? 1 : 0));
  return pick.slice(0, 3).map((x, i) => ({ id: `s${i}`, ...x }));
}
