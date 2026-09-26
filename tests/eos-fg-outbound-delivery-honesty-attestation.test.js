/**
 * Mission FG — Outbound Delivery Honesty & Attestation Port Test Suite.
 * SPEC-0169 / ADR-0152.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only;
 *   seal opaque authenticityRef + attestationDigest + stage/verdict only — never raw secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin a7c7df8f (do NOT rewrite tip pins)
 * - Soft-observe freeze pins alone ≠ outbound delivery honesty truth
 * - PASS = hermetic honesty attestation ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ FD/FE/FF product ≠ FB/ER/EH/EM honesty axes
 * - NEVER reopen L30–L39; refuse L40 auto-close (FH pending)
 * - Hermetic injected observedClaim only
 * - Distinct from ET / EU / EV / ER / EM / EH / AU — attestation only
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FG_PRODUCTION_READY,
  FG_RECEIPT_PRODUCTION_READY,
  FG_RECEIPT_KIND,
  FG_FREEZE_PIN_SHORT,
  FG_FREEZE_PIN,
  FG_OPERATION,
  FG_SUBJECT_KINDS,
  buildOutboundDeliveryHonestyAttestationReceipt,
  verifyOutboundDeliveryHonestyAttestationReceipt,
  canonicalOutboundDeliveryHonestyAttestationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/outbound-delivery-honesty-attestation-receipt.js';

import {
  OutboundDeliveryHonestyAttestationPolicyGate,
  FG_CODES,
  FG_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveOutboundDeliveryHonestyLie,
  claimsLiveOutboundDeliveryMutation,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/outbound-delivery-honesty-attestation-policy-gate.js';

import {
  OutboundDeliveryHonestyAttestationPort,
  FG_PORT_PRODUCTION_READY,
  FG_PORT_KIND
} from '../src/core/composition/outbound-delivery-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveOutboundDeliveryMutation: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    secretZeroHeld: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    deliveryId: 'del-fg-opaque-001',
    targetId: 'tgt-fg-opaque-001',
    authenticityRef: 'aref-fg-soft-observe-001',
    quarantineRef: 'qref-fg-soft-observe-001',
    subjectKind: 'OUTBOUND_DELIVERY',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: makeMockHonestyClaims(),
    observedClaim: {
      claimKind: 'OUTBOUND_DELIVERY',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

describe('Mission FG — Outbound Delivery Honesty Attestation Receipt (SPEC-0169)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FG1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin a7c7df8f', () => {
    assert.equal(FG_PRODUCTION_READY, 'NO');
    assert.equal(FG_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FG_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FG_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FG_FREEZE_PIN_SHORT, 'a7c7df8f');
    assert.equal(FG_FREEZE_PIN, 'a7c7df8f04c52d081de21b61ffe6b1f699e614bc');
  });

  it('FG2: builds canonical nine-field sealed FG-RCPT-* with freeze soft-observe + ceiling + attestationHold + attestationDigest', () => {
    const receipt = buildOutboundDeliveryHonestyAttestationReceipt({
      planId: 'plan-fg-01',
      changeId: 'eos-ladder-40-mission-fg',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, FG_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FG-RCPT-'));
    assert.equal(receipt.operation, FG_OPERATION);
    assert.equal(receipt.operation, 'OUTBOUND_DELIVERY_HONESTY_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'a7c7df8f');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l37ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveOutboundDeliveryMutationRefused, true);
    assert.equal(receipt.freezeObserve.softObserveAloneNotOutboundDeliveryTruth, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawCallbackSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.rawPayloadMaterialRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.failClosed, true);
    assert.equal(receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(receipt.attestationHold.secretZeroHeld, true);
    assert.equal(receipt.attestationHold.liveOutboundDeliveryMutationRefused, true);
    assert.equal(receipt.attestationHold.softObserveAloneNotOutboundDeliveryTruth, true);
    assert.equal(receipt.attestationHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(receipt.attestationHold.distinctFromFeOutboundCallbackAuthenticity, true);
    assert.equal(receipt.attestationHold.distinctFromFfOutboundDeliveryQuarantine, true);
    assert.equal(receipt.attestationHold.distinctFromFbIngressHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromErConfigHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEmCapacityHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEhTemporalHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.attestationHold.distinctFromEvHandleLifecycle, true);
    assert.equal(receipt.attestationHold.distinctFromAuSecretRuntimeBroker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.attestationDigest, 'string');
    assert.equal(receipt.attestationDigest.length, 64);
    assert.ok(
      receipt.freezeObserve.nonClaimLabels.some((l) =>
        /Soft-observe freeze pins alone ≠ outbound delivery honesty truth/.test(l)
      )
    );

    const seal = canonicalOutboundDeliveryHonestyAttestationSealBody(receipt);
    assert.deepEqual(
      Object.keys(seal).sort(),
      [
        'attestationDigest',
        'changeId',
        'decision',
        'fundacionDelta',
        'operation',
        'planId',
        'prevReceiptHash',
        'receiptId',
        'timestamp'
      ].sort()
    );
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(scanForSecrets(seal), false);
    assert.ok(FG_SUBJECT_KINDS.includes('OUTBOUND_DELIVERY'));
  });

  it('FG3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildOutboundDeliveryHonestyAttestationReceipt({
      planId: 'plan-fg-tamper',
      changeId: 'eos-ladder-40-mission-fg',
      decision: 'PASS'
    });

    assert.equal(verifyOutboundDeliveryHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyOutboundDeliveryHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission FG — Outbound Delivery Honesty Attestation Policy Gate (SPEC-0169)', () => {
  it('FG4: validates well-formed plan (planId+changeId+ACTIVE+attestation deliveryId/subjectKind/honestyClaims/authorized)', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({
      subjectKind: 'DELIVERY_BINDING',
      observedClaim: { claimKind: 'DELIVERY_BINDING', claimValue: 'MATCH' }
    });

    const res = gate.evaluatePreconditions({
      planId: 'plan-fg-valid',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FG_CODES.OK);
  });

  it('FG5: rejects missing attestation or invalid attestation', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fg-noatt',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FG_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fg-invalidatt',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FG_CODES.INVALID_ATTESTATION);
  });

  it('FG6: rejects missing deliveryId / subjectKind / invalid subjectKind', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fg-noid',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ deliveryId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FG_CODES.MISSING_DELIVERY_ID);

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fg-nokind',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, FG_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fg-badkind',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'QUOTA' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, FG_CODES.INVALID_SUBJECT_KIND);
  });

  it('FG7: DENY missing honestyClaims + invalid honestyClaims + binding/digest fail', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-fg-noclaims',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, FG_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-fg-badclaims',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveOutboundDeliveryMutation: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, FG_CODES.INVALID_HONESTY_CLAIMS);

    const binding = gate.evaluatePreconditions({
      planId: 'plan-fg-bindfail',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ bindingMatch: false })
    });
    assert.equal(binding.ok, false);
    assert.equal(binding.code, FG_CODES.BINDING_MISMATCH);

    const digest = gate.evaluatePreconditions({
      planId: 'plan-fg-digestfail',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ digestConsistent: false })
    });
    assert.equal(digest.ok, false);
    assert.equal(digest.code, FG_CODES.DIGEST_INCONSISTENT);
  });

  it('FG8: rejects live-outbound delivery honesty lie, raw-callback-secret, wall-clock, tip-refresh, FD/FE/FF/FB elevate, schema-json', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-fg-lie',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live outbound delivery mutation authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, FG_CODES.LIVE_OUTBOUND_DELIVERY_HONESTY_LIE);

    const vault = gate.evaluatePreconditions({
      planId: 'plan-fg-vault',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'raw callback secret material',
      attestation: makeMockAttestation()
    });
    assert.equal(vault.ok, false);
    assert.equal(vault.code, FG_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN);

    const mut = gate.evaluatePreconditions({
      planId: 'plan-fg-mut',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live HTTP egress endpoint',
      attestation: makeMockAttestation()
    });
    assert.equal(mut.ok, false);
    assert.equal(mut.code, FG_CODES.LIVE_HTTP_EGRESS_ENDPOINT_FORBIDDEN);

    const wall = gate.evaluatePreconditions({
      planId: 'plan-fg-wall',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      attestation: makeMockAttestation()
    });
    assert.equal(wall.ok, false);
    assert.equal(wall.code, FG_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fg-tipauth',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      attestation: makeMockAttestation()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FG_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const etClaim = gate.evaluatePreconditions({
      planId: 'plan-fg-etclaim',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'make outbound-delivery-callback-registry the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(etClaim.ok, false);
    assert.equal(etClaim.code, FG_CODES.FD_OUTBOUND_REGISTRY_AS_ATTESTATION_FORBIDDEN);

    const euClaim = gate.evaluatePreconditions({
      planId: 'plan-fg-euclaim',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'make outbound-callback-authenticity the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(euClaim.ok, false);
    assert.equal(euClaim.code, FG_CODES.FE_CALLBACK_AUTH_AS_ATTESTATION_FORBIDDEN);

    const evClaim = gate.evaluatePreconditions({
      planId: 'plan-fg-evclaim',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'make outbound-delivery-quarantine-retry-deny the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(evClaim.ok, false);
    assert.equal(evClaim.code, FG_CODES.FF_QUARANTINE_AS_ATTESTATION_FORBIDDEN);

    const erClaim = gate.evaluatePreconditions({
      planId: 'plan-fg-erclaim',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'make ingress-honesty-attestation the outbound port',
      attestation: makeMockAttestation()
    });
    assert.equal(erClaim.ok, false);
    assert.equal(erClaim.code, FG_CODES.FB_INGRESS_HONESTY_AS_OUTBOUND_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fg-schema',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-outbound-delivery-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FG_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveOutboundDeliveryHonestyLie('claiming live outbound delivery mutation authority'), true);
    assert.equal(claimsLiveOutboundDeliveryMutation('claiming live outbound delivery mutation'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FG9: allows HOLD mode with zero mutations', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fg-hold',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FG_CODES.HOLD);
  });

  it('FG10: DENY (ATTESTATION_UNAUTHORIZED / INVALID_ATTESTATION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fg-unauth',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FG_CODES.ATTESTATION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fg-mismatch',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'DELIVERY_BINDING',
        observedClaim: { claimKind: 'CALLBACK_AUTHENTICITY', claimValue: 'X' },
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FG_CODES.INVALID_ATTESTATION_CLAIM);
  });

  it('FG11: Law VI DENY when secret-looking fields present (password/token/apiKey/webhookSecret/hmacKey/rawPayload)', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { secret: 'x' },
      { attestation: makeMockAttestation({ clientSecret: 'nope' }) }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-fg-secretfield',
        changeId: 'eos-ladder-40-mission-fg',
        ritualMode: 'ACTIVE',
        attestation: makeMockAttestation(),
        ...extra
      };
      if (extra.attestation) plan.attestation = extra.attestation;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FG_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ secret: 'x' }), 'secret');
    assert.equal(findSecretLookingField({ deliveryId: 'ok' }), null);
  });

  it('FG12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fg-secret',
      changeId: 'eos-ladder-40-mission-fg',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FG_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fg-del',
      changeId: 'eos-ladder-40-mission-fg',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FG_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FG13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fg-fundacion',
      changeId: 'eos-ladder-40-mission-fg',
      target: 'Documents/Fundacion/outbound-delivery'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FG_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildOutboundDeliveryHonestyAttestationReceipt({
      planId: 'plan-fg-delta0',
      changeId: 'eos-ladder-40-mission-fg',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FG14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L39 reopen, L40 auto-close, mass prune, GHE', () => {
    const gate = new OutboundDeliveryHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fg-pr',
      changeId: 'eos-ladder-40-mission-fg',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FG_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FG_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FG_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FG_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FG_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FG_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FG_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FG_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FG_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FG_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FG_CODES.L39_REOPEN_FORBIDDEN],
      ['auto-close ladder-40 now', FG_CODES.L40_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fg-ladder',
        changeId: 'eos-ladder-40-mission-fg',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fg-tip',
      changeId: 'eos-ladder-40-mission-fg',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FG_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fg-mass',
      changeId: 'eos-ladder-40-mission-fg',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FG_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fg-ghe',
      changeId: 'eos-ladder-40-mission-fg',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FG_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FG — Outbound Delivery Honesty Attestation Port (SPEC-0169)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FG15: govern happy path ACTIVE + authorized matching attestation -> PASS + FG-RCPT-* (≠ FD/FE/FF/EW ≠ tip-refresh)', async () => {
    const port = new OutboundDeliveryHonestyAttestationPort();

    const bindRes = await port.govern({
      planId: 'plan-fg-pass-bind',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'DELIVERY_BINDING',
        attestationStage: 'BINDING_MATCH',
        observedClaim: { claimKind: 'DELIVERY_BINDING', claimValue: 'MATCH' },
        authorized: true
      })
    });

    assert.equal(bindRes.ok, true);
    assert.equal(bindRes.decision, 'PASS');
    assert.ok(bindRes.receipt.receiptId.startsWith('FG-RCPT-'));
    assert.equal(bindRes.receipt.fundacionDelta, 0);
    assert.equal(bindRes.receipt.productionReady, 'NO');
    assert.equal(bindRes.receipt.attestation.evaluated, true);
    assert.equal(bindRes.receipt.attestation.status, 'ATTESTATION_EVALUATED');
    assert.equal(bindRes.receipt.attestation.subjectKind, 'DELIVERY_BINDING');
    assert.equal(bindRes.receipt.attestationHold.liveOutboundDeliveryMutationRefused, true);
    assert.equal(bindRes.receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(bindRes.receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(bindRes.receipt.attestationHold.secretZeroHeld, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromFeOutboundCallbackAuthenticity, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromFfOutboundDeliveryQuarantine, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromFbIngressHonesty, true);
    assert.equal(bindRes.receipt.freezeObserve.liveOutboundDeliveryMutationRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.pinShort, 'a7c7df8f');
    assert.equal(typeof bindRes.receipt.attestationDigest, 'string');
    assert.equal(bindRes.receipt.attestationDigest.length, 64);
    assert.equal(FG_PORT_KIND, 'eos-outbound-delivery-honesty-attestation-port');

    const lifeRes = await port.govern({
      planId: 'plan-fg-pass-life',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        deliveryId: 'aref-fg-opaque-002',
        subjectKind: 'CALLBACK_AUTHENTICITY',
        attestationStage: 'DIGEST_CONSISTENCY',
        observedClaim: { claimKind: 'CALLBACK_AUTHENTICITY', claimValue: 'CONSISTENT' },
        authorized: true
      })
    });
    assert.equal(lifeRes.ok, true);
    assert.equal(lifeRes.decision, 'PASS');
    assert.equal(lifeRes.receipt.attestation.subjectKind, 'CALLBACK_AUTHENTICITY');
    assert.equal(port.trail.length, 2);

    const seal = canonicalOutboundDeliveryHonestyAttestationSealBody(bindRes.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(bindRes.receipt.attestation), null);
  });

  it('FG16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new OutboundDeliveryHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-fg-hold',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'a7c7df8f');
    assert.equal(port.trail.length, 1);
  });

  it('FG17: verifyTrail + ATTESTATION_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new OutboundDeliveryHonestyAttestationPort();

    await port.govern({
      planId: 'plan-fg-trail-01',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-fg-trail-02',
      changeId: 'eos-ladder-40-mission-fg',
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

    const denyPort = new OutboundDeliveryHonestyAttestationPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fg-unauth-deny',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FG_CODES.ATTESTATION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FG-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.attestation.status, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.attestationHold.failClosed, true);
    assert.equal(unauthRes.receipt.attestationHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fg-secretfield-deny',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      attestation: makeMockAttestation()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FG_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FG-RCPT-'));
    const denySeal = canonicalOutboundDeliveryHonestyAttestationSealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fg-live-deny',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live outbound delivery mutation authority',
      attestation: makeMockAttestation()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FG_CODES.LIVE_OUTBOUND_DELIVERY_HONESTY_LIE);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fg-autoseal',
      changeId: 'eos-ladder-40-mission-fg',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FG_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FG_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FG_CODES.L40_AUTO_CLOSE_FORBIDDEN, 'L40_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FG_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(FG_CODES.ATTESTATION_UNAUTHORIZED, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(FG_CODES.BINDING_MISMATCH, 'BINDING_MISMATCH');
    assert.equal(FG_CODES.DIGEST_INCONSISTENT, 'DIGEST_INCONSISTENT');
  });
});
