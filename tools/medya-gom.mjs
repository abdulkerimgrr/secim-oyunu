// assets/medya/manifest.json'daki dosyaları data/media.js içine data URI olarak gömer.
// Oyun tek dosya (dist/*.html) olduğu için toplam boyutu sınırlı tutar: uyarı 4 MB, hata 10 MB.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const man = JSON.parse(readFileSync('assets/medya/manifest.json', 'utf8'));
const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', mp4: 'video/mp4', webm: 'video/webm' };
const out = {};
let total = 0;
for (const it of man.items) {
  const p = `assets/medya/${it.file}`;
  if (!existsSync(p)) { console.warn('Eksik dosya, atlandı:', p); continue; }
  const buf = readFileSync(p);
  total += buf.length;
  out[it.key] = `data:${MIME[it.file.split('.').pop()] || 'application/octet-stream'};base64,${buf.toString('base64')}`;
}
const mb = total / 1048576;
if (mb > 10) { console.error(`HATA: toplam medya ${mb.toFixed(1)} MB (sınır 10 MB). Görselleri küçültün veya azaltın.`); process.exit(1); }
if (mb > 4) console.warn(`Uyarı: toplam medya ${mb.toFixed(1)} MB; oyunun yüklenmesi yavaşlar.`);
writeFileSync('data/media.js', `// OTOMATİK ÜRETİLİR: tools/medya-gom.mjs (assets/medya/manifest.json'dan). Elle düzenleme.\n// Anahtar örnekleri: 'archetype:reformcu' (aday kartı ve portre), 'scene:rally' (miting arka planı), 'video:intro'.\nexport const MEDIA = ${JSON.stringify(out)};\n`);
console.log(`data/media.js yazıldı: ${Object.keys(out).length} öğe, ${mb.toFixed(2)} MB. Sonra: npm run build`);
