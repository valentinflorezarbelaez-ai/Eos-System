import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditDeferredWritersLock,
  DEFERRED_WRITERS_INVENTORY_DOC,
  DEFERRED_WRITERS_REQUIRED_PATHS,
  DEFERRED_WRITERS_REQUIRED_SECTIONS
} from '../scripts/lib/deferred-writers-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('R5: auditDeferredWritersLock green on real inventory doc', () => {
  const audit = auditDeferredWritersLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('R5: fail-closed when inventory doc missing', () => {
  const audit = auditDeferredWritersLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('R5: fail-closed when required NON-CLAIM sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, DEFERRED_WRITERS_INVENTORY_DOC), 'utf8');
  let stripped = real;
  for (const needle of DEFERRED_WRITERS_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/internal by design/gi, 'REMOVED')
    .replace(/no parallel EVD/gi, 'REMOVED')
    .replace(/parallel EVD ledger/gi, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES')
    .replace(/Choice B/g, 'REMOVED')
    .replace(/HashChainedLedger/g, 'REMOVED')
    .replace(/ledger-recovery/g, 'REMOVED');

  const audit = auditDeferredWritersLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) => /section|needle|PRODUCTION_READY|NON-CLAIM|internal|parallel|Choice/i.test(f.message)),
    JSON.stringify(audit.failures)
  );
});

test('R5: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r5-dw-'));
  try {
    const docsRel = path.dirname(DEFERRED_WRITERS_INVENTORY_DOC);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, DEFERRED_WRITERS_INVENTORY_DOC), '# empty\n', 'utf8');
    const audit = auditDeferredWritersLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('R5: required paths exist', () => {
  for (const rel of DEFERRED_WRITERS_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('R5: package.json has test:r5', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:r5'],
    'node --test tests/eos-r5-deferred-writers-governance.test.js'
  );
});

test('R5: verify-eos imports deferred-writers-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('deferred-writers-lock'));
  assert.ok(src.includes('auditDeferredWritersLock'));
  assert.ok(src.includes('DEFERRED_WRITERS_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-r5-deferred-writers-governance.test.js'));
});

test('R5: Choice B NON-CLAIM explicit — no fake route / no parallel EVD', () => {
  const inv = fs.readFileSync(path.join(rootDir, DEFERRED_WRITERS_INVENTORY_DOC), 'utf8');
  assert.ok(inv.includes('NON-CLAIM'));
  assert.ok(/internal by design/i.test(inv));
  assert.ok(/Choice B/i.test(inv) || /decision:\s*B/i.test(inv));
  assert.ok(
    /no parallel EVD/i.test(inv) ||
      /parallel EVD ledger/i.test(inv) ||
      inv.includes('sin ledger EVD paralelo')
  );
  assert.ok(inv.includes('HashChainedLedger'));
  assert.ok(inv.includes('ledger-recovery'));
  assert.ok(
    /do not (force )?route/i.test(inv) ||
      /fake route/i.test(inv) ||
      /not routed through/i.test(inv) ||
      /remain internal/i.test(inv)
  );

  const design = fs.readFileSync(
    path.join(rootDir, 'openspec/changes/eos-r5-deferred-writers-governance/design.md'),
    'utf8'
  );
  assert.ok(/Decision:\s*\*\*B\*\*/i.test(design) || design.includes('Decision: **B**'));

  // SSOT must still omit .eos (Choice B: do not expand allowlist)
  const ssot = fs.readFileSync(
    path.join(rootDir, 'config/security/write-barrier-ssot-roots.json'),
    'utf8'
  );
  const parsed = JSON.parse(ssot);
  assert.ok(!parsed.repoRelativeAllowRoots.includes('.eos'));
  assert.ok(!parsed.repoRelativeAllowRoots.includes('.eos/ledger'));
});
