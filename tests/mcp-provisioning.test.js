import test from 'node:test';
import assert from 'node:assert/strict';
import { McpProvisioningEngine } from '../scripts/engine/mcp-provisioning-engine.js';

test('MCP Provisioning: Catalog loads all industrial servers from .cursor/mcp.json', () => {
  const engine = new McpProvisioningEngine();
  const catalog = engine.getCatalog().mcpServers || {};
  const catalogNames = Object.keys(catalog);

  assert.ok(catalogNames.length > 0, 'Official MCP catalog must not be empty');
  for (const name of catalogNames) {
    assert.ok(catalog[name], `${name} must be in catalog`);
    assert.ok(catalog[name].command, `${name} must declare a command`);
  }
});

test('MCP Provisioning: Dynamically provisions requested MCPs into Mission Control safely', () => {
  const engine = new McpProvisioningEngine();
  const requested = Object.keys(engine.getCatalog().mcpServers || {});

  const result = engine.provisionMcps(requested);

  assert.equal(result.provisionedCount, requested.length);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.status, 'PROVISIONING_PIPELINE_EXECUTED_SAFELY');

  const verification = engine.verifyActiveMcps();
  assert.ok(verification.activeCount >= requested.length);
  const names = verification.mcps.map(m => m.name.toLowerCase());
  for (const name of requested) {
    assert.ok(names.includes(name), `${name} must be provisioned into Mission Control`);
  }
});

test('MCP Provisioning: Rejects unknown unverified servers under Default-Deny', () => {
  const engine = new McpProvisioningEngine();
  const result = engine.provisionMcps(['malicious_unknown_server']);

  assert.equal(result.provisionedCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.rejected[0].reason, 'MCP_NOT_FOUND_IN_OFFICIAL_CATALOG');
});
