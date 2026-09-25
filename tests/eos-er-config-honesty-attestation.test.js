/**
 * Mission ER — Config Honesty & Flag Attestation Port Test Suite.
 * SPEC-0154 / ADR-0134.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 7ee4bd49 (do NOT rewrite tip pins)
 * - Soft-observe freeze pins alone ≠ config truth
 * - PASS = hermetic honesty attestation ≠ live flag store ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L36; refuse L37 auto-close (ES pending)
 * - Distinct from EO / EP / EQ / EM / EH — attestation only (does not flip flags or activate)
 * - Hermetic injected observedClaim only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ER_PRODUCTION_READY,
  ER_RECEIPT_PRODUCTION_READY,
  ER_RECEIPT_KIND,
  ER_FREEZE_PIN_SHORT,
  ER_OPERATION,
  ER_SUBJECT_KINDS,
  buildConfigHonestyAttestationReceipt,
  verifyConfigHonestyAttestationReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/config-honesty-attestation-receipt.js';

import {
  ConfigHonestyAttestationPolicyGate,
  ER_CODES,
  ER_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveFlagStoreHonestyLie,
  isFundacionTarget
} from '../src/core/composition/config-honesty-attestation-policy-gate.js';

import {
  ConfigHonestyAttestationPort,
  ER_PORT_PRODUCTION_READY,
  ER_PORT_KIND
} from '../src/core/composition/config-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveFlagStore: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EQ-RCPT-0001',
    subjectKind: 'STAGED_ACTIVATION',
    honestyClaims: makeMockHonestyClaims(),
    observedClaim: {
      claimKind: 'STAGED_ACTIVATION',
      claimValue: 'CANARY'
    },
    authorized: true,
    ...overrides
  };
}

describe('Mission ER — Config Honesty Attestation Receipt (SPEC-0154)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('ER1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 7ee4bd49', () => {
    assert.equal(ER_PRODUCTION_READY, 'NO');
    assert.equal(ER_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(ER_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(ER_PORT_PRODUCTION_READY, 'NO');
    assert.equal(ER_FREEZE_PIN_SHORT, '7ee4bd49');
  });

  it('ER2: builds canonical nine-field sealed ER-RCPT-* with freeze soft-observe + ceiling hold + attestation hold', () => {
    const receipt = buildConfigHonestyAttestationReceipt({
      planId: 'plan-er-01',
      changeId: 'eos-ladder-37-mission-er',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, ER_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('ER-RCPT-'));
    assert.equal(receipt.operation, ER_OPERATION);
    assert.equal(receipt.operation, 'CONFIG_HONESTY_FLAG_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '7ee4bd49');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l36ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l35ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveFlagStoreClaimRefused, true);
    assert.equal(receipt.freezeObserve.softObserveAloneNotConfigTruth, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.liveFlagStoreClaimRefused, true);
    assert.equal(receipt.attestationHold.softObserveAloneNotConfigTruth, true);
    assert.equal(receipt.attestationHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.attestationHold.tipRewriteRefused, true);
    assert.equal(receipt.attestationHold.schemaJsonAddRefused, true);
    assert.equal(receipt.attestationHold.productionReadyFlipRefused, true);
    assert.equal(receipt.attestationHold.distinctFromEoFeatureFlag, true);
    assert.equal(receipt.attestationHold.distinctFromEpPolicyPackBinding, true);
    assert.equal(receipt.attestationHold.distinctFromEqStagedActivation, true);
    assert.equal(receipt.attestationHold.distinctFromEmCapacityHonesty, true);
    assert.equal(receipt.attestationHold.distinctFromEhTemporalHonesty, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.attestationDigest, 'string');
    assert.equal(receipt.attestationDigest.length, 64);
    assert.ok(
      receipt.freezeObserve.nonClaimLabels.some((l) =>
        /Soft-observe freeze pins alone ≠ config truth/.test(l)
      )
    );
  });

  it('ER3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildConfigHonestyAttestationReceipt({
      planId: 'plan-er-tamper',
      changeId: 'eos-ladder-37-mission-er',
      decision: 'PASS'
    });

    assert.equal(verifyConfigHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyConfigHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission ER — Config Honesty Attestation Policy Gate (SPEC-0154)', () => {
  it('ER4: validates well-formed plan (planId+changeId+ACTIVE+attestation subjectKind/honestyClaims/authorized)', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({ subjectKind: 'FEATURE_FLAG', observedClaim: { claimKind: 'FEATURE_FLAG', claimValue: 'ON' } });

    const res = gate.evaluatePreconditions({
      planId: 'plan-er-valid',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, ER_CODES.OK);
  });

  it('ER5: rejects missing attestation or invalid attestation', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-er-noatt',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, ER_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-er-invalidatt',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, ER_CODES.INVALID_ATTESTATION);
  });

  it('ER6: rejects missing subjectKind / invalid subjectKind', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-er-nokind',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, ER_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-er-badkind',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'QUOTA' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, ER_CODES.INVALID_SUBJECT_KIND);
  });

  it('ER7: DENY missing honestyClaims + invalid honestyClaims', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-er-noclaims',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, ER_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-er-badclaims',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveFlagStore: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, ER_CODES.INVALID_HONESTY_CLAIMS);
  });

  it('ER8: rejects live-flag-store honesty lie, soft-observe-as-config-truth, schema-json, wall-clock, tip-refresh authority', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-er-lie',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live flag store authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, ER_CODES.LIVE_FLAG_STORE_HONESTY_LIE);

    const softTruth = gate.evaluatePreconditions({
      planId: 'plan-er-softtruth',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'soft-observe alone is config truth',
      attestation: makeMockAttestation()
    });
    assert.equal(softTruth.ok, false);
    assert.equal(softTruth.code, ER_CODES.LIVE_FLAG_STORE_HONESTY_LIE);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-er-schema',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-config-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, ER_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    const wall = gate.evaluatePreconditions({
      planId: 'plan-er-wall',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'use wall-clock authority',
      attestation: makeMockAttestation()
    });
    assert.equal(wall.ok, false);
    assert.equal(wall.code, ER_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-er-tipauth',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'claim tip-refresh authority',
      attestation: makeMockAttestation()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, ER_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    assert.equal(claimsLiveFlagStoreHonestyLie('live flag store authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('ER9: allows HOLD mode with zero mutations', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-er-hold',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, ER_CODES.HOLD);
  });

  it('ER10: DENY (ATTESTATION_UNAUTHORIZED / INVALID_ATTESTATION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-er-unauth',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, ER_CODES.ATTESTATION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-er-mismatch',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        subjectKind: 'FEATURE_FLAG',
        observedClaim: { claimKind: 'POLICY_PACK', claimValue: 'pack-a' },
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, ER_CODES.INVALID_ATTESTATION_CLAIM);

    const badKind = gate.evaluatePreconditions({
      planId: 'plan-er-badclaimkind',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        observedClaim: { claimKind: 'TIMER', claimValue: 'x' },
        authorized: true
      })
    });
    assert.equal(badKind.ok, false);
    assert.equal(badKind.code, ER_CODES.INVALID_ATTESTATION_CLAIM);
  });

  it('ER11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-er-del1',
      changeId: 'eos-ladder-37-mission-er',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, ER_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-er-del2',
      changeId: 'eos-ladder-37-mission-er',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, ER_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('ER12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-er-secret',
      changeId: 'eos-ladder-37-mission-er',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, ER_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('ER13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-er-fundacion',
      changeId: 'eos-ladder-37-mission-er',
      target: 'Documents/Fundacion/attestation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, ER_CODES.FUNDACION_DENIED);

    const receipt = buildConfigHonestyAttestationReceipt({
      planId: 'plan-er-delta',
      changeId: 'eos-ladder-37-mission-er',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('ER14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L36 reopen, L37 auto-close, mass prune, GHE + gate codes', () => {
    const gate = new ConfigHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-er-pr',
      changeId: 'eos-ladder-37-mission-er',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, ER_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-er-l30',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, ER_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-er-l31',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, ER_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-er-l32',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, ER_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-er-l33',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, ER_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-er-l34',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, ER_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-er-l35',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, ER_CODES.L35_REOPEN_FORBIDDEN);

    const l36Res = gate.evaluatePreconditions({
      planId: 'plan-er-l36',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'reopen ladder-36'
    });
    assert.equal(l36Res.ok, false);
    assert.equal(l36Res.code, ER_CODES.L36_REOPEN_FORBIDDEN);

    const l37CloseRes = gate.evaluatePreconditions({
      planId: 'plan-er-l37-close',
      changeId: 'eos-ladder-37-mission-er',
      instruction: 'auto-close ladder-37 now'
    });
    assert.equal(l37CloseRes.ok, false);
    assert.equal(l37CloseRes.code, ER_CODES.L37_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-er-tip',
      changeId: 'eos-ladder-37-mission-er',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, ER_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-er-mass',
      changeId: 'eos-ladder-37-mission-er',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, ER_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-er-ghe',
      changeId: 'eos-ladder-37-mission-er',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, ER_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.ok(ER_CODES.ATTESTATION_UNAUTHORIZED);
    assert.ok(ER_CODES.INVALID_ATTESTATION_CLAIM);
    assert.ok(ER_CODES.LIVE_FLAG_STORE_HONESTY_LIE);
    assert.ok(ER_CODES.L37_AUTO_CLOSE_FORBIDDEN);
    assert.deepEqual([...ER_SUBJECT_KINDS], [
      'FEATURE_FLAG',
      'POLICY_PACK',
      'STAGED_ACTIVATION',
      'COMPOSITE'
    ]);
  });
});

describe('Mission ER — Config Honesty Attestation Port (SPEC-0154)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('ER15: govern happy path ACTIVE + authorized matching claim -> PASS + ER-RCPT-* (≠ EO/EP/EQ/EM/EH ≠ tip-refresh)', async () => {
    const port = new ConfigHonestyAttestationPort();

    for (const kind of ER_SUBJECT_KINDS) {
      const attestation = makeMockAttestation({
        subjectKind: kind,
        observedClaim: { claimKind: kind, claimValue: 'hermetic' },
        authorized: true
      });
      const res = await port.govern({
        planId: `plan-er-pass-${kind.toLowerCase()}`,
        changeId: 'eos-ladder-37-mission-er',
        ritualMode: 'ACTIVE',
        attestation
      });
      assert.equal(res.ok, true, kind);
      assert.equal(res.decision, 'PASS', kind);
      assert.ok(res.receipt.receiptId.startsWith('ER-RCPT-'), kind);
    }

    const last = port.trail[port.trail.length - 1];
    assert.equal(last.fundacionDelta, 0);
    assert.equal(last.productionReady, 'NO');
    assert.equal(last.attestationHold.liveFlagStoreClaimRefused, true);
    assert.equal(last.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(last.attestationHold.softObserveAloneNotConfigTruth, true);
    assert.equal(last.attestationHold.distinctFromEoFeatureFlag, true);
    assert.equal(last.attestationHold.distinctFromEpPolicyPackBinding, true);
    assert.equal(last.attestationHold.distinctFromEqStagedActivation, true);
    assert.equal(last.attestationHold.distinctFromEmCapacityHonesty, true);
    assert.equal(last.attestationHold.distinctFromEhTemporalHonesty, true);
    assert.equal(last.freezeObserve.liveFlagStoreClaimRefused, true);
    assert.equal(last.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(last.freezeObserve.softObserveAloneNotConfigTruth, true);
    assert.equal(typeof last.attestationDigest, 'string');
    assert.equal(last.attestationDigest.length, 64);
    assert.equal(port.trail.length, 4);
    assert.equal(ER_PORT_KIND, 'eos-config-honesty-attestation-port');
  });

  it('ER16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ConfigHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-er-hold',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('ER17: verifyTrail + ATTESTATION_UNAUTHORIZED deny + live-flag-store deny + auto-seal refuse', async () => {
    const port = new ConfigHonestyAttestationPort();

    await port.govern({
      planId: 'plan-er-trail-01',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-er-trail-02',
      changeId: 'eos-ladder-37-mission-er',
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

    const unauthPort = new ConfigHonestyAttestationPort();
    const unauthRes = await unauthPort.govern({
      planId: 'plan-er-unauth-deny',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, ER_CODES.ATTESTATION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('ER-RCPT-'));
    assert.equal(unauthRes.receipt.attestation.status, 'ATTESTATION_UNAUTHORIZED');

    const lieDeny = await unauthPort.govern({
      planId: 'plan-er-lie-deny',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live flag store authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lieDeny.ok, false);
    assert.equal(lieDeny.decision, 'DENY');
    assert.equal(lieDeny.code, ER_CODES.LIVE_FLAG_STORE_HONESTY_LIE);

    const autoSealRes = await unauthPort.govern({
      planId: 'plan-er-autoseal',
      changeId: 'eos-ladder-37-mission-er',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, ER_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
