import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_TOOLS } from '../src/mcp-server.js';
import {
  auditMcpCatalogLock,
  MCP_CATALOG_REQUIRED_PATHS,
  P5_ADDED_TOOLS,
  MCP_CATALOG_PATH
} from '../scripts/lib/mcp-catalog-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('P5: live CANONICAL_TOOLS length is 80', () => {
  assert.equal(CANONICAL_TOOLS.length, 80);
});

test('P5: auditMcpCatalogLock green on repo', () => {
  const audit = auditMcpCatalogLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures));
  assert.equal(audit.liveCount, 80);
  assert.equal(audit.catalogCount, 80);
  assert.deepEqual(audit.onlyLive, []);
  assert.deepEqual(audit.onlyCat, []);
});

test('P5: six previously missing tools are in catalog and live', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, MCP_CATALOG_PATH), 'utf8')
  );
  const catNames = catalog.tools.map((t) => t.name);
  const liveNames = CANONICAL_TOOLS.map((t) => t.name);
  for (const name of P5_ADDED_TOOLS) {
    assert.ok(catNames.includes(name), 'catalog missing ' + name);
    assert.ok(liveNames.includes(name), 'live missing ' + name);
  }
  assert.equal(catalog.metadata.total_tools, 80);
  assert.equal(catalog.tools.length, 80);
});

test('P5: audit fail-closed on synthetic catalog drift', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, MCP_CATALOG_PATH), 'utf8')
  );
  const drifted = {
    ...catalog,
    metadata: { ...catalog.metadata, total_tools: 74 },
    tools: catalog.tools.filter((t) => !P5_ADDED_TOOLS.includes(t.name))
  };
  const audit = auditMcpCatalogLock(rootDir, { catalog: drifted });
  assert.equal(audit.ok, false);
  assert.ok(audit.onlyLive.length >= 6, JSON.stringify(audit));
});

test('P5: required paths exist', () => {
  for (const rel of MCP_CATALOG_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('P5: package.json has test:p5', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:p5'], 'node --test tests/eos-p5-mcp-catalog-reconcile.test.js');
});

test('P5: verify-eos imports mcp-catalog-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('mcp-catalog-lock'));
  assert.ok(src.includes('auditMcpCatalogLock'));
  assert.ok(src.includes('eos-p5-mcp-catalog-reconcile.test.js'));
});
