/**
 * Mission FB — External Event Ingress Honesty & Attestation Port Test Suite.
 * SPEC-0164 / ADR-0146.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only;
 *   seal opaque handleId + attestationDigest + stage/verdict only — never raw secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 57edb92e (do NOT rewrite tip pins)
 * - Soft-observe freeze pins alone ≠ ingress honesty truth
 * - PASS = hermetic honesty attestation ≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ EY/EZ/FA product ≠ EW/ER/EH/EM honesty axes
 * - NEVER reopen L30–L38; refuse L39 auto-close (FC pending)
 * - Hermetic injected observedClaim only
 * - Distinct from ET / EU / EV / ER / EM / EH / AU — attestation only
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FB_PRODUCTION_READY,
  FB_RECEIPT_PRODUCTION_READY,
  FB_RECEIPT_KIND,
  FB_FREEZE_PIN_SHORT,
  FB_FREEZE_PIN,
  FB_OPERATION,
  FB_SUBJECT_KINDS,
  buildIngressHonestyAttestationReceipt,
  verifyIngressHonestyAttestationReceipt,
  canonicalIngressHonestyAttestationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/ingress-honesty-attestation-receipt.js';

import {
  IngressHonestyAttestationPolicyGate,
  FB_CODES,
  FB_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveIngressHonestyLie,
  claimsLiveIngressMutation,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/ingress-honesty-attestation-policy-gate.js';

import {
  IngressHonestyAttestationPort,
  FB_PORT_PRODUCTION_READY,
  FB_PORT_KIND
} from '../src/core/composition/ingress-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveIngressMutation: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    secretZeroHeld: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    ingressId: 'ing-fb-opaque-001',
    sourceId: 'src-fb-opaque-001',
    handleId: 'hdl-fb-soft-observe-001',
    subjectKind: 'EXTERNAL_EVENT_INGRESS',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: makeMockHonestyClaims(),
    observedClaim: {
      claimKind: 'EXTERNAL_EVENT_INGRESS',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

describe('Mission FB — Ingress Honesty Attestation Receipt (SPEC-0164)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FB1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 57edb92e', () => {
    assert.equal(FB_PRODUCTION_READY, 'NO');
    assert.equal(FB_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FB_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FB_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FB_FREEZE_PIN_SHORT, '57edb92e');
    assert.equal(FB_FREEZE_PIN, '57edb92e5e64d0c3c5a0f6a2e38def02f80746e0');
  });

  it('FB2: builds canonical nine-field sealed FB-RCPT-* with freeze soft-observe + ceiling + attestationHold + attestationDigest', () => {
    const receipt = buildIngressHonestyAttestationReceipt({
      planId: 'plan-fb-01',
      changeId: 'eos-ladder-39-mission-fb',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, FB_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FB-RCPT-'));
    assert.equal(receipt.operation, FB_OPERATION);
    assert.equal(receipt.operation, 'INGRESS_HONESTY_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '57edb92e');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l37ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveIngressMutationRefused, true);
    assert.equal(receipt.freezeObserve.softObserveAloneNotIngressTruth, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawWebhookSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.rawPayloadMaterialRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.failClosed, true);
    assert.equal(receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(receipt.attestationHold.secretZeroHeld, true);
    assert.equal(receipt.attestationHold.liveIngressMutationRefused, true);
    assert.equal(receipt.attestationHold.softObserveAloneNotIngressTruth, true);
    assert.equal(receipt.attestationHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.attestationHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(receipt.attestationHold.distinctFromFaIngressQuarantine, true);
    assert.equal(receipt.attestationHold.distinctFromEwCredentialHonesty, true);
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
        /Soft-observe freeze pins alone ≠ ingress honesty truth/.test(l)
      )
    );

    const seal = canonicalIngressHonestyAttestationSealBody(receipt);
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
    assert.ok(FB_SUBJECT_KINDS.includes('EXTERNAL_EVENT_INGRESS'));
  });

  it('FB3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildIngressHonestyAttestationReceipt({
      planId: 'plan-fb-tamper',
      changeId: 'eos-ladder-39-mission-fb',
      decision: 'PASS'
    });

    assert.equal(verifyIngressHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyIngressHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission FB — Ingress Honesty Attestation Policy Gate (SPEC-0164)', () => {
  it('FB4: validates well-formed plan (planId+changeId+ACTIVE+attestation ingressId/subjectKind/honestyClaims/authorized)', () => {
    const gate = new IngressHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({
      subjectKind: 'INGRESS_BINDING',
      observedClaim: { claimKind: 'INGRESS_BINDING', claimValue: 'MATCH' }
    });

    const res = gate.evaluatePreconditions({
      planId: 'plan-fb-valid',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FB_CODES.OK);
  });

  it('FB5: rejects missing attestation or invalid attestation', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fb-noatt',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FB_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fb-invalidatt',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FB_CODES.INVALID_ATTESTATION);
  });

  it('FB6: rejects missing ingressId / subjectKind / invalid subjectKind', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fb-noid',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ ingressId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FB_CODES.MISSING_INGRESS_ID);

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fb-nokind',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, FB_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fb-badkind',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'QUOTA' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, FB_CODES.INVALID_SUBJECT_KIND);
  });

  it('FB7: DENY missing honestyClaims + invalid honestyClaims + binding/digest fail', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-fb-noclaims',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, FB_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-fb-badclaims',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveIngressMutation: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, FB_CODES.INVALID_HONESTY_CLAIMS);

    const binding = gate.evaluatePreconditions({
      planId: 'plan-fb-bindfail',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ bindingMatch: false })
    });
    assert.equal(binding.ok, false);
    assert.equal(binding.code, FB_CODES.BINDING_MISMATCH);

    const digest = gate.evaluatePreconditions({
      planId: 'plan-fb-digestfail',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ digestConsistent: false })
    });
    assert.equal(digest.ok, false);
    assert.equal(digest.code, FB_CODES.DIGEST_INCONSISTENT);
  });

  it('FB8: rejects live-ingress honesty lie, raw-webhook-secret, wall-clock, tip-refresh, EY/EZ/FA/EW elevate, schema-json', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-fb-lie',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live ingress mutation authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, FB_CODES.LIVE_INGRESS_HONESTY_LIE);

    const vault = gate.evaluatePreconditions({
      planId: 'plan-fb-vault',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'raw webhook secret material',
      attestation: makeMockAttestation()
    });
    assert.equal(vault.ok, false);
    assert.equal(vault.code, FB_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN);

    const mut = gate.evaluatePreconditions({
      planId: 'plan-fb-mut',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live webhook ingress endpoint',
      attestation: makeMockAttestation()
    });
    assert.equal(mut.ok, false);
    assert.equal(mut.code, FB_CODES.LIVE_WEBHOOK_INGRESS_ENDPOINT_FORBIDDEN);

    const wall = gate.evaluatePreconditions({
      planId: 'plan-fb-wall',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      attestation: makeMockAttestation()
    });
    assert.equal(wall.ok, false);
    assert.equal(wall.code, FB_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fb-tipauth',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      attestation: makeMockAttestation()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FB_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const etClaim = gate.evaluatePreconditions({
      planId: 'plan-fb-etclaim',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'make external-event-ingress-registry the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(etClaim.ok, false);
    assert.equal(etClaim.code, FB_CODES.EY_INGRESS_REGISTRY_AS_ATTESTATION_FORBIDDEN);

    const euClaim = gate.evaluatePreconditions({
      planId: 'plan-fb-euclaim',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'make webhook-authenticity the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(euClaim.ok, false);
    assert.equal(euClaim.code, FB_CODES.EZ_WEBHOOK_AUTH_AS_ATTESTATION_FORBIDDEN);

    const evClaim = gate.evaluatePreconditions({
      planId: 'plan-fb-evclaim',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'make ingress-quarantine-replay-deny the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(evClaim.ok, false);
    assert.equal(evClaim.code, FB_CODES.FA_QUARANTINE_AS_ATTESTATION_FORBIDDEN);

    const erClaim = gate.evaluatePreconditions({
      planId: 'plan-fb-erclaim',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-honesty-attestation the ingress port',
      attestation: makeMockAttestation()
    });
    assert.equal(erClaim.ok, false);
    assert.equal(erClaim.code, FB_CODES.EW_CREDENTIAL_HONESTY_AS_INGRESS_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fb-schema',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-credential-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FB_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveIngressHonestyLie('claiming live ingress mutation authority'), true);
    assert.equal(claimsLiveIngressMutation('claiming live ingress mutation'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FB9: allows HOLD mode with zero mutations', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fb-hold',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FB_CODES.HOLD);
  });

  it('FB10: DENY (ATTESTATION_UNAUTHORIZED / INVALID_ATTESTATION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fb-unauth',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FB_CODES.ATTESTATION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fb-mismatch',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'INGRESS_BINDING',
        observedClaim: { claimKind: 'WEBHOOK_AUTHENTICITY', claimValue: 'X' },
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FB_CODES.INVALID_ATTESTATION_CLAIM);
  });

  it('FB11: Law VI DENY when secret-looking fields present (password/token/apiKey/webhookSecret/hmacKey/rawPayload)', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

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
        planId: 'plan-fb-secretfield',
        changeId: 'eos-ladder-39-mission-fb',
        ritualMode: 'ACTIVE',
        attestation: makeMockAttestation(),
        ...extra
      };
      if (extra.attestation) plan.attestation = extra.attestation;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FB_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ secret: 'x' }), 'secret');
    assert.equal(findSecretLookingField({ ingressId: 'ok' }), null);
  });

  it('FB12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new IngressHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fb-secret',
      changeId: 'eos-ladder-39-mission-fb',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FB_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fb-del',
      changeId: 'eos-ladder-39-mission-fb',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FB_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FB13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fb-fundacion',
      changeId: 'eos-ladder-39-mission-fb',
      target: 'Documents/Fundacion/credential-handles'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FB_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildIngressHonestyAttestationReceipt({
      planId: 'plan-fb-delta0',
      changeId: 'eos-ladder-39-mission-fb',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FB14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L38 reopen, L39 auto-close, mass prune, GHE', () => {
    const gate = new IngressHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fb-pr',
      changeId: 'eos-ladder-39-mission-fb',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FB_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FB_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FB_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FB_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FB_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FB_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FB_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FB_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FB_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FB_CODES.L38_REOPEN_FORBIDDEN],
      ['auto-close ladder-39 now', FB_CODES.L39_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fb-ladder',
        changeId: 'eos-ladder-39-mission-fb',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fb-tip',
      changeId: 'eos-ladder-39-mission-fb',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FB_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fb-mass',
      changeId: 'eos-ladder-39-mission-fb',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FB_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fb-ghe',
      changeId: 'eos-ladder-39-mission-fb',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FB_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FB — Ingress Honesty Attestation Port (SPEC-0164)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FB15: govern happy path ACTIVE + authorized matching attestation -> PASS + FB-RCPT-* (≠ EY/EZ/FA/EW ≠ tip-refresh)', async () => {
    const port = new IngressHonestyAttestationPort();

    const bindRes = await port.govern({
      planId: 'plan-fb-pass-bind',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'INGRESS_BINDING',
        attestationStage: 'BINDING_MATCH',
        observedClaim: { claimKind: 'INGRESS_BINDING', claimValue: 'MATCH' },
        authorized: true
      })
    });

    assert.equal(bindRes.ok, true);
    assert.equal(bindRes.decision, 'PASS');
    assert.ok(bindRes.receipt.receiptId.startsWith('FB-RCPT-'));
    assert.equal(bindRes.receipt.fundacionDelta, 0);
    assert.equal(bindRes.receipt.productionReady, 'NO');
    assert.equal(bindRes.receipt.attestation.evaluated, true);
    assert.equal(bindRes.receipt.attestation.status, 'ATTESTATION_EVALUATED');
    assert.equal(bindRes.receipt.attestation.subjectKind, 'INGRESS_BINDING');
    assert.equal(bindRes.receipt.attestationHold.liveIngressMutationRefused, true);
    assert.equal(bindRes.receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(bindRes.receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(bindRes.receipt.attestationHold.secretZeroHeld, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEyIngressRegistry, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromFaIngressQuarantine, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEwCredentialHonesty, true);
    assert.equal(bindRes.receipt.freezeObserve.liveIngressMutationRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.pinShort, '57edb92e');
    assert.equal(typeof bindRes.receipt.attestationDigest, 'string');
    assert.equal(bindRes.receipt.attestationDigest.length, 64);
    assert.equal(FB_PORT_KIND, 'eos-ingress-honesty-attestation-port');

    const lifeRes = await port.govern({
      planId: 'plan-fb-pass-life',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        ingressId: 'hdl-ew-opaque-002',
        subjectKind: 'WEBHOOK_AUTHENTICITY',
        attestationStage: 'DIGEST_CONSISTENCY',
        observedClaim: { claimKind: 'WEBHOOK_AUTHENTICITY', claimValue: 'CONSISTENT' },
        authorized: true
      })
    });
    assert.equal(lifeRes.ok, true);
    assert.equal(lifeRes.decision, 'PASS');
    assert.equal(lifeRes.receipt.attestation.subjectKind, 'WEBHOOK_AUTHENTICITY');
    assert.equal(port.trail.length, 2);

    const seal = canonicalIngressHonestyAttestationSealBody(bindRes.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(bindRes.receipt.attestation), null);
  });

  it('FB16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new IngressHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-fb-hold',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '57edb92e');
    assert.equal(port.trail.length, 1);
  });

  it('FB17: verifyTrail + ATTESTATION_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new IngressHonestyAttestationPort();

    await port.govern({
      planId: 'plan-fb-trail-01',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-fb-trail-02',
      changeId: 'eos-ladder-39-mission-fb',
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

    const denyPort = new IngressHonestyAttestationPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fb-unauth-deny',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FB_CODES.ATTESTATION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FB-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.attestation.status, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.attestationHold.failClosed, true);
    assert.equal(unauthRes.receipt.attestationHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fb-secretfield-deny',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      attestation: makeMockAttestation()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FB_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FB-RCPT-'));
    const denySeal = canonicalIngressHonestyAttestationSealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fb-live-deny',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live ingress mutation authority',
      attestation: makeMockAttestation()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FB_CODES.LIVE_INGRESS_HONESTY_LIE);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fb-autoseal',
      changeId: 'eos-ladder-39-mission-fb',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FB_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FB_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FB_CODES.L39_AUTO_CLOSE_FORBIDDEN, 'L39_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FB_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(FB_CODES.ATTESTATION_UNAUTHORIZED, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(FB_CODES.BINDING_MISMATCH, 'BINDING_MISMATCH');
    assert.equal(FB_CODES.DIGEST_INCONSISTENT, 'DIGEST_INCONSISTENT');
  });
});
