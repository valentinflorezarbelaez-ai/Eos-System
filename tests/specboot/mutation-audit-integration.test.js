import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpecbootAgentRunner } from '../../src/core/specboot/specboot-agent-runner.js';
import {
  MUTATION_HARNESS_PRODUCTION_READY,
  MUTATION_HARNESS_KIND
} from '../../src/core/sdd/mutation-testing-harness.js';
import path from 'node:path';
import fs from 'node:fs';

test('S14.0 MutationTestingHarness declares PRODUCTION_READY=NO', () => {
  assert.equal(MUTATION_HARNESS_PRODUCTION_READY, 'NO');
  assert.equal(MUTATION_HARNESS_KIND, 'eos-mutation-testing-harness');
});

test('S14.1 MUTATION_AUDIT fail-closed blocks the cycle if mutant survives', async () => {
  const runner = createSpecbootAgentRunner({
    rootDir: process.cwd(),
    readChange: async (id) => ({
      proposalText: 'fix: something',
      tasksMarkdown: '- [ ] S1 Do work',
      changeId: id
    }),
    runOrchestration: async (ctx) => {
      const targetDir = ctx.worktreePath || process.cwd();
      const testFile = path.join(targetDir, 'src/temp-mutation-weak.js');
      const testTest = path.join(targetDir, 'src/temp-mutation-weak.test.js');

      fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
      fs.writeFileSync(testFile, 'export const add = (a, b) => a + b;', 'utf8');
      fs.writeFileSync(
        testTest,
        `
        import test from 'node:test';
        import assert from 'node:assert/strict';
        import { add } from './temp-mutation-weak.js';
        test('add', () => assert.equal(add(0, 0), 0));
      `,
        'utf8'
      );

      return { ok: true, targetFiles: ['src/temp-mutation-weak.js'] };
    },
    writeEvidence: async () => ({ id: 'EVD-9999', path: '/dev/null' })
  });

  try {
    await runner.runCycle('TEST-CHANGE-14', {
      targetFiles: ['src/temp-mutation-weak.js']
    });
    assert.fail('Should have thrown at MUTATION_AUDIT');
  } catch (err) {
    assert.equal(
      err.code,
      'SPECBOOT_MUTATION_AUDIT_FAILED',
      'Must throw mutation audit failure'
    );
  } finally {
    try {
      fs.unlinkSync(path.join(process.cwd(), 'src/temp-mutation-weak.js'));
      fs.unlinkSync(path.join(process.cwd(), 'src/temp-mutation-weak.test.js'));
    } catch {}
  }
});

test('S14.2 MUTATION_AUDIT passes cycle when test kills all mutants', async () => {
  const runner = createSpecbootAgentRunner({
    rootDir: process.cwd(),
    readChange: async (id) => ({
      proposalText: 'fix: robust code',
      tasksMarkdown: '- [ ] S1 Do work robustly',
      changeId: id
    }),
    runOrchestration: async (ctx) => {
      const targetDir = ctx.worktreePath || process.cwd();
      const testFile = path.join(targetDir, 'src/temp-mutation-robust.js');
      const testTest = path.join(targetDir, 'src/temp-mutation-robust.test.js');

      fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
      fs.writeFileSync(
        testFile,
        'export const add = (a, b) => a + b;\nexport const isPositive = (x) => x > 0;',
        'utf8'
      );
      fs.writeFileSync(
        testTest,
        `
        import test from 'node:test';
        import assert from 'node:assert/strict';
        import { add, isPositive } from './temp-mutation-robust.js';

        test('add strictly kills +/- mutants', () => {
          assert.equal(add(2, 3), 5);
          assert.equal(add(10, 20), 30);
        });

        test('isPositive handles positive, negative, and zero', () => {
          assert.equal(isPositive(1), true);
          assert.equal(isPositive(-1), false);
          assert.equal(isPositive(0), false);
        });
      `,
        'utf8'
      );

      return { ok: true, targetFiles: ['src/temp-mutation-robust.js'] };
    },
    writeEvidence: async () => ({ id: 'EVD-9998', path: '/dev/null' })
  });

  try {
    const res = await runner.runCycle('TEST-CHANGE-14-ROBUST', {
      targetFiles: ['src/temp-mutation-robust.js']
    });
    assert.equal(res.ok, true);
    assert.equal(res.status, 'ready-for-HITL-PR');
  } finally {
    try {
      fs.unlinkSync(path.join(process.cwd(), 'src/temp-mutation-robust.js'));
      fs.unlinkSync(path.join(process.cwd(), 'src/temp-mutation-robust.test.js'));
    } catch {}
  }
});
