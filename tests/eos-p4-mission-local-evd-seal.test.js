import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EvidenceCustody,
  CUSTODY_EVENT_TYPES
} from '../src/core/sdd/evidence-custody.js';
import {
  sealEvd,
  auditCanonicalEvdWritePaths,
  auditMissionLocalEvdWritePaths,
  sourceWritesMissionLocalEvd,
  sourceWritesCanonicalEvd,
  inventoryCanonicalEvdWriters,
  CANONICAL_EVD_SEAL_MODULE
} from '../src/core/sdd/evd-seal-path.js';
import { McpMissionBridge } from '../src/core/mcp/mcp-mission-bridge.js';
import { GovernedTaskExecutor } from '../src/core/runtime/governed-task-executor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('P4 mission-local EVD seal / custody', () => {
  let tempRoot;
  let custodyDir;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-p4-'));
    custodyDir = path.join(tempRoot, '.eos', 'custody');
    fs.mkdirSync(custodyDir, { recursive: true });
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('repo mission-local audit ok (bridge+executor use sealEvd)', () => {
    const audit = auditMissionLocalEvdWritePaths(rootDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.violations));
    assert.equal(audit.scope, 'mission-local');
    assert.ok(audit.sanctioned.includes(CANONICAL_EVD_SEAL_MODULE));
    const violPaths = (audit.violations || []).map((v) => v.path);
    assert.equal(violPaths.includes('src/core/mcp/mcp-mission-bridge.js'), false);
    assert.equal(violPaths.includes('src/core/runtime/governed-task-executor.js'), false);
  });

  it('canonical audit still green (no false DENY)', () => {
    const audit = auditCanonicalEvdWritePaths(rootDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.violations));
  });

  it('sourceWritesCanonicalEvd still ignores mission-local patterns', () => {
    const missionLocal = `
      const evidenceDir = path.join(missionDir, 'evidence');
      const receiptId = 'EVD-TASK-1';
      fs.writeFileSync(path.join(evidenceDir, receiptId + '.json'), '{}');
    `;
    assert.equal(sourceWritesCanonicalEvd(missionLocal), false);
    assert.equal(sourceWritesMissionLocalEvd(missionLocal), true);
  });

  it('sourceWritesMissionLocalEvd ignores task/manifest-only writes', () => {
    const taskOnly = `
      const evidenceDir = path.join(missionDir, 'evidence');
      const receiptId = 'EVD-TASK-1';
      fs.writeFileSync(taskFile, JSON.stringify(taskContract), 'utf8');
      fs.writeFileSync(manifestFile, JSON.stringify(manifest), 'utf8');
    `;
    assert.equal(sourceWritesMissionLocalEvd(taskOnly), false);
  });

  it('sourceWritesMissionLocalEvd ignores sealEvd callers without evidence writeFileSync', () => {
    const sealedCaller = `
      import { sealEvd } from '../sdd/evd-seal-path.js';
      const evidenceDir = path.join(missionDir, 'evidence');
      const receiptId = 'EVD-OK';
      const sealed = sealEvd({ evidenceDir, record: { id: receiptId }, custody });
      fs.writeFileSync(taskFile, '{}', 'utf8');
    `;
    assert.equal(sourceWritesMissionLocalEvd(sealedCaller), false);
  });

  it('static audit detects synthetic mission-local bypass', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-p4-audit-'));
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'core', 'sdd'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, CANONICAL_EVD_SEAL_MODULE),
      'export function sealEvd() {}\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'src', 'core', 'evil-mission-bypass.js'),
      `
import fs from 'node:fs';
import path from 'node:path';
export function bad(missionDir) {
  const evidenceDir = path.join(missionDir, 'evidence');
  const receiptId = 'EVD-BAD-MISSION';
  const evidenceFile = path.join(evidenceDir, receiptId + '.json');
  fs.writeFileSync(evidenceFile, '{}');
}
`.trim() + '\n',
      'utf8'
    );
    const audit = auditMissionLocalEvdWritePaths(fixtureRoot);
    assert.equal(audit.ok, false);
    assert.ok(
      audit.violations.some((v) => v.path === 'src/core/evil-mission-bypass.js'),
      JSON.stringify(audit.violations)
    );
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('McpMissionBridge.recordEvidence routes through sealEvd + custody', () => {
    const missionId = 'MIS-P4-BRIDGE';
    const missionDir = path.join(tempRoot, '.missions', missionId);
    fs.mkdirSync(missionDir, { recursive: true });
    fs.writeFileSync(
      path.join(missionDir, 'mission-package.json'),
      JSON.stringify({ mission_id: missionId, status: 'active' }),
      'utf8'
    );

    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const bridge = new McpMissionBridge({
      baseDir: tempRoot,
      custody,
      custodyBaseDir: custodyDir
    });

    const result = bridge.recordEvidence({
      missionId,
      id: 'EVD-P4-BRIDGE-001',
      payload: { p4: true }
    });

    assert.ok(result.path);
    assert.ok(fs.existsSync(result.path));
    assert.ok(result.path.includes(path.join('.missions', missionId, 'evidence')));
    assert.ok(result.custody_event);
    assert.equal(result.custody_event.event_type, CUSTODY_EVENT_TYPES.EVD_SEALED);
    assert.equal(custody.verify().count, 1);
    assert.equal(result.evidence.id, 'EVD-P4-BRIDGE-001');
  });

  it('GovernedTaskExecutor evidence write routes through sealEvd + custody', async () => {
    const missionId = 'MIS-P4-EXEC';
    const missionDir = path.join(tempRoot, '.missions', missionId);
    const tasksDir = path.join(missionDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(missionDir, 'direction.json'),
      JSON.stringify({ authority_level: 'LEVEL_1', project_path: missionDir }),
      'utf8'
    );
    const taskId = 'TASK-P4-01';
    fs.writeFileSync(
      path.join(tasksDir, taskId + '.json'),
      JSON.stringify({
        schema_version: '1.0.0',
        task_id: taskId,
        mission_id: missionId,
        objective: 'P4 seal path smoke',
        status: 'approved',
        assigned_role: 'ENGINEER',
        budget: { max_duration_seconds: 30 }
      }),
      'utf8'
    );

    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const executor = new GovernedTaskExecutor({
      controlPlaneRoot: tempRoot,
      custody,
      custodyBaseDir: custodyDir
    });
    executor.validator = {
      assertValid() {
        return true;
      }
    };

    const result = await executor.executeTask(missionDir, taskId, {
      runner: async () => ({ exitCode: 0, stdout: 'ok', stderr: '' })
    });

    assert.equal(result.exitCode, 0);
    assert.ok(result.evidenceReceipt);
    assert.ok(result.evidencePath);
    assert.ok(fs.existsSync(result.evidencePath));
    assert.ok(result.evidencePath.includes(path.join('.missions', missionId, 'evidence')));
    assert.ok(result.custody_event);
    assert.equal(result.custody_event.event_type, CUSTODY_EVENT_TYPES.EVD_SEALED);
    assert.equal(custody.verify().count, 1);
  });

  it('sealEvd can target mission-local evidenceDir', () => {
    const evidenceDir = path.join(tempRoot, '.missions', 'MIS-X', 'evidence');
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const sealed = sealEvd({
      controlPlaneRoot: tempRoot,
      evidenceDir,
      custody,
      record: { id: 'EVD-P4-DIRECT', status: 'RECORDED', sha256: 'abc' }
    });
    assert.ok(fs.existsSync(sealed.path));
    assert.ok(sealed.path.startsWith(evidenceDir));
    assert.equal(custody.verify().count, 1);
  });

  it('inventory note mentions P4 mission-local', () => {
    const inv = inventoryCanonicalEvdWriters(rootDir);
    assert.match(inv.note, /P4|Mission-local/i);
  });

  it('package script test:p4 exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:p4'], 'node --test tests/eos-p4-mission-local-evd-seal.test.js');
  });
});
