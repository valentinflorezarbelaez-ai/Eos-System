import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EvidenceCustody,
  EvidenceCustodyError,
  CUSTODY_EVENT_TYPES
} from '../src/core/sdd/evidence-custody.js';
import {
  sealEvd,
  denyEvdBypass,
  auditCanonicalEvdWritePaths,
  inventoryCanonicalEvdWriters,
  sourceWritesCanonicalEvd,
  CANONICAL_EVD_SEAL_MODULE
} from '../src/core/sdd/evd-seal-path.js';
import { ContractEvidenceSealer } from '../src/core/formal/contract-evidence-sealer.js';
import { EOSKernel } from '../src/core/kernel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('G7 EVD custody seal path', () => {
  let tempRoot;
  let custodyDir;
  let evidenceDir;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-g7-'));
    custodyDir = path.join(tempRoot, '.eos', 'custody');
    evidenceDir = path.join(tempRoot, 'docs', 'evidence');
    fs.mkdirSync(custodyDir, { recursive: true });
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('sealEvd writes EVD + advances EvidenceCustody', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const sealed = sealEvd({
      controlPlaneRoot: tempRoot,
      evidenceDir,
      custody,
      record: {
        id: 'EVD-G7-0001',
        status: 'VERIFIED',
        sha256: 'sha256-g7-test',
        related_spec: 'docs/specs/SPEC-G7.md'
      }
    });
    assert.equal(sealed.evidence_id, 'EVD-G7-0001');
    assert.ok(fs.existsSync(sealed.path));
    assert.ok(sealed.custody_event);
    assert.equal(sealed.custody_event.event_type, CUSTODY_EVENT_TYPES.EVD_SEALED);
    assert.equal(custody.verify().count, 1);
  });

  it('sealEvd without custody DENY (fail-closed)', () => {
    assert.throws(
      () =>
        sealEvd({
          controlPlaneRoot: tempRoot,
          evidenceDir,
          custodyEnabled: false,
          record: { id: 'EVD-G7-DENY', status: 'VERIFIED' }
        }),
      (err) => {
        assert.ok(err instanceof EvidenceCustodyError);
        assert.equal(err.code, 'EVD_CUSTODY_REQUIRED');
        return true;
      }
    );
    assert.equal(fs.existsSync(path.join(evidenceDir, 'EVD-G7-DENY.json')), false);
  });

  it('denyEvdBypass throws EVD_BYPASS_DENY', () => {
    assert.throws(
      () => denyEvdBypass({ reason: 'raw writeFileSync' }),
      (err) => err.code === 'EVD_BYPASS_DENY'
    );
  });

  it('ContractEvidenceSealer non-dryRun advances custody via sealEvd', () => {
    const specsDir = path.join(tempRoot, 'docs', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(
      path.join(specsDir, 'SPEC-G7-SEAL.md'),
      '# SPEC\nWHEN sealed via sealer, the system SHALL chain custody.\n',
      'utf8'
    );
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const sealer = new ContractEvidenceSealer({
      controlPlaneRoot: tempRoot,
      evidenceDir,
      specsDir,
      custody
    });
    const sealed = sealer.sealContractEvidence({
      specId: 'SPEC-G7-SEAL',
      exitCode: 0,
      stdout: 'ok',
      dryRun: false
    });
    assert.equal(sealed.success, true);
    assert.ok(sealed.custody_event);
    assert.equal(custody.verify().count, 1);
  });

  it('EOSKernel.generarReciboEvidencia routes through custody', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const kernel = new EOSKernel({ rootPath: tempRoot });
    kernel.custody = custody;
    kernel.custodyBaseDir = custodyDir;
    kernel.evidenceDir = evidenceDir;

    const result = kernel.generarReciboEvidencia('EVD-G7-KERNEL', 'G7_TEST', { n: 1 });
    assert.ok(result.ruta);
    assert.ok(fs.existsSync(result.ruta));
    assert.ok(result.custody_event);
    assert.equal(custody.verify().count, 1);
  });

  it('static audit: repo has no canonical EVD bypass writers', () => {
    const audit = auditCanonicalEvdWritePaths(rootDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.violations));
    assert.ok(audit.sanctioned.includes(CANONICAL_EVD_SEAL_MODULE));
  });

  it('static audit detects synthetic bypass fixture', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-g7-audit-'));
    const bypassDir = path.join(fixtureRoot, 'src', 'core');
    fs.mkdirSync(bypassDir, { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'core', 'sdd'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, CANONICAL_EVD_SEAL_MODULE),
      'export function sealEvd() {}\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(bypassDir, 'evil-bypass.js'),
      `
import fs from 'node:fs';
import path from 'node:path';
export function bad() {
  const evidenceDir = path.join(root, 'docs', 'evidence');
  const evdId = 'EVD-BAD';
  fs.writeFileSync(path.join(evidenceDir, \`\${evdId}.json\`), '{}');
}
`.trim() + '\n',
      'utf8'
    );
    const audit = auditCanonicalEvdWritePaths(fixtureRoot);
    assert.equal(audit.ok, false);
    assert.ok(audit.violations.some((v) => v.path.endsWith('evil-bypass.js')));
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('sourceWritesCanonicalEvd ignores mission-local evidence writers', () => {
    const missionLocal = `
      const evidenceDir = path.join(missionDir, 'evidence');
      const receiptId = 'EVD-TASK-1';
      fs.writeFileSync(path.join(evidenceDir, receiptId + '.json'), '{}');
    `;
    assert.equal(sourceWritesCanonicalEvd(missionLocal), false);
  });

  it('inventory helper returns SSOT note', () => {
    const inv = inventoryCanonicalEvdWriters(rootDir);
    assert.equal(inv.ssot, CANONICAL_EVD_SEAL_MODULE);
    assert.match(inv.note, /sealEvd/);
  });
});
