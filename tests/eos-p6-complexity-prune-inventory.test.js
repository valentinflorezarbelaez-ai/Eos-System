import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DOC = 'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md';

const REQUIRED_SECTIONS = [
  '## 1. Goal (P6 / J6 DoD)',
  '## 2. Inventory method (evidence)',
  '## 3. KEEP set (do not prune) — evidence',
  '## 4. Ranked prune CANDIDATES (inventory only)',
  '## 5. Optional',
  '## 6. Freeze note — Ladder 4 P1–P6',
  '## 9. Non-claims',
  'PRODUCTION_READY',
  'Candidate count',
  'NON-CLAIM',
  'ROI2'
];

test('P6: inventory doc exists', () => {
  assert.ok(fs.existsSync(path.join(rootDir, DOC)), 'missing ' + DOC);
});

test('P6: inventory doc has required sections', () => {
  const text = fs.readFileSync(path.join(rootDir, DOC), 'utf8');
  for (const needle of REQUIRED_SECTIONS) {
    assert.ok(text.includes(needle), 'missing section/needle: ' + needle);
  }
  assert.ok(/Candidate count[^\n]*:\s*\d+/i.test(text), 'missing candidate count');
  assert.ok(text.includes('PRODUCTION_READY:** NO') || text.includes('PRODUCTION_READY: NO'), 'PRODUCTION_READY must remain NO');
  assert.ok(text.includes('do not delete') || text.includes('FORBIDDEN') || text.includes('inventory only'), 'must be inventory-only');
});

test('P6: package.json has test:p6', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:p6'],
    'node --test tests/eos-p6-complexity-prune-inventory.test.js'
  );
});
