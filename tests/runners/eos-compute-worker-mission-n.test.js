/**
 * @file eos-compute-worker-mission-n.test.js
 * @description SPEC-0019 Mission N — multi-native tool composition in one executeComputeRun.
 * Proves gemini → stitch → browser_qa sequential compose with hermetic mocks.
 * Soft QA mid/end-chain does NOT fail-close; infra throws abort later natives + applyDiff.
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
  normalizeToolCalls,
  MULTI_NATIVE_COMPOSE_ORDER,
  buildMultiNativeComposeToolCalls
} from '../../scripts/runners/eos-compute-worker.js';
import {
  listBrowserQaTools,
  PRODUCTION_READY
} from '../../src/core/qa/browser-qa-runner.js';
import { listGeminiTools } from '../../src/core/mcp/gemini-tool-bridge.js';
import { listStitchTools } from '../../src/core/mcp/stitch-tool-bridge.js';

const CHANGE_ID = 'eos-mission-n-multi-native-compose';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/** 1×1 PNG (Mission K / M) */
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-n-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Multi-native compose gemini+stitch+browser_qa @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-n-builder',
    verifierId: 'mission-n-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
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
        screenId: 'scr-compose-1',
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

/** Provider-shaped mock for geminiQueryImpl (queryGemini contract). */
function makeMockGeminiQueryImpl(overrides = {}) {
  return async function geminiQueryImpl(opts = {}) {
    if (typeof overrides.impl === 'function') {
      return overrides.impl(opts);
    }
    if (overrides.throwError) {
      throw overrides.throwError;
    }
    return {
      text: overrides.text != null ? overrides.text : 'compose-gemini-ok',
      data: overrides.data !== undefined ? overrides.data : null,
      model: overrides.model != null ? overrides.model : 'mock-gemini',
      usage: overrides.usage !== undefined ? overrides.usage : { promptTokens: 1, candidatesTokens: 2 }
    };
  };
}

function defaultComposeCalls(extra = {}) {
  return buildMultiNativeComposeToolCalls(extra);
}

test('Mission N: PRODUCTION_READY is NO', () => {
  assert.equal(PRODUCTION_READY, 'NO');
  assert.deepEqual([...MULTI_NATIVE_COMPOSE_ORDER], [
    'eos-gemini',
    'eos-stitch',
    'eos-browser-qa'
  ]);
});

test('Mission N: listBuiltinComputeTools includes gemini + stitch + browser_qa (additive)', () => {
  const gemini = listGeminiTools().map((t) => t.name).sort();
  const stitch = listStitchTools().map((t) => t.name).sort();
  const browserQa = listBrowserQaTools().map((t) => t.name).sort();
  assert.ok(gemini.includes('gemini_query'));
  assert.ok(stitch.includes('stitch_generate_screen'));
  assert.deepEqual(browserQa, ['browser_qa_run']);
  const viaWorker = listBuiltinComputeTools().map((t) => t.name).sort();
  assert.deepEqual(viaWorker, [...gemini, ...stitch, ...browserQa].sort());
});

test('Mission N: buildMultiNativeComposeToolCalls produces gemini → stitch → browser_qa order', () => {
  const calls = buildMultiNativeComposeToolCalls({
    gemini: { prompt: 'design a landing' },
    stitch: { projectId: 'p9', prompt: 'hero', deviceType: 'MOBILE' },
    browserQa: { url: 'https://example.test/landing' }
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].serverName, 'eos-gemini');
  assert.equal(calls[0].toolName, 'gemini_query');
  assert.equal(calls[0].arguments.prompt, 'design a landing');
  assert.equal(calls[1].serverName, 'eos-stitch');
  assert.equal(calls[1].toolName, 'stitch_generate_screen');
  assert.equal(calls[1].arguments.projectId, 'p9');
  assert.equal(calls[1].arguments.deviceType, 'MOBILE');
  assert.equal(calls[2].serverName, 'eos-browser-qa');
  assert.equal(calls[2].toolName, 'browser_qa_run');
  assert.equal(calls[2].arguments.url, 'https://example.test/landing');
  assert.deepEqual(
    calls.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );

  const defaults = buildMultiNativeComposeToolCalls();
  assert.equal(defaults[0].toolName, 'gemini_query');
  assert.equal(defaults[1].toolName, 'stitch_generate_screen');
  assert.equal(defaults[2].toolName, 'browser_qa_run');
  assert.ok(defaults[0].arguments.prompt);
  assert.ok(defaults[1].arguments.projectId);
  assert.ok(defaults[2].arguments.url);
});

test('Mission N: happy path compose gemini→stitch→browser_qa — 3 ok outputs, custody, applyDiff', async () => {
  let applyCalled = false;
  let stitchCalls = 0;
  let browserCalls = 0;
  let geminiCalls = 0;

  const plan = basePlan({
    toolCalls: defaultComposeCalls({
      gemini: { prompt: 'compose happy' },
      stitch: { projectId: 'p-happy', prompt: 'screen', deviceType: 'DESKTOP' },
      browserQa: { url: 'https://example.test/happy' }
    })
  });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        geminiCalls += 1;
        return { text: 'happy-gemini', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen(args) {
        stitchCalls += 1;
        return {
          screenId: 'scr-h',
          projectId: args.projectId,
          prompt: args.prompt,
          deviceType: args.deviceType,
          previewUrl: 'https://example.test/preview-h'
        };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate(url) {
        browserCalls += 1;
        return { ok: true, url };
      }
    }),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(applyCalled, true);
  assert.equal(geminiCalls, 1);
  assert.equal(stitchCalls, 1);
  assert.equal(browserCalls, 1);
  assert.equal(result.toolOutputs.length, 3);
  assert.deepEqual(
    result.toolOutputs.map((o) => o.toolName),
    ['gemini_query', 'stitch_generate_screen', 'browser_qa_run']
  );
  assert.deepEqual(
    result.toolOutputs.map((o) => o.serverName),
    ['eos-gemini', 'eos-stitch', 'eos-browser-qa']
  );
  for (const out of result.toolOutputs) {
    assert.equal(out.ok, true);
    assert.ok(out.custody);
    assert.equal(out.custody.status, 'VERIFIED');
    assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  }
  assert.equal(result.toolOutputs[0].result.text, 'happy-gemini');
  assert.equal(result.toolOutputs[1].result.screenId, 'scr-h');
  assert.equal(result.toolOutputs[2].result.ok, true);
  assert.equal(result.custodyReceipt.payload.tool_execution_hashes.length, 3);
});

test('Mission N: soft browser QA mid/end-chain CWV fail → QA toolOutputs ok:true, applyDiff runs', async () => {
  let applyCalled = false;
  const plan = basePlan({
    toolCalls: defaultComposeCalls({
      browserQa: { url: 'https://example.test/slow' }
    })
  });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient({
      async collectCwv() {
        return { lcpMs: 9000, cls: 0.01 }; // soft fail
      }
    }),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {
      throw new Error('rollback should not run on soft QA');
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(applyCalled, true);
  assert.equal(result.toolOutputs.length, 3);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[1].ok, true);
  assert.equal(result.toolOutputs[2].ok, true);
  assert.equal(result.toolOutputs[2].toolName, 'browser_qa_run');
  assert.equal(result.toolOutputs[2].result.ok, false);
  assert.equal(result.toolOutputs[2].custody.status, 'FAILED');
  assert.equal(result.toolOutputs[2].result.cwv.lcpPass, false);
});

test('Mission N: stitch infra fail mid-chain → STITCH_TOOL_FAILED, browser_qa NOT run, applyDiff NOT called', async () => {
  let applyCalled = false;
  let browserCalled = false;
  let geminiCalled = false;
  const err = new Error('stitch boom');
  err.code = 'STITCH_UPSTREAM';

  const plan = basePlan({
    toolCalls: defaultComposeCalls()
  });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        geminiCalled = true;
        return { text: 'pre-stitch', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        throw err;
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        browserCalled = true;
        return { ok: true, url: 'x' };
      }
    }),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'STITCH_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(geminiCalled, true);
  assert.equal(browserCalled, false);
  assert.equal(applyCalled, false);
  assert.ok(result.toolOutputs.length >= 2);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[0].toolName, 'gemini_query');
  assert.equal(result.toolOutputs[1].ok, false);
  assert.equal(result.toolOutputs[1].toolName, 'stitch_generate_screen');
  assert.equal(
    result.toolOutputs.some((o) => o.toolName === 'browser_qa_run'),
    false
  );
});

test('Mission N: gemini infra fail first → GEMINI_TOOL_FAILED, stitch/browser never run', async () => {
  let applyCalled = false;
  let stitchCalled = false;
  let browserCalled = false;
  const err = new Error('gemini boom');
  err.code = 'GEMINI_UPSTREAM';

  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({ throwError: err }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        stitchCalled = true;
        return { screenId: 'x' };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        browserCalled = true;
        return { ok: true, url: 'x' };
      }
    }),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'GEMINI_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(stitchCalled, false);
  assert.equal(browserCalled, false);
  assert.equal(applyCalled, false);
  assert.equal(result.toolOutputs.length, 1);
  assert.equal(result.toolOutputs[0].ok, false);
  assert.equal(result.toolOutputs[0].toolName, 'gemini_query');
});

test('Mission N: browser QA infra fail after gemini+stitch → BROWSER_QA_TOOL_FAILED, applyDiff not called', async () => {
  let applyCalled = false;
  const err = new Error('browser infra boom');
  err.code = 'BROWSER_QA_INFRA';

  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        throw err;
      }
    }),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'BROWSER_QA_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(applyCalled, false);
  assert.equal(result.toolOutputs.length, 3);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[0].toolName, 'gemini_query');
  assert.equal(result.toolOutputs[1].ok, true);
  assert.equal(result.toolOutputs[1].toolName, 'stitch_generate_screen');
  assert.equal(result.toolOutputs[2].ok, false);
  assert.equal(result.toolOutputs[2].toolName, 'browser_qa_run');
});

test('Mission N: hashToolOutputs covers all three compose outputs', async () => {
  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  const { hashes } = hashToolOutputs(result.toolOutputs);
  assert.equal(hashes.length, 3);
  for (const h of hashes) {
    assert.match(h, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(result.custodyReceipt.payload.tool_execution_hashes, hashes);
});

test('Mission N: natives-only compose → no MCP dispatcher required (needsMcpDispatcher false)', async () => {
  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    // deliberately omit toolDispatcher
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(result.toolOutputs.length, 3);
  assert.notEqual(result.status, 'MCP_TOOL_DISPATCHER_REQUIRED');
});

test('Mission N: normalizeToolCalls preserves compose order from plan', () => {
  const ordered = [
    { serverName: 'eos-gemini', toolName: 'gemini_query', arguments: { prompt: 'a' } },
    {
      serverName: 'eos-stitch',
      toolName: 'stitch_generate_screen',
      arguments: { projectId: 'p', prompt: 'b', deviceType: 'DESKTOP' }
    },
    {
      serverName: 'eos-browser-qa',
      toolName: 'browser_qa_run',
      arguments: { url: 'https://example.test/o' }
    }
  ];
  const plan = basePlan({ toolCalls: ordered });
  const fromPlan = normalizeToolCalls(plan, undefined);
  assert.equal(fromPlan.length, 3);
  assert.deepEqual(
    fromPlan.map((c) => c.toolName),
    ['gemini_query', 'stitch_generate_screen', 'browser_qa_run']
  );
  assert.deepEqual(
    fromPlan.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );

  const fromArg = normalizeToolCalls(null, ordered.slice().reverse());
  assert.deepEqual(
    fromArg.map((c) => c.toolName),
    ['browser_qa_run', 'stitch_generate_screen', 'gemini_query']
  );
});

const liveEnabled = process.env.RUN_LIVE_MULTI_NATIVE_TESTS === 'true';
test(
  'Mission N: (optional) live multi-native compose',
  { skip: liveEnabled ? false : 'set RUN_LIVE_MULTI_NATIVE_TESTS=true to run' },
  async () => {
    assert.ok(typeof buildMultiNativeComposeToolCalls === 'function');
  }
);
