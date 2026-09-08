import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TailDistributionCalculator,
  LongitudinalEvidenceEngine
} from '../scripts/engine/longitudinal-evidence-engine.js';

// ====================================================
// EOS LONGITUDINAL OPERATION & EVIDENCE TESTS (LOE-01..08)
// ====================================================

const engine = new LongitudinalEvidenceEngine();

test('TailDistributionCalculator: Accurately extracts P50, P90, P95, and P99 percentiles', () => {
  const calc = new TailDistributionCalculator();
  const sample = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const p = calc.calculatePercentiles(sample);

  assert.equal(p.p50, 6);
  assert.equal(p.p90, 10);
  assert.equal(p.p95, 10);
  assert.equal(p.p99, 10);
});

test('LOE-01..06: Longitudinal Campaign proves bounded tail distribution and zero security drift over 6 months', () => {
  const res = engine.executeLongitudinalCampaign(6);

  assert.equal(res.campaignMonths, 6);
  assert.equal(res.totalMissionsEvaluated, 120);
  assert.ok(res.deliveryTimesPercentiles.p99 <= 4.0); // P99 < 4 hours
  assert.ok(res.costsPercentiles.p99 <= 70); // P99 < $70 USD
  assert.equal(res.longitudinalDrift.securityViolationsCount, 0);
  assert.equal(res.longitudinalDrift.memoryDriftPct < 0.5, true);
  assert.equal(res.verdict, 'LONGITUDINAL_CAMPAIGN_STABLE_NO_TAIL_EXPLOSION');
});

test('OA Index: Validates statistically robust Operational Advantage Vector', () => {
  const res = engine.calculateOperationalAdvantageVector();

  assert.equal(res.isAdvantageStatisticallyRobust, true);
  assert.ok(res.oaVector.delivery_speed.includes('36.8x tail speedup'));
  assert.ok(res.oaVector.cost.includes('97.3% tail savings'));
  assert.equal(res.verdict, 'OPERATIONAL_ADVANTAGE_VECTOR_CERTIFIED');
});

test('LOE-07 & 08: Monthly Independent Audit and Clean-Room Replay confirm GATE-13 remains strictly CLOSED', () => {
  const res = engine.executeAuditAndCleanReplication();

  assert.equal(res.monthlyAuditsConductedCount, 6);
  assert.equal(res.allMonthlyAuditsPassed, true);
  assert.equal(res.cleanRoomHistoricalReplication.reproductionsSuccessful, 6);
  assert.equal(res.gate13Recommendation, 'STRICTLY_CLOSED_UNTIL_PO_ROADMAP_REVIEW');
  assert.equal(res.verdict, 'LONGITUDINAL_EVIDENCE_FORMALLY_VERIFIED');
});

test('LOE-001 Program: Executes full longitudinal evidence suite cleanly', () => {
  const fullRun = engine.executeLongitudinalProgram();

  assert.equal(fullRun.program, 'EOS-LONGITUDINAL-OPERATION-EVIDENCE-001');
  assert.equal(fullRun.allVectorsPassed, true);
  assert.equal(fullRun.verdict, 'EOS_LONGITUDINAL_EVIDENCE_001_COMPLETED');
});
