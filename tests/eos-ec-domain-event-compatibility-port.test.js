/**
 * Mission EC — Domain Event Compatibility Port Test Suite.
 * SPEC-0139 / ADR-0116.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 19b353d8 (do NOT rewrite tip pins)
 * - PASS = sealed compatibility ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L33; refuse L34 auto-close
 * - Schema-json add / tip-rewrite / BREAKING / RENAME_FORBIDDEN refused
 * - PASS only for COMPATIBLE / ADD_OPTIONAL_FIELD (hermetic)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EC_PRODUCTION_READY,
  EC_RECEIPT_PRODUCTION_READY,
  EC_RECEIPT_KIND,
  EC_FREEZE_PIN_SHORT,
  buildDomainEventCompatibilityReceipt,
  verifyDomainEventCompatibilityReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/domain-event-compatibility-receipt.js';

import {
  DomainEventCompatibilityPolicyGate,
  EC_CODES,
  EC_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsBreakingWithoutDenyMisuse,
  isFundacionTarget
} from '../src/core/composition/domain-event-compatibility-policy-gate.js';

import {
  DomainEventCompatibilityPort,
  EC_PORT_PRODUCTION_READY,
  EC_PORT_KIND
} from '../src/core/composition/domain-event-compatibility-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockEvolution(overrides = {}) {
  return {
    eventType: 'OrderPlaced',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    changeKind: 'COMPATIBLE',
    contractDigest: 'b'.repeat(64),
    ...overrides
  };
}

describe('Mission EC — Domain Event Compatibility Receipt (SPEC-0139)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EC1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 19b353d8', () => {
    assert.equal(EC_PRODUCTION_READY, 'NO');
    assert.equal(EC_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EC_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EC_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EC_FREEZE_PIN_SHORT, '19b353d8');
  });

  it('EC2: builds canonical nine-field sealed EC-RCPT-* with freeze soft-observe + ceiling hold + compatibility hold', () => {
    const receipt = buildDomainEventCompatibilityReceipt({
      planId: 'plan-ec-01',
      changeId: 'eos-ladder-34-mission-ec',
      decision: 'PASS',
      evolution: makeMockEvolution()
    });

    assert.equal(receipt.kind, EC_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EC-RCPT-'));
    assert.equal(receipt.operation, 'DOMAIN_EVENT_COMPATIBILITY_GATE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '19b353d8');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l33ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.compatibilityHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.compatibilityHold.schemaJsonAddRefused, true);
    assert.equal(receipt.compatibilityHold.networkWriteRefused, true);
    assert.equal(receipt.compatibilityHold.tipRewriteRefused, true);
    assert.equal(receipt.compatibilityHold.breakingWithoutDenyRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.compatibilityDigest, 'string');
    assert.equal(receipt.compatibilityDigest.length, 64);
  });

  it('EC3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildDomainEventCompatibilityReceipt({
      planId: 'plan-ec-tamper',
      changeId: 'eos-ladder-34-mission-ec',
      decision: 'PASS'
    });

    assert.equal(verifyDomainEventCompatibilityReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyDomainEventCompatibilityReceipt(tampered).ok, false);
  });
});

describe('Mission EC — Domain Event Compatibility Policy Gate (SPEC-0139)', () => {
  it('EC4: validates well-formed plan (planId+changeId+ACTIVE+COMPATIBLE evolution)', () => {
    const gate = new DomainEventCompatibilityPolicyGate();
    const evolution = makeMockEvolution();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ec-valid',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      evolution
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EC_CODES.OK);
  });

  it('EC5: rejects missing evolution or invalid evolution', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ec-noevo',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EC_CODES.MISSING_EVOLUTION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ec-invalidevo',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EC_CODES.INVALID_EVOLUTION);
  });

  it('EC6: rejects missing eventType / changeKind', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const resType = gate.evaluatePreconditions({
      planId: 'plan-ec-notype',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ eventType: '' })
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, EC_CODES.MISSING_EVENT_TYPE);

    const resKind = gate.evaluatePreconditions({
      planId: 'plan-ec-nokind',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: '   ' })
    });
    assert.equal(resKind.ok, false);
    assert.equal(resKind.code, EC_CODES.MISSING_CHANGE_KIND);
  });

  it('EC7: DENY BREAKING and RENAME_FORBIDDEN with sealed deny path codes', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const breaking = gate.evaluatePreconditions({
      planId: 'plan-ec-breaking',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: 'BREAKING' })
    });
    assert.equal(breaking.ok, false);
    assert.equal(breaking.decision, 'DENY');
    assert.equal(breaking.code, EC_CODES.BREAKING_CHANGE_DENIED);

    const rename = gate.evaluatePreconditions({
      planId: 'plan-ec-rename',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: 'RENAME_FORBIDDEN' })
    });
    assert.equal(rename.ok, false);
    assert.equal(rename.decision, 'DENY');
    assert.equal(rename.code, EC_CODES.RENAME_FORBIDDEN_DENIED);
  });

  it('EC8: rejects breaking-without-deny misuse and schema-json add', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const misuse = gate.evaluatePreconditions({
      planId: 'plan-ec-misuse',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      forceAllowBreaking: true,
      evolution: makeMockEvolution()
    });
    assert.equal(misuse.ok, false);
    assert.equal(misuse.code, EC_CODES.BREAKING_WITHOUT_DENY_MISUSE);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ec-schema',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-event-compat.json',
      evolution: makeMockEvolution()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EC_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsBreakingWithoutDenyMisuse('force-allow breaking'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EC9: allows HOLD mode with zero mutations', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ec-hold',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EC_CODES.HOLD);
  });

  it('EC10: allows ADD_OPTIONAL_FIELD as compatible evolution', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ec-optional',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: 'ADD_OPTIONAL_FIELD' })
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EC_CODES.OK);
  });

  it('EC11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ec-del1',
      changeId: 'eos-ladder-34-mission-ec',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EC_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ec-del2',
      changeId: 'eos-ladder-34-mission-ec',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EC_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EC12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new DomainEventCompatibilityPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ec-secret',
      changeId: 'eos-ladder-34-mission-ec',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EC_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EC13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ec-fundacion',
      changeId: 'eos-ladder-34-mission-ec',
      target: 'Documents/Fundacion/compat'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EC_CODES.FUNDACION_DENIED);
  });

  it('EC14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L33 reopen, L34 auto-close, mass prune, GHE', () => {
    const gate = new DomainEventCompatibilityPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ec-pr',
      changeId: 'eos-ladder-34-mission-ec',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EC_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ec-l30',
      changeId: 'eos-ladder-34-mission-ec',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EC_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ec-l31',
      changeId: 'eos-ladder-34-mission-ec',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EC_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ec-l32',
      changeId: 'eos-ladder-34-mission-ec',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EC_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ec-l33',
      changeId: 'eos-ladder-34-mission-ec',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EC_CODES.L33_REOPEN_FORBIDDEN);

    const l34CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ec-l34-close',
      changeId: 'eos-ladder-34-mission-ec',
      instruction: 'auto-close ladder-34 now'
    });
    assert.equal(l34CloseRes.ok, false);
    assert.equal(l34CloseRes.code, EC_CODES.L34_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ec-tip',
      changeId: 'eos-ladder-34-mission-ec',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EC_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ec-mass',
      changeId: 'eos-ladder-34-mission-ec',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EC_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ec-ghe',
      changeId: 'eos-ladder-34-mission-ec',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EC_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EC — Domain Event Compatibility Port (SPEC-0139)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EC15: govern happy path ACTIVE + COMPATIBLE evolution -> PASS + EC-RCPT-* (≠ schema JSON ≠ network write)', async () => {
    const port = new DomainEventCompatibilityPort();
    const evolution = makeMockEvolution();

    const res = await port.govern({
      planId: 'plan-ec-pass',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EC-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.compatibilityHold.networkWriteRefused, true);
    assert.equal(res.receipt.compatibilityHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.compatibilityHold.schemaJsonAddRefused, true);
    assert.equal(res.receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(res.receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(typeof res.receipt.compatibilityDigest, 'string');
    assert.equal(res.receipt.compatibilityDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EC_PORT_KIND, 'eos-domain-event-compatibility-port');
  });

  it('EC16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new DomainEventCompatibilityPort();

    const res = await port.govern({
      planId: 'plan-ec-hold',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EC17: verifyTrail + BREAKING deny seal + ADD_OPTIONAL_FIELD pass + auto-seal refuse', async () => {
    const port = new DomainEventCompatibilityPort();

    await port.govern({
      planId: 'plan-ec-trail-01',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution()
    });

    await port.govern({
      planId: 'plan-ec-trail-02',
      changeId: 'eos-ladder-34-mission-ec',
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

    const denyPort = new DomainEventCompatibilityPort();
    const breakingRes = await denyPort.govern({
      planId: 'plan-ec-breaking-seal',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: 'BREAKING' })
    });
    assert.equal(breakingRes.ok, false);
    assert.equal(breakingRes.decision, 'DENY');
    assert.equal(breakingRes.code, EC_CODES.BREAKING_CHANGE_DENIED);
    assert.ok(breakingRes.receipt.receiptId.startsWith('EC-RCPT-'));
    assert.equal(breakingRes.receipt.decision, 'DENY');

    const optionalRes = await denyPort.govern({
      planId: 'plan-ec-optional-pass',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      evolution: makeMockEvolution({ changeKind: 'ADD_OPTIONAL_FIELD' })
    });
    assert.equal(optionalRes.ok, true);
    assert.equal(optionalRes.decision, 'PASS');
    assert.ok(optionalRes.reason && optionalRes.reason.includes('compatible'));
    assert.equal(optionalRes.receipt.compatibilityHold.hermeticInMemoryOnly, true);
    assert.equal(optionalRes.receipt.compatibilityHold.schemaJsonAddRefused, true);
    assert.equal(optionalRes.receipt.compatibilityHold.governedSealOnly, true);

    const autoSealRes = await denyPort.govern({
      planId: 'plan-ec-autoseal',
      changeId: 'eos-ladder-34-mission-ec',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      evolution: makeMockEvolution()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EC_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
