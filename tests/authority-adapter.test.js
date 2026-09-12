import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTHORITY_MATRIX } from '../src/core/authority/authority-adapter.js';

test('AUTHORITY_MATRIX structure and immutability', () => {
  // Test it exists and is frozen
  assert.ok(AUTHORITY_MATRIX, 'AUTHORITY_MATRIX should be exported');
  assert.ok(Object.isFrozen(AUTHORITY_MATRIX), 'AUTHORITY_MATRIX should be frozen');

  // Test LEVEL_0 (Read-only)
  assert.deepEqual(AUTHORITY_MATRIX['LEVEL_0'], { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false });

  // Test LEVEL_4 (Production)
  assert.deepEqual(AUTHORITY_MATRIX['LEVEL_4'], { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true });
});
