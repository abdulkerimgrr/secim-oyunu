// Miting seçenekleri — oyun tasarımı.
export const VENUES = [
  { id: 'meydan', label: 'Kent meydanı', icon: '🏟️', cap: 1.0, cost: 1.0, effect: 1.0, open: true, desc: 'En büyük etki; dolmazsa "boş meydan" manşeti.' },
  { id: 'park', label: 'Açık alan / millet bahçesi', icon: '🌳', cap: 0.5, cost: 0.6, effect: 0.8, open: true, desc: 'Orta ölçek; daha kolay dolar.' },
  { id: 'salon', label: 'Kapalı spor salonu', icon: '🏛️', cap: 0.12, cost: 0.4, effect: 0.6, open: false, desc: 'Küçük ama dolu salon; havadan etkilenmez.' },
];

export const TRANSPORT = [
  { id: 'yok', label: 'Lojistik yok', crowd: 1.0, cost: 0, risk: 0 },
  { id: 'orta', label: 'Orta (otobüs, ikram)', crowd: 1.25, cost: 0.4, risk: 0.05 },
  { id: 'yuksek', label: 'Yüksek (ilçelerden taşıma)', crowd: 1.55, cost: 1.0, risk: 0.14 },
];

// Konuşma metinleri: audience = seçmen kümeleri, axis = ideolojik yön (parti çizgisiyle tutarlılık)
export const SPEECHES = {
  ekonomi: [
    { id: 'asgari', text: 'Asgari ücreti yoksulluk sınırının üzerine çıkaracağız!', audience: { kararsiz: 1, sol: 0.8, kurt: 0.5 }, axis: { eko: -1 } },
    { id: 'esnaf', text: 'Esnafın, çiftçinin vergi yükünü hafifleteceğiz!', audience: { muhafazakar: 0.9, milliyetci: 0.7, dindar: 0.5 }, axis: { eko: 1 } },
    { id: 'genc', text: 'Gençlere iş, emekliye huzur, herkese ekmek!', audience: { kararsiz: 0.8, muhafazakar: 0.5, laik_kentli: 0.5 } },
  ],
  guvenlik: [
    { id: 'beka', text: 'Bu ülkenin birliğine kimse göz dikemez!', audience: { milliyetci: 1, muhafazakar: 0.6 }, axis: { milli: 1 } },
    { id: 'huzur', text: 'Huzur, adalet ve kardeşlikle gelir!', audience: { kurt: 0.9, sol: 0.6, kararsiz: 0.4 }, axis: { milli: -1 } },
    { id: 'goc', text: 'Sınırlarımızı koruyacak, göçü kontrol edeceğiz!', audience: { milliyetci: 0.8, kararsiz: 0.7, laik_kentli: 0.4 }, axis: { milli: 1 } },
  ],
  kimlik: [
    { id: 'deger', text: 'Değerlerimiz, ailemiz ve inancımız bizim pusulamız!', audience: { dindar: 1, muhafazakar: 0.8 }, axis: { din: 1 } },
    { id: 'laik', text: 'Kimse kimsenin yaşam tarzına karışmayacak!', audience: { laik_kentli: 1, sol: 0.6 }, axis: { din: -1 } },
    { id: 'birlik', text: 'Bu meydanda ayrım yok, hepimiz bu ülkenin evladıyız!', audience: { kararsiz: 0.9, muhafazakar: 0.4, kurt: 0.4 } },
  ],
  adalet: [
    { id: 'yargi', text: 'Bağımsız yargıyı geri getireceğiz!', audience: { laik_kentli: 0.9, sol: 0.8, kurt: 0.6 }, axis: { ozg: 1 } },
    { id: 'suc', text: 'Suçluya karşı devletin gücünü göstereceğiz!', audience: { muhafazakar: 0.8, milliyetci: 0.8 }, axis: { ozg: -1 } },
    { id: 'liyakat', text: 'Torpil değil liyakat, kayırma değil hak!', audience: { kararsiz: 1, laik_kentli: 0.5, muhafazakar: 0.4 } },
  ],
  hizmet: [
    { id: 'deprem', text: 'Depreme dayanıklı şehirler kuracağız!', audience: { kararsiz: 0.8, laik_kentli: 0.6, muhafazakar: 0.5 } },
    { id: 'yerel', text: 'Kararlar Ankara’da değil, burada alınacak!', audience: { kurt: 0.9, laik_kentli: 0.5 }, axis: { yerel: 1 } },
    { id: 'yol', text: 'Bu şehre hastane, okul ve yol getireceğiz!', audience: { muhafazakar: 0.9, kararsiz: 0.6, dindar: 0.5 } },
  ],
};
