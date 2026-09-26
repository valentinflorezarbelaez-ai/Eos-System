/**
 * Mission FF — Outbound Delivery Quarantine / Retry-Deny Governance Port Test Suite.
 * SPEC-0168 / ADR-0151.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 1079bddf (do NOT rewrite tip pins)
 * - PASS = sealed outbound delivery quarantine/retry-deny ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live outbound delivery mutation ≠ wall-clock authority ≠ FD/FE/EB/L36/FG
 * - NEVER reopen L30–L39; refuse L40 auto-close (FG–FH pending)
 * - Hermetic injected observedStage only
 * - Distinct from FD/FE/EB/L36/EU/EV and FG (next)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FF_PRODUCTION_READY,
  FF_RECEIPT_PRODUCTION_READY,
  FF_RECEIPT_KIND,
  FF_FREEZE_PIN_SHORT,
  FF_FREEZE_PIN,
  FF_OPERATION,
  FF_STAGE_STATES,
  buildOutboundDeliveryQuarantineRetryDenyReceipt,
  verifyOutboundDeliveryQuarantineRetryDenyReceipt,
  canonicalOutboundDeliveryQuarantineRetryDenySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/outbound-delivery-quarantine-retry-deny-receipt.js';

import {
  OutboundDeliveryQuarantineRetryDenyPolicyGate,
  FF_CODES,
  FF_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveOutboundDeliveryMutation,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/outbound-delivery-quarantine-retry-deny-policy-gate.js';

import {
  OutboundDeliveryQuarantineRetryDenyPort,
  FF_PORT_PRODUCTION_READY,
  FF_PORT_KIND
} from '../src/core/composition/outbound-delivery-quarantine-retry-deny-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockQuarantine(overrides = {}) {
  return {
    deliveryId: 'dlv-opaque-ff-demo-001',
    targetId: 'tgt-opaque-ff-demo-001',
    authenticityRef: 'auth-opaque-fe-demo-001',
    quarantineClass: 'outbound-delivery-quarantine',
    desiredStage: 'QUARANTINE',
    observedStage: 'QUARANTINE',
    authorized: true,
    ...overrides
  };
}

describe('Mission FF — Outbound Delivery Quarantine Retry-Deny Receipt (SPEC-0168)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FF1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 1079bddf', () => {
    assert.equal(FF_PRODUCTION_READY, 'NO');
    assert.equal(FF_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FF_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FF_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FF_FREEZE_PIN_SHORT, '1079bddf');
    assert.equal(FF_FREEZE_PIN, '1079bddfd403fbf39c47e6eb1df6b2cfda14a373');
    assert.deepEqual([...FF_STAGE_STATES], [
      'QUARANTINE',
  'HOLD',
  'RETRY_DENY',
  'RELEASE_HOLD',
  'ACK',
  'ADMIT'
    ]);
  });

  it('FF2: builds canonical nine-field sealed FF-RCPT-* with freeze soft-observe + ceiling + quarantineHold + quarantineDigest + retryDenyDigest', () => {
    const receipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
      planId: 'plan-ff-01',
      changeId: 'eos-ladder-40-mission-ff',
      decision: 'PASS',
      quarantine: makeMockQuarantine()
    });

    assert.equal(receipt.kind, FF_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FF-RCPT-'));
    assert.equal(receipt.operation, FF_OPERATION);
    assert.equal(receipt.operation, 'OUTBOUND_DELIVERY_QUARANTINE_RETRY_DENY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '1079bddf');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveOutboundDeliveryMutationRefused, true);
    assert.equal(receipt.freezeObserve.liveHttpEgressEndpointRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawCallbackSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.rawPayloadMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.quarantineHold.failClosed, true);
    assert.equal(receipt.quarantineHold.callbackSecretMaterialRefused, true);
    assert.equal(receipt.quarantineHold.quarantineSecretZeroHeld, true);
    assert.equal(receipt.quarantineHold.liveOutboundDeliveryMutationRefused, true);
    assert.equal(receipt.quarantineHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(receipt.quarantineHold.distinctFromFeOutboundCallbackAuthenticity, true);
    assert.equal(receipt.quarantineHold.distinctFromEbDeadLetterQuarantine, true);
    assert.equal(receipt.quarantineHold.distinctFromL36AdmissionBackpressure, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.quarantineDigest, 'string');
    assert.equal(receipt.quarantineDigest.length, 64);
    assert.equal(typeof receipt.retryDenyDigest, 'string');
    assert.equal(receipt.retryDenyDigest.length, 64);

    const seal = canonicalOutboundDeliveryQuarantineRetryDenySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'quarantineDigest',
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

  it('FF3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
      planId: 'plan-ff-tamper',
      changeId: 'eos-ladder-40-mission-ff',
      decision: 'PASS'
    });

    assert.equal(verifyOutboundDeliveryQuarantineRetryDenyReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyOutboundDeliveryQuarantineRetryDenyReceipt(tampered).ok, false);
  });
});

describe('Mission FF — Outbound Delivery Quarantine Retry-Deny Policy Gate (SPEC-0168)', () => {
  it('FF4: validates well-formed plan (planId+changeId+ACTIVE+quarantine deliveryId/targetId/quarantineClass/desiredStage/authorized)', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();
    const quarantine = makeMockQuarantine();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ff-valid',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FF_CODES.OK);
  });

  it('FF5: rejects missing quarantine or invalid quarantine object', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ff-noquarantine',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FF_CODES.MISSING_QUARANTINE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ff-invalidquarantine',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FF_CODES.INVALID_QUARANTINE);
  });

  it('FF6: rejects missing deliveryId / quarantineClass / desiredStage', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ff-noid',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ deliveryId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FF_CODES.MISSING_DELIVERY_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-ff-badsourceid',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ targetId: '   ' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, FF_CODES.MISSING_TARGET_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ff-noclass',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ quarantineClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FF_CODES.MISSING_QUARANTINE_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-ff-nodesired',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FF_CODES.MISSING_DESIRED_STAGE);
  });

  it('FF7: DENY invalid desiredStage/observedStage + live outbound delivery mutation claims', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-ff-baddesired',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FF_CODES.INVALID_DESIRED_STAGE);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-ff-badobserved',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ observedStage: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FF_CODES.INVALID_OBSERVED_STAGE);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ff-livemutation',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      liveOutboundDeliveryMutation: true,
      quarantine: makeMockQuarantine()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FF_CODES.LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN);
  });

  it('FF8: rejects live outbound delivery mutation / wall-clock / tip-refresh authority / FD-FE-EB-L36-FG elevate / schema-json add', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const mutationClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-mutationclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live outbound delivery mutation verify',
      quarantine: makeMockQuarantine()
    });
    assert.equal(mutationClaim.ok, false);
    assert.equal(mutationClaim.code, FF_CODES.LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN);

    const endpointClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-endpointclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live HTTP egress endpoint',
      quarantine: makeMockQuarantine()
    });
    assert.equal(endpointClaim.ok, false);
    assert.equal(endpointClaim.code, FF_CODES.LIVE_HTTP_EGRESS_ENDPOINT_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-rolloutclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      quarantine: makeMockQuarantine()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FF_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-ff-tipauth',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      quarantine: makeMockQuarantine()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FF_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eyClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-eyclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'make fd the quarantine port for ingress',
      quarantine: makeMockQuarantine()
    });
    assert.equal(eyClaim.ok, false);
    assert.equal(eyClaim.code, FF_CODES.FD_REGISTRY_AS_QUARANTINE_FORBIDDEN);

    const ezClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-ezclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'make fe the quarantine port',
      quarantine: makeMockQuarantine()
    });
    assert.equal(ezClaim.ok, false);
    assert.equal(ezClaim.code, FF_CODES.FE_AUTHENTICITY_AS_QUARANTINE_FORBIDDEN);

    const ebClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-ebclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'elevate dead-letter quarantine as outbound quarantine',
      quarantine: makeMockQuarantine()
    });
    assert.equal(ebClaim.ok, false);
    assert.equal(ebClaim.code, FF_CODES.EB_DEAD_LETTER_AS_QUARANTINE_FORBIDDEN);

    const l36Claim = gate.evaluatePreconditions({
      planId: 'plan-ff-l36claim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'elevate admission backpressure as quarantine',
      quarantine: makeMockQuarantine()
    });
    assert.equal(l36Claim.ok, false);
    assert.equal(l36Claim.code, FF_CODES.L36_ADMISSION_AS_QUARANTINE_FORBIDDEN);

    const fbClaim = gate.evaluatePreconditions({
      planId: 'plan-ff-fbclaim',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'make fg the quarantine port',
      quarantine: makeMockQuarantine()
    });
    assert.equal(fbClaim.ok, false);
    assert.equal(fbClaim.code, FF_CODES.FG_HONESTY_AS_QUARANTINE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ff-schema',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-ingress-quarantine.json',
      quarantine: makeMockQuarantine()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FF_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveOutboundDeliveryMutation('claiming live outbound delivery mutation'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FF9: allows HOLD mode with zero mutations', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ff-hold',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FF_CODES.HOLD);
  });

  it('FF10: DENY (QUARANTINE_UNAUTHORIZED / INVALID_STAGE_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ff-unauth',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FF_CODES.QUARANTINE_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ff-mismatch',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({
        desiredStage: 'QUARANTINE',
        observedStage: 'ADMIT',
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FF_CODES.INVALID_STAGE_CLAIM);
  });

  it('FF11: Law VI DENY when secret-looking fields present (password/token/apiKey/webhookSecret/hmacKey/rawPayload)', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { quarantine: makeMockQuarantine({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' },
      { rawPayload: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-ff-secretfield',
        changeId: 'eos-ladder-40-mission-ff',
        ritualMode: 'ACTIVE',
        quarantine: makeMockQuarantine(),
        ...extra
      };
      if (extra.quarantine) plan.quarantine = extra.quarantine;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FF_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ deliveryId: 'ok', targetId: 'ok' }), null);
  });

  it('FF12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ff-secret',
      changeId: 'eos-ladder-40-mission-ff',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FF_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-ff-del',
      changeId: 'eos-ladder-40-mission-ff',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FF_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FF13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ff-fundacion',
      changeId: 'eos-ladder-40-mission-ff',
      target: 'Documents/Fundacion/ingress-quarantine'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FF_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
      planId: 'plan-ff-delta0',
      changeId: 'eos-ladder-40-mission-ff',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FF14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L39 reopen, L40 auto-close, mass prune, GHE', () => {
    const gate = new OutboundDeliveryQuarantineRetryDenyPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ff-pr',
      changeId: 'eos-ladder-40-mission-ff',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FF_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FF_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FF_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FF_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FF_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FF_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FF_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FF_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FF_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FF_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FF_CODES.L39_REOPEN_FORBIDDEN],
      ['auto-close ladder-40 now', FF_CODES.L40_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-ff-ladder',
        changeId: 'eos-ladder-40-mission-ff',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ff-tip',
      changeId: 'eos-ladder-40-mission-ff',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FF_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ff-mass',
      changeId: 'eos-ladder-40-mission-ff',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FF_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ff-ghe',
      changeId: 'eos-ladder-40-mission-ff',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FF_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FF — Outbound Delivery Quarantine Retry-Deny Port (SPEC-0168)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FF15: govern happy path ACTIVE + authorized matching quarantine stage -> PASS + FF-RCPT-* (≠ FD/FE/EB/L36/FG ≠ tip-refresh)', async () => {
    const port = new OutboundDeliveryQuarantineRetryDenyPort();
    const quarantine = makeMockQuarantine({
      desiredStage: 'RETRY_DENY',
      observedStage: 'RETRY_DENY',
      authorized: true
    });

    const res = await port.govern({
      planId: 'plan-ff-pass',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FF-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.quarantine.evaluated, true);
    assert.equal(res.receipt.quarantine.status, 'QUARANTINE_EVALUATED');
    assert.equal(res.receipt.quarantine.desiredStage, 'RETRY_DENY');
    assert.equal(res.receipt.quarantineHold.liveOutboundDeliveryMutationRefused, true);
    assert.equal(res.receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.quarantineHold.callbackSecretMaterialRefused, true);
    assert.equal(res.receipt.quarantineHold.quarantineSecretZeroHeld, true);
    assert.equal(res.receipt.quarantineHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(res.receipt.quarantineHold.distinctFromFeOutboundCallbackAuthenticity, true);
    assert.equal(res.receipt.quarantineHold.distinctFromEbDeadLetterQuarantine, true);
    assert.equal(res.receipt.quarantineHold.distinctFromL36AdmissionBackpressure, true);
    assert.equal(res.receipt.freezeObserve.liveOutboundDeliveryMutationRefused, true);
    assert.equal(res.receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '1079bddf');
    assert.equal(typeof res.receipt.quarantineDigest, 'string');
    assert.equal(res.receipt.quarantineDigest.length, 64);
    assert.equal(typeof res.receipt.retryDenyDigest, 'string');
    assert.equal(res.receipt.retryDenyDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FF_PORT_KIND, 'eos-outbound-delivery-quarantine-retry-deny-port');
    const seal = canonicalOutboundDeliveryQuarantineRetryDenySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.quarantine), null);
  });

  it('FF16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new OutboundDeliveryQuarantineRetryDenyPort();

    const res = await port.govern({
      planId: 'plan-ff-hold',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '1079bddf');
    assert.equal(port.trail.length, 1);
  });

  it('FF17: verifyTrail + QUARANTINE_UNAUTHORIZED deny + secret-field deny + live-mutation deny + auto-seal refuse + gate codes', async () => {
    const port = new OutboundDeliveryQuarantineRetryDenyPort();

    await port.govern({
      planId: 'plan-ff-trail-01',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: 'ADMIT', observedStage: 'ADMIT' })
    });

    await port.govern({
      planId: 'plan-ff-trail-02',
      changeId: 'eos-ladder-40-mission-ff',
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

    const denyPort = new OutboundDeliveryQuarantineRetryDenyPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ff-unauth-deny',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FF_CODES.QUARANTINE_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FF-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.quarantine.status, 'QUARANTINE_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.quarantineHold.failClosed, true);
    assert.equal(unauthRes.receipt.quarantineHold.callbackSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-ff-secretfield-deny',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      quarantine: makeMockQuarantine()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FF_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FF-RCPT-'));
    const denySeal = canonicalOutboundDeliveryQuarantineRetryDenySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-ff-live-deny',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      instruction: 'mutate live outbound delivery with live outbound delivery mutation',
      quarantine: makeMockQuarantine()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FF_CODES.LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ff-autoseal',
      changeId: 'eos-ladder-40-mission-ff',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      quarantine: makeMockQuarantine()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FF_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FF_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FF_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FF_CODES.L40_AUTO_CLOSE_FORBIDDEN, 'L40_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FF_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(FF_CODES.QUARANTINE_UNAUTHORIZED, 'QUARANTINE_UNAUTHORIZED');
    assert.equal(FF_CODES.INVALID_STAGE_CLAIM, 'INVALID_STAGE_CLAIM');
  });
});
