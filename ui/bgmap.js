// Arka plan: 2023 milletvekili seçiminde her ilde birinci gelen partinin rengiyle Türkiye haritası.
import { PROVINCES, MAP_VIEWBOX } from '../data/generated/provinces.js';
import { RESULTS_2023 } from '../data/generated/results2023.js';
import { PARTIES_2023 } from '../data/parties2023.js';

const COLOR = Object.fromEntries(PARTIES_2023.map(p => [p.id, p.color]));

export function winners2023() {
  const agg = {};
  for (const r of RESULTS_2023) {
    const a = agg[r.plate] || (agg[r.plate] = {});
    for (const [k, v] of Object.entries(r.votes)) if (k !== 'DIGER') a[k] = (a[k] || 0) + v;
  }
  return Object.fromEntries(Object.entries(agg).map(([pl, v]) => [pl, Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]]));
}

export function mountBackgroundMap() {
  if (document.querySelector('.bgmap')) return;
  const w = winners2023();
  const [x, y, vw, vh] = MAP_VIEWBOX;
  const paths = PROVINCES.map(p => `<path d="${p.path}" fill="${COLOR[w[p.plate]]}"/>`).join('');
  const div = document.createElement('div');
  div.className = 'bgmap';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `<svg viewBox="${x} ${y} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet">${paths}</svg>
    <div class="bgmap-cap">Arka plan: 14 Mayıs 2023 milletvekili seçimi · illerde birinci parti</div>`;
  document.body.prepend(div);
}
