# Veri kaynakları ve doğrulama durumu

Durum etiketleri: **kaynaklı** (resmi veya güvenilir kaynakla karşılaştırıldı) · **tahmini** (bilgi tabanından; resmi metinle doğrulanmalı) · **tasarım** (oyun varsayımı).

## Seçim sonuçları (kaynaklı)
- **2023 Milletvekili Genel Seçimi, 87 seçim bölgesi**: kayıtlı seçmen, katılım ve parti oyları.
  - `turkeyelections` R paketi (MIT lisansı, Ozancan Özdemir), YSK verisinden derlenmiş: https://github.com/ozancanozdemir/turkeyelections
  - Tek bölgeli 77 ilin oy sayıları ve il bazında sandalyeler: `AnketDelisi/Turkiye` işlenmiş YSK verisi: https://github.com/AnketDelisi/Turkiye (birinci kaynakta Isparta, Uşak, Kahramanmaraş ve Batman'da sayımlar eksikti).
  - İttifak kutusuna basılan oylar, ittifak partilerine oy oranlarıyla dağıtıldı (YSK uygulaması).
  - **Doğrulama:** Model bu verilerle D'Hondt + %7 baraj + ittifak kuralı uygulayınca 2023 meclisini birebir üretir: AKP 268, CHP 169, YSP 61, MHP 50, İYİ 43, YRP 5, TİP 4 (`tests/model.test.js`).
- **Alt bölge sandalyeleri (türetildi)**: İstanbul 36/27/35, Ankara 13/11/12, İzmir 14/14, Bursa 10/10. Bu sayılar, gerçek il toplamlarını D'Hondt ile birebir üreten ve seçmen sayısına en yakın dağılım aranarak bulundu. YSK listesiyle karşılaştırılmalı.

## Harita (kaynaklı)
- 81 il sınırı: `turkey-map-react` npm paketi (MIT, Erdi Gökçe). Koordinatlar 1 ondalığa yuvarlandı.

## Mevzuat (`data/rules.js`)
| Kural | Değer | Durum |
|---|---|---|
| Sandalye sayısı | 600 | kaynaklı (Anayasa m.75) |
| Yöntem | D'Hondt, seçim bölgesi bazında | kaynaklı |
| Ülke barajı | %7 (2022 öncesi %10) | kaynaklı (7393 s. Kanun) |
| İttifak kuralı | İttifak toplamı barajı geçerse tüm üyeler geçer; sandalye hesabı parti bazında | kaynaklı (7393 s. Kanun) |
| Seçime katılım | İllerin en az yarısında teşkilat + seçimden en az 6 ay önce büyük kongre | **tahmini** (2839 s. Kanun m.33 / 2820 s. SPK m.36 doğrulanmalı) |
| Hazine yardımı | Genel bütçe gelirlerinin beşbinde ikisi; %3 eşiği; seçim yılında 3 kat; 2023 ≈ ₺1,505 milyar | kaynaklı (haber kaynakları), tutarlar **tahmini** |
| Büyük kongre için 20 il teşkilatı | Oyun kuralı | **tasarım** |

Kaynaklar: alomaliye.com (7393 s. Kanun metni), TBB Dergisi (2022 değişikliklerinin etkileri), Cumhuriyet/Medyascope/Evrensel (Hazine yardımı haberleri).

## Ekonomi (tahmini)
Başlangıç (Haziran 2023): yıllık enflasyon %38,2, işsizlik %9,6, dolar/TL 25,8, büyüme %3,5. Sonrası simülasyondur, gerçek veriyi izlemez.

## Partiler ve liderler (kaynaklı)
Haziran 2023 genel başkanları, YSK aday listesindeki parti başkanlarıdır. CHP 38. Olağan Kurultayı tarihi (4–5 Kasım 2023) gerçek takvimdir; kurultay sonucu oyunda simüle edilir.

## Kurultay (tahmini / tasarım)
- Delege sayıları (CHP ≈1.370, AKP ≈1.450 vb.) ve adaylık için %20 delege imzası şartı **tahmini**; parti tüzükleriyle doğrulanmalı (`data/factions.js`).
- Hizipler (genel merkez yönetimi, il ve ilçe başkanları, değişimciler, ideolojik çekirdek) genelleştirilmiş **tasarım** kategorileridir; gerçek kişi veya grupları temsil etmez.
- Canlı yayın programları, kanallar ve sunucular kurgusaldır (`data/tv.js`).
- Gazeteler, yorumcular ve sosyal medyadaki vatandaşlar kurgusaldır (`data/press.js`); sosyal medya platform adları (TikTok, X, Facebook, Instagram, YouTube, WhatsApp, Spotify) gerçek markalardır ve yalnızca oyun içi tanımlama için kullanılır; markaların oyunla ilişkisi yoktur (`data/social.js`). Hükümet ve gerçek partilerin tepkileri doğrudan alıntı olmadan, oyun içi özet olarak verilir.

## Hükümet gündemi, Cumhurbaşkanlığı, dış ilişkiler (tasarım / kısmen kaynaklı)
- Hükümet politika havuzu (`data/policies.js`) **oyun içi senaryodur**; gerçek bir planı veya açıklamayı temsil etmez.
- Cumhurbaşkanlığı seçimi: iki tur, salt çoğunluk; aday gösterme için %5 oy / grup ya da 100 bin seçmen imzası — Anayasa m.101 (kaynaklı, sadeleştirilmiş). Görev süresi: iki dönem (2018 ve 2023 seçimleri sayılır — **tahmini yorum**); bu nedenle oyunda 2028'de iktidar partisi yeni bir adayla yarışır.
- Başlangıç politika faizi %15 (Haziran 2023 — tahmini). Dış ilişki puanları ve dünya gündemi tasarım varsayımıdır.
- Bakan adayları, ekip çalışanları ve tartışma moderatörü kurgusaldır.

## Tasarım varsayımları
Parti ideoloji konumları, seçmen kümeleri ve bunların payları (2023 oylarından türetilir), medya erişimi, lider karizması, bütçe kalemleri ve tüm denge katsayıları (`engine/params.js`) oyun tasarımıdır. Gerçek kişi veya kurumlar hakkında iddia içermez. Olay havuzundaki tüm olaylar kurgusaldır.

## "Bugün" senaryosu — Ekim 2026 (`data/scenarioToday.js`)
| Veri | Değer | Durum / kaynak |
|---|---|---|
| Yıllık enflasyon | %29,7 (Eylül 2026) | kaynaklı — TÜİK (SBB enflasyon sayfası üzerinden) |
| Politika faizi | %37 (10 Eylül 2026 PPK) | kaynaklı — TCMB; GCM Yatırım, Bigpara |
| İşsizlik | %7,8 (Ağustos 2026) | kaynaklı — TÜİK (30 Eylül 2026 bülteni) |
| Dolar/TL | ≈49,3 (9 Ekim 2026) | kaynaklı — Investing.com, Foreks |
| Büyüme | %3,5 | **tahmini** |
| TBMM dağılımı | AK Parti 280, Yeni Parti 91, DEM 56, MHP 46, CHP 44, İYİ 27, Yeni Yol 20, diğer/bağımsız 28 (592 dolu) | kaynaklı — Cumhuriyet, Anka, Euronews (Temmuz–Ekim 2026); Yeni Yol ve küçük gruplar oyunda "Diğer"de |
| Yeni Parti | 24 Temmuz 2026, Özgür Özel ve CHP'den ayrılan milletvekilleri | kaynaklı — Euronews, Yetkin Report, Vikipedi |
| CHP genel başkanı | Kemal Kılıçdaroğlu, "mutlak butlan" kararı sonrası tedbiren (Mayıs 2026) | kaynaklı — Vikipedi; hukuki süreç sürüyor |
| İYİ Parti | Müsavat Dervişoğlu | kaynaklı — iyiparti.org.tr |
| DEM Parti | Tülay Hatimoğulları – Tuncer Bakırhan | kaynaklı — chp.org.tr haberi (Haziran 2026) |
| Zafer Partisi | Ümit Özdağ | kaynaklar tutarsız — **tahmini** |
| Seçmen eğilimi | AK Parti %33,8 · Yeni %23,5 · DEM %9,3 · MHP %8,2 · İYİ %7,1 · CHP %6,0 · ZP %3,4 · YRP %2,9 | **tahmini** — ASAL (Eylül, Ekim 2026) ve GENAR (Eylül 2026) anketlerinin yaklaşık ortalaması |
| İl dağılımı | Yeni Parti'nin il bazında oyu CHP'nin 2023 dağılımından türetilir | **tasarım** |

## Cumhurbaşkanlığı krizleri
Bakan istifaları, skandallar ve kabine krizleri kurgusal senaryolardır. Meclis denetimi Anayasa m.106'ya göre modellenir: gensoru 2017'de kaldırıldı; Meclis soruşturması önergesi üye tamsayısının salt çoğunluğuyla (301) verilir, soruşturma açılması için 3/5 (360) oy gerekir (kaynaklı, sadeleştirilmiş).
