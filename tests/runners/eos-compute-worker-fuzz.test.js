import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCheckboxTasks,
  assertWritePathsInScope,
  buildComputePlan,
  executeComputeRun,
  ComputeWorkerError
} from '../../scripts/runners/eos-compute-worker.js';
import {
  assertBuilderVerifierDisjunction,
  BuilderVerifierCustodyError
} from '../../src/core/governance/builder-verifier-custody.js';

const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';
const ZWSP = '\u200b';
const ZWNJ = '\u200c';
const BOM = '\ufeff';

test('FUZZ parseCheckboxTasks: malformed markdown and unclosed checkboxes invent no phantom tasks', () => {
  const md = [
    '# Tasks',
    '',
    'not a checkbox',
    '- [',
    '- [x',
    '- [] missing space and mark',
    '- [ ]',
    '* [ ] wrong bullet',
    '1. [ ] numbered',
    '- [y] invalid mark',
    '-[ ] no space after dash',
    '- [ ] Valid pending task',
    '- [x] Valid done task',
    ''
  ].join('\n');

  const tasks = parseCheckboxTasks(md);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].text, 'Valid pending task');
  assert.equal(tasks[0].done, false);
  assert.equal(tasks[1].text, 'Valid done task');
  assert.equal(tasks[1].done, true);
});

test('FUZZ parseCheckboxTasks: unicode task text is preserved when well-formed', () => {
  const md = '- [ ] Implement café résumé 你好 🚀 harness\n';
  const tasks = parseCheckboxTasks(md);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].text, 'Implement café résumé 你好 🚀 harness');
  assert.equal(tasks[0].done, false);
});

test('FUZZ parseCheckboxTasks: path traversal / null-byte in task text fail-closed', () => {
  assert.throws(
    () => parseCheckboxTasks('- [ ] Write ../../Fundacion/index.html\n'),
    (err) => err instanceof ComputeWorkerError && err.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => parseCheckboxTasks('- [ ] Patch scripts/runners/../../../etc/passwd\n'),
    (err) => err instanceof ComputeWorkerError && err.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => parseCheckboxTasks('- [ ] Touch /etc/shadow payload\n'),
    (err) => err instanceof ComputeWorkerError && err.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => parseCheckboxTasks('- [ ] Windows abs C:\\Windows\\System32\\drivers\\etc\\hosts\n'),
    (err) => err instanceof ComputeWorkerError && err.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => parseCheckboxTasks(`- [ ] null\u0000byte path escape\n`),
    (err) => err instanceof ComputeWorkerError && err.code === 'PATH_TRAVERSAL_REJECTED'
  );
});

test('FUZZ assertWritePathsInScope: traversal and absolute paths fail-closed', () => {
  const policy = { changeId: 'eos-mission-a-worker-custody-fuzz' };
  const bad = [
    'scripts/runners/../../Fundacion/index.html',
    '../openspec/changes/eos-mission-a-worker-custody-fuzz/tasks.md',
    '/etc/passwd',
    'C:/Windows/System32/drivers/etc/hosts',
    'scripts/runners/foo/../../../package.json'
  ];
  for (const p of bad) {
    assert.throws(
      () => assertWritePathsInScope([p], policy),
      (err) => err instanceof ComputeWorkerError && err.code === 'OUT_OF_SCOPE_WRITE'
    );
  }
});

test('FUZZ assertBuilderVerifierDisjunction: identical ids fail-closed', () => {
  assert.throws(
    () => assertBuilderVerifierDisjunction({ builder_id: 'agent-same', verifier_id: 'agent-same' }),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
  assert.throws(
    () => assertBuilderVerifierDisjunction({ builder_id: 'Agent-Same', verifier_id: 'agent-same' }),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
});

test('FUZZ assertBuilderVerifierDisjunction: spoofed same token (invisible/format chars) fail-closed', () => {
  assert.throws(
    () =>
      assertBuilderVerifierDisjunction({
        builder_id: `builder-alpha${ZWSP}`,
        verifier_id: 'builder-alpha'
      }),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
  assert.throws(
    () =>
      assertBuilderVerifierDisjunction({
        builder_id: `${BOM}builder-beta`,
        verifier_id: `builder${ZWNJ}-beta`
      }),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
  assert.doesNotThrow(() =>
    assertBuilderVerifierDisjunction({
      builder_id: 'builder-alpha',
      verifier_id: 'verifier-omega'
    })
  );
});

test('FUZZ rollback: child verify failure restores clean simulated working tree (no dirty residuals)', async () => {
  const snapshot = Object.freeze({
    'scripts/runners/eos-compute-worker.js': 'CLEAN_WORKER',
    'tests/runners/eos-compute-worker-fuzz.test.js': 'CLEAN_FUZZ'
  });
  /** @type {Record<string, string>} */
  const tree = { ...snapshot };

  const plan = buildComputePlan({
    changeId: 'eos-mission-a-worker-custody-fuzz',
    tasks: parseCheckboxTasks('- [ ] Apply scoped helper\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-a-builder',
    verifierId: 'mission-a-verifier-child',
    plannedWrites: [
      'scripts/runners/eos-compute-worker.js',
      'tests/runners/eos-compute-worker-fuzz.test.js'
    ]
  });

  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      tree['scripts/runners/eos-compute-worker.js'] = 'DIRTY_WORKER';
      tree['tests/runners/eos-compute-worker-fuzz.test.js'] = 'DIRTY_FUZZ';
      tree['__orphan_residual__.tmp'] = 'SHOULD_NOT_REMAIN';
      return { applied: true };
    },
    runVerifier: async () => ({ ok: false, exitCode: 1, reason: 'child verify failed' }),
    rollbackDiff: async () => {
      for (const key of Object.keys(tree)) {
        if (!(key in snapshot)) delete tree[key];
      }
      for (const [key, value] of Object.entries(snapshot)) {
        tree[key] = value;
      }
      return { rolledBack: true };
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'ROLLED_BACK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.deepEqual(tree, { ...snapshot });
  assert.equal(Object.prototype.hasOwnProperty.call(tree, '__orphan_residual__.tmp'), false);
});
