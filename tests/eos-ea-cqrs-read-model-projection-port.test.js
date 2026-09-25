/**
 * Mission EA — CQRS Read-Model Projection Port Test Suite.
 * SPEC-0137 / ADR-0114.
 *
 * Invariants:
 * - PRODUCTION_READY=NO
 * - Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 * - Law VI (zero plain secrets)
 * - Pure Node.js built-ins only (L0 purity)
 * - Soft-observe freeze pin 1f2234cf (do NOT rewrite tip pins)
 * - PASS = sealed projection ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT
 * - NEVER reopen L30–L33; refuse L34 auto-close
 * - Second SoT / dual-write / schema-json add refused
 * - rebuildFromStream hermetic in-memory only (≠ live DB)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EA_PRODUCTION_READY,
  EA_RECEIPT_PRODUCTION_READY,
  EA_RECEIPT_KIND,
  EA_FREEZE_PIN_SHORT,
  buildCqrsReadModelProjectionReceipt,
  verifyCqrsReadModelProjectionReceipt,
  _resetReceiptSeqForTests
} from '../src/core/composition/cqrs-read-model-projection-receipt.js';

import {
  CqrsReadModelProjectionPolicyGate,
  EA_CODES,
  EA_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsDualWrite,
  claimsSecondSourceOfTruth,
  isFundacionTarget
} from '../src/core/composition/cqrs-read-model-projection-policy-gate.js';

import {
  CqrsReadModelProjectionPort,
  EA_PORT_PRODUCTION_READY,
  EA_PORT_KIND
} from '../src/core/composition/cqrs-read-model-projection-port.js';

function makeSyntheticSecret() {
  return String.fromCharCode(115, 107, 45) + 'fake-test-token-abcdef1234567890';
}

function makeMockProjection(overrides = {}) {
  return {
    projectionId: 'proj-order-summary-001',
    projectionType: 'OrderSummaryReadModel',
    sourceEvent: {
      eventType: 'OrderPlaced',
      aggregateId: 'agg-order-001',
      payload: {
        orderId: 'ord-001',
        sku: 'SKU-42',
        qty: 2
      }
    },
    checkpoint: {
      streamPosition: 42,
      lastEventId: 'evt-042'
    },
    ...overrides
  };
}

describe('Mission EA — CQRS Read-Model Projection Receipt (SPEC-0137)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EA1: declares PRODUCTION_READY=NO non-claims across receipt/gate/port + freeze pin 1f2234cf', () => {
    assert.equal(EA_PRODUCTION_READY, 'NO');
    assert.equal(EA_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(EA_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(EA_PORT_PRODUCTION_READY, 'NO');
    assert.equal(EA_FREEZE_PIN_SHORT, '1f2234cf');
  });

  it('EA2: builds canonical nine-field sealed EA-RCPT-* with freeze soft-observe + ceiling hold + projection hold', () => {
    const receipt = buildCqrsReadModelProjectionReceipt({
      planId: 'plan-ea-01',
      changeId: 'eos-ladder-34-mission-ea',
      decision: 'PASS',
      projection: makeMockProjection()
    });

    assert.equal(receipt.kind, EA_RECEIPT_KIND);
    assert.ok(receipt.receiptId.startsWith('EA-RCPT-'));
    assert.equal(receipt.operation, 'CQRS_READ_MODEL_PROJECTION');
    assert.equal(receipt.fundacionDelta, 0);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.freezeObserve.pinShort, '1f2234cf');
    assert.equal(receipt.freezeObserve.tipRewriteRefused, true);
    assert.equal(receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(receipt.freezeObserve.secondSourceOfTruthRefused, true);
    assert.equal(receipt.freezeObserve.dualWriteRefused, true);
    assert.equal(receipt.freezeObserve.l30ReopenRefused, true);
    assert.equal(receipt.freezeObserve.l33ReopenRefused, true);
    assert.equal(receipt.ceilingHold.schemasAtCeiling, true);
    assert.equal(receipt.projectionHold.projectionDisposable, true);
    assert.equal(receipt.projectionHold.secondSourceOfTruthRefused, true);
    assert.equal(receipt.projectionHold.hermeticInMemoryOnly, true);
    assert.equal(receipt.projectionHold.networkWriteRefused, true);
    assert.equal(typeof receipt.receiptHash, 'string');
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(typeof receipt.projectionDigest, 'string');
    assert.equal(receipt.projectionDigest.length, 64);
  });

  it('EA3: detects receipt tampering via receiptHash mismatch', () => {
    const receipt = buildCqrsReadModelProjectionReceipt({
      planId: 'plan-ea-tamper',
      changeId: 'eos-ladder-34-mission-ea',
      decision: 'PASS'
    });

    assert.equal(verifyCqrsReadModelProjectionReceipt(receipt).ok, true);

    const tampered = { ...receipt, decision: 'DENY' };
    assert.equal(verifyCqrsReadModelProjectionReceipt(tampered).ok, false);
  });
});

describe('Mission EA — CQRS Read-Model Projection Policy Gate (SPEC-0137)', () => {
  it('EA4: validates well-formed plan (planId+changeId+ACTIVE+valid projection)', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();
    const projection = makeMockProjection();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ea-valid',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      phase: 'PREFLIGHT',
      projection
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.equal(res.code, EA_CODES.OK);
  });

  it('EA5: rejects missing projection or invalid projection', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ea-noproj',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: null
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.decision, 'DENY');
    assert.equal(resMissing.code, EA_CODES.MISSING_PROJECTION);

    const resInvalid = gate.evaluatePreconditions({
      planId: 'plan-ea-invalidproj',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: 'not-an-object'
    });
    assert.equal(resInvalid.ok, false);
    assert.equal(resInvalid.decision, 'DENY');
    assert.equal(resInvalid.code, EA_CODES.INVALID_PROJECTION);
  });

  it('EA6: rejects missing projectionId / projectionType', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const resId = gate.evaluatePreconditions({
      planId: 'plan-ea-noid',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({ projectionId: '' })
    });
    assert.equal(resId.ok, false);
    assert.equal(resId.code, EA_CODES.MISSING_PROJECTION_ID);

    const resType = gate.evaluatePreconditions({
      planId: 'plan-ea-notype',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({ projectionType: '   ' })
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, EA_CODES.MISSING_PROJECTION_TYPE);
  });

  it('EA7: rejects missing sourceEvent fields (eventType / aggregateId)', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const resMissing = gate.evaluatePreconditions({
      planId: 'plan-ea-nosource',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({ sourceEvent: null })
    });
    assert.equal(resMissing.ok, false);
    assert.equal(resMissing.code, EA_CODES.MISSING_SOURCE_EVENT);

    const resType = gate.evaluatePreconditions({
      planId: 'plan-ea-noeventtype',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({
        sourceEvent: { eventType: '', aggregateId: 'agg-1', payload: { x: 1 } }
      })
    });
    assert.equal(resType.ok, false);
    assert.equal(resType.code, EA_CODES.MISSING_EVENT_TYPE);

    const resAgg = gate.evaluatePreconditions({
      planId: 'plan-ea-noagg',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({
        sourceEvent: { eventType: 'OrderPlaced', aggregateId: '  ', payload: { x: 1 } }
      })
    });
    assert.equal(resAgg.ok, false);
    assert.equal(resAgg.code, EA_CODES.MISSING_AGGREGATE_ID);
  });

  it('EA8: rejects empty sourceEvent payload', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ea-emptypayload',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({
        sourceEvent: { eventType: 'OrderPlaced', aggregateId: 'agg-1', payload: {} }
      })
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EA_CODES.EMPTY_EVENT_PAYLOAD);
  });

  it('EA9: rejects second SoT, dual-write, and schema-json add', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const sot = gate.evaluatePreconditions({
      planId: 'plan-ea-sot',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      treatProjectionAsSoT: true,
      projection: makeMockProjection()
    });
    assert.equal(sot.ok, false);
    assert.equal(sot.code, EA_CODES.SECOND_SOURCE_OF_TRUTH_FORBIDDEN);

    const dual = gate.evaluatePreconditions({
      planId: 'plan-ea-dual',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      dualWrite: true,
      projection: makeMockProjection()
    });
    assert.equal(dual.ok, false);
    assert.equal(dual.code, EA_CODES.DUAL_WRITE_FORBIDDEN);

    const schema = gate.evaluatePreconditions({
      planId: 'plan-ea-schema',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      instruction: 'add docs/schemas/new-projection.json',
      projection: makeMockProjection()
    });
    assert.equal(schema.ok, false);
    assert.equal(schema.code, EA_CODES.SCHEMA_JSON_ADD_FORBIDDEN);

    assert.equal(claimsDualWrite('enable dual-write now'), true);
    assert.equal(claimsSecondSourceOfTruth('treat projection as SoT'), true);
  });

  it('EA10: allows HOLD mode with zero mutations', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ea-hold',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'HOLD'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.code, EA_CODES.HOLD);
  });

  it('EA11: policy gate DENY on hard-delete flags (forceDelete/purge/hardDelete)', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const res1 = gate.evaluatePreconditions({
      planId: 'plan-ea-del1',
      changeId: 'eos-ladder-34-mission-ea',
      forceDelete: true
    });
    assert.equal(res1.ok, false);
    assert.equal(res1.decision, 'DENY');
    assert.equal(res1.code, EA_CODES.HARD_DELETE_FORBIDDEN);

    const res2 = gate.evaluatePreconditions({
      planId: 'plan-ea-del2',
      changeId: 'eos-ladder-34-mission-ea',
      purge: true
    });
    assert.equal(res2.ok, false);
    assert.equal(res2.decision, 'DENY');
    assert.equal(res2.code, EA_CODES.HARD_DELETE_FORBIDDEN);
  });

  it('EA12: policy gate DENY on secrets (Law VI synthetic tokens)', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();
    const secret = makeSyntheticSecret();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ea-secret',
      changeId: 'eos-ladder-34-mission-ea',
      token: secret
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EA_CODES.SECRET_LEAK_FORBIDDEN);
  });

  it('EA13: policy gate DENY on Fundacion target paths (Law IV)', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const res = gate.evaluatePreconditions({
      planId: 'plan-ea-fundacion',
      changeId: 'eos-ladder-34-mission-ea',
      target: 'Documents/Fundacion/projection'
    });
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, EA_CODES.FUNDACION_DENIED);
  });

  it('EA14: policy gate DENY on PRODUCTION_READY flip, tip rewrite, L30–L33 reopen, L34 auto-close, mass prune, GHE', () => {
    const gate = new CqrsReadModelProjectionPolicyGate();

    const prRes = gate.evaluatePreconditions({
      planId: 'plan-ea-pr',
      changeId: 'eos-ladder-34-mission-ea',
      productionReady: 'YES'
    });
    assert.equal(prRes.ok, false);
    assert.equal(prRes.code, EA_CODES.PRODUCTION_READY_FLIP_FORBIDDEN);

    const l30Res = gate.evaluatePreconditions({
      planId: 'plan-ea-l30',
      changeId: 'eos-ladder-34-mission-ea',
      instruction: 'reopen ladder-30'
    });
    assert.equal(l30Res.ok, false);
    assert.equal(l30Res.code, EA_CODES.L30_REOPEN_FORBIDDEN);

    const l31Res = gate.evaluatePreconditions({
      planId: 'plan-ea-l31',
      changeId: 'eos-ladder-34-mission-ea',
      instruction: 'reopen ladder-31'
    });
    assert.equal(l31Res.ok, false);
    assert.equal(l31Res.code, EA_CODES.L31_REOPEN_FORBIDDEN);

    const l32Res = gate.evaluatePreconditions({
      planId: 'plan-ea-l32',
      changeId: 'eos-ladder-34-mission-ea',
      instruction: 'reopen ladder-32'
    });
    assert.equal(l32Res.ok, false);
    assert.equal(l32Res.code, EA_CODES.L32_REOPEN_FORBIDDEN);

    const l33Res = gate.evaluatePreconditions({
      planId: 'plan-ea-l33',
      changeId: 'eos-ladder-34-mission-ea',
      instruction: 'reopen ladder-33'
    });
    assert.equal(l33Res.ok, false);
    assert.equal(l33Res.code, EA_CODES.L33_REOPEN_FORBIDDEN);

    const l34CloseRes = gate.evaluatePreconditions({
      planId: 'plan-ea-l34-close',
      changeId: 'eos-ladder-34-mission-ea',
      instruction: 'auto-close ladder-34 now'
    });
    assert.equal(l34CloseRes.ok, false);
    assert.equal(l34CloseRes.code, EA_CODES.L34_AUTO_CLOSE_FORBIDDEN);

    const tipRes = gate.evaluatePreconditions({
      planId: 'plan-ea-tip',
      changeId: 'eos-ladder-34-mission-ea',
      action: 'force-push main to rewrite tip'
    });
    assert.equal(tipRes.ok, false);
    assert.equal(tipRes.code, EA_CODES.TIP_REWRITE_FORBIDDEN);

    const massRes = gate.evaluatePreconditions({
      planId: 'plan-ea-mass',
      changeId: 'eos-ladder-34-mission-ea',
      massPrune: true
    });
    assert.equal(massRes.ok, false);
    assert.equal(massRes.code, EA_CODES.MASS_PRUNE_FORBIDDEN);

    const gheRes = gate.evaluatePreconditions({
      planId: 'plan-ea-ghe',
      changeId: 'eos-ladder-34-mission-ea',
      claim: 'GHE branch protection enforced'
    });
    assert.equal(gheRes.ok, false);
    assert.equal(gheRes.code, EA_CODES.GHE_CLAIM_FORBIDDEN);

    assert.equal(claimsProductionReadyFlip('PRODUCTION_READY=YES'), true);
    assert.equal(claimsHardDelete('hard-delete now'), true);
    assert.equal(claimsMassPrune('mass-prune everything'), true);
    assert.equal(isFundacionTarget('Fundacion/x'), true);
    assert.equal(scanForSecrets(makeSyntheticSecret()), true);
  });
});

describe('Mission EA — CQRS Read-Model Projection Port (SPEC-0137)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('EA15: govern happy path ACTIVE + valid projection -> PASS + EA-RCPT-* (≠ network write ≠ second SoT)', async () => {
    const port = new CqrsReadModelProjectionPort();
    const projection = makeMockProjection();

    const res = await port.govern({
      planId: 'plan-ea-pass',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'PASS');
    assert.ok(res.receipt.receiptId.startsWith('EA-RCPT-'));
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.projectionHold.networkWriteRefused, true);
    assert.equal(res.receipt.projectionHold.projectionDisposable, true);
    assert.equal(res.receipt.freezeObserve.secondSourceOfTruthRefused, true);
    assert.equal(res.receipt.freezeObserve.dualWriteRefused, true);
    assert.equal(res.receipt.freezeObserve.l34AutoCloseRefused, true);
    assert.equal(typeof res.receipt.projectionDigest, 'string');
    assert.equal(res.receipt.projectionDigest.length, 64);
    assert.equal(port.trail.length, 1);
    assert.equal(EA_PORT_KIND, 'eos-cqrs-read-model-projection-port');
  });

  it('EA16: govern HOLD mode -> HOLD with zero state changes', async () => {
    const port = new CqrsReadModelProjectionPort();

    const res = await port.govern({
      planId: 'plan-ea-hold',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'HOLD'
    });

    assert.equal(res.ok, true);
    assert.equal(res.decision, 'HOLD');
    assert.equal(res.receipt.decision, 'HOLD');
    assert.equal(port.trail.length, 1);
  });

  it('EA17: verifyTrail + rebuildFromStream + auto-seal refuse + second-SoT deny', async () => {
    const port = new CqrsReadModelProjectionPort();

    await port.govern({
      planId: 'plan-ea-trail-01',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection()
    });

    await port.govern({
      planId: 'plan-ea-trail-02',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'HOLD'
    });

    const trailRes = port.verifyTrail();
    assert.equal(trailRes.ok, true);
    assert.equal(trailRes.verifiedCount, 2);

    port.trail[0].receiptHash = 'badhash'.repeat(8);
    const brokenTrail = port.verifyTrail();
    assert.equal(brokenTrail.ok, false);
    assert.ok(brokenTrail.error.includes('receiptHash mismatch') || brokenTrail.error.includes('Invalid receipt'));

    const rebuildPort = new CqrsReadModelProjectionPort();
    const rebuildRes = await rebuildPort.govern({
      planId: 'plan-ea-rebuild',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      projection: makeMockProjection({ rebuildFromStream: true })
    });
    assert.equal(rebuildRes.ok, true);
    assert.equal(rebuildRes.decision, 'PASS');
    assert.ok(rebuildRes.reason && rebuildRes.reason.includes('rebuildFromStream'));
    assert.equal(rebuildRes.receipt.projectionHold.hermeticInMemoryOnly, true);
    assert.equal(rebuildRes.receipt.projectionHold.rebuildFromStreamOnly, true);
    assert.equal(rebuildRes.receipt.projectionHold.secondSourceOfTruthRefused, true);
    assert.equal(rebuildRes.receipt.projectionHold.networkWriteRefused, true);

    const autoSealRes = await rebuildPort.govern({
      planId: 'plan-ea-autoseal',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      autoSeal: true,
      humanGateHeld: false,
      projection: makeMockProjection()
    });

    assert.equal(autoSealRes.ok, false);
    assert.equal(autoSealRes.decision, 'DENY');
    assert.equal(autoSealRes.code, EA_CODES.AUTO_SEAL_FORBIDDEN);

    const sotRes = await rebuildPort.govern({
      planId: 'plan-ea-sot',
      changeId: 'eos-ladder-34-mission-ea',
      ritualMode: 'ACTIVE',
      instruction: 'treat projection as SoT',
      projection: makeMockProjection()
    });
    assert.equal(sotRes.ok, false);
    assert.equal(sotRes.code, EA_CODES.SECOND_SOURCE_OF_TRUTH_FORBIDDEN);
  });
});