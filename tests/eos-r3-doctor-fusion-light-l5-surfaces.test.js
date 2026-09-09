import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runOperatorDoctor,
  formatDoctorReport,
  POST_FUSION_CRITICAL_PATHS,
  DOCTOR_NON_CLAIMS
} from '../src/core/runtime/operator-doctor.js';
import {
  auditFusionLight,
  FUSION_LIGHT_PATH_IDS,
  FUSION_LIGHT_REQUIRED_PATHS,
  FUSION_LIGHT_NON_CLAIMS
} from '../scripts/lib/independent-fusion-light.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const L5_DOCTOR_IDS = ['MISSION_ARTIFACT_WRITE', 'P6_INVENTORY_LOCK'];
const L5_FUSION_LIGHT_IDS = ['MISSION_ARTIFACT_WRITE', 'P6_INVENTORY_LOCK'];

describe('R3 doctor / fusion-light Ladder5 lock surfaces', () => {
  it('POST_FUSION_CRITICAL_PATHS observes mission-artifact-write + p6-inventory-lock', () => {
    const ids = POST_FUSION_CRITICAL_PATHS.map((p) => p.id);
    for (const id of L5_DOCTOR_IDS) {
      assert.ok(ids.includes(id), `doctor missing L5 id ${id}`);
    }
    const byId = Object.fromEntries(POST_FUSION_CRITICAL_PATHS.map((p) => [p.id, p.rel]));
    assert.equal(byId.MISSION_ARTIFACT_WRITE, 'src/core/runtime/mission-artifact-write.js');
    assert.equal(byId.P6_INVENTORY_LOCK, 'scripts/lib/p6-inventory-lock.js');
  });

  it('DOCTOR_NON_CLAIMS asserts doctor ≠ verify:strict and PRODUCTION_READY=NO', () => {
    assert.ok(Array.isArray(DOCTOR_NON_CLAIMS) && DOCTOR_NON_CLAIMS.length >= 2);
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /PRODUCTION_READY/i.test(n)));
    assert.ok(
      DOCTOR_NON_CLAIMS.some((n) => /mission-artifact-write|p6-inventory/i.test(n)),
      'NON-CLAIM should mention L5 surfaces are not full verify audits'
    );
  });

  it('repo tip: doctor PASS includes L5 surface checks', () => {
    const report = runOperatorDoctor({
      root: rootDir,
      skipPurpose: true,
      skipMcpFile: true
    });
    assert.equal(report.ok, true, JSON.stringify(report.failed));
    for (const id of L5_DOCTOR_IDS) {
      const row = report.checks.find((c) => c.id === id);
      assert.ok(row, `missing doctor check ${id}`);
      assert.equal(row.ok, true, `${id} failed: ${row.detail}`);
    }
    const text = formatDoctorReport(report);
    assert.match(text, /MISSION_ARTIFACT_WRITE/);
    assert.match(text, /P6_INVENTORY_LOCK/);
    assert.match(text, /NON-CLAIM|not verify:strict/i);
  });

  it('fail-closed when MISSION_ARTIFACT_WRITE path missing', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r3-maw-'));
    try {
      const files = [
        'bin/eos.js',
        'bin/eos-doctor.js',
        'src/mcp-server.js',
        'scripts/verify-eos.js',
        'scripts/lib/fusion-cp-lock.js',
        'src/core/sdd/evidence-custody.js',
        'src/core/memory/engram-contract.js',
        'src/core/sdd/evd-seal-path.js',
        'scripts/pre-push-hook.js',
        'src/core/runtime/operator-doctor.js',
        'scripts/lib/hooks-install-smoke.js',
        'scripts/lib/mcp-catalog-lock.js',
        'tests/eos-p4-mission-local-evd-seal.test.js',
        'scripts/lib/p6-inventory-lock.js',
        'EOS-MISSION-CONTROL/CURRENT_MISSION.json'
      ];
      for (const rel of files) {
        const abs = path.join(fixture, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, rel.endsWith('.json') ? '{"mission_id":"R3"}' : '// stub\n');
      }
      fs.writeFileSync(
        path.join(fixture, 'package.json'),
        JSON.stringify({ name: 'eos-r3', type: 'module', scripts: { 'eos:doctor': 'node bin/eos-doctor.js' } })
      );
      fs.mkdirSync(path.join(fixture, '.cursor'), { recursive: true });
      fs.writeFileSync(
        path.join(fixture, '.cursor', 'mcp.json'),
        JSON.stringify({ mcpServers: { 'eos-local': { command: 'node', args: ['src/mcp-server.js'], cwd: fixture } } })
      );
      const report = runOperatorDoctor({
        root: fixture,
        skipPurpose: true,
        skipRuntimeEngines: true
      });
      assert.equal(report.ok, false);
      assert.ok(report.failed.includes('MISSION_ARTIFACT_WRITE'), JSON.stringify(report.failed));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('FUSION_LIGHT_PATH_IDS optional L5 subset includes mission-artifact + p6-inventory', () => {
    for (const id of L5_FUSION_LIGHT_IDS) {
      assert.ok(FUSION_LIGHT_PATH_IDS.includes(id), `fusion-light missing L5 id ${id}`);
    }
    const doctorRels = POST_FUSION_CRITICAL_PATHS
      .filter((p) => FUSION_LIGHT_PATH_IDS.includes(p.id))
      .map((p) => p.rel);
    assert.deepEqual([...FUSION_LIGHT_REQUIRED_PATHS], doctorRels);
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('src/core/runtime/mission-artifact-write.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/p6-inventory-lock.js'));
  });

  it('auditFusionLight PASS on tip with L5 light checks + NON-CLAIM residual', () => {
    const result = auditFusionLight(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mission-artifact'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-p6-inventory'));
    assert.ok(result.nonClaims.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(
      FUSION_LIGHT_NON_CLAIMS.some((n) => /mission-artifact-write|p6-inventory/i.test(n)) ||
        result.nonClaims.some((n) => /mission-artifact-write|p6-inventory/i.test(n)),
      'NON-CLAIM should mention L5 observe is not full verify lock'
    );
  });

  it('package.json exposes test:r3', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:r3'],
      'node --test tests/eos-r3-doctor-fusion-light-l5-surfaces.test.js'
    );
  });

  it('verify-eos REQUIRED_PATHS locks R3 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /tests\/eos-r3-doctor-fusion-light-l5-surfaces\.test\.js/);
    assert.match(src, /EOS_R3_DOCTOR_FUSION_LIGHT_L5_SURFACES_2026-09-09\.md/);
  });

  it('Spanish release evidence exists with NON-CLAIM + PRODUCTION_READY=NO', () => {
    const notePath = path.join(
      rootDir,
      'docs',
      'releases',
      'EOS_R3_DOCTOR_FUSION_LIGHT_L5_SURFACES_2026-09-09.md'
    );
    assert.equal(fs.existsSync(notePath), true);
    const note = fs.readFileSync(notePath, 'utf8');
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-r3-doctor-fusion-light-l5-surfaces/);
    assert.match(note, /doctor/i);
    assert.match(note, /fusion-light/i);
    assert.match(note, /mission-artifact-write|MISSION_ARTIFACT_WRITE/);
    assert.match(note, /p6-inventory-lock|P6_INVENTORY_LOCK/);
    assert.match(note, /NON-CLAIM|no es verify:strict|≠ verify:strict|no equivale/i);
    assert.match(note, /Fundaci[oó]n|Delta\s*=\s*0/i);
    assert.match(note, /\b(Objetivo|Alcance|Entregables|Verificaci[oó]n|No-claims|Dictamen)\b/i);
  });
});
