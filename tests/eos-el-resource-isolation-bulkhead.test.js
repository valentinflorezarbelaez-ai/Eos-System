/**
 * Mission EL — Resource Isolation / Bulkhead Boundary Port Test Suite.
 * SPEC-0148 / ADR-0127.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 72697dd5 (do NOT rewrite tip pins)
 * - PASS/ISOLATE = sealed bulkhead/isolation ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live threads ≠ real process isolation ≠ EJ quota ≠ EK shed ≠ DX trip
 * - NEVER reopen L30–L35; refuse L36 auto-close (EM–EN pending)
 * - Hermetic injected observedOccupancy / crossBulkheadTouch only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EL_PRODUCTION_READY,
  EL_RECEIPT_PRODUCTION_READY,
  EL_RECEIPT_KIND,
  EL_FREEZE_PIN_SHORT,
  EL_OPERATION,
  buildResourceIsolationBulkheadReceipt,
  verifyResourceIsolationBulkheadReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/resource-isolation-bulkhead-receipt.js';

import {
  ResourceIsolationBulkheadPolicyGate,
  EL_CODES,
  EL_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveThread,
  claimsRealProcessIsolation,
  isFundacionTarget
} from '../src/core/composition/resource-isolation-bulkhead-policy-gate.js';

import {
  ResourceIsolationBulkheadPort,
  EL_PORT_PRODUCTION_READY,
  EL_PORT_KIND
} from '../src/core/composition/resource-isolation-bulkhead-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBulkhead(overrides = {}) {
  return {
    bulkheadId: 'bulkhead-el-001',
    poolId: 'pool-saga-worker',
    capacity: 80,
    observedOccupancy: 40,
    ...overrides
  };
}

describe('Mission EL — Resource Isolation Bulkhead Receipt (SPEC-0148)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EL1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 72697dd5', () => {
    assert.equal(EL_PRODUCTION_READY, 'NO');
    assert.equal(EL_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EL_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EL_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EL_FREEZE_PIN_SHORT, '72697dd5');
  });

  it('EL2: builds canonical nine-field sealed EL-RCPT-* with freeze soft-observe + ceiling hold + bulkhead hold', () => {
    const receipt = buildResourceIsolationBulkheadReceipt({
      planId: 'plan-el-01',
      changeId: 'eos-ladder-36-mission-el',
      decision: 'PASS',
      bulkhead: makeMockBulkhead()
    });

    assert.equal(receipt.kind, EL_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EL-RCPT-'));
    assert.equal(receipt.operation, EL_OPERATION);
    assert.equal(receipt.operation, 'RESOURCE_ISOLATION_BULKHEAD_BOUNDARY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '72697dd5');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l35ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveThreadRefused, true);
    assert.equal(receipt.freezeObserve.realProcessIsolationRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.bulkheadHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.bulkheadHold.failClosed, true);
    assert.equal(receipt.bulkheadHold.liveThreadRefused, true);
    assert.equal(receipt.bulkheadHold.realProcessIsolationRefused, true);
    assert.equal(receipt.bulkheadHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.bulkheadHold.distinctFromEjAdmissionQuota, true);
    assert.equal(receipt.bulkheadHold.distinctFromEkLoadShed, true);
    assert.equal(receipt.bulkheadHold.distinctFromDxCircuitBreaker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.bulkheadDigest, 'string');
    assert.equal(receipt.bulkheadDigest.length, 64);
  });

  it('EL3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildResourceIsolationBulkheadReceipt({
      planId: 'plan-el-tamper',
      changeId: 'eos-ladder-36-mission-el',
      decision: 'PASS'
    });

    assert.equal(verifyResourceIsolationBulkheadReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyResourceIsolationBulkheadReceipt(tampered).ok, false);
  });
});

describe('Mission EL — Resource Isolation Bulkhead Policy Gate (SPEC-0148)', () => {
  it('EL4: validates well-formed plan (planId+changeId+ACTIVE+bulkhead bulkheadId/poolId)', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();
    const bulkhead = makeMockBulkhead();

    const res = gate.evaluatePreconditions({
      planId: 'plan-el-valid',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      bulkhead
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EL_CODES.OK);
  });

  it('EL5: rejects missing bulkhead or invalid bulkhead', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-el-nobulkhead',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EL_CODES.MISSING_BULKHEAD);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-el-invalidbulkhead',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EL_CODES.INVALID_BULKHEAD);
  });

  it('EL6: rejects missing bulkheadId / poolId', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-el-noid',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ bulkheadId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EL_CODES.MISSING_BULKHEAD_ID);

    const resPool = gate.evaluatePreconditions({
      planId: 'plan-el-nopool',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ poolId: '   ' })
    });
    assert.equal(resPool.ok, false);
    assert.equal(resPool.code, EL_CODES.MISSING_POOL_ID);
  });

  it('EL7: DENY invalid capacity + live thread claims', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const badCap = gate.evaluatePreconditions({
      planId: 'plan-el-badcap',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ capacity: 0 })
    });
    assert.equal(badCap.ok, false);
    assert.equal(badCap.decision, 'DENY');
    assert.equal(badCap.code, EL_CODES.INVALID_CAPACITY);

    const badOcc = gate.evaluatePreconditions({
      planId: 'plan-el-badocc',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ observedOccupancy: -1 })
    });
    assert.equal(badOcc.ok, false);
    assert.equal(badOcc.code, EL_CODES.INVALID_OBSERVED_OCCUPANCY);

    const live = gate.evaluatePreconditions({
      planId: 'plan-el-livethread',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      liveThread: true,
      bulkhead: makeMockBulkhead()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EL_CODES.LIVE_THREAD_FORBIDDEN);
  });

  it('EL8: rejects live thread / real process isolation claim strings and schema-json add', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const threadClaim = gate.evaluatePreconditions({
      planId: 'plan-el-threadclaim',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live thread execution',
      bulkhead: makeMockBulkhead()
    });
    assert.equal(threadClaim.ok, false);
    assert.equal(threadClaim.code, EL_CODES.LIVE_THREAD_FORBIDDEN);

    const procClaim = gate.evaluatePreconditions({
      planId: 'plan-el-procclaim',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live process isolation binding',
      bulkhead: makeMockBulkhead()
    });
    assert.equal(procClaim.ok, false);
    assert.equal(procClaim.code, EL_CODES.REAL_PROCESS_ISOLATION_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-el-schema',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-bulkhead-isolation.json',
      bulkhead: makeMockBulkhead()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EL_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveThread('claiming live thread'), true);
    assert.equal(claimsRealProcessIsolation('claiming real process isolation'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EL9: allows HOLD mode with zero mutations', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-el-hold',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EL_CODES.HOLD);
  });

  it('EL10: ISOLATE (CROSS_BULKHEAD_BREACH / OCCUPANCY_EXCEEDED) when hermetic isolation violated', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const cross = gate.evaluatePreconditions({
      planId: 'plan-el-cross',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ crossBulkheadTouch: true })
    });
    assert.equal(cross.ok, false);
    assert.equal(cross.decision, 'ISOLATE');
    assert.equal(cross.code, EL_CODES.CROSS_BULKHEAD_BREACH);

    const overOcc = gate.evaluatePreconditions({
      planId: 'plan-el-over-occ',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ capacity: 80, observedOccupancy: 80 })
    });
    assert.equal(overOcc.ok, false);
    assert.equal(overOcc.decision, 'ISOLATE');
    assert.equal(overOcc.code, EL_CODES.OCCUPANCY_EXCEEDED);

    const overHard = gate.evaluatePreconditions({
      planId: 'plan-el-over-hard',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ capacity: 50, observedOccupancy: 99 })
    });
    assert.equal(overHard.ok, false);
    assert.equal(overHard.decision, 'ISOLATE');
    assert.equal(overHard.code, EL_CODES.OCCUPANCY_EXCEEDED);
  });

  it('EL11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-el-del1',
      changeId: 'eos-ladder-36-mission-el',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EL_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-el-del2',
      changeId: 'eos-ladder-36-mission-el',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EL_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EL12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-el-secret',
      changeId: 'eos-ladder-36-mission-el',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EL_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EL13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-el-fundacion',
      changeId: 'eos-ladder-36-mission-el',
      target: 'Documents/Fundacion/bulkhead'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EL_CODES.FUNDACION_DENIED);
  });

  it('EL14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L35 reopen, L36 auto-close, mass prune, GHE', () => {
    const gate = new ResourceIsolationBulkheadPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-el-pr',
      changeId: 'eos-ladder-36-mission-el',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EL_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-el-l30',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EL_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-el-l31',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EL_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-el-l32',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EL_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-el-l33',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EL_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-el-l34',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EL_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-el-l35',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EL_CODES.L35_REOPEN_FORBIDDEN);

    const l36CloseRes = gate.evaluatePreconditions({
      planId: 'plan-el-l36-close',
      changeId: 'eos-ladder-36-mission-el',
      instruction: 'auto-close ladder-36 now'
    });
    assert.equal(l36CloseRes.ok, false);
    assert.equal(l36CloseRes.code, EL_CODES.L36_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-el-tip',
      changeId: 'eos-ladder-36-mission-el',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EL_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-el-mass',
      changeId: 'eos-ladder-36-mission-el',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EL_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-el-ghe',
      changeId: 'eos-ladder-36-mission-el',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EL_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EL — Resource Isolation Bulkhead Port (SPEC-0148)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EL15: govern happy path ACTIVE + bulkhead under capacity -> PASS + EL-RCPT-* (≠ EJ quota ≠ EK shed ≠ tip-refresh)', async () => {
    const port = new ResourceIsolationBulkheadPort();
    const bulkhead = makeMockBulkhead({ observedOccupancy: 40, capacity: 80 });

    const res = await port.govern({
      planId: 'plan-el-pass',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EL-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.bulkhead.passed, true);
    assert.equal(res.receipt.bulkhead.isolated, false);
    assert.equal(res.receipt.bulkhead.status, 'PASSED');
    assert.equal(res.receipt.bulkheadHold.liveThreadRefused, true);
    assert.equal(res.receipt.bulkheadHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.bulkheadHold.distinctFromEjAdmissionQuota, true);
    assert.equal(res.receipt.bulkheadHold.distinctFromEkLoadShed, true);
    assert.equal(res.receipt.bulkheadHold.distinctFromDxCircuitBreaker, true);
    assert.equal(res.receipt.freezeObserve.liveThreadRefused, true);
    assert.equal(res.receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '72697dd5');
    assert.equal(typeof res.receipt.bulkheadDigest, 'string');
    assert.equal(res.receipt.bulkheadDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EL_PORT_KIND, 'eos-resource-isolation-bulkhead-port');
  });

  it('EL16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ResourceIsolationBulkheadPort();

    const res = await port.govern({
      planId: 'plan-el-hold',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EL17: verifyTrail + CROSS_BULKHEAD_BREACH isolate + live-thread deny + auto-seal refuse', async () => {
    const port = new ResourceIsolationBulkheadPort();

    await port.govern({
      planId: 'plan-el-trail-01',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead()
    });

    await port.govern({
      planId: 'plan-el-trail-02',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(
      brokenTrail.error.includes('receiptHash mismatch') ||
        brokenTrail.error.includes('Invalid receipt')
    );

    const isolatePort = new ResourceIsolationBulkheadPort();
    const isolateRes = await isolatePort.govern({
      planId: 'plan-el-cross-isolate',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ crossBulkheadTouch: true })
    });
    assert.equal(isolateRes.ok, false);
    assert.equal(isolateRes.decision, 'ISOLATE');
    assert.equal(isolateRes.code, EL_CODES.CROSS_BULKHEAD_BREACH);
    assert.ok(isolateRes.receipt.receiptId.startsWith('EL-RCPT-'));
    assert.equal(isolateRes.receipt.decision, 'ISOLATE');
    assert.equal(isolateRes.receipt.bulkhead.status, 'ISOLATED');
    assert.equal(isolateRes.receipt.bulkhead.isolated, true);
    assert.equal(isolateRes.receipt.bulkheadHold.failClosed, true);

    const occRes = await isolatePort.govern({
      planId: 'plan-el-occ-isolate',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      bulkhead: makeMockBulkhead({ capacity: 50, observedOccupancy: 50 })
    });
    assert.equal(occRes.ok, false);
    assert.equal(occRes.decision, 'ISOLATE');
    assert.equal(occRes.code, EL_CODES.OCCUPANCY_EXCEEDED);

    const liveDeny = await isolatePort.govern({
      planId: 'plan-el-live-deny',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      instruction: 'bind live thread with live thread',
      bulkhead: makeMockBulkhead()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EL_CODES.LIVE_THREAD_FORBIDDEN);
    assert.ok(liveDeny.receipt.receiptId.startsWith('EL-RCPT-'));

    const autoSealRes = await isolatePort.govern({
      planId: 'plan-el-autoseal',
      changeId: 'eos-ladder-36-mission-el',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      bulkhead: makeMockBulkhead()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EL_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
