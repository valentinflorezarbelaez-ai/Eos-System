/**
 * MCP ↔ MissionRuntime wiring for local governed usability
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { EosMcpServer } from '../src/mcp-server.js';
import { McpMissionBridge, normalizeToolName } from '../src/core/mcp/mcp-mission-bridge.js';

test('BRIDGE-01: normalize underscore names', () => {
  assert.equal(normalizeToolName('eos_mission_status'), 'eos.mission.status');
  assert.equal(normalizeToolName('eos.mission.status'), 'eos.mission.status');
});

test('BRIDGE-02: mission resolve/start/status/plan/report via MCP read-write LEVEL_1', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-wire-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"mcp-wire","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));

  const bridge = new McpMissionBridge({ baseDir: root });
  assert.equal(
    fs.existsSync(path.join(root, '.missions')),
    false,
    'Constructing the bridge must not provision mission storage'
  );

  const server = new EosMcpServer(null, { bridge });
  const env = {
    EOS_MODE: 'read-write',
    EOS_AUTONOMY_LEVEL: 'LEVEL_1',
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
  };

  const resolved = await server.handleToolCall(
    'eos_mission_resolve',
    { goal: 'Wire MCP to Mission OS', projectPath: root },
    env
  );
  assert.equal(resolved.status, 'SUCCESS');
  assert.equal(resolved.resolution.epistemic_class, 'PROPOSED');

  const started = await server.handleToolCall(
    'eos.mission.start',
    { goal: 'Wire MCP to Mission OS', projectPath: root },
    env
  );
  assert.equal(started.status, 'SUCCESS', started.reason || '');
  assert.ok(started.mission.mission_id);

  const status = await server.handleToolCall(
    'eos_mission_status',
    { missionId: started.mission.mission_id },
    env
  );
  assert.equal(status.status, 'SUCCESS');
  assert.equal(status.mission_status.mission_id, started.mission.mission_id);

  // plan is not exposed as an MCP tool — exercise the runtime path behind the bridge
  const planned = bridge.runtime.planMission(started.mission.mission_id);
  assert.equal(planned.phase, 'PLAN');

  const report = await server.handleToolCall(
    'eos.report.generate',
    { missionId: started.mission.mission_id },
    env
  );
  assert.equal(report.status, 'SUCCESS');
  assert.ok(report.report);

  const verify = await server.handleToolCall(
    'eos.verifier.run',
    { missionId: started.mission.mission_id },
    env
  );
  assert.equal(verify.status, 'SUCCESS');
  assert.equal(verify.verification.ok, true);

  const fdir = await server.handleToolCall('eos.fdir.status', {}, env);
  assert.equal(fdir.status, 'SUCCESS');
  assert.equal(fdir.fdir.fdirSafeModeTripped, false);
});

test('BRIDGE-03: mission.start denied in read-only', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall(
    'eos.mission.start',
    { goal: 'should deny' },
    { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_2', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' }
  );
  assert.equal(res.status, 'DENIED');
  assert.equal(res.reason, 'READ_ONLY_MODE_BLOCKS_LEDGER_WRITE');
});

test('BRIDGE-04: evidence round-trip stays inside the mission directory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-evidence-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"mcp-evidence","type":"module"}');

  const server = new EosMcpServer(null, { bridge: new McpMissionBridge({ baseDir: root }) });
  const env = {
    EOS_MODE: 'read-write',
    EOS_AUTONOMY_LEVEL: 'LEVEL_1',
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
  };

  const started = await server.handleToolCall('eos.mission.start', { goal: 'Evidence wiring', projectPath: root }, env);
  const missionId = started.mission.mission_id;

  const recorded = await server.handleToolCall(
    'eos.evidence.record',
    { missionId, id: 'EVD-01', payload: { note: 'unit' } },
    env
  );
  assert.equal(recorded.status, 'SUCCESS', recorded.reason || '');
  assert.equal(recorded.evidence.epistemic_class, 'RECORDED_NOT_VERIFIED');

  const fetched = await server.handleToolCall('eos.evidence.get', { missionId, id: 'EVD-01' }, env);
  assert.equal(fetched.evidence.found, true);
  assert.deepEqual(fetched.evidence.content.payload, { note: 'unit' });

  const traversal = await server.handleToolCall(
    'eos.evidence.record',
    { missionId, id: '../../../escaped' },
    env
  );
  assert.equal(traversal.status, 'ERROR');
  assert.equal(traversal.code, 'INVALID_EVIDENCE_ID');

  const badMission = await server.handleToolCall('eos.mission.status', { missionId: '../..' }, env);
  assert.equal(badMission.status, 'ERROR');
  assert.equal(badMission.code, 'INVALID_MISSION_ID');
  assert.equal(fs.existsSync(path.join(root, 'escaped.json')), false);
});

test('BRIDGE-05: barrier check resolves relative paths against the bridge baseDir', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-barrier-'));
  const server = new EosMcpServer(null, { bridge: new McpMissionBridge({ baseDir: root }) });
  const env = { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' };

  const blocked = await server.handleToolCall('eos.workspace.barrier_check', { path: 'Fundacion/site' }, env);
  assert.equal(blocked.barrier.allowed, false);
  assert.equal(blocked.barrier.reason, 'PROTECTED_SURFACE');
  assert.equal(blocked.barrier.path, path.join(root, 'Fundacion', 'site'));

  const missing = await server.handleToolCall('eos.workspace.barrier_check', {}, env);
  assert.equal(missing.status, 'ERROR');
  assert.equal(missing.code, 'MISSING_PATH');
});
