/**
 * Final readiness exam — deliberate DENY paths on the canonical Mission OS runtime.
 * These are bypass attempts, not happy-path simulations.
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
import { touchesProtectedSurface } from '../src/core/adapters/cursor-return-ingestion-engine.js';

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-bypass-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'eos-bypass', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'ok.js'), 'export const ok = true;\n');
  return root;
}

function firstTaskId(missionId) {
  return `TASK-${missionId.replace('MIS-', '')}-01`;
}

function baseReturnPkg(missionId, overrides = {}) {
  return {
    schema_version: '1.0.0',
    mission_id: missionId,
    task_id: firstTaskId(missionId),
    status: 'COMPLETED',
    summary: 'Canonical return package for bypass exam.',
    affected_files: [{ path: 'src/ok.js', action: 'MODIFY' }],
    diff: '--- a/src/ok.js\n+++ b/src/ok.js\n',
    commands_executed: ['node --test'],
    tools_used: ['read_file'],
    test_results: { total_tests: 1, passed_tests: 1, failed_tests: 0, pass_rate: 1.0 },
    evidence: { receipt_hashes: ['a'.repeat(64)] },
    unknowns: [],
    risks: [],
    nonce: `nonce-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...overrides
  };
}

function writeReturn(root, name, pkg) {
  const p = path.join(root, name);
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
  return p;
}

test('BYPASS-PATH: touchesProtectedSurface matches Fundacion on POSIX and nested paths', () => {
  assert.equal(touchesProtectedSurface('Fundacion/index.html', ['Fundacion/']), true);
  assert.equal(touchesProtectedSurface('Fundacion\\index.html', ['Fundacion/']), true);
  assert.equal(touchesProtectedSurface('/tmp/work/Fundacion/secret.md', ['Fundacion']), true);
  assert.equal(touchesProtectedSurface('src/ok.js', ['Fundacion/', 'docs/governance/**']), false);
});

test('BYPASS-01: manual phase assignment via commitTransition is DENY; disk tamper does not become ATS truth', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'bypass phase', projectPath: '.' });
  const before = rt.ats.getSnapshot(created.mission_id).state;
  assert.equal(before, SDD_STATES.VISION_INTAKE);

  assert.throws(
    () =>
      rt.ats.commitTransition({
        missionId: created.mission_id,
        event_type: 'operator.set_phase',
        to_state: SDD_STATES.COMPLETED,
        authority_level: 'LEVEL_0'
      }),
    /INVALID_STATE_TRANSITION|TRANSITION_DENIED|ATS_INVALID_REQUEST/
  );
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.VISION_INTAKE);

  const pkgPath = path.join(root, '.missions', created.mission_id, 'mission-package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.phase = 'COMPLETED';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  const inspected = rt.inspectMission(created.mission_id);
  assert.equal(inspected.authority_phase, SDD_STATES.VISION_INTAKE);
  assert.equal(inspected.phase, SDD_STATES.VISION_INTAKE);
  assert.equal(inspected.package_phase, 'COMPLETED');
  assert.equal(inspected.phase_tamper_detected, true);

  assert.throws(() => rt.closeMission(created.mission_id), /CLOSE_DENIED_PHASE_TAMPER/);
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.VISION_INTAKE);
});

test('BYPASS-02: skipping HITL at HUMAN_DIRECTION_GATE is DENY', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root, allowLocalDirectorReceipt: false });
  const created = rt.createMission({ goal: 'bypass hitl', projectPath: '.' });
  assert.throws(
    () => rt.planMission(created.mission_id, { requireExternalHitl: true }),
    /HITL_RECEIPT_REQUIRED/
  );
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.HUMAN_DIRECTION_GATE);
});

test('BYPASS-03: unauthorized tool in Cursor return is REJECT', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'bypass tool', projectPath: '.' });
  rt.planMission(created.mission_id);
  const pkgFile = writeReturn(
    root,
    'bad-tool.json',
    baseReturnPkg(created.mission_id, { tools_used: ['shell_exec', 'rm_rf'] })
  );
  const res = rt.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(res.verdict, 'REJECT');
  assert.ok(res.deviations.some((d) => d.includes('UNAUTHORIZED_TOOL')));
});

test('BYPASS-04: mutating Fundacion in a return package is REJECT', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'bypass fundacion', projectPath: '.' });
  rt.planMission(created.mission_id);
  const pkgFile = writeReturn(
    root,
    'bad-fundacion.json',
    baseReturnPkg(created.mission_id, {
      affected_files: [{ path: 'Fundacion/index.html', action: 'MODIFY' }]
    })
  );
  const res = rt.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(res.verdict, 'REJECT');
  assert.ok(res.deviations.some((d) => d.includes('PROTECTED_SURFACE_MUTATION_ATTEMPT')));
});

test('BYPASS-05: secret injection in return package is REJECT', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'bypass secret', projectPath: '.' });
  rt.planMission(created.mission_id);
  const pkgFile = writeReturn(
    root,
    'bad-secret.json',
    baseReturnPkg(created.mission_id, {
      diff: 'const token = "sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD";\n'
    })
  );
  const res = rt.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(res.verdict, 'REJECT');
  assert.ok(res.deviations.some((d) => d.includes('SECRET_LEAKAGE_DETECTED')));
});

test('BYPASS-06: repeating a nonce is REJECT across process-equivalent runtime reload', () => {
  const root = fixtureRoot();
  const rt1 = new MissionRuntime({ baseDir: root });
  const created = rt1.createMission({ goal: 'bypass replay', projectPath: '.' });
  rt1.planMission(created.mission_id);
  const nonce = 'fixed-nonce-replay-exam-001';
  const pkgFile = writeReturn(root, 'replay.json', baseReturnPkg(created.mission_id, { nonce }));

  const first = rt1.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(first.verdict, 'ACCEPT');

  const sameInstance = rt1.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(sameInstance.verdict, 'REJECT');
  assert.ok(sameInstance.deviations.some((d) => d.includes('REPLAY_ATTEMPT_DETECTED')));

  const rt2 = new MissionRuntime({ baseDir: root });
  const acrossProcess = rt2.submitReturnPackage(created.mission_id, pkgFile);
  assert.equal(acrossProcess.verdict, 'REJECT');
  assert.ok(acrossProcess.deviations.some((d) => d.includes('REPLAY_ATTEMPT_DETECTED')));
});

test('BYPASS-07: close without valid verification/evidence is DENY', () => {
  const root = fixtureRoot();
  const rt = new MissionRuntime({ baseDir: root });
  const created = rt.createMission({ goal: 'bypass close', projectPath: '.' });
  rt.planMission(created.mission_id);

  const hashedFile = path.join(root, '.missions', created.mission_id, 'plan.json');
  fs.appendFileSync(hashedFile, '\n// tamper\n');

  assert.throws(() => rt.closeMission(created.mission_id), /CLOSE_DENIED_VERIFICATION_FAILED/);
  assert.equal(rt.ats.getSnapshot(created.mission_id).state, SDD_STATES.PLAN);
});

test('BYPASS-08: MCP unknown tool and Fundacion barrier are DENY', async () => {
  const root = fixtureRoot();
  const bridge = new McpMissionBridge({ baseDir: root });
  const server = new EosMcpServer(null, { bridge, baseDir: root });
  const env = {
    EOS_MODE: 'read-write',
    EOS_AUTONOMY_LEVEL: 'LEVEL_1',
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
  };

  const unknown = await server.handleToolCall('eos.sudo.root', {}, env);
  assert.equal(unknown.status, 'DENIED');
  assert.equal(unknown.executed, false);
  assert.match(unknown.reason, /UNKNOWN_TOOL/);

  const barrier = bridge.barrierCheck({ path: path.join(root, 'Fundacion', 'index.html') });
  assert.equal(barrier.allowed, false);
  assert.equal(barrier.reason, 'PROTECTED_SURFACE');
});
