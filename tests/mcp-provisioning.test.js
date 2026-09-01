import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpProvisioningEngine } from '../scripts/engine/mcp-provisioning-engine.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activeToolsFile = path.join(rootDir, 'EOS-MISSION-CONTROL/ACTIVE_TOOLS.json');

// Provisioning mutates the governed roster on disk; restore it so the suite stays idempotent
function preserveActiveTools(t) {
  const original = fs.readFileSync(activeToolsFile);
  t.after(() => fs.writeFileSync(activeToolsFile, original));
}

test('MCP Provisioning: Catalog exposes every governed server declared in .cursor/mcp.json', () => {
  const engine = new McpProvisioningEngine();
  const catalog = engine.getCatalog().mcpServers || {};
  const catalogNames = Object.keys(catalog);

  assert.ok(catalogNames.length > 0, 'Official MCP catalog must not be empty');
  assert.ok(catalog['eos-local'], 'Local governed EOS MCP server must be declared in the catalog');
  for (const [name, spec] of Object.entries(catalog)) {
    assert.ok(spec.command, `${name} must declare an executable command`);
    assert.ok(Array.isArray(spec.args), `${name} must declare an args array`);
  }
});

test('MCP Provisioning: Dynamically provisions catalog servers into Mission Control safely', (t) => {
  preserveActiveTools(t);

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
    assert.ok(names.includes(name), `${name} must be registered in the active MCP roster`);
  }
});

test('MCP Provisioning: Rejects unknown unverified servers under Default-Deny', () => {
  const engine = new McpProvisioningEngine();
  const rosterBefore = fs.readFileSync(activeToolsFile);

  const result = engine.provisionMcps(['malicious_unknown_server']);

  assert.equal(result.provisionedCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.rejected[0].reason, 'MCP_NOT_FOUND_IN_OFFICIAL_CATALOG');
  // A fully rejected request must leave governed Mission Control state untouched
  assert.deepEqual(fs.readFileSync(activeToolsFile), rosterBefore);
});
