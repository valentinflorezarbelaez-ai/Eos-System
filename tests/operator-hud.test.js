import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function loadHud() {
  return import('../src/core/observability/operator-hud.js');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function makeFixtureWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-hud-'));
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/CURRENT_MISSION.json'), {
    mission_id: 'EOS-HUD-FIXTURE',
    status: 'EXAMS_MEASURED_NOT_OPERATIONALLY_COMPLETE',
    updated_at: '2026-08-27T00:27:11.265Z',
    dictamen: {
      COMPLETE_FOR_LOCAL_GOVERNED_USE: 'PRIOR_CLAIM_NOT_REIMPORTED',
      PRODUCTION_READY: 'NO'
    },
    progress_summary: { total: 3, verified: 2, pending: 0, blocked: 1 },
    evidence: { tests_full: '721/725', strict_verifier: '471/471' }
  });
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/CURRENT_STATE.json'), {
    test_health: '726 / 726 PASS',
    strict_checks: '471 / 471 PASS',
    updated_at: '2026-08-15T12:44:00-05:00'
  });
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/INCIDENTS.json'), {
    open_incidents_count: 0,
    incidents: []
  });
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/BUDGET.json'), {
    budget_status: 'WITHIN_BUDGET_NORMAL'
  });
  writeText(
    path.join(dir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md'),
    'dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE\nPRODUCTION_READY: NO\n'
  );
  writeText(
    path.join(dir, 'docs/releases/RELEASE_CAPABILITY_MATRIX.md'),
    'COMPLETE_FOR_LOCAL_GOVERNED_USE: YES\nPRODUCTION_READY: NO\n'
  );
  writeJson(path.join(dir, 'docs/evidence/EVD-0046.json'), {
    id: 'EVD-0046',
    status: 'VERIFIED',
    timestamp: '2026-09-04T05:47:28Z'
  });
  writeText(
    path.join(dir, 'docs/evidence/canonical_e2e_openspec_tdd_2026/OPERATOR_REPORT.md'),
    '# Operator report\n'
  );
  return dir;
}

function sampleVerifyReport({ passed = 12, failed = 0 } = {}) {
  const checks = [];
  const failures = [];
  for (let i = 0; i < passed; i += 1) {
    checks.push({ path: `ok-${i}`, status: 'VERIFIED', type: i === 0 ? 'l0-purity' : 'existence' });
  }
  checks.push({ path: 'src/core/sdd/organic-routing-gate.js', status: 'VERIFIED', type: 'organic-gate' });
  checks.push({ path: 'src/core/sdd/tdd-evidence-receipt.js', status: 'VERIFIED', type: 'tdd-receipts' });
  checks.push({ path: 'docs/evidence/tdd', status: 'VERIFIED', type: 'tdd-receipts' });
  checks.push({ path: 'src/core/governance/rdd-review-stance.js', status: 'VERIFIED', type: 'rdd-stance' });
  for (let i = 0; i < failed; i += 1) {
    failures.push({ path: `fail-${i}`, message: 'boom', type: 'existence' });
  }
  return {
    status: failed > 0 ? 'FAIL' : 'PASS',
    strictMode: true,
    timestamp: '2026-09-04T17:00:00.000Z',
    checks,
    failures,
    warnings: []
  };
}

test('HUD aggregator reports this-run verify counts, not hardcoded slogans', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'abc1234', branch: 'cursor/hud-test' },
    verifyReport: sampleVerifyReport({ passed: 12, failed: 1 })
  });

  assert.equal(snapshot.git.head_short, 'abc1234');
  assert.equal(snapshot.git.branch, 'cursor/hud-test');
  assert.equal(snapshot.git.epistemic, 'VERIFIED');
  assert.equal(snapshot.verify.passed, 16); // 12 existence/l0 + 4 typed surfaces
  assert.equal(snapshot.verify.failed, 1);
  assert.equal(snapshot.verify.epistemic, 'VERIFIED');
  assert.equal(snapshot.verify.surfaces['organic-gate'].status, 'VERIFIED');
  assert.equal(snapshot.verify.surfaces['tdd-receipts'].status, 'VERIFIED');
  assert.equal(snapshot.verify.surfaces['rdd-stance'].status, 'VERIFIED');
  assert.equal(snapshot.verify.surfaces['l0-purity'].status, 'VERIFIED');

  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /abc1234/);
  assert.match(text, /passed=16/);
  assert.match(text, /failed=1/);
  assert.doesNotMatch(text, /1440\s+tests/i);
  assert.doesNotMatch(text, /482\s+checks/i);
});

test('HUD labels mission and readiness as OBSERVED with source paths', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'deadbee', branch: 'main' },
    verifyReport: sampleVerifyReport()
  });

  assert.equal(snapshot.mission.epistemic, 'OBSERVED');
  assert.equal(snapshot.mission.id, 'EOS-HUD-FIXTURE');
  assert.equal(snapshot.mission.status, 'EXAMS_MEASURED_NOT_OPERATIONALLY_COMPLETE');
  assert.match(snapshot.mission.source, /CURRENT_MISSION\.json/);

  const prod = snapshot.readiness.PRODUCTION_READY;
  assert.ok(prod.observations.length >= 2);
  for (const row of prod.observations) {
    assert.equal(row.epistemic, 'OBSERVED');
    assert.ok(row.source);
    assert.equal(row.value, 'NO');
  }

  const local = snapshot.readiness.COMPLETE_FOR_LOCAL_GOVERNED_USE;
  const values = local.observations.map((row) => row.value);
  assert.ok(values.includes('PRIOR_CLAIM_NOT_REIMPORTED'));
  assert.ok(values.includes('YES') || values.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'));

  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /OBSERVED/);
  assert.match(text, /CURRENT_MISSION\.json/);
  assert.match(text, /PRODUCTION_READY/);
});

test('HUD surfaces error budget, last EVD, and canonical E2E pointer as OBSERVED', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'cafebad', branch: 'main' },
    verifyReport: sampleVerifyReport({ failed: 2 })
  });

  assert.equal(snapshot.error_budget.epistemic, 'OBSERVED');
  assert.equal(snapshot.error_budget.open_incidents, 0);
  assert.equal(snapshot.error_budget.mission_blocked, 1);
  assert.equal(snapshot.error_budget.verify_failures, 2);
  assert.ok(snapshot.error_budget.blockers.length >= 1);

  assert.equal(snapshot.evidence.last_evd.id, 'EVD-0046');
  assert.equal(snapshot.evidence.last_evd.epistemic, 'OBSERVED');
  assert.equal(snapshot.evidence.canonical_e2e.present, true);
  assert.match(snapshot.evidence.canonical_e2e.path, /canonical_e2e_openspec_tdd_2026/);
});

test('missing mission and skipped verify are NOT VERIFIED', async () => {
  const hud = await loadHud();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-hud-empty-'));
  const snapshot = hud.collectOperatorHud({
    baseDir: dir,
    gitIdentity: { head_short: '0000000', branch: 'orphan' },
    skipVerify: true
  });
  assert.equal(snapshot.verify.epistemic, 'NOT VERIFIED');
  assert.equal(snapshot.mission.epistemic, 'NOT VERIFIED');
  assert.equal(snapshot.evidence.canonical_e2e.present, false);
  assert.equal(snapshot.evidence.canonical_e2e.epistemic, 'NOT VERIFIED');
});

test('dated file claims keep source path and are not treated as live verify', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'feedfac', branch: 'main' },
    verifyReport: sampleVerifyReport({ passed: 3, failed: 0 })
  });
  const claims = snapshot.file_claims;
  assert.ok(claims.some((c) => c.source.includes('CURRENT_STATE.json')));
  for (const claim of claims) {
    assert.equal(claim.epistemic, 'DATED_FILE_CLAIM');
    assert.ok(claim.source);
  }
  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /DATED_FILE_CLAIM/);
  assert.match(text, /CURRENT_STATE\.json/);
  assert.notEqual(String(snapshot.verify.passed), '471');
});

test('unattributed stale slogans are refused', async () => {
  const hud = await loadHud();
  assert.throws(
    () => hud.assertHudTextHonest('Workspace healthy: 1440 tests all green'),
    (err) => err && err.code === 'STALE_CLAIM_REFUSED'
  );
  assert.throws(
    () => hud.assertHudTextHonest('Verifier: 482 checks passed'),
    (err) => err && err.code === 'STALE_CLAIM_REFUSED'
  );
  assert.doesNotThrow(() =>
    hud.assertHudTextHonest('historical 1440 tests source: docs/evidence/old.md')
  );
});

test('operator-hud source does not hardcode stale 1440/482 slogans', () => {
  const src = fs.readFileSync(path.join(rootDir, 'src/core/observability/operator-hud.js'), 'utf8');
  assert.doesNotMatch(src, /1440 tests/);
  assert.doesNotMatch(src, /482 checks/);
});

test('optional JSON snapshot writes under .eos without sealing evidence', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const dest = path.join(baseDir, '.eos/operator-hud.json');
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'a1b2c3d', branch: 'hud' },
    verifyReport: sampleVerifyReport(),
    snapshotPath: dest
  });
  const written = hud.writeHudSnapshot(snapshot, dest);
  assert.equal(written, dest);
  assert.equal(fs.existsSync(dest), true);
  const parsed = JSON.parse(fs.readFileSync(dest, 'utf8'));
  assert.equal(parsed.schema, 'eos.operator-hud.v1');
  assert.equal(parsed.git.head_short, 'a1b2c3d');
  assert.equal(fs.existsSync(path.join(baseDir, 'docs/evidence/operator-hud.json')), false);
});

test('CLI bins and npm scripts exist; --help and --no-verify --json work', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['eos:hud'], 'node bin/eos-hud.js');
  assert.equal(pkg.scripts['eos:top'], 'node bin/eos-top.js');
  assert.equal(Object.hasOwn(pkg, 'dependencies'), false);
  assert.equal(Object.hasOwn(pkg, 'devDependencies'), false);

  for (const bin of ['bin/eos-hud.js', 'bin/eos-top.js']) {
    assert.equal(fs.existsSync(path.join(rootDir, bin)), true);
  }

  const help = spawnSync(process.execPath, ['bin/eos-hud.js', '--help'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /eos-hud/);
  assert.match(help.stdout, /VERIFIED|OBSERVED|NOT VERIFIED/);

  const jsonRun = spawnSync(process.execPath, ['bin/eos-hud.js', '--no-verify', '--json'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(jsonRun.status, 0, jsonRun.stderr);
  const payload = JSON.parse(jsonRun.stdout);
  assert.equal(payload.schema, 'eos.operator-hud.v1');
  assert.equal(payload.verify.epistemic, 'NOT VERIFIED');
  assert.ok(payload.git.head_short);
  assert.ok(payload.mission.id || payload.mission.epistemic === 'NOT VERIFIED');
});

test('verify-eos REQUIRED_PATHS include HUD aggregator and bins', () => {
  const verifier = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  for (const rel of [
    'src/core/observability/operator-hud.js',
    'bin/eos-hud.js',
    'bin/eos-top.js'
  ]) {
    assert.ok(verifier.includes(`'${rel}'`), `verify-eos REQUIRED_PATHS must include ${rel}`);
  }
});
