/**
 * Mission EW — Credential Honesty & Handle Attestation Port Test Suite.
 * SPEC-0159 / ADR-0140.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only;
 *   seal opaque handleId + attestationDigest + stage/verdict only — never raw secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 376378be (do NOT rewrite tip pins)
 * - Soft-observe freeze pins alone ≠ handle truth
 * - PASS = hermetic honesty attestation ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ ET bind ≠ EU leak-deny ≠ EV lifecycle ≠ ER config honesty
 * - NEVER reopen L30–L37; refuse L38 auto-close (EX pending)
 * - Hermetic injected observedClaim only
 * - Distinct from ET / EU / EV / ER / EM / EH / AU — attestation only
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EW_PRODUCTION_READY,
  EW_RECEIPT_PRODUCTION_READY,
  EW_RECEIPT_KIND,
  EW_FREEZE_PIN_SHORT,
  EW_FREEZE_PIN,
  EW_OPERATION,
  EW_SUBJECT_KINDS,
  buildCredentialHonestyAttestationReceipt,
  verifyCredentialHonestyAttestationReceipt,
  canonicalCredentialHonestyAttestationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/credential-honesty-attestation-receipt.js';

import {
  CredentialHonestyAttestationPolicyGate,
  EW_CODES,
  EW_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSecretStoreHonestyLie,
  claimsLiveSecretMutation,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/credential-honesty-attestation-policy-gate.js';

import {
  CredentialHonestyAttestationPort,
  EW_PORT_PRODUCTION_READY,
  EW_PORT_KIND
} from '../src/core/composition/credential-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveSecretStore: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    secretZeroHeld: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    handleId: 'hdl-ew-opaque-001',
    handleClass: 'credential-handle',
    subjectKind: 'CREDENTIAL_HANDLE',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: makeMockHonestyClaims(),
    observedClaim: {
      claimKind: 'CREDENTIAL_HANDLE',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

describe('Mission EW — Credential Honesty Attestation Receipt (SPEC-0159)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EW1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 376378be', () => {
    assert.equal(EW_PRODUCTION_READY, 'NO');
    assert.equal(EW_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EW_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EW_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EW_FREEZE_PIN_SHORT, '376378be');
    assert.equal(EW_FREEZE_PIN, '376378be81cc7ad57a98268c455252267a878c05');
  });

  it('EW2: builds canonical nine-field sealed EW-RCPT-* with freeze soft-observe + ceiling + attestationHold + attestationDigest', () => {
    const receipt = buildCredentialHonestyAttestationReceipt({
      planId: 'plan-ew-01',
      changeId: 'eos-ladder-38-mission-ew',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, EW_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EW-RCPT-'));
    assert.equal(receipt.operation, EW_OPERATION);
    assert.equal(receipt.operation, 'CREDENTIAL_HONESTY_HANDLE_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '376378be');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l37ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveSecretStoreClaimRefused, true);
    assert.equal(receipt.freezeObserve.softObserveAloneNotHandleTruth, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.vaultKmsRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.failClosed, true);
    assert.equal(receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(receipt.attestationHold.secretZeroHeld, true);
    assert.equal(receipt.attestationHold.liveSecretStoreClaimRefused, true);
    assert.equal(receipt.attestationHold.softObserveAloneNotHandleTruth, true);
    assert.equal(receipt.attestationHold.distinctFromEtCredentialHandleRegistry, true);
    assert.equal(receipt.attestationHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.attestationHold.distinctFromEvCredentialHandleLifecycle, true);
    assert.equal(receipt.attestationHold.distinctFromErConfigHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEmCapacityHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEhTemporalHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromAuSecretRuntimeBroker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.attestationDigest, 'string');
    assert.equal(receipt.attestationDigest.length, 64);
    assert.ok(
      receipt.freezeObserve.nonClaimLabels.some((l) =>
        /Soft-observe freeze pins alone ≠ handle truth/.test(l)
      )
    );

    const seal = canonicalCredentialHonestyAttestationSealBody(receipt);
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
    assert.ok(EW_SUBJECT_KINDS.includes('CREDENTIAL_HANDLE'));
  });

  it('EW3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCredentialHonestyAttestationReceipt({
      planId: 'plan-ew-tamper',
      changeId: 'eos-ladder-38-mission-ew',
      decision: 'PASS'
    });

    assert.equal(verifyCredentialHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCredentialHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission EW — Credential Honesty Attestation Policy Gate (SPEC-0159)', () => {
  it('EW4: validates well-formed plan (planId+changeId+ACTIVE+attestation handleId/subjectKind/honestyClaims/authorized)', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({
      subjectKind: 'HANDLE_BINDING',
      observedClaim: { claimKind: 'HANDLE_BINDING', claimValue: 'MATCH' }
    });

    const res = gate.evaluatePreconditions({
      planId: 'plan-ew-valid',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EW_CODES.OK);
  });

  it('EW5: rejects missing attestation or invalid attestation', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ew-noatt',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EW_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ew-invalidatt',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EW_CODES.INVALID_ATTESTATION);
  });

  it('EW6: rejects missing handleId / subjectKind / invalid subjectKind', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ew-noid',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ handleId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EW_CODES.MISSING_HANDLE_ID);

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ew-nokind',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, EW_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ew-badkind',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'QUOTA' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, EW_CODES.INVALID_SUBJECT_KIND);
  });

  it('EW7: DENY missing honestyClaims + invalid honestyClaims + binding/digest fail', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-ew-noclaims',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, EW_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-ew-badclaims',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveSecretStore: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, EW_CODES.INVALID_HONESTY_CLAIMS);

    const binding = gate.evaluatePreconditions({
      planId: 'plan-ew-bindfail',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ bindingMatch: false })
    });
    assert.equal(binding.ok, false);
    assert.equal(binding.code, EW_CODES.BINDING_MISMATCH);

    const digest = gate.evaluatePreconditions({
      planId: 'plan-ew-digestfail',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ digestConsistent: false })
    });
    assert.equal(digest.ok, false);
    assert.equal(digest.code, EW_CODES.DIGEST_INCONSISTENT);
  });

  it('EW8: rejects live-secret-store honesty lie, vault-kms, wall-clock, tip-refresh, ET/EU/EV/ER elevate, schema-json', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-ew-lie',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret store authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, EW_CODES.LIVE_SECRET_STORE_HONESTY_LIE);

    const vault = gate.evaluatePreconditions({
      planId: 'plan-ew-vault',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming vault/kms rotate',
      attestation: makeMockAttestation()
    });
    assert.equal(vault.ok, false);
    assert.equal(vault.code, EW_CODES.VAULT_KMS_FORBIDDEN);

    const mut = gate.evaluatePreconditions({
      planId: 'plan-ew-mut',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret mutation',
      attestation: makeMockAttestation()
    });
    assert.equal(mut.ok, false);
    assert.equal(mut.code, EW_CODES.LIVE_SECRET_MUTATION_FORBIDDEN);

    const wall = gate.evaluatePreconditions({
      planId: 'plan-ew-wall',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      attestation: makeMockAttestation()
    });
    assert.equal(wall.ok, false);
    assert.equal(wall.code, EW_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-ew-tipauth',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      attestation: makeMockAttestation()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, EW_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const etClaim = gate.evaluatePreconditions({
      planId: 'plan-ew-etclaim',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle-registry the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(etClaim.ok, false);
    assert.equal(etClaim.code, EW_CODES.ET_HANDLE_BIND_AS_ATTESTATION_FORBIDDEN);

    const euClaim = gate.evaluatePreconditions({
      planId: 'plan-ew-euclaim',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'make secret-zero-leak-deny the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(euClaim.ok, false);
    assert.equal(euClaim.code, EW_CODES.EU_LEAK_DENY_AS_ATTESTATION_FORBIDDEN);

    const evClaim = gate.evaluatePreconditions({
      planId: 'plan-ew-evclaim',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle-lifecycle the attestation port',
      attestation: makeMockAttestation()
    });
    assert.equal(evClaim.ok, false);
    assert.equal(evClaim.code, EW_CODES.EV_LIFECYCLE_AS_ATTESTATION_FORBIDDEN);

    const erClaim = gate.evaluatePreconditions({
      planId: 'plan-ew-erclaim',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'make config-honesty-attestation the handle port',
      attestation: makeMockAttestation()
    });
    assert.equal(erClaim.ok, false);
    assert.equal(erClaim.code, EW_CODES.ER_CONFIG_HONESTY_AS_HANDLE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ew-schema',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-credential-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EW_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSecretStoreHonestyLie('claiming live secret store authority'), true);
    assert.equal(claimsLiveSecretMutation('claiming live secret mutation'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EW9: allows HOLD mode with zero mutations', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ew-hold',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EW_CODES.HOLD);
  });

  it('EW10: DENY (ATTESTATION_UNAUTHORIZED / INVALID_ATTESTATION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ew-unauth',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EW_CODES.ATTESTATION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ew-mismatch',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'HANDLE_BINDING',
        observedClaim: { claimKind: 'HANDLE_LIFECYCLE', claimValue: 'X' },
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EW_CODES.INVALID_ATTESTATION_CLAIM);
  });

  it('EW11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer/secret)', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

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
        planId: 'plan-ew-secretfield',
        changeId: 'eos-ladder-38-mission-ew',
        ritualMode: 'ACTIVE',
        attestation: makeMockAttestation(),
        ...extra
      };
      if (extra.attestation) plan.attestation = extra.attestation;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, EW_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ secret: 'x' }), 'secret');
    assert.equal(findSecretLookingField({ handleId: 'ok' }), null);
  });

  it('EW12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ew-secret',
      changeId: 'eos-ladder-38-mission-ew',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EW_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-ew-del',
      changeId: 'eos-ladder-38-mission-ew',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, EW_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('EW13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ew-fundacion',
      changeId: 'eos-ladder-38-mission-ew',
      target: 'Documents/Fundacion/credential-handles'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EW_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildCredentialHonestyAttestationReceipt({
      planId: 'plan-ew-delta0',
      changeId: 'eos-ladder-38-mission-ew',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('EW14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L37 reopen, L38 auto-close, mass prune, GHE', () => {
    const gate = new CredentialHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ew-pr',
      changeId: 'eos-ladder-38-mission-ew',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EW_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', EW_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', EW_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', EW_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', EW_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', EW_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', EW_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', EW_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', EW_CODES.L37_REOPEN_FORBIDDEN],
      ['auto-close ladder-38 now', EW_CODES.L38_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-ew-ladder',
        changeId: 'eos-ladder-38-mission-ew',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ew-tip',
      changeId: 'eos-ladder-38-mission-ew',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EW_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ew-mass',
      changeId: 'eos-ladder-38-mission-ew',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EW_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ew-ghe',
      changeId: 'eos-ladder-38-mission-ew',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EW_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission EW — Credential Honesty Attestation Port (SPEC-0159)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EW15: govern happy path ACTIVE + authorized matching attestation -> PASS + EW-RCPT-* (≠ ET/EU/EV/ER ≠ tip-refresh)', async () => {
    const port = new CredentialHonestyAttestationPort();

    const bindRes = await port.govern({
      planId: 'plan-ew-pass-bind',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'HANDLE_BINDING',
        attestationStage: 'BINDING_MATCH',
        observedClaim: { claimKind: 'HANDLE_BINDING', claimValue: 'MATCH' },
        authorized: true
      })
    });

    assert.equal(bindRes.ok, true);
    assert.equal(bindRes.decision, 'PASS');
    assert.ok(bindRes.receipt.receiptId.startsWith('EW-RCPT-'));
    assert.equal(bindRes.receipt.fundacionDelta, 0);
    assert.equal(bindRes.receipt.productionReady, 'NO');
    assert.equal(bindRes.receipt.attestation.evaluated, true);
    assert.equal(bindRes.receipt.attestation.status, 'ATTESTATION_EVALUATED');
    assert.equal(bindRes.receipt.attestation.subjectKind, 'HANDLE_BINDING');
    assert.equal(bindRes.receipt.attestationHold.liveSecretStoreClaimRefused, true);
    assert.equal(bindRes.receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(bindRes.receipt.attestationHold.secretMaterialRefused, true);
    assert.equal(bindRes.receipt.attestationHold.secretZeroHeld, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEtCredentialHandleRegistry, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromEvCredentialHandleLifecycle, true);
    assert.equal(bindRes.receipt.attestationHold.distinctFromErConfigHonesty, true);
    assert.equal(bindRes.receipt.freezeObserve.liveSecretStoreClaimRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(bindRes.receipt.freezeObserve.pinShort, '376378be');
    assert.equal(typeof bindRes.receipt.attestationDigest, 'string');
    assert.equal(bindRes.receipt.attestationDigest.length, 64);
    assert.equal(EW_PORT_KIND, 'eos-credential-honesty-attestation-port');

    const lifeRes = await port.govern({
      planId: 'plan-ew-pass-life',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        handleId: 'hdl-ew-opaque-002',
        subjectKind: 'HANDLE_LIFECYCLE',
        attestationStage: 'DIGEST_CONSISTENCY',
        observedClaim: { claimKind: 'HANDLE_LIFECYCLE', claimValue: 'CONSISTENT' },
        authorized: true
      })
    });
    assert.equal(lifeRes.ok, true);
    assert.equal(lifeRes.decision, 'PASS');
    assert.equal(lifeRes.receipt.attestation.subjectKind, 'HANDLE_LIFECYCLE');
    assert.equal(port.trail.length, 2);

    const seal = canonicalCredentialHonestyAttestationSealBody(bindRes.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(bindRes.receipt.attestation), null);
  });

  it('EW16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new CredentialHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-ew-hold',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '376378be');
    assert.equal(port.trail.length, 1);
  });

  it('EW17: verifyTrail + ATTESTATION_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new CredentialHonestyAttestationPort();

    await port.govern({
      planId: 'plan-ew-trail-01',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-ew-trail-02',
      changeId: 'eos-ladder-38-mission-ew',
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

    const denyPort = new CredentialHonestyAttestationPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ew-unauth-deny',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EW_CODES.ATTESTATION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EW-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.attestation.status, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.attestationHold.failClosed, true);
    assert.equal(unauthRes.receipt.attestationHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-ew-secretfield-deny',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      attestation: makeMockAttestation()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, EW_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('EW-RCPT-'));
    const denySeal = canonicalCredentialHonestyAttestationSealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-ew-live-deny',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret store authority',
      attestation: makeMockAttestation()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EW_CODES.LIVE_SECRET_STORE_HONESTY_LIE);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ew-autoseal',
      changeId: 'eos-ladder-38-mission-ew',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EW_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(EW_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(EW_CODES.L38_AUTO_CLOSE_FORBIDDEN, 'L38_AUTO_CLOSE_FORBIDDEN');
    assert.equal(EW_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(EW_CODES.ATTESTATION_UNAUTHORIZED, 'ATTESTATION_UNAUTHORIZED');
    assert.equal(EW_CODES.BINDING_MISMATCH, 'BINDING_MISMATCH');
    assert.equal(EW_CODES.DIGEST_INCONSISTENT, 'DIGEST_INCONSISTENT');
  });
});
