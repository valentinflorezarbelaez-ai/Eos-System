import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseCheckboxTasks,
  buildComputePlan,
  executeComputeRun,
  sealComputeRunCustody
} from '../../scripts/runners/eos-compute-worker.js';
import {
  parseCliArgs,
  runComputeWorkerCli,
  defaultPlannedWrites,
  gitRollbackDiff
} from '../../scripts/runners/eos-compute-worker-cli.js';
import { EvidenceCustody } from '../../src/core/sdd/evidence-custody.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';
const CHANGE_ID = 'eos-mission-d-worker-execution-custody';

function tempCustodyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-d-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Atomic rollback helper\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-d-builder',
    verifierId: 'mission-d-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    ...overrides
  });
}

// ---------------------------------------------------------------------------
// 1. Atomic partial-apply rollback
// ---------------------------------------------------------------------------

test('Mission D: partial-apply throw → rollbackDiff + APPLY_FAILED_ROLLED_BACK (zero dirty)', async () => {
  const plan = basePlan();
  let dirty = false;
  let rollbackCalls = 0;

  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      dirty = true; // simulate mid-apply residual
      throw new Error('mid-apply boom');
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rollbackCalls += 1;
      dirty = false;
    },
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'APPLY_FAILED_ROLLED_BACK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.match(result.error, /mid-apply boom/);
  assert.equal(rollbackCalls, 1);
  assert.equal(dirty, false);
  assert.ok(result.tasks.every((t) => t.done === false));
});

test('Mission D: applyDiff throw before any write still invokes rollback (fail-closed)', async () => {
  const plan = basePlan();
  let rollbackCalls = 0;
  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      throw new Error('immediate apply deny');
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rollbackCalls += 1;
    },
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(result.status, 'APPLY_FAILED_ROLLED_BACK');
  assert.equal(rollbackCalls, 1);
});

// ---------------------------------------------------------------------------
// 2. Evidence custody binding on COMPLETED
// ---------------------------------------------------------------------------

test('Mission D: COMPLETED seals EvidenceCustody sealVerifyReceipt with distinct IDs', async () => {
  const plan = basePlan();
  const custodyDir = tempCustodyDir();
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: custodyDir
  });

  const result = await executeComputeRun({
    plan,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    rollbackDiff: async () => {
      throw new Error('rollback must not run on COMPLETED');
    },
    custody
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.custodyReceipt, 'custodyReceipt required');
  assert.equal(result.custodyReceipt.event_type, 'VERIFY_RECEIPT');
  assert.equal(result.custodyReceipt.payload.builder_id, 'mission-d-builder');
  assert.equal(result.custodyReceipt.payload.verifier_id, 'mission-d-verifier-child');
  assert.ok(result.custodyReceipt.payload.receipt_hash);

  const events = custody.listEvents();
  assert.ok(events.length >= 1, 'at least one custody event sealed');
  const last = events[events.length - 1];
  assert.equal(last.event_type, 'VERIFY_RECEIPT');
  assert.equal(last.payload.builder_id, 'mission-d-builder');
  assert.equal(last.payload.verifier_id, 'mission-d-verifier-child');
  assert.equal(last.payload.status, 'COMPLETED');
  assert.ok(last.payload.receipt_hash, 'tamper-evident receipt_hash required');
  assert.notEqual(last.payload.builder_id, last.payload.verifier_id);

  const integrity = custody.verify();
  assert.equal(integrity.valid, true);
});

test('Mission D: sealComputeRunCustody rejects builder===verifier fail-closed', () => {
  const custodyDir = tempCustodyDir();
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: custodyDir
  });
  assert.throws(
    () =>
      sealComputeRunCustody(
        {
          changeId: CHANGE_ID,
          builderId: 'same-agent',
          verifierId: 'same-agent',
          contextPackPath: CONTEXT_PACK,
          plannedWrites: []
        },
        { ok: true },
        { custody }
      ),
    /BUILDER_EQUALS_VERIFIER_VIOLATION/
  );
});

// ---------------------------------------------------------------------------
// 3. CLI exit codes
// ---------------------------------------------------------------------------

test('Mission D CLI: parseCliArgs reads --change=', () => {
  const parsed = parseCliArgs(['--change=eos-mission-d-worker-execution-custody']);
  assert.equal(parsed.changeId, 'eos-mission-d-worker-execution-custody');
});

test('Mission D CLI: missing --change → exit 2', async () => {
  const outcome = await runComputeWorkerCli([], { root: ROOT });
  assert.equal(outcome.exitCode, 2);
  assert.match(outcome.error, /CHANGE_ID_REQUIRED/);
});

test('Mission D CLI: green verification → exit 0 + custody', async () => {
  const custodyDir = tempCustodyDir();
  const outcome = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`],
    {
      root: ROOT,
      applyDiff: async () => ({ applied: true }),
      runVerifier: async () => ({ ok: true, exitCode: 0 }),
      rollbackDiff: async () => ({ rolledBack: true }),
      custodyBaseDir: custodyDir,
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );
  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.result.status, 'COMPLETED');
  assert.ok(outcome.result.custodyReceipt);
});

test('Mission D CLI: verifier breach → non-zero exit + rollback invoked', async () => {
  let rolledBack = false;
  const outcome = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`],
    {
      root: ROOT,
      applyDiff: async () => ({ applied: true }),
      runVerifier: async () => ({ ok: false, reason: 'verify:strict failed' }),
      rollbackDiff: async () => {
        rolledBack = true;
        return { rolledBack: true };
      },
      custodyBaseDir: tempCustodyDir(),
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );
  assert.notEqual(outcome.exitCode, 0);
  assert.equal(outcome.result.status, 'ROLLED_BACK');
  assert.equal(rolledBack, true);
});

test('Mission D CLI: apply fail → non-zero exit + APPLY_FAILED_ROLLED_BACK', async () => {
  let rolledBack = false;
  const outcome = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`],
    {
      root: ROOT,
      applyDiff: async () => {
        throw new Error('cli apply boom');
      },
      runVerifier: async () => ({ ok: true }),
      rollbackDiff: async () => {
        rolledBack = true;
      },
      custodyBaseDir: tempCustodyDir(),
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );
  assert.notEqual(outcome.exitCode, 0);
  assert.equal(outcome.result.status, 'APPLY_FAILED_ROLLED_BACK');
  assert.equal(rolledBack, true);
});

test('Mission D CLI: gitRollbackDiff is callable shape (spawn git)', () => {
  // Empty pathspecs must no-op (never bare git clean -fd).
  const empty = gitRollbackDiff({
    plan: { plannedWrites: [] },
    cwd: ROOT,
    reason: 'unit-shape-empty'
  });
  assert.equal(empty.rolledBack, true);
  assert.equal(empty.skipped, 'NO_PATHS');

  // Concrete pathspec against a tracked, non-mission file.
  const out = gitRollbackDiff({
    plan: { plannedWrites: ['docs/harness/CONTEXT_PACK_TPC.md'] },
    cwd: ROOT,
    reason: 'unit-shape'
  });
  assert.equal(out.rolledBack, true);
  assert.ok(Array.isArray(out.results));
  assert.equal(out.results.length, 2);
});
