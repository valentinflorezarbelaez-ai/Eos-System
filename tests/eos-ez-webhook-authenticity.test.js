/**
 * Mission EZ — Webhook Authenticity / Signature-Verify Governance Port Test Suite.
 * SPEC-0162 / ADR-0144.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin cc9161f9 (do NOT rewrite tip pins)
 * - PASS = sealed webhook-authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live signature verify endpoint ≠ wall-clock authority ≠ ET/EU/EY/AU/FA
 * - NEVER reopen L30–L38; refuse L39 auto-close (FA–FC pending)
 * - Hermetic injected observedVerdict only
 * - Distinct from ET/L33/EU/EW and EZ webhook authenticity
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EZ_PRODUCTION_READY,
  EZ_RECEIPT_PRODUCTION_READY,
  EZ_RECEIPT_KIND,
  EZ_FREEZE_PIN_SHORT,
  EZ_FREEZE_PIN,
  EZ_OPERATION,
  buildWebhookAuthenticityReceipt,
  verifyWebhookAuthenticityReceipt,
  canonicalWebhookAuthenticitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/webhook-authenticity-receipt.js';

import {
  WebhookAuthenticityPolicyGate,
  EZ_CODES,
  EZ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSignatureVerifyEndpoint,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/webhook-authenticity-policy-gate.js';

import {
  WebhookAuthenticityPort,
  EZ_PORT_PRODUCTION_READY,
  EZ_PORT_KIND
} from '../src/core/composition/webhook-authenticity-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockVerify(overrides = {}) {
  return {
    handleId: 'hdl-opaque-ez-demo-001',
    sourceId: 'src-opaque-ez-demo-001',
    authenticityClass: 'webhook-authenticity',
    verifyClass: 'webhook-authenticity',
    desiredVerdict: 'AUTHENTIC',
    observedVerdict: 'AUTHENTIC',
    authorized: true,
    ...overrides
  };
}

describe('Mission EZ — Webhook Authenticity Receipt (SPEC-0162)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EZ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin cc9161f9', () => {
    assert.equal(EZ_PRODUCTION_READY, 'NO');
    assert.equal(EZ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EZ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EZ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EZ_FREEZE_PIN_SHORT, 'cc9161f9');
    assert.equal(EZ_FREEZE_PIN, 'cc9161f9a2da918a932081bae9afc644479f6eee');
  });

  it('EZ2: builds canonical nine-field sealed EZ-RCPT-* with freeze soft-observe + ceiling + authenticityHold + authenticityDigest', () => {
    const receipt = buildWebhookAuthenticityReceipt({
      planId: 'plan-ez-01',
      changeId: 'eos-ladder-39-mission-ez',
      decision: 'PASS',
      verify: makeMockVerify()
    });

    assert.equal(receipt.kind, EZ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EZ-RCPT-'));
    assert.equal(receipt.operation, EZ_OPERATION);
    assert.equal(receipt.operation, 'WEBHOOK_AUTHENTICITY_HANDLE_VERIFY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'cc9161f9');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveSignatureVerifyEndpointRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawWebhookSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.authenticityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.authenticityHold.failClosed, true);
    assert.equal(receipt.authenticityHold.webhookSecretMaterialRefused, true);
    assert.equal(receipt.authenticityHold.authenticitySecretZeroHeld, true);
    assert.equal(receipt.authenticityHold.liveSignatureVerifyEndpointRefused, true);
    assert.equal(receipt.authenticityHold.distinctFromEtCredentialHandle, true);
    assert.equal(receipt.authenticityHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(receipt.authenticityHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.authenticityHold.distinctFromEwCredentialHonesty, true);
    assert.equal(receipt.authenticityHold.distinctFromEyIngressRegistry, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.authenticityDigest, 'string');
    assert.equal(receipt.authenticityDigest.length, 64);

    const seal = canonicalWebhookAuthenticitySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'authenticityDigest',
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

  it('EZ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildWebhookAuthenticityReceipt({
      planId: 'plan-ez-tamper',
      changeId: 'eos-ladder-39-mission-ez',
      decision: 'PASS'
    });

    assert.equal(verifyWebhookAuthenticityReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyWebhookAuthenticityReceipt(tampered).ok, false);
  });
});

describe('Mission EZ — Webhook Authenticity Policy Gate (SPEC-0162)', () => {
  it('EZ4: validates well-formed plan (planId+changeId+ACTIVE+verify handleId/sourceId/authenticityClass/desiredVerdict/authorized)', () => {
    const gate = new WebhookAuthenticityPolicyGate();
    const verify = makeMockVerify();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ez-valid',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      verify
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EZ_CODES.OK);
  });

  it('EZ5: rejects missing verify or invalid verify object', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ez-nobinding',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EZ_CODES.MISSING_VERIFY);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ez-invalidbinding',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EZ_CODES.INVALID_VERIFY);
  });

  it('EZ6: rejects missing handleId / authenticityClass / desiredVerdict', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ez-noid',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ handleId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EZ_CODES.MISSING_HANDLE_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-ez-badsourceid',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ sourceId: '   ' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, EZ_CODES.MISSING_SOURCE_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ez-noclass',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ authenticityClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EZ_CODES.MISSING_AUTHENTICITY_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-ez-nodesired',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ desiredVerdict: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EZ_CODES.MISSING_DESIRED_VERDICT);
  });

  it('EZ7: DENY invalid desiredVerdict/observedVerdict + live signature verify endpoint claims', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-ez-baddesired',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ desiredVerdict: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EZ_CODES.INVALID_DESIRED_VERDICT);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-ez-badobserved',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ observedVerdict: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EZ_CODES.INVALID_OBSERVED_VERDICT);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ez-livesecret',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      liveSignatureVerifyEndpoint: true,
      verify: makeMockVerify()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EZ_CODES.LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN);
  });

  it('EZ8: rejects live signature verify endpoint / wall-clock / tip-refresh authority / EO-EP-AU elevate / schema-json add', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-ez-storeclaim',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live signature verify endpoint verify',
      verify: makeMockVerify()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, EZ_CODES.LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-ez-rolloutclaim',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      verify: makeMockVerify()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EZ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-ez-tipauth',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      verify: makeMockVerify()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, EZ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-ez-eoclaim',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle the ingress port for webhooks',
      verify: makeMockVerify()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, EZ_CODES.ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-ez-epclaim',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'make domain-event outbound the ingress port',
      verify: makeMockVerify()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, EZ_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-ez-auclaim',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'make ey the authenticity port',
      verify: makeMockVerify()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, EZ_CODES.EY_INGRESS_AS_AUTHENTICITY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ez-schema',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-webhook-authenticity.json',
      verify: makeMockVerify()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EZ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSignatureVerifyEndpoint('claiming live signature verify endpoint'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EZ9: allows HOLD mode with zero mutations', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ez-hold',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EZ_CODES.HOLD);
  });

  it('EZ10: DENY (VERIFY_UNAUTHORIZED / INVALID_VERDICT_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ez-unauth',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EZ_CODES.VERIFY_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ez-mismatch',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ desiredVerdict: 'AUTHENTIC', observedVerdict: 'INAUTHENTIC', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EZ_CODES.INVALID_VERDICT_CLAIM);
  });

  it('EZ11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { verify: makeMockVerify({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-ez-secretfield',
        changeId: 'eos-ladder-39-mission-ez',
        ritualMode: 'ACTIVE',
        verify: makeMockVerify(),
        ...extra
      };
      // If extra has verify (last case), use that verify
      if (extra.verify) plan.verify = extra.verify;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, EZ_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ handleId: 'ok', sourceId: 'ok' }), null);
  });

  it('EZ12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new WebhookAuthenticityPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-ez-secret',
      changeId: 'eos-ladder-39-mission-ez',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EZ_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-ez-del',
      changeId: 'eos-ladder-39-mission-ez',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, EZ_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('EZ13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ez-fundacion',
      changeId: 'eos-ladder-39-mission-ez',
      target: 'Documents/Fundacion/webhook-authenticity'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EZ_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildWebhookAuthenticityReceipt({
      planId: 'plan-ez-delta0',
      changeId: 'eos-ladder-39-mission-ez',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('EZ14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L38 reopen, L39 auto-close, mass prune, GHE', () => {
    const gate = new WebhookAuthenticityPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ez-pr',
      changeId: 'eos-ladder-39-mission-ez',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EZ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', EZ_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', EZ_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', EZ_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', EZ_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', EZ_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', EZ_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', EZ_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', EZ_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', EZ_CODES.L38_REOPEN_FORBIDDEN],
      ['auto-close ladder-39 now', EZ_CODES.L39_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-ez-ladder',
        changeId: 'eos-ladder-39-mission-ez',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ez-tip',
      changeId: 'eos-ladder-39-mission-ez',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EZ_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ez-mass',
      changeId: 'eos-ladder-39-mission-ez',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EZ_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ez-ghe',
      changeId: 'eos-ladder-39-mission-ez',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EZ_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission EZ — Webhook Authenticity Port (SPEC-0162)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EZ15: govern happy path ACTIVE + authorized matching verify -> PASS + EZ-RCPT-* (≠ ET/EY/AU/FA ≠ tip-refresh)', async () => {
    const port = new WebhookAuthenticityPort();
    const verify = makeMockVerify({ desiredVerdict: 'AUTHENTIC', observedVerdict: 'AUTHENTIC', authorized: true });

    const res = await port.govern({
      planId: 'plan-ez-pass',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EZ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.verify.evaluated, true);
    assert.equal(res.receipt.verify.status, 'AUTHENTIC_EVALUATED');
    assert.equal(res.receipt.authenticityHold.liveSignatureVerifyEndpointRefused, true);
    assert.equal(res.receipt.authenticityHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.authenticityHold.webhookSecretMaterialRefused, true);
    assert.equal(res.receipt.authenticityHold.authenticitySecretZeroHeld, true);
    assert.equal(res.receipt.authenticityHold.distinctFromEtCredentialHandle, true);
    assert.equal(res.receipt.authenticityHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(res.receipt.authenticityHold.distinctFromEyIngressRegistry, true);
    assert.equal(res.receipt.freezeObserve.liveSignatureVerifyEndpointRefused, true);
    assert.equal(res.receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'cc9161f9');
    assert.equal(typeof res.receipt.authenticityDigest, 'string');
    assert.equal(res.receipt.authenticityDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EZ_PORT_KIND, 'eos-webhook-authenticity-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalWebhookAuthenticitySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.verify), null);
  });

  it('EZ16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new WebhookAuthenticityPort();

    const res = await port.govern({
      planId: 'plan-ez-hold',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, 'cc9161f9');
    assert.equal(port.trail.length, 1);
  });

  it('EZ17: verifyTrail + VERIFY_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new WebhookAuthenticityPort();

    await port.govern({
      planId: 'plan-ez-trail-01',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify()
    });

    await port.govern({
      planId: 'plan-ez-trail-02',
      changeId: 'eos-ladder-39-mission-ez',
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

    const denyPort = new WebhookAuthenticityPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ez-unauth-deny',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      verify: makeMockVerify({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EZ_CODES.VERIFY_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EZ-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.verify.status, 'VERIFY_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.authenticityHold.failClosed, true);
    assert.equal(unauthRes.receipt.authenticityHold.webhookSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-ez-secretfield-deny',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      verify: makeMockVerify()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, EZ_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('EZ-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalWebhookAuthenticitySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-ez-live-deny',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      instruction: 'bind live signature verify endpoint with live signature verify endpoint',
      verify: makeMockVerify()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EZ_CODES.LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ez-autoseal',
      changeId: 'eos-ladder-39-mission-ez',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      verify: makeMockVerify()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EZ_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(EZ_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(EZ_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(EZ_CODES.L39_AUTO_CLOSE_FORBIDDEN, 'L39_AUTO_CLOSE_FORBIDDEN');
    assert.equal(EZ_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
