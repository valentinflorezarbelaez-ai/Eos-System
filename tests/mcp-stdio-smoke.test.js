import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';

const SERVER_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/mcp-server.js');

/** Drives the real stdio loop with raw lines and returns the responses plus the server cwd. */
function runStdioSession(rawLines) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-stdio-'));

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_PATH], {
      cwd,
      env: { ...process.env, EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
        return;
      }
      resolve({
        cwd,
        responses: stdout.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
      });
    });

    child.stdin.end(rawLines.join('\n') + '\n');
  });
}

test('MCP-01: tools/list returns exactly 20 canonical tools', () => {
  assert.equal(CANONICAL_TOOLS.length, 20);
  const names = CANONICAL_TOOLS.map(t => t.name);
  assert.ok(names.includes('eos.context.compile'));
  assert.ok(names.includes('eos.ledger.get_features'));
  assert.ok(names.includes('eos.authority.check'));
  assert.ok(names.includes('eos.mission.recover'));
});

test('MCP-02: tools/call eos.authority.check executes AuthorityAdapter', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos.authority.check', {
    requiredLevel: 'LEVEL_1',
    grantedLevel: 'LEVEL_2'
  });

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.executed, true);
  assert.equal(res.auth.authorized, true);
});

test('MCP-03: tools/call eos.context.compile compiles context cleanly', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos.context.compile', {
    mission: { id: 'MIS-MCP-001', type: 'TEST', goal: 'MCP Context Test' },
    contract: { autonomyLevel: 'LEVEL_1', maxBudgetTokens: 2000 }
  });

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.executed, true);
  assert.ok(res.receipt.sha256);
});

test('MCP-04: Provider tools remain honestly NOT_CONFIGURED (no fake wiring)', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos.provider.route', { prompt: 'x' });

  assert.equal(res.status, 'NOT_CONFIGURED');
  assert.equal(res.executed, false);
  assert.equal(res.sideEffects, 'NONE');
});

test('MCP-05: underscore tool names normalize to dotted canonical names', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos_authority_check', {
    requiredLevel: 'LEVEL_0',
    grantedLevel: 'LEVEL_0'
  });
  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.tool, 'eos.authority.check');
});

test('MCP-06: workspace.discover is wired (MEASURED)', async () => {
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos.workspace.discover', {});
  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.executed, true);
  assert.ok(res.workspace.has_mcp_server);
});

test('MCP-07: stdio loop answers JSON-RPC and classifies malformed input', async () => {
  const { cwd, responses } = await runStdioSession([
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'eos_authority_check', arguments: { requiredLevel: 'LEVEL_0', grantedLevel: 'LEVEL_0' } }
    }),
    JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call' }),
    JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'nope' }),
    '{ not json'
  ]);

  // Responses are correlated by id: JSON-RPC does not guarantee ordering
  const byId = new Map(responses.map((res) => [res.id, res]));
  assert.equal(responses.length, 6);
  assert.equal(byId.get(1).result.serverInfo.name, 'eos-mission-os');
  assert.equal(byId.get(2).result.tools.length, CANONICAL_TOOLS.length);

  const toolResult = JSON.parse(byId.get(3).result.content[0].text);
  assert.equal(toolResult.tool, 'eos.authority.check');
  assert.equal(toolResult.status, 'SUCCESS');

  // A malformed request keeps its id and is not misreported as a parse error
  assert.equal(byId.get(4).error.code, -32602);
  assert.equal(byId.get(5).error.code, -32601);
  assert.equal(byId.get(null).error.code, -32700);

  // Tools that touch neither the ledger nor the runtime must not provision storage
  assert.deepEqual(fs.readdirSync(cwd), []);
});
