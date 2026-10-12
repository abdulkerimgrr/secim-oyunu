// Haftalık hava tahmini (deterministik: il + hafta). Açık alan mitinglerinde katılımı etkiler.
const W = {
  gunes: { label: 'Güneşli', icon: '☀️', mult: 1.05 },
  bulut: { label: 'Parçalı bulutlu', icon: '⛅', mult: 1.0 },
  yagmur: { label: 'Yağmurlu', icon: '🌧️', mult: 0.7 },
  kar: { label: 'Karlı', icon: '❄️', mult: 0.5 },
  sicak: { label: 'Çok sıcak', icon: '🥵', mult: 0.85 },
};
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

export function weatherFor(state, plate, region) {
  const d = new Date(state.date + 'T12:00:00Z');
  const month = d.getUTCMonth() + 1;
  const week = Math.floor(d.getTime() / (7 * 86400000));
  const r = hash(plate * 7919 + week * 104729 + state.seed % 1000);
  const winter = month === 12 || month <= 2, summer = month >= 6 && month <= 8;
  const cold = ['Doğu Anadolu', 'İç Anadolu'].includes(region);
  const wet = region === 'Karadeniz';
  let id;
  if (winter) id = r < (cold ? 0.4 : 0.08) ? 'kar' : r < (wet ? 0.75 : 0.55) ? 'yagmur' : r < 0.8 ? 'bulut' : 'gunes';
  else if (summer) id = r < (wet ? 0.3 : 0.06) ? 'yagmur' : r < (['Akdeniz', 'Güneydoğu Anadolu'].includes(region) ? 0.55 : 0.2) ? 'sicak' : r < 0.6 ? 'gunes' : 'bulut';
  else id = r < (wet ? 0.5 : 0.25) ? 'yagmur' : r < 0.55 ? 'bulut' : 'gunes';
  return { id, ...W[id] };
}
