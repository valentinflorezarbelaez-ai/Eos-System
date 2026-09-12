/**
 * @file eos-z-target-flight-sandbox.test.js
 * @description SPEC-0031 / Mission Z — Governed Target Flight Sandbox
 *              & Level 2 Precondition Verifier.
 * Hermetic TDD: in-memory trees + os.tmpdir() only; never touch real Fundacion.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-governed-target-flight-sandbox only.
 * Simulation ≠ Fundacion Δ opened.
 * Sandbox ≠ live Fundacion writes.
 * Level-2 receipts ≠ PRODUCTION_READY.
 * Does NOT claim CloudAgent path or PRODUCTION_READY=YES.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRECONDITION_KEYS,
  GATEKEEPER_PRODUCTION_READY,
  GATEKEEPER_KIND,
  createPreconditionGatekeeper,
  evaluatePreconditions,
  receiptOk,
  PreconditionGatekeeperError
} from '../src/core/sandbox/precondition-gatekeeper.js';
import {
  ROLLBACK_ENGINE_PRODUCTION_READY,
  ROLLBACK_ENGINE_KIND,
  createFlightRollbackEngine,
  defaultHashTree,
  FlightRollbackError,
  cloneEntries,
  defaultIsRealFundacionPath as engineIsFundacion
} from '../src/core/sandbox/flight-rollback-engine.js';
import {
  TARGET_FLIGHT_PRODUCTION_READY,
  TARGET_FLIGHT_KIND,
  TARGET_FLIGHT_STATES,
  TARGET_FLIGHT_CODES,
  TargetFlightSandboxError,
  createTargetFlightSandbox,
  createHashChainedLedger,
  defaultHash,
  denyRealFundacion,
  defaultIsRealFundacionPath
} from '../src/core/sandbox/target-flight-sandbox.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_MODULE = path.resolve(
  __dirname,
  '../src/core/sandbox/target-flight-sandbox.js'
);

function allPreconditions(overrides = {}) {
  return {
    REGISTERED: true,
    INTAKE_COMPLETE: true,
    SPEC_APPROVED: { ok: true },
    AUDIT_COMPLETE: true,
    OWNER_APPROVAL: { ok: true },
    LEVEL_2_AUTHORIZED: true,
    ...overrides
  };
}

function hermeticTree() {
  return {
    'src/widget.js': 'export const x = 1;\n',
    'docs/note.md': '# note\n'
  };
}

function sandboxFor(extra = {}) {
  return createTargetFlightSandbox({
    initialTree: hermeticTree(),
    ...extra
  });
}

// ─── Z1 ───────────────────────────────────────────────────────────────────────
test('Z1 kind + PRODUCTION_READY NO', () => {
  assert.equal(TARGET_FLIGHT_PRODUCTION_READY, 'NO');
  assert.equal(TARGET_FLIGHT_KIND, 'eos-governed-target-flight-sandbox');
  assert.equal(GATEKEEPER_PRODUCTION_READY, 'NO');
  assert.equal(ROLLBACK_ENGINE_PRODUCTION_READY, 'NO');
  assert.ok(Object.isFrozen(PRECONDITION_KEYS));
  assert.deepEqual([...PRECONDITION_KEYS], [
    'REGISTERED',
    'INTAKE_COMPLETE',
    'SPEC_APPROVED',
    'AUDIT_COMPLETE',
    'OWNER_APPROVAL',
    'LEVEL_2_AUTHORIZED'
  ]);
  const sb = createTargetFlightSandbox();
  assert.equal(sb.kind, 'eos-governed-target-flight-sandbox');
  assert.equal(sb.PRODUCTION_READY, 'NO');
  assert.equal(sb.health().PRODUCTION_READY, 'NO');
  assert.equal(sb.health().kind, 'eos-governed-target-flight-sandbox');
  assert.equal(sb.getState().PRODUCTION_READY, 'NO');
});

// ─── Z2 ───────────────────────────────────────────────────────────────────────
test('Z2 blocked without Level 2 auth / missing precondition', async () => {
  const sb = sandboxFor();
  const pf = await sb.preflight({
    preconditions: allPreconditions({ LEVEL_2_AUTHORIZED: false }),
    targetPath: '/tmp/eos-z-fixture/src/a.js',
    mutationPlan: { writes: { 'src/a.js': 'x' } },
    tree: hermeticTree()
  });
  assert.equal(pf.ok, false);
  assert.equal(pf.reason, 'PRECONDITION_FAILED');
  assert.ok(pf.missing.includes('LEVEL_2_AUTHORIZED'));
  assert.equal(pf.PRODUCTION_READY, 'NO');
  assert.equal(sb.getState().state, TARGET_FLIGHT_STATES.DENIED);

  const sb2 = sandboxFor();
  const pf2 = await sb2.preflight({
    preconditions: allPreconditions({ OWNER_APPROVAL: false }),
    targetPath: '/tmp/eos-z-fixture/src/a.js',
    tree: hermeticTree()
  });
  assert.equal(pf2.ok, false);
  assert.ok(pf2.missing.includes('OWNER_APPROVAL'));
});

// ─── Z3 ───────────────────────────────────────────────────────────────────────
test('Z3 all 6 + hermetic fixture → preflight OK + snapshot sha256', async () => {
  const tree = hermeticTree();
  const sb = createTargetFlightSandbox({ initialTree: tree });
  const pf = await sb.preflight({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    mutationPlan: { writes: { 'src/widget.js': 'export const x = 2;\n' } },
    tree
  });
  assert.equal(pf.ok, true);
  assert.equal(pf.reason, 'PREFLIGHT_OK');
  assert.equal(pf.PRODUCTION_READY, 'NO');
  assert.equal(pf.fundacionDeltaOpened, false);
  assert.ok(pf.snapshot);
  assert.match(pf.snapshot.sha256, /^[0-9a-f]{64}$/);
  assert.match(pf.sha256, /^[0-9a-f]{64}$/);
  assert.equal(pf.snapshot.sha256, defaultHashTree(tree));
  assert.equal(sb.getState().state, TARGET_FLIGHT_STATES.SANDBOX_ACTIVE);
  assert.equal(sb.getSnapshot().sha256, pf.snapshot.sha256);
});

// ─── Z4 ───────────────────────────────────────────────────────────────────────
test('Z4 real Fundacion-looking path → DENY / FUNDACION_ALWAYS_DENY even with 6 preconditions', async () => {
  const sb = sandboxFor();
  const fundacionPaths = [
    'C:\\Users\\valen\\Documents\\Fundacion\\index.html',
    '/Users/valen/Documents/Fundacion/app.js',
    '/tmp/some/Fundacion/nested/file.js',
    'Documents/Fundacion/x.js'
  ];
  for (const p of fundacionPaths) {
    const one = createTargetFlightSandbox({ initialTree: hermeticTree() });
    const pf = await one.preflight({
      preconditions: allPreconditions(),
      targetPath: p,
      mutationPlan: { writes: { 'src/a.js': 'x' } },
      tree: hermeticTree()
    });
    assert.equal(pf.ok, false, p);
    assert.equal(pf.reason, 'FUNDACION_ALWAYS_DENY', p);
    assert.equal(pf.PRODUCTION_READY, 'NO', p);
    assert.equal(one.getState().state, TARGET_FLIGHT_STATES.DENIED, p);
  }
  const deny = denyRealFundacion('C:/Users/valen/Documents/Fundacion/x');
  assert.ok(deny);
  assert.equal(deny.reason, 'FUNDACION_ALWAYS_DENY');
  assert.equal(defaultIsRealFundacionPath('/safe/fixture/src/a.js'), false);
  assert.equal(engineIsFundacion('/tmp/eos-z-fixture/a.js'), false);

  // Mutation plan targeting Fundacion also denied (even if targetPath is safe)
  const sbPlan = sandboxFor();
  const pfPlan = await sbPlan.preflight({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/a.js',
    mutationPlan: { writes: { 'C:/Users/valen/Documents/Fundacion/hack.js': 'nope' } },
    tree: hermeticTree()
  });
  assert.equal(pfPlan.ok, false);
  assert.equal(pfPlan.reason, 'FUNDACION_ALWAYS_DENY');
});

// ─── Z5 ───────────────────────────────────────────────────────────────────────
test('Z5 ephemeral mutation succeeds + ledger receipt chain', async () => {
  const tree = hermeticTree();
  const sb = createTargetFlightSandbox({ initialTree: tree });
  const result = await sb.run({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    mutationPlan: { writes: { 'src/widget.js': 'export const x = 2;\n' } },
    tree,
    verify: async ({ tree: t }) => ({ ok: t['src/widget.js'] === 'export const x = 2;\n' })
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'FLIGHT_COMMITTED');
  assert.equal(result.state, TARGET_FLIGHT_STATES.COMMITTED);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.fundacionDeltaOpened, false);
  assert.equal(result.hermeticFixtureOnly, true);
  assert.equal(sb.getTree()['src/widget.js'], 'export const x = 2;\n');

  const receipts = sb.getReceipts();
  assert.ok(receipts.length >= 3, `expected ≥3 receipts, got ${receipts.length}`);
  for (let i = 1; i < receipts.length; i += 1) {
    assert.equal(receipts[i].prevHash, receipts[i - 1].sha256, `link ${i}`);
    assert.match(receipts[i].sha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(receipts[0].prevHash, '0'.repeat(64));
  const types = receipts.map((r) => r.type);
  assert.ok(types.includes('PREFLIGHT_OK'));
  assert.ok(types.includes('MUTATION_APPLIED'));
  assert.ok(types.includes('FLIGHT_COMMITTED'));
  assert.equal(sb.getLedger().verifyChain().ok, true);
});

// ─── Z6 ───────────────────────────────────────────────────────────────────────
test('Z6 verify fail → atomic rollback restores snapshot', async () => {
  const tree = hermeticTree();
  const orig = tree['src/widget.js'];
  const sb = createTargetFlightSandbox({ initialTree: tree });
  const result = await sb.run({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    mutationPlan: { writes: { 'src/widget.js': 'BROKEN\n' } },
    tree,
    verify: async () => ({ ok: false, reason: 'verifier rejected' })
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'FLIGHT_VERIFY_FAILED');
  assert.equal(result.rolledBack, true);
  assert.equal(result.state, TARGET_FLIGHT_STATES.ROLLED_BACK);
  assert.equal(sb.getTree()['src/widget.js'], orig);
  assert.deepEqual(sb.getTree(), tree);
  const types = sb.getReceipts().map((r) => r.type);
  assert.ok(types.includes('FLIGHT_VERIFY_FAILED'));
  assert.ok(types.includes('FLIGHT_ROLLED_BACK'));
  assert.equal(sb.getState().state, 'ROLLED_BACK');
});

// ─── Z7 ───────────────────────────────────────────────────────────────────────
test('Z7 rollback engine capture/restore roundtrip', async () => {
  const initial = { 'a.txt': 'alpha', 'b.txt': 'beta' };
  const engine = createFlightRollbackEngine({ tree: initial });
  assert.equal(engine.kind, ROLLBACK_ENGINE_KIND);
  assert.equal(engine.PRODUCTION_READY, 'NO');
  const snap = engine.captureSnapshot();
  assert.match(snap.sha256, /^[0-9a-f]{64}$/);
  assert.equal(snap.sha256, defaultHashTree(initial));
  assert.deepEqual(snap.entries, initial);

  await engine.applyMutation({ writes: { 'a.txt': 'MUTATED', 'c.txt': 'gamma' } });
  assert.equal(engine.getTree()['a.txt'], 'MUTATED');
  assert.equal(engine.getTree()['c.txt'], 'gamma');

  const restored = await engine.rollback(snap);
  assert.equal(restored.ok, true);
  assert.equal(restored.restored, true);
  assert.deepEqual(engine.getTree(), initial);

  await assert.rejects(
    () => engine.rollback(null),
    (err) => err instanceof FlightRollbackError && err.code === 'FLIGHT_SNAPSHOT_INVALID'
  );
  await assert.rejects(
    () => engine.rollback({ sha256: 'deadbeef', entries: { x: 'y' } }),
    (err) => err instanceof FlightRollbackError && err.code === 'FLIGHT_SNAPSHOT_TAMPERED'
  );
  assert.throws(
    () => engine.captureSnapshot('C:\\Users\\valen\\Documents\\Fundacion'),
    (err) => err instanceof FlightRollbackError && err.code === 'FUNDACION_ALWAYS_DENY'
  );
});

// ─── Z8 ───────────────────────────────────────────────────────────────────────
test('Z8 gatekeeper lists each missing key', () => {
  const gk = createPreconditionGatekeeper();
  assert.equal(gk.kind, GATEKEEPER_KIND);
  assert.equal(gk.PRODUCTION_READY, 'NO');
  assert.ok(Object.isFrozen(PRECONDITION_KEYS));

  const empty = gk.evaluate({});
  assert.equal(empty.ok, false);
  assert.deepEqual(empty.missing.slice().sort(), [...PRECONDITION_KEYS].sort());
  assert.equal(empty.PRODUCTION_READY, 'NO');

  const partial = gk.evaluate({
    REGISTERED: true,
    INTAKE_COMPLETE: true
  });
  assert.equal(partial.ok, false);
  assert.deepEqual(partial.missing.sort(), [
    'AUDIT_COMPLETE',
    'LEVEL_2_AUTHORIZED',
    'OWNER_APPROVAL',
    'SPEC_APPROVED'
  ].sort());

  const oneMissing = gk.evaluate(allPreconditions({ OWNER_APPROVAL: false }));
  assert.deepEqual(oneMissing.missing, ['OWNER_APPROVAL']);

  const allOk = gk.evaluate(allPreconditions());
  assert.equal(allOk.ok, true);
  assert.deepEqual(allOk.missing, []);
  for (const k of PRECONDITION_KEYS) {
    assert.equal(allOk.preconditions[k], true, k);
  }

  assert.equal(receiptOk(false), false);
  assert.equal(receiptOk(undefined), false);
  assert.equal(receiptOk({ ok: false }), false);
  assert.equal(receiptOk({ ok: true }), true);

  assert.throws(
    () => gk.assert({ REGISTERED: true }),
    (err) =>
      err instanceof PreconditionGatekeeperError &&
      err.code === 'PRECONDITION_FAILED' &&
      err.missing.includes('LEVEL_2_AUTHORIZED')
  );

  const standalone = evaluatePreconditions({ REGISTERED: true });
  assert.ok(standalone.missing.includes('INTAKE_COMPLETE'));
  assert.equal(standalone.PRODUCTION_READY, 'NO');
});

// ─── Z9 ───────────────────────────────────────────────────────────────────────
test('Z9 HashChainedLedger prevHash links', () => {
  const ledger = createHashChainedLedger();
  const a = ledger.append('A', { n: 1 });
  const b = ledger.append('B', { n: 2 });
  const c = ledger.append('C', { n: 3 });
  assert.equal(a.prevHash, '0'.repeat(64));
  assert.equal(b.prevHash, a.sha256);
  assert.equal(c.prevHash, b.sha256);
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
  assert.match(a.bodySha256, /^[0-9a-f]{64}$/);
  assert.notEqual(a.sha256, a.bodySha256);
  assert.equal(ledger.getTip(), c.sha256);
  const chain = ledger.verifyChain();
  assert.equal(chain.ok, true);
  assert.equal(chain.length, 3);
  const events = ledger.getEvents();
  assert.equal(events[0].type, 'A');
  assert.equal(events[1].prevHash, events[0].sha256);
  assert.equal(events[2].prevHash, events[1].sha256);
});

// ─── Z10 ──────────────────────────────────────────────────────────────────────
test('Z10 unauthorized write attempt fail-closed', async () => {
  const sb = createTargetFlightSandbox({ initialTree: hermeticTree() });
  const idleWrite = await sb.attemptWrite({ path: 'src/hack.js', content: 'nope' });
  assert.equal(idleWrite.ok, false);
  assert.equal(idleWrite.reason, 'FLIGHT_UNAUTHORIZED');
  assert.equal(idleWrite.PRODUCTION_READY, 'NO');
  assert.equal(sb.getState().state, TARGET_FLIGHT_STATES.DENIED);

  await assert.rejects(
    () =>
      createTargetFlightSandbox().executeFlight({
        mutationPlan: { writes: { 'src/a.js': 'x' } }
      }),
    (err) =>
      err instanceof TargetFlightSandboxError &&
      err.code === 'FLIGHT_UNAUTHORIZED'
  );

  const sb2 = createTargetFlightSandbox({ initialTree: hermeticTree() });
  const pf = await sb2.preflight({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    tree: hermeticTree()
  });
  assert.equal(pf.ok, true);
  const fundacionWrite = await sb2.attemptWrite({
    path: 'C:\\Users\\valen\\Documents\\Fundacion\\pwn.js',
    content: 'nope'
  });
  assert.equal(fundacionWrite.ok, false);
  assert.equal(fundacionWrite.reason, 'FUNDACION_ALWAYS_DENY');
});

// ─── Z11 ──────────────────────────────────────────────────────────────────────
test('Z11 state machine honesty', async () => {
  const sb = createTargetFlightSandbox({ initialTree: hermeticTree() });
  assert.equal(sb.getState().state, 'IDLE');
  assert.deepEqual(sb.getState().stateLog, []);

  const happy = await sb.run({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    mutationPlan: { writes: { 'src/widget.js': 'export const x = 3;\n' } },
    tree: hermeticTree(),
    verify: async () => ({ ok: true })
  });
  assert.equal(happy.ok, true);
  const log = sb.getState().stateLog;
  assert.deepEqual(log, [
    'PREFLIGHT',
    'SANDBOX_ACTIVE',
    'MUTATING',
    'VERIFYING',
    'COMMITTED'
  ]);
  assert.ok(!log.includes('DENIED'));
  assert.ok(!log.includes('ROLLED_BACK'));
  // Cannot preflight again from COMMITTED
  await assert.rejects(
    () =>
      sb.preflight({
        preconditions: allPreconditions(),
        targetPath: '/tmp/eos-z-fixture/x',
        tree: hermeticTree()
      }),
    (err) =>
      err instanceof TargetFlightSandboxError &&
      err.code === 'FLIGHT_INVALID_STATE'
  );

  const denied = createTargetFlightSandbox();
  await denied.preflight({
    preconditions: {},
    targetPath: '/tmp/eos-z-fixture/x',
    tree: {}
  });
  assert.deepEqual(denied.getState().stateLog, ['PREFLIGHT', 'DENIED']);
  assert.notEqual(denied.getState().state, 'COMMITTED');
});

// ─── Z12 ──────────────────────────────────────────────────────────────────────
test('Z12 NON-CLAIM source strings + Fundacion Δ=0 honesty in health', () => {
  const src = fs.readFileSync(SANDBOX_MODULE, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /not PRODUCTION_READY|PRODUCTION_READY: 'NO'|PRODUCTION_READY: NO/i);
  assert.match(
    src,
    /simulation ≠ Fundacion Δ opened|simulation != Fundacion|Simulation ≠ Fundacion/
  );
  assert.match(
    src,
    /sandbox ≠ live Fundacion writes|sandbox != live Fundacion|Sandbox ≠ live Fundacion/
  );
  assert.match(src, /FUNDACION_ALWAYS_DENY/);
  assert.match(src, /Δ=0|Delta=0|fundacionDeltaOpened/);
  assert.match(src, /eos-governed-target-flight-sandbox/);

  const sb = createTargetFlightSandbox();
  const h = sb.health();
  const s = sb.status();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(s.PRODUCTION_READY, 'NO');
  assert.equal(h.fundacionDeltaOpened, false);
  assert.equal(h.fundacionAlwaysDenyIntact, true);
  assert.equal(h.hermeticFixtureOnly, true);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.level2ReceiptsMeanProductionReady, false);
  assert.equal(h.simulationIsNotFundacionDelta, true);
  assert.equal(h.sandboxIsNotLiveFundacionWrites, true);
  assert.equal(h.kind, TARGET_FLIGHT_KIND);
  const blob = JSON.stringify(h);
  assert.equal(/PRODUCTION_READY["']?\s*:\s*["']?YES/i.test(blob), false);
  assert.equal(/fundacionDeltaOpened["']?\s*:\s*true/i.test(blob), false);
  assert.ok(h.worktreeIsTmpdir);
  assert.ok(normalizeTmp(h.worktree).startsWith(normalizeTmp(os.tmpdir())));
});

function normalizeTmp(p) {
  return String(p || '').replace(/\\/g, '/').toLowerCase();
}

// ─── Z13 ──────────────────────────────────────────────────────────────────────
test('Z13 writeGateway compose deny is honored (inject, do not rewrite T)', async () => {
  const calls = [];
  const writeGateway = {
    authorizeExternalWrite({ targetPath, receipts }) {
      calls.push({ targetPath, receipts });
      return { allowed: false, reason: 'OUTSIDE_HERMETIC_FIXTURE' };
    }
  };
  const sb = createTargetFlightSandbox({
    initialTree: hermeticTree(),
    writeGateway
  });
  const pf = await sb.preflight({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    tree: hermeticTree()
  });
  assert.equal(pf.ok, false);
  assert.equal(pf.reason, 'OUTSIDE_HERMETIC_FIXTURE');
  assert.equal(pf.writeGateway, true);
  assert.equal(calls.length, 1);
});

// ─── Z14 ──────────────────────────────────────────────────────────────────────
test('Z14 apply fail → ESCALATED_HITL no false success', async () => {
  const sb = createTargetFlightSandbox({
    initialTree: hermeticTree(),
    applyMutation: async () => {
      throw new Error('disk full');
    }
  });
  const result = await sb.run({
    preconditions: allPreconditions(),
    targetPath: '/tmp/eos-z-fixture/src/widget.js',
    mutationPlan: { writes: { 'src/widget.js': 'x' } },
    tree: hermeticTree(),
    verify: async () => ({ ok: true })
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'FLIGHT_APPLY_FAILED');
  assert.equal(result.state, 'ESCALATED_HITL');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.notEqual(result.reason, 'FLIGHT_COMMITTED');
});

// ─── Z15 ──────────────────────────────────────────────────────────────────────
test('Z15 optional SKIP live real Fundacion (must SKIP — never touch)', {
  skip: 'live real Fundacion must never be touched; hermetic-only Mission Z'
}, () => {
  assert.fail('must not execute against real Fundacion');
});

// ─── Z16 ──────────────────────────────────────────────────────────────────────
test('Z16 codes + defaultHash + cloneEntries hermetic helpers', () => {
  assert.equal(TARGET_FLIGHT_CODES.FUNDACION_ALWAYS_DENY, 'FUNDACION_ALWAYS_DENY');
  assert.equal(TARGET_FLIGHT_CODES.PRECONDITION_FAILED, 'PRECONDITION_FAILED');
  assert.equal(defaultHash('abc').length, 64);
  assert.deepEqual(cloneEntries({ a: 1, b: null }), { a: '1', b: '' });
  assert.equal(denyRealFundacion('/safe/path'), null);
  assert.equal(TARGET_FLIGHT_STATES.IDLE, 'IDLE');
  assert.equal(TARGET_FLIGHT_STATES.SANDBOX_ACTIVE, 'SANDBOX_ACTIVE');
});
