import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

/** Fixture verify JSON emitting post-fusion surface types (exact strings from verify-eos). */
function postFusionVerifyFixture({ failCustody = false } = {}) {
  const checks = [
    { path: 'src/core/sdd/organic-routing-gate.js', status: 'VERIFIED', type: 'organic-gate' },
    { path: 'src/core/sdd/tdd-evidence-receipt.js', status: 'VERIFIED', type: 'tdd-receipts' },
    { path: 'src/core/governance/rdd-review-stance.js', status: 'VERIFIED', type: 'rdd-stance' },
    { path: 'package.json', status: 'VERIFIED', type: 'l0-purity' },
    { path: 'src/core/sdd/evidence-custody.js', status: 'VERIFIED', type: 'evidence-custody' },
    { path: 'src/core/memory/engram-contract.js', status: 'VERIFIED', type: 'engram-contract' },
    { path: 'scripts/lib/fusion-cp-lock.js', status: 'VERIFIED', type: 'fusion-cp-lock' },
    { path: 'src/core/write-barrier', status: 'VERIFIED', type: 'fusion-cp-write-barrier' },
    { path: 'src/core/mission-loop', status: 'VERIFIED', type: 'fusion-cp-mission-loop' },
    { path: 'config/mcp/eos-mcp.ssot.json', status: 'VERIFIED', type: 'fusion-cp-mcp-ssot' },
    { path: 'scripts/roi5-long-run-gameday.js', status: 'VERIFIED', type: 'fusion-cp-gameday' }
  ];
  const failures = [];
  if (failCustody) {
    failures.push({
      path: 'src/core/sdd/evidence-custody.js',
      message: 'Custody chain DENY: fixture',
      type: 'evidence-custody'
    });
    // remove the passing custody check so surface shows FAIL with failed>0
    const idx = checks.findIndex((c) => c.type === 'evidence-custody');
    if (idx !== -1) checks.splice(idx, 1);
  }
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    strictMode: true,
    timestamp: '2026-09-08T20:00:00.000Z',
    checks,
    failures,
    warnings: []
  };
}

function makeFixtureWorkspace({ freezeTip = 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-m3-hud-'));
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/CURRENT_MISSION.json'), {
    mission_id: 'EOS-M3-HUD',
    status: 'EXAMS_MEASURED_NOT_OPERATIONALLY_COMPLETE',
    updated_at: '2026-09-08T20:00:00.000Z',
    dictamen: {
      COMPLETE_FOR_LOCAL_GOVERNED_USE: 'PRIOR_CLAIM_NOT_REIMPORTED',
      PRODUCTION_READY: 'NO'
    },
    progress_summary: { total: 1, verified: 1, pending: 0, blocked: 0 }
  });
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/CURRENT_STATE.json'), {
    test_health: 'n/a',
    strict_checks: 'n/a',
    updated_at: '2026-09-08T15:00:00-05:00'
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
    [
      '# Freeze gate status — PUBLISHED',
      '',
      '```text',
      `main_tip: ${freezeTip}`,
      'dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE',
      'PRODUCTION_READY: NO',
      '```',
      ''
    ].join('\n')
  );
  writeText(
    path.join(dir, 'docs/releases/RELEASE_CAPABILITY_MATRIX.md'),
    'COMPLETE_FOR_LOCAL_GOVERNED_USE: YES\nPRODUCTION_READY: NO\n'
  );
  return dir;
}

test('M3: VERIFY_SURFACE_TYPES includes post-fusion types from verify-eos (no invented names)', async () => {
  const hud = await loadHud();
  const required = [
    'organic-gate',
    'tdd-receipts',
    'rdd-stance',
    'l0-purity',
    'evidence-custody',
    'engram-contract',
    'fusion-cp-lock',
    'fusion-cp-write-barrier',
    'fusion-cp-mission-loop',
    'fusion-cp-mcp-ssot',
    'fusion-cp-gameday'
  ];
  for (const type of required) {
    assert.ok(hud.VERIFY_SURFACE_TYPES.includes(type), `missing surface type ${type}`);
  }
  // Guard: do not invent non-emitted names
  assert.equal(hud.VERIFY_SURFACE_TYPES.includes('fusion-cp'), false);
  assert.equal(hud.VERIFY_SURFACE_TYPES.includes('mission-loop'), false);
});

test('M3: HUD summarizes evidence-custody / engram-contract / fusion-cp-* from fixture verify JSON', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const report = postFusionVerifyFixture();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: {
      head_short: 'ed8d960',
      head_full: 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a',
      branch: 'cursor/eos-m3-hud-verify-surfaces'
    },
    liveHead: 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a',
    verifyReport: report
  });

  const surfaces = snapshot.verify.surfaces;
  assert.equal(surfaces['evidence-custody'].status, 'VERIFIED');
  assert.equal(surfaces['evidence-custody'].passed, 1);
  assert.equal(surfaces['engram-contract'].status, 'VERIFIED');
  assert.equal(surfaces['fusion-cp-lock'].status, 'VERIFIED');
  assert.equal(surfaces['fusion-cp-write-barrier'].status, 'VERIFIED');
  assert.equal(surfaces['fusion-cp-mission-loop'].status, 'VERIFIED');
  assert.equal(surfaces['fusion-cp-mcp-ssot'].status, 'VERIFIED');
  assert.equal(surfaces['fusion-cp-gameday'].status, 'VERIFIED');

  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /evidence-custody=VERIFIED/);
  assert.match(text, /engram-contract=VERIFIED/);
  assert.match(text, /fusion-cp-lock=VERIFIED/);
  assert.match(text, /fusion-cp-mission-loop=VERIFIED/);
  assert.match(text, /FREEZE_TIP/);
  assert.match(text, /match=MATCH/);
  assert.doesNotMatch(text, /PRODUCTION_READY=YES/);
});

test('M3: failed evidence-custody surface is FAIL; freeze tip diverge is informational', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace({
    freezeTip: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: { head_short: 'ed8d960', head_full: 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a', branch: 'm3' },
    liveHead: 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a',
    verifyReport: postFusionVerifyFixture({ failCustody: true })
  });

  assert.equal(snapshot.verify.surfaces['evidence-custody'].status, 'FAIL');
  assert.equal(snapshot.verify.surfaces['evidence-custody'].failed, 1);
  assert.equal(snapshot.freeze_tip.epistemic, 'OBSERVED');
  assert.equal(snapshot.freeze_tip.match, false);
  assert.match(snapshot.freeze_tip.note, /no PRODUCTION_READY claim/i);

  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /evidence-custody=FAIL/);
  assert.match(text, /match=DIVERGE/);
  assert.match(text, /informational only/);
});

test('M3: observeFreezeTipVsHead is fail-closed when freeze tip missing', async () => {
  const hud = await loadHud();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-m3-empty-'));
  const result = hud.observeFreezeTipVsHead(dir, {
    liveHead: 'ed8d960c5b9cb42bcf73fd01b59f6fb4625a300a'
  });
  assert.equal(result.epistemic, 'NOT VERIFIED');
  assert.equal(result.match, false);
  assert.match(result.note, /no PRODUCTION_READY claim/i);
});

test('M3: package script test:m3 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:m3'], 'node --test tests/eos-m3-hud-verify-surfaces.test.js');
});
