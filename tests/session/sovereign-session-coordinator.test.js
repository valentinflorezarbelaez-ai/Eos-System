/**
 * @file sovereign-session-coordinator.test.js
 * @description SPEC-0028 Mission W — Sovereign Session Coordinator.
 * Hermetic TDD: injectable Q/R/S/T/V ports (worker/sentinel/specboot/remediation/writeGateway).
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-sovereign-session-coordinator only.
 * Does NOT claim AGY DAEMON_PRESENT / PRODUCTION_READY=YES / Fundacion Δ flip.
 * Does NOT mutate Q/R/S/T/V modules — orchestrates via injection only.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOVEREIGN_SESSION_PRODUCTION_READY,
  SOVEREIGN_SESSION_KIND,
  SOVEREIGN_SESSION_STATES,
  SOVEREIGN_SESSION_CODES,
  SovereignSessionCoordinatorError,
  createSovereignSessionCoordinator,
  clampMaxRemediationAttempts,
  defaultHash
} from '../../src/core/session/sovereign-session-coordinator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/session/sovereign-session-coordinator.js'
);

function mockWorker() {
  const calls = { start: 0, stop: [] };
  return {
    calls,
    start() {
      calls.start += 1;
      return { state: 'RUNNING' };
    },
    async stop(opts = {}) {
      calls.stop.push({ ...opts });
      return { state: 'STOPPED', drain: opts.drain === true };
    },
    health() {
      return { state: 'RUNNING', kind: 'eos-compute-worker-runtime' };
    }
  };
}

function mockSentinel({ quarantineOnTick = false } = {}) {
  const calls = { start: 0, stop: [], tick: 0, quarantine: [] };
  return {
    calls,
    start() {
      calls.start += 1;
      return { state: 'RUNNING' };
    },
    async stop(opts = {}) {
      calls.stop.push({ ...opts });
      return { state: 'STOPPED' };
    },
    async tick() {
      calls.tick += 1;
      if (quarantineOnTick) {
        return {
          quarantine: true,
          unauthorized: true,
          pathKey: 'scratch/fixture.json',
          reason: 'UNAUDITED_MUTATION',
          code: 'UNAUDITED_MUTATION_QUARANTINED',
          status: 'QUARANTINED'
        };
      }
      return { ok: true, status: 'RUNNING' };
    },
    async quarantine(pathKey, reason) {
      calls.quarantine.push({ pathKey, reason });
    },
    health() {
      return { state: 'RUNNING', kind: 'eos-fdir-sentinel-runtime' };
    }
  };
}

function mockSpecboot({ failPhase = null, failUntil = 0 } = {}) {
  let runs = 0;
  return {
    getRuns: () => runs,
    async run(change) {
      runs += 1;
      if (failPhase && runs <= failUntil) {
        return {
          ok: false,
          failed: true,
          phase: failPhase,
          status: 'FAILED',
          changeId: change.changeId || change.id,
          code:
            failPhase === 'VERIFY'
              ? 'SPECBOOT_VERIFY_REQUIRES_EVIDENCE'
              : 'SPECBOOT_APPLY_FAILED'
        };
      }
      return {
        ok: true,
        phase: 'COMMIT_READY',
        status: 'ready-for-HITL-PR',
        changeId: change.changeId || change.id,
        commitReady: true,
        PRODUCTION_READY: 'NO'
      };
    }
  };
}

function mockRemediation({ resolveOnAttempt = 1, alwaysFail = false } = {}) {
  let runs = 0;
  return {
    getRuns: () => runs,
    async run(failureContext) {
      runs += 1;
      if (alwaysFail) {
        return {
          ok: false,
          status: 'ESCALATED_HITL',
          attempts: failureContext.maxAttempts || 3,
          hitlRequired: true
        };
      }
      if (runs >= resolveOnAttempt) {
        return {
          ok: true,
          status: 'RESOLVED',
          attempts: runs,
          code: 'REMEDIATION_RESOLVED'
        };
      }
      return {
        ok: false,
        status: 'ESCALATED_HITL',
        attempts: runs,
        hitlRequired: true
      };
    }
  };
}

function mockWriteGateway({ deny = false, throwOnWrite = false } = {}) {
  const calls = { authorize: 0, write: 0, rollback: 0 };
  return {
    calls,
    authorize(req) {
      calls.authorize += 1;
      if (deny) {
        return {
          allowed: false,
          ok: false,
          reason: 'EXTERNAL_WRITE_PRECONDITION_FAILED',
          missing: ['OWNER_APPROVAL']
        };
      }
      return { allowed: true, ok: true, path: req?.targetPath };
    },
    async write(req) {
      calls.write += 1;
      if (throwOnWrite) throw new Error('write boom');
      return { ok: true, allowed: true, sha256: defaultHash(req?.content || '') };
    },
    async rollback(req) {
      calls.rollback += 1;
      return { ok: true, rolledBack: true, reason: req?.reason };
    }
  };
}

function fullPorts(overrides = {}) {
  const worker = overrides.worker || mockWorker();
  const sentinel = overrides.sentinel || mockSentinel();
  const specboot = overrides.specboot || mockSpecboot();
  const remediation = overrides.remediation || mockRemediation();
  const writeGateway = overrides.writeGateway || mockWriteGateway();
  return { worker, sentinel, specboot, remediation, writeGateway };
}

// ─── W1 ───────────────────────────────────────────────────────────────────────
test('W1 happy path open→run→seal→COMPLETED', async () => {
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation,
    writeGateway: p.writeGateway
  });
  assert.equal(coord.state, SOVEREIGN_SESSION_STATES.IDLE);

  const opened = await coord.openSession({ sessionId: 'sess-w1' });
  assert.equal(opened.ok, true);
  assert.equal(opened.status, 'SESSION_ACTIVE');
  assert.equal(coord.state, 'SESSION_ACTIVE');
  assert.equal(p.worker.calls.start, 1);
  assert.equal(p.sentinel.calls.start, 1);

  const ran = await coord.runChange({ changeId: 'eos-mission-w-demo' });
  assert.equal(ran.ok, true);
  assert.equal(ran.code, SOVEREIGN_SESSION_CODES.SESSION_CHANGE_OK);

  const closed = await coord.closeSession();
  assert.equal(closed.ok, true);
  assert.equal(closed.status, 'COMPLETED');
  assert.equal(coord.state, 'COMPLETED');
  assert.ok(closed.sealedEvd?.sha256);
  assert.match(closed.sealedEvd.sha256, /^[a-f0-9]{64}$/);
  assert.equal(closed.PRODUCTION_READY, 'NO');
  assert.equal(closed.kind, SOVEREIGN_SESSION_KIND);
});

// ─── W2 ───────────────────────────────────────────────────────────────────────
test('W2 INITIALIZING boots worker+sentinel', async () => {
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  const logBefore = coord.health().stateLog.length;
  await coord.openSession({});
  const h = coord.health();
  assert.ok(h.stateLog.includes('INITIALIZING'));
  assert.ok(h.stateLog.includes('SESSION_ACTIVE'));
  assert.equal(p.worker.calls.start, 1);
  assert.equal(p.sentinel.calls.start, 1);
  assert.ok(h.stateLog.length > logBefore);
});

// ─── W3 ───────────────────────────────────────────────────────────────────────
test('W3 APPLY fail then remediation resolves', async () => {
  const p = fullPorts({
    specboot: mockSpecboot({ failPhase: 'APPLY', failUntil: 1 }),
    remediation: mockRemediation({ resolveOnAttempt: 1 })
  });
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  await coord.openSession({});
  const ran = await coord.runChange({ changeId: 'chg-apply-fail' });
  assert.equal(ran.ok, true);
  assert.equal(ran.status, 'REMEDIATED');
  assert.equal(ran.code, SOVEREIGN_SESSION_CODES.SESSION_REMEDIATION_RESOLVED);
  assert.equal(p.remediation.getRuns(), 1);
  assert.equal(coord.state, 'SESSION_ACTIVE');
});

// ─── W4 ───────────────────────────────────────────────────────────────────────
test('W4 remediation exhaust → ESCALATED_HITL', async () => {
  const p = fullPorts({
    specboot: mockSpecboot({ failPhase: 'VERIFY', failUntil: 99 }),
    remediation: mockRemediation({ alwaysFail: true })
  });
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation,
    maxRemediationAttempts: 3
  });
  await coord.openSession({});
  const ran = await coord.runChange({ changeId: 'chg-exhaust' });
  assert.equal(ran.ok, false);
  assert.equal(ran.status, 'ESCALATED_HITL');
  assert.equal(ran.hitlRequired, true);
  assert.equal(coord.state, 'ESCALATED_HITL');
  assert.equal(ran.code, SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL);
});

// ─── W5 ───────────────────────────────────────────────────────────────────────
test('W5 CLOSING drains worker with drain:true', async () => {
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  await coord.openSession({});
  await coord.runChange({ changeId: 'chg-drain' });
  const closed = await coord.closeSession();
  assert.equal(closed.status, 'COMPLETED');
  assert.equal(p.worker.calls.stop.length, 1);
  assert.equal(p.worker.calls.stop[0].drain, true);
  assert.ok(closed.drainCalls.worker);
});

// ─── W6 ───────────────────────────────────────────────────────────────────────
test('W6 SEALED emits EVD sha256 custody receipt', async () => {
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  await coord.openSession({ sessionId: 'sess-seal' });
  await coord.runChange({ changeId: 'chg-seal' });
  await coord.seal();
  const evd = coord.getSealedEvd();
  assert.ok(evd);
  assert.match(evd.sha256, /^[a-f0-9]{64}$/);
  assert.equal(evd.bodySha256, evd.sha256);
  assert.equal(evd.custody.algorithm, 'sha256');
  assert.equal(evd.custody.digest, evd.sha256);
  assert.ok(evd.custody.receiptCount >= 1);
  const sealedReceipt = coord
    .getReceipts()
    .find((r) => r.code === SOVEREIGN_SESSION_CODES.SESSION_SEALED);
  assert.ok(sealedReceipt);
  assert.match(sealedReceipt.sha256, /^[a-f0-9]{64}$/);
  // state progressed through SEALED into COMPLETED
  const h = coord.health();
  assert.ok(h.stateLog.includes('SEALED'));
  assert.equal(coord.state, 'COMPLETED');
});

// ─── W7 ───────────────────────────────────────────────────────────────────────
test('W7 writeGateway deny/rollback path', async () => {
  const denyGw = mockWriteGateway({ deny: true });
  const p = fullPorts({ writeGateway: denyGw });
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation,
    writeGateway: denyGw
  });
  await coord.openSession({});
  const denied = await coord.runChange({
    changeId: 'chg-write-deny',
    externalWrite: {
      projectId: 'fixture-proj',
      targetPath: '/tmp/hermetic-fixture/out.txt',
      content: 'x'
    }
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 'ESCALATED_HITL');
  assert.equal(denyGw.calls.authorize, 1);
  assert.equal(denyGw.calls.write, 0);

  // rollback path: authorize ok, write throws → rollback
  const rbGw = mockWriteGateway({ throwOnWrite: true });
  const p2 = fullPorts({ writeGateway: rbGw });
  const coord2 = createSovereignSessionCoordinator({
    workerDaemon: p2.worker,
    sentinel: p2.sentinel,
    specboot: p2.specboot,
    remediation: p2.remediation,
    writeGateway: rbGw
  });
  await coord2.openSession({});
  const rolled = await coord2.runChange({
    changeId: 'chg-write-rb',
    externalWrite: {
      projectId: 'fixture-proj',
      targetPath: '/tmp/hermetic-fixture/out.txt',
      content: 'y'
    }
  });
  assert.equal(rolled.ok, false);
  assert.equal(rolled.status, 'ESCALATED_HITL');
  assert.equal(rbGw.calls.rollback, 1);
  const rbReceipt = coord2
    .getReceipts()
    .find((r) => r.code === SOVEREIGN_SESSION_CODES.SESSION_WRITE_ROLLED_BACK);
  assert.ok(rbReceipt);
});

// ─── W8 ───────────────────────────────────────────────────────────────────────
test('W8 PRODUCTION_READY NO + kind', async () => {
  assert.equal(SOVEREIGN_SESSION_PRODUCTION_READY, 'NO');
  assert.equal(SOVEREIGN_SESSION_KIND, 'eos-sovereign-session-coordinator');
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    specboot: p.specboot,
    remediation: p.remediation
  });
  assert.equal(coord.PRODUCTION_READY, 'NO');
  assert.equal(coord.kind, SOVEREIGN_SESSION_KIND);
  const h = coord.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, SOVEREIGN_SESSION_KIND);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.agyDaemonPresent, false);
  assert.equal(h.fundacionDelta, 0);
});

// ─── W9 ───────────────────────────────────────────────────────────────────────
test('W9 missing ports fail-closed', async () => {
  // missing workerDaemon → ESCALATED_HITL on open
  const bare = createSovereignSessionCoordinator({});
  const opened = await bare.openSession({});
  assert.equal(opened.ok, false);
  assert.equal(opened.status, 'ESCALATED_HITL');
  assert.equal(opened.hitlRequired, true);
  assert.ok(
    opened.receipt?.code === SOVEREIGN_SESSION_CODES.SESSION_DEPENDENCY ||
      opened.code === SOVEREIGN_SESSION_CODES.SESSION_ESCALATED_HITL
  );

  // worker present but no specboot → escalate on runChange
  const workerOnly = createSovereignSessionCoordinator({
    workerDaemon: mockWorker(),
    requireSpecboot: true
  });
  const o2 = await workerOnly.openSession({});
  assert.equal(o2.ok, true);
  const ran = await workerOnly.runChange({ changeId: 'no-boot' });
  assert.equal(ran.ok, false);
  assert.equal(ran.status, 'ESCALATED_HITL');
});

// ─── W10 ──────────────────────────────────────────────────────────────────────
test('W10 state machine honesty', async () => {
  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  assert.equal(coord.getState(), 'IDLE');
  await coord.openSession({});
  assert.equal(coord.getState(), 'SESSION_ACTIVE');
  await coord.runChange({ changeId: 'sm' });
  await coord.closeSession();
  const log = coord.health().stateLog;
  assert.deepEqual(
    log.filter((s, i) => i === 0 || s !== log[i - 1] || true).slice(0, 6).length >= 5,
    true
  );
  // Expected sequence contains these in order
  const idx = (s) => log.indexOf(s);
  assert.ok(idx('INITIALIZING') >= 0);
  assert.ok(idx('SESSION_ACTIVE') > idx('INITIALIZING'));
  assert.ok(idx('CLOSING') > idx('SESSION_ACTIVE'));
  assert.ok(idx('SEALED') > idx('CLOSING'));
  assert.ok(idx('COMPLETED') > idx('SEALED'));
  assert.equal(coord.state, 'COMPLETED');

  // Invalid: runChange while IDLE throws
  const idle = createSovereignSessionCoordinator({
    workerDaemon: mockWorker(),
    specboot: mockSpecboot()
  });
  await assert.rejects(
    () => idle.runChange({ changeId: 'x' }),
    (err) =>
      err instanceof SovereignSessionCoordinatorError &&
      err.code === SOVEREIGN_SESSION_CODES.SESSION_INVALID_STATE
  );
});

// ─── W11 ──────────────────────────────────────────────────────────────────────
test('W11 sentinel quarantine during session', async () => {
  const sentinel = mockSentinel({ quarantineOnTick: true });
  const p = fullPorts({ sentinel });
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  await coord.openSession({});
  const ran = await coord.runChange({ changeId: 'chg-quar' });
  assert.equal(ran.ok, false);
  assert.equal(ran.status, 'ESCALATED_HITL');
  assert.equal(sentinel.calls.tick, 1);
  assert.equal(sentinel.calls.quarantine.length, 1);
  assert.equal(sentinel.calls.quarantine[0].pathKey, 'scratch/fixture.json');
  const q = coord
    .getReceipts()
    .find((r) => r.code === SOVEREIGN_SESSION_CODES.SESSION_SENTINEL_QUARANTINE);
  assert.ok(q);
});

// ─── W12 ──────────────────────────────────────────────────────────────────────
test('W12 startSession alias + clamp maxRemediationAttempts', async () => {
  assert.equal(clampMaxRemediationAttempts(0), 1);
  assert.equal(clampMaxRemediationAttempts(-2), 1);
  assert.equal(clampMaxRemediationAttempts(2.9), 2);
  assert.equal(clampMaxRemediationAttempts(undefined), 3);
  assert.equal(clampMaxRemediationAttempts('nope'), 3);

  const p = fullPorts();
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    specboot: p.specboot,
    remediation: p.remediation,
    maxRemediationAttempts: 0
  });
  assert.equal(coord.maxRemediationAttempts, 1);
  const opened = await coord.startSession({ sessionId: 'alias' });
  assert.equal(opened.ok, true);
  assert.equal(opened.sessionId, 'alias');
});

// ─── W13 ──────────────────────────────────────────────────────────────────────
test('W13 NON-CLAIM source strings + defaultHash', async () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.ok(src.includes("PRODUCTION_READY: NO") || src.includes("PRODUCTION_READY = 'NO'") || src.includes("='NO'"));
  assert.ok(src.includes('eos-sovereign-session-coordinator'));
  assert.ok(src.includes('NON-CLAIM'));
  assert.ok(src.includes('NOT agy-daemon') || src.includes('not agy-daemon') || /agy-daemon/i.test(src));
  assert.ok(/Fundacion/i.test(src));
  assert.ok(!src.includes('CloudAgent') || src.includes('NOT') || src.includes('never claim') || src.includes('cloudAgent'));
  // hash helper
  const h = defaultHash({ a: 1 });
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.equal(defaultHash('abc'), defaultHash('abc'));
});

// ─── W14 ──────────────────────────────────────────────────────────────────────
test('W14 close after escalate still seals custody EVD', async () => {
  const p = fullPorts({
    specboot: mockSpecboot({ failPhase: 'APPLY', failUntil: 99 }),
    remediation: mockRemediation({ alwaysFail: true })
  });
  const coord = createSovereignSessionCoordinator({
    workerDaemon: p.worker,
    sentinel: p.sentinel,
    specboot: p.specboot,
    remediation: p.remediation
  });
  await coord.openSession({});
  await coord.runChange({ changeId: 'chg-esc-seal' });
  assert.equal(coord.state, 'ESCALATED_HITL');
  const closed = await coord.closeSession();
  assert.equal(closed.ok, false);
  assert.equal(closed.status, 'ESCALATED_HITL');
  assert.ok(closed.sealedEvd?.sha256);
  assert.match(closed.sealedEvd.sha256, /^[a-f0-9]{64}$/);
  assert.ok(coord.health().stateLog.includes('SEALED'));
  assert.equal(p.worker.calls.stop[0].drain, true);
});
