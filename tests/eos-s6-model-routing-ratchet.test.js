import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditModelRoutingRatchetLock,
  MODEL_ROUTING_DOC,
  RATCHET_RITUAL_DOC,
  MODEL_ROUTING_REQUIRED_SECTIONS,
  RATCHET_RITUAL_REQUIRED_SECTIONS,
  MODEL_ROUTING_RATCHET_REQUIRED_PATHS
} from '../scripts/lib/model-routing-ratchet-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('S6: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-s6-model-routing-ratchet');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/model-routing-ratchet/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('S6: routing + ratchet docs exist', () => {
  assert.ok(fs.existsSync(path.join(rootDir, MODEL_ROUTING_DOC)), 'missing ' + MODEL_ROUTING_DOC);
  assert.ok(fs.existsSync(path.join(rootDir, RATCHET_RITUAL_DOC)), 'missing ' + RATCHET_RITUAL_DOC);
});

test('S6: MODEL_ROUTING has required sections + NON-CLAIM', () => {
  const text = fs.readFileSync(path.join(rootDir, MODEL_ROUTING_DOC), 'utf8');
  for (const needle of MODEL_ROUTING_REQUIRED_SECTIONS) {
    assert.ok(text.includes(needle), 'missing section/needle: ' + needle);
  }
  assert.ok(
    text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'),
    'PRODUCTION_READY must remain NO'
  );
  assert.ok(/auto model switch/i.test(text), 'must state no auto model switch');
  assert.ok(text.includes('Antigravity-first') || text.includes('Antigravity'));
});

test('S6: RATCHET_RITUAL has required sections + NON-CLAIM', () => {
  const text = fs.readFileSync(path.join(rootDir, RATCHET_RITUAL_DOC), 'utf8');
  for (const needle of RATCHET_RITUAL_REQUIRED_SECTIONS) {
    assert.ok(text.includes(needle), 'missing section/needle: ' + needle);
  }
  assert.ok(
    text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'),
    'PRODUCTION_READY must remain NO'
  );
  assert.ok(/autonomous self-heal/i.test(text) || /Ritual\s*[≠!=]+\s*verify/i.test(text));
});

test('S6: auditModelRoutingRatchetLock green on real docs', () => {
  const audit = auditModelRoutingRatchetLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 4);
});

test('S6: fail-closed when docs missing', () => {
  const audit = auditModelRoutingRatchetLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('S6: fail-closed when required sections stripped (temp fixture)', () => {
  let routing = fs.readFileSync(path.join(rootDir, MODEL_ROUTING_DOC), 'utf8');
  let ratchet = fs.readFileSync(path.join(rootDir, RATCHET_RITUAL_DOC), 'utf8');
  for (const needle of MODEL_ROUTING_REQUIRED_SECTIONS) {
    routing = routing.split(needle).join('## REMOVED');
  }
  for (const needle of RATCHET_RITUAL_REQUIRED_SECTIONS) {
    ratchet = ratchet.split(needle).join('## REMOVED');
  }
  routing = routing
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/auto model switch/gi, 'REMOVED')
    .replace(/Guidance ≠ runtime auto-router/g, 'REMOVED')
    .replace(/guidance ≠ runtime auto-router/gi, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES');
  ratchet = ratchet
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/autonomous self-heal/gi, 'REMOVED')
    .replace(/Ritual ≠ verify:strict/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES');

  const audit = auditModelRoutingRatchetLock(rootDir, {
    routingText: routing,
    ratchetText: ratchet,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped docs must fail closed');
  assert.ok(
    audit.failures.some((f) => /section|needle|PRODUCTION_READY|NON-CLAIM|auto model|self-heal/i.test(f.message)),
    JSON.stringify(audit.failures)
  );
});

test('S6: fail-closed on empty temp fixture docs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-s6-mrr-'));
  try {
    fs.mkdirSync(path.join(tmp, 'docs/harness'), { recursive: true });
    fs.writeFileSync(path.join(tmp, MODEL_ROUTING_DOC), '# empty\n', 'utf8');
    fs.writeFileSync(path.join(tmp, RATCHET_RITUAL_DOC), '# empty\n', 'utf8');
    const audit = auditModelRoutingRatchetLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('S6: required paths exist', () => {
  for (const rel of MODEL_ROUTING_RATCHET_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('S6: package.json has test:s6', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:s6'],
    'node --test tests/eos-s6-model-routing-ratchet.test.js'
  );
});

test('S6: verify-eos imports model-routing-ratchet-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('model-routing-ratchet-lock'));
  assert.ok(src.includes('auditModelRoutingRatchetLock'));
  assert.ok(src.includes('MODEL_ROUTING_RATCHET_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-s6-model-routing-ratchet.test.js'));
});

test('S6: evidence doc keeps PRODUCTION_READY=NO and NON-CLAIMS', () => {
  const doc = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_S6_MODEL_ROUTING_RATCHET_2026-09-09.md'),
    'utf8'
  );
  assert.ok(doc.includes('PRODUCTION_READY'));
  assert.ok(doc.includes('NO'));
  assert.ok(doc.includes('NON-CLAIM'));
  assert.ok(/auto model switch/i.test(doc));
  assert.ok(doc.includes('Fundacion'));
  assert.ok(doc.includes('AT_CEILING'));
});

test('S6: MCP catalog still 80 tools (no silent tool delete)', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'docs/mcp/EOS_MCP_TOOL_CATALOG.json'), 'utf8')
  );
  assert.equal(catalog.metadata.total_tools, 80);
  assert.equal(catalog.tools.length, 80);
});
