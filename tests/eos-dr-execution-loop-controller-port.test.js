/**
 * Mission DR — Deterministic Autonomous Execution Loop Controller Port Test Suite.
 * SPEC-0128 / ADR-0103.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 898aa96a
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DR_PRODUCTION_READY,
  DR_RECEIPT_PRODUCTION_READY,
  DR_RECEIPT_KIND,
  DR_FREEZE_PIN_SHORT,
  VALID_LIFECYCLE_STATES,
  buildExecutionLoopControllerReceipt,
  verifyExecutionLoopControllerReceipt,
  canonicalExecutionLoopControllerSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/execution-loop-controller-receipt.js';

import {
  ExecutionLoopControllerPolicyGate,
  DR_CODES,
  DR_POLICY_GATE_PRODUCTION_READY,
  DR_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/execution-loop-controller-policy-gate.js';

import {
  ExecutionLoopControllerPort,
  DR_PORT_PRODUCTION_READY,
  DR_PORT_KIND
} from '../src/core/composition/execution-loop-controller-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockLoopReport(overrides = {}) {
  return {
    loopIteration: 1,
    fromState: 'INTAKE',
    toState: 'SPEC_APPROVAL',
    allChecksPassed: true,
    executionLog: ['intake completed', 'transitioning to spec approval'],
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DR — Execution Loop Controller Receipt (SPEC-0128)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DR1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 898aa96a', () => {
    assert.equal(DR_PRODUCTION_READY, 'NO');
    assert.equal(DR_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DR_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DR_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DR_FREEZE_PIN_SHORT, '898aa96a');
  });

  it('DR2: builds canonical nine-field sealed DR-RCPT-* with freeze soft-observe + ceiling hold + loop hold', () => {
    const receipt = buildExecutionLoopControllerReceipt({
      planId: 'plan-dr-01',
      changeId: 'eos-ladder-32-mission-dr',
      decision: 'PASS',
      loopReport: makeMockLoopReport()
    });

    assert.equal(receipt.kind, DR_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DR-RCPT-'));
    assert.equal(receipt.operation, 'DETERMINISTIC_EXECUTION_LOOP_CONTROLLER');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '898aa96a');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.loopHold.stateTransitionsDeterministic, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DR3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildExecutionLoopControllerReceipt({
      planId: 'plan-dr-tamper',
      changeId: 'eos-ladder-32-mission-dr',
      decision: 'PASS'
    });

    assert.equal(verifyExecutionLoopControllerReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyExecutionLoopControllerReceipt(tampered).ok, false);
  });
});

describe('Mission DR — Execution Loop Controller Policy Gate (SPEC-0128)', () => {
  it('DR4: validates well-formed plan (planId+changeId+ACTIVE+loopReport with valid transition)', () => {
    const gate = new ExecutionLoopControllerPolicyGate();
    const loopReport = makeMockLoopReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-valid',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      loopReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DR_CODES.OK);
  });

  it('DR5: rejects missing loopReport or invalid report type', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dr-noreport',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DR_CODES.MISSING_LOOP_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dr-invalidreport',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DR_CODES.INVALID_LOOP_REPORT);
  });

  it('DR6: rejects invalid state transition (skipped phase or backward transition)', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const resSkip = gate.evaluatePreconditions({
      planId: 'plan-dr-skip',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport({
        fromState: 'INTAKE',
        toState: 'VERIFIED'
      })
    });
    assert.equal(resSkip.ok, false);
    assert.equal(resSkip.decision, 'DENY');
    assert.equal(resSkip.code, DR_CODES.INVALID_LIFECYCLE_TRANSITION);

    const resUnknown = gate.evaluatePreconditions({
      planId: 'plan-dr-unknown',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport({
        fromState: 'UNKNOWN_STATE',
        toState: 'SPEC_APPROVAL'
      })
    });
    assert.equal(resUnknown.ok, false);
    assert.equal(resUnknown.decision, 'DENY');
    assert.equal(resUnknown.code, DR_CODES.INVALID_LIFECYCLE_TRANSITION);
  });

  it('DR7: rejects transition to VERIFIED when allChecksPassed !== true', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-failed-checks',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport({
        fromState: 'QUALITY_AUDIT',
        toState: 'VERIFIED',
        allChecksPassed: false
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DR_CODES.CHECKS_FAILED_FOR_VERIFIED);
  });

  it('DR8: permits transition to VERIFIED when allChecksPassed is true', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-verified-ok',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport({
        fromState: 'QUALITY_AUDIT',
        toState: 'VERIFIED',
        allChecksPassed: true
      })
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DR_CODES.OK);
  });

  it('DR9: allows HOLD mode with zero mutations', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-hold',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DR_CODES.HOLD);
  });

  it('DR10: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dr-del1',
      changeId: 'eos-ladder-32-mission-dr',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DR_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dr-del2',
      changeId: 'eos-ladder-32-mission-dr',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DR_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DR11: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ExecutionLoopControllerPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-secret',
      changeId: 'eos-ladder-32-mission-dr',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DR_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DR12: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dr-fundacion',
      changeId: 'eos-ladder-32-mission-dr',
      target: 'Documents/Fundacion/contracts'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DR_CODES.FUNDACION_DENIED);
  });

  it('DR13: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31 reopen, L32 auto-close', () => {
    const gate = new ExecutionLoopControllerPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dr-pr',
      changeId: 'eos-ladder-32-mission-dr',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DR_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dr-l30',
      changeId: 'eos-ladder-32-mission-dr',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DR_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dr-l31',
      changeId: 'eos-ladder-32-mission-dr',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DR_CODES.L31_REOPEN_FORBIDDEN);

    const l32CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dr-l32-close',
      changeId: 'eos-ladder-32-mission-dr',
      instruction: 'auto-close ladder-32 now'
    });
    assert.equal(l32CloseRes.ok, false);
    assert.equal(l32CloseRes.code, DR_CODES.L32_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dr-tip',
      changeId: 'eos-ladder-32-mission-dr',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DR_CODES.TIP_REWRITE_FORBIDDEN);
  });
});

describe('Mission DR — Execution Loop Controller Port (SPEC-0128)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DR14: govern happy path ACTIVE + valid loopReport -> PASS + DR-RCPT-*', async () => {
    const port = new ExecutionLoopControllerPort();
    const loopReport = makeMockLoopReport();

    const res = await port.govern({
      planId: 'plan-dr-pass',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DR-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
  });

  it('DR15: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ExecutionLoopControllerPort();

    const res = await port.govern({
      planId: 'plan-dr-hold',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DR16: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new ExecutionLoopControllerPort();

    await port.govern({
      planId: 'plan-dr-trail-01',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport({ fromState: 'INTAKE', toState: 'SPEC_APPROVAL' })
    });

    await port.govern({
      planId: 'plan-dr-trail-02',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);
  });

  it('DR17: tamper breaks trail verification and port refuses auto-seal when humanGateHeld is false', async () => {
    const port = new ExecutionLoopControllerPort();

    await port.govern({
      planId: 'plan-dr-trail-01',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      loopReport: makeMockLoopReport()
    });

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, false);
    assert.ok(trailRes.error.includes('receiptHash mismatch'));

    const autoSealRes = await port.govern({
      planId: 'plan-dr-autoseal',
      changeId: 'eos-ladder-32-mission-dr',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      loopReport: makeMockLoopReport()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DR_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
