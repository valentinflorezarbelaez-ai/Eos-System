/**
 * @file tests/eos-cb-cross-ladder-composition-port.test.js
 * SPEC-0085 / Mission CB — Cross-Ladder Composition Orchestrator Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   NON-CLAIM: ≠ Airflow/Temporal / ≠ general AGI planner
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CB_PRODUCTION_READY,
  CB_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CB_RECEIPT_KIND,
  sha256Canonical,
  buildCrossLadderCompositionReceipt,
  verifyCrossLadderCompositionReceipt,
  canonicalCrossLadderCompositionSealBody,
  _resetReceiptSeqForTests
} from '../src/core/composition/cross-ladder-composition-receipt.js';

import {
  CrossLadderCompositionPolicyGate,
  CB_CODES,
  CB_MAX_STAGES,
  CB_ALLOWED_LADDERS,
  CB_KNOWN_SATELLITE_IDS,
  CB_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/composition/cross-ladder-composition-policy-gate.js';

import {
  CrossLadderCompositionPort,
  CB_PORT_PRODUCTION_READY,
  CB_PORT_KIND,
  buildStageSealStub
} from '../src/core/composition/cross-ladder-composition-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForCrossLadderComposition1234567890';
}

function sampleHappyPlan(overrides = {}) {
  return {
    compositionId: 'cb-demo-l22-l23',
    label: 'compose L22 intent + L23 memory/heal',
    stages: [
      { id: 's1', ladder: 'L22', satellite: 'BR', inputDigest: sha256Canonical({ intent: 'demo' }) },
      { id: 's2', ladder: 'L22', satellite: 'BT' },
      { id: 's3', ladder: 'L23', satellite: 'BW' },
      { id: 's4', ladder: 'L23', satellite: 'BZ' }
    ],
    ...overrides
  };
}

describe('Mission CB — Cross-Ladder Composition Receipt (SPEC-0085)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CB_PRODUCTION_READY, 'NO');
    assert.equal(CB_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CB_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CB_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CB-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildCrossLadderCompositionReceipt({
      operation: 'COMPOSE',
      compositionId: 'cb-demo',
      rootDigest: sha256Canonical({ sample: 'compose-data' }),
      status: 'OK',
      stageCount: 2
    });

    assert.equal(receipt.kind, CB_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CB-RCPT-'));
    assert.equal(receipt.compositionId, 'cb-demo');
    assert.equal(receipt.stageCount, 2);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.airflowTemporal, false);
    assert.equal(receipt.nonClaims.agiPlanner, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalCrossLadderCompositionSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyCrossLadderCompositionReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildCrossLadderCompositionReceipt({
      operation: 'COMPOSE',
      compositionId: 'cb-demo',
      status: 'OK',
      stageCount: 1
    });

    const tampered = { ...receipt, compositionId: 'cb-tampered-hacked' };
    const verifyRes = verifyCrossLadderCompositionReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CB — Cross-Ladder Composition Policy Gate (SPEC-0085)', () => {
  let gate;

  beforeEach(() => {
    gate = new CrossLadderCompositionPolicyGate();
  });

  it('validates a well-formed L22+L23 composition plan', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CB_CODES.PLAN_VALID_OK);
    assert.equal(res.stages.length, 4);
    assert.ok(CB_ALLOWED_LADDERS.includes('L22'));
    assert.ok(CB_ALLOWED_LADDERS.includes('L23'));
    assert.ok(CB_KNOWN_SATELLITE_IDS.has('BR'));
    assert.ok(CB_KNOWN_SATELLITE_IDS.has('BZ'));
  });

  it('rejects empty composition plans fail-closed', () => {
    const empty = gate.evaluatePlan({ compositionId: 'empty', stages: [] });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CB_CODES.EMPTY_PLAN_DENY);

    const missing = gate.evaluatePlan({ compositionId: 'missing' });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CB_CODES.EMPTY_PLAN_DENY);
  });

  it('rejects unknown stage / satellite ids', () => {
    const res = gate.evaluatePlan({
      compositionId: 'bad-sat',
      stages: [{ id: 'x1', ladder: 'L22', satellite: 'ZZ' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CB_CODES.UNKNOWN_STAGE_ID_DENY);
  });

  it('rejects ladder/satellite mismatch and unknown ladders', () => {
    const mismatch = gate.evaluatePlan({
      compositionId: 'mismatch',
      stages: [{ id: 'm1', ladder: 'L22', satellite: 'BW' }]
    });
    assert.equal(mismatch.valid, false);
    assert.equal(mismatch.code, CB_CODES.LADDER_SATELLITE_MISMATCH_DENY);

    const badLadder = gate.evaluatePlan({
      compositionId: 'bad-ladder',
      stages: [{ id: 'm2', ladder: 'L99', satellite: 'BR' }]
    });
    assert.equal(badLadder.valid, false);
    assert.equal(badLadder.code, CB_CODES.UNKNOWN_LADDER_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      compositionId: 'leak',
      label: `compose with key ${secret}`,
      stages: [{ id: 's1', ladder: 'L22', satellite: 'BR' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CB_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      compositionId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/compose.json',
      stages: [{ id: 's1', ladder: 'L22', satellite: 'BR' }]
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CB_CODES.FUNDACION_ALWAYS_DENY);

    const stageLevel = gate.evaluatePlan({
      compositionId: 'fundacion-stage',
      stages: [
        {
          id: 's1',
          ladder: 'L23',
          satellite: 'BW',
          targetPath: '/fundacion/memory.json'
        }
      ]
    });
    assert.equal(stageLevel.valid, false);
    assert.equal(stageLevel.code, CB_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized plans beyond max stage bound', () => {
    const tight = new CrossLadderCompositionPolicyGate({ maxStages: 2 });
    const stages = [
      { id: 'a', ladder: 'L22', satellite: 'BR' },
      { id: 'b', ladder: 'L22', satellite: 'BS' },
      { id: 'c', ladder: 'L23', satellite: 'BW' }
    ];
    const res = tight.evaluatePlan({ compositionId: 'over', stages });
    assert.equal(res.valid, false);
    assert.equal(res.code, CB_CODES.OVERSIZED_PLAN_DENY);
    assert.ok(CB_MAX_STAGES >= 2);
  });
});

describe('Mission CB — Cross-Ladder Composition Port (SPEC-0085)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new CrossLadderCompositionPort();
  });

  it('compose happy path: L22+L23 stages → stage seals + CB receipt', () => {
    const res = port.compose(sampleHappyPlan());
    assert.equal(res.ok, true);
    assert.equal(res.code, CB_CODES.COMPOSE_OK);
    assert.equal(res.compositionId, 'cb-demo-l22-l23');
    assert.equal(res.rootDigest.length, 64);
    assert.equal(res.stageSeals.length, 4);

    for (const seal of res.stageSeals) {
      assert.match(seal.sealId, /^STAGE-SEAL-(BR|BT|BW|BZ)-[a-f0-9]{16}$/);
      assert.equal(seal.digest.length, 64);
    }

    // Digest chaining across stages
    assert.equal(res.stageSeals[0].prevDigest, null);
    assert.equal(res.stageSeals[1].prevDigest, res.stageSeals[0].digest);
    assert.equal(res.stageSeals[2].prevDigest, res.stageSeals[1].digest);

    assert.equal(res.receipt.kind, CB_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CB-RCPT-'));
    assert.equal(res.receipt.status, 'OK');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.rootDigest, res.rootDigest);

    const stored = port.getComposition(res.compositionId);
    assert.ok(stored);
    assert.equal(stored.rootDigest, res.rootDigest);
  });

  it('deny Fundacion emits sealed DENIED receipt', () => {
    const res = port.compose({
      compositionId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      stages: [{ id: 's1', ladder: 'L22', satellite: 'BR' }]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CB_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.receipt.status, 'DENIED');
    assert.ok(res.receipt.receiptId.startsWith('CB-RCPT-'));
    assert.equal(verifyCrossLadderCompositionReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENIED receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.compose({
      compositionId: 'deny-secret',
      stages: [
        {
          id: 's1',
          ladder: 'L23',
          satellite: 'BY',
          payload: { token: secret }
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CB_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.status, 'DENIED');
  });

  it('deny empty plan emits sealed DENIED receipt', () => {
    const res = port.compose({ compositionId: 'deny-empty', stages: [] });
    assert.equal(res.ok, false);
    assert.equal(res.code, CB_CODES.EMPTY_PLAN_DENY);
    assert.equal(res.receipt.status, 'DENIED');
  });

  it('verifyTrail validates CB receipt chain; tamper breaks trail', () => {
    const a = port.compose(sampleHappyPlan({ compositionId: 'trail-a' }));
    const b = port.compose({
      compositionId: 'trail-b',
      stages: [
        { id: 't1', ladder: 'L22', satellite: 'BU' },
        { id: 't2', ladder: 'L23', satellite: 'BX' }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CB_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    // Tamper mid-trail (break self-hash without rewriting chain links)
    const mid = port.receipts[0];
    port.receipts = [{ ...mid, compositionId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CB_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not Airflow/Temporal and not general AGI planner', () => {
    assert.equal(CB_PORT_KIND, 'eos-cross-ladder-composition-port');
    const receipt = buildCrossLadderCompositionReceipt({
      operation: 'COMPOSE',
      compositionId: 'nonclaim',
      status: 'OK'
    });
    assert.equal(receipt.nonClaims.airflowTemporal, false);
    assert.equal(receipt.nonClaims.agiPlanner, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CB_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CB_PRODUCTION_READY, 'NO');
  });

  it('buildStageSealStub emits STAGE-SEAL-<satellite>-<sha16> format', () => {
    const seal = buildStageSealStub(
      { id: 'stub1', ladder: 'L22', satellite: 'BS', inputDigest: null, payload: null },
      null,
      sha256Canonical
    );
    assert.match(seal.sealId, /^STAGE-SEAL-BS-[a-f0-9]{16}$/);
    assert.equal(seal.satellite, 'BS');
    assert.equal(seal.ladder, 'L22');
  });
});
