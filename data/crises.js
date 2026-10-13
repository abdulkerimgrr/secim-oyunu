// Kriz ve zincirleme olaylar — tümü OYUN İÇİ KURGUSAL SENARYODUR.
// Gerçek kişiler hakkında iddia içermez; kişi adları ya oyuncunun kendisi ya da genel ifadelerdir.
// Seçenek alanları: ap (eylem puanı), money (₺, 2023 fiyatı; eksi = harcama), fx (bkz. data/campaign2.js),
// seg ({segment: güç}), camp (krizin ilinde kampanya etkisi), gamble ({chance, win, lose}), oppositionOnly.
// ignore: bu tur yanıt verilmezse uygulanan ceza; kriz bir kez büyür, ikinci kez yanıtsız kalırsa kapanır.

export const CRISES = [
  { id: 'deprem', where: 'deprem', icon: '🏚️', title: '{prov} merkezli deprem',
    body: '{prov} merkezli bir depremde binalarda hasar var; arama-kurtarma çalışmaları sürüyor. Kamuoyu siyasetçilerin tavrına bakıyor. (Oyun içi senaryo.)',
    options: [
      { label: 'Hemen bölgeye git', ap: 2, fx: { trust: [4, 7], visibility: [5, 8] }, camp: 0.08 },
      { label: 'Parti olarak yardım kampanyası başlat', money: -2_000_000, fx: { trust: [3, 5], morale: [2, 4] }, camp: 0.04 },
      { label: 'Taziye ve dayanışma mesajı yayınla', fx: { trust: [0, 1] } },
      { label: 'Afet hazırlığı eksikliklerini eleştir', oppositionOnly: true, fx: { heat: [8, 12], trust: [-3, 1] }, seg: { kentli: 0.02 } },
    ],
    ignore: { trust: -6, momentum: -0.02 } },
  { id: 'kur', where: null, icon: '💱', title: 'Kurda sert yükseliş', econShock: { usdTry: [0.05, 0.09], inflation: [1, 2.5] },
    body: 'Döviz kurunda bir günde sert yükseliş yaşandı; piyasalar tedirgin. Ekonomi yönetimine ve muhalefete gözler çevrildi. (Oyun içi senaryo.)',
    options: [
      { label: 'Acil ekonomi programını açıkla', ap: 1, econ: true, fx: { trust: [2, 4], visibility: [3, 5] } },
      { label: 'Ekonomi yönetimini sorumlu tut', oppositionOnly: true, fx: { heat: [6, 10], momentum: [0.005, 0.02] } },
      { label: 'Sakin olun, panik yapmayın çağrısı yap', fx: { trust: [0, 2] } },
    ],
    ignore: { trust: -3 } },
  { id: 'mvskandal', where: null, icon: '📂', title: 'Partinin bir milletvekili hakkında usulsüzlük iddiası',
    body: 'Partinin bir milletvekili hakkında ihale süreçlerine ilişkin iddialar basına yansıdı. Muhalifler parti yönetiminin tavrını soruyor. (Kurgusal kişi; oyun içi senaryo.)',
    options: [
      { label: 'Disipline sevk et, ihraç iste', fx: { trust: [2, 4], unity: [-6, -3] } },
      { label: 'Milletvekilini savun', fx: { trust: [-6, -3], unity: [2, 4] } },
      { label: 'Bağımsız soruşturma çağrısı yap', fx: { trust: [1, 2] } },
    ],
    ignore: { trust: -6, momentum: -0.03 } },
  { id: 'video', where: null, icon: '📼', title: 'Yıllar önceki bir konuşma videon gündemde',
    body: 'Senin yıllar önce yaptığın bir konuşmanın kesilmiş bir bölümü sosyal medyada yayılıyor. Rakip hesaplar "çelişki" diyor. (Oyun içi senaryo.)',
    options: [
      { label: 'Özür dile, görüşünün değiştiğini anlat', fx: { trust: [0, 2], image: [-0.01, 0] } },
      { label: 'Bağlamından koparıldığını söyle, tam videoyu yayınla', gamble: { chance: 0.55, win: { trust: [2, 4], heat: [2, 4] }, lose: { trust: [-6, -3], image: [-0.02, -0.01] } } },
      { label: 'Canlı yayına çıkıp açıkla', ap: 1, gamble: { chance: 0.6, win: { trust: [3, 5], visibility: [4, 6] }, lose: { trust: [-4, -2], visibility: [4, 6] } }, charisma: true },
      { label: 'Sessiz kal', fx: { trust: [-2, -1] } },
    ],
    ignore: { trust: -5, image: -0.02 } },
  { id: 'teror', where: 'any', icon: '🕯️', title: '{prov}’da terör saldırısı',
    body: '{prov}’da düzenlenen terör saldırısında can kayıpları var. Ülke yasta; siyasetçilerin tavrı yakından izleniyor. (Oyun içi senaryo.)',
    options: [
      { label: 'Taziye ve milli birlik çağrısı yap', fx: { trust: [2, 4] }, seg: { milliyetci: 0.02 } },
      { label: 'Olay yerine git, ailelerle görüş', ap: 1, fx: { trust: [3, 5], visibility: [4, 6] }, camp: 0.04 },
      { label: 'Güvenlik politikasını eleştir', oppositionOnly: true, fx: { heat: [10, 14], trust: [-3, 1] } },
    ],
    ignore: { trust: -5 } },
  { id: 'fabrika', where: 'sanayi', icon: '🏭', title: '{prov}’da büyük fabrika kapandı',
    body: '{prov}’da bir fabrika kapandı; yaklaşık 2.000 işçi işsiz kaldı. İşçiler fabrika önünde bekliyor. (Oyun içi senaryo.)',
    options: [
      { label: 'Fabrika önünde işçilerle buluş', ap: 1, fx: { trust: [2, 4], visibility: [2, 4] }, seg: { isci: 0.03 }, camp: 0.06 },
      { label: 'Sendikalarla ortak açıklama yap', fx: { trust: [1, 2] }, seg: { isci: 0.015 } },
      { label: 'Hükümetin sanayi politikasını sorumlu tut', oppositionOnly: true, fx: { heat: [5, 8] }, seg: { isci: 0.02 } },
    ],
    ignore: { trust: -2 } },
  { id: 'kaza', where: null, icon: '🚌', title: 'Kampanya otobüsü kaza yaptı',
    body: 'Partinin kampanya otobüsü şehirlerarası yolda kaza yaptı; hafif yaralılar var. Araç denetimleri sorgulanıyor. (Oyun içi senaryo.)',
    options: [
      { label: 'Yaralıları ziyaret et, açıklama yap', ap: 1, fx: { trust: [1, 3], morale: [1, 2] } },
      { label: 'Tüm kampanya araçlarına güvenlik denetimi başlat', money: -500_000, fx: { trust: [2, 3] } },
      { label: 'Kısa bir yazılı açıklama yap', fx: { trust: [0, 1] } },
    ],
    ignore: { trust: -2, morale: -3 } },
];

// Zincirleme olaylar (bir eylemin haftalar sonra gelen sonucu)
export const CHAINS = {
  bagisci: { icon: '💼', title: 'Büyük bağışçı karşılık bekliyor',
    body: 'Kampanyana büyük bağış yapan iş insanı, ileride bir kamu ihalesinde "anlayış" beklediğini iletti. (Kurgusal kişi; oyun içi senaryo.)',
    options: [
      { label: 'Kabul et: ilişkiyi koru', fx: { morale: [0, 1] }, money: 4_000_000, schedule: { weeks: 6, id: 'bagisci_ifsa', chance: 0.45 } },
      { label: 'Reddet: bağışın şartlı olamayacağını söyle', fx: { trust: [1, 3] }, flag: 'donorBurned' },
    ] },
  bagisci_ifsa: { icon: '🧨', title: 'Bağış–ihale ilişkisi basına sızdı',
    body: 'Kampanyana yapılan büyük bağışla bir ihale beklentisi arasındaki yazışmalar basına sızdı. (Oyun içi senaryo.)',
    options: [
      { label: 'Bağışı iade et, özür dile', money: -5_000_000, fx: { trust: [-6, -3] } },
      { label: 'İddiaları reddet', fx: { trust: [-12, -8], heat: [6, 10], image: [-0.03, -0.02] } },
    ] },
  deepfake: { icon: '🎭', title: 'Bir dijital ajanstan "özel" teklif',
    body: 'Bir dijital ajans, rakip lider adına yapay zekâyla sahte bir video üretip yaymayı teklif ediyor. Yakalanırsa ağır hukuki ve siyasi sonuçları olur. (Oyun içi senaryo.)',
    options: [
      { label: 'Kesinlikle reddet ve ajansı ifşa et', fx: { trust: [1, 3], morale: [1, 2] } },
      { label: 'Kabul et', money: -3_000_000, fx: { momentum: [0.03, 0.05] }, dirty: { id: 'deepfake', label: 'sahte video (deepfake) operasyonu', chance: 0.25, weeks: 4, fine: 5_000_000, scandal: { trust: -30, image: -0.08, momentum: -0.1, heat: 30 } } },
    ] },
};
