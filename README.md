# Sandık ve Kürsü — Türkiye Seçim ve Parti Yönetim Oyunu

Mobil öncelikli, tarayıcıda çalışan siyasi simülasyon. Yeni bir parti kurarsın ya da gerçek bir partinin kurultayını kazanıp genel başkan olursun. Hedef baraj, meclis ve iktidar.

**Durum: Aşama 2.1.** 2023 ve "Bugün" (Ekim 2026) başlangıçları, 81 il haritası, iki oyun modu, haftalık tur, milletvekili seçimi, kural tabanlı rakip yapay zekâsı.
Hükümet gündemi ve bülten soruları, dinamik konuşmalar, ekip (danışmanlar), siyasi ziyaretler ve dış temaslar, dış ilişkiler göstergesi, Cumhurbaşkanlığı seçimi ve makam ekranları (kabine, ekonomi, kanunlar, zirveler), müzik ve ses ayarları, gölgelendirmeli karakter portreleri.
Sesli efektler (aç/kapa), ayrıntılı miting (mekân, konuşma metni, lojistik, hava durumu, rakip çakışması), liderler tartışması, yeniden tasarlanmış açılış ekranı ve kayıt silme.
Kampanya animasyonları (miting, ziyaret, teşkilat, bağış, kongre, kurultay eylemleri), 9 ayrı sosyal medya kampanyası (farklı hedef kitleler, haftalar süren etki, izlenme panosu), basın açıklamasında gazete manşetleri, halk, hükümet ve rakip tepkileri, yeniden tasarlanmış canlı TV stüdyosu.
Ek olarak: ayrıntılı karakter oluşturma (görünüm, meslek, memleket, kişilik), hizip bazlı zorlu kurultay (imza şartı, iki tur, canlı sayım), canlı TV yayını (cevaplar delege oyunu anlık değiştirir), arka planda 2023 seçim haritası.

## Nasıl oynanır
- **Tek dosya:** `dist/sandik-ve-kursu.html` dosyasını telefona veya bilgisayara indirip tarayıcıda aç. İnternet gerekmez.
- **Geliştirici:** `npm run serve` komutundan sonra `http://localhost:8080` adresini aç (ES modülleri, derleme gerekmez).

## Klasör yapısı
```
data/        partiler, kurallar, senaryo, seçmen kümeleri, olay havuzu, kaynaklar (sources.md)
data/generated/  2023 sonuçları ve il haritası (tools/build_data.py ile üretilir)
engine/      simülasyon: seçmen modeli, D'Hondt, seçim, tur, eylemler, ekonomi, kayıt
ai/          rakip parti yapay zekâsı, olay üretimi
ui/          arayüz: harita, ekranlar, grafikler
tools/       veri üretimi ve tek dosya derlemesi
tests/       motor testleri ve denge simülasyonu
```

## Komutlar
- `npm test`: motor testleri (2023 meclisinin birebir üretildiği dahil)
- `node tests/sim.mjs found 7 zor`: bot oyuncuyla 5 yıllık denge simülasyonu
- `npm run build`: `dist/` altında tek dosya sürümünü üretir

Veri kaynakları ve doğrulama durumu: [data/sources.md](data/sources.md).
