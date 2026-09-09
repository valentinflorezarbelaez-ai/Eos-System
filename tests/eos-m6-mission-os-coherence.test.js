import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function loadCoherence() {
  return import('../src/core/observability/mission-os-coherence.js');
}

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-m6-hud-'));
  writeJson(path.join(dir, 'EOS-MISSION-CONTROL/CURRENT_MISSION.json'), {
    mission_id: 'EOS-M6-COHERENCE',
    status: 'EXAMS_MEASURED_NOT_OPERATIONALLY_COMPLETE',
    updated_at: '2026-09-08T21:00:00.000Z',
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
      'main_tip: 112bb2d000000000000000000000000000000000',
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

test('M6: every mission-loop stage is mapped; all ATS stages documented', async () => {
  const coherence = await loadCoherence();
  const result = coherence.assertCoherenceMapComplete();
  assert.equal(result.ok, true);
  assert.equal(result.mission_loop_mapped, coherence.MISSION_LOOP_ORDER.length);
  assert.equal(result.ats_documented, Object.values(coherence.SDD_STATES).length);

  const map = coherence.getMissionOsCoherenceMap();
  assert.equal(map.schema, 'eos.mission-os-coherence.v1');
  assert.match(map.claim, /does not replace ATS/i);
  assert.equal(map.roles.MISSION_LOOP.replaces, null);
  assert.equal(map.roles.ATS_SDD.replaces, null);
  assert.equal(map.deferred_next_gap.id, 'G7');
  assert.equal(map.deferred_next_gap.status, 'DEFERRED');

  for (const stage of coherence.MISSION_LOOP_ORDER) {
    assert.ok(map.map[stage], 'missing map for ' + stage);
    assert.ok(map.map[stage].ats_stages.length > 0);
  }
  for (const ats of Object.values(coherence.SDD_STATES)) {
    const inRows = map.rows.some((r) => r.ats_stages.includes(ats));
    const inControl = map.ats_control_states.includes(ats);
    assert.ok(inRows || inControl, 'ATS stage undocumented: ' + ats);
  }
});

test('M6: HUD snapshot exposes mission_os_coherence without replace claim', async () => {
  const hud = await loadHud();
  const baseDir = makeFixtureWorkspace();
  const snapshot = hud.collectOperatorHud({
    baseDir,
    gitIdentity: {
      head_short: '112bb2d',
      head_full: '112bb2d000000000000000000000000000000000',
      branch: 'cursor/eos-m6-mission-os-coherence'
    },
    liveHead: '112bb2d000000000000000000000000000000000',
    verifyReport: {
      status: 'PASS',
      strictMode: true,
      timestamp: '2026-09-08T21:00:00.000Z',
      checks: [{ path: 'package.json', status: 'VERIFIED', type: 'l0-purity' }],
      failures: [],
      warnings: []
    }
  });

  assert.ok(snapshot.mission_os_coherence, 'HUD missing mission_os_coherence');
  assert.equal(snapshot.mission_os_coherence.schema, 'eos.mission-os-coherence.v1');
  assert.match(snapshot.mission_os_coherence.claim, /does not replace/i);
  assert.equal(snapshot.mission_os_coherence.roles.MISSION_LOOP.replaces, null);
  assert.ok(Array.isArray(snapshot.mission_os_coherence.rows));
  assert.equal(snapshot.mission_os_coherence.rows.length, 7);

  const text = hud.renderOperatorHud(snapshot);
  assert.match(text, /MISSION_OS_COHERENCE/);
  assert.match(text, /does not replace ATS/i);
  assert.match(text, /Intent\s*->/);
  assert.match(text, /Archive\s*->/);
  assert.match(text, /G7/);
  assert.match(text, /DEFERRED/);
  assert.doesNotMatch(text, /PRODUCTION_READY=YES/);
  assert.doesNotMatch(text, /replaces ATS/i);
});

test('M6: coherence doc + release note + package script exist', () => {
  const doc = path.join(rootDir, 'docs/orchestration/MISSION_OS_ATS_MISSION_LOOP_COHERENCE.md');
  const release = path.join(rootDir, 'docs/releases/EOS_M6_MISSION_OS_COHERENCE_2026-09-08.md');
  assert.equal(fs.existsSync(doc), true);
  assert.equal(fs.existsSync(release), true);
  const docText = fs.readFileSync(doc, 'utf8');
  assert.match(docText, /ADR-0014/);
  assert.match(docText, /does \*\*not\*\* replace ATS/i);
  assert.match(docText, /G7/);
  const releaseText = fs.readFileSync(release, 'utf8');
  assert.match(releaseText, /Ladder 2 M1-M6 complete/);
  assert.match(releaseText, /deferred next gap/i);
  assert.match(releaseText, /PRODUCTION_READY:\*\* NO/);

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:m6'], 'node --test tests/eos-m6-mission-os-coherence.test.js');
});

test('M6: freeze gate notes Ladder 2 complete-after-merge + G7 deferred', () => {
  const freeze = fs.readFileSync(
    path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md'),
    'utf8'
  );
  assert.match(freeze, /M6 Mission OS/);
  assert.match(freeze, /Ladder 2 M1-M6 complete after this merges/i);
  assert.match(freeze, /G7/);
  assert.match(freeze, /DEFERRED/);
  assert.match(freeze, /PRODUCTION_READY: NO/);
});