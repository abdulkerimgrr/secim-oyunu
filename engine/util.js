// Haziran 2023 = 1 fiyat endeksi (oyun içi enflasyonla büyür)
export const priceIndex = state => state.economy.priceIndex || 1;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sum = arr => arr.reduce((a, b) => a + b, 0);
export const deepClone = o => JSON.parse(JSON.stringify(o));

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function fmtMoney(x) {
  const s = x < 0 ? '−' : '';
  x = Math.abs(x);
  if (x >= 1e9) return `${s}₺${(x / 1e9).toFixed(2).replace('.', ',')} milyar`;
  if (x >= 1e6) return `${s}₺${(x / 1e6).toFixed(1).replace('.', ',')} milyon`;
  if (x >= 1e3) return `${s}₺${Math.round(x / 1e3)} bin`;
  return `${s}₺${Math.round(x)}`;
}
export function pct(x, d = 1) { return '%' + (100 * x).toFixed(d).replace('.', ','); }
export function fmtInt(x) { return Math.round(x).toLocaleString('tr-TR'); }

// Bulunma eki: İstanbul'da, İzmir'de, Muş'ta, Tokat'ta
export function loc(name) {
  const vowels = 'aeıioöuüâî';
  const lower = name.toLocaleLowerCase('tr');
  let last = '';
  for (const ch of lower) if (vowels.includes(ch)) last = ch;
  const front = 'eiöüî'.includes(last);
  const hard = 'fstkçşhp'.includes(lower[lower.length - 1]);
  return `${name}'${hard ? 't' : 'd'}${front ? 'e' : 'a'}`;
}

// Kısa para biçimi (üst bar): ₺80 Mn, ₺1,2 Mr
export function fmtMoneyShort(x) {
  const s = x < 0 ? '−' : '';
  x = Math.abs(x);
  if (x >= 1e9) return `${s}₺${(x / 1e9).toFixed(1).replace('.', ',')} Mr`;
  if (x >= 1e6) return `${s}₺${(x / 1e6).toFixed(x >= 1e7 ? 0 : 1).replace('.', ',')} Mn`;
  if (x >= 1e3) return `${s}₺${Math.round(x / 1e3)} B`;
  return `${s}₺${Math.round(x)}`;
}
