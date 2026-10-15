// Basit makroekonomi: ortalamaya dönen rastgele yürüyüş + şoklar. Gerçek veriyi izlemez (simülasyon).
import { clamp } from './util.js';

export function economyStep(state, rng, days = 7) {
  const e = state.economy, f = days / 7;
  e.priceIndex = (e.priceIndex || 1) * Math.pow(1 + e.inflation / 100, days / 365);
  if (e.target === undefined) e.target = 45;
  const sf = Math.sqrt(f); // rastgele yürüyüş: gürültü tur uzunluğunun kareköküyle ölçeklenir
  e.target = clamp(e.target + rng.normal(0, 0.8) * sf, 12, 90);
  e.inflation = clamp(e.inflation + 0.035 * (e.target - e.inflation) * f + rng.normal(0, 0.5) * sf, 5, 120);
  e.unemployment = clamp(e.unemployment + 0.02 * ((e.uStar ?? 9.5) - e.unemployment) * f + rng.normal(0, 0.06) * sf, 6, 18);
  e.growth = clamp(e.growth + 0.03 * (3.5 - e.growth) * f + rng.normal(0, 0.12) * sf, -6, 9);
  e.usdTry = +(e.usdTry * (1 + (e.inflation / 100) / 52 * f + rng.normal(0, 0.004) * Math.sqrt(f))).toFixed(2);
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
