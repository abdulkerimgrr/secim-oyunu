// Karakter oluşturma seçenekleri. Meslek ve özellikler oyun mekaniğine bağlıdır (engine/character.js).

export const LOOKS = {
  gender: [['k', 'Kadın'], ['e', 'Erkek']],
  skin: ['#F6D7C3', '#EBC2A3', '#D9A47F', '#C08660', '#9C6644', '#6F4A33'],
  face: [['oval', 'Oval'], ['yuvarlak', 'Yuvarlak'], ['koseli', 'Köşeli']],
  hairStyle: {
    e: [['kisa', 'Kısa'], ['yan', 'Yandan ayrık'], ['geriye', 'Geriye taranmış'], ['dalgali', 'Dalgalı'], ['seyrek', 'Seyrek'], ['kel', 'Kel']],
    k: [['kisa', 'Kısa'], ['omuz', 'Omuz hizası'], ['topuz', 'Topuz'], ['uzun', 'Uzun'], ['dalgali', 'Dalgalı'], ['basortu', 'Başörtülü']],
  },
  hairColor: [['#1E1A18', 'Siyah'], ['#4A3226', 'Koyu kahve'], ['#7A5236', 'Kumral'], ['#B88A4E', 'Sarı'], ['#8E8E8E', 'Kır'], ['#D9D9D9', 'Beyaz']],
  facial: [['yok', 'Yok'], ['biyik', 'Bıyık'], ['sakal', 'Sakal'], ['kirli', 'Kirli sakal'], ['kepce', 'Kalın bıyık']],
  glasses: [['yok', 'Yok'], ['ince', 'İnce çerçeve'], ['kalin', 'Kalın çerçeve']],
  suit: ['#1F2A44', '#2D2D2D', '#3B4A5E', '#5A4636', '#6B6F76', '#1E3D33'],
  accent: ['#B3202E', '#1F5FA8', '#2F7A4A', '#C79A2B', '#6B3FA0', '#E0E0E0'],
  scarf: ['#B3202E', '#1F5FA8', '#2F7A4A', '#C79A2B', '#6B3FA0', '#D8C7B0'],
};

export const PROFESSIONS = [
  { id: 'avukat', label: 'Avukat', desc: 'Skandal ve usulsüzlük riski azalır; kurultayda ilke vurgusu güçlü.' },
  { id: 'ekonomist', label: 'Ekonomist', desc: 'Ekonomi konulu miting ve cevaplar daha etkili.' },
  { id: 'akademisyen', label: 'Akademisyen', desc: 'TV programlarında tanınırlık kazancı artar.' },
  { id: 'isinsani', label: 'İş insanı', desc: 'Bağış kampanyaları %30 daha verimli; kişisel bütçe yüksek.' },
  { id: 'sendikaci', label: 'Sendikacı', desc: 'Teşkilat ve delegelerle görüşmeler daha etkili.' },
  { id: 'doktor', label: 'Doktor', desc: 'Lider imajı yüksek başlar.' },
  { id: 'gazeteci', label: 'Gazeteci', desc: 'Canlı yayında gaf riski düşer.' },
  { id: 'ogretmen', label: 'Öğretmen', desc: 'Saha ziyaretleri ve mitinglerde yerel etki artar.' },
  { id: 'muhendis', label: 'Mühendis', desc: 'Yerel hizmet konulu mesajlar daha etkili.' },
];

export const EDUCATION = [['lise', 'Lise'], ['lisans', 'Lisans'], ['yl', 'Yüksek lisans'], ['doktora', 'Doktora']];

// En fazla 2 özellik seçilir
export const TRAITS = [
  { id: 'hatip', label: 'Hatip', desc: 'Miting etkisi +%15' },
  { id: 'sogukkanli', label: 'Soğukkanlı', desc: 'Gaf riski −%30' },
  { id: 'halkci', label: 'Halk adamı', desc: 'Ziyaret etkisi +%25' },
  { id: 'medyatik', label: 'Medyatik', desc: 'TV etkisi +%20' },
  { id: 'muzakereci', label: 'Müzakereci', desc: 'Hizip pazarlıkları ve ittifak şansı artar' },
  { id: 'sert', label: 'Sert mizaçlı', desc: 'Sert ton daha etkili, ama gaf riski +%20' },
  { id: 'teknokrat', label: 'Teknokrat', desc: 'Ekonomi ve hizmet mesajları +%15' },
  { id: 'calistay', label: 'Çalışkan', desc: 'Haftada +1 eylem puanı, iç huzur yavaş düşer' },
];

export function randomCharacter(rnd = Math.random) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const gender = rnd() < 0.5 ? 'k' : 'e';
  const age = 38 + Math.floor(rnd() * 30);
  return {
    gender, age,
    skin: pick(LOOKS.skin), face: pick(LOOKS.face)[0],
    hairStyle: pick(LOOKS.hairStyle[gender].filter(h => h[0] !== 'basortu'))[0],
    hairColor: age > 60 ? pick(LOOKS.hairColor.slice(4))[0] : pick(LOOKS.hairColor.slice(0, 4))[0],
    facial: gender === 'e' ? pick(LOOKS.facial)[0] : 'yok',
    glasses: rnd() < 0.35 ? pick(LOOKS.glasses.slice(1))[0] : 'yok',
    suit: pick(LOOKS.suit), accent: pick(LOOKS.accent), scarf: pick(LOOKS.scarf),
    profession: pick(PROFESSIONS).id, education: pick(EDUCATION)[0], hometown: 1 + Math.floor(rnd() * 81),
    traits: [],
  };
}
