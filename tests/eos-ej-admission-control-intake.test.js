/**
 * Mission EJ — Admission Control & Work-Intake Quotas Port Test Suite.
 * SPEC-0146 / ADR-0125.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin d7490fee (do NOT rewrite tip pins)
 * - PASS = sealed admission/quota ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live OS scheduler ≠ network rate limiter ≠ DX circuit-breaker trip
 * - NEVER reopen L30–L35; refuse L36 auto-close (EK–EN pending)
 * - Hermetic injected observedInflight/observedQueued only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EJ_PRODUCTION_READY,
  EJ_RECEIPT_PRODUCTION_READY,
  EJ_RECEIPT_KIND,
  EJ_FREEZE_PIN_SHORT,
  EJ_OPERATION,
  buildAdmissionControlIntakeReceipt,
  verifyAdmissionControlIntakeReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/admission-control-intake-receipt.js';

import {
  AdmissionControlIntakePolicyGate,
  EJ_CODES,
  EJ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveOsScheduler,
  claimsNetworkRateLimiter,
  isFundacionTarget
} from '../src/core/composition/admission-control-intake-policy-gate.js';

import {
  AdmissionControlIntakePort,
  EJ_PORT_PRODUCTION_READY,
  EJ_PORT_KIND
} from '../src/core/composition/admission-control-intake-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockIntake(overrides = {}) {
  return {
    intakeId: 'intake-ej-001',
    workClass: 'saga-step',
    maxConcurrent: 4,
    maxQueueDepth: 16,
    observedInflight: 1,
    observedQueued: 2,
    ...overrides
  };
}

describe('Mission EJ — Admission Control Intake Receipt (SPEC-0146)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EJ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin d7490fee', () => {
    assert.equal(EJ_PRODUCTION_READY, 'NO');
    assert.equal(EJ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EJ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EJ_FREEZE_PIN_SHORT, 'd7490fee');
  });

  it('EJ2: builds canonical nine-field sealed EJ-RCPT-* with freeze soft-observe + ceiling hold + admission hold', () => {
    const receipt = buildAdmissionControlIntakeReceipt({
      planId: 'plan-ej-01',
      changeId: 'eos-ladder-36-mission-ej',
      decision: 'PASS',
      intake: makeMockIntake()
    });

    assert.equal(receipt.kind, EJ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EJ-RCPT-'));
    assert.equal(receipt.operation, EJ_OPERATION);
    assert.equal(receipt.operation, 'ADMISSION_CONTROL_WORK_INTAKE_QUOTAS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'd7490fee');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l35ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveOsSchedulerRefused, true);
    assert.equal(receipt.freezeObserve.networkRateLimiterRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.admissionHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.admissionHold.failClosed, true);
    assert.equal(receipt.admissionHold.liveOsSchedulerRefused, true);
    assert.equal(receipt.admissionHold.networkRateLimiterRefused, true);
    assert.equal(receipt.admissionHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.admissionHold.distinctFromDxCircuitBreaker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.intakeDigest, 'string');
    assert.equal(receipt.intakeDigest.length, 64);
  });

  it('EJ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildAdmissionControlIntakeReceipt({
      planId: 'plan-ej-tamper',
      changeId: 'eos-ladder-36-mission-ej',
      decision: 'PASS'
    });

    assert.equal(verifyAdmissionControlIntakeReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyAdmissionControlIntakeReceipt(tampered).ok, false);
  });
});

describe('Mission EJ — Admission Control Intake Policy Gate (SPEC-0146)', () => {
  it('EJ4: validates well-formed plan (planId+changeId+ACTIVE+intake intakeId/workClass)', () => {
    const gate = new AdmissionControlIntakePolicyGate();
    const intake = makeMockIntake();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ej-valid',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      intake
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EJ_CODES.OK);
  });

  it('EJ5: rejects missing intake or invalid intake', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ej-nointake',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EJ_CODES.MISSING_INTAKE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ej-invalidintake',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EJ_CODES.INVALID_INTAKE);
  });

  it('EJ6: rejects missing intakeId / workClass', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ej-noid',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ intakeId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EJ_CODES.MISSING_INTAKE_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ej-noclass',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ workClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EJ_CODES.MISSING_WORK_CLASS);
  });

  it('EJ7: DENY invalid maxConcurrent/maxQueueDepth + live OS scheduler claims', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const badConc = gate.evaluatePreconditions({
      planId: 'plan-ej-badconc',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ maxConcurrent: 0 })
    });
    assert.equal(badConc.ok, false);
    assert.equal(badConc.decision, 'DENY');
    assert.equal(badConc.code, EJ_CODES.INVALID_MAX_CONCURRENT);

    const badQueue = gate.evaluatePreconditions({
      planId: 'plan-ej-badqueue',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ maxQueueDepth: -1 })
    });
    assert.equal(badQueue.ok, false);
    assert.equal(badQueue.code, EJ_CODES.INVALID_MAX_QUEUE_DEPTH);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ej-livesched',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      liveOsScheduler: true,
      intake: makeMockIntake()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EJ_CODES.LIVE_OS_SCHEDULER_FORBIDDEN);
  });

  it('EJ8: rejects live OS scheduler / network rate limiter claim strings and schema-json add', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const schedClaim = gate.evaluatePreconditions({
      planId: 'plan-ej-schedclaim',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live os scheduler execution',
      intake: makeMockIntake()
    });
    assert.equal(schedClaim.ok, false);
    assert.equal(schedClaim.code, EJ_CODES.LIVE_OS_SCHEDULER_FORBIDDEN);

    const rateClaim = gate.evaluatePreconditions({
      planId: 'plan-ej-rateclaim',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      instruction: 'claiming network rate-limiter binding',
      intake: makeMockIntake()
    });
    assert.equal(rateClaim.ok, false);
    assert.equal(rateClaim.code, EJ_CODES.NETWORK_RATE_LIMITER_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ej-schema',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-admission-quota.json',
      intake: makeMockIntake()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveOsScheduler('claiming live os scheduler'), true);
    assert.equal(claimsNetworkRateLimiter('claiming network rate-limiter'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EJ9: allows HOLD mode with zero mutations', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ej-hold',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EJ_CODES.HOLD);
  });

  it('EJ10: DENY (QUOTA_EXCEEDED) when hermetic observed load exceeds intake quota', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const overConcurrent = gate.evaluatePreconditions({
      planId: 'plan-ej-over-conc',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ maxConcurrent: 4, observedInflight: 4 })
    });
    assert.equal(overConcurrent.ok, false);
    assert.equal(overConcurrent.decision, 'DENY');
    assert.equal(overConcurrent.code, EJ_CODES.QUOTA_EXCEEDED);

    const overQueue = gate.evaluatePreconditions({
      planId: 'plan-ej-over-queue',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ maxQueueDepth: 8, observedQueued: 10 })
    });
    assert.equal(overQueue.ok, false);
    assert.equal(overQueue.decision, 'DENY');
    assert.equal(overQueue.code, EJ_CODES.QUOTA_EXCEEDED);
  });

  it('EJ11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ej-del1',
      changeId: 'eos-ladder-36-mission-ej',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EJ_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ej-del2',
      changeId: 'eos-ladder-36-mission-ej',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EJ_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EJ12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new AdmissionControlIntakePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ej-secret',
      changeId: 'eos-ladder-36-mission-ej',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EJ_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EJ13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ej-fundacion',
      changeId: 'eos-ladder-36-mission-ej',
      target: 'Documents/Fundacion/admission'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EJ_CODES.FUNDACION_DENIED);
  });

  it('EJ14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L35 reopen, L36 auto-close, mass prune, GHE', () => {
    const gate = new AdmissionControlIntakePolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ej-pr',
      changeId: 'eos-ladder-36-mission-ej',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l30',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EJ_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l31',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EJ_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l32',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EJ_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l33',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EJ_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l34',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EJ_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-ej-l35',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EJ_CODES.L35_REOPEN_FORBIDDEN);

    const l36CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ej-l36-close',
      changeId: 'eos-ladder-36-mission-ej',
      instruction: 'auto-close ladder-36 now'
    });
    assert.equal(l36CloseRes.ok, false);
    assert.equal(l36CloseRes.code, EJ_CODES.L36_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ej-tip',
      changeId: 'eos-ladder-36-mission-ej',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EJ_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ej-mass',
      changeId: 'eos-ladder-36-mission-ej',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EJ_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ej-ghe',
      changeId: 'eos-ladder-36-mission-ej',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EJ_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EJ — Admission Control Intake Port (SPEC-0146)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EJ15: govern happy path ACTIVE + intake under quota -> PASS + EJ-RCPT-* (≠ DX trip ≠ tip-refresh)', async () => {
    const port = new AdmissionControlIntakePort();
    const intake = makeMockIntake({ observedInflight: 1, maxConcurrent: 4 });

    const res = await port.govern({
      planId: 'plan-ej-pass',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EJ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.intake.admitted, true);
    assert.equal(res.receipt.intake.status, 'ADMITTED');
    assert.equal(res.receipt.admissionHold.liveOsSchedulerRefused, true);
    assert.equal(res.receipt.admissionHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.admissionHold.distinctFromDxCircuitBreaker, true);
    assert.equal(res.receipt.freezeObserve.liveOsSchedulerRefused, true);
    assert.equal(res.receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'd7490fee');
    assert.equal(typeof res.receipt.intakeDigest, 'string');
    assert.equal(res.receipt.intakeDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EJ_PORT_KIND, 'eos-admission-control-intake-port');
  });

  it('EJ16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new AdmissionControlIntakePort();

    const res = await port.govern({
      planId: 'plan-ej-hold',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EJ17: verifyTrail + QUOTA_EXCEEDED deny + live-scheduler deny + auto-seal refuse', async () => {
    const port = new AdmissionControlIntakePort();

    await port.govern({
      planId: 'plan-ej-trail-01',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake()
    });

    await port.govern({
      planId: 'plan-ej-trail-02',
      changeId: 'eos-ladder-36-mission-ej',
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

    const denyPort = new AdmissionControlIntakePort();
    const quotaRes = await denyPort.govern({
      planId: 'plan-ej-quota-deny',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      intake: makeMockIntake({ maxConcurrent: 2, observedInflight: 2 })
    });
    assert.equal(quotaRes.ok, false);
    assert.equal(quotaRes.decision, 'DENY');
    assert.equal(quotaRes.code, EJ_CODES.QUOTA_EXCEEDED);
    assert.ok(quotaRes.receipt.receiptId.startsWith('EJ-RCPT-'));
    assert.equal(quotaRes.receipt.decision, 'DENY');
    assert.equal(quotaRes.receipt.intake.status, 'QUOTA_EXCEEDED');
    assert.equal(quotaRes.receipt.admissionHold.failClosed, true);

    const liveDeny = await denyPort.govern({
      planId: 'plan-ej-live-deny',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      instruction: 'bind os scheduler with live os scheduler',
      intake: makeMockIntake()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EJ_CODES.LIVE_OS_SCHEDULER_FORBIDDEN);
    assert.ok(liveDeny.receipt.receiptId.startsWith('EJ-RCPT-'));

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ej-autoseal',
      changeId: 'eos-ladder-36-mission-ej',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      intake: makeMockIntake()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EJ_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
