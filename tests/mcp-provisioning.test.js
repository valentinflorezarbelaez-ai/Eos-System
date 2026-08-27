import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpProvisioningEngine } from '../scripts/engine/mcp-provisioning-engine.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The workspace .cursor/mcp.json is operator-owned and changes with the local
// toolbelt, so provisioning behaviour is asserted against a controlled catalog.
function sandbox(catalog) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mcp-provisioning-'));
  const cursorMcpFile = path.join(dir, 'mcp.json');
  const activeToolsFile = path.join(dir, 'ACTIVE_TOOLS.json');
  fs.writeFileSync(cursorMcpFile, JSON.stringify(catalog, null, 2));
  fs.writeFileSync(activeToolsFile, JSON.stringify({ governed_tools: [], governed_mcps: [] }, null, 2));
  return { engine: new McpProvisioningEngine({ cursorMcpFile, activeToolsFile }), activeToolsFile };
}

const CATALOG = {
  mcpServers: {
    'eos-local': { command: 'node', args: ['src/mcp-server.js'] },
    playwright: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
    slack: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'] },
    engram: { command: 'engram' }
  }
};

test('MCP Provisioning: Catalog is loaded from the configured mcp.json', () => {
  const { engine } = sandbox(CATALOG);
  const catalog = engine.getCatalog().mcpServers;

  assert.deepEqual(Object.keys(catalog).sort(), ['engram', 'eos-local', 'playwright', 'slack']);
});

test('MCP Provisioning: Provisions catalog servers into the governed roster', () => {
  const { engine, activeToolsFile } = sandbox(CATALOG);

  const result = engine.provisionMcps(['eos-local', 'Playwright', ' slack ', 'engram']);

  assert.equal(result.provisionedCount, 4);
  assert.equal(result.rejectedCount, 0);
  assert.equal(result.status, 'PROVISIONING_PIPELINE_EXECUTED_SAFELY');
  assert.equal(result.provisioned.find(m => m.name === 'Slack').risk, 'MEDIUM');
  // Servers declared without args must not break command rendering
  assert.equal(result.provisioned.find(m => m.name === 'Engram').command, 'engram');

  const verification = engine.verifyActiveMcps();
  assert.equal(verification.activeCount, 4);
  assert.deepEqual(
    verification.mcps.map(m => m.name.toLowerCase()).sort(),
    ['engram', 'eos-local', 'playwright', 'slack']
  );

  // Re-provisioning the same roster is idempotent and leaves the file untouched
  const before = fs.statSync(activeToolsFile).mtimeMs;
  const repeat = engine.provisionMcps(['playwright']);
  assert.equal(repeat.provisionedCount, 1);
  assert.equal(engine.verifyActiveMcps().activeCount, 4);
  assert.equal(fs.statSync(activeToolsFile).mtimeMs, before);
});

test('MCP Provisioning: Rejects unknown unverified servers under Default-Deny', () => {
  const { engine, activeToolsFile } = sandbox(CATALOG);
  const result = engine.provisionMcps(['malicious_unknown_server']);

  assert.equal(result.provisionedCount, 0);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.rejected[0].reason, 'MCP_NOT_FOUND_IN_OFFICIAL_CATALOG');
  assert.deepEqual(JSON.parse(fs.readFileSync(activeToolsFile, 'utf8')).governed_mcps, []);
});

test('MCP Provisioning: Workspace mcp.json is a provisionable catalog', () => {
  const engine = new McpProvisioningEngine();
  const servers = engine.getCatalog().mcpServers || {};

  assert.ok(servers['eos-local'], 'eos-local MCP server must be configured');
  assert.equal(servers['eos-local'].command, 'node');
  assert.deepEqual(servers['eos-local'].args, ['src/mcp-server.js']);
  assert.equal(
    fs.existsSync(path.join(rootDir, servers['eos-local'].args[0])),
    true,
    'eos-local entrypoint must exist in the workspace'
  );

  for (const [name, spec] of Object.entries(servers)) {
    assert.equal(typeof spec.command, 'string', `${name} must declare a command`);
    assert.ok(spec.command.length > 0, `${name} command must not be empty`);
  }
});
