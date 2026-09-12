/**
 * @file eos-compute-worker-mission-o-adversarial.test.js
 * @description SPEC-0020 Mission O — native-tools adversarial suite against
 * eos-compute-worker natives (gemini / stitch / browser_qa / multi-native compose).
 *
 * Evidence-over-claims. Hermetic TDD only (no live network required).
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
  buildMultiNativeComposeToolCalls,
  isNativeGeminiToolCall,
  isNativeStitchToolCall,
  isNativeBrowserQaToolCall,
  isNativeBuiltinToolCall,
  isGeminiToolName,
  isStitchToolName,
  isBrowserQaToolName,
  GEMINI_TOOL_MAX_BYTES
} from '../../scripts/runners/eos-compute-worker.js';
import {
  listBrowserQaTools,
  PRODUCTION_READY
} from '../../src/core/qa/browser-qa-runner.js';
import { listGeminiTools } from '../../src/core/mcp/gemini-tool-bridge.js';
import {
  listStitchTools,
  STITCH_TOOL_MAX_BYTES
} from '../../src/core/mcp/stitch-tool-bridge.js';

const CHANGE_ID = 'eos-mission-o-native-tools-adversarial';
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/** 1×1 PNG (Mission K / M / N) */
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-o-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks(
      '- [ ] Native-tools adversarial gemini+stitch+browser_qa @needs(VCS)\n'
    ),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-o-builder',
    verifierId: 'mission-o-verifier-child',
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
        screenId: 'scr-o-1',
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
      text: overrides.text != null ? overrides.text : 'adversarial-gemini-ok',
      data: overrides.data !== undefined ? overrides.data : null,
      model: overrides.model != null ? overrides.model : 'mock-gemini',
      usage: overrides.usage !== undefined ? overrides.usage : { promptTokens: 1, candidatesTokens: 2 }
    };
  };
}

function defaultComposeCalls(extra = {}) {
  return buildMultiNativeComposeToolCalls(extra);
}

function makeCounters() {
  return { apply: 0, rollback: 0, gemini: 0, stitch: 0, browser: 0, dispatch: 0 };
}

function spyDispatcher(counters) {
  return {
    async dispatch() {
      counters.dispatch += 1;
      return { result: { spoofed: true } };
    }
  };
}

function applyRollbackHooks(counters) {
  return {
    applyDiff: async () => {
      counters.apply += 1;
      return { applied: true };
    },
    rollbackDiff: async () => {
      counters.rollback += 1;
      return { rolledBack: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  };
}

// ---------------------------------------------------------------------------
// O1 — PRODUCTION_READY is NO
// ---------------------------------------------------------------------------
test('O1: PRODUCTION_READY is NO (plan + runner + compose order frozen)', () => {
  assert.equal(PRODUCTION_READY, 'NO');
  const plan = basePlan({ toolCalls: defaultComposeCalls() });
  assert.equal(plan.PRODUCTION_READY, 'NO');
  assert.ok(Object.isFrozen(MULTI_NATIVE_COMPOSE_ORDER));
  assert.deepEqual([...MULTI_NATIVE_COMPOSE_ORDER], [
    'eos-gemini',
    'eos-stitch',
    'eos-browser-qa'
  ]);
  const builtins = listBuiltinComputeTools().map((t) => t.name).sort();
  const expected = [
    ...listGeminiTools().map((t) => t.name),
    ...listStitchTools().map((t) => t.name),
    ...listBrowserQaTools().map((t) => t.name)
  ].sort();
  assert.deepEqual(builtins, expected);
});

// ---------------------------------------------------------------------------
// O2 — Unknown native-looking tool name is NOT swallowed
// ---------------------------------------------------------------------------
test('O2: unknown native-looking tool name (not a builtin) → MCP_TOOL_DISPATCHER_REQUIRED; natives do not swallow', async () => {
  const lookalikes = [
    { serverName: 'looks-native', toolName: 'gemini_query_v2', arguments: { prompt: 'x' } },
    { serverName: 'eos-local', toolName: 'stitch_generate_screen_extra', arguments: {} },
    { serverName: '', toolName: 'browser_qa_audit', arguments: { url: 'https://example.test/' } }
  ];
  for (const call of lookalikes) {
    assert.equal(isGeminiToolName(call.toolName), false);
    assert.equal(isStitchToolName(call.toolName), false);
    assert.equal(isBrowserQaToolName(call.toolName), false);
    assert.equal(isNativeGeminiToolCall(call), false);
    assert.equal(isNativeStitchToolCall(call), false);
    assert.equal(isNativeBrowserQaToolCall(call), false);
    assert.equal(isNativeBuiltinToolCall(call), false);
  }

  const counters = makeCounters();
  const plan = basePlan({ toolCalls: lookalikes });
  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'should-not-run', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        counters.stitch += 1;
        return { screenId: 'nope' };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        counters.browser += 1;
        return { ok: true, url: 'x' };
      }
    }),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 0);
  assert.equal(counters.gemini, 0);
  assert.equal(counters.stitch, 0);
  assert.equal(counters.browser, 0);
  assert.equal(result.toolOutputs.length, 0);
  assert.notEqual(result.status, 'COMPLETED');
});

// ---------------------------------------------------------------------------
// O3 — Gemini infra throw mid-compose
// ---------------------------------------------------------------------------
test('O3: gemini infra throw mid-compose → GEMINI_TOOL_FAILED; stitch/browser never run; applyDiff 0; rollbackDiff called', async () => {
  const counters = makeCounters();
  const err = new Error('gemini boom');
  err.code = 'GEMINI_UPSTREAM';
  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        throw err;
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        counters.stitch += 1;
        return { screenId: 'nope' };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        counters.browser += 1;
        return { ok: true, url: 'x' };
      }
    }),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'GEMINI_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(counters.gemini, 1);
  assert.equal(counters.stitch, 0);
  assert.equal(counters.browser, 0);
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 1);
  assert.equal(result.toolOutputs.length, 1);
  assert.equal(result.toolOutputs[0].ok, false);
  assert.equal(result.toolOutputs[0].toolName, 'gemini_query');
  assert.equal(result.custodyReceipt, undefined);
  assert.notEqual(result.status, 'COMPLETED');
});

// ---------------------------------------------------------------------------
// O4 — Stitch infra throw after gemini success
// ---------------------------------------------------------------------------
test('O4: stitch infra throw after gemini success → STITCH_TOOL_FAILED; browser never run; applyDiff 0; toolOutputs length 2 last ok:false', async () => {
  const counters = makeCounters();
  const err = new Error('stitch boom');
  err.code = 'STITCH_UPSTREAM';
  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'pre-stitch', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        counters.stitch += 1;
        throw err;
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        counters.browser += 1;
        return { ok: true, url: 'x' };
      }
    }),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'STITCH_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(counters.gemini, 1);
  assert.equal(counters.stitch, 1);
  assert.equal(counters.browser, 0);
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 1);
  assert.equal(result.toolOutputs.length, 2);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[0].toolName, 'gemini_query');
  assert.equal(result.toolOutputs[1].ok, false);
  assert.equal(result.toolOutputs[1].toolName, 'stitch_generate_screen');
  assert.equal(
    result.toolOutputs.some((o) => o.toolName === 'browser_qa_run'),
    false
  );
  assert.notEqual(result.status, 'COMPLETED');
});

// ---------------------------------------------------------------------------
// O5 — Browser QA infra throw after gemini+stitch
// ---------------------------------------------------------------------------
test('O5: browser QA infra throw after gemini+stitch → BROWSER_QA_TOOL_FAILED; applyDiff 0', async () => {
  const counters = makeCounters();
  const err = new Error('browser infra boom');
  err.code = 'BROWSER_QA_INFRA';
  const plan = basePlan({ toolCalls: defaultComposeCalls() });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'pre-qa', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen(args) {
        counters.stitch += 1;
        return {
          screenId: 'scr-o5',
          projectId: args.projectId,
          prompt: args.prompt,
          deviceType: args.deviceType
        };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        counters.browser += 1;
        throw err;
      }
    }),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'BROWSER_QA_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(counters.gemini, 1);
  assert.equal(counters.stitch, 1);
  assert.equal(counters.browser, 1);
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 1);
  assert.equal(result.toolOutputs.length, 3);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[1].ok, true);
  assert.equal(result.toolOutputs[2].ok, false);
  assert.equal(result.toolOutputs[2].toolName, 'browser_qa_run');
  assert.notEqual(result.status, 'COMPLETED');
});

// ---------------------------------------------------------------------------
// O6 — Soft Browser QA does NOT fail-closed
// ---------------------------------------------------------------------------
test('O6: soft Browser QA (CWV/a11y fail, report ok:false) mid/end-chain does NOT fail-closed — applyDiff runs; toolOutputs QA ok:true', async () => {
  const counters = makeCounters();
  const plan = basePlan({
    toolCalls: defaultComposeCalls({
      browserQa: { url: 'https://example.test/slow' }
    })
  });

  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'soft-qa', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen(args) {
        counters.stitch += 1;
        return {
          screenId: 'scr-o6',
          projectId: args.projectId,
          prompt: args.prompt,
          deviceType: args.deviceType
        };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate(url) {
        counters.browser += 1;
        return { ok: true, url };
      },
      async collectCwv() {
        return { lcpMs: 9000, cls: 0.4 };
      },
      async runA11yScan() {
        return { violations: [{ id: 'color-contrast', impact: 'serious', description: 'contrast', nodes: [] }] };
      }
    }),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(counters.apply, 1);
  assert.equal(counters.rollback, 0);
  assert.equal(result.toolOutputs.length, 3);
  assert.equal(result.toolOutputs[0].ok, true);
  assert.equal(result.toolOutputs[1].ok, true);
  assert.equal(result.toolOutputs[2].ok, true);
  assert.equal(result.toolOutputs[2].toolName, 'browser_qa_run');
  assert.equal(result.toolOutputs[2].result.ok, false);
  assert.equal(result.toolOutputs[2].custody.status, 'FAILED');
  assert.equal(result.toolOutputs[2].result.cwv.lcpPass, false);
  assert.equal(result.toolOutputs[2].result.a11y.pass, false);
});

// ---------------------------------------------------------------------------
// O7 — Oversize / invalid stitch args fail-closed
// ---------------------------------------------------------------------------
test('O7: oversize / invalid stitch args → STITCH_TOOL_FAILED (bridge codes); applyDiff 0', async () => {
  const cases = [
    {
      label: 'missing projectId',
      stitch: { prompt: 'hero', deviceType: 'DESKTOP' },
      expectedCode: 'PROJECT_ID_REQUIRED'
    },
    {
      label: 'bad deviceType',
      stitch: { projectId: 'p1', prompt: 'hero', deviceType: 'TABLET' },
      expectedCode: 'INVALID_DEVICE_TYPE'
    },
    {
      label: 'oversize prompt',
      stitch: {
        projectId: 'p1',
        prompt: 'X'.repeat(STITCH_TOOL_MAX_BYTES + 1),
        deviceType: 'MOBILE'
      },
      expectedCode: 'PAYLOAD_OVERSIZE'
    }
  ];

  for (const c of cases) {
    const counters = makeCounters();
    const plan = basePlan({
      toolCalls: defaultComposeCalls({ stitch: c.stitch })
    });
    const result = await executeComputeRun({
      plan,
      geminiApiKey: 'test-key',
      geminiQueryImpl: makeMockGeminiQueryImpl({
        impl: async () => {
          counters.gemini += 1;
          return { text: 'ok', data: null, model: 'mock', usage: null };
        }
      }),
      stitchClientImpl: makeMockStitchClient({
        async generate_screen() {
          counters.stitch += 1;
          return { screenId: 'should-not' };
        }
      }),
      browserQaClientImpl: makeMockBrowserQaClient({
        async navigate() {
          counters.browser += 1;
          return { ok: true, url: 'x' };
        }
      }),
      ...applyRollbackHooks(counters)
    });

    assert.equal(result.status, 'STITCH_TOOL_FAILED', c.label);
    assert.equal(result.ok, false, c.label);
    assert.equal(result.errorCode, c.expectedCode, c.label);
    assert.equal(counters.apply, 0, c.label);
    assert.equal(counters.rollback, 1, c.label);
    assert.equal(counters.browser, 0, c.label);
    assert.equal(counters.stitch, 0, `${c.label}: client never reached`);
    assert.equal(result.toolOutputs.length, 2, c.label);
    assert.equal(result.toolOutputs[1].ok, false, c.label);
    assert.equal(result.toolOutputs[1].errorCode, c.expectedCode, c.label);
    assert.notEqual(result.status, 'COMPLETED', c.label);
  }
});

// ---------------------------------------------------------------------------
// O8 — Oversize / missing gemini prompt fail-closed
// ---------------------------------------------------------------------------
test('O8: oversize / missing gemini prompt → GEMINI_TOOL_FAILED; applyDiff 0', async () => {
  const cases = [
    {
      label: 'missing prompt',
      gemini: { systemInstruction: 'x' },
      expectedCode: 'PROMPT_REQUIRED'
    },
    {
      label: 'empty prompt',
      gemini: { prompt: '   ' },
      expectedCode: 'PROMPT_REQUIRED'
    },
    {
      label: 'oversize prompt',
      gemini: { prompt: 'G'.repeat(GEMINI_TOOL_MAX_BYTES + 1) },
      expectedCode: 'PAYLOAD_OVERSIZE'
    }
  ];

  for (const c of cases) {
    const counters = makeCounters();
    const plan = basePlan({
      toolCalls: defaultComposeCalls({ gemini: c.gemini })
    });
    const result = await executeComputeRun({
      plan,
      geminiApiKey: 'test-key',
      geminiQueryImpl: makeMockGeminiQueryImpl({
        impl: async () => {
          counters.gemini += 1;
          return { text: 'should-not', data: null, model: 'mock', usage: null };
        }
      }),
      stitchClientImpl: makeMockStitchClient({
        async generate_screen() {
          counters.stitch += 1;
          return { screenId: 'nope' };
        }
      }),
      browserQaClientImpl: makeMockBrowserQaClient({
        async navigate() {
          counters.browser += 1;
          return { ok: true, url: 'x' };
        }
      }),
      ...applyRollbackHooks(counters)
    });

    assert.equal(result.status, 'GEMINI_TOOL_FAILED', c.label);
    assert.equal(result.ok, false, c.label);
    assert.equal(result.errorCode, c.expectedCode, c.label);
    assert.equal(counters.apply, 0, c.label);
    assert.equal(counters.rollback, 1, c.label);
    assert.equal(counters.gemini, 0, `${c.label}: provider never reached`);
    assert.equal(counters.stitch, 0, c.label);
    assert.equal(counters.browser, 0, c.label);
    assert.equal(result.toolOutputs.length, 1, c.label);
    assert.equal(result.toolOutputs[0].ok, false, c.label);
    assert.equal(result.toolOutputs[0].errorCode, c.expectedCode, c.label);
    assert.notEqual(result.status, 'COMPLETED', c.label);
  }
});

// ---------------------------------------------------------------------------
// O9 — Mixed native + non-native without dispatcher
// ---------------------------------------------------------------------------
test('O9: mixed plan native + non-native without dispatcher → MCP_TOOL_DISPATCHER_REQUIRED before any apply (0 applyDiff); natives do not run first', async () => {
  const counters = makeCounters();
  const mixed = [
    ...defaultComposeCalls(),
    { serverName: 'github', toolName: 'create_issue', arguments: { title: 'x' } }
  ];
  assert.equal(isNativeBuiltinToolCall(mixed[0]), true);
  assert.equal(isNativeBuiltinToolCall(mixed[3]), false);

  const plan = basePlan({ toolCalls: mixed });
  const result = await executeComputeRun({
    plan,
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'should-not', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        counters.stitch += 1;
        return { screenId: 'nope' };
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient({
      async navigate() {
        counters.browser += 1;
        return { ok: true, url: 'x' };
      }
    }),
    ...applyRollbackHooks(counters)
  });

  // Honest existing worker behavior: needsMcpDispatcher is checked BEFORE the
  // sequential loop, so missing dispatcher aborts with empty toolOutputs and
  // zero native invocations — fail before apply when remaining non-natives
  // need a dispatcher.
  assert.equal(result.status, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'MCP_TOOL_DISPATCHER_REQUIRED');
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 0);
  assert.equal(counters.gemini, 0);
  assert.equal(counters.stitch, 0);
  assert.equal(counters.browser, 0);
  assert.equal(result.toolOutputs.length, 0);
  assert.notEqual(result.status, 'COMPLETED');
});

// ---------------------------------------------------------------------------
// O10 — compose builder / order integrity under adversarial opts
// ---------------------------------------------------------------------------
test('O10: buildMultiNativeComposeToolCalls / MULTI_NATIVE_COMPOSE_ORDER integrity under adversarial opts', () => {
  assert.ok(Object.isFrozen(MULTI_NATIVE_COMPOSE_ORDER));
  const snapshot = [...MULTI_NATIVE_COMPOSE_ORDER];
  assert.throws(() => {
    MULTI_NATIVE_COMPOSE_ORDER.push('eos-evil');
  });
  assert.throws(() => {
    MULTI_NATIVE_COMPOSE_ORDER[0] = 'eos-evil';
  });
  assert.deepEqual([...MULTI_NATIVE_COMPOSE_ORDER], snapshot);

  const empty = buildMultiNativeComposeToolCalls({});
  assert.equal(empty.length, 3);
  assert.deepEqual(
    empty.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );
  assert.deepEqual(
    empty.map((c) => c.toolName),
    ['gemini_query', 'stitch_generate_screen', 'browser_qa_run']
  );
  assert.ok(empty[0].arguments.prompt);
  assert.ok(empty[1].arguments.projectId);
  assert.ok(empty[2].arguments.url);

  const emptyOverrides = buildMultiNativeComposeToolCalls({
    gemini: {},
    stitch: {},
    browserQa: {}
  });
  assert.equal(emptyOverrides.length, 3);
  assert.deepEqual(
    emptyOverrides.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );
  assert.equal(emptyOverrides[0].toolName, 'gemini_query');
  assert.equal(emptyOverrides[1].toolName, 'stitch_generate_screen');
  assert.equal(emptyOverrides[2].toolName, 'browser_qa_run');

  const injected = buildMultiNativeComposeToolCalls({
    extra: [{ serverName: 'github', toolName: 'create_issue' }],
    order: ['github', 'eos-evil'],
    toolCalls: [{ serverName: 'github', toolName: 'echo' }],
    serverName: 'github',
    toolName: 'echo',
    mcp: { serverName: 'engram', toolName: 'search' }
  });
  assert.equal(injected.length, 3);
  assert.deepEqual(
    injected.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );
  for (const call of injected) {
    assert.equal(isNativeBuiltinToolCall(call), true);
    assert.notEqual(call.serverName, 'github');
    assert.notEqual(call.toolName, 'echo');
    assert.notEqual(call.toolName, 'create_issue');
  }

  const fromPlan = normalizeToolCalls(
    basePlan({ toolCalls: injected }),
    undefined
  );
  assert.deepEqual(
    fromPlan.map((c) => c.serverName),
    [...MULTI_NATIVE_COMPOSE_ORDER]
  );
});

// ---------------------------------------------------------------------------
// O11 — hashToolOutputs / custody seals only on success
// ---------------------------------------------------------------------------
test('O11: hashToolOutputs / custody seals only on success path; failed mid-chain does not claim COMPLETED', async () => {
  const happyCounters = makeCounters();
  const happy = await executeComputeRun({
    plan: basePlan({ toolCalls: defaultComposeCalls() }),
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    ...applyRollbackHooks(happyCounters)
  });
  assert.equal(happy.status, 'COMPLETED');
  assert.equal(happy.ok, true);
  assert.ok(happy.custodyReceipt);
  assert.equal(happy.custodyReceipt.payload.status, 'COMPLETED');
  const { hashes } = hashToolOutputs(happy.toolOutputs);
  assert.equal(hashes.length, 3);
  for (const h of hashes) {
    assert.match(h, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(happy.custodyReceipt.payload.tool_execution_hashes, hashes);
  assert.equal(happyCounters.apply, 1);
  assert.equal(happyCounters.rollback, 0);

  const failCounters = makeCounters();
  const failErr = new Error('stitch mid-chain');
  failErr.code = 'STITCH_UPSTREAM';
  const failed = await executeComputeRun({
    plan: basePlan({ toolCalls: defaultComposeCalls() }),
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient({
      async generate_screen() {
        throw failErr;
      }
    }),
    browserQaClientImpl: makeMockBrowserQaClient(),
    ...applyRollbackHooks(failCounters)
  });
  assert.equal(failed.status, 'STITCH_TOOL_FAILED');
  assert.equal(failed.ok, false);
  assert.equal(failed.custodyReceipt, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(failed, 'custodyReceipt'), false);
  assert.notEqual(failed.status, 'COMPLETED');
  assert.equal(failCounters.apply, 0);
  const partial = hashToolOutputs(failed.toolOutputs);
  assert.equal(partial.hashes.length, failed.toolOutputs.length);
  assert.ok(partial.hashes.length >= 2);
  // Hashing partial outputs is allowed; sealing COMPLETED is not.
  // Fail-closed return omits custodyReceipt entirely (no COMPLETED claim).
});

// ---------------------------------------------------------------------------
// O12 — Dispatcher must NOT be invoked for pure-native compose
// ---------------------------------------------------------------------------
test('O12: dispatcher NOT invoked for pure-native compose (dispatch call count 0)', async () => {
  const counters = makeCounters();
  const plan = basePlan({ toolCalls: defaultComposeCalls() });
  const result = await executeComputeRun({
    plan,
    toolDispatcher: spyDispatcher(counters),
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl(),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    ...applyRollbackHooks(counters)
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.ok, true);
  assert.equal(counters.dispatch, 0);
  assert.equal(counters.apply, 1);
  assert.equal(result.toolOutputs.length, 3);
  for (const out of result.toolOutputs) {
    assert.equal(out.ok, true);
    assert.equal(isNativeBuiltinToolCall(out), true);
  }
});

// ---------------------------------------------------------------------------
// O13 — Malicious serverName spoof (routing honesty)
// ---------------------------------------------------------------------------
test('O13: malicious serverName spoof (eos-gemini + echo) — classified native; GEMINI_TOOL_FAILED UNKNOWN_GEMINI_TOOL; dispatcher not invoked', async () => {
  const spoof = { serverName: 'eos-gemini', toolName: 'echo', arguments: { prompt: 'hi' } };
  assert.equal(isGeminiToolName('echo'), false);
  assert.equal(isNativeGeminiToolCall(spoof), true);
  assert.equal(isNativeBuiltinToolCall(spoof), true);
  assert.equal(isNativeStitchToolCall(spoof), false);
  assert.equal(isNativeBrowserQaToolCall(spoof), false);

  const stitchSpoof = { serverName: 'eos-stitch', toolName: 'echo', arguments: {} };
  assert.equal(isStitchToolName('echo'), false);
  assert.equal(isNativeStitchToolCall(stitchSpoof), true);

  const counters = makeCounters();
  const plan = basePlan({ toolCalls: [spoof] });
  const result = await executeComputeRun({
    plan,
    toolDispatcher: spyDispatcher(counters),
    geminiApiKey: 'test-key',
    geminiQueryImpl: makeMockGeminiQueryImpl({
      impl: async () => {
        counters.gemini += 1;
        return { text: 'should-not', data: null, model: 'mock', usage: null };
      }
    }),
    stitchClientImpl: makeMockStitchClient(),
    browserQaClientImpl: makeMockBrowserQaClient(),
    ...applyRollbackHooks(counters)
  });

  // Routing honesty: serverName eos-gemini classifies as native Gemini even
  // when toolName is not a builtin. Bridge fail-closes UNKNOWN_GEMINI_TOOL;
  // worker maps to GEMINI_TOOL_FAILED. Dispatcher is not consulted.
  assert.equal(result.status, 'GEMINI_TOOL_FAILED');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'UNKNOWN_GEMINI_TOOL');
  assert.equal(counters.dispatch, 0);
  assert.equal(counters.gemini, 0);
  assert.equal(counters.apply, 0);
  assert.equal(counters.rollback, 1);
  assert.equal(result.toolOutputs.length, 1);
  assert.equal(result.toolOutputs[0].ok, false);
  assert.equal(result.toolOutputs[0].toolName, 'echo');
  assert.equal(result.toolOutputs[0].serverName, 'eos-gemini');
  assert.equal(result.toolOutputs[0].errorCode, 'UNKNOWN_GEMINI_TOOL');
  assert.notEqual(result.status, 'COMPLETED');
});

const liveEnabled = process.env.RUN_LIVE_NATIVE_ADVERSARIAL_TESTS === 'true';
test(
  'O14: (optional) live native-tools adversarial',
  { skip: liveEnabled ? false : 'set RUN_LIVE_NATIVE_ADVERSARIAL_TESTS=true to run' },
  async () => {
    assert.ok(typeof buildMultiNativeComposeToolCalls === 'function');
  }
);
