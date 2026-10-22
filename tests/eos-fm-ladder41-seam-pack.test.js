/**
 * Ladder 41 CI Seam-Pack Consolidation & End-to-End Governance Suite.
 * SPEC-0175 / ADR-0159.
 *
 * Invariants:
 * - PRODUCTION_READY=NO on receipt/gate/port; soft-observe pin f5948926
 * - Canonical nine-field FM-RCPT-* seal with deterministic opaque-only seamDigest
 * - Soft-import NEVER throws: a module that exists but throws while EVALUATING
 *   must degrade to observed:false (the full `await import()` is inside the catch)
 * - Soft-observed satellites are optional; present ones must govern end-to-end
 * - Closeout without humanGateHeld is refused (L41_AUTO_CLOSE_FORBIDDEN)
 * - Tip-seal inside the product package is refused (TIP_SEAL_IN_PRODUCT_FORBIDDEN)
 * - Law VI: opaque refs + seamDigest only, never secrets or payload bytes
 * - Seam-pack != tip-seal != Formal L41 CLOSED != PRODUCTION_READY != GHE
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FM_PRODUCTION_READY,
  FM_RECEIPT_KIND,
  FM_FREEZE_PIN,
  FM_FREEZE_PIN_SHORT,
  FM_CHAIN_ORDER,
  FM_SATELLITE_SPECS,
  FM_FREEZE_NONCLAIM_LABELS,
  _resetReceiptSeqForTests,
  sha256Canonical,
  computeSeamDigest,
  buildLadder41SeamReceipt,
  verifyLadder41SeamReceipt
} from '../src/core/composition/ladder41-seam-receipt.js';

import {
  Ladder41SeamPolicyGate,
  FM_CODES,
  FM_POLICY_GATE_PRODUCTION_READY,
  claimsL41AutoClose,
  claimsTipSeal,
  claimsTipSealInProduct,
  claimsLadderReopen,
  claimsProductionReadyFlip,
  claimsGhe,
  claimsCloudAgent,
  claimsMassPrune,
  claimsHardDelete,
  claimsSatelliteAsSeam,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/composition/ladder41-seam-policy-gate.js';

import {
  Ladder41SeamPort,
  FM_PORT_PRODUCTION_READY,
  FM_PORT_KIND,
  FM_SAFE_AUTOMATION_IDS,
  softImportUrls,
  softObserveFi,
  softObserveFj,
  softObserveFk,
  softObserveFl
} from '../src/core/composition/ladder41-seam-port.js';

function plan(overrides = {}) {
  return {
    planId: 'plan-l41-fm-seam-001',
    changeId: 'eos-ladder-41-mission-fm',
    ritualMode: 'ACTIVE',
    ...overrides
  };
}

test('FM1: declares PRODUCTION_READY=NO across receipt/gate/port + soft-observe pin f5948926', () => {
  assert.equal(FM_PRODUCTION_READY, 'NO');
  assert.equal(FM_POLICY_GATE_PRODUCTION_READY, 'NO');
  assert.equal(FM_PORT_PRODUCTION_READY, 'NO');
  assert.equal(FM_FREEZE_PIN, 'f5948926b723167db78ffb08f46123810cd66444');
  assert.equal(FM_FREEZE_PIN_SHORT, 'f5948926');
  assert.deepEqual([...FM_CHAIN_ORDER], ['FI', 'FJ', 'FK', 'FL']);
  assert.deepEqual(
    [...FM_SATELLITE_SPECS],
    ['SPEC-0171', 'SPEC-0172', 'SPEC-0173', 'SPEC-0174']
  );
  assert.ok(FM_SAFE_AUTOMATION_IDS.length >= 9);
  assert.ok(FM_FREEZE_NONCLAIM_LABELS.some((l) => /Tip-seal L41 CLOSED is SEPARATE/.test(l)));
  assert.ok(FM_FREEZE_NONCLAIM_LABELS.some((l) => /L41 auto-close refused/.test(l)));
});

test('FM2: builds canonical nine-field FM-RCPT-* with seamHold + chainObserve', () => {
  _resetReceiptSeqForTests();
  const r = buildLadder41SeamReceipt({
    planId: 'plan-l41-fm-seam-001',
    decision: 'PASS',
    operation: 'LADDER41_SEAM_PACK_CLOSEOUT',
    chainObserve: { fi: true, fj: true, fk: true, fl: true, prefixes: ['FI-RCPT-'] }
  });
  assert.match(r.receiptId, /^FM-RCPT-\d{4}-[0-9a-f]{8}$/);
  assert.equal(r.kind, FM_RECEIPT_KIND);
  assert.equal(r.fundacionDelta, 0);
  assert.equal(r.productionReady, 'NO');
  assert.match(r.seamDigest, /^[0-9a-f]{64}$/);
  assert.equal(r.seamHold.tipSealSeparate, true);
  assert.equal(r.seamHold.l41AutoCloseRefused, true);
  assert.equal(r.seamHold.tipSealInProductClaimRefused, true);
  assert.equal(r.seamHold.softObserveOnly, true);
  assert.equal(r.chainObserve.fi && r.chainObserve.fj && r.chainObserve.fk && r.chainObserve.fl, true);
  assert.equal(r.freezeObserve.pinShort, 'f5948926');
  assert.equal(r.freezeObserve.l40ReopenRefused, true);
  assert.deepEqual(verifyLadder41SeamReceipt(r), { ok: true });
});

test('FM3: seamDigest is deterministic and opaque-only (ignores secret/raw fields)', () => {
  const base = computeSeamDigest({ chain: { fi: true, fj: true, fk: true, fl: true } });
  assert.equal(base, computeSeamDigest({ chain: { fi: true, fj: true, fk: true, fl: true } }));

  const polluted = computeSeamDigest({
    chain: { fi: true, fj: true, fk: true, fl: true },
    password: 'p@ss',
    token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
    rawRequestPayload: 'RAW-BYTES'
  });
  assert.equal(polluted, base, 'digest must ignore secret-looking extras');

  const partial = computeSeamDigest({ chain: { fi: true, fj: true, fk: false, fl: true } });
  assert.notEqual(partial, base, 'digest must react to chain completeness');
});

test('FM4: verifies sealed receipt and rejects tampered decision/hash/delta/kind', () => {
  const r = buildLadder41SeamReceipt({ planId: 'p', decision: 'PASS', chainObserve: { fi: true } });
  assert.deepEqual(verifyLadder41SeamReceipt(r), { ok: true });
  assert.equal(verifyLadder41SeamReceipt({ ...r, decision: 'DENY' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...r, receiptHash: 'f'.repeat(64) }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...r, fundacionDelta: 1 }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...r, productionReady: 'YES' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...r, kind: 'x' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt({ ...r, receiptId: 'XX-RCPT-1' }).ok, false);
  assert.equal(verifyLadder41SeamReceipt(null).ok, false);
});

test('FM5: sequences FM-RCPT ids and supports prevReceiptHash chaining', () => {
  _resetReceiptSeqForTests();
  const a = buildLadder41SeamReceipt({ planId: 'p1', decision: 'PASS' });
  const b = buildLadder41SeamReceipt({ planId: 'p2', decision: 'PASS', prevReceiptHash: a.receiptHash });
  assert.match(a.receiptId, /^FM-RCPT-0001-/);
  assert.match(b.receiptId, /^FM-RCPT-0002-/);
  assert.equal(a.prevReceiptHash, '0'.repeat(64));
  assert.equal(b.prevReceiptHash, a.receiptHash);
  assert.deepEqual(verifyLadder41SeamReceipt(b), { ok: true });
  assert.equal(sha256Canonical('x').length, 64);
});

test('FM6: soft-import NEVER throws when a module exists but throws while EVALUATING', async () => {
  // Resolution succeeds; evaluation throws. The full await import() is inside the catch.
  const boom = 'data:text/javascript,throw new Error("evaluation boom")';
  let res;
  await assert.doesNotReject(async () => {
    res = await softImportUrls([boom]);
  });
  assert.equal(res.observed, false);
  assert.equal(res.attemptCount, 1);

  // A working module after a broken one still resolves.
  const ok = 'data:text/javascript,export const x = 1;';
  const mixed = await softImportUrls([boom, ok]);
  assert.equal(mixed.observed, true);
  assert.equal(mixed.mod.x, 1);
  assert.equal(mixed.attemptCount, 2);

  // Empty candidate list degrades safely instead of crashing.
  const none = await softImportUrls([]);
  assert.equal(none.observed, false);
  assert.equal(none.attemptCount, 0);

  // A genuinely missing file URL degrades safely too.
  const missing = await softImportUrls(['file:///definitely/not/a/real/module.js']);
  assert.equal(missing.observed, false);
});

test('FM7: soft-observes FI/FJ/FK/FL as present with PRODUCTION_READY=NO', async () => {
  const fi = await softObserveFi();
  const fj = await softObserveFj();
  const fk = await softObserveFk();
  const fl = await softObserveFl();

  for (const [name, sat] of [['FI', fi], ['FJ', fj], ['FK', fk], ['FL', fl]]) {
    assert.equal(sat.observed, true, `${name} must be observed in this repo`);
    assert.equal(sat.satellite, name);
    assert.equal(sat.present, true);
    assert.equal(typeof sat.Port, 'function', `${name} Port must be a constructor`);
    assert.equal(sat.PRODUCTION_READY, 'NO', `${name} must declare PRODUCTION_READY=NO`);
    assert.match(String(sat.KIND), /port$/, `${name} KIND must be a port kind`);
  }
});

test('FM8: end-to-end chain FI -> FJ -> FK -> FL governs PASS and seals the seam', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  const res = await port.seam(plan());

  assert.equal(res.ok, true, `chain failed: ${JSON.stringify(res.steps)}`);
  assert.equal(res.decision, 'PASS');
  assert.equal(res.code, FM_CODES.OK);
  assert.deepEqual(res.chainOrder, ['FI', 'FJ', 'FK', 'FL']);
  assert.equal(res.satellites.fi, true);
  assert.equal(res.satellites.fj, true);
  assert.equal(res.satellites.fk, true);
  assert.equal(res.satellites.fl, true);

  // Every satellite must have governed, in order, and produced a receipt.
  assert.equal(res.steps.fi, 'PASS');
  assert.equal(res.steps.fj, 'PASS');
  assert.equal(res.steps.fk, 'PASS');
  assert.equal(res.steps.fl, 'PASS');
  assert.match(res.receipt.receiptId, /^FM-RCPT-/);
  assert.equal(res.receipt.chainObserve.prefixes.length, 4);
  assert.equal(res.receipt.satelliteReceipts.fi.startsWith('FI-RCPT-'), true);
  assert.equal(res.receipt.satelliteReceipts.fj.startsWith('FJ-RCPT-'), true);
  assert.equal(res.receipt.satelliteReceipts.fk.startsWith('FK-RCPT-'), true);
  assert.equal(res.receipt.satelliteReceipts.fl.startsWith('FL-RCPT-'), true);
  assert.deepEqual(res.verify, { ok: true });
  assert.equal(port.verifyTrail().ok, true);
});

test('FM9: DENY missing planId / changeId', () => {
  const gate = new Ladder41SeamPolicyGate();
  assert.equal(gate.evaluatePreconditions().code, FM_CODES.MISSING_PLAN_ID);
  assert.equal(gate.evaluatePreconditions({ planId: 'p' }).code, FM_CODES.MISSING_CHANGE_ID);
  assert.equal(gate.evaluatePreconditions({ planId: '  ', changeId: 'c' }).code, FM_CODES.MISSING_PLAN_ID);
  assert.equal(gate.evaluatePreconditions(plan()).decision, 'PASS');
});

test('FM10: FUNDACION_ALWAYS_DENY + Law VI secret refusal', () => {
  const gate = new Ladder41SeamPolicyGate();
  const fund = gate.evaluatePreconditions(plan({ target: 'Fundacion/app' }));
  assert.equal(fund.code, FM_CODES.FUNDACION_ALWAYS_DENY);
  assert.equal(isFundacionTarget('Fundacion/x'), true);

  const leak = gate.evaluatePreconditions(
    plan({ note: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789' })
  );
  assert.equal(leak.code, FM_CODES.SECRET_LEAK_FORBIDDEN);
  assert.equal(scanForSecrets({ a: 'sk-abcdefghijklmnopqrstuvwxyz' }), true);
  assert.equal(scanForSecrets({ a: 'plain text' }), false);
});

test('FM11: L41 closeout requires humanGateHeld (never a computed side effect)', () => {
  const gate = new Ladder41SeamPolicyGate();

  const auto = gate.evaluatePreconditions(plan({ l41AutoClose: true }));
  assert.equal(auto.ok, false);
  assert.equal(auto.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);

  const sealNoGate = gate.evaluatePreconditions(plan({ tipSealL41: true }));
  assert.equal(sealNoGate.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);

  const prose = gate.evaluatePreconditions(plan({ note: 'auto-close ladder 41 now' }));
  assert.equal(prose.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);
  assert.equal(claimsL41AutoClose('auto-close ladder 41'), true);

  // With the human gate held, the closeout claim is no longer refused by this code.
  const gated = gate.evaluatePreconditions(plan({ l41AutoClose: true, humanGateHeld: true }));
  assert.notEqual(gated.code, FM_CODES.L41_AUTO_CLOSE_FORBIDDEN);
});

test('FM12: tip-seal inside the product package is refused', () => {
  const gate = new Ladder41SeamPolicyGate();

  const inProduct = gate.evaluatePreconditions(plan({ tipSealInProduct: true }));
  assert.equal(inProduct.ok, false);
  assert.equal(inProduct.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);

  const prose = gate.evaluatePreconditions(plan({ note: 'tip-seal in the product package' }));
  assert.equal(prose.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);
  assert.equal(claimsTipSealInProduct('tip seal in the product package'), true);

  const sealProse = gate.evaluatePreconditions(plan({ note: 'tip-seal ladder 41 now' }));
  assert.equal(sealProse.code, FM_CODES.TIP_SEAL_FORBIDDEN);
  assert.equal(claimsTipSeal('tip seal ladder 41'), true);
});

test('FM13: L30–L40 reopen is refused for every closed ladder', () => {
  const gate = new Ladder41SeamPolicyGate();
  for (let n = 30; n <= 40; n += 1) {
    const res = gate.evaluatePreconditions(plan({ [`reopenL${n}`]: true }));
    assert.equal(res.ok, false, `L${n}`);
    assert.equal(res.code, FM_CODES[`L${n}_REOPEN_FORBIDDEN`], `L${n}`);
    assert.equal(claimsLadderReopen(`reopen ladder ${n}`, n), true);
  }
});

test('FM14: refuses PR flip, schema add, GHE, CloudAgent, mass prune, hard delete, secret leak', () => {
  const gate = new Ladder41SeamPolicyGate();
  const expect = (override, code) => {
    const res = gate.evaluatePreconditions(plan(override));
    assert.equal(res.ok, false, JSON.stringify(override));
    assert.equal(res.code, code, JSON.stringify(override));
  };
  expect({ productionReady: 'YES' }, FM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  expect({ schemaJsonAdd: true }, FM_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  expect({ claimGhe: true }, FM_CODES.GHE_CLAIM_FORBIDDEN);
  expect({ cloudAgent: true }, FM_CODES.CLOUDAGENT_FORBIDDEN);
  expect({ massPrune: true }, FM_CODES.MASS_PRUNE_FORBIDDEN);
  expect({ forceDelete: true }, FM_CODES.HARD_DELETE_FORBIDDEN);
  expect({ networkWrite: true }, FM_CODES.NETWORK_WRITE_FORBIDDEN);
  expect({ liveHttpEgress: true }, FM_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);
  expect({ wallClockAuthority: true }, FM_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);
  expect({ autoSeal: true }, FM_CODES.AUTO_SEAL_FORBIDDEN);
  expect({ ritualMode: 'BOGUS' }, FM_CODES.INVALID_RITUAL_MODE);
  assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
  assert.equal(claimsGhe('GHE enforced'), true);
  assert.equal(claimsCloudAgent('CloudAgent fleet'), true);
  assert.equal(claimsMassPrune('mass prune'), true);
  assert.equal(claimsHardDelete('rm -rf'), true);
});

test('FM15: elevating a satellite as the seam port is refused', () => {
  const gate = new Ladder41SeamPolicyGate();
  for (const flag of ['fiAsSeam', 'fjAsSeam', 'fkAsSeam', 'flAsSeam']) {
    const res = gate.evaluatePreconditions(plan({ [flag]: true }));
    assert.equal(res.ok, false, flag);
    assert.equal(res.code, FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN, flag);
  }
  const prose = gate.evaluatePreconditions(plan({ note: 'make fl the seam port' }));
  assert.equal(prose.code, FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN);
  assert.equal(claimsSatelliteAsSeam('make fk the seam port'), true);
});

test('FM16: HOLD mode is a no-op with zero mutation and no PASS', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();
  const res = await port.seam(plan({ ritualMode: 'HOLD' }));
  assert.equal(res.decision, 'HOLD');
  assert.equal(res.code, FM_CODES.HOLD);
  assert.equal(res.receipt.decision, 'HOLD');
  assert.equal(res.receipt.chainObserve.prefixes.length, 0);
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.notEqual(res.decision, 'PASS');
  assert.equal(port.verifyTrail().ok, true);
});

test('FM17: DENY is fail-closed, the chain stays verifiable and tampering is detected', async () => {
  _resetReceiptSeqForTests();
  const port = new Ladder41SeamPort();

  const denied = await port.seam(plan({ tipSealInProduct: true }));
  assert.equal(denied.ok, false);
  assert.equal(denied.decision, 'DENY');
  assert.equal(denied.code, FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN);

  const passed = await port.seam(plan());
  assert.equal(passed.decision, 'PASS');

  const trail = port.verifyTrail();
  assert.equal(trail.ok, true, trail.error);
  assert.equal(trail.verifiedCount, 2);
  assert.equal(port.trail[1].prevReceiptHash, port.trail[0].receiptHash);

  // receipts are frozen: tamper by replacing the trail entry with a mutated copy
  port.trail[0] = { ...port.trail[0], decision: 'PASS' };
  const tampered = port.verifyTrail();
  assert.equal(tampered.ok, false);
  assert.match(tampered.error, /Invalid receipt at 0/);
  void FM_PORT_KIND;
});
