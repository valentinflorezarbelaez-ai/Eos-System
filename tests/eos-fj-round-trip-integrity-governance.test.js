/**
 * Mission FJ — Round-Trip / Request-Reply Integrity Governance Port Test Suite.
 * SPEC-0172 / ADR-0156.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 78141c3d (do NOT rewrite tip pins)
 * - PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/EY/FD/Canary
 * - NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 * - Composes over FI correlated opaque refs; digest MATCH only (no raw payloads)
 * - Distinct from FK mismatch quarantine (next)
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
  buildRoundTripIntegrityGovernanceReceipt,
  verifyRoundTripIntegrityGovernanceReceipt,
  verifyRoundTripIntegrity,
  canonicalRoundTripIntegrityGovernanceSealBody,
  computeRoundTripDigest,
  isValidDigestHex,
  _resetReceiptSeqForTests
} from '../src/core/composition/round-trip-integrity-governance-receipt.js';

import {
  RoundTripIntegrityGovernancePolicyGate,
  FJ_CODES,
  FJ_POLICY_GATE_PRODUCTION_READY,
  claimsFiRegistryAsRoundTrip,
  claimsFkQuarantineAsRoundTrip,
  claimsRawRoundTripSecretMaterial,
  isValidIntegrityState
} from '../src/core/composition/round-trip-integrity-governance-policy-gate.js';

import {
  RoundTripIntegrityGovernancePort,
  FJ_PORT_PRODUCTION_READY,
  FJ_PORT_KIND
} from '../src/core/composition/round-trip-integrity-governance-port.js';

import {
  findSecretLookingField,
  scanForSecrets
} from '../src/core/composition/bidirectional-delivery-correlation-registry-policy-gate.js';

function digestOf(text) {
  return createHash('sha256').update(text).digest('hex');
}

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-fj-token-abcdef1234567890';
}

function makeMockRoundTrip(overrides = {}) {
  const requestDigest = digestOf('request-leg-fj-demo-001');
  return {
    correlationId: 'corr-opaque-fi-fj-demo-001',
    roundTripId: 'rt-opaque-fj-demo-001',
    requestRef: 'req-opaque-fj-demo-001',
    replyRef: 'reply-opaque-fj-demo-001',
    requestDigest,
    echoedRequestDigest: requestDigest,
    replyDigest: digestOf('reply-leg-fj-demo-001'),
    roundTripClass: 'request-reply-round-trip',
    integrityClass: 'request-reply-round-trip',
    desiredIntegrity: 'MATCH',
    observedIntegrity: 'MATCH',
    authorized: true,
    ...overrides
  };
}

function makePlan(overrides = {}) {
  return {
    planId: 'plan-fj-demo',
    changeId: 'eos-ladder-41-mission-fj',
    ritualMode: 'ACTIVE',
    roundTrip: makeMockRoundTrip(),
    ...overrides
  };
}

describe('Mission FJ — Round-Trip / Request-Reply Integrity Governance Receipt (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 78141c3d', () => {
    assert.equal(FJ_PRODUCTION_READY, 'NO');
    assert.equal(FJ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FJ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FJ_FREEZE_PIN_SHORT, '78141c3d');
    assert.equal(FJ_FREEZE_PIN, '78141c3d295579f210589301230af5d0853df392');
  });

  it('FJ2: builds canonical nine-field sealed FJ-RCPT-* with freeze soft-observe + ceiling + integrityHold + roundTripDigest', () => {
    const receipt = buildRoundTripIntegrityGovernanceReceipt({
      planId: 'plan-fj-01',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeMockRoundTrip()
    });

    assert.equal(receipt.kind, FJ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(receipt.operation, FJ_OPERATION);
    assert.equal(receipt.operation, 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_GOVERNANCE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawRoundTripSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.integrityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.integrityHold.failClosed, true);
    assert.equal(receipt.integrityHold.requestReplyCorrelated, true);
    assert.equal(receipt.integrityHold.digestMatchRequired, true);
    assert.equal(receipt.integrityHold.roundTripSecretMaterialRefused, true);
    assert.equal(receipt.integrityHold.roundTripSecretZeroHeld, true);
    assert.equal(receipt.integrityHold.liveHttpEgressRefused, true);
    assert.equal(receipt.integrityHold.composesOverFiCorrelationRegistry, true);
    assert.equal(receipt.integrityHold.softObserveL39IngressRefsOnly, true);
    assert.equal(receipt.integrityHold.softObserveL40OutboundRefsOnly, true);
    assert.equal(receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFdOutboundRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFkMismatchQuarantine, true);
    assert.equal(receipt.integrityHold.distinctFromCanaryDeliveryDispatcher, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.roundTripDigest, 'string');
    assert.equal(receipt.roundTripDigest.length, 64);
    assert.equal(typeof receipt.integrityDigest, 'string');
    assert.equal(receipt.integrityDigest.length, 64);

    const seal = canonicalRoundTripIntegrityGovernanceSealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'roundTripDigest',
      'operation',
      'planId',
      'prevReceiptHash',
      'receiptId',
      'timestamp'
    ].sort());
    // Law VI: seal body must not contain secret-looking keys or secret tokens
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(scanForSecrets(seal), false);
  });

  it('FJ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildRoundTripIntegrityGovernanceReceipt({
      planId: 'plan-fj-tamper',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeMockRoundTrip()
    });

    assert.equal(verifyRoundTripIntegrityGovernanceReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyRoundTripIntegrityGovernanceReceipt(tampered).ok, false);

    const badKind = { ...receipt, kind: 'other' };
    assert.equal(verifyRoundTripIntegrityGovernanceReceipt(badKind).ok, false);

    const flipped = { ...receipt, productionReady: 'YES' };
    assert.equal(verifyRoundTripIntegrityGovernanceReceipt(flipped).ok, false);
  });

  it('FJ4: verifies round-trip integrity from sha256 digests only (MATCH / MISMATCH / invalid)', () => {
    const rt = makeMockRoundTrip();
    const okRes = verifyRoundTripIntegrity(rt);
    assert.equal(okRes.ok, true);
    assert.equal(okRes.requestIntegrityMatch, true);
    assert.equal(okRes.integrityDigest.length, 64);

    const mismatch = verifyRoundTripIntegrity(
      makeMockRoundTrip({ echoedRequestDigest: digestOf('tampered-echo') })
    );
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.requestIntegrityMatch, false);
    assert.equal(mismatch.integrityDigest.length, 64);
    assert.ok(mismatch.reason.includes('mismatch'));

    const invalid = verifyRoundTripIntegrity(
      makeMockRoundTrip({ requestDigest: 'not-a-sha256-digest' })
    );
    assert.equal(invalid.ok, false);
    assert.equal(invalid.integrityDigest, undefined);

    assert.equal(isValidDigestHex(digestOf('x')), true);
    assert.equal(isValidDigestHex('abc'), false);
    assert.equal(isValidDigestHex(null), false);
    assert.equal(isValidDigestHex(42), false);
  });


  it('FJ5: rejects missing planId / changeId / roundTrip + invalid roundTrip shape', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const noPlan = gate.evaluatePreconditions({ changeId: 'eos-ladder-41-mission-fj' });
    assert.equal(noPlan.ok, false);
    assert.equal(noPlan.code, FJ_CODES.MISSING_PLAN_ID);

    const noChange = gate.evaluatePreconditions({ planId: 'plan-fj-nochange' });
    assert.equal(noChange.ok, false);
    assert.equal(noChange.code, FJ_CODES.MISSING_CHANGE_ID);

    const noRoundTrip = gate.evaluatePreconditions({
      planId: 'plan-fj-nort',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE'
    });
    assert.equal(noRoundTrip.ok, false);
    assert.equal(noRoundTrip.decision, 'DENY');
    assert.equal(noRoundTrip.code, FJ_CODES.MISSING_ROUND_TRIP);

    const invalidRoundTrip = gate.evaluatePreconditions({
      planId: 'plan-fj-badrt',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: 'not-an-object'
    });
    assert.equal(invalidRoundTrip.ok, false);
    assert.equal(invalidRoundTrip.decision, 'DENY');
    assert.equal(invalidRoundTrip.code, FJ_CODES.INVALID_ROUND_TRIP);
  });

  it('FJ6: rejects missing correlationId / roundTripId / requestRef / replyRef / roundTripClass / desiredIntegrity', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const cases = [
      [{ correlationId: '' }, FJ_CODES.MISSING_CORRELATION_ID],
      [{ roundTripId: '   ' }, FJ_CODES.MISSING_ROUND_TRIP_ID],
      [{ requestRef: '' }, FJ_CODES.MISSING_REQUEST_REF],
      [{ replyRef: '' }, FJ_CODES.MISSING_REPLY_REF],
      [{ roundTripClass: '' }, FJ_CODES.MISSING_ROUND_TRIP_CLASS],
      [{ desiredIntegrity: null }, FJ_CODES.MISSING_DESIRED_INTEGRITY]
    ];

    for (const [override, code] of cases) {
      const res = gate.evaluatePreconditions(
        makePlan({ roundTrip: makeMockRoundTrip(override) })
      );
      assert.equal(res.ok, false, JSON.stringify(override));
      assert.equal(res.code, code, JSON.stringify(override));
    }
  });

  it('FJ7: rejects invalid integrity states, invalid digests, and request/reply ref collision', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const badDesired = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ desiredIntegrity: 'MAYBE' }) })
    );
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.code, FJ_CODES.INVALID_DESIRED_INTEGRITY);

    const badObserved = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ observedIntegrity: 'PERCENT_50' }) })
    );
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FJ_CODES.INVALID_OBSERVED_INTEGRITY);

    const missingDigest = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ requestDigest: '' }) })
    );
    assert.equal(missingDigest.ok, false);
    assert.equal(missingDigest.code, FJ_CODES.MISSING_REQUEST_DIGEST);

    const badDigest = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ replyDigest: 'raw-payload-not-a-digest' }) })
    );
    assert.equal(badDigest.ok, false);
    assert.equal(badDigest.code, FJ_CODES.INVALID_REPLY_DIGEST);

    const collision = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ replyRef: 'req-opaque-fj-demo-001' }) })
    );
    assert.equal(collision.ok, false);
    assert.equal(collision.code, FJ_CODES.ROUND_TRIP_REF_COLLISION);

    assert.equal(isValidIntegrityState('MATCH'), true);
    assert.equal(isValidIntegrityState('MISMATCH'), true);
    assert.equal(isValidIntegrityState('HOLD'), true);
    assert.equal(isValidIntegrityState('BOUND'), false);
  });


  it('FJ8: fail-closed DENY on digest mismatch and on MISMATCH requested in ACTIVE mode', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const mismatch = gate.evaluatePreconditions(
      makePlan({
        roundTrip: makeMockRoundTrip({ echoedRequestDigest: digestOf('wrong-echo') })
      })
    );
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FJ_CODES.ROUND_TRIP_DIGEST_MISMATCH);

    const requestedMismatch = gate.evaluatePreconditions(
      makePlan({
        roundTrip: makeMockRoundTrip({
          desiredIntegrity: 'MISMATCH',
          observedIntegrity: 'MISMATCH'
        })
      })
    );
    assert.equal(requestedMismatch.ok, false);
    assert.equal(requestedMismatch.decision, 'DENY');
    assert.equal(requestedMismatch.code, FJ_CODES.ROUND_TRIP_MISMATCH_REFUSED);
  });

  it('FJ9: rejects live HTTP egress / wall-clock / tip-refresh authority / FI-FK-EY-FD-Canary elevate / schema-json add', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const live = gate.evaluatePreconditions(makePlan({ liveHttpEgress: true }));
    assert.equal(live.ok, false);
    assert.equal(live.code, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const wallClock = gate.evaluatePreconditions(
      makePlan({ instruction: 'claiming wall-clock authority' })
    );
    assert.equal(wallClock.ok, false);
    assert.equal(wallClock.code, FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipRefresh = gate.evaluatePreconditions(
      makePlan({ instruction: 'claiming tip-refresh authority' })
    );
    assert.equal(tipRefresh.ok, false);
    assert.equal(tipRefresh.code, FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const fiClaim = gate.evaluatePreconditions(
      makePlan({ instruction: 'make fi the round-trip integrity port' })
    );
    assert.equal(fiClaim.ok, false);
    assert.equal(fiClaim.code, FJ_CODES.FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN);

    const fkClaim = gate.evaluatePreconditions(
      makePlan({ instruction: 'make fk the round-trip integrity port' })
    );
    assert.equal(fkClaim.ok, false);
    assert.equal(fkClaim.code, FJ_CODES.FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN);

    const eyClaim = gate.evaluatePreconditions(
      makePlan({ instruction: 'make ey the round-trip integrity port' })
    );
    assert.equal(eyClaim.ok, false);
    assert.equal(eyClaim.code, FJ_CODES.EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN);

    const fdClaim = gate.evaluatePreconditions(
      makePlan({ instruction: 'make fd the round-trip integrity port' })
    );
    assert.equal(fdClaim.ok, false);
    assert.equal(fdClaim.code, FJ_CODES.FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN);

    const canaryClaim = gate.evaluatePreconditions(
      makePlan({ instruction: 'canary WebhookPayloadDispatcher as the round-trip port' })
    );
    assert.equal(canaryClaim.ok, false);
    assert.equal(canaryClaim.code, FJ_CODES.CANARY_AS_ROUND_TRIP_FORBIDDEN);

    const schema = gate.evaluatePreconditions(
      makePlan({ instruction: 'add docs/schemas/new-round-trip.json' })
    );
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    const rawSecret = gate.evaluatePreconditions(
      makePlan({ instruction: 'seal the raw round-trip secret into receipt' })
    );
    assert.equal(rawSecret.ok, false);
    assert.equal(rawSecret.code, FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN);

    assert.equal(claimsFiRegistryAsRoundTrip('make fi the round-trip port'), true);
    assert.equal(claimsFkQuarantineAsRoundTrip('elevate fk quarantine to round-trip'), true);
    assert.equal(claimsRawRoundTripSecretMaterial('raw request payload'), true);
  });


  it('FJ10: allows HOLD mode and integrity HOLD state with zero mutations', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const holdMode = gate.evaluatePreconditions({
      planId: 'plan-fj-hold',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'HOLD'
    });
    assert.equal(holdMode.ok, true);
    assert.equal(holdMode.decision, 'HOLD');
    assert.equal(holdMode.code, FJ_CODES.HOLD);

    const integrityHold = gate.evaluatePreconditions(
      makePlan({
        roundTrip: makeMockRoundTrip({
          desiredIntegrity: 'HOLD',
          observedIntegrity: 'HOLD'
        })
      })
    );
    assert.equal(integrityHold.ok, true);
    assert.equal(integrityHold.decision, 'HOLD');
    assert.equal(integrityHold.code, FJ_CODES.HOLD);
  });

  it('FJ11: DENY (ROUND_TRIP_UNAUTHORIZED / INVALID_ROUND_TRIP_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const unauthorized = gate.evaluatePreconditions(
      makePlan({ roundTrip: makeMockRoundTrip({ authorized: false }) })
    );
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions(
      makePlan({
        roundTrip: makeMockRoundTrip({
          desiredIntegrity: 'MATCH',
          observedIntegrity: 'MISMATCH',
          authorized: true
        })
      })
    );
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FJ_CODES.INVALID_ROUND_TRIP_CLAIM);
  });

  it('FJ12: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { roundTrip: makeMockRoundTrip({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' },
      { correlationSecret: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        ...makePlan(),
        ...extra
      };
      if (extra.roundTrip) plan.roundTrip = extra.roundTrip;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(
      findSecretLookingField({ correlationId: 'ok', requestRef: 'ok', replyRef: 'ok' }),
      null
    );
  });


  it('FJ13: policy gate DENY on synthetic secret tokens (Law VI) + hard delete + mass prune', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions(makePlan({ instruction: secret }));
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions(makePlan({ forceDelete: true }));
    assert.equal(del.ok, false);
    assert.equal(del.code, FJ_CODES.HARD_DELETE_FORBIDDEN);

    const prune = gate.evaluatePreconditions(makePlan({ massPrune: true }));
    assert.equal(prune.ok, false);
    assert.equal(prune.code, FJ_CODES.MASS_PRUNE_FORBIDDEN);

    assert.equal(scanForSecrets(secret), true);
  });

  it('FJ14: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const res = gate.evaluatePreconditions(
      makePlan({ target: 'Documents/Fundacion/round-trip-integrity' })
    );
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.FUNDACION_DENIED);

    const receipt = buildRoundTripIntegrityGovernanceReceipt({
      planId: 'plan-fj-delta0',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FJ15: DENY on PRODUCTION_READY flip, tip rewrite, L30–L40 reopen, L41 auto-close, GHE', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const prRes = gate.evaluatePreconditions(makePlan({ productionReady: 'YES' }));
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FJ_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FJ_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FJ_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FJ_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FJ_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FJ_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FJ_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FJ_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FJ_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FJ_CODES.L39_REOPEN_FORBIDDEN],
      ['reopen ladder-40', FJ_CODES.L40_REOPEN_FORBIDDEN],
      ['auto-close ladder-41 now', FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions(makePlan({ instruction }));
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions(
      makePlan({ action: 'force-push main to rewrite tip' })
    );
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FJ_CODES.TIP_REWRITE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions(
      makePlan({ claim: 'GHE branch protection enforced' })
    );
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FJ_CODES.GHE_CLAIM_FORBIDDEN);
  });

  it('FJ16: auto-seal refused without human gate holding', () => {
    const gate = new RoundTripIntegrityGovernancePolicyGate();

    const autoSealRes = gate.evaluatePreconditions(
      makePlan({ autoSeal: true, humanGateHeld: false })
    );
    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FJ_CODES.AUTO_SEAL_FORBIDDEN);

    const heldRes = gate.evaluatePreconditions(
      makePlan({ autoSeal: true, humanGateHeld: true })
    );
    assert.equal(heldRes.ok, true);
    assert.equal(heldRes.decision, 'PASS');
  });
});

describe('Mission FJ — Round-Trip / Request-Reply Integrity Governance Port (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ17: govern happy path ACTIVE + MATCH digests -> PASS + FJ-RCPT-* (≠ FI/FK/EY/FD ≠ tip-refresh)', async () => {
    const port = new RoundTripIntegrityGovernancePort();

    const res = await port.govern(makePlan({ planId: 'plan-fj-pass' }));

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.roundTrip.evaluated, true);
    assert.equal(res.receipt.roundTrip.status, 'ROUND_TRIP_VERIFIED');
    assert.equal(res.receipt.roundTrip.requestIntegrityMatch, true);
    assert.equal(res.receipt.roundTrip.integrityVerified, true);
    assert.equal(res.receipt.roundTrip.requestRef, 'req-opaque-fj-demo-001');
    assert.equal(res.receipt.roundTrip.replyRef, 'reply-opaque-fj-demo-001');
    assert.equal(res.receipt.integrityHold.liveHttpEgressRefused, true);
    assert.equal(res.receipt.integrityHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.integrityHold.roundTripSecretMaterialRefused, true);
    assert.equal(res.receipt.integrityHold.roundTripSecretZeroHeld, true);
    assert.equal(res.receipt.integrityHold.requestReplyCorrelated, true);
    assert.equal(res.receipt.integrityHold.digestMatchRequired, true);
    assert.equal(res.receipt.integrityHold.composesOverFiCorrelationRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromEyIngressRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFdOutboundRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFkMismatchQuarantine, true);
    assert.equal(res.receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(res.receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(typeof res.receipt.roundTripDigest, 'string');
    assert.equal(res.receipt.roundTripDigest.length, 64);
    assert.equal(typeof res.receipt.integrityDigest, 'string');
    assert.equal(res.receipt.integrityDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FJ_PORT_KIND, 'eos-round-trip-integrity-governance-port');

    const seal = canonicalRoundTripIntegrityGovernanceSealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.roundTrip), null);
    assert.equal(port.verifyRoundTrip(res.receipt).ok, true);
  });

  it('FJ18: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new RoundTripIntegrityGovernancePort();

    const res = await port.govern({
      planId: 'plan-fj-hold',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(port.trail.length, 1);
  });

  it('FJ19: verifyTrail + ROUND_TRIP_UNAUTHORIZED deny + secret-field deny + live-store deny + digest-mismatch deny', async () => {
    const port = new RoundTripIntegrityGovernancePort();

    await port.govern(makePlan({ planId: 'plan-fj-trail-01' }));
    await port.govern({
      planId: 'plan-fj-trail-02',
      changeId: 'eos-ladder-41-mission-fj',
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

    const denyPort = new RoundTripIntegrityGovernancePort();
    const unauthRes = await denyPort.govern(
      makePlan({
        planId: 'plan-fj-unauth-deny',
        roundTrip: makeMockRoundTrip({ authorized: false })
      })
    );
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FJ_CODES.ROUND_TRIP_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.roundTrip.status, 'ROUND_TRIP_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.integrityHold.failClosed, true);
    assert.equal(unauthRes.receipt.integrityHold.roundTripSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern(
      makePlan({ planId: 'plan-fj-secretfield-deny', password: 'should-never-seal' })
    );
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FJ-RCPT-'));
    const denySeal = canonicalRoundTripIntegrityGovernanceSealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern(
      makePlan({ planId: 'plan-fj-live-deny', liveHttpEgress: true })
    );
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const digestDeny = await denyPort.govern(
      makePlan({
        planId: 'plan-fj-digest-deny',
        roundTrip: makeMockRoundTrip({ echoedRequestDigest: digestOf('tampered') })
      })
    );
    assert.equal(digestDeny.ok, false);
    assert.equal(digestDeny.decision, 'DENY');
    assert.equal(digestDeny.code, FJ_CODES.ROUND_TRIP_DIGEST_MISMATCH);
    assert.equal(digestDeny.receipt.roundTrip.status, 'ROUND_TRIP_DIGEST_MISMATCH');
    assert.equal(denyPort.verifyTrail().ok, true);

    assert.equal(FJ_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FJ_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L39_REOPEN_FORBIDDEN, 'L39_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L40_REOPEN_FORBIDDEN, 'L40_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN, 'L41_AUTO_CLOSE_FORBIDDEN');
    assert.equal(
      FJ_CODES.FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN,
      'FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN'
    );
  });

  it('FJ20: verifyRoundTrip detects roundTripDigest linkage tampering + computeRoundTripDigest is deterministic', () => {
    const rt = makeMockRoundTrip();
    const digestA = computeRoundTripDigest(rt);
    const digestB = computeRoundTripDigest(rt);
    assert.equal(digestA, digestB);
    assert.equal(digestA.length, 64);
    assert.notEqual(digestA, computeRoundTripDigest(makeMockRoundTrip({ replyRef: 'other-ref' })));

    const receipt = buildRoundTripIntegrityGovernanceReceipt({
      planId: 'plan-fj-link',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: rt
    });
    const port = new RoundTripIntegrityGovernancePort();
    assert.equal(port.verifyRoundTrip(receipt).ok, true);

    const tamperedRoundTrip = {
      ...receipt,
      roundTrip: { ...receipt.roundTrip, requestRef: 'swapped-request-ref' }
    };
    const linkage = port.verifyRoundTrip(tamperedRoundTrip);
    assert.equal(linkage.ok, false);
    assert.equal(linkage.reason, 'roundTripDigest mismatch');

    const mismatched = {
      ...receipt,
      roundTrip: { ...receipt.roundTrip, echoedRequestDigest: digestOf('different-echo') }
    };
    assert.equal(port.verifyRoundTrip(mismatched).ok, false);
  });
});

