/**
 * Mission EG — Long-Running Process Timeout Compensation Port Test Suite.
 * SPEC-0143 / ADR-0121.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 73252208 (do NOT rewrite tip pins)
 * - COMPENSATE = fail-closed hermetic ≠ live saga rewrite ≠ tip-refresh ≠ PRODUCTION_READY
 * - PASS = hermetic timeout-compensation ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L34; refuse L35 auto-close
 * - Unsupervised compensate / live saga rewrite / network write / schema-json add / tip-rewrite refused
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EG_PRODUCTION_READY,
  EG_RECEIPT_PRODUCTION_READY,
  EG_RECEIPT_KIND,
  EG_FREEZE_PIN_SHORT,
  buildProcessTimeoutCompensationReceipt,
  verifyProcessTimeoutCompensationReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/process-timeout-compensation-receipt.js';

import {
  ProcessTimeoutCompensationPolicyGate,
  EG_CODES,
  EG_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsUnsupervisedCompensate,
  isFundacionTarget
} from '../src/core/composition/process-timeout-compensation-policy-gate.js';

import {
  ProcessTimeoutCompensationPort,
  EG_PORT_PRODUCTION_READY,
  EG_PORT_KIND
} from '../src/core/composition/process-timeout-compensation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockCompensation(overrides = {}) {
  return {
    processId: 'proc-eg-001',
    timeoutReason: 'DEADLINE_TTL_EXPIRED',
    relatedDeadlineReceiptId: 'EE-RCPT-0001',
    compensationPlan: 'hermetic-rollback-step',
    observedTimedOut: false,
    ...overrides
  };
}

describe('Mission EG — Process Timeout Compensation Receipt (SPEC-0143)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EG1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 73252208', () => {
    assert.equal(EG_PRODUCTION_READY, 'NO');
    assert.equal(EG_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EG_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EG_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EG_FREEZE_PIN_SHORT, '73252208');
  });

  it('EG2: builds canonical nine-field sealed EG-RCPT-* with freeze soft-observe + ceiling hold + compensation hold', () => {
    const receipt = buildProcessTimeoutCompensationReceipt({
      planId: 'plan-eg-01',
      changeId: 'eos-ladder-35-mission-eg',
      decision: 'PASS',
      compensation: makeMockCompensation()
    });

    assert.equal(receipt.kind, EG_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EG-RCPT-'));
    assert.equal(receipt.operation, 'PROCESS_TIMEOUT_COMPENSATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '73252208');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l34ReopenRefused, true);
    assert.equal(receipt.freezeObserve.unsupervisedCompensateRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.compensationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.compensationHold.unsupervisedCompensateRefused, true);
    assert.equal(receipt.compensationHold.liveSagaRewriteRefused, true);
    assert.equal(receipt.compensationHold.networkWriteRefused, true);
    assert.equal(receipt.compensationHold.tipRewriteRefused, true);
    assert.equal(receipt.compensationHold.schemaJsonAddRefused, true);
    assert.equal(receipt.compensationHold.compensateFailClosed, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.compensationDigest, 'string');
    assert.equal(receipt.compensationDigest.length, 64);
  });

  it('EG3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildProcessTimeoutCompensationReceipt({
      planId: 'plan-eg-tamper',
      changeId: 'eos-ladder-35-mission-eg',
      decision: 'PASS'
    });

    assert.equal(verifyProcessTimeoutCompensationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyProcessTimeoutCompensationReceipt(tampered).ok, false);
  });
});

describe('Mission EG — Process Timeout Compensation Policy Gate (SPEC-0143)', () => {
  it('EG4: validates well-formed plan (planId+changeId+ACTIVE+compensation processId/timeoutReason/compensationPlan)', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();
    const compensation = makeMockCompensation();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eg-valid',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      compensation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EG_CODES.OK);
  });

  it('EG5: rejects missing compensation or invalid compensation', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eg-nocomp',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EG_CODES.MISSING_COMPENSATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eg-invalidcomp',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EG_CODES.INVALID_COMPENSATION);
  });

  it('EG6: rejects missing processId / timeoutReason', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const resPid = gate.evaluatePreconditions({
      planId: 'plan-eg-nopid',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ processId: '' })
    });
    assert.equal(resPid.ok, false);
    assert.equal(resPid.code, EG_CODES.MISSING_PROCESS_ID);

    const resReason = gate.evaluatePreconditions({
      planId: 'plan-eg-noreason',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ timeoutReason: '   ' })
    });
    assert.equal(resReason.ok, false);
    assert.equal(resReason.code, EG_CODES.MISSING_TIMEOUT_REASON);
  });

  it('EG7: DENY missing compensationPlan + unsupervised compensate claims', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const missingPlan = gate.evaluatePreconditions({
      planId: 'plan-eg-noplan',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ compensationPlan: '' })
    });
    assert.equal(missingPlan.ok, false);
    assert.equal(missingPlan.decision, 'DENY');
    assert.equal(missingPlan.code, EG_CODES.MISSING_COMPENSATION_PLAN);

    const unsupervised = gate.evaluatePreconditions({
      planId: 'plan-eg-unsup',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      unsupervisedCompensate: true,
      compensation: makeMockCompensation()
    });
    assert.equal(unsupervised.ok, false);
    assert.equal(unsupervised.decision, 'DENY');
    assert.equal(unsupervised.code, EG_CODES.UNSUPERVISED_COMPENSATE_FORBIDDEN);
  });

  it('EG8: rejects unsupervised compensate claim strings and schema-json add', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const unsupClaim = gate.evaluatePreconditions({
      planId: 'plan-eg-unsupclaim',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming unsupervised compensate live saga rewrite',
      compensation: makeMockCompensation()
    });
    assert.equal(unsupClaim.ok, false);
    assert.equal(unsupClaim.code, EG_CODES.UNSUPERVISED_COMPENSATE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eg-schema',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-timeout-compensation.json',
      compensation: makeMockCompensation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EG_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsUnsupervisedCompensate('auto-compensate live saga rewrite'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EG9: allows HOLD mode with zero mutations', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eg-hold',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EG_CODES.HOLD);
  });

  it('EG10: COMPENSATE when observedTimedOut=true; PASS when observedTimedOut false/absent', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const compensate = gate.evaluatePreconditions({
      planId: 'plan-eg-compensate',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ observedTimedOut: true })
    });
    assert.equal(compensate.ok, true);
    assert.equal(compensate.decision, 'COMPENSATE');
    assert.equal(compensate.code, EG_CODES.COMPENSATE);

    const pass = gate.evaluatePreconditions({
      planId: 'plan-eg-pass',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ observedTimedOut: false })
    });
    assert.equal(pass.ok, true);
    assert.equal(pass.decision, 'PASS');

    const passAbsent = gate.evaluatePreconditions({
      planId: 'plan-eg-pass-absent',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ observedTimedOut: undefined })
    });
    assert.equal(passAbsent.ok, true);
    assert.equal(passAbsent.decision, 'PASS');
  });

  it('EG11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-eg-del1',
      changeId: 'eos-ladder-35-mission-eg',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EG_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-eg-del2',
      changeId: 'eos-ladder-35-mission-eg',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EG_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EG12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eg-secret',
      changeId: 'eos-ladder-35-mission-eg',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EG_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EG13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eg-fundacion',
      changeId: 'eos-ladder-35-mission-eg',
      target: 'Documents/Fundacion/compensation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EG_CODES.FUNDACION_DENIED);
  });

  it('EG14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L34 reopen, L35 auto-close, mass prune, GHE', () => {
    const gate = new ProcessTimeoutCompensationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eg-pr',
      changeId: 'eos-ladder-35-mission-eg',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EG_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-eg-l30',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EG_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-eg-l31',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EG_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-eg-l32',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EG_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-eg-l33',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EG_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-eg-l34',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EG_CODES.L34_REOPEN_FORBIDDEN);

    const l35CloseRes = gate.evaluatePreconditions({
      planId: 'plan-eg-l35-close',
      changeId: 'eos-ladder-35-mission-eg',
      instruction: 'auto-close ladder-35 now'
    });
    assert.equal(l35CloseRes.ok, false);
    assert.equal(l35CloseRes.code, EG_CODES.L35_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eg-tip',
      changeId: 'eos-ladder-35-mission-eg',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EG_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eg-mass',
      changeId: 'eos-ladder-35-mission-eg',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EG_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eg-ghe',
      changeId: 'eos-ladder-35-mission-eg',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EG_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EG — Process Timeout Compensation Port (SPEC-0143)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EG15: govern happy path ACTIVE + compensation -> PASS + EG-RCPT-* (≠ unsupervised compensate ≠ tip-refresh)', async () => {
    const port = new ProcessTimeoutCompensationPort();
    const compensation = makeMockCompensation();

    const res = await port.govern({
      planId: 'plan-eg-pass',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EG-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.compensationHold.unsupervisedCompensateRefused, true);
    assert.equal(res.receipt.compensationHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.compensationHold.liveSagaRewriteRefused, true);
    assert.equal(res.receipt.compensationHold.networkWriteRefused, true);
    assert.equal(res.receipt.compensationHold.compensateFailClosed, true);
    assert.equal(res.receipt.freezeObserve.unsupervisedCompensateRefused, true);
    assert.equal(res.receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(typeof res.receipt.compensationDigest, 'string');
    assert.equal(res.receipt.compensationDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EG_PORT_KIND, 'eos-process-timeout-compensation-port');
  });

  it('EG16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ProcessTimeoutCompensationPort();

    const res = await port.govern({
      planId: 'plan-eg-hold',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EG17: verifyTrail + COMPENSATE + unsupervised-compensate deny + auto-seal refuse', async () => {
    const port = new ProcessTimeoutCompensationPort();

    await port.govern({
      planId: 'plan-eg-trail-01',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation()
    });

    await port.govern({
      planId: 'plan-eg-trail-02',
      changeId: 'eos-ladder-35-mission-eg',
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

    const compensatePort = new ProcessTimeoutCompensationPort();
    const compensateRes = await compensatePort.govern({
      planId: 'plan-eg-compensate',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      compensation: makeMockCompensation({ observedTimedOut: true })
    });
    assert.equal(compensateRes.ok, true);
    assert.equal(compensateRes.decision, 'COMPENSATE');
    assert.equal(compensateRes.code, EG_CODES.COMPENSATE);
    assert.ok(compensateRes.receipt.receiptId.startsWith('EG-RCPT-'));
    assert.equal(compensateRes.receipt.compensationHold.compensateFailClosed, true);
    assert.equal(compensateRes.receipt.compensationHold.hermeticInMemoryOnly, true);

    const unsupDeny = await compensatePort.govern({
      planId: 'plan-eg-unsup-deny',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      instruction: 'execute live compensate with unsupervised compensate',
      compensation: makeMockCompensation()
    });
    assert.equal(unsupDeny.ok, false);
    assert.equal(unsupDeny.decision, 'DENY');
    assert.equal(unsupDeny.code, EG_CODES.UNSUPERVISED_COMPENSATE_FORBIDDEN);
    assert.ok(unsupDeny.receipt.receiptId.startsWith('EG-RCPT-'));

    const autoSealRes = await compensatePort.govern({
      planId: 'plan-eg-autoseal',
      changeId: 'eos-ladder-35-mission-eg',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      compensation: makeMockCompensation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EG_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
