/**
 * Mission ET — Credential-Handle Registry & Binding Port Test Suite.
 * SPEC-0156 / ADR-0137.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 2b747fb0 (do NOT rewrite tip pins)
 * - PASS = sealed credential-handle binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU
 * - NEVER reopen L30–L37; refuse L38 auto-close (EU–EX pending)
 * - Hermetic injected observedBinding only
 * - Distinct from EO/EP/EQ/ER and AU secret-runtime-broker
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ET_PRODUCTION_READY,
  ET_RECEIPT_PRODUCTION_READY,
  ET_RECEIPT_KIND,
  ET_FREEZE_PIN_SHORT,
  ET_FREEZE_PIN,
  ET_OPERATION,
  buildCredentialHandleRegistryReceipt,
  verifyCredentialHandleRegistryReceipt,
  canonicalCredentialHandleRegistrySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/credential-handle-registry-receipt.js';

import {
  CredentialHandleRegistryPolicyGate,
  ET_CODES,
  ET_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSecretStore,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/credential-handle-registry-policy-gate.js';

import {
  CredentialHandleRegistryPort,
  ET_PORT_PRODUCTION_READY,
  ET_PORT_KIND
} from '../src/core/composition/credential-handle-registry-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    handleId: 'hdl-opaque-et-demo-001',
    handleClass: 'credential-handle',
    bindingClass: 'credential-handle',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

describe('Mission ET — Credential-Handle Registry Receipt (SPEC-0156)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('ET1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 2b747fb0', () => {
    assert.equal(ET_PRODUCTION_READY, 'NO');
    assert.equal(ET_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(ET_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(ET_PORT_PRODUCTION_READY, 'NO');
    assert.equal(ET_FREEZE_PIN_SHORT, '2b747fb0');
    assert.equal(ET_FREEZE_PIN, '2b747fb0b86b14ac8c03e57a60fda392e383ba55');
  });

  it('ET2: builds canonical nine-field sealed ET-RCPT-* with freeze soft-observe + ceiling + handleHold + handleDigest', () => {
    const receipt = buildCredentialHandleRegistryReceipt({
      planId: 'plan-et-01',
      changeId: 'eos-ladder-38-mission-et',
      decision: 'PASS',
      binding: makeMockBinding()
    });

    assert.equal(receipt.kind, ET_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('ET-RCPT-'));
    assert.equal(receipt.operation, ET_OPERATION);
    assert.equal(receipt.operation, 'CREDENTIAL_HANDLE_REGISTRY_BINDING');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '2b747fb0');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l37ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveSecretStoreRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.handleHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.handleHold.failClosed, true);
    assert.equal(receipt.handleHold.secretMaterialRefused, true);
    assert.equal(receipt.handleHold.secretZeroHeld, true);
    assert.equal(receipt.handleHold.liveSecretStoreRefused, true);
    assert.equal(receipt.handleHold.distinctFromEoFeatureFlag, true);
    assert.equal(receipt.handleHold.distinctFromEpPolicyPack, true);
    assert.equal(receipt.handleHold.distinctFromEqStagedActivation, true);
    assert.equal(receipt.handleHold.distinctFromErConfigHonesty, true);
    assert.equal(receipt.handleHold.distinctFromAuSecretRuntimeBroker, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.handleDigest, 'string');
    assert.equal(receipt.handleDigest.length, 64);

    const seal = canonicalCredentialHandleRegistrySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'handleDigest',
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

  it('ET3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCredentialHandleRegistryReceipt({
      planId: 'plan-et-tamper',
      changeId: 'eos-ladder-38-mission-et',
      decision: 'PASS'
    });

    assert.equal(verifyCredentialHandleRegistryReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCredentialHandleRegistryReceipt(tampered).ok, false);
  });
});

describe('Mission ET — Credential-Handle Registry Policy Gate (SPEC-0156)', () => {
  it('ET4: validates well-formed plan (planId+changeId+ACTIVE+binding handleId/handleClass/desiredBinding/authorized)', () => {
    const gate = new CredentialHandleRegistryPolicyGate();
    const binding = makeMockBinding();

    const res = gate.evaluatePreconditions({
      planId: 'plan-et-valid',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, ET_CODES.OK);
  });

  it('ET5: rejects missing binding or invalid binding', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-et-nobinding',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, ET_CODES.MISSING_BINDING);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-et-invalidbinding',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, ET_CODES.INVALID_BINDING);
  });

  it('ET6: rejects missing handleId / handleClass / desiredBinding', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-et-noid',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ handleId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, ET_CODES.MISSING_HANDLE_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-et-noclass',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ handleClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, ET_CODES.MISSING_HANDLE_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-et-nodesired',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, ET_CODES.MISSING_DESIRED_BINDING);
  });

  it('ET7: DENY invalid desiredBinding/observedBinding + live secret store claims', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-et-baddesired',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, ET_CODES.INVALID_DESIRED_BINDING);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-et-badobserved',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ observedBinding: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, ET_CODES.INVALID_OBSERVED_BINDING);

    const live = gate.evaluatePreconditions({
      planId: 'plan-et-livesecret',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      liveSecretStore: true,
      binding: makeMockBinding()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, ET_CODES.LIVE_SECRET_STORE_FORBIDDEN);
  });

  it('ET8: rejects live secret store / wall-clock / tip-refresh authority / EO-EP-AU elevate / schema-json add', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-et-storeclaim',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret store binding',
      binding: makeMockBinding()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, ET_CODES.LIVE_SECRET_STORE_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-et-rolloutclaim',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      binding: makeMockBinding()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, ET_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-et-tipauth',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      binding: makeMockBinding()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, ET_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-et-eoclaim',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'make feature-flag the handle port for credentials',
      binding: makeMockBinding()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, ET_CODES.EO_FEATURE_FLAG_AS_HANDLE_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-et-epclaim',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'make policy-pack the handle port',
      binding: makeMockBinding()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, ET_CODES.EP_POLICY_PACK_AS_HANDLE_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-et-auclaim',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'reopen au secret-runtime-broker as the composition port',
      binding: makeMockBinding()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, ET_CODES.AU_SECRET_BROKER_AS_PORT_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-et-schema',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-credential-handle.json',
      binding: makeMockBinding()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, ET_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSecretStore('claiming live secret store'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('ET9: allows HOLD mode with zero mutations', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-et-hold',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, ET_CODES.HOLD);
  });

  it('ET10: DENY (BINDING_UNAUTHORIZED / INVALID_BINDING_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-et-unauth',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, ET_CODES.BINDING_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-et-mismatch',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'UNBOUND', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, ET_CODES.INVALID_BINDING_CLAIM);
  });

  it('ET11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { binding: makeMockBinding({ clientSecret: 'nope' }) }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-et-secretfield',
        changeId: 'eos-ladder-38-mission-et',
        ritualMode: 'ACTIVE',
        binding: makeMockBinding(),
        ...extra
      };
      // If extra has binding (last case), use that binding
      if (extra.binding) plan.binding = extra.binding;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, ET_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ handleId: 'ok' }), null);
  });

  it('ET12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new CredentialHandleRegistryPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-et-secret',
      changeId: 'eos-ladder-38-mission-et',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, ET_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-et-del',
      changeId: 'eos-ladder-38-mission-et',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, ET_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('ET13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-et-fundacion',
      changeId: 'eos-ladder-38-mission-et',
      target: 'Documents/Fundacion/credential-handles'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, ET_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildCredentialHandleRegistryReceipt({
      planId: 'plan-et-delta0',
      changeId: 'eos-ladder-38-mission-et',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('ET14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L37 reopen, L38 auto-close, mass prune, GHE', () => {
    const gate = new CredentialHandleRegistryPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-et-pr',
      changeId: 'eos-ladder-38-mission-et',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, ET_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', ET_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', ET_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', ET_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', ET_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', ET_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', ET_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', ET_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', ET_CODES.L37_REOPEN_FORBIDDEN],
      ['auto-close ladder-38 now', ET_CODES.L38_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-et-ladder',
        changeId: 'eos-ladder-38-mission-et',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-et-tip',
      changeId: 'eos-ladder-38-mission-et',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, ET_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-et-mass',
      changeId: 'eos-ladder-38-mission-et',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, ET_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-et-ghe',
      changeId: 'eos-ladder-38-mission-et',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, ET_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission ET — Credential-Handle Registry Port (SPEC-0156)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('ET15: govern happy path ACTIVE + authorized matching binding -> PASS + ET-RCPT-* (≠ EO/EP/AU ≠ tip-refresh)', async () => {
    const port = new CredentialHandleRegistryPort();
    const binding = makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'BOUND', authorized: true });

    const res = await port.govern({
      planId: 'plan-et-pass',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('ET-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.binding.evaluated, true);
    assert.equal(res.receipt.binding.status, 'BOUND_EVALUATED');
    assert.equal(res.receipt.handleHold.liveSecretStoreRefused, true);
    assert.equal(res.receipt.handleHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.handleHold.secretMaterialRefused, true);
    assert.equal(res.receipt.handleHold.secretZeroHeld, true);
    assert.equal(res.receipt.handleHold.distinctFromEoFeatureFlag, true);
    assert.equal(res.receipt.handleHold.distinctFromEpPolicyPack, true);
    assert.equal(res.receipt.handleHold.distinctFromAuSecretRuntimeBroker, true);
    assert.equal(res.receipt.freezeObserve.liveSecretStoreRefused, true);
    assert.equal(res.receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '2b747fb0');
    assert.equal(typeof res.receipt.handleDigest, 'string');
    assert.equal(res.receipt.handleDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(ET_PORT_KIND, 'eos-credential-handle-registry-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalCredentialHandleRegistrySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.binding), null);
  });

  it('ET16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new CredentialHandleRegistryPort();

    const res = await port.govern({
      planId: 'plan-et-hold',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '2b747fb0');
    assert.equal(port.trail.length, 1);
  });

  it('ET17: verifyTrail + BINDING_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new CredentialHandleRegistryPort();

    await port.govern({
      planId: 'plan-et-trail-01',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding()
    });

    await port.govern({
      planId: 'plan-et-trail-02',
      changeId: 'eos-ladder-38-mission-et',
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

    const denyPort = new CredentialHandleRegistryPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-et-unauth-deny',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, ET_CODES.BINDING_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('ET-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.binding.status, 'BINDING_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.handleHold.failClosed, true);
    assert.equal(unauthRes.receipt.handleHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-et-secretfield-deny',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      binding: makeMockBinding()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, ET_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('ET-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalCredentialHandleRegistrySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-et-live-deny',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      instruction: 'bind live secret store with live secret store',
      binding: makeMockBinding()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, ET_CODES.LIVE_SECRET_STORE_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-et-autoseal',
      changeId: 'eos-ladder-38-mission-et',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      binding: makeMockBinding()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, ET_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(ET_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(ET_CODES.L38_AUTO_CLOSE_FORBIDDEN, 'L38_AUTO_CLOSE_FORBIDDEN');
    assert.equal(ET_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
