// Genişletilmiş kampanya seçenekleri: vaatler, buluşmalar, saha turları, medya biçimleri,
// seçim altyapısı ve rakip operasyonları. Tüm etki büyüklükleri ve maliyetler OYUN TASARIM
// VARSAYIMIDIR; gerçek bir programı veya bütçe hesabını temsil etmez.
//
// fx anahtarları: trust (güven, puan), visibility (görünürlük, puan), morale (teşkilat morali, puan),
// heat (rakip saldırı riski, puan), unity (iç huzur), image (lider imajı, 0–1), momentum (ulusal ivme).
// Sayı ya da [en az, en çok] aralığı olabilir.

// ---- Vaatler ----
// cost: yıllık bütçe yükü (₺ milyar, 2026 fiyatları — oyun varsayımı)
export const PROMISE_CAPACITY = 900; // inandırıcı toplam vaat yükü (₺ milyar) — oyun varsayımı
export const PROMISES = [
  { id: 'asgari', icon: '💼', label: 'Asgari ücretliye vergi istisnası ve ara zam', cost: 180, seg: { isci: 1, genc: 0.4, kadin: 0.3 }, axis: { eko: -1 } },
  { id: 'emekli', icon: '👴', label: 'En düşük emekli aylığına kalıcı artış', cost: 220, seg: { emekli: 1 }, axis: { eko: -1 } },
  { id: 'vergi', icon: '🧾', label: 'Orta gelire vergi indirimi', cost: 160, seg: { kentli: 0.6, esnaf: 0.6 }, axis: { eko: 1 } },
  { id: 'teknoloji', icon: '💻', label: 'Gençlere teknoloji ve internet desteği', cost: 40, seg: { genc: 1 } },
  { id: 'burs', icon: '🎓', label: 'Tüm üniversite öğrencilerine karşılıksız burs', cost: 90, seg: { genc: 0.9, kadin: 0.2 }, axis: { eko: -1 } },
  { id: 'ilkev', icon: '🏠', label: '"İlk evim" konut programı', cost: 250, seg: { genc: 0.6, isci: 0.4, kadin: 0.3 } },
  { id: 'kira', icon: '🔑', label: 'Kiracılara kira desteği', cost: 120, seg: { genc: 0.6, isci: 0.5, kentli: 0.4 }, axis: { eko: -1 } },
  { id: 'tarim', icon: '🌾', label: 'Tarım destek paketi (mazot, gübre, yem)', cost: 110, seg: { kirsal: 1 } },
  { id: 'memur', icon: '🗂️', label: 'Memur maaşlarında refah payı düzenlemesi', cost: 200, seg: { kentli: 0.5, kadin: 0.3, emekli: 0.2 } },
  { id: 'siginmaci', icon: '🛂', label: 'Sığınmacılar için gönüllü geri dönüş planı', cost: 30, seg: { milliyetci: 1, isci: 0.3 }, anti: { sol: 0.5, kurt: 0.3 }, axis: { milli: 1 } },
  { id: 'savunma', icon: '🛡️', label: 'Yerli savunma sanayine yatırım', cost: 140, seg: { milliyetci: 1, esnaf: 0.2 }, axis: { milli: 1 } },
  { id: 'egitim', icon: '📚', label: 'Eğitim reformu: tam gün tekli eğitim', cost: 130, seg: { kadin: 0.6, kentli: 0.6 } },
  { id: 'saglik', icon: '🏥', label: 'Sağlıkta katkı paylarının kaldırılması', cost: 100, seg: { emekli: 0.6, kadin: 0.4, kirsal: 0.3 } },
  { id: 'adalet', icon: '⚖️', label: 'Yargı bağımsızlığı ve hukuk reformu', cost: 5, seg: { kentli: 1, genc: 0.3 }, anti: { milliyetci: 0.2 }, axis: { ozg: 1 } },
  { id: 'deprem', icon: '🏗️', label: 'Deprem dönüşüm seferberliği', cost: 260, seg: { kentli: 0.5, emekli: 0.3, esnaf: 0.3, kadin: 0.3 } },
];

// ---- Buluşmalar (Saha) ----
export const MEET_TYPES = [
  { id: 'esnaf', icon: '☕', label: 'Esnaf kahvaltısı', seg: 'esnaf', cost: 90000, fx: { trust: [1, 2], morale: [1, 2], visibility: [1, 3] } },
  { id: 'fabrika', icon: '🏭', label: 'Fabrika ziyareti', seg: 'isci', cost: 50000, fx: { trust: [1, 2], visibility: [1, 3] },
    side: { chance: 0.3, text: 'İşveren örgütleri ziyaretteki sözlerine mesafeli yaklaştı; bağışçılar tedirgin.', fx: { trust: -1 }, money: -0.15 } },
  { id: 'universite', icon: '🎓', label: 'Üniversite ziyareti', seg: 'genc', cost: 40000, gaffe: 0.12, fx: { visibility: [3, 5], trust: [0, 1] } },
  { id: 'stk', icon: '🤝', label: 'STK buluşması', seg: 'kentli', cost: 40000, fx: { trust: [2, 4] } },
  { id: 'genclik', icon: '🧑‍🎤', label: 'Gençlik buluşması', seg: 'genc', cost: 60000, gaffe: 0.06, fx: { visibility: [2, 4], morale: [1, 3] } },
  { id: 'kadin', icon: '👩', label: 'Kadın seçmen buluşması', seg: 'kadin', cost: 60000, fx: { trust: [1, 3], morale: [1, 2] } },
  { id: 'emekli', icon: '👴', label: 'Emekli buluşması', seg: 'emekli', cost: 50000, fx: { trust: [1, 3] } },
  { id: 'sehit', icon: '🇹🇷', label: 'Şehit ve gazi aileleri ziyareti', seg: 'milliyetci', cost: 30000, fx: { trust: [1, 3], visibility: [0, 2] } },
  { id: 'ciftci', icon: '🚜', label: 'Üretici ve çiftçi buluşması', seg: 'kirsal', cost: 50000, fx: { trust: [1, 2], morale: [0, 2] } },
];

// ---- Saha turları ----
export const FIELD_MODES = [
  { id: 'pazar', icon: '🧺', label: 'Pazar yeri gezisi', ap: 1, cost: 30000, camp: 0.06, fx: { trust: [0, 2], visibility: [2, 4] },
    desc: 'Halkla doğrudan temas. Hayat pahalılığı şikâyetleriyle karşılaşma riski: iktidardaysan zarar, muhalefetteysen fırsat.' },
  { id: 'koy', icon: '🏡', label: 'Köy turu', ap: 2, cost: 120000, camp: 0.07, seg: 'kirsal', fx: { trust: [1, 3], morale: [1, 3] },
    desc: 'Kırsal seçmende güçlü etki. Kırsal nüfusu yüksek illerde daha verimli.' },
  { id: 'kapi', icon: '🚪', label: 'Kapı kapı kampanya', ap: 2, cost: 60000, camp: 0.1, seg: null, fx: { morale: [2, 4] },
    desc: 'Kararsız seçmeni ikna etmede en etkili yöntem; il teşkilatı güçlüyse etkisi katlanır.' },
];

// ---- Medya biçimleri ----
export const MEDIA_FORMATS = [
  { id: 'sabah', icon: '☀️', label: 'Sabah programına katıl', tv: true, cost: 0, gaffe: 0.08, seg: { kadin: 0.8, emekli: 0.5 }, fx: { visibility: [7, 11], trust: [-1, 0] },
    desc: 'Tanınırlık ve görünürlük yüksek, ama ciddiyet algısı zedelenebilir.' },
  { id: 'ekonomi', icon: '📈', label: 'Ekonomi programı', tv: true, cost: 0, gaffe: 0.07, econ: true, seg: { kentli: 0.6, esnaf: 0.6 }, fx: { trust: [2, 4], visibility: [2, 4] },
    desc: 'Ekonomi yeterliliği algısı. Ekonomist kadro ve danışmanla risk azalır.' },
  { id: 'podcast', icon: '🎧', label: 'Podcast yayını', cost: 20000, gaffe: 0.04, seg: { kentli: 1, genc: 0.5 }, fx: { trust: [1, 3], visibility: [2, 4] },
    desc: 'Eğitimli ve şehirli seçmen; uzun format güven verir.' },
  { id: 'radyo', icon: '📻', label: 'Radyo programı', cost: 10000, gaffe: 0.02, seg: { kirsal: 0.8, emekli: 0.5 }, fx: { trust: [1, 2], visibility: [1, 3] },
    desc: 'Kırsal ve orta yaş seçmene ulaşır; risk düşük.' },
  { id: 'gazete', icon: '📰', label: 'Gazete röportajı', cost: 0, gaffe: 0.04, seg: { kentli: 0.6, emekli: 0.3 }, fx: { visibility: [3, 5], trust: [0, 2] },
    desc: 'Gündem belirler: sonraki basın açıklamanın etkisi artar.' },
  { id: 'belgesel', icon: '🎬', label: 'Belgesel / aday hikâyesi', cost: 900000, gaffe: 0, seg: { kadin: 0.5, emekli: 0.4, kararsiz: 0 }, fx: { image: [0.015, 0.035], visibility: [4, 7], trust: [1, 2] },
    desc: 'Lider imajı ve sempati. Pahalı ama kalıcı.' },
  { id: 'cevap', icon: '🎯', label: 'Rakibe cevap videosu', cost: 30000, gaffe: 0.06, base: true, fx: { heat: [8, 12], trust: [-1, 0], morale: [2, 4] },
    desc: 'Tabanı motive eder, kutuplaşmayı artırır. Son saldırıya cevapsa ivme kaybını telafi eder.' },
  { id: 'kriz', icon: '🔴', label: 'Kriz sonrası canlı yayın', cost: 0, gaffe: 0.1, crisisOnly: true, fx: { visibility: [3, 5] },
    desc: 'Yakın zamandaki bir krizi toparlayabilir ya da büyütebilir. Güvenin yüksekse şansın artar.' },
];

// ---- Seçim altyapısı (seviyeli) ----
export const INFRA_COSTS = [3_000_000, 8_000_000, 18_000_000, 40_000_000]; // 2023 fiyatları; oyun içi enflasyonla ölçeklenir
export const INFRA = [
  { id: 'gonullu', icon: '🙋', label: 'Gönüllü ağı', desc: 'Sandığa taşıma ve teşkilat morali.', mob: 0.006, morale: 4 },
  { id: 'musahit', icon: '🗳️', label: 'Müşahit ve sandık görevlisi ağı', desc: 'Sandık güvenliği; oyların korunması.', mob: 0.002, security: 0.12 },
  { id: 'telefon', icon: '📞', label: 'Telefon ve SMS bankası', desc: 'Kararsızlara düzenli temas; sandığa taşıma.', mob: 0.005, weekly: { kararsiz: 1 } },
  { id: 'koordinasyon', icon: '🧭', label: 'Seçim koordinasyon merkezi', desc: 'Seçim günü organizasyonu; 2. seviyede il bazlı anket.', mob: 0.004, intelAt: 2 },
  { id: 'veri', icon: '🧮', label: 'Seçmen veri analitiği', desc: 'Tüm saha ve medya eylemlerinin etkisi artar; 3. seviyede il bazlı anket.', boost: 0.04, intelAt: 3 },
  { id: 'uygulama', icon: '📱', label: 'Parti mobil uygulaması', desc: 'Üye ve bağış kazanımı; kalıcı görünürlük.', fund: 0.06, vis: 3 },
  { id: 'genclik', icon: '🧑‍🎓', label: 'Gençlik kolları', desc: 'Gençlerde haftalık kalıcı etki; moral.', weekly: { genc: 1 }, morale: 2 },
  { id: 'kadinkol', icon: '👩‍💼', label: 'Kadın kolları', desc: 'Kadın seçmende haftalık kalıcı etki; moral.', weekly: { kadin: 1 }, morale: 2 },
];

// ---- Rakip operasyonları ----
export const OPPO_OPS = [
  { id: 'maliyet', icon: '🧮', label: 'Vaatlerinin maliyetini hesapla ve yayınla', ap: 1, cost: 150000, fx: { trust: [0, 2], heat: [4, 6] }, hit: [0.008, 0.02] },
  { id: 'karsimiting', icon: '📣', label: 'Rakibin kalesinde karşı miting', ap: 2, cost: 900000, fx: { visibility: [3, 5], heat: [6, 10] }, rally: true },
  { id: 'kararsiz', icon: '🎯', label: 'Rakibin kararsız seçmenini hedefle', ap: 1, cost: 400000, fx: { heat: [2, 4] }, poach: true },
  { id: 'negatif', icon: '📺', label: 'Negatif reklam yayınla', ap: 1, cost: 2_000_000, fx: { heat: [12, 18], trust: [-2, -1] }, hit: [0.02, 0.045], backfire: 0.15 },
  { id: 'cevap', icon: '⚡', label: 'Rakibin açıklamasına anında cevap', ap: 1, cost: 0, fx: { heat: [3, 5], visibility: [2, 3] }, reply: true },
  { id: 'gundem', icon: '📢', label: 'Gündemini bastıracak politika açıkla', ap: 1, cost: 100000, fx: { visibility: [5, 7] }, hit: [0.005, 0.012], selfMom: 0.01 },
  { id: 'arastirma', icon: '🗃️', label: 'Geçmiş açıklamalarını araştır (dosya hazırla)', ap: 1, cost: 300000, fx: {}, dossier: true },
  { id: 'sizinti', icon: '🕵️', label: 'Muhalif gazeteciye bilgi sızdır', ap: 1, cost: 200000, dirty: 0.25, fx: { heat: [5, 8] }, hit: [0.03, 0.06] },
  { id: 'muhalif', icon: '🤫', label: 'Rakip partideki muhaliflerle temas kur', ap: 1, cost: 250000, dirty: 0.2, fx: {}, unity: [5, 12] },
];
