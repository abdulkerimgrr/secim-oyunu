// Basit SVG grafikler: anket trendi ve meclis yarım dairesi.
import { esc } from './dom.js';

// series: [{id,color,label,values:[number]}], dates: [iso]
export function pollTrend(series, dates, { height = 180, threshold = null } = {}) {
  const W = 340, H = height, L = 30, R = 8, T = 10, B = 22;
  const n = dates.length;
  if (n < 2) return '<p class="muted small">Trend için en az iki anket gerekli.</p>';
  const max = Math.max(0.05, ...series.flatMap(s => s.values)) * 1.08;
  const x = i => L + (W - L - R) * i / (n - 1);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [];
  const step = max > 0.3 ? 0.1 : max > 0.12 ? 0.05 : 0.02;
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  let g = '';
  for (const v of ticks) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#DCE1EA" stroke-width="1"/><text x="${L - 4}" y="${y(v) + 3}" font-size="9" text-anchor="end" fill="#4A5672">${Math.round(v * 100)}</text>`;
  if (threshold && threshold < max) g += `<line x1="${L}" x2="${W - R}" y1="${y(threshold)}" y2="${y(threshold)}" stroke="#D7263D" stroke-dasharray="4 3" stroke-width="1.2"/><text x="${W - R}" y="${y(threshold) - 3}" font-size="9" text-anchor="end" fill="#D7263D">baraj</text>`;
  const yr = i => dates[i].slice(0, 4);
  let lastY = null;
  for (let i = 0; i < n; i++) if (yr(i) !== lastY) { lastY = yr(i); g += `<text x="${x(i)}" y="${H - 6}" font-size="9" fill="#4A5672" text-anchor="${i === 0 ? 'start' : 'middle'}">${lastY}</text>`; }
  for (const s of series) {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    g += `<path d="${d}" fill="none" stroke="${esc(s.color)}" stroke-width="${s.bold ? 2.6 : 1.6}" stroke-linejoin="round"/>`;
    g += `<circle cx="${x(n - 1)}" cy="${y(s.values[n - 1])}" r="${s.bold ? 3.5 : 2.5}" fill="${esc(s.color)}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Anket trendi">${g}</svg>`;
}

// Meclis yarım dairesi. seats: [{id,color,n}] (soldan sağa sırayla)
export function hemicycle(seats, total = 600) {
  const rows = 12, W = 340, H = 180, cx = W / 2, cy = H - 6, R0 = 60, R1 = 164;
  const pts = [];
  const radii = [...Array(rows)].map((_, i) => R0 + (R1 - R0) * i / (rows - 1));
  const circ = radii.reduce((a, r) => a + r, 0);
  let left = total;
  const perRow = radii.map((r, i) => {
    const n = i === rows - 1 ? left : Math.round(total * r / circ);
    left -= n; return n;
  });
  radii.forEach((r, i) => {
    for (let j = 0; j < perRow[i]; j++) {
      const a = Math.PI * (1 - (j + 0.5) / perRow[i]);
      pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
    }
  });
  pts.sort((p, q) => q.a - p.a);
  let k = 0, g = '';
  for (const s of seats) for (let i = 0; i < s.n && k < pts.length; i++, k++) g += `<circle cx="${pts[k].x.toFixed(1)}" cy="${pts[k].y.toFixed(1)}" r="3.6" fill="${esc(s.color)}"/>`;
  for (; k < pts.length; k++) g += `<circle cx="${pts[k].x.toFixed(1)}" cy="${pts[k].y.toFixed(1)}" r="3.6" fill="#DCE1EA"/>`;
  return `<svg class="hemi" viewBox="0 0 ${W} ${H}" role="img" aria-label="Meclis dağılımı">${g}<text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor" font-family="Barlow Condensed, Arial Narrow, sans-serif">${total}</text><text x="${cx}" y="${cy}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".7">sandalye · çoğunluk 301</text></svg>`;
}
