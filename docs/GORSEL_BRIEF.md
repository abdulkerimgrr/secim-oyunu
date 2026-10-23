# Sandık ve Kürsü — Görsel ve animasyon brifi

## Oyun
Türkiye'de geçen, telefonda oynanan bir siyaset ve seçim simülasyonu (tek HTML dosyası). Oyuncu kendi partisini kurar ya da mevcut bir partiye girip kurultayda genel başkan olur; miting, TV yayını, sosyal medya, vaat, teşkilat ve kriz yönetimiyle seçim kazanmaya, Cumhurbaşkanı olmaya çalışır. Gerçek partiler ve gerçek ekonomik veriler kullanılır; oyuncu ve diğer karakterler kurgusaldır.

## Stil
Sinematik, fotogerçekçi, sıcak akşam ışığı, sığ alan derinliği, haber fotoğrafı hissi. Arayüz koyu lacivert (#0A1226) + kırmızı (#E30A17) + altın vurgular. Tüm seri aynı ışık ve renk dilinde olmalı.

## Kurallar (kesin)
- Hiçbir gerçek siyasetçiye, ünlüye veya tanınmış kişiye benzerlik yok; tüm kişiler kurgusal.
- Görselde yazı, logo, parti amblemi, marka yok (Türk bayrağı ve TBMM silueti serbest).
- Sahte haber/deepfake niteliğinde içerik yok.

## Teslim
1. Görseli `assets/medya/<dosya>.webp` olarak kaydet (WebP, kalite ~78). Genişlik: portre 480 px, sahne/arka plan 640 px. Video: sessiz mp4, 480 px, 3–4 sn, ≤ 1,5 MB.
2. `assets/medya/manifest.json` → `items` dizisine kayıt ekle: `{ "key": "...", "file": "...", "prompt": "...", "source": "ChatGPT" }`
3. `node tools/medya-gom.mjs` → `data/media.js` (toplam ≤ 4 MB hedef).
4. `*.orijinal.*` dosyalarını commit etme. Dal: `claude/turkiye-secim-oyunu-zd0133`.
Görseli olmayan yerde oyunun mevcut çizimleri görünmeye devam eder; istediğin kadarını yapabilirsin.

## Anahtarlar
Bir eylemin genel sahnesi `scene:<tür>`; alt türe özel sahne `scene:<tür>:<alt>` (varsa önce o kullanılır). Aynı anahtarların `video:` ile başlayan hâli video olarak oynar.

### Portreler (dikey 3:4, belden yukarı, arka planda bulanık TBMM + Türk bayrağı)
`archetype:reformcu` (42, erkek, dalgalı siyah saç, lacivert takım) · `archetype:devlet` (58, kadın, omuz hizası kumral, bordo döpiyes) · `archetype:baskan` (52, erkek, kır saç, kirli sakal, açık yaka) · `archetype:bagimsiz` (38, kadın, uzun siyah saç, haki ceket) · `archetype:teknokrat` (47, erkek, ince gözlük, koyu takım) · `archetype:halkin` (50, koyu tenli kadın, kıvırcık saç, kot ceket) · `archetype:gorsel` (30, erkek, kıvırcık koyu kahve saç, sakal, gri kapüşonlu)

### Ekran arka planları (yatay)
`bg:splash` açılış ekranı · `bg:character` aday oluşturma ekranındaki büyük portre arkası (dikey, insan yok) · `bg:tv` canlı TV yayını stüdyo arkası · `bg:debate` liderler tartışması stüdyosu · `bg:night` seçim gecesi sonuç ekranı

### Eylem sahneleri (yatay 3:2, 640 px; tür → alt türler)
- `rally` miting → `meydan`, `park`, `salon`
- `visit` saha → mahalle ziyareti (genel), buluşmalar `esnaf`, `fabrika`, `universite`, `stk`, `genclik`, `kadin`, `emekli`, `sehit`, `ciftci`; saha turları `pazar`, `koy`, `kapi`
- `studio` medya programı → `sabah`, `ekonomi`, `podcast`, `radyo`, `gazete`, `belgesel`, `cevap`, `kriz`
- `press` basın açıklaması (kürsü, mikrofonlar, flaşlar)
- `social` sosyal medya → `kisavideo`, `etiket`, `hedefli`, `gorsel`, `uzunvideo`, `mesajlasma`, `sarki`, `canli`, `teyit`, `reels`, `shorts`, `twitch`, `fenomen`, `influencer`, `meme`, `sorucevap`, `vlog`, `genclikop`, `bot`, `dezenfo`
- `promise` vaat açıklama (kürsüde pankart)
- `oppo` rakip operasyonları (dosyalar, strateji masası) → `maliyet`, `karsimiting`, `kararsiz`, `negatif`, `cevap`, `gundem`, `arastirma`, `sizinti`, `muhalif`
- `infra` seçim altyapısı → `gonullu`, `musahit`, `telefon`, `koordinasyon`, `veri`, `uygulama`, `genclik`, `kadinkol`
- `org` il başkanlığı açılışı · `strengthen` teşkilat güçlendirme · `members` üye kampanyası · `money` bağış · `congress` büyük kongre · `meeting` parti içi toplantı · `training` kadro eğitimi
- `signatures` kurultay imza toplama · `delegates` delege görüşmesi · `faction` hizip pazarlığı
- `polvisit` siyasi ziyaret (makam odasında el sıkışma) · `foreign` dış temas (uçak, başkent)
- `cb` Cumhurbaşkanlığı kararı (makam masası, imza)

Öncelik önerisi: 7 portre → `bg:tv`, `bg:debate` → `rally`, `visit`, `press`, `studio` → diğerleri.
