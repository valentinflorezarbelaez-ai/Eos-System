/**
 * Post-L26 Workstream F — Fundacion Δ=0 game-day dry-run tests.
 * Happy Δ=0 path + refusal matrix (mismatch, missing, dirty, pending,
 * attempted write).
 *
 * NON-CLAIM: green tests ≠ L26 seal change ≠ PRODUCTION_READY flip.
 * PRODUCTION_READY: NO | FUNDACION_ALWAYS_DENY
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const FIXTURE_HAPPY = path.join(PKG, 'fixtures', 'gameday-happy-cl-cp.json');

const OBSERVER = 'Valentin Florez';

async function load() {
  return import('../src/core/fundacion/fundacion-delta0-gameday.js');
}

function baseHappy(mod, overrides = {}) {
  return {
    baseline: {
      freezeTip: mod.DEFAULT_FREEZE_TIP,
      ladder26Status: mod.DEFAULT_LADDER26_STATUS,
      tipSeal: '#366',
      machineId: '77c24295-69bc-4113-82ab-1d8f0359a5e7'
    },
    observer: { name: OBSERVER, role: 'game-day-observer', signedOff: true },
    ports: mod.buildHappyPortSet({ independentCheck: true }),
    dirty: false,
    requireIndependentCheck: true,
    ...overrides
  };
}

// ─── constants ───────────────────────────────────────────────────────────────

test('F/const: schema + PRODUCTION_READY=NO + ports CL–CP + policy', async () => {
  const mod = await load();
  assert.equal(mod.GAMEDAY_SCHEMA, 'eos.fundacion-delta0-gameday.v1');
  assert.equal(mod.GAMEDAY_PRODUCTION_READY, 'NO');
  assert.deepEqual([...mod.L26_PORTS], ['CL', 'CM', 'CN', 'CO', 'CP']);
  assert.equal(mod.FUNDACION_ALWAYS_DENY, true);
  assert.equal(mod.FUNDACION_DELTA_POLICY, 0);
  assert.ok(mod.STOP_CONDITION_IDS.includes('SC5_FUNDACION_WRITE_ATTEMPT'));
  assert.ok(mod.RUN_SHEET_PHASES.includes('P3_RECONCILE_CL_CP'));
  assert.equal(mod.PORT_META.CL.spec, 'SPEC-0095');
  assert.equal(mod.PORT_META.CP.spec, 'SPEC-0099');
});

test('F/helpers: isFundacionTarget detects fundacion paths', async () => {
  const mod = await load();
  assert.equal(mod.isFundacionTarget('Documents/Fundacion/ledger.json'), true);
  assert.equal(mod.isFundacionTarget('/fundacion/write'), true);
  assert.equal(mod.isFundacionTarget('fundacion/notes'), true);
  assert.equal(mod.isFundacionTarget('src/core/traceability/x.js'), false);
  assert.equal(mod.isFundacionTarget(null), false);
});

// ─── HAPPY PATH ──────────────────────────────────────────────────────────────

test('F/pass: happy Δ=0 across CL–CP with independent checks → green', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod));
  assert.equal(g.ok, true);
  assert.equal(g.green, true);
  assert.equal(g.exit_code, mod.EXIT.PASS);
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(g.fundacion_delta, 0);
  assert.equal(g.FUNDACION_ALWAYS_DENY, true);
  assert.equal(g.write_attempt_detected, false);
  assert.equal(g.auto_seal, false);
  assert.equal(g.auto_production_ready_flip, false);
  assert.equal(g.l17_l26_reopen, false);
  assert.equal(g.l27_start, false);
  assert.equal(g.ports.length, 5);
  assert.ok(g.ports.every((p) => p.ok && p.fundacion_delta === 0));
  assert.ok(g.non_claims.some((c) => /Successful game-day/i.test(c)));
  assert.match(g.note, /GAMEDAY_PASS/);
});

test('F/pass: fixture gameday-happy-cl-cp.json loads green', async () => {
  const mod = await load();
  assert.ok(fs.existsSync(FIXTURE_HAPPY), 'happy fixture must exist');
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_HAPPY, 'utf8'));
  const g = mod.runFundacionDelta0Gameday(fixture);
  assert.equal(g.ok, true);
  assert.equal(g.green, true);
  assert.equal(g.fundacion_delta, 0);
});

test('F/pass: ok but no independentCheck → not green, Δ not recorded', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, {
      ports: mod.buildHappyPortSet({ independentCheck: false })
    })
  );
  assert.equal(g.ok, false);
  assert.equal(g.green, false);
  assert.equal(g.fundacion_delta, null);
  assert.equal(
    g.primary_refuse,
    mod.REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED
  );
  assert.ok(
    g.refuses.every(
      (r) =>
        r.code === mod.REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED ||
        r.code === mod.REFUSE_CODES.MISSING_ARTIFACT
    ) ||
      g.refuses.some(
        (r) => r.code === mod.REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED
      )
  );
});

// ─── REFUSAL: mismatch ───────────────────────────────────────────────────────

test('F/refuse/mismatch: digest drift on CL → MISMATCH blocks green', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CL.observed.artifacts[0].digest =
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.equal(g.green, false);
  assert.equal(g.fundacion_delta, null);
  assert.equal(g.primary_refuse, mod.REFUSE_CODES.MISMATCH);
  assert.equal(g.exit_code, mod.EXIT.MISMATCH);
  assert.ok(g.stop_conditions_hit.includes(mod.REFUSE_CODES.MISMATCH));
});

test('F/refuse/mismatch: port status drift CM → MISMATCH', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CM.observed.status = 'DRAFT';
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  // DRAFT is pending → may be PENDING_STATUS first
  assert.ok(
    g.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.MISMATCH ||
        r.code === mod.REFUSE_CODES.PENDING_STATUS
    )
  );
  assert.equal(g.green, false);
});

// ─── REFUSAL: missing artifact ───────────────────────────────────────────────

test('F/refuse/missing: expected artifact absent on CN → MISSING_ARTIFACT', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CN.observed.artifacts = ports.CN.observed.artifacts.slice(1); // drop first
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.equal(g.primary_refuse, mod.REFUSE_CODES.MISSING_ARTIFACT);
  assert.equal(g.exit_code, mod.EXIT.MISSING_ARTIFACT);
  assert.ok(
    g.ports.find((p) => p.port === 'CN').missing.length >= 1
  );
});

test('F/refuse/missing: entire port CO omitted → MISSING_ARTIFACT', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  delete ports.CO;
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.ok(
    g.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.MISSING_ARTIFACT && r.port === 'CO'
    )
  );
  assert.equal(g.green, false);
});

// ─── REFUSAL: dirty input ────────────────────────────────────────────────────

test('F/refuse/dirty: global dirty → DIRTY_INPUT', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, {
      dirty: true,
      dirtyPaths: ['src/core/fundacion/fundacion-delta0-gameday.js']
    })
  );
  assert.equal(g.ok, false);
  assert.equal(g.primary_refuse, mod.REFUSE_CODES.DIRTY_INPUT);
  assert.equal(g.exit_code, mod.EXIT.DIRTY_INPUT);
  assert.equal(g.green, false);
});

test('F/refuse/dirty: per-port dirty on CP → DIRTY_INPUT', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CP.observed.dirty = true;
  ports.CP.observed.dirtyPaths = ['docs/releases/EOS_LADDER_26_CLOSEOUT.md'];
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.ok(
    g.refuses.some(
      (r) => r.code === mod.REFUSE_CODES.DIRTY_INPUT && r.port === 'CP'
    )
  );
});

// ─── REFUSAL: pending status ─────────────────────────────────────────────────

test('F/refuse/pending: pendingPorts list → PENDING_STATUS', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, { pendingPorts: ['CN'] })
  );
  assert.equal(g.ok, false);
  assert.equal(g.primary_refuse, mod.REFUSE_CODES.PENDING_STATUS);
  assert.equal(g.exit_code, mod.EXIT.PENDING_STATUS);
  assert.equal(g.green, false);
});

test('F/refuse/pending: observed status PENDING on CL → PENDING_STATUS', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CL.observed.status = 'PENDING';
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.ok(
    g.refuses.some((r) => r.code === mod.REFUSE_CODES.PENDING_STATUS)
  );
});

// ─── REFUSAL: write attempt / Fundacion policy ───────────────────────────────

test('F/refuse/write: writeAttempt=true → WRITE_ATTEMPT_DENIED fail-closed', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, {
      writeAttempt: true,
      targetPath: 'Documents/Fundacion/ledger.json'
    })
  );
  assert.equal(g.ok, false);
  assert.equal(g.green, false);
  assert.equal(g.write_attempt_detected, true);
  assert.equal(g.fundacion_delta, null);
  assert.ok(
    g.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.WRITE_ATTEMPT_DENIED ||
        r.code === mod.REFUSE_CODES.FUNDACION_ALWAYS_DENY
    )
  );
  assert.equal(g.exit_code, mod.EXIT.WRITE_ATTEMPT_DENIED);
  assert.equal(g.FUNDACION_ALWAYS_DENY, true);
});

test('F/refuse/write: writeAttempts array with fundacion path → denied', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, {
      writeAttempts: [
        { action: 'write', path: '/fundacion/notes.md', fundacion: true }
      ]
    })
  );
  assert.equal(g.ok, false);
  assert.equal(g.write_attempt_detected, true);
  assert.ok(
    g.refuses.some((r) => r.code === mod.REFUSE_CODES.WRITE_ATTEMPT_DENIED)
  );
});

test('F/refuse/delta: nonzero fundacionDelta on observation → DELTA_NONZERO_DENY', async () => {
  const mod = await load();
  const ports = mod.buildHappyPortSet();
  ports.CM.observed.fundacionDelta = 1;
  const g = mod.runFundacionDelta0Gameday(baseHappy(mod, { ports }));
  assert.equal(g.ok, false);
  assert.ok(
    g.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.DELTA_NONZERO_DENY ||
        r.code === mod.REFUSE_CODES.FUNDACION_ALWAYS_DENY
    )
  );
  assert.equal(g.green, false);
  assert.equal(g.fundacion_delta, null);
});

test('F/refuse/policy: allowFundacionWrite=true → FUNDACION_ALWAYS_DENY', async () => {
  const mod = await load();
  const g = mod.runFundacionDelta0Gameday(
    baseHappy(mod, { allowFundacionWrite: true })
  );
  assert.equal(g.ok, false);
  assert.ok(
    g.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.FUNDACION_ALWAYS_DENY ||
        r.code === mod.REFUSE_CODES.WRITE_ATTEMPT_DENIED
    )
  );
});

// ─── helpers / format / detectWriteAttempt ───────────────────────────────────

test('F/helpers: detectWriteAttempt + assertFundacionPolicy + format', async () => {
  const mod = await load();
  const clean = mod.detectWriteAttempt({ path: 'src/x.js' });
  assert.equal(clean.attempted, false);

  const bad = mod.detectWriteAttempt({
    writeAttempt: true,
    targetPath: 'fundacion/x'
  });
  assert.equal(bad.attempted, true);

  const pol = mod.assertFundacionPolicy({ fundacionDelta: 0 });
  assert.equal(pol.ok, true);

  const polBad = mod.assertFundacionPolicy({ fundacionDelta: 2 });
  assert.equal(polBad.ok, false);

  const g = mod.runFundacionDelta0Gameday(baseHappy(mod));
  const summary = mod.formatGamedaySummary(g);
  assert.match(summary, /GAMEDAY_PASS|ok: true/);
  assert.match(summary, /PRODUCTION_READY: NO/);
  assert.match(summary, /FUNDACION_ALWAYS_DENY: true/);
  assert.equal(mod.exitCodeFromGameday(g), 0);
});

test('F/helpers: reconcilePort standalone mismatch', async () => {
  const mod = await load();
  const r = mod.reconcilePort(
    'CL',
    {
      status: 'MEASURED',
      fundacionDelta: 0,
      independentCheck: true,
      artifacts: [{ id: 'a', digest: 'aaa' }]
    },
    {
      status: 'MEASURED',
      fundacionDelta: 0,
      independentCheck: true,
      artifacts: [{ id: 'a', digest: 'bbb' }]
    }
  );
  assert.equal(r.ok, false);
  assert.ok(r.mismatches.some((m) => m.field === 'digest'));
});

test('F/docs: run sheet + ADR + retrospective template exist', async () => {
  const docs = [
    'docs/adrs/ADR-0067-post-l26-fundacion-delta0-gameday.md',
    'docs/evidence/EOS_POST_L26_F_FUNDACION_GAMEDAY_EVD_2026-09-19.md',
    'docs/releases/EOS_POST_L26_F_FUNDACION_GAMEDAY_2026-09-19.md',
    'docs/releases/EOS_POST_L26_F_FUNDACION_GAMEDAY_RUN_SHEET_2026-09-19.md',
    'docs/templates/per-port-artifact-manifest.md',
    'docs/templates/retrospective-template.md',
    'docs/releases/APPLY-POST-L26-F.txt',
    'docs/releases/POST_L26_F_READY'
  ];
  for (const d of docs) {
    assert.ok(
      fs.existsSync(path.join(PKG, d)),
      `missing ${d}`
    );
  }
  const runSheet = fs.readFileSync(
    path.join(
      PKG,
      'docs/releases/EOS_POST_L26_F_FUNDACION_GAMEDAY_RUN_SHEET_2026-09-19.md'
    ),
    'utf8'
  );
  assert.match(runSheet, /CL/);
  assert.match(runSheet, /CP/);
  assert.match(runSheet, /FUNDACION_ALWAYS_DENY|Δ=0/);
  assert.match(runSheet, /stop condition/i);
  assert.match(runSheet, /rollback|no-write/i);

  const retro = fs.readFileSync(
    path.join(PKG, 'docs/templates/retrospective-template.md'),
    'utf8'
  );
  assert.match(retro, /never reopen L17|L17–L25|do not reopen/i);
  assert.match(retro, /L26/);
});
