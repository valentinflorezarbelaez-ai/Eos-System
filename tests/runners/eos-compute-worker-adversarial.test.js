import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCheckboxTasks,
  assertWritePathsInScope,
  buildComputePlan,
  executeComputeRun,
  ComputeWorkerError
} from '../../scripts/runners/eos-compute-worker.js';
import { BuilderVerifierCustodyError } from '../../src/core/governance/builder-verifier-custody.js';

const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';
const CHANGE_ID = 'eos-compute-worker';
const POLICY = { changeId: CHANGE_ID };

function basePlanArgs(overrides = {}) {
  return {
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Scoped helper\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'adv-builder',
    verifierId: 'adv-verifier-child',
    plannedWrites: ['scripts/runners/eos-compute-worker.js'],
    ...overrides
  };
}

function outOfScope(err) {
  return err instanceof ComputeWorkerError && err.code === 'OUT_OF_SCOPE_WRITE';
}

// ---------------------------------------------------------------------------
// 1. Custody Disjunction & Identity Forgery
// ---------------------------------------------------------------------------

test('ADV custody: buildComputePlan throws when builderId === verifierId', () => {
  assert.throws(
    () =>
      buildComputePlan(
        basePlanArgs({
          builderId: 'same-agent',
          verifierId: 'same-agent'
        })
      ),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
});

test('ADV custody: missing/empty/falsy builderId or verifierId fail-closed', () => {
  const missingBuilder = [
    { builderId: undefined, verifierId: 'v1' },
    { builderId: null, verifierId: 'v1' },
    { builderId: '', verifierId: 'v1' },
    { builderId: '   ', verifierId: 'v1' },
    { builderId: 0, verifierId: 'v1' },
    { builderId: false, verifierId: 'v1' }
  ];
  for (const o of missingBuilder) {
    assert.throws(
      () => buildComputePlan(basePlanArgs(o)),
      (err) =>
        err instanceof BuilderVerifierCustodyError && err.code === 'BUILDER_ID_MISSING'
    );
  }

  const missingVerifier = [
    { builderId: 'b1', verifierId: undefined },
    { builderId: 'b1', verifierId: null },
    { builderId: 'b1', verifierId: '' },
    { builderId: 'b1', verifierId: '   ' },
    { builderId: 'b1', verifierId: 0 },
    { builderId: 'b1', verifierId: false }
  ];
  for (const o of missingVerifier) {
    assert.throws(
      () => buildComputePlan(basePlanArgs(o)),
      (err) =>
        err instanceof BuilderVerifierCustodyError && err.code === 'VERIFIER_ID_MISSING'
    );
  }
});

test('ADV custody: invalid roles / mutated plan schemas fail closed in executeComputeRun', async () => {
  const good = buildComputePlan(basePlanArgs());

  await assert.rejects(
    () =>
      executeComputeRun({
        plan: { ...good, role: 'VERIFIER' },
        applyDiff: async () => ({}),
        runVerifier: async () => ({ ok: true })
      }),
    (err) => err instanceof ComputeWorkerError && err.code === 'PLAN_INVALID'
  );

  await assert.rejects(
    () =>
      executeComputeRun({
        plan: { ...good, role: 'AUDITOR' },
        applyDiff: async () => ({}),
        runVerifier: async () => ({ ok: true })
      }),
    (err) => err instanceof ComputeWorkerError && err.code === 'PLAN_INVALID'
  );

  await assert.rejects(
    () =>
      executeComputeRun({
        plan: null,
        applyDiff: async () => ({}),
        runVerifier: async () => ({ ok: true })
      }),
    (err) => err instanceof ComputeWorkerError && err.code === 'PLAN_INVALID'
  );

  await assert.rejects(
    () =>
      executeComputeRun({
        plan: good,
        applyDiff: null,
        runVerifier: async () => ({ ok: true })
      }),
    (err) => err instanceof ComputeWorkerError && err.code === 'PLAN_INVALID'
  );

  // Mutated plannedWrites after plan construction still checked at execute time
  await assert.rejects(
    () =>
      executeComputeRun({
        plan: { ...good, plannedWrites: ['Fundacion/index.html'] },
        applyDiff: async () => ({}),
        runVerifier: async () => ({ ok: true })
      }),
    outOfScope
  );
});

// ---------------------------------------------------------------------------
// 2. Path Traversal & Scope Bypass
// ---------------------------------------------------------------------------

test('ADV scope: traversal / Fundacion / drive / case / encoded separators fail-closed', () => {
  const bad = [
    '../../Fundacion/index.html',
    'scripts/../../Fundacion',
    '.\\Fundacion\\hacked.js',
    'C:\\Users\\valen\\Documents\\Fundacion',
    'fundacion/secret.json',
    'FUNDACION/app.js',
    'scripts/runners/%2e%2e/%2e%2e/Fundacion/x.js',
    'scripts/runners/foo%2f%2e%2e%2fFundacion/y.js',
    '',
    undefined,
    null
  ];
  for (const p of bad) {
    assert.throws(
      () => assertWritePathsInScope([p], POLICY),
      outOfScope,
      `expected OUT_OF_SCOPE_WRITE for ${JSON.stringify(p)}`
    );
  }

  assert.throws(() => assertWritePathsInScope(null, POLICY), outOfScope);
  assert.throws(() => assertWritePathsInScope(undefined, POLICY), outOfScope);
  assert.throws(() => assertWritePathsInScope('scripts/runners/x.js', POLICY), outOfScope);
  assert.throws(() => assertWritePathsInScope({ path: 'scripts/runners/x.js' }, POLICY), outOfScope);

  // Vacuous empty array remains in-scope (no writes)
  assert.equal(assertWritePathsInScope([], POLICY), true);
});

// ---------------------------------------------------------------------------
// 3. Fuzz parseCheckboxTasks (adversarial markdown shapes)
// ---------------------------------------------------------------------------

test('ADV parseCheckboxTasks: indented bullets, tabs, trailing text, brackets in content', () => {
  const md = [
    '  - [ ] Indented with spaces',
    '\t- [ ] Indented with tab',
    '- [ ] Fix [auth] issue (urgent)',
    '- [x] Done with trailing spaces   ',
    '- [ ] Keep trailing text OK'
  ].join('\n');

  const tasks = parseCheckboxTasks(md);
  assert.equal(tasks.length, 5);
  assert.equal(tasks[0].text, 'Indented with spaces');
  assert.equal(tasks[1].text, 'Indented with tab');
  assert.equal(tasks[2].text, 'Fix [auth] issue (urgent)');
  assert.equal(tasks[2].done, false);
  assert.equal(tasks[3].text, 'Done with trailing spaces');
  assert.equal(tasks[3].done, true);
  assert.equal(tasks[4].text, 'Keep trailing text OK');
});

test('ADV parseCheckboxTasks: CRLF vs LF parity', () => {
  const lf = '- [ ] Alpha\n- [x] Beta\n';
  const crlf = '- [ ] Alpha\r\n- [x] Beta\r\n';
  const a = parseCheckboxTasks(lf);
  const b = parseCheckboxTasks(crlf);
  assert.equal(a.length, 2);
  assert.equal(b.length, 2);
  assert.equal(a[0].text, b[0].text);
  assert.equal(a[1].done, b[1].done);
});

test('ADV parseCheckboxTasks: null/empty/non-string/multiline without checkboxes → clean empty', () => {
  assert.deepEqual(parseCheckboxTasks(null), []);
  assert.deepEqual(parseCheckboxTasks(undefined), []);
  assert.deepEqual(parseCheckboxTasks(''), []);
  assert.deepEqual(parseCheckboxTasks(42), []);
  assert.deepEqual(parseCheckboxTasks({}), []);
  assert.deepEqual(
    parseCheckboxTasks('# Title\n\nJust prose.\nNo boxes here.\n'),
    []
  );
});

// ---------------------------------------------------------------------------
// 4. Rollback & Exception Resilience
// ---------------------------------------------------------------------------

test('ADV rollback: applyDiff unexpected Error → APPLY_FAILED (actual API; tasks unchanged)', async () => {
  const plan = buildComputePlan(basePlanArgs());
  let rollbackCalls = 0;
  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      throw new Error('unexpected apply boom');
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rollbackCalls += 1;
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'APPLY_FAILED');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.match(result.error, /unexpected apply boom/);
  assert.equal(rollbackCalls, 0);
  assert.ok(result.tasks.every((t) => t.done === false));
});

test('ADV rollback: runVerifier throws → fail-closed rollback + ROLLED_BACK', async () => {
  const plan = buildComputePlan(basePlanArgs());
  let applied = false;
  let rolledBack = false;
  const result = await executeComputeRun({
    plan,
    applyDiff: async () => {
      applied = true;
    },
    runVerifier: async () => {
      throw new Error('verifier child crashed');
    },
    rollbackDiff: async () => {
      rolledBack = true;
    }
  });

  assert.equal(applied, true);
  assert.equal(rolledBack, true);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'ROLLED_BACK');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.tasks.every((t) => t.done === false && t.checkbox === '[ ]'));
});

test('ADV rollback: malformed verifier result → fail-closed rollback; tasks never completed', async () => {
  const cases = [null, undefined, {}, { ok: false }, { ok: 'yes' }, { ok: 1 }, 'nope'];

  for (const verifyPayload of cases) {
    const plan = buildComputePlan(
      basePlanArgs({
        tasks: parseCheckboxTasks('- [ ] Must stay pending\n')
      })
    );
    let rolledBack = false;
    const result = await executeComputeRun({
      plan,
      applyDiff: async () => ({ applied: true }),
      runVerifier: async () => verifyPayload,
      rollbackDiff: async () => {
        rolledBack = true;
      }
    });

    assert.equal(result.ok, false, `payload=${JSON.stringify(verifyPayload)}`);
    assert.equal(result.status, 'ROLLED_BACK');
    assert.equal(rolledBack, true);
    assert.ok(result.tasks.every((t) => t.done === false));
    assert.ok(result.tasks.every((t) => t.checkbox === '[ ]'));
  }
});
