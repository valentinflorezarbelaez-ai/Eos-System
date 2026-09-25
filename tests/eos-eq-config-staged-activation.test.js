/**
 * Mission EQ — Config Change / Staged Activation Governance Port Test Suite.
 * SPEC-0153 / ADR-0133.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 748000c3 (do NOT rewrite tip pins)
 * - PASS = sealed staged-activation ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live unsupervised mutation ≠ wall-clock authority ≠ remote config push
 *   ≠ EO flag port ≠ EP pack port ≠ FDIR axis
 * - NEVER reopen L30–L36; refuse L37 auto-close (ER–ES pending)
 * - Hermetic injected observedActivation only
 * - Distinct from EO/EP/EJ/EK/EG/EH
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EQ_PRODUCTION_READY,
  EQ_RECEIPT_PRODUCTION_READY,
  EQ_RECEIPT_KIND,
  EQ_FREEZE_PIN_SHORT,
  EQ_OPERATION,
  buildConfigStagedActivationReceipt,
  verifyConfigStagedActivationReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/config-staged-activation-receipt.js';

import {
  ConfigStagedActivationPolicyGate,
  EQ_CODES,
  EQ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsRemoteConfigPush,
  claimsWallClockAuthority,
  claimsLiveUnsupervisedMutation,
  isFundacionTarget
} from '../src/core/composition/config-staged-activation-policy-gate.js';

import {
  ConfigStagedActivationPort,
  EQ_PORT_PRODUCTION_READY,
  EQ_PORT_KIND
} from '../src/core/composition/config-staged-activation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockActivation(overrides = {}) {
  return {
    configKey: 'eos.config.demo-flag',
    activationClass: 'staged-activation',
    desiredStage: 'STAGED',
    observedActivation: 'STAGED',
    authorized: true,
    ...overrides
  };
}

describe('Mission EQ — Config Staged Activation Receipt (SPEC-0153)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EQ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 748000c3', () => {
    assert.equal(EQ_PRODUCTION_READY, 'NO');
    assert.equal(EQ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EQ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EQ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EQ_FREEZE_PIN_SHORT, '748000c3');
  });

  it('EQ2: builds canonical nine-field sealed EQ-RCPT-* with freeze soft-observe + ceiling hold + activation hold', () => {
    const receipt = buildConfigStagedActivationReceipt({
      planId: 'plan-eq-01',
      changeId: 'eos-ladder-37-mission-eq',
      decision: 'PASS',
      activation: makeMockActivation()
    });

    assert.equal(receipt.kind, EQ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EQ-RCPT-'));
    assert.equal(receipt.operation, EQ_OPERATION);
    assert.equal(receipt.operation, 'CONFIG_STAGED_ACTIVATION_GOVERNANCE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '748000c3');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l36ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.remoteConfigPushRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.liveUnsupervisedMutationRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.activationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.activationHold.failClosed, true);
    assert.equal(receipt.activationHold.remoteConfigPushRefused, true);
    assert.equal(receipt.activationHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.activationHold.distinctFromEoFeatureFlag, true);
    assert.equal(receipt.activationHold.distinctFromEpPolicyPackBinding, true);
    assert.equal(receipt.activationHold.distinctFromDxCircuitBreaker, true);
    assert.equal(receipt.activationHold.distinctFromEjAdmission, true);
    assert.equal(receipt.activationHold.distinctFromEkBackpressure, true);
    assert.equal(receipt.activationHold.distinctFromEgScheduleWake, true);
    assert.equal(receipt.activationHold.distinctFromEhTemporalHonesty, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.activationDigest, 'string');
    assert.equal(receipt.activationDigest.length, 64);
  });

  it('EQ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildConfigStagedActivationReceipt({
      planId: 'plan-eq-tamper',
      changeId: 'eos-ladder-37-mission-eq',
      decision: 'PASS'
    });

    assert.equal(verifyConfigStagedActivationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyConfigStagedActivationReceipt(tampered).ok, false);
  });
});

describe('Mission EQ — Config Staged Activation Policy Gate (SPEC-0153)', () => {
  it('EQ4: validates well-formed plan (planId+changeId+ACTIVE+activation configKey/activationClass/desiredStage/authorized)', () => {
    const gate = new ConfigStagedActivationPolicyGate();
    const activation = makeMockActivation();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eq-valid',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      activation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EQ_CODES.OK);
  });

  it('EQ5: rejects missing activation or invalid activation', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eq-noact',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EQ_CODES.MISSING_ACTIVATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eq-invalidact',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EQ_CODES.INVALID_ACTIVATION);
  });

  it('EQ6: rejects missing configKey / activationClass / desiredStage', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const resKey = gate.evaluatePreconditions({
      planId: 'plan-eq-nokey',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ configKey: '' })
    });
    assert.equal(resKey.ok, false);
    assert.equal(resKey.code, EQ_CODES.MISSING_CONFIG_KEY);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-eq-noclass',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ activationClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EQ_CODES.MISSING_ACTIVATION_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-eq-nodesired',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ desiredStage: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EQ_CODES.MISSING_DESIRED_STAGE);
  });

  it('EQ7: DENY invalid desiredStage/observedActivation + remote config push claims', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-eq-baddesired',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ desiredStage: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EQ_CODES.INVALID_DESIRED_STAGE);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-eq-badobserved',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ observedActivation: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EQ_CODES.INVALID_OBSERVED_ACTIVATION);

    const remote = gate.evaluatePreconditions({
      planId: 'plan-eq-remotepush',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      remoteConfigPush: true,
      activation: makeMockActivation()
    });
    assert.equal(remote.ok, false);
    assert.equal(remote.decision, 'DENY');
    assert.equal(remote.code, EQ_CODES.REMOTE_CONFIG_PUSH_FORBIDDEN);
  });

  it('EQ8: rejects remote config push / wall-clock / live mutation / tip-refresh / EO-as-activation / EP-as-activation / FDIR / schema-json', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const pushClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-pushclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live remote config push',
      activation: makeMockActivation()
    });
    assert.equal(pushClaim.ok, false);
    assert.equal(pushClaim.code, EQ_CODES.REMOTE_CONFIG_PUSH_FORBIDDEN);

    const wallClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-wallclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      activation: makeMockActivation()
    });
    assert.equal(wallClaim.ok, false);
    assert.equal(wallClaim.code, EQ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const liveClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-liveclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live unsupervised mutation',
      activation: makeMockActivation()
    });
    assert.equal(liveClaim.ok, false);
    assert.equal(liveClaim.code, EQ_CODES.LIVE_UNSUPERVISED_MUTATION_FORBIDDEN);

    const tipAuthClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-tipauth',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      activation: makeMockActivation()
    });
    assert.equal(tipAuthClaim.ok, false);
    assert.equal(tipAuthClaim.code, EQ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-eoclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'make feature-flag the activation port for staged activation',
      activation: makeMockActivation()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, EQ_CODES.EO_FEATURE_FLAG_AS_ACTIVATION_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-epclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'make policy-pack the activation port for staged activation',
      activation: makeMockActivation()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, EQ_CODES.EP_POLICY_PACK_AS_ACTIVATION_FORBIDDEN);

    const fdirClaim = gate.evaluatePreconditions({
      planId: 'plan-eq-fdirclaim',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'elevate dx circuit breaker as axis',
      activation: makeMockActivation()
    });
    assert.equal(fdirClaim.ok, false);
    assert.equal(fdirClaim.code, EQ_CODES.DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eq-schema',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-staged-activation.json',
      activation: makeMockActivation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EQ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsRemoteConfigPush('claiming live remote config push'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsLiveUnsupervisedMutation('claiming live unsupervised mutation'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EQ9: allows HOLD mode with zero mutations', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eq-hold',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EQ_CODES.HOLD);
  });

  it('EQ10: DENY (ACTIVATION_UNAUTHORIZED / INVALID_ACTIVATION_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-eq-unauth',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EQ_CODES.ACTIVATION_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-eq-mismatch',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({
        desiredStage: 'CANARY',
        observedActivation: 'FULL',
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EQ_CODES.INVALID_ACTIVATION_CLAIM);
  });

  it('EQ11: policy gate DENY on hard-delete markers (forceDelete/purge/hardDelete)', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-eq-del1',
      changeId: 'eos-ladder-37-mission-eq',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EQ_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-eq-del2',
      changeId: 'eos-ladder-37-mission-eq',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EQ_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EQ12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ConfigStagedActivationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eq-secret',
      changeId: 'eos-ladder-37-mission-eq',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EQ_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EQ13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eq-fundacion',
      changeId: 'eos-ladder-37-mission-eq',
      target: 'Documents/Fundacion/staged-activation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EQ_CODES.FUNDACION_DENIED);

    const receipt = buildConfigStagedActivationReceipt({
      planId: 'plan-eq-delta',
      changeId: 'eos-ladder-37-mission-eq',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
  });

  it('EQ14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L36 reopen, L37 auto-close, mass prune, GHE', () => {
    const gate = new ConfigStagedActivationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eq-pr',
      changeId: 'eos-ladder-37-mission-eq',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EQ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l30',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EQ_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l31',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EQ_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l32',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EQ_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l33',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EQ_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l34',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EQ_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l35',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EQ_CODES.L35_REOPEN_FORBIDDEN);

    const l36Res = gate.evaluatePreconditions({
      planId: 'plan-eq-l36',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'reopen ladder-36'
    });
    assert.equal(l36Res.ok, false);
    assert.equal(l36Res.code, EQ_CODES.L36_REOPEN_FORBIDDEN);

    const l37CloseRes = gate.evaluatePreconditions({
      planId: 'plan-eq-l37-close',
      changeId: 'eos-ladder-37-mission-eq',
      instruction: 'auto-close ladder-37 now'
    });
    assert.equal(l37CloseRes.ok, false);
    assert.equal(l37CloseRes.code, EQ_CODES.L37_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eq-tip',
      changeId: 'eos-ladder-37-mission-eq',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EQ_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eq-mass',
      changeId: 'eos-ladder-37-mission-eq',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EQ_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eq-ghe',
      changeId: 'eos-ladder-37-mission-eq',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EQ_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EQ — Config Staged Activation Port (SPEC-0153)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EQ15: govern happy path ACTIVE + authorized matching stage -> PASS + EQ-RCPT-* (≠ EO/EP ≠ tip-refresh)', async () => {
    const port = new ConfigStagedActivationPort();
    const activation = makeMockActivation({
      desiredStage: 'CANARY',
      observedActivation: 'CANARY',
      authorized: true
    });

    const res = await port.govern({
      planId: 'plan-eq-pass',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EQ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.activation.evaluated, true);
    assert.equal(res.receipt.activation.status, 'EVALUATED');
    assert.equal(res.receipt.activationHold.remoteConfigPushRefused, true);
    assert.equal(res.receipt.activationHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.activationHold.distinctFromEoFeatureFlag, true);
    assert.equal(res.receipt.activationHold.distinctFromEpPolicyPackBinding, true);
    assert.equal(res.receipt.freezeObserve.remoteConfigPushRefused, true);
    assert.equal(res.receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '748000c3');
    assert.equal(typeof res.receipt.activationDigest, 'string');
    assert.equal(res.receipt.activationDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EQ_PORT_KIND, 'eos-config-staged-activation-port');
  });

  it('EQ16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ConfigStagedActivationPort();

    const res = await port.govern({
      planId: 'plan-eq-hold',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EQ17: verifyTrail + ACTIVATION_UNAUTHORIZED deny + remote-push deny + auto-seal refuse', async () => {
    const port = new ConfigStagedActivationPort();

    await port.govern({
      planId: 'plan-eq-trail-01',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ desiredStage: 'FULL', observedActivation: 'FULL' })
    });

    await port.govern({
      planId: 'plan-eq-trail-02',
      changeId: 'eos-ladder-37-mission-eq',
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

    const denyPort = new ConfigStagedActivationPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-eq-unauth-deny',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      activation: makeMockActivation({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EQ_CODES.ACTIVATION_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EQ-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.activation.status, 'ACTIVATION_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.activationHold.failClosed, true);

    const remoteDeny = await denyPort.govern({
      planId: 'plan-eq-remote-deny',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      instruction: 'bind remote config push with live remote config push',
      activation: makeMockActivation()
    });
    assert.equal(remoteDeny.ok, false);
    assert.equal(remoteDeny.decision, 'DENY');
    assert.equal(remoteDeny.code, EQ_CODES.REMOTE_CONFIG_PUSH_FORBIDDEN);
    assert.ok(remoteDeny.receipt.receiptId.startsWith('EQ-RCPT-'));

    const autoSealRes = await denyPort.govern({
      planId: 'plan-eq-autoseal',
      changeId: 'eos-ladder-37-mission-eq',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      activation: makeMockActivation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EQ_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
