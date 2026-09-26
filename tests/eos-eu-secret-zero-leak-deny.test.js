/**
 * Mission EU — Secret-Zero Leak-Deny & Claim Port Test Suite.
 * SPEC-0157 / ADR-0138.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin bc24c17b (do NOT rewrite tip pins)
 * - PASS = sealed credential-handle claim ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU
 * - NEVER reopen L30–L37; refuse L38 auto-close (EV–EX pending)
 * - Hermetic injected observedBinding only
 * - Distinct from EO/EP/EQ/ER and AU secret-runtime-broker
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EU_PRODUCTION_READY,
  EU_RECEIPT_PRODUCTION_READY,
  EU_RECEIPT_KIND,
  EU_FREEZE_PIN_SHORT,
  EU_FREEZE_PIN,
  EU_OPERATION,
  buildSecretZeroLeakDenyReceipt,
  verifySecretZeroLeakDenyReceipt,
  canonicalSecretZeroLeakDenySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/secret-zero-leak-deny-receipt.js';

import {
  SecretZeroLeakDenyPolicyGate,
  EU_CODES,
  EU_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSecretStore,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/secret-zero-leak-deny-policy-gate.js';

import {
  SecretZeroLeakDenyPort,
  EU_PORT_PRODUCTION_READY,
  EU_PORT_KIND
} from '../src/core/composition/secret-zero-leak-deny-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockClaim(overrides = {}) {
  return {
    subjectKind: 'RECEIPT',
    desiredAction: 'DENY_LEAK',
    leakClass: 'CONFIRMED',
    observedScan: { leakDetected: true },
    authorized: true,
    ...overrides
  };
}

describe('Mission EU — Secret-Zero Leak-Deny Receipt (SPEC-0157)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EU1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin bc24c17b', () => {
    assert.equal(EU_PRODUCTION_READY, 'NO');
    assert.equal(EU_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EU_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EU_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EU_FREEZE_PIN_SHORT, 'bc24c17b');
    assert.equal(EU_FREEZE_PIN, 'bc24c17bbb0b580b70ae4eeb0277630536002f51');
  });

  it('EU2: builds canonical nine-field sealed EU-RCPT-* with freeze soft-observe + ceiling + leakHold + redactionDigest', () => {
    const receipt = buildSecretZeroLeakDenyReceipt({
      planId: 'plan-eu-01',
      changeId: 'eos-ladder-38-mission-eu',
      decision: 'PASS',
      claim: makeMockClaim()
    });

    assert.equal(receipt.kind, EU_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EU-RCPT-'));
    assert.equal(receipt.operation, EU_OPERATION);
    assert.equal(receipt.operation, 'SECRET_ZERO_LEAK_DENY_REDACTION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'bc24c17b');
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
    assert.equal(receipt.leakHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.leakHold.failClosed, true);
    assert.equal(receipt.leakHold.secretMaterialRefused, true);
    assert.equal(receipt.leakHold.secretZeroHeld, true);
    assert.equal(receipt.leakHold.liveSecretStoreRefused, true);
    assert.equal(receipt.leakHold.distinctFromEoFeatureFlag, true);
    assert.equal(receipt.leakHold.distinctFromEpPolicyPack, true);
    assert.equal(receipt.leakHold.distinctFromEqStagedActivation, true);
    assert.equal(receipt.leakHold.distinctFromErConfigHonesty, true);
    assert.equal(receipt.leakHold.distinctFromAuSecretLeakGuard, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.redactionDigest, 'string');
    assert.equal(receipt.redactionDigest.length, 64);

    const seal = canonicalSecretZeroLeakDenySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'redactionDigest',
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

  it('EU3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildSecretZeroLeakDenyReceipt({
      planId: 'plan-eu-tamper',
      changeId: 'eos-ladder-38-mission-eu',
      decision: 'PASS'
    });

    assert.equal(verifySecretZeroLeakDenyReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifySecretZeroLeakDenyReceipt(tampered).ok, false);
  });
});

describe('Mission EU — Secret-Zero Leak-Deny Policy Gate (SPEC-0157)', () => {
  it('EU4: validates well-formed plan (planId+changeId+ACTIVE+claim handleId/handleClass/desiredBinding/authorized)', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();
    const claim = makeMockClaim();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eu-valid',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      claim
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EU_CODES.OK);
  });

  it('EU5: rejects missing claim or invalid claim', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eu-nobinding',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EU_CODES.MISSING_CLAIM);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eu-invalidbinding',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EU_CODES.INVALID_CLAIM);
  });

  it('EU6: rejects missing handleId / handleClass / desiredBinding', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-eu-noid',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ subjectKind: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EU_CODES.MISSING_SUBJECT_KIND);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-eu-noclass',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ desiredAction: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EU_CODES.MISSING_DESIRED_ACTION);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-eu-nodesired',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ desiredAction: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EU_CODES.MISSING_DESIRED_ACTION);
  });

  it('EU7: DENY invalid desiredBinding/observedBinding + live secret store claims', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-eu-baddesired',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ desiredAction: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EU_CODES.INVALID_DESIRED_ACTION);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-eu-badobserved',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ observedScan: { leakDetected: 'PERCENT_50' } })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EU_CODES.INVALID_OBSERVED_SCAN);

    const live = gate.evaluatePreconditions({
      planId: 'plan-eu-livesecret',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      liveSecretStore: true,
      claim: makeMockClaim()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EU_CODES.LIVE_SECRET_STORE_FORBIDDEN);
  });

  it('EU8: rejects live secret store / wall-clock / tip-refresh authority / EO-EP-AU elevate / schema-json add', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-eu-storeclaim',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live secret store claim',
      claim: makeMockClaim()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, EU_CODES.LIVE_SECRET_STORE_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-eu-rolloutclaim',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      claim: makeMockClaim()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EU_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-eu-tipauth',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      claim: makeMockClaim()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, EU_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-eu-eoclaim',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'make feature-flag the leak-deny port',
      claim: makeMockClaim()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, EU_CODES.EO_FEATURE_FLAG_AS_LEAK_DENY_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-eu-epclaim',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'make policy-pack the leak-deny port',
      claim: makeMockClaim()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, EU_CODES.EP_POLICY_PACK_AS_LEAK_DENY_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-eu-auclaim',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'reopen au secret-leak-guard as the composition port',
      claim: makeMockClaim()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, EU_CODES.AU_SECRET_BROKER_AS_PORT_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eu-schema',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-secret-zero-leak-deny.json',
      claim: makeMockClaim()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EU_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSecretStore('claiming live secret store'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EU9: allows HOLD mode with zero mutations', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eu-hold',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EU_CODES.HOLD);
  });

  it('EU10: DENY (REDACTION_UNAUTHORIZED / INVALID_REDACTION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-eu-unauth',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EU_CODES.REDACTION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-eu-mismatch',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ desiredAction: 'DENY_LEAK', observedScan: { leakDetected: false }, authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EU_CODES.INVALID_REDACTION_CLAIM);
  });

  it('EU11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { claim: makeMockClaim({ clientSecret: 'nope' }) }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-eu-secretfield',
        changeId: 'eos-ladder-38-mission-eu',
        ritualMode: 'ACTIVE',
        claim: makeMockClaim(),
        ...extra
      };
      // If extra has claim (last case), use that claim
      if (extra.claim) plan.claim = extra.claim;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, EU_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ handleId: 'ok' }), null);
  });

  it('EU12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-eu-secret',
      changeId: 'eos-ladder-38-mission-eu',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EU_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-eu-del',
      changeId: 'eos-ladder-38-mission-eu',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, EU_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('EU13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eu-fundacion',
      changeId: 'eos-ladder-38-mission-eu',
      target: 'Documents/Fundacion/credential-handles'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EU_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildSecretZeroLeakDenyReceipt({
      planId: 'plan-eu-delta0',
      changeId: 'eos-ladder-38-mission-eu',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('EU14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L37 reopen, L38 auto-close, mass prune, GHE', () => {
    const gate = new SecretZeroLeakDenyPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eu-pr',
      changeId: 'eos-ladder-38-mission-eu',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EU_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', EU_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', EU_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', EU_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', EU_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', EU_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', EU_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', EU_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', EU_CODES.L37_REOPEN_FORBIDDEN],
      ['auto-close ladder-38 now', EU_CODES.L38_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-eu-ladder',
        changeId: 'eos-ladder-38-mission-eu',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eu-tip',
      changeId: 'eos-ladder-38-mission-eu',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EU_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eu-mass',
      changeId: 'eos-ladder-38-mission-eu',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EU_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eu-ghe',
      changeId: 'eos-ladder-38-mission-eu',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EU_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission EU — Secret-Zero Leak-Deny Port (SPEC-0157)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EU15: govern happy path ACTIVE + authorized matching claim -> PASS + EU-RCPT-* (≠ EO/EP/AU ≠ tip-refresh)', async () => {
    const port = new SecretZeroLeakDenyPort();
    const claim = makeMockClaim({ desiredAction: 'DENY_LEAK', observedScan: { leakDetected: true }, authorized: true });

    const res = await port.govern({
      planId: 'plan-eu-pass',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EU-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.claim.evaluated, true);
    assert.equal(res.receipt.claim.status, 'REDACTION_EVALUATED');
    assert.equal(res.receipt.leakHold.liveSecretStoreRefused, true);
    assert.equal(res.receipt.leakHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.leakHold.secretMaterialRefused, true);
    assert.equal(res.receipt.leakHold.secretZeroHeld, true);
    assert.equal(res.receipt.leakHold.distinctFromEoFeatureFlag, true);
    assert.equal(res.receipt.leakHold.distinctFromEpPolicyPack, true);
    assert.equal(res.receipt.leakHold.distinctFromAuSecretLeakGuard, true);
    assert.equal(res.receipt.freezeObserve.liveSecretStoreRefused, true);
    assert.equal(res.receipt.freezeObserve.l38AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'bc24c17b');
    assert.equal(typeof res.receipt.redactionDigest, 'string');
    assert.equal(res.receipt.redactionDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EU_PORT_KIND, 'eos-secret-zero-leak-deny-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalSecretZeroLeakDenySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.claim), null);
  });

  it('EU16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new SecretZeroLeakDenyPort();

    const res = await port.govern({
      planId: 'plan-eu-hold',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'bc24c17b');
    assert.equal(port.trail.length, 1);
  });

  it('EU17: verifyTrail + REDACTION_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new SecretZeroLeakDenyPort();

    await port.govern({
      planId: 'plan-eu-trail-01',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim()
    });

    await port.govern({
      planId: 'plan-eu-trail-02',
      changeId: 'eos-ladder-38-mission-eu',
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

    const denyPort = new SecretZeroLeakDenyPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-eu-unauth-deny',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      claim: makeMockClaim({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EU_CODES.REDACTION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EU-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.claim.status, 'REDACTION_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.leakHold.failClosed, true);
    assert.equal(unauthRes.receipt.leakHold.secretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-eu-secretfield-deny',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      claim: makeMockClaim()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, EU_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('EU-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalSecretZeroLeakDenySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-eu-live-deny',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      instruction: 'bind live secret store with live secret store',
      claim: makeMockClaim()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EU_CODES.LIVE_SECRET_STORE_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-eu-autoseal',
      changeId: 'eos-ladder-38-mission-eu',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      claim: makeMockClaim()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EU_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(EU_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(EU_CODES.L38_AUTO_CLOSE_FORBIDDEN, 'L38_AUTO_CLOSE_FORBIDDEN');
    assert.equal(EU_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
