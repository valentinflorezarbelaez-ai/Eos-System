/**
 * Mission EM — Capacity Honesty & Admission Attestation Port Test Suite.
 * SPEC-0149 / ADR-0128.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 933f32ae (do NOT rewrite tip pins)
 * - PASS = hermetic honesty attestation ≠ live metrics ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L35; refuse L36 auto-close
 * - Live-metrics honesty lie / schema-json add / tip-rewrite refused; soft-observe ≠ capacity truth; distinct from EJ/EK/EL/EH
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EM_PRODUCTION_READY,
  EM_RECEIPT_PRODUCTION_READY,
  EM_RECEIPT_KIND,
  EM_FREEZE_PIN_SHORT,
  buildCapacityHonestyAttestationReceipt,
  verifyCapacityHonestyAttestationReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/capacity-honesty-attestation-receipt.js';

import {
  CapacityHonestyAttestationPolicyGate,
  EM_CODES,
  EM_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsSchemaJsonAdd,
  claimsLiveMetricsHonestyLie,
  isFundacionTarget
} from '../src/core/composition/capacity-honesty-attestation-policy-gate.js';

import {
  CapacityHonestyAttestationPort,
  EM_PORT_PRODUCTION_READY,
  EM_PORT_KIND
} from '../src/core/composition/capacity-honesty-attestation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockHonestyClaims(overrides = {}) {
  return {
    softObserveFreeze: true,
    noLiveMetrics: true,
    productionReadyNo: true,
    schemasAtCeiling: true,
    ...overrides
  };
}

function makeMockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EL-RCPT-0001',
    subjectKind: 'BULKHEAD',
    honestyClaims: makeMockHonestyClaims(),
    ...overrides
  };
}

describe('Mission EM — Capacity Honesty Attestation Receipt (SPEC-0149)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EM1: declares PRODUCTION_READY=NO across receipt/gate/port + freeze pin 933f32ae', () => {
    assert.equal(EM_PRODUCTION_READY, 'NO');
    assert.equal(EM_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EM_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EM_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EM_FREEZE_PIN_SHORT, '933f32ae');
  });

  it('EM2: builds canonical nine-field sealed EM-RCPT-* with freeze soft-observe + ceiling hold + attestation hold', () => {
    const receipt = buildCapacityHonestyAttestationReceipt({
      planId: 'plan-em-01',
      changeId: 'eos-ladder-36-mission-em',
      decision: 'PASS',
      attestation: makeMockAttestation()
    });

    assert.equal(receipt.kind, EM_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EM-RCPT-'));
    assert.equal(receipt.operation, 'CAPACITY_HONESTY_ADMISSION_ATTESTATION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '933f32ae');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.l35ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l34ReopenRefused, true);
    assert.equal(receipt.freezeObserve.liveMetricsClaimRefused, true);
    assert.equal(receipt.freezeObserve.productionReadyFlipRefused, true);
    assert.equal(receipt.freezeObserve.schemaJsonAddRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.attestationHold.liveMetricsClaimRefused, true);
    assert.equal(receipt.attestationHold.wallClockCapacityAuthorityRefused, true);
    assert.equal(receipt.attestationHold.tipRewriteRefused, true);
    assert.equal(receipt.attestationHold.schemaJsonAddRefused, true);
    assert.equal(receipt.attestationHold.productionReadyFlipRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.attestationDigest, 'string');
    assert.equal(receipt.attestationDigest.length, 64);
  });

  it('EM3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCapacityHonestyAttestationReceipt({
      planId: 'plan-em-tamper',
      changeId: 'eos-ladder-36-mission-em',
      decision: 'PASS'
    });

    assert.equal(verifyCapacityHonestyAttestationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCapacityHonestyAttestationReceipt(tampered).ok, false);
  });
});

describe('Mission EM — Capacity Honesty Attestation Policy Gate (SPEC-0149)', () => {
  it('EM4: validates well-formed plan (planId+changeId+ACTIVE+attestation subjectKind/honestyClaims)', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();
    const attestation = makeMockAttestation({ subjectKind: 'ADMISSION' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-em-valid',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EM_CODES.OK);
  });

  it('EM5: rejects missing attestation or invalid attestation', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-em-noatt',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EM_CODES.MISSING_ATTESTATION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-em-invalidatt',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EM_CODES.INVALID_ATTESTATION);
  });

  it('EM6: rejects missing subjectKind / invalid subjectKind', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-em-nokind',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: '' })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, EM_CODES.MISSING_SUBJECT_KIND);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-em-badkind',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ subjectKind: 'QUOTA' })
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.code, EM_CODES.INVALID_SUBJECT_KIND);
  });

  it('EM7: DENY missing honestyClaims + invalid honestyClaims', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const missing = gate.evaluatePreconditions({
      planId: 'plan-em-noclaims',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({ honestyClaims: null })
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.decision, 'DENY');
    assert.equal(missing.code, EM_CODES.MISSING_HONESTY_CLAIMS);

    const invalid = gate.evaluatePreconditions({
      planId: 'plan-em-badclaims',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation({
        honestyClaims: makeMockHonestyClaims({ noLiveMetrics: false })
      })
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.decision, 'DENY');
    assert.equal(invalid.code, EM_CODES.INVALID_HONESTY_CLAIMS);
  });

  it('EM8: rejects live-metrics honesty lie and schema-json add', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const lie = gate.evaluatePreconditions({
      planId: 'plan-em-lie',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live metrics authority wall-clock capacity',
      attestation: makeMockAttestation()
    });
    assert.equal(lie.ok, false);
    assert.equal(lie.code, EM_CODES.LIVE_METRICS_HONESTY_LIE);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-em-schema',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-capacity-honesty.json',
      attestation: makeMockAttestation()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EM_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsLiveMetricsHonestyLie('live metrics authority'), true);
    assert.equal(claimsSchemaJsonAdd('add docs/schemas/x.json'), true);
  });

  it('EM9: allows HOLD mode with zero mutations', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-em-hold',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EM_CODES.HOLD);
  });

  it('EM10: PASS for all subjectKinds ADMISSION|LOAD_SHED|BULKHEAD|COMPOSITE', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();
    for (const kind of ['ADMISSION', 'LOAD_SHED', 'BULKHEAD', 'COMPOSITE']) {
      const res = gate.evaluatePreconditions({
        planId: `plan-em-${kind.toLowerCase()}`,
        changeId: 'eos-ladder-36-mission-em',
        ritualMode: 'ACTIVE',
        attestation: makeMockAttestation({ subjectKind: kind })
      });
      assert.equal(res.ok, true, kind);
      assert.equal(res.decision, 'PASS', kind);
    }
  });

  it('EM11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-em-del1',
      changeId: 'eos-ladder-36-mission-em',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EM_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-em-del2',
      changeId: 'eos-ladder-36-mission-em',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EM_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EM12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-em-secret',
      changeId: 'eos-ladder-36-mission-em',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EM_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EM13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-em-fundacion',
      changeId: 'eos-ladder-36-mission-em',
      target: 'Documents/Fundacion/attestation'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EM_CODES.FUNDACION_DENIED);
  });

  it('EM14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L35 reopen, L36 auto-close, mass prune, GHE', () => {
    const gate = new CapacityHonestyAttestationPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-em-pr',
      changeId: 'eos-ladder-36-mission-em',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-em-l30',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EM_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-em-l31',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EM_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-em-l32',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EM_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-em-l33',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EM_CODES.L33_REOPEN_FORBIDDEN);

    const l34Res = gate.evaluatePreconditions({
      planId: 'plan-em-l34',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-34'
    });
    assert.equal(l34Res.ok, false);
    assert.equal(l34Res.code, EM_CODES.L34_REOPEN_FORBIDDEN);

    const l35Res = gate.evaluatePreconditions({
      planId: 'plan-em-l35',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'reopen ladder-35'
    });
    assert.equal(l35Res.ok, false);
    assert.equal(l35Res.code, EM_CODES.L35_REOPEN_FORBIDDEN);

    const l36CloseRes = gate.evaluatePreconditions({
      planId: 'plan-em-l36-close',
      changeId: 'eos-ladder-36-mission-em',
      instruction: 'auto-close ladder-36 now'
    });
    assert.equal(l36CloseRes.ok, false);
    assert.equal(l36CloseRes.code, EM_CODES.L36_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-em-tip',
      changeId: 'eos-ladder-36-mission-em',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EM_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-em-mass',
      changeId: 'eos-ladder-36-mission-em',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EM_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-em-ghe',
      changeId: 'eos-ladder-36-mission-em',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EM_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EM — Capacity Honesty Attestation Port (SPEC-0149)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EM15: govern happy path ACTIVE + attestation -> PASS + EM-RCPT-* (≠ wall-clock capacity ≠ tip-refresh)', async () => {
    const port = new CapacityHonestyAttestationPort();
    const attestation = makeMockAttestation({ subjectKind: 'LOAD_SHED' });

    const res = await port.govern({
      planId: 'plan-em-pass',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EM-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.attestationHold.liveMetricsClaimRefused, true);
    assert.equal(res.receipt.attestationHold.hermeticInMemoryOnly, true);
    assert.equal(res.receipt.attestationHold.wallClockCapacityAuthorityRefused, true);
    assert.equal(res.receipt.attestationHold.productionReadyFlipRefused, true);
    assert.equal(res.receipt.freezeObserve.liveMetricsClaimRefused, true);
    assert.equal(res.receipt.freezeObserve.l36AutoCloseRefused, true);
    assert.equal(typeof res.receipt.attestationDigest, 'string');
    assert.equal(res.receipt.attestationDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EM_PORT_KIND, 'eos-capacity-honesty-attestation-port');
  });

  it('EM16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new CapacityHonestyAttestationPort();

    const res = await port.govern({
      planId: 'plan-em-hold',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EM17: verifyTrail + live-metrics-lie deny + auto-seal refuse', async () => {
    const port = new CapacityHonestyAttestationPort();

    await port.govern({
      planId: 'plan-em-trail-01',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      attestation: makeMockAttestation()
    });

    await port.govern({
      planId: 'plan-em-trail-02',
      changeId: 'eos-ladder-36-mission-em',
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

    const liePort = new CapacityHonestyAttestationPort();
    const lieDeny = await liePort.govern({
      planId: 'plan-em-lie-deny',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      instruction: 'claiming live metrics authority',
      attestation: makeMockAttestation()
    });
    assert.equal(lieDeny.ok, false);
    assert.equal(lieDeny.decision, 'DENY');
    assert.equal(lieDeny.code, EM_CODES.LIVE_METRICS_HONESTY_LIE);
    assert.ok(lieDeny.receipt.receiptId.startsWith('EM-RCPT-'));

    const autoSealRes = await liePort.govern({
      planId: 'plan-em-autoseal',
      changeId: 'eos-ladder-36-mission-em',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      attestation: makeMockAttestation()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EM_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
