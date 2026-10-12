// Küçük DOM yardımcıları
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastTimer;
export function toast(msg, ms = 2200) {
  document.querySelector('.toast')?.remove();
  const t = el(`<div class="toast" role="status">${esc(msg)}</div>`);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

// Alttan açılan sayfa. content: HTML string veya node. Dönen: {root, close}
export function sheet(content, { onClose } = {}) {
  const ov = el(`<div class="overlay"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div></div></div>`);
  const sh = ov.firstElementChild;
  if (typeof content === 'string') sh.insertAdjacentHTML('beforeend', content); else sh.appendChild(content);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  return { root: sh, close };
}

export function partyBadge(p) {
  return `<span class="badge" style="background:${esc(p.color)}">${esc(p.short)}</span>`;
}

// Yazı rengi için kontrast (parti renkleri üzerinde)
export function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#14213D' : '#FFFFFF';
}
