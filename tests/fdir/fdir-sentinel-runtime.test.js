/**
 * @file fdir-sentinel-runtime.test.js
 * @description SPEC-0023 Mission R — Governed FDIR Sentinel Runtime watch/quarantine.
 * Hermetic TDD: injectable hashFile / detectOrphans / quarantine; no real setInterval soak.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-fdir-sentinel-runtime only.
 * Does NOT claim AGY DAEMON_PRESENT / agy-daemon / worker-runtime-daemon PRODUCTION_READY.
 * Does NOT require live EOSSentinelDaemon graph (drift/memory-guard).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FDIR_SENTINEL_RUNTIME_PRODUCTION_READY,
  FDIR_SENTINEL_KIND,
  FDIR_SENTINEL_STATES,
  FDIR_SENTINEL_CODES,
  FdirSentinelRuntimeError,
  createFdirSentinelRuntime
} from '../../src/core/fdir/fdir-sentinel-runtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/fdir/fdir-sentinel-runtime.js'
);

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeDeferredTickPorts() {
  let resolveGate;
  let rejectGate;
  const gate = new Promise((resolve, reject) => {
    resolveGate = resolve;
    rejectGate = reject;
  });
  const hashFile = async () => {
    await gate;
    return 'abc';
  };
  return { hashFile, resolveGate, rejectGate };
}

// ─── R1 ───────────────────────────────────────────────────────────────────────
test('R1 PRODUCTION_READY=NO + STOPPED default', async () => {
  assert.equal(FDIR_SENTINEL_RUNTIME_PRODUCTION_READY, 'NO');
  assert.notEqual(FDIR_SENTINEL_RUNTIME_PRODUCTION_READY, 'YES');
  assert.notEqual(FDIR_SENTINEL_RUNTIME_PRODUCTION_READY, true);

  const rt = createFdirSentinelRuntime({
    baselines: { 'a.txt': { sha256: 'deadbeef' } },
    hashFile: async () => 'deadbeef',
    detectOrphans: async () => [],
    quarantine: async () => {}
  });
  const h = rt.health();
  assert.equal(h.state, FDIR_SENTINEL_STATES.STOPPED);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(rt.status().state, 'STOPPED');
  assert.equal(rt.PRODUCTION_READY, 'NO');
});

// ─── R2 ───────────────────────────────────────────────────────────────────────
test('R2 start → RUNNING + kind eos-fdir-sentinel-runtime', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { 'a.txt': { sha256: 'x' } },
    hashFile: async () => 'x',
    detectOrphans: async () => [],
    quarantine: async () => {}
  });
  const st = rt.start();
  assert.equal(st.state, FDIR_SENTINEL_STATES.RUNNING);
  assert.equal(rt.health().state, 'RUNNING');
  assert.equal(rt.health().kind, FDIR_SENTINEL_KIND);
  assert.equal(rt.health().kind, 'eos-fdir-sentinel-runtime');
  assert.equal(rt.health().PRODUCTION_READY, 'NO');
  assert.ok(typeof rt.health().startedAt === 'string');
  assert.ok(rt.health().startedAt.length > 0);
});

// ─── R3 ───────────────────────────────────────────────────────────────────────
test('R3 tick nominal (hashes match, no orphans)', async () => {
  const quarantineCalls = [];
  const rt = createFdirSentinelRuntime({
    baselines: {
      'dir/a': { sha256: 'hash-a' },
      'dir/b': { sha256: 'hash-b' }
    },
    hashFile: async (k) => (k === 'dir/a' ? 'hash-a' : 'hash-b'),
    detectOrphans: async () => [],
    quarantine: async (k, reason) => {
      quarantineCalls.push({ k, reason });
    }
  });
  rt.start();
  const result = await rt.tick();
  assert.equal(result.ok, true);
  assert.equal(result.mismatches.length, 0);
  assert.equal(result.orphans.length, 0);
  assert.equal(quarantineCalls.length, 0);
  const h = rt.health();
  assert.equal(h.ticks, 1);
  assert.equal(h.mismatches, 0);
  assert.equal(h.orphansDetected, 0);
  assert.equal(h.quarantines, 0);
  assert.equal(h.state, 'RUNNING');
});

// ─── R4 ───────────────────────────────────────────────────────────────────────
test('R4 hash mismatch → quarantine + BASELINE_HASH_MISMATCH + UNAUDITED_MUTATION_QUARANTINED', async () => {
  const quarantineCalls = [];
  const rt = createFdirSentinelRuntime({
    baselines: { 'ledger.json': { sha256: 'expected-sha' } },
    hashFile: async () => 'tampered-sha',
    detectOrphans: async () => [],
    quarantine: async (pathKey, reason) => {
      quarantineCalls.push({ pathKey, reason });
    }
  });
  rt.start();
  const result = await rt.tick();
  assert.equal(result.ok, false);
  assert.deepEqual(result.mismatches, ['ledger.json']);
  assert.equal(quarantineCalls.length, 1);
  assert.equal(quarantineCalls[0].pathKey, 'ledger.json');
  assert.equal(
    quarantineCalls[0].reason,
    FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH
  );

  const codes = rt.getEvents().map((e) => e.code);
  assert.ok(codes.includes(FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH));
  assert.ok(codes.includes(FDIR_SENTINEL_CODES.UNAUDITED_MUTATION_QUARANTINED));
  // Prefer remain RUNNING (quarantine applied + events)
  assert.equal(rt.health().state, FDIR_SENTINEL_STATES.RUNNING);
  assert.equal(rt.health().quarantines, 1);
  assert.equal(rt.health().mismatches, 1);
  assert.equal(rt.health().lastFault, FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH);
});

// ─── R5 ───────────────────────────────────────────────────────────────────────
test('R5 orphan → ORPHAN_LINK_DETECTED', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { 'ok': { sha256: '1' } },
    hashFile: async () => '1',
    detectOrphans: async () => [
      { from: 'node-a', to: 'missing-b', relation: 'depends_on' }
    ],
    quarantine: async () => {}
  });
  rt.start();
  const result = await rt.tick();
  assert.equal(result.orphans.length, 1);
  assert.equal(rt.health().orphansDetected, 1);
  const orphanEvts = rt
    .getEvents()
    .filter((e) => e.code === FDIR_SENTINEL_CODES.ORPHAN_LINK_DETECTED);
  assert.equal(orphanEvts.length, 1);
  assert.equal(orphanEvts[0].from, 'node-a');
  assert.equal(orphanEvts[0].to, 'missing-b');
  assert.equal(orphanEvts[0].relation, 'depends_on');
});

// ─── R6 ───────────────────────────────────────────────────────────────────────
test('R6 tick while STOPPED → SENTINEL_NOT_RUNNING', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { a: { sha256: 'x' } },
    hashFile: async () => 'x',
    detectOrphans: async () => [],
    quarantine: async () => {}
  });
  await assert.rejects(
    () => rt.tick(),
    (err) =>
      err instanceof FdirSentinelRuntimeError &&
      err.code === FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
  );
});

// ─── R7 ───────────────────────────────────────────────────────────────────────
test('R7 concurrent tick → SENTINEL_BUSY', async () => {
  const { hashFile, resolveGate } = makeDeferredTickPorts();
  const rt = createFdirSentinelRuntime({
    baselines: { a: { sha256: 'abc' } },
    hashFile,
    detectOrphans: async () => [],
    quarantine: async () => {},
    maxInFlightTicks: 1
  });
  rt.start();

  const first = rt.tick();
  await delay(10);
  assert.equal(rt.health().inFlight, 1);

  await assert.rejects(
    () => rt.tick(),
    (err) =>
      err instanceof FdirSentinelRuntimeError &&
      err.code === FDIR_SENTINEL_CODES.SENTINEL_BUSY
  );

  resolveGate('abc');
  const r = await first;
  assert.equal(r.ok, true);
  assert.equal(rt.health().inFlight, 0);
  assert.equal(rt.health().ticks, 1);
});

// ─── R8 ───────────────────────────────────────────────────────────────────────
test('R8 stop → reject ticks', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { a: { sha256: 'x' } },
    hashFile: async () => 'x',
    detectOrphans: async () => [],
    quarantine: async () => {}
  });
  rt.start();
  const after = await rt.stop();
  assert.equal(after.state, FDIR_SENTINEL_STATES.STOPPED);
  await assert.rejects(
    () => rt.tick(),
    (err) => err.code === FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
  );
});

// ─── R9 ───────────────────────────────────────────────────────────────────────
test('R9 haltOnQuarantine → QUARANTINED blocks further ticks', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { bad: { sha256: 'good' } },
    hashFile: async () => 'evil',
    detectOrphans: async () => [],
    quarantine: async () => {},
    haltOnQuarantine: true
  });
  rt.start();
  await rt.tick();
  assert.equal(rt.health().state, FDIR_SENTINEL_STATES.QUARANTINED);
  assert.equal(rt.health().quarantines, 1);
  await assert.rejects(
    () => rt.tick(),
    (err) => err.code === FDIR_SENTINEL_CODES.SENTINEL_NOT_RUNNING
  );
});

// ─── R10 ──────────────────────────────────────────────────────────────────────
test('R10 health never claims AGY PRESENT / PRODUCTION_READY yes', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: { a: { sha256: '1' } },
    hashFile: async () => '1',
    detectOrphans: async () => [],
    quarantine: async () => {}
  });
  rt.start();
  const h = rt.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, 'eos-fdir-sentinel-runtime');
  assert.notEqual(h.kind, 'agy-daemon');
  assert.notEqual(h.kind, 'eos-compute-worker-runtime');
  assert.ok(!String(h.kind).includes('agy'));
  assert.equal(h.DAEMON_PRESENT, undefined);
  assert.ok(!('AGY_DAEMON_PRESENT' in h));
  const blob = JSON.stringify(h);
  assert.doesNotMatch(blob, /DAEMON_PRESENT["']?\s*:\s*true/i);
  assert.doesNotMatch(blob, /PRODUCTION_READY["']?\s*:\s*["']?YES/i);
});

// ─── R11 ──────────────────────────────────────────────────────────────────────
test('R11 events ledger append-only order', async () => {
  const rt = createFdirSentinelRuntime({
    baselines: {
      one: { sha256: 'ok' },
      two: { sha256: 'expected' }
    },
    hashFile: async (k) => (k === 'one' ? 'ok' : 'wrong'),
    detectOrphans: async () => [
      { from: 'x', to: 'y', relation: 'link' }
    ],
    quarantine: async () => {}
  });
  rt.start();
  await rt.tick();
  const evts = rt.getEvents();
  assert.ok(evts.length >= 3);
  // seq strictly increasing
  for (let i = 1; i < evts.length; i++) {
    assert.ok(evts[i].seq > evts[i - 1].seq);
  }
  // mismatch before quarantine for same path
  const mismatchIdx = evts.findIndex(
    (e) => e.code === FDIR_SENTINEL_CODES.BASELINE_HASH_MISMATCH
  );
  const quarIdx = evts.findIndex(
    (e) => e.code === FDIR_SENTINEL_CODES.UNAUDITED_MUTATION_QUARANTINED
  );
  const orphanIdx = evts.findIndex(
    (e) => e.code === FDIR_SENTINEL_CODES.ORPHAN_LINK_DETECTED
  );
  assert.ok(mismatchIdx >= 0);
  assert.ok(quarIdx > mismatchIdx);
  assert.ok(orphanIdx > quarIdx);

  // append-only: getEvents returns copy; mutating copy does not alter ledger
  const copy = rt.getEvents();
  copy.pop();
  assert.equal(rt.getEvents().length, evts.length);
});

// ─── R12 ──────────────────────────────────────────────────────────────────────
test(
  'R12 optional SKIP live soak',
  { skip: 'optional live soak — hermetic Mission R only (no real setInterval)' },
  async () => {
    // Intentionally skipped: would require long-lived scheduler soak.
  }
);

// ─── Source honesty (supports R10) ────────────────────────────────────────────
test('R10b NON-CLAIM strings present in module source', async () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /NOT agy-daemon/);
  assert.match(src, /eos-fdir-sentinel-runtime/);
  assert.match(src, /FDIR_SENTINEL_RUNTIME_PRODUCTION_READY = 'NO'/);
  assert.doesNotMatch(src, /AGY_DAEMON_PRESENT\s*=\s*true/);
  assert.doesNotMatch(src, /DAEMON_PRESENT\s*:\s*true/);
  assert.equal(FDIR_SENTINEL_RUNTIME_PRODUCTION_READY, 'NO');
});
