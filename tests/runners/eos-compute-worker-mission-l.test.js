/**
 * @file eos-compute-worker-mission-l.test.js
 * @description SPEC-0017 Mission L — Stitch native tools wired into compute worker.
 * Hermetic by default; live network only when RUN_LIVE_STITCH_TESTS=true.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildComputePlan,
  parseCheckboxTasks,
  executeComputeRun,
  hashToolOutputs,
  listBuiltinComputeTools,
  isNativeGeminiToolCall,
  isNativeStitchToolCall,
  isNativeBuiltinToolCall,
  normalizeToolCalls
} from '../../scripts/runners/eos-compute-worker.js';
import {
  listStitchTools,
  isStitchToolName,
  executeStitchTool,
  STITCH_TOOL_TIMEOUT_MS,
  PRODUCTION_READY
} from '../../src/core/mcp/stitch-tool-bridge.js';
import { listGeminiTools } from '../../src/core/mcp/gemini-tool-bridge.js';

const CHANGE_ID = 'eos-mission-l-stitch-worker-bridge';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-l-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire stitch tool bridge @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-l-builder',
    verifierId: 'mission-l-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

function makeMockStitchClient(overrides = {}) {
  return {
    async list_projects() {
      return { projects: [{ id: 'p1', name: 'Demo' }] };
    },
    async generate_screen({ projectId, prompt, deviceType }) {
      return {
        screenId: 'scr-1',
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

test('Mission L: PRODUCTION_READY is NO', () => {
  assert.equal(PRODUCTION_READY, 'NO');
});

test('Mission L: listBuiltinComputeTools includes all 4 stitch tools + gemini tools', () => {
  const stitch = listStitchTools().map((t) => t.name).sort();
  assert.deepEqual(stitch, [
    'stitch_export_design_md',
    'stitch_generate_screen',
    'stitch_get_screen',
    'stitch_list_projects'
  ]);
  const gemini = listGeminiTools().map((t) => t.name).sort();
  assert.deepEqual(gemini, ['gemini_query', 'gemini_structured']);
  const viaWorker = listBuiltinComputeTools().map((t) => t.name).sort();
  assert.deepEqual(viaWorker, [...gemini, ...stitch].sort());
  for (const t of listStitchTools()) {
    assert.ok(t.description && t.description.length > 0);
    assert.ok(t.inputSchema);
  }
});

test('Mission L: isNativeStitchToolCall true for stitch_* / eos-stitch; false for random MCP', () => {
  assert.equal(isStitchToolName('stitch_list_projects'), true);
  assert.equal(isStitchToolName('echo'), false);
  assert.equal(isNativeStitchToolCall({ toolName: 'stitch_list_projects' }), true);
  assert.equal(
    isNativeStitchToolCall({ serverName: 'eos-stitch', toolName: 'anything' }),
    true
  );
  assert.equal(
    isNativeStitchToolCall({ serverName: 'mock-echo', toolName: 'echo' }),
    false
  );
  assert.equal(isNativeGeminiToolCall({ toolName: 'gemini_query' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'stitch_get_screen' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'gemini_structured' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'echo' }), false);
});

test('Mission L: executeComputeRun stitch_list_projects + mock client → ok + custody VERIFIED + apply runs', async () => {
  let applyCalled = false;
  const plan = basePlan({
    toolCalls: [
      {
        serverName: 'eos-stitch',
        toolName: 'stitch_list_projects',
        arguments: {}
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(applyCalled, true);
  assert.equal(result.toolOutputs.length, 1);
  const out = result.toolOutputs[0];
  assert.equal(out.ok, true);
  assert.equal(out.toolName, 'stitch_list_projects');
  assert.equal(out.serverName, 'eos-stitch');
  assert.ok(out.result && Array.isArray(out.result.projects));
  assert.ok(out.custody);
  assert.equal(out.custody.status, 'VERIFIED');
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.custodyReceipt.payload.tool_execution_hashes.length, 1);
});

test('Mission L: stitch_generate_screen DESKTOP success with clientImpl', async () => {
  let seenArgs = null;
  const client = makeMockStitchClient({
    async generate_screen(args) {
      seenArgs = args;
      return {
        screenId: 'scr-desktop',
        projectId: args.projectId,
        deviceType: args.deviceType,
        previewUrl: 'https://example.test/d'
      };
    }
  });

  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'stitch_generate_screen',
        arguments: {
          projectId: 'proj-1',
          prompt: 'Landing page hero',
          deviceType: 'DESKTOP'
        }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    stitchClientImpl: client,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(seenArgs.deviceType, 'DESKTOP');
  assert.equal(seenArgs.projectId, 'proj-1');
  assert.equal(result.toolOutputs[0].result.screenId, 'scr-desktop');
  assert.equal(result.toolOutputs[0].serverName, 'eos-stitch');
  assert.equal(result.toolOutputs[0].custody.status, 'VERIFIED');
});

test('Mission L: stitch client throw → STITCH_TOOL_FAILED, rollbackDiff called, applyDiff NOT called', async () => {
  let applyCalled = false;
  let rollbackCalled = false;
  const client = makeMockStitchClient({
    async list_projects() {
      const err = new Error('upstream down');
      err.code = 'STITCH_UPSTREAM';
      throw err;
    }
  });

  const plan = basePlan({
    toolCalls: [{ toolName: 'stitch_list_projects', arguments: {} }]
  });

  const result = await executeComputeRun({
    plan,
    stitchClientImpl: client,
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {
      rollbackCalled = true;
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'STITCH_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(applyCalled, false);
  assert.equal(rollbackCalled, true);
  assert.equal(result.toolOutputs[0].ok, false);
  assert.equal(result.toolOutputs[0].serverName, 'eos-stitch');
});

test('Mission L: mixed stitch native + MCP — MCP needs dispatcher; stitch does not', async () => {
  const plan = basePlan({
    toolCalls: [
      { toolName: 'stitch_list_projects', arguments: {} },
      { serverName: 'mock-echo', toolName: 'echo', arguments: { y: 2 } }
    ]
  });

  const missing = await executeComputeRun({
    plan,
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(missing.status, 'MCP_TOOL_DISPATCHER_REQUIRED');

  const fakeDispatcher = {
    async dispatch({ serverName, toolName, arguments: args }) {
      return { serverName, toolName, result: { echoed: args }, meta: { durationMs: 1 } };
    }
  };
  const mixed = await executeComputeRun({
    plan,
    toolDispatcher: fakeDispatcher,
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(mixed.status, 'COMPLETED');
  assert.equal(mixed.toolOutputs.length, 2);
  assert.equal(mixed.toolOutputs[0].toolName, 'stitch_list_projects');
  assert.equal(mixed.toolOutputs[0].custody.status, 'VERIFIED');
  assert.equal(mixed.toolOutputs[1].toolName, 'echo');
  assert.equal(mixed.toolOutputs[1].ok, true);
  assert.equal(mixed.custodyReceipt.payload.tool_execution_hashes.length, 2);
});

test('Mission L: only stitch calls → toolDispatcher can be null (no MCP_TOOL_DISPATCHER_REQUIRED)', async () => {
  const plan = basePlan({
    toolCalls: [
      { toolName: 'stitch_list_projects', arguments: {} },
      {
        toolName: 'stitch_get_screen',
        arguments: { screenId: 'scr-1' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    // no toolDispatcher
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.toolOutputs.length, 2);
  assert.equal(result.toolOutputs[0].toolName, 'stitch_list_projects');
  assert.equal(result.toolOutputs[1].toolName, 'stitch_get_screen');
});

test('Mission L: missing stitchClientImpl → CLIENT_IMPL_REQUIRED surfaces as STITCH_TOOL_FAILED', async () => {
  // Ensure live path is off
  const prevAllow = process.env.STITCH_ALLOW_LIVE;
  delete process.env.STITCH_ALLOW_LIVE;
  try {
    let applyCalled = false;
    const plan = basePlan({
      toolCalls: [{ toolName: 'stitch_list_projects', arguments: {} }]
    });
    const result = await executeComputeRun({
      plan,
      // no stitchClientImpl
      applyDiff: async () => {
        applyCalled = true;
        return { applied: true };
      },
      rollbackDiff: async () => {},
      runVerifier: async () => ({ ok: true }),
      custodyBaseDir: tempCustodyDir()
    });
    assert.equal(result.status, 'STITCH_TOOL_FAILED');
    assert.equal(result.errorCode, 'CLIENT_IMPL_REQUIRED');
    assert.equal(applyCalled, false);
    assert.match(String(result.error), /CLIENT_IMPL_REQUIRED/);
  } finally {
    if (prevAllow !== undefined) process.env.STITCH_ALLOW_LIVE = prevAllow;
    else delete process.env.STITCH_ALLOW_LIVE;
  }
});

test('Mission L: hashToolOutputs includes stitch outputs', async () => {
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'stitch_export_design_md',
        arguments: { projectId: 'proj-hash' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  const { hashes } = hashToolOutputs(result.toolOutputs);
  assert.equal(hashes.length, 1);
  assert.match(hashes[0], /^[a-f0-9]{64}$/);
  assert.deepEqual(result.custodyReceipt.payload.tool_execution_hashes, hashes);
});

test('Mission L: INVALID_DEVICE_TYPE from bridge surfaces as STITCH_TOOL_FAILED', async () => {
  let applyCalled = false;
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'stitch_generate_screen',
        arguments: {
          projectId: 'p1',
          prompt: 'bad device',
          deviceType: 'TABLET'
        }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    stitchClientImpl: makeMockStitchClient(),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'STITCH_TOOL_FAILED');
  assert.equal(result.errorCode, 'INVALID_DEVICE_TYPE');
  assert.equal(applyCalled, false);
});

test('Mission L: normalizeToolCalls still works with stitch toolCalls on plan', () => {
  const calls = normalizeToolCalls(null, [
    {
      serverName: 'eos-stitch',
      toolName: 'stitch_generate_screen',
      arguments: { projectId: 'p', prompt: 'x', deviceType: 'MOBILE' },
      timeoutMs: 4321
    },
    {
      toolName: 'stitch_list_projects',
      arguments: {}
    }
  ]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].timeoutMs, 4321);
  assert.equal(calls[0].toolName, 'stitch_generate_screen');
  assert.equal(calls[0].serverName, 'eos-stitch');
  assert.equal(calls[1].toolName, 'stitch_list_projects');
  assert.equal(typeof STITCH_TOOL_TIMEOUT_MS, 'number');
  assert.equal(STITCH_TOOL_TIMEOUT_MS, 30000);
});

const liveEnabled = process.env.RUN_LIVE_STITCH_TESTS === 'true';
test(
  'Mission L: (optional) live Stitch',
  { skip: liveEnabled ? false : 'set RUN_LIVE_STITCH_TESTS=true to run' },
  async () => {
    const out = await executeStitchTool({
      toolName: 'stitch_list_projects',
      arguments: {},
      timeoutMs: 20000
    });
    assert.equal(out.ok, true);
    assert.ok(out.result);
  }
);
