import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runOperatorDoctor,
  runOperatorDoctorCli,
  formatDoctorReport,
  POST_FUSION_CRITICAL_PATHS,
  DOCTOR_WIRING_PATHS
} from '../src/core/runtime/operator-doctor.js';
import {
  attachHonestyToDoctorReport,
  extractPendingPorts,
  observeGitState,
  observeRevisionLag,
  summarizePendingPorts
} from '../src/core/observability/doctor-hud-honesty.js';
import {
  collectOperatorHud,
  renderOperatorHud,
  HUD_EPISTEMIC
} from '../src/core/observability/operator-hud.js';

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
  it('POST_FUSION_CRITICAL_PATHS covers verify/fusion-cp/custody/engram/evd-seal/pre-push + Q3 L4 + R3 L5 + T3 L7 + U3 T4–T8', () => {
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
      'P6_INVENTORY_LOCK',
      'CONTEXT_PACK',
      'LOOP_ENGINEERING',
      'WORKTREE_POLICY',
      'SPECBOOT_CYCLE',
      'MCP_TOOL_KEEP',
      'MODEL_ROUTING_RATCHET',
      'MISSION_OS_EVD',
      'KEEP_PO_PRUNE_HOLD',
      'COMPLEXITY_CEILING_HOLD',
      'AGY_WORKSTATION',
      'DIRTY_DEFER_TRIAGE'
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
    assert.ok(rels.includes('scripts/lib/context-pack-lock.js'));
    assert.ok(rels.includes('scripts/lib/loop-engineering-lock.js'));
    assert.ok(rels.includes('scripts/lib/worktree-policy-lock.js'));
    assert.ok(rels.includes('scripts/lib/specboot-cycle-lock.js'));
    assert.ok(rels.includes('scripts/lib/mcp-tool-keep-lock.js'));
    assert.ok(rels.includes('scripts/lib/model-routing-ratchet-lock.js'));
    assert.ok(rels.includes('src/core/observability/mission-os-evd-observe-pack.js'));
    assert.ok(rels.includes('scripts/lib/keep-po-prune-hold-lock.js'));
    assert.ok(rels.includes('scripts/lib/complexity-ceiling-hold-lock.js'));
    assert.ok(rels.includes('scripts/lib/agy-workstation-lock.js'));
    assert.ok(rels.includes('scripts/lib/dirty-defer-triage-lock.js'));
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

// ─── Honesty integrity (verdict, git truth, lag topology, bounds) ───────────

const FREEZE_TIP = '47cf1a790c95f78a79e34830c4d6515d16dc67d0';
const HEAD_AHEAD = '8c7cfd632cbfa5bc88a400bb2ebe1bfcb05435dc';
const FREEZE_SHORT7 = FREEZE_TIP.slice(0, 7);
const HEAD_SHORT7 = HEAD_AHEAD.slice(0, 7);

function freezeFence({ tip = FREEZE_TIP, pending = '' } = {}) {
  return [
    '```',
    `main_tip: ${tip}`,
    'PRODUCTION_READY: NO',
    'dictamen: CLOSED_FOR_LOCAL_GOVERNED_USE',
    pending ? `Audit note: ${pending}` : '',
    '```'
  ].join('\n');
}

function gitDouble(handlers) {
  return (args) => {
    const key = args.join(' ');
    if (Object.prototype.hasOwnProperty.call(handlers, key)) {
      const value = handlers[key];
      if (value instanceof Error) throw value;
      return value;
    }
    throw new Error(`unexpected git call: ${key}`);
  };
}

function seedIntegrityFreeze(root, { pending = '' } = {}) {
  fs.mkdirSync(path.join(root, 'docs', 'releases'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs', 'releases', 'EOS_FREEZE_GATE_STATUS.md'),
    freezeFence({ tip: FREEZE_TIP, pending })
  );
}

describe('N3 honesty integrity', () => {
  it('observes HEAD + dirty through injectable git', () => {
    const execGit = gitDouble({
      'rev-parse HEAD': HEAD_AHEAD,
      'status --porcelain': ' M src/a.js\n?? docs/b.md\n'
    });
    const state = observeGitState('/tmp/fixture', { execGit });

    assert.equal(state.epistemic, 'OBSERVED');
    assert.equal(state.source_revision, HEAD_AHEAD);
    assert.equal(state.dirty, true);
    assert.equal(state.dirty_measured, true);
    assert.deepEqual(state.dirty_paths, ['src/a.js', 'docs/b.md']);
    assert.deepEqual(state.errors, []);
  });

  it('never claims clean when git is unavailable', () => {
    const state = observeGitState('/tmp/fixture', {
      execGit: () => {
        throw new Error('git unavailable');
      }
    });

    assert.equal(state.epistemic, 'NOT_VERIFIED');
    assert.equal(state.source_revision, null);
    assert.equal(state.dirty_measured, false);
    assert.equal(state.dirty, false);
    assert.equal(state.errors.length, 2);
  });

  it('measures ahead/behind lag and refuses shallow topology', () => {
    const ahead = observeRevisionLag('/tmp/fixture', {
      freezeRevision: FREEZE_TIP,
      sourceRevision: HEAD_AHEAD,
      execGit: gitDouble({
        [`merge-base --is-ancestor ${FREEZE_TIP} ${HEAD_AHEAD}`]: '',
        [`rev-list --count ${FREEZE_TIP}..${HEAD_AHEAD}`]: '3'
      })
    });
    assert.equal(ahead, 3);

    const behind = observeRevisionLag('/tmp/fixture', {
      freezeRevision: FREEZE_TIP,
      sourceRevision: HEAD_AHEAD,
      execGit: gitDouble({
        [`merge-base --is-ancestor ${FREEZE_TIP} ${HEAD_AHEAD}`]: new Error('not ancestor'),
        [`merge-base --is-ancestor ${HEAD_AHEAD} ${FREEZE_TIP}`]: '',
        [`rev-list --count ${HEAD_AHEAD}..${FREEZE_TIP}`]: '2'
      })
    });
    assert.equal(behind, -2);

    const shallow = observeRevisionLag('/tmp/fixture', {
      freezeRevision: FREEZE_TIP,
      sourceRevision: HEAD_AHEAD,
      execGit: gitDouble({
        [`merge-base --is-ancestor ${FREEZE_TIP} ${HEAD_AHEAD}`]: new Error('not ancestor'),
        [`merge-base --is-ancestor ${HEAD_AHEAD} ${FREEZE_TIP}`]: new Error('not ancestor'),
        'rev-parse --is-shallow-repository': 'true'
      })
    });
    assert.equal(shallow, null);
  });

  it('ignores prose pending ports and bounds display output', () => {
    const ports = extractPendingPorts(
      'FI–FM pending; was pending; ER pending; lowercase pending stays prose'
    );
    assert.deepEqual(ports, ['FI–FM pending', 'ER pending']);
    assert.doesNotMatch(ports.join(' '), /was pending/);

    const many = Array.from({ length: 20 }, (_, i) => `P${i} pending`);
    const summary = summarizePendingPorts(many, 5);
    assert.match(summary, /P0 pending/);
    assert.match(summary, /\+15 more/);
    assert.doesNotMatch(summary, /P19 pending/);
  });

  it('keeps observed findings out of the operational verdict', () => {
    const enriched = attachHonestyToDoctorReport(
      { ok: true, checks: [{ id: 'BIN_EOS', ok: true }], failed: [] },
      {
        freezeRevision: FREEZE_TIP,
        sourceRevision: null,
        dirty: false,
        pendingPorts: ['ZZ pending']
      }
    );

    assert.equal(enriched.ok, true, 'operational verdict stays PASS');
    assert.deepEqual(enriched.failed, []);
    assert.equal(enriched.honesty_ok, false);
    assert.ok(enriched.honesty_failed.includes('HONESTY_REVISION'));
    assert.ok(enriched.honesty_failed.includes('HONESTY_PENDING_PORT'));
    for (const id of ['HONESTY_REVISION', 'HONESTY_DIRTY', 'HONESTY_PENDING_PORT']) {
      const row = enriched.checks.find((c) => c.id === id);
      assert.ok(row, `missing ${id}`);
      assert.equal(row.gate, false, `${id} must not gate doctor verdict`);
    }

    const text = formatDoctorReport(enriched);
    assert.match(text, /\[OBSERVED\] HONESTY_REVISION/);
    assert.match(text, /\[OBSERVED\] HONESTY_PENDING_PORT/);
    assert.doesNotMatch(text, /\[FAIL\] HONESTY_/);

    const broken = attachHonestyToDoctorReport(
      { ok: false, checks: [{ id: 'FUSION_CP', ok: false }], failed: ['FUSION_CP'] },
      { freezeRevision: FREEZE_TIP, sourceRevision: FREEZE_TIP, dirty: false }
    );
    assert.equal(broken.ok, false);
    assert.deepEqual(broken.failed, ['FUSION_CP']);
    assert.match(formatDoctorReport(broken), /\[FAIL\] FUSION_CP/);
  });

  it('wires measured HEAD, lag and dirty state into runOperatorDoctor', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n3-honesty-doctor-'));
    try {
      seedIntegrityFreeze(root, { pending: 'ZZ pending' });
      const execGit = gitDouble({
        'rev-parse HEAD': HEAD_AHEAD,
        'status --porcelain': ' M src/core/runtime/operator-doctor.js\n',
        [`merge-base --is-ancestor ${FREEZE_TIP} ${HEAD_AHEAD}`]: '',
        [`rev-list --count ${FREEZE_TIP}..${HEAD_AHEAD}`]: '2'
      });
      const report = runOperatorDoctor({
        root,
        skipPurpose: true,
        skipMcpFile: true,
        skipRuntimeEngines: true,
        skipDoctorWiring: true,
        execGit
      });

      assert.equal(report.honesty.revision.source_revision, HEAD_AHEAD);
      assert.equal(report.honesty.revision.lag_commits, 2);
      assert.equal(report.honesty.revision.lag_measurable, true);
      assert.equal(report.honesty.dirty.dirty, true);
      assert.equal(report.honesty.dirty.measured, true);
      assert.deepEqual(report.honesty.dirty.dirty_paths, [
        'src/core/runtime/operator-doctor.js'
      ]);
      assert.ok(report.honesty_failed.includes('HONESTY_DIRTY'));
      assert.ok(report.failed.every((id) => !id.startsWith('HONESTY_')));
      assert.equal(report.PRODUCTION_READY, 'NO');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('passes observation options through the CLI and emits resolved truth', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n3-honesty-cli-'));
    try {
      seedIntegrityFreeze(root);
      const execGit = gitDouble({
        'rev-parse HEAD': HEAD_AHEAD,
        'status --porcelain': '',
        [`merge-base --is-ancestor ${FREEZE_TIP} ${HEAD_AHEAD}`]: '',
        [`rev-list --count ${FREEZE_TIP}..${HEAD_AHEAD}`]: '4'
      });
      const res = runOperatorDoctorCli(['--json'], {
        root,
        skipPurpose: true,
        skipMcpFile: true,
        skipRuntimeEngines: true,
        skipDoctorWiring: true,
        execGit
      });
      const parsed = JSON.parse(res.output);
      assert.equal(parsed.honesty.revision.source_revision, HEAD_AHEAD);
      assert.equal(parsed.honesty.revision.lag_commits, 4);
      assert.equal(parsed.honesty.dirty.dirty, false);
      assert.equal(parsed.honesty.dirty.measured, true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('exposes freeze/source short revisions on the HUD freeze_tip', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n3-honesty-hud-'));
    try {
      seedIntegrityFreeze(root);
      const snapshot = collectOperatorHud({
        baseDir: root,
        skipVerify: true,
        gitIdentity: {
          head_short: HEAD_SHORT7,
          head_full: HEAD_AHEAD,
          branch: 'main'
        },
        dirty: false,
        lagCommits: 4
      });

      assert.equal(snapshot.git.epistemic, HUD_EPISTEMIC.VERIFIED);
      assert.equal(snapshot.freeze_tip.lag_commits, 4);
      assert.equal(snapshot.freeze_tip.freeze_revision_short, FREEZE_SHORT7);
      assert.equal(snapshot.freeze_tip.source_revision_short, HEAD_SHORT7);
      assert.equal(snapshot.PRODUCTION_READY, 'NO');
      assert.match(renderOperatorHud(snapshot), /HONESTY/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

