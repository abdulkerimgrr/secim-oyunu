import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../engine/state.js';
import { dhondt } from '../engine/dhondt.js';

test("D'Hondt temel örnek", () => {
  assert.deepEqual(dhondt({ A: 100000, B: 80000, C: 30000, D: 20000 }, 8), { A: 4, B: 3, C: 1, D: 0 });
});

test('Kalibrasyon 2023 meclis dağılımını birebir üretir', () => {
  const s = newGame({ mode: 'join', joinPartyId: 'CHP', playerName: 'Test', seed: 1 });
  assert.deepEqual(
    Object.fromEntries(Object.entries(s.parliament.seats).filter(([, v]) => v > 0)),
    { AKP: 268, CHP: 169, YSP: 61, MHP: 50, IYI: 43, YRP: 5, TIP: 4 });
  const n = s.elections[0].national;
  assert.ok(Math.abs(n.AKP - 0.362) < 0.003, 'AKP ulusal payı ' + n.AKP);
});
