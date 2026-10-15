// OpenAI video üretimi (Sora) → assets/medya/<ad>.mp4 — DENEYSEL.
// Kullanım: node tools/openai-video.mjs --key video:intro --name intro --prompt "..." [--seconds 4] [--size 720x1280]
// Gerekenler: OPENAI_API_KEY ve api.openai.com erişimi. Model: OPENAI_VIDEO_MODEL (varsayılan sora-2).
// Not: Uç nokta ve parametreler OpenAI belgelerine göre doğrulanmalıdır; hata olursa mesajı olduğu gibi yazdırır.
import { writeFileSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? a.push([x.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]) : 0, a), []));
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('HATA: OPENAI_API_KEY tanımlı değil.'); process.exit(2); }
if (!args.prompt || !args.name) { console.error('HATA: --prompt ve --name gerekli.'); process.exit(2); }
const H = { Authorization: `Bearer ${KEY}` };
const model = process.env.OPENAI_VIDEO_MODEL || 'sora-2';
const prompt = `${args.prompt}\n\nKurallar: kurgusal kişiler; gerçek siyasetçilere veya ünlülere benzerlik yok; yazı, logo, parti amblemi yok.`;
const start = await fetch('https://api.openai.com/v1/videos', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, prompt, seconds: String(args.seconds || 4), size: args.size || '720x1280' }) });
let job = await start.json().catch(() => ({}));
if (!start.ok) { console.error('OpenAI hatası:', start.status, JSON.stringify(job.error || job).slice(0, 500)); process.exit(1); }
for (let i = 0; i < 120 && !['completed', 'failed', 'cancelled'].includes(job.status); i++) {
  await new Promise(r => setTimeout(r, 5000));
  job = await (await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers: H })).json();
  process.stdout.write(`\rDurum: ${job.status} ${job.progress ?? ''}   `);
}
if (job.status !== 'completed') { console.error('\nVideo üretilemedi:', JSON.stringify(job).slice(0, 400)); process.exit(1); }
const vid = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: H });
const raw = `assets/medya/${args.name}.orijinal.mp4`, out = `assets/medya/${args.name}.mp4`;
writeFileSync(raw, Buffer.from(await vid.arrayBuffer()));
// Sessiz, küçük, döngüye uygun sürüm (oyun tek dosya: hedef ≤ 1,5 MB)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-an', '-vf', 'scale=480:-2', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', out]);
const man = JSON.parse(readFileSync('assets/medya/manifest.json', 'utf8'));
const key = args.key || `video:${args.name}`;
man.items = man.items.filter(x => x.key !== key);
man.items.push({ key, file: `${args.name}.mp4`, prompt: args.prompt, source: model, date: new Date().toISOString().slice(0, 10) });
writeFileSync('assets/medya/manifest.json', JSON.stringify(man, null, 2) + '\n');
console.log(`\nTamam: ${out} (${(statSync(out).size / 1024).toFixed(0)} KB) → anahtar ${key}`);
