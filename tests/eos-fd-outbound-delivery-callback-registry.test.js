/**
 * Mission FD — Outbound Delivery / Callback Target Registry & Binding Port Test Suite.
 * SPEC-0166 / ADR-0149.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin f9a14e16 (do NOT rewrite tip pins)
 * - PASS = sealed credential-outbound binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live HTTP egress ≠ wall-clock authority ≠ EY/ET/L33/Canary/FE
 * - NEVER reopen L30–L39; refuse L40 auto-close (FE–FH pending)
 * - Hermetic injected observedBinding only
 * - Distinct from ET/L33/EU/EW and EZ webhook authenticity
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FD_PRODUCTION_READY,
  FD_RECEIPT_PRODUCTION_READY,
  FD_RECEIPT_KIND,
  FD_FREEZE_PIN_SHORT,
  FD_FREEZE_PIN,
  FD_OPERATION,
  buildOutboundDeliveryCallbackRegistryReceipt,
  verifyOutboundDeliveryCallbackRegistryReceipt,
  canonicalOutboundDeliveryCallbackRegistrySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/outbound-delivery-callback-registry-receipt.js';

import {
  OutboundDeliveryCallbackRegistryPolicyGate,
  FD_CODES,
  FD_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/outbound-delivery-callback-registry-policy-gate.js';

import {
  OutboundDeliveryCallbackRegistryPort,
  FD_PORT_PRODUCTION_READY,
  FD_PORT_KIND
} from '../src/core/composition/outbound-delivery-callback-registry-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    targetId: 'tgt-opaque-fd-demo-001',
    deliveryId: 'dlv-opaque-fd-demo-001',
    targetClass: 'outbound-delivery-callback',
    bindingClass: 'outbound-delivery-callback',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

describe('Mission FD — Outbound Delivery / Callback Target Registry Receipt (SPEC-0166)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FD1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin f9a14e16', () => {
    assert.equal(FD_PRODUCTION_READY, 'NO');
    assert.equal(FD_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FD_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FD_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FD_FREEZE_PIN_SHORT, 'f9a14e16');
    assert.equal(FD_FREEZE_PIN, 'f9a14e162b632b73b2b414aaa57e3d1179222389');
  });

  it('FD2: builds canonical nine-field sealed FD-RCPT-* with freeze soft-observe + ceiling + deliveryHold + deliveryDigest', () => {
    const receipt = buildOutboundDeliveryCallbackRegistryReceipt({
      planId: 'plan-fd-01',
      changeId: 'eos-ladder-40-mission-fd',
      decision: 'PASS',
      binding: makeMockBinding()
    });

    assert.equal(receipt.kind, FD_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FD-RCPT-'));
    assert.equal(receipt.operation, FD_OPERATION);
    assert.equal(receipt.operation, 'OUTBOUND_DELIVERY_CALLBACK_REGISTRY_BINDING');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'f9a14e16');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawCallbackSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.deliveryHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.deliveryHold.failClosed, true);
    assert.equal(receipt.deliveryHold.callbackSecretMaterialRefused, true);
    assert.equal(receipt.deliveryHold.outboundSecretZeroHeld, true);
    assert.equal(receipt.deliveryHold.liveHttpEgressRefused, true);
    assert.equal(receipt.deliveryHold.distinctFromEtCredentialHandle, true);
    assert.equal(receipt.deliveryHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(receipt.deliveryHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.deliveryHold.distinctFromCanaryDeliveryDispatcher, true);
    assert.equal(receipt.deliveryHold.distinctFromFeSignatureSign, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.deliveryDigest, 'string');
    assert.equal(receipt.deliveryDigest.length, 64);

    const seal = canonicalOutboundDeliveryCallbackRegistrySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'deliveryDigest',
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

  it('FD3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildOutboundDeliveryCallbackRegistryReceipt({
      planId: 'plan-fd-tamper',
      changeId: 'eos-ladder-40-mission-fd',
      decision: 'PASS'
    });

    assert.equal(verifyOutboundDeliveryCallbackRegistryReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyOutboundDeliveryCallbackRegistryReceipt(tampered).ok, false);
  });
});

describe('Mission FD — Outbound Delivery / Callback Target Registry Policy Gate (SPEC-0166)', () => {
  it('FD4: validates well-formed plan (planId+changeId+ACTIVE+binding targetId/deliveryId/targetClass/desiredBinding/authorized)', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();
    const binding = makeMockBinding();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fd-valid',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FD_CODES.OK);
  });

  it('FD5: rejects missing binding or invalid binding', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fd-nobinding',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FD_CODES.MISSING_BINDING);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fd-invalidbinding',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FD_CODES.INVALID_BINDING);
  });

  it('FD6: rejects missing targetId / deliveryId / targetClass / desiredBinding', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fd-noid',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ targetId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FD_CODES.MISSING_TARGET_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-fd-nosourceid',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ deliveryId: '' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, FD_CODES.MISSING_DELIVERY_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-fd-noclass',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ targetClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FD_CODES.MISSING_TARGET_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-fd-nodesired',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FD_CODES.MISSING_DESIRED_BINDING);
  });

  it('FD7: DENY invalid desiredBinding/observedBinding + live HTTP egress claims', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-fd-baddesired',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FD_CODES.INVALID_DESIRED_BINDING);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-fd-badobserved',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ observedBinding: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FD_CODES.INVALID_OBSERVED_BINDING);

    const live = gate.evaluatePreconditions({
      planId: 'plan-fd-livesecret',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      liveHttpEgress: true,
      binding: makeMockBinding()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FD_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);
  });

  it('FD8: rejects live HTTP egress / wall-clock / tip-refresh authority / ET-L33-FE elevate / schema-json add', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-fd-storeclaim',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live HTTP egress binding',
      binding: makeMockBinding()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, FD_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-fd-rolloutclaim',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      binding: makeMockBinding()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FD_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fd-tipauth',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      binding: makeMockBinding()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FD_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-fd-eoclaim',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle the outbound port for callbacks',
      binding: makeMockBinding()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, FD_CODES.ET_CREDENTIAL_HANDLE_AS_OUTBOUND_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-fd-epclaim',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'make domain-event outbound the callback registry',
      binding: makeMockBinding()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, FD_CODES.L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-fd-auclaim',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'make fe the outbound registry',
      binding: makeMockBinding()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, FD_CODES.FE_SIGNATURE_SIGN_AS_REGISTRY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fd-schema',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-outbound-delivery-callback.json',
      binding: makeMockBinding()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FD_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveHttpEgress('claiming live HTTP egress'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FD9: allows HOLD mode with zero mutations', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fd-hold',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FD_CODES.HOLD);
  });

  it('FD10: DENY (BINDING_UNAUTHORIZED / INVALID_BINDING_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fd-unauth',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FD_CODES.BINDING_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fd-mismatch',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'UNBOUND', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FD_CODES.INVALID_BINDING_CLAIM);
  });

  it('FD11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

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
      { callbackSecret: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-fd-secretfield',
        changeId: 'eos-ladder-40-mission-fd',
        ritualMode: 'ACTIVE',
        binding: makeMockBinding(),
        ...extra
      };
      // If extra has binding (last case), use that binding
      if (extra.binding) plan.binding = extra.binding;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FD_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ targetId: 'ok', deliveryId: 'ok' }), null);
  });

  it('FD12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-fd-secret',
      changeId: 'eos-ladder-40-mission-fd',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FD_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fd-del',
      changeId: 'eos-ladder-40-mission-fd',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FD_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FD13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fd-fundacion',
      changeId: 'eos-ladder-40-mission-fd',
      target: 'Documents/Fundacion/outbound-delivery-callback'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FD_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildOutboundDeliveryCallbackRegistryReceipt({
      planId: 'plan-fd-delta0',
      changeId: 'eos-ladder-40-mission-fd',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FD14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L39 reopen, L40 auto-close, mass prune, GHE', () => {
    const gate = new OutboundDeliveryCallbackRegistryPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fd-pr',
      changeId: 'eos-ladder-40-mission-fd',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FD_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FD_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FD_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FD_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FD_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FD_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FD_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FD_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FD_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FD_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FD_CODES.L39_REOPEN_FORBIDDEN],
      ['auto-close ladder-40 now', FD_CODES.L40_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fd-ladder',
        changeId: 'eos-ladder-40-mission-fd',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fd-tip',
      changeId: 'eos-ladder-40-mission-fd',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FD_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fd-mass',
      changeId: 'eos-ladder-40-mission-fd',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FD_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fd-ghe',
      changeId: 'eos-ladder-40-mission-fd',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FD_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FD — Outbound Delivery / Callback Target Registry Port (SPEC-0166)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FD15: govern happy path ACTIVE + authorized matching binding -> PASS + FD-RCPT-* (≠ EY/ET/L33/FE ≠ tip-refresh)', async () => {
    const port = new OutboundDeliveryCallbackRegistryPort();
    const binding = makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'BOUND', authorized: true });

    const res = await port.govern({
      planId: 'plan-fd-pass',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FD-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.binding.evaluated, true);
    assert.equal(res.receipt.binding.status, 'BOUND_EVALUATED');
    assert.equal(res.receipt.deliveryHold.liveHttpEgressRefused, true);
    assert.equal(res.receipt.deliveryHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.deliveryHold.callbackSecretMaterialRefused, true);
    assert.equal(res.receipt.deliveryHold.outboundSecretZeroHeld, true);
    assert.equal(res.receipt.deliveryHold.distinctFromEtCredentialHandle, true);
    assert.equal(res.receipt.deliveryHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(res.receipt.deliveryHold.distinctFromFeSignatureSign, true);
    assert.equal(res.receipt.freezeObserve.liveHttpEgressRefused, true);
    assert.equal(res.receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'f9a14e16');
    assert.equal(typeof res.receipt.deliveryDigest, 'string');
    assert.equal(res.receipt.deliveryDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FD_PORT_KIND, 'eos-outbound-delivery-callback-registry-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalOutboundDeliveryCallbackRegistrySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.binding), null);
  });

  it('FD16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new OutboundDeliveryCallbackRegistryPort();

    const res = await port.govern({
      planId: 'plan-fd-hold',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'f9a14e16');
    assert.equal(port.trail.length, 1);
  });

  it('FD17: verifyTrail + BINDING_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new OutboundDeliveryCallbackRegistryPort();

    await port.govern({
      planId: 'plan-fd-trail-01',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding()
    });

    await port.govern({
      planId: 'plan-fd-trail-02',
      changeId: 'eos-ladder-40-mission-fd',
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

    const denyPort = new OutboundDeliveryCallbackRegistryPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fd-unauth-deny',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FD_CODES.BINDING_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FD-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.binding.status, 'BINDING_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.deliveryHold.failClosed, true);
    assert.equal(unauthRes.receipt.deliveryHold.callbackSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fd-secretfield-deny',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      binding: makeMockBinding()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FD_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FD-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalOutboundDeliveryCallbackRegistrySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fd-live-deny',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      instruction: 'bind live HTTP egress with live HTTP egress',
      binding: makeMockBinding()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FD_CODES.LIVE_HTTP_EGRESS_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fd-autoseal',
      changeId: 'eos-ladder-40-mission-fd',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      binding: makeMockBinding()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FD_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(FD_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FD_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FD_CODES.L39_REOPEN_FORBIDDEN, 'L39_REOPEN_FORBIDDEN');
    assert.equal(FD_CODES.L40_AUTO_CLOSE_FORBIDDEN, 'L40_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FD_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
