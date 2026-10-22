/**
 * Mission FL — Bidirectional Delivery Honesty & Integrity Attestation Port Test Suite.
 * SPEC-0174 / ADR-0158.
 *
 * Invariants:
 * - PRODUCTION_READY=NO non-claims on receipt/gate/port
 * - Canonical nine-field FL-RCPT-* seal with deterministic attestationDigest (opaque-only)
 * - Freeze soft-observe pin e1a17e9b (never rewrite tip pins)
 * - Law VI: refuse secret-looking fields / synthetic tokens / raw payload material
 * - PASS only on explicit CONSISTENT claim + ATTEST_INTEGRITY|ATTEST_HONESTY + authorized
 * - CONTRADICTED => fail-closed DENY (never attest a contradicted claim)
 * - UNVERIFIED / HOLD => no-op HOLD (never a false attestation)
 * - Refuse PRODUCTION_READY flip, tip rewrite, schema add, GHE, Fundacion, L30–L40 reopen,
 *   L41 auto-close, live HTTP egress, wall-clock, tip-refresh, FI/FJ/FK elevate, prune, auto-seal
 * - PASS = sealed attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FJ/FK/Canary
 * - Attestation is a decision record only (no payload copy)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FL_FREEZE_PIN,
  FL_FREEZE_PIN_SHORT,
  FL_OPERATION,
  FL_RECEIPT_KIND,
  FL_PRODUCTION_READY,
  FL_FREEZE_NONCLAIM_LABELS,
  _resetReceiptSeqForTests,
  sha256Canonical,
  computeAttestationDigest,
  buildBidirectionalDeliveryHonestyAttestationReceipt,
  verifyBidirectionalDeliveryHonestyAttestationReceipt
} from '../src/core/composition/bidirectional-delivery-honesty-attestation-receipt.js';

import {
  BidirectionalDeliveryHonestyAttestationPolicyGate,
  FL_CODES,
  FL_POLICY_GATE_PRODUCTION_READY,
  findSecretLookingField,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsTipRewrite,
  claimsSchemaJsonAdd,
  claimsGhe,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  claimsTipRefreshAuthority,
  claimsRawAttestationSecretMaterial,
  claimsFiAsAttestation,
  claimsFjAsAttestation,
  claimsFkAsAttestation,
  claimsL30Reopen,
  claimsL40Reopen,
  claimsL41AutoClose,
  claimsMassPrune,
  isFundacionTarget,
  isValidAttestation,
  isValidClaim,
  isValidSha256Hex
} from '../src/core/composition/bidirectional-delivery-honesty-attestation-policy-gate.js';

import {
  BidirectionalDeliveryHonestyAttestationPort,
  FL_PORT_PRODUCTION_READY
} from '../src/core/composition/bidirectional-delivery-honesty-attestation-port.js';

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);

function validAttestation(overrides = {}) {
  return {
    correlationId: 'corr-001',
    bindingId: 'bind-001',
    roundTripId: 'rt-001',
    requestId: 'req-001',
    replyId: 'rep-001',
    quarantineDecisionId: 'fk-dec-001',
    requestDigest: HEX_A,
    replyDigest: HEX_B,
    mismatchDigest: HEX_C,
    attestationClass: 'bidirectional-delivery-honesty-claim',
    desiredAttestation: 'ATTEST_INTEGRITY',
    observedClaim: 'CONSISTENT',
    authorized: true,
    ...overrides
  };
}

function validPlan(overrides = {}) {
  return {
    planId: 'plan-fl-001',
    changeId: 'eos-ladder-41-mission-fl',
    ritualMode: 'ACTIVE',
    attestation: validAttestation(),
    ...overrides
  };
}

test('FL1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin e1a17e9b', () => {
  assert.equal(FL_PRODUCTION_READY, 'NO');
  assert.equal(FL_POLICY_GATE_PRODUCTION_READY, 'NO');
  assert.equal(FL_PORT_PRODUCTION_READY, 'NO');
  assert.equal(FL_FREEZE_PIN, 'e1a17e9ba16716fc904c1570baf5f8ca4ff3ea17');
  assert.equal(FL_FREEZE_PIN_SHORT, 'e1a17e9b');
  assert.equal(FL_OPERATION, 'BIDIRECTIONAL_DELIVERY_HONESTY_ATTESTATION');
  assert.ok(FL_FREEZE_NONCLAIM_LABELS.length >= 20);
  assert.ok(
    FL_FREEZE_NONCLAIM_LABELS.some((l) => /PRODUCTION_READY/.test(l)),
    'non-claims must mention PRODUCTION_READY'
  );
  assert.ok(
    FL_FREEZE_NONCLAIM_LABELS.some((l) => /L41 auto-close refused/.test(l)),
    'non-claims must refuse L41 auto-close'
  );
  const receipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
    attestation: validAttestation(),
    decision: 'PASS'
  });
  assert.equal(receipt.productionReady, 'NO');
  assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
  assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
  assert.equal(receipt.freezeObserve.l41AutoCloseRefused, true);
  assert.equal(receipt.freezeObserve.pin, FL_FREEZE_PIN);
});

test('FL2: builds canonical nine-field sealed FL-RCPT-* with freeze soft-observe + ceiling + attestationHold + attestationDigest', () => {
  _resetReceiptSeqForTests();
  const receipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
    planId: 'plan-fl-001',
    changeId: 'eos-ladder-41-mission-fl',
    decision: 'PASS',
    attestation: validAttestation()
  });

  assert.equal(receipt.kind, FL_RECEIPT_KIND);
  assert.equal(receipt.receiptId, 'FL-RCPT-0001');
  assert.equal(receipt.operation, FL_OPERATION);
  assert.equal(receipt.planId, 'plan-fl-001');
  assert.equal(receipt.changeId, 'eos-ladder-41-mission-fl');
  assert.equal(receipt.decision, 'PASS');
  assert.equal(receipt.fundacionDelta, 0);
  assert.equal(receipt.productionReady, 'NO');
  assert.match(receipt.attestationDigest, /^[0-9a-f]{64}$/);
  assert.match(receipt.receiptHash, /^[0-9a-f]{64}$/);

  const canonical = receipt.freezeObserve;
  assert.equal(canonical.schemasAtCeiling, undefined);
  assert.equal(canonical.readOnly, true);
  for (let n = 30; n <= 40; n += 1) {
    assert.equal(canonical[`l${n}ReopenRefused`], true, `l${n}ReopenRefused`);
  }
  assert.equal(canonical.liveHttpEgressRefused, true);
  assert.equal(canonical.wallClockAuthorityRefused, true);
  assert.equal(canonical.tipRefreshAuthorityRefused, true);
  assert.equal(canonical.rawAttestationSecretMaterialRefused, true);
  assert.equal(canonical.schemaJsonAddRefused, true);

  assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
  assert.equal(receipt.ceilingHold.slimHold, true);

  const hold = receipt.attestationHold;
  assert.equal(hold.failClosed, true);
  assert.equal(hold.attestOnly, true);
  assert.equal(hold.noPayloadCopy, true);
  assert.equal(hold.attestationSecretMaterialRefused, true);
  assert.equal(hold.attestationSecretZeroHeld, true);
  assert.equal(hold.consumesFiCorrelationBinding, true);
  assert.equal(hold.consumesFjRoundTripVerdict, true);
  assert.equal(hold.consumesFkQuarantineDecision, true);
  assert.equal(hold.distinctFromCanaryDeliveryDispatcher, true);
  assert.deepEqual(verifyBidirectionalDeliveryHonestyAttestationReceipt(receipt), { ok: true });
});

test('FL3: attestationDigest is deterministic and opaque-only (ignores secret/raw fields)', () => {
  const base = computeAttestationDigest(validAttestation());
  const again = computeAttestationDigest(validAttestation());
  assert.equal(base, again);

  const polluted = computeAttestationDigest({
    ...validAttestation(),
    password: 'p@ssw0rd-nope',
    rawRequestPayload: 'RAW-BODY-BYTES',
    token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'
  });
  assert.equal(polluted, base, 'digest must ignore secret-looking extras');

  const different = computeAttestationDigest(validAttestation({ roundTripId: 'rt-002' }));
  assert.notEqual(different, base);

  const normalized = computeAttestationDigest(validAttestation({ requestDigest: HEX_A.toUpperCase() }));
  assert.equal(normalized, base, 'digest normalizes sha256 hex case');
});

test('FL4: verifies sealed receipt and rejects tampered decision/hash/delta', () => {
  const receipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
    attestation: validAttestation(),
    decision: 'PASS'
  });
  assert.deepEqual(verifyBidirectionalDeliveryHonestyAttestationReceipt(receipt), { ok: true });

  assert.equal(
    verifyBidirectionalDeliveryHonestyAttestationReceipt({ ...receipt, decision: 'DENY' }).ok,
    false
  );
  assert.equal(
    verifyBidirectionalDeliveryHonestyAttestationReceipt({ ...receipt, receiptHash: 'f'.repeat(64) }).ok,
    false
  );
  assert.equal(
    verifyBidirectionalDeliveryHonestyAttestationReceipt({ ...receipt, fundacionDelta: 1 }).ok,
    false
  );
  assert.equal(
    verifyBidirectionalDeliveryHonestyAttestationReceipt({ ...receipt, productionReady: 'YES' }).ok,
    false
  );
  assert.equal(verifyBidirectionalDeliveryHonestyAttestationReceipt({ ...receipt, operation: 'X' }).ok, false);
  assert.equal(verifyBidirectionalDeliveryHonestyAttestationReceipt(null).ok, false);
});

test('FL5: sequences FL-RCPT ids and supports prevReceiptHash chaining', () => {
  _resetReceiptSeqForTests();
  const r1 = buildBidirectionalDeliveryHonestyAttestationReceipt({ attestation: validAttestation(), decision: 'PASS' });
  const r2 = buildBidirectionalDeliveryHonestyAttestationReceipt({
    attestation: validAttestation(),
    decision: 'PASS',
    prevReceiptHash: r1.receiptHash
  });
  assert.equal(r1.receiptId, 'FL-RCPT-0001');
  assert.equal(r2.receiptId, 'FL-RCPT-0002');
  assert.equal(r1.prevReceiptHash, '0'.repeat(64));
  assert.equal(r2.prevReceiptHash, r1.receiptHash);
  assert.deepEqual(verifyBidirectionalDeliveryHonestyAttestationReceipt(r2), { ok: true });
  assert.equal(sha256Canonical('x').length, 64);
});

test('FL6: happy path ACTIVE -> PASS on explicit CONSISTENT + ATTEST_INTEGRITY', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  const res = gate.evaluatePreconditions(validPlan());
  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.equal(res.code, FL_CODES.OK);
  assert.match(res.reason, /attestation governance preconditions/);

  const honesty = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ desiredAttestation: 'ATTEST_HONESTY' }) })
  );
  assert.equal(honesty.decision, 'PASS');
});

test('FL7: DENY missing planId/changeId/attestation and invalid attestation shape', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  assert.equal(gate.evaluatePreconditions().code, FL_CODES.MISSING_PLAN_ID);
  assert.equal(gate.evaluatePreconditions({ planId: 'p' }).code, FL_CODES.MISSING_CHANGE_ID);
  assert.equal(
    gate.evaluatePreconditions({ planId: 'p', changeId: 'c' }).code,
    FL_CODES.MISSING_ATTESTATION
  );
  assert.equal(
    gate.evaluatePreconditions({ planId: 'p', changeId: 'c', attestation: [] }).code,
    FL_CODES.INVALID_ATTESTATION
  );
  assert.equal(
    gate.evaluatePreconditions({ planId: 'p', changeId: 'c', attestation: 'nope' }).code,
    FL_CODES.INVALID_ATTESTATION
  );
  assert.equal(
    gate.evaluatePreconditions({ planId: '  ', changeId: 'c' }).code,
    FL_CODES.MISSING_PLAN_ID
  );
});

test('FL8: DENY each missing required attestation string field with dedicated code', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  const cases = [
    ['correlationId', FL_CODES.MISSING_CORRELATION_ID],
    ['bindingId', FL_CODES.MISSING_BINDING_ID],
    ['roundTripId', FL_CODES.MISSING_ROUND_TRIP_ID],
    ['requestId', FL_CODES.MISSING_REQUEST_ID],
    ['replyId', FL_CODES.MISSING_REPLY_ID],
    ['quarantineDecisionId', FL_CODES.MISSING_QUARANTINE_DECISION_ID],
    ['attestationClass', FL_CODES.MISSING_ATTESTATION_CLASS]
  ];
  for (const [field, code] of cases) {
    const plan = validPlan({ attestation: validAttestation({ [field]: '' }) });
    const res = gate.evaluatePreconditions(plan);
    assert.equal(res.code, code, `field ${field}`);
    assert.equal(res.decision, 'DENY');
  }
});

test('FL9: DENY missing/invalid request and reply and mismatch digests (sha256 hex enforced)', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ requestDigest: '' }) })).code,
    FL_CODES.MISSING_REQUEST_DIGEST
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ replyDigest: '' }) })).code,
    FL_CODES.MISSING_REPLY_DIGEST
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ mismatchDigest: '' }) })).code,
    FL_CODES.MISSING_MISMATCH_DIGEST
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ requestDigest: 'zz' }) })).code,
    FL_CODES.INVALID_REQUEST_DIGEST
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ replyDigest: 'b'.repeat(63) }) })).code,
    FL_CODES.INVALID_REPLY_DIGEST
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ mismatchDigest: 'not-hex' }) })).code,
    FL_CODES.INVALID_MISMATCH_DIGEST
  );
  assert.equal(isValidSha256Hex(HEX_A), true);
  assert.equal(isValidSha256Hex('a'.repeat(63)), false);
});

test('FL10: DENY missing/invalid desiredAttestation and observedClaim', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ desiredAttestation: '' }) })).code,
    FL_CODES.MISSING_DESIRED_ATTESTATION
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ desiredAttestation: 'ATTEST_EVERYTHING' }) })).code,
    FL_CODES.INVALID_DESIRED_ATTESTATION
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ observedClaim: '' }) })).code,
    FL_CODES.MISSING_OBSERVED_CLAIM
  );
  assert.equal(
    gate.evaluatePreconditions(validPlan({ attestation: validAttestation({ observedClaim: 'PROBABLY' }) })).code,
    FL_CODES.INVALID_OBSERVED_CLAIM
  );
  assert.equal(isValidAttestation('ATTEST_INTEGRITY'), true);
  assert.equal(isValidAttestation('HOLD'), true);
  assert.equal(isValidClaim('CONSISTENT'), true);
  assert.equal(isValidClaim('CONTRADICTED'), true);
  assert.equal(isValidClaim('MAYBE'), false);
});

test('FL11: fail-closed DENY when attestation claim is unauthorized', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  const res = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ authorized: false }) })
  );
  assert.equal(res.ok, false);
  assert.equal(res.decision, 'DENY');
  assert.equal(res.code, FL_CODES.ATTESTATION_UNAUTHORIZED);
  assert.match(res.reason, /unauthorized/);
});

test('FL12: CONTRADICTED => fail-closed DENY; UNVERIFIED / HOLD => no-op HOLD (never a false attestation)', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();

  const contradicted = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ observedClaim: 'CONTRADICTED' }) })
  );
  assert.equal(contradicted.ok, false);
  assert.equal(contradicted.decision, 'DENY');
  assert.equal(contradicted.code, FL_CODES.CLAIM_CONTRADICTED);

  const unverified = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ observedClaim: 'UNVERIFIED' }) })
  );
  assert.equal(unverified.ok, true);
  assert.equal(unverified.decision, 'HOLD');
  assert.equal(unverified.code, FL_CODES.HOLD);

  const held = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ observedClaim: 'HOLD' }) })
  );
  assert.equal(held.decision, 'HOLD');

  const desiredHold = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ desiredAttestation: 'HOLD' }) })
  );
  assert.equal(desiredHold.decision, 'HOLD');

  const ritualHold = gate.evaluatePreconditions(validPlan({ ritualMode: 'HOLD' }));
  assert.equal(ritualHold.decision, 'HOLD');
  assert.equal(ritualHold.ok, true);
});

test('FL13: Law VI DENY secret-looking fields and synthetic secret tokens', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();

  const secretField = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ password: 'super-secret' }) })
  );
  assert.equal(secretField.code, FL_CODES.SECRET_FIELD_FORBIDDEN);
  assert.match(secretField.reason, /password/);

  const attestationSecret = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ attestationSecret: 'nope' }) })
  );
  assert.equal(attestationSecret.code, FL_CODES.SECRET_FIELD_FORBIDDEN);

  const tokenLeak = gate.evaluatePreconditions(
    validPlan({ attestation: validAttestation({ note: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789' }) })
  );
  assert.equal(tokenLeak.code, FL_CODES.SECRET_LEAK_FORBIDDEN);

  const rawMaterial = gate.evaluatePreconditions(validPlan({ rawSecretMaterial: true }));
  assert.equal(rawMaterial.code, FL_CODES.RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN);

  assert.equal(findSecretLookingField({ a: { token: 'x' } }), 'token');
  assert.equal(findSecretLookingField({ a: { safe: 'x' } }), null);
  assert.equal(scanForSecrets({ note: 'sk-abcdefghijklmnopqrstuvwxyz' }), true);
  assert.equal(claimsRawAttestationSecretMaterial('seal the attestation secret'), true);
});

test('FL14: refuses PRODUCTION_READY flip, tip rewrite, schema add, GHE, Fundacion, L30–L40 reopen, L41 auto-close, live egress, wall-clock, tip-refresh, FI/FJ/FK elevate, prune, auto-seal', () => {
  const gate = new BidirectionalDeliveryHonestyAttestationPolicyGate();
  const expectCode = (override, code) => {
    const res = gate.evaluatePreconditions(validPlan(override));
    assert.equal(res.ok, false, JSON.stringify(override));
    assert.equal(res.code, code, JSON.stringify(override));
  };

  expectCode({ productionReady: 'YES' }, FL_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);
  expectCode({ tipRewrite: true }, FL_CODES.TIP_REWRITE_FORBIDDEN);
  expectCode({ schemaJsonAdd: true }, FL_CODES.SCHEMA_JSON_ADD_FORBIDDEN);
  expectCode({ note: 'GHE enforced' }, FL_CODES.GHE_CLAIM_FORBIDDEN);
  expectCode({ target: 'Fundacion/app' }, FL_CODES.FUNDACION_DENIED);
  expectCode({ reopenL30: true }, FL_CODES.L30_REOPEN_FORBIDDEN);
  expectCode({ note: 'reopen ladder 40' }, FL_CODES.L40_REOPEN_FORBIDDEN);
  expectCode({ autoCloseL41: true }, FL_CODES.L41_AUTO_CLOSE_FORBIDDEN);
  expectCode({ liveHttpEgress: true }, FL_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);
  expectCode({ wallClockAuthority: true }, FL_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);
  expectCode({ tipRefreshAuthority: true }, FL_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);
  expectCode({ fiAsAttestation: true }, FL_CODES.FI_AS_ATTESTATION_FORBIDDEN);
  expectCode({ fjAsAttestation: true }, FL_CODES.FJ_AS_ATTESTATION_FORBIDDEN);
  expectCode({ fkAsAttestation: true }, FL_CODES.FK_AS_ATTESTATION_FORBIDDEN);
  expectCode({ forceDelete: true }, FL_CODES.HARD_DELETE_FORBIDDEN);
  expectCode({ massPrune: true }, FL_CODES.MASS_PRUNE_FORBIDDEN);
  expectCode({ networkWrite: true }, FL_CODES.NETWORK_WRITE_FORBIDDEN);
  expectCode({ autoSeal: true }, FL_CODES.AUTO_SEAL_FORBIDDEN);
  expectCode({ ritualMode: 'BOGUS' }, FL_CODES.INVALID_RITUAL_MODE);

  assert.equal(claimsProductionReadyFlip('flip PRODUCTION_READY to YES'), true);
  assert.equal(claimsTipRewrite('rewrite the tip pin'), true);
  assert.equal(claimsSchemaJsonAdd('add a schema json'), true);
  assert.equal(claimsGhe('GHE'), true);
  assert.equal(claimsLiveHttpEgress('live http egress'), true);
  assert.equal(claimsWallClockAuthority('wall-clock authority'), true);
  assert.equal(claimsTipRefreshAuthority('tip-refresh authority'), true);
  assert.equal(claimsFiAsAttestation('make fi the attestation port'), true);
  assert.equal(claimsFjAsAttestation('elevate fj to attestation'), true);
  assert.equal(claimsFkAsAttestation('make fk the attestation port'), true);
  assert.equal(claimsL30Reopen('reopen ladder 30'), true);
  assert.equal(claimsL40Reopen('reopen ladder 40'), true);
  assert.equal(claimsL41AutoClose('auto-close ladder 41'), true);
  assert.equal(claimsMassPrune('mass prune'), true);
  assert.equal(isFundacionTarget('Fundacion/x'), true);

  // auto-seal allowed when the human gate holds
  const gated = gate.evaluatePreconditions(validPlan({ autoSeal: true, humanGateHeld: true }));
  assert.equal(gated.decision, 'PASS');
});

test('FL15: govern happy path -> PASS + FL-RCPT-* + ATTESTATION_SEALED decision record', async () => {
  _resetReceiptSeqForTests();
  const port = new BidirectionalDeliveryHonestyAttestationPort();
  const res = await port.govern(validPlan());

  assert.equal(res.ok, true);
  assert.equal(res.decision, 'PASS');
  assert.equal(res.code, FL_CODES.OK);
  assert.match(res.receipt.receiptId, /^FL-RCPT-\d{4}$/);
  assert.match(res.receipt.attestationDigest, /^[0-9a-f]{64}$/);
  assert.equal(res.receipt.attestation.status, 'ATTESTATION_SEALED');
  assert.equal(res.receipt.attestation.attestOnly, true);
  assert.equal(res.receipt.attestation.noPayloadCopy, true);
  assert.equal(res.receipt.attestation.consumesFkQuarantineDecision, true);
  assert.equal(res.receipt.attestationHold.attestationSecretMaterialRefused, true);
  assert.equal(res.receipt.attestationHold.attestationSecretZeroHeld, true);
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(port.verifyTrail().ok, true);
  assert.equal(port.verifyTrail().verifiedCount, 1);
});

test('FL16: govern UNVERIFIED -> HOLD with zero attested decision and no PASS', async () => {
  _resetReceiptSeqForTests();
  const port = new BidirectionalDeliveryHonestyAttestationPort();
  const res = await port.govern(
    validPlan({ attestation: validAttestation({ observedClaim: 'UNVERIFIED' }) })
  );

  assert.equal(res.decision, 'HOLD');
  assert.equal(res.code, FL_CODES.HOLD);
  assert.equal(res.receipt.decision, 'HOLD');
  assert.equal(res.receipt.attestation.status, 'HELD');
  assert.equal(res.receipt.attestation.evaluated, false);
  assert.notEqual(res.receipt.attestation.status, 'ATTESTATION_SEALED');
  assert.equal(res.receipt.fundacionDelta, 0);
  assert.equal(port.verifyTrail().ok, true);
});

test('FL17: DENY unauthorized is fail-closed, chain stays verifiable, tamper is detected', async () => {
  _resetReceiptSeqForTests();
  const port = new BidirectionalDeliveryHonestyAttestationPort();

  const denied = await port.govern(
    validPlan({ attestation: validAttestation({ authorized: false }) })
  );
  assert.equal(denied.ok, false);
  assert.equal(denied.decision, 'DENY');
  assert.equal(denied.code, FL_CODES.ATTESTATION_UNAUTHORIZED);
  assert.equal(denied.receipt.attestation.status, 'ATTESTATION_UNAUTHORIZED');
  assert.equal(denied.receipt.attestation.evaluated, false);

  const passed = await port.govern(validPlan());
  assert.equal(passed.decision, 'PASS');

  const trail = port.verifyTrail();
  assert.equal(trail.ok, true, trail.error);
  assert.equal(trail.verifiedCount, 2);
  assert.equal(port.trail[1].prevReceiptHash, port.trail[0].receiptHash);

  port.trail[0].decision = 'PASS';
  const tampered = port.verifyTrail();
  assert.equal(tampered.ok, false);
  assert.match(tampered.error, /Invalid receipt at 0/);
});
