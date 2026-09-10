import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditComplexityCeilingHoldLock,
  COMPLEXITY_CEILING_HOLD_DOC,
  COMPLEXITY_CEILING_HOLD_RITUAL_DOC,
  COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS
} from '../scripts/lib/complexity-ceiling-hold-lock.js';
import {
  parseP6CandidatePaths,
  validatePoNamedList,
  runComplexityCeilingHoldGate
} from '../scripts/ci/complexity-ceiling-hold-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('T6: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-t6-complexity-ceiling-hold');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('T6: HOLD evidence + ritual runbook exist with required needles', () => {
  const hold = fs.readFileSync(path.join(rootDir, COMPLEXITY_CEILING_HOLD_DOC), 'utf8');
  const ritual = fs.readFileSync(path.join(rootDir, COMPLEXITY_CEILING_HOLD_RITUAL_DOC), 'utf8');
  assert.ok(hold.includes('HOLD'));
  assert.ok(hold.includes('hold AT_CEILING'));
  assert.ok(hold.includes('no new schemas'));
  assert.ok(hold.includes('PRODUCTION_READY'));
  assert.ok(hold.includes('vibe schemas') || hold.includes('no vibe'));
  assert.ok(ritual.includes('PO_NAMED'));
  assert.ok(ritual.includes('FORBIDDEN'));
  assert.ok(ritual.includes('NON-MUTATING'));
  assert.ok(ritual.includes('AT_CEILING'));
  assert.ok(
    hold.includes('PRODUCTION_READY:** NO') ||
      hold.includes('PRODUCTION_READY: NO') ||
      hold.includes('**PRODUCTION_READY:** NO')
  );
});

test('T6: auditComplexityCeilingHoldLock green on real HOLD docs + budget reconcile', () => {
  const audit = auditComplexityCeilingHoldLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'HOLD');
  assert.ok(audit.checks.length >= 5);
});

test('T6: fail-closed when HOLD evidence missing', () => {
  const audit = auditComplexityCeilingHoldLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipBudgetReconcile: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('T6: fail-closed when HOLD language stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, COMPLEXITY_CEILING_HOLD_DOC), 'utf8');
  const stripped = real
    .replace(/hold AT_CEILING/gi, 'STATUS_REMOVED')
    .replace(/no new schemas/gi, 'REMOVED')
    .replace(/HOLD/g, 'MODE_X');
  const ritual = fs.readFileSync(path.join(rootDir, COMPLEXITY_CEILING_HOLD_RITUAL_DOC), 'utf8');
  const audit = auditComplexityCeilingHoldLock(rootDir, {
    holdDocText: stripped,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipBudgetReconcile: true
  });
  assert.equal(audit.ok, false);
});

test('T6: gate CLI HOLD PASS is NON-MUTATING', () => {
  const report = runComplexityCeilingHoldGate({ hold: true });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'HOLD');
});

test('T6: PO_NAMED validation accepts P6 candidate and rejects unknown', () => {
  const inv = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md'),
    'utf8'
  );
  const candidates = parseP6CandidatePaths(inv);
  assert.ok(candidates.length >= 20, 'expected P6 candidates parsed, got ' + candidates.length);
  assert.ok(
    candidates.includes('src/core/pilot/one_percent/mini-bytecode-vm-engine.js'),
    'expected pilot candidate'
  );

  const ok = validatePoNamedList(
    ['src/core/pilot/one_percent/mini-bytecode-vm-engine.js'],
    candidates
  );
  assert.equal(ok.ok, true);

  const bad = validatePoNamedList(['src/core/not/a/real/path.js'], candidates);
  assert.equal(bad.ok, false);

  const empty = validatePoNamedList([], candidates);
  assert.equal(empty.ok, false);
});

test('T6: package.json exposes test:t6; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:t6'],
    'node --test tests/eos-t6-complexity-ceiling-hold.test.js'
  );
  for (const rel of COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('T6: verify-eos wires complexity-ceiling-hold lock', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('auditComplexityCeilingHoldLock'));
  assert.ok(src.includes('COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS'));
  assert.ok(src.includes('complexity-ceiling-hold-lock'));
  assert.ok(src.includes('eos-t6-complexity-ceiling-hold.test.js'));
});

test('T6: COMPLEXITY_BUDGET still AT_CEILING; no new schema vibe', () => {
  const budget = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'docs/governance/COMPLEXITY_BUDGET.json'), 'utf8')
  );
  assert.equal(budget.status, 'AT_CEILING');
  assert.equal(budget.current_usage.schemas, budget.budgets.max_schemas);
  assert.equal(budget.policy?.at_ceiling_new_schemas, 'FORBIDDEN');
});
