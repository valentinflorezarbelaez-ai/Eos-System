import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditMcpToolKeepLock,
  MCP_TOOL_KEEP_INVENTORY_DOC,
  MCP_TOOL_KEEP_REQUIRED_PATHS,
  MCP_TOOL_KEEP_REQUIRED_SECTIONS
} from '../scripts/lib/mcp-tool-keep-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const REQUIRED_SECTIONS = [
  '## 1. Goal (S5 / K5 DoD)',
  '## 2. Inventory method (evidence)',
  '## 3. KEEP set (do not prune) — evidence',
  '## 4. Ranked prune CANDIDATES (inventory only)',
  '## 5. Verify lock',
  '## 6. Freeze note',
  '## 7. NON-CLAIM / Non-claims',
  'PRODUCTION_READY',
  'Candidate count',
  'KEEP count',
  'NON-CLAIM',
  '¿Qué puedo dejar de hacer?'
];

test('S5: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-s5-mcp-tool-keep-inventory');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/mcp-tool-keep-inventory/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('S5: inventory doc exists', () => {
  assert.ok(fs.existsSync(path.join(rootDir, MCP_TOOL_KEEP_INVENTORY_DOC)), 'missing ' + MCP_TOOL_KEEP_INVENTORY_DOC);
});

test('S5: inventory doc has required sections', () => {
  const text = fs.readFileSync(path.join(rootDir, MCP_TOOL_KEEP_INVENTORY_DOC), 'utf8');
  for (const needle of REQUIRED_SECTIONS) {
    assert.ok(text.includes(needle), 'missing section/needle: ' + needle);
  }
  assert.ok(/Candidate count[^\n]*:\s*\d+/i.test(text), 'missing candidate count');
  assert.ok(/KEEP count:\s*\d+/i.test(text), 'missing KEEP count');
  assert.ok(
    text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'),
    'PRODUCTION_READY must remain NO'
  );
  assert.ok(
    text.includes('do not delete') || text.includes('FORBIDDEN') || text.includes('inventory only'),
    'must be inventory-only'
  );
});

test('S5: auditMcpToolKeepLock green on real inventory doc', () => {
  const audit = auditMcpToolKeepLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('S5: fail-closed when inventory doc missing', () => {
  const audit = auditMcpToolKeepLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('S5: fail-closed when required sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, MCP_TOOL_KEEP_INVENTORY_DOC), 'utf8');
  let stripped = real;
  for (const needle of MCP_TOOL_KEEP_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/do not delete/gi, 'REMOVED')
    .replace(/FORBIDDEN/g, 'REMOVED')
    .replace(/inventory only/gi, 'REMOVED')
    .replace(/inventory-only/gi, 'REMOVED')
    .replace(/inventory ≠ executed prune/g, 'REMOVED')
    .replace(/inventory != executed prune/g, 'REMOVED')
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES')
    .replace(/KEEP count:\s*\d+/gi, 'REMOVED')
    .replace(/Candidate count[^\n]*/gi, 'REMOVED');

  const audit = auditMcpToolKeepLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) => /section|needle|PRODUCTION_READY|inventory|KEEP|Candidate/i.test(f.message)),
    JSON.stringify(audit.failures)
  );
});

test('S5: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-s5-mcp-'));
  try {
    const docsRel = path.dirname(MCP_TOOL_KEEP_INVENTORY_DOC);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, MCP_TOOL_KEEP_INVENTORY_DOC), '# empty\n', 'utf8');
    const audit = auditMcpToolKeepLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('S5: required paths exist', () => {
  for (const rel of MCP_TOOL_KEEP_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('S5: package.json has test:s5', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:s5'],
    'node --test tests/eos-s5-mcp-tool-keep-inventory.test.js'
  );
});

test('S5: verify-eos imports mcp-tool-keep-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('mcp-tool-keep-lock'));
  assert.ok(src.includes('auditMcpToolKeepLock'));
  assert.ok(src.includes('MCP_TOOL_KEEP_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-s5-mcp-tool-keep-inventory.test.js'));
});

test('S5: NON-CLAIM inventory!=executed prune remains explicit', () => {
  const doc = fs.readFileSync(path.join(rootDir, MCP_TOOL_KEEP_INVENTORY_DOC), 'utf8');
  assert.ok(doc.includes('NON-CLAIM') || /inventory only/i.test(doc));
  assert.ok(
    doc.includes('do not delete') ||
      doc.includes('FORBIDDEN') ||
      doc.includes('inventory ≠ executed prune') ||
      doc.includes('inventory != executed prune')
  );
  assert.ok(doc.includes('¿Qué puedo dejar de hacer?'));
  assert.ok(doc.includes('PRODUCTION_READY'));
});

test('S5: catalog SSOT still 80 tools (P5 honesty; no silent catalog delete)', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'docs/mcp/EOS_MCP_TOOL_CATALOG.json'), 'utf8')
  );
  assert.equal(catalog.metadata.total_tools, 80);
  assert.equal(catalog.tools.length, 80);
});
