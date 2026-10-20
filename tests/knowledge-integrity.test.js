import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditKnowledgeIntegrity,
  evaluateIntegrity,
  extractRefs,
  resolveDeclaredId,
  LEGACY_DANGLING_REFS
} from '../scripts/lib/knowledge-integrity-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function build(overrides = {}) {
  return {
    source_ids: ['SRC-0001', 'SRC-0002'],
    collections: {
      RSC: [{ file: 'docs/intelligence/research/RSC-0001-alpha.json', id_field: 'research_id', record: { research_id: 'RSC-0001', sources: ['SRC-0001'], patterns: ['PAT-0001: Thing'] } }],
      PAT: [{ file: 'docs/intelligence/patterns/PAT-0001-thing.json', id_field: 'pattern_id', record: { pattern_id: 'PAT-0001', anti_patterns: ['ANT-0001: Other thing'] } }],
      ANT: [{ file: 'docs/intelligence/anti-patterns/ANT-0001-other.json', id_field: 'antipattern_id', record: { antipattern_id: 'ANT-0001' } }],
      CMP: [{ file: 'docs/intelligence/comparisons/CMP-0001-matrix.json', id_field: 'comparison_id', record: { comparison_id: 'CMP-0001', sources: ['SRC-0002'] } }]
    },
    legacy_allowlist: LEGACY_DANGLING_REFS,
    ...overrides
  };
}

test('clean graph yields no failures', () => {
  const res = evaluateIntegrity(build());
  assert.equal(res.ok, true);
  assert.deepEqual(res.failures, []);
  assert.ok(res.checks.length >= 2);
});

test('duplicate source id fails closed', () => {
  const res = evaluateIntegrity(build({ source_ids: ['SRC-0001', 'SRC-0001'] }));
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /Duplicate source_id SRC-0001/.test(f.message)));
});

test('dangling source reference fails closed', () => {
  const input = build();
  input.collections.RSC[0].record.sources = ['SRC-9999'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /Dangling source reference SRC-9999/.test(f.message)));
});

test('missing identifier fails closed', () => {
  const input = build();
  input.collections.ANT[0].record = {};
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /missing or malformed antipattern_id/.test(f.message)));
});

test('identifier disagreeing with filename fails closed', () => {
  const input = build();
  input.collections.PAT[0].record.pattern_id = 'PAT-0009';
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /does not match filename prefix/.test(f.message)));
});

test('duplicate identifier across collections fails closed', () => {
  const input = build();
  const dup = { file: 'docs/intelligence/research/RSC-0002-alpha.json', id_field: 'research_id', record: { research_id: 'RSC-0001', sources: [] } };
  input.collections.RSC.push(dup);
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /Duplicate or conflicting id RSC-0001/.test(f.message)));
});

test('new dangling pattern reference fails closed', () => {
  const input = build();
  input.collections.RSC[0].record.patterns = ['PAT-0099: Invented'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /Dangling pattern reference PAT-0099/.test(f.message)));
});

test('frozen legacy gap warns instead of failing', () => {
  const input = build();
  input.collections.RSC[0].record.patterns = ['PAT-0003: Local-First Control Plane'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.ok(res.warnings.some((w) => /PAT-0003 .*frozen legacy gap/.test(w.message)));
});

test('prose inside anti_patterns is not treated as a reference', () => {
  const input = build();
  input.collections.PAT[0].record.anti_patterns = ['Prompting a model for JSON and catching the parse error'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.deepEqual(res.failures, []);
});

test('non-canonical id field warns but does not fail', () => {
  const input = build();
  input.collections.RSC[0].record = { id: 'RSC-0001', sources: ['SRC-0001'], patterns: [] };
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.ok(res.warnings.some((w) => /non-canonical id field 'id'/.test(w.message)));
});

test('resolveDeclaredId tolerates document_id with slug suffix', () => {
  const resolved = resolveDeclaredId({ document_id: 'RSC-0016-gentleman-digest' }, 'research_id');
  assert.equal(resolved.id, 'RSC-0016');
  assert.equal(resolved.field, 'document_id');
  assert.equal(resolved.canonical, false);
});

test('resolveDeclaredId prefers the canonical field', () => {
  const resolved = resolveDeclaredId({ research_id: 'RSC-0007', id: 'RSC-0099' }, 'research_id');
  assert.equal(resolved.id, 'RSC-0007');
  assert.equal(resolved.canonical, true);
});

test('extractRefs keeps identifiers and drops prose', () => {
  assert.deepEqual(
    extractRefs(['PAT-0005: Typed Decision Contracts', 'just prose', 42, 'ANT-0004']),
    ['PAT-0005', 'ANT-0004']
  );
});

test('the live knowledge graph satisfies the lock', () => {
  const res = auditKnowledgeIntegrity(rootDir);
  assert.deepEqual(res.failures, [], `unexpected integrity failures: ${JSON.stringify(res.failures)}`);
  assert.equal(res.ok, true);
  assert.ok(res.checks.some((c) => /unique ids/.test(c.path)));
});
