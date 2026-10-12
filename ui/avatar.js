// Katmanlı SVG portre üretici (düz illüstrasyon). Karakter nesnesinden çizilir.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
  return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
}

const HEAD = {
  oval: '<ellipse cx="60" cy="58" rx="23.5" ry="29"/>',
  yuvarlak: '<ellipse cx="60" cy="59" rx="26" ry="27.5"/>',
  koseli: '<path d="M36 46 Q36 29 60 29 Q84 29 84 46 L84 66 Q84 88 60 88 Q36 88 36 66 Z"/>',
};

// Arka saç (başın arkasında kalan uzun saç)
const HAIR_BACK = {
  omuz: 'M31 60 Q28 22 60 22 Q92 22 89 60 L91 98 Q78 104 72 96 L60 92 L48 96 Q42 104 29 98 Z',
  uzun: 'M31 60 Q28 22 60 22 Q92 22 89 60 L93 124 Q76 130 70 118 L60 110 L50 118 Q44 130 27 124 Z',
  dalgali: 'M31 60 Q26 22 60 21 Q94 22 89 60 Q96 74 89 86 Q95 98 84 104 Q76 108 72 98 L48 98 Q44 108 36 104 Q25 98 31 86 Q24 74 31 60 Z',
};
// Ön saç (başın üstü)
const HAIR_FRONT = {
  e: {
    kisa: 'M36 54 Q33 25 60 25 Q87 25 84 54 Q81 38 60 36 Q39 38 36 54 Z',
    yan: 'M35 56 Q32 24 62 24 Q89 26 85 56 Q83 36 67 34 Q52 41 38 42 Q36 48 35 56 Z',
    geriye: 'M37 50 Q35 21 60 21 Q85 21 83 50 Q79 31 60 30 Q41 31 37 50 Z',
    dalgali: 'M35 55 Q29 30 44 26 Q52 18 62 23 Q72 18 80 27 Q91 34 85 55 Q82 40 74 38 Q66 43 60 37 Q52 43 46 38 Q38 42 35 55 Z',
    seyrek: 'M36 58 Q34 44 38 37 L42 39 Q39 48 40 58 Z M84 58 Q86 44 82 37 L78 39 Q81 48 80 58 Z',
    kel: 'M36 60 Q35 50 37 44 L40 46 Q39 52 40 60 Z M84 60 Q85 50 83 44 L80 46 Q81 52 80 60 Z',
  },
  k: {
    kisa: 'M34 60 Q29 23 60 22 Q91 23 86 60 Q85 40 73 34 Q57 43 41 39 Q36 48 34 60 Z',
    omuz: 'M34 58 Q30 23 60 23 Q90 23 86 58 Q84 38 70 33 Q56 40 40 40 Q36 48 34 58 Z',
    topuz: 'M37 54 Q34 25 60 25 Q86 25 83 54 Q80 36 60 34 Q40 36 37 54 Z',
    uzun: 'M34 58 Q30 23 60 23 Q90 23 86 58 Q80 36 62 34 L56 42 Q46 36 38 44 Q35 50 34 58 Z',
    dalgali: 'M34 58 Q28 26 46 24 Q54 17 64 22 Q76 18 84 30 Q90 40 86 58 Q83 40 72 36 Q62 42 54 36 Q42 40 34 58 Z',
  },
};

export function avatarSvg(c, { size = 120, bg = '#E6EBF3', ring = null, mood = 'smile' } = {}) {
  const skin = c.skin || '#EBC2A3', sk2 = shade(skin, -0.12), hair = c.hairColor || '#1E1A18';
  const suit = c.suit || '#1F2A44', acc = c.accent || '#B3202E';
  const female = c.gender === 'k';
  const scarf = female && c.hairStyle === 'basortu';
  const brow = hair === '#D9D9D9' || hair === '#8E8E8E' ? shade(hair, -0.25) : shade(hair, 0.05);
  let g = `<rect width="120" height="140" rx="0" fill="${bg}"/>`;
  if (ring) g += `<circle cx="60" cy="66" r="56" fill="none" stroke="${ring}" stroke-width="3" opacity=".9"/>`;
  // arka saç
  if (!scarf && female && HAIR_BACK[c.hairStyle]) g += `<path d="${HAIR_BACK[c.hairStyle]}" fill="${shade(hair, -0.08)}"/>`;
  if (scarf) g += `<path d="M28 62 Q26 22 60 21 Q94 22 92 62 Q94 96 80 110 L40 110 Q26 96 28 62 Z" fill="${c.scarf || '#1F5FA8'}"/>`;
  // gövde
  g += `<path d="M6 140 C8 113 28 101 60 99 C92 101 112 113 114 140 Z" fill="${suit}"/>`;
  if (!female) {
    g += `<path d="M45 101 L60 128 L75 101 Z" fill="#F4F4F2"/>`;
    g += `<path d="M57 106 L63 106 L65.5 128 L60 135 L54.5 128 Z" fill="${acc}"/>`;
    g += `<path d="M45 101 L58 124 L50 140 M75 101 L62 124 L70 140" fill="none" stroke="${shade(suit, -0.35)}" stroke-width="1.6"/>`;
  } else if (!scarf) {
    g += `<path d="M46 101 Q60 122 74 101 Z" fill="${acc}"/>`;
    g += `<path d="M46 101 L56 122 L48 140 M74 101 L64 122 L72 140" fill="none" stroke="${shade(suit, -0.35)}" stroke-width="1.6"/>`;
    g += `<circle cx="60" cy="112" r="2.4" fill="#E9D8A6"/>`;
  } else {
    g += `<path d="M42 104 Q60 120 78 104 L74 140 L46 140 Z" fill="${shade(c.scarf || '#1F5FA8', -0.12)}"/>`;
  }
  // boyun, kulaklar, baş
  if (!scarf) g += `<path d="M50 80 L50 100 Q60 108 70 100 L70 80 Z" fill="${sk2}"/>`;
  if (!scarf) g += `<ellipse cx="36" cy="61" rx="4" ry="6.5" fill="${sk2}"/><ellipse cx="84" cy="61" rx="4" ry="6.5" fill="${sk2}"/>`;
  g += scarf ? `<ellipse cx="60" cy="61" rx="20" ry="25" fill="${skin}"/>` : `<g fill="${skin}">${HEAD[c.face] || HEAD.oval}</g>`;
  // yaş çizgileri
  if ((c.age || 45) >= 55) g += `<path d="M50 41 Q60 39 70 41 M52 45 Q60 43.5 68 45" fill="none" stroke="${sk2}" stroke-width="1" opacity=".8"/><path d="M47 70 Q49 76 52 79 M73 70 Q71 76 68 79" fill="none" stroke="${sk2}" stroke-width="1" opacity=".8"/>`;
  // ön saç
  if (!scarf) {
    if (female && c.hairStyle === 'topuz') g += `<circle cx="60" cy="20" r="10" fill="${hair}"/>`;
    const front = HAIR_FRONT[female ? 'k' : 'e'][c.hairStyle];
    if (front) g += `<path d="${front}" fill="${hair}"/>`;
    if (!female && c.hairStyle === 'seyrek') g += `<path d="M42 38 Q60 31 78 38 Q60 35 42 38 Z" fill="${hair}" opacity=".5"/>`;
  }
  // kaşlar, gözler, burun, ağız
  g += `<path d="M46 50.5 Q51 47.5 56 50 M64 50 Q69 47.5 74 50.5" fill="none" stroke="${brow}" stroke-width="2.4" stroke-linecap="round"/>`;
  g += `<ellipse cx="51" cy="57.5" rx="2.3" ry="2.6" fill="#2A2522"/><ellipse cx="69" cy="57.5" rx="2.3" ry="2.6" fill="#2A2522"/>`;
  g += `<circle cx="51.8" cy="56.6" r=".7" fill="#fff"/><circle cx="69.8" cy="56.6" r=".7" fill="#fff"/>`;
  g += `<path d="M60 60 Q56.5 68 59 70.5 Q60.5 71 62 70" fill="none" stroke="${sk2}" stroke-width="1.6" stroke-linecap="round"/>`;
  const mouth = mood === 'serious' ? 'M53 77.5 Q60 78.5 67 77.5' : mood === 'tense' ? 'M53 79 Q60 76 67 79' : 'M52.5 76 Q60 81.5 67.5 76';
  g += `<path d="${mouth}" fill="none" stroke="#8A3B3B" stroke-width="2" stroke-linecap="round"/>`;
  if (female) g += `<ellipse cx="45" cy="68" rx="4" ry="2.4" fill="#E58C8C" opacity=".25"/><ellipse cx="75" cy="68" rx="4" ry="2.4" fill="#E58C8C" opacity=".25"/>`;
  // sakal / bıyık
  if (!female) {
    const fh = shade(hair, 0);
    if (c.facial === 'sakal' || c.facial === 'kirli') {
      g += `<path d="M37 62 Q37 90 60 92.5 Q83 90 83 62 Q81 80 70 82 Q66 74 60 74.5 Q54 74 50 82 Q39 80 37 62 Z" fill="${fh}" opacity="${c.facial === 'kirli' ? 0.3 : 1}"/>`;
    }
    if (c.facial === 'biyik' || c.facial === 'sakal') g += `<path d="M51 74 Q60 69.5 69 74 Q60 72.5 51 74 Z" fill="${fh}" stroke="${fh}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (c.facial === 'kepce') g += `<path d="M49 75.5 Q60 68 71 75.5 Q66 73.5 60 74 Q54 73.5 49 75.5 Z" fill="${fh}" stroke="${fh}" stroke-width="3.4" stroke-linejoin="round"/>`;
  }
  // gözlük
  if (c.glasses && c.glasses !== 'yok') {
    const w = c.glasses === 'kalin' ? 2.6 : 1.3, col = c.glasses === 'kalin' ? '#1E1A18' : '#6B5B45';
    g += `<g fill="none" stroke="${col}" stroke-width="${w}"><rect x="43" y="52" width="15" height="11" rx="4"/><rect x="62" y="52" width="15" height="11" rx="4"/><path d="M58 57 Q60 55.5 62 57 M43 56 L37 55 M77 56 L83 55"/></g>`;
  }
  return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" role="img" aria-label="Karakter portresi" style="display:block">${g}</svg>`;
}
