/**
 * Mission DZ — Sovereign Process Manager / Saga Orchestration Port Test Suite.
 * SPEC-0136 / ADR-0113.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin b382d29b (do NOT rewrite tip pins)
 * - PASS = sealed process/saga step ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 * - NEVER reopen L30–L33; refuse L34 auto-close
 * - Dual-write / outbox mutation / schema-json add refused
 * - Fail-closed COMPENSATE/DENY path hermetic in-memory only
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DZ_PRODUCTION_READY,
  DZ_RECEIPT_PRODUCTION_READY,
  DZ_RECEIPT_KIND,
  DZ_FREEZE_PIN_SHORT,
  buildProcessManagerSagaReceipt,
  verifyProcessManagerSagaReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/process-manager-saga-receipt.js';

import {
  ProcessManagerSagaPolicyGate,
  DZ_CODES,
  DZ_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsDualWrite,
  isFundacionTarget
} from '../src/core/composition/process-manager-saga-policy-gate.js';

import {
  ProcessManagerSagaPort,
  DZ_PORT_PRODUCTION_READY,
  DZ_PORT_KIND
} from '../src/core/composition/process-manager-saga-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockProcessInstance(overrides = {}) {
  return {
    processId: 'proc-order-001',
    processType: 'OrderFulfillmentSaga',
    step: 'ReserveInventory',
    triggerEvent: {
      eventType: 'OrderPlaced',
      aggregateId: 'agg-order-001',
      payload: {
        orderId: 'ord-001',
        sku: 'SKU-42',
        qty: 2
      }
    },
    compensationPlan: {
      steps: ['ReleaseInventory']
    },
    ...overrides
  };
}

describe('Mission DZ — Process Manager / Saga Receipt (SPEC-0136)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DZ1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin b382d29b', () => {
    assert.equal(DZ_PRODUCTION_READY, 'NO');
    assert.equal(DZ_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(DZ_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(DZ_PORT_PRODUCTION_READY, 'NO');
    assert.equal(DZ_FREEZE_PIN_SHORT, 'b382d29b');
  });

  it('DZ2: builds canonical nine-field sealed DZ-RCPT-* with freeze soft-observe + ceiling hold + saga hold', () => {
    const receipt = buildProcessManagerSagaReceipt({
      planId: 'plan-dz-01',
      changeId: 'eos-ladder-34-mission-dz',
      decision: 'PASS',
      processInstance: makeMockProcessInstance()
    });

    assert.equal(receipt.kind, DZ_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('DZ-RCPT-'));
    assert.equal(receipt.operation, 'PROCESS_MANAGER_SAGA');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, 'b382d29b');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.dualWriteRefused, true);
    assert.equal(receipt.freezeObserve.outboxMutationRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l33ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.sagaHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.sagaHold.compensateFailClosed, true);
    assert.equal(receipt.sagaHold.networkWriteRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.processDigest, 'string');
    assert.equal(receipt.processDigest.length, 64);
  });

  it('DZ3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildProcessManagerSagaReceipt({
      planId: 'plan-dz-tamper',
      changeId: 'eos-ladder-34-mission-dz',
      decision: 'PASS'
    });

    assert.equal(verifyProcessManagerSagaReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyProcessManagerSagaReceipt(tampered).ok, false);
  });
});

describe('Mission DZ — Process Manager / Saga Policy Gate (SPEC-0136)', () => {
  it('DZ4: validates well-formed plan (planId+changeId+ACTIVE+valid processInstance)', () => {
    const gate = new ProcessManagerSagaPolicyGate();
    const processInstance = makeMockProcessInstance();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dz-valid',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      processInstance
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, DZ_CODES.OK);
  });

  it('DZ5: rejects missing processInstance or invalid process instance', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dz-noproc',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, DZ_CODES.MISSING_PROCESS_INSTANCE);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-dz-invalidproc',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, DZ_CODES.INVALID_PROCESS_INSTANCE);
  });

  it('DZ6: rejects missing processId / processType / step', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-dz-noid',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({ processId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, DZ_CODES.MISSING_PROCESS_ID);

    const resType = gate.evaluatePreconditions({
      planId: 'plan-dz-notype',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({ processType: '   ' })
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, DZ_CODES.MISSING_PROCESS_TYPE);

    const resStep = gate.evaluatePreconditions({
      planId: 'plan-dz-nostep',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({ step: '' })
    });
    assert.equal(resStep.ok, false);
    assert.equal(resStep.code, DZ_CODES.MISSING_STEP);
  });

  it('DZ7: rejects missing triggerEvent fields (eventType / aggregateId)', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-dz-notrigger',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({ triggerEvent: null })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, DZ_CODES.MISSING_TRIGGER_EVENT);

    const resType = gate.evaluatePreconditions({
      planId: 'plan-dz-noeventtype',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({
        triggerEvent: { eventType: '', aggregateId: 'agg-1', payload: { x: 1 } }
      })
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, DZ_CODES.MISSING_EVENT_TYPE);

    const resAgg = gate.evaluatePreconditions({
      planId: 'plan-dz-noagg',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({
        triggerEvent: { eventType: 'OrderPlaced', aggregateId: '  ', payload: { x: 1 } }
      })
    });
    assert.equal(resAgg.ok, false);
    assert.equal(resAgg.code, DZ_CODES.MISSING_AGGREGATE_ID);
  });

  it('DZ8: rejects empty triggerEvent payload', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dz-emptypayload',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance({
        triggerEvent: { eventType: 'OrderPlaced', aggregateId: 'agg-1', payload: {} }
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DZ_CODES.EMPTY_EVENT_PAYLOAD);
  });

  it('DZ9: rejects dual-write, outbox mutation, and schema-json add', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const dual = gate.evaluatePreconditions({
      planId: 'plan-dz-dual',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      dualWrite: true,
      processInstance: makeMockProcessInstance()
    });
    assert.equal(dual.ok, false);
    assert.equal(dual.code, DZ_CODES.DUAL_WRITE_FORBIDDEN);

    const outbox = gate.evaluatePreconditions({
      planId: 'plan-dz-outbox',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      instruction: 'please mutate outbox record now',
      processInstance: makeMockProcessInstance()
    });
    assert.equal(outbox.ok, false);
    assert.equal(outbox.code, DZ_CODES.OUTBOX_MUTATION_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-dz-schema',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-event.json',
      processInstance: makeMockProcessInstance()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, DZ_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsDualWrite('enable dual-write now'), true);
  });

  it('DZ10: allows HOLD mode with zero mutations', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dz-hold',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, DZ_CODES.HOLD);
  });

  it('DZ11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-dz-del1',
      changeId: 'eos-ladder-34-mission-dz',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, DZ_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-dz-del2',
      changeId: 'eos-ladder-34-mission-dz',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, DZ_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('DZ12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new ProcessManagerSagaPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dz-secret',
      changeId: 'eos-ladder-34-mission-dz',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DZ_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('DZ13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-dz-fundacion',
      changeId: 'eos-ladder-34-mission-dz',
      target: 'Documents/Fundacion/saga'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, DZ_CODES.FUNDACION_DENIED);
  });

  it('DZ14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L33 reopen, L34 auto-close, mass prune, GHE', () => {
    const gate = new ProcessManagerSagaPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-dz-pr',
      changeId: 'eos-ladder-34-mission-dz',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, DZ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-dz-l30',
      changeId: 'eos-ladder-34-mission-dz',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, DZ_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-dz-l31',
      changeId: 'eos-ladder-34-mission-dz',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, DZ_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-dz-l32',
      changeId: 'eos-ladder-34-mission-dz',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, DZ_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-dz-l33',
      changeId: 'eos-ladder-34-mission-dz',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, DZ_CODES.L33_REOPEN_FORBIDDEN);

    const l34CloseRes = gate.evaluatePreconditions({
      planId: 'plan-dz-l34-close',
      changeId: 'eos-ladder-34-mission-dz',
      instruction: 'auto-close ladder-34 now'
    });
    assert.equal(l34CloseRes.ok, false);
    assert.equal(l34CloseRes.code, DZ_CODES.L34_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-dz-tip',
      changeId: 'eos-ladder-34-mission-dz',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, DZ_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-dz-mass',
      changeId: 'eos-ladder-34-mission-dz',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, DZ_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-dz-ghe',
      changeId: 'eos-ladder-34-mission-dz',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, DZ_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission DZ — Process Manager / Saga Port (SPEC-0136)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('DZ15: govern happy path ACTIVE + valid processInstance -> PASS + DZ-RCPT-* (≠ network write)', async () => {
    const port = new ProcessManagerSagaPort();
    const processInstance = makeMockProcessInstance();

    const res = await port.govern({
      planId: 'plan-dz-pass',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('DZ-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.sagaHold.networkWriteRefused, true);
    assert.equal(res.receipt.freezeObserve.dualWriteRefused, true);
    assert.equal(res.receipt.freezeObserve.outboxMutationRefused, true);
    assert.equal(res.receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(typeof res.receipt.processDigest, 'string');
    assert.equal(res.receipt.processDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(DZ_PORT_KIND, 'eos-process-manager-saga-port');
  });

  it('DZ16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new ProcessManagerSagaPort();

    const res = await port.govern({
      planId: 'plan-dz-hold',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('DZ17: verifyTrail + auto-seal refuse + dual-write deny + hermetic COMPENSATE', async () => {
    const port = new ProcessManagerSagaPort();

    await port.govern({
      planId: 'plan-dz-trail-01',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      processInstance: makeMockProcessInstance()
    });

    await port.govern({
      planId: 'plan-dz-trail-02',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch') || brokenTrail.error.includes('Invalid receipt'));

    const autoSealRes = await port.govern({
      planId: 'plan-dz-autoseal',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      processInstance: makeMockProcessInstance()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, DZ_CODES.AUTO_SEAL_FORBIDDEN);

    const dualRes = await port.govern({
      planId: 'plan-dz-dual',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      dualWrite: true,
      processInstance: makeMockProcessInstance()
    });
    assert.equal(dualRes.ok, false);
    assert.equal(dualRes.code, DZ_CODES.DUAL_WRITE_FORBIDDEN);

    const compensateRes = await port.govern({
      planId: 'plan-dz-compensate',
      changeId: 'eos-ladder-34-mission-dz',
      ritualMode: 'ACTIVE',
      requestCompensate: true,
      processInstance: makeMockProcessInstance()
    });
    assert.equal(compensateRes.ok, true);
    assert.equal(compensateRes.decision, 'COMPENSATE');
    assert.equal(compensateRes.code, DZ_CODES.COMPENSATE);
    assert.equal(compensateRes.receipt.decision, 'COMPENSATE');
    assert.equal(compensateRes.receipt.sagaHold.hermeticInMemoryOnly, true);
    assert.equal(compensateRes.receipt.sagaHold.compensateFailClosed, true);
    assert.equal(compensateRes.receipt.sagaHold.networkWriteRefused, true);
  });
});
