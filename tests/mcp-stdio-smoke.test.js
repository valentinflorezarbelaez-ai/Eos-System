import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';
import { resolveControlPlaneRoot } from '../src/core/runtime/control-plane-root.js';

test('MCP-01: tools/list returns exactly 80 canonical tools', () => {
  assert.equal(CANONICAL_TOOLS.length, 80);
  const names = CANONICAL_TOOLS.map(t => t.name);
  assert.ok(names.includes('eos.context.compile'));
  assert.ok(names.includes('eos.ledger.get_features'));
  assert.ok(names.includes('eos.authority.check'));
  assert.ok(names.includes('eos.mission.recover'));
  assert.ok(names.includes('eos.blueprint.run'));
  assert.ok(names.includes('eos.scaffolder.generate'));
  assert.ok(names.includes('eos.scaffolder.execute'));
  assert.ok(names.includes('eos.orchestrator.rollback'));
  assert.ok(names.includes('eos.core.triamazikamno.validate'));
  assert.ok(names.includes('eos.audit.tescohan.scan'));
  assert.ok(names.includes('eos.skill.route'));
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

test('MCP-07: control-plane root is the repo, not a random process.cwd()', async () => {
  const root = resolveControlPlaneRoot();
  assert.equal(fs.existsSync(path.join(root, 'src', 'mcp-server.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'bin', 'eos.js')), true);
  const server = new EosMcpServer();
  const res = await server.handleToolCall('eos.mission.status', {});
  assert.equal(res.status, 'SUCCESS');
  assert.equal(path.normalize(res.mission_status.control_plane_root), path.normalize(root));
  assert.equal(res.mission_status.homedir_leak, false);
});

test('MCP-08: no canonical tool returns SIMULATION_ONLY', async () => {
  const server = new EosMcpServer();
  const env = {
    EOS_MODE: 'read-only',
    EOS_AUTONOMY_LEVEL: 'LEVEL_0',
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
  };
  for (const tool of CANONICAL_TOOLS) {
    const res = await server.handleToolCall(tool.name, {}, env);
    assert.notEqual(
      res.status,
      'SIMULATION_ONLY',
      `${tool.name} must not fall through to simulation`
    );
  }
});
