/**
 * Mission EH — Temporal Honesty & Deadline Attestation Port Test Suite.
 * SPEC-0144 / ADR-0122.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin ff4b6d19 (do NOT rewrite tip pins)
 * - PASS = hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L34; refuse L35 auto-close
 * - Live-timer honesty lie / schema-json add / tip-rewrite refused
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EH_PRODUCTION_READY,
  EH_RECEIPT_PRODUCTION_READY,
  EH_RECEIPT_KIND,
  EH_FREEZE_PIN_SHORT,
  buildTemporalHonestyAttestationReceipt,
  verifyTemporalHonestyAttestationReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/temporal-honesty-attestation-receipt.js';

import {
  TemporalHonestyAttestationPolicyGate,
  EH_CODES,
  EH_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveTimerHonestyLie,
  isFundacionTarget
} from '../src/core/composition/temporal-honesty-attestation-policy-gate.js';

import {
  TemporalHonestyAttestationPort,
  EH_PORT_PRODUCTION_READY,
  EH_PORT_KIND
} from '../src/core/composition/temporal-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveTimer: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EG-RCPT-0001',
    subjectKind: 'COMPENSATION',
    honestyClaims: makeMockHonestyClaims(),
    ...overrides
  };
}

describe('Mission EH — Temporal Honesty Attestation Receipt (SPEC-0144)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EH1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin ff4b6d19', () => {
    assert.equal(EH_PRODUCTION_READY, 'NO');
    assert.equal(EH_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EH_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EH_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EH_FREEZE_PIN_SHORT, 'ff4b6d19');
  });

  it('EH2: builds canonical nine-field sealed EH-RCPT-* with freeze soft-observe + ceiling hold + attestation hold', () => {
    const receipt = buildTemporalHonestyAttestationReceipt({
      planId: 'plan-eh-01',
      changeId: 'eos-ladder-35-mission-eh',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, EH_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EH-RCPT-'));
    assert.equal(receipt.operation, 'TEMPORAL_HONESTY_DEADLINE_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'ff4b6d19');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l34ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveTimerClaimRefused, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.liveTimerClaimRefused, true);
    assert.equal(receipt.attestationHold.wallClockAuthorityRefused, true);
    assert.equal(receipt.attestationHold.tipRewriteRefused, true);
    assert.equal(receipt.attestationHold.schemaJsonAddRefused, true);
    assert.equal(receipt.attestationHold.productionReadyFlipRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.attestationDigest, 'string');
    assert.equal(receipt.attestationDigest.length, 64);
  });

  it('EH3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildTemporalHonestyAttestationReceipt({
      planId: 'plan-eh-tamper',
      changeId: 'eos-ladder-35-mission-eh',
      decision: 'PASS'
    });

    assert.equal(verifyTemporalHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyTemporalHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission EH — Temporal Honesty Attestation Policy Gate (SPEC-0144)', () => {
  it('EH4: validates well-formed plan (planId+changeId+ACTIVE+attestation subjectKind/honestyClaims)', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({ subjectKind: 'DEADLINE' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-eh-valid',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EH_CODES.OK);
  });

  it('EH5: rejects missing attestation or invalid attestation', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eh-noatt',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EH_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eh-invalidatt',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EH_CODES.INVALID_ATTESTATION);
  });

  it('EH6: rejects missing subjectKind / invalid subjectKind', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-eh-nokind',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, EH_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-eh-badkind',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'TIMER' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, EH_CODES.INVALID_SUBJECT_KIND);
  });

  it('EH7: DENY missing honestyClaims + invalid honestyClaims', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-eh-noclaims',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, EH_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-eh-badclaims',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveTimer: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, EH_CODES.INVALID_HONESTY_CLAIMS);
  });

  it('EH8: rejects live-timer honesty lie and schema-json add', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-eh-lie',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live timer authority wall-clock',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, EH_CODES.LIVE_TIMER_HONESTY_LIE);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-eh-schema',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-temporal-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EH_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveTimerHonestyLie('live timer authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EH9: allows HOLD mode with zero mutations', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eh-hold',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EH_CODES.HOLD);
  });

  it('EH10: PASS for all subjectKinds DEADLINE|SCHEDULE|COMPENSATION|COMPOSITE', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();
    for (const kind of ['DEADLINE', 'SCHEDULE', 'COMPENSATION', 'COMPOSITE']) {
      const res = gate.evaluatePreconditions({
        planId: `plan-eh-${kind.toLowerCase()}`,
        changeId: 'eos-ladder-35-mission-eh',
        ritualMode: 'ACTIVE',
        attestation: makeMockAttestation({ subjectKind: kind })
      });
      assert.equal(res.ok, true, kind);
      assert.equal(res.decision, 'PASS', kind);
    }
  });

  it('EH11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-eh-del1',
      changeId: 'eos-ladder-35-mission-eh',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EH_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-eh-del2',
      changeId: 'eos-ladder-35-mission-eh',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EH_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EH12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eh-secret',
      changeId: 'eos-ladder-35-mission-eh',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EH_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EH13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-eh-fundacion',
      changeId: 'eos-ladder-35-mission-eh',
      target: 'Documents/Fundacion/attestation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EH_CODES.FUNDACION_DENIED);
  });

  it('EH14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L34 reopen, L35 auto-close, mass prune, GHE', () => {
    const gate = new TemporalHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-eh-pr',
      changeId: 'eos-ladder-35-mission-eh',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EH_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-eh-l30',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EH_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-eh-l31',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EH_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-eh-l32',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EH_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-eh-l33',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EH_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-eh-l34',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EH_CODES.L34_REOPEN_FORBIDDEN);

    const l35CloseRes = gate.evaluatePreconditions({
      planId: 'plan-eh-l35-close',
      changeId: 'eos-ladder-35-mission-eh',
      instruction: 'auto-close ladder-35 now'
    });
    assert.equal(l35CloseRes.ok, false);
    assert.equal(l35CloseRes.code, EH_CODES.L35_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-eh-tip',
      changeId: 'eos-ladder-35-mission-eh',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EH_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-eh-mass',
      changeId: 'eos-ladder-35-mission-eh',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EH_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-eh-ghe',
      changeId: 'eos-ladder-35-mission-eh',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EH_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EH — Temporal Honesty Attestation Port (SPEC-0144)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EH15: govern happy path ACTIVE + attestation -> PASS + EH-RCPT-* (≠ wall-clock ≠ tip-refresh)', async () => {
    const port = new TemporalHonestyAttestationPort();
    const attestation = makeMockAttestation({ subjectKind: 'SCHEDULE' });

    const res = await port.govern({
      planId: 'plan-eh-pass',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EH-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.attestationHold.liveTimerClaimRefused, true);
    assert.equal(res.receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.attestationHold.wallClockAuthorityRefused, true);
    assert.equal(res.receipt.attestationHold.productionReadyFlipRefused, true);
    assert.equal(res.receipt.freezeObserve.liveTimerClaimRefused, true);
    assert.equal(res.receipt.freezeObserve.l35AutoCloseRefused, true);
    assert.equal(typeof res.receipt.attestationDigest, 'string');
    assert.equal(res.receipt.attestationDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EH_PORT_KIND, 'eos-temporal-honesty-attestation-port');
  });

  it('EH16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new TemporalHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-eh-hold',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EH17: verifyTrail + live-timer-lie deny + auto-seal refuse', async () => {
    const port = new TemporalHonestyAttestationPort();

    await port.govern({
      planId: 'plan-eh-trail-01',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-eh-trail-02',
      changeId: 'eos-ladder-35-mission-eh',
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

    const liePort = new TemporalHonestyAttestationPort();
    const lieDeny = await liePort.govern({
      planId: 'plan-eh-lie-deny',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live timer authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lieDeny.ok, false);
    assert.equal(lieDeny.decision, 'DENY');
    assert.equal(lieDeny.code, EH_CODES.LIVE_TIMER_HONESTY_LIE);
    assert.ok(lieDeny.receipt.receiptId.startsWith('EH-RCPT-'));

    const autoSealRes = await liePort.govern({
      planId: 'plan-eh-autoseal',
      changeId: 'eos-ladder-35-mission-eh',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EH_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
