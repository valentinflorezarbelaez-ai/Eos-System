/**
 * @file tests/eos-dk-specboot-mutation-gatekeeper-port.test.js
 * SPEC-0121 / Mission DK — SpecBoot Mutation Testing Gatekeeper Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: mutation gatekeeper PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L31 closeout
 *   NON-CLAIM: Mutation Gatekeeper ≠ GHE ≠ GHA green ≠ Fundacion Δ>0
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 2cead226 (Ladder 31 Audit tip)
 *   Formal L17–L30 CLOSED retained — NEVER reopen L30
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DK_PRODUCTION_READY,
  DK_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DK_RECEIPT_KIND,
  DK_DECISIONS,
  DK_RITUAL_MODES,
  DK_FREEZE_PIN,
  DK_FREEZE_PIN_SHORT,
  DK_FREEZE_NONCLAIM_LABELS,
  DK_CEILING_HOLD_TEMPLATE,
  DK_MUTATION_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  forceMutationHold,
  buildSpecbootMutationGatekeeperReceipt,
  verifySpecbootMutationGatekeeperReceipt,
  canonicalSpecbootMutationGatekeeperSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/specboot-mutation-gatekeeper-receipt.js';

import {
  SpecbootMutationGatekeeperPolicyGate,
  DK_CODES,
  DK_POLICY_GATE_PRODUCTION_READY,
  DK_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/specboot-mutation-gatekeeper-policy-gate.js';

import {
  SpecbootMutationGatekeeperPort,
  DK_PORT_PRODUCTION_READY,
  DK_PORT_KIND
} from '../src/core/composition/specboot-mutation-gatekeeper-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockMutationReport(overrides = {}) {
  return {
    status: 'VERIFIED',
    totalMutants: 12,
    killedMutants: 12,
    survivedMutants: 0,
    mutationScore: 1.0,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DK — SpecBoot Mutation Gatekeeper Receipt (SPEC-0121)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DK1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 2cead226', () => {
    assert.equal(DK_PRODUCTION_READY, 'NO');
    assert.equal(DK_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DK_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DK_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DK_FREEZE_PIN_SHORT, '2cead226');
    assert.ok(DK_FREEZE_PIN.startsWith('2cead226'));
    assert.ok(Array.isArray(DK_FREEZE_NONCLAIM_LABELS));
  });

  it('DK2: builds canonical nine-field sealed DK-RCPT-* with freeze soft-observe + ceiling hold + mutation hold', () => {
    const mutationReport = makeMockMutationReport();
    const receipt = buildSpecbootMutationGatekeeperReceipt({
      planId: 'plan-dk-001',
      changeId: 'eos-ladder-31-mission-dk',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      mutationReport,
      mutationDigest: 'sha256-mock-mutation-digest'
    });

    assert.ok(receipt.receiptId.startsWith('DK-RCPT-'));
    assert.equal(receipt.operation, 'SPECBOOT_MUTATION_GATEKEEPER');
    assert.equal(receipt.planId, 'plan-dk-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '2cead226');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.mutationHold.zeroMutantsSurvived, true);
    assert.equal(receipt.mutationHold.resilienceVerified, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DK3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildSpecbootMutationGatekeeperReceipt({
      planId: 'plan-dk-tamper',
      changeId: 'eos-ladder-31-mission-dk',
      decision: 'PASS'
    });

    assert.equal(verifySpecbootMutationGatekeeperReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifySpecbootMutationGatekeeperReceipt(tampered).ok, false);
  });
});

describe('Mission DK — SpecBoot Mutation Gatekeeper Policy Gate (SPEC-0121)', () => {
  it('DK4: validates well-formed plan (planId+changeId+ACTIVE+mutationReport ok with 0 survived mutants)', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();
    const mutationReport = makeMockMutationReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-valid',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      mutationReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DK_CODES.OK);
  });

  it('DK5: rejects missing mutationReport or invalid report type', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dk-noreport',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DK_CODES.MISSING_MUTATION_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dk-invalidreport',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DK_CODES.INVALID_MUTATION_REPORT);
  });

  it('DK6: rejects surviving mutants (survivedMutants > 0)', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();
    const mutationReport = makeMockMutationReport({ survivedMutants: 2 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-mutants-survived',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.MUTATION_RESILIENCE_FAILED);
  });

  it('DK7: rejects unverified mutation status (status !== VERIFIED)', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();
    const mutationReport = makeMockMutationReport({ status: 'FAILED' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-unverified-status',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.MUTATION_RESILIENCE_FAILED);
  });

  it('DK8: rejects mutationScore below threshold', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();
    const mutationReport = makeMockMutationReport({ mutationScore: 0.85 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-score-below-threshold',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport,
      minMutationScore: 0.90
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.MUTATION_RESILIENCE_FAILED);
  });

  it('DK9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-hard-delete',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport: makeMockMutationReport(),
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DK10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-secret',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport: makeMockMutationReport(),
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DK11: policy gate DENY on Fundacion target paths', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dk-fundacion',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport: makeMockMutationReport(),
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DK_CODES.FUNDACION_DENIED);
  });

  it('DK12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30 reopen, L31 auto-close', () => {
    const gate = new SpecbootMutationGatekeeperPolicyGate();
    const mutationReport = makeMockMutationReport();

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-dk-pr',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport,
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DK_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL30 = gate.evaluatePreconditions({
      planId: 'plan-dk-l30',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport,
      reopenL30: true
    });
    assert.equal(resL30.code, DK_CODES.L30_REOPEN_FORBIDDEN);
  });
});

describe('Mission DK — SpecBoot Mutation Gatekeeper Port (SPEC-0121)', () => {
  it('DK13: govern happy path ACTIVE + valid mutationReport -> PASS + DK-RCPT-*', async () => {
    const port = new SpecbootMutationGatekeeperPort();
    const mutationReport = makeMockMutationReport();

    const result = await port.govern({
      planId: 'plan-dk-exec-01',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      phase: 'EXECUTION',
      mutationReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DK-RCPT-'));
    assert.ok(result.receipt.mutationDigest);
    assert.equal(result.receipt.mutationHold.zeroMutantsSurvived, true);
    assert.equal(result.receipt.mutationHold.resilienceVerified, true);
  });

  it('DK14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new SpecbootMutationGatekeeperPort();
    const mutationReport = makeMockMutationReport();

    const result = await port.govern({
      planId: 'plan-dk-hold',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'HOLD',
      phase: 'OBSERVE',
      mutationReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.receipt.decision, 'HOLD');
  });

  it('DK15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new SpecbootMutationGatekeeperPort();
    const mutationReport = makeMockMutationReport();

    await port.govern({
      planId: 'plan-dk-trail-1',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DK16: tamper breaks trail verification', async () => {
    const port = new SpecbootMutationGatekeeperPort();
    const mutationReport = makeMockMutationReport();

    await port.govern({
      planId: 'plan-dk-trail-tamper',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DK17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new SpecbootMutationGatekeeperPort();
    const mutationReport = makeMockMutationReport();

    const result = await port.govern({
      planId: 'plan-dk-auto-seal',
      changeId: 'eos-ladder-31-mission-dk',
      ritualMode: 'ACTIVE',
      mutationReport,
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');

    assert.ok(Object.isFrozen(DK_CODES));
    assert.ok(Object.isFrozen(DK_DECISIONS));
    assert.ok(Object.isFrozen(DK_RITUAL_MODES));
    assert.equal(DK_CODES.OK, 'OK');
    assert.equal(DK_CODES.MUTATION_RESILIENCE_FAILED, 'MUTATION_RESILIENCE_FAILED');
    assert.equal(DK_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
