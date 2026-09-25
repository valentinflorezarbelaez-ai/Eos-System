/**
 * Mission EO — Feature-Flag & Runtime Toggle Governance Port Test Suite.
 * SPEC-0151 / ADR-0131.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin f333afaf (do NOT rewrite tip pins)
 * - PASS = sealed feature-flag/toggle ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live remote config SDK ≠ wall-clock rollout authority ≠ killswitch port ≠ FDIR axis
 * - NEVER reopen L30–L36; refuse L37 auto-close (EP–ES pending)
 * - Hermetic injected observedState only
 * - Distinct from EJ/EK/EL/EM and EH
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EO_PRODUCTION_READY,
  EO_RECEIPT_PRODUCTION_READY,
  EO_RECEIPT_KIND,
  EO_FREEZE_PIN_SHORT,
  EO_OPERATION,
  buildFeatureFlagRuntimeToggleReceipt,
  verifyFeatureFlagRuntimeToggleReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/feature-flag-runtime-toggle-receipt.js';

import {
  FeatureFlagRuntimeTogglePolicyGate,
  EO_CODES,
  EO_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsRemoteConfigSdk,
  claimsWallClockRolloutAuthority,
  isFundacionTarget
} from '../src/core/composition/feature-flag-runtime-toggle-policy-gate.js';

import {
  FeatureFlagRuntimeTogglePort,
  EO_PORT_PRODUCTION_READY,
  EO_PORT_KIND
} from '../src/core/composition/feature-flag-runtime-toggle-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockToggle(overrides = {}) {
  return {
    flagKey: 'eos.feature.demo-toggle',
    toggleClass: 'runtime-feature',
    desiredState: 'ON',
    observedState: 'ON',
    authorized: true,
    ...overrides
  };
}

describe('Mission EO — Feature-Flag Runtime Toggle Receipt (SPEC-0151)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EO1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin f333afaf', () => {
    assert.equal(EO_PRODUCTION_READY, 'NO');
    assert.equal(EO_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EO_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EO_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EO_FREEZE_PIN_SHORT, 'f333afaf');
  });

  it('EO2: builds canonical nine-field sealed EO-RCPT-* with freeze soft-observe + ceiling hold + toggle hold', () => {
    const receipt = buildFeatureFlagRuntimeToggleReceipt({
      planId: 'plan-eo-01',
      changeId: 'eos-ladder-37-mission-eo',
      decision: 'PASS',
      toggle: makeMockToggle()
    });

    assert.equal(receipt.kind, EO_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EO-RCPT-'));
    assert.equal(receipt.operation, EO_OPERATION);
    assert.equal(receipt.operation, 'FEATURE_FLAG_RUNTIME_TOGGLE_GOVERNANCE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'f333afaf');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l36ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.remoteConfigSdkRefused, true);
    assert.equal(receipt.freezeObserve.wallClockRolloutAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.toggleHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.toggleHold.failClosed, true);
    assert.equal(receipt.toggleHold.remoteConfigSdkRefused, true);
    assert.equal(receipt.toggleHold.wallClockRolloutAuthorityRefused, true);
    assert.equal(receipt.toggleHold.distinctFromSentinelKillswitch, true);
    assert.equal(receipt.toggleHold.distinctFromFdirTrip, true);
    assert.equal(receipt.toggleHold.distinctFromEjAdmission, true);
    assert.equal(receipt.toggleHold.distinctFromEhTemporalHonesty, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.toggleDigest, 'string');
    assert.equal(receipt.toggleDigest.length, 64);
  });

  it('EO3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildFeatureFlagRuntimeToggleReceipt({
      planId: 'plan-eo-tamper',
      changeId: 'eos-ladder-37-mission-eo',
      decision: 'PASS'
    });

    assert.equal(verifyFeatureFlagRuntimeToggleReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyFeatureFlagRuntimeToggleReceipt(tampered).ok, false);
  });
});

describe('Mission EO — Feature-Flag Runtime Toggle Policy Gate (SPEC-0151)', () => {
  it('EO4: validates well-formed plan (planId+changeId+ACTIVE+toggle flagKey/toggleClass/desiredState/authorized)', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();
    const toggle = makeMockToggle();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eo-valid',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      toggle
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EO_CODES.OK);
  });

  it('EO5: rejects missing toggle or invalid toggle', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eo-notoggle',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EO_CODES.MISSING_TOGGLE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eo-invalidtoggle',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EO_CODES.INVALID_TOGGLE);
  });

  it('EO6: rejects missing flagKey / toggleClass / desiredState', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const resKey = gate.evaluatePreconditions({
      planId: 'plan-eo-nokey',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ flagKey: '' })
    });
    assert.equal(resKey.ok, false);
    assert.equal(resKey.code, EO_CODES.MISSING_FLAG_KEY);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-eo-noclass',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ toggleClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EO_CODES.MISSING_TOGGLE_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-eo-nodesired',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ desiredState: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EO_CODES.MISSING_DESIRED_STATE);
  });

  it('EO7: DENY invalid desiredState/observedState + remote config SDK claims', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-eo-baddesired',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ desiredState: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EO_CODES.INVALID_DESIRED_STATE);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-eo-badobserved',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ observedState: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EO_CODES.INVALID_OBSERVED_STATE);

    const remote = gate.evaluatePreconditions({
      planId: 'plan-eo-remotesdk',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      remoteConfigSdk: true,
      toggle: makeMockToggle()
    });
    assert.equal(remote.ok, false);
    assert.equal(remote.decision, 'DENY');
    assert.equal(remote.code, EO_CODES.REMOTE_CONFIG_SDK_FORBIDDEN);
  });

  it('EO8: rejects remote config SDK / wall-clock rollout / killswitch-as-port / schema-json add', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const sdkClaim = gate.evaluatePreconditions({
      planId: 'plan-eo-sdkclaim',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live remote config sdk binding',
      toggle: makeMockToggle()
    });
    assert.equal(sdkClaim.ok, false);
    assert.equal(sdkClaim.code, EO_CODES.REMOTE_CONFIG_SDK_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-eo-rolloutclaim',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock rollout authority',
      toggle: makeMockToggle()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EO_CODES.WALL_CLOCK_ROLLOUT_AUTHORITY_FORBIDDEN);

    const killClaim = gate.evaluatePreconditions({
      planId: 'plan-eo-killclaim',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'make killswitch the port for feature flags',
      toggle: makeMockToggle()
    });
    assert.equal(killClaim.ok, false);
    assert.equal(killClaim.code, EO_CODES.KILLSWITCH_AS_PORT_FORBIDDEN);

    const fdirClaim = gate.evaluatePreconditions({
      planId: 'plan-eo-fdirclaim',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'elevate fdir trip as axis',
      toggle: makeMockToggle()
    });
    assert.equal(fdirClaim.ok, false);
    assert.equal(fdirClaim.code, EO_CODES.FDIR_TRIP_AS_AXIS_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eo-schema',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-feature-flag-toggle.json',
      toggle: makeMockToggle()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EO_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsRemoteConfigSdk('claiming live remote config sdk'), true);
    assert.equal(claimsWallClockRolloutAuthority('claiming wall-clock rollout authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EO9: allows HOLD mode with zero mutations', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eo-hold',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EO_CODES.HOLD);
  });

  it('EO10: DENY (TOGGLE_UNAUTHORIZED / INVALID_TOGGLE_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-eo-unauth',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EO_CODES.TOGGLE_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-eo-mismatch',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ desiredState: 'ON', observedState: 'OFF', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EO_CODES.INVALID_TOGGLE_CLAIM);
  });

  it('EO11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-eo-del1',
      changeId: 'eos-ladder-37-mission-eo',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EO_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-eo-del2',
      changeId: 'eos-ladder-37-mission-eo',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EO_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EO12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eo-secret',
      changeId: 'eos-ladder-37-mission-eo',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EO_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EO13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eo-fundacion',
      changeId: 'eos-ladder-37-mission-eo',
      target: 'Documents/Fundacion/feature-flags'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EO_CODES.FUNDACION_DENIED);
  });

  it('EO14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L36 reopen, L37 auto-close, mass prune, GHE', () => {
    const gate = new FeatureFlagRuntimeTogglePolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eo-pr',
      changeId: 'eos-ladder-37-mission-eo',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EO_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l30',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EO_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l31',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EO_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l32',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EO_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l33',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EO_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l34',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EO_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l35',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EO_CODES.L35_REOPEN_FORBIDDEN);

    const l36Res = gate.evaluatePreconditions({
      planId: 'plan-eo-l36',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'reopen ladder-36'
    });
    assert.equal(l36Res.ok, false);
    assert.equal(l36Res.code, EO_CODES.L36_REOPEN_FORBIDDEN);

    const l37CloseRes = gate.evaluatePreconditions({
      planId: 'plan-eo-l37-close',
      changeId: 'eos-ladder-37-mission-eo',
      instruction: 'auto-close ladder-37 now'
    });
    assert.equal(l37CloseRes.ok, false);
    assert.equal(l37CloseRes.code, EO_CODES.L37_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eo-tip',
      changeId: 'eos-ladder-37-mission-eo',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EO_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eo-mass',
      changeId: 'eos-ladder-37-mission-eo',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EO_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eo-ghe',
      changeId: 'eos-ladder-37-mission-eo',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EO_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EO — Feature-Flag Runtime Toggle Port (SPEC-0151)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EO15: govern happy path ACTIVE + authorized matching toggle -> PASS + EO-RCPT-* (≠ killswitch ≠ tip-refresh)', async () => {
    const port = new FeatureFlagRuntimeTogglePort();
    const toggle = makeMockToggle({ desiredState: 'ON', observedState: 'ON', authorized: true });

    const res = await port.govern({
      planId: 'plan-eo-pass',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EO-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.toggle.evaluated, true);
    assert.equal(res.receipt.toggle.status, 'EVALUATED');
    assert.equal(res.receipt.toggleHold.remoteConfigSdkRefused, true);
    assert.equal(res.receipt.toggleHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.toggleHold.distinctFromSentinelKillswitch, true);
    assert.equal(res.receipt.toggleHold.distinctFromFdirTrip, true);
    assert.equal(res.receipt.freezeObserve.remoteConfigSdkRefused, true);
    assert.equal(res.receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'f333afaf');
    assert.equal(typeof res.receipt.toggleDigest, 'string');
    assert.equal(res.receipt.toggleDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EO_PORT_KIND, 'eos-feature-flag-runtime-toggle-port');
  });

  it('EO16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new FeatureFlagRuntimeTogglePort();

    const res = await port.govern({
      planId: 'plan-eo-hold',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EO17: verifyTrail + TOGGLE_UNAUTHORIZED deny + remote-sdk deny + auto-seal refuse', async () => {
    const port = new FeatureFlagRuntimeTogglePort();

    await port.govern({
      planId: 'plan-eo-trail-01',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle()
    });

    await port.govern({
      planId: 'plan-eo-trail-02',
      changeId: 'eos-ladder-37-mission-eo',
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

    const denyPort = new FeatureFlagRuntimeTogglePort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-eo-unauth-deny',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      toggle: makeMockToggle({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EO_CODES.TOGGLE_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EO-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.toggle.status, 'TOGGLE_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.toggleHold.failClosed, true);

    const remoteDeny = await denyPort.govern({
      planId: 'plan-eo-remote-deny',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      instruction: 'bind remote config sdk with live remote config sdk',
      toggle: makeMockToggle()
    });
    assert.equal(remoteDeny.ok, false);
    assert.equal(remoteDeny.decision, 'DENY');
    assert.equal(remoteDeny.code, EO_CODES.REMOTE_CONFIG_SDK_FORBIDDEN);
    assert.ok(remoteDeny.receipt.receiptId.startsWith('EO-RCPT-'));

    const autoSealRes = await denyPort.govern({
      planId: 'plan-eo-autoseal',
      changeId: 'eos-ladder-37-mission-eo',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      toggle: makeMockToggle()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EO_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
