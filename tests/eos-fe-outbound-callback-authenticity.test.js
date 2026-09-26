/**
 * Mission FE — Outbound Callback Authenticity / Signature-Sign Governance Port Test Suite.
 * SPEC-0167 / ADR-0150.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 7b47bf8b (FD merge #551 / tip-refresh #552; do NOT rewrite tip pins)
 * - PASS = sealed outbound-callback-authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live signature sign endpoint ≠ wall-clock authority ≠ ET/EZ/FD/AU/FF
 * - NEVER reopen L30–L39; refuse L40 auto-close (FF–FH pending)
 * - Hermetic injected observedVerdict only; soft-observe opaque FD targetId/deliveryId
 * - Distinct from ET/L33/EU/EW and EZ outbound-callback authenticity
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FE_PRODUCTION_READY,
  FE_RECEIPT_PRODUCTION_READY,
  FE_RECEIPT_KIND,
  FE_FREEZE_PIN_SHORT,
  FE_FREEZE_PIN,
  FE_OPERATION,
  buildOutboundCallbackAuthenticityReceipt,
  verifyOutboundCallbackAuthenticityReceipt,
  canonicalOutboundCallbackAuthenticitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/outbound-callback-authenticity-receipt.js';

import {
  OutboundCallbackAuthenticityPolicyGate,
  FE_CODES,
  FE_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveSignatureSignEndpoint,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/outbound-callback-authenticity-policy-gate.js';

import {
  OutboundCallbackAuthenticityPort,
  FE_PORT_PRODUCTION_READY,
  FE_PORT_KIND
} from '../src/core/composition/outbound-callback-authenticity-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockSign(overrides = {}) {
  return {
    handleId: 'hdl-opaque-fe-demo-001',
    targetId: 'tgt-opaque-fe-demo-001',
    deliveryId: 'dlv-opaque-fe-demo-001',
    authenticityClass: 'outbound-callback-authenticity',
    signClass: 'outbound-callback-authenticity',
    desiredVerdict: 'SIGNED',
    observedVerdict: 'SIGNED',
    authorized: true,
    ...overrides
  };
}

describe('Mission FE — Outbound Callback Authenticity Receipt (SPEC-0167)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FE1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 7b47bf8b', () => {
    assert.equal(FE_PRODUCTION_READY, 'NO');
    assert.equal(FE_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(FE_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(FE_PORT_PRODUCTION_READY, 'NO');
    assert.equal(FE_FREEZE_PIN_SHORT, '7b47bf8b');
    assert.equal(FE_FREEZE_PIN, '7b47bf8b8da0905460fb82d8f664097ea2b98f63');
  });

  it('FE2: builds canonical nine-field sealed FE-RCPT-* with freeze soft-observe + ceiling + authenticityHold + authenticityDigest', () => {
    const receipt = buildOutboundCallbackAuthenticityReceipt({
      planId: 'plan-fe-01',
      changeId: 'eos-ladder-40-mission-fe',
      decision: 'PASS',
      sign: makeMockSign()
    });

    assert.equal(receipt.kind, FE_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('FE-RCPT-'));
    assert.equal(receipt.operation, FE_OPERATION);
    assert.equal(receipt.operation, 'OUTBOUND_CALLBACK_AUTHENTICITY_HANDLE_SIGN');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '7b47bf8b');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveSignatureSignEndpointRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawCallbackSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.authenticityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.authenticityHold.failClosed, true);
    assert.equal(receipt.authenticityHold.callbackSecretMaterialRefused, true);
    assert.equal(receipt.authenticityHold.authenticitySecretZeroHeld, true);
    assert.equal(receipt.authenticityHold.liveSignatureSignEndpointRefused, true);
    assert.equal(receipt.authenticityHold.distinctFromEtCredentialHandle, true);
    assert.equal(receipt.authenticityHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(receipt.authenticityHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.authenticityHold.distinctFromEwCredentialHonesty, true);
    assert.equal(receipt.authenticityHold.distinctFromEzWebhookAuthenticityVerify, true);
    assert.equal(receipt.authenticityHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.authenticityDigest, 'string');
    assert.equal(receipt.authenticityDigest.length, 64);

    const seal = canonicalOutboundCallbackAuthenticitySealBody(receipt);
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

  it('FE3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildOutboundCallbackAuthenticityReceipt({
      planId: 'plan-fe-tamper',
      changeId: 'eos-ladder-40-mission-fe',
      decision: 'PASS'
    });

    assert.equal(verifyOutboundCallbackAuthenticityReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyOutboundCallbackAuthenticityReceipt(tampered).ok, false);
  });
});

describe('Mission FE — Outbound Callback Authenticity Policy Gate (SPEC-0167)', () => {
  it('FE4: validates well-formed plan (planId+changeId+ACTIVE+verify handleId/targetId/deliveryId/authenticityClass/desiredVerdict/authorized)', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();
    const sign = makeMockSign();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fe-valid',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      sign
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, FE_CODES.OK);
  });

  it('FE5: rejects missing sign or invalid sign object', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-fe-nobinding',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, FE_CODES.MISSING_SIGN);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-fe-invalidbinding',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, FE_CODES.INVALID_SIGN);
  });

  it('FE6: rejects missing handleId / authenticityClass / desiredVerdict + bad soft-observe targetId', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-fe-noid',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ handleId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, FE_CODES.MISSING_HANDLE_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-fe-badtargetid',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ targetId: '   ' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, FE_CODES.MISSING_TARGET_OR_DELIVERY_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-fe-noclass',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ authenticityClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, FE_CODES.MISSING_AUTHENTICITY_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-fe-nodesired',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ desiredVerdict: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, FE_CODES.MISSING_DESIRED_VERDICT);
  });

  it('FE7: DENY invalid desiredVerdict/observedVerdict + live signature sign endpoint claims', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-fe-baddesired',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ desiredVerdict: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, FE_CODES.INVALID_DESIRED_VERDICT);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-fe-badobserved',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ observedVerdict: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, FE_CODES.INVALID_OBSERVED_VERDICT);

    const live = gate.evaluatePreconditions({
      planId: 'plan-fe-livesecret',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      liveSignatureSignEndpoint: true,
      sign: makeMockSign()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, FE_CODES.LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN);
  });

  it('FE8: rejects live signature sign endpoint / wall-clock / tip-refresh authority / EO-EP-AU elevate / schema-json add', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-fe-storeclaim',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live signature sign endpoint verify',
      sign: makeMockSign()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, FE_CODES.LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-fe-rolloutclaim',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      sign: makeMockSign()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, FE_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-fe-tipauth',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      sign: makeMockSign()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, FE_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-fe-eoclaim',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle the authenticity sign port',
      sign: makeMockSign()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, FE_CODES.ET_CREDENTIAL_HANDLE_AS_SIGN_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-fe-epclaim',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'make domain-event outbound the authenticity sign port',
      sign: makeMockSign()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, FE_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-fe-auclaim',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'make fd the authenticity port',
      sign: makeMockSign()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, FE_CODES.FD_REGISTRY_AS_AUTHENTICITY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-fe-schema',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-outbound-callback-authenticity.json',
      sign: makeMockSign()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, FE_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveSignatureSignEndpoint('claiming live signature sign endpoint'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('FE9: allows HOLD mode with zero mutations', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fe-hold',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, FE_CODES.HOLD);
  });

  it('FE10: DENY (SIGN_UNAUTHORIZED / INVALID_VERDICT_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-fe-unauth',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, FE_CODES.SIGN_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-fe-mismatch',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ desiredVerdict: 'SIGNED', observedVerdict: 'UNSIGNED', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, FE_CODES.INVALID_VERDICT_CLAIM);
  });

  it('FE11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { sign: makeMockSign({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-fe-secretfield',
        changeId: 'eos-ladder-40-mission-fe',
        ritualMode: 'ACTIVE',
        sign: makeMockSign(),
        ...extra
      };
      // If extra has verify (last case), use that verify
      if (extra.sign) plan.sign = extra.sign;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, FE_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ handleId: 'ok', targetId: 'ok', deliveryId: 'ok' }), null);
  });

  it('FE12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-fe-secret',
      changeId: 'eos-ladder-40-mission-fe',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FE_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-fe-del',
      changeId: 'eos-ladder-40-mission-fe',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, FE_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('FE13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-fe-fundacion',
      changeId: 'eos-ladder-40-mission-fe',
      target: 'Documents/Fundacion/outbound-callback-authenticity'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, FE_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildOutboundCallbackAuthenticityReceipt({
      planId: 'plan-fe-delta0',
      changeId: 'eos-ladder-40-mission-fe',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('FE14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L38 reopen, L40 auto-close, mass prune, GHE', () => {
    const gate = new OutboundCallbackAuthenticityPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-fe-pr',
      changeId: 'eos-ladder-40-mission-fe',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, FE_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', FE_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', FE_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', FE_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', FE_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', FE_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', FE_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', FE_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', FE_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', FE_CODES.L38_REOPEN_FORBIDDEN],
      ['reopen ladder-39', FE_CODES.L39_REOPEN_FORBIDDEN],
      ['auto-close ladder-40 now', FE_CODES.L40_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-fe-ladder',
        changeId: 'eos-ladder-40-mission-fe',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-fe-tip',
      changeId: 'eos-ladder-40-mission-fe',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, FE_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-fe-mass',
      changeId: 'eos-ladder-40-mission-fe',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, FE_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-fe-ghe',
      changeId: 'eos-ladder-40-mission-fe',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, FE_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission FE — Outbound Callback Authenticity Port (SPEC-0167)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('FE15: govern happy path ACTIVE + authorized matching sign -> PASS + FE-RCPT-* (≠ ET/EZ/FD/AU/FF ≠ tip-refresh)', async () => {
    const port = new OutboundCallbackAuthenticityPort();
    const sign = makeMockSign({ desiredVerdict: 'SIGNED', observedVerdict: 'SIGNED', authorized: true });

    const res = await port.govern({
      planId: 'plan-fe-pass',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('FE-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.sign.evaluated, true);
    assert.equal(res.receipt.sign.status, 'SIGNED_EVALUATED');
    assert.equal(res.receipt.authenticityHold.liveSignatureSignEndpointRefused, true);
    assert.equal(res.receipt.authenticityHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.authenticityHold.callbackSecretMaterialRefused, true);
    assert.equal(res.receipt.authenticityHold.authenticitySecretZeroHeld, true);
    assert.equal(res.receipt.authenticityHold.distinctFromEtCredentialHandle, true);
    assert.equal(res.receipt.authenticityHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(res.receipt.authenticityHold.distinctFromFdOutboundDeliveryRegistry, true);
    assert.equal(res.receipt.freezeObserve.liveSignatureSignEndpointRefused, true);
    assert.equal(res.receipt.freezeObserve.l40AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l39ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '7b47bf8b');
    assert.equal(typeof res.receipt.authenticityDigest, 'string');
    assert.equal(res.receipt.authenticityDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(FE_PORT_KIND, 'eos-outbound-callback-authenticity-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalOutboundCallbackAuthenticitySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.sign), null);
  });

  it('FE16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new OutboundCallbackAuthenticityPort();

    const res = await port.govern({
      planId: 'plan-fe-hold',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '7b47bf8b');
    assert.equal(port.trail.length, 1);
  });

  it('FE17: verifyTrail + SIGN_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new OutboundCallbackAuthenticityPort();

    await port.govern({
      planId: 'plan-fe-trail-01',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign()
    });

    await port.govern({
      planId: 'plan-fe-trail-02',
      changeId: 'eos-ladder-40-mission-fe',
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

    const denyPort = new OutboundCallbackAuthenticityPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-fe-unauth-deny',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      sign: makeMockSign({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, FE_CODES.SIGN_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('FE-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.sign.status, 'SIGN_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.authenticityHold.failClosed, true);
    assert.equal(unauthRes.receipt.authenticityHold.callbackSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-fe-secretfield-deny',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      sign: makeMockSign()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, FE_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('FE-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalOutboundCallbackAuthenticitySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-fe-live-deny',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      instruction: 'bind live signature sign endpoint with live signature sign endpoint',
      sign: makeMockSign()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, FE_CODES.LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-fe-autoseal',
      changeId: 'eos-ladder-40-mission-fe',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      sign: makeMockSign()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, FE_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(FE_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(FE_CODES.L39_REOPEN_FORBIDDEN, 'L39_REOPEN_FORBIDDEN');
    assert.equal(FE_CODES.L40_AUTO_CLOSE_FORBIDDEN, 'L40_AUTO_CLOSE_FORBIDDEN');
    assert.equal(FE_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
