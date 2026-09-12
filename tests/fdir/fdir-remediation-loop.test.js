/**
 * @file fdir-remediation-loop.test.js
 * @description SPEC-0027 Mission V — Autonomous FDIR Remediation Loop.
 * Hermetic TDD: injectable diagnose / remediate / verify (+ optional sentinel).
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-fdir-remediation-loop only.
 * Does NOT claim AGY DAEMON_PRESENT / PRODUCTION_READY=YES / Fundacion Δ flip.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FDIR_REMEDIATION_LOOP_PRODUCTION_READY,
  FDIR_REMEDIATION_KIND,
  FDIR_REMEDIATION_STATES,
  FDIR_REMEDIATION_CODES,
  FdirRemediationLoopError,
  createFdirRemediationLoop,
  clampMaxAttempts,
  defaultHash
} from '../../src/core/fdir/fdir-remediation-loop.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/fdir/fdir-remediation-loop.js'
);

function ports({
  diagnoseOk = true,
  remediateOk = true,
  verifyOkOnAttempt = 1,
  diagnoseThrow = false,
  remediateThrow = false
} = {}) {
  let verifyCalls = 0;
  return {
    diagnose: async (ctx) => {
      if (diagnoseThrow) throw new Error('diagnose boom');
      return {
        ok: diagnoseOk,
        fault: ctx.fault || 'TEST_FAULT',
        attempt: ctx.attempt
      };
    },
    remediate: async (ctx, diagnosis) => {
      if (remediateThrow) throw new Error('remediate boom');
      return {
        ok: remediateOk,
        action: 'patch-fixture',
        pathKey: 'scratch/fixture.json',
        diagnosisId: diagnosis?.fault,
        attempt: ctx.attempt
      };
    },
    verify: async (ctx) => {
      verifyCalls += 1;
      const ok = verifyCalls >= verifyOkOnAttempt;
      return { ok, status: ok ? 'RESOLVED' : 'FAIL', attempt: ctx.attempt };
    },
    getVerifyCalls: () => verifyCalls
  };
}

// ─── V1 ───────────────────────────────────────────────────────────────────────
test('V1 nominal resolve on attempt 1', async () => {
  const p = ports({ verifyOkOnAttempt: 1 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 3,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  assert.equal(loop.state, FDIR_REMEDIATION_STATES.IDLE);
  const result = await loop.run({ fault: 'BASELINE_HASH_MISMATCH' });
  assert.equal(result.status, FDIR_REMEDIATION_STATES.RESOLVED);
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 1);
  assert.equal(loop.state, FDIR_REMEDIATION_STATES.RESOLVED);
  assert.equal(result.code, FDIR_REMEDIATION_CODES.REMEDIATION_RESOLVED);
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(result.kind, FDIR_REMEDIATION_KIND);
});

// ─── V2 ───────────────────────────────────────────────────────────────────────
test('V2 recover on attempt 2', async () => {
  const p = ports({ verifyOkOnAttempt: 2 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 3,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  const result = await loop.run({ fault: 'ORPHAN_LINK' });
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.attempts, 2);
  assert.equal(p.getVerifyCalls(), 2);
  assert.ok(result.receipts.length >= 2);
});

// ─── V3 ───────────────────────────────────────────────────────────────────────
test('V3 exhaust budget → ESCALATED_HITL (no throw storm)', async () => {
  const p = ports({ verifyOkOnAttempt: 99 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 3,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  const result = await loop.run({ fault: 'PERSISTENT' });
  assert.equal(result.status, FDIR_REMEDIATION_STATES.ESCALATED_HITL);
  assert.equal(result.ok, false);
  assert.equal(result.attempts, 3);
  assert.equal(result.hitlRequired, true);
  assert.equal(result.code, FDIR_REMEDIATION_CODES.REMEDIATION_ESCALATED_HITL);
  assert.equal(loop.state, 'ESCALATED_HITL');
  // Fail-closed: returned result, did not throw uncontrolled
  assert.ok(Array.isArray(result.receipts));
  const escalate = result.receipts.find(
    (r) => r.code === FDIR_REMEDIATION_CODES.REMEDIATION_ESCALATED_HITL
  );
  assert.ok(escalate);
});

// ─── V4 ───────────────────────────────────────────────────────────────────────
test('V4 sentinel quarantine path fails attempt then escalates', async () => {
  const quarantineCalls = [];
  const p = ports({ verifyOkOnAttempt: 1 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 2,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify,
    sentinel: {
      checkRemediation: async () => ({
        ok: false,
        quarantine: true,
        unauthorized: true,
        pathKey: 'scratch/fixture.json',
        reason: 'UNAUDITED_MUTATION'
      }),
      quarantine: async (pathKey, reason) => {
        quarantineCalls.push({ pathKey, reason });
      }
    }
  });
  const result = await loop.run({ fault: 'MUTATION' });
  assert.equal(result.status, 'ESCALATED_HITL');
  assert.equal(quarantineCalls.length, 2); // both attempts quarantined
  assert.equal(quarantineCalls[0].pathKey, 'scratch/fixture.json');
  const qReceipts = result.receipts.filter(
    (r) => r.code === FDIR_REMEDIATION_CODES.REMEDIATION_SENTINEL_QUARANTINE
  );
  assert.equal(qReceipts.length, 2);
  assert.equal(p.getVerifyCalls(), 0); // never reached verify
});

// ─── V5 ───────────────────────────────────────────────────────────────────────
test('V5 maxAttempts clamp (≥1)', async () => {
  assert.equal(clampMaxAttempts(0), 1);
  assert.equal(clampMaxAttempts(-5), 1);
  assert.equal(clampMaxAttempts(2.9), 2);
  assert.equal(clampMaxAttempts(undefined), 3);
  assert.equal(clampMaxAttempts('nope'), 3);

  const p = ports({ verifyOkOnAttempt: 99 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 0,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  assert.equal(loop.maxAttempts, 1);
  const result = await loop.run({});
  assert.equal(result.attempts, 1);
  assert.equal(result.status, 'ESCALATED_HITL');
});

// ─── V6 ───────────────────────────────────────────────────────────────────────
test('V6 diagnose/remediate/verify port wiring', async () => {
  const seen = { diagnose: null, remediate: null, verify: null };
  const loop = createFdirRemediationLoop({
    maxAttempts: 1,
    diagnose: async (ctx) => {
      seen.diagnose = ctx;
      return { ok: true, fault: 'WIRE' };
    },
    remediate: async (ctx, diagnosis) => {
      seen.remediate = { ctx, diagnosis };
      return { ok: true, action: 'noop' };
    },
    verify: async (ctx, remediation) => {
      seen.verify = { ctx, remediation };
      return { ok: true, status: 'OK' };
    }
  });
  await loop.run({ fault: 'WIRE_TEST', tag: 'v6' });
  assert.equal(seen.diagnose.fault, 'WIRE_TEST');
  assert.equal(seen.diagnose.attempt, 1);
  assert.equal(seen.diagnose.kind, FDIR_REMEDIATION_KIND);
  assert.equal(seen.remediate.diagnosis.fault, 'WIRE');
  assert.equal(seen.verify.remediation.action, 'noop');
  assert.equal(seen.verify.ctx.tag, 'v6');
});

// ─── V7 ───────────────────────────────────────────────────────────────────────
test('V7 audit receipt SHA-256 hash present (sealEvd style)', async () => {
  const p = ports({ verifyOkOnAttempt: 1 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 1,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  const result = await loop.run({ fault: 'HASH_ME' });
  assert.ok(result.receipts.length >= 1);
  const r = result.receipts[result.receipts.length - 1];
  assert.equal(typeof r.sha256, 'string');
  assert.equal(r.sha256.length, 64);
  assert.equal(r.bodySha256, r.sha256);
  assert.match(r.sha256, /^[a-f0-9]{64}$/);
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.kind, FDIR_REMEDIATION_KIND);
  // Recompute body hash excluding sha fields + id
  const body = {
    kind: r.kind,
    PRODUCTION_READY: r.PRODUCTION_READY,
    at: r.at,
    attempt: r.attempt,
    phase: r.phase,
    status: r.status,
    code: r.code,
    diagnosis: r.diagnosis,
    remediation: r.remediation,
    verify: r.verify,
    failureContext: r.failureContext,
    sentinel: r.sentinel
  };
  const recomputed = defaultHash(body);
  assert.equal(r.bodySha256, recomputed);
});

// ─── V8 ───────────────────────────────────────────────────────────────────────
test('V8 PRODUCTION_READY false / NO in health + exports', async () => {
  assert.equal(FDIR_REMEDIATION_LOOP_PRODUCTION_READY, 'NO');
  assert.notEqual(FDIR_REMEDIATION_LOOP_PRODUCTION_READY, 'YES');
  assert.notEqual(FDIR_REMEDIATION_LOOP_PRODUCTION_READY, true);

  const p = ports();
  const loop = createFdirRemediationLoop({
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  const h = loop.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(loop.PRODUCTION_READY, 'NO');
  assert.equal(h.cloudAgent, false);
  assert.equal(h.agyDaemonPresent, false);
  const blob = JSON.stringify(h);
  assert.doesNotMatch(blob, /PRODUCTION_READY["']?\s*:\s*["']?YES/i);
});

// ─── V9 ───────────────────────────────────────────────────────────────────────
test('V9 kind === eos-fdir-remediation-loop', async () => {
  const p = ports();
  const loop = createFdirRemediationLoop({
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  assert.equal(FDIR_REMEDIATION_KIND, 'eos-fdir-remediation-loop');
  assert.equal(loop.kind, 'eos-fdir-remediation-loop');
  assert.equal(loop.health().kind, 'eos-fdir-remediation-loop');
  assert.notEqual(loop.kind, 'agy-daemon');
  assert.notEqual(loop.kind, 'eos-fdir-sentinel-runtime');
});

// ─── V10 ──────────────────────────────────────────────────────────────────────
test('V10 invalid/missing ports fail-closed', async () => {
  const loop = createFdirRemediationLoop({ maxAttempts: 2 });
  await assert.rejects(
    () => loop.run({}),
    (err) =>
      err instanceof FdirRemediationLoopError &&
      err.code === FDIR_REMEDIATION_CODES.REMEDIATION_DEPENDENCY &&
      Array.isArray(err.missing) &&
      err.missing.includes('diagnose') &&
      err.missing.includes('remediate') &&
      err.missing.includes('verify')
  );

  const partial = createFdirRemediationLoop({
    diagnose: async () => ({ ok: true }),
    // remediate + verify missing
  });
  await assert.rejects(
    () => partial.run({}),
    (err) =>
      err.code === FDIR_REMEDIATION_CODES.REMEDIATION_DEPENDENCY &&
      err.missing.includes('remediate')
  );
});

// ─── V11 ──────────────────────────────────────────────────────────────────────
test('V11 state transitions honest (IDLE→…→RESOLVED)', async () => {
  const p = ports({ verifyOkOnAttempt: 1 });
  const loop = createFdirRemediationLoop({
    maxAttempts: 1,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  assert.equal(loop.state, 'IDLE');
  await loop.start({ fault: 'TX' }); // start alias
  const log = loop.health().stateLog;
  assert.ok(log.includes('RUNNING'));
  assert.ok(log.includes('DIAGNOSING'));
  assert.ok(log.includes('REMEDIATING'));
  assert.ok(log.includes('REVERIFYING'));
  assert.ok(log.includes('RESOLVED'));
  assert.equal(loop.state, 'RESOLVED');
  // RUNNING appears before DIAGNOSING
  assert.ok(log.indexOf('RUNNING') < log.indexOf('DIAGNOSING'));
  assert.ok(log.indexOf('DIAGNOSING') < log.indexOf('REMEDIATING'));
  assert.ok(log.indexOf('REMEDIATING') < log.indexOf('REVERIFYING'));
  assert.ok(log.indexOf('REVERIFYING') < log.indexOf('RESOLVED'));
});

// ─── V12 ──────────────────────────────────────────────────────────────────────
test('V12 diagnose throw fails attempt then escalates when budget=1', async () => {
  const p = ports({ diagnoseThrow: true });
  const loop = createFdirRemediationLoop({
    maxAttempts: 1,
    diagnose: p.diagnose,
    remediate: p.remediate,
    verify: p.verify
  });
  const result = await loop.run({ fault: 'BOOM' });
  assert.equal(result.status, 'ESCALATED_HITL');
  assert.equal(result.attempts, 1);
  assert.ok(
    result.receipts.some(
      (r) => r.phase === 'DIAGNOSING' && r.status === 'FAILED'
    )
  );
});

// ─── Source honesty ───────────────────────────────────────────────────────────
test('V13 NON-CLAIM + PRODUCTION_READY=NO strings in module source', async () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /eos-fdir-remediation-loop/);
  assert.match(src, /FDIR_REMEDIATION_LOOP_PRODUCTION_READY = 'NO'/);
  assert.match(src, /ESCALATED_HITL/);
  assert.doesNotMatch(src, /AGY_DAEMON_PRESENT\s*=\s*true/);
  assert.doesNotMatch(src, /PRODUCTION_READY\s*=\s*'YES'/);
});
