import test from 'node:test';
import assert from 'node:assert/strict';
import { CursorCommandCenterEngine } from '../scripts/engine/cursor-command-center-engine.js';

test('Frente 2: Cursor Agent Pipeline enforces Request -> Classify -> Authorize -> Execute', () => {
  const engine = new CursorCommandCenterEngine();

  // 1. Low risk query
  const q1 = engine.processCursorAgentRequest({ actionType: 'QUERY_DOCS', targetPath: 'docs/core/GOVERNANCE.md' });
  assert.equal(q1.classifiedRiskTier, 'LOW');
  assert.equal(q1.authorizationStatus, 'AUTHORIZED');

  // 2. Medium risk canary write
  const q2 = engine.processCursorAgentRequest({ actionType: 'WRITE_CANARY', targetPath: 'EOS-Lab/Canary-Alpha/src/Component.js' });
  assert.equal(q2.classifiedRiskTier, 'MEDIUM');
  assert.equal(q2.authorizationStatus, 'AUTHORIZED');

  // 3. High risk target write without approval -> BLOCKED
  const q3 = engine.processCursorAgentRequest({ actionType: 'WRITE_EXTERNAL_TARGET', targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\src\\app.js', hasHumanL2Approval: false });
  assert.equal(q3.classifiedRiskTier, 'CRITICAL');
  assert.equal(q3.authorizationStatus, 'DENIED_OR_BLOCKED');

  // 4. High risk with L2 approval
  const q4 = engine.processCursorAgentRequest({ actionType: 'WRITE_EXTERNAL_TARGET', targetPath: 'docs/external/migration.md', hasHumanL2Approval: true });
  assert.equal(q4.classifiedRiskTier, 'HIGH');
  assert.equal(q4.authorizationStatus, 'AUTHORIZED');
});

test('Frente 4: Agent Fabric enforces Anti-Majority Decision Principle', () => {
  const engine = new CursorCommandCenterEngine();

  const votes = [
    { agent: 'RESEARCHER', vote: 'APPROVE' },
    { agent: 'ARCHITECT', vote: 'APPROVE' },
    { agent: 'IMPLEMENTER', vote: 'APPROVE' }
  ];

  // If evidence is attached and conforms to Constitution -> APPROVED
  const d1 = engine.evaluateSubagentDecision(votes, { verifiedEvidenceAttached: true, violatesConstitution: false });
  assert.equal(d1.decisionStatus, 'EXECUTIVE_APPROVED_BY_EVIDENCE');

  // Even if 3 subagents approve, if evidence is missing -> REJECTED
  const d2 = engine.evaluateSubagentDecision(votes, { verifiedEvidenceAttached: false, violatesConstitution: false });
  assert.equal(d2.decisionStatus, 'EXECUTIVE_REJECTED');
});

test('Frente 8: Daily Autonomous 16-Step Improvement Loop executes safely with zero privilege escalation', () => {
  const engine = new CursorCommandCenterEngine();
  const cycle = engine.executeDailyAutonomousCycle();

  assert.equal(cycle.stepsExecuted, 16);
  assert.equal(cycle.selfImprovementAchieved, true);
  assert.equal(cycle.privilegeEscalationAttempted, false);
  assert.equal(cycle.authorityLevelPreserved, 'LEVEL_2_SUPERVISED_AUTONOMY');
});

test('Frente 10: Session Checkpoint and Seamless Resume across restarts', () => {
  const engine = new CursorCommandCenterEngine();

  const missionState = {
    missionId: 'MISSION-RESUME-001',
    dagStage: 'VERIFICATION',
    budgetUsedUsd: 0.14,
    tokens: 15400,
    evidenceChain: ['EVD-001', 'EVD-002']
  };

  const saveRes = engine.saveSessionCheckpoint('MISSION-RESUME-001', missionState);
  assert.equal(saveRes.saved, true);
  assert.ok(saveRes.signature.length === 64);

  const resumeRes = engine.resumeSessionMission('MISSION-RESUME-001');
  assert.equal(resumeRes.resumed, true);
  assert.equal(resumeRes.restoredState.dagStage, 'VERIFICATION');
  assert.equal(resumeRes.status, 'MISSION_RESUMED_SEAMLESSLY');
});
