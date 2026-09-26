/**
 * Mission EY — External Event Ingress Registry & Binding Port Test Suite.
 * SPEC-0161 / ADR-0143.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets; refuse secret-looking fields; synthetic tokens fake-only)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 987702da (do NOT rewrite tip pins)
 * - PASS = sealed credential-ingress binding ≠ tip-refresh ≠ PRODUCTION_READY
 *   ≠ live webhook endpoint ≠ wall-clock authority ≠ ET/L33/EU/EW/EZ
 * - NEVER reopen L30–L38; refuse L39 auto-close (EZ–FC pending)
 * - Hermetic injected observedBinding only
 * - Distinct from ET/L33/EU/EW and EZ webhook authenticity
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EY_PRODUCTION_READY,
  EY_RECEIPT_PRODUCTION_READY,
  EY_RECEIPT_KIND,
  EY_FREEZE_PIN_SHORT,
  EY_FREEZE_PIN,
  EY_OPERATION,
  buildExternalEventIngressRegistryReceipt,
  verifyExternalEventIngressRegistryReceipt,
  canonicalExternalEventIngressRegistrySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/external-event-ingress-registry-receipt.js';

import {
  ExternalEventIngressRegistryPolicyGate,
  EY_CODES,
  EY_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  findSecretLookingField,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveWebhookEndpoint,
  claimsWallClockAuthority,
  isFundacionTarget
} from '../src/core/composition/external-event-ingress-registry-policy-gate.js';

import {
  ExternalEventIngressRegistryPort,
  EY_PORT_PRODUCTION_READY,
  EY_PORT_KIND
} from '../src/core/composition/external-event-ingress-registry-port.js';

function makeSyntheticSecret() {
  // Clearly fake synthetic token — never appears in receipt seal body
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBinding(overrides = {}) {
  return {
    ingressId: 'ing-opaque-ey-demo-001',
    sourceId: 'src-opaque-ey-demo-001',
    sourceClass: 'external-event-ingress',
    bindingClass: 'external-event-ingress',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

describe('Mission EY — External Event Ingress Registry Receipt (SPEC-0161)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EY1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 987702da', () => {
    assert.equal(EY_PRODUCTION_READY, 'NO');
    assert.equal(EY_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EY_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EY_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EY_FREEZE_PIN_SHORT, '987702da');
    assert.equal(EY_FREEZE_PIN, '987702da91fac40550bf6f7fb803790f69aca21c');
  });

  it('EY2: builds canonical nine-field sealed EY-RCPT-* with freeze soft-observe + ceiling + ingressHold + ingressDigest', () => {
    const receipt = buildExternalEventIngressRegistryReceipt({
      planId: 'plan-ey-01',
      changeId: 'eos-ladder-39-mission-ey',
      decision: 'PASS',
      binding: makeMockBinding()
    });

    assert.equal(receipt.kind, EY_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EY-RCPT-'));
    assert.equal(receipt.operation, EY_OPERATION);
    assert.equal(receipt.operation, 'EXTERNAL_EVENT_INGRESS_REGISTRY_BINDING');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '987702da');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveWebhookEndpointRefused, true);
    assert.equal(receipt.freezeObserve.wallClockAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.tipRefreshAuthorityRefused, true);
    assert.equal(receipt.freezeObserve.rawWebhookSecretMaterialRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.ingressHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.ingressHold.failClosed, true);
    assert.equal(receipt.ingressHold.webhookSecretMaterialRefused, true);
    assert.equal(receipt.ingressHold.ingressSecretZeroHeld, true);
    assert.equal(receipt.ingressHold.liveWebhookEndpointRefused, true);
    assert.equal(receipt.ingressHold.distinctFromEtCredentialHandle, true);
    assert.equal(receipt.ingressHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(receipt.ingressHold.distinctFromEuSecretZeroLeakDeny, true);
    assert.equal(receipt.ingressHold.distinctFromEwCredentialHonesty, true);
    assert.equal(receipt.ingressHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.ingressDigest, 'string');
    assert.equal(receipt.ingressDigest.length, 64);

    const seal = canonicalExternalEventIngressRegistrySealBody(receipt);
    assert.deepEqual(Object.keys(seal).sort(), [
      'changeId',
      'decision',
      'fundacionDelta',
      'ingressDigest',
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

  it('EY3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildExternalEventIngressRegistryReceipt({
      planId: 'plan-ey-tamper',
      changeId: 'eos-ladder-39-mission-ey',
      decision: 'PASS'
    });

    assert.equal(verifyExternalEventIngressRegistryReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyExternalEventIngressRegistryReceipt(tampered).ok, false);
  });
});

describe('Mission EY — External Event Ingress Registry Policy Gate (SPEC-0161)', () => {
  it('EY4: validates well-formed plan (planId+changeId+ACTIVE+binding ingressId/sourceId/sourceClass/desiredBinding/authorized)', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();
    const binding = makeMockBinding();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ey-valid',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EY_CODES.OK);
  });

  it('EY5: rejects missing binding or invalid binding', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ey-nobinding',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EY_CODES.MISSING_BINDING);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ey-invalidbinding',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EY_CODES.INVALID_BINDING);
  });

  it('EY6: rejects missing ingressId / sourceId / sourceClass / desiredBinding', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ey-noid',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ ingressId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EY_CODES.MISSING_INGRESS_ID);

    const resSourceId = gate.evaluatePreconditions({
      planId: 'plan-ey-nosourceid',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ sourceId: '' })
    });
    assert.equal(resSourceId.ok, false);
    assert.equal(resSourceId.code, EY_CODES.MISSING_SOURCE_ID);

    const resClass = gate.evaluatePreconditions({
      planId: 'plan-ey-noclass',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ sourceClass: '   ' })
    });
    assert.equal(resClass.ok, false);
    assert.equal(resClass.code, EY_CODES.MISSING_SOURCE_CLASS);

    const resDesired = gate.evaluatePreconditions({
      planId: 'plan-ey-nodesired',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: null })
    });
    assert.equal(resDesired.ok, false);
    assert.equal(resDesired.code, EY_CODES.MISSING_DESIRED_BINDING);
  });

  it('EY7: DENY invalid desiredBinding/observedBinding + live webhook endpoint claims', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const badDesired = gate.evaluatePreconditions({
      planId: 'plan-ey-baddesired',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'MAYBE' })
    });
    assert.equal(badDesired.ok, false);
    assert.equal(badDesired.decision, 'DENY');
    assert.equal(badDesired.code, EY_CODES.INVALID_DESIRED_BINDING);

    const badObserved = gate.evaluatePreconditions({
      planId: 'plan-ey-badobserved',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ observedBinding: 'PERCENT_50' })
    });
    assert.equal(badObserved.ok, false);
    assert.equal(badObserved.code, EY_CODES.INVALID_OBSERVED_BINDING);

    const live = gate.evaluatePreconditions({
      planId: 'plan-ey-livesecret',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      liveWebhookEndpoint: true,
      binding: makeMockBinding()
    });
    assert.equal(live.ok, false);
    assert.equal(live.decision, 'DENY');
    assert.equal(live.code, EY_CODES.LIVE_WEBHOOK_ENDPOINT_FORBIDDEN);
  });

  it('EY8: rejects live webhook endpoint / wall-clock / tip-refresh authority / EO-EP-AU elevate / schema-json add', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const storeClaim = gate.evaluatePreconditions({
      planId: 'plan-ey-storeclaim',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live webhook endpoint binding',
      binding: makeMockBinding()
    });
    assert.equal(storeClaim.ok, false);
    assert.equal(storeClaim.code, EY_CODES.LIVE_WEBHOOK_ENDPOINT_FORBIDDEN);

    const rolloutClaim = gate.evaluatePreconditions({
      planId: 'plan-ey-rolloutclaim',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'claiming wall-clock authority',
      binding: makeMockBinding()
    });
    assert.equal(rolloutClaim.ok, false);
    assert.equal(rolloutClaim.code, EY_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN);

    const tipAuth = gate.evaluatePreconditions({
      planId: 'plan-ey-tipauth',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'claiming tip-refresh authority',
      binding: makeMockBinding()
    });
    assert.equal(tipAuth.ok, false);
    assert.equal(tipAuth.code, EY_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN);

    const eoClaim = gate.evaluatePreconditions({
      planId: 'plan-ey-eoclaim',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'make credential-handle the ingress port for webhooks',
      binding: makeMockBinding()
    });
    assert.equal(eoClaim.ok, false);
    assert.equal(eoClaim.code, EY_CODES.ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN);

    const epClaim = gate.evaluatePreconditions({
      planId: 'plan-ey-epclaim',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'make domain-event outbound the ingress port',
      binding: makeMockBinding()
    });
    assert.equal(epClaim.ok, false);
    assert.equal(epClaim.code, EY_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN);

    const auClaim = gate.evaluatePreconditions({
      planId: 'plan-ey-auclaim',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'make ez the ingress registry',
      binding: makeMockBinding()
    });
    assert.equal(auClaim.ok, false);
    assert.equal(auClaim.code, EY_CODES.EZ_WEBHOOK_AUTH_AS_REGISTRY_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ey-schema',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-external-event-ingress.json',
      binding: makeMockBinding()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EY_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveWebhookEndpoint('claiming live webhook endpoint'), true);
    assert.equal(claimsWallClockAuthority('claiming wall-clock authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EY9: allows HOLD mode with zero mutations', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ey-hold',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EY_CODES.HOLD);
  });

  it('EY10: DENY (BINDING_UNAUTHORIZED / INVALID_BINDING_CLAIM) when hermetic claim unauthorized or mismatched', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const unauthorized = gate.evaluatePreconditions({
      planId: 'plan-ey-unauth',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.decision, 'DENY');
    assert.equal(unauthorized.code, EY_CODES.BINDING_UNAUTHORIZED);

    const mismatch = gate.evaluatePreconditions({
      planId: 'plan-ey-mismatch',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'UNBOUND', authorized: true })
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.decision, 'DENY');
    assert.equal(mismatch.code, EY_CODES.INVALID_BINDING_CLAIM);
  });

  it('EY11: Law VI DENY when secret-looking fields present (password/token/apiKey/privateKey/rawSecret/bearer)', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const fields = [
      { password: 'x' },
      { token: 'x' },
      { apiKey: 'x' },
      { privateKey: 'x' },
      { rawSecret: 'x' },
      { bearer: 'x' },
      { binding: makeMockBinding({ clientSecret: 'nope' }) },
      { webhookSecret: 'x' },
      { hmacKey: 'x' }
    ];

    for (const extra of fields) {
      const plan = {
        planId: 'plan-ey-secretfield',
        changeId: 'eos-ladder-39-mission-ey',
        ritualMode: 'ACTIVE',
        binding: makeMockBinding(),
        ...extra
      };
      // If extra has binding (last case), use that binding
      if (extra.binding) plan.binding = extra.binding;
      const res = gate.evaluatePreconditions(plan);
      assert.equal(res.ok, false, `expected DENY for ${JSON.stringify(Object.keys(extra))}`);
      assert.equal(res.decision, 'DENY');
      assert.equal(res.code, EY_CODES.SECRET_FIELD_FORBIDDEN);
    }

    assert.equal(findSecretLookingField({ password: 'x' }), 'password');
    assert.equal(findSecretLookingField({ apiKey: 'x' }), 'apiKey');
    assert.equal(findSecretLookingField({ ingressId: 'ok', sourceId: 'ok' }), null);
  });

  it('EY12: policy gate DENY on secrets (Law VI synthetic tokens) + hard-delete', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();
    const secret = makeSyntheticSecret();

    // Use a non-secret-field key so SECRET_LEAK (value pattern) is exercised,
    // not SECRET_FIELD (field-name) — instruction is a safe key name.
    const res = gate.evaluatePreconditions({
      planId: 'plan-ey-secret',
      changeId: 'eos-ladder-39-mission-ey',
      instruction: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EY_CODES.SECRET_LEAK_FORBIDDEN);

    const del = gate.evaluatePreconditions({
      planId: 'plan-ey-del',
      changeId: 'eos-ladder-39-mission-ey',
      forceDelete: true
    });
    assert.equal(del.ok, false);
    assert.equal(del.code, EY_CODES.HARD_DELETE_FORBIDDEN);

    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
  });

  it('EY13: policy gate DENY on Fundacion target paths (Law IV) + Fundacion Δ=0 marker', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ey-fundacion',
      changeId: 'eos-ladder-39-mission-ey',
      target: 'Documents/Fundacion/external-event-ingress'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EY_CODES.FUNDACION_DENIED);
    assert.equal(isFundacionTarget('Fundacion/x'), true);

    const receipt = buildExternalEventIngressRegistryReceipt({
      planId: 'plan-ey-delta0',
      changeId: 'eos-ladder-39-mission-ey',
      decision: 'PASS'
    });
    assert.equal(receipt.fundacionDelta, 0);
  });

  it('EY14: DENY on PRODUCTION_READY flip, tip rewrite, L30–L38 reopen, L39 auto-close, mass prune, GHE', () => {
    const gate = new ExternalEventIngressRegistryPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ey-pr',
      changeId: 'eos-ladder-39-mission-ey',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EY_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const ladders = [
      ['reopen ladder-30', EY_CODES.L30_REOPEN_FORBIDDEN],
      ['reopen ladder-31', EY_CODES.L31_REOPEN_FORBIDDEN],
      ['reopen ladder-32', EY_CODES.L32_REOPEN_FORBIDDEN],
      ['reopen ladder-33', EY_CODES.L33_REOPEN_FORBIDDEN],
      ['reopen ladder-34', EY_CODES.L34_REOPEN_FORBIDDEN],
      ['reopen ladder-35', EY_CODES.L35_REOPEN_FORBIDDEN],
      ['reopen ladder-36', EY_CODES.L36_REOPEN_FORBIDDEN],
      ['reopen ladder-37', EY_CODES.L37_REOPEN_FORBIDDEN],
      ['reopen ladder-38', EY_CODES.L38_REOPEN_FORBIDDEN],
      ['auto-close ladder-39 now', EY_CODES.L39_AUTO_CLOSE_FORBIDDEN]
    ];
    for (const [instruction, code] of ladders) {
      const r = gate.evaluatePreconditions({
        planId: 'plan-ey-ladder',
        changeId: 'eos-ladder-39-mission-ey',
        instruction
      });
      assert.equal(r.ok, false, instruction);
      assert.equal(r.code, code, instruction);
    }

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ey-tip',
      changeId: 'eos-ladder-39-mission-ey',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EY_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ey-mass',
      changeId: 'eos-ladder-39-mission-ey',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EY_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ey-ghe',
      changeId: 'eos-ladder-39-mission-ey',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EY_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
  });
});

describe('Mission EY — External Event Ingress Registry Port (SPEC-0161)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EY15: govern happy path ACTIVE + authorized matching binding -> PASS + EY-RCPT-* (≠ ET/L33/EZ ≠ tip-refresh)', async () => {
    const port = new ExternalEventIngressRegistryPort();
    const binding = makeMockBinding({ desiredBinding: 'BOUND', observedBinding: 'BOUND', authorized: true });

    const res = await port.govern({
      planId: 'plan-ey-pass',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EY-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.binding.evaluated, true);
    assert.equal(res.receipt.binding.status, 'BOUND_EVALUATED');
    assert.equal(res.receipt.ingressHold.liveWebhookEndpointRefused, true);
    assert.equal(res.receipt.ingressHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.ingressHold.webhookSecretMaterialRefused, true);
    assert.equal(res.receipt.ingressHold.ingressSecretZeroHeld, true);
    assert.equal(res.receipt.ingressHold.distinctFromEtCredentialHandle, true);
    assert.equal(res.receipt.ingressHold.distinctFromL33DomainEventOutbound, true);
    assert.equal(res.receipt.ingressHold.distinctFromEzWebhookAuthenticity, true);
    assert.equal(res.receipt.freezeObserve.liveWebhookEndpointRefused, true);
    assert.equal(res.receipt.freezeObserve.l39AutoCloseRefused, true);
    assert.equal(res.receipt.freezeObserve.l38ReopenRefused, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '987702da');
    assert.equal(typeof res.receipt.ingressDigest, 'string');
    assert.equal(res.receipt.ingressDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EY_PORT_KIND, 'eos-external-event-ingress-registry-port');
    // Law VI: synthetic / secret material must not appear in seal body
    const seal = canonicalExternalEventIngressRegistrySealBody(res.receipt);
    assert.equal(scanForSecrets(seal), false);
    assert.equal(findSecretLookingField(seal), null);
    assert.equal(findSecretLookingField(res.receipt.binding), null);
  });

  it('EY16: govern HOLD mode -> HOLD with zero state changes + ceiling held', async () => {
    const port = new ExternalEventIngressRegistryPort();

    const res = await port.govern({
      planId: 'plan-ey-hold',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(res.receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(res.receipt.freezeObserve.pinShort, '987702da');
    assert.equal(port.trail.length, 1);
  });

  it('EY17: verifyTrail + BINDING_UNAUTHORIZED deny + secret-field deny + live-store deny + auto-seal refuse + gate codes', async () => {
    const port = new ExternalEventIngressRegistryPort();

    await port.govern({
      planId: 'plan-ey-trail-01',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding()
    });

    await port.govern({
      planId: 'plan-ey-trail-02',
      changeId: 'eos-ladder-39-mission-ey',
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

    const denyPort = new ExternalEventIngressRegistryPort();
    const unauthRes = await denyPort.govern({
      planId: 'plan-ey-unauth-deny',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      binding: makeMockBinding({ authorized: false })
    });
    assert.equal(unauthRes.ok, false);
    assert.equal(unauthRes.decision, 'DENY');
    assert.equal(unauthRes.code, EY_CODES.BINDING_UNAUTHORIZED);
    assert.ok(unauthRes.receipt.receiptId.startsWith('EY-RCPT-'));
    assert.equal(unauthRes.receipt.decision, 'DENY');
    assert.equal(unauthRes.receipt.binding.status, 'BINDING_UNAUTHORIZED');
    assert.equal(unauthRes.receipt.ingressHold.failClosed, true);
    assert.equal(unauthRes.receipt.ingressHold.webhookSecretMaterialRefused, true);

    const secretFieldDeny = await denyPort.govern({
      planId: 'plan-ey-secretfield-deny',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      password: 'should-never-seal',
      binding: makeMockBinding()
    });
    assert.equal(secretFieldDeny.ok, false);
    assert.equal(secretFieldDeny.decision, 'DENY');
    assert.equal(secretFieldDeny.code, EY_CODES.SECRET_FIELD_FORBIDDEN);
    assert.ok(secretFieldDeny.receipt.receiptId.startsWith('EY-RCPT-'));
    // Law VI: DENY receipt seal body must not embed the secret-looking value
    const denySeal = canonicalExternalEventIngressRegistrySealBody(secretFieldDeny.receipt);
    assert.equal(findSecretLookingField(denySeal), null);
    assert.ok(!JSON.stringify(denySeal).includes('should-never-seal'));

    const liveDeny = await denyPort.govern({
      planId: 'plan-ey-live-deny',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      instruction: 'bind live webhook endpoint with live webhook endpoint',
      binding: makeMockBinding()
    });
    assert.equal(liveDeny.ok, false);
    assert.equal(liveDeny.decision, 'DENY');
    assert.equal(liveDeny.code, EY_CODES.LIVE_WEBHOOK_ENDPOINT_FORBIDDEN);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ey-autoseal',
      changeId: 'eos-ladder-39-mission-ey',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      binding: makeMockBinding()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EY_CODES.AUTO_SEAL_FORBIDDEN);

    // Gate code surface smoke
    assert.equal(EY_CODES.SECRET_FIELD_FORBIDDEN, 'SECRET_FIELD_FORBIDDEN');
    assert.equal(EY_CODES.L38_REOPEN_FORBIDDEN, 'L38_REOPEN_FORBIDDEN');
    assert.equal(EY_CODES.L39_AUTO_CLOSE_FORBIDDEN, 'L39_AUTO_CLOSE_FORBIDDEN');
    assert.equal(EY_CODES.L37_REOPEN_FORBIDDEN, 'L37_REOPEN_FORBIDDEN');
  });
});
