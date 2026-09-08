import test from 'node:test';
import assert from 'node:assert/strict';
import { LongitudinalRealOperationEngine } from '../scripts/engine/longitudinal-real-operation.js';

// ====================================================
// EOS LONGITUDINAL REAL OPERATION TESTS (LR-01..06)
// ====================================================

const engine = new LongitudinalRealOperationEngine();

test('LR-01: Mission Stream Telemetry records structured trace with SHA-256 hash', () => {
  const res = engine.recordMissionTelemetry({
    missionId: 'MIS-REAL-001',
    costUsd: 38.0,
    latencyHours: 2.1
  });

  assert.equal(res.missionId, 'MIS-REAL-001');
  assert.equal(res.rework, 0);
  assert.ok(res.recordHash.length === 64);
});

test('LR-02 & 03: Multi-Window Temporal Drift verifies stability across Weeks 1, 4, 8, and 12', () => {
  const res = engine.evaluateTemporalDrift();

  assert.equal(res.stableAcrossTemporalWindows, true);
  assert.equal(res.windows.week12.qualityScore, 10.0);
  assert.ok(res.windows.week12.costUsd < res.windows.week1.costUsd);
  assert.equal(res.verdict, 'TEMPORAL_DRIFT_ANALYSIS_PASSED_STABLE');
});

test('LR-04: Reliability and User Outcome explicitly qualifies sample size N=120 and failure definitions', () => {
  const res = engine.evaluateReliabilityAndOutcome({
    sampleSize: 120,
    observedFailures: 0
  });

  assert.equal(res.sampleSize, 120);
  assert.equal(res.observedFailures, 0);
  assert.equal(res.reliabilityPct, 100.0);
  assert.ok(res.reliabilityClaim.includes('N=120'));
  assert.equal(res.verdict, 'RELIABILITY_AND_OUTCOME_STATISTICALLY_QUALIFIED');
});

test('LR-05: In-Flight Churn recovers from MCP schema breaking change without mission collapse', () => {
  const res = engine.simulateInFlightChurn({
    activeMissionId: 'MIS-CHURN-01',
    churnType: 'API_SCHEMA_SHIFT'
  });

  assert.equal(res.recovered, true);
  assert.equal(res.missionInterrupted, false);
  assert.equal(res.verdict, 'IN_FLIGHT_CHURN_SEAMLESSLY_RECOVERED');
});

test('LR-06: Independent Evidence Exporter seals package with SHA-256 for blind third-party audits', () => {
  const res = engine.exportImmutableEvidencePackage('PERIOD-2026-Q3');

  assert.ok(res.immutablePackageHash.length === 64);
  assert.equal(res.blindAuditReconstructible, true);
  assert.equal(res.verdict, 'IMMUTABLE_EVIDENCE_PACKAGE_EXPORTED');
});

test('LR-001 Program: Completes full longitudinal real operation suite cleanly', () => {
  const fullRun = engine.executeRealOperationProgram();

  assert.equal(fullRun.program, 'EOS-LONGITUDINAL-REAL-OPERATION-001');
  assert.equal(fullRun.allVectorsPassed, true);
  assert.equal(fullRun.verdict, 'EOS_LONGITUDINAL_REAL_OPERATION_001_CERTIFIED');
});
