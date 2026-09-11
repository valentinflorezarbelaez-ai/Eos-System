import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCheckboxTasks,
  assertWritePathsInScope,
  buildComputePlan,
  executeComputeRun,
  ComputeWorkerError
} from '../../scripts/runners/eos-compute-worker.js';

const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

test('SPEC-0008 happy path: pending [ ] becomes [x] when verifier passes (no rollback)', async () => {
  const md = `# Tasks\n\n- [ ] Implement helper\n- [x] OpenSpec FIRST\n`;
  const tasks = parseCheckboxTasks(md);
  assert.equal(tasks.filter((t) => !t.done).length, 1);

  const plan = buildComputePlan({
    changeId: 'eos-compute-worker',
    tasks,
    contextPackPath: CONTEXT_PACK,
    builderId: 'eos-compute-worker-builder',
    verifierId: 'eos-compute-worker-verifier-child',
    plannedWrites: [
      'scripts/runners/eos-compute-worker.js',
      'tests/runners/eos-compute-worker.test.js'
    ]
  });
  assert.equal(plan.role, 'BUILDER');
  assert.equal(plan.contextPackPath, CONTEXT_PACK);

  let rollbackCalls = 0;
  const result = await executeComputeRun({
    plan,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true, exitCode: 0, commands: ['npm test', 'npm run verify:strict'] }),
    rollbackDiff: async () => {
      rollbackCalls += 1;
      return { rolledBack: true };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.equal(rollbackCalls, 0);
  const pending = result.tasks.filter((t) => t.text.includes('Implement helper'));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].done, true);
  assert.match(pending[0].checkbox, /\[x\]/i);
});

test('SPEC-0008 rollback on breach: verifier fail triggers fail-closed rollback', async () => {
  const tasks = parseCheckboxTasks('- [ ] Risky change\n');
  const plan = buildComputePlan({
    changeId: 'eos-compute-worker',
    tasks,
    contextPackPath: CONTEXT_PACK,
    builderId: 'builder-agent-a',
    verifierId: 'verifier-agent-b',
    plannedWrites: ['scripts/runners/eos-compute-worker.js']
  });

  let applied = false;
  let rolledBack = false;
  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      applied = true;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: false, exitCode: 1, reason: 'verify:strict failed' }),
    rollbackDiff: async () => {
      rolledBack = true;
      return { rolledBack: true };
    }
  });

  assert.equal(applied, true);
  assert.equal(rolledBack, true);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'ROLLED_BACK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.tasks.every((t) => t.done === false));
});

test('SPEC-0008 reject out-of-scope writes: Fundacion path fail-closed', () => {
  assert.throws(
    () =>
      assertWritePathsInScope(
        ['Fundacion/index.html', 'scripts/runners/eos-compute-worker.js'],
        { changeId: 'eos-compute-worker' }
      ),
    (err) => err instanceof ComputeWorkerError && err.code === 'OUT_OF_SCOPE_WRITE'
  );

  assert.throws(
    () =>
      buildComputePlan({
        changeId: 'eos-compute-worker',
        tasks: parseCheckboxTasks('- [ ] touch fundacion\n'),
        contextPackPath: CONTEXT_PACK,
        builderId: 'b1',
        verifierId: 'v1',
        plannedWrites: ['Fundacion/secret.md']
      }),
    (err) => err instanceof ComputeWorkerError && err.code === 'OUT_OF_SCOPE_WRITE'
  );

  assert.doesNotThrow(() =>
    assertWritePathsInScope(
      [
        'openspec/changes/eos-compute-worker/tasks.md',
        'scripts/runners/eos-compute-worker.js',
        'tests/runners/eos-compute-worker.test.js'
      ],
      { changeId: 'eos-compute-worker' }
    )
  );
});
