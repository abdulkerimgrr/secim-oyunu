// Arka plan müziği: dört parça anlık sentezlenir (menü, oyun, kampanya, cumhurbaşkanlığı).
import { audioCtx, musicOut, getSettings, onSettings, synthTone, noise } from './sound.js';

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
const TRACKS = {
  menu: { bpm: 70, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], arp: [0, 1, 2, 1, 2, 1, 0, 2], lead: 'triangle', bass: true, hat: false, pad: 0.05 },
  game: { bpm: 96, chords: [[48, 52, 55], [57, 60, 64], [53, 57, 60], [55, 59, 62]], arp: [0, 2, 1, 2, 0, 2, 1, 2], lead: 'triangle', bass: true, hat: true, pad: 0.035 },
  campaign: { bpm: 116, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], arp: [0, 1, 2, 0, 1, 2, 1, 0], lead: 'square', bass: true, hat: true, kick: true, pad: 0.03 },
  president: { bpm: 78, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], arp: [0, 2, 1, 2, 0, 1, 2, 1], lead: 'sawtooth', bass: true, timpani: true, pad: 0.05 },
};
let current = null, timer = null, nextTime = 0, step = 0, started = false, wanted = 'menu';

function schedule() {
  const c = audioCtx();
  if (!c || !current) return;
  const tr = TRACKS[current];
  const spb = 60 / tr.bpm / 2; // sekizlik
  const out = musicOut();
  while (nextTime < c.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % tr.chords.length;
    const chord = tr.chords[bar];
    const i = step % 8;
    const t = nextTime;
    // pad: her ölçü başında akor
    if (i === 0) chord.forEach(n => synthTone(N(n), t, spb * 8.2, { type: 'sine', vol: tr.pad, attack: 0.5, out }));
    // arpej
    const note = chord[tr.arp[i]] + 12;
    synthTone(N(note), t, spb * 0.9, { type: tr.lead, vol: tr.lead === 'triangle' ? 0.05 : 0.018, attack: 0.01, out });
    if (tr.bass && (i === 0 || i === 4)) synthTone(N(chord[0] - 12), t, spb * 3.5, { type: 'sine', vol: 0.09, out });
    if (tr.hat && i % 2 === 1) noise(t, 0.04, { vol: 0.025, freq: 8000, type: 'highpass', out });
    if (tr.kick && i % 4 === 0) synthTone(110, t, 0.18, { type: 'sine', vol: 0.14, slide: -70, out });
    if (tr.timpani && i === 0) { synthTone(N(chord[0] - 24), t, 0.9, { type: 'sine', vol: 0.12, slide: -10, out }); noise(t, 0.3, { vol: 0.03, freq: 200, out }); }
    nextTime += spb;
    step++;
  }
}

function start() {
  const c = audioCtx();
  if (!c) return;
  if (!timer) timer = setInterval(schedule, 60);
  nextTime = c.currentTime + 0.1;
}

export function playTrack(name) {
  wanted = name;
  if (!started) return;
  const s = getSettings();
  if (!s.master || !s.music) { current = null; return; }
  if (current === name) return;
  current = name;
  step = 0;
  start();
}
export const currentTrack = () => wanted;

// Tarayıcılar sesi kullanıcı etkileşiminden sonra açar
export function initMusic() {
  const unlock = () => {
    if (started) return;
    started = true;
    playTrack(wanted);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  onSettings(s => { if (!s.master || !s.music) current = null; else { const w = wanted; current = null; playTrack(w); } });
}
