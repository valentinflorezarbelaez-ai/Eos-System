/**
 * C8 E2E local fixture — HITL reject path + successful governed close
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
import { AuthorityTruthSource } from '../src/core/authority/authority-truth-source.js';
import { SDD_STATES, TransitionEnforcer } from '../src/core/sdd/sdd-fsm-engine.js';
import { TutorMaestro } from '../src/core/tutor/tutor-maestro.js';
import { walkToState } from './helpers/fsm-walk.js';

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-e2e-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'eos-e2e-fixture', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'));
  return root;
}

/**
 * Writes a Cursor return package reporting the given test outcome, so the VERIFY gate is fed
 * observed results rather than an asserted status.
 */
function writeReturnPackage(root, missionId, taskId, { total = 3, failed = 0, nonce } = {}) {
  const file = path.join(root, `return-${taskId}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({
      schema_version: '1.0.0',
      mission_id: missionId,
      task_id: taskId,
      status: 'COMPLETED',
      summary: 'Fixture work completed',
      affected_files: [{ path: 'src/example.js', action: 'MODIFY' }],
      diff: '--- a/src/example.js\n+++ b/src/example.js\n+// fixture change',
      commands_executed: ['node --test'],
      test_results: {
        total_tests: total,
        passed_tests: total - failed,
        failed_tests: failed,
        pass_rate: total === 0 ? 0 : (total - failed) / total
      },
      evidence: [],
      unknowns: [],
      risks: [],
      ...(nonce ? { nonce } : {})
    })
  );
  return file;
}

test('E2E-01: full local cycle create→plan→package→report→pause→resume→close', () => {
  const root = fixtureRoot();
  const tutor = new TutorMaestro();
  const pre = tutor.explainBefore({
    action_id: 'e2e.create_plan_close',
    objective: 'Prove governed local mission cycle on disposable fixture',
    concept: 'MissionRuntime + AuthorityTruthSource',
    scope: [root],
    rationale: 'C8 acceptance requires measured E2E',
    risks: ['Side effect .missions under fixture only'],
    expected_evidence: ['exit success', 'phase COMPLETED', 'tasks PLANNED'],
    rollback: 'Delete fixture temp directory',
    hitl_status: 'NOT_REQUIRED_FOR_BRIDGE_PLAN'
  });
  assert.match(pre, /TUTOR \(antes\)/);

  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'E2E governed fixture', projectPath: '.' });
  const planned = rt.planMission(created.mission_id);
  assert.equal(planned.tasks_generated, 3);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, '.missions', created.mission_id, 'mission-package.json'), 'utf8')
  );
  assert.equal(pkg.phase, 'PLAN');
  assert.equal(pkg.orchestration.tasks[0].status, 'PLANNED');
  assert.ok(planned.transitions.some((t) => t.event_type === 'human.approve_direction'));
  assert.ok(!planned.transitions.some((t) => t.event_type === 'runtime.plan_mission'));
  const pack = rt.packageMission(created.mission_id);
  assert.ok(pack.manifest_hash);
  const report = rt.reportMission(created.mission_id, 'json');
  assert.equal(report.executive_summary.epistemic_verdict, 'NOT_PROVEN');
  rt.pauseMission(created.mission_id);
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.PAUSED);
  rt.resumeMission(created.mission_id);

  // Completion requires real work to come back and pass verification.
  const taskId = planned.plan.tasks[0].task_id;
  const submitted = rt.submitReturnPackage(
    created.mission_id,
    writeReturnPackage(root, created.mission_id, taskId, { nonce: 'E2E-01-NONCE' })
  );
  assert.equal(submitted.verdict, 'ACCEPT');

  const advanced = [];
  for (let i = 0; i < 8; i++) {
    if (rt.ats.getSnapshot(created.mission_id).state === SDD_STATES.COMPLETED) break;
    advanced.push(rt.advanceMission(created.mission_id));
  }
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.COMPLETED);
  assert.ok(advanced.some((a) => a.event_type === 'verification.complete'));
  assert.ok(advanced.some((a) => a.event_type === 'human.approve_release'));

  const verification = rt.verifyMission(created.mission_id);
  assert.equal(verification.valid, true);
  assert.equal(verification.authority_snapshot.code, 'ATS_SNAPSHOT_VERIFIED');

  const post = tutor.explainAfter(
    { action_id: 'e2e.create_plan_close' },
    {
      observed: `mission ${created.mission_id} completed via commitTransition`,
      exit_code: 0,
      classification: 'MEASURED',
      interpretation: 'Local fixture cycle succeeded without network or main mutation',
      next_decision: 'Expand HITL reject drill (E2E-02)'
    }
  );
  assert.match(post, /MEASURED/);
});

test('E2E-02: HITL-required transition without receipt is blocked (reject path)', () => {
  const root = fixtureRoot();
  const missions = path.join(root, '.missions');
  const missionId = 'MIS-E2E-HITL';
  fs.mkdirSync(path.join(missions, missionId, 'ledger'), { recursive: true });
  fs.writeFileSync(
    path.join(missions, missionId, 'mission-package.json'),
    JSON.stringify({ mission_id: missionId, status: 'active', phase: null }, null, 2)
  );
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  ats.initMission({ missionId });

  walkToState(ats, missionId, SDD_STATES.HUMAN_DIRECTION_GATE);

  assert.throws(
    () =>
      ats.commitTransition({
        missionId,
        event_type: 'human.approve_direction',
        to_state: SDD_STATES.DISCOVER,
        authority_level: 'LEVEL_0'
      }),
    /HITL_DENIED|GATE_SKIPPED/
  );
  assert.equal(ats.getSnapshot(missionId).state, SDD_STATES.HUMAN_DIRECTION_GATE);
});

test('E2E-03: checkpoint restore recovers prior state (rollback drill)', () => {
  const enforcer = new TransitionEnforcer();
  const snapshot = {
    mission_id: 'MIS-E2E-RB',
    state: SDD_STATES.PLAN,
    previous_state: SDD_STATES.VISION_INTAKE,
    sequence: 2
  };
  const cp = enforcer.createCheckpoint(snapshot);
  assert.ok(cp.checkpoint_hash);
  const restored = enforcer.restoreCheckpoint(cp);
  assert.equal(restored.state, SDD_STATES.PLAN);
  assert.equal(restored.mission_id, 'MIS-E2E-RB');
});

test('E2E-04: the executive report reflects observed returns, not constants', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'honest reporting', projectPath: '.' });
  const planned = rt.planMission(created.mission_id);
  const taskId = planned.plan.tasks[0].task_id;

  // Before any work comes back, nothing is proven.
  const before = rt.reportMission(created.mission_id, 'json');
  assert.equal(before.executive_summary.epistemic_verdict, 'NOT_PROVEN');
  assert.ok(before.task_execution_summary.every((t) => t.status === 'PLANNED'));

  // A return with failing tests must not upgrade the verdict.
  rt.submitReturnPackage(
    created.mission_id,
    writeReturnPackage(root, created.mission_id, taskId, { total: 10, failed: 4 })
  );
  const failing = rt.reportMission(created.mission_id, 'json');
  assert.equal(failing.executive_summary.epistemic_verdict, 'NOT_PROVEN');
  assert.ok(failing.task_execution_summary.every((t) => t.status === 'PLANNED'));

  // A clean return plus the full gated path yields a scoped technical verdict.
  rt.submitReturnPackage(
    created.mission_id,
    writeReturnPackage(root, created.mission_id, taskId, { total: 5, failed: 0 })
  );
  for (let i = 0; i < 8 && rt.ats.getSnapshot(created.mission_id).state !== SDD_STATES.COMPLETED; i++) {
    rt.advanceMission(created.mission_id);
  }

  const after = rt.reportMission(created.mission_id, 'json');
  assert.equal(after.executive_summary.epistemic_verdict, 'TECHNICALLY_VERIFIED_WITHIN_LOCAL_SCOPE');
  assert.equal(after.task_execution_summary.find((t) => t.task_id === taskId).status, 'VERIFIED');
  assert.equal(
    after.task_execution_summary.filter((t) => t.status === 'PLANNED').length,
    planned.plan.tasks.length - 1,
    'tasks with no submitted return must stay PLANNED'
  );
});
