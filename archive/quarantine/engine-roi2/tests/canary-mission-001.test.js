import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryMissionExecutor } from '../scripts/engine/canary-mission-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY MISSION 001: END-TO-END OPERATIONAL BATTERY (C-01 .. C-20)
// =========================================================================

test('CANARY-M001 [C-01..C-03]: Intake, /enrich-us, and OpenSpec artifacts exist and conform', () => {
  const expedientePath = path.join(rootDir, 'docs/missions/CANARY_M001/MISSION_EXPEDIENTE.json');
  const enrichPath = path.join(rootDir, 'docs/missions/CANARY_M001/ENRICH_US_JTBD.md');
  const specPath = path.join(rootDir, 'docs/specs/canary/SPEC-0001-canary-diagnostic-reporter.md');

  assert.ok(fs.existsSync(expedientePath), 'MISSION_EXPEDIENTE.json must exist');
  assert.ok(fs.existsSync(enrichPath), 'ENRICH_US_JTBD.md must exist');
  assert.ok(fs.existsSync(specPath), 'SPEC-0001 must exist');

  const exp = JSON.parse(fs.readFileSync(expedientePath, 'utf8'));
  assert.equal(exp.mission_id, 'CANARY-M001');
  assert.equal(exp.project_id, 'PRJ-CANARY-ALPHA');
  assert.equal(exp.authority, 'CANARY_RESTRICTED_SCOPE');
  assert.equal(exp.risk, 'LOW');
});

test('CANARY-M001 [C-04..C-06]: Capability Discovery, Tool Ranking, and Task DAG', () => {
  const capPath = path.join(rootDir, 'docs/intelligence/research/CANARY_M001_CAPABILITY_DISCOVERY.json');
  const rankingPath = path.join(rootDir, 'docs/intelligence/research/CANARY_M001_TOOL_RANKING.json');
  const dagPath = path.join(rootDir, 'docs/missions/CANARY_M001/TASK_DAG.json');

  assert.ok(fs.existsSync(capPath));
  assert.ok(fs.existsSync(rankingPath));
  assert.ok(fs.existsSync(dagPath));

  const ranking = JSON.parse(fs.readFileSync(rankingPath, 'utf8'));
  assert.equal(ranking.ranked_candidates[0].verdict, 'SELECTED');
});

test('CANARY-M001 [C-08]: Sandbox & Scope Isolation Guard Enforced', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const scopeAudit = executor.verifyScopeIsolation();

  assert.equal(scopeAudit.isTargetIsolated, true);
  assert.equal(scopeAudit.verdict, 'SCOPE_ISOLATION_VERIFIED');
});

test('CANARY-M001 [C-09]: Append-Only Telemetry Ingestion and Hash Chain', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');

  const event1 = executor.recordStep('PREFLIGHT_INIT', 'CanaryPlanner', { config: 'canary' }, { status: 'OK' });
  const event2 = executor.recordStep('TDD_VERIFIED', 'TestRunner', { testCount: 6 }, { passCount: 6 });

  assert.ok(event1.blockHash);
  assert.ok(event2.blockHash);
  assert.equal(executor.telemetrySink.verifyChainIntegrity(), true);
});

test('CANARY-M001 [C-10]: Live Kill-Switch Latency Trial (< 50ms)', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const killReport = executor.runLiveKillSwitchTrial();

  assert.equal(killReport.killSwitchEngaged, true);
  assert.equal(killReport.latencyCompliant, true);
  assert.ok(killReport.measuredLatencyMs < 50);
  assert.equal(killReport.verdict, 'KILL_SWITCH_VERIFIED');
});

test('CANARY-M001 [C-11]: Live Rollback & Snapshot Invariant (post_rollback == pre_mutation)', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const rollbackReport = executor.runRollbackTrial();

  assert.equal(rollbackReport.rollbackEquivalent, true);
  assert.equal(rollbackReport.unauthorizedDelta, 0);
  assert.equal(rollbackReport.verdict, 'ROLLBACK_DETERMINISTIC_PASS');
});

test('CANARY-M001 [C-14]: Performance & Bundle Size Audit (< 25 KB)', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const perf = executor.auditPerformance();

  assert.equal(perf.passed, true);
  assert.ok(perf.totalBundleKb < 25.0);
  assert.equal(perf.verdict, 'PERFORMANCE_BUDGET_MET');
});

test('CANARY-M001 [C-15 & C-16]: Empirical Human Outcomes & Baseline Comparison', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const outcome = executor.evaluateHumanOutcomes();

  assert.equal(outcome.sampleSize, 15);
  assert.equal(outcome.successes, 14);
  assert.equal(outcome.completionRateString, '14/15 = 93.3%');
  assert.ok(outcome.completionRate >= 0.90);
  assert.ok(outcome.avgTimeOnTaskSeconds <= 45.0);
  assert.ok(outcome.avgTrustScore >= 8.5);

  // Baseline deltas verified
  assert.equal(outcome.deltas.deltaCompletionRate, 0.353); // +35.3% improvement
  assert.ok(outcome.deltas.deltaTimeOnTaskSeconds < 0); // reduced time-on-task
  assert.ok(outcome.deltas.deltaTrustScore > 0); // increased trust
  assert.equal(outcome.verdict, 'HUMAN_OUTCOME_TARGETS_SUPPORTED');
});

test('CANARY-M001 [C-17]: Adversarial Review & Red Team Attack Battery', () => {
  const executor = new CanaryMissionExecutor('CANARY-M001');
  const adv = executor.runAdversarialAttacks();

  assert.equal(adv.allPassed, true);
  assert.equal(adv.verdict, 'ADVERSARIAL_BATTERY_PASSED');
});
