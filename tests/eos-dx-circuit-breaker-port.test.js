/**
 * Mission DX — Sovereign Circuit Breaker & Resilient Fallback Port Test Suite.
 * SPEC-0134 / ADR-0110.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin d667c6b5 (do NOT rewrite tip pins)
 * - Soft-import DW consumer when present; optionally soft-observe DV outbox / DU publisher
 * - PASS = circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 * - NEVER reopen L30–L32; refuse L33 auto-close
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DX_PRODUCTION_READY,
  DX_RECEIPT_PRODUCTION_READY,
  DX_RECEIPT_KIND,
  DX_FREEZE_PIN_SHORT,
  buildCircuitBreakerReceipt,
  verifyCircuitBreakerReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/circuit-breaker-receipt.js';

import {
  CircuitBreakerPolicyGate,
  DX_CODES,
  DX_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsTipRewrite,
  isFundacionTarget
} from '../src/core/composition/circuit-breaker-policy-gate.js';

import {
  CircuitBreakerPort,
  DX_PORT_PRODUCTION_READY,
  DX_PORT_KIND,
  softObserveDwConsumer,
  softObserveDvOutbox,
  softObserveDuPublisher
} from '../src/core/composition/circuit-breaker-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeValidPlan(overrides = {}) {
  return {
    planId: 'plan-dx-valid',
    changeId: 'eos-ladder-33-mission-dx',
    ritualMode: 'ACTIVE',
    breakerId: 'breaker-orders',
    protectedOperation: 'consume-payment-event',
    failureThreshold: 3,
    cooldownMs: 1000,
    ...overrides
  };
}

describe('Mission DX — Circuit Breaker Receipt (SPEC-0134)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DX1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin d667c6b5', () => {
    assert.equal(DX_PRODUCTION_READY, 'NO');
    assert.equal(DX_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DX_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DX_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DX_FREEZE_PIN_SHORT, 'd667c6b5');
  });

  it('DX2: builds canonical nine-field sealed DX-RCPT-* with freeze soft-observe + ceiling hold + breaker hold', () => {
    const receipt = buildCircuitBreakerReceipt({
      planId: 'plan-dx-01',
      changeId: 'eos-ladder-33-mission-dx',
      decision: 'PASS',
      breakerRecord: { breakerId: 'breaker-orders', state: 'CLOSED' }
    });

    assert.equal(receipt.kind, DX_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DX-RCPT-'));
    assert.equal(receipt.operation, 'BREAKER_GOVERN');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'd667c6b5');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.breakerHold.failClosed, true);
    assert.equal(receipt.breakerHold.fallbackSealed, true);
    assert.equal(receipt.breakerHold.stateMachineSealed, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DX3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCircuitBreakerReceipt({
      planId: 'plan-dx-tamper',
      changeId: 'eos-ladder-33-mission-dx',
      decision: 'PASS'
    });

    assert.equal(verifyCircuitBreakerReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCircuitBreakerReceipt(tampered).ok, false);
  });
});

describe('Mission DX — Circuit Breaker Policy Gate (SPEC-0134)', () => {
  it('DX4: validates well-formed plan (planId+changeId+ACTIVE+breakerId+protectedOperation)', () => {
    const gate = new CircuitBreakerPolicyGate();

    const res = gate.evaluatePreconditions(makeValidPlan());

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DX_CODES.OK);
  });

  it('DX5: rejects missing breakerId or missing protectedOperation', () => {
    const gate = new CircuitBreakerPolicyGate();

    const resMissingBreaker = gate.evaluatePreconditions(
      makeValidPlan({ breakerId: null })
    );
    assert.equal(resMissingBreaker.ok, false);
    assert.equal(resMissingBreaker.decision, 'DENY');
    assert.equal(resMissingBreaker.code, DX_CODES.MISSING_BREAKER_ID);

    const resMissingOp = gate.evaluatePreconditions(
      makeValidPlan({ protectedOperation: '' })
    );
    assert.equal(resMissingOp.ok, false);
    assert.equal(resMissingOp.decision, 'DENY');
    assert.equal(resMissingOp.code, DX_CODES.MISSING_PROTECTED_OPERATION);
  });

  it('DX6: rejects invalid requestedState / failureThreshold / cooldownMs', () => {
    const gate = new CircuitBreakerPolicyGate();

    const resState = gate.evaluatePreconditions(
      makeValidPlan({ requestedState: 'MELTED' })
    );
    assert.equal(resState.ok, false);
    assert.equal(resState.code, DX_CODES.INVALID_BREAKER_STATE);

    const resThreshold = gate.evaluatePreconditions(
      makeValidPlan({ failureThreshold: 0 })
    );
    assert.equal(resThreshold.ok, false);
    assert.equal(resThreshold.code, DX_CODES.INVALID_THRESHOLD);

    const resCooldown = gate.evaluatePreconditions(
      makeValidPlan({ cooldownMs: -1 })
    );
    assert.equal(resCooldown.ok, false);
    assert.equal(resCooldown.code, DX_CODES.INVALID_COOLDOWN);
  });

  it('DX7: allows HOLD mode with zero mutations', () => {
    const gate = new CircuitBreakerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dx-hold',
      changeId: 'eos-ladder-33-mission-dx',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DX_CODES.HOLD);
  });

  it('DX8: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new CircuitBreakerPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dx-del1',
      changeId: 'eos-ladder-33-mission-dx',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DX_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dx-del2',
      changeId: 'eos-ladder-33-mission-dx',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DX_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DX9: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new CircuitBreakerPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dx-secret',
      changeId: 'eos-ladder-33-mission-dx',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DX_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DX10: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new CircuitBreakerPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dx-fundacion',
      changeId: 'eos-ladder-33-mission-dx',
      target: 'Documents/Fundacion/events'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DX_CODES.FUNDACION_DENIED);
  });

  it('DX11: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31/L32 reopen, L33 auto-close, mass prune, GHE', () => {
    const gate = new CircuitBreakerPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dx-pr',
      changeId: 'eos-ladder-33-mission-dx',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DX_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dx-l30',
      changeId: 'eos-ladder-33-mission-dx',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DX_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dx-l31',
      changeId: 'eos-ladder-33-mission-dx',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DX_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-dx-l32',
      changeId: 'eos-ladder-33-mission-dx',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, DX_CODES.L32_REOPEN_FORBIDDEN);

    const l33CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dx-l33-close',
      changeId: 'eos-ladder-33-mission-dx',
      instruction: 'auto-close ladder-33 now'
    });
    assert.equal(l33CloseRes.ok, false);
    assert.equal(l33CloseRes.code, DX_CODES.L33_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dx-tip',
      changeId: 'eos-ladder-33-mission-dx',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DX_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-dx-mass',
      changeId: 'eos-ladder-33-mission-dx',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, DX_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-dx-ghe',
      changeId: 'eos-ladder-33-mission-dx',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, DX_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(claimsTipRewrite('rewrite freeze tip'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission DX — Circuit Breaker Port (SPEC-0134)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DX12: govern happy path ACTIVE + breakerId + protectedOperation -> PASS + DX-RCPT-* CLOSED allow seal', async () => {
    const port = new CircuitBreakerPort();

    const res = await port.govern(
      makeValidPlan({
        planId: 'plan-dx-pass',
        outcome: 'SUCCESS'
      })
    );

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DX-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.breakerHold.failClosed, true);
    assert.equal(res.receipt.operation, 'BREAKER_ALLOW');
    assert.equal(res.receipt.breakerRecord.state, 'CLOSED');
    assert.equal(port.trail.length, 1);
    assert.equal(port.breakers.get('breaker-orders').state, 'CLOSED');
    assert.equal(DX_PORT_KIND, 'eos-circuit-breaker-port');
  });

  it('DX13: govern HOLD mode -> HOLD with zero breaker mutations', async () => {
    const port = new CircuitBreakerPort();

    const res = await port.govern({
      planId: 'plan-dx-hold',
      changeId: 'eos-ladder-33-mission-dx',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
    assert.equal(port.breakers.size, 0);
  });

  it('DX14: trip CLOSED→OPEN at failureThreshold; softObserveDw/Dv/Du soft-fail safe (accept true|false)', async () => {
    const port = new CircuitBreakerPort();
    const base = makeValidPlan({
      breakerId: 'breaker-trip',
      failureThreshold: 2,
      cooldownMs: 5000
    });

    await port.govern({ ...base, planId: 'plan-dx-trip-1', outcome: 'FAILURE' });
    assert.equal(port.breakers.get('breaker-trip').state, 'CLOSED');
    assert.equal(port.breakers.get('breaker-trip').failureCount, 1);

    const trip = await port.govern({ ...base, planId: 'plan-dx-trip-2', outcome: 'FAILURE' });
    assert.equal(trip.ok, true);
    assert.equal(trip.decision, 'PASS');
    assert.equal(trip.code, DX_CODES.BREAKER_TRIPPED);
    assert.equal(trip.receipt.operation, 'BREAKER_TRIP');
    assert.equal(trip.receipt.breakerRecord.state, 'OPEN');
    assert.equal(trip.receipt.fallbackRecord.applied, true);
    assert.equal(port.breakers.get('breaker-trip').state, 'OPEN');

    const dwObserve = await softObserveDwConsumer();
    assert.equal(typeof dwObserve.observed, 'boolean');
    // Soft-fail safe: absent → false; host with DW triad present → true. Never throws.
    // Lesson from DV15/DW14: do NOT assert observed===false only.
    assert.ok(dwObserve.observed === true || dwObserve.observed === false);

    const dvObserve = await softObserveDvOutbox();
    assert.equal(typeof dvObserve.observed, 'boolean');
    assert.ok(dvObserve.observed === true || dvObserve.observed === false);

    const duObserve = await softObserveDuPublisher();
    assert.equal(typeof duObserve.observed, 'boolean');
    assert.ok(duObserve.observed === true || duObserve.observed === false);
  });

  it('DX15: OPEN applies resilient fallback; cooldown → HALF_OPEN → SUCCESS probe → CLOSED', async () => {
    const port = new CircuitBreakerPort();
    const base = makeValidPlan({
      breakerId: 'breaker-cycle',
      failureThreshold: 1,
      cooldownMs: 100
    });

    // Trip immediately
    await port.govern({ ...base, planId: 'plan-dx-cycle-1', outcome: 'FAILURE', nowMs: 1000 });
    assert.equal(port.breakers.get('breaker-cycle').state, 'OPEN');

    // While OPEN before cooldown: fallback
    const fb = await port.govern({
      ...base,
      planId: 'plan-dx-cycle-2',
      nowMs: 1050,
      fallback: { strategy: 'CACHE_STALE' }
    });
    assert.equal(fb.ok, true);
    assert.equal(fb.code, DX_CODES.FALLBACK_APPLIED);
    assert.equal(fb.receipt.operation, 'BREAKER_FALLBACK');
    assert.equal(fb.receipt.fallbackRecord.strategy, 'CACHE_STALE');
    assert.equal(port.breakers.get('breaker-cycle').state, 'OPEN');

    // After cooldown: advance to HALF_OPEN then success probe → CLOSED
    const probe = await port.govern({
      ...base,
      planId: 'plan-dx-cycle-3',
      outcome: 'SUCCESS',
      nowMs: 1200
    });
    assert.equal(probe.ok, true);
    assert.equal(probe.receipt.operation, 'BREAKER_HALF_OPEN_PROBE');
    assert.equal(probe.receipt.breakerRecord.state, 'CLOSED');
    assert.equal(port.breakers.get('breaker-cycle').state, 'CLOSED');
  });

  it('DX16: verifyTrail validates cryptographic integrity; port refuses auto-seal without humanGateHeld', async () => {
    const port = new CircuitBreakerPort();

    await port.govern(
      makeValidPlan({
        planId: 'plan-dx-trail-01',
        breakerId: 'breaker-trail',
        outcome: 'SUCCESS'
      })
    );

    await port.govern({
      planId: 'plan-dx-trail-02',
      changeId: 'eos-ladder-33-mission-dx',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch'));

    const autoSealRes = await port.govern(
      makeValidPlan({
        planId: 'plan-dx-autoseal',
        breakerId: 'breaker-autoseal',
        autoSeal: true,
        humanGateHeld: false
      })
    );

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DX_CODES.AUTO_SEAL_FORBIDDEN);
  });

  it('DX17: PASS ≠ tip rewrite; DENY tip rewrite; compose DW/DV/DU fields on seal', async () => {
    const port = new CircuitBreakerPort();
    const messageRecord = {
      messageId: 'msg-compose-01',
      consumerId: 'consumer-orders',
      status: 'CONSUMED'
    };
    const domainEvent = {
      eventType: 'PaymentCaptured',
      aggregateId: 'agg-pay-001',
      payload: { amountCents: 1000 }
    };
    const outboxRecord = {
      outboxId: 'outbox-compose-01',
      payloadDigest: 'b'.repeat(64)
    };

    const tipDeny = await port.govern(
      makeValidPlan({
        planId: 'plan-dx-tipdeny',
        breakerId: 'breaker-tip',
        rewriteFreezeTip: true,
        messageRecord,
        domainEvent,
        outboxRecord
      })
    );
    assert.equal(tipDeny.ok, false);
    assert.equal(tipDeny.code, DX_CODES.TIP_REWRITE_FORBIDDEN);

    const pass = await port.govern(
      makeValidPlan({
        planId: 'plan-dx-compose',
        breakerId: 'breaker-compose',
        outcome: 'SUCCESS',
        messageRecord,
        domainEvent,
        outboxRecord
      })
    );
    assert.equal(pass.ok, true);
    assert.equal(pass.decision, 'PASS');
    assert.equal(pass.receipt.messageRecord.messageId, 'msg-compose-01');
    assert.equal(pass.receipt.domainEvent.eventType, 'PaymentCaptured');
    assert.equal(pass.receipt.outboxRecord.outboxId, 'outbox-compose-01');
    assert.equal(pass.receipt.productionReady, 'NO');
    assert.equal(pass.receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(pass.receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(pass.receipt.freezeObserve.l33AutoCloseRefused, true);
    assert.equal(typeof pass.receipt.dwComposeObserve.consumerObserved, 'boolean');
    assert.equal(typeof pass.receipt.dvComposeObserve.outboxObserved, 'boolean');
    assert.equal(typeof pass.receipt.duComposeObserve.publisherObserved, 'boolean');
  });
});
