/**
 * @file eos-stitch-tool-bridge.test.js
 * @description SPEC-0015 Mission J — Google Stitch UI Generator Bridge.
 * Hermetic by default; live network only when RUN_LIVE_STITCH_TESTS=true.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listStitchTools,
  isStitchToolName,
  hashStitchToolInput,
  stitchListProjects,
  stitchGenerateScreen,
  stitchGetScreen,
  stitchExportDesignMd,
  executeStitchTool,
  StitchToolBridgeError,
  STITCH_TOOL_NAMES,
  STITCH_DEVICE_TYPES,
  STITCH_TOOL_MAX_BYTES,
  STITCH_TOOL_TIMEOUT_MS,
  PRODUCTION_READY
} from '../../src/core/mcp/stitch-tool-bridge.js';

function makeMockClient(overrides = {}) {
  const calls = [];
  const client = {
    calls,
    list_projects: async () => {
      calls.push({ method: 'list_projects', args: {} });
      return { projects: [{ id: 'p1', name: 'Demo' }] };
    },
    generate_screen: async (args) => {
      calls.push({ method: 'generate_screen', args });
      return {
        screenId: 'scr-1',
        previewUrl: 'https://example.test/preview/scr-1',
        deviceType: args.deviceType
      };
    },
    get_screen: async (args) => {
      calls.push({ method: 'get_screen', args });
      return {
        screenId: args.screenId,
        htmlUrl: 'https://example.test/html/scr-1',
        screenshotUrl: 'https://example.test/shot/scr-1'
      };
    },
    export_design_md: async (args) => {
      calls.push({ method: 'export_design_md', args });
      return { designMd: '# Design\n\nHello Stitch\n' };
    },
    ...overrides
  };
  return client;
}

function assertCustody(out, toolName) {
  assert.equal(out.ok, true);
  assert.equal(out.toolName, toolName);
  assert.ok(out.custody);
  assert.equal(out.custody.tool, toolName);
  assert.equal(out.custody.status, 'VERIFIED');
  assert.equal(out.custody.PRODUCTION_READY, 'NO');
  assert.equal(typeof out.custody.duration_ms, 'number');
  assert.ok(out.custody.duration_ms >= 0);
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
}

test('Mission J: listStitchTools discovers 4 tools', () => {
  const tools = listStitchTools();
  assert.equal(tools.length, 4);
  assert.deepEqual(
    tools.map((t) => t.name),
    [...STITCH_TOOL_NAMES]
  );
  for (const t of tools) {
    assert.equal(typeof t.description, 'string');
    assert.ok(t.inputSchema && typeof t.inputSchema === 'object');
  }
  assert.equal(PRODUCTION_READY, 'NO');
  assert.equal(STITCH_TOOL_TIMEOUT_MS, 30000);
  assert.equal(STITCH_TOOL_MAX_BYTES, 2 * 1024 * 1024);
  assert.deepEqual([...STITCH_DEVICE_TYPES], ['DESKTOP', 'MOBILE']);
});

test('Mission J: isStitchToolName true/false', () => {
  assert.equal(isStitchToolName('stitch_list_projects'), true);
  assert.equal(isStitchToolName('stitch_generate_screen'), true);
  assert.equal(isStitchToolName('stitch_get_screen'), true);
  assert.equal(isStitchToolName('stitch_export_design_md'), true);
  assert.equal(isStitchToolName('gemini_query'), false);
  assert.equal(isStitchToolName(''), false);
  assert.equal(isStitchToolName(null), false);
});

test('Mission J: stitchListProjects mock returns projects + custody VERIFIED', async () => {
  const client = makeMockClient();
  const out = await stitchListProjects({ clientImpl: client });
  assertCustody(out, 'stitch_list_projects');
  assert.ok(Array.isArray(out.result.projects));
  assert.equal(out.result.projects[0].id, 'p1');
  assert.equal(client.calls[0].method, 'list_projects');
});

test('Mission J: stitchGenerateScreen DESKTOP success; client receives args', async () => {
  const client = makeMockClient();
  const out = await stitchGenerateScreen({
    projectId: 'proj-desktop',
    prompt: 'A dashboard with KPI cards',
    deviceType: 'DESKTOP',
    clientImpl: client
  });
  assertCustody(out, 'stitch_generate_screen');
  assert.equal(out.result.screenId, 'scr-1');
  assert.equal(out.result.deviceType, 'DESKTOP');
  assert.deepEqual(client.calls[0].args, {
    projectId: 'proj-desktop',
    prompt: 'A dashboard with KPI cards',
    deviceType: 'DESKTOP'
  });
});

test('Mission J: stitchGenerateScreen MOBILE default', async () => {
  const client = makeMockClient();
  const out = await stitchGenerateScreen({
    projectId: 'proj-mobile',
    prompt: 'Login screen',
    clientImpl: client
  });
  assertCustody(out, 'stitch_generate_screen');
  assert.equal(client.calls[0].args.deviceType, 'MOBILE');
  assert.equal(out.result.deviceType, 'MOBILE');
});

test('Mission J: INVALID_DEVICE_TYPE for TABLET', async () => {
  const client = makeMockClient();
  await assert.rejects(
    () =>
      stitchGenerateScreen({
        projectId: 'p1',
        prompt: 'x',
        deviceType: 'TABLET',
        clientImpl: client
      }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'INVALID_DEVICE_TYPE');
      return true;
    }
  );
  assert.equal(client.calls.length, 0);
});

test('Mission J: PROJECT_ID_REQUIRED / PROMPT_REQUIRED', async () => {
  const client = makeMockClient();
  await assert.rejects(
    () =>
      stitchGenerateScreen({
        prompt: 'ok',
        clientImpl: client
      }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'PROJECT_ID_REQUIRED');
      return true;
    }
  );
  await assert.rejects(
    () =>
      stitchGenerateScreen({
        projectId: 'p1',
        prompt: '   ',
        clientImpl: client
      }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'PROMPT_REQUIRED');
      return true;
    }
  );
  await assert.rejects(
    () =>
      stitchExportDesignMd({
        clientImpl: client
      }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'PROJECT_ID_REQUIRED');
      return true;
    }
  );
});

test('Mission J: PAYLOAD_OVERSIZE when prompt > 2MiB', async () => {
  const client = makeMockClient();
  const big = 'x'.repeat(STITCH_TOOL_MAX_BYTES + 1);
  await assert.rejects(
    () =>
      stitchGenerateScreen({
        projectId: 'p1',
        prompt: big,
        clientImpl: client
      }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'PAYLOAD_OVERSIZE');
      assert.ok(err.details && err.details.bytes > STITCH_TOOL_MAX_BYTES);
      return true;
    }
  );
  assert.equal(client.calls.length, 0);
});

test('Mission J: stitchGetScreen success', async () => {
  const client = makeMockClient();
  const out = await stitchGetScreen({
    screenId: 'scr-99',
    clientImpl: client
  });
  assertCustody(out, 'stitch_get_screen');
  assert.equal(out.result.screenId, 'scr-99');
  assert.ok(out.result.htmlUrl);
  assert.deepEqual(client.calls[0].args, { screenId: 'scr-99' });
});

test('Mission J: SCREEN_ID_REQUIRED', async () => {
  const client = makeMockClient();
  await assert.rejects(
    () => stitchGetScreen({ clientImpl: client }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'SCREEN_ID_REQUIRED');
      return true;
    }
  );
  await assert.rejects(
    () => stitchGetScreen({ screenId: '', clientImpl: client }),
    (err) => {
      assert.equal(err.code, 'SCREEN_ID_REQUIRED');
      return true;
    }
  );
});

test('Mission J: stitchExportDesignMd returns designMd', async () => {
  const client = makeMockClient();
  const out = await stitchExportDesignMd({
    projectId: 'proj-md',
    clientImpl: client
  });
  assertCustody(out, 'stitch_export_design_md');
  assert.equal(typeof out.result.designMd, 'string');
  assert.match(out.result.designMd, /Design/);
  assert.deepEqual(client.calls[0].args, { projectId: 'proj-md' });
});

test('Mission J: TIMEOUT when client hangs past timeoutMs', async () => {
  const client = makeMockClient({
    list_projects: () => new Promise(() => {})
  });
  await assert.rejects(
    () => stitchListProjects({ clientImpl: client, timeoutMs: 50 }),
    (err) => {
      assert.ok(err instanceof StitchToolBridgeError);
      assert.equal(err.code, 'TIMEOUT');
      return true;
    }
  );
});

test('Mission J: input_hash stable sha256 hex length 64; changes when prompt changes', async () => {
  const h1 = hashStitchToolInput('stitch_generate_screen', {
    projectId: 'p1',
    prompt: 'alpha',
    deviceType: 'MOBILE',
    apiKey: 'should-be-stripped'
  });
  const h1b = hashStitchToolInput('stitch_generate_screen', {
    projectId: 'p1',
    prompt: 'alpha',
    deviceType: 'MOBILE',
    api_key: 'also-stripped'
  });
  const h2 = hashStitchToolInput('stitch_generate_screen', {
    projectId: 'p1',
    prompt: 'beta',
    deviceType: 'MOBILE'
  });
  assert.match(h1, /^[a-f0-9]{64}$/);
  assert.equal(h1, h1b);
  assert.notEqual(h1, h2);

  const client = makeMockClient();
  const out = await stitchGenerateScreen({
    projectId: 'p1',
    prompt: 'alpha',
    deviceType: 'MOBILE',
    clientImpl: client
  });
  assert.equal(
    out.custody.input_hash,
    hashStitchToolInput('stitch_generate_screen', {
      projectId: 'p1',
      prompt: 'alpha',
      deviceType: 'MOBILE'
    })
  );
});

test('Mission J: executeStitchTool routes all four names', async () => {
  const client = makeMockClient();
  const list = await executeStitchTool({
    toolName: 'stitch_list_projects',
    arguments: {},
    clientImpl: client
  });
  assertCustody(list, 'stitch_list_projects');

  const gen = await executeStitchTool({
    toolName: 'stitch_generate_screen',
    arguments: { projectId: 'p1', prompt: 'hello', deviceType: 'DESKTOP' },
    clientImpl: client
  });
  assertCustody(gen, 'stitch_generate_screen');
  assert.equal(gen.result.deviceType, 'DESKTOP');

  const get = await executeStitchTool({
    toolName: 'stitch_get_screen',
    arguments: { screenId: 's1' },
    clientImpl: client
  });
  assertCustody(get, 'stitch_get_screen');

  const exp = await executeStitchTool({
    toolName: 'stitch_export_design_md',
    arguments: { projectId: 'p1' },
    clientImpl: client
  });
  assertCustody(exp, 'stitch_export_design_md');
  assert.ok(exp.result.designMd);

  await assert.rejects(
    () =>
      executeStitchTool({
        toolName: 'not_a_tool',
        arguments: {},
        clientImpl: client
      }),
    (err) => {
      assert.equal(err.code, 'UNKNOWN_STITCH_TOOL');
      return true;
    }
  );
});

test('Mission J: CLIENT_IMPL_REQUIRED when no clientImpl', async () => {
  const prev = process.env.STITCH_ALLOW_LIVE;
  delete process.env.STITCH_ALLOW_LIVE;
  try {
    await assert.rejects(
      () => stitchListProjects({}),
      (err) => {
        assert.ok(err instanceof StitchToolBridgeError);
        assert.equal(err.code, 'CLIENT_IMPL_REQUIRED');
        return true;
      }
    );
    await assert.rejects(
      () =>
        executeStitchTool({
          toolName: 'stitch_list_projects',
          arguments: {}
        }),
      (err) => {
        assert.equal(err.code, 'CLIENT_IMPL_REQUIRED');
        return true;
      }
    );
  } finally {
    if (prev === undefined) delete process.env.STITCH_ALLOW_LIVE;
    else process.env.STITCH_ALLOW_LIVE = prev;
  }
});

test(
  'Mission J: optional live SKIP when RUN_LIVE_STITCH_TESTS !== true',
  { skip: process.env.RUN_LIVE_STITCH_TESTS !== 'true' },
  async () => {
    // Live path requires STITCH_ALLOW_LIVE + fetchImpl / STITCH_API_BASE.
    // This test only runs when explicitly opted in.
    assert.equal(process.env.RUN_LIVE_STITCH_TESTS, 'true');
  }
);
