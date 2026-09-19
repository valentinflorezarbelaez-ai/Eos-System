/**
 * Post-L26 Workstream C — Local CI surrogate tests.
 * Covers pass path + failure matrix:
 *   missing evidence, dirty tree, stale freeze, mission-pack drift.
 *
 * NON-CLAIM: green tests ≠ GitHub Actions green ≠ PRODUCTION_READY.
 * PRODUCTION_READY: NO
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');

const FREEZE_TIP = '47cf1a790c95f78a79e34830c4d6515d16dc67d0';
/** HEAD after B #369 (context) — ahead of freeze, lag measurable. */
const HEAD_AFTER_B = '279c8be4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

async function load() {
  return import('../src/core/ci/local-ci-surrogate.js');
}

function loadSsotFixture() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(PKG, 'fixtures/mission-pack-ssot.json'), 'utf8')
  );
  return raw;
}

async function buildExpectedFromFixture(mod) {
  const fix = loadSsotFixture();
  return mod.buildMissionPackIdentity({
    paths: fix.paths,
    scriptKeys: fix.script_keys,
    fileContents: fix.file_bodies,
    scripts: fix.scripts
  });
}

function basePassInput(mod, expected, overrides = {}) {
  return {
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    expectedFreeze: FREEZE_TIP,
    dirty: false,
    expectedMissionPack: expected,
    fileContents: loadSsotFixture().file_bodies,
    scripts: loadSsotFixture().scripts,
    recordedResult: {
      ok: true,
      exitCode: 0,
      pass_count: 914,
      fail_count: 0,
      evidence: { pattern: '914/0' }
    },
    requireVerifyEvidence: true,
    ...overrides
  };
}

// ─── encoding / helpers ──────────────────────────────────────────────────────

test('C/env: ci_environment always BILLING_BLOCKED; never GH green', async () => {
  const mod = await load();
  const env = mod.buildCiEnvironment();
  assert.equal(env.github_actions, 'BILLING_BLOCKED');
  assert.equal(env.local_surrogate, 'ACTIVE');
  assert.equal(env.github_actions_verdict, 'NOT_RUN');
  assert.match(env.note, /≠ GitHub Actions success/);

  const refused = mod.buildCiEnvironment({
    github_actions: 'GREEN',
    github_actions_verdict: 'PASS'
  });
  assert.equal(refused.github_actions, 'BILLING_BLOCKED');
  assert.equal(refused.github_actions_verdict, 'NOT_RUN');
  assert.match(refused.refusal || '', /REFUSED|billing-blocked/i);
});

test('C/prereq: documented prerequisites list is non-empty and actionable', async () => {
  const mod = await load();
  const p = mod.checkPrerequisites({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    expectedMissionPack: { identity: 'x' },
    recordedResult: { ok: true, evidence: {} }
  });
  assert.equal(p.ok, true);
  assert.ok(p.documented.length >= 6);
  assert.ok(p.documented.some((d) => /BILLING_BLOCKED|billing-blocked/i.test(d)));
  assert.ok(p.documented.some((d) => /verify:strict/.test(d)));
});

test('C/identity: mission pack fingerprint is stable for same SSOT bodies', async () => {
  const mod = await load();
  const a = await buildExpectedFromFixture(mod);
  const b = await buildExpectedFromFixture(mod);
  assert.equal(a.identity, b.identity);
  assert.equal(a.file_fingerprint, b.file_fingerprint);
  assert.equal(a.script_fingerprint, b.script_fingerprint);
  assert.equal(a.missing_paths.length, 0);
});

// ─── PASS path ───────────────────────────────────────────────────────────────

test('C/pass: clean + match freeze + SSOT + verify:strict recorded → ok; BILLING_BLOCKED encoded', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(basePassInput(mod, expected));

  assert.equal(gate.ok, true);
  assert.equal(gate.exit_code, mod.EXIT.PASS);
  assert.equal(gate.PRODUCTION_READY, 'NO');
  assert.equal(gate.ci_environment.github_actions, 'BILLING_BLOCKED');
  assert.equal(gate.ci_environment.local_surrogate, 'ACTIVE');
  assert.equal(gate.ci_environment.github_actions_verdict, 'NOT_RUN');
  assert.equal(gate.dirty.dirty, false);
  assert.equal(gate.freeze_lag.match, true);
  assert.equal(gate.mission_pack.drift.drifted, false);
  assert.equal(gate.verify_strict.ok, true);
  assert.equal(gate.verify_strict.pass_count, 914);
  assert.equal(gate.fundacion_delta, 0);
  assert.match(gate.note, /LOCAL_SURROGATE_PASS/);
  assert.match(gate.note, /NOT a GitHub Actions green/);
  assert.ok(gate.non_claims.some((c) => /BILLING_BLOCKED/.test(c)));
});

test('C/pass: HEAD ahead of freeze with measured lagCommits>0 is NOT stale_freeze', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      sourceRevision: HEAD_AFTER_B,
      lagCommits: 3,
      // freeze tip still matches expectedFreeze
      freezeRevision: FREEZE_TIP
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.freeze_lag.match, false);
  assert.equal(gate.freeze_lag.stale, false);
  assert.match(gate.freeze_lag.lag_label, /HEAD_AHEAD/);
});

test('C/pass: injected verify:strict runner success recorded', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      recordedResult: undefined,
      runner: async () => ({
        ok: true,
        exitCode: 0,
        pass_count: 10,
        fail_count: 0,
        stdout: 'ok',
        evidence: { injected: true }
      })
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.verify_strict.source, 'runner');
  assert.equal(gate.verify_strict.pass_count, 10);
});

// ─── Failure matrix: missing evidence ────────────────────────────────────────

test('C/fail/missing-evidence: no freeze + no HEAD → MISSING_EVIDENCE', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate({
    dirty: false,
    expectedMissionPack: expected,
    fileContents: loadSsotFixture().file_bodies,
    scripts: loadSsotFixture().scripts,
    recordedResult: { ok: true, exitCode: 0, evidence: {} },
    requireFreezeText: true,
    requireSourceRevision: true
  });
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.MISSING_EVIDENCE);
  assert.equal(gate.exit_code, mod.EXIT.MISSING_EVIDENCE);
  assert.ok(gate.prerequisites.missing.includes('freeze_tip_evidence'));
  assert.ok(gate.prerequisites.missing.includes('source_revision_HEAD'));
  // Still encodes billing-blocked, never claims GH green
  assert.equal(gate.ci_environment.github_actions, 'BILLING_BLOCKED');
});

test('C/fail/missing-evidence: no expected mission-pack SSOT → MISSING_EVIDENCE', async () => {
  const mod = await load();
  const gate = await mod.runLocalCiSurrogate({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    dirty: false,
    requireMissionPackExpected: true,
    recordedResult: { ok: true, exitCode: 0, evidence: {} }
  });
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.MISSING_EVIDENCE);
  assert.ok(
    gate.prerequisites.missing.includes('mission_pack_ssot_expected')
  );
});

test('C/fail/missing-prereq: no runner and no recorded verify → MISSING_PREREQUISITES', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    expectedFreeze: FREEZE_TIP,
    dirty: false,
    expectedMissionPack: expected,
    fileContents: loadSsotFixture().file_bodies,
    scripts: loadSsotFixture().scripts,
    requireVerifyEvidence: true
  });
  assert.equal(gate.ok, false);
  assert.ok(
    gate.failures.some(
      (f) =>
        f.code === mod.FAILURE_CODES.MISSING_PREREQUISITES ||
        f.code === mod.FAILURE_CODES.MISSING_EVIDENCE
    )
  );
  assert.equal(gate.ci_environment.github_actions_verdict, 'NOT_RUN');
});

// ─── Failure matrix: dirty tree ──────────────────────────────────────────────

test('C/fail/dirty: dirty tree blocks surrogate (DIRTY_TREE)', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      dirty: true,
      dirtyPaths: ['package.json', 'docs/releases/EOS_FREEZE_GATE_STATUS.md']
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.DIRTY_TREE);
  assert.equal(gate.exit_code, mod.EXIT.DIRTY_TREE);
  assert.equal(gate.dirty.blocked, true);
  assert.match(gate.dirty.reason, /DIRTY_TREE/);
  assert.equal(gate.ci_environment.github_actions, 'BILLING_BLOCKED');
});

// ─── Failure matrix: stale freeze ────────────────────────────────────────────

test('C/fail/stale-freeze: freeze tip ≠ expected canonical → STALE_FREEZE', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const staleTip = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      freezeRevision: staleTip,
      sourceRevision: staleTip,
      lagCommits: 0,
      expectedFreeze: FREEZE_TIP
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.STALE_FREEZE);
  assert.equal(gate.exit_code, mod.EXIT.STALE_FREEZE);
  assert.equal(gate.freeze_lag.stale, true);
  assert.match(gate.freeze_lag.lag_label, /STALE_FREEZE/);
});

test('C/fail/stale-freeze: HEAD behind freeze (lagCommits<0) → STALE_FREEZE', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      sourceRevision: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      lagCommits: -2
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.STALE_FREEZE);
  assert.match(gate.freeze_lag.lag_label, /HEAD_BEHIND/);
});

test('C/fail/stale-freeze: diverge without lagCommits → STALE_FREEZE', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      sourceRevision: HEAD_AFTER_B,
      lagCommits: null
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.freeze_lag.stale, true);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.STALE_FREEZE);
});

test('C/fail/honesty: parse freeze text main_tip for lag', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const freezeText = fs.readFileSync(
    path.join(PKG, 'fixtures/freeze-gate-snippet.md'),
    'utf8'
  );
  const tip = mod.parseFreezeMainTip(freezeText);
  assert.equal(tip, FREEZE_TIP);

  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      freezeRevision: undefined,
      freezeText,
      sourceRevision: FREEZE_TIP,
      lagCommits: 0
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.freeze_lag.freeze_revision, FREEZE_TIP);
});

// ─── Failure matrix: mission-pack drift ──────────────────────────────────────

test('C/fail/drift: file content change → MISSION_PACK_DRIFT', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const driftedBodies = {
    ...loadSsotFixture().file_bodies,
    'tests/eos-m4-release-ssot-tip.test.js':
      '// DRIFTED m4 content — not SSOT\nexport const MISSION = "hacked";\n'
  };
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      fileContents: driftedBodies
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.MISSION_PACK_DRIFT);
  assert.equal(gate.exit_code, mod.EXIT.MISSION_PACK_DRIFT);
  assert.equal(gate.mission_pack.drift.drifted, true);
  assert.ok(
    gate.mission_pack.drift.mismatches.some((m) => /m4|sha256|identity/i.test(m))
  );
});

test('C/fail/drift: package.json script map change → MISSION_PACK_DRIFT', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const driftedScripts = {
    ...loadSsotFixture().scripts,
    'verify:strict': 'echo bypassed'
  };
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      scripts: driftedScripts
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.MISSION_PACK_DRIFT);
  assert.ok(
    gate.mission_pack.drift.mismatches.some((m) => /verify:strict|script/i.test(m))
  );
});

test('C/fail/drift: detectMissionPackDrift alone rejects silent tolerance', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const observed = mod.buildMissionPackIdentity({
    fileContents: {
      ...loadSsotFixture().file_bodies,
      'tests/eos-m1-strict-verify-cp-lock.test.js': '// changed\n'
    },
    scripts: loadSsotFixture().scripts,
    paths: loadSsotFixture().paths,
    scriptKeys: loadSsotFixture().script_keys
  });
  const d = mod.detectMissionPackDrift(observed, expected);
  assert.equal(d.drifted, true);
  assert.match(d.reason, /MISSION_PACK_DRIFT/);

  const none = mod.detectMissionPackDrift(null, expected);
  assert.equal(none.drifted, true);

  const noExp = mod.detectMissionPackDrift(observed, null);
  assert.equal(noExp.drifted, true);
});

// ─── Failure matrix: verify:strict fail ──────────────────────────────────────

test('C/fail/verify: recorded verify:strict failure → VERIFY_STRICT_FAIL', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const gate = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, {
      recordedResult: {
        ok: false,
        exitCode: 1,
        pass_count: 900,
        fail_count: 14,
        stderr: 'verify failed'
      }
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_failure, mod.FAILURE_CODES.VERIFY_STRICT_FAIL);
  assert.equal(gate.exit_code, mod.EXIT.VERIFY_STRICT_FAIL);
  assert.equal(gate.verify_strict.ok, false);
  // Still NOT claiming GH green
  assert.equal(gate.ci_environment.github_actions, 'BILLING_BLOCKED');
  assert.equal(gate.ci_environment.github_actions_verdict, 'NOT_RUN');
});

// ─── exit / format helpers ───────────────────────────────────────────────────

test('C/exit: exitCodeFromGate + formatGateSummary are deterministic', async () => {
  const mod = await load();
  const expected = await buildExpectedFromFixture(mod);
  const pass = await mod.runLocalCiSurrogate(basePassInput(mod, expected));
  assert.equal(mod.exitCodeFromGate(pass), 0);
  const summary = mod.formatGateSummary(pass);
  assert.match(summary, /BILLING_BLOCKED/);
  assert.match(summary, /local_surrogate: ACTIVE/);
  assert.match(summary, /PRODUCTION_READY: NO/);

  const fail = await mod.runLocalCiSurrogate(
    basePassInput(mod, expected, { dirty: true })
  );
  assert.equal(mod.exitCodeFromGate(fail), mod.EXIT.DIRTY_TREE);
});

test('C/schema: SURROGATE_SCHEMA + PRODUCTION_READY constants', async () => {
  const mod = await load();
  assert.equal(mod.SURROGATE_SCHEMA, 'eos.local-ci-surrogate.v1');
  assert.equal(mod.SURROGATE_PRODUCTION_READY, 'NO');
  assert.equal(mod.CANONICAL_FREEZE_TIP, FREEZE_TIP);
  assert.equal(mod.CI_ENVIRONMENT_TEMPLATE.github_actions, 'BILLING_BLOCKED');
});
