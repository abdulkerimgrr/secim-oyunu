// SVG Türkiye haritası: 81 il, dokunarak seçme, iki parmakla/düğmeyle yakınlaştırma, sürükleme.
// SVG bir kez oluşturulur; katman değişince yalnızca dolgu renkleri güncellenir.
import { PROVINCES, MAP_VIEWBOX } from '../data/generated/provinces.js';

export function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (x, s) => (x >> s) & 255;
  const m = s => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
}

export function createMap({ onSelect } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'mapwrap';
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const [vx, vy, vw, vh] = MAP_VIEWBOX;
  let view = { x: vx, y: vy, w: vw, h: vh };
  const setView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  setView();
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Türkiye il haritası');
  const paths = {};
  for (const p of PROVINCES) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', p.path);
    path.setAttribute('fill', '#cfd6e2');
    path.dataset.plate = p.plate;
    const title = document.createElementNS(NS, 'title');
    title.textContent = p.name;
    path.appendChild(title);
    svg.appendChild(path);
    paths[p.plate] = path;
  }
  wrap.appendChild(svg);
  const zb = document.createElement('div');
  zb.className = 'zoombtns';
  zb.innerHTML = '<button type="button" aria-label="Yakınlaştır">+</button><button type="button" aria-label="Uzaklaştır">−</button><button type="button" aria-label="Tüm Türkiye" style="font-size:12px">TR</button>';
  wrap.appendChild(zb);

  const clampView = () => {
    view.w = Math.min(vw, Math.max(vw / 8, view.w));
    view.h = view.w * vh / vw;
    view.x = Math.min(vx + vw - view.w, Math.max(vx, view.x));
    view.y = Math.min(vy + vh - view.h, Math.max(vy, view.y));
  };
  const zoomAt = (f, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    view.x = cx - (cx - view.x) / f; view.y = cy - (cy - view.y) / f;
    view.w /= f; view.h /= f;
    clampView(); setView();
  };
  const [bIn, bOut, bAll] = zb.querySelectorAll('button');
  bIn.onclick = () => zoomAt(1.6);
  bOut.onclick = () => zoomAt(1 / 1.6);
  bAll.onclick = () => { view = { x: vx, y: vy, w: vw, h: vh }; setView(); };

  // İşaretçi olayları: sürükle, iki parmakla yakınlaştır, dokun = seç
  const pts = new Map();
  let start = null, moved = false, pinch0 = null;
  const toSvg = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    return { x: view.x + (cx - r.left) / r.width * view.w, y: view.y + (cy - r.top) / r.height * view.h, r };
  };
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, view: { ...view }, target: e.target }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), view: { ...view }, c: toSvg((a.x + b.x) / 2, (a.y + b.y) / 2) };
      moved = true;
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch0) {
      const [a, b] = [...pts.values()];
      const f = Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d;
      view = { ...pinch0.view };
      zoomAt(f, pinch0.c.x, pinch0.c.y);
    } else if (pts.size === 1 && start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (moved && start.view.w < vw - 0.5) {
        const r = svg.getBoundingClientRect();
        view.x = start.view.x - dx / r.width * start.view.w;
        view.y = start.view.y - dy / r.height * start.view.h;
        clampView(); setView();
      }
    }
  });
  const up = e => {
    if (pts.size === 1 && start && !moved) {
      const plate = start.target?.dataset?.plate;
      if (plate && onSelect) onSelect(+plate);
    }
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch0 = null;
    if (pts.size === 0) start = null;
  };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', e => { pts.delete(e.pointerId); start = null; pinch0 = null; });
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y); }, { passive: false });

  let selected = null;
  return {
    node: wrap,
    paint(colorOf) { for (const p of PROVINCES) paths[p.plate].setAttribute('fill', colorOf(p.plate) || '#cfd6e2'); },
    select(plate) {
      if (selected) paths[selected]?.classList.remove('sel');
      selected = plate;
      if (plate) { paths[plate].classList.add('sel'); svg.appendChild(paths[plate]); }
    },
    focus(plate) {
      const p = PROVINCES.find(x => x.plate === plate);
      if (!p) return;
      view.w = vw / 3; view.h = vh / 3; view.x = p.cx - view.w / 2; view.y = p.cy - view.h / 2;
      clampView(); setView();
    },
    setInteractive(on) { wrap.style.pointerEvents = on ? '' : 'none'; zb.hidden = !on; },
  };
}
