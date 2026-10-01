/**
 * Post-L26 Workstream B — Doctor + HUD honesty tests.
 * States: clean, dirty, frozen, HEAD-lagging, pending-port.
 *
 * NON-CLAIM: green tests ≠ L26 reopen ≠ PRODUCTION_READY.
 * PRODUCTION_READY: NO
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');

/** Freeze tip (Mission CP #365) — OBSERVED from post-L26 backlog. */
const FREEZE_TIP = '47cf1a790c95f78a79e34830c4d6515d16dc67d0';
const FREEZE_SHORT7 = FREEZE_TIP.slice(0, 7);
/** Host main HEAD after #367 (OBSERVED Workstream A RESULT). */
const HEAD_AHEAD = '8c7cfd632cbfa5bc88a400bb2ebe1bfcb05435dc';
const HEAD_SHORT7 = HEAD_AHEAD.slice(0, 7);

async function loadHonesty() {
  return import('../src/core/observability/doctor-hud-honesty.js');
}
async function loadDoctor() {
  return import('../src/core/runtime/operator-doctor.js');
}
async function loadHud() {
  return import('../src/core/observability/operator-hud.js');
}

function freezeFence({ tip = FREEZE_TIP, pending = '' } = {}) {
  return [
    '```',
    `main_tip: ${tip}`,
    'PRODUCTION_READY: NO',
    'dictamen: CLOSED_FOR_LOCAL_GOVERNED_USE',
    '```',
    '',
    'Formal Ladder 26 CLOSED (CL+CM+CN+CO+CP MEASURED).',
    pending ? `Audit note: ${pending}` : '',
    ''
  ].join('\n');
}

function tmpRoot(prefix = 'eos-b-honesty-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedDoctorTree(root, { freezeText } = {}) {
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'eos.js'), '// stub\n');
  fs.writeFileSync(path.join(root, 'bin', 'eos-doctor.js'), '// stub\n');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'mcp-server.js'), '// stub\n');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts', 'verify-eos.js'), '// stub\n');
  fs.mkdirSync(path.join(root, 'EOS-MISSION-CONTROL'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'EOS-MISSION-CONTROL', 'CURRENT_MISSION.json'),
    '{}\n'
  );
  fs.mkdirSync(path.join(root, 'docs/releases'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/releases', 'EOS_FREEZE_GATE_STATUS.md'),
    freezeText || freezeFence({ tip: FREEZE_TIP })
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ scripts: { 'eos:doctor': 'node bin/eos-doctor.js' } })
  );
  fs.mkdirSync(path.join(root, 'src/core/runtime'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src/core/runtime/operator-doctor.js'),
    '// stub\n'
  );
  for (const rel of [
    'scripts/lib/fusion-cp-lock.js',
    'src/core/sdd/evidence-custody.js',
    'src/core/memory/engram-contract.js',
    'src/core/sdd/evd-seal-path.js',
    'scripts/pre-push-hook.js'
  ]) {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), '// stub\n');
  }
}

// ─── clean ──────────────────────────────────────────────────────────────────

test('B/clean: match + clean → ALLOW_OBSERVED_ONLY + baseline NON-CLAIM chips', async () => {
  const h = await loadHonesty();
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    dirty: false,
    frozen: true,
    pendingPorts: [],
    surface: 'fixture'
  });

  assert.equal(surface.PRODUCTION_READY, 'NO');
  assert.equal(surface.revision.match, true);
  assert.equal(surface.revision.lag_commits, 0);
  assert.equal(surface.revision.lag_measurable, true);
  assert.match(surface.revision.lag_label, /MATCH/);
  assert.equal(surface.dirty.dirty, false);
  assert.equal(surface.dirty.blocked, false);
  assert.equal(surface.frozen, true);
  assert.equal(surface.optimistic.result, 'ALLOW_OBSERVED_ONLY');
  assert.equal(surface.pending_ports.length, 0);

  const chips = surface.non_claim_chips.join('\n');
  assert.match(chips, /PRODUCTION_READY not established/);
  assert.match(chips, /closure not established/);
  assert.match(chips, /evidence completeness not established/);
  assert.match(chips, /PRODUCTION_READY flip|remains NO/);
});

// ─── dirty ──────────────────────────────────────────────────────────────────

test('B/dirty: dirty tree defers/blocks optimistic and explains reason', async () => {
  const h = await loadHonesty();
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    dirty: true,
    dirtyPaths: ['docs/releases/EOS_FREEZE_GATE_STATUS.md', 'package.json'],
    surface: 'fixture'
  });

  assert.equal(surface.dirty.dirty, true);
  assert.equal(surface.dirty.deferred, true);
  assert.equal(surface.dirty.blocked, true);
  assert.equal(surface.optimistic.allowed, false);
  assert.equal(surface.optimistic.result, 'DEFERRED');
  assert.match(surface.optimistic.reason, /DIRTY_BLOCK|dirty/i);
  assert.match(surface.dirty.reason, /DIRTY_BLOCK/);
  assert.match(surface.non_claim_chips.join('\n'), /dirty tree/);
});

test('B/dirty: evaluateDirtyState alone blocks optimistic', async () => {
  const h = await loadHonesty();
  const d = h.evaluateDirtyState({
    dirty: true,
    dirtySummary: 'M docs/foo.md'
  });
  assert.equal(d.optimistic_allowed, false);
  assert.equal(d.blocked, true);
  assert.match(d.reason, /DIRTY_BLOCK/);
});

// ─── frozen ─────────────────────────────────────────────────────────────────

test('B/frozen: freeze tip parsed from fence; frozen when match+clean', async () => {
  const h = await loadHonesty();
  const text = freezeFence({ tip: FREEZE_TIP });
  assert.equal(h.parseFreezeMainTip(text), FREEZE_TIP);

  const surface = h.buildHonestySurface({
    freezeText: text,
    sourceRevision: FREEZE_SHORT7,
    lagCommits: 0,
    dirty: false
  });
  assert.equal(surface.revision.match, true);
  assert.equal(surface.frozen, true);
  assert.equal(surface.revision.freeze_revision_short, FREEZE_SHORT7);
  assert.equal(surface.revision.source_revision_short, FREEZE_SHORT7);
});

// ─── HEAD-lagging ───────────────────────────────────────────────────────────

test('B/HEAD-lagging: freeze≠HEAD shows measurable lag when lagCommits provided', async () => {
  const h = await loadHonesty();
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: HEAD_AHEAD,
    lagCommits: 3,
    dirty: false,
    surface: 'fixture'
  });

  assert.equal(surface.revision.match, false);
  assert.equal(surface.revision.lag_measurable, true);
  assert.equal(surface.revision.lag_commits, 3);
  assert.match(surface.revision.lag_label, /HEAD_AHEAD/);
  assert.match(surface.revision.lag_label, /3 commit/);
  assert.equal(surface.revision.freeze_revision_short, FREEZE_SHORT7);
  assert.equal(surface.revision.source_revision_short, HEAD_SHORT7);
  assert.equal(surface.optimistic.result, 'DEFERRED');
  assert.match(surface.non_claim_chips.join('\n'), /freeze≠HEAD lag/);
});

test('B/HEAD-lagging: behind freeze reports HEAD_BEHIND', async () => {
  const h = await loadHonesty();
  const lag = h.measureRevisionLag({
    freezeRevision: FREEZE_TIP,
    sourceRevision: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    lagCommits: -2
  });
  assert.equal(lag.match, false);
  assert.match(lag.lag_label, /HEAD_BEHIND/);
  assert.equal(lag.lag_commits, -2);
});

test('B/HEAD-lagging: diverge without lagCommits is UNMEASURED but still reported', async () => {
  const h = await loadHonesty();
  const lag = h.measureRevisionLag({
    freezeRevision: FREEZE_TIP,
    sourceRevision: HEAD_AHEAD
  });
  assert.equal(lag.match, false);
  assert.equal(lag.lag_measurable, false);
  assert.match(lag.lag_label, /DIVERGE/);
});

// ─── pending-port ───────────────────────────────────────────────────────────

test('B/pending-port: extracted from freeze text and blocks optimistic', async () => {
  const h = await loadHonesty();
  const text = freezeFence({
    tip: FREEZE_TIP,
    pending: 'Audit MEASURED · CQ–CR pending'
  });
  const surface = h.buildHonestySurface({
    freezeText: text,
    sourceRevision: FREEZE_TIP,
    lagCommits: 0,
    dirty: false
  });
  assert.ok(surface.pending_ports.some((p) => /CQ–CR pending/.test(p)));
  assert.equal(surface.optimistic.result, 'DEFERRED');
  assert.match(surface.optimistic.reason, /pending-port/);
  assert.match(surface.non_claim_chips.join('\n'), /pending-port visible/);
});

test('B/pending-port: explicit pendingPorts option', async () => {
  const h = await loadHonesty();
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    dirty: false,
    pendingPorts: ['ZZ pending']
  });
  assert.deepEqual(surface.pending_ports, ['ZZ pending']);
  assert.equal(surface.optimistic.deferred, true);
});

// ─── format + attach ────────────────────────────────────────────────────────

test('B/format: formatHonestyBlock includes freeze/source/lag/NON-CLAIM', async () => {
  const h = await loadHonesty();
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: HEAD_AHEAD,
    lagCommits: 2,
    dirty: true,
    dirtyPaths: ['a.js'],
    pendingPorts: ['CQ pending']
  });
  const block = h.formatHonestyBlock(surface);
  assert.match(block, /HONESTY/);
  assert.match(block, new RegExp(FREEZE_SHORT7));
  assert.match(block, new RegExp(HEAD_SHORT7));
  assert.match(block, /lag=2/);
  assert.match(block, /NON-CLAIM chips/);
  assert.match(block, /PRODUCTION_READY=NO/);
});

test('B/attach: doctor report gains honesty checks + chips', async () => {
  const h = await loadHonesty();
  const enriched = h.attachHonestyToDoctorReport(
    {
      ok: true,
      root: '/tmp',
      checks: [{ id: 'BIN_EOS', ok: true, detail: 'ok' }],
      failed: []
    },
    {
      freezeRevision: FREEZE_TIP,
      sourceRevision: FREEZE_TIP,
      dirty: false
    }
  );
  assert.ok(enriched.honesty);
  assert.ok(enriched.checks.some((c) => c.id === 'HONESTY_REVISION'));
  assert.ok(enriched.checks.some((c) => c.id === 'HONESTY_DIRTY'));
  assert.ok(enriched.nonClaims.some((c) => /NON-CLAIM/.test(c)));
});

test('B/attach: HUD snapshot gains honesty with lag', async () => {
  const h = await loadHonesty();
  const snap = h.attachHonestyToHudSnapshot(
    {
      schema: 'eos.operator-hud.v1',
      git: { head_short: HEAD_SHORT7, head_full: HEAD_AHEAD },
      freeze_tip: {
        freeze_main_tip: FREEZE_TIP,
        live_head: HEAD_AHEAD,
        match: false
      }
    },
    { lagCommits: 3, dirty: false }
  );
  assert.equal(snap.honesty.revision.lag_commits, 3);
  assert.equal(snap.honesty.revision.match, false);
});

// ─── Doctor integration ─────────────────────────────────────────────────────

test('B/doctor: runOperatorDoctor attaches honesty when freeze+source provided', async () => {
  const doctor = await loadDoctor();
  const root = tmpRoot();
  try {
    seedDoctorTree(root, {
      freezeText: freezeFence({ tip: FREEZE_TIP, pending: 'CQ–CR pending' })
    });

    const report = doctor.runOperatorDoctor({
      root,
      skipMcpFile: true,
      skipPurpose: true,
      skipRuntimeEngines: true,
      sourceRevision: HEAD_AHEAD,
      lagCommits: 3,
      dirty: true,
      dirtyPaths: ['package.json']
    });

    assert.ok(report.honesty, 'honesty attached');
    assert.equal(report.PRODUCTION_READY, 'NO');
    assert.equal(report.honesty.revision.match, false);
    assert.equal(report.honesty.revision.lag_commits, 3);
    assert.equal(report.honesty.dirty.dirty, true);
    assert.equal(report.honesty.optimistic.result, 'DEFERRED');
    assert.ok(report.honesty.pending_ports.length >= 1);

    const text = doctor.formatDoctorReport(report);
    assert.match(text, /HONESTY/);
    assert.match(text, /NON-CLAIM/);
    assert.match(text, new RegExp(FREEZE_SHORT7));
    assert.match(text, new RegExp(HEAD_SHORT7));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ─── HUD integration ────────────────────────────────────────────────────────

test('B/HUD: collectOperatorHud includes honesty + lag + NON-CLAIM render', async () => {
  const hud = await loadHud();
  const root = tmpRoot('eos-b-hud-');
  try {
    fs.mkdirSync(path.join(root, 'EOS-MISSION-CONTROL'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'EOS-MISSION-CONTROL', 'CURRENT_MISSION.json'),
      JSON.stringify({
        mission_id: 'EOS-B-FIXTURE',
        status: 'HOLD',
        dictamen: { PRODUCTION_READY: 'NO' }
      })
    );
    fs.mkdirSync(path.join(root, 'docs/releases'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs/releases', 'EOS_FREEZE_GATE_STATUS.md'),
      freezeFence({ tip: FREEZE_TIP, pending: 'CQ pending' })
    );
    fs.writeFileSync(
      path.join(root, 'docs/releases', 'RELEASE_CAPABILITY_MATRIX.md'),
      'PRODUCTION_READY: NO\n'
    );

    const snapshot = hud.collectOperatorHud({
      baseDir: root,
      skipVerify: true,
      gitIdentity: {
        head_short: HEAD_SHORT7,
        head_full: HEAD_AHEAD,
        branch: 'main'
      },
      liveHead: HEAD_AHEAD,
      lagCommits: 3,
      dirty: false
    });

    assert.ok(snapshot.honesty);
    assert.equal(snapshot.PRODUCTION_READY, 'NO');
    assert.equal(snapshot.honesty.revision.lag_commits, 3);
    assert.equal(snapshot.freeze_tip.lag_commits, 3);
    assert.ok(snapshot.honesty.pending_ports.some((p) => /CQ pending/.test(p)));

    const rendered = hud.renderOperatorHud(snapshot);
    assert.match(rendered, /HONESTY/);
    assert.match(rendered, /NON-CLAIM/);
    assert.match(rendered, new RegExp(FREEZE_SHORT7));
    assert.match(rendered, /lag=3/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ─── Package integrity ──────────────────────────────────────────────────────

test('B/package: honesty module + doctor + HUD + docs exist', () => {
  for (const rel of [
    'src/core/observability/doctor-hud-honesty.js',
    'src/core/observability/operator-hud.js',
    'src/core/runtime/operator-doctor.js',
    'scripts/patch-post-l26-b.mjs',
    'docs/adrs/ADR-0063-post-l26-doctor-hud-honesty-surfaces.md'
  ]) {
    assert.ok(fs.existsSync(path.join(PKG, rel)), `missing ${rel}`);
  }
});

// ─── Display hygiene (pending-port summarization) ───────────────────────────
// Token & Context Hygiene: human display truncates long pending-port lists
// (default 10); data model + --json keep the full array.

function makeHygienePorts(n) {
  return Array.from({ length: n }, (_, i) => `P${String(i).padStart(2, '0')} pending`);
}

test('B/hygiene: summarizePendingPorts truncates long lists with count + --json hint', async () => {
  const h = await loadHonesty();
  assert.equal(h.PENDING_PORT_DISPLAY_LIMIT, 10);
  assert.equal(h.summarizePendingPorts([]), 'none');
  assert.equal(h.summarizePendingPorts(['AA pending', 'BB pending'], 10), 'AA pending, BB pending');
  const ports = makeHygienePorts(25);
  const summary = h.summarizePendingPorts(ports, 10);
  assert.match(summary, /25 ports \(showing 10\)/);
  assert.match(summary, /--json for full list/);
  assert.ok(summary.length < ports.join(', ').length, 'summary must be shorter than full dump');
});

test('B/hygiene: surface keeps full array while block/check/reason truncate', async () => {
  const h = await loadHonesty();
  const ports = makeHygienePorts(25);
  const surface = h.buildHonestySurface({
    freezeRevision: FREEZE_TIP,
    sourceRevision: FREEZE_TIP,
    dirty: false,
    pendingPorts: ports,
    pendingPortDisplayLimit: 5,
    surface: 'fixture'
  });
  assert.equal(surface.pending_ports.length, 25);
  assert.equal(surface.pending_port_total, 25);
  assert.match(surface.optimistic.reason, /pending-port: 25 ports \(showing 5\)/);
  assert.match(surface.non_claim_chips.join('\n'), /pending-port visible \(25 ports \(showing 5\)/);
  const block = h.formatHonestyBlock(surface);
  assert.match(block, /pending_ports=25 ports \(showing 5\)/);
  assert.match(block, /total 25; full list in --json/);
  const custom = h.formatHonestyBlock(
    h.buildHonestySurface({
      freezeRevision: FREEZE_TIP,
      sourceRevision: FREEZE_TIP,
      dirty: false,
      pendingPorts: makeHygienePorts(12),
      surface: 'fixture'
    }),
    { pendingPortDisplayLimit: 3 }
  );
  assert.match(custom, /12 ports \(showing 3\)/);
});

test('B/hygiene: doctor pending check truncates detail but JSON keeps full list', async () => {
  const h = await loadHonesty();
  const ports = makeHygienePorts(30);
  const enriched = h.attachHonestyToDoctorReport(
    { ok: true, root: '/tmp', checks: [], failed: [] },
    {
      freezeRevision: FREEZE_TIP,
      sourceRevision: FREEZE_TIP,
      dirty: false,
      pendingPorts: ports,
      pendingPortDisplayLimit: 10
    }
  );
  assert.equal(enriched.honesty.pending_ports.length, 30);
  const check = enriched.checks.find((c) => c.id === 'HONESTY_PENDING_PORT');
  assert.ok(check);
  assert.match(check.detail, /30 ports \(showing 10\)/);
  assert.ok(check.detail.length < ports.join(', ').length);
});
