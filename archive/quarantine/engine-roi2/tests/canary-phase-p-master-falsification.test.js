import test from 'node:test';
import assert from 'node:assert/strict';
import { MasterFalsificationEngine } from '../scripts/engine/master-falsification-engine.js';

test('P-03 to P-06: Master Falsification Engine validates L1, L2, and L3 integrity without inflation', () => {
  const engine = new MasterFalsificationEngine();
  const report = engine.generateMasterAuditReport();

  assert.equal(report.l1_structural.status, 'VERIFIED');
  assert.equal(report.l2_governance.status, 'VERIFIED');
  assert.equal(report.l2_governance.fundacionDelta, 0);
  assert.equal(report.l2_governance.gap002Status, 'UNKNOWN');
  assert.equal(report.l2_governance.gate13Status, 'CANARY_RESTRICTED');
  assert.equal(report.l3_epistemological.ungroundedUniversalClaims, 0);
  assert.equal(report.criticalFindings.length, 0);
  assert.equal(report.verdict, 'MASTER_AUDIT_SUPPORTED_WITH_LIMITATIONS');
});

test('P-14: Epistemological Red Team neutralizes all 5 adversarial forgery/inflation probes (5/5)', () => {
  const engine = new MasterFalsificationEngine();
  const redTeamReport = engine.executeEpistemologicalRedTeam();

  assert.equal(redTeamReport.totalProbes, 5);
  assert.equal(redTeamReport.neutralizedCount, 5);
  assert.equal(redTeamReport.neutralizationRate, '100.0%');
  assert.equal(redTeamReport.verdict, 'EPISTEMOLOGICAL_RED_TEAM_PASSED');
});
