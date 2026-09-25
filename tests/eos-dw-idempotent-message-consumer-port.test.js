/**
 * Mission DW — Autonomous Idempotent Message Consumer Port Test Suite.
 * SPEC-0133 / ADR-0109.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin b485ae0b (do NOT rewrite tip pins)
 * - Soft-import DV outbox observe when present; optionally soft-observe DU publisher
 * - PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 * - NEVER reopen L30–L32; refuse L33 auto-close
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DW_PRODUCTION_READY,
  DW_RECEIPT_PRODUCTION_READY,
  DW_RECEIPT_KIND,
  DW_FREEZE_PIN_SHORT,
  buildIdempotentMessageConsumerReceipt,
  verifyIdempotentMessageConsumerReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/idempotent-message-consumer-receipt.js';

import {
  IdempotentMessageConsumerPolicyGate,
  DW_CODES,
  DW_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsTipRewrite,
  isFundacionTarget
} from '../src/core/composition/idempotent-message-consumer-policy-gate.js';

import {
  IdempotentMessageConsumerPort,
  DW_PORT_PRODUCTION_READY,
  DW_PORT_KIND,
  softObserveDvOutbox,
  softObserveDuPublisher
} from '../src/core/composition/idempotent-message-consumer-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockMessage(overrides = {}) {
  return {
    messageId: 'msg-001',
    payload: {
      orderId: 'ord-001',
      totalCents: 4200,
      currency: 'USD'
    },
    occurredAt: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DW — Idempotent Message Consumer Receipt (SPEC-0133)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DW1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin b485ae0b', () => {
    assert.equal(DW_PRODUCTION_READY, 'NO');
    assert.equal(DW_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DW_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DW_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DW_FREEZE_PIN_SHORT, 'b485ae0b');
  });

  it('DW2: builds canonical nine-field sealed DW-RCPT-* with freeze soft-observe + ceiling hold + consume hold', () => {
    const receipt = buildIdempotentMessageConsumerReceipt({
      planId: 'plan-dw-01',
      changeId: 'eos-ladder-33-mission-dw',
      decision: 'PASS',
      messageRecord: makeMockMessage()
    });

    assert.equal(receipt.kind, DW_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DW-RCPT-'));
    assert.equal(receipt.operation, 'MESSAGE_CONSUME_DEDUPE_REPLAY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'b485ae0b');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.consumeHold.consumeSealed, true);
    assert.equal(receipt.consumeHold.dedupeSealed, true);
    assert.equal(receipt.consumeHold.replayProtected, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DW3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildIdempotentMessageConsumerReceipt({
      planId: 'plan-dw-tamper',
      changeId: 'eos-ladder-33-mission-dw',
      decision: 'PASS'
    });

    assert.equal(verifyIdempotentMessageConsumerReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyIdempotentMessageConsumerReceipt(tampered).ok, false);
  });
});

describe('Mission DW — Idempotent Message Consumer Policy Gate (SPEC-0133)', () => {
  it('DW4: validates well-formed plan (planId+changeId+ACTIVE+message+consumerId)', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dw-valid',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      consumerId: 'consumer-orders',
      message: makeMockMessage()
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DW_CODES.OK);
  });

  it('DW5: rejects missing message or invalid message shape', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dw-nomsg',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DW_CODES.MISSING_MESSAGE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dw-badmsg',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DW_CODES.INVALID_MESSAGE);
  });

  it('DW6: rejects missing messageId / empty payload / missing consumerId', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-dw-noid',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, DW_CODES.MISSING_MESSAGE_ID);

    const resPayload = gate.evaluatePreconditions({
      planId: 'plan-dw-emptypayload',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ payload: {} })
    });
    assert.equal(resPayload.ok, false);
    assert.equal(resPayload.code, DW_CODES.EMPTY_MESSAGE_PAYLOAD);

    const resConsumer = gate.evaluatePreconditions({
      planId: 'plan-dw-noconsumer',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      message: makeMockMessage()
    });
    assert.equal(resConsumer.ok, false);
    assert.equal(resConsumer.code, DW_CODES.MISSING_CONSUMER_ID);
  });

  it('DW7: allows HOLD mode with zero mutations', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dw-hold',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DW_CODES.HOLD);
  });

  it('DW8: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dw-del1',
      changeId: 'eos-ladder-33-mission-dw',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DW_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dw-del2',
      changeId: 'eos-ladder-33-mission-dw',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DW_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DW9: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dw-secret',
      changeId: 'eos-ladder-33-mission-dw',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DW_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DW10: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dw-fundacion',
      changeId: 'eos-ladder-33-mission-dw',
      target: 'Documents/Fundacion/events'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DW_CODES.FUNDACION_DENIED);
  });

  it('DW11: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31/L32 reopen, L33 auto-close, mass prune, GHE', () => {
    const gate = new IdempotentMessageConsumerPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dw-pr',
      changeId: 'eos-ladder-33-mission-dw',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DW_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dw-l30',
      changeId: 'eos-ladder-33-mission-dw',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DW_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dw-l31',
      changeId: 'eos-ladder-33-mission-dw',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DW_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-dw-l32',
      changeId: 'eos-ladder-33-mission-dw',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, DW_CODES.L32_REOPEN_FORBIDDEN);

    const l33CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dw-l33-close',
      changeId: 'eos-ladder-33-mission-dw',
      instruction: 'auto-close ladder-33 now'
    });
    assert.equal(l33CloseRes.ok, false);
    assert.equal(l33CloseRes.code, DW_CODES.L33_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dw-tip',
      changeId: 'eos-ladder-33-mission-dw',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DW_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-dw-mass',
      changeId: 'eos-ladder-33-mission-dw',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, DW_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-dw-ghe',
      changeId: 'eos-ladder-33-mission-dw',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, DW_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission DW — Idempotent Message Consumer Port (SPEC-0133)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DW12: govern happy path ACTIVE + message + consumerId -> PASS + DW-RCPT-* consume/dedupe/replay seal', async () => {
    const port = new IdempotentMessageConsumerPort();
    const message = makeMockMessage({ messageId: 'msg-pass-01' });

    const res = await port.govern({
      planId: 'plan-dw-pass',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DW-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.consumeHold.replayProtected, true);
    assert.equal(res.receipt.operation, 'MESSAGE_CONSUME_DEDUPE_REPLAY');
    assert.equal(res.receipt.messageRecord.status, 'CONSUMED');
    assert.equal(port.trail.length, 1);
    assert.equal(port.store.get('consumer-orders::msg-pass-01').status, 'CONSUMED');
    assert.equal(DW_PORT_KIND, 'eos-idempotent-message-consumer-port');
  });

  it('DW13: govern HOLD mode -> HOLD with zero store mutations', async () => {
    const port = new IdempotentMessageConsumerPort();

    const res = await port.govern({
      planId: 'plan-dw-hold',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
    assert.equal(port.store.size, 0);
  });

  it('DW14: idempotent re-consume same digest → DEDUPLICATED; softObserveDvOutbox / softObserveDuPublisher soft-fail safe', async () => {
    const port = new IdempotentMessageConsumerPort();
    const message = makeMockMessage({ messageId: 'msg-dedupe-01' });

    await port.govern({
      planId: 'plan-dw-dedupe-1',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message
    });
    const second = await port.govern({
      planId: 'plan-dw-dedupe-2',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message
    });

    assert.equal(second.ok, true);
    assert.equal(second.decision, 'PASS');
    assert.equal(second.receipt.operation, 'MESSAGE_DEDUPE');
    assert.equal(port.store.get('consumer-orders::msg-dedupe-01').status, 'DEDUPLICATED');
    assert.equal(port.store.get('consumer-orders::msg-dedupe-01').attempts, 2);
    assert.equal(port.store.get('consumer-orders::msg-dedupe-01').replayProtected, true);

    const dvObserve = await softObserveDvOutbox();
    assert.equal(typeof dvObserve.observed, 'boolean');
    // Soft-fail safe: absent → false; host with DV triad present → true. Never throws.
    // Lesson from DV15 host failure: do NOT assert observed===false only.
    assert.ok(dvObserve.observed === true || dvObserve.observed === false);

    const duObserve = await softObserveDuPublisher();
    assert.equal(typeof duObserve.observed, 'boolean');
    assert.ok(duObserve.observed === true || duObserve.observed === false);
  });

  it('DW15: replay protection DENY when same key has different payloadDigest', async () => {
    const port = new IdempotentMessageConsumerPort();

    await port.govern({
      planId: 'plan-dw-replay-1',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-replay-01', payload: { v: 1 } })
    });

    const replay = await port.govern({
      planId: 'plan-dw-replay-2',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-replay-01', payload: { v: 2 } })
    });

    assert.equal(replay.ok, false);
    assert.equal(replay.decision, 'DENY');
    assert.equal(replay.code, DW_CODES.REPLAY_REJECTED);
    assert.equal(replay.receipt.operation, 'MESSAGE_REPLAY_PROTECT');
    assert.equal(replay.receipt.messageRecord.status, 'REPLAY_REJECTED');
  });

  it('DW16: verifyTrail validates cryptographic integrity; port refuses auto-seal without humanGateHeld', async () => {
    const port = new IdempotentMessageConsumerPort();

    await port.govern({
      planId: 'plan-dw-trail-01',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-trail-01' })
    });

    await port.govern({
      planId: 'plan-dw-trail-02',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch'));

    const autoSealRes = await port.govern({
      planId: 'plan-dw-autoseal',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-autoseal' })
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DW_CODES.AUTO_SEAL_FORBIDDEN);
  });

  it('DW17: PASS ≠ tip rewrite; DENY tip rewrite; compose DV outbox / DU domainEvent fields on seal', async () => {
    const port = new IdempotentMessageConsumerPort();
    const domainEvent = {
      eventType: 'PaymentCaptured',
      aggregateId: 'agg-pay-001',
      payload: { amountCents: 1000 }
    };
    const outboxRecord = {
      outboxId: 'outbox-compose-01',
      payloadDigest: 'b'.repeat(64)
    };

    const tipDeny = await port.govern({
      planId: 'plan-dw-tipdeny',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      rewriteFreezeTip: true,
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-tip' }),
      domainEvent,
      outboxRecord
    });
    assert.equal(tipDeny.ok, false);
    assert.equal(tipDeny.code, DW_CODES.TIP_REWRITE_FORBIDDEN);

    const pass = await port.govern({
      planId: 'plan-dw-compose',
      changeId: 'eos-ladder-33-mission-dw',
      ritualMode: 'ACTIVE',
      consumerId: 'consumer-orders',
      message: makeMockMessage({ messageId: 'msg-compose' }),
      domainEvent,
      outboxRecord
    });
    assert.equal(pass.ok, true);
    assert.equal(pass.decision, 'PASS');
    assert.equal(pass.receipt.domainEvent.eventType, 'PaymentCaptured');
    assert.equal(pass.receipt.outboxRecord.outboxId, 'outbox-compose-01');
    assert.equal(pass.receipt.productionReady, 'NO');
    assert.equal(pass.receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(pass.receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(pass.receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(typeof pass.receipt.dvComposeObserve.outboxObserved, 'boolean');
    assert.equal(typeof pass.receipt.duComposeObserve.publisherObserved, 'boolean');
  });
});
