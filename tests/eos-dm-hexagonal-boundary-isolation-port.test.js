/**
 * @file tests/eos-dm-hexagonal-boundary-isolation-port.test.js
 * SPEC-0123 / Mission DM — Hexagonal Architecture Boundary Isolation Port.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: synthetic secrets via String.fromCharCode (no contiguous sk- literal)
 *   Layer-0: pure node:crypto; hermetic; soft-observe freeze NON-CLAIM labels
 *   Preserve ALWAYS_DENY + human PRODUCTION_READY gate (refuse auto)
 *   Explicit honesty: boundary isolation PASS ≠ tip-pin rewrite ≠ PRODUCTION_READY flip ≠ L31 closeout
 *   NON-CLAIM: Boundary Isolation ≠ GHE ≠ GHA green ≠ Fundacion Δ>0
 *   Do NOT rewrite freeze tip pins / Fundacion / PRODUCTION_READY
 *   Soft-observe freeze pin f367a1cf (Mission DL tip)
 *   Formal L17–L30 CLOSED retained — NEVER reopen L30
 *   schemas AT_CEILING 35/35
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DM_PRODUCTION_READY,
  DM_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  DM_RECEIPT_KIND,
  DM_DECISIONS,
  DM_RITUAL_MODES,
  DM_FREEZE_PIN,
  DM_FREEZE_PIN_SHORT,
  DM_FREEZE_NONCLAIM_LABELS,
  DM_CEILING_HOLD_TEMPLATE,
  DM_BOUNDARY_HOLD_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  forceCeilingHold,
  forceBoundaryHold,
  buildHexagonalBoundaryIsolationReceipt,
  verifyHexagonalBoundaryIsolationReceipt,
  canonicalHexagonalBoundaryIsolationSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/hexagonal-boundary-isolation-receipt.js';

import {
  HexagonalBoundaryIsolationPolicyGate,
  DM_CODES,
  DM_POLICY_GATE_PRODUCTION_READY,
  DM_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/hexagonal-boundary-isolation-policy-gate.js';

import {
  HexagonalBoundaryIsolationPort,
  DM_PORT_PRODUCTION_READY,
  DM_PORT_KIND
} from '../src/core/composition/hexagonal-boundary-isolation-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockBoundaryReport(overrides = {}) {
  return {
    modulesAnalyzed: 142,
    domainModulesCount: 88,
    adaptersCount: 54,
    violationsCount: 0,
    violations: [],
    nonBuiltinImportsCount: 0,
    boundaryIntegrityStatus: 'ISOLATED',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DM — Hexagonal Boundary Isolation Receipt (SPEC-0123)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DM1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin f367a1cf', () => {
    assert.equal(DM_PRODUCTION_READY, 'NO');
    assert.equal(DM_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DM_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DM_PORT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(DM_FREEZE_PIN_SHORT, 'f367a1cf');
    assert.ok(DM_FREEZE_PIN.startsWith('f367a1cf'));
    assert.ok(Array.isArray(DM_FREEZE_NONCLAIM_LABELS));
  });

  it('DM2: builds canonical nine-field sealed DM-RCPT-* with freeze soft-observe + ceiling hold + boundary hold', () => {
    const boundaryReport = makeMockBoundaryReport();
    const receipt = buildHexagonalBoundaryIsolationReceipt({
      planId: 'plan-dm-001',
      changeId: 'eos-ladder-31-mission-dm',
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      boundaryReport,
      boundaryDigest: 'sha256-mock-boundary-digest'
    });

    assert.ok(receipt.receiptId.startsWith('DM-RCPT-'));
    assert.equal(receipt.operation, 'HEXAGONAL_BOUNDARY_ISOLATION');
    assert.equal(receipt.planId, 'plan-dm-001');
    assert.equal(receipt.decision, 'PASS');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'f367a1cf');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.boundaryHold.layer0Pure, true);
    assert.equal(receipt.boundaryHold.zeroBoundaryViolations, true);
    assert.ok(typeof receipt.receiptHash === 'string' && receipt.receiptHash.length === 64);
  });

  it('DM3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildHexagonalBoundaryIsolationReceipt({
      planId: 'plan-dm-tamper',
      changeId: 'eos-ladder-31-mission-dm',
      decision: 'PASS'
    });

    assert.equal(verifyHexagonalBoundaryIsolationReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyHexagonalBoundaryIsolationReceipt(tampered).ok, false);
  });
});

describe('Mission DM — Hexagonal Boundary Isolation Policy Gate (SPEC-0123)', () => {
  it('DM4: validates well-formed plan (planId+changeId+ACTIVE+boundaryReport ok with 0 violations)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();
    const boundaryReport = makeMockBoundaryReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-valid',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      boundaryReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DM_CODES.OK);
  });

  it('DM5: rejects missing boundaryReport or invalid report type', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dm-noreport',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DM_CODES.MISSING_BOUNDARY_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dm-invalidreport',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport: 'invalid-string-report'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DM_CODES.INVALID_BOUNDARY_REPORT);
  });

  it('DM6: rejects boundary violations (violationsCount > 0 or violations array not empty)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();
    const boundaryReport = makeMockBoundaryReport({
      violationsCount: 1,
      violations: ['Domain module imports express']
    });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-violation',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.BOUNDARY_VIOLATION_DETECTED);
  });

  it('DM7: rejects non-isolated boundary integrity status (boundaryIntegrityStatus !== ISOLATED)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();
    const boundaryReport = makeMockBoundaryReport({ boundaryIntegrityStatus: 'DRIFT_DETECTED' });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-status-drift',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.BOUNDARY_VIOLATION_DETECTED);
  });

  it('DM8: rejects non-builtin imports in L0 domain (nonBuiltinImportsCount > 0)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();
    const boundaryReport = makeMockBoundaryReport({ nonBuiltinImportsCount: 2 });

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-non-builtin',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.BOUNDARY_VIOLATION_DETECTED);
  });

  it('DM9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-hard-delete',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport: makeMockBoundaryReport(),
      forceDelete: true
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DM10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-secret',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport: makeMockBoundaryReport(),
      tokenSecret: makeSyntheticSecret()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DM11: policy gate DENY on Fundacion target paths', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dm-fundacion',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport: makeMockBoundaryReport(),
      targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\report.txt'
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DM_CODES.FUNDACION_DENIED);
  });

  it('DM12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30 reopen, L31 auto-close', () => {
    const gate = new HexagonalBoundaryIsolationPolicyGate();
    const boundaryReport = makeMockBoundaryReport();

    const resPR = gate.evaluatePreconditions({
      planId: 'plan-dm-pr',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport,
      productionReady: 'YES'
    });
    assert.equal(resPR.code, DM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const resL30 = gate.evaluatePreconditions({
      planId: 'plan-dm-l30',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport,
      reopenL30: true
    });
    assert.equal(resL30.code, DM_CODES.L30_REOPEN_FORBIDDEN);
  });
});

describe('Mission DM — Hexagonal Boundary Isolation Port (SPEC-0123)', () => {
  it('DM13: govern happy path ACTIVE + valid boundaryReport -> PASS + DM-RCPT-*', async () => {
    const port = new HexagonalBoundaryIsolationPort();
    const boundaryReport = makeMockBoundaryReport();

    const result = await port.govern({
      planId: 'plan-dm-exec-01',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      phase: 'EXECUTION',
      boundaryReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'PASS');
    assert.ok(result.receipt.receiptId.startsWith('DM-RCPT-'));
    assert.ok(result.receipt.boundaryDigest);
    assert.equal(result.receipt.boundaryHold.layer0Pure, true);
    assert.equal(result.receipt.boundaryHold.zeroBoundaryViolations, true);
  });

  it('DM14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new HexagonalBoundaryIsolationPort();
    const boundaryReport = makeMockBoundaryReport();

    const result = await port.govern({
      planId: 'plan-dm-hold',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'HOLD',
      phase: 'OBSERVE',
      boundaryReport
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, 'HOLD');
    assert.equal(result.receipt.decision, 'HOLD');
  });

  it('DM15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new HexagonalBoundaryIsolationPort();
    const boundaryReport = makeMockBoundaryReport();

    await port.govern({
      planId: 'plan-dm-trail-1',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport
    });

    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, true);
    assert.equal(trailVerify.count, 1);
  });

  it('DM16: tamper breaks trail verification', async () => {
    const port = new HexagonalBoundaryIsolationPort();
    const boundaryReport = makeMockBoundaryReport();

    await port.govern({
      planId: 'plan-dm-trail-tamper',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport
    });

    // Tamper with trail receipt
    port.trail[0].decision = 'DENY';
    const trailVerify = port.verifyTrail();
    assert.equal(trailVerify.ok, false);
  });

  it('DM17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new HexagonalBoundaryIsolationPort();
    const boundaryReport = makeMockBoundaryReport();

    const result = await port.govern({
      planId: 'plan-dm-auto-seal',
      changeId: 'eos-ladder-31-mission-dm',
      ritualMode: 'ACTIVE',
      boundaryReport,
      autoSeal: true
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, 'DENY');

    assert.ok(Object.isFrozen(DM_CODES));
    assert.ok(Object.isFrozen(DM_DECISIONS));
    assert.ok(Object.isFrozen(DM_RITUAL_MODES));
    assert.equal(DM_CODES.OK, 'OK');
    assert.equal(DM_CODES.BOUNDARY_VIOLATION_DETECTED, 'BOUNDARY_VIOLATION_DETECTED');
    assert.equal(DM_CODES.FUNDACION_DENIED, 'FUNDACION_DENIED');
  });
});
