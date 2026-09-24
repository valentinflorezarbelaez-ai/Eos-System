/**
 * Mission DS — Contract-First Formal Data Contract Notary Port Test Suite.
 * SPEC-0129 / ADR-0104.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 2ff91794
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DS_PRODUCTION_READY,
  DS_RECEIPT_PRODUCTION_READY,
  DS_RECEIPT_KIND,
  DS_FREEZE_PIN_SHORT,
  buildDataContractNotaryReceipt,
  verifyDataContractNotaryReceipt,
  canonicalDataContractNotarySealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/data-contract-notary-receipt.js';

import {
  DataContractNotaryPolicyGate,
  DS_CODES,
  DS_POLICY_GATE_PRODUCTION_READY,
  DS_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/data-contract-notary-policy-gate.js';

import {
  DataContractNotaryPort,
  DS_PORT_PRODUCTION_READY,
  DS_PORT_KIND
} from '../src/core/composition/data-contract-notary-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockContractReport(overrides = {}) {
  return {
    contractName: 'UserOrderContract',
    schemaVersion: '1.2.0',
    status: 'VALIDATED',
    schemaDriftDetected: false,
    uncontractedFieldsCount: 0,
    hasUncontractedFields: false,
    validationErrors: [],
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DS — Data Contract Notary Receipt (SPEC-0129)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DS1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 2ff91794', () => {
    assert.equal(DS_PRODUCTION_READY, 'NO');
    assert.equal(DS_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DS_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DS_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DS_FREEZE_PIN_SHORT, '2ff91794');
  });

  it('DS2: builds canonical nine-field sealed DS-RCPT-* with freeze soft-observe + ceiling hold + contract hold', () => {
    const receipt = buildDataContractNotaryReceipt({
      planId: 'plan-ds-01',
      changeId: 'eos-ladder-32-mission-ds',
      decision: 'PASS',
      contractReport: makeMockContractReport()
    });

    assert.equal(receipt.kind, DS_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DS-RCPT-'));
    assert.equal(receipt.operation, 'DATA_CONTRACT_NOTARY');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '2ff91794');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.contractHold.schemaStrictnessPreserved, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DS3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildDataContractNotaryReceipt({
      planId: 'plan-ds-tamper',
      changeId: 'eos-ladder-32-mission-ds',
      decision: 'PASS'
    });

    assert.equal(verifyDataContractNotaryReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyDataContractNotaryReceipt(tampered).ok, false);
  });
});

describe('Mission DS — Data Contract Notary Policy Gate (SPEC-0129)', () => {
  it('DS4: validates well-formed plan (planId+changeId+ACTIVE+valid contractReport)', () => {
    const gate = new DataContractNotaryPolicyGate();
    const contractReport = makeMockContractReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-valid',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      contractReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DS_CODES.OK);
  });

  it('DS5: rejects missing contractReport or invalid report type', () => {
    const gate = new DataContractNotaryPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ds-noreport',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DS_CODES.MISSING_CONTRACT_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ds-invalidreport',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DS_CODES.INVALID_CONTRACT_REPORT);
  });

  it('DS6: rejects schema drift (schemaDriftDetected === true)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-drift',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport({ schemaDriftDetected: true })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DS_CODES.SCHEMA_DRIFT_DETECTED);
  });

  it('DS7: rejects uncontracted field injection (uncontractedFieldsCount > 0 or hasUncontractedFields)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const resCount = gate.evaluatePreconditions({
      planId: 'plan-ds-uncontracted-count',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport({ uncontractedFieldsCount: 2 })
    });
    assert.equal(resCount.ok, false);
    assert.equal(resCount.decision, 'DENY');
    assert.equal(resCount.code, DS_CODES.UNCONTRACTED_FIELDS_DETECTED);

    const resFlag = gate.evaluatePreconditions({
      planId: 'plan-ds-uncontracted-flag',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport({ hasUncontractedFields: true })
    });
    assert.equal(resFlag.ok, false);
    assert.equal(resFlag.decision, 'DENY');
    assert.equal(resFlag.code, DS_CODES.UNCONTRACTED_FIELDS_DETECTED);
  });

  it('DS8: rejects validation errors (validationErrors non-empty)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-errors',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport({
        validationErrors: [{ field: 'age', message: 'must be integer' }]
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DS_CODES.SCHEMA_VALIDATION_FAILED);
  });

  it('DS9: rejects unvalidated status (status !== VALIDATED)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-unvalidated',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport({ status: 'PENDING' })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DS_CODES.CONTRACT_NOT_VALIDATED);
  });

  it('DS10: allows HOLD mode with zero mutations', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-hold',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DS_CODES.HOLD);
  });

  it('DS11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ds-del1',
      changeId: 'eos-ladder-32-mission-ds',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DS_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ds-del2',
      changeId: 'eos-ladder-32-mission-ds',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DS_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DS12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new DataContractNotaryPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-secret',
      changeId: 'eos-ladder-32-mission-ds',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DS_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DS13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new DataContractNotaryPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ds-fundacion',
      changeId: 'eos-ladder-32-mission-ds',
      target: 'Documents/Fundacion/contracts'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DS_CODES.FUNDACION_DENIED);
  });

  it('DS14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31 reopen, L32 auto-close', () => {
    const gate = new DataContractNotaryPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ds-pr',
      changeId: 'eos-ladder-32-mission-ds',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DS_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ds-l30',
      changeId: 'eos-ladder-32-mission-ds',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DS_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ds-l31',
      changeId: 'eos-ladder-32-mission-ds',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DS_CODES.L31_REOPEN_FORBIDDEN);

    const l32CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ds-l32-close',
      changeId: 'eos-ladder-32-mission-ds',
      instruction: 'auto-close ladder-32 now'
    });
    assert.equal(l32CloseRes.ok, false);
    assert.equal(l32CloseRes.code, DS_CODES.L32_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ds-tip',
      changeId: 'eos-ladder-32-mission-ds',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DS_CODES.TIP_REWRITE_FORBIDDEN);
  });
});

describe('Mission DS — Data Contract Notary Port (SPEC-0129)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DS15: govern happy path ACTIVE + valid contractReport -> PASS + DS-RCPT-*', async () => {
    const port = new DataContractNotaryPort();
    const contractReport = makeMockContractReport();

    const res = await port.govern({
      planId: 'plan-ds-pass',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DS-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
  });

  it('DS16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new DataContractNotaryPort();

    const res = await port.govern({
      planId: 'plan-ds-hold',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DS17: verifyTrail validates cryptographic integrity of receipt trail and port refuses auto-seal when humanGateHeld is false', async () => {
    const port = new DataContractNotaryPort();

    await port.govern({
      planId: 'plan-ds-trail-01',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      contractReport: makeMockContractReport()
    });

    await port.govern({
      planId: 'plan-ds-trail-02',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch'));

    const autoSealRes = await port.govern({
      planId: 'plan-ds-autoseal',
      changeId: 'eos-ladder-32-mission-ds',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      contractReport: makeMockContractReport()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DS_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
