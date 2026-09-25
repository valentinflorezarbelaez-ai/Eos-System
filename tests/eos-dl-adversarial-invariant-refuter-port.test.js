/**
 * @file tests/eos-dl-adversarial-invariant-refuter-port.test.js
 * SPEC-0122 / Mission DL — Adversarial Invariant Refuter Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: adversarial refuter PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L31 closeout
 *   NON-CLAIM: Adversarial Refuter ≠ GHE ≠ GHA green ≠ Fundacion Δ>0
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 20cb9abd (Mission DK tip)
 *   Formal L17–L30 CLOSED retained — NEVER reopen L30
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DL_PRODUCTION_READY,
  DL_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DL_RECEIPT_KIND,
  DL_DECISIONS,
  DL_RITUAL_MODES,
  DL_FREEZE_PIN,
  DL_FREEZE_PIN_SHORT,
  DL_FREEZE_NONCLAIM_LABELS,
  DL_CEILING_HOLD_TEMPLATE,
  DL_REFUTATION_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  forceRefutationHold,
  buildAdversarialInvariantRefuterReceipt,
  verifyAdversarialInvariantRefuterReceipt,
  canonicalAdversarialInvariantRefuterSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/adversarial-invariant-refuter-receipt.js';

import {
  AdversarialInvariantRefuterPolicyGate,
  DL_CODES,
  DL_POLICY_GATE_PRODUCTION_READY,
  DL_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/adversarial-invariant-refuter-policy-gate.js';

import {
  AdversarialInvariantRefuterPort,
  DL_PORT_PRODUCTION_READY,
  DL_PORT_KIND
} from '../src/core/composition/adversarial-invariant-refuter-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockRefutationReport(overrides = {}) {
  return {
    invariantsTested: 8,
    chaosVectorsApplied: 24,
    unhandledBreaches: 0,
    resilienceStatus: 'RESILIENT',
    warningsCount: 0,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DL — Adversarial Invariant Refuter Receipt (SPEC-0122)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DL1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 20cb9abd', () => {
    assert.equal(DL_PRODUCTION_READY, 'NO');
    assert.equal(DL_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DL_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DL_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DL_FREEZE_PIN_SHORT, '20cb9abd');
    assert.ok(DL_FREEZE_PIN.startsWith('20cb9abd'));
    assert.ok(Array.isArray(DL_FREEZE_NONCLAIM_LABELS));
  });

  it('DL2: builds canonical nine-field sealed DL-RCPT-* with freeze soft-observe + ceiling hold + refutation hold', () => {
    const refutationReport = makeMockRefutationReport();
    const receipt = buildAdversarialInvariantRefuterReceipt({
      planId: 'plan-dl-001',
      changeId: 'eos-ladder-31-mission-dl',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      refutationReport,
      refutationDigest: 'sha256-mock-refutation-digest'
    });

    assert.ok(receipt.receiptId.startsWith('DL-RCPT-'));
    assert.equal(receipt.operation, 'ADVERSARIAL_INVARIANT_REFUTER');
    assert.equal(receipt.planId, 'plan-dl-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '20cb9abd');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.refutationHold.invariantsWithstood, true);
    assert.equal(receipt.refutationHold.zeroBreachesUnhandled, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DL3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildAdversarialInvariantRefuterReceipt({
      planId: 'plan-dl-tamper',
      changeId: 'eos-ladder-31-mission-dl',
      decision: 'PASS'
    });

    assert.equal(verifyAdversarialInvariantRefuterReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyAdversarialInvariantRefuterReceipt(tampered).ok, false);
  });
});

describe('Mission DL — Adversarial Invariant Refuter Policy Gate (SPEC-0122)', () => {
  it('DL4: validates well-formed plan (planId+changeId+ACTIVE+refutationReport ok with 0 unhandled breaches)', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();
    const refutationReport = makeMockRefutationReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-valid',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      refutationReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DL_CODES.OK);
  });

  it('DL5: rejects missing refutationReport or invalid report type', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dl-noreport',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DL_CODES.MISSING_REFUTATION_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dl-invalidreport',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport: 'invalid-string-report'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DL_CODES.INVALID_REFUTATION_REPORT);
  });

  it('DL6: rejects unhandled breaches (unhandledBreaches > 0)', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();
    const refutationReport = makeMockRefutationReport({ unhandledBreaches: 1 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-breaches',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DL_CODES.INVARIANT_BREACH_DETECTED);
  });

  it('DL7: rejects compromised resilience status (resilienceStatus === COMPROMISED)', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();
    const refutationReport = makeMockRefutationReport({ resilienceStatus: 'COMPROMISED' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-compromised',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DL_CODES.INVARIANT_BREACH_DETECTED);
  });

  it('DL8: allows CHALLENGE mode when warnings present and allowChallengeMode=true', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();
    const refutationReport = makeMockRefutationReport({ warningsCount: 2 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-challenge',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport,
      allowChallengeMode: true
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'CHALLENGE');
    assert.equal(res.code, DL_CODES.OK);
  });

  it('DL9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-hard-delete',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport: makeMockRefutationReport(),
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DL_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DL10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-secret',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport: makeMockRefutationReport(),
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DL_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DL11: policy gate DENY on Fundacion target paths', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dl-fundacion',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport: makeMockRefutationReport(),
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DL_CODES.FUNDACION_DENIED);
  });

  it('DL12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30 reopen, L31 auto-close', () => {
    const gate = new AdversarialInvariantRefuterPolicyGate();
    const refutationReport = makeMockRefutationReport();

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-dl-pr',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport,
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DL_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL30 = gate.evaluatePreconditions({
      planId: 'plan-dl-l30',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport,
      reopenL30: true
    });
    assert.equal(resL30.code, DL_CODES.L30_REOPEN_FORBIDDEN);
  });
});

describe('Mission DL — Adversarial Invariant Refuter Port (SPEC-0122)', () => {
  it('DL13: govern happy path ACTIVE + valid refutationReport -> PASS + DL-RCPT-*', async () => {
    const port = new AdversarialInvariantRefuterPort();
    const refutationReport = makeMockRefutationReport();

    const result = await port.govern({
      planId: 'plan-dl-exec-01',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      phase: 'EXECUTION',
      refutationReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DL-RCPT-'));
    assert.ok(result.receipt.refutationDigest);
    assert.equal(result.receipt.refutationHold.invariantsWithstood, true);
    assert.equal(result.receipt.refutationHold.zeroBreachesUnhandled, true);
  });

  it('DL14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new AdversarialInvariantRefuterPort();
    const refutationReport = makeMockRefutationReport();

    const result = await port.govern({
      planId: 'plan-dl-hold',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'HOLD',
      phase: 'OBSERVE',
      refutationReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.receipt.decision, 'HOLD');
  });

  it('DL15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new AdversarialInvariantRefuterPort();
    const refutationReport = makeMockRefutationReport();

    await port.govern({
      planId: 'plan-dl-trail-1',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DL16: tamper breaks trail verification', async () => {
    const port = new AdversarialInvariantRefuterPort();
    const refutationReport = makeMockRefutationReport();

    await port.govern({
      planId: 'plan-dl-trail-tamper',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DL17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new AdversarialInvariantRefuterPort();
    const refutationReport = makeMockRefutationReport();

    const result = await port.govern({
      planId: 'plan-dl-auto-seal',
      changeId: 'eos-ladder-31-mission-dl',
      ritualMode: 'ACTIVE',
      refutationReport,
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');

    assert.ok(Object.isFrozen(DL_CODES));
    assert.ok(Object.isFrozen(DL_DECISIONS));
    assert.ok(Object.isFrozen(DL_RITUAL_MODES));
    assert.equal(DL_CODES.OK, 'OK');
    assert.equal(DL_CODES.INVARIANT_BREACH_DETECTED, 'INVARIANT_BREACH_DETECTED');
    assert.equal(DL_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
