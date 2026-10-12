// Hükümet politika havuzu — OYUN İÇİ SENARYOLAR (gerçek bir planı veya açıklamayı temsil etmez).
// audience.pro / audience.anti: seçmen kümeleri; econ: ekonomi etkisi; foreign: dış ilişkiler etkisi (puan);
// axis: politikanın ideolojik yönü (desteklemenin parti çizgisiyle tutarlılığı için).
export const POLICIES = [
  { id: 'asgari_ara', cat: 'Ekonomi', title: 'Asgari ücrete ara zam', plan: 'Hükümet, yılın ikinci yarısında asgari ücrete ara zam yapmayı değerlendiriyor.',
    axis: { eko: -1 }, pro: { kararsiz: 1, sol: 0.8, kurt: 0.6, muhafazakar: 0.5 }, anti: { laik_kentli: 0.2 }, econ: { inflation: 2.5, unemployment: 0.2 }, popularity: 0.04 },
  { id: 'sikilastirma', cat: 'Ekonomi', title: 'Sıkı para politikası ve faiz artışları', plan: 'Ekonomi yönetimi enflasyonla mücadele için faiz artışlarını içeren bir program hazırlıyor.',
    axis: { eko: 1 }, pro: { laik_kentli: 0.6 }, anti: { dindar: 0.6, muhafazakar: 0.5, kararsiz: 0.4 }, econ: { target: -8, growth: -1.2, unemployment: 0.4, rate: 10 }, popularity: -0.03 },
  { id: 'vergi', cat: 'Ekonomi', title: 'Yeni vergi paketi (KDV ve ÖTV artışları)', plan: 'Bütçe açığını kapatmak için KDV ve ÖTV oranlarında artış gündemde.',
    axis: { eko: 1 }, pro: {}, anti: { kararsiz: 1, muhafazakar: 0.7, laik_kentli: 0.7, sol: 0.6, milliyetci: 0.5 }, econ: { inflation: 2, growth: -0.4 }, popularity: -0.06 },
  { id: 'ikramiye', cat: 'Sosyal', title: 'Emekli bayram ikramiyesinde artış', plan: 'Emeklilere ödenen bayram ikramiyesinin artırılması için çalışma yapılıyor.',
    pro: { muhafazakar: 1, dindar: 0.8, kararsiz: 0.6, milliyetci: 0.5 }, anti: {}, econ: { inflation: 0.5 }, popularity: 0.04 },
  { id: 'anayasa', cat: 'Hukuk', title: 'Yeni anayasa taslağı', plan: 'İktidar kanadı yeni bir anayasa taslağı üzerinde çalıştığını açıkladı.',
    axis: { ozg: -1 }, pro: { muhafazakar: 0.8, milliyetci: 0.6, dindar: 0.6 }, anti: { laik_kentli: 1, sol: 0.9, kurt: 0.6 }, popularity: 0.0, needs: 360 },
  { id: 'geri_donus', cat: 'İç politika', title: 'Sığınmacılar için gönüllü geri dönüş programı', plan: 'Hükümet, sığınmacıların gönüllü ve güvenli geri dönüşü için bir takvim hazırlıyor.',
    axis: { milli: 1 }, pro: { milliyetci: 1, kararsiz: 0.8, laik_kentli: 0.6, muhafazakar: 0.4 }, anti: { sol: 0.6 }, foreign: { ortadogu: -3, ab: 2 }, popularity: 0.05 },
  { id: 'sosyal_medya', cat: 'Hukuk', title: 'Sosyal medya ve dezenformasyon düzenlemesi', plan: 'Sosyal medya platformlarına yeni yükümlülükler getiren bir düzenleme hazırlanıyor.',
    axis: { ozg: -1 }, pro: { muhafazakar: 0.6, dindar: 0.5 }, anti: { laik_kentli: 1, sol: 1, kararsiz: 0.7 }, foreign: { ab: -4, abd: -2 }, popularity: -0.02 },
  { id: 'deprem_konut', cat: 'Sosyal', title: 'Deprem bölgesinde konut teslim takvimi', plan: 'Deprem bölgesinde yeni konutların teslimi için hızlandırılmış bir takvim açıklanacak.',
    pro: { kararsiz: 0.6, muhafazakar: 0.6, kurt: 0.5, laik_kentli: 0.4 }, anti: {}, econ: { growth: 0.3, inflation: 0.3 }, popularity: 0.05 },
  { id: 'dogalgaz', cat: 'Ekonomi', title: 'Konutlarda doğalgaz desteği', plan: 'Kış ayları için konutlara doğalgaz desteği verilmesi planlanıyor.',
    pro: { kararsiz: 0.8, muhafazakar: 0.7, dindar: 0.6, kurt: 0.5 }, anti: {}, econ: { inflation: 0.8 }, foreign: { rusya: 1 }, popularity: 0.05 },
  { id: 'ab_vize', cat: 'Dış politika', title: 'AB ile vize serbestisi ve gümrük birliği müzakereleri', plan: 'Hükümet, AB ile vize serbestisi ve gümrük birliğinin güncellenmesi için yeni bir süreç başlatmak istiyor.',
    axis: { dis: -1 }, pro: { laik_kentli: 1, kararsiz: 0.7, sol: 0.4 }, anti: { milliyetci: 0.3 }, foreign: { ab: 10, rusya: -2 }, econ: { growth: 0.4 }, popularity: 0.02 },
  { id: 'savunma', cat: 'Dış politika', title: 'Yerli savunma sanayii yatırımları', plan: 'Savunma sanayiinde yeni yerli üretim projelerine kaynak ayrılması planlanıyor.',
    axis: { milli: 1 }, pro: { milliyetci: 1, muhafazakar: 0.8, kararsiz: 0.3 }, anti: { sol: 0.4 }, foreign: { komsu: 2 }, econ: { growth: 0.3 }, popularity: 0.03 },
  { id: 'yargi_paketi', cat: 'Hukuk', title: 'Yargı paketi ve infaz düzenlemesi', plan: 'Yeni yargı paketinde infaz düzenlemesi ve yargılama süreleri ele alınacak.',
    pro: { kararsiz: 0.3 }, anti: { laik_kentli: 0.3, milliyetci: 0.3 }, foreign: { ab: 1 }, popularity: 0.0 },
  { id: 'ozellestirme', cat: 'Ekonomi', title: 'Kamu varlıklarının özelleştirilmesi', plan: 'Bazı kamu şirketlerinin özelleştirilmesi gündemde.',
    axis: { eko: 1 }, pro: { laik_kentli: 0.3 }, anti: { sol: 1, milliyetci: 0.6, kurt: 0.4 }, econ: { growth: 0.3, usd: -0.02 }, popularity: -0.02 },
  { id: 'tarim', cat: 'Ekonomi', title: 'Çiftçiye mazot ve gübre desteği', plan: 'Hükümet, üreticiye mazot ve gübre desteğinin artırılmasını değerlendiriyor.',
    pro: { muhafazakar: 0.9, dindar: 0.7, milliyetci: 0.6, kurt: 0.4 }, anti: {}, econ: { inflation: 0.3, growth: 0.2 }, popularity: 0.04 },
  { id: 'enerji_zam', cat: 'Ekonomi', title: 'Elektrik ve doğalgaza zam', plan: 'Enerji fiyatlarında yeni bir düzenleme yapılacağı konuşuluyor.',
    pro: {}, anti: { kararsiz: 1, muhafazakar: 0.8, sol: 0.8, laik_kentli: 0.6, kurt: 0.6, dindar: 0.6 }, econ: { inflation: 2.5 }, popularity: -0.06 },
  { id: 'arabuluculuk', cat: 'Dış politika', title: 'Bölgesel çatışmada arabuluculuk girişimi', plan: 'Türkiye, bölgedeki bir çatışmada arabuluculuk rolü üstlenmeyi planlıyor.',
    pro: { muhafazakar: 0.6, kararsiz: 0.5, laik_kentli: 0.4 }, anti: {}, foreign: { ortadogu: 6, abd: 2, ab: 2 }, popularity: 0.03 },
  { id: 'enerji_anlasmasi', cat: 'Dış politika', title: 'Rusya ile uzun vadeli enerji anlaşması', plan: 'Rusya ile uzun vadeli doğalgaz ve nükleer enerji işbirliği görüşülüyor.',
    axis: { dis: 1 }, pro: { milliyetci: 0.4, muhafazakar: 0.4 }, anti: { laik_kentli: 0.6 }, foreign: { rusya: 8, ab: -3, abd: -4 }, econ: { inflation: -0.3 }, popularity: 0.01 },
  { id: 'nato', cat: 'Dış politika', title: 'NATO zirvesinde yeni taahhütler', plan: 'Hükümet NATO zirvesinde yeni savunma taahhütleri vermeye hazırlanıyor.',
    axis: { dis: -1 }, pro: { laik_kentli: 0.5, milliyetci: 0.3 }, anti: { sol: 0.7 }, foreign: { abd: 8, ab: 4, rusya: -5 }, popularity: 0.01 },
  { id: 'memur_zam', cat: 'Sosyal', title: 'Memur ve emekli maaşlarına refah payı', plan: 'Memur ve emekli maaşlarına enflasyon farkına ek refah payı verilmesi tartışılıyor.',
    pro: { muhafazakar: 0.8, kararsiz: 0.7, laik_kentli: 0.5, sol: 0.5 }, anti: {}, econ: { inflation: 1.2 }, popularity: 0.05 },
  { id: 'egitim', cat: 'Sosyal', title: 'Eğitim müfredatında değişiklik', plan: 'Milli Eğitim\'de yeni bir müfredat değişikliği planlanıyor.',
    axis: { din: 1 }, pro: { dindar: 0.9, muhafazakar: 0.6 }, anti: { laik_kentli: 1, sol: 0.8 }, popularity: 0.0 },
];

export const FOREIGN_AXES = [
  { id: 'ab', label: 'Avrupa Birliği', icon: '🇪🇺' },
  { id: 'abd', label: 'ABD', icon: '🇺🇸' },
  { id: 'rusya', label: 'Rusya', icon: '🇷🇺' },
  { id: 'ortadogu', label: 'Orta Doğu ve Körfez', icon: '🕌' },
  { id: 'komsu', label: 'Komşular ve bölge', icon: '🧭' },
];

// Haziran 2023 başlangıç değerleri — tasarım varsayımı (0–100)
export const FOREIGN_START = { ab: 42, abd: 45, rusya: 58, ortadogu: 60, komsu: 52 };

// Dünya gündemi (kurgusal) — dış ilişkileri ve ekonomiyi etkiler
export const WORLD_NEWS = [
  { text: 'Avrupa\'da enerji fiyatları yeniden yükseldi', foreign: {}, econ: { inflation: 0.5 } },
  { text: 'Bölgede çatışmalar yoğunlaştı; sınır illerinde güvenlik önlemleri artırıldı', foreign: { komsu: -4, ortadogu: -2 } },
  { text: 'Küresel piyasalarda faiz artışı beklentisi: gelişmekte olan ülke paraları baskı altında', econ: { usd: 0.03 } },
  { text: 'Avrupa Komisyonu Türkiye raporunu açıkladı', foreign: { ab: -3 } },
  { text: 'Türkiye–ABD arasında savunma alanında yeni görüşme turu', foreign: { abd: 3 } },
  { text: 'Körfez ülkelerinden Türkiye\'ye yatırım ilgisi arttı', foreign: { ortadogu: 4 }, econ: { growth: 0.2 } },
  { text: 'Karadeniz\'de tahıl koridoru görüşmeleri sürüyor', foreign: { rusya: 2, ab: 1 } },
  { text: 'Petrol fiyatları sert düştü', econ: { inflation: -0.6 } },
  { text: 'Kredi derecelendirme kuruluşu Türkiye\'nin görünümünü güncelledi', econ: { usd: -0.02 }, foreign: { abd: 1, ab: 1 } },
  { text: 'Komşu ülkede siyasi kriz: göç dalgası endişesi', foreign: { komsu: -3 } },
];
