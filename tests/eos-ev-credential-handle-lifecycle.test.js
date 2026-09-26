/**
 * Mission EV — Credential Handle Lifecycle / Rotation Governance Port Test Suite.
 * SPEC-0158 / ADR-0139.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only;
 *   seal opaque handleId + lifecycleDigest + stage only — never raw secrets /
 *   never new plaintext credentials on rotate)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 0eace5df (do NOT rewrite tip pins)
 * - PASS = sealed handle lifecycle ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live secret mutation ≠ wall-clock authority ≠ ET/EU/EQ
 * - NEVER reopen L30–L37; refuse L38 auto-close (EW–EX pending)
 * - Hermetic injected observedLifecycle only
 * - Distinct from ET bind, EU leak-deny, EQ config staged activation
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EV_PRODUCTION_READY,
  EV_RECEIPT_PRODUCTION_READY,
  EV_RECEIPT_KIND,
  EV_FREEZE_PIN_SHORT,
  EV_FREEZE_PIN,
  EV_OPERATION,
  buildCredentialHandleLifecycleReceipt,
  verifyCredentialHandleLifecycleReceipt,
  canonicalCredentialHandleLifecycleSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/credential-handle-lifecycle-receipt.js';

import {
  CredentialHandleLifecyclePolicyGate,
  EV_CODES,
  EV_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSecretMutation,
  claimsLiveSecretStore,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/credential-handle-lifecycle-policy-gate.js';

import {
  CredentialHandleLifecyclePort,
  EV_PORT_PRODUCTION_READY,
  EV_PORT_KIND
} from '../src/core/composition/credential-handle-lifecycle-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockLifecycle(overrides = {}) {
  return {
    handleId: 'hdl-ev-opaque-001',
    handleClass: 'credential-handle',
    desiredStage: 'STAGED_ROTATE',
    observedLifecycle: 'STAGED_ROTATE',
    authorized: true,
    ...overrides
  };
}

describe('Mission EV — Credential Handle Lifecycle Receipt (SPEC-0158)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EV1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 0eace5df', () => {
    assert.equal(EV_PRODUCTION_READY, 'NO');
    assert.equal(EV_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EV_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EV_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EV_FREEZE_PIN_SHORT, '0eace5df');
    assert.equal(EV_FREEZE_PIN, '0eace5df332026098a0eb153c746535e961f09cf');
  });

  it('EV2: builds canonical nine-field sealed EV-RCPT-* with freeze soft-observe + ceiling + lifecycleHold + lifecycleDigest', () => {
    const receipt = buildCredentialHandleLifecycleReceipt({
      planId: 'plan-ev-01',
      changeId: 'eos-ladder-38-mission-ev',
      decision: 'PASS',
      lifecycle: makeMockLifecycle()
    });

    assert.equal(receipt.kind, EV_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EV-RCPT-'));
    assert.equal(receipt.operation, EV_OPERATION);
    assert.equal(receipt.operation, 'CREDENTIAL_HANDLE_LIFECYCLE_ROTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '0eace5df');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l37ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveSecretMutationRefused, true);
    assert.equal(receipt.freezeObserve.liveSecretStoreRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.vaultKmsRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.lifecycleHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.lifecycleHold.failClosed, true);
    assert.equal(receipt.lifecycleHold.secretMaterialRefused, true);
    assert.equal(receipt.lifecycleHold.secretZeroHeld, true);
    assert.equal(receipt.lifecycleHold.liveSecretMutationRefused, true);
    assert.equal(receipt.lifecycleHold.distinctFromEtCredentialHandleRegistry, true);
    assert.equal(receipt.lifecycleHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.lifecycleHold.distinctFromEqStagedActivation, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.lifecycleDigest, 'string');
    assert.equal(receipt.lifecycleDigest.length, 64);

    const seal = canonicalCredentialHandleLifecycleSealBody(receipt);
    assert.deepEqual(
      Object.keys(seal).sort(),
      [
        'changeId',
        'decision',
        'fundacionDelta',
        'lifecycleDigest',
        'operation',
        'planId',
        'prevReceiptHash',
        'receiptId',
        'timestamp'
      ].sort()
    );
    // Law VI: seal body must not contain secret-looking keys
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(scanForSecrets(seal), false);
  });

  it('EV3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCredentialHandleLifecycleReceipt({
      planId: 'plan-ev-tamper',
      changeId: 'eos-ladder-38-mission-ev',
      decision: 'PASS'
    });

    assert.equal(verifyCredentialHandleLifecycleReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCredentialHandleLifecycleReceipt(tampered).ok, false);
  });
});

describe('Mission EV — Credential Handle Lifecycle Policy Gate (SPEC-0158)', () => {
  it('EV4: validates well-formed plan (planId+changeId+ACTIVE+lifecycle handleId/desiredStage/authorized)', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();
    const lifecycle = makeMockLifecycle();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ev-valid',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      lifecycle
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EV_CODES.OK);
  });

  it('EV5: rejects missing lifecycle or invalid lifecycle', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ev-nolifecycle',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EV_CODES.MISSING_LIFECYCLE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ev-invalidlifecycle',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EV_CODES.INVALID_LIFECYCLE);
  });

  it('EV6: rejects missing handleId / desiredStage', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ev-noid',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ handleId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EV_CODES.MISSING_HANDLE_ID);

    const resStage = gate.evaluatePreconditions({
      planId: 'plan-ev-nostage',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ desiredStage: '   ' })
    });
    assert.equal(resStage.ok, false);
    assert.equal(resStage.code, EV_CODES.MISSING_DESIRED_STAGE);

    const resNullStage = gate.evaluatePreconditions({
      planId: 'plan-ev-nullstage',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ desiredStage: null })
    });
    assert.equal(resNullStage.ok, false);
    assert.equal(resNullStage.code, EV_CODES.MISSING_DESIRED_STAGE);
  });

  it('EV7: DENY invalid desiredStage/observedLifecycle + live secret mutation claims', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-ev-baddesired',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ desiredStage: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EV_CODES.INVALID_DESIRED_STAGE);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-ev-badobserved',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ observedLifecycle: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EV_CODES.INVALID_OBSERVED_LIFECYCLE);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ev-livemutation',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      liveSecretMutation: true,
      lifecycle: makeMockLifecycle()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EV_CODES.LIVE_SECRET_MUTATION_FORBIDDEN);
  });

  it('EV8: rejects live secret mutation / vault-kms / wall-clock / tip-refresh / ET-EU-EQ elevate / schema-json add', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const mutClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-mutclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret mutation',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(mutClaim.ok, false);
    assert.equal(mutClaim.code, EV_CODES.LIVE_SECRET_MUTATION_FORBIDDEN);

    const vault = gate.evaluatePreconditions({
      planId: 'plan-ev-vault',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming vault/kms rotate',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(vault.ok, false);
    assert.equal(vault.code, EV_CODES.VAULT_KMS_FORBIDDEN);

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-storeclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret store claim',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, EV_CODES.LIVE_SECRET_STORE_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-rolloutclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EV_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-ev-tipauth',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, EV_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const etClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-etclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle-registry the lifecycle port',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(etClaim.ok, false);
    assert.equal(etClaim.code, EV_CODES.ET_HANDLE_BIND_AS_LIFECYCLE_FORBIDDEN);

    const euClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-euclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'make secret-zero-leak-deny the lifecycle port',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(euClaim.ok, false);
    assert.equal(euClaim.code, EV_CODES.EU_LEAK_DENY_AS_LIFECYCLE_FORBIDDEN);

    const eqClaim = gate.evaluatePreconditions({
      planId: 'plan-ev-eqclaim',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'make config-staged-activation the lifecycle port',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(eqClaim.ok, false);
    assert.equal(eqClaim.code, EV_CODES.EQ_STAGED_ACTIVATION_AS_LIFECYCLE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ev-schema',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-credential-handle-lifecycle.json',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EV_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSecretMutation('claiming live secret mutation'), true);
    assert.equal(claimsLiveSecretStore('claiming live secret store'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EV9: allows HOLD mode with zero mutations', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ev-hold',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EV_CODES.HOLD);
  });

  it('EV10: DENY (LIFECYCLE_UNAUTHORIZED / INVALID_LIFECYCLE_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ev-unauth',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EV_CODES.LIFECYCLE_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ev-mismatch',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({
        desiredStage: 'ROTATE',
        observedLifecycle: 'REVOKE',
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EV_CODES.INVALID_LIFECYCLE_CLAIM);
  });

  it('EV11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer/newSecret)', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { newSecret: 'x' },
      { lifecycle: makeMockLifecycle({ clientSecret: 'nope' }) }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-ev-secretfield',
        changeId: 'eos-ladder-38-mission-ev',
        ritualMode: 'ACTIVE',
        lifecycle: makeMockLifecycle(),
        ...extra
      };
      if (extra.lifecycle) plan.lifecycle = extra.lifecycle;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, EV_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ newSecret: 'x' }), 'newSecret');
    assert.equal(findSecretLookingField({ handleId: 'ok' }), null);
  });

  it('EV12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ev-secret',
      changeId: 'eos-ladder-38-mission-ev',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EV_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-ev-del',
      changeId: 'eos-ladder-38-mission-ev',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, EV_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('EV13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ev-fundacion',
      changeId: 'eos-ladder-38-mission-ev',
      target: 'Documents/Fundacion/credential-handles'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EV_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildCredentialHandleLifecycleReceipt({
      planId: 'plan-ev-delta0',
      changeId: 'eos-ladder-38-mission-ev',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('EV14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L37 reopen, L38 auto-close, mass prune, GHE', () => {
    const gate = new CredentialHandleLifecyclePolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ev-pr',
      changeId: 'eos-ladder-38-mission-ev',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EV_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', EV_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', EV_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', EV_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', EV_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', EV_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', EV_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', EV_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', EV_CODES.L37_REOPEN_FORBIDDEN],
      ['auto-close ladder-38 now', EV_CODES.L38_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-ev-ladder',
        changeId: 'eos-ladder-38-mission-ev',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ev-tip',
      changeId: 'eos-ladder-38-mission-ev',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EV_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ev-mass',
      changeId: 'eos-ladder-38-mission-ev',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EV_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ev-ghe',
      changeId: 'eos-ladder-38-mission-ev',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EV_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission EV — Credential Handle Lifecycle Port (SPEC-0158)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EV15: govern happy path ACTIVE + authorized matching lifecycle (ROTATE/REVOKE) -> PASS + EV-RCPT-* (≠ ET/EU/EQ ≠ tip-refresh)', async () => {
    const port = new CredentialHandleLifecyclePort();

    const rotateRes = await port.govern({
      planId: 'plan-ev-pass-rotate',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({
        desiredStage: 'ROTATE',
        observedLifecycle: 'ROTATE',
        authorized: true
      })
    });

    assert.equal(rotateRes.ok, true);
    assert.equal(rotateRes.decision, 'PASS');
    assert.ok(rotateRes.receipt.receiptId.startsWith('EV-RCPT-'));
    assert.equal(rotateRes.receipt.fundacionDelta, 0);
    assert.equal(rotateRes.receipt.productionReady, 'NO');
    assert.equal(rotateRes.receipt.lifecycle.evaluated, true);
    assert.equal(rotateRes.receipt.lifecycle.status, 'LIFECYCLE_EVALUATED');
    assert.equal(rotateRes.receipt.lifecycle.desiredStage, 'ROTATE');
    assert.equal(rotateRes.receipt.lifecycleHold.liveSecretMutationRefused, true);
    assert.equal(rotateRes.receipt.lifecycleHold.hermeticInMemoryOnly, true);
    assert.equal(rotateRes.receipt.lifecycleHold.secretMaterialRefused, true);
    assert.equal(rotateRes.receipt.lifecycleHold.secretZeroHeld, true);
    assert.equal(rotateRes.receipt.lifecycleHold.distinctFromEtCredentialHandleRegistry, true);
    assert.equal(rotateRes.receipt.lifecycleHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(rotateRes.receipt.lifecycleHold.distinctFromEqStagedActivation, true);
    assert.equal(rotateRes.receipt.freezeObserve.liveSecretMutationRefused, true);
    assert.equal(rotateRes.receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(rotateRes.receipt.freezeObserve.pinShort, '0eace5df');
    assert.equal(typeof rotateRes.receipt.lifecycleDigest, 'string');
    assert.equal(rotateRes.receipt.lifecycleDigest.length, 64);
    assert.equal(EV_PORT_KIND, 'eos-credential-handle-lifecycle-port');

    const revokeRes = await port.govern({
      planId: 'plan-ev-pass-revoke',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({
        handleId: 'hdl-ev-opaque-002',
        desiredStage: 'REVOKE',
        observedLifecycle: 'REVOKE',
        authorized: true
      })
    });
    assert.equal(revokeRes.ok, true);
    assert.equal(revokeRes.decision, 'PASS');
    assert.equal(revokeRes.receipt.lifecycle.desiredStage, 'REVOKE');
    assert.equal(port.trail.length, 2);

    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalCredentialHandleLifecycleSealBody(rotateRes.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(rotateRes.receipt.lifecycle), null);
  });

  it('EV16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new CredentialHandleLifecyclePort();

    const res = await port.govern({
      planId: 'plan-ev-hold',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '0eace5df');
    assert.equal(port.trail.length, 1);
  });

  it('EV17: verifyTrail + LIFECYCLE_UNAUTHORIZED deny + secret-field deny + live-mutation deny + auto-seal refuse + gate codes', async () => {
    const port = new CredentialHandleLifecyclePort();

    await port.govern({
      planId: 'plan-ev-trail-01',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle()
    });

    await port.govern({
      planId: 'plan-ev-trail-02',
      changeId: 'eos-ladder-38-mission-ev',
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

    const denyPort = new CredentialHandleLifecyclePort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ev-unauth-deny',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      lifecycle: makeMockLifecycle({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EV_CODES.LIFECYCLE_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EV-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.lifecycle.status, 'LIFECYCLE_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.lifecycleHold.failClosed, true);
    assert.equal(unauthRes.receipt.lifecycleHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-ev-secretfield-deny',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, EV_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('EV-RCPT-'));
    const denySeal = canonicalCredentialHandleLifecycleSealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-ev-live-deny',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret mutation',
      lifecycle: makeMockLifecycle()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EV_CODES.LIVE_SECRET_MUTATION_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ev-autoseal',
      changeId: 'eos-ladder-38-mission-ev',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      lifecycle: makeMockLifecycle()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EV_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(EV_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(EV_CODES.L38_AUTO_CLOSE_FORBIDDEN, 'L38_AUTO_CLOSE_FORBIDDEN');
    assert.equal(EV_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(EV_CODES.LIFECYCLE_UNAUTHORIZED, 'LIFECYCLE_UNAUTHORIZED');
    assert.equal(EV_CODES.INVALID_LIFECYCLE_CLAIM, 'INVALID_LIFECYCLE_CLAIM');
  });
});
