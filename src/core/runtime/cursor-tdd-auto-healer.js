import crypto from 'node:crypto';

/**
 * EOS Cursor TDD Auto-Healer Engine
 * Provides bounded, token-efficient, closed-loop test repair for Cursor Agent and Composer mode.
 * FDIR contract: capture stacktrace → minimal AST delta patch → ≤3 retries → transactional rollback.
 */
export class CursorTDDAutoHealer {
  /**
   * @param {object} [options]
   * @param {number} [options.maxAttempts] Maximum repair iterations before tripping FDIR (default: 3)
   */
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  /**
   * Parses compiler/typecheck failures (tsc, esbuild, syntax errors) from logs.
   * @param {string} log
   * @returns {object}
   */
  parseCompileFailure(log = '') {
    if (!log || typeof log !== 'string') {
      return { hasFailure: false };
    }

    const hasCompile =
      /SyntaxError|TypeError|TS\d{4}|Cannot find module|Unexpected token|ERROR in|Failed to compile|Module not found/i.test(
        log
      );
    if (!hasCompile) {
      return { hasFailure: false };
    }

    const stackMatch = log.match(
      /(?:file:\/\/\/)?([a-zA-Z]:[\\\/][^\s:)]+|[\\\/][^\s:)]+|[a-zA-Z0-9_.\-\\\/]+\.(?:js|ts|tsx|mjs|cjs)):(\d+)(?::(\d+))?/
    );
    const tsMatch = log.match(/error\s+(TS\d+)\s*:\s*([^\n]+)/i);
    const synMatch = log.match(/(SyntaxError|TypeError):\s*([^\n]+)/);

    return {
      hasFailure: true,
      failureClass: 'COMPILE',
      errorType: tsMatch?.[1] || synMatch?.[1] || 'COMPILE_ERROR',
      message: (tsMatch?.[2] || synMatch?.[2] || 'Compilation failed').trim(),
      filePath: stackMatch ? stackMatch[1].trim() : 'unknown',
      lineNumber: stackMatch ? parseInt(stackMatch[2], 10) : null,
      columnNumber: stackMatch?.[3] ? parseInt(stackMatch[3], 10) : null,
      stacktrace: log.slice(0, 2000),
      rawSnippet: log.slice(0, 1000)
    };
  }

  /**
   * Parses test runner stdout/stderr to extract structured failure metrics and location.
   * @param {string} testLog Raw logs from node:test or Jest
   * @returns {object}
   */
  parseTestFailure(testLog = '') {
    if (!testLog && typeof testLog !== 'string') {
      return { hasFailure: false };
    }

    const compile = this.parseCompileFailure(testLog);
    if (compile.hasFailure && !/✖|ERR_ASSERTION|AssertionError/.test(testLog)) {
      return compile;
    }

    const hasFailure = testLog.includes('✖') || testLog.includes('FAIL') || testLog.includes('ERR_ASSERTION') || testLog.includes('AssertionError');
    if (!hasFailure) {
      return compile.hasFailure ? compile : { hasFailure: false };
    }

    // Extract failing test name
    const testMatch = testLog.match(/✖\s+([^\n(]+)/);
    const failingTest = testMatch ? testMatch[1].trim() : 'Unknown Test';

    // Extract error type
    const errTypeMatch = testLog.match(/([A-Z_a-z]+Error\s*(\[[A-Z_a-z0-9]+\])?)/) || testLog.match(/(ERR_[A-Z_0-9]+)/);
    const errorType = errTypeMatch ? (errTypeMatch[2]?.replace(/[\[\]]/g, '') || errTypeMatch[1].trim()) : 'ASSERTION_FAILURE';

    // Extract file path and line number (Windows & POSIX safe)
    const stackMatch = testLog.match(/(?:file:\/\/\/)?([a-zA-Z]:[\\\/][^\s:)]+|[\\\/][^\s:)]+|[a-zA-Z0-9_.\-\\\/]+\.js|\.ts):(\d+):(\d+)/);
    const filePath = stackMatch ? stackMatch[1].trim() : 'unknown';
    const lineNumber = stackMatch ? parseInt(stackMatch[2], 10) : null;

    // Extract expected vs actual
    const diffMatch = testLog.match(/([^\s]+)\s*!==\s*([^\s\n]+)/) || testLog.match(/Expected:\s*([^\n]+)[\s\S]*?Received:\s*([^\n]+)/i);
    let expected = null;
    let actual = null;
    if (diffMatch) {
      if (diffMatch[0].includes('!==')) {
        actual = diffMatch[1].trim();
        expected = diffMatch[2].trim();
      } else {
        expected = diffMatch[1]?.trim();
        actual = diffMatch[2]?.trim();
      }
    }

    return {
      hasFailure: true,
      failureClass: 'ASSERTION',
      errorType,
      failingTest,
      filePath,
      lineNumber,
      expected,
      actual,
      stacktrace: testLog.slice(0, 2000),
      rawSnippet: testLog.slice(0, 1000)
    };
  }

  /**
   * Formulates a minimal AST-oriented delta patch contract for the patcher.
   * @param {object} analysis
   * @param {string} [sourceCode]
   * @returns {object}
   */
  formulateAstDelta(analysis = {}, sourceCode = '') {
    const lines = String(sourceCode || '').split(/\r?\n/);
    const targetLine = Number.isInteger(analysis.lineNumber) ? analysis.lineNumber : null;
    const snippet =
      targetLine && targetLine > 0
        ? lines.slice(Math.max(0, targetLine - 2), targetLine + 1).join('\n')
        : lines.slice(0, 12).join('\n');

    return {
      kind: 'AST_DELTA_MINIMAL',
      failureClass: analysis.failureClass || 'ASSERTION',
      target: {
        filePath: analysis.filePath || 'unknown',
        lineNumber: targetLine,
        columnNumber: analysis.columnNumber || null
      },
      constraint: 'Surgical delta only — do not modify public contracts or tests',
      expected: analysis.expected || null,
      actual: analysis.actual || null,
      errorType: analysis.errorType || 'UNKNOWN',
      contextSnippet: snippet,
      stacktrace: analysis.stacktrace || analysis.rawSnippet || '',
      sha256: `sha256-${crypto.createHash('sha256').update(JSON.stringify({
        file: analysis.filePath,
        line: targetLine,
        err: analysis.errorType,
        exp: analysis.expected,
        act: analysis.actual
      })).digest('hex')}`
    };
  }

  /**
   * Generates a surgical prompt instruction payload tailored for Cursor Composer / LLM patcher.
   * @param {object} analysis
   * @param {string} sourceCode
   * @returns {object}
   */
  generateRepairPayload(analysis, sourceCode = '') {
    const astDelta = this.formulateAstDelta(analysis, sourceCode);
    const prompt = `
[EOS TDD AUTO-HEALER INSTRUCTION]
TARGET_FAILING_TEST: ${analysis.failingTest || analysis.message || 'compile/assertion failure'}
ERROR_TYPE: ${analysis.errorType}
FAILURE_CLASS: ${analysis.failureClass || 'ASSERTION'}
FILE_LOCATION: ${analysis.filePath}:${analysis.lineNumber}
EXPECTED: ${analysis.expected || 'Passing invariant'}
ACTUAL: ${analysis.actual || 'Assertion failed'}
AST_DELTA: ${JSON.stringify(astDelta)}

CONSTRAINTS: Apply surgical delta patch without modifying public contracts or tests. Fix the underlying domain/implementation error.

EXISTING SOURCE CODE:
${sourceCode}
`.trim();

    return {
      prompt,
      analysis,
      astDelta,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Runs the bounded auto-healing loop (max 3 retries) then optional transactional rollback.
   * @param {object} params
   * @param {Function} params.testRunnerFn Async function returning { exitCode, stdout, stderr }
   * @param {Function} params.patcherFn Async function receiving { analysis, astDelta } and returning { patchedCode }
   * @param {Function} [params.rollbackFn] Invoked after budget exhaustion for safe transactional rollback
   * @param {string} [params.sourceCode] Optional source snapshot for AST delta formulation
   * @returns {Promise<object>}
   */
  async executeAutoHealingLoop({ testRunnerFn, patcherFn, rollbackFn, sourceCode = '' }) {
    if (typeof testRunnerFn !== 'function' || typeof patcherFn !== 'function') {
      throw new Error('GOVERNANCE_FAULT: testRunnerFn and patcherFn are mandatory.');
    }

    let attempts = 0;
    const history = [];

    while (attempts < this.maxAttempts) {
      attempts++;
      const testResult = await testRunnerFn();

      if (testResult.exitCode === 0) {
        const payload = JSON.stringify({ attempts, history });
        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        return {
          status: 'HEALED_VERIFIED',
          attempts,
          tokenBudgetBurned: false,
          receipt: {
            sha256: `sha256-${hash}`,
            verifiedAt: new Date().toISOString()
          },
          history
        };
      }

      const log = (testResult.stderr || '') + '\n' + (testResult.stdout || '');
      const failureAnalysis = this.parseTestFailure(log);
      const astDelta = this.formulateAstDelta(failureAnalysis, sourceCode);
      history.push({ attempt: attempts, failureAnalysis, astDelta });

      if (attempts < this.maxAttempts) {
        await patcherFn({ ...failureAnalysis, astDelta }, astDelta);
      }
    }

    let rollback = null;
    if (typeof rollbackFn === 'function') {
      rollback = await rollbackFn({
        reason: 'AUTO_HEALER_BUDGET_EXHAUSTED',
        attempts,
        history
      });
    }

    // Budget exhausted -> halt loop and trigger FDIR / transactional rollback
    return {
      status: 'BUDGET_EXHAUSTED_FDIR_TRIPPED',
      attempts,
      tokenBudgetBurned: true,
      rollback,
      recommendation:
        'Escalate to human architect. Bounded token limit reached without green status. Transactional rollback invoked when provided.',
      history
    };
  }
}
