/**
 * Mission FJ — Round-Trip / Request-Reply Integrity Governance Port Test Suite.
 * SPEC-0172 / ADR-0156.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 8903b57 (do NOT rewrite tip pins)
 * - PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/Canary
 * - NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 * - Consumes opaque FI correlation binding only
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
  FJ_INTEGRITY_STATES,
  buildRoundTripRequestReplyIntegrityReceipt,
  verifyRoundTripRequestReplyIntegrityReceipt,
  canonicalRoundTripRequestReplyIntegritySealBody,
  computeRoundTripDigest,
  sha256Canonical,
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
  claimsTipRefreshAuthority,
  claimsRawRoundTripSecretMaterial,
  claimsLadderReopen,
  claimsL41AutoClose,
  isFundacionTarget,
  isValidSha256Hex
} from '../src/core/composition/round-trip-request-reply-integrity-policy-gate.js';

import {
  RoundTripRequestReplyIntegrityPort,
  FJ_PORT_PRODUCTION_READY,
  FJ_PORT_KIND
} from '../src/core/composition/round-trip-request-reply-integrity-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeDigest(label) {
  return sha256Canonical(`opaque-${label}`);
}

function makeMockRoundTrip(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fi-demo-001',
    bindingId: 'bind-opaque-fi-demo-001',
    requestId: 'req-opaque-fj-demo-001',
    replyId: 'rep-opaque-fj-demo-001',
    requestDigest: makeDigest('request-001'),
    replyDigest: makeDigest('reply-001'),
    correlationClass: 'bidirectional-delivery-correlation',
    integrityClass: 'round-trip-request-reply-integrity',
    desiredIntegrity: 'VERIFIED',
    observedIntegrity: 'VERIFIED',
    authorized: true,
    ...overrides
  };
}

function makePlan(overrides = {}) {
  return {
    planId: 'plan-fj-01',
    changeId: 'eos-ladder-41-mission-fj',
    roundTrip: makeMockRoundTrip(),
    ...overrides
  };
}

describe('Mission FJ — Round-Trip / Request-Reply Integrity Receipt (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 8903b57', () => {
    assert.equal(FJ_PRODUCTION_READY, 'NO');
    assert.equal(FJ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_FREEZE_PIN_SHORT, '8903b57');
    assert.equal(FJ_FREEZE_PIN, '8903b578999959c95594908ecedb0789594bd33f');
    assert.deepEqual([...FJ_INTEGRITY_STATES], ['VERIFIED', 'MISMATCH', 'HOLD']);
  });

  it('FJ2: builds canonical nine-field sealed FJ-RCPT-* with freeze soft-observe + ceiling + roundTripHold + roundTripDigest', () => {
    const roundTrip = makeMockRoundTrip();
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-01',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip
    });

    assert.equal(receipt.kind, FJ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(receipt.operation, FJ_OPERATION);
    assert.equal(receipt.operation, 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFICATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '8903b57');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawRoundTripSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.roundTripHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.roundTripHold.failClosed, true);
    assert.equal(receipt.roundTripHold.roundTripSecretMaterialRefused, true);
    assert.equal(receipt.roundTripHold.roundTripSecretZeroHeld, true);
    assert.equal(receipt.roundTripHold.consumesFiCorrelationBinding, true);
    assert.equal(receipt.roundTripHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(receipt.roundTripHold.distinctFromFkMismatchQuarantine, true);
    assert.equal(receipt.roundTripDigest, computeRoundTripDigest(roundTrip));
    assert.equal(receipt.nonClaimLabels, undefined);
    assert.ok(receipt.freezeObserve.nonClaimLabels.length >= 20);
  });

  it('FJ3: roundTripDigest is deterministic and opaque-only (ignores secret/raw fields)', () => {
    const roundTrip = makeMockRoundTrip();
    const a = computeRoundTripDigest(roundTrip);
    const b = computeRoundTripDigest({ ...roundTrip });
    assert.equal(a, b);

    const withSecret = computeRoundTripDigest({
      ...roundTrip,
      roundTripSecret: makeSyntheticSecret(),
      requestPayload: 'raw-payload-must-not-hash'
    });
    assert.equal(withSecret, a);
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it('FJ4: verifies sealed receipt and rejects tampered decision/hash/delta', () => {
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-02',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeMockRoundTrip()
    });

    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(receipt).ok, true);

    const tamperedDecision = { ...receipt, decision: 'DENY' };
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(tamperedDecision).ok, false);

    const tamperedHash = { ...receipt, receiptHash: 'f'.repeat(64) };
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(tamperedHash).ok, false);

    const tamperedDelta = { ...receipt, fundacionDelta: 1 };
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(tamperedDelta).ok, false);

    assert.deepEqual(Object.keys(canonicalRoundTripRequestReplyIntegritySealBody(receipt)), [
      'receiptId',
      'operation',
      'planId',
      'decision',
      'changeId',
      'roundTripDigest',
      'timestamp',
      'fundacionDelta',
      'prevReceiptHash'
    ]);
  });

  it('FJ5: sequences FJ-RCPT ids and supports prevReceiptHash chaining', () => {
    const first = buildRoundTripRequestReplyIntegrityReceipt({ planId: 'plan-fj-03', roundTrip: makeMockRoundTrip() });
    const second = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-03',
      roundTrip: makeMockRoundTrip(),
      prevReceiptHash: first.receiptHash
    });

    assert.equal(first.receiptId, 'FJ-RCPT-0001');
    assert.equal(second.receiptId, 'FJ-RCPT-0002');
    assert.equal(second.prevReceiptHash, first.receiptHash);
  });
});


describe('Mission FJ — Round-Trip Integrity Policy Gate (SPEC-0172)', () => {
  const gate = new RoundTripRequestReplyIntegrityPolicyGate();

  it('FJ6: happy path ACTIVE -> PASS with hermetic FI binding + verified round-trip', () => {
    const res = gate.evaluatePreconditions(makePlan());
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FJ_CODES.OK);
  });

  it('FJ7: DENY missing planId/changeId/roundTrip and invalid roundTrip shape', () => {
    assert.equal(gate.evaluatePreconditions({}).code, FJ_CODES.MISSING_PLAN_ID);
    assert.equal(
      gate.evaluatePreconditions({ planId: 'plan-fj-01', changeId: '' }).code,
      FJ_CODES.MISSING_CHANGE_ID
    );
    assert.equal(
      gate.evaluatePreconditions({ planId: 'plan-fj-01', changeId: 'eos-ladder-41-mission-fj' }).code,
      FJ_CODES.MISSING_ROUND_TRIP
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: 'not-an-object' })).code,
      FJ_CODES.INVALID_ROUND_TRIP
    );
  });

  it('FJ8: DENY each missing required roundTrip string field with dedicated code', () => {
    const cases = [
      ['correlationId', FJ_CODES.MISSING_CORRELATION_ID],
      ['bindingId', FJ_CODES.MISSING_BINDING_ID],
      ['requestId', FJ_CODES.MISSING_REQUEST_ID],
      ['replyId', FJ_CODES.MISSING_REPLY_ID],
      ['correlationClass', FJ_CODES.MISSING_CORRELATION_CLASS],
      ['integrityClass', FJ_CODES.MISSING_INTEGRITY_CLASS]
    ];

    for (const [field, code] of cases) {
      const roundTrip = makeMockRoundTrip({ [field]: '' });
      const res = gate.evaluatePreconditions(makePlan({ roundTrip }));
      assert.equal(res.code, code, `expected ${code} for ${field}`);
    }
  });

  it('FJ9: DENY missing/invalid request and reply digests (sha256 hex enforced)', () => {
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ requestDigest: '' }) })).code,
      FJ_CODES.MISSING_REQUEST_DIGEST
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ replyDigest: '' }) })).code,
      FJ_CODES.MISSING_REPLY_DIGEST
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ requestDigest: 'not-hex' }) })).code,
      FJ_CODES.INVALID_REQUEST_DIGEST
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ replyDigest: 'abc123' }) })).code,
      FJ_CODES.INVALID_REPLY_DIGEST
    );
    assert.equal(isValidSha256Hex(makeDigest('x')), true);
    assert.equal(isValidSha256Hex('abc123'), false);
  });

  it('FJ10: DENY missing/invalid desiredIntegrity and invalid observedIntegrity', () => {
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ desiredIntegrity: '' }) })).code,
      FJ_CODES.MISSING_DESIRED_INTEGRITY
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ desiredIntegrity: 'OK' }) })).code,
      FJ_CODES.INVALID_DESIRED_INTEGRITY
    );
    assert.equal(
      gate.evaluatePreconditions(makePlan({ roundTrip: makeMockRoundTrip({ observedIntegrity: 'OK' }) })).code,
      FJ_CODES.INVALID_OBSERVED_INTEGRITY
    );
  });

  it('FJ11: fail-closed DENY when round-trip claim is unauthorized', () => {
    const res = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ authorized: false }) })
    );
    assert.equal(res.ok, false);
    assert.equal(res.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);
  });

  it('FJ12: DENY observed/desired mismatch and non-VERIFIED desired integrity', () => {
    assert.equal(
      gate.evaluatePreconditions(
        makePlan({ roundTrip: makeMockRoundTrip({ observedIntegrity: 'MISMATCH' }) })
      ).code,
      FJ_CODES.INTEGRITY_MISMATCH
    );
    assert.equal(
      gate.evaluatePreconditions(
        makePlan({ roundTrip: makeMockRoundTrip({ desiredIntegrity: 'MISMATCH', observedIntegrity: 'MISMATCH' }) })
      ).code,
      FJ_CODES.INTEGRITY_MISMATCH
    );
  });

  it('FJ13: Law VI DENY secret-looking fields and synthetic secret tokens', () => {
    const fieldRes = gate.evaluatePreconditions({
      ...makePlan(),
      roundTripSecret: makeSyntheticSecret()
    });
    assert.equal(fieldRes.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
    assert.equal(findSecretLookingField({ replyHmac: 'x' }), 'replyHmac');

    const tokenRes = gate.evaluatePreconditions({
      ...makePlan(),
      note: makeSyntheticSecret()
    });
    assert.equal(tokenRes.code, FJ_CODES.SECRET_LEAK_FORBIDDEN);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(scanForSecrets('opaque-note'), false);
  });


  it('FJ14: refuses PRODUCTION_READY flip, tip rewrite, schema add, GHE, Fundacion, L30–L40 reopen, L41 auto-close, live egress, wall-clock, tip-refresh, FI/FK elevate, prune, auto-seal', () => {
    const cases = [
      [{ liveHttpEgress: true }, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN],
      [{ wallClockAuthority: true }, FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN],
      [{ tipRefreshAuthority: true }, FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN],
      [{ rawSecretMaterial: true }, FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN],
      [{ fiAsRoundTrip: true }, FJ_CODES.FI_AS_ROUND_TRIP_FORBIDDEN],
      [{ fkQuarantineAsRoundTrip: true }, FJ_CODES.FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN],
      [{ schemaJsonAdd: true }, FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN],
      [{ productionReady: 'YES' }, FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN],
      [{ claimGhe: true }, FJ_CODES.GHE_CLAIM_FORBIDDEN],
      [{ target: 'Fundacion/secret' }, FJ_CODES.FUNDACION_DENIED],
      [{ reopenL30: true }, FJ_CODES.L30_REOPEN_FORBIDDEN],
      [{ reopenL40: true }, FJ_CODES.L40_REOPEN_FORBIDDEN],
      [{ autoCloseL41: true }, FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN],
      [{ tipRewrite: true }, FJ_CODES.TIP_REWRITE_FORBIDDEN],
      [{ massPrune: true }, FJ_CODES.MASS_PRUNE_FORBIDDEN],
      [{ hardDelete: true }, FJ_CODES.HARD_DELETE_FORBIDDEN],
      [{ autoSeal: true }, FJ_CODES.AUTO_SEAL_FORBIDDEN],
      [{ networkWrite: true }, FJ_CODES.NETWORK_WRITE_FORBIDDEN]
    ];

    for (const [override, code] of cases) {
      const res = gate.evaluatePreconditions(makePlan(override));
      assert.equal(res.code, code, `expected ${code} for ${JSON.stringify(override)}`);
    }

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY = YES'), true);
    assert.equal(claimsHardDelete('rm -rf /'), true);
    assert.equal(claimsMassPrune('mass prune all'), true);
    assert.equal(claimsSchemaJsonAdd('add new schema json'), true);
    assert.equal(claimsLiveHttpEgress('claim live HTTP egress'), true);
    assert.equal(claimsWallClockAuthority('wall-clock authority'), true);
    assert.equal(claimsTipRefreshAuthority('tip-refresh authority'), true);
    assert.equal(claimsRawRoundTripSecretMaterial('raw request payload'), true);
    assert.equal(claimsLadderReopen('reopen ladder 40', 40), true);
    assert.equal(claimsL41AutoClose('auto-close ladder 41'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
  });
});

describe('Mission FJ — Round-Trip Integrity Port (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ15: govern happy path ACTIVE -> PASS + FJ-RCPT-* + verified round-trip (≠ FI/FK ≠ tip-refresh)', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const res = await port.govern(makePlan());

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FJ_CODES.OK);
    assert.ok(res.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(res.receipt.roundTrip.status, 'ROUND_TRIP_VERIFIED');
    assert.equal(res.receipt.roundTrip.evaluated, true);
    assert.equal(res.receipt.roundTrip.failClosed, true);
    assert.equal(res.receipt.roundTrip.consumesFiCorrelationBinding, true);
    assert.equal(res.receipt.roundTrip.distinctFromFiCorrelationRegistry, true);
    assert.equal(res.receipt.roundTrip.distinctFromFkMismatchQuarantine, true);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
    assert.equal(port.verifyTrail().ok, true);
    assert.equal(port.verifyTrail().verifiedCount, 1);
    assert.equal(port.constructor.name.includes('RoundTrip'), true);
  });

  it('FJ16: govern HOLD mode seals HOLD with zero state changes and no PASS', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const res = await port.govern({
      planId: 'plan-fj-hold',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ritualMode, 'HOLD');
    assert.equal(res.receipt.roundTrip, null);
    assert.equal(port.trail.length, 1);
    assert.equal(port.trail.filter((r) => r.decision === 'PASS').length, 0);
    assert.equal(port.verifyTrail().ok, true);
  });

  it('FJ17: DENY unauthorized is fail-closed, chain stays verifiable, tamper is detected', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const denied = await port.govern(
      makePlan({ roundTrip: makeMockRoundTrip({ authorized: false }) })
    );

    assert.equal(denied.ok, false);
    assert.equal(denied.decision, 'DENY');
    assert.equal(denied.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);
    assert.equal(denied.receipt.roundTrip.status, 'ROUND_TRIP_UNAUTHORIZED');

    const passed = await port.govern(makePlan({ planId: 'plan-fj-02' }));
    assert.equal(passed.decision, 'PASS');
    assert.equal(port.trail.length, 2);
    assert.equal(port.verifyTrail().ok, true);
    assert.equal(port.verifyTrail().verifiedCount, 2);

    port.trail[0] = { ...port.trail[0], receiptHash: 'e'.repeat(64) };
    const broken = port.verifyTrail();
    assert.equal(broken.ok, false);
    assert.equal(broken.verifiedCount, 0);
  });
});

