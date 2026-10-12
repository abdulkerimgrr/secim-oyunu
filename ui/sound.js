// Ses efektleri ve müzik ayarları. Web Audio ile anlık sentezlenir (dosya yok, internetsiz çalışır).
const KEY = 'secim-oyunu:ayarlar';
const DEFAULTS = { master: true, sfx: true, sfxVol: 0.7, music: true, musicVol: 0.4 };
let settings = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) return { ...DEFAULTS, ...s };
    if (localStorage.getItem('secim-oyunu:ses') === 'kapali') return { ...DEFAULTS, master: false };
  } catch { /* yok say */ }
  return { ...DEFAULTS };
})();
let ctx = null, master = null, sfxGain = null, musicGain = null;
const listeners = new Set();

export const getSettings = () => ({ ...settings });
export const isMuted = () => !settings.master;
export function setSetting(k, v) {
  settings[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* yok say */ }
  applyGains();
  listeners.forEach(fn => fn(settings));
}
export function onSettings(fn) { listeners.add(fn); }
export function setMuted(v) { setSetting('master', !v); }

function applyGains() {
  if (!ctx) return;
  master.gain.value = settings.master ? 1 : 0;
  sfxGain.gain.value = settings.sfx ? 0.6 * settings.sfxVol : 0;
  musicGain.gain.setTargetAtTime(settings.music ? 0.5 * settings.musicVol * (duck ? 0.25 : 1) : 0, ctx.currentTime, 0.3);
}
let duck = false;
export function duckMusic(v) { duck = v; applyGains(); }

export function audioCtx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.connect(master);
      applyGains();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
export const musicOut = () => (audioCtx(), musicGain);

function ac() { if (!settings.master || !settings.sfx) return null; return audioCtx(); }

function tone(freq, t0, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.01, out } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out || sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
export { tone as synthTone };

let noiseBuf = null;
export function noise(t0, dur, { vol = 0.2, freq = 1200, q = 0.8, type = 'bandpass', attack = 0.005, out } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(out || sfxGain);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

const SFX = {
  click(t) { tone(880, t, 0.05, { type: 'triangle', vol: 0.12 }); },
  ping(t) { tone(1320, t, 0.18, { vol: 0.18 }); tone(1760, t + 0.07, 0.22, { vol: 0.12 }); },
  sting(t) {
    tone(523, t, 0.16, { type: 'square', vol: 0.12 }); tone(659, t + 0.12, 0.16, { type: 'square', vol: 0.12 });
    tone(784, t + 0.24, 0.35, { type: 'square', vol: 0.14 }); tone(196, t, 0.6, { type: 'sawtooth', vol: 0.08 });
  },
  jingle(t) {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.4, { type: 'triangle', vol: 0.16 }));
    tone(131, t, 1.0, { type: 'sawtooth', vol: 0.1 }); noise(t + 0.5, 0.6, { vol: 0.08, freq: 6000, type: 'highpass' });
  },
  applause(t, d = 2.2) { for (let i = 0; i < 40; i++) noise(t + Math.random() * d, 0.06 + Math.random() * 0.05, { vol: 0.12 + Math.random() * 0.1, freq: 1500 + Math.random() * 2500, q: 1.2 }); noise(t, d + 0.3, { vol: 0.05, freq: 2000, q: 0.5 }); },
  cheer(t) { this.applause(t, 2.6); noise(t, 2.4, { vol: 0.09, freq: 700, q: 0.6, attack: 0.4 }); for (let i = 0; i < 4; i++) tone(500 + Math.random() * 300, t + 0.3 + i * 0.4, 0.5, { type: 'sawtooth', vol: 0.025, slide: 120 }); },
  murmur(t) { noise(t, 1.6, { vol: 0.08, freq: 400, q: 0.7, attack: 0.3 }); tone(160, t + 0.2, 0.9, { type: 'sawtooth', vol: 0.03, slide: -40 }); },
  boo(t) { tone(220, t, 0.9, { type: 'sawtooth', vol: 0.06, slide: -90 }); tone(180, t + 0.1, 0.9, { type: 'sawtooth', vol: 0.05, slide: -70 }); noise(t, 1, { vol: 0.06, freq: 350 }); },
  shutter(t) { noise(t, 0.04, { vol: 0.35, freq: 4000, q: 0.6 }); noise(t + 0.06, 0.05, { vol: 0.25, freq: 2500, q: 0.6 }); },
  flashes(t) { for (let i = 0; i < 8; i++) this.shutter(t + Math.random() * 2); },
  coin(t) { tone(988, t, 0.08, { type: 'square', vol: 0.1 }); tone(1319, t + 0.08, 0.3, { type: 'square', vol: 0.1 }); },
  coins(t) { for (let i = 0; i < 7; i++) this.coin(t + i * 0.16); },
  whoosh(t) { noise(t, 0.45, { vol: 0.18, freq: 800, q: 0.9, attack: 0.15 }); },
  ding(t) { tone(1568, t, 0.6, { vol: 0.15 }); tone(2093, t, 0.5, { vol: 0.08 }); },
  pop(t) { tone(600, t, 0.08, { vol: 0.15, slide: 500 }); },
  notif(t) { for (let i = 0; i < 4; i++) { tone(1046, t + i * 0.22, 0.09, { vol: 0.1 }); tone(1568, t + i * 0.22 + 0.05, 0.1, { vol: 0.08 }); } },
  tick(t) { tone(1200, t, 0.03, { type: 'square', vol: 0.06 }); },
  drumroll(t, d = 2) { for (let x = 0; x < d; x += 0.05) noise(t + x, 0.05, { vol: 0.1 + x * 0.04, freq: 180, q: 0.5 }); noise(t + d, 0.6, { vol: 0.3, freq: 120, q: 0.5 }); tone(98, t + d, 0.6, { vol: 0.2 }); },
  win(t) { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.13, 0.5, { type: 'triangle', vol: 0.18 })); this.applause(t + 0.3, 2); },
  lose(t) { [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.2, 0.5, { type: 'triangle', vol: 0.14 })); },
  rain(t) { noise(t, 2.2, { vol: 0.06, freq: 5000, type: 'highpass', attack: 0.4 }); },
  gavel(t) { tone(160, t, 0.12, { type: 'square', vol: 0.15 }); noise(t, 0.08, { vol: 0.3, freq: 900 }); },
};

export function sfx(name, delay = 0, ...args) {
  const c = ac();
  if (!c || !SFX[name]) return;
  try { SFX[name].call(SFX, c.currentTime + delay + 0.02, ...args); } catch { /* yok say */ }
}

export function soundToggleHtml() {
  const m = !settings.master;
  return `<button class="snd-toggle" type="button" data-sound aria-label="${m ? 'Sesi aç' : 'Sesi kapat'}" title="${m ? 'Sesi aç' : 'Sesi kapat'}">${m ? '🔇' : '🔊'}</button>`;
}
export function bindSoundToggle(root) {
  root.querySelectorAll('[data-sound]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    setSetting('master', !settings.master);
    b.textContent = settings.master ? '🔊' : '🔇';
    b.setAttribute('aria-label', settings.master ? 'Sesi kapat' : 'Sesi aç');
    if (settings.master) sfx('ping');
  });
}
