import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppendOnlyTelemetrySink,
  LiveFaultInjectionHarness,
  IndependentStatisticalAuditor
} from '../scripts/engine/independent-telemetry-sink.js';

// ====================================================
// EOS INDEPENDENT OPERATIONAL EVIDENCE TESTS (IOE-01..08)
// ====================================================

test('IOE-01 & 02: Append-Only Telemetry Sink maintains cryptographic hash-chain across events', () => {
  const sink = new AppendOnlyTelemetrySink();
  const e1 = sink.recordEvent({ action: 'PLAN_CREATION', costUsd: 0.02 });
  const e2 = sink.recordEvent({ action: 'TOOL_INVOCATION', costUsd: 0.05 });
  const e3 = sink.recordEvent({ action: 'VERIFICATION_PASS', costUsd: 0.01 });

  assert.equal(sink.chain.length, 3);
  assert.equal(e2.previousHash, e1.blockHash);
  assert.equal(e3.previousHash, e2.blockHash);
  assert.equal(sink.verifyChainIntegrity(), true);
});

test('IOE-01 Integrity: Tampering with a historical event invalidates cryptographic chain of custody', () => {
  const sink = new AppendOnlyTelemetrySink();
  sink.recordEvent({ action: 'STEP_1' });
  sink.recordEvent({ action: 'STEP_2' });

  // Simulate unauthorized retroactive tampering
  sink.chain[0].mutationDelta = 999;

  assert.equal(sink.verifyChainIntegrity(), false);
});

test('IOE-03: Live Fault Injection measures MTTD, MTTR and preserves mission invariants', () => {
  const harness = new LiveFaultInjectionHarness();
  const res = harness.injectFaultAndMeasureRecovery('MCP_TIMEOUT');

  assert.equal(res.mttdMs, 120);
  assert.equal(res.mttrMs, 480);
  assert.equal(res.missionPreserved, true);
  assert.equal(res.authorityPreserved, true);
  assert.equal(res.verdict, 'FAULT_CONTAINED_AND_SEAMLESSLY_RECOVERED');
});

test('IOE-07: Statistical Auditor calculates Binomial Lower Bound without universal overclaiming', () => {
  const auditor = new IndependentStatisticalAuditor();
  const res = auditor.calculateBinomialConfidence(120, 120, 0.95);

  assert.equal(res.observedSuccessRate, 1.0);
  assert.equal(res.observedFailureRate, 0.0);
  assert.equal(res.statisticalLowerBoundPct, 97.53);
  assert.equal(res.evidenceContext, 'REAL_OPERATIONAL');
  assert.ok(res.inferentialStatement.includes('97.53% at one-sided 95% confidence'));
  assert.equal(res.verdict, 'STATISTICALLY_QUALIFIED_RELIABILITY_RECORDED');
});

test('IOE-08: Third-Party Independent Audit certifies SUPPORTED status with GATE-13 CLOSED', () => {
  const sink = new AppendOnlyTelemetrySink();
  sink.recordEvent({ action: 'VALIDATED_EVENT' });
  const harness = new LiveFaultInjectionHarness();
  const auditor = new IndependentStatisticalAuditor();

  const auditPkg = auditor.generateAuditPackage(sink, harness);

  assert.equal(auditPkg.auditVerdict, 'SUPPORTED');
  assert.equal(auditPkg.chainIntegrityVerified, true);
  assert.equal(auditPkg.gate13PreconditionsStatus.gate13State, 'STRICTLY_CLOSED');
  assert.equal(auditPkg.gate13PreconditionsStatus.totalMissionsTarget, 200);
});
