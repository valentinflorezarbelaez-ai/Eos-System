/**
 * Mission FJ — Bidirectional Delivery Correlation Registry & Binding Port Test Suite.
 * SPEC-0172 / ADR-0156.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 78141c3d (do NOT rewrite tip pins)
 * - PASS = sealed round-trip-request-reply-integrity binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FJ/Canary
 * - NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 * - Hermetic injected observedVerdict only; soft-observe L39 ingress + L40 outbound opaque refs
 * - Distinct from EY ingress registry, FD outbound registry, FJ round-trip (next)
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
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockRoundTrip(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fj-demo-001',
    roundTripId: 'rt-opaque-fj-demo-001',
    ingressId: 'ing-opaque-ey-fj-001',
    sourceId: 'src-opaque-ey-fj-001',
    targetId: 'tgt-opaque-fd-fj-001',
    deliveryId: 'dlv-opaque-fd-fj-001',
    requestId: 'req-opaque-fj-demo-001',
    replyId: 'rpl-opaque-fj-demo-001',
    integrityClass: 'round-trip-request-reply-integrity',
    desiredVerdict: 'INTACT',
    observedVerdict: 'INTACT',
    authorized: true,
    ...overrides
  };
}

describe('Mission FJ — Round-Trip / Request-Reply Integrity Receipt (SPEC-0172)', () => {
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

  it('FJ2: builds canonical nine-field sealed FJ-RCPT-* with freeze soft-observe + ceiling + integrityHold + integrityDigest', () => {
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-01',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS',
      roundTrip: makeMockRoundTrip()
    });

    assert.equal(receipt.kind, FJ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(receipt.operation, FJ_OPERATION);
    assert.equal(receipt.operation, 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY');
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
    assert.equal(receipt.freezeObserve.rawIntegritySecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.integrityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.integrityHold.failClosed, true);
    assert.equal(receipt.integrityHold.integritySecretMaterialRefused, true);
    assert.equal(receipt.integrityHold.integritySecretZeroHeld, true);
    assert.equal(receipt.integrityHold.liveHttpEgressRefused, true);
    assert.equal(receipt.integrityHold.softObserveFiCorrelationAndL39IngressRefsOnly, true);
    assert.equal(receipt.integrityHold.softObserveL40OutboundRefsOnly, true);
    assert.equal(receipt.integrityHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFdOutboundRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(receipt.integrityHold.distinctFromFkQuarantine, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.integrityDigest, 'string');
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
    // Law VI: seal body must not contain secret-looking keys
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(scanForSecrets(seal), false);
  });

  it('FJ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-tamper',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS'
    });

    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyRoundTripRequestReplyIntegrityReceipt(tampered).ok, false);
  });
});

describe('Mission FJ — Round-Trip / Request-Reply Integrity Policy Gate (SPEC-0172)', () => {
  it('FJ4: validates well-formed plan (planId+changeId+ACTIVE+roundTrip correlationId/requestId/replyId/ingressId/sourceId/targetId/deliveryId/integrityClass/desiredVerdict/authorized)', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();
    const roundTrip = makeMockRoundTrip();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fj-valid',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      roundTrip
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FJ_CODES.OK);
  });

  it('FJ5: rejects missing roundTrip or invalid roundTrip', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fj-nobinding',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FJ_CODES.MISSING_ROUND_TRIP);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fj-invalidbinding',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FJ_CODES.INVALID_ROUND_TRIP);
  });

  it('FJ6: rejects missing correlationId / requestId / replyId / ingressId / sourceId / targetId / deliveryId / integrityClass / desiredVerdict', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const resCorr = gate.evaluatePreconditions({
      planId: 'plan-fj-nocorr',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ correlationId: '' })
    });
    assert.equal(resCorr.ok, false);
    assert.equal(resCorr.code, FJ_CODES.MISSING_CORRELATION_ID);

    const resReq = gate.evaluatePreconditions({
      planId: 'plan-fj-noreq',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ requestId: '' })
    });
    assert.equal(resReq.ok, false);
    assert.equal(resReq.code, FJ_CODES.MISSING_REQUEST_ID);

    const resReply = gate.evaluatePreconditions({
      planId: 'plan-fj-noreply',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ replyId: '' })
    });
    assert.equal(resReply.ok, false);
    assert.equal(resReply.code, FJ_CODES.MISSING_REPLY_ID);

    const resIngress = gate.evaluatePreconditions({
      planId: 'plan-fj-noingress',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ ingressId: '' })
    });
    assert.equal(resIngress.ok, false);
    assert.equal(resIngress.code, FJ_CODES.MISSING_INGRESS_ID);

    const resSource = gate.evaluatePreconditions({
      planId: 'plan-fj-nosource',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ sourceId: '' })
    });
    assert.equal(resSource.ok, false);
    assert.equal(resSource.code, FJ_CODES.MISSING_SOURCE_ID);

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fj-noid',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ targetId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FJ_CODES.MISSING_TARGET_ID);

    const resDelivery = gate.evaluatePreconditions({
      planId: 'plan-fj-nodelivery',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ deliveryId: '' })
    });
    assert.equal(resDelivery.ok, false);
    assert.equal(resDelivery.code, FJ_CODES.MISSING_DELIVERY_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-fj-noclass',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ integrityClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FJ_CODES.MISSING_INTEGRITY_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-fj-nodesired',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ desiredVerdict: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FJ_CODES.MISSING_DESIRED_VERDICT);
  });

  it('FJ7: DENY invalid desiredVerdict/observedVerdict + live HTTP egress claims', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-fj-baddesired',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ desiredVerdict: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FJ_CODES.INVALID_DESIRED_VERDICT);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-fj-badobserved',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ observedVerdict: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FJ_CODES.INVALID_OBSERVED_VERDICT);

    const live = gate.evaluatePreconditions({
      planId: 'plan-fj-livesecret',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      liveHttpEgress: true,
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);
  });

  it('FJ8: rejects live HTTP egress / wall-clock / tip-refresh authority / EY-FD-FJ elevate / schema-json add', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-storeclaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live HTTP egress binding',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-rolloutclaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fj-tipauth',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eyClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-eyclaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'make ey the bidirectional correlation registry port',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(eyClaim.ok, false);
    assert.equal(eyClaim.code, FJ_CODES.EY_INGRESS_AS_INTEGRITY_FORBIDDEN);

    const fdClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-fdclaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'make fd the bidirectional correlation registry port',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(fdClaim.ok, false);
    assert.equal(fdClaim.code, FJ_CODES.FD_OUTBOUND_AS_INTEGRITY_FORBIDDEN);

    const fiClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-ficlaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'make fi the round-trip integrity port',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(fiClaim.ok, false);
    assert.equal(fiClaim.code, FJ_CODES.FI_REGISTRY_AS_INTEGRITY_FORBIDDEN);

    const fkClaim = gate.evaluatePreconditions({
      planId: 'plan-fj-fkclaim',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'make fk the round-trip integrity port',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(fkClaim.ok, false);
    assert.equal(fkClaim.code, FJ_CODES.FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fj-schema',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-round-trip-request-reply-integrity.json',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveHttpEgress('claiming live HTTP egress'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FJ9: allows HOLD mode with zero mutations', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fj-hold',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FJ_CODES.HOLD);
  });

  it('FJ10: DENY (INTEGRITY_UNAUTHORIZED / INVALID_INTEGRITY_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fj-unauth',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FJ_CODES.INTEGRITY_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fj-mismatch',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ desiredVerdict: 'INTACT', observedVerdict: 'BROKEN', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FJ_CODES.INVALID_INTEGRITY_CLAIM);
  });

  it('FJ11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

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
        planId: 'plan-fj-secretfield',
        changeId: 'eos-ladder-41-mission-fj',
        ritualMode: 'ACTIVE',
        roundTrip: makeMockRoundTrip(),
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
    assert.equal(findSecretLookingField({ correlationId: 'ok', ingressId: 'ok', targetId: 'ok' }), null);
  });

  it('FJ12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fj-secret',
      changeId: 'eos-ladder-41-mission-fj',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fj-del',
      changeId: 'eos-ladder-41-mission-fj',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FJ_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FJ13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fj-fundacion',
      changeId: 'eos-ladder-41-mission-fj',
      target: 'Documents/Fundacion/round-trip-request-reply-integrity'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FJ_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: 'plan-fj-delta0',
      changeId: 'eos-ladder-41-mission-fj',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FJ14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L40 reopen, L41 auto-close, mass prune, GHE', () => {
    const gate = new RoundTripRequestReplyIntegrityPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fj-pr',
      changeId: 'eos-ladder-41-mission-fj',
      productionReady: 'YES'
    });
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
      const r = gate.evaluatePreconditions({
        planId: 'plan-fj-ladder',
        changeId: 'eos-ladder-41-mission-fj',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fj-tip',
      changeId: 'eos-ladder-41-mission-fj',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FJ_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fj-mass',
      changeId: 'eos-ladder-41-mission-fj',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FJ_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fj-ghe',
      changeId: 'eos-ladder-41-mission-fj',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FJ_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FJ — Round-Trip / Request-Reply Integrity Port (SPEC-0172)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FJ15: govern happy path ACTIVE + authorized matching roundTrip -> PASS + FJ-RCPT-* (≠ EY/FD/FI/FK ≠ tip-refresh)', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();
    const roundTrip = makeMockRoundTrip({ desiredVerdict: 'INTACT', observedVerdict: 'INTACT', authorized: true });

    const res = await port.govern({
      planId: 'plan-fj-pass',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.roundTrip.evaluated, true);
    assert.equal(res.receipt.roundTrip.status, 'INTACT_EVALUATED');
    assert.equal(res.receipt.roundTrip.ingressId, 'ing-opaque-ey-fj-001');
    assert.equal(res.receipt.roundTrip.targetId, 'tgt-opaque-fd-fj-001');
    assert.equal(res.receipt.integrityHold.liveHttpEgressRefused, true);
    assert.equal(res.receipt.integrityHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.integrityHold.integritySecretMaterialRefused, true);
    assert.equal(res.receipt.integrityHold.integritySecretZeroHeld, true);
    assert.equal(res.receipt.integrityHold.distinctFromEyIngressRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFdOutboundRegistry, true);
    assert.equal(res.receipt.integrityHold.distinctFromFiCorrelationRegistry, true);
    assert.equal(res.receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(res.receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(typeof res.receipt.integrityDigest, 'string');
    assert.equal(res.receipt.integrityDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FJ_PORT_KIND, 'eos-round-trip-request-reply-integrity-port');
    const seal = canonicalRoundTripRequestReplyIntegritySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.roundTrip), null);
  });

  it('FJ16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
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
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(port.trail.length, 1);
  });

  it('FJ17: verifyTrail + INTEGRITY_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new RoundTripRequestReplyIntegrityPort();

    await port.govern({
      planId: 'plan-fj-trail-01',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip()
    });

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

    const denyPort = new RoundTripRequestReplyIntegrityPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fj-unauth-deny',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      roundTrip: makeMockRoundTrip({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FJ_CODES.INTEGRITY_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FJ-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.roundTrip.status, 'INTEGRITY_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.integrityHold.failClosed, true);
    assert.equal(unauthRes.receipt.integrityHold.integritySecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fj-secretfield-deny',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FJ_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FJ-RCPT-'));
    const denySeal = canonicalRoundTripRequestReplyIntegritySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fj-live-deny',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      instruction: 'bind live HTTP egress with live HTTP egress',
      roundTrip: makeMockRoundTrip()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fj-autoseal',
      changeId: 'eos-ladder-41-mission-fj',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      roundTrip: makeMockRoundTrip()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FJ_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FJ_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FJ_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L39_REOPEN_FORBIDDEN, 'L39_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L40_REOPEN_FORBIDDEN, 'L40_REOPEN_FORBIDDEN');
    assert.equal(FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN, 'L41_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FJ_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
