import test from 'node:test';
import assert from 'node:assert/strict';
import { EosMissionControlConsole, ProductionCandidateVerticalSlice } from '../scripts/engine/mission-control-engine.js';

// ====================================================
// EOS MISSION CONTROL & PRODUCTION PILOT TESTS
// ====================================================

const consoleHub = new EosMissionControlConsole();

test('MC-01: Registers and monitors mission telemetry in Mission Control', () => {
  const mission = consoleHub.registerMission({
    missionId: 'MIS-MC-001',
    userGoal: 'Deliver high-conversion accessible ecommerce checkout'
  });

  assert.equal(mission.missionId, 'MIS-MC-001');
  assert.equal(mission.currentStage, 'READ_ONLY');
  assert.equal(mission.status, 'RUNNING');
  assert.equal(mission.economicTelemetry.reworkCycles, 0);
  assert.ok(mission.cognitiveGraphNodesCount > 0);
});

test('MC-02: Staged Lifecycle enforces authorization barrier on controlled stages', () => {
  const mission = consoleHub.registerMission({
    missionId: 'MIS-MC-002',
    userGoal: 'Payment gateway integration'
  });

  // Attempting CONTROLLED transition without PO token -> Blocks in WAITING_APPROVAL
  const blockedRes = consoleHub.transitionStage('MIS-MC-002', 'CONTROLLED');
  assert.equal(blockedRes.status, 'WAITING_APPROVAL');

  // Transition with valid PO authorization -> Permitted
  const allowedRes = consoleHub.transitionStage('MIS-MC-002', 'CONTROLLED', { poToken: 'PO_AUTH_LEVEL_2' });
  assert.equal(allowedRes.status, 'STAGE_TRANSITION_SUCCESS');
  assert.equal(allowedRes.currentStage, 'CONTROLLED');
});

test('MC-03: Renders comprehensive text-based console dashboard', () => {
  const dashboard = consoleHub.renderConsoleDashboard('MIS-MC-001');

  assert.ok(dashboard.dashboardHeader.includes('MIS-MC-001'));
  assert.equal(dashboard.agentsActiveCount, 2);
  assert.equal(dashboard.evidenceIntegrity, 1.0);
  assert.equal(dashboard.verdict, 'MISSION_CONTROL_TELEMETRY_HEALTHY');
});

test('Vertical Slice: Completes full 7-stage Production-Candidate Vertical Slice', () => {
  const sliceRunner = new ProductionCandidateVerticalSlice();
  const pilotResult = sliceRunner.executeFullCandidatePilot('Deliver real-world accessible client portal');

  assert.equal(pilotResult.all7StagesPassed, true);
  assert.equal(pilotResult.finalDashboard.stage, 'EXTERNAL_CERTIFIED');
  assert.equal(pilotResult.status, 'PRODUCTION_CANDIDATE_PILOT_VERIFIED_PASS');
});
