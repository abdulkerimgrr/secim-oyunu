// OpenAI görsel üretimi (ChatGPT'nin görsel modeli) → assets/medya/<ad>.webp
// Kullanım:
//   node tools/openai-gorsel.mjs --key archetype:reformcu --name reformcu --prompt "..." [--size 1024x1536] [--width 480] [--quality high] [--ref girdi.png]
// Gerekenler: OPENAI_API_KEY ortam değişkeni ve api.openai.com'a ağ erişimi. Model: OPENAI_IMAGE_MODEL (varsayılan gpt-image-1).
// --ref verilirse "images/edits" uç noktasıyla mevcut bir görsel düzenlenir.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? a.push([x.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]) : 0, a), []));
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('HATA: OPENAI_API_KEY tanımlı değil. Ortam ayarlarına gizli değişken olarak ekleyin.'); process.exit(2); }
if (!args.prompt || !args.name) { console.error('HATA: --prompt ve --name gerekli.'); process.exit(2); }
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const size = args.size || '1024x1536';
const quality = args.quality || 'high';
const width = +(args.width || 480);
// Güvenlik ve tutarlılık eki: gerçek kişilere benzerlik, yazı ve logo yok
const prompt = `${args.prompt}\n\nKurallar: kurgusal bir kişi; hiçbir gerçek siyasetçiye, ünlüye veya tanınmış kişiye benzemesin. Görselde yazı, logo, parti amblemi veya marka olmasın.`;

let res;
if (args.ref) {
  const fd = new FormData();
  fd.append('model', model); fd.append('prompt', prompt); fd.append('size', size); fd.append('quality', quality);
  fd.append('image', new Blob([readFileSync(args.ref)], { type: 'image/png' }), 'ref.png');
  res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd });
} else {
  res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });
}
const j = await res.json().catch(() => ({}));
if (!res.ok) { console.error('OpenAI hatası:', res.status, JSON.stringify(j.error || j).slice(0, 500)); process.exit(1); }
const b64 = j.data?.[0]?.b64_json;
if (!b64) { console.error('Yanıtta görsel yok:', JSON.stringify(j).slice(0, 300)); process.exit(1); }
const raw = `assets/medya/${args.name}.orijinal.png`, out = `assets/medya/${args.name}.webp`;
writeFileSync(raw, Buffer.from(b64, 'base64'));
// Küçült ve WebP'ye çevir (oyun tek dosya olduğu için boyut önemli)
execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = int(sys.argv[3]); h = round(im.height * w / im.width)
im.resize((w, h), Image.LANCZOS).save(sys.argv[2], 'WEBP', quality=78, method=6)
`, raw, out, String(width)]);
const man = JSON.parse(readFileSync('assets/medya/manifest.json', 'utf8'));
const key = args.key || `img:${args.name}`;
man.items = man.items.filter(x => x.key !== key);
man.items.push({ key, file: `${args.name}.webp`, prompt: args.prompt, source: model, date: new Date().toISOString().slice(0, 10) });
writeFileSync('assets/medya/manifest.json', JSON.stringify(man, null, 2) + '\n');
console.log(`Tamam: ${out} (${(readFileSync(out).length / 1024).toFixed(0)} KB) → anahtar ${key}. Oyuna gömmek için: node tools/medya-gom.mjs`);
