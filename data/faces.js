// Gerçekçi yüz galerisi: serbest karakter oluşturmada seçimlere en yakın fotoğraf gösterilir.
// Fotoğraflar assets/medya/face-<id>.webp (MEDIA['face:<id>']); hepsi kurgusal kişilerdir.
// Görseli olmayan yüzler galeride görünmez; hiç eşleşme yoksa çizim avatar kullanılır.
import { ARCHETYPES, LOOKS, archetypeLook } from './character.js';

const K = 'k', E = 'e';
export const FACES = [
  // Kadınlar
  { id: 'k1', gender: K, age: 32, skin: '#EBC2A3', hairStyle: 'uzun', hairColor: '#4A3226', glasses: 'yok', outfit: 'bluz', suit: '#E0E0E0' },
  { id: 'k2', gender: K, age: 34, skin: '#D9A47F', hairStyle: 'dalgali', hairColor: '#1E1A18', glasses: 'yok', outfit: 'takim', suit: '#1F2A44' },
  { id: 'k3', gender: K, age: 31, skin: '#EBC2A3', hairStyle: 'basortu', scarf: '#1F5FA8', glasses: 'yok', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'k4', gender: K, age: 33, skin: '#9C6644', hairStyle: 'kivircik', hairColor: '#1E1A18', glasses: 'yok', outfit: 'kazak', suit: '#6B6F76' },
  { id: 'k5', gender: K, age: 36, skin: '#F6D7C3', hairStyle: 'kisa', hairColor: '#B88A4E', glasses: 'yok', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'k6', gender: K, age: 45, skin: '#EBC2A3', hairStyle: 'omuz', hairColor: '#7A5236', glasses: 'yok', outfit: 'takim', suit: '#1F2A44' },
  { id: 'k7', gender: K, age: 48, skin: '#D9A47F', hairStyle: 'topuz', hairColor: '#1E1A18', glasses: 'ince', outfit: 'takim', suit: '#3B4A5E' },
  { id: 'k8', gender: K, age: 47, skin: '#C08660', hairStyle: 'basortu', scarf: '#D8C7B0', glasses: 'yok', outfit: 'bluz', suit: '#5A4636' },
  { id: 'k9', gender: K, age: 42, skin: '#D9A47F', hairStyle: 'uzun', hairColor: '#1E1A18', glasses: 'yok', outfit: 'kazak', suit: '#1E3D33' },
  { id: 'k10', gender: K, age: 52, skin: '#EBC2A3', hairStyle: 'dalgali', hairColor: '#B88A4E', glasses: 'yok', outfit: 'takim', suit: '#6E1F2A' },
  { id: 'k11', gender: K, age: 62, skin: '#F6D7C3', hairStyle: 'kisa', hairColor: '#8E8E8E', glasses: 'ince', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'k12', gender: K, age: 66, skin: '#EBC2A3', hairStyle: 'omuz', hairColor: '#D9D9D9', glasses: 'yok', outfit: 'takim', suit: '#1F2A44' },
  { id: 'k13', gender: K, age: 63, skin: '#D9A47F', hairStyle: 'basortu', scarf: '#6B3FA0', glasses: 'yok', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'k14', gender: K, age: 60, skin: '#C08660', hairStyle: 'topuz', hairColor: '#8E8E8E', glasses: 'kalin', outfit: 'bluz', suit: '#E0E0E0' },
  { id: 'k15', gender: K, age: 55, skin: '#6F4A33', hairStyle: 'kisa', hairColor: '#1E1A18', glasses: 'yok', outfit: 'takim', suit: '#3B4A5E' },
  // Erkekler
  { id: 'e1', gender: E, age: 32, skin: '#EBC2A3', hairStyle: 'kisa', hairColor: '#1E1A18', facial: 'yok', glasses: 'yok', outfit: 'gomlek', suit: '#E0E0E0' },
  { id: 'e2', gender: E, age: 35, skin: '#F6D7C3', hairStyle: 'yan', hairColor: '#7A5236', facial: 'yok', glasses: 'ince', outfit: 'takim', suit: '#1F2A44' },
  { id: 'e3', gender: E, age: 34, skin: '#6F4A33', hairStyle: 'kisa', hairColor: '#1E1A18', facial: 'kirli', glasses: 'yok', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'e4', gender: E, age: 38, skin: '#D9A47F', hairStyle: 'geriye', hairColor: '#4A3226', facial: 'sakal', glasses: 'yok', outfit: 'acikyaka', suit: '#3B4A5E' },
  { id: 'e5', gender: E, age: 46, skin: '#D9A47F', hairStyle: 'geriye', hairColor: '#1E1A18', facial: 'biyik', glasses: 'yok', outfit: 'takim', suit: '#1F2A44' },
  { id: 'e6', gender: E, age: 50, skin: '#C08660', hairStyle: 'kel', hairColor: '#1E1A18', facial: 'sakal', glasses: 'yok', outfit: 'acikyaka', suit: '#2D2D2D' },
  { id: 'e7', gender: E, age: 44, skin: '#EBC2A3', hairStyle: 'dalgali', hairColor: '#4A3226', facial: 'kirli', glasses: 'yok', outfit: 'kazak', suit: '#1E3D33' },
  { id: 'e8', gender: E, age: 53, skin: '#EBC2A3', hairStyle: 'seyrek', hairColor: '#8E8E8E', facial: 'yok', glasses: 'kalin', outfit: 'takim', suit: '#6B6F76' },
  { id: 'e9', gender: E, age: 48, skin: '#9C6644', hairStyle: 'kisa', hairColor: '#1E1A18', facial: 'kepce', glasses: 'yok', outfit: 'kazak', suit: '#5A4636' },
  { id: 'e10', gender: E, age: 41, skin: '#D9A47F', hairStyle: 'yan', hairColor: '#1E1A18', facial: 'yok', glasses: 'yok', outfit: 'gomlek', suit: '#E0E0E0' },
  { id: 'e11', gender: E, age: 62, skin: '#D9A47F', hairStyle: 'kisa', hairColor: '#8E8E8E', facial: 'biyik', glasses: 'yok', outfit: 'takim', suit: '#2D2D2D' },
  { id: 'e12', gender: E, age: 68, skin: '#F6D7C3', hairStyle: 'geriye', hairColor: '#D9D9D9', facial: 'yok', glasses: 'ince', outfit: 'takim', suit: '#1F2A44' },
  { id: 'e13', gender: E, age: 64, skin: '#C08660', hairStyle: 'kel', hairColor: '#8E8E8E', facial: 'kirli', glasses: 'yok', outfit: 'acikyaka', suit: '#3B4A5E' },
  { id: 'e14', gender: E, age: 60, skin: '#EBC2A3', hairStyle: 'seyrek', hairColor: '#D9D9D9', facial: 'sakal', glasses: 'yok', outfit: 'gomlek', suit: '#6B6F76' },
  { id: 'e15', gender: E, age: 66, skin: '#6F4A33', hairStyle: 'kisa', hairColor: '#D9D9D9', facial: 'sakal', glasses: 'yok', outfit: 'takim', suit: '#111418' },
];

// Fotoğraf seçildiğinde karaktere kopyalanan görünüm alanları
export const FACE_FIELDS = ['gender', 'age', 'skin', 'hairStyle', 'hairColor', 'facial', 'glasses', 'outfit', 'suit', 'scarf'];

// Eşleşmede kullanılabilecek tüm fotoğraflar: galeri yüzleri + hazır aday tipleri
export function facePool(media) {
  const pool = [
    ...FACES.map(f => ({ key: 'face:' + f.id, look: f })),
    ...ARCHETYPES.map(a => ({ key: 'archetype:' + a.id, look: archetypeLook(a) })),
  ];
  return pool.filter(p => media[p.key]);
}

const SKINS = LOOKS.skin;
const HAIRS = LOOKS.hairColor.map(h => h[0]);
const idx = (list, v) => Math.max(0, list.indexOf(v));

// Karakterin seçimlerine göre bir fotoğrafın ne kadar uyduğu; uymuyorsa -Infinity
export function faceScore(c, f) {
  if (c.gender !== f.gender) return -Infinity;
  const scarfC = c.hairStyle === 'basortu', scarfF = f.hairStyle === 'basortu';
  if (scarfC !== scarfF) return -Infinity;
  let s = 0;
  s -= Math.abs((c.age || 45) - (f.age || 45)) / 6;
  s -= Math.abs(idx(SKINS, c.skin) - idx(SKINS, f.skin)) * 1.6;
  if (!scarfC) {
    if (c.hairStyle === f.hairStyle) s += 3;
    else if (c.hairStyle === 'kel' || f.hairStyle === 'kel') s -= 4;
    s -= Math.abs(idx(HAIRS, c.hairColor) - idx(HAIRS, f.hairColor)) * 0.7;
  }
  if (c.gender === 'e') {
    const fc = c.facial || 'yok', ff = f.facial || 'yok';
    if (fc === ff) s += 2; else if (fc === 'yok' || ff === 'yok') s -= 1.5;
  }
  if (((c.glasses || 'yok') !== 'yok') === ((f.glasses || 'yok') !== 'yok')) s += 1.5;
  if ((c.outfit || 'takim') === (f.outfit || 'takim')) s += 1;
  return s;
}

// Uygun fotoğraflar, en iyi eşleşme önce
export function rankFaces(c, media) {
  return facePool(media).map(p => ({ ...p, score: faceScore(c, p.look) }))
    .filter(p => p.score > -Infinity).sort((a, b) => b.score - a.score);
}

export function bestFace(c, media) { return rankFaces(c, media)[0] || null; }
