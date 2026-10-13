// Karakter özelliklerinin oyun etkileri (çarpanlar).
export function charMod(state, key) {
  const c = state.player?.character;
  if (!c) return 1;
  const t = new Set(c.traits || []);
  const prof = c.profession;
  switch (key) {
    case 'rally': return (t.has('hatip') ? 1.15 : 1) * (prof === 'ogretmen' ? 1.1 : 1);
    case 'visit': return (t.has('halkci') ? 1.25 : 1) * (prof === 'ogretmen' ? 1.1 : 1);
    case 'tv': return (t.has('medyatik') ? 1.2 : 1) * (prof === 'akademisyen' ? 1.1 : 1);
    case 'gaffe': return (t.has('sogukkanli') ? 0.7 : 1) * (t.has('sert') ? 1.2 : 1) * (prof === 'gazeteci' ? 0.75 : 1);
    case 'sert': return t.has('sert') ? 1.25 : 1;
    case 'faction': return t.has('muzakereci') ? 1.25 : 1;
    case 'alliance': return t.has('muzakereci') ? 0.08 : 0;
    case 'economy': return (prof === 'ekonomist' ? 1.25 : 1) * (t.has('teknokrat') ? 1.15 : 1);
    case 'service': return (prof === 'muhendis' ? 1.25 : 1) * (t.has('teknokrat') ? 1.15 : 1);
    case 'fundraise': return prof === 'isinsani' ? 1.3 : 1;
    case 'delegates': return prof === 'sendikaci' ? 1.2 : 1;
    case 'scandal': return prof === 'avukat' ? 0.6 : 1;
    case 'ap': return t.has('calistay') ? 1 : 0;
    case 'image': return prof === 'doktor' ? 0.04 : 0;
    case 'money': return prof === 'isinsani' ? 1.6 : 1;
    default: return 1;
  }
}

export function isHometown(state, plate) { return state.player?.character?.hometown === +plate; }

// Karakter ekranındaki özet göstergeler (0–100). Yukarıdaki oyun etkilerinin okunur özeti.
export function charStats(c) {
  const t = new Set(c.traits || []), p = c.profession, ed = { lise: 0, lisans: 2, yl: 5, doktora: 8 }[c.education] || 0;
  const v = (x) => Math.max(10, Math.min(99, Math.round(x)));
  return [
    { id: 'karizma', label: 'Karizma', icon: '💬', v: v(52 + (t.has('hatip') ? 15 : 0) + (t.has('medyatik') ? 12 : 0) + (t.has('halkci') ? 6 : 0) + (p === 'doktor' ? 8 : 0) + (p === 'akademisyen' ? 3 : 0)) },
    { id: 'strateji', label: 'Strateji', icon: '⚙️', v: v(50 + (t.has('muzakereci') ? 15 : 0) + (t.has('teknokrat') ? 10 : 0) + (p === 'ekonomist' ? 10 : 0) + (p === 'avukat' ? 5 : 0) + ed) },
    { id: 'guven', label: 'Güven', icon: '🤝', v: v(52 + (t.has('sogukkanli') ? 12 : 0) + (t.has('halkci') ? 8 : 0) + (p === 'doktor' ? 10 : 0) + (p === 'ogretmen' ? 8 : 0) + (p === 'avukat' ? 6 : 0) - (t.has('sert') ? 10 : 0) + ((c.age || 45) >= 50 ? 5 : 0)) },
    { id: 'tartisma', label: 'Tartışma', icon: '🎙️', v: v(50 + (p === 'gazeteci' ? 12 : 0) + (p === 'avukat' ? 10 : 0) + (t.has('sert') ? 8 : 0) + (t.has('hatip') ? 8 : 0) + (t.has('sogukkanli') ? 6 : 0) + (p === 'akademisyen' ? 5 : 0)) },
    { id: 'saha', label: 'Saha', icon: '🚩', v: v(48 + (t.has('calistay') ? 12 : 0) + (p === 'sendikaci' ? 14 : 0) + (t.has('halkci') ? 10 : 0) + (p === 'ogretmen' ? 6 : 0) + (p === 'isinsani' ? 4 : 0)) },
  ];
}
