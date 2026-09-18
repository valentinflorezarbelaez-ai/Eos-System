/**
 * @file tests/eos-cc-mission-portfolio-budget-port.test.js
 * SPEC-0086 / Mission CC — Mission Economics & Portfolio Budget Governor Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   NON-CLAIM: ≠ FinOps SaaS / ≠ cloud billing integrator
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CC_PRODUCTION_READY,
  CC_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CC_RECEIPT_KIND,
  sha256Canonical,
  buildMissionPortfolioBudgetReceipt,
  verifyMissionPortfolioBudgetReceipt,
  canonicalMissionPortfolioBudgetSealBody,
  _resetReceiptSeqForTests
} from '../src/core/economics/mission-portfolio-budget-receipt.js';

import {
  MissionPortfolioBudgetPolicyGate,
  CC_CODES,
  CC_MAX_ALLOCATIONS,
  CC_THROTTLE_RATIO,
  CC_MISSION_ID_PATTERN,
  CC_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/economics/mission-portfolio-budget-policy-gate.js';

import {
  MissionPortfolioBudgetPort,
  CC_PORT_PRODUCTION_READY,
  CC_PORT_KIND,
  computeAllocationTotals,
  decideBudget
} from '../src/core/economics/mission-portfolio-budget-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionPortfolioBudget1234567890';
}

function sampleHappyPlan(overrides = {}) {
  return {
    portfolioId: 'cc-demo-portfolio',
    label: 'multi-mission envelope under budget',
    envelope: {
      latencyMsBudget: 1000,
      costUnitsBudget: 100,
      riskScoreBudget: 50
    },
    allocations: [
      { missionId: 'CB', latencyMs: 200, costUnits: 20, riskScore: 10 },
      { missionId: 'BR', latencyMs: 150, costUnits: 15, riskScore: 8 },
      { missionId: 'BW', latencyMs: 100, costUnits: 10, riskScore: 5 }
    ],
    ...overrides
  };
}

describe('Mission CC — Mission Portfolio Budget Receipt (SPEC-0086)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CC_PRODUCTION_READY, 'NO');
    assert.equal(CC_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CC_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CC_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CC-RCPT-* with valid SHA-256 hash', () => {
    const receipt = buildMissionPortfolioBudgetReceipt({
      operation: 'EVALUATE',
      portfolioId: 'cc-demo',
      decision: 'ALLOW',
      rootDigest: sha256Canonical({ sample: 'budget-data' }),
      allocationCount: 2
    });

    assert.equal(receipt.kind, CC_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CC-RCPT-'));
    assert.equal(receipt.portfolioId, 'cc-demo');
    assert.equal(receipt.decision, 'ALLOW');
    assert.equal(receipt.allocationCount, 2);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.finOpsSaas, false);
    assert.equal(receipt.nonClaims.cloudBillingIntegrator, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalMissionPortfolioBudgetSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyMissionPortfolioBudgetReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildMissionPortfolioBudgetReceipt({
      operation: 'EVALUATE',
      portfolioId: 'cc-demo',
      decision: 'ALLOW',
      allocationCount: 1
    });

    const tampered = { ...receipt, portfolioId: 'cc-tampered-hacked' };
    const verifyRes = verifyMissionPortfolioBudgetReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CC — Mission Portfolio Budget Policy Gate (SPEC-0086)', () => {
  let gate;

  beforeEach(() => {
    gate = new MissionPortfolioBudgetPolicyGate();
  });

  it('validates a well-formed portfolio envelope plan', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CC_CODES.PLAN_VALID_OK);
    assert.equal(res.allocations.length, 3);
    assert.ok(CC_MISSION_ID_PATTERN.test('CB'));
    assert.ok(CC_MISSION_ID_PATTERN.test('BW'));
    assert.ok(CC_MAX_ALLOCATIONS >= 2);
    assert.ok(CC_THROTTLE_RATIO > 0 && CC_THROTTLE_RATIO < 1);
  });

  it('rejects empty allocation plans fail-closed', () => {
    const empty = gate.evaluatePlan({
      portfolioId: 'empty',
      envelope: { latencyMsBudget: 1, costUnitsBudget: 1, riskScoreBudget: 1 },
      allocations: []
    });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CC_CODES.EMPTY_PLAN_DENY);

    const missing = gate.evaluatePlan({
      portfolioId: 'missing',
      envelope: { latencyMsBudget: 1, costUnitsBudget: 1, riskScoreBudget: 1 }
    });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CC_CODES.EMPTY_PLAN_DENY);
  });

  it('rejects invalid envelopes and unknown mission ids', () => {
    const badEnv = gate.evaluatePlan({
      portfolioId: 'bad-env',
      envelope: { latencyMsBudget: -1, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [{ missionId: 'CB', latencyMs: 1, costUnits: 1, riskScore: 1 }]
    });
    assert.equal(badEnv.valid, false);
    assert.equal(badEnv.code, CC_CODES.INVALID_ENVELOPE_DENY);

    const badId = gate.evaluatePlan({
      portfolioId: 'bad-id',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [{ missionId: '!!!', latencyMs: 1, costUnits: 1, riskScore: 1 }]
    });
    assert.equal(badId.valid, false);
    assert.equal(badId.code, CC_CODES.UNKNOWN_MISSION_ID_DENY);
  });

  it('rejects malformed allocations (negative metrics)', () => {
    const res = gate.evaluatePlan({
      portfolioId: 'neg',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        { missionId: 'CB', latencyMs: -5, costUnits: 1, riskScore: 1 }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CC_CODES.MALFORMED_ALLOCATION_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      portfolioId: 'leak',
      label: `budget with key ${secret}`,
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        { missionId: 'CB', latencyMs: 1, costUnits: 1, riskScore: 1 }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CC_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      portfolioId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/budget.json',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        { missionId: 'CB', latencyMs: 1, costUnits: 1, riskScore: 1 }
      ]
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CC_CODES.FUNDACION_ALWAYS_DENY);

    const rowLevel = gate.evaluatePlan({
      portfolioId: 'fundacion-row',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        {
          missionId: 'CB',
          latencyMs: 1,
          costUnits: 1,
          riskScore: 1,
          targetPath: '/fundacion/memory.json'
        }
      ]
    });
    assert.equal(rowLevel.valid, false);
    assert.equal(rowLevel.code, CC_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized plans beyond max allocation bound', () => {
    const tight = new MissionPortfolioBudgetPolicyGate({ maxAllocations: 2 });
    const allocations = [
      { missionId: 'CB', latencyMs: 1, costUnits: 1, riskScore: 1 },
      { missionId: 'BR', latencyMs: 1, costUnits: 1, riskScore: 1 },
      { missionId: 'BW', latencyMs: 1, costUnits: 1, riskScore: 1 }
    ];
    const res = tight.evaluatePlan({
      portfolioId: 'over',
      envelope: { latencyMsBudget: 100, costUnitsBudget: 100, riskScoreBudget: 100 },
      allocations
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CC_CODES.OVERSIZED_PLAN_DENY);
  });
});

describe('Mission CC — Mission Portfolio Budget Port (SPEC-0086)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new MissionPortfolioBudgetPort();
  });

  it('evaluate happy path: under-budget → ALLOW + CC receipt', () => {
    const res = port.evaluate(sampleHappyPlan());
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'ALLOW');
    assert.equal(res.code, CC_CODES.EVALUATE_ALLOW);
    assert.equal(res.portfolioId, 'cc-demo-portfolio');
    assert.equal(res.rootDigest.length, 64);
    assert.equal(res.allocations.length, 3);
    assert.equal(res.totals.latencyMs, 450);
    assert.equal(res.totals.costUnits, 45);
    assert.equal(res.totals.riskScore, 23);

    assert.equal(res.receipt.kind, CC_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CC-RCPT-'));
    assert.equal(res.receipt.decision, 'ALLOW');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.rootDigest, res.rootDigest);

    const stored = port.getPortfolio(res.portfolioId);
    assert.ok(stored);
    assert.equal(stored.rootDigest, res.rootDigest);
  });

  it('over hard budget → DENY with OVER_BUDGET_DENY', () => {
    const res = port.evaluate(
      sampleHappyPlan({
        portfolioId: 'over-hard',
        envelope: {
          latencyMsBudget: 100,
          costUnitsBudget: 100,
          riskScoreBudget: 50
        }
      })
    );
    assert.equal(res.ok, false);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.code, CC_CODES.OVER_BUDGET_DENY);
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.reasons.some((r) => /latencyMs over budget/.test(r)));
  });

  it('soft throttle band → THROTTLE when under hard budget', () => {
    // totals latency 450 / budget 500 = 0.9 ≥ 0.85 throttle
    const res = port.evaluate(
      sampleHappyPlan({
        portfolioId: 'soft-throttle',
        envelope: {
          latencyMsBudget: 500,
          costUnitsBudget: 200,
          riskScoreBudget: 100
        }
      })
    );
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'THROTTLE');
    assert.equal(res.code, CC_CODES.OVER_BUDGET_THROTTLE);
    assert.equal(res.receipt.decision, 'THROTTLE');
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.evaluate({
      portfolioId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        { missionId: 'CB', latencyMs: 1, costUnits: 1, riskScore: 1 }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CC_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CC-RCPT-'));
    assert.equal(verifyMissionPortfolioBudgetReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.evaluate({
      portfolioId: 'deny-secret',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: [
        {
          missionId: 'BY',
          latencyMs: 1,
          costUnits: 1,
          riskScore: 1,
          payload: { token: secret }
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CC_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny empty plan emits sealed DENY receipt', () => {
    const res = port.evaluate({
      portfolioId: 'deny-empty',
      envelope: { latencyMsBudget: 10, costUnitsBudget: 10, riskScoreBudget: 10 },
      allocations: []
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CC_CODES.EMPTY_PLAN_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CC receipt chain; tamper breaks trail', () => {
    const a = port.evaluate(sampleHappyPlan({ portfolioId: 'trail-a' }));
    const b = port.evaluate({
      portfolioId: 'trail-b',
      envelope: { latencyMsBudget: 1000, costUnitsBudget: 100, riskScoreBudget: 50 },
      allocations: [
        { missionId: 'BU', latencyMs: 10, costUnits: 1, riskScore: 1 },
        { missionId: 'BX', latencyMs: 10, costUnits: 1, riskScore: 1 }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CC_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, portfolioId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CC_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not FinOps SaaS and not cloud billing integrator', () => {
    assert.equal(CC_PORT_KIND, 'eos-mission-portfolio-budget-port');
    const receipt = buildMissionPortfolioBudgetReceipt({
      operation: 'EVALUATE',
      portfolioId: 'nonclaim',
      decision: 'ALLOW'
    });
    assert.equal(receipt.nonClaims.finOpsSaas, false);
    assert.equal(receipt.nonClaims.cloudBillingIntegrator, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CC_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CC_PRODUCTION_READY, 'NO');
  });

  it('computeAllocationTotals and decideBudget helpers are consistent', () => {
    const totals = computeAllocationTotals([
      { latencyMs: 10, costUnits: 2, riskScore: 1 },
      { latencyMs: 5, costUnits: 3, riskScore: 2 }
    ]);
    assert.deepEqual(totals, { latencyMs: 15, costUnits: 5, riskScore: 3 });

    const allow = decideBudget(
      totals,
      { latencyMsBudget: 100, costUnitsBudget: 100, riskScoreBudget: 100 }
    );
    assert.equal(allow.decision, 'ALLOW');

    const deny = decideBudget(
      totals,
      { latencyMsBudget: 10, costUnitsBudget: 100, riskScoreBudget: 100 }
    );
    assert.equal(deny.decision, 'DENY');
    assert.equal(deny.code, CC_CODES.OVER_BUDGET_DENY);
  });
});
