/**
 * Mission EB — Dead-Letter Quarantine Port Test Suite.
 * SPEC-0138 / ADR-0115.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 037f9578 (do NOT rewrite tip pins)
 * - PASS = sealed quarantine ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop
 * - NEVER reopen L30–L33; refuse L34 auto-close
 * - Silent drop / unsupervised retry / schema-json add refused
 * - Disposition hermetic in-memory only (≠ live broker)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EB_PRODUCTION_READY,
  EB_RECEIPT_PRODUCTION_READY,
  EB_RECEIPT_KIND,
  EB_FREEZE_PIN_SHORT,
  buildDeadLetterQuarantineReceipt,
  verifyDeadLetterQuarantineReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/dead-letter-quarantine-receipt.js';

import {
  DeadLetterQuarantinePolicyGate,
  EB_CODES,
  EB_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSilentDrop,
  claimsUnsupervisedRetry,
  isFundacionTarget
} from '../src/core/composition/dead-letter-quarantine-policy-gate.js';

import {
  DeadLetterQuarantinePort,
  EB_PORT_PRODUCTION_READY,
  EB_PORT_KIND
} from '../src/core/composition/dead-letter-quarantine-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockQuarantine(overrides = {}) {
  return {
    messageId: 'msg-poison-001',
    poisonReason: 'deserialization-failure',
    sourceConsumer: 'order-events-consumer',
    attemptCount: 5,
    payloadDigest: 'a'.repeat(64),
    disposition: undefined,
    ...overrides
  };
}

describe('Mission EB — Dead-Letter Quarantine Receipt (SPEC-0138)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EB1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 037f9578', () => {
    assert.equal(EB_PRODUCTION_READY, 'NO');
    assert.equal(EB_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EB_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EB_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EB_FREEZE_PIN_SHORT, '037f9578');
  });

  it('EB2: builds canonical nine-field sealed EB-RCPT-* with freeze soft-observe + ceiling hold + quarantine hold', () => {
    const receipt = buildDeadLetterQuarantineReceipt({
      planId: 'plan-eb-01',
      changeId: 'eos-ladder-34-mission-eb',
      decision: 'PASS',
      quarantine: makeMockQuarantine()
    });

    assert.equal(receipt.kind, EB_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EB-RCPT-'));
    assert.equal(receipt.operation, 'DEAD_LETTER_QUARANTINE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '037f9578');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.silentDropRefused, true);
    assert.equal(receipt.freezeObserve.unsupervisedRetryRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l33ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.quarantineHold.silentDropRefused, true);
    assert.equal(receipt.quarantineHold.unsupervisedRetryRefused, true);
    assert.equal(receipt.quarantineHold.networkWriteRefused, true);
    assert.equal(receipt.quarantineHold.liveBrokerWriteRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.quarantineDigest, 'string');
    assert.equal(receipt.quarantineDigest.length, 64);
  });

  it('EB3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildDeadLetterQuarantineReceipt({
      planId: 'plan-eb-tamper',
      changeId: 'eos-ladder-34-mission-eb',
      decision: 'PASS'
    });

    assert.equal(verifyDeadLetterQuarantineReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyDeadLetterQuarantineReceipt(tampered).ok, false);
  });
});

describe('Mission EB — Dead-Letter Quarantine Policy Gate (SPEC-0138)', () => {
  it('EB4: validates well-formed plan (planId+changeId+ACTIVE+valid quarantine)', () => {
    const gate = new DeadLetterQuarantinePolicyGate();
    const quarantine = makeMockQuarantine();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eb-valid',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EB_CODES.OK);
  });

  it('EB5: rejects missing quarantine or invalid quarantine', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eb-noq',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EB_CODES.MISSING_QUARANTINE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eb-invalidq',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EB_CODES.INVALID_QUARANTINE);
  });

  it('EB6: rejects missing messageId / poisonReason', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-eb-noid',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ messageId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EB_CODES.MISSING_MESSAGE_ID);

    const resReason = gate.evaluatePreconditions({
      planId: 'plan-eb-noreason',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ poisonReason: '   ' })
    });
    assert.equal(resReason.ok, false);
    assert.equal(resReason.code, EB_CODES.MISSING_POISON_REASON);
  });

  it('EB7: rejects missing sourceConsumer / invalid attemptCount', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const resConsumer = gate.evaluatePreconditions({
      planId: 'plan-eb-noconsumer',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ sourceConsumer: '' })
    });
    assert.equal(resConsumer.ok, false);
    assert.equal(resConsumer.code, EB_CODES.MISSING_SOURCE_CONSUMER);

    const resAttempts = gate.evaluatePreconditions({
      planId: 'plan-eb-badattempts',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ attemptCount: 0 })
    });
    assert.equal(resAttempts.ok, false);
    assert.equal(resAttempts.code, EB_CODES.INVALID_ATTEMPT_COUNT);
  });

  it('EB8: rejects silent drop and unsupervised retry', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const silent = gate.evaluatePreconditions({
      planId: 'plan-eb-silent',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      silentDrop: true,
      quarantine: makeMockQuarantine()
    });
    assert.equal(silent.ok, false);
    assert.equal(silent.code, EB_CODES.SILENT_DROP_FORBIDDEN);

    const retry = gate.evaluatePreconditions({
      planId: 'plan-eb-retry',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      unsupervisedRetry: true,
      quarantine: makeMockQuarantine()
    });
    assert.equal(retry.ok, false);
    assert.equal(retry.code, EB_CODES.UNSUPERVISED_RETRY_FORBIDDEN);

    assert.equal(claimsSilentDrop('silent-drop now'), true);
    assert.equal(claimsUnsupervisedRetry('unsupervised retry forever'), true);
  });

  it('EB9: rejects schema-json add', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eb-schema',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-quarantine.json',
      quarantine: makeMockQuarantine()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EB_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  });

  it('EB10: allows HOLD mode with zero mutations', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eb-hold',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EB_CODES.HOLD);
  });

  it('EB11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-eb-del1',
      changeId: 'eos-ladder-34-mission-eb',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EB_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-eb-del2',
      changeId: 'eos-ladder-34-mission-eb',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EB_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EB12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new DeadLetterQuarantinePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eb-secret',
      changeId: 'eos-ladder-34-mission-eb',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EB_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EB13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eb-fundacion',
      changeId: 'eos-ladder-34-mission-eb',
      target: 'Documents/Fundacion/quarantine'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EB_CODES.FUNDACION_DENIED);
  });

  it('EB14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L33 reopen, L34 auto-close, mass prune, GHE', () => {
    const gate = new DeadLetterQuarantinePolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eb-pr',
      changeId: 'eos-ladder-34-mission-eb',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EB_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-eb-l30',
      changeId: 'eos-ladder-34-mission-eb',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EB_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-eb-l31',
      changeId: 'eos-ladder-34-mission-eb',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EB_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-eb-l32',
      changeId: 'eos-ladder-34-mission-eb',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EB_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-eb-l33',
      changeId: 'eos-ladder-34-mission-eb',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EB_CODES.L33_REOPEN_FORBIDDEN);

    const l34CloseRes = gate.evaluatePreconditions({
      planId: 'plan-eb-l34-close',
      changeId: 'eos-ladder-34-mission-eb',
      instruction: 'auto-close ladder-34 now'
    });
    assert.equal(l34CloseRes.ok, false);
    assert.equal(l34CloseRes.code, EB_CODES.L34_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eb-tip',
      changeId: 'eos-ladder-34-mission-eb',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EB_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eb-mass',
      changeId: 'eos-ladder-34-mission-eb',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EB_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eb-ghe',
      changeId: 'eos-ladder-34-mission-eb',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EB_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EB — Dead-Letter Quarantine Port (SPEC-0138)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EB15: govern happy path ACTIVE + valid quarantine -> PASS + EB-RCPT-* (≠ network write ≠ silent drop)', async () => {
    const port = new DeadLetterQuarantinePort();
    const quarantine = makeMockQuarantine();

    const res = await port.govern({
      planId: 'plan-eb-pass',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EB-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.quarantineHold.networkWriteRefused, true);
    assert.equal(res.receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.freezeObserve.silentDropRefused, true);
    assert.equal(res.receipt.freezeObserve.unsupervisedRetryRefused, true);
    assert.equal(res.receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(typeof res.receipt.quarantineDigest, 'string');
    assert.equal(res.receipt.quarantineDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EB_PORT_KIND, 'eos-dead-letter-quarantine-port');
  });

  it('EB16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new DeadLetterQuarantinePort();

    const res = await port.govern({
      planId: 'plan-eb-hold',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EB17: verifyTrail + disposition seal + auto-seal refuse + silent-drop deny', async () => {
    const port = new DeadLetterQuarantinePort();

    await port.govern({
      planId: 'plan-eb-trail-01',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine()
    });

    await port.govern({
      planId: 'plan-eb-trail-02',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch') || brokenTrail.error.includes('Invalid receipt'));

    const dispPort = new DeadLetterQuarantinePort();
    const dispRes = await dispPort.govern({
      planId: 'plan-eb-disposition',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ disposition: 'governed-quarantine-seal' })
    });
    assert.equal(dispRes.ok, true);
    assert.equal(dispRes.decision, 'PASS');
    assert.ok(dispRes.reason && dispRes.reason.includes('disposition'));
    assert.equal(dispRes.receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(dispRes.receipt.quarantineHold.governedSealOnly, true);
    assert.equal(dispRes.receipt.quarantineHold.liveBrokerWriteRefused, true);
    assert.equal(dispRes.receipt.quarantineHold.silentDropRefused, true);

    const autoSealRes = await dispPort.govern({
      planId: 'plan-eb-autoseal',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      quarantine: makeMockQuarantine()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EB_CODES.AUTO_SEAL_FORBIDDEN);

    const silentRes = await dispPort.govern({
      planId: 'plan-eb-silent',
      changeId: 'eos-ladder-34-mission-eb',
      ritualMode: 'ACTIVE',
      instruction: 'silent-drop the poison message',
      quarantine: makeMockQuarantine()
    });
    assert.equal(silentRes.ok, false);
    assert.equal(silentRes.code, EB_CODES.SILENT_DROP_FORBIDDEN);
  });
});
