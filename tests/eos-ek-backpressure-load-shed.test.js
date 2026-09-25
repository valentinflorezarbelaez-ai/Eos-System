/**
 * Mission EK — Backpressure & Load-Shed Governance Port Test Suite.
 * SPEC-0147 / ADR-0126.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 5e5af281 (do NOT rewrite tip pins)
 * - PASS/SHED = sealed backpressure/load-shed ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live timers ≠ network shedding ≠ EJ quota ≠ DX circuit-breaker trip
 * - NEVER reopen L30–L35; refuse L36 auto-close (EL–EN pending)
 * - Hermetic injected observedPressure only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EK_PRODUCTION_READY,
  EK_RECEIPT_PRODUCTION_READY,
  EK_RECEIPT_KIND,
  EK_FREEZE_PIN_SHORT,
  EK_OPERATION,
  buildBackpressureLoadShedReceipt,
  verifyBackpressureLoadShedReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/backpressure-load-shed-receipt.js';

import {
  BackpressureLoadShedPolicyGate,
  EK_CODES,
  EK_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveTimer,
  claimsNetworkShedding,
  isFundacionTarget
} from '../src/core/composition/backpressure-load-shed-policy-gate.js';

import {
  BackpressureLoadShedPort,
  EK_PORT_PRODUCTION_READY,
  EK_PORT_KIND
} from '../src/core/composition/backpressure-load-shed-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockLoad(overrides = {}) {
  return {
    loadId: 'load-ek-001',
    resourceClass: 'saga-worker',
    pressureThreshold: 80,
    observedPressure: 40,
    ...overrides
  };
}

describe('Mission EK — Backpressure Load-Shed Receipt (SPEC-0147)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EK1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 5e5af281', () => {
    assert.equal(EK_PRODUCTION_READY, 'NO');
    assert.equal(EK_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EK_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EK_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EK_FREEZE_PIN_SHORT, '5e5af281');
  });

  it('EK2: builds canonical nine-field sealed EK-RCPT-* with freeze soft-observe + ceiling hold + loadShed hold', () => {
    const receipt = buildBackpressureLoadShedReceipt({
      planId: 'plan-ek-01',
      changeId: 'eos-ladder-36-mission-ek',
      decision: 'PASS',
      load: makeMockLoad()
    });

    assert.equal(receipt.kind, EK_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EK-RCPT-'));
    assert.equal(receipt.operation, EK_OPERATION);
    assert.equal(receipt.operation, 'BACKPRESSURE_LOAD_SHED_GOVERNANCE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '5e5af281');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l35ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveTimerRefused, true);
    assert.equal(receipt.freezeObserve.networkSheddingRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.loadShedHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.loadShedHold.failClosed, true);
    assert.equal(receipt.loadShedHold.liveTimerRefused, true);
    assert.equal(receipt.loadShedHold.networkSheddingRefused, true);
    assert.equal(receipt.loadShedHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.loadShedHold.distinctFromEjAdmissionQuota, true);
    assert.equal(receipt.loadShedHold.distinctFromDxCircuitBreaker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.loadDigest, 'string');
    assert.equal(receipt.loadDigest.length, 64);
  });

  it('EK3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildBackpressureLoadShedReceipt({
      planId: 'plan-ek-tamper',
      changeId: 'eos-ladder-36-mission-ek',
      decision: 'PASS'
    });

    assert.equal(verifyBackpressureLoadShedReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyBackpressureLoadShedReceipt(tampered).ok, false);
  });
});

describe('Mission EK — Backpressure Load-Shed Policy Gate (SPEC-0147)', () => {
  it('EK4: validates well-formed plan (planId+changeId+ACTIVE+load loadId/resourceClass)', () => {
    const gate = new BackpressureLoadShedPolicyGate();
    const load = makeMockLoad();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ek-valid',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      load
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EK_CODES.OK);
  });

  it('EK5: rejects missing load or invalid load', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ek-noload',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EK_CODES.MISSING_LOAD);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ek-invalidload',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EK_CODES.INVALID_LOAD);
  });

  it('EK6: rejects missing loadId / resourceClass', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ek-noid',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ loadId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EK_CODES.MISSING_LOAD_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ek-noclass',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ resourceClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EK_CODES.MISSING_RESOURCE_CLASS);
  });

  it('EK7: DENY invalid pressureThreshold + live timer claims', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const badThresh = gate.evaluatePreconditions({
      planId: 'plan-ek-badthresh',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ pressureThreshold: 0 })
    });
    assert.equal(badThresh.ok, false);
    assert.equal(badThresh.decision, 'DENY');
    assert.equal(badThresh.code, EK_CODES.INVALID_PRESSURE_THRESHOLD);

    const badObs = gate.evaluatePreconditions({
      planId: 'plan-ek-badobs',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ observedPressure: -1 })
    });
    assert.equal(badObs.ok, false);
    assert.equal(badObs.code, EK_CODES.INVALID_OBSERVED_PRESSURE);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ek-livetimer',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      liveTimer: true,
      load: makeMockLoad()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EK_CODES.LIVE_TIMER_FORBIDDEN);
  });

  it('EK8: rejects live timer / network shedding claim strings and schema-json add', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const timerClaim = gate.evaluatePreconditions({
      planId: 'plan-ek-timerclaim',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live timer execution',
      load: makeMockLoad()
    });
    assert.equal(timerClaim.ok, false);
    assert.equal(timerClaim.code, EK_CODES.LIVE_TIMER_FORBIDDEN);

    const shedClaim = gate.evaluatePreconditions({
      planId: 'plan-ek-shedclaim',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live network shedding binding',
      load: makeMockLoad()
    });
    assert.equal(shedClaim.ok, false);
    assert.equal(shedClaim.code, EK_CODES.NETWORK_SHEDDING_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ek-schema',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-backpressure-shed.json',
      load: makeMockLoad()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EK_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveTimer('claiming live timer'), true);
    assert.equal(claimsNetworkShedding('claiming network shedding'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EK9: allows HOLD mode with zero mutations', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ek-hold',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EK_CODES.HOLD);
  });

  it('EK10: SHED (PRESSURE_EXCEEDED) when hermetic observed pressure exceeds threshold', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const overPressure = gate.evaluatePreconditions({
      planId: 'plan-ek-over-pressure',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ pressureThreshold: 80, observedPressure: 80 })
    });
    assert.equal(overPressure.ok, false);
    assert.equal(overPressure.decision, 'SHED');
    assert.equal(overPressure.code, EK_CODES.PRESSURE_EXCEEDED);

    const overHard = gate.evaluatePreconditions({
      planId: 'plan-ek-over-hard',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ pressureThreshold: 50, observedPressure: 99 })
    });
    assert.equal(overHard.ok, false);
    assert.equal(overHard.decision, 'SHED');
    assert.equal(overHard.code, EK_CODES.PRESSURE_EXCEEDED);
  });

  it('EK11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ek-del1',
      changeId: 'eos-ladder-36-mission-ek',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EK_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ek-del2',
      changeId: 'eos-ladder-36-mission-ek',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EK_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EK12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new BackpressureLoadShedPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ek-secret',
      changeId: 'eos-ladder-36-mission-ek',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EK_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EK13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ek-fundacion',
      changeId: 'eos-ladder-36-mission-ek',
      target: 'Documents/Fundacion/backpressure'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EK_CODES.FUNDACION_DENIED);
  });

  it('EK14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L35 reopen, L36 auto-close, mass prune, GHE', () => {
    const gate = new BackpressureLoadShedPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ek-pr',
      changeId: 'eos-ladder-36-mission-ek',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EK_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l30',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EK_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l31',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EK_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l32',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EK_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l33',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EK_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l34',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EK_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-ek-l35',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EK_CODES.L35_REOPEN_FORBIDDEN);

    const l36CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ek-l36-close',
      changeId: 'eos-ladder-36-mission-ek',
      instruction: 'auto-close ladder-36 now'
    });
    assert.equal(l36CloseRes.ok, false);
    assert.equal(l36CloseRes.code, EK_CODES.L36_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ek-tip',
      changeId: 'eos-ladder-36-mission-ek',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EK_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ek-mass',
      changeId: 'eos-ladder-36-mission-ek',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EK_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ek-ghe',
      changeId: 'eos-ladder-36-mission-ek',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EK_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EK — Backpressure Load-Shed Port (SPEC-0147)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EK15: govern happy path ACTIVE + load under pressure -> PASS + EK-RCPT-* (≠ EJ quota ≠ DX trip ≠ tip-refresh)', async () => {
    const port = new BackpressureLoadShedPort();
    const load = makeMockLoad({ observedPressure: 40, pressureThreshold: 80 });

    const res = await port.govern({
      planId: 'plan-ek-pass',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EK-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.load.passed, true);
    assert.equal(res.receipt.load.shed, false);
    assert.equal(res.receipt.load.status, 'PASSED');
    assert.equal(res.receipt.loadShedHold.liveTimerRefused, true);
    assert.equal(res.receipt.loadShedHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.loadShedHold.distinctFromEjAdmissionQuota, true);
    assert.equal(res.receipt.loadShedHold.distinctFromDxCircuitBreaker, true);
    assert.equal(res.receipt.freezeObserve.liveTimerRefused, true);
    assert.equal(res.receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '5e5af281');
    assert.equal(typeof res.receipt.loadDigest, 'string');
    assert.equal(res.receipt.loadDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EK_PORT_KIND, 'eos-backpressure-load-shed-port');
  });

  it('EK16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new BackpressureLoadShedPort();

    const res = await port.govern({
      planId: 'plan-ek-hold',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EK17: verifyTrail + PRESSURE_EXCEEDED shed + live-timer deny + auto-seal refuse', async () => {
    const port = new BackpressureLoadShedPort();

    await port.govern({
      planId: 'plan-ek-trail-01',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad()
    });

    await port.govern({
      planId: 'plan-ek-trail-02',
      changeId: 'eos-ladder-36-mission-ek',
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

    const shedPort = new BackpressureLoadShedPort();
    const shedRes = await shedPort.govern({
      planId: 'plan-ek-pressure-shed',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      load: makeMockLoad({ pressureThreshold: 50, observedPressure: 50 })
    });
    assert.equal(shedRes.ok, false);
    assert.equal(shedRes.decision, 'SHED');
    assert.equal(shedRes.code, EK_CODES.PRESSURE_EXCEEDED);
    assert.ok(shedRes.receipt.receiptId.startsWith('EK-RCPT-'));
    assert.equal(shedRes.receipt.decision, 'SHED');
    assert.equal(shedRes.receipt.load.status, 'SHED');
    assert.equal(shedRes.receipt.load.shed, true);
    assert.equal(shedRes.receipt.loadShedHold.failClosed, true);

    const liveDeny = await shedPort.govern({
      planId: 'plan-ek-live-deny',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      instruction: 'bind live timer with live timer',
      load: makeMockLoad()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EK_CODES.LIVE_TIMER_FORBIDDEN);
    assert.ok(liveDeny.receipt.receiptId.startsWith('EK-RCPT-'));

    const autoSealRes = await shedPort.govern({
      planId: 'plan-ek-autoseal',
      changeId: 'eos-ladder-36-mission-ek',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      load: makeMockLoad()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EK_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
