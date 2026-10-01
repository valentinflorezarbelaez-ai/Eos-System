/**
 * Mission FJ — Round-Trip / Request-Reply Integrity Governance Port Test Suite.
 * SPEC-0172 / ADR-0156.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields)
 * - Soft-observe freeze pin 78141c3d (do NOT rewrite tip pins)
 * - PASS = sealed round-trip integrity ≠ tip-refresh ≠ PRODUCTION_READY
 * - Composes on a verified Mission FI PASS receipt
 * - NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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
  FJ_POLICY_GATE_PRODUCTION_READY
} from '../src/core/composition/round-trip-request-reply-integrity-policy-gate.js';

import {
  RoundTripRequestReplyIntegrityPort,
  FJ_PORT_PRODUCTION_READY,
  FJ_PORT_KIND
} from '../src/core/composition/round-trip-request-reply-integrity-port.js';

import {
  buildBidirectionalDeliveryCorrelationRegistryReceipt,
  computeCorrelationDigest,
  _resetReceiptSeqForTests as _resetFiReceiptSeqForTests
} from '../src/core/composition/bidirectional-delivery-correlation-registry-receipt.js';

import {
  findSecretLookingField,
  scanForSecrets
} from '../src/core/composition/bidirectional-delivery-correlation-registry-policy-gate.js';

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeBinding(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fj-demo-001',
    bindingId: 'bind-opaque-fj-demo-001',
    ingressId: 'ing-opaque-ey-demo-001',
    sourceId: 'src-opaque-ey-demo-001',
    targetId: 'tgt-opaque-fd-demo-001',
    deliveryId: 'dlv-opaque-fd-demo-001',
    correlationClass: 'bidirectional-delivery-correlation',
    bindingClass: 'bidirectional-delivery-correlation',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function makeRoundTrip(overrides = {}) {
  const binding = makeBinding();
  const correlationDigest = computeCorrelationDigest(binding);
  return {
    ...binding,
    requestRef: 'req-opaque-fj-001',
    replyRef: 'rep-opaque-fj-001',
    requestDigest: sha('request-meta-opaque'),
    replyDigest: sha('reply-meta-opaque'),
    correlationDigest,
    desiredIntegrity: 'INTACT',
    observedIntegrity: 'INTACT',
    ...overrides
  };
}

function makeFiPass(binding = makeBinding()) {
  return buildBidirectionalDeliveryCorrelationRegistryReceipt({
    planId: 'plan-fi-for-fj',
    changeId: 'eos-ladder-41-mission-fi',
    decision: 'PASS',
    binding
  });
}

function basePlan(overrides = {}) {
  const binding = makeBinding();
  const fiReceipt = makeFiPass(binding);
  const roundTrip = makeRoundTrip();
  assert.equal(roundTrip.correlationDigest, fiReceipt.correlationDigest);
  return {
    planId: 'plan-fj-01',
    changeId: 'eos-ladder-41-mission-fj',
    ritualMode: 'ACTIVE',
    roundTrip,
    fiReceipt,
    ...overrides
  };
}

describe('Mission FJ — Round-Trip Integrity Receipt (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
    _resetFiReceiptSeqForTests();
  });

  it('FJ1: declares PRODUCTION_READY=NO and freeze pin 78141c3d', () => {
    assert.equal(FJ_PRODUCTION_READY, 'NO');
    assert.equal(FJ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_FREEZE_PIN_SHORT, '78141c3d');
    assert.equal(FJ_FREEZE_PIN, '78141c3d295579f210589301230af5d0853df392');
  });

  it('FJ2: builds canonical nine-field FJ-RCPT-* with integrity hold and no secrets', () => {
    const roundTrip = makeRoundTrip();
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-seal',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip
    });

    assert.equal(receipt.kind, FJ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(receipt.operation, FJ_OPERATION);
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.integrityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.integrityHold.correlationSecretZeroHeld, true);
    assert.equal(receipt.integrityHold.composesOnFiCorrelationDigest, true);
    assert.equal(receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFkQuarantine, true);
    assert.equal(receipt.integrityDigest.length, 64);

    const seal = canonicalRoundTripRequestReplyIntegritySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'integrityDigest',
      'operation',
      'planId',
      'prevReceiptHash',
      'receiptId',
      'timestamp'
    ].sort());
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(receipt).ok, true);
  });

  it('FJ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-tamper',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeRoundTrip()
    });
    const tampered = { ...receipt, decision: 'DENY' };
    const check = verifyRoundTripRequestReplyIntegrityReceipt(tampered);
    assert.equal(check.ok, false);
    assert.match(check.reason, /receiptHash mismatch/);
  });
});

describe('Mission FJ — Round-Trip Integrity Policy Gate (SPEC-0172)', () => {
  beforeEach(() => {
    _resetFiReceiptSeqForTests();
  });

  it('FJ4: PASS when INTACT pair matches a verified FI correlation digest', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();
    const res = gate.evaluatePreconditions(basePlan());
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FJ_CODES.OK);
    assert.equal(typeof res.fiReceiptHash, 'string');
    assert.equal(res.fiReceiptHash.length, 64);
  });

  it('FJ5: DENY CORRELATION_DIGEST_MISMATCH when opaque metadata is altered', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();
    const plan = basePlan();
    plan.roundTrip = { ...plan.roundTrip, ingressId: 'ing-opaque-tampered' };
    const res = gate.evaluatePreconditions(plan);
    assert.equal(res.ok, false);
    assert.equal(res.code, FJ_CODES.CORRELATION_DIGEST_MISMATCH);
  });

  it('FJ6: DENY INTEGRITY_MISMATCH and INTEGRITY_NOT_INTACT and collapsed refs', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const mismatch = basePlan();
    mismatch.roundTrip = { ...mismatch.roundTrip, observedIntegrity: 'BROKEN' };
    assert.equal(gate.evaluatePreconditions(mismatch).code, FJ_CODES.INTEGRITY_MISMATCH);

    const broken = basePlan();
    broken.roundTrip = { ...broken.roundTrip, desiredIntegrity: 'BROKEN', observedIntegrity: 'BROKEN' };
    assert.equal(gate.evaluatePreconditions(broken).code, FJ_CODES.INTEGRITY_NOT_INTACT);

    const collapsed = basePlan();
    collapsed.roundTrip = { ...collapsed.roundTrip, replyRef: collapsed.roundTrip.requestRef };
    assert.equal(gate.evaluatePreconditions(collapsed).code, FJ_CODES.ROUND_TRIP_REFS_COLLAPSED);

    const unauthorized = basePlan();
    unauthorized.roundTrip = { ...unauthorized.roundTrip, authorized: false };
    assert.equal(gate.evaluatePreconditions(unauthorized).code, FJ_CODES.INTEGRITY_UNAUTHORIZED);
  });

  it('FJ7: DENY when the FI receipt is missing, not PASS, or correlated to a different digest', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const missing = basePlan();
    delete missing.fiReceipt;
    assert.equal(gate.evaluatePreconditions(missing).code, FJ_CODES.MISSING_FI_RECEIPT);

    const deniedFi = basePlan();
    deniedFi.fiReceipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
      planId: 'plan-fi-deny',
      changeId: 'eos-ladder-41-mission-fi',
      decision: 'DENY',
      binding: makeBinding(),
      correlationDigest: deniedFi.roundTrip.correlationDigest
    });
    assert.equal(gate.evaluatePreconditions(deniedFi).code, FJ_CODES.FI_RECEIPT_NOT_PASS);

    const other = basePlan();
    other.fiReceipt = makeFiPass(makeBinding({ correlationId: 'corr-opaque-other' }));
    assert.equal(gate.evaluatePreconditions(other).code, FJ_CODES.FI_CORRELATION_MISMATCH);

    const tampered = basePlan();
    tampered.fiReceipt = { ...tampered.fiReceipt, decision: 'HOLD' };
    assert.equal(gate.evaluatePreconditions(tampered).code, FJ_CODES.FI_RECEIPT_INVALID);
  });

  it('FJ8: Law VI DENY on secret-looking fields and synthetic tokens', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();
    const secretField = basePlan();
    secretField.roundTrip = { ...secretField.roundTrip, apiKey: 'not-sealed' };
    assert.equal(gate.evaluatePreconditions(secretField).code, FJ_CODES.SECRET_FIELD_FORBIDDEN);

    const leaked = basePlan();
    leaked.note = makeSyntheticSecret();
    assert.equal(gate.evaluatePreconditions(leaked).code, FJ_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('FJ9: DENY Fundacion targets, ladder reopen, tip rewrite, L41 auto-close, and elevation', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const fundacion = gate.evaluatePreconditions({
      planId: 'plan-fj-fundacion',
      changeId: 'eos-ladder-41-mission-fj',
      target: 'Documents/Fundacion/round-trip'
    });
    assert.equal(fundacion.code, FJ_CODES.FUNDACION_DENIED);

    const ladders = [
      ['reopen ladder-30', FJ_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-40', FJ_CODES.L40_REOPEN_FORBIDDEN],
      ['auto-close ladder-41 now', FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const res = gate.evaluatePreconditions({
        planId: 'plan-fj-ladder',
        changeId: 'eos-ladder-41-mission-fj',
        instruction
      });
      assert.equal(res.code, code, instruction);
    }

    const tip = gate.evaluatePreconditions({
      planId: 'plan-fj-tip',
      changeId: 'eos-ladder-41-mission-fj',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tip.code, FJ_CODES.TIP_REWRITE_FORBIDDEN);

    const pr = gate.evaluatePreconditions({
      planId: 'plan-fj-pr',
      changeId: 'eos-ladder-41-mission-fj',
      productionReady: 'YES'
    });
    assert.equal(pr.code, FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const fiElevate = gate.evaluatePreconditions({
      planId: 'plan-fj-fi',
      changeId: 'eos-ladder-41-mission-fj',
      instruction: 'make fi the round-trip integrity port'
    });
    assert.equal(fiElevate.code, FJ_CODES.FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN);

    const fkElevate = gate.evaluatePreconditions({
      planId: 'plan-fj-fk',
      changeId: 'eos-ladder-41-mission-fj',
      instruction: 'elevate fk quarantine as integrity'
    });
    assert.equal(fkElevate.code, FJ_CODES.FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN);
  });
});

describe('Mission FJ — Round-Trip Integrity Port (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
    _resetFiReceiptSeqForTests();
  });

  it('FJ10: govern ACTIVE INTACT pair seals FJ-RCPT-* and keeps PRODUCTION_READY=NO', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const plan = basePlan({ planId: 'plan-fj-pass' });
    const res = await port.govern(plan);

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.roundTrip.status, 'INTACT_EVALUATED');
    assert.equal(res.receipt.roundTrip.evaluated, true);
    assert.equal(res.receipt.fiReceiptHash, plan.fiReceipt.receiptHash);
    assert.equal(res.receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFkQuarantine, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(FJ_PORT_KIND, 'eos-round-trip-request-reply-integrity-port');
    assert.equal(findSecretLookingField(res.receipt.roundTrip), null);
    assert.equal(port.trail.length, 1);
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(res.receipt).ok, true);
  });

  it('FJ11: govern HOLD seals HOLD without requiring a round trip', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const res = await port.govern({
      planId: 'plan-fj-hold',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.roundTrip, null);
  });

  it('FJ12: verifyTrail chains PASS then DENY, and a tampered hash breaks the chain', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    await port.govern(basePlan({ planId: 'plan-fj-trail-pass' }));

    const denied = basePlan({ planId: 'plan-fj-trail-deny' });
    denied.roundTrip = { ...denied.roundTrip, observedIntegrity: 'BROKEN' };
    const denyRes = await port.govern(denied);
    assert.equal(denyRes.decision, 'DENY');
    assert.equal(denyRes.code, FJ_CODES.INTEGRITY_MISMATCH);
    assert.equal(denyRes.receipt.roundTrip.apiKey, undefined);

    const trail = port.verifyTrail();
    assert.equal(trail.ok, true);
    assert.equal(trail.verifiedCount, 2);

    port.trail[0].receiptHash = 'bad';
    const broken = port.verifyTrail();
    assert.equal(broken.ok, false);
    assert.match(broken.error, /receiptHash mismatch|Invalid receipt/);
  });

  it('FJ13: DENY receipt omits secret-looking fields', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const plan = basePlan({ planId: 'plan-fj-secret' });
    plan.roundTrip = { ...plan.roundTrip, password: 'do-not-seal' };
    const res = await port.govern(plan);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
    assert.equal(res.receipt.roundTrip.password, undefined);
    assert.equal(findSecretLookingField(res.receipt.roundTrip), null);
    assert.equal(scanForSecrets(canonicalRoundTripRequestReplyIntegritySealBody(res.receipt)), false);
  });
});
