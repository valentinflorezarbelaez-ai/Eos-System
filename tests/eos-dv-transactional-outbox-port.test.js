/**
 * Mission DV — Transactional Resilient Outbox Pattern Port Test Suite.
 * SPEC-0132 / ADR-0108.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin cd1512a9 (do NOT rewrite tip pins)
 * - Soft-import DU publisher observe when present; compose DU events
 * - PASS = outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite
 * - NEVER reopen L30–L32; refuse L33 auto-close
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DV_PRODUCTION_READY,
  DV_RECEIPT_PRODUCTION_READY,
  DV_RECEIPT_KIND,
  DV_FREEZE_PIN_SHORT,
  buildTransactionalOutboxReceipt,
  verifyTransactionalOutboxReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/transactional-outbox-receipt.js';

import {
  TransactionalOutboxPolicyGate,
  DV_CODES,
  DV_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsTipRewrite,
  isFundacionTarget
} from '../src/core/composition/transactional-outbox-policy-gate.js';

import {
  TransactionalOutboxPort,
  DV_PORT_PRODUCTION_READY,
  DV_PORT_KIND,
  softObserveDuPublisher
} from '../src/core/composition/transactional-outbox-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockDomainEvent(overrides = {}) {
  return {
    eventType: 'OrderPlaced',
    aggregateId: 'agg-order-001',
    aggregateType: 'Order',
    payload: {
      orderId: 'ord-001',
      totalCents: 4200,
      currency: 'USD'
    },
    occurredAt: new Date().toISOString(),
    ...overrides
  };
}

function makeMockOutboxRecord(overrides = {}) {
  return {
    outboxId: 'outbox-001',
    payloadDigest: 'a'.repeat(64),
    ...overrides
  };
}

describe('Mission DV — Transactional Outbox Receipt (SPEC-0132)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DV1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin cd1512a9', () => {
    assert.equal(DV_PRODUCTION_READY, 'NO');
    assert.equal(DV_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DV_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DV_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DV_FREEZE_PIN_SHORT, 'cd1512a9');
  });

  it('DV2: builds canonical nine-field sealed DV-RCPT-* with freeze soft-observe + ceiling hold + outbox hold', () => {
    const receipt = buildTransactionalOutboxReceipt({
      planId: 'plan-dv-01',
      changeId: 'eos-ladder-33-mission-dv',
      decision: 'PASS',
      domainEvent: makeMockDomainEvent(),
      outboxRecord: makeMockOutboxRecord()
    });

    assert.equal(receipt.kind, DV_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DV-RCPT-'));
    assert.equal(receipt.operation, 'OUTBOX_PERSIST_DISPATCH');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'cd1512a9');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.outboxHold.persistSealed, true);
    assert.equal(receipt.outboxHold.dispatchSealed, true);
    assert.equal(receipt.outboxHold.atLeastOnce, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DV3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildTransactionalOutboxReceipt({
      planId: 'plan-dv-tamper',
      changeId: 'eos-ladder-33-mission-dv',
      decision: 'PASS'
    });

    assert.equal(verifyTransactionalOutboxReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyTransactionalOutboxReceipt(tampered).ok, false);
  });
});

describe('Mission DV — Transactional Outbox Policy Gate (SPEC-0132)', () => {
  it('DV4: validates well-formed plan (planId+changeId+ACTIVE+domainEvent+outboxRecord)', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dv-valid',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      domainEvent: makeMockDomainEvent(),
      outboxRecord: makeMockOutboxRecord()
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DV_CODES.OK);
  });

  it('DV5: rejects missing domainEvent or invalid event type', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dv-noevent',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: null,
      outboxRecord: makeMockOutboxRecord()
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DV_CODES.MISSING_DOMAIN_EVENT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dv-invalidevent',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: 'not-an-object',
      outboxRecord: makeMockOutboxRecord()
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DV_CODES.INVALID_DOMAIN_EVENT);
  });

  it('DV6: rejects missing eventType / aggregateId / empty payload', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const resType = gate.evaluatePreconditions({
      planId: 'plan-dv-notype',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ eventType: '' }),
      outboxRecord: makeMockOutboxRecord()
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, DV_CODES.MISSING_EVENT_TYPE);

    const resAgg = gate.evaluatePreconditions({
      planId: 'plan-dv-noagg',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ aggregateId: '   ' }),
      outboxRecord: makeMockOutboxRecord()
    });
    assert.equal(resAgg.ok, false);
    assert.equal(resAgg.code, DV_CODES.MISSING_AGGREGATE_ID);

    const resPayload = gate.evaluatePreconditions({
      planId: 'plan-dv-emptypayload',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ payload: {} }),
      outboxRecord: makeMockOutboxRecord()
    });
    assert.equal(resPayload.ok, false);
    assert.equal(resPayload.code, DV_CODES.EMPTY_EVENT_PAYLOAD);
  });

  it('DV7: rejects missing / invalid outboxRecord or missing outboxId', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dv-nooutbox',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent()
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, DV_CODES.MISSING_OUTBOX_RECORD);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dv-badoutbox',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent(),
      outboxRecord: 'not-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, DV_CODES.INVALID_OUTBOX_RECORD);

    const resId = gate.evaluatePreconditions({
      planId: 'plan-dv-noid',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent(),
      outboxRecord: { outboxId: '' }
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, DV_CODES.MISSING_OUTBOX_ID);
  });

  it('DV8: allows HOLD mode with zero mutations', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dv-hold',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DV_CODES.HOLD);
  });

  it('DV9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dv-del1',
      changeId: 'eos-ladder-33-mission-dv',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DV_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dv-del2',
      changeId: 'eos-ladder-33-mission-dv',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DV_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DV10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new TransactionalOutboxPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dv-secret',
      changeId: 'eos-ladder-33-mission-dv',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DV_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DV11: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dv-fundacion',
      changeId: 'eos-ladder-33-mission-dv',
      target: 'Documents/Fundacion/events'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DV_CODES.FUNDACION_DENIED);
  });

  it('DV12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31/L32 reopen, L33 auto-close, mass prune, GHE', () => {
    const gate = new TransactionalOutboxPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dv-pr',
      changeId: 'eos-ladder-33-mission-dv',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DV_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dv-l30',
      changeId: 'eos-ladder-33-mission-dv',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DV_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dv-l31',
      changeId: 'eos-ladder-33-mission-dv',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DV_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-dv-l32',
      changeId: 'eos-ladder-33-mission-dv',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, DV_CODES.L32_REOPEN_FORBIDDEN);

    const l33CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dv-l33-close',
      changeId: 'eos-ladder-33-mission-dv',
      instruction: 'auto-close ladder-33 now'
    });
    assert.equal(l33CloseRes.ok, false);
    assert.equal(l33CloseRes.code, DV_CODES.L33_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dv-tip',
      changeId: 'eos-ladder-33-mission-dv',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DV_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-dv-mass',
      changeId: 'eos-ladder-33-mission-dv',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, DV_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-dv-ghe',
      changeId: 'eos-ladder-33-mission-dv',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, DV_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission DV — Transactional Outbox Port (SPEC-0132)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DV13: govern happy path ACTIVE + domainEvent + outboxRecord -> PASS + DV-RCPT-* persist/dispatch seal', async () => {
    const port = new TransactionalOutboxPort();
    const domainEvent = makeMockDomainEvent();
    const outboxRecord = makeMockOutboxRecord({ outboxId: 'outbox-pass-01' });

    const res = await port.govern({
      planId: 'plan-dv-pass',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent,
      outboxRecord
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DV-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.outboxHold.atLeastOnce, true);
    assert.equal(res.receipt.operation, 'OUTBOX_PERSIST_DISPATCH');
    assert.equal(res.receipt.outboxRecord.status, 'DISPATCHED');
    assert.equal(port.trail.length, 1);
    assert.equal(port.store.get('outbox-pass-01').status, 'DISPATCHED');
    assert.equal(DV_PORT_KIND, 'eos-transactional-outbox-port');
  });

  it('DV14: govern HOLD mode -> HOLD with zero store mutations', async () => {
    const port = new TransactionalOutboxPort();

    const res = await port.govern({
      planId: 'plan-dv-hold',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
    assert.equal(port.store.size, 0);
  });

  it('DV15: at-least-once re-dispatch increments attempts; softObserveDuPublisher is soft-fail safe', async () => {
    const port = new TransactionalOutboxPort();
    const domainEvent = makeMockDomainEvent();
    const outboxRecord = makeMockOutboxRecord({ outboxId: 'outbox-retry-01' });

    await port.govern({
      planId: 'plan-dv-retry-1',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent,
      outboxRecord
    });
    await port.govern({
      planId: 'plan-dv-retry-2',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent,
      outboxRecord
    });

    assert.equal(port.store.get('outbox-retry-01').attempts, 2);
    assert.equal(port.store.get('outbox-retry-01').atLeastOnce, true);

    const observe = await softObserveDuPublisher();
    assert.equal(typeof observe.observed, 'boolean');
    // Soft-fail safe: absent → false; host with DU triad present → true. Never throws.
    assert.ok(observe.observed === true || observe.observed === false);
  });

  it('DV16: verifyTrail validates cryptographic integrity; port refuses auto-seal without humanGateHeld', async () => {
    const port = new TransactionalOutboxPort();

    await port.govern({
      planId: 'plan-dv-trail-01',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent(),
      outboxRecord: makeMockOutboxRecord({ outboxId: 'outbox-trail-01' })
    });

    await port.govern({
      planId: 'plan-dv-trail-02',
      changeId: 'eos-ladder-33-mission-dv',
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
      planId: 'plan-dv-autoseal',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      domainEvent: makeMockDomainEvent(),
      outboxRecord: makeMockOutboxRecord({ outboxId: 'outbox-autoseal' })
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DV_CODES.AUTO_SEAL_FORBIDDEN);
  });

  it('DV17: PASS ≠ tip rewrite; DENY tip rewrite; compose DU domainEvent fields on seal', async () => {
    const port = new TransactionalOutboxPort();
    const domainEvent = makeMockDomainEvent({ eventType: 'PaymentCaptured' });

    const tipDeny = await port.govern({
      planId: 'plan-dv-tipdeny',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      rewriteFreezeTip: true,
      domainEvent,
      outboxRecord: makeMockOutboxRecord({ outboxId: 'outbox-tip' })
    });
    assert.equal(tipDeny.ok, false);
    assert.equal(tipDeny.code, DV_CODES.TIP_REWRITE_FORBIDDEN);

    const pass = await port.govern({
      planId: 'plan-dv-compose',
      changeId: 'eos-ladder-33-mission-dv',
      ritualMode: 'ACTIVE',
      domainEvent,
      outboxRecord: makeMockOutboxRecord({ outboxId: 'outbox-compose' })
    });
    assert.equal(pass.ok, true);
    assert.equal(pass.decision, 'PASS');
    assert.equal(pass.receipt.domainEvent.eventType, 'PaymentCaptured');
    assert.equal(pass.receipt.productionReady, 'NO');
    assert.equal(pass.receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(pass.receipt.freezeObserve.productionReadyFlipRefused, true);
  });
});
