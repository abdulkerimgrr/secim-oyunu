// localStorage kayıt sistemi: 3 yuva + otomatik kayıt, dışa/içe aktarma.
import { SAVE_VERSION } from './state.js';

const KEY = s => `secim-oyunu:kayit:${s}`;
export const SLOTS = ['oto', '1', '2', '3'];

function store() { try { return window.localStorage; } catch { return null; } }

export function saveGame(state, slot = 'oto') {
  const ls = store();
  if (!ls) return false;
  try {
    const { lastProjection, ...rest } = state;
    ls.setItem(KEY(slot), JSON.stringify({ savedAt: new Date().toISOString(), state: rest }));
    return true;
  } catch { return false; }
}

export function loadGame(slot = 'oto') {
  const ls = store();
  try {
    const raw = ls && ls.getItem(KEY(slot));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.state?.version === SAVE_VERSION ? d.state : null;
  } catch { return null; }
}

export function slotInfo(slot) {
  const ls = store();
  try {
    const raw = ls && ls.getItem(KEY(slot));
    if (!raw) return null;
    const d = JSON.parse(raw);
    const s = d.state;
    const p = s.parties[s.player.partyId];
    return { savedAt: d.savedAt, date: s.date, party: p.short, name: s.player.name, color: p.color };
  } catch { return null; }
}

export function deleteSlot(slot) { try { store()?.removeItem(KEY(slot)); } catch { /* yok say */ } }

export function exportState(state) {
  const { lastProjection, ...rest } = state;
  return JSON.stringify({ format: 'secim-oyunu', version: SAVE_VERSION, state: rest });
}
export function importState(text) {
  const d = JSON.parse(text);
  if (d.format !== 'secim-oyunu' || d.version !== SAVE_VERSION) throw new Error('Geçersiz veya uyumsuz kayıt dosyası');
  return d.state;
}
