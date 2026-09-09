import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditLoopEngineeringLock,
  LOOP_ENGINEERING_INDEX,
  LOOP_ENGINEERING_REQUIRED_PATHS,
  LOOP_ENGINEERING_REQUIRED_SECTIONS
} from '../scripts/lib/loop-engineering-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const EVIDENCE = 'docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md';
const ADR = 'docs/architecture/adrs/ADR-0017-loop-engineering-4q.md';

test('S3: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-s3-loop-engineering-4q');
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/loop-engineering-4q/spec.md'
  ]) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('S3: auditLoopEngineeringLock green on real LOOP_ENGINEERING_4Q index', () => {
  const audit = auditLoopEngineeringLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('S3: fail-closed when index doc missing', () => {
  const audit = auditLoopEngineeringLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('S3: fail-closed when required sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, LOOP_ENGINEERING_INDEX), 'utf8');
  let stripped = real;
  for (const needle of LOOP_ENGINEERING_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES')
    .replace(/policy\s*[!=≠]+\s*productive\s*autonomy/gi, 'REMOVED')
    .replace(/≠\s*productive\s*autonomy/gi, 'REMOVED')
    .replace(/not\s+productive\s+autonomy/gi, 'REMOVED')
    .replace(/Loop\s*[!=≠]+\s*verify/gi, 'REMOVED')
    .replace(/Loop Engineering\s*[!=≠]+\s*verify/gi, 'REMOVED');

  const audit = auditLoopEngineeringLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) =>
      /section|needle|PRODUCTION_READY|NON-CLAIM|autonomy|verify/i.test(f.message)
    ),
    JSON.stringify(audit.failures)
  );
});

test('S3: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-s3-loop-'));
  try {
    const docsRel = path.dirname(LOOP_ENGINEERING_INDEX);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, LOOP_ENGINEERING_INDEX), '# empty\n', 'utf8');
    const audit = auditLoopEngineeringLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('S3: required paths exist', () => {
  for (const rel of LOOP_ENGINEERING_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('S3: package.json has test:s3', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:s3'],
    'node --test tests/eos-s3-loop-engineering-4q.test.js'
  );
});

test('S3: verify-eos imports loop-engineering-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('loop-engineering-lock'));
  assert.ok(src.includes('auditLoopEngineeringLock'));
  assert.ok(src.includes('LOOP_ENGINEERING_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-s3-loop-engineering-4q.test.js'));
});

test('S3: index SSOT path is docs/harness/LOOP_ENGINEERING_4Q.md', () => {
  assert.equal(LOOP_ENGINEERING_INDEX, 'docs/harness/LOOP_ENGINEERING_4Q.md');
  assert.ok(fs.existsSync(path.join(rootDir, LOOP_ENGINEERING_INDEX)));
});

test('S3: ADR-0017 exists and points at harness SSOT without rewriting ADR-0011/0014', () => {
  assert.ok(fs.existsSync(path.join(rootDir, ADR)));
  const adr = fs.readFileSync(path.join(rootDir, ADR), 'utf8');
  assert.ok(adr.includes('LOOP_ENGINEERING_4Q.md'));
  assert.ok(/ADR-0014/i.test(adr));
  assert.ok(/must not be rewritten|does not rewrite|not be rewritten|read-only/i.test(adr));
  // Bodies of 0011/0014 remain present as separate files
  assert.ok(
    fs.existsSync(
      path.join(rootDir, 'docs/architecture/adrs/ADR-0011-harness-engineering-token-hygiene-and-anti-overengineering.md')
    )
  );
  assert.ok(
    fs.existsSync(
      path.join(rootDir, 'docs/architecture/adrs/ADR-0014-mission-loop-mcp-enforcement.md')
    )
  );
});

test('S3: 4Q surfaces mapped in index', () => {
  const doc = fs.readFileSync(path.join(rootDir, LOOP_ENGINEERING_INDEX), 'utf8');
  assert.ok(doc.includes('Feedforward × Computational'));
  assert.ok(doc.includes('Feedforward × Inferential'));
  assert.ok(doc.includes('Feedback × Computational'));
  assert.ok(doc.includes('Feedback × Inferential'));
  assert.ok(doc.includes('AGENTS.md'));
  assert.ok(doc.includes('CLAUDE.md') || doc.includes('.cursor/rules'));
  assert.ok(/hooks\s+\*?pre|hooks \*\*pre\*\*/i.test(doc) || doc.includes('hooks **pre**'));
  assert.ok(doc.includes('Write Barrier'));
  assert.ok(/OpenSpec|plan mode/i.test(doc));
  assert.ok(/doctor/i.test(doc) && /OBSERVED/i.test(doc));
  assert.ok(doc.includes('verify:strict'));
  assert.ok(/TDD|CI seam-pack|hooks \*\*post\*\*/i.test(doc));
  assert.ok(doc.includes('adversarial-review'));
  assert.ok(doc.includes('fusion-light'));
  assert.ok(doc.includes('HITL'));
  for (const stage of ['guides', 'act', 'sensors', 'feedback']) {
    assert.ok(doc.toLowerCase().includes(stage), 'missing cycle stage ' + stage);
  }
});

test('S3: NON-CLAIM policy!=productive autonomy / Loop!=verify remains explicit', () => {
  const doc = fs.readFileSync(path.join(rootDir, LOOP_ENGINEERING_INDEX), 'utf8');
  assert.ok(doc.includes('NON-CLAIM'));
  assert.ok(
    /policy\s*[!=≠]+\s*productive\s*autonomy/i.test(doc) ||
      /≠\s*productive\s*autonomy/i.test(doc) ||
      /not\s+productive\s+autonomy/i.test(doc)
  );
  assert.ok(/Loop\s*[!=≠]+\s*verify/i.test(doc) || /Loop Engineering\s*[!=≠]+\s*verify/i.test(doc));
  assert.ok(
    doc.includes('PRODUCTION_READY:** NO') ||
      doc.includes('PRODUCTION_READY: NO') ||
      doc.includes('**PRODUCTION_READY:** NO')
  );

  const evidence = fs.readFileSync(path.join(rootDir, EVIDENCE), 'utf8');
  assert.ok(evidence.includes('NON-CLAIM'));
  assert.ok(
    /policy\s*[!=≠]+\s*productive\s*autonomy/i.test(evidence) ||
      /≠\s*productive\s*autonomy/i.test(evidence) ||
      /not\s+productive\s+autonomy/i.test(evidence)
  );
  assert.ok(/Loop\s*[!=≠]+\s*verify/i.test(evidence) || /Loop Engineering\s*[!=≠]+\s*verify/i.test(evidence));
  assert.ok(/PRODUCTION_READY/i.test(evidence));
  assert.ok(/doctor/i.test(evidence));
});

test('S3: doctor NON-CLAIM mentions Loop Engineering != verify / != productive autonomy', () => {
  const src = fs.readFileSync(path.join(rootDir, 'src/core/runtime/operator-doctor.js'), 'utf8');
  assert.ok(/Loop Engineering/i.test(src));
  assert.ok(
    /productive autonomy/i.test(src) || /Loop Engineering.*verify/i.test(src),
    'doctor should carry Loop Engineering NON-CLAIM residual'
  );
});
