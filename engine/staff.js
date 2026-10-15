// Ekip: işe alma, maaş, etkiler.
import { STAFF_ROLES, STAFF_FIRST, STAFF_LAST } from '../data/staff.js';
import { priceIndex } from './util.js';

export const roleById = id => STAFF_ROLES.find(r => r.id === id);

export function staffLevel(state, role) {
  const s = state.staff?.[role];
  return s ? s.level : 0;
}

// Çarpanlar (çalışan yoksa 1)
export function staffMod(state, key) {
  const L = r => staffLevel(state, r);
  switch (key) {
    case 'social': return 1 + 0.4 * L('sosyal');
    case 'viral': return 1 + 0.6 * L('sosyal');
    case 'backfire': return 1 - 0.5 * L('sosyal');
    case 'press': return 1 + 0.35 * L('basin');
    case 'tv': return 1 + 0.15 * L('basin');
    case 'gaffe': return 1 - 0.35 * L('basin');
    case 'rallyCost': return 1 - 0.25 * L('kampanya');
    case 'crowd': return 1 + 0.25 * L('kampanya');
    case 'field': return 1 + 0.2 * L('kampanya');
    case 'economy': return 1 + 0.25 * L('ekonomi');
    case 'scandal': return 1 - 0.6 * L('hukuk');
    case 'foreign': return 1 + 0.4 * L('dis');
    case 'ap': return L('asistan') >= 0.45 ? 1 : 0;
    case 'intel': return L('anket') > 0;
    case 'pollSd': return 1 - 0.5 * L('anket');
    default: return 1;
  }
}

export function weeklyStaffCost(state) {
  return Object.values(state.staff || {}).reduce((a, s) => a + s.salary, 0) * priceIndex(state);
}

// Her rol için 3 aday (ayda bir yenilenir)
export function candidatesFor(state, role) {
  const month = state.date.slice(0, 7);
  let h = 0;
  for (const c of role + month + state.seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const r = () => (h = (Math.imul(h ^ (h >>> 13), 1274126177) + 0x6D2B79F5) >>> 0) / 4294967296;
  const base = roleById(role);
  return [0, 1, 2].map(i => {
    const level = +(0.3 + 0.6 * r()).toFixed(2);
    return { id: `${role}-${month}-${i}`, role, name: `${STAFF_FIRST[Math.floor(r() * STAFF_FIRST.length)]} ${STAFF_LAST[Math.floor(r() * STAFF_LAST.length)]}`,
      level, salary: Math.round(base.salary * (0.5 + level) / 1000) * 1000, loyalty: Math.round(50 + 45 * r()), since: null };
  });
}

export function hire(state, cand) {
  state.staff = state.staff || {};
  state.staff[cand.role] = { ...cand, since: state.date };
  const party = state.parties[state.player.partyId];
  party.money -= cand.salary * priceIndex(state); // ilk hafta peşin
  if (cand.role === 'asistan' && cand.level >= 0.45) state.player.apMax = (state.player.apMaxBase ?? state.player.apMax) + 2;
}

export function fire(state, role) {
  if (!state.staff?.[role]) return;
  if (role === 'asistan' && state.staff[role].level >= 0.45) state.player.apMax = Math.max(6, state.player.apMax - 2);
  delete state.staff[role];
}
