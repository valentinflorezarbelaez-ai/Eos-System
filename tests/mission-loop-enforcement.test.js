/**
 * Phase 5 — Mission Loop enforcement (MCP).
 *
 * Proves:
 * (1) illegal stage jump denied
 * (2) happy-path stage advance Intent→…→Archive
 * (3) Act without write scope denied
 * (4) Archive without Verify success denied
 * (5) read-only allowlist usable without loop
 * (6) Act tool at wrong stage denied
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { EosMcpServer } from '../src/mcp-server.js';
import { McpMissionBridge } from '../src/core/mcp/mcp-mission-bridge.js';
import {
  MISSION_LOOP_STAGES,
  MISSION_LOOP_ORDER,
  evaluateStageTransition,
  assertArchiveAllowed,
  assertToolStageAllowed,
  isLoopReadonlyAllowlisted
} from '../src/core/mcp/mission-loop.js';
import {
  getActiveWriteScope,
  authorizeWrite
} from '../src/core/write-barrier/index.js';

const RW = {
  EOS_MODE: 'read-write',
  EOS_AUTONOMY_LEVEL: 'LEVEL_1',
  EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
};

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-loop-'));
  for (const rel of ['src', 'tests', 'docs', 'config/security', 'scripts']) {
    fs.mkdirSync(path.join(root, rel), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"eos-loop-fixture","type":"module"}');
  fs.writeFileSync(path.join(root, 'src', 'ok.txt'), 'seed\n');
  fs.writeFileSync(
    path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json'),
    JSON.stringify(
      {
        version: 1,
        repoRelativeAllowRoots: ['.missions', 'src', 'tests', 'docs', 'config', 'scripts'],
        alwaysDenyRepoRelative: ['Fundacion']
      },
      null,
      2
    )
  );
  fs.mkdirSync(path.join(root, 'Fundacion'), { recursive: true });
  return root;
}

async function startMission(server, root, goal = 'Phase 5 loop fixture') {
  const started = await server.handleToolCall(
    'eos.mission.start',
    { goal, projectPath: root },
    RW
  );
  assert.equal(started.status, 'SUCCESS', started.reason || '');
  assert.ok(started.mission.mission_id);
  assert.equal(started.mission.mission_loop?.stage, MISSION_LOOP_STAGES.INTENT);
  return started.mission.mission_id;
}

async function advance(server, missionId, to) {
  const res = await server.handleToolCall(
    'eos.mission.loop.advance',
    { missionId, to },
    RW
  );
  return res;
}

describe('Phase 5 Mission Loop SSOT', () => {
  it('evaluateStageTransition fails closed on illegal jumps', () => {
    const bad = evaluateStageTransition(MISSION_LOOP_STAGES.INTENT, MISSION_LOOP_STAGES.ACT);
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'ILLEGAL_STAGE_TRANSITION');

    const good = evaluateStageTransition(MISSION_LOOP_STAGES.INTENT, MISSION_LOOP_STAGES.SPEC);
    assert.equal(good.ok, true);
  });

  it('assertArchiveAllowed requires Verify success receipt', () => {
    const denied = assertArchiveAllowed({ receipts: [] });
    assert.equal(denied.allowed, false);
    assert.equal(denied.code, 'ARCHIVE_REQUIRES_VERIFY');

    const allowed = assertArchiveAllowed({
      receipts: [{ stage: MISSION_LOOP_STAGES.VERIFY, ok: true, kind: 'verify' }]
    });
    assert.equal(allowed.allowed, true);
  });

  it('Act tools denied outside Act stage', () => {
    const v = assertToolStageAllowed('eos.scaffolder.execute', MISSION_LOOP_STAGES.PLAN);
    assert.equal(v.allowed, false);
    assert.equal(v.code, 'MISSION_LOOP_STAGE_DENIED');
  });

  it('read-only allowlist includes barrier_check and context.compile', () => {
    assert.equal(isLoopReadonlyAllowlisted('eos.workspace.barrier_check'), true);
    assert.equal(isLoopReadonlyAllowlisted('eos.context.compile'), true);
    assert.equal(isLoopReadonlyAllowlisted('eos.authority.check'), true);
    assert.equal(isLoopReadonlyAllowlisted('eos.ledger.get_features'), true);
  });
});

describe('Phase 5 Mission Loop MCP enforcement', () => {
  let root;
  let bridge;
  let server;

  before(() => {
    root = makeTempRepo();
    bridge = new McpMissionBridge({ baseDir: root });
    server = new EosMcpServer(null, { bridge, baseDir: root });
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('(1) illegal jump Intent→Act denied via MCP', async () => {
    const missionId = await startMission(server, root, 'illegal jump');
    const res = await advance(server, missionId, MISSION_LOOP_STAGES.ACT);
    assert.equal(res.status, 'DENIED', res.reason || '');
    assert.match(String(res.code || res.reason), /ILLEGAL_STAGE_TRANSITION/);
    const status = await server.handleToolCall(
      'eos.mission.loop.status',
      { missionId },
      RW
    );
    assert.equal(status.status, 'SUCCESS');
    assert.equal(status.mission_loop.stage, MISSION_LOOP_STAGES.INTENT);
  });

  it('(2) happy path advances through all stages to Archive', async () => {
    const missionId = await startMission(server, root, 'happy path');

    for (const to of [
      MISSION_LOOP_STAGES.SPEC,
      MISSION_LOOP_STAGES.PLAN,
      MISSION_LOOP_STAGES.ACT,
      MISSION_LOOP_STAGES.EVIDENCE
    ]) {
      const step = await advance(server, missionId, to);
      assert.equal(step.status, 'SUCCESS', `${to}: ${step.reason || ''}`);
      assert.equal(step.mission_loop.to, to);
    }

    const recorded = await server.handleToolCall(
      'eos.evidence.record',
      { missionId, id: 'EVD-LOOP-HAPPY', payload: { note: 'loop' } },
      RW
    );
    assert.equal(recorded.status, 'SUCCESS', recorded.reason || '');

    const toVerify = await advance(server, missionId, MISSION_LOOP_STAGES.VERIFY);
    assert.equal(toVerify.status, 'SUCCESS', toVerify.reason || '');

    const verify = await server.handleToolCall('eos.verifier.run', { missionId }, RW);
    assert.equal(verify.status, 'SUCCESS', verify.reason || '');
    assert.equal(verify.verification.ok, true);

    const toArchive = await advance(server, missionId, MISSION_LOOP_STAGES.ARCHIVE);
    assert.equal(toArchive.status, 'SUCCESS', toArchive.reason || '');
    assert.equal(toArchive.mission_loop.stage, MISSION_LOOP_STAGES.ARCHIVE);
  });

  it('(3) Act without write scope denied', async () => {
    const missionId = await startMission(server, root, 'act scope');
    for (const to of [
      MISSION_LOOP_STAGES.SPEC,
      MISSION_LOOP_STAGES.PLAN,
      MISSION_LOOP_STAGES.ACT
    ]) {
      const step = await advance(server, missionId, to);
      assert.equal(step.status, 'SUCCESS', step.reason || '');
    }

    // Direct authorizeWrite without scope must fail (Phase 4 seam used by Act).
    const target = path.join(root, 'src', 'ok.txt');
    const verdict = authorizeWrite(target, { repoRoot: root });
    assert.equal(verdict.allowed, false);
    assert.match(String(verdict.reason), /NO_ACTIVE_SCOPE|SCOPE_REQUIRED/i);
    assert.equal(getActiveWriteScope(), null);

    // Bridge Act helper opens scope — succeeds for allowlisted path.
    let scopedOk = false;
    await bridge.runActWithWriteScope(
      { missionId, roots: ['src', 'tests', 'docs', 'config', 'scripts'], assertPaths: [target] },
      async () => {
        assert.ok(getActiveWriteScope());
        const inside = authorizeWrite(target, { repoRoot: root });
        assert.equal(inside.allowed, true, inside.reason);
        scopedOk = true;
      }
    );
    assert.equal(scopedOk, true);
    assert.equal(getActiveWriteScope(), null);

    // Fundacion denied even inside Act scope.
    const fund = path.join(root, 'Fundacion', 'x.md');
    fs.writeFileSync(fund, 'nope\n');
    await assert.rejects(
      () =>
        bridge.runActWithWriteScope(
          { missionId, roots: ['src', 'tests', 'docs', 'config', 'Fundacion'], assertPaths: [fund] },
          async () => {}
        ),
      (err) => /FUNDACION|ACT_WRITE_DENIED|WRITE_BARRIER/i.test(String(err.message + err.code))
    );
  });

  it('(4) Archive without Verify success denied', async () => {
    const missionId = await startMission(server, root, 'archive gate');
    for (const to of [
      MISSION_LOOP_STAGES.SPEC,
      MISSION_LOOP_STAGES.PLAN,
      MISSION_LOOP_STAGES.ACT,
      MISSION_LOOP_STAGES.EVIDENCE
    ]) {
      assert.equal((await advance(server, missionId, to)).status, 'SUCCESS');
    }
    assert.equal(
      (
        await server.handleToolCall(
          'eos.evidence.record',
          { missionId, id: 'EVD-NO-VERIFY', payload: {} },
          RW
        )
      ).status,
      'SUCCESS'
    );
    assert.equal((await advance(server, missionId, MISSION_LOOP_STAGES.VERIFY)).status, 'SUCCESS');

    // At Verify but WITHOUT ok:true verify receipt → Archive denied.
    // Remove verify receipts by rewriting state to only evidence receipts.
    const loopPath = path.join(root, '.missions', missionId, 'mission-loop.json');
    const state = JSON.parse(fs.readFileSync(loopPath, 'utf8'));
    state.receipts = state.receipts.filter((r) => r.kind !== 'verify' && r.stage !== 'Verify');
    // Keep stage at Verify so transition Verify→Archive is legal adjacency-wise.
    state.stage = MISSION_LOOP_STAGES.VERIFY;
    fs.writeFileSync(loopPath, JSON.stringify(state, null, 2));

    const denied = await advance(server, missionId, MISSION_LOOP_STAGES.ARCHIVE);
    assert.equal(denied.status, 'DENIED', denied.reason || '');
    assert.match(String(denied.code || denied.reason), /ARCHIVE_REQUIRES_VERIFY/);
  });

  it('(5) read-only tools work without mission loop', async () => {
    const env = {
      EOS_MODE: 'read-only',
      EOS_AUTONOMY_LEVEL: 'LEVEL_0',
      EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
    };
    const auth = await server.handleToolCall(
      'eos.authority.check',
      { requiredLevel: 'LEVEL_0', grantedLevel: 'LEVEL_0' },
      env
    );
    assert.equal(auth.status, 'SUCCESS');

    const barrier = await server.handleToolCall(
      'eos.workspace.barrier_check',
      { path: path.join(root, 'src', 'ok.txt') },
      env
    );
    assert.equal(barrier.status, 'SUCCESS');

    const features = await server.handleToolCall(
      'eos.ledger.get_features',
      { missionId: 'MIS-NO-LOOP' },
      env
    );
    assert.equal(features.status, 'SUCCESS');
  });

  it('(6) Act MCP tool refused at Intent stage', async () => {
    const missionId = await startMission(server, root, 'act early');
    const res = await server.handleToolCall(
      'eos.scaffolder.clean',
      { missionId, nombreComponente: 'Demo' },
      RW
    );
    assert.equal(res.status, 'DENIED', res.reason || '');
    assert.match(String(res.code || res.reason), /MISSION_LOOP_STAGE_DENIED/);
  });

  it('MISSION_LOOP_ORDER covers seven stages', () => {
    assert.deepEqual([...MISSION_LOOP_ORDER], [
      'Intent',
      'Spec',
      'Plan',
      'Act',
      'Evidence',
      'Verify',
      'Archive'
    ]);
  });
});
