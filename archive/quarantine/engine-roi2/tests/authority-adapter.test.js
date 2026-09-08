import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityAdapter } from '../scripts/engine/authority-adapter.js';

test('AA-01: Correctly normalizes standard LEVEL_0 to LEVEL_4 tokens', () => {
  const l0 = AuthorityAdapter.normalize('LEVEL_0');
  assert.equal(l0.rank, 0);
  assert.equal(l0.mcl, 'MCL-0');
  assert.equal(l0.token, 'A0');
  assert.equal(l0.isDenied, false);

  const l2 = AuthorityAdapter.normalize('LEVEL_2_SUPERVISED');
  assert.equal(l2.rank, 2);
  assert.equal(l2.mcl, 'MCL-2');
  assert.equal(l2.token, 'A2');
  assert.equal(l2.isExternalWrite, true);

  const l4 = AuthorityAdapter.normalize('LEVEL_4_PRODUCTION');
  assert.equal(l4.rank, 4);
  assert.equal(l4.mcl, 'MCL-4');
  assert.equal(l4.token, 'A5');
  assert.equal(l4.isProduction, true);
});

test('AA-02: LEVEL_3_PROMOTE unambiguously resolves to A3 (monotonic least privilege)', () => {
  const l3 = AuthorityAdapter.normalize('LEVEL_3_PROMOTE');
  assert.equal(l3.rank, 3);
  assert.equal(l3.mcl, 'MCL-3');
  assert.equal(l3.token, 'A3');
  assert.equal(l3.isProduction, false);
});

test('AA-03: Unknown, invalid, or null tokens evaluate to DENIED (A0 / rank 0)', () => {
  const invalid1 = AuthorityAdapter.normalize('ROOT');
  assert.equal(invalid1.isDenied, true);
  assert.equal(invalid1.rank, 0);

  const invalid2 = AuthorityAdapter.normalize(null);
  assert.equal(invalid2.isDenied, true);
  assert.equal(invalid2.rank, 0);

  const invalid3 = AuthorityAdapter.normalize('LEVEL_99');
  assert.equal(invalid3.isDenied, true);
  assert.equal(invalid3.rank, 0);
});

test('AA-04: checkAuthority enforces rank comparisons correctly', () => {
  const check1 = AuthorityAdapter.checkAuthority('LEVEL_1', 'LEVEL_2');
  assert.equal(check1.authorized, true);

  const check2 = AuthorityAdapter.checkAuthority('LEVEL_3', 'LEVEL_2');
  assert.equal(check2.authorized, false);

  const check3 = AuthorityAdapter.checkAuthority('LEVEL_2', 'LEVEL_2');
  assert.equal(check3.authorized, true);
});

test('AA-05: checkAuthority blocks any check involving an invalid token', () => {
  const check = AuthorityAdapter.checkAuthority('LEVEL_1', 'INVALID_SUDO');
  assert.equal(check.authorized, false);
  assert.match(check.reason, /DENIED/);
});

test('AA-06: isExternalWriteAuthorized blocks LEVEL_0 and LEVEL_1', () => {
  assert.equal(AuthorityAdapter.isExternalWriteAuthorized('LEVEL_0'), false);
  assert.equal(AuthorityAdapter.isExternalWriteAuthorized('LEVEL_1'), false);
  assert.equal(AuthorityAdapter.isExternalWriteAuthorized('LEVEL_2'), true);
  assert.equal(AuthorityAdapter.isExternalWriteAuthorized('LEVEL_3'), true);
});

test('AA-07: isProductionAuthorized permits only LEVEL_4', () => {
  assert.equal(AuthorityAdapter.isProductionAuthorized('LEVEL_0'), false);
  assert.equal(AuthorityAdapter.isProductionAuthorized('LEVEL_1'), false);
  assert.equal(AuthorityAdapter.isProductionAuthorized('LEVEL_2'), false);
  assert.equal(AuthorityAdapter.isProductionAuthorized('LEVEL_3'), false);
  assert.equal(AuthorityAdapter.isProductionAuthorized('LEVEL_4'), true);
});

test('AA-08: Monotonic non-escalation invariant holds across random inputs', () => {
  const fuzzInputs = ['admin', 'super', 'escalate', '', ' ', 'A99', 'LEVEL_5', 'sudo', 'root'];
  for (const input of fuzzInputs) {
    const norm = AuthorityAdapter.normalize(input);
    assert.equal(norm.isDenied, true);
    assert.equal(norm.rank, 0);
    assert.equal(norm.isProduction, false);
  }
});
