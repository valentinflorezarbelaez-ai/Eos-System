/**
 * Mission FJ — Round-Trip Request-Reply Integrity Governance Port Test Suite.
 * SPEC-0172 / ADR-0156.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 78141c3d (do NOT rewrite tip pins)
 * - PASS = sealed round-trip request-reply integrity receipt ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FI/Canary
 * - NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 * - Hermetic injected requestReplyBinding only; soft-observe L39 request + L40 reply opaque refs
 * - Distinct from EY ingress registry, FD outbound registry, FI correlation registry
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FJ_PRODUCTION_READY,
  FJ_RECEIPT_PRODUCTION_READY,
  FJ_RECEIPT_KIND,
  FJ_FREEZE_PIN_SHORT,
  FJ_FREEZE_PIN,
  FJ_OPERATION,
  buildRoundTripRequestReplyIntegrityReceipt,
  verifyRoundTripRequestReplyIntegrityReceipt,
  canonicalRoundTripRequestReplyIntegritySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/round-trip-request-reply-integrity-receipt.js';

import {
  RoundTripRequestReplyIntegrityPolicyGate,
  FJ_CODES,
  FJ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/round-trip-request-reply-integrity-policy-gate.js';

import {
  RoundTripRequestReplyIntegrityPort,
  FJ_PORT_PRODUCTION_READY,
  FJ_PORT_KIND
} from '../src/core/composition/round-trip-request-reply-integrity-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-fj-1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    correlationId: 'corr-req-reply-1001',
    requestId: 'req-l39-2002',
    replyId: 'rep-l40-3003',
    requestDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    replyDigest: '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589',
    desiredIntegrity: 'MATCH',
    observedIntegrity: 'MATCH',
    roundTripLatencyMs: 42,
    maxAllowedLatencyMs: 100,
    authorized: true,
    ...overrides
  };
}

describe('Mission FJ — Round-Trip Request-Reply Integrity Receipt (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ-REC-01: Maintains PRODUCTION_READY=NO invariant', () => {
    assert.equal(FJ_PRODUCTION_READY, 'NO');
    assert.equal(FJ_RECEIPT_PRODUCTION_READY, 'NO');
  });

  it('FJ-REC-02: Builds valid sealed receipt with 9 canonical seal fields', () => {
    const binding = makeMockBinding();
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-test-1',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      requestReplyBinding: binding
    });

    assert.equal(receipt.kind, FJ_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.operation, FJ_OPERATION);
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.ok(receipt.receiptHash.length === 64);
    assert.equal(receipt.freezeObserve.pinShort, FJ_FREEZE_PIN_SHORT);
    assert.equal(receipt.freezeObserve.pin, FJ_FREEZE_PIN);

    const verifyResult = verifyRoundTripRequestReplyIntegrityReceipt(receipt);
    assert.equal(verifyResult.valid, true);
  });

  it('FJ-REC-03: Fails verification when receipt fields are tampered with', () => {
    const binding = makeMockBinding();
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-tamper',
      decision: 'PASS',
      requestReplyBinding: binding
    });

    const tampered = { ...receipt, decision: 'DENY' };
    const result = verifyRoundTripRequestReplyIntegrityReceipt(tampered);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'RECEIPT_HASH_MISMATCH');
  });
});

describe('Mission FJ — Policy Gate (SPEC-0172)', () => {
  let gate;

  beforeEach(() => {
    gate = new RoundTripRequestReplyIntegrityPolicyGate();
  });

  it('FJ-GATE-01: Passes preconditions for valid request-reply integrity claim', () => {
    const res = gate.evaluatePreconditions({
      planId: 'plan-valid',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding()
    });
    assert.equal(res.ok, true);
    assert.equal(res.code, FJ_CODES.OK);
  });

  it('FJ-GATE-02: Denies when planId or changeId is missing', () => {
    const res1 = gate.evaluatePreconditions({
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding()
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.code, FJ_CODES.MISSING_PLAN_ID);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-1',
      requestReplyBinding: makeMockBinding()
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.code, FJ_CODES.MISSING_CHANGE_ID);
  });

  it('FJ-GATE-03: Denies missing binding object or missing attributes', () => {
    const res1 = gate.evaluatePreconditions({
      planId: 'plan-1',
      changeId: 'eos-ladder-41-mission-fj'
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.code, FJ_CODES.MISSING_BINDING);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-1',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ correlationId: '' })
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.code, FJ_CODES.MISSING_CORRELATION_ID);
  });

  it('FJ-GATE-04: Denies unauthorized round-trip claims', () => {
    const res = gate.evaluatePreconditions({
      planId: 'plan-unauth',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ authorized: false })
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);
  });

  it('FJ-GATE-05: Denies payload mismatch and timeout claims', () => {
    const resMismatch = gate.evaluatePreconditions({
      planId: 'plan-mismatch',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ observedIntegrity: 'MISMATCH' })
    });
    assert.equal(resMismatch.ok, false);
    assert.equal(resMismatch.code, FJ_CODES.ROUND_TRIP_MISMATCH);

    const resTimeout = gate.evaluatePreconditions({
      planId: 'plan-timeout',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ observedIntegrity: 'TIMED_OUT' })
    });
    assert.equal(resTimeout.ok, false);
    assert.equal(resTimeout.code, FJ_CODES.ROUND_TRIP_TIMED_OUT);
  });

  it('FJ-GATE-06: Denies latency SLA threshold breaches', () => {
    const res = gate.evaluatePreconditions({
      planId: 'plan-latency-breach',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ roundTripLatencyMs: 150, maxAllowedLatencyMs: 100 })
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, FJ_CODES.LATENCY_EXCEEDED);
  });

  it('FJ-GATE-07: Refuses secret-looking fields under Law VI', () => {
    const secretInput = {
      planId: 'plan-secret',
      changeId: 'eos-ladder-41-mission-fj',
      secretKey: makeSyntheticSecret(),
      requestReplyBinding: makeMockBinding()
    };
    const res = gate.evaluatePreconditions(secretInput);
    assert.equal(res.ok, false);
    assert.equal(res.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
  });

  it('FJ-GATE-08: Refuses PRODUCTION_READY flip and prohibited actions', () => {
    assert.equal(claimsProductionReadyFlip({ productionReady: 'YES' }), true);
    assert.equal(claimsHardDelete({ hardDelete: true }), true);
    assert.equal(claimsMassPrune({ massPrune: true }), true);
    assert.equal(claimsSchemaJsonAdd({ addSchemaJson: true }), true);
    assert.equal(claimsLiveHttpEgress({ liveHttpEgress: true }), true);
    assert.equal(claimsWallClockAuthority({ wallClockAuthority: true }), true);
    assert.equal(isFundacionTarget({ target: 'Fundacion' }), true);

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-pr',
      changeId: 'eos-ladder-41-mission-fj',
      productionReady: 'YES',
      requestReplyBinding: makeMockBinding()
    });
    assert.equal(resPR.ok, false);
    assert.equal(resPR.code, FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  });
});

describe('Mission FJ — Request-Reply Integrity Governance Port (SPEC-0172)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new RoundTripRequestReplyIntegrityPort();
  });

  it('FJ-PORT-01: Maintains FJ_PORT_PRODUCTION_READY=NO', () => {
    assert.equal(FJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(port.productionReady, 'NO');
  });

  it('FJ-PORT-02: Successfully governs valid request-reply integrity ritual and chains receipt', async () => {
    const res = await port.govern({
      planId: 'plan-pass-1',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding()
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.receipt.decision, 'PASS');
    assert.equal(res.receipt.requestReplyBinding.status, 'BOUND_MATCH');

    const chainResult = port.verifyChain();
    assert.equal(chainResult.valid, true);
    assert.equal(chainResult.count, 1);
  });

  it('FJ-PORT-03: Multi-step ritual correctly chains prevReceiptHash', async () => {
    await port.govern({
      planId: 'plan-pass-1',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ correlationId: 'corr-1' })
    });

    await port.govern({
      planId: 'plan-pass-2',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ correlationId: 'corr-2' })
    });

    const chainResult = port.verifyChain();
    assert.equal(chainResult.valid, true);
    assert.equal(chainResult.count, 2);
    assert.equal(port.trail[1].prevReceiptHash, port.trail[0].receiptHash);
  });

  it('FJ-PORT-04: Returns DENY decision receipt when gate fails', async () => {
    const res = await port.govern({
      planId: 'plan-unauth',
      changeId: 'eos-ladder-41-mission-fj',
      requestReplyBinding: makeMockBinding({ authorized: false })
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);
    assert.equal(res.receipt.decision, 'DENY');

    const chainResult = port.verifyChain();
    assert.equal(chainResult.valid, true);
  });
});
