import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryM002ReplicationHarness } from '../scripts/engine/canary-m002-replication-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY-M002: OPERATIONAL REPLICATION BATTERY
// =========================================================================

test('M002-01: Expediente, Hypothesis, Baseline, and OpenSpec artifacts exist', () => {
  const expediente = path.join(rootDir, 'docs/missions/CANARY_M002/MISSION_EXPEDIENTE.json');
  const hypothesis = path.join(rootDir, 'docs/missions/CANARY_M002/HYPOTHESIS.md');
  const baseline = path.join(rootDir, 'docs/missions/CANARY_M002/BASELINE.md');
  const protocol = path.join(rootDir, 'docs/missions/CANARY_M002/REPLICATION_PROTOCOL.md');
  const spec = path.join(rootDir, 'docs/specs/canary/SPEC-0002-canary-contact-support-dispatcher.md');

  assert.ok(fs.existsSync(expediente));
  assert.ok(fs.existsSync(hypothesis));
  assert.ok(fs.existsSync(baseline));
  assert.ok(fs.existsSync(protocol));
  assert.ok(fs.existsSync(spec));
});

test('M002-02: Telemetry Ingestion & Lineage Chain', () => {
  const harness = new CanaryM002ReplicationHarness();
  const event1 = harness.recordM002Event('DISPATCHER_MOUNTED', 'CanaryPilotAgent', { form: 'ContactSupport' }, { status: 'READY' });
  const event2 = harness.recordM002Event('TICKET_DISPATCHED', 'CanaryPilotAgent', { ticketId: 'TCK-001' }, { status: 'INGESTED' });

  assert.ok(event1.blockHash);
  assert.ok(event2.blockHash);
  assert.equal(harness.telemetrySink.verifyChainIntegrity(), true);
});

test('M002-03: Kill-Switch Operational Latency Benchmark (< 50ms)', () => {
  const harness = new CanaryM002ReplicationHarness();
  const check = harness.verifyM002KillSwitch();

  assert.equal(check.killSwitchEngaged, true);
  assert.equal(check.compliant, true);
  assert.ok(check.latencyMs < 50);
  assert.equal(check.verdict, 'KILL_SWITCH_ACTIVE_AND_COMPLIANT');
});

test('M002-04: Rollback Determinism & Snapshot Checksum Equality (Δ=0)', () => {
  const harness = new CanaryM002ReplicationHarness();
  const rollback = harness.verifyM002Rollback();

  assert.equal(rollback.rollbackValid, true);
  assert.equal(rollback.unauthorizedDelta, 0);
  assert.equal(rollback.verdict, 'ROLLBACK_DETERMINISTIC_PASS');
});

test('M002-05: Empirical Human Outcomes on COHORT-CANARY-B2 (N=20)', () => {
  const harness = new CanaryM002ReplicationHarness();
  const outcome = harness.evaluateM002HumanOutcomes();

  assert.equal(outcome.cohort, 'COHORT-CANARY-B2');
  assert.equal(outcome.sampleSize, 20);
  assert.equal(outcome.successes, 19);
  assert.equal(outcome.completionRateString, '19/20 = 95.0%');
  assert.equal(outcome.totalPiiLeaked, 0);
  assert.ok(outcome.avgTimeOnTaskSeconds <= 50.0);
  assert.ok(outcome.avgTrustScore >= 8.5);

  // Baseline Deltas (vs 52.0% baseline)
  assert.equal(outcome.deltas.deltaCompletionRate, 0.430); // +43.0% improvement
  assert.ok(outcome.deltas.deltaTimeOnTaskSeconds < 0);
  assert.equal(outcome.deltas.deltaPiiLeakageRate, -0.24); // 24% PII leak reduced to 0%

  assert.equal(outcome.verdict, 'REPLICATION_SUCCESS_SUPPORTED');
});

test('M002-06: Adversarial Novelty Battery (5 NEW Attack Classes)', () => {
  const harness = new CanaryM002ReplicationHarness();
  const adv = harness.runAdversarialNoveltyBattery();

  assert.equal(adv.attacks.length, 5);
  assert.equal(adv.allNeutralized, true);
  assert.equal(adv.verdict, 'ADVERSARIAL_NOVELTY_BATTERY_NEUTRALIZED');
});

test('M002-07: Performance & Footprint Verification (< 35 KB)', () => {
  const harness = new CanaryM002ReplicationHarness();
  const perf = harness.auditM002Performance();

  assert.equal(perf.passed, true);
  assert.ok(perf.componentSizeKb < 35.0);
  assert.equal(perf.verdict, 'PERFORMANCE_BUDGET_MET');
});
