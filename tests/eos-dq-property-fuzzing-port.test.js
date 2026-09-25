/**
 * Mission DQ — Autonomous Property-Based Generative Fuzzing Port Test Suite.
 * SPEC-0127 / ADR-0102.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin fc9a0c20
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DQ_PRODUCTION_READY,
  DQ_RECEIPT_PRODUCTION_READY,
  DQ_RECEIPT_KIND,
  DQ_FREEZE_PIN_SHORT,
  buildPropertyFuzzingReceipt,
  verifyPropertyFuzzingReceipt,
  canonicalPropertyFuzzingSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/property-fuzzing-receipt.js';

import {
  PropertyFuzzingPolicyGate,
  DQ_CODES,
  DQ_POLICY_GATE_PRODUCTION_READY,
  DQ_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/property-fuzzing-policy-gate.js';

import {
  PropertyFuzzingPort,
  DQ_PORT_PRODUCTION_READY,
  DQ_PORT_KIND
} from '../src/core/composition/property-fuzzing-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockFuzzReport(overrides = {}) {
  return {
    propertiesTested: 12,
    iterationsCount: 200,
    counterexamplesCount: 0,
    counterexamples: [],
    propertyStatus: 'VERIFIED',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DQ — Property Fuzzing Receipt (SPEC-0127)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DQ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin fc9a0c20', () => {
    assert.equal(DQ_PRODUCTION_READY, 'NO');
    assert.equal(DQ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DQ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DQ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DQ_FREEZE_PIN_SHORT, 'fc9a0c20');
  });

  it('DQ2: builds canonical nine-field sealed DQ-RCPT-* with freeze soft-observe + ceiling hold + fuzz hold', () => {
    const receipt = buildPropertyFuzzingReceipt({
      planId: 'plan-dq-01',
      changeId: 'eos-ladder-32-mission-dq',
      decision: 'PASS',
      fuzzReport: makeMockFuzzReport()
    });

    assert.equal(receipt.kind, DQ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DQ-RCPT-'));
    assert.equal(receipt.operation, 'PROPERTY_BASED_GENERATIVE_FUZZING');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'fc9a0c20');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.fuzzHold.propertyInvariantsGrounded, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DQ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildPropertyFuzzingReceipt({
      planId: 'plan-dq-tamper',
      changeId: 'eos-ladder-32-mission-dq',
      decision: 'PASS'
    });

    assert.equal(verifyPropertyFuzzingReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyPropertyFuzzingReceipt(tampered).ok, false);
  });
});

describe('Mission DQ — Property Fuzzing Policy Gate (SPEC-0127)', () => {
  it('DQ4: validates well-formed plan (planId+changeId+ACTIVE+fuzzReport ok with 0 counterexamples)', () => {
    const gate = new PropertyFuzzingPolicyGate();
    const fuzzReport = makeMockFuzzReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dq-valid',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      fuzzReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DQ_CODES.OK);
  });

  it('DQ5: rejects missing fuzzReport or invalid report type', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dq-noreport',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DQ_CODES.MISSING_FUZZ_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dq-invalidreport',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DQ_CODES.INVALID_FUZZ_REPORT);
  });

  it('DQ6: rejects counterexamples (counterexamplesCount > 0 or counterexamples array not empty)', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const resCount = gate.evaluatePreconditions({
      planId: 'plan-dq-counterexample-count',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: makeMockFuzzReport({ counterexamplesCount: 1 })
    });
    assert.equal(resCount.ok, false);
    assert.equal(resCount.decision, 'DENY');
    assert.equal(resCount.code, DQ_CODES.COUNTEREXAMPLE_DETECTED);

    const resArray = gate.evaluatePreconditions({
      planId: 'plan-dq-counterexample-array',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: makeMockFuzzReport({
        counterexamples: [{ input: -1, expected: 'positive', actual: 'negative' }]
      })
    });
    assert.equal(resArray.ok, false);
    assert.equal(resArray.decision, 'DENY');
    assert.equal(resArray.code, DQ_CODES.COUNTEREXAMPLE_DETECTED);
  });

  it('DQ7: rejects insufficient fuzz iterations (iterationsCount < 50)', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dq-low-iterations',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: makeMockFuzzReport({ iterationsCount: 20 })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DQ_CODES.INSUFFICIENT_FUZZ_ITERATIONS);
  });

  it('DQ8: allows HOLD mode with zero mutations', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dq-hold',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DQ_CODES.HOLD);
  });

  it('DQ9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dq-del1',
      changeId: 'eos-ladder-32-mission-dq',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DQ_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dq-del2',
      changeId: 'eos-ladder-32-mission-dq',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DQ_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DQ10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new PropertyFuzzingPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dq-secret',
      changeId: 'eos-ladder-32-mission-dq',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DQ_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DQ11: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dq-fundacion',
      changeId: 'eos-ladder-32-mission-dq',
      target: 'Documents/Fundacion/contracts'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DQ_CODES.FUNDACION_DENIED);
  });

  it('DQ12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31 reopen, L32 auto-close', () => {
    const gate = new PropertyFuzzingPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dq-pr',
      changeId: 'eos-ladder-32-mission-dq',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DQ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dq-l30',
      changeId: 'eos-ladder-32-mission-dq',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DQ_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dq-l31',
      changeId: 'eos-ladder-32-mission-dq',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DQ_CODES.L31_REOPEN_FORBIDDEN);

    const l32CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dq-l32-close',
      changeId: 'eos-ladder-32-mission-dq',
      instruction: 'auto-close ladder-32 now'
    });
    assert.equal(l32CloseRes.ok, false);
    assert.equal(l32CloseRes.code, DQ_CODES.L32_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dq-tip',
      changeId: 'eos-ladder-32-mission-dq',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DQ_CODES.TIP_REWRITE_FORBIDDEN);
  });
});

describe('Mission DQ — Property Fuzzing Port (SPEC-0127)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DQ13: govern happy path ACTIVE + valid fuzzReport -> PASS + DQ-RCPT-*', async () => {
    const port = new PropertyFuzzingPort();
    const fuzzReport = makeMockFuzzReport();

    const res = await port.govern({
      planId: 'plan-dq-pass',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      phase: 'INVARIANT_VERIFY',
      fuzzReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DQ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
  });

  it('DQ14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new PropertyFuzzingPort();

    const res = await port.govern({
      planId: 'plan-dq-hold',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DQ15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new PropertyFuzzingPort();

    await port.govern({
      planId: 'plan-dq-trail-01',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: makeMockFuzzReport()
    });

    await port.govern({
      planId: 'plan-dq-trail-02',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);
  });

  it('DQ16: tamper breaks trail verification', async () => {
    const port = new PropertyFuzzingPort();

    await port.govern({
      planId: 'plan-dq-trail-01',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      fuzzReport: makeMockFuzzReport()
    });

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, false);
    assert.ok(trailRes.error.includes('receiptHash mismatch'));
  });

  it('DQ17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new PropertyFuzzingPort();

    const res = await port.govern({
      planId: 'plan-dq-autoseal',
      changeId: 'eos-ladder-32-mission-dq',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      fuzzReport: makeMockFuzzReport()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DQ_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
