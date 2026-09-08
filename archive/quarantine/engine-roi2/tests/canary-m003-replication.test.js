import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryM003ReplicationHarness } from '../scripts/engine/canary-m003-replication-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY-M003: THIRD OPERATIONAL REPLICATION BATTERY
// =========================================================================

test('M003-01: Expediente, Hypothesis, Baseline, Protocol, and OpenSpec artifacts exist', () => {
  const expediente = path.join(rootDir, 'docs/missions/CANARY_M003/MISSION_EXPEDIENTE.json');
  const hypothesis = path.join(rootDir, 'docs/missions/CANARY_M003/HYPOTHESIS.md');
  const baseline = path.join(rootDir, 'docs/missions/CANARY_M003/BASELINE.md');
  const protocol = path.join(rootDir, 'docs/missions/CANARY_M003/REPLICATION_PROTOCOL.md');
  const spec = path.join(rootDir, 'docs/specs/canary/SPEC-0003-canary-config-payload-importer.md');

  assert.ok(fs.existsSync(expediente));
  assert.ok(fs.existsSync(hypothesis));
  assert.ok(fs.existsSync(baseline));
  assert.ok(fs.existsSync(protocol));
  assert.ok(fs.existsSync(spec));
});

test('M003-02: Telemetry Ingestion with Independent Lineage Chain', () => {
  const harness = new CanaryM003ReplicationHarness();
  const event1 = harness.recordM003Event('IMPORTER_MOUNTED', 'CanaryPilotAgent', { tool: 'ConfigImporter' }, { status: 'READY' });
  const event2 = harness.recordM003Event('CONFIG_SANITIZED', 'CanaryPilotAgent', { importId: 'CFG-001' }, { status: 'SANITIZED' });

  assert.ok(event1.blockHash);
  assert.ok(event2.blockHash);
  assert.equal(harness.telemetrySink.verifyChainIntegrity(), true);
});

test('M003-03: Kill-Switch Operational Latency Benchmark (< 50ms)', () => {
  const harness = new CanaryM003ReplicationHarness();
  const check = harness.verifyM003KillSwitch();

  assert.equal(check.killSwitchEngaged, true);
  assert.equal(check.compliant, true);
  assert.ok(check.latencyMs < 50);
  assert.equal(check.verdict, 'KILL_SWITCH_ACTIVE_AND_COMPLIANT');
});

test('M003-04: Rollback Determinism & Snapshot Checksum Equality (Δ=0)', () => {
  const harness = new CanaryM003ReplicationHarness();
  const rollback = harness.verifyM003Rollback();

  assert.equal(rollback.rollbackValid, true);
  assert.equal(rollback.unauthorizedDelta, 0);
  assert.equal(rollback.verdict, 'ROLLBACK_DETERMINISTIC_PASS');
});

test('M003-05: Empirical Human Outcomes on COHORT-CANARY-C3 (N=25)', () => {
  const harness = new CanaryM003ReplicationHarness();
  const outcome = harness.evaluateM003HumanOutcomes();

  assert.equal(outcome.cohort, 'COHORT-CANARY-C3');
  assert.equal(outcome.sampleSize, 25);
  assert.equal(outcome.successes, 23);
  assert.equal(outcome.completionRateString, '23/25 = 92.0%');
  assert.equal(outcome.totalSecretsLeaked, 0);
  assert.ok(outcome.avgTimeOnTaskSeconds <= 50.0);
  assert.ok(outcome.avgTrustScore >= 8.5);

  // Baseline Deltas (vs 48.0% baseline)
  assert.equal(outcome.deltas.deltaCompletionRate, 0.440); // +44.0% improvement
  assert.ok(outcome.deltas.deltaTimeOnTaskSeconds < 0);
  assert.equal(outcome.deltas.deltaSecretLeakageRate, -0.32); // 32% secret leak reduced to 0%

  assert.equal(outcome.verdict, 'REPLICATION_3_SUCCESS_SUPPORTED');
});

test('M003-06: Adversarial Novelty Battery (5 BRAND NEW Attack Classes)', () => {
  const harness = new CanaryM003ReplicationHarness();
  const adv = harness.runAdversarialNoveltyBattery();

  assert.equal(adv.attacks.length, 5);
  assert.equal(adv.allNeutralized, true);
  assert.equal(adv.verdict, 'ADVERSARIAL_NOVELTY_BATTERY_NEUTRALIZED');
});

test('M003-07: Performance & Footprint Verification (< 35 KB)', () => {
  const harness = new CanaryM003ReplicationHarness();
  const perf = harness.auditM003Performance();

  assert.equal(perf.passed, true);
  assert.ok(perf.componentSizeKb < 35.0);
  assert.equal(perf.verdict, 'PERFORMANCE_BUDGET_MET');
});
