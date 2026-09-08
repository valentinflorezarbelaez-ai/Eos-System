import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomyGraduationEngine } from '../scripts/engine/autonomy-graduation-engine.js';

test('Q-06 & Q-07: Lexicographic decision yields LEVEL_2_SUPERVISED_AUTONOMY (CANARY_RESTRICTED)', () => {
  const engine = new AutonomyGraduationEngine();
  const decision = engine.evaluateGraduationLevel({
    criticalFindingsCount: 0,
    hasUnresolvedUnknowns: true, // GAP-002 is UNKNOWN
    isProductionEvidenceSufficient: false
  });

  assert.equal(decision.graduationDecision, 'LEVEL_2_SUPERVISED_AUTONOMY (CANARY_RESTRICTED)');
  assert.equal(decision.authorityBoundaries.lowRisk, 'AUTONOMOUS');
  assert.equal(decision.authorityBoundaries.mediumRisk, 'AUTONOMOUS_WITH_AUDIT');
  assert.equal(decision.authorityBoundaries.highRisk, 'HUMAN_L2_APPROVAL_REQUIRED');
  assert.equal(decision.authorityBoundaries.criticalRisk, 'HUMAN_CONTROL_ONLY');
  assert.equal(decision.governanceGates.gap002Status, 'UNKNOWN');
  assert.equal(decision.governanceGates.fundacionDelta, 0);
});

test('Q-10: Why Not Higher Level explicitly documents blockers for Level 3 and Level 4', () => {
  const engine = new AutonomyGraduationEngine();
  const decision = engine.evaluateGraduationLevel({
    criticalFindingsCount: 0,
    hasUnresolvedUnknowns: true,
    isProductionEvidenceSufficient: false
  });

  assert.equal(decision.whyNotHigherLevel.length, 2);
  assert.ok(decision.whyNotHigherLevel[0].blockedBy.includes('GAP-002 = UNKNOWN'));
  assert.ok(decision.whyNotHigherLevel[1].blockedBy.includes('GENERAL_PRODUCTION remains CLOSED'));
});

test('Q-08: Autonomy Graduation Packet generates valid sovereign governance structure', () => {
  const engine = new AutonomyGraduationEngine();
  const packet = engine.generateGraduationPacket();

  assert.equal(packet.governing_body, 'EOS_SOVEREIGN_GOVERNANCE_COUNCIL');
  assert.equal(packet.formal_decision, 'LEVEL_2_SUPERVISED_AUTONOMY (CANARY_RESTRICTED)');
  assert.equal(packet.active_governance_invariants.coreState, 'FROZEN');
  assert.equal(packet.active_governance_invariants.fundacionDelta, 0);
  assert.ok(packet.evidence_references.length >= 5);
});
