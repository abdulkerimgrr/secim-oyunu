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

## Tasarım varsayımları
Parti ideoloji konumları, seçmen kümeleri ve bunların payları (2023 oylarından türetilir), medya erişimi, lider karizması, bütçe kalemleri ve tüm denge katsayıları (`engine/params.js`) oyun tasarımıdır. Gerçek kişi veya kurumlar hakkında iddia içermez. Olay havuzundaki tüm olaylar kurgusaldır.
