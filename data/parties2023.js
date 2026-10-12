// 2023 Milletvekili Genel Seçimi sonrası (Haziran 2023) partiler.
// Ad, genel başkan, 2023 oy ve sandalye: YSK sonuçları (bkz. data/sources.md) — kaynakli.
// İdeoloji vektörleri, medya erişimi, karizma: OYUN TASARIM VARSAYIMI (tarafsız, yaklaşık konumlama;
// MARPOR/CHES gibi akademik çalışmalardan esinlenilmiştir). Kolayca düzeltilebilir.
//
// İdeoloji eksenleri (-1 … +1):
//  eko:    devletçi/sol (-1) … piyasa/sağ (+1)
//  din:    laik (-1) … dindar-muhafazakâr (+1)
//  milli:  düşük milliyetçilik (-1) … yüksek milliyetçilik (+1)
//  yerel:  merkeziyetçi (-1) … yerinden yönetim (+1)
//  dis:    Batı/AB yönelimli (-1) … Avrasya/bağımsız (+1)
//  ozg:    güvenlik öncelikli (-1) … özgürlük öncelikli (+1)
//  deger:  gelenekçi (-1) … ilerici (+1)

export const AXES = [
  { id: 'eko',   label: 'Ekonomi',          neg: 'Devletçi',     pos: 'Piyasacı' },
  { id: 'din',   label: 'Din ve devlet',    neg: 'Laik',         pos: 'Dindar' },
  { id: 'milli', label: 'Milliyetçilik',    neg: 'Düşük',        pos: 'Yüksek' },
  { id: 'yerel', label: 'Yönetim',          neg: 'Merkeziyetçi', pos: 'Yerelci' },
  { id: 'dis',   label: 'Dış politika',     neg: 'Batı/AB',      pos: 'Avrasya' },
  { id: 'ozg',   label: 'Özgürlükler',      neg: 'Güvenlik',     pos: 'Özgürlük' },
  { id: 'deger', label: 'Toplumsal değer',  neg: 'Gelenekçi',    pos: 'İlerici' },
];

const v = (eko, din, milli, yerel, dis, ozg, deger) => ({ eko, din, milli, yerel, dis, ozg, deger });

export const PARTIES_2023 = [
  { id: 'AKP', name: 'Adalet ve Kalkınma Partisi', short: 'AK Parti', color: '#F39C12',
    leader: 'Recep Tayyip Erdoğan', charisma: 0.9, ideology: v(0.3, 0.6, 0.45, -0.5, 0.2, -0.4, -0.6),
    media: 1.0, recognition: 1.0, govWeight: 1.0, alliance: 'CUMHUR', resources: 3, budget: 1_400_000_000 },
  { id: 'CHP', name: 'Cumhuriyet Halk Partisi', short: 'CHP', color: '#E2231A',
    leader: 'Kemal Kılıçdaroğlu', charisma: 0.55, ideology: v(-0.2, -0.7, 0.25, -0.1, -0.4, 0.4, 0.4),
    media: 0.55, recognition: 1.0, govWeight: 0, alliance: null, resources: 3, budget: 950_000_000,
    kurultay: '2023-11-04', kurultayNote: 'CHP 38. Olağan Kurultayı 4–5 Kasım 2023 (gerçek takvim)' },
  { id: 'MHP', name: 'Milliyetçi Hareket Partisi', short: 'MHP', color: '#8E1B2E',
    leader: 'Devlet Bahçeli', charisma: 0.6, ideology: v(0.2, 0.4, 0.95, -0.8, 0.3, -0.7, -0.6),
    media: 0.85, recognition: 0.98, govWeight: 0.6, alliance: 'CUMHUR', resources: 2, budget: 380_000_000 },
  { id: 'IYI', name: 'İYİ Parti', short: 'İYİ', color: '#2AA7DF',
    leader: 'Meral Akşener', charisma: 0.6, ideology: v(0.4, -0.2, 0.8, -0.4, -0.3, 0.1, -0.1),
    media: 0.45, recognition: 0.97, govWeight: 0, alliance: null, resources: 2, budget: 360_000_000 },
  { id: 'YSP', name: 'Yeşiller ve Sol Gelecek Partisi', short: 'YSP', color: '#7D3C98',
    leader: 'Çiğdem Kılıçgün Uçar – İbrahim Akın (eş sözcüler)', charisma: 0.55,
    ideology: v(-0.7, -0.3, -0.9, 0.9, -0.2, 0.8, 0.6),
    media: 0.25, recognition: 0.95, govWeight: 0, alliance: 'EMEK', resources: 2, budget: 330_000_000,
    note: 'Ekim 2023\'te adını HEDEP, sonra DEM Parti olarak değiştirdi (bu sürümde YSP adı korunur).' },
  { id: 'YRP', name: 'Yeniden Refah Partisi', short: 'YRP', color: '#1E7B4F',
    leader: 'Fatih Erbakan', charisma: 0.55, ideology: v(-0.1, 0.95, 0.45, -0.3, 0.6, -0.5, -0.95),
    media: 0.35, recognition: 0.8, govWeight: 0, alliance: null, resources: 1, budget: 40_000_000 },
  { id: 'ZP', name: 'Zafer Partisi', short: 'ZP', color: '#1F2D5A',
    leader: 'Ümit Özdağ', charisma: 0.6, ideology: v(0.3, -0.4, 1.0, -0.7, 0.1, -0.3, -0.1),
    media: 0.3, recognition: 0.75, govWeight: 0, alliance: null, resources: 1, budget: 30_000_000 },
  { id: 'TIP', name: 'Türkiye İşçi Partisi', short: 'TİP', color: '#C2185B',
    leader: 'Erkan Baş', charisma: 0.6, ideology: v(-1.0, -0.8, -0.3, 0.4, 0.5, 0.8, 0.85),
    media: 0.25, recognition: 0.7, govWeight: 0, alliance: 'EMEK', resources: 1, budget: 20_000_000 },
  { id: 'BBP', name: 'Büyük Birlik Partisi', short: 'BBP', color: '#A0522D',
    leader: 'Mustafa Destici', charisma: 0.45, ideology: v(0.1, 0.8, 0.9, -0.6, 0.4, -0.6, -0.8),
    media: 0.4, recognition: 0.6, govWeight: 0.3, alliance: 'CUMHUR', resources: 1, budget: 15_000_000 },
  { id: 'MP', name: 'Memleket Partisi', short: 'MP', color: '#F1C40F',
    leader: 'Muharrem İnce', charisma: 0.55, ideology: v(-0.1, -0.4, 0.6, -0.3, 0.0, 0.1, 0.0),
    media: 0.25, recognition: 0.65, govWeight: 0, alliance: null, resources: 1, budget: 10_000_000 },
  { id: 'DIGER', name: 'Diğer partiler ve bağımsızlar', short: 'Diğer', color: '#9E9E9E',
    leader: '—', charisma: 0.3, ideology: v(0, 0, 0.2, 0, 0, 0, 0),
    media: 0.15, recognition: 0.5, govWeight: 0, alliance: null, resources: 0, budget: 0, aggregate: true },
];

// 14 Mayıs 2023 seçim günündeki ittifaklar (ilk meclis hesabı için) — kaynakli
export const ELECTION_DAY_ALLIANCES_2023 = {
  AKP: 'CUMHUR', MHP: 'CUMHUR', YRP: 'CUMHUR', BBP: 'CUMHUR',
  CHP: 'MILLET', IYI: 'MILLET', YSP: 'EMEK', TIP: 'EMEK', ZP: 'ATA',
};

// Haziran 2023 itibarıyla ittifaklar. Millet İttifakı seçim sonrası dağıldı — tahmini/basitleştirilmiş.
export const ALLIANCES_2023 = {
  CUMHUR: { name: 'Cumhur İttifakı', color: '#F39C12' },
  EMEK: { name: 'Emek ve Özgürlük İttifakı', color: '#7D3C98' },
};

// Not: DEVA, Gelecek, Saadet ve Demokrat Parti 2023'te adaylarını CHP listelerinden çıkardı;
// oyları CHP içinde sayılır. Seçim sonrası bu milletvekillerinin bir kısmı kendi partilerine döndü.
// Bu sürümde meclis dağılımı seçim sonucu (CHP 169) olarak alınmıştır — basitleştirme.
