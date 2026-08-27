/**
 * Adversarial bypass battery.
 *
 * Every case here is a deliberate attempt to reach an outcome without satisfying the
 * governance path, asserted against the real runtime. Each was first executed as a probe:
 * the cases marked "regression" are ones the system originally allowed.
 *
 * Scope of the claim: these prove the enforced barriers deny the listed attempts through the
 * runtime's own APIs and on-disk state. They do not prove the absence of all bypasses — an
 * actor able to execute arbitrary ledger appends is outside what local integrity can cover.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';
import { SDD_STATES } from '../src/core/sdd/sdd-fsm-engine.js';
import { EosMcpServer } from '../src/mcp-server.js';
import { McpMissionBridge } from '../src/core/mcp/mcp-mission-bridge.js';
import { walkToState } from './helpers/fsm-walk.js';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bypass-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'bypass-fixture', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  return root;
}

function plannedMission(goal = 'bypass battery mission') {
  const root = fixture();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal, projectPath: '.' });
  const planned = rt.planMission(created.mission_id);
  return { root, rt, id: created.mission_id, dir: rt.getMissionDir(created.mission_id), planned };
}

function returnPackage(missionId, taskId, overrides = {}) {
  return {
    schema_version: '1.0.0',
    mission_id: missionId,
    task_id: taskId,
    status: 'COMPLETED',
    summary: 'battery submission',
    affected_files: [],
    diff: '',
    commands_executed: [],
    test_results: { total_tests: 2, passed_tests: 2, failed_tests: 0, pass_rate: 1 },
    evidence: [],
    unknowns: [],
    risks: [],
    ...overrides
  };
}

function writeReturn(root, name, pkg) {
  const file = path.join(root, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
  return file;
}

// ===========================================================================
// V1 — change phase manually
// ===========================================================================

test('BYPASS-V1a: editing mission-package.json phase is detected by mission verify', () => {
  const { rt, id, dir } = plannedMission();

  const pkgPath = path.join(dir, 'mission-package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.phase = SDD_STATES.COMPLETED;
  pkg.status = 'completed';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  const verification = rt.verifyMission(id);
  assert.equal(verification.valid, false);
  assert.ok(verification.discrepancies.some((d) => d.includes('mission-package.json')));
});

test('BYPASS-V1b: a tampered package never becomes authoritative', () => {
  const { rt, id, dir } = plannedMission();

  const pkgPath = path.join(dir, 'mission-package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.phase = SDD_STATES.OPERATE_AND_LEARN;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.PLAN);
  assert.throws(() => rt.closeMission(id), /PREMATURE_COMPLETION/);
});

test('BYPASS-V1c (regression): editing authority-snapshot.json is detected and blocks transitions', () => {
  const { rt, id, dir } = plannedMission();

  const snapPath = path.join(dir, 'authority-snapshot.json');
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  snap.state = SDD_STATES.OPERATE_AND_LEARN;
  snap.authority_level = 'LEVEL_4';
  fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2));

  const verification = rt.verifyMission(id);
  assert.equal(verification.valid, false);
  assert.equal(verification.authority_snapshot.code, 'ATS_SNAPSHOT_TAMPERED');

  // and the relocated state cannot be used to complete the mission
  assert.throws(() => rt.closeMission(id), /ATS_SNAPSHOT_TAMPERED/);
});

// ===========================================================================
// V2 — skip HITL
// ===========================================================================

test('BYPASS-V2a: planning refuses to self-issue a receipt when an external one is required', () => {
  const root = fixture();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'external hitl', projectPath: '.' });

  assert.throws(
    () => rt.planMission(created.mission_id, { requireExternalHitl: true }),
    /HITL_RECEIPT_REQUIRED/
  );
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.HUMAN_DIRECTION_GATE);
});

test('BYPASS-V2b: crossing the direction gate with no receipt is denied', () => {
  const root = fixture();
  const rt = new MissionRuntime({ baseDir: root, allowLocalDirectorReceipt: false });
  const created = rt.createMission({ goal: 'gate probe', projectPath: '.' });
  const id = created.mission_id;
  walkToState(rt.ats, id, SDD_STATES.HUMAN_DIRECTION_GATE);

  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: id,
        event_type: 'human.approve_direction',
        to_state: SDD_STATES.DISCOVER
      }),
    /HITL_DENIED|GATE_SKIPPED/
  );
  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.HUMAN_DIRECTION_GATE);
});

test('BYPASS-V2c: forged, expired and unapproved receipts are all refused', () => {
  const root = fixture();
  const rt = new MissionRuntime({ baseDir: root, allowLocalDirectorReceipt: false });
  const id = rt.createMission({ goal: 'receipt forgery', projectPath: '.' }).mission_id;
  walkToState(rt.ats, id, SDD_STATES.HUMAN_DIRECTION_GATE);

  const attempt = (hitlReceipt) =>
    rt.ats.commitTransition({
      missionId: id,
      event_type: 'human.approve_direction',
      to_state: SDD_STATES.DISCOVER,
      hitlReceipt
    });

  const monotonicity = 'No authority outside this receipt is granted';

  // no approver authentication
  assert.throws(
    () => attempt({ receipt_id: 'HITL-FORGED', decision: 'approve', gate_id: 'HUMAN_DIRECTION_GATE', approver: { identity: 'attacker' } }),
    /HITL_MISSING_APPROVER/
  );

  // no monotonicity constraint
  assert.throws(
    () =>
      attempt({
        receipt_id: 'HITL-NOMONO',
        decision: 'approve',
        gate_id: 'HUMAN_DIRECTION_GATE',
        approver: { identity: 'director', authentication_ref: 'REF' },
        expires_at: new Date(Date.now() + 60000).toISOString()
      }),
    /HITL_MONOTONICITY_BREACH/
  );

  // expired
  assert.throws(
    () =>
      attempt({
        receipt_id: 'HITL-EXPIRED',
        decision: 'approve',
        gate_id: 'HUMAN_DIRECTION_GATE',
        approver: { identity: 'director', authentication_ref: 'REF' },
        authority_granted: { level: 'LEVEL_0', monotonicity_rule: monotonicity },
        expires_at: new Date(Date.now() - 60000).toISOString()
      }),
    /HITL_RECEIPT_EXPIRED/
  );

  // rejected decision
  assert.throws(
    () =>
      attempt({
        receipt_id: 'HITL-REJECTED',
        decision: 'reject',
        gate_id: 'HUMAN_DIRECTION_GATE',
        approver: { identity: 'director', authentication_ref: 'REF' },
        authority_granted: { level: 'LEVEL_0', monotonicity_rule: monotonicity },
        expires_at: new Date(Date.now() + 60000).toISOString()
      }),
    /HITL_DECISION_NOT_APPROVED/
  );

  // wrong gate
  assert.throws(
    () =>
      attempt({
        receipt_id: 'HITL-WRONGGATE',
        decision: 'approve',
        gate_id: 'HUMAN_RELEASE_GATE',
        approver: { identity: 'director', authentication_ref: 'REF' },
        authority_granted: { level: 'LEVEL_0', monotonicity_rule: monotonicity },
        expires_at: new Date(Date.now() + 60000).toISOString()
      }),
    /HITL_GATE_MISMATCH/
  );

  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.HUMAN_DIRECTION_GATE);
});

// ===========================================================================
// V3 — use an unauthorized tool
// ===========================================================================

test('BYPASS-V3: the MCP tool guard denies unknown, over-privileged and misconfigured calls', async () => {
  const server = new EosMcpServer(null, { baseDir: fixture() });

  const cases = [
    ['unknown tool', 'eos.shell.exec', { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_4' }, /UNKNOWN_TOOL/],
    ['ledger write in read-only mode', 'eos.ledger.update_feature', { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_1' }, /READ_ONLY_MODE_BLOCKS_LEDGER_WRITE/],
    ['A2 tool at LEVEL_0', 'eos.fdir.trip', { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_0' }, /INSUFFICIENT_AUTONOMY_LEVEL/],
    ['unparseable autonomy level', 'eos.mission.status', { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_9000' }, /INVALID_GOVERNANCE_CONFIGURATION/],
    ['unrecognised mode', 'eos.mission.status', { EOS_MODE: 'god-mode', EOS_AUTONOMY_LEVEL: 'LEVEL_1' }, /INVALID_GOVERNANCE_CONFIGURATION/]
  ];

  for (const [label, tool, env, expected] of cases) {
    const res = await server.handleToolCall(tool, {}, env);
    assert.equal(res.status, 'DENIED', `${label} must be denied`);
    assert.equal(res.executed, false, `${label} must not execute`);
    assert.match(res.reason, expected, label);
  }
});

// ===========================================================================
// V4 — touch the frozen external target
// ===========================================================================

test('BYPASS-V4a: the write barrier denies protected roots', () => {
  const bridge = new McpMissionBridge({ baseDir: REPO_ROOT });

  for (const target of ['Fundacion/hack.js', 'Fundacion', path.join('docs', 'governance', 'x.md')]) {
    const res = bridge.barrierCheck({ path: path.join(REPO_ROOT, target) });
    assert.equal(res.allowed, false, `${target} must be blocked`);
    assert.equal(res.reason, 'PROTECTED_SURFACE');
  }

  assert.equal(bridge.barrierCheck({ path: path.join(REPO_ROOT, 'src', 'ok.js') }).allowed, true);
});

test('BYPASS-V4b (regression): a return package declaring a write to the frozen target is rejected', () => {
  const { root, rt, id, planned } = plannedMission();
  const taskId = planned.plan.tasks[0].task_id;

  const file = writeReturn(
    root,
    'fundacion-attempt',
    returnPackage(id, taskId, {
      affected_files: [{ path: 'Fundacion/hacked.js', action: 'MODIFY' }],
      diff: '--- a/Fundacion/hacked.js\n+++ b/Fundacion/hacked.js\n+pwned'
    })
  );

  const res = rt.submitReturnPackage(id, file);
  assert.equal(res.verdict, 'REJECT');
  assert.ok(res.deviations.some((d) => d.startsWith('PROTECTED_SURFACE_MUTATION_ATTEMPT')));
  assert.equal(res.apply_diff_authorized, false);
});

test('BYPASS-V4c: the constitutional floor holds even if a task contract omits it', () => {
  const { root, rt, id, dir, planned } = plannedMission();
  const taskId = planned.plan.tasks[0].task_id;

  // Rewrite the contract to declare no protected surfaces at all.
  const contractPath = path.join(dir, 'tasks', `${taskId}.json`);
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  contract.protected_surfaces = [];
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));

  const file = writeReturn(
    root,
    'floor-attempt',
    returnPackage(id, taskId, {
      affected_files: [
        { path: 'docs/governance/CONSTITUTION_OVERRIDE.md', action: 'CREATE' },
        { path: '.eos/ledger/run_log.jsonl', action: 'MODIFY' }
      ]
    })
  );

  const res = rt.submitReturnPackage(id, file);
  assert.equal(res.verdict, 'REJECT');
  assert.ok(res.deviations.some((d) => d.includes('docs/governance')));
  assert.ok(res.deviations.some((d) => d.includes('.eos/ledger')));
});

test('BYPASS-V4d: ingestion never applies a diff to disk', () => {
  const { root, rt, id, planned } = plannedMission();
  const taskId = planned.plan.tasks[0].task_id;
  const victim = path.join(root, 'src', 'victim.js');
  fs.writeFileSync(victim, 'original\n');

  const file = writeReturn(
    root,
    'diff-attempt',
    returnPackage(id, taskId, {
      affected_files: [{ path: 'src/victim.js', action: 'MODIFY' }],
      diff: '--- a/src/victim.js\n+++ b/src/victim.js\n-original\n+overwritten'
    })
  );

  rt.submitReturnPackage(id, file);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'original\n');
});

// ===========================================================================
// V5 — inject a secret
// ===========================================================================

test('BYPASS-V5: secret patterns in a return package are rejected', () => {
  const { root, rt, id, planned } = plannedMission();
  const taskId = planned.plan.tasks[0].task_id;

  const payloads = [
    { field: 'diff', value: 'const k = "sk-abcdefghijklmnopqrstuvwxyz0123456789";' },
    { field: 'summary', value: 'used token ghp_abcdefghijklmnopqrstuvwxyz0123456789' },
    { field: 'diff', value: '-----BEGIN PRIVATE KEY-----' },
    { field: 'summary', value: 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456' }
  ];

  payloads.forEach((p, i) => {
    const file = writeReturn(root, `secret-${i}`, returnPackage(id, taskId, { [p.field]: p.value }));
    const res = rt.submitReturnPackage(id, file);
    assert.equal(res.verdict, 'REJECT', `payload ${i} must be rejected`);
    assert.ok(res.deviations.some((d) => d.startsWith('SECRET_LEAKAGE_DETECTED')));
  });
});

// ===========================================================================
// V6 — replay
// ===========================================================================

test('BYPASS-V6a (regression): a nonce replayed from a fresh process is rejected', () => {
  const { root, rt, id, planned } = plannedMission();
  const taskId = planned.plan.tasks[0].task_id;
  const file = writeReturn(root, 'nonce', returnPackage(id, taskId, { nonce: 'NONCE-BATTERY-01' }));

  assert.equal(rt.submitReturnPackage(id, file).verdict, 'ACCEPT');

  // A new runtime is what every subsequent CLI invocation constructs.
  const fresh = new MissionRuntime({ baseDir: root });
  const replayed = fresh.submitReturnPackage(id, file);
  assert.equal(replayed.verdict, 'REJECT');
  assert.ok(replayed.deviations.some((d) => d.startsWith('REPLAY_ATTEMPT_DETECTED')));
});

test('BYPASS-V6b (regression): a committed idempotency key cannot be replayed', () => {
  const { rt, id } = plannedMission();

  rt.ats.commitTransition({
    missionId: id,
    event_type: 'mission.pause',
    authority_level: 'LEVEL_0',
    idempotency_key: 'IDEM-BATTERY-01'
  });

  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: id,
        event_type: 'mission.resume',
        authority_level: 'LEVEL_0',
        idempotency_key: 'IDEM-BATTERY-01'
      }),
    /REPLAY_DETECTED/
  );
});

// ===========================================================================
// V7 — force completion without verification or evidence
// ===========================================================================

test('BYPASS-V7a (regression): completion is denied from every pre-verification state', () => {
  for (const state of [SDD_STATES.PLAN, SDD_STATES.DELEGATE, SDD_STATES.SUPERVISE, SDD_STATES.REVIEW]) {
    const { rt, id } = plannedMission(`premature ${state}`);
    walkToState(rt.ats, id, state);

    assert.throws(() => rt.closeMission(id), /PREMATURE_COMPLETION/, `close must be denied from ${state}`);
    assert.equal(rt.ats.getSnapshot(id).state, state);
  }
});

test('BYPASS-V7b: the verification gate refuses empty, simulated and failing evidence', () => {
  const { rt, id } = plannedMission('evidence gate');
  walkToState(rt.ats, id, SDD_STATES.VERIFY);

  const attempt = (evidence_refs) =>
    rt.ats.commitTransition({
      missionId: id,
      event_type: 'verification.complete',
      to_state: SDD_STATES.REVIEW,
      evidence_refs
    });

  assert.throws(() => attempt([]), /INVALID_EVIDENCE_STATUS/);
  assert.throws(() => attempt([{ id: 'E1', status: 'SIMULATION_ONLY' }]), /SIMULATION_ONLY/);
  assert.throws(() => attempt([{ id: 'E2', status: 'NOT_VERIFIED' }]), /INVALID_EVIDENCE_STATUS/);
  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.VERIFY);
});

test('BYPASS-V7c (regression): advancing past SUPERVISE requires an accepted return package', () => {
  const { rt, id } = plannedMission('advance without work');
  walkToState(rt.ats, id, SDD_STATES.SUPERVISE);

  assert.throws(() => rt.advanceMission(id), /ADVANCE_BLOCKED_NO_ACCEPTED_RETURN/);
  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.SUPERVISE);
});

test('BYPASS-V7d: a failing return package cannot satisfy the verification gate', () => {
  const { root, rt, id, planned } = plannedMission('failing return');
  const taskId = planned.plan.tasks[0].task_id;

  const file = writeReturn(
    root,
    'failing',
    returnPackage(id, taskId, {
      affected_files: [{ path: 'src/example.js', action: 'MODIFY' }],
      test_results: { total_tests: 10, passed_tests: 7, failed_tests: 3, pass_rate: 0.7 }
    })
  );
  const submitted = rt.submitReturnPackage(id, file);
  assert.notEqual(submitted.verdict, 'ACCEPT');
  assert.ok(submitted.deviations.some((d) => d.startsWith('EPISTEMIC_CONTRADICTION')));

  walkToState(rt.ats, id, SDD_STATES.SUPERVISE);
  assert.throws(() => rt.advanceMission(id), /ADVANCE_BLOCKED_NO_ACCEPTED_RETURN/);
});

test('BYPASS-V7e: cancelling is available and does not claim completion', () => {
  const { rt, id } = plannedMission('cancel path');
  rt.cancelMission(id, 'battery');
  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.CANCELLED);
  assert.notEqual(rt.ats.getSnapshot(id).state, SDD_STATES.COMPLETED);
});

// ===========================================================================
// Declared gates that previously carried no enforcement
// ===========================================================================

test('BYPASS-V8a (regression): delegation without a task contract is denied', () => {
  const { rt, id } = plannedMission('no contract');
  walkToState(rt.ats, id, SDD_STATES.DELEGATE);

  assert.throws(
    () => rt.ats.commitTransition({ missionId: id, event_type: 'task.assign', to_state: SDD_STATES.SUPERVISE }),
    /MISSING_TASK_CONTRACT/
  );
  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: id,
        event_type: 'task.assign',
        to_state: SDD_STATES.SUPERVISE,
        context: { taskContract: { task_id: 'T1', allowed_tools: [] } }
      }),
    /MISSING_TASK_CONTRACT/
  );
});

test('BYPASS-V8b (regression): task completion without produced outputs is denied', () => {
  const { rt, id } = plannedMission('no outputs');
  walkToState(rt.ats, id, SDD_STATES.SUPERVISE);

  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: id,
        event_type: 'task.complete',
        to_state: SDD_STATES.VERIFY,
        authority_level: 'LEVEL_1'
      }),
    /MISSING_REQUIRED_OUTPUTS/
  );
});

test('BYPASS-V8c (regression): rejecting a review without a remediation record is denied', () => {
  const { rt, id } = plannedMission('no remediation');
  walkToState(rt.ats, id, SDD_STATES.REVIEW);

  assert.throws(
    () => rt.ats.commitTransition({ missionId: id, event_type: 'review.reject', to_state: SDD_STATES.PLAN }),
    /MISSING_REMEDIATION_RECORD/
  );
});

test('BYPASS-V8d: an implementer cannot approve their own review', () => {
  const { rt, id } = plannedMission('self approval');
  walkToState(rt.ats, id, SDD_STATES.REVIEW);

  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: id,
        event_type: 'review.accept',
        to_state: SDD_STATES.HUMAN_RELEASE_GATE,
        actor: { identity: 'AGENT-SOLO', role: 'IMPLEMENTER', identity_type: 'eos_agent' },
        context: { implementer: { identity: 'AGENT-SOLO' } }
      }),
    /SELF_APPROVAL_VIOLATION/
  );
});

// ===========================================================================
// Positive control: the governed path still completes
// ===========================================================================

test('BYPASS-CONTROL: the compliant path reaches COMPLETED and verifies clean', () => {
  const { root, rt, id, planned } = plannedMission('compliant path');
  const taskId = planned.plan.tasks[0].task_id;

  const file = writeReturn(
    root,
    'clean',
    returnPackage(id, taskId, {
      affected_files: [{ path: 'src/example.js', action: 'MODIFY' }],
      nonce: 'NONCE-CONTROL-01'
    })
  );
  assert.equal(rt.submitReturnPackage(id, file).verdict, 'ACCEPT');

  for (let i = 0; i < 8 && rt.ats.getSnapshot(id).state !== SDD_STATES.COMPLETED; i++) {
    rt.advanceMission(id);
  }

  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.COMPLETED);
  const verification = rt.verifyMission(id);
  assert.equal(verification.valid, true);
  assert.equal(verification.ledger_chain.valid, true);
  assert.equal(verification.authority_snapshot.code, 'ATS_SNAPSHOT_VERIFIED');
});

test('BYPASS-V9 (regression): a replayed submission cannot destroy an accepted assessment', () => {
  const { root, rt, id, dir, planned } = plannedMission('evidence destruction');
  const taskId = planned.plan.tasks[0].task_id;
  const file = writeReturn(
    root,
    'legit',
    returnPackage(id, taskId, {
      affected_files: [{ path: 'src/example.js', action: 'MODIFY' }],
      nonce: 'NONCE-V9-01'
    })
  );

  assert.equal(rt.submitReturnPackage(id, file).verdict, 'ACCEPT');
  const acceptedPath = path.join(dir, 'evidence', `return-${taskId}-assessment.json`);
  const acceptedBefore = fs.readFileSync(acceptedPath, 'utf8');

  // Replay from a new process: rejected, and must not overwrite the accepted record.
  const attacker = new MissionRuntime({ baseDir: root });
  assert.equal(attacker.submitReturnPackage(id, file).verdict, 'REJECT');

  assert.equal(fs.readFileSync(acceptedPath, 'utf8'), acceptedBefore);
  assert.ok(
    fs.readdirSync(path.join(dir, 'evidence', 'rejected-attempts')).length >= 2,
    'the rejected attempt must still be retained for audit'
  );

  // The mission remains able to progress on its legitimate evidence.
  walkToState(rt.ats, id, SDD_STATES.SUPERVISE);
  assert.doesNotThrow(() => rt.advanceMission(id));
  assert.equal(rt.ats.getSnapshot(id).state, SDD_STATES.VERIFY);
});
