/**
 * Mission FI — Bidirectional Delivery Correlation Registry & Binding Port Test Suite.
 * SPEC-0171 / ADR-0155.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 78141c3d (do NOT rewrite tip pins)
 * - PASS = sealed bidirectional-delivery-correlation binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FJ/Canary
 * - NEVER reopen L30–L40; refuse L41 auto-close (FJ–FM pending)
 * - Hermetic injected observedBinding only; soft-observe L39 ingress + L40 outbound opaque refs
 * - Distinct from EY ingress registry, FD outbound registry, FJ round-trip (next)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FI_PRODUCTION_READY,
  FI_RECEIPT_PRODUCTION_READY,
  FI_RECEIPT_KIND,
  FI_FREEZE_PIN_SHORT,
  FI_FREEZE_PIN,
  FI_OPERATION,
  buildBidirectionalDeliveryCorrelationRegistryReceipt,
  verifyBidirectionalDeliveryCorrelationRegistryReceipt,
  canonicalBidirectionalDeliveryCorrelationRegistrySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/bidirectional-delivery-correlation-registry-receipt.js';

import {
  BidirectionalDeliveryCorrelationRegistryPolicyGate,
  FI_CODES,
  FI_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/bidirectional-delivery-correlation-registry-policy-gate.js';

import {
  BidirectionalDeliveryCorrelationRegistryPort,
  FI_PORT_PRODUCTION_READY,
  FI_PORT_KIND
} from '../src/core/composition/bidirectional-delivery-correlation-registry-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fi-demo-001',
    bindingId: 'bind-opaque-fi-demo-001',
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

describe('Mission FI — Bidirectional Delivery Correlation Registry Receipt (SPEC-0171)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FI1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 78141c3d', () => {
    assert.equal(FI_PRODUCTION_READY, 'NO');
    assert.equal(FI_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FI_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FI_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FI_FREEZE_PIN_SHORT, '78141c3d');
    assert.equal(FI_FREEZE_PIN, '78141c3d295579f210589301230af5d0853df392');
  });

  it('FI2: builds canonical nine-field sealed FI-RCPT-* with freeze soft-observe + ceiling + correlationHold + correlationDigest', () => {
    const receipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
      planId: 'plan-fi-01',
      changeId: 'eos-ladder-41-mission-fi',
      decision: 'PASS',
      binding: makeMockBinding()
    });

    assert.equal(receipt.kind, FI_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FI-RCPT-'));
    assert.equal(receipt.operation, FI_OPERATION);
    assert.equal(receipt.operation, 'BIDIRECTIONAL_DELIVERY_CORRELATION_REGISTRY_BINDING');
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
    assert.equal(receipt.freezeObserve.rawCorrelationSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.correlationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.correlationHold.failClosed, true);
    assert.equal(receipt.correlationHold.correlationSecretMaterialRefused, true);
    assert.equal(receipt.correlationHold.correlationSecretZeroHeld, true);
    assert.equal(receipt.correlationHold.liveHttpEgressRefused, true);
    assert.equal(receipt.correlationHold.softObserveL39IngressRefsOnly, true);
    assert.equal(receipt.correlationHold.softObserveL40OutboundRefsOnly, true);
    assert.equal(receipt.correlationHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.correlationHold.distinctFromFdOutboundRegistry, true);
    assert.equal(receipt.correlationHold.distinctFromFjRoundTripIntegrity, true);
    assert.equal(receipt.correlationHold.distinctFromCanaryDeliveryDispatcher, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.correlationDigest, 'string');
    assert.equal(receipt.correlationDigest.length, 64);

    const seal = canonicalBidirectionalDeliveryCorrelationRegistrySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'correlationDigest',
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

  it('FI3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
      planId: 'plan-fi-tamper',
      changeId: 'eos-ladder-41-mission-fi',
      decision: 'PASS'
    });

    assert.equal(verifyBidirectionalDeliveryCorrelationRegistryReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyBidirectionalDeliveryCorrelationRegistryReceipt(tampered).ok, false);
  });
});

describe('Mission FI — Bidirectional Delivery Correlation Registry Policy Gate (SPEC-0171)', () => {
  it('FI4: validates well-formed plan (planId+changeId+ACTIVE+binding correlationId/ingressId/sourceId/targetId/deliveryId/correlationClass/desiredBinding/authorized)', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();
    const binding = makeMockBinding();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fi-valid',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FI_CODES.OK);
  });

  it('FI5: rejects missing binding or invalid binding', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fi-nobinding',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FI_CODES.MISSING_BINDING);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fi-invalidbinding',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FI_CODES.INVALID_BINDING);
  });

  it('FI6: rejects missing correlationId / ingressId / sourceId / targetId / deliveryId / correlationClass / desiredBinding', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const resCorr = gate.evaluatePreconditions({
      planId: 'plan-fi-nocorr',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ correlationId: '' })
    });
    assert.equal(resCorr.ok, false);
    assert.equal(resCorr.code, FI_CODES.MISSING_CORRELATION_ID);

    const resIngress = gate.evaluatePreconditions({
      planId: 'plan-fi-noingress',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ ingressId: '' })
    });
    assert.equal(resIngress.ok, false);
    assert.equal(resIngress.code, FI_CODES.MISSING_INGRESS_ID);

    const resSource = gate.evaluatePreconditions({
      planId: 'plan-fi-nosource',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ sourceId: '' })
    });
    assert.equal(resSource.ok, false);
    assert.equal(resSource.code, FI_CODES.MISSING_SOURCE_ID);

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fi-noid',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ targetId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FI_CODES.MISSING_TARGET_ID);

    const resDelivery = gate.evaluatePreconditions({
      planId: 'plan-fi-nodelivery',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ deliveryId: '' })
    });
    assert.equal(resDelivery.ok, false);
    assert.equal(resDelivery.code, FI_CODES.MISSING_DELIVERY_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-fi-noclass',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ correlationClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FI_CODES.MISSING_CORRELATION_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-fi-nodesired',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FI_CODES.MISSING_DESIRED_BINDING);
  });

  it('FI7: DENY invalid desiredBinding/observedBinding + live HTTP egress claims', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-fi-baddesired',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FI_CODES.INVALID_DESIRED_BINDING);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-fi-badobserved',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ observedBinding: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FI_CODES.INVALID_OBSERVED_BINDING);

    const live = gate.evaluatePreconditions({
      planId: 'plan-fi-livesecret',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      liveHttpEgress: true,
      binding: makeMockBinding()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FI_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);
  });

  it('FI8: rejects live HTTP egress / wall-clock / tip-refresh authority / EY-FD-FJ elevate / schema-json add', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-fi-storeclaim',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live HTTP egress binding',
      binding: makeMockBinding()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, FI_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-fi-rolloutclaim',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      binding: makeMockBinding()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FI_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fi-tipauth',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      binding: makeMockBinding()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FI_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eyClaim = gate.evaluatePreconditions({
      planId: 'plan-fi-eyclaim',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'make ey the bidirectional correlation registry port',
      binding: makeMockBinding()
    });
    assert.equal(eyClaim.ok, false);
    assert.equal(eyClaim.code, FI_CODES.EY_INGRESS_AS_CORRELATION_FORBIDDEN);

    const fdClaim = gate.evaluatePreconditions({
      planId: 'plan-fi-fdclaim',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'make fd the bidirectional correlation registry port',
      binding: makeMockBinding()
    });
    assert.equal(fdClaim.ok, false);
    assert.equal(fdClaim.code, FI_CODES.FD_OUTBOUND_AS_CORRELATION_FORBIDDEN);

    const fjClaim = gate.evaluatePreconditions({
      planId: 'plan-fi-fjclaim',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'make fj the correlation registry',
      binding: makeMockBinding()
    });
    assert.equal(fjClaim.ok, false);
    assert.equal(fjClaim.code, FI_CODES.FJ_ROUND_TRIP_AS_REGISTRY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fi-schema',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-bidirectional-delivery-correlation.json',
      binding: makeMockBinding()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FI_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveHttpEgress('claiming live HTTP egress'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FI9: allows HOLD mode with zero mutations', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fi-hold',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FI_CODES.HOLD);
  });

  it('FI10: DENY (BINDING_UNAUTHORIZED / INVALID_BINDING_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fi-unauth',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FI_CODES.BINDING_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fi-mismatch',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'UNBOUND', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FI_CODES.INVALID_BINDING_CLAIM);
  });

  it('FI11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { binding: makeMockBinding({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' },
      { correlationSecret: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-fi-secretfield',
        changeId: 'eos-ladder-41-mission-fi',
        ritualMode: 'ACTIVE',
        binding: makeMockBinding(),
        ...extra
      };
      if (extra.binding) plan.binding = extra.binding;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FI_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ correlationId: 'ok', ingressId: 'ok', targetId: 'ok' }), null);
  });

  it('FI12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fi-secret',
      changeId: 'eos-ladder-41-mission-fi',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FI_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fi-del',
      changeId: 'eos-ladder-41-mission-fi',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FI_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FI13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fi-fundacion',
      changeId: 'eos-ladder-41-mission-fi',
      target: 'Documents/Fundacion/bidirectional-delivery-correlation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FI_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
      planId: 'plan-fi-delta0',
      changeId: 'eos-ladder-41-mission-fi',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FI14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L40 reopen, L41 auto-close, mass prune, GHE', () => {
    const gate = new BidirectionalDeliveryCorrelationRegistryPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fi-pr',
      changeId: 'eos-ladder-41-mission-fi',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FI_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FI_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FI_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FI_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FI_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FI_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FI_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FI_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FI_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FI_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FI_CODES.L39_REOPEN_FORBIDDEN],
      ['reopen ladder-40', FI_CODES.L40_REOPEN_FORBIDDEN],
      ['auto-close ladder-41 now', FI_CODES.L41_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fi-ladder',
        changeId: 'eos-ladder-41-mission-fi',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fi-tip',
      changeId: 'eos-ladder-41-mission-fi',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FI_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fi-mass',
      changeId: 'eos-ladder-41-mission-fi',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FI_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fi-ghe',
      changeId: 'eos-ladder-41-mission-fi',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FI_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FI — Bidirectional Delivery Correlation Registry Port (SPEC-0171)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FI15: govern happy path ACTIVE + authorized matching binding -> PASS + FI-RCPT-* (≠ EY/FD/FJ ≠ tip-refresh)', async () => {
    const port = new BidirectionalDeliveryCorrelationRegistryPort();
    const binding = makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'BOUND', authorized: true });

    const res = await port.govern({
      planId: 'plan-fi-pass',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FI-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.binding.evaluated, true);
    assert.equal(res.receipt.binding.status, 'BOUND_EVALUATED');
    assert.equal(res.receipt.binding.ingressId, 'ing-opaque-ey-demo-001');
    assert.equal(res.receipt.binding.targetId, 'tgt-opaque-fd-demo-001');
    assert.equal(res.receipt.correlationHold.liveHttpEgressRefused, true);
    assert.equal(res.receipt.correlationHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.correlationHold.correlationSecretMaterialRefused, true);
    assert.equal(res.receipt.correlationHold.correlationSecretZeroHeld, true);
    assert.equal(res.receipt.correlationHold.distinctFromEyIngressRegistry, true);
    assert.equal(res.receipt.correlationHold.distinctFromFdOutboundRegistry, true);
    assert.equal(res.receipt.correlationHold.distinctFromFjRoundTripIntegrity, true);
    assert.equal(res.receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(res.receipt.freezeObserve.l41AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l40ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(typeof res.receipt.correlationDigest, 'string');
    assert.equal(res.receipt.correlationDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FI_PORT_KIND, 'eos-bidirectional-delivery-correlation-registry-port');
    const seal = canonicalBidirectionalDeliveryCorrelationRegistrySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.binding), null);
  });

  it('FI16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new BidirectionalDeliveryCorrelationRegistryPort();

    const res = await port.govern({
      planId: 'plan-fi-hold',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '78141c3d');
    assert.equal(port.trail.length, 1);
  });

  it('FI17: verifyTrail + BINDING_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new BidirectionalDeliveryCorrelationRegistryPort();

    await port.govern({
      planId: 'plan-fi-trail-01',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding()
    });

    await port.govern({
      planId: 'plan-fi-trail-02',
      changeId: 'eos-ladder-41-mission-fi',
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

    const denyPort = new BidirectionalDeliveryCorrelationRegistryPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fi-unauth-deny',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FI_CODES.BINDING_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FI-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.binding.status, 'BINDING_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.correlationHold.failClosed, true);
    assert.equal(unauthRes.receipt.correlationHold.correlationSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fi-secretfield-deny',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      binding: makeMockBinding()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FI_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FI-RCPT-'));
    const denySeal = canonicalBidirectionalDeliveryCorrelationRegistrySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fi-live-deny',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      instruction: 'bind live HTTP egress with live HTTP egress',
      binding: makeMockBinding()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FI_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fi-autoseal',
      changeId: 'eos-ladder-41-mission-fi',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      binding: makeMockBinding()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FI_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FI_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FI_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FI_CODES.L39_REOPEN_FORBIDDEN, 'L39_REOPEN_FORBIDDEN');
    assert.equal(FI_CODES.L40_REOPEN_FORBIDDEN, 'L40_REOPEN_FORBIDDEN');
    assert.equal(FI_CODES.L41_AUTO_CLOSE_FORBIDDEN, 'L41_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FI_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
