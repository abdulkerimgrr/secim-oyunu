// Seçmen kümeleri — OYUN TASARIM VARSAYIMI.
// Her seçim bölgesindeki kümelerin payı 2023 parti oylarından türetilir (engine/model.js),
// yani gerçek demografi değil, oy davranışına dayalı bir yaklaşımdır. İlçe/demografi verisi sonraki aşamada.
//
// econ: ekonomik hoşnutsuzluğa duyarlılık · flex: kampanya etkisine açıklık
// strategic: taktik oy eğilimi · turnout: göreli katılım · lambda: ideolojik mesafeye duyarlılık
// priorities: gündem önceliği ağırlıkları (miting konusu uyumu için)

export const CLUSTERS = [
  { id: 'muhafazakar', label: 'Muhafazakâr merkez sağ',
    ideo: { eko: 0.2, din: 0.6, milli: 0.4, yerel: -0.3, dis: 0.2, ozg: -0.3, deger: -0.6 },
    econ: 0.8, flex: 0.8, strategic: 0.6, turnout: 1.0, lambda: 2.5,
    priorities: { ekonomi: 0.35, guvenlik: 0.25, kimlik: 0.25, adalet: 0.05, hizmet: 0.1 } },
  { id: 'milliyetci', label: 'Milliyetçi',
    ideo: { eko: 0.2, din: 0.2, milli: 0.9, yerel: -0.6, dis: 0.1, ozg: -0.4, deger: -0.4 },
    econ: 0.6, flex: 0.9, strategic: 0.7, turnout: 1.0, lambda: 2.5,
    priorities: { ekonomi: 0.3, guvenlik: 0.4, kimlik: 0.2, adalet: 0.05, hizmet: 0.05 } },
  { id: 'laik_kentli', label: 'Laik kentli',
    ideo: { eko: -0.1, din: -0.7, milli: 0.3, yerel: -0.1, dis: -0.4, ozg: 0.5, deger: 0.5 },
    econ: 0.5, flex: 0.9, strategic: 0.9, turnout: 1.02, lambda: 2.5,
    priorities: { ekonomi: 0.35, guvenlik: 0.1, kimlik: 0.1, adalet: 0.3, hizmet: 0.15 } },
  { id: 'kurt', label: 'Kürt seçmen',
    ideo: { eko: -0.4, din: 0.1, milli: -0.8, yerel: 0.9, dis: -0.1, ozg: 0.6, deger: 0.0 },
    econ: 0.5, flex: 0.7, strategic: 0.5, turnout: 0.95, lambda: 2.5,
    priorities: { ekonomi: 0.25, guvenlik: 0.05, kimlik: 0.35, adalet: 0.3, hizmet: 0.05 } },
  { id: 'dindar', label: 'Dindar gelenekçi',
    ideo: { eko: -0.2, din: 0.95, milli: 0.4, yerel: -0.2, dis: 0.5, ozg: -0.4, deger: -0.9 },
    econ: 0.9, flex: 0.8, strategic: 0.5, turnout: 1.0, lambda: 2.5,
    priorities: { ekonomi: 0.35, guvenlik: 0.1, kimlik: 0.4, adalet: 0.1, hizmet: 0.05 } },
  { id: 'sol', label: 'Sol / özgürlükçü',
    ideo: { eko: -0.9, din: -0.8, milli: -0.4, yerel: 0.4, dis: 0.3, ozg: 0.8, deger: 0.8 },
    econ: 0.4, flex: 1.0, strategic: 0.8, turnout: 1.0, lambda: 2.5,
    priorities: { ekonomi: 0.35, guvenlik: 0.0, kimlik: 0.1, adalet: 0.4, hizmet: 0.15 } },
  { id: 'kararsiz', label: 'Kararsız / genç',
    ideo: { eko: 0.0, din: 0.0, milli: 0.3, yerel: 0.0, dis: 0.0, ozg: 0.2, deger: 0.1 },
    econ: 1.2, flex: 1.4, strategic: 0.8, turnout: 0.9, lambda: 1.5,
    priorities: { ekonomi: 0.5, guvenlik: 0.1, kimlik: 0.05, adalet: 0.15, hizmet: 0.2 } },
];

// Parti oylarının kümelere dağıtımı (küme paylarını üretmek için). AKP'nin Kürt kümesi payı
// bölgedeki YSP oyuna göre dinamik eklenir (engine/model.js).
export const PARTY_TO_CLUSTER = {
  AKP:   { muhafazakar: 0.75, milliyetci: 0.06, dindar: 0.06, kararsiz: 0.13 },
  CHP:   { laik_kentli: 0.70, sol: 0.08, milliyetci: 0.05, kurt: 0.04, kararsiz: 0.13 },
  MHP:   { milliyetci: 0.80, muhafazakar: 0.10, kararsiz: 0.10 },
  IYI:   { milliyetci: 0.45, laik_kentli: 0.30, kararsiz: 0.25 },
  YSP:   { kurt: 0.80, sol: 0.15, kararsiz: 0.05 },
  YRP:   { dindar: 0.80, muhafazakar: 0.10, kararsiz: 0.10 },
  ZP:    { milliyetci: 0.60, laik_kentli: 0.20, kararsiz: 0.20 },
  TIP:   { sol: 0.75, laik_kentli: 0.15, kararsiz: 0.10 },
  BBP:   { milliyetci: 0.55, dindar: 0.35, kararsiz: 0.10 },
  MP:    { laik_kentli: 0.40, milliyetci: 0.30, kararsiz: 0.30 },
  DIGER: { kararsiz: 0.6, muhafazakar: 0.1, laik_kentli: 0.1, milliyetci: 0.1, sol: 0.1 },
};

// Gündem başlıkları (miting/açıklama konuları)
export const TOPICS = [
  { id: 'ekonomi', label: 'Ekonomi ve hayat pahalılığı' },
  { id: 'guvenlik', label: 'Güvenlik ve beka' },
  { id: 'kimlik', label: 'Kimlik ve değerler' },
  { id: 'adalet', label: 'Adalet ve demokrasi' },
  { id: 'hizmet', label: 'Yerel hizmet ve altyapı' },
];
