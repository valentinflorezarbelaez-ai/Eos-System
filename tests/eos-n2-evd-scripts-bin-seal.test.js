import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditCanonicalEvdWritePaths,
  inventoryCanonicalEvdWriters,
  sourceWritesCanonicalEvd,
  CANONICAL_EVD_SEAL_MODULE,
  EVD_AUDIT_SCAN_ROOTS
} from '../src/core/sdd/evd-seal-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('N2 EVD custody audit scripts+bin', () => {
  it('audit roots include src, scripts, and bin', () => {
    assert.deepEqual([...EVD_AUDIT_SCAN_ROOTS], ['src', 'scripts', 'bin']);
    const audit = auditCanonicalEvdWritePaths(rootDir);
    assert.deepEqual(audit.roots, ['src', 'scripts', 'bin']);
    assert.ok(audit.scanned > 0);
  });

  it('repo audit DENYs no raw scripts/bin EVD writers (ok=true)', () => {
    const audit = auditCanonicalEvdWritePaths(rootDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.violations));
    assert.ok(audit.sanctioned.includes(CANONICAL_EVD_SEAL_MODULE));
    const violPaths = (audit.violations || []).map((v) => v.path);
    assert.equal(
      violPaths.some((p) => p.startsWith('scripts/') || p.startsWith('bin/')),
      false
    );
  });

  it('sourceWritesCanonicalEvd catches L3-suspect patterns', () => {
    const engineeringLoopStyle = `
      const evidencePath = path.join(baseDir, 'docs/evidence/EVD-ENGINEERING-LOOP-LIVE-001.json');
      fs.writeFileSync(evidencePath, JSON.stringify({}), 'utf-8');
    `;
    assert.equal(sourceWritesCanonicalEvd(engineeringLoopStyle), true);

    const orchestratorStyle = `
      const CONFIG = { EVIDENCE_DIR: 'docs/evidence' };
      function generateEvidence(evidenceId, data) {
        const evidencePath = path.join(CONFIG.EVIDENCE_DIR, \`\${evidenceId}.json\`);
        fs.writeFileSync(evidencePath, JSON.stringify(data), 'utf8');
      }
    `;
    assert.equal(sourceWritesCanonicalEvd(orchestratorStyle), true);
  });

  it('static audit detects synthetic bypass under scripts/', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n2-audit-'));
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'core', 'sdd'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, CANONICAL_EVD_SEAL_MODULE),
      'export function sealEvd() {}\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'scripts', 'evil-scripts-bypass.js'),
      `
import fs from 'node:fs';
import path from 'node:path';
export function bad() {
  const evidencePath = path.join(root, 'docs/evidence/EVD-BAD-SCRIPTS.json');
  fs.writeFileSync(evidencePath, '{}');
}
`.trim() + '\n',
      'utf8'
    );
    const audit = auditCanonicalEvdWritePaths(fixtureRoot);
    assert.equal(audit.ok, false);
    assert.ok(
      audit.violations.some((v) => v.path === 'scripts/evil-scripts-bypass.js'),
      JSON.stringify(audit.violations)
    );
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('static audit detects synthetic bypass under bin/', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n2-bin-'));
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'core', 'sdd'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, CANONICAL_EVD_SEAL_MODULE),
      'export function sealEvd() {}\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'bin', 'evil-bin-bypass.js'),
      `
import fs from 'node:fs';
import path from 'node:path';
const EVIDENCE_DIR = 'docs/evidence';
export function bad(evidenceId) {
  const evidencePath = path.join(EVIDENCE_DIR, \`\${evidenceId}.json\`);
  fs.writeFileSync(evidencePath, '{}');
}
`.trim() + '\n',
      'utf8'
    );
    const audit = auditCanonicalEvdWritePaths(fixtureRoot);
    assert.equal(audit.ok, false);
    assert.ok(
      audit.violations.some((v) => v.path === 'bin/evil-bin-bypass.js'),
      JSON.stringify(audit.violations)
    );
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('mission-local evidence writers still excluded', () => {
    const missionLocal = `
      const evidenceDir = path.join(missionDir, 'evidence');
      const receiptId = 'EVD-TASK-1';
      fs.writeFileSync(path.join(evidenceDir, receiptId + '.json'), '{}');
    `;
    assert.equal(sourceWritesCanonicalEvd(missionLocal), false);
  });

  it('inventory note mentions scripts+bin scope', () => {
    const inv = inventoryCanonicalEvdWriters(rootDir);
    assert.match(inv.note, /scripts/);
    assert.match(inv.note, /bin/);
    assert.match(inv.note, /sealEvd/);
  });

  it('former L3 suspects no longer raw-write (routed via sealEvd)', () => {
    const suspects = [
      'scripts/run-engineering-loop.js',
      'bin/eos-orchestrator.js',
      'scripts/exam-clean-clone.js'
    ];
    for (const rel of suspects) {
      const text = fs.readFileSync(path.join(rootDir, rel), 'utf8');
      assert.match(text, /sealEvd/, `${rel} must import/call sealEvd`);
      assert.equal(
        sourceWritesCanonicalEvd(text),
        false,
        `${rel} must not match raw canonical EVD write detector`
      );
    }
  });
});