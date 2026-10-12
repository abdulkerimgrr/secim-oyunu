// Parti içi hizipler ve kurultay parametreleri — OYUN TASARIM VARSAYIMI.
// Hizip adları genelleştirilmiş tanımlardır; gerçek kişileri veya grupları temsil etmez.
// prefs: canlı yayın cevap etiketlerine tepki (+ olumlu, − olumsuz)
// start: oyuncunun başlangıç desteği (%), weight: delege ağırlığı (toplam 1)

export const FACTION_TYPES = {
  yonetim:   { label: 'Genel merkez yönetimi', desc: 'Mevcut genel başkana bağlı MYK ve PM üyeleri',
               prefs: { sadakat: 1.2, uzlasma: 0.6, tecrube: 0.5, degisim: -1.0, sert: -0.7, kacamak: -0.3 } },
  teskilat:  { label: 'İl ve ilçe başkanları', desc: 'Delegelerin büyük kısmını belirleyen teşkilat',
               prefs: { teskilat: 1.3, uzlasma: 0.5, degisim: 0.3, ilke: 0.2, sert: -0.3, kacamak: -0.4 } },
  degisimci: { label: 'Değişimciler ve gençler', desc: 'Yenilenme isteyen genç delegeler ve kadın kolları',
               prefs: { degisim: 1.3, genclik: 1.0, sert: 0.3, merkez: 0.3, sadakat: -0.6, kacamak: -0.6 } },
  cekirdek:  { label: 'İdeolojik çekirdek', desc: 'Partinin kurucu çizgisine bağlı kadrolar',
               prefs: { ideoloji: 1.3, ilke: 0.7, bagimsiz: 0.5, merkez: -0.8, ittifak: -0.3, kacamak: -0.4 } },
};

// Parti bazlı yapı. delegates: büyük kongre delege sayısı — tahmini.
// signatures: aday olmak için gereken delege imzası oranı — tahmini (parti tüzükleri doğrulanmalı).
export const PARTY_KURULTAY = {
  AKP: { delegates: 1450, signatures: 0.2, pull: 0.8, cekirdek: 'Muhafazakâr çekirdek',
         factions: { yonetim: [0.5, 0.5], teskilat: [0.3, 1.5], degisimci: [0.1, 10], cekirdek: [0.1, 2] } },
  MHP: { delegates: 1150, signatures: 0.2, pull: 0.8, cekirdek: 'Ülkücü çekirdek',
         factions: { yonetim: [0.55, 0.5], teskilat: [0.3, 1.5], degisimci: [0.05, 12], cekirdek: [0.1, 2] } },
  CHP: { delegates: 1370, signatures: 0.2, pull: 0.22, cekirdek: 'Ulusalcı-Kemalist kanat',
         factions: { yonetim: [0.35, 2], teskilat: [0.27, 14], degisimci: [0.24, 34], cekirdek: [0.14, 10] } },
  IYI: { delegates: 1100, signatures: 0.2, pull: 0.4, cekirdek: 'Milliyetçi çekirdek',
         factions: { yonetim: [0.4, 1.5], teskilat: [0.28, 9], degisimci: [0.18, 25], cekirdek: [0.14, 8] } },
  YSP: { delegates: 1000, signatures: 0.2, pull: 0.4, cekirdek: 'Hareket çekirdeği',
         factions: { yonetim: [0.4, 2], teskilat: [0.3, 9], degisimci: [0.16, 24], cekirdek: [0.14, 6] } },
  DEFAULT: { delegates: 900, signatures: 0.2, pull: 0.35, cekirdek: 'İdeolojik çekirdek',
         factions: { yonetim: [0.38, 2], teskilat: [0.3, 10], degisimci: [0.18, 26], cekirdek: [0.14, 8] } },
};
