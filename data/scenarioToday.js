// "Bugün" senaryosu: Ekim 2026 (28. Dönem TBMM 4. yasama yılı).
// Kaynaklar data/sources.md'de. Seçmen eğilimi anket ortalamasıdır — tahmini.
// Gerçek kişiler ve partiler tarafsız biçimde, yalnızca kamuya açık bilgilerle temsil edilir.

export const SCENARIO_TODAY = {
  id: 'bugun',
  label: 'Bugün — Ekim 2026',
  startDate: '2026-10-12',
  nextGeneralElection: '2028-05-14',   // olağan takvim; tarih tahmini
  localElection: null,                 // sonraki yerel seçim genel seçimden sonra (2029) — motor hesaplar
  economy: {
    inflation: 29.7,     // TÜİK yıllık TÜFE, Eylül 2026
    unemployment: 7.8,   // TÜİK, Ağustos 2026 (mevsimsellikten arındırılmış)
    usdTry: 49.3,        // 9 Ekim 2026 kapanışı civarı
    growth: 3.5,         // — tahmini
    target: 27,          // enflasyonun yöneldiği düzey (piyasa beklentileri ~%29,6 yıl sonu) — tahmini
    uStar: 8.5,          // işsizliğin yöneldiği düzey — tahmini
  },
  policyRate: 37,        // TCMB, Eylül 2026 PPK kararı
  government: ['AKP', 'MHP'],
  president: 'Recep Tayyip Erdoğan',
  parliamentDate: '2026-10-01',
  news: [
    'TBMM 28. Dönem 4. yasama yılı başladı.',
    'Yeni Parti, Meclis\'te 91 milletvekiliyle ikinci büyük grup oldu.',
  ],
};

// 2023 parti tanımları üzerindeki değişiklikler (genel başkan, ad, not)
export const PARTY_OVERRIDES = {
  CHP: {
    leader: 'Kemal Kılıçdaroğlu', charisma: 0.45, media: 0.35, budget: 600_000_000, kurultay: null,
    note: 'Mahkemenin "mutlak butlan" kararı sonrası Mayıs 2026\'dan beri tedbiren görevde; parti içi hukuki süreç sürüyor.',
  },
  IYI: { leader: 'Müsavat Dervişoğlu', charisma: 0.55, note: 'Nisan 2024\'ten beri genel başkan.' },
  YSP: {
    name: 'Halkların Eşitlik ve Demokrasi Partisi', short: 'DEM', leader: 'Tülay Hatimoğulları – Tuncer Bakırhan (eş genel başkanlar)',
    note: 'YSP, 2023 sonrasında HEDEP ve ardından DEM Parti adını aldı.',
  },
  ZP: { note: 'Genel başkan bilgisi kamuya açık kaynaklarda tutarsız; Ümit Özdağ olarak alındı — tahmini.' },
};

// 2023'te olmayan, sonradan kurulan partiler. Seçmen tabanı başlangıçta belirtilen partiden kopyalanır.
export const NEW_PARTIES = [
  { id: 'YENI', name: 'Yeni Parti', short: 'YENİ', color: '#E8590C', baseFrom: 'CHP',
    leader: 'Özgür Özel', charisma: 0.65, ideology: { eko: -0.25, din: -0.6, milli: 0.15, yerel: 0.1, dis: -0.4, ozg: 0.5, deger: 0.45 },
    media: 0.45, recognition: 0.9, govWeight: 0, alliance: null, resources: 2, budget: 150_000_000,
    note: '24 Temmuz 2026\'da Özgür Özel ve CHP\'den ayrılan milletvekillerince kuruldu.' },
];

// Bugünkü TBMM sandalye dağılımı (592 dolu sandalye). "DIGER": Yeni Yol grubu (20), küçük partiler ve bağımsızlar.
export const SEATS_TODAY = { AKP: 280, YENI: 91, YSP: 56, MHP: 46, CHP: 44, IYI: 27, YRP: 0, ZP: 0, TIP: 0, BBP: 0, MP: 0, DIGER: 48 };

// Başlangıç seçmen eğilimi: Eylül–Ekim 2026 anketlerinin (ASAL, GENAR) yaklaşık ortalaması — tahmini.
// Küçük partiler ve "Diğer" kalan payı paylaşır (Anahtar Parti dahil).
export const POLL_TARGETS = {
  AKP: 0.338, YENI: 0.235, YSP: 0.093, MHP: 0.082, IYI: 0.071, CHP: 0.060,
  ZP: 0.034, YRP: 0.029, TIP: 0.007, BBP: 0.008, MP: 0.004, DIGER: 0.039,
};
