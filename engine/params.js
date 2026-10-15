// Model katsayıları — denge ayarı buradan yapılır.
export const K = {
  recog: 1.4,        // tanınırlık: log(tanınırlık) çarpanı
  org: 0.8,          // teşkilat gücü: log(güç + 0.03) çarpanı
  image: 1.6,        // lider imajı değişimi
  econ: 0.035,       // sefalet endeksi (enflasyon + 2×işsizlik) değişiminin iktidara etkisi
  tactical: 0.8,     // barajın altında kalan partiye taktik oy cezası
  ideologyShift: 2.0,// tabanın ideoloji kaymasına tepkisi (katıl modunda)
  campDecay: 0.93,   // haftalık kampanya etkisi sönümü
  momDecay: 0.9,     // haftalık ulusal ivme sönümü
  noiseNat: 0.06,    // seçim günü ulusal sapma (fayda birimi)
  noiseReg: 0.05,    // bölgesel sapma
  noiseUnit: 0.07,   // seçim bölgesi sapması
  pollSd: 0.012,     // anket hatası (yüzde puan / 100)
};

export const DIFFICULTY = {
  kolay:   { label: 'Kolay',    effect: 1.35, rival: 0.7, money: 1.5, noise: 0.8 },
  normal:  { label: 'Normal',   effect: 1.15, rival: 0.85, money: 1.2, noise: 1.0 },
  zor:     { label: 'Zor',      effect: 1.0,  rival: 1.0, money: 1.0, noise: 1.0 },
  cokzor:  { label: 'Çok zor',  effect: 0.85, rival: 1.2, money: 0.8, noise: 1.2 },
};

// Tur uzunluğu: normal dönemde 1 ay, seçim kampanyasında 1 hafta. Eylem başına etki, turda daha az
// eylem yapıldığı için ölçeklenir (haftalık sürümle yaklaşık aynı aylık toplam etki).
export const TURN = { normalDays: 30, campaignDays: 7, apMonth: 12, apCampaign: 8 };
export function turnEffect(state) { return state?.phase === 'campaign' ? 1.35 : 1.7; }
