// Tek dosyalık sürüm üretir:
//  dist/sandik-ve-kursu.html — internetsiz çalışan, tek HTML dosyası (telefona kopyalanabilir)
//  dist/artifact.html        — claude.ai paylaşım sayfası için (iskeletsiz gövde)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const r = await build({ entryPoints: ['ui/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'] });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('styles/main.css', 'utf8');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap">';
const body = `<div id="app"></div>\n<script>${js}</script>`;
writeFileSync('dist/sandik-ve-kursu.html', `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14213D">
<title>Sandık ve Kürsü</title>
${fonts}
<style>${css}</style></head><body>
${body}
</body></html>`);
writeFileSync('dist/artifact.html', `<title>Sandık ve Kürsü</title>\n${fonts}\n<style>${css}</style>\n${body}\n`);
console.log('dist/ yazıldı:', (js.length / 1024).toFixed(0), 'KB JS');
