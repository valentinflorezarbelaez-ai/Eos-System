/**
 * C2 AuthorityTruthSource + commitTransition — positive and negative tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { AuthorityTruthSource } from '../src/core/authority/authority-truth-source.js';
import { TransitionEnforcer, SDD_STATES } from '../src/core/sdd/sdd-fsm-engine.js';
import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
import { walkToState } from './helpers/fsm-walk.js';

function makeTempMissionsRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ats-'));
  const missions = path.join(root, '.missions');
  fs.mkdirSync(missions, { recursive: true });
  return { root, missions };
}

function seedMissionPackage(missionsRoot, missionId) {
  const dir = path.join(missionsRoot, missionId);
  fs.mkdirSync(path.join(dir, 'ledger'), { recursive: true });
  const pkg = {
    schema_version: '1.0.0',
    mission_id: missionId,
    status: 'active',
    phase: null,
    orchestration: { tasks: [] }
  };
  fs.writeFileSync(path.join(dir, 'mission-package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(dir, 'direction.json'), JSON.stringify({ mission_id: missionId, goal: 't' }));
  fs.writeFileSync(path.join(dir, 'project-profile.json'), JSON.stringify({ project_id: 'PRJ-T' }));
  return dir;
}

test('ATS-01: initMission writes VISION_INTAKE only via ATS', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-01';
  seedMissionPackage(missions, missionId);
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  const res = ats.initMission({ missionId, authorityLevel: 'LEVEL_0' });
  assert.equal(res.snapshot.state, SDD_STATES.VISION_INTAKE);
  const pkg = JSON.parse(fs.readFileSync(path.join(missions, missionId, 'mission-package.json'), 'utf8'));
  assert.equal(pkg.phase, SDD_STATES.VISION_INTAKE);
  assert.ok(fs.existsSync(path.join(missions, missionId, 'authority-snapshot.json')));
});

test('ATS-02: valid runtime.plan_mission transition persists PLAN', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-02';
  seedMissionPackage(missions, missionId);
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  ats.initMission({ missionId });
  const dirHash = 'a'.repeat(64);
  const profHash = 'b'.repeat(64);
  const res = ats.commitTransition({
    missionId,
    event_type: 'runtime.plan_mission',
    to_state: SDD_STATES.PLAN,
    authority_level: 'LEVEL_0',
    artifacts: [
      { id: 'direction', kind: 'direction', sha256: dirHash },
      { id: 'project_profile', kind: 'project_profile', sha256: profHash }
    ]
  });
  assert.equal(res.success, true);
  assert.equal(res.snapshot.state, SDD_STATES.PLAN);
  const pkg = JSON.parse(fs.readFileSync(path.join(missions, missionId, 'mission-package.json'), 'utf8'));
  assert.equal(pkg.phase, SDD_STATES.PLAN);
});

test('ATS-03: unknown transition rejected with no phase mutation', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-03';
  seedMissionPackage(missions, missionId);
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  ats.initMission({ missionId });
  assert.throws(
    () =>
      ats.commitTransition({
        missionId,
        event_type: 'runtime.teleport',
        to_state: SDD_STATES.COMPLETED,
        authority_level: 'LEVEL_0'
      }),
    /TRANSITION_DENIED|INVALID_STATE_TRANSITION/
  );
  const snap = ats.getSnapshot(missionId);
  assert.equal(snap.state, SDD_STATES.VISION_INTAKE);
});

test('ATS-04: insufficient authority rejected', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-04';
  seedMissionPackage(missions, missionId);
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  ats.initMission({ missionId });
  // Reach SUPERVISE through real transitions, then attempt task.complete which needs LEVEL_1
  walkToState(ats, missionId, SDD_STATES.SUPERVISE);
  assert.throws(
    () =>
      ats.commitTransition({
        missionId,
        event_type: 'task.complete',
        to_state: SDD_STATES.VERIFY,
        authority_level: 'LEVEL_0'
      }),
    /INSUFFICIENT_AUTHORITY/
  );
  assert.equal(ats.getSnapshot(missionId).state, SDD_STATES.SUPERVISE);
});

test('ATS-05: HITL-required transition without receipt rejected', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-05';
  seedMissionPackage(missions, missionId);
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
    /GATE_SKIPPED|HITL_DENIED/
  );
});

test('ATS-06: duplicate event_id / idempotency rejected', () => {
  const { missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-06';
  seedMissionPackage(missions, missionId);
  const sharedEnforcer = new TransitionEnforcer();
  const ats = new AuthorityTruthSource({ missionsRoot: missions, enforcer: sharedEnforcer });
  ats.initMission({ missionId });
  const key = 'IDEM-FIXED-KEY';
  ats.commitTransition({
    missionId,
    event_type: 'runtime.plan_mission',
    to_state: SDD_STATES.PLAN,
    authority_level: 'LEVEL_0',
    idempotency_key: key,
    artifacts: [
      { kind: 'direction', sha256: 'a'.repeat(64) },
      { kind: 'project_profile', sha256: 'b'.repeat(64) }
    ]
  });
  // Replay protection is evaluated before the state check, so reusing the key is refused
  // without any snapshot manipulation.
  assert.throws(
    () =>
      ats.commitTransition({
        missionId,
        event_type: 'runtime.plan_mission',
        to_state: SDD_STATES.PLAN,
        authority_level: 'LEVEL_0',
        idempotency_key: key,
        artifacts: [
          { kind: 'direction', sha256: 'a'.repeat(64) },
          { kind: 'project_profile', sha256: 'b'.repeat(64) }
        ]
      }),
    /REPLAY_DETECTED/
  );
});

test('ATS-07: MissionRuntime planMission uses commitTransition (no direct phase assign path)', () => {
  const { root } = makeTempMissionsRoot();
  // Minimal project fixture
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'Prove ATS wiring', projectPath: '.' });
  const planned = rt.planMission(created.mission_id);
  assert.equal(planned.tasks_generated, 3);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, '.missions', created.mission_id, 'mission-package.json'), 'utf8')
  );
  assert.equal(pkg.phase, SDD_STATES.PLAN);
  const snap = JSON.parse(
    fs.readFileSync(path.join(root, '.missions', created.mission_id, 'authority-snapshot.json'), 'utf8')
  );
  assert.equal(snap.state, SDD_STATES.PLAN);
  assert.ok(planned.transitions?.length >= 5);
  assert.ok(!planned.transitions.some((t) => t.event_type === 'runtime.plan_mission'));
  assert.ok(fs.existsSync(path.join(root, '.missions', created.mission_id, 'hitl', 'direction-approval.json')));
});

test('ATS-08: pause/resume go through commitTransition', () => {
  const { root } = makeTempMissionsRoot();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'Control transitions', projectPath: '.' });
  rt.planMission(created.mission_id);
  rt.pauseMission(created.mission_id, 'test pause');
  let snap = rt.ats.getSnapshot(created.mission_id);
  assert.equal(snap.state, SDD_STATES.PAUSED);
  rt.resumeMission(created.mission_id);
  snap = rt.ats.getSnapshot(created.mission_id);
  assert.equal(snap.state, SDD_STATES.PLAN);
});

test('ATS-09: close is refused before the verification path and cancel is the honest exit', () => {
  const { root } = makeTempMissionsRoot();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'Premature completion', projectPath: '.' });
  rt.planMission(created.mission_id);

  assert.throws(() => rt.closeMission(created.mission_id), /PREMATURE_COMPLETION/);
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.PLAN);

  rt.cancelMission(created.mission_id, 'abandoned in test');
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.CANCELLED);
});

test('ATS-10: COMPLETED is reachable only after traversing every canonical gate', () => {
  const { root, missions } = makeTempMissionsRoot();
  const missionId = 'MIS-ATS-10';
  seedMissionPackage(missions, missionId);
  const ats = new AuthorityTruthSource({ missionsRoot: missions });
  ats.initMission({ missionId });

  const steps = walkToState(ats, missionId, SDD_STATES.COMPLETED);
  assert.equal(ats.getSnapshot(missionId).state, SDD_STATES.COMPLETED);

  const traversed = steps.map((s) => s.to_state);
  for (const required of [
    SDD_STATES.HUMAN_DIRECTION_GATE,
    SDD_STATES.VERIFY,
    SDD_STATES.REVIEW,
    SDD_STATES.HUMAN_RELEASE_GATE,
    SDD_STATES.OPERATE_AND_LEARN
  ]) {
    assert.ok(traversed.includes(required), `completion must pass through ${required}`);
  }
  assert.ok(root);
});
