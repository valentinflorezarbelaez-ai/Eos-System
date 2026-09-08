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

async function advanceLoopTo(server, env, missionId, target) {
  const full = ['Intent', 'Spec', 'Plan', 'Act', 'Evidence', 'Verify', 'Archive'];
  const status = await server.handleToolCall('eos.mission.loop.status', { missionId }, env);
  let stage = status.mission_loop?.stage || 'Intent';
  const targetIdx = full.indexOf(target);
  if (targetIdx < 0) throw new Error('bad target ' + target);
  let i = full.indexOf(stage);
  while (i < targetIdx) {
    const to = full[i + 1];
    if (to === 'Verify') {
      const ev = await server.handleToolCall(
        'eos.evidence.record',
        { missionId, id: 'EVD-BRIDGE-LOOP-' + Date.now(), payload: { bridge: true } },
        env
      );
      if (ev.status !== 'SUCCESS') {
        throw new Error('evidence before verify failed: ' + (ev.reason || ''));
      }
    }
    const step = await server.handleToolCall('eos.mission.loop.advance', { missionId, to }, env);
    if (step.status !== 'SUCCESS') {
      throw new Error('advance to ' + to + ' failed: ' + (step.reason || ''));
    }
    stage = to;
    i++;
  }
  return stage;
}



test('BRIDGE-01: normalize underscore names', () => {
  assert.equal(normalizeToolName('eos_mission_status'), 'eos.mission.status');
  assert.equal(normalizeToolName('eos.mission.status'), 'eos.mission.status');
});

test('BRIDGE-02: mission resolve/start/status/plan/report via MCP read-write LEVEL_1', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-wire-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"mcp-wire","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));

  const bridge = new McpMissionBridge({ baseDir: root });
  const server = new EosMcpServer(null, { bridge, baseDir: root });
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

  // plan via bridge (not a canonical MCP tool name — exercise runtime path)
  const planned = bridge.planMission({ missionId: started.mission.mission_id });
  assert.equal(planned.phase, 'PLAN');

  const report = await server.handleToolCall(
    'eos.report.generate',
    { missionId: started.mission.mission_id },
    env
  );
  assert.equal(report.status, 'SUCCESS');
  assert.ok(report.report);

  // Phase 5: advance Intent→…→Evidence before evidence.record / Verify before verifier.run
  await advanceLoopTo(server, env, started.mission.mission_id, 'Evidence');

  const recorded = await server.handleToolCall(
    'eos.evidence.record',
    { missionId: started.mission.mission_id, category: 'UNIT_TEST', payload: { note: 'wired via bridge' } },
    env
  );
  assert.equal(recorded.status, 'SUCCESS', recorded.reason || '');
  assert.equal(recorded.evidence.mission_id, started.mission.mission_id);
  assert.ok(fs.existsSync(recorded.path));

  await advanceLoopTo(server, env, started.mission.mission_id, 'Verify');

  const verify = await server.handleToolCall(
    'eos.verifier.run',
    { missionId: started.mission.mission_id },
    env
  );
  assert.equal(verify.status, 'SUCCESS', verify.reason || '');
  assert.equal(verify.verification.ok, true);

  const fdir = await server.handleToolCall('eos.fdir.status', {}, env);
  assert.equal(fdir.status, 'SUCCESS');
  assert.equal(fdir.fdir.fdirSafeModeTripped, false);

  const fetched = await server.handleToolCall(
    'eos.evidence.get',
    { missionId: started.mission.mission_id, id: recorded.evidence.id },
    env
  );
  assert.equal(fetched.status, 'SUCCESS');
  assert.equal(fetched.evidence.found, true);
  assert.equal(fetched.evidence.content.id, recorded.evidence.id);
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

test('BRIDGE-04: evidence.record writes SHA-256 and rejects missing mission', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-evd-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"mcp-evd","type":"module"}');
  fs.mkdirSync(path.join(root, 'src'));

  const bridge = new McpMissionBridge({ baseDir: root });
  const server = new EosMcpServer(null, { bridge, baseDir: root });
  const env = {
    EOS_MODE: 'read-write',
    EOS_AUTONOMY_LEVEL: 'LEVEL_1',
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
  };

  const started = await server.handleToolCall(
    'eos.mission.start',
    { goal: 'Evidence hash contract', projectPath: root },
    env
  );
  assert.equal(started.status, 'SUCCESS', started.reason || '');

  await advanceLoopTo(server, env, started.mission.mission_id, 'Evidence');

  const recorded = await server.handleToolCall(
    'eos.evidence.record',
    {
      missionId: started.mission.mission_id,
      id: 'EVD-BRIDGE-04',
      payload: { check: true }
    },
    env
  );
  assert.equal(recorded.status, 'SUCCESS', recorded.reason || '');
  assert.equal(recorded.evidence.sha256.length, 64);
  assert.equal(fs.existsSync(recorded.path), true);

  const missing = await server.handleToolCall(
    'eos.evidence.record',
    { missionId: 'MIS-DOES-NOT-EXIST', id: 'EVD-X' },
    env
  );
  assert.equal(missing.status, 'ERROR');
  assert.equal(missing.code, 'MISSION_NOT_FOUND');
});

test('BRIDGE-05: missionStatus marks corrupt package without swallowing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-corrupt-'));
  const missionId = 'MIS-CORRUPT-01';
  const missionDir = path.join(root, '.missions', missionId);
  fs.mkdirSync(missionDir, { recursive: true });
  fs.writeFileSync(path.join(missionDir, 'mission-package.json'), '{not-json', 'utf8');

  const bridge = new McpMissionBridge({ baseDir: root });
  const listed = bridge.missionStatus({});
  assert.equal(listed.count, 1);
  assert.equal(listed.missions[0].mission_id, missionId);
  assert.equal(listed.missions[0].phase, null);
  assert.equal(listed.missions[0].status, null);
  assert.equal(listed.missions[0].corrupt, true);
});

test('BRIDGE-06: constructing the server/bridge does not eagerly create .missions', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-no-side-effect-'));
  const bridge = new McpMissionBridge({ baseDir: root });
  const server = new EosMcpServer(null, { bridge, baseDir: root });

  assert.equal(fs.existsSync(path.join(root, '.missions')), false);

  const status = await server.handleToolCall(
    'eos.mission.status',
    {},
    { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' }
  );
  assert.equal(status.status, 'SUCCESS');
  assert.equal(status.mission_status.count, 0);
  assert.equal(fs.existsSync(path.join(root, '.missions')), false, '.missions must not be created by read-only status checks');
});
