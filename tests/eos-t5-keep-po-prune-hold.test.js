import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditKeepPoPruneHoldLock,
  KEEP_PO_PRUNE_HOLD_DOC,
  KEEP_PO_PRUNE_RITUAL_DOC,
  KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS
} from '../scripts/lib/keep-po-prune-hold-lock.js';
import {
  parseS5CandidateTools,
  validatePoNamedList,
  runKeepPoPruneGate
} from '../scripts/ci/keep-po-prune-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('T5: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-t5-keep-po-prune-hold');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('T5: HOLD evidence + ritual runbook exist with required needles', () => {
  const hold = fs.readFileSync(path.join(rootDir, KEEP_PO_PRUNE_HOLD_DOC), 'utf8');
  const ritual = fs.readFileSync(path.join(rootDir, KEEP_PO_PRUNE_RITUAL_DOC), 'utf8');
  assert.ok(hold.includes('HOLD'));
  assert.ok(hold.includes('no prune this quarter'));
  assert.ok(hold.includes('PRODUCTION_READY'));
  assert.ok(hold.includes('silent delete') || hold.includes('NO silent'));
  assert.ok(ritual.includes('PO_NAMED'));
  assert.ok(ritual.includes('FORBIDDEN'));
  assert.ok(ritual.includes('NON-MUTATING'));
  assert.ok(
    hold.includes('PRODUCTION_READY:** NO') ||
      hold.includes('PRODUCTION_READY: NO') ||
      hold.includes('**PRODUCTION_READY:** NO')
  );
});

test('T5: auditKeepPoPruneHoldLock green on real HOLD docs + catalog reconcile', () => {
  const audit = auditKeepPoPruneHoldLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'HOLD');
  assert.ok(audit.checks.length >= 5);
});

test('T5: fail-closed when HOLD evidence missing', () => {
  const audit = auditKeepPoPruneHoldLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipCatalogReconcile: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('T5: fail-closed when HOLD language stripped (temp fixture)', () => {
  const real = fs.readFileSync(path.join(rootDir, KEEP_PO_PRUNE_HOLD_DOC), 'utf8');
  const stripped = real
    .replace(/no prune this quarter/gi, 'STATUS_REMOVED')
    .replace(/HOLD/g, 'MODE_X');
  const ritual = fs.readFileSync(path.join(rootDir, KEEP_PO_PRUNE_RITUAL_DOC), 'utf8');
  const audit = auditKeepPoPruneHoldLock(rootDir, {
    holdDocText: stripped,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipCatalogReconcile: true
  });
  assert.equal(audit.ok, false);
});

test('T5: gate CLI HOLD PASS is NON-MUTATING', () => {
  const report = runKeepPoPruneGate({ hold: true });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'HOLD');
});

test('T5: PO_NAMED validation accepts S5 candidate and rejects unknown', () => {
  const inv = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md'),
    'utf8'
  );
  const candidates = parseS5CandidateTools(inv);
  assert.ok(candidates.length >= 20, 'expected S5 candidates parsed');
  assert.ok(candidates.includes('eos.provider.health'));

  const ok = validatePoNamedList(['eos.provider.health'], candidates);
  assert.equal(ok.ok, true);

  const bad = validatePoNamedList(['eos.not.a.real.tool'], candidates);
  assert.equal(bad.ok, false);

  const empty = validatePoNamedList([], candidates);
  assert.equal(empty.ok, false);
});

test('T5: package.json exposes test:t5; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:t5'], 'node --test tests/eos-t5-keep-po-prune-hold.test.js');
  for (const rel of KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('T5: verify-eos wires keep-po-prune-hold lock', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('auditKeepPoPruneHoldLock'));
  assert.ok(src.includes('KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS'));
  assert.ok(src.includes('keep-po-prune-hold-lock'));
  assert.ok(src.includes('eos-t5-keep-po-prune-hold.test.js'));
});