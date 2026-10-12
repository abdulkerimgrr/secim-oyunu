// Tohumlu rastgele sayı üreteci (mulberry32). Durumu kayıtla birlikte saklanır,
// böylece aynı kayıt aynı sonuçları üretir.
export function createRng(seed) {
  let s = seed >>> 0;
  const rng = {
    get state() { return s; },
    set state(v) { s = v >>> 0; },
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(a, b) { return a + (b - a) * rng.next(); },
    int(a, b) { return Math.floor(rng.range(a, b + 1)); },
    chance(p) { return rng.next() < p; },
    pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
    normal(mu = 0, sd = 1) {
      const u = Math.max(1e-12, rng.next()), v = rng.next();
      return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    weighted(items, w) {
      const tot = items.reduce((a, it) => a + w(it), 0);
      let r = rng.next() * tot;
      for (const it of items) { r -= w(it); if (r <= 0) return it; }
      return items[items.length - 1];
    },
  };
  return rng;
}
