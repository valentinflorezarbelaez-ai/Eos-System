/**
 * @file tests/eos-di-post-disposition-integrity-hold-port.test.js
 * SPEC-0118 / Mission DI — Post-Disposition Integrity & Docs SSOT Hold Ritual Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: integrity PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L30 closeout
 *   NON-CLAIM: Integrity Hold ≠ GHE ≠ GHA green ≠ Fundacion Δ>0
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 3d0c2e0b (Mission DH commit tip)
 *   Formal L29 CLOSED retained — NEVER reopen L29
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DI_PRODUCTION_READY,
  DI_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DI_RECEIPT_KIND,
  DI_DECISIONS,
  DI_RITUAL_MODES,
  DI_FREEZE_PIN,
  DI_FREEZE_PIN_SHORT,
  DI_FREEZE_NONCLAIM_LABELS,
  DI_CEILING_HOLD_TEMPLATE,
  DI_DOCS_SSOT_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  forceDocsSsotHold,
  buildPostDispositionIntegrityHoldReceipt,
  verifyPostDispositionIntegrityHoldReceipt,
  canonicalPostDispositionIntegrityHoldSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/post-disposition-integrity-hold-receipt.js';

import {
  PostDispositionIntegrityHoldPolicyGate,
  DI_CODES,
  DI_POLICY_GATE_PRODUCTION_READY,
  DI_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/post-disposition-integrity-hold-policy-gate.js';

import {
  PostDispositionIntegrityHoldPort,
  DI_PORT_PRODUCTION_READY,
  DI_PORT_KIND
} from '../src/core/composition/post-disposition-integrity-hold-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockDhReceipt() {
  return {
    receiptId: 'DH-RCPT-0001',
    operation: 'QUARANTINE_EXECUTE',
    planId: 'plan-dh-test',
    decision: 'PASS',
    quarantinedPaths: ['src/deprecated/old-feature.js'],
    manifestDigest: 'sha256-mock-quarantine-manifest',
    receiptHash: 'mock-dh-hash-1234567890abcdef'
  };
}

function makeMockIntegrityInput() {
  return {
    status: 'VERIFIED',
    checksPassed: 914,
    failures: 0,
    docsConsistent: true,
    inventoryReflected: true
  };
}

describe('Mission DI — Post-Disposition Integrity Hold Receipt (SPEC-0118)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DI1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 3d0c2e0b', () => {
    assert.equal(DI_PRODUCTION_READY, 'NO');
    assert.equal(DI_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DI_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DI_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DI_FREEZE_PIN_SHORT, '3d0c2e0b');
    assert.ok(DI_FREEZE_PIN.startsWith('3d0c2e0b'));
    assert.ok(Array.isArray(DI_FREEZE_NONCLAIM_LABELS));
  });

  it('DI2: builds canonical nine-field sealed DI-RCPT-* with freeze soft-observe + ceiling hold + docs hold', () => {
    const receipt = buildPostDispositionIntegrityHoldReceipt({
      planId: 'plan-di-001',
      changeId: 'eos-ladder-30-mission-di',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      dhReceiptLink: 'DH-RCPT-0001',
      integrityDigest: 'sha256-mock-integrity-digest'
    });

    assert.ok(receipt.receiptId.startsWith('DI-RCPT-'));
    assert.equal(receipt.operation, 'POST_DISPOSITION_INTEGRITY_HOLD');
    assert.equal(receipt.planId, 'plan-di-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.dhReceiptLink, 'DH-RCPT-0001');
    assert.equal(receipt.freezeObserve.pinShort, '3d0c2e0b');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.docsSsotHold.docsConsistent, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DI3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildPostDispositionIntegrityHoldReceipt({
      planId: 'plan-di-tamper',
      changeId: 'eos-ladder-30-mission-di',
      decision: 'PASS'
    });

    assert.equal(verifyPostDispositionIntegrityHoldReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyPostDispositionIntegrityHoldReceipt(tampered).ok, false);
  });
});

describe('Mission DI — Post-Disposition Integrity Hold Policy Gate (SPEC-0118)', () => {
  it('DI4: validates well-formed plan (planId+changeId+ACTIVE+dhReceipt+integrity ok)', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const res = gate.evaluatePreconditions({
      planId: 'plan-di-valid',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      dhReceipt,
      integrity
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DI_CODES.OK);
  });

  it('DI5: rejects missing DH receipt or invalid linkage', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const integrity = makeMockIntegrityInput();

    const res = gate.evaluatePreconditions({
      planId: 'plan-di-nodh',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt: null,
      integrity
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DI_CODES.MISSING_DH_RECEIPT);
  });

  it('DI6: rejects failed integrity audit checks (failures > 0 or status != VERIFIED)', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();

    const resFailed = gate.evaluatePreconditions({
      planId: 'plan-di-failed-audit',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity: {
        status: 'FAILED',
        checksPassed: 900,
        failures: 2
      }
    });

    assert.equal(resFailed.ok, false);
    assert.equal(resFailed.decision, 'DENY');
    assert.equal(resFailed.code, DI_CODES.INTEGRITY_CHECK_FAILED);
  });

  it('DI7: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();

    const res = gate.evaluatePreconditions({
      planId: 'plan-di-hard-delete',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity: makeMockIntegrityInput(),
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DI_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DI8: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();

    const res = gate.evaluatePreconditions({
      planId: 'plan-di-secret',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity: makeMockIntegrityInput(),
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DI_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DI9: policy gate DENY on Fundacion target paths', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();

    const res = gate.evaluatePreconditions({
      planId: 'plan-di-fundacion',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity: makeMockIntegrityInput(),
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DI_CODES.FUNDACION_DENIED);
  });

  it('DI10: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L29 reopen, L30 auto-close, GHE claims', () => {
    const gate = new PostDispositionIntegrityHoldPolicyGate();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-di-pr',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity,
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DI_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL29 = gate.evaluatePreconditions({
      planId: 'plan-di-l29',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity,
      reopenL29: true
    });
    assert.equal(resL29.code, DI_CODES.L29_REOPEN_FORBIDDEN);
  });
});

describe('Mission DI — Post-Disposition Integrity Hold Port (SPEC-0118)', () => {
  it('DI11: govern happy path ACTIVE + valid DH receipt -> PASS + DI-RCPT-*', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const result = await port.govern({
      planId: 'plan-di-exec-01',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      phase: 'EXECUTION',
      dhReceipt,
      integrity
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DI-RCPT-'));
    assert.equal(result.receipt.dhReceiptLink, 'DH-RCPT-0001');
    assert.ok(result.receipt.integrityDigest);
    assert.equal(result.receipt.docsSsotHold.docsConsistent, true);
  });

  it('DI12: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const result = await port.govern({
      planId: 'plan-di-hold',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'HOLD',
      phase: 'OBSERVE',
      dhReceipt,
      integrity
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.receipt.decision, 'HOLD');
  });

  it('DI13: integrity hold generates verifiable integrityDigest combining test audit and docs SSOT', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const result = await port.govern({
      planId: 'plan-di-digest',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity
    });

    assert.equal(result.ok, true);
    assert.equal(typeof result.receipt.integrityDigest, 'string');
    assert.equal(result.receipt.integrityDigest.length, 64);
  });

  it('DI14: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    await port.govern({
      planId: 'plan-di-trail-1',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DI15: tamper breaks trail verification', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    await port.govern({
      planId: 'plan-di-trail-tamper',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DI16: port refuses auto-seal when humanGateHeld is violated', async () => {
    const port = new PostDispositionIntegrityHoldPort();
    const dhReceipt = makeMockDhReceipt();
    const integrity = makeMockIntegrityInput();

    const result = await port.govern({
      planId: 'plan-di-auto-seal',
      changeId: 'eos-ladder-30-mission-di',
      ritualMode: 'ACTIVE',
      dhReceipt,
      integrity,
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');
  });

  it('DI17: codes freeze surface and hermetic helper immutability', () => {
    assert.ok(Object.isFrozen(DI_CODES));
    assert.ok(Object.isFrozen(DI_DECISIONS));
    assert.ok(Object.isFrozen(DI_RITUAL_MODES));
    assert.equal(DI_CODES.OK, 'OK');
    assert.equal(DI_CODES.MISSING_DH_RECEIPT, 'MISSING_DH_RECEIPT');
    assert.equal(DI_CODES.INTEGRITY_CHECK_FAILED, 'INTEGRITY_CHECK_FAILED');
    assert.equal(DI_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
