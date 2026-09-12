import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousSandboxEvaluator } from '../src/core/sandbox/autonomous-sandbox-evaluator.js';

describe('AutonomousSandboxEvaluator', () => {
  describe('parseTestError', () => {
    it('returns UNKNOWN errorType for non-string output', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const result = evaluator.parseTestError(null);
      assert.deepEqual(result, { errorType: 'UNKNOWN', message: 'No output' });
    });

    it('parses AssertionError correctly', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const rawOutput = 'AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected';
      const result = evaluator.parseTestError(rawOutput);
      assert.equal(result.errorType, 'AssertionError');
      assert.equal(result.message, 'Expected values to be strictly deep-equal:');
      assert.equal(result.isParseable, true);
    });

    it('parses TypeError correctly', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const rawOutput = 'TypeError: Cannot read properties of undefined (reading \'foo\')\n    at Object.<anonymous> (/app/src/index.js:4:5)';
      const result = evaluator.parseTestError(rawOutput);
      assert.equal(result.errorType, 'TypeError');
      assert.equal(result.message, 'Cannot read properties of undefined (reading \'foo\')');
      assert.equal(result.failingFile, '/app/src/index.js');
      assert.equal(result.lineNumber, 4);
      assert.equal(result.isParseable, true);
    });

    it('parses ReferenceError correctly', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const rawOutput = 'ReferenceError: invalidVar is not defined\n    at calculate (/app/src/utils.js:10:3)';
      const result = evaluator.parseTestError(rawOutput);
      assert.equal(result.errorType, 'ReferenceError');
      assert.equal(result.message, 'invalidVar is not defined');
      assert.equal(result.failingFile, '/app/src/utils.js');
      assert.equal(result.lineNumber, 10);
      assert.equal(result.isParseable, true);
    });

    it('parses GenericError with stack trace correctly', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const rawOutput = 'Error: Something went wrong\n    at execute (/app/src/core.js:42:15)';
      const result = evaluator.parseTestError(rawOutput);
      assert.equal(result.errorType, 'GenericError');
      assert.ok(result.message.startsWith('Error: Something went wrong'));
      assert.equal(result.failingFile, '/app/src/core.js');
      assert.equal(result.lineNumber, 42);
      assert.equal(result.isParseable, true);
    });

    it('returns GenericError with unparseable string', () => {
      const evaluator = new AutonomousSandboxEvaluator();
      const rawOutput = 'Just some random test output without stack traces or known errors';
      const result = evaluator.parseTestError(rawOutput);
      assert.equal(result.errorType, 'GenericError');
      assert.equal(result.message, rawOutput.slice(0, 200).trim());
      assert.equal(result.failingFile, null);
      assert.equal(result.lineNumber, null);
      assert.equal(result.isParseable, false);
    });
  });

  describe('executeReflexionLoop', () => {
    it('throws REFLEXION_ERROR if mutationFn or testExecutorAsyncFn is missing', async () => {
      const evaluator = new AutonomousSandboxEvaluator();
      await assert.rejects(
        evaluator.executeReflexionLoop({ testExecutorAsyncFn: async () => ({ exitCode: 0 }) }),
        /REFLEXION_ERROR/
      );
      await assert.rejects(
        evaluator.executeReflexionLoop({ mutationFn: async () => ({}) }),
        /REFLEXION_ERROR/
      );
    });

    it('resolves on the first try if tests pass', async () => {
      const evaluator = new AutonomousSandboxEvaluator({ maxRetries: 3 });
      let mutationsCalled = 0;
      let testsCalled = 0;

      const result = await evaluator.executeReflexionLoop({
        taskContract: { task_id: 'TASK-123' },
        mutationFn: async () => { mutationsCalled++; return { code: 'abc' }; },
        testExecutorAsyncFn: async () => { testsCalled++; return { exitCode: 0 }; }
      });

      assert.equal(result.resolved, true);
      assert.equal(result.total_iterations, 1);
      assert.equal(result.verdict, 'VERIFIED_PASS');
      assert.equal(mutationsCalled, 1);
      assert.equal(testsCalled, 1);
      assert.ok(result.evaluation_id.startsWith('TDD-'));
    });

    it('retries until it passes', async () => {
      const evaluator = new AutonomousSandboxEvaluator({ maxRetries: 3 });
      let attempts = 0;

      const result = await evaluator.executeReflexionLoop({
        taskContract: { task_id: 'TASK-456' },
        mutationFn: async (iteration, err) => { return { iteration }; },
        testExecutorAsyncFn: async () => {
          attempts++;
          if (attempts < 3) {
            return { exitCode: 1, stderr: 'AssertionError: test failed' };
          }
          return { exitCode: 0 };
        }
      });

      assert.equal(result.resolved, true);
      assert.equal(result.total_iterations, 3);
      assert.equal(result.verdict, 'VERIFIED_PASS');
    });

    it('exhausts retries without passing', async () => {
      const evaluator = new AutonomousSandboxEvaluator({ maxRetries: 2 });

      const result = await evaluator.executeReflexionLoop({
        taskContract: { task_id: 'TASK-789' },
        mutationFn: async () => { return {}; },
        testExecutorAsyncFn: async () => {
          return { exitCode: 1, stderr: 'Error: always fails' };
        }
      });

      assert.equal(result.resolved, false);
      assert.equal(result.total_iterations, 2);
      assert.equal(result.verdict, 'REFLEXION_EXHAUSTED_FAIL');
    });
  });
});
