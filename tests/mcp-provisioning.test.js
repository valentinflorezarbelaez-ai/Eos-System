import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpProvisioningEngine } from '../scripts/engine/mcp-provisioning-engine.js';

// The catalog is the committed .cursor/mcp.json. Assertions are derived from it rather than
// from a hardcoded server list, so the suite reflects the repository a clean clone actually gets
// instead of one operator's local IDE configuration.
//
// Provisioning writes to a scratch roster so running the suite leaves tracked
// EOS-MISSION-CONTROL state untouched.
function scratchEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-'));
  return new McpProvisioningEngine({ activeToolsFile: path.join(dir, 'ACTIVE_TOOLS.json') });
}

test('MCP Provisioning: catalog loads the committed governed server set', () => {
  const engine = new McpProvisioningEngine();
  const catalog = engine.getCatalog().mcpServers || {};
  const names = Object.keys(catalog);

  assert.ok(names.length > 0, 'committed catalog must declare at least one MCP server');
  assert.ok(catalog['eos-local'], 'the EOS Mission OS server must always be in the catalog');
  assert.equal(catalog['eos-local'].command, 'node');
  assert.deepEqual(catalog['eos-local'].args, ['src/mcp-server.js']);

  for (const [name, spec] of Object.entries(catalog)) {
    assert.ok(spec.command, `catalog entry '${name}' must declare a command`);
    assert.ok(Array.isArray(spec.args), `catalog entry '${name}' must declare an args array`);
  }
});

test('MCP Provisioning: eos-local server is pinned to governed default-deny env', () => {
  const engine = new McpProvisioningEngine();
  const env = (engine.getCatalog().mcpServers || {})['eos-local'].env || {};

  assert.equal(env.EOS_ALLOW_EXTERNAL_SIDE_EFFECTS, 'false');
  assert.ok(['read-only', 'read-write'].includes(env.EOS_MODE));
  assert.ok(/^LEVEL_[0-4]$/.test(env.EOS_AUTONOMY_LEVEL));
});

test('MCP Provisioning: provisions every catalogued server and nothing else', () => {
  const engine = scratchEngine();
  const catalogued = Object.keys(engine.getCatalog().mcpServers || {});

  const result = engine.provisionMcps(catalogued);

  assert.equal(result.provisionedCount, catalogued.length);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.status, 'PROVISIONING_PIPELINE_EXECUTED_SAFELY');
  assert.equal(result.governanceBoundary, 'LEVEL_2_SUPERVISED_DEFAULT_DENY');

  const verification = engine.verifyActiveMcps();
  const active = verification.mcps.map((m) => m.name.toLowerCase());
  for (const name of catalogued) {
    assert.ok(active.includes(name), `provisioned server '${name}' must appear in the active roster`);
  }
});

test('MCP Provisioning: rejects servers absent from the catalog under default-deny', () => {
  const engine = scratchEngine();
  const result = engine.provisionMcps(['malicious_unknown_server']);

  assert.equal(result.provisionedCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.rejected[0].reason, 'MCP_NOT_FOUND_IN_OFFICIAL_CATALOG');
});

test('MCP Provisioning: a partially unknown request provisions only the catalogued subset', () => {
  const engine = scratchEngine();
  const result = engine.provisionMcps(['eos-local', 'definitely_not_a_real_server']);

  assert.equal(result.provisionedCount, 1);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.provisioned[0].name.toLowerCase(), 'eos-local');
});
