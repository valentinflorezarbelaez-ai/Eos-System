/**
 * Mission DP — Sovereign Vertical Slice & Screaming Architecture Port Test Suite.
 * SPEC-0126 / ADR-0101.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 8bbdd522
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DP_PRODUCTION_READY,
  DP_RECEIPT_PRODUCTION_READY,
  DP_RECEIPT_KIND,
  DP_FREEZE_PIN_SHORT,
  buildVerticalSliceReceipt,
  verifyVerticalSliceReceipt,
  canonicalVerticalSliceSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/vertical-slice-receipt.js';

import {
  VerticalSlicePolicyGate,
  DP_CODES,
  DP_POLICY_GATE_PRODUCTION_READY,
  DP_RITUAL_PHASES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  isFundacionTarget
} from '../src/core/composition/vertical-slice-policy-gate.js';

import {
  VerticalSlicePort,
  DP_PORT_PRODUCTION_READY,
  DP_PORT_KIND
} from '../src/core/composition/vertical-slice-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockSliceReport(overrides = {}) {
  return {
    slicesAnalyzed: 18,
    useCasesCount: 42,
    crossSliceLeaksCount: 0,
    crossSliceLeaks: [],
    nonBuiltinImportsCount: 0,
    screamingArchitectureStatus: 'COHESIVE',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('Mission DP — Vertical Slice Receipt (SPEC-0126)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DP1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 8bbdd522', () => {
    assert.equal(DP_PRODUCTION_READY, 'NO');
    assert.equal(DP_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DP_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DP_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DP_FREEZE_PIN_SHORT, '8bbdd522');
  });

  it('DP2: builds canonical nine-field sealed DP-RCPT-* with freeze soft-observe + ceiling hold + slice hold', () => {
    const receipt = buildVerticalSliceReceipt({
      planId: 'plan-dp-01',
      changeId: 'eos-ladder-32-mission-dp',
      decision: 'PASS',
      sliceReport: makeMockSliceReport()
    });

    assert.equal(receipt.kind, DP_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DP-RCPT-'));
    assert.equal(receipt.operation, 'VERTICAL_SLICE_SCREAMING_ARCHITECTURE');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '8bbdd522');
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.sliceHold.screamingArchitectureEnforced, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
  });

  it('DP3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildVerticalSliceReceipt({
      planId: 'plan-dp-tamper',
      changeId: 'eos-ladder-32-mission-dp',
      decision: 'PASS'
    });

    assert.equal(verifyVerticalSliceReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyVerticalSliceReceipt(tampered).ok, false);
  });
});

describe('Mission DP — Vertical Slice Policy Gate (SPEC-0126)', () => {
  it('DP4: validates well-formed plan (planId+changeId+ACTIVE+sliceReport ok with 0 leaks and 0 non-builtin imports)', () => {
    const gate = new VerticalSlicePolicyGate();
    const sliceReport = makeMockSliceReport();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dp-valid',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      sliceReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DP_CODES.OK);
  });

  it('DP5: rejects missing sliceReport or invalid report type', () => {
    const gate = new VerticalSlicePolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dp-noreport',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DP_CODES.MISSING_SLICE_REPORT);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dp-invalidreport',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DP_CODES.INVALID_SLICE_REPORT);
  });

  it('DP6: rejects cross-slice direct leakage (crossSliceLeaksCount > 0 or crossSliceLeaks array not empty)', () => {
    const gate = new VerticalSlicePolicyGate();

    const resCount = gate.evaluatePreconditions({
      planId: 'plan-dp-leaks-count',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: makeMockSliceReport({ crossSliceLeaksCount: 2 })
    });
    assert.equal(resCount.ok, false);
    assert.equal(resCount.decision, 'DENY');
    assert.equal(resCount.code, DP_CODES.CROSS_SLICE_LEAKAGE_DETECTED);

    const resArray = gate.evaluatePreconditions({
      planId: 'plan-dp-leaks-array',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: makeMockSliceReport({
        crossSliceLeaks: ['Slice A imports internal helper of Slice B']
      })
    });
    assert.equal(resArray.ok, false);
    assert.equal(resArray.decision, 'DENY');
    assert.equal(resArray.code, DP_CODES.CROSS_SLICE_LEAKAGE_DETECTED);
  });

  it('DP7: rejects non-builtin imports in pure domain slice (nonBuiltinImportsCount > 0)', () => {
    const gate = new VerticalSlicePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dp-non-builtin',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: makeMockSliceReport({ nonBuiltinImportsCount: 1 })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DP_CODES.NON_BUILTIN_DEPENDENCIES_FORBIDDEN);
  });

  it('DP8: allows HOLD mode with zero mutations', () => {
    const gate = new VerticalSlicePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dp-hold',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DP_CODES.HOLD);
  });

  it('DP9: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new VerticalSlicePolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dp-del1',
      changeId: 'eos-ladder-32-mission-dp',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DP_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dp-del2',
      changeId: 'eos-ladder-32-mission-dp',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DP_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DP10: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new VerticalSlicePolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dp-secret',
      changeId: 'eos-ladder-32-mission-dp',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DP_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DP11: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new VerticalSlicePolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dp-fundacion',
      changeId: 'eos-ladder-32-mission-dp',
      target: 'Documents/Fundacion/contracts'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DP_CODES.FUNDACION_DENIED);
  });

  it('DP12: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30/L31 reopen, L32 auto-close', () => {
    const gate = new VerticalSlicePolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dp-pr',
      changeId: 'eos-ladder-32-mission-dp',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DP_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dp-l30',
      changeId: 'eos-ladder-32-mission-dp',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DP_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dp-l31',
      changeId: 'eos-ladder-32-mission-dp',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DP_CODES.L31_REOPEN_FORBIDDEN);

    const l32CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dp-l32-close',
      changeId: 'eos-ladder-32-mission-dp',
      instruction: 'auto-close ladder-32 now'
    });
    assert.equal(l32CloseRes.ok, false);
    assert.equal(l32CloseRes.code, DP_CODES.L32_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dp-tip',
      changeId: 'eos-ladder-32-mission-dp',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DP_CODES.TIP_REWRITE_FORBIDDEN);
  });
});

describe('Mission DP — Vertical Slice Port (SPEC-0126)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DP13: govern happy path ACTIVE + valid sliceReport -> PASS + DP-RCPT-*', async () => {
    const port = new VerticalSlicePort();
    const sliceReport = makeMockSliceReport();

    const res = await port.govern({
      planId: 'plan-dp-pass',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      phase: 'SLICE_AUDIT',
      sliceReport
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DP-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(port.trail.length, 1);
  });

  it('DP14: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new VerticalSlicePort();

    const res = await port.govern({
      planId: 'plan-dp-hold',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DP15: verifyTrail validates cryptographic integrity of receipt trail', async () => {
    const port = new VerticalSlicePort();

    await port.govern({
      planId: 'plan-dp-trail-01',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: makeMockSliceReport()
    });

    await port.govern({
      planId: 'plan-dp-trail-02',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);
  });

  it('DP16: tamper breaks trail verification', async () => {
    const port = new VerticalSlicePort();

    await port.govern({
      planId: 'plan-dp-trail-01',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      sliceReport: makeMockSliceReport()
    });

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, false);
    assert.ok(trailRes.error.includes('receiptHash mismatch'));
  });

  it('DP17: port refuses auto-seal when humanGateHeld is violated + codes freeze surface', async () => {
    const port = new VerticalSlicePort();

    const res = await port.govern({
      planId: 'plan-dp-autoseal',
      changeId: 'eos-ladder-32-mission-dp',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      sliceReport: makeMockSliceReport()
    });

    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DP_CODES.AUTO_SEAL_FORBIDDEN);
  });
});
