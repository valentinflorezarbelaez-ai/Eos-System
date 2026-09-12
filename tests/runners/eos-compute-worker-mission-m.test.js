/**
 * @file eos-compute-worker-mission-m.test.js
 * @description SPEC-0018 Mission M — Browser QA native tools wired into compute worker.
 * Hermetic by default; live network only when RUN_LIVE_BROWSER_QA_TESTS=true.
 * Soft QA (CWV/a11y) does NOT fail-close the run; infra throws → BROWSER_QA_TOOL_FAILED.
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
  isNativeBrowserQaToolCall,
  isNativeBuiltinToolCall,
  normalizeToolCalls,
  executeBrowserQaTool,
  BROWSER_QA_TIMEOUT_MS,
  BROWSER_QA_TOOL_NAMES
} from '../../scripts/runners/eos-compute-worker.js';
import {
  listBrowserQaTools,
  isBrowserQaToolName,
  PRODUCTION_READY
} from '../../src/core/qa/browser-qa-runner.js';
import { listGeminiTools } from '../../src/core/mcp/gemini-tool-bridge.js';
import { listStitchTools } from '../../src/core/mcp/stitch-tool-bridge.js';

const CHANGE_ID = 'eos-mission-m-browser-qa-worker-bridge';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/** 1×1 PNG (Mission K) */
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-m-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire browser QA worker bridge @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-m-builder',
    verifierId: 'mission-m-verifier-child',
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

test('Mission M: PRODUCTION_READY is NO', () => {
  assert.equal(PRODUCTION_READY, 'NO');
  assert.deepEqual([...BROWSER_QA_TOOL_NAMES], ['browser_qa_run']);
});

test('Mission M: listBuiltinComputeTools includes browser_qa_run + stitch + gemini', () => {
  const gemini = listGeminiTools().map((t) => t.name).sort();
  const stitch = listStitchTools().map((t) => t.name).sort();
  const browserQa = listBrowserQaTools().map((t) => t.name).sort();
  assert.deepEqual(gemini, ['gemini_query', 'gemini_structured']);
  assert.ok(stitch.includes('stitch_list_projects'));
  assert.deepEqual(browserQa, ['browser_qa_run']);
  const viaWorker = listBuiltinComputeTools().map((t) => t.name).sort();
  assert.deepEqual(viaWorker, [...gemini, ...stitch, ...browserQa].sort());
  const desc = listBrowserQaTools()[0];
  assert.ok(desc.description && desc.description.length > 0);
  assert.ok(desc.inputSchema);
  assert.deepEqual(desc.inputSchema.required, ['url']);
  assert.ok(desc.inputSchema.properties.url);
  assert.ok(desc.inputSchema.properties.viewport);
  assert.ok(desc.inputSchema.properties.timeoutMs);
});

test('Mission M: isNativeBrowserQaToolCall true/false', () => {
  assert.equal(isBrowserQaToolName('browser_qa_run'), true);
  assert.equal(isBrowserQaToolName('echo'), false);
  assert.equal(isNativeBrowserQaToolCall({ toolName: 'browser_qa_run' }), true);
  assert.equal(
    isNativeBrowserQaToolCall({ serverName: 'eos-browser-qa', toolName: 'anything' }),
    true
  );
  assert.equal(
    isNativeBrowserQaToolCall({ serverName: 'mock-echo', toolName: 'echo' }),
    false
  );
  assert.equal(isNativeGeminiToolCall({ toolName: 'gemini_query' }), true);
  assert.equal(isNativeStitchToolCall({ toolName: 'stitch_list_projects' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'browser_qa_run' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'stitch_get_screen' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'gemini_structured' }), true);
  assert.equal(isNativeBuiltinToolCall({ toolName: 'echo' }), false);
});

test('Mission M: executeComputeRun browser_qa_run + mock → toolOutputs ok, custody VERIFIED, applyDiff runs', async () => {
  let applyCalled = false;
  const plan = basePlan({
    toolCalls: [
      {
        serverName: 'eos-browser-qa',
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    browserQaClientImpl: makeMockBrowserQaClient(),
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
  assert.equal(out.toolName, 'browser_qa_run');
  assert.equal(out.serverName, 'eos-browser-qa');
  assert.equal(out.result.ok, true);
  assert.ok(out.result.cwv && out.result.cwv.pass === true);
  assert.ok(out.result.a11y && out.result.a11y.pass === true);
  assert.ok(out.result.screenshot && out.result.screenshot.sha256);
  assert.ok(out.custody);
  assert.equal(out.custody.status, 'VERIFIED');
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.custodyReceipt.payload.tool_execution_hashes.length, 1);
});

test('Mission M: soft QA fail (bad LCP) → toolOutputs ok:true, result.ok false, custody FAILED, applyDiff still runs', async () => {
  let applyCalled = false;
  let rollbackCalled = false;
  const client = makeMockBrowserQaClient({
    async collectCwv() {
      return { lcpMs: 9000, cls: 0.01 }; // soft fail LCP
    }
  });
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/slow' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    browserQaClientImpl: client,
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

  // Soft QA must NOT fail-close the run — report delivered, apply proceeds.
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(applyCalled, true);
  assert.equal(rollbackCalled, false);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[0].result.ok, false);
  assert.equal(result.toolOutputs[0].custody.status, 'FAILED');
  assert.equal(result.toolOutputs[0].result.cwv.lcpPass, false);
});

test('Mission M: missing browserQaClientImpl → BROWSER_QA_TOOL_FAILED, rollback, no applyDiff', async () => {
  const prevAllow = process.env.BROWSER_QA_ALLOW_LIVE;
  delete process.env.BROWSER_QA_ALLOW_LIVE;
  try {
    let applyCalled = false;
    let rollbackCalled = false;
    const plan = basePlan({
      toolCalls: [
        {
          toolName: 'browser_qa_run',
          arguments: { url: 'https://example.test/' }
        }
      ]
    });
    const result = await executeComputeRun({
      plan,
      // no browserQaClientImpl
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
    assert.equal(result.status, 'BROWSER_QA_TOOL_FAILED');
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, 'CLIENT_IMPL_REQUIRED');
    assert.equal(applyCalled, false);
    assert.equal(rollbackCalled, true);
    assert.match(String(result.error), /CLIENT_IMPL_REQUIRED/);
    assert.equal(result.toolOutputs[0].ok, false);
    assert.equal(result.toolOutputs[0].serverName, 'eos-browser-qa');
  } finally {
    if (prevAllow !== undefined) process.env.BROWSER_QA_ALLOW_LIVE = prevAllow;
    else delete process.env.BROWSER_QA_ALLOW_LIVE;
  }
});

test('Mission M: only browser QA calls → toolDispatcher can be null', async () => {
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'about:blank' }
      },
      {
        serverName: 'eos-browser-qa',
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/2' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    // no toolDispatcher
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.toolOutputs.length, 2);
  assert.equal(result.toolOutputs[0].toolName, 'browser_qa_run');
  assert.equal(result.toolOutputs[1].toolName, 'browser_qa_run');
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[1].ok, true);
});

test('Mission M: mixed stitch + browser QA natives without MCP dispatcher OK', async () => {
  const plan = basePlan({
    toolCalls: [
      { toolName: 'stitch_list_projects', arguments: {} },
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    // no toolDispatcher — both are natives
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.toolOutputs.length, 2);
  assert.equal(result.toolOutputs[0].toolName, 'stitch_list_projects');
  assert.equal(result.toolOutputs[0].serverName, 'eos-stitch');
  assert.equal(result.toolOutputs[1].toolName, 'browser_qa_run');
  assert.equal(result.toolOutputs[1].serverName, 'eos-browser-qa');
  assert.equal(result.toolOutputs[1].custody.status, 'VERIFIED');
});

test('Mission M: TIMEOUT / client hang → BROWSER_QA_TOOL_FAILED', async () => {
  let applyCalled = false;
  let rollbackCalled = false;
  const client = makeMockBrowserQaClient({
    async navigate() {
      await new Promise(() => {}); // hang forever
    }
  });
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/' },
        timeoutMs: 50
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    browserQaClientImpl: client,
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

  assert.equal(result.status, 'BROWSER_QA_TOOL_FAILED');
  assert.equal(result.errorCode, 'TIMEOUT');
  assert.equal(applyCalled, false);
  assert.equal(rollbackCalled, true);
  assert.equal(result.toolOutputs[0].ok, false);
});

test('Mission M: URL_REQUIRED / invalid → BROWSER_QA_TOOL_FAILED', async () => {
  let applyCalled = false;
  const planMissing = basePlan({
    toolCalls: [{ toolName: 'browser_qa_run', arguments: {} }]
  });
  const missing = await executeComputeRun({
    plan: planMissing,
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(missing.status, 'BROWSER_QA_TOOL_FAILED');
  assert.equal(missing.errorCode, 'URL_REQUIRED');
  assert.equal(applyCalled, false);

  applyCalled = false;
  const planInvalid = basePlan({
    toolCalls: [
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'ftp://not-allowed.example/' }
      }
    ]
  });
  const invalid = await executeComputeRun({
    plan: planInvalid,
    browserQaClientImpl: makeMockBrowserQaClient(),
    applyDiff: async () => {
      applyCalled = true;
      return { applied: true };
    },
    rollbackDiff: async () => {},
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(invalid.status, 'BROWSER_QA_TOOL_FAILED');
  assert.equal(invalid.errorCode, 'URL_INVALID');
  assert.equal(applyCalled, false);
});

test('Mission M: normalizeToolCalls with browser_qa_run on plan', () => {
  const calls = normalizeToolCalls(null, [
    {
      serverName: 'eos-browser-qa',
      toolName: 'browser_qa_run',
      arguments: { url: 'https://example.test/', viewport: { width: 1280 } },
      timeoutMs: 4321
    },
    {
      toolName: 'browser_qa_run',
      arguments: { url: 'about:blank' }
    }
  ]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].timeoutMs, 4321);
  assert.equal(calls[0].toolName, 'browser_qa_run');
  assert.equal(calls[0].serverName, 'eos-browser-qa');
  assert.equal(calls[0].arguments.url, 'https://example.test/');
  assert.equal(calls[1].toolName, 'browser_qa_run');
  assert.equal(typeof BROWSER_QA_TIMEOUT_MS, 'number');
  assert.equal(BROWSER_QA_TIMEOUT_MS, 30000);
});

test('Mission M: hashToolOutputs includes browser QA output', async () => {
  const plan = basePlan({
    toolCalls: [
      {
        toolName: 'browser_qa_run',
        arguments: { url: 'https://example.test/hash' }
      }
    ]
  });

  const result = await executeComputeRun({
    plan,
    browserQaClientImpl: makeMockBrowserQaClient(),
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

const liveEnabled = process.env.RUN_LIVE_BROWSER_QA_TESTS === 'true';
test(
  'Mission M: (optional) live Browser QA',
  { skip: liveEnabled ? false : 'set RUN_LIVE_BROWSER_QA_TESTS=true to run' },
  async () => {
    const out = await executeBrowserQaTool({
      toolName: 'browser_qa_run',
      arguments: { url: 'about:blank' },
      timeoutMs: 20000
    });
    assert.ok(out);
    assert.ok('ok' in out);
  }
);
