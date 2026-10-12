// Katmanlı SVG portre (gölgelendirmeli). Karakter nesnesinden çizilir; eski kayıtlar için varsayılanlar vardır.
let uid = 0;
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
  return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
}

const HEAD = {
  oval: 'M60 29 C75 29 84 40 84 56 C84 74 74 88 60 88 C46 88 36 74 36 56 C36 40 45 29 60 29 Z',
  yuvarlak: 'M60 31 C77 31 86 43 86 58 C86 75 75 86 60 86 C45 86 34 75 34 58 C34 43 43 31 60 31 Z',
  koseli: 'M60 29 C77 29 84 38 84 50 L84 66 C84 80 74 88 60 88 C46 88 36 80 36 66 L36 50 C36 38 43 29 60 29 Z',
};
const HAIR_BACK = {
  omuz: 'M31 60 Q28 22 60 22 Q92 22 89 60 L91 98 Q78 104 72 96 L60 92 L48 96 Q42 104 29 98 Z',
  uzun: 'M31 60 Q28 22 60 22 Q92 22 89 60 L93 124 Q76 130 70 118 L60 110 L50 118 Q44 130 27 124 Z',
  dalgali: 'M31 60 Q26 22 60 21 Q94 22 89 60 Q96 74 89 86 Q95 98 84 104 Q76 108 72 98 L48 98 Q44 108 36 104 Q25 98 31 86 Q24 74 31 60 Z',
  topuz: '',
};
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
// Kıvırcık saç: üst kafada bukle kümeleri
function curls(hair, hi, female) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.02 + i / 12 * 0.96);
    pts.push([60 + Math.cos(a) * 25, 52 + Math.sin(a) * 27, 7.5 - Math.abs(i - 6) * 0.15]);
  }
  for (const x of [46, 56, 66, 74]) pts.push([x, 31 + (x % 4), 6.5]);
  if (female) for (const [x, y] of [[33, 66], [87, 66], [32, 80], [88, 80], [35, 93], [85, 93]]) pts.push([x, y, 7]);
  else pts.push([36.5, 58, 5], [83.5, 58, 5]);
  let g = pts.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${hair}"/>`).join('');
  g += pts.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<path d="M${(x - r * 0.5).toFixed(1)} ${(y - r * 0.2).toFixed(1)} q${(r * 0.5).toFixed(1)} ${(-r * 0.6).toFixed(1)} ${r.toFixed(1)} 0" fill="none" stroke="${hi}" stroke-width="1" opacity=".55"/>`).join('');
  return g;
}

const BROWS = {
  ince: { w: 1.4, d: 'M46 50.5 Q51 48.5 56 50 M64 50 Q69 48.5 74 50.5' },
  normal: { w: 2.4, d: 'M46 50.5 Q51 47.5 56 50 M64 50 Q69 47.5 74 50.5' },
  kalin: { w: 3.6, d: 'M45.5 51 Q51 47 56.5 50 M63.5 50 Q69 47 74.5 51' },
  catik: { w: 3, d: 'M46 49 Q51 49 56.5 51.5 M63.5 51.5 Q69 49 74 49' },
};
const NOSE = {
  kucuk: 'M60 61 Q58 67 59.5 69 Q60.5 69.6 61.6 69',
  orta: 'M60 60 Q56.5 68 59 70.5 Q60.5 71 62 70',
  buyuk: 'M60.5 58 Q55.5 68 57.5 71.5 Q60.5 73 63.5 71',
};

export function avatarSvg(c, { size = 120, bg = '#E6EBF3', ring = null, mood = 'smile', pin } = {}) {
  const id = 'av' + (++uid);
  // Oyuncunun yüklediği fotoğraf (yalnızca bu tarayıcıda, kayıt içinde saklanır)
  if (c.photo && /^data:image\/(jpeg|png|webp);base64,/.test(c.photo)) {
    const pc = pin ?? (c.pin !== false ? c.pinColor : null);
    return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" role="img" aria-label="Karakter fotoğrafı" style="display:block">
      <defs><clipPath id="${id}c"><rect width="120" height="140" rx="6"/></clipPath></defs>
      ${bg === 'transparent' ? '' : `<rect width="120" height="140" fill="${bg}"/>`}
      <image href="${c.photo}" width="120" height="140" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>
      ${ring ? `<rect x="1.5" y="1.5" width="117" height="137" rx="6" fill="none" stroke="${ring}" stroke-width="3"/>` : ''}
      ${pc ? `<circle cx="104" cy="124" r="5" fill="${pc}" stroke="#E9D8A6" stroke-width="1.4"/>` : ''}</svg>`;
  }
  const skin = c.skin || '#EBC2A3', sk2 = shade(skin, -0.12), sk3 = shade(skin, -0.22), skHi = shade(skin, 0.08);
  const hair = c.hairColor || '#1E1A18', hairHi = shade(hair, hair === '#1E1A18' ? 1.4 : 0.35);
  const suit = c.suit || '#1F2A44', acc = c.accent || '#B3202E';
  const eye = c.eyeColor || '#5B3A1E';
  const female = c.gender === 'k';
  const scarf = female && c.hairStyle === 'basortu';
  const outfit = c.outfit || 'takim';
  const browCol = hair === '#D9D9D9' || hair === '#8E8E8E' ? shade(hair, -0.3) : shade(hair, 0.05);
  const head = HEAD[c.face] || HEAD.oval;
  let g = `<defs>
    <radialGradient id="${id}f" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${skHi}"/><stop offset=".75" stop-color="${skin}"/><stop offset="1" stop-color="${sk2}"/></radialGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(suit, 0.15)}"/><stop offset="1" stop-color="${shade(suit, -0.2)}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hairHi}" stop-opacity=".55"/><stop offset=".5" stop-color="${hairHi}" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}bg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="${shade(bg, 0.06)}"/><stop offset="1" stop-color="${shade(bg, -0.08)}"/></radialGradient>
  </defs>`;
  g += bg === 'transparent' ? '' : `<rect width="120" height="140" fill="url(#${id}bg)"/>`;
  if (ring) g += `<circle cx="60" cy="66" r="56" fill="none" stroke="${ring}" stroke-width="3" opacity=".9"/>`;
  if (!scarf && female && HAIR_BACK[c.hairStyle]) g += `<path d="${HAIR_BACK[c.hairStyle]}" fill="${shade(hair, -0.1)}"/>`;
  if (scarf) g += `<path d="M28 62 Q26 22 60 21 Q94 22 92 62 Q94 96 80 110 L40 110 Q26 96 28 62 Z" fill="${c.scarf || '#1F5FA8'}"/><path d="M34 40 Q60 26 86 40" fill="none" stroke="${shade(c.scarf || '#1F5FA8', 0.25)}" stroke-width="2" opacity=".6"/>`;
  // Gövde ve kıyafet
  const body = 'M6 140 C8 113 28 101 60 99 C92 101 112 113 114 140 Z';
  if (outfit === 'kapusonlu') {
    g += `<path d="${body}" fill="url(#${id}s)"/><path d="M30 122 Q34 132 33 140 M90 122 Q86 132 87 140" fill="none" stroke="${shade(suit, -0.25)}" stroke-width="1.4"/>`;
    g += `<rect x="${female ? 70 : 72}" y="118" width="8" height="3.4" rx="1.2" fill="#F4F4F2" opacity=".9"/>`;
  } else if (outfit === 'kazak') {
    g += `<path d="${body}" fill="url(#${id}s)"/><path d="M47 100 Q60 112 73 100" fill="none" stroke="${shade(suit, -0.3)}" stroke-width="3"/>`;
    if (!female) g += `<path d="M50 100 L60 110 L70 100" fill="#F2F2EE"/>`;
  } else if (outfit === 'gomlek' || outfit === 'bluz') {
    g += `<path d="${body}" fill="${female ? acc : '#F4F4F2'}"/><path d="M48 100 L60 116 L72 100 L67 99 L60 108 L53 99 Z" fill="${shade(female ? acc : '#F4F4F2', -0.08)}"/><path d="M60 110 L60 140" stroke="${shade(female ? acc : '#DDDDDD', -0.15)}" stroke-width="1"/>`;
  } else {
    g += `<path d="${body}" fill="url(#${id}s)"/>`;
    if (!female && !scarf) {
      g += `<path d="M45 101 L60 128 L75 101 Z" fill="#F4F4F2"/><path d="M46 101 L54 106 L60 99 L66 106 L74 101 L68 98 L60 104 L52 98 Z" fill="#E4E4E0"/>`;
      if (outfit === 'takim') g += `<path d="M57.5 106 L62.5 106 L61.5 109 L58.5 109 Z" fill="${shade(acc, -0.15)}"/><path d="M58.5 109 L61.5 109 L64.5 128 L60 134 L55.5 128 Z" fill="${acc}"/><path d="M59 112 L62 118" stroke="${shade(acc, 0.25)}" stroke-width=".8"/>`;
      g += `<path d="M45 101 L57 124 L50 140 M75 101 L63 124 L70 140" fill="none" stroke="${shade(suit, -0.4)}" stroke-width="1.6"/>`;
    } else if (!scarf) {
      g += `<path d="M46 101 Q60 122 74 101 Z" fill="${acc}"/><path d="M46 101 L56 122 L48 140 M74 101 L64 122 L72 140" fill="none" stroke="${shade(suit, -0.4)}" stroke-width="1.6"/><circle cx="60" cy="112" r="2.4" fill="#E9D8A6"/>`;
    } else {
      g += `<path d="M42 104 Q60 120 78 104 L74 140 L46 140 Z" fill="${shade(c.scarf || '#1F5FA8', -0.12)}"/>`;
    }
  }
  pin = pin ?? (c.pin !== false ? c.pinColor : null);
  if (pin) g += `<circle cx="${female ? 76 : 78}" cy="114" r="3.4" fill="${pin}" stroke="#E9D8A6" stroke-width="1"/>`;
  // Boyun, kulak, baş
  if (!scarf) {
    g += `<path d="M50 80 L50 100 Q60 108 70 100 L70 80 Z" fill="${sk2}"/><path d="M50 86 Q60 94 70 86 L70 80 L50 80 Z" fill="${sk3}" opacity=".5"/>`;
    g += `<ellipse cx="36" cy="61" rx="4.2" ry="6.8" fill="${sk2}"/><ellipse cx="84" cy="61" rx="4.2" ry="6.8" fill="${sk2}"/><path d="M35 58 Q37 61 35.5 64 M85 58 Q83 61 84.5 64" fill="none" stroke="${sk3}" stroke-width="1"/>`;
  }
  if (outfit === 'kapusonlu' && !scarf) g += `<path d="M38 104 Q40 94 50 95 Q60 106 70 95 Q80 94 82 104 Q72 116 60 117 Q48 116 38 104 Z" fill="${shade(suit, -0.12)}"/><path d="M42 103 Q60 120 78 103" fill="none" stroke="${shade(suit, -0.32)}" stroke-width="1.2"/><path d="M54 112 L53 127 M66 112 L67 127" stroke="#E8E8E4" stroke-width="1.3" stroke-linecap="round"/>`;
  g += scarf ? `<ellipse cx="60" cy="61" rx="20" ry="25" fill="url(#${id}f)"/>` : `<path d="${head}" fill="url(#${id}f)"/>`;
  if (c.earring === 'var' && !scarf) g += `<circle cx="85" cy="67.5" r="1.5" fill="none" stroke="#D8D8D8" stroke-width="1"/>`;
  // Çene gölgesi ve elmacık
  g += `<path d="M44 74 Q60 90 76 74" fill="none" stroke="${sk2}" stroke-width="3" opacity=".25"/>`;
  // Yaş çizgileri
  const age = c.age || 45;
  if (age >= 50) g += `<path d="M50 41 Q60 39 70 41${age >= 60 ? ' M52 45 Q60 43.5 68 45' : ''}" fill="none" stroke="${sk3}" stroke-width=".9" opacity=".7"/><path d="M47 70 Q49 76 52 79 M73 70 Q71 76 68 79" fill="none" stroke="${sk3}" stroke-width="1" opacity="${age >= 60 ? 0.8 : 0.45}"/>`;
  if (age >= 58) g += `<path d="M41 56 L44 57 M41 59 L44 59 M79 56 L76 57 M79 59 L76 59" stroke="${sk3}" stroke-width=".7" opacity=".7"/>`;
  // Saç
  if (!scarf) {
    if (female && c.hairStyle === 'topuz') g += `<circle cx="60" cy="20" r="10" fill="${hair}"/><circle cx="60" cy="20" r="10" fill="url(#${id}h)"/>`;
    if (c.hairStyle === 'kivircik') g += curls(hair, hairHi, female);
    const front = HAIR_FRONT[female ? 'k' : 'e'][c.hairStyle];
    if (front) g += `<path d="${front}" fill="${hair}"/><path d="${front}" fill="url(#${id}h)"/>`;
    if (!female && c.hairStyle === 'seyrek') g += `<path d="M42 38 Q60 31 78 38 Q60 35 42 38 Z" fill="${hair}" opacity=".5"/>`;
  }
  // Kaşlar
  const br = BROWS[c.brows] || BROWS.normal;
  g += `<path d="${br.d}" fill="none" stroke="${browCol}" stroke-width="${br.w}" stroke-linecap="round"/>`;
  // Gözler
  const ey = mood === 'tense' ? 2.3 : 2.6;
  for (const x of [51, 69]) {
    g += `<ellipse cx="${x}" cy="57.5" rx="4.2" ry="${ey}" fill="#FFFFFF"/><circle cx="${x}" cy="57.6" r="2.25" fill="${eye}"/><circle cx="${x}" cy="57.6" r="1.1" fill="#141012"/><circle cx="${x + 0.8}" cy="56.8" r=".6" fill="#fff"/>`;
    g += `<path d="M${x - 4.4} 57 Q${x} ${57.5 - ey - 1.2} ${x + 4.4} 57" fill="none" stroke="${shade(skin, -0.45)}" stroke-width="${female ? 1.3 : 0.9}"/>`;
    if (female) g += `<path d="M${x + 3.6} 55.6 L${x + 5.2} 54.6" stroke="#1A1414" stroke-width=".8"/>`;
    if (age >= 55) g += `<path d="M${x - 3.5} 60.6 Q${x} 61.8 ${x + 3.5} 60.6" fill="none" stroke="${sk3}" stroke-width=".6" opacity=".7"/>`;
  }
  // Burun
  g += `<path d="${NOSE[c.nose] || NOSE.orta}" fill="none" stroke="${sk3}" stroke-width="1.5" stroke-linecap="round"/><path d="M57 69.5 Q58 70.5 59 70 M61 70 Q62 70.5 63 69.5" fill="none" stroke="${sk3}" stroke-width=".8" opacity=".7"/>`;
  // Dudaklar
  const lip = female ? shade('#C2585E', (parseInt(skin.slice(1, 3), 16) - 200) / 600) : shade(skin, -0.28);
  const full = c.lips === 'dolgun' ? 1.4 : c.lips === 'ince' ? 0.6 : 1;
  if (mood === 'smile') g += `<path d="M52.5 76 Q60 ${80.5 + full} 67.5 76 Q60 ${78 + full * 0.4} 52.5 76 Z" fill="${lip}"/><path d="M53.5 76.3 Q60 79.5 66.5 76.3" fill="none" stroke="#FFFFFF" stroke-width=".9" opacity=".7"/>`;
  else if (mood === 'tense') g += `<path d="M53 78.5 Q60 ${75.5 - full * 0.4} 67 78.5" fill="none" stroke="${lip}" stroke-width="${1.8 + full * 0.6}" stroke-linecap="round"/>`;
  else g += `<path d="M53 77.4 Q60 ${76.4 - full * 0.6} 67 77.4 Q60 ${79 + full * 0.5} 53 77.4 Z" fill="${lip}"/>`;
  if (female) g += `<ellipse cx="45" cy="68" rx="4" ry="2.4" fill="#E58C8C" opacity=".22"/><ellipse cx="75" cy="68" rx="4" ry="2.4" fill="#E58C8C" opacity=".22"/>`;
  // Sakal / bıyık
  if (!female) {
    const fh = hair;
    if (c.facial === 'sakal' || c.facial === 'kirli') g += `<path d="M37 62 Q37 90 60 92.5 Q83 90 83 62 Q81 80 70 82 Q66 74 60 74.5 Q54 74 50 82 Q39 80 37 62 Z" fill="${fh}" opacity="${c.facial === 'kirli' ? 0.28 : 0.95}"/>`;
    if (c.facial === 'biyik' || c.facial === 'sakal') g += `<path d="M51 74 Q60 69.5 69 74 Q60 72.5 51 74 Z" fill="${fh}" stroke="${fh}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (c.facial === 'kepce') g += `<path d="M49 75.5 Q60 68 71 75.5 Q66 73.5 60 74 Q54 73.5 49 75.5 Z" fill="${fh}" stroke="${fh}" stroke-width="3.4" stroke-linejoin="round"/>`;
  }
  // Gözlük
  if (c.glasses && c.glasses !== 'yok') {
    const w = c.glasses === 'kalin' ? 2.6 : 1.3, col = c.glasses === 'kalin' ? '#1E1A18' : '#6B5B45';
    g += `<g fill="none" stroke="${col}" stroke-width="${w}"><rect x="43" y="52" width="15" height="11" rx="4"/><rect x="62" y="52" width="15" height="11" rx="4"/><path d="M58 57 Q60 55.5 62 57 M43 56 L37 55 M77 56 L83 55"/></g>
      <path d="M45 54 L49 53 M64 54 L68 53" stroke="#FFFFFF" stroke-width="1.2" opacity=".55"/>`;
  }
  return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(size * 140 / 120)}" role="img" aria-label="Karakter portresi" style="display:block">${g}</svg>`;
}
