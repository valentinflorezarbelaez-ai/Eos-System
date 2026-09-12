/**
 * @file worker-runtime-daemon.test.js
 * @description SPEC-0022 Mission Q — Compute Worker Runtime Daemon lifecycle.
 * Hermetic TDD: fake/mock executeComputeRun; no Gemini/Stitch/network.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: this suite validates eos-compute-worker-runtime only.
 * It does NOT claim AGY DAEMON_PRESENT / agy-daemon / eos-workstation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORKER_RUNTIME_DAEMON_PRODUCTION_READY,
  WORKER_DAEMON_STATES,
  WORKER_RUNTIME_KIND,
  WorkerRuntimeDaemonError,
  createWorkerRuntimeDaemon,
  bindExecuteComputeRun
} from '../../src/core/compute/worker-runtime-daemon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/compute/worker-runtime-daemon.js'
);

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeDeferredRun() {
  let resolveRun;
  let rejectRun;
  const gate = new Promise((resolve, reject) => {
    resolveRun = resolve;
    rejectRun = reject;
  });
  const calls = [];
  const executeComputeRun = async (...args) => {
    calls.push(args);
    return gate.then((v) => {
      if (v && v.__throw) throw v.__throw;
      return v;
    });
  };
  return { executeComputeRun, calls, resolveRun, rejectRun };
}

// ─── Q1 ───────────────────────────────────────────────────────────────────────
test('Q1 PRODUCTION_READY=NO + default STOPPED; acceptRun fails NOT_RUNNING', async () => {
  assert.equal(WORKER_RUNTIME_DAEMON_PRODUCTION_READY, 'NO');
  assert.notEqual(WORKER_RUNTIME_DAEMON_PRODUCTION_READY, 'YES');
  assert.notEqual(WORKER_RUNTIME_DAEMON_PRODUCTION_READY, true);

  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  const h = daemon.health();
  assert.equal(h.state, WORKER_DAEMON_STATES.STOPPED);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(daemon.status().state, 'STOPPED');

  await assert.rejects(
    () => daemon.acceptRun({ plan: {} }),
    (err) =>
      err instanceof WorkerRuntimeDaemonError &&
      err.code === 'WORKER_DAEMON_NOT_RUNNING'
  );
});

// ─── Q2 ───────────────────────────────────────────────────────────────────────
test('Q2 start → RUNNING; health.PRODUCTION_READY NO; startedAt set', async () => {
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  const st = daemon.start();
  assert.equal(st.state, WORKER_DAEMON_STATES.RUNNING);
  assert.equal(daemon.health().state, 'RUNNING');
  assert.equal(daemon.health().PRODUCTION_READY, 'NO');
  assert.ok(typeof daemon.health().startedAt === 'string');
  assert.ok(daemon.health().startedAt.length > 0);
});

// ─── Q3 ───────────────────────────────────────────────────────────────────────
test('Q3 acceptRun while RUNNING delegates and increments counters', async () => {
  const calls = [];
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async (args) => {
      calls.push(args);
      return { ok: true, echo: args };
    }
  });
  daemon.start();
  const result = await daemon.acceptRun({ changeId: 'q3' });
  assert.equal(result.ok, true);
  assert.equal(result.echo.changeId, 'q3');
  assert.equal(calls.length, 1);
  const h = daemon.health();
  assert.equal(h.runsAccepted, 1);
  assert.equal(h.runsCompleted, 1);
  assert.equal(h.runsFailed, 0);
  assert.equal(h.inFlight, 0);
  assert.equal(h.state, 'RUNNING');
});

// ─── Q4 ───────────────────────────────────────────────────────────────────────
test('Q4 acceptRun STOPPED → WORKER_DAEMON_NOT_RUNNING', async () => {
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  await assert.rejects(
    () => daemon.acceptRun({}),
    (err) => err.code === 'WORKER_DAEMON_NOT_RUNNING'
  );
});

// ─── Q5 ───────────────────────────────────────────────────────────────────────
test('Q5 concurrent accept maxInFlight=1 → WORKER_DAEMON_BUSY', async () => {
  const { executeComputeRun, resolveRun } = makeDeferredRun();
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun,
    maxInFlight: 1
  });
  daemon.start();

  const first = daemon.acceptRun({ id: 1 });
  // Allow first to enter inFlight
  await delay(10);
  assert.equal(daemon.health().inFlight, 1);

  await assert.rejects(
    () => daemon.acceptRun({ id: 2 }),
    (err) =>
      err instanceof WorkerRuntimeDaemonError &&
      err.code === 'WORKER_DAEMON_BUSY'
  );

  resolveRun({ ok: true });
  const r = await first;
  assert.equal(r.ok, true);
  assert.equal(daemon.health().inFlight, 0);
  assert.equal(daemon.health().runsCompleted, 1);
});

// ─── Q6 ───────────────────────────────────────────────────────────────────────
test('Q6 stop while idle → STOPPED; acceptRun rejected', async () => {
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  daemon.start();
  const after = await daemon.stop();
  assert.equal(after.state, WORKER_DAEMON_STATES.STOPPED);
  await assert.rejects(
    () => daemon.acceptRun({}),
    (err) => err.code === 'WORKER_DAEMON_NOT_RUNNING'
  );
});

// ─── Q7 ───────────────────────────────────────────────────────────────────────
test('Q7 stop({drain:true}) while in-flight → DRAINING then STOPPED; new accepts fail', async () => {
  const { executeComputeRun, resolveRun } = makeDeferredRun();
  const daemon = createWorkerRuntimeDaemon({ executeComputeRun });
  daemon.start();

  const runP = daemon.acceptRun({ id: 'drain' });
  await delay(10);
  assert.equal(daemon.health().inFlight, 1);

  let drainingSeen = false;
  const stopP = daemon.stop({ drain: true }).then((s) => {
    // After stop resolves we must be STOPPED
    assert.equal(s.state, 'STOPPED');
    return s;
  });

  // During drain, state should be DRAINING (poll briefly)
  await delay(5);
  const mid = daemon.status().state;
  if (mid === WORKER_DAEMON_STATES.DRAINING) drainingSeen = true;
  // New accepts must fail during DRAINING or after STOPPED
  await assert.rejects(
    () => daemon.acceptRun({ id: 'late' }),
    (err) => err.code === 'WORKER_DAEMON_NOT_RUNNING'
  );

  resolveRun({ ok: true, drained: true });
  const runResult = await runP;
  assert.equal(runResult.drained, true);
  await stopP;
  assert.equal(daemon.health().state, 'STOPPED');
  // Prefer observing DRAINING; if timing skipped it, still require final STOPPED + reject
  if (!drainingSeen) {
    // Timing race on very fast settle is acceptable if final semantics hold;
    // re-run a controlled observation: start again and drain with longer hold.
    const { executeComputeRun: ex2, resolveRun: res2 } = makeDeferredRun();
    const d2 = createWorkerRuntimeDaemon({ executeComputeRun: ex2 });
    d2.start();
    const p2 = d2.acceptRun({ id: 2 });
    await delay(10);
    const stop2 = d2.stop({ drain: true });
    await delay(5);
    assert.equal(d2.status().state, WORKER_DAEMON_STATES.DRAINING);
    await assert.rejects(
      () => d2.acceptRun({}),
      (err) => err.code === 'WORKER_DAEMON_NOT_RUNNING'
    );
    res2({ ok: true });
    await p2;
    await stop2;
    assert.equal(d2.health().state, 'STOPPED');
  }
});

// ─── Q8 ───────────────────────────────────────────────────────────────────────
test('Q8 injected throw keeps daemon RUNNING + runsFailed++', async () => {
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => {
      const err = new Error('INJECTED_FAIL');
      err.code = 'INJECTED_FAIL';
      throw err;
    }
  });
  daemon.start();
  await assert.rejects(() => daemon.acceptRun({}), (err) => err.code === 'INJECTED_FAIL');
  const h = daemon.health();
  assert.equal(h.state, WORKER_DAEMON_STATES.RUNNING);
  assert.equal(h.runsFailed, 1);
  assert.equal(h.runsAccepted, 1);
  assert.equal(h.runsCompleted, 0);
  assert.equal(h.inFlight, 0);
  // Still accepts after failure
  const d2 = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  d2.start();
  // reuse same daemon with recovery: inject ok via new accept after failed one already proven
  const okDaemon = createWorkerRuntimeDaemon({
    executeComputeRun: async (a) => {
      if (a?.fail) throw Object.assign(new Error('x'), { code: 'X' });
      return { ok: true };
    }
  });
  okDaemon.start();
  await assert.rejects(() => okDaemon.acceptRun({ fail: true }), (e) => e.code === 'X');
  const r = await okDaemon.acceptRun({ fail: false });
  assert.equal(r.ok, true);
  assert.equal(okDaemon.health().state, 'RUNNING');
  assert.equal(okDaemon.health().runsFailed, 1);
  assert.equal(okDaemon.health().runsCompleted, 1);
});

// ─── Q9 ───────────────────────────────────────────────────────────────────────
test('Q9 health.kind = eos-compute-worker-runtime (not agy)', async () => {
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async () => ({ ok: true })
  });
  daemon.start();
  const h = daemon.health();
  assert.equal(h.kind, WORKER_RUNTIME_KIND);
  assert.equal(h.kind, 'eos-compute-worker-runtime');
  assert.notEqual(h.kind, 'agy-daemon');
  assert.notEqual(h.kind, 'eos-workstation');
  assert.ok(!String(h.kind).includes('agy'));
});

// ─── Q10 ──────────────────────────────────────────────────────────────────────
test('Q10 NON-CLAIM strings: no AGY PRESENT pretence in module source', async () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /NOT agy-daemon/);
  assert.match(src, /DAEMON_ABSENT|MUST NOT be read as[\s\S]*DAEMON_PRESENT/);
  assert.doesNotMatch(src, /AGY_DAEMON_PRESENT\s*=\s*true/);
  assert.doesNotMatch(src, /DAEMON_PRESENT\s*:\s*true/);
  // Constant never claims yes/true
  assert.match(src, /WORKER_RUNTIME_DAEMON_PRODUCTION_READY = 'NO'/);
  assert.equal(WORKER_RUNTIME_DAEMON_PRODUCTION_READY, 'NO');
  // Exports must not advertise agy presence
  assert.ok(!('DAEMON_PRESENT' in (await import('../../src/core/compute/worker-runtime-daemon.js'))));
});

// ─── Q11 ──────────────────────────────────────────────────────────────────────
test('Q11 createLoopComputeAdapter + bindExecuteComputeRun wire acceptRun', async () => {
  const calls = [];
  const daemon = createWorkerRuntimeDaemon({
    executeComputeRun: async (a) => {
      calls.push(a);
      return { ok: true, via: 'adapter' };
    }
  });
  daemon.start();
  const adapter = daemon.createLoopComputeAdapter();
  assert.equal(typeof adapter.executeComputeRun, 'function');
  const r1 = await adapter.executeComputeRun({ from: 'adapter' });
  assert.equal(r1.via, 'adapter');

  const bound = bindExecuteComputeRun(daemon);
  const r2 = await bound({ from: 'bind' });
  assert.equal(r2.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(daemon.health().runsAccepted, 2);
  assert.equal(daemon.health().runsCompleted, 2);
});

// ─── Q12 ──────────────────────────────────────────────────────────────────────
test('Q12 optional live SKIP (no network / no real worker required)', { skip: 'optional live — hermetic Mission Q only' }, async () => {
  // Intentionally skipped: would require live Gemini/Stitch credentials.
});
