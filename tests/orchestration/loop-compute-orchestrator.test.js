/**
 * @file loop-compute-orchestrator.test.js
 * @description SPEC-0021 Mission P — Mission Loop × Compute Worker orchestration.
 * Hermetic TDD: mocked natives compose; legal stage advances; soft QA HITL;
 * infra fail-closed; Archive gated by assertArchiveAllowed.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
  LOOP_COMPUTE_TOOL_STAGES,
  ARCHIVE_REQUIRES_HITL_SOFT_QA,
  runLoopComputeOrchestration,
  advanceLoopOrThrow,
  assertLoopComputeToolStageAllowed,
  detectSoftBrowserQaFailure,
  createInitialLoopState,
  MISSION_LOOP_STAGES,
  evaluateStageTransition,
  assertArchiveAllowed,
  assertVerifyAdvanceAllowed,
  hashToolOutputs,
  buildMultiNativeComposeToolCalls
} from '../../src/core/orchestration/loop-compute-orchestrator.js';
import {
  buildComputePlan,
  parseCheckboxTasks
} from '../../scripts/runners/eos-compute-worker.js';

const CHANGE_ID = 'eos-mission-p-loop-worker-orchestration';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const MOCK_AVAILABLE = {
  servers: {
    StitchMCP: { command: 'npx' },
    'chrome-devtools-mcp': { command: 'npx' },
    github: { command: 'npx' },
    engram: { command: 'engram' },
    'eos-local': { command: 'node' }
  }
};

function tempCustodyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-p-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks(
      '- [ ] Mission P loop×compute orchestration @needs(VCS)\n'
    ),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-p-builder',
    verifierId: 'mission-p-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js',
      'tests/runners/eos-loop-compute-orchestrator.test.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

function makeMockBrowserQaClient(overrides = {}) {
  return {
    async navigate(url) {
      return { ok: true, url };
    },
    async collectCwv() {
      return { lcpMs: 1200, cls: 0.01 };
    },
    async runA11yScan() {
      return { violations: [] };
    },
    async captureScreenshot() {
      return { mimeType: 'image/png', base64: PNG_BASE64 };
    },
    ...overrides
  };
}

function makeMockStitchClient(overrides = {}) {
  return {
    async list_projects() {
      return { projects: [{ id: 'p1', name: 'Demo' }] };
    },
    async generate_screen({ projectId, prompt, deviceType }) {
      return {
        screenId: 'scr-p-1',
        projectId,
        prompt,
        deviceType,
        previewUrl: 'https://example.test/preview'
      };
    },
    async get_screen({ screenId }) {
      return {
        screenId,
        htmlUrl: 'https://example.test/html',
        screenshotUrl: 'https://example.test/shot'
      };
    },
    async export_design_md({ projectId }) {
      return { projectId, designMd: '# Design\n' };
    },
    ...overrides
  };
}

function makeMockGeminiQueryImpl(overrides = {}) {
  return async function geminiQueryImpl(opts = {}) {
    if (typeof overrides.impl === 'function') {
      return overrides.impl(opts);
    }
    if (overrides.throwError) {
      throw overrides.throwError;
    }
    return {
      text: overrides.text != null ? overrides.text : 'mission-p-gemini-ok',
      data: overrides.data !== undefined ? overrides.data : null,
      model: overrides.model != null ? overrides.model : 'mock-gemini',
      usage:
        overrides.usage !== undefined
          ? overrides.usage
          : { promptTokens: 1, candidatesTokens: 2 }
    };
  };
}

function happyOpts(extra = {}) {
  return {
    missionId: 'mission-p-1',
    plan: basePlan(),
    compose: {},
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir(),
    ...extra
  };
}

test('Mission P: PRODUCTION_READY is NO', () => {
  assert.equal(LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY, 'NO');
  assert.deepEqual([...LOOP_COMPUTE_TOOL_STAGES['eos.compute.run']], [
    MISSION_LOOP_STAGES.ACT
  ]);
  const denied = assertLoopComputeToolStageAllowed(
    'eos.compute.run',
    MISSION_LOOP_STAGES.PLAN
  );
  assert.equal(denied.allowed, false);
  const allowed = assertLoopComputeToolStageAllowed(
    'eos.compute.run',
    MISSION_LOOP_STAGES.ACT
  );
  assert.equal(allowed.allowed, true);
});

test('Mission P: happy path Intent→…→Archive with compose; act/evidence/verify receipts', async () => {
  const result = await runLoopComputeOrchestration(happyOpts());
  assert.equal(result.ok, true);
  assert.equal(result.status, 'ARCHIVED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.loopState.stage, MISSION_LOOP_STAGES.ARCHIVE);
  assert.equal(result.compute.status, 'COMPLETED');
  assert.equal(result.compute.ok, true);
  assert.equal(result.compute.toolOutputs.length, 3);

  const kinds = result.loopState.receipts.map((r) => r.kind);
  assert.ok(kinds.includes('act'));
  assert.ok(kinds.includes('evidence'));
  assert.ok(kinds.includes('verify'));
  assert.ok(kinds.includes('archive'));

  const act = result.loopState.receipts.find((r) => r.kind === 'act');
  assert.equal(act.ok, true);
  assert.equal(act.status, 'COMPLETED');
  assert.ok(Array.isArray(act.toolOutputHashes));
  assert.equal(act.toolOutputHashes.length, 3);

  const ev = result.loopState.receipts.find((r) => r.kind === 'evidence');
  assert.equal(ev.ok, true);
  assert.ok(ev.toolOutputsHashJoined);

  const ver = result.loopState.receipts.find((r) => r.kind === 'verify');
  assert.equal(ver.ok, true);

  const archiveGate = assertArchiveAllowed(result.loopState);
  assert.equal(archiveGate.allowed, true);
});

test('Mission P: illegal skip Plan→Evidence denied', () => {
  const state = createInitialLoopState('skip-test');
  state.stage = MISSION_LOOP_STAGES.PLAN;
  const gate = evaluateStageTransition(
    MISSION_LOOP_STAGES.PLAN,
    MISSION_LOOP_STAGES.EVIDENCE
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.code, 'ILLEGAL_STAGE_TRANSITION');
  assert.throws(
    () => advanceLoopOrThrow(state, MISSION_LOOP_STAGES.EVIDENCE),
    (err) => {
      assert.equal(err.code, 'ILLEGAL_STAGE_TRANSITION');
      return true;
    }
  );
  assert.equal(state.stage, MISSION_LOOP_STAGES.PLAN);
});

test('Mission P: infra gemini fail → no Archive; status GEMINI_TOOL_FAILED', async () => {
  let applyCalled = false;
  const err = new Error('gemini boom');
  err.code = 'GEMINI_UPSTREAM';
  const result = await runLoopComputeOrchestration(
    happyOpts({
      geminiQueryImpl: makeMockGeminiQueryImpl({ throwError: err }),
      applyDiff: async () => {
        applyCalled = true;
        return { applied: true };
      }
    })
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 'GEMINI_TOOL_FAILED');
  assert.equal(result.loopState.stage, MISSION_LOOP_STAGES.ACT);
  assert.equal(applyCalled, false);
  assert.notEqual(result.loopState.stage, MISSION_LOOP_STAGES.ARCHIVE);
  const kinds = result.loopState.receipts.map((r) => r.kind);
  assert.ok(kinds.includes('act'));
  assert.ok(!kinds.includes('archive'));
});

test('Mission P: soft QA fail → hitlRequired; Archive blocked without HITL', async () => {
  const result = await runLoopComputeOrchestration(
    happyOpts({
      browserQaClientImpl: makeMockBrowserQaClient({
        async collectCwv() {
          return { lcpMs: 9000, cls: 0.01 };
        }
      })
    })
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, ARCHIVE_REQUIRES_HITL_SOFT_QA);
  assert.equal(result.hitlRequired, true);
  assert.equal(result.softQaFailed, true);
  assert.equal(result.loopState.stage, MISSION_LOOP_STAGES.VERIFY);
  assert.notEqual(result.loopState.stage, MISSION_LOOP_STAGES.ARCHIVE);
  assert.equal(detectSoftBrowserQaFailure(result.compute.toolOutputs), true);
  assert.equal(result.compute.toolOutputs[2].ok, true);
  assert.equal(result.compute.toolOutputs[2].result.ok, false);
});

test('Mission P: soft QA fail + hitlReceipt.ok → Archive allowed', async () => {
  const result = await runLoopComputeOrchestration(
    happyOpts({
      browserQaClientImpl: makeMockBrowserQaClient({
        async collectCwv() {
          return { lcpMs: 9000, cls: 0.01 };
        }
      }),
      hitlReceipt: { ok: true, actor: 'operator', note: 'accept soft CWV' }
    })
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, 'ARCHIVED');
  assert.equal(result.softQaFailed, true);
  assert.equal(result.loopState.stage, MISSION_LOOP_STAGES.ARCHIVE);
  const hitl = result.loopState.receipts.find((r) => r.kind === 'hitl');
  assert.ok(hitl);
  assert.equal(hitl.ok, true);
});

test('Mission P: verify failure → no Archive (assertArchiveAllowed)', async () => {
  const result = await runLoopComputeOrchestration(
    happyOpts({
      runVerifier: async () => ({ ok: false, reason: 'tests_failed' })
    })
  );
  assert.equal(result.ok, false);
  assert.notEqual(result.loopState.stage, MISSION_LOOP_STAGES.ARCHIVE);
  const ver = result.loopState.receipts.find((r) => r.kind === 'verify');
  assert.ok(ver);
  assert.equal(ver.ok, false);
  const archiveGate = assertArchiveAllowed(result.loopState);
  assert.equal(archiveGate.allowed, false);
  assert.equal(archiveGate.code, 'ARCHIVE_REQUIRES_VERIFY');
});

test('Mission P: Evidence→Verify blocked without evidence receipt', () => {
  const state = createInitialLoopState('no-evidence');
  state.stage = MISSION_LOOP_STAGES.EVIDENCE;
  const gate = assertVerifyAdvanceAllowed(state);
  assert.equal(gate.allowed, false);
  assert.equal(gate.code, 'VERIFY_REQUIRES_EVIDENCE');
  assert.throws(
    () => advanceLoopOrThrow(state, MISSION_LOOP_STAGES.VERIFY),
    (err) => {
      assert.equal(err.code, 'VERIFY_REQUIRES_EVIDENCE');
      return true;
    }
  );
  assert.equal(state.stage, MISSION_LOOP_STAGES.EVIDENCE);
});

test('Mission P: applyDiff not called when Act compute fails infra', async () => {
  let applyCount = 0;
  let rollbackCount = 0;
  const err = new Error('stitch infra');
  err.code = 'STITCH_UPSTREAM';
  const result = await runLoopComputeOrchestration(
    happyOpts({
      stitchClientImpl: makeMockStitchClient({
        async generate_screen() {
          throw err;
        }
      }),
      applyDiff: async () => {
        applyCount += 1;
        return { applied: true };
      },
      rollbackDiff: async () => {
        rollbackCount += 1;
      }
    })
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 'STITCH_TOOL_FAILED');
  assert.equal(applyCount, 0);
  assert.equal(result.loopState.stage, MISSION_LOOP_STAGES.ACT);
});

test('Mission P: dispatcher not required for pure-native compose', async () => {
  let dispatchCount = 0;
  const spyDispatcher = {
    async dispatch() {
      dispatchCount += 1;
      throw new Error('dispatcher must not be called');
    }
  };
  const result = await runLoopComputeOrchestration(
    happyOpts({
      toolDispatcher: spyDispatcher
    })
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, 'ARCHIVED');
  assert.equal(dispatchCount, 0);
  // Also prove omission of dispatcher works
  const result2 = await runLoopComputeOrchestration(
    happyOpts({
      toolDispatcher: undefined,
      custodyBaseDir: tempCustodyDir()
    })
  );
  assert.equal(result2.ok, true);
  assert.equal(result2.compute.toolOutputs.length, 3);
});

test('Mission P: custody/toolOutputs hashed into evidence receipt fields', async () => {
  const result = await runLoopComputeOrchestration(happyOpts());
  assert.equal(result.ok, true);
  const { hashes, joined } = hashToolOutputs(result.compute.toolOutputs);
  const ev = result.loopState.receipts.find((r) => r.kind === 'evidence');
  assert.ok(ev);
  assert.equal(ev.toolOutputsHashJoined, joined);
  assert.deepEqual(ev.toolOutputHashes, hashes);
  assert.ok(Array.isArray(ev.custodyHashes));
  assert.ok(ev.custodyHashes.length >= 1);
  for (const h of ev.custodyHashes) {
    assert.match(h, /^[a-f0-9]{64}$/);
  }
  const act = result.loopState.receipts.find((r) => r.kind === 'act');
  assert.equal(act.toolOutputsHashJoined, joined);
  assert.deepEqual(
    result.compute.toolOutputs.map((o) => o.toolName),
    buildMultiNativeComposeToolCalls({}).map((c) => c.toolName)
  );
});

test('Mission P: optional live SKIP', { skip: 'live Gemini/Stitch/Browser QA not in CI hermetic suite' }, async () => {
  assert.fail('live path should be skipped');
});
