import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditP6InventoryLock,
  P6_INVENTORY_DOC,
  P6_INVENTORY_REQUIRED_PATHS,
  P6_INVENTORY_REQUIRED_SECTIONS
} from '../scripts/lib/p6-inventory-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Q6: auditP6InventoryLock green on real P6 inventory doc', () => {
  const audit = auditP6InventoryLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.checks.length >= 3);
});

test('Q6: fail-closed when inventory doc missing', () => {
  const audit = auditP6InventoryLock(rootDir, { docMissing: true, skipPathChecks: true });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => f.message.includes('missing')));
});

test('Q6: fail-closed when required sections stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, P6_INVENTORY_DOC), 'utf8');
  let stripped = real;
  for (const needle of P6_INVENTORY_REQUIRED_SECTIONS) {
    stripped = stripped.split(needle).join('## REMOVED');
  }
  stripped = stripped
    .replace(/do not delete/gi, 'REMOVED')
    .replace(/FORBIDDEN/g, 'REMOVED')
    .replace(/inventory only/gi, 'REMOVED')
    .replace(/inventory-only/gi, 'REMOVED')
    .replace(/No code quarantine\/delete\/move/g, 'REMOVED')
    .replace(/NON-CLAIM/g, 'REMOVED')
    .replace(/PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/\*\*PRODUCTION_READY:\*\* NO/g, 'PRODUCTION_READY: YES')
    .replace(/PRODUCTION_READY: NO/g, 'PRODUCTION_READY: YES');

  const audit = auditP6InventoryLock(rootDir, {
    docText: stripped,
    skipPathChecks: true
  });
  assert.equal(audit.ok, false, 'stripped doc must fail closed');
  assert.ok(
    audit.failures.some((f) => /section|needle|PRODUCTION_READY|inventory/i.test(f.message)),
    JSON.stringify(audit.failures)
  );
});

test('Q6: fail-closed on empty temp fixture doc', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-q6-p6-'));
  try {
    const docsRel = path.dirname(P6_INVENTORY_DOC);
    fs.mkdirSync(path.join(tmp, docsRel), { recursive: true });
    fs.writeFileSync(path.join(tmp, P6_INVENTORY_DOC), '# empty\n', 'utf8');
    const audit = auditP6InventoryLock(tmp, { skipPathChecks: true });
    assert.equal(audit.ok, false);
    assert.ok(audit.failures.length >= 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Q6: required paths exist', () => {
  for (const rel of P6_INVENTORY_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('Q6: package.json has test:q6', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:q6'],
    'node --test tests/eos-q6-p6-inventory-verify-lock.test.js'
  );
});

test('Q6: verify-eos imports p6-inventory-lock surface', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('p6-inventory-lock'));
  assert.ok(src.includes('auditP6InventoryLock'));
  assert.ok(src.includes('P6_INVENTORY_REQUIRED_PATHS'));
  assert.ok(src.includes('eos-q6-p6-inventory-verify-lock.test.js'));
});

test('Q6: NON-CLAIM inventory!=executed prune remains explicit', () => {
  const doc = fs.readFileSync(path.join(rootDir, P6_INVENTORY_DOC), 'utf8');
  assert.ok(doc.includes('NON-CLAIM') || /inventory only/i.test(doc));
  assert.ok(
    doc.includes('do not delete') ||
      doc.includes('FORBIDDEN') ||
      doc.includes('No code quarantine/delete/move')
  );
  const q6 = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_Q6_P6_INVENTORY_VERIFY_LOCK_2026-09-09.md'),
    'utf8'
  );
  assert.ok(q6.includes('NON-CLAIM'));
  assert.ok(
    q6.includes('inventory!=executed') ||
      q6.includes('inventory != executed') ||
      q6.includes('inventory ≠ executed') ||
      /inventory\s*[!=≠]+\s*executed\s*prune/i.test(q6)
  );
  assert.ok(q6.includes('PRODUCTION_READY'));
});