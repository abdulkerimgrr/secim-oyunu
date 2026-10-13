// Demografik seçmen grupları — OYUN TASARIM VARSAYIMI.
// Oyunun seçmen modeli ideolojik kümelerle çalışır; demografik gruplar bu kümelerin ağırlıklı
// birleşimi olarak tanımlanır (ör. emekliler daha çok muhafazakâr ve kararsız kümelerde).
// Ağırlıklar yaklaşıktır ve gerçek bir araştırmaya dayanmaz.

export const SEGMENTS = [
  { id: 'genc', label: 'Gençler (18–25)', icon: '🎓', w: { kararsiz: 1, sol: 0.6, laik_kentli: 0.45, kurt: 0.35, milliyetci: 0.2 } },
  { id: 'kadin', label: 'Kadın seçmenler', icon: '👩', w: { kararsiz: 0.7, laik_kentli: 0.55, muhafazakar: 0.5, sol: 0.3 } },
  { id: 'emekli', label: 'Emekliler', icon: '👴', w: { muhafazakar: 0.7, kararsiz: 0.5, laik_kentli: 0.45, milliyetci: 0.35, dindar: 0.3 } },
  { id: 'isci', label: 'İşçiler', icon: '🏭', w: { sol: 0.7, kararsiz: 0.6, muhafazakar: 0.45, kurt: 0.4, milliyetci: 0.25 } },
  { id: 'esnaf', label: 'Esnaf ve KOBİ', icon: '🏪', w: { muhafazakar: 0.75, milliyetci: 0.45, kararsiz: 0.4, laik_kentli: 0.3 } },
  { id: 'kirsal', label: 'Kırsal ve çiftçiler', icon: '🌾', w: { muhafazakar: 0.8, dindar: 0.55, milliyetci: 0.45, kurt: 0.3 } },
  { id: 'kentli', label: 'Eğitimli kentliler', icon: '🏙️', w: { laik_kentli: 1, sol: 0.55, kararsiz: 0.35 } },
  { id: 'milliyetci', label: 'Milliyetçi-muhafazakâr', icon: '🇹🇷', w: { milliyetci: 1, muhafazakar: 0.55, dindar: 0.3 } },
];

export const segmentById = id => SEGMENTS.find(s => s.id === id);
