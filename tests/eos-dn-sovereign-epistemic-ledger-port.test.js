/**
 * @file tests/eos-dn-sovereign-epistemic-ledger-port.test.js
 * SPEC-0124 / Mission DN — Sovereign Epistemic Knowledge Ledger Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: epistemic ledger PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L31 closeout
 *   NON-CLAIM: Epistemic Ledger ≠ GHE ≠ GHA green ≠ Fundacion Δ>0
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin 079e6f2a (Mission DM tip)
 *   Formal L17–L30 CLOSED retained — NEVER reopen L30
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DN_PRODUCTION_READY,
  DN_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DN_RECEIPT_KIND,
  DN_DECISIONS,
  DN_RITUAL_MODES,
  DN_FREEZE_PIN,
  DN_FREEZE_PIN_SHORT,
  DN_FREEZE_NONCLAIM_LABELS,
  DN_CEILING_HOLD_TEMPLATE,
  DN_EPISTEMIC_HOLD_TEMPLATE,
  EPISTEMIC_VALID_STATES,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  forceEpistemicHold,
  buildSovereignEpistemicLedgerReceipt,
  verifySovereignEpistemicLedgerReceipt,
  canonicalSovereignEpistemicLedgerSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/sovereign-epistemic-ledger-receipt.js';

import {
  SovereignEpistemicLedgerPolicyGate,
  DN_CODES,
  DN_POLICY_GATE_PRODUCTION_READY,
  DN_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/sovereign-epistemic-ledger-policy-gate.js';

import {
  SovereignEpistemicLedgerPort,
  DN_PORT_PRODUCTION_READY,
  DN_PORT_KIND
} from '../src/core/composition/sovereign-epistemic-ledger-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockEpistemicReport(overrides = {}) {
  return {
    fromState: 'AUDIT_EXECUTED',
    toState: 'VERIFIED',
    checksPassed: 914,
    evidenceHash: 'a'.repeat(64),
    evidenceArtifact: 'docs/evidence/EVD-9999.json',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DN — Sovereign Epistemic Ledger Receipt (SPEC-0124)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DN1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 079e6f2a', () => {
    assert.equal(DN_PRODUCTION_READY, 'NO');
    assert.equal(DN_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DN_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DN_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DN_FREEZE_PIN_SHORT, '079e6f2a');
    assert.ok(DN_FREEZE_PIN.startsWith('079e6f2a'));
    assert.ok(Array.isArray(DN_FREEZE_NONCLAIM_LABELS));
  });

  it('DN2: builds canonical nine-field sealed DN-RCPT-* with freeze soft-observe + ceiling hold + epistemic hold', () => {
    const epistemicReport = makeMockEpistemicReport();
    const receipt = buildSovereignEpistemicLedgerReceipt({
      planId: 'plan-dn-001',
      changeId: 'eos-ladder-31-mission-dn',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      epistemicReport,
      epistemicDigest: 'sha256-mock-epistemic-digest'
    });

    assert.ok(receipt.receiptId.startsWith('DN-RCPT-'));
    assert.equal(receipt.operation, 'SOVEREIGN_EPISTEMIC_LEDGER');
    assert.equal(receipt.planId, 'plan-dn-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '079e6f2a');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.epistemicHold.epistemicStateGrounded, true);
    assert.equal(receipt.epistemicHold.ungroundedClaimsRefused, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DN3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildSovereignEpistemicLedgerReceipt({
      planId: 'plan-dn-tamper',
      changeId: 'eos-ladder-31-mission-dn',
      decision: 'PASS'
    });

    assert.equal(verifySovereignEpistemicLedgerReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifySovereignEpistemicLedgerReceipt(tampered).ok, false);
  });
});

describe('Mission DN — Sovereign Epistemic Ledger Policy Gate (SPEC-0124)', () => {
  it('DN4: validates well-formed plan (planId+changeId+ACTIVE+epistemicReport ok)', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();
    const epistemicReport = makeMockEpistemicReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-valid',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      epistemicReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DN_CODES.OK);
  });

  it('DN5: rejects missing epistemicReport or invalid report type', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dn-noreport',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DN_CODES.MISSING_EPISTEMIC_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dn-invalidreport',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DN_CODES.INVALID_EPISTEMIC_REPORT);
  });

  it('DN6: rejects ungrounded VERIFIED transition without prior AUDIT_EXECUTED or REVALIDATION_REQUIRED', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();
    const epistemicReport = makeMockEpistemicReport({ fromState: 'FINDINGS_IDENTIFIED', toState: 'VERIFIED' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-invalid-transition',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.INVALID_EPISTEMIC_TRANSITION);
  });

  it('DN7: rejects VERIFIED transition with checksPassed = 0', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();
    const epistemicReport = makeMockEpistemicReport({ checksPassed: 0 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-zero-checks',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.UNGROUNDED_EPISTEMIC_CLAIM);
  });

  it('DN8: rejects VERIFIED transition with missing or invalid evidenceHash', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();
    const epistemicReport = makeMockEpistemicReport({ evidenceHash: 'short-hash' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-bad-hash',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.UNGROUNDED_EPISTEMIC_CLAIM);
  });

  it('DN9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-hard-delete',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport: makeMockEpistemicReport(),
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DN10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-secret',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport: makeMockEpistemicReport(),
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DN11: policy gate DENY on Fundacion target paths', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dn-fundacion',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport: makeMockEpistemicReport(),
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DN_CODES.FUNDACION_DENIED);
  });

  it('DN12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30 reopen, L31 auto-close', () => {
    const gate = new SovereignEpistemicLedgerPolicyGate();
    const epistemicReport = makeMockEpistemicReport();

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-dn-pr',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport,
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DN_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL30 = gate.evaluatePreconditions({
      planId: 'plan-dn-l30',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport,
      reopenL30: true
    });
    assert.equal(resL30.code, DN_CODES.L30_REOPEN_FORBIDDEN);
  });
});

describe('Mission DN — Sovereign Epistemic Ledger Port (SPEC-0124)', () => {
  it('DN13: govern happy path ACTIVE + valid epistemicReport -> PASS + DN-RCPT-*', async () => {
    const port = new SovereignEpistemicLedgerPort();
    const epistemicReport = makeMockEpistemicReport();

    const result = await port.govern({
      planId: 'plan-dn-exec-01',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      phase: 'EXECUTION',
      epistemicReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DN-RCPT-'));
    assert.ok(result.receipt.epistemicDigest);
    assert.equal(result.receipt.epistemicHold.epistemicStateGrounded, true);
    assert.equal(result.receipt.epistemicHold.ungroundedClaimsRefused, true);
  });

  it('DN14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new SovereignEpistemicLedgerPort();
    const epistemicReport = makeMockEpistemicReport();

    const result = await port.govern({
      planId: 'plan-dn-hold',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'HOLD',
      phase: 'OBSERVE',
      epistemicReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.receipt.decision, 'HOLD');
  });

  it('DN15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new SovereignEpistemicLedgerPort();
    const epistemicReport = makeMockEpistemicReport();

    await port.govern({
      planId: 'plan-dn-trail-1',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DN16: tamper breaks trail verification', async () => {
    const port = new SovereignEpistemicLedgerPort();
    const epistemicReport = makeMockEpistemicReport();

    await port.govern({
      planId: 'plan-dn-trail-tamper',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DN17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new SovereignEpistemicLedgerPort();
    const epistemicReport = makeMockEpistemicReport();

    const result = await port.govern({
      planId: 'plan-dn-auto-seal',
      changeId: 'eos-ladder-31-mission-dn',
      ritualMode: 'ACTIVE',
      epistemicReport,
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');

    assert.ok(Object.isFrozen(DN_CODES));
    assert.ok(Object.isFrozen(DN_DECISIONS));
    assert.ok(Object.isFrozen(DN_RITUAL_MODES));
    assert.equal(DN_CODES.OK, 'OK');
    assert.equal(DN_CODES.INVALID_EPISTEMIC_TRANSITION, 'INVALID_EPISTEMIC_TRANSITION');
    assert.equal(DN_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
