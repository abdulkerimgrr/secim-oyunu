// Makroekonomi: gerçek verinin bulunduğu aylarda (data/economyReal.js) gerçeği izler;
// sonrasında ortalamaya dönen rastgele yürüyüş + şoklar (simülasyon).
import { clamp, addDays } from './util.js';
import { REAL_ECONOMY } from '../data/economyReal.js';

// Bu ay için gerçek veri var mı? (oyuncu ekonomiyi yönetiyorsa gerçek seyir uygulanmaz)
export function realMonth(state, date = state.date) {
  if (state.player?.isPresident || state.flags?.realEconomy === false) return null;
  return REAL_ECONOMY[date.slice(0, 7)] || null;
}

export function economyStep(state, rng, days = 7) {
  const e = state.economy, f = days / 7;
  e.priceIndex = (e.priceIndex || 1) * Math.pow(1 + e.inflation / 100, days / 365);
  if (e.target === undefined) e.target = 45;
  const sf = Math.sqrt(f); // rastgele yürüyüş: gürültü tur uzunluğunun kareköküyle ölçeklenir
  const real = realMonth(state, addDays(state.date, days));
  if (real) {
    // Gerçek seyir: enflasyon, kur ve işsizlik gerçek değerler; beklenti (hedef) enflasyonu izler
    e.inflation = real.inf; e.usdTry = real.usd; e.unemployment = real.unemp; e.target = real.inf;
    e.rateBefore = e.policyRate; e.policyRate = real.rate;
    e.growth = clamp(e.growth + 0.03 * (3.5 - e.growth) * f + rng.normal(0, 0.12) * sf, -6, 9);
    e.realUntil = true;
  } else {
    if (e.realUntil) { e.realUntil = false; e.target = Math.min(e.target, e.inflation - 2.5); } // veri bitti: piyasa beklentisi biraz daha düşük
    e.target = clamp(e.target + rng.normal(0, 0.6) * sf, 8, 90);
    e.inflation = clamp(e.inflation + 0.035 * (e.target - e.inflation) * f + rng.normal(0, 0.4) * sf, 5, 120);
    e.unemployment = clamp(e.unemployment + 0.02 * ((e.uStar ?? 9.5) - e.unemployment) * f + rng.normal(0, 0.06) * sf, 6, 18);
    e.growth = clamp(e.growth + 0.03 * (3.5 - e.growth) * f + rng.normal(0, 0.12) * sf, -6, 9);
    e.usdTry = +(e.usdTry * (1 + (e.inflation / 100) / 52 * f + rng.normal(0, 0.004) * Math.sqrt(f))).toFixed(2);
  }
  // Seçmenin ekonomik algısı: yaklaşık 6 aylık hareketli ortalama (hayat pahalılığı hemen unutulmaz)
  const mis = e.inflation + 2 * e.unemployment;
  e.miserySm = e.miserySm === undefined ? mis : e.miserySm + (mis - e.miserySm) * (1 - Math.pow(1 - 1 / 26, f));
  e.pain = Math.max(Math.max(0, e.miserySm - (e.misery0 ?? e.miserySm)), (e.pain || 0) * Math.pow(0.985, f));
  if (!e.history.length || e.history[e.history.length - 1].date.slice(0, 7) !== state.date.slice(0, 7)) {
    e.history.push({ date: state.date, inflation: +e.inflation.toFixed(1), unemployment: +e.unemployment.toFixed(1), usdTry: e.usdTry, growth: +e.growth.toFixed(1) });
    if (e.history.length > 120) e.history.shift();
  }
}

export function applyEconShock(state, shock, rng) {
  const e = state.economy;
  if (shock.usdTry) e.usdTry = +(e.usdTry * (1 + rng.range(...shock.usdTry))).toFixed(2);
  if (shock.inflation) { const d = rng.range(...shock.inflation); e.inflation += d; e.target += d; }
}
