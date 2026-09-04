import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CursorTDDAutoHealer } from '../src/core/runtime/cursor-tdd-auto-healer.js';

describe('EOS Cursor TDD Auto-Healer Engine', () => {
  const sampleFailingLog = `
▶ Calculator Component
  ✖ calculates sum of two numbers (12.4ms)
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    
    10 !== 12
    
        at TestContext.<anonymous> (file:///C:/Users/valen/workspace/calculator.test.js:15:12)
        at Test.run (node:internal/test_runner/test:1382:25)
  ✔ calculates subtraction (1.2ms)
✖ Calculator Component (15.1ms)
ℹ tests 2
ℹ pass 1
ℹ fail 1
`;

  test('parseTestFailure extracts error diagnostics, file paths and line numbers accurately', () => {
    const healer = new CursorTDDAutoHealer();
    const analysis = healer.parseTestFailure(sampleFailingLog);

    assert.equal(analysis.hasFailure, true);
    assert.equal(analysis.errorType, 'ERR_ASSERTION');
    assert.equal(analysis.failingTest, 'calculates sum of two numbers');
    assert.ok(analysis.filePath.includes('calculator.test.js'));
    assert.equal(analysis.lineNumber, 15);
    assert.equal(analysis.expected, '12');
    assert.equal(analysis.actual, '10');
  });

  test('generateRepairPayload constructs surgical prompt context for Cursor Agent', () => {
    const healer = new CursorTDDAutoHealer();
    const analysis = healer.parseTestFailure(sampleFailingLog);
    const sourceCode = 'export function add(a, b) { return a + b - 2; }';

    const payload = healer.generateRepairPayload(analysis, sourceCode);

    assert.ok(payload.prompt.includes('TARGET_FAILING_TEST: calculates sum of two numbers'));
    assert.ok(payload.prompt.includes('EXPECTED: 12'));
    assert.ok(payload.prompt.includes('ACTUAL: 10'));
    assert.ok(payload.prompt.includes('CONSTRAINTS: Apply surgical delta patch without modifying public contracts'));
  });

  test('executeAutoHealingLoop achieves green status in bounded iterations', async () => {
    const healer = new CursorTDDAutoHealer({ maxAttempts: 3 });

    let currentCode = 'export function add(a, b) { return 0; }';
    let runCount = 0;

    const mockTestRunner = async () => {
      runCount++;
      if (currentCode.includes('return a + b;')) {
        return { exitCode: 0, stdout: 'All tests passed cleanly.' };
      }
      return { exitCode: 1, stderr: sampleFailingLog };
    };

    const mockPatcher = async (failureInfo) => {
      // Simulate Cursor Composer applying surgical patch on iteration 2
      currentCode = 'export function add(a, b) { return a + b; }';
      return { patchedCode: currentCode };
    };

    const result = await healer.executeAutoHealingLoop({
      testRunnerFn: mockTestRunner,
      patcherFn: mockPatcher
    });

    assert.equal(result.status, 'HEALED_VERIFIED');
    assert.equal(result.attempts, 2);
    assert.equal(result.tokenBudgetBurned, false);
    assert.ok(result.receipt.sha256.startsWith('sha256-'));
  });

  test('executeAutoHealingLoop halts, rolls back, and triggers FDIR when attempts budget is exhausted', async () => {
    const healer = new CursorTDDAutoHealer({ maxAttempts: 3 });
    let runCount = 0;
    let rolledBack = false;

    const brokenTestRunner = async () => {
      runCount++;
      return { exitCode: 1, stderr: sampleFailingLog };
    };

    const dummyPatcher = async () => ({ patchedCode: 'still broken' });
    const rollbackFn = async () => {
      rolledBack = true;
      return { status: 'ROLLBACK_APPLIED' };
    };

    const result = await healer.executeAutoHealingLoop({
      testRunnerFn: brokenTestRunner,
      patcherFn: dummyPatcher,
      rollbackFn
    });

    assert.equal(result.status, 'BUDGET_EXHAUSTED_FDIR_TRIPPED');
    assert.equal(result.attempts, 3);
    assert.equal(runCount, 3);
    assert.equal(rolledBack, true);
    assert.equal(result.rollback.status, 'ROLLBACK_APPLIED');
    assert.ok(result.history[0].astDelta.kind === 'AST_DELTA_MINIMAL');
    assert.ok(result.recommendation.includes('Escalate to human architect'));
  });

  test('parseCompileFailure and formulateAstDelta capture compiler stacktraces', () => {
    const healer = new CursorTDDAutoHealer();
    const compileLog = `
ERROR in src/core/foo.ts:42:5
error TS2304: Cannot find name 'bar'.
SyntaxError: Unexpected token
    at file:///C:/Users/valen/workspace/foo.ts:42:5
`;
    const analysis = healer.parseCompileFailure(compileLog);
    assert.equal(analysis.hasFailure, true);
    assert.equal(analysis.failureClass, 'COMPILE');
    assert.ok(analysis.stacktrace.length > 0);

    const delta = healer.formulateAstDelta(analysis, 'const x = bar;\n');
    assert.equal(delta.kind, 'AST_DELTA_MINIMAL');
    assert.ok(delta.sha256.startsWith('sha256-'));
  });
});
