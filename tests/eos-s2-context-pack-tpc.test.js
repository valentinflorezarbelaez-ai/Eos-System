import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditContextPackLock,
  CONTEXT_PACK_INDEX,
  CONTEXT_PACK_REQUIRED_PATHS,
  CONTEXT_PACK_REQUIRED_SECTIONS
} from '../scripts/lib/context-pack-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EVIDENCE = 'docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md';

test('S2: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-s2-context-pack-tpc');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/context-pack-tpc/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('S2: auditContextPackLock green on real CONTEXT_PACK_TPC index', () => {
  const audit = auditContextPackLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('S2: fail-closed when index doc missing', () => {
  const audit = auditContextPackLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('S2: fail-closed when required sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, CONTEXT_PACK_INDEX), 'utf8');
  let stripped = real;
  for (const needle of CONTEXT_PACK_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES')
    .replace(/index\s*[!=≠]+\s*(full\s*)?runtime/gi, 'REMOVED')
    .replace(/runtime context completo/gi, 'REMOVED')
    .replace(/not a (full )?runtime/gi, 'REMOVED');

  const audit = auditContextPackLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) => /section|needle|PRODUCTION_READY|NON-CLAIM|runtime/i.test(f.message)),
    JSON.stringify(audit.failures)
  );
});

test('S2: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-s2-tpc-'));
  try {
    const docsRel = path.dirname(CONTEXT_PACK_INDEX);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, CONTEXT_PACK_INDEX), '# empty\n', 'utf8');
    const audit = auditContextPackLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('S2: required paths exist', () => {
  for (const rel of CONTEXT_PACK_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('S2: package.json has test:s2', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:s2'],
    'node --test tests/eos-s2-context-pack-tpc.test.js'
  );
});

test('S2: verify-eos imports context-pack-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('context-pack-lock'));
  assert.ok(src.includes('auditContextPackLock'));
  assert.ok(src.includes('CONTEXT_PACK_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-s2-context-pack-tpc.test.js'));
});

test('S2: index SSOT path is docs/harness/CONTEXT_PACK_TPC.md', () => {
  assert.equal(CONTEXT_PACK_INDEX, 'docs/harness/CONTEXT_PACK_TPC.md');
  assert.ok(fs.existsSync(path.join(rootDir, CONTEXT_PACK_INDEX)));
});

test('S2: index marks Spec-Boot gaps as DEFER/MISSING (no invented full standards)', () => {
  const doc = fs.readFileSync(path.join(rootDir, CONTEXT_PACK_INDEX), 'utf8');
  assert.ok(/frontend-standards/i.test(doc));
  assert.ok(/documentation-standards/i.test(doc));
  assert.ok(/development_guide/i.test(doc));
  assert.ok(/DEFER|MISSING/i.test(doc));
  // Must not pretend the missing files exist as authored standards bodies
  assert.ok(
    !fs.existsSync(path.join(rootDir, 'docs/frontend-standards.md')),
    'must not invent docs/frontend-standards.md'
  );
  assert.ok(
    !fs.existsSync(path.join(rootDir, 'docs/documentation-standards.md')),
    'must not invent docs/documentation-standards.md'
  );
  assert.ok(
    !fs.existsSync(path.join(rootDir, 'docs/development_guide.md')),
    'must not invent docs/development_guide.md'
  );
});

test('S2: NON-CLAIM index!=runtime context completo remains explicit', () => {
  const doc = fs.readFileSync(path.join(rootDir, CONTEXT_PACK_INDEX), 'utf8');
  assert.ok(doc.includes('NON-CLAIM'));
  assert.ok(
    /index\s*[!=≠]+\s*(full\s*)?runtime/i.test(doc) ||
      /runtime context completo/i.test(doc) ||
      /not a (full )?runtime/i.test(doc) ||
      /≠\s*runtime/i.test(doc)
  );
  assert.ok(
    doc.includes('PRODUCTION_READY:** NO') ||
      doc.includes('PRODUCTION_READY: NO') ||
      doc.includes('**PRODUCTION_READY:** NO')
  );

  const evidence = fs.readFileSync(path.join(rootDir, EVIDENCE), 'utf8');
  assert.ok(evidence.includes('NON-CLAIM'));
  assert.ok(
    /index\s*[!=≠]+\s*(full\s*)?runtime/i.test(evidence) ||
      /runtime context completo/i.test(evidence) ||
      /≠\s*runtime/i.test(evidence)
  );
  assert.ok(/PRODUCTION_READY/i.test(evidence));
  assert.ok(evidence.includes('EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md'));
});

test('S2: lifecycle verbs present in index', () => {
  const doc = fs.readFileSync(path.join(rootDir, CONTEXT_PACK_INDEX), 'utf8');
  for (const verb of ['inject', 'compact', 'discard', 'reset', 'revisit-on-model-change']) {
    assert.ok(doc.toLowerCase().includes(verb.toLowerCase()), 'missing lifecycle verb ' + verb);
  }
});
