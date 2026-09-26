/**
 * Mission FA — Ingress Quarantine / Replay-Deny Governance Port Test Suite.
 * SPEC-0163 / ADR-0145.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 3cbb32dc (do NOT rewrite tip pins)
 * - PASS = sealed ingress quarantine/replay-deny ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live ingress mutation ≠ wall-clock authority ≠ EY/EZ/EB/L36/FB
 * - NEVER reopen L30–L38; refuse L39 auto-close (FB–FC pending)
 * - Hermetic injected observedStage only
 * - Distinct from EY/EZ/EB/L36/EU/EV and FB (next)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FA_PRODUCTION_READY,
  FA_RECEIPT_PRODUCTION_READY,
  FA_RECEIPT_KIND,
  FA_FREEZE_PIN_SHORT,
  FA_FREEZE_PIN,
  FA_OPERATION,
  FA_STAGE_STATES,
  buildIngressQuarantineReplayDenyReceipt,
  verifyIngressQuarantineReplayDenyReceipt,
  canonicalIngressQuarantineReplayDenySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/ingress-quarantine-replay-deny-receipt.js';

import {
  IngressQuarantineReplayDenyPolicyGate,
  FA_CODES,
  FA_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveIngressMutation,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/ingress-quarantine-replay-deny-policy-gate.js';

import {
  IngressQuarantineReplayDenyPort,
  FA_PORT_PRODUCTION_READY,
  FA_PORT_KIND
} from '../src/core/composition/ingress-quarantine-replay-deny-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockQuarantine(overrides = {}) {
  return {
    ingressId: 'ing-opaque-fa-demo-001',
    sourceId: 'src-opaque-fa-demo-001',
    authenticityRef: 'auth-opaque-ez-demo-001',
    quarantineClass: 'ingress-quarantine',
    desiredStage: 'QUARANTINE',
    observedStage: 'QUARANTINE',
    authorized: true,
    ...overrides
  };
}

describe('Mission FA — Ingress Quarantine Replay-Deny Receipt (SPEC-0163)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FA1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 3cbb32dc', () => {
    assert.equal(FA_PRODUCTION_READY, 'NO');
    assert.equal(FA_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FA_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FA_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FA_FREEZE_PIN_SHORT, '3cbb32dc');
    assert.equal(FA_FREEZE_PIN, '3cbb32dcddac5f233038d95f0f9b4c7218f379c2');
    assert.deepEqual([...FA_STAGE_STATES], [
      'QUARANTINE',
      'HOLD',
      'REPLAY_DENY',
      'RELEASE_HOLD',
      'ADMIT'
    ]);
  });

  it('FA2: builds canonical nine-field sealed FA-RCPT-* with freeze soft-observe + ceiling + quarantineHold + quarantineDigest + replayDenyDigest', () => {
    const receipt = buildIngressQuarantineReplayDenyReceipt({
      planId: 'plan-fa-01',
      changeId: 'eos-ladder-39-mission-fa',
      decision: 'PASS',
      quarantine: makeMockQuarantine()
    });

    assert.equal(receipt.kind, FA_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FA-RCPT-'));
    assert.equal(receipt.operation, FA_OPERATION);
    assert.equal(receipt.operation, 'INGRESS_QUARANTINE_REPLAY_DENY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '3cbb32dc');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveIngressMutationRefused, true);
    assert.equal(receipt.freezeObserve.liveWebhookIngressEndpointRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawWebhookSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.rawPayloadMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.quarantineHold.failClosed, true);
    assert.equal(receipt.quarantineHold.webhookSecretMaterialRefused, true);
    assert.equal(receipt.quarantineHold.quarantineSecretZeroHeld, true);
    assert.equal(receipt.quarantineHold.liveIngressMutationRefused, true);
    assert.equal(receipt.quarantineHold.distinctFromEyIngressRegistry, true);
    assert.equal(receipt.quarantineHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(receipt.quarantineHold.distinctFromEbDeadLetterQuarantine, true);
    assert.equal(receipt.quarantineHold.distinctFromL36AdmissionBackpressure, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.quarantineDigest, 'string');
    assert.equal(receipt.quarantineDigest.length, 64);
    assert.equal(typeof receipt.replayDenyDigest, 'string');
    assert.equal(receipt.replayDenyDigest.length, 64);

    const seal = canonicalIngressQuarantineReplayDenySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'quarantineDigest',
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

  it('FA3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildIngressQuarantineReplayDenyReceipt({
      planId: 'plan-fa-tamper',
      changeId: 'eos-ladder-39-mission-fa',
      decision: 'PASS'
    });

    assert.equal(verifyIngressQuarantineReplayDenyReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyIngressQuarantineReplayDenyReceipt(tampered).ok, false);
  });
});

describe('Mission FA — Ingress Quarantine Replay-Deny Policy Gate (SPEC-0163)', () => {
  it('FA4: validates well-formed plan (planId+changeId+ACTIVE+quarantine ingressId/sourceId/quarantineClass/desiredStage/authorized)', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();
    const quarantine = makeMockQuarantine();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fa-valid',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FA_CODES.OK);
  });

  it('FA5: rejects missing quarantine or invalid quarantine object', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fa-noquarantine',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FA_CODES.MISSING_QUARANTINE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fa-invalidquarantine',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FA_CODES.INVALID_QUARANTINE);
  });

  it('FA6: rejects missing ingressId / quarantineClass / desiredStage', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fa-noid',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ ingressId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FA_CODES.MISSING_INGRESS_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-fa-badsourceid',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ sourceId: '   ' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, FA_CODES.MISSING_SOURCE_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-fa-noclass',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ quarantineClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FA_CODES.MISSING_QUARANTINE_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-fa-nodesired',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FA_CODES.MISSING_DESIRED_STAGE);
  });

  it('FA7: DENY invalid desiredStage/observedStage + live ingress mutation claims', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-fa-baddesired',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FA_CODES.INVALID_DESIRED_STAGE);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-fa-badobserved',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ observedStage: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FA_CODES.INVALID_OBSERVED_STAGE);

    const live = gate.evaluatePreconditions({
      planId: 'plan-fa-livemutation',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      liveIngressMutation: true,
      quarantine: makeMockQuarantine()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FA_CODES.LIVE_INGRESS_MUTATION_FORBIDDEN);
  });

  it('FA8: rejects live ingress mutation / wall-clock / tip-refresh authority / EY-EZ-EB-L36-FB elevate / schema-json add', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const mutationClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-mutationclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live ingress mutation verify',
      quarantine: makeMockQuarantine()
    });
    assert.equal(mutationClaim.ok, false);
    assert.equal(mutationClaim.code, FA_CODES.LIVE_INGRESS_MUTATION_FORBIDDEN);

    const endpointClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-endpointclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live webhook ingress endpoint',
      quarantine: makeMockQuarantine()
    });
    assert.equal(endpointClaim.ok, false);
    assert.equal(endpointClaim.code, FA_CODES.LIVE_WEBHOOK_INGRESS_ENDPOINT_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-rolloutclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      quarantine: makeMockQuarantine()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FA_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fa-tipauth',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      quarantine: makeMockQuarantine()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FA_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eyClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-eyclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'make ey the quarantine port for ingress',
      quarantine: makeMockQuarantine()
    });
    assert.equal(eyClaim.ok, false);
    assert.equal(eyClaim.code, FA_CODES.EY_INGRESS_AS_QUARANTINE_FORBIDDEN);

    const ezClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-ezclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'make ez the quarantine port',
      quarantine: makeMockQuarantine()
    });
    assert.equal(ezClaim.ok, false);
    assert.equal(ezClaim.code, FA_CODES.EZ_AUTHENTICITY_AS_QUARANTINE_FORBIDDEN);

    const ebClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-ebclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'elevate dead-letter quarantine as ingress quarantine',
      quarantine: makeMockQuarantine()
    });
    assert.equal(ebClaim.ok, false);
    assert.equal(ebClaim.code, FA_CODES.EB_DEAD_LETTER_AS_QUARANTINE_FORBIDDEN);

    const l36Claim = gate.evaluatePreconditions({
      planId: 'plan-fa-l36claim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'elevate admission backpressure as quarantine',
      quarantine: makeMockQuarantine()
    });
    assert.equal(l36Claim.ok, false);
    assert.equal(l36Claim.code, FA_CODES.L36_ADMISSION_AS_QUARANTINE_FORBIDDEN);

    const fbClaim = gate.evaluatePreconditions({
      planId: 'plan-fa-fbclaim',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'make fb the quarantine port',
      quarantine: makeMockQuarantine()
    });
    assert.equal(fbClaim.ok, false);
    assert.equal(fbClaim.code, FA_CODES.FB_HONESTY_AS_QUARANTINE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fa-schema',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-ingress-quarantine.json',
      quarantine: makeMockQuarantine()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FA_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveIngressMutation('claiming live ingress mutation'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FA9: allows HOLD mode with zero mutations', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fa-hold',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FA_CODES.HOLD);
  });

  it('FA10: DENY (QUARANTINE_UNAUTHORIZED / INVALID_STAGE_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fa-unauth',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FA_CODES.QUARANTINE_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fa-mismatch',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({
        desiredStage: 'QUARANTINE',
        observedStage: 'ADMIT',
        authorized: true
      })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FA_CODES.INVALID_STAGE_CLAIM);
  });

  it('FA11: Law VI DENY when secret-looking fields present (password/token/apiKey/webhookSecret/hmacKey/rawPayload)', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { quarantine: makeMockQuarantine({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' },
      { rawPayload: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-fa-secretfield',
        changeId: 'eos-ladder-39-mission-fa',
        ritualMode: 'ACTIVE',
        quarantine: makeMockQuarantine(),
        ...extra
      };
      if (extra.quarantine) plan.quarantine = extra.quarantine;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FA_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ ingressId: 'ok', sourceId: 'ok' }), null);
  });

  it('FA12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fa-secret',
      changeId: 'eos-ladder-39-mission-fa',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FA_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fa-del',
      changeId: 'eos-ladder-39-mission-fa',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FA_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FA13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fa-fundacion',
      changeId: 'eos-ladder-39-mission-fa',
      target: 'Documents/Fundacion/ingress-quarantine'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FA_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildIngressQuarantineReplayDenyReceipt({
      planId: 'plan-fa-delta0',
      changeId: 'eos-ladder-39-mission-fa',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FA14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L38 reopen, L39 auto-close, mass prune, GHE', () => {
    const gate = new IngressQuarantineReplayDenyPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fa-pr',
      changeId: 'eos-ladder-39-mission-fa',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FA_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FA_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FA_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FA_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FA_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FA_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FA_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FA_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FA_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FA_CODES.L38_REOPEN_FORBIDDEN],
      ['auto-close ladder-39 now', FA_CODES.L39_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fa-ladder',
        changeId: 'eos-ladder-39-mission-fa',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fa-tip',
      changeId: 'eos-ladder-39-mission-fa',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FA_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fa-mass',
      changeId: 'eos-ladder-39-mission-fa',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FA_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fa-ghe',
      changeId: 'eos-ladder-39-mission-fa',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FA_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FA — Ingress Quarantine Replay-Deny Port (SPEC-0163)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FA15: govern happy path ACTIVE + authorized matching quarantine stage -> PASS + FA-RCPT-* (≠ EY/EZ/EB/L36/FB ≠ tip-refresh)', async () => {
    const port = new IngressQuarantineReplayDenyPort();
    const quarantine = makeMockQuarantine({
      desiredStage: 'REPLAY_DENY',
      observedStage: 'REPLAY_DENY',
      authorized: true
    });

    const res = await port.govern({
      planId: 'plan-fa-pass',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FA-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.quarantine.evaluated, true);
    assert.equal(res.receipt.quarantine.status, 'QUARANTINE_EVALUATED');
    assert.equal(res.receipt.quarantine.desiredStage, 'REPLAY_DENY');
    assert.equal(res.receipt.quarantineHold.liveIngressMutationRefused, true);
    assert.equal(res.receipt.quarantineHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.quarantineHold.webhookSecretMaterialRefused, true);
    assert.equal(res.receipt.quarantineHold.quarantineSecretZeroHeld, true);
    assert.equal(res.receipt.quarantineHold.distinctFromEyIngressRegistry, true);
    assert.equal(res.receipt.quarantineHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(res.receipt.quarantineHold.distinctFromEbDeadLetterQuarantine, true);
    assert.equal(res.receipt.quarantineHold.distinctFromL36AdmissionBackpressure, true);
    assert.equal(res.receipt.freezeObserve.liveIngressMutationRefused, true);
    assert.equal(res.receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '3cbb32dc');
    assert.equal(typeof res.receipt.quarantineDigest, 'string');
    assert.equal(res.receipt.quarantineDigest.length, 64);
    assert.equal(typeof res.receipt.replayDenyDigest, 'string');
    assert.equal(res.receipt.replayDenyDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FA_PORT_KIND, 'eos-ingress-quarantine-replay-deny-port');
    const seal = canonicalIngressQuarantineReplayDenySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.quarantine), null);
  });

  it('FA16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new IngressQuarantineReplayDenyPort();

    const res = await port.govern({
      planId: 'plan-fa-hold',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '3cbb32dc');
    assert.equal(port.trail.length, 1);
  });

  it('FA17: verifyTrail + QUARANTINE_UNAUTHORIZED deny + secret-field deny + live-mutation deny + auto-seal refuse + gate codes', async () => {
    const port = new IngressQuarantineReplayDenyPort();

    await port.govern({
      planId: 'plan-fa-trail-01',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ desiredStage: 'ADMIT', observedStage: 'ADMIT' })
    });

    await port.govern({
      planId: 'plan-fa-trail-02',
      changeId: 'eos-ladder-39-mission-fa',
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

    const denyPort = new IngressQuarantineReplayDenyPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fa-unauth-deny',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      quarantine: makeMockQuarantine({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FA_CODES.QUARANTINE_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FA-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.quarantine.status, 'QUARANTINE_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.quarantineHold.failClosed, true);
    assert.equal(unauthRes.receipt.quarantineHold.webhookSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fa-secretfield-deny',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      quarantine: makeMockQuarantine()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FA_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FA-RCPT-'));
    const denySeal = canonicalIngressQuarantineReplayDenySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fa-live-deny',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      instruction: 'mutate live ingress with live ingress mutation',
      quarantine: makeMockQuarantine()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FA_CODES.LIVE_INGRESS_MUTATION_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fa-autoseal',
      changeId: 'eos-ladder-39-mission-fa',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      quarantine: makeMockQuarantine()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FA_CODES.AUTO_SEAL_FORBIDDEN);

    assert.equal(FA_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FA_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(FA_CODES.L39_AUTO_CLOSE_FORBIDDEN, 'L39_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FA_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
    assert.equal(FA_CODES.QUARANTINE_UNAUTHORIZED, 'QUARANTINE_UNAUTHORIZED');
    assert.equal(FA_CODES.INVALID_STAGE_CLAIM, 'INVALID_STAGE_CLAIM');
  });
});
