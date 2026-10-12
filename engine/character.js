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
