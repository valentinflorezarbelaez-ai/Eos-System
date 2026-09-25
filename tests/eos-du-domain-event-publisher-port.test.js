/**
 * Mission DU — Sovereign Pure Domain Event Publisher Port Test Suite.
 * SPEC-0131 / ADR-0107.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin b205ce8c (do NOT rewrite tip pins)
 * - PASS = sealed domain event publish ≠ outbox dispatch (DV later) ≠ PRODUCTION_READY
 * - NEVER reopen L30–L32; refuse L33 auto-close
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DU_PRODUCTION_READY,
  DU_RECEIPT_PRODUCTION_READY,
  DU_RECEIPT_KIND,
  DU_FREEZE_PIN_SHORT,
  buildDomainEventPublisherReceipt,
  verifyDomainEventPublisherReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/domain-event-publisher-receipt.js';

import {
  DomainEventPublisherPolicyGate,
  DU_CODES,
  DU_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/domain-event-publisher-policy-gate.js';

import {
  DomainEventPublisherPort,
  DU_PORT_PRODUCTION_READY,
  DU_PORT_KIND
} from '../src/core/composition/domain-event-publisher-port.js';

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

describe('Mission DU — Domain Event Publisher Receipt (SPEC-0131)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DU1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin b205ce8c', () => {
    assert.equal(DU_PRODUCTION_READY, 'NO');
    assert.equal(DU_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DU_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DU_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DU_FREEZE_PIN_SHORT, 'b205ce8c');
  });

  it('DU2: builds canonical nine-field sealed DU-RCPT-* with freeze soft-observe + ceiling hold + publish hold', () => {
    const receipt = buildDomainEventPublisherReceipt({
      planId: 'plan-du-01',
      changeId: 'eos-ladder-33-mission-du',
      decision: 'PASS',
      domainEvent: makeMockDomainEvent()
    });

    assert.equal(receipt.kind, DU_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DU-RCPT-'));
    assert.equal(receipt.operation, 'DOMAIN_EVENT_PUBLISH');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'b205ce8c');
    assert.equal(receipt.freezeObserve.outboxDispatchRefused, true);
    assert.equal(receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.publishHold.purePublishOnly, true);
    assert.equal(receipt.publishHold.outboxDispatchDeferred, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DU3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildDomainEventPublisherReceipt({
      planId: 'plan-du-tamper',
      changeId: 'eos-ladder-33-mission-du',
      decision: 'PASS'
    });

    assert.equal(verifyDomainEventPublisherReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyDomainEventPublisherReceipt(tampered).ok, false);
  });
});

describe('Mission DU — Domain Event Publisher Policy Gate (SPEC-0131)', () => {
  it('DU4: validates well-formed plan (planId+changeId+ACTIVE+valid domainEvent)', () => {
    const gate = new DomainEventPublisherPolicyGate();
    const domainEvent = makeMockDomainEvent();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-valid',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      domainEvent
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DU_CODES.OK);
  });

  it('DU5: rejects missing domainEvent or invalid event type', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-du-noevent',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DU_CODES.MISSING_DOMAIN_EVENT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-du-invalidevent',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DU_CODES.INVALID_DOMAIN_EVENT);
  });

  it('DU6: rejects missing eventType', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-notype',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ eventType: '' })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DU_CODES.MISSING_EVENT_TYPE);
  });

  it('DU7: rejects missing aggregateId', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-noagg',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ aggregateId: '   ' })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DU_CODES.MISSING_AGGREGATE_ID);
  });

  it('DU8: rejects empty event payload', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-emptypayload',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent({ payload: {} })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DU_CODES.EMPTY_EVENT_PAYLOAD);
  });

  it('DU9: rejects outbox dispatch claims (DV later)', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const resFlag = gate.evaluatePreconditions({
      planId: 'plan-du-outbox-flag',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      dispatchOutbox: true,
      domainEvent: makeMockDomainEvent()
    });
    assert.equal(resFlag.ok, false);
    assert.equal(resFlag.decision, 'DENY');
    assert.equal(resFlag.code, DU_CODES.OUTBOX_DISPATCH_FORBIDDEN);

    const resText = gate.evaluatePreconditions({
      planId: 'plan-du-outbox-text',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      instruction: 'please execute outbox dispatch now',
      domainEvent: makeMockDomainEvent()
    });
    assert.equal(resText.ok, false);
    assert.equal(resText.code, DU_CODES.OUTBOX_DISPATCH_FORBIDDEN);
  });

  it('DU10: allows HOLD mode with zero mutations', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-hold',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DU_CODES.HOLD);
  });

  it('DU11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-du-del1',
      changeId: 'eos-ladder-33-mission-du',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DU_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-du-del2',
      changeId: 'eos-ladder-33-mission-du',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DU_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DU12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new DomainEventPublisherPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-secret',
      changeId: 'eos-ladder-33-mission-du',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DU_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DU13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-du-fundacion',
      changeId: 'eos-ladder-33-mission-du',
      target: 'Documents/Fundacion/events'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DU_CODES.FUNDACION_DENIED);
  });

  it('DU14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31/L32 reopen, L33 auto-close, mass prune, GHE', () => {
    const gate = new DomainEventPublisherPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-du-pr',
      changeId: 'eos-ladder-33-mission-du',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DU_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-du-l30',
      changeId: 'eos-ladder-33-mission-du',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DU_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-du-l31',
      changeId: 'eos-ladder-33-mission-du',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DU_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-du-l32',
      changeId: 'eos-ladder-33-mission-du',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, DU_CODES.L32_REOPEN_FORBIDDEN);

    const l33CloseRes = gate.evaluatePreconditions({
      planId: 'plan-du-l33-close',
      changeId: 'eos-ladder-33-mission-du',
      instruction: 'auto-close ladder-33 now'
    });
    assert.equal(l33CloseRes.ok, false);
    assert.equal(l33CloseRes.code, DU_CODES.L33_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-du-tip',
      changeId: 'eos-ladder-33-mission-du',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DU_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-du-mass',
      changeId: 'eos-ladder-33-mission-du',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, DU_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-du-ghe',
      changeId: 'eos-ladder-33-mission-du',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, DU_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission DU — Domain Event Publisher Port (SPEC-0131)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DU15: govern happy path ACTIVE + valid domainEvent -> PASS + DU-RCPT-* (≠ outbox dispatch)', async () => {
    const port = new DomainEventPublisherPort();
    const domainEvent = makeMockDomainEvent();

    const res = await port.govern({
      planId: 'plan-du-pass',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DU-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.publishHold.outboxDispatchDeferred, true);
    assert.equal(res.receipt.freezeObserve.outboxDispatchRefused, true);
    assert.equal(port.trail.length, 1);
    assert.equal(DU_PORT_KIND, 'eos-domain-event-publisher-port');
  });

  it('DU16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new DomainEventPublisherPort();

    const res = await port.govern({
      planId: 'plan-du-hold',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DU17: verifyTrail validates cryptographic integrity; port refuses auto-seal without humanGateHeld; DENY on outbox', async () => {
    const port = new DomainEventPublisherPort();

    await port.govern({
      planId: 'plan-du-trail-01',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      domainEvent: makeMockDomainEvent()
    });

    await port.govern({
      planId: 'plan-du-trail-02',
      changeId: 'eos-ladder-33-mission-du',
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
      planId: 'plan-du-autoseal',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      domainEvent: makeMockDomainEvent()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DU_CODES.AUTO_SEAL_FORBIDDEN);

    const outboxRes = await port.govern({
      planId: 'plan-du-outbox',
      changeId: 'eos-ladder-33-mission-du',
      ritualMode: 'ACTIVE',
      outboxDispatch: true,
      domainEvent: makeMockDomainEvent()
    });
    assert.equal(outboxRes.ok, false);
    assert.equal(outboxRes.code, DU_CODES.OUTBOX_DISPATCH_FORBIDDEN);
  });
});
