import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditDirtyDeferTriageLock,
  DIRTY_DEFER_TRIAGE_DOC,
  DIRTY_DEFER_TRIAGE_RITUAL_DOC,
  LADDER_8_CLOSEOUT_DOC,
  DIRTY_DEFER_TRIAGE_REQUIRED_PATHS
} from '../scripts/lib/dirty-defer-triage-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('T8: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-t8-dirty-defer-triage');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('T8: triage + ritual + closeout exist with required needles', () => {
  const triage = fs.readFileSync(path.join(rootDir, DIRTY_DEFER_TRIAGE_DOC), 'utf8');
  const ritual = fs.readFileSync(path.join(rootDir, DIRTY_DEFER_TRIAGE_RITUAL_DOC), 'utf8');
  const closeout = fs.readFileSync(path.join(rootDir, LADDER_8_CLOSEOUT_DOC), 'utf8');
  assert.ok(triage.includes('DEFER'));
  assert.ok(triage.includes('IGNORE'));
  assert.ok(triage.includes('PROMOTE'));
  assert.ok(triage.includes('no mass delete'));
  assert.ok(triage.includes('PRODUCTION_READY'));
  assert.ok(ritual.includes('FORBIDDEN'));
  assert.ok(ritual.includes('PO_NAMED_DISCARD'));
  assert.ok(ritual.includes('NON-MUTATING'));
  assert.ok(closeout.includes('CLOSED for local governed use'));
  assert.ok(closeout.includes('1b48ff5'));
  assert.ok(
    triage.includes('PRODUCTION_READY:** NO') ||
      triage.includes('PRODUCTION_READY: NO') ||
      triage.includes('**PRODUCTION_READY:** NO')
  );
});

test('T8: auditDirtyDeferTriageLock green on real docs + tip pin', () => {
  const audit = auditDirtyDeferTriageLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.ok(audit.mode === 'CATALOG' || audit.mode === 'CATALOG_IGNORE');
  assert.ok(audit.checks.length >= 5);
});

test('T8: fail-closed when triage evidence missing', () => {
  const audit = auditDirtyDeferTriageLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipRitual: true,
    skipCloseout: true,
    skipTipCheck: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('T8: fail-closed when mass-delete language stripped / DISCARD claimed', () => {
  const real = fs.readFileSync(path.join(rootDir, DIRTY_DEFER_TRIAGE_DOC), 'utf8');
  const bad =
    real.replace(/no mass delete/gi, 'REMOVED') +
    '\n\nDISCARD executed\nmass delete completed\n';
  const ritual = fs.readFileSync(path.join(rootDir, DIRTY_DEFER_TRIAGE_RITUAL_DOC), 'utf8');
  const closeout = fs.readFileSync(path.join(rootDir, LADDER_8_CLOSEOUT_DOC), 'utf8');
  const audit = auditDirtyDeferTriageLock(rootDir, {
    triageDocText: bad,
    ritualDocText: ritual,
    closeoutDocText: closeout,
    skipPathChecks: true,
    skipTipCheck: true
  });
  assert.equal(audit.ok, false);
});

test('T8: required paths list is non-empty and present', () => {
  assert.ok(DIRTY_DEFER_TRIAGE_REQUIRED_PATHS.length >= 8);
  for (const rel of DIRTY_DEFER_TRIAGE_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('T8: package script test:t8 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:t8'], 'node --test tests/eos-t8-dirty-defer-triage.test.js');
});

test('T8: .gitignore IGNORE entries present for lab/quarantine/ATP', () => {
  const gi = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
  assert.ok(gi.includes('EOS-Lab/Transmission-Live/'));
  assert.ok(gi.includes('archive/quarantine/docs/evolution/'));
  assert.ok(gi.includes('docs/audits/atp_apple_light.png'));
  assert.ok(gi.includes('docs/audits/atp_tidal_dark.png'));
});

test('T8: DEFER stubs not force-staged claim — foreign agents remain untracked or ignored', () => {
  // Files may still exist on disk as DEFER; must not be claimed TRACK in triage
  const triage = fs.readFileSync(path.join(rootDir, DIRTY_DEFER_TRIAGE_DOC), 'utf8');
  assert.ok(triage.includes('ai-specs/agents/backend-developer.md'));
  assert.ok(/backend-developer\.md\s*\|\s*DEFER/i.test(triage) || triage.includes('| DEFER |'));
  assert.doesNotMatch(triage, /backend-developer\.md\s*\|\s*PROMOTE/i);
});

test('T8: gate CLI is NON-MUTATING when lock green', async () => {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, ['scripts/ci/dirty-defer-triage-gate.js'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const payload = JSON.parse(r.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mutating, false);
});
