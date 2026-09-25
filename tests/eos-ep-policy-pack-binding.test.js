/**
 * Mission EP — Policy-Pack Binding & Evaluation Port Test Suite.
 * SPEC-0152 / ADR-0132.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 75131386 (do NOT rewrite tip pins)
 * - PASS = sealed policy-pack binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live remote policy engine ≠ wall-clock authority ≠ EO flag port ≠ FDIR axis
 * - NEVER reopen L30–L36; refuse L37 auto-close (EQ–ES pending)
 * - Hermetic injected observedBinding only
 * - Distinct from EJ/EK/EL/EM and EH
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EP_PRODUCTION_READY,
  EP_RECEIPT_PRODUCTION_READY,
  EP_RECEIPT_KIND,
  EP_FREEZE_PIN_SHORT,
  EP_OPERATION,
  buildPolicyPackBindingReceipt,
  verifyPolicyPackBindingReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/policy-pack-binding-receipt.js';

import {
  PolicyPackBindingPolicyGate,
  EP_CODES,
  EP_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsRemotePolicyEngine,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/policy-pack-binding-policy-gate.js';

import {
  PolicyPackBindingPort,
  EP_PORT_PRODUCTION_READY,
  EP_PORT_KIND
} from '../src/core/composition/policy-pack-binding-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    packId: 'eos.policy.demo-pack',
    bindingClass: 'policy-pack',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

describe('Mission EP — Policy-Pack Binding Receipt (SPEC-0152)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EP1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 75131386', () => {
    assert.equal(EP_PRODUCTION_READY, 'NO');
    assert.equal(EP_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EP_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EP_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EP_FREEZE_PIN_SHORT, '75131386');
  });

  it('EP2: builds canonical nine-field sealed EP-RCPT-* with freeze soft-observe + ceiling hold + binding hold', () => {
    const receipt = buildPolicyPackBindingReceipt({
      planId: 'plan-ep-01',
      changeId: 'eos-ladder-37-mission-ep',
      decision: 'PASS',
      binding: makeMockBinding()
    });

    assert.equal(receipt.kind, EP_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EP-RCPT-'));
    assert.equal(receipt.operation, EP_OPERATION);
    assert.equal(receipt.operation, 'POLICY_PACK_BINDING_EVALUATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '75131386');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l36ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.remotePolicyEngineRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.packHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.packHold.failClosed, true);
    assert.equal(receipt.packHold.remotePolicyEngineRefused, true);
    assert.equal(receipt.packHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.packHold.distinctFromEoFeatureFlag, true);
    assert.equal(receipt.packHold.distinctFromDxCircuitBreaker, true);
    assert.equal(receipt.packHold.distinctFromEjAdmission, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.bindingDigest, 'string');
    assert.equal(receipt.bindingDigest.length, 64);
  });

  it('EP3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildPolicyPackBindingReceipt({
      planId: 'plan-ep-tamper',
      changeId: 'eos-ladder-37-mission-ep',
      decision: 'PASS'
    });

    assert.equal(verifyPolicyPackBindingReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyPolicyPackBindingReceipt(tampered).ok, false);
  });
});

describe('Mission EP — Policy-Pack Binding Policy Gate (SPEC-0152)', () => {
  it('EP4: validates well-formed plan (planId+changeId+ACTIVE+binding packId/bindingClass/desiredBinding/authorized)', () => {
    const gate = new PolicyPackBindingPolicyGate();
    const binding = makeMockBinding();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ep-valid',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EP_CODES.OK);
  });

  it('EP5: rejects missing binding or invalid binding', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ep-notoggle',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EP_CODES.MISSING_BINDING);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ep-invalidtoggle',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EP_CODES.INVALID_BINDING);
  });

  it('EP6: rejects missing packId / bindingClass / desiredBinding', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const resKey = gate.evaluatePreconditions({
      planId: 'plan-ep-nokey',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ packId: '' })
    });
    assert.equal(resKey.ok, false);
    assert.equal(resKey.code, EP_CODES.MISSING_PACK_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ep-noclass',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ bindingClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EP_CODES.MISSING_BINDING_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-ep-nodesired',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EP_CODES.MISSING_DESIRED_BINDING);
  });

  it('EP7: DENY invalid desiredBinding/observedBinding + remote policy engine claims', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-ep-baddesired',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EP_CODES.INVALID_DESIRED_BINDING);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-ep-badobserved',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ observedBinding: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EP_CODES.INVALID_OBSERVED_BINDING);

    const remote = gate.evaluatePreconditions({
      planId: 'plan-ep-remotesdk',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      remotePolicyEngine: true,
      binding: makeMockBinding()
    });
    assert.equal(remote.ok, false);
    assert.equal(remote.decision, 'DENY');
    assert.equal(remote.code, EP_CODES.REMOTE_POLICY_ENGINE_FORBIDDEN);
  });

  it('EP8: rejects remote policy engine / wall-clock authority / EO-feature-flag-as-pack / schema-json add', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const sdkClaim = gate.evaluatePreconditions({
      planId: 'plan-ep-sdkclaim',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live remote policy engine binding',
      binding: makeMockBinding()
    });
    assert.equal(sdkClaim.ok, false);
    assert.equal(sdkClaim.code, EP_CODES.REMOTE_POLICY_ENGINE_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-ep-rolloutclaim',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      binding: makeMockBinding()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EP_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const killClaim = gate.evaluatePreconditions({
      planId: 'plan-ep-killclaim',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'make feature-flag the pack port for policy packs',
      binding: makeMockBinding()
    });
    assert.equal(killClaim.ok, false);
    assert.equal(killClaim.code, EP_CODES.EO_FEATURE_FLAG_AS_PACK_FORBIDDEN);

    const fdirClaim = gate.evaluatePreconditions({
      planId: 'plan-ep-fdirclaim',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'elevate dx circuit breaker as axis',
      binding: makeMockBinding()
    });
    assert.equal(fdirClaim.ok, false);
    assert.equal(fdirClaim.code, EP_CODES.DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ep-schema',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-feature-flag-toggle.json',
      binding: makeMockBinding()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EP_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsRemotePolicyEngine('claiming live remote policy engine'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EP9: allows HOLD mode with zero mutations', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ep-hold',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EP_CODES.HOLD);
  });

  it('EP10: DENY (BINDING_UNAUTHORIZED / INVALID_BINDING_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ep-unauth',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EP_CODES.BINDING_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ep-mismatch',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'UNBOUND', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EP_CODES.INVALID_BINDING_CLAIM);
  });

  it('EP11: policy gate DENY on hard-delete markers (forceDelete/purge/hardDelete)', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ep-del1',
      changeId: 'eos-ladder-37-mission-ep',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EP_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ep-del2',
      changeId: 'eos-ladder-37-mission-ep',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EP_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EP12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new PolicyPackBindingPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ep-secret',
      changeId: 'eos-ladder-37-mission-ep',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EP_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EP13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ep-fundacion',
      changeId: 'eos-ladder-37-mission-ep',
      target: 'Documents/Fundacion/feature-flags'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EP_CODES.FUNDACION_DENIED);
  });

  it('EP14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L36 reopen, L37 auto-close, mass prune, GHE', () => {
    const gate = new PolicyPackBindingPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ep-pr',
      changeId: 'eos-ladder-37-mission-ep',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EP_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l30',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EP_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l31',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EP_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l32',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EP_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l33',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EP_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l34',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EP_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l35',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EP_CODES.L35_REOPEN_FORBIDDEN);

    const l36Res = gate.evaluatePreconditions({
      planId: 'plan-ep-l36',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'reopen ladder-36'
    });
    assert.equal(l36Res.ok, false);
    assert.equal(l36Res.code, EP_CODES.L36_REOPEN_FORBIDDEN);

    const l37CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ep-l37-close',
      changeId: 'eos-ladder-37-mission-ep',
      instruction: 'auto-close ladder-37 now'
    });
    assert.equal(l37CloseRes.ok, false);
    assert.equal(l37CloseRes.code, EP_CODES.L37_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ep-tip',
      changeId: 'eos-ladder-37-mission-ep',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EP_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ep-mass',
      changeId: 'eos-ladder-37-mission-ep',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EP_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ep-ghe',
      changeId: 'eos-ladder-37-mission-ep',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EP_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EP — Policy-Pack Binding Port (SPEC-0152)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EP15: govern happy path ACTIVE + authorized matching binding -> PASS + EP-RCPT-* (≠ EO flag ≠ tip-refresh)', async () => {
    const port = new PolicyPackBindingPort();
    const binding = makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'BOUND', authorized: true });

    const res = await port.govern({
      planId: 'plan-ep-pass',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EP-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.binding.evaluated, true);
    assert.equal(res.receipt.binding.status, 'EVALUATED');
    assert.equal(res.receipt.packHold.remotePolicyEngineRefused, true);
    assert.equal(res.receipt.packHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.packHold.distinctFromEoFeatureFlag, true);
    assert.equal(res.receipt.freezeObserve.remotePolicyEngineRefused, true);
    assert.equal(res.receipt.freezeObserve.l37AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '75131386');
    assert.equal(typeof res.receipt.bindingDigest, 'string');
    assert.equal(res.receipt.bindingDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EP_PORT_KIND, 'eos-policy-pack-binding-port');
  });

  it('EP16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new PolicyPackBindingPort();

    const res = await port.govern({
      planId: 'plan-ep-hold',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EP17: verifyTrail + BINDING_UNAUTHORIZED deny + remote-sdk deny + auto-seal refuse', async () => {
    const port = new PolicyPackBindingPort();

    await port.govern({
      planId: 'plan-ep-trail-01',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding()
    });

    await port.govern({
      planId: 'plan-ep-trail-02',
      changeId: 'eos-ladder-37-mission-ep',
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

    const denyPort = new PolicyPackBindingPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ep-unauth-deny',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EP_CODES.BINDING_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EP-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.binding.status, 'BINDING_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.packHold.failClosed, true);

    const remoteDeny = await denyPort.govern({
      planId: 'plan-ep-remote-deny',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      instruction: 'bind remote policy engine with live remote policy engine',
      binding: makeMockBinding()
    });
    assert.equal(remoteDeny.ok, false);
    assert.equal(remoteDeny.decision, 'DENY');
    assert.equal(remoteDeny.code, EP_CODES.REMOTE_POLICY_ENGINE_FORBIDDEN);
    assert.ok(remoteDeny.receipt.receiptId.startsWith('EP-RCPT-'));

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ep-autoseal',
      changeId: 'eos-ladder-37-mission-ep',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      binding: makeMockBinding()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EP_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
