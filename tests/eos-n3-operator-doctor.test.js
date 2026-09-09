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
  DOCTOR_WIRING_PATHS
} from '../src/core/runtime/operator-doctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function writeStubTree(root, { omitRel = null } = {}) {
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
    'scripts/lib/hooks-install-smoke.js',
    'scripts/lib/mcp-catalog-lock.js',
    'tests/eos-p4-mission-local-evd-seal.test.js',
    'src/core/runtime/mission-artifact-write.js',
    'scripts/lib/p6-inventory-lock.js',
    'src/core/runtime/operator-doctor.js',
    'EOS-MISSION-CONTROL/CURRENT_MISSION.json'
  ];
  for (const rel of files) {
    if (omitRel && rel === omitRel) continue;
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (rel.endsWith('.json')) {
      fs.writeFileSync(abs, '{"mission_id":"N3-TEST"}');
    } else {
      fs.writeFileSync(abs, '// stub\n');
    }
  }
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        name: 'eos-n3-fixture',
        type: 'module',
        scripts: { 'eos:doctor': 'node bin/eos-doctor.js' }
      },
      null,
      2
    )
  );
  fs.mkdirSync(path.join(root, '.cursor'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.cursor', 'mcp.json'),
    JSON.stringify({
      mcpServers: {
        'eos-local': {
          command: 'node',
          args: [path.join(root, 'src', 'mcp-server.js')],
          cwd: root
        }
      }
    })
  );
}

describe('N3 operator doctor wire + fusion checks', () => {
  it('POST_FUSION_CRITICAL_PATHS covers verify/fusion-cp/custody/engram/evd-seal/pre-push + Q3 L4 + R3 L5', () => {
    const ids = POST_FUSION_CRITICAL_PATHS.map((p) => p.id);
    assert.deepEqual(ids, [
      'VERIFY',
      'FUSION_CP',
      'CUSTODY',
      'ENGRAM',
      'EVD_SEAL',
      'PRE_PUSH',
      'HOOKS_INSTALL',
      'MCP_CATALOG',
      'MISSION_LOCAL_EVD',
      'MISSION_ARTIFACT_WRITE',
      'P6_INVENTORY_LOCK'
    ]);
    const rels = POST_FUSION_CRITICAL_PATHS.map((p) => p.rel);
    assert.ok(rels.includes('scripts/verify-eos.js'));
    assert.ok(rels.includes('scripts/lib/fusion-cp-lock.js'));
    assert.ok(rels.includes('src/core/sdd/evidence-custody.js'));
    assert.ok(rels.includes('src/core/memory/engram-contract.js'));
    assert.ok(rels.includes('src/core/sdd/evd-seal-path.js'));
    assert.ok(rels.includes('scripts/pre-push-hook.js'));
    assert.ok(rels.includes('scripts/lib/hooks-install-smoke.js'));
    assert.ok(rels.includes('scripts/lib/mcp-catalog-lock.js'));
    assert.ok(rels.includes('tests/eos-p4-mission-local-evd-seal.test.js'));
    assert.ok(rels.includes('src/core/runtime/mission-artifact-write.js'));
    assert.ok(rels.includes('scripts/lib/p6-inventory-lock.js'));
  });

  it('repo tip: doctor PASS with post-fusion + wiring checks present', () => {
    const report = runOperatorDoctor({
      root: rootDir,
      skipPurpose: true,
      skipMcpFile: true
    });
    assert.equal(report.ok, true, JSON.stringify(report.failed));
    for (const item of POST_FUSION_CRITICAL_PATHS) {
      const row = report.checks.find((c) => c.id === item.id);
      assert.ok(row, `missing check ${item.id}`);
      assert.equal(row.ok, true, `${item.id} failed: ${row.detail}`);
    }
    for (const item of DOCTOR_WIRING_PATHS) {
      const row = report.checks.find((c) => c.id === item.id);
      assert.ok(row, `missing wiring check ${item.id}`);
      assert.equal(row.ok, true, `${item.id} failed: ${row.detail}`);
    }
    const script = report.checks.find((c) => c.id === 'EOS_DOCTOR_SCRIPT');
    assert.ok(script && script.ok, 'eos:doctor package script missing');
  });

  it('fail-closed when a critical post-fusion path is missing', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n3-doctor-'));
    writeStubTree(fixture, { omitRel: 'src/core/sdd/evd-seal-path.js' });
    const report = runOperatorDoctor({
      root: fixture,
      skipPurpose: true,
      skipRuntimeEngines: true
    });
    assert.equal(report.ok, false);
    assert.ok(report.failed.includes('EVD_SEAL'), JSON.stringify(report.failed));
    fs.rmSync(fixture, { recursive: true, force: true });
  });

  it('fail-closed when PRE_PUSH missing', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n3-prepush-'));
    writeStubTree(fixture, { omitRel: 'scripts/pre-push-hook.js' });
    const report = runOperatorDoctor({
      root: fixture,
      skipPurpose: true,
      skipRuntimeEngines: true
    });
    assert.equal(report.ok, false);
    assert.ok(report.failed.includes('PRE_PUSH'));
    fs.rmSync(fixture, { recursive: true, force: true });
  });

  it('bin/eos-doctor.js and package eos:doctor script exist', () => {
    assert.equal(fs.existsSync(path.join(rootDir, 'bin', 'eos-doctor.js')), true);
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['eos:doctor'] || pkg.scripts.doctor);
    assert.match(pkg.scripts['eos:doctor'] || '', /eos-doctor/);
  });

  it('formatDoctorReport includes VERDICT and post-fusion ids', () => {
    const report = runOperatorDoctor({
      root: rootDir,
      skipPurpose: true,
      skipMcpFile: true
    });
    const text = formatDoctorReport(report);
    assert.match(text, /EOS DOCTOR/);
    assert.match(text, /VERDICT:/);
    assert.match(text, /FUSION_CP/);
    assert.match(text, /EVD_SEAL/);
  });

  it('verify:strict REQUIRED_PATHS locks doctor bin + module', () => {
    const verifySrc = fs.readFileSync(
      path.join(rootDir, 'scripts', 'verify-eos.js'),
      'utf8'
    );
    assert.match(verifySrc, /bin\/eos-doctor\.js/);
    assert.match(verifySrc, /src\/core\/runtime\/operator-doctor\.js/);
  });

  it('HUD observes doctor wiring (optional OBSERVED section)', async () => {
    const hud = await import('../src/core/observability/operator-hud.js');
    const snap = hud.collectOperatorHud({
      baseDir: rootDir,
      skipVerify: true,
      liveHead: 'deadbeef'
    });
    assert.ok(snap.doctor, 'doctor field missing on HUD snapshot');
    assert.equal(snap.doctor.epistemic, hud.HUD_EPISTEMIC.OBSERVED);
    assert.equal(snap.doctor.bin_present, true);
    assert.equal(snap.doctor.module_present, true);
    assert.equal(snap.doctor.script_present, true);
    const text = hud.renderOperatorHud(snap);
    assert.match(text, /DOCTOR/);
    assert.match(text, /eos-doctor/);
  });
});
