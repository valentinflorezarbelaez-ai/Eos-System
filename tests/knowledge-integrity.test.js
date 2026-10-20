import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditKnowledgeIntegrity,
  evaluateIntegrity,
  extractRefs,
  normalizeTitle,
  resolveDeclaredId,
  LEGACY_DANGLING_REFS,
  LEGACY_ID_CONFLICTS
} from '../scripts/lib/knowledge-integrity-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function build(overrides = {}) {
  return {
    source_ids: ['SRC-0001', 'SRC-0002'],
    collections: {
      RSC: [{ file: 'docs/intelligence/research/RSC-0001-alpha.json', id_field: 'research_id', record: { research_id: 'RSC-0001', sources: ['SRC-0001'], patterns: ['PAT-0001: Thing'] } }],
      PAT: [{ file: 'docs/intelligence/patterns/PAT-0001-thing.json', id_field: 'pattern_id', record: { pattern_id: 'PAT-0001', name: 'Thing', anti_patterns: ['ANT-0001: Other thing'] } }],
      ANT: [{ file: 'docs/intelligence/anti-patterns/ANT-0001-other.json', id_field: 'antipattern_id', record: { antipattern_id: 'ANT-0001', name: 'Other Thing' } }],
      CMP: [{ file: 'docs/intelligence/comparisons/CMP-0001-matrix.json', id_field: 'comparison_id', record: { comparison_id: 'CMP-0001', sources: ['SRC-0002'] } }]
    },
    legacy_allowlist: ['PAT-0098'],
    conflict_allowlist: [],
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
  input.collections.RSC[0].record.patterns = ['PAT-0098: Some Legacy Pattern'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.ok(res.warnings.some((w) => /PAT-0098 .*frozen legacy gap/.test(w.message)));
});

test('a citation whose title disagrees with the record fails closed', () => {
  const input = build();
  input.collections.RSC[0].record.patterns = ['PAT-0001: Something Else Entirely'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => /cited as 'Something Else Entirely'/.test(f.message)));
});

test('a frozen file::id conflict warns instead of failing', () => {
  const input = build({
    conflict_allowlist: ['docs/intelligence/research/RSC-0001-alpha.json::PAT-0001']
  });
  input.collections.RSC[0].record.patterns = ['PAT-0001: A Different Concept'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.ok(res.warnings.some((w) => /frozen id conflict/.test(w.message)));
});

test('a frozen conflict in another file does not excuse this one', () => {
  const input = build({
    conflict_allowlist: ['docs/intelligence/research/RSC-9999-other.json::PAT-0001']
  });
  input.collections.RSC[0].record.patterns = ['PAT-0001: A Different Concept'];
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, false);
});

test('parenthetical suffixes do not count as a title conflict', () => {
  const input = build();
  input.collections.PAT[0].record.name = 'Thing (TNG)';
  const res = evaluateIntegrity(input);
  assert.equal(res.ok, true);
  assert.deepEqual(res.failures, []);
});

test('normalizeTitle strips parentheticals and punctuation', () => {
  assert.equal(normalizeTitle('Spec-Driven Development (SDD)'), normalizeTitle('Spec-Driven Development'));
  assert.equal(normalizeTitle('Claim-Without-Evidence'), 'claim without evidence');
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

test('the conflict register is empty and must stay empty', () => {
  assert.equal(
    LEGACY_ID_CONFLICTS.length,
    0,
    `LEGACY_ID_CONFLICTS grew to ${LEGACY_ID_CONFLICTS.length}. A new entry is a regression: fix the citation, do not freeze it.`
  );
});

test('the dangling register holds exactly the one unresolved id', () => {
  assert.deepEqual(
    [...LEGACY_DANGLING_REFS],
    ['PAT-0004'],
    'PAT-0004 is the only debt allowed to remain frozen; anything else means the corpus regressed.'
  );
});

test('the live knowledge graph satisfies the lock', () => {
  const res = auditKnowledgeIntegrity(rootDir);
  assert.deepEqual(res.failures, [], `unexpected integrity failures: ${JSON.stringify(res.failures)}`);
  assert.equal(res.ok, true);
  assert.ok(res.checks.some((c) => /unique ids/.test(c.path)));
});
