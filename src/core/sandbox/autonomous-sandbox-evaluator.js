/**
 * @module AutonomousSandboxEvaluator
 * @description Devin/SWE-agent-grade ReAct Reflexion Loop engine.
 * Executes mutations in hermetic sandboxes, parses test failure stack traces,
 * and performs bounded autonomous self-correction until 100% test pass.
 */

import { createHash, randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class AutonomousSandboxEvaluator {
  /**
   * @param {object} [options]
   * @param {number} [options.maxRetries] Default 3
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.evaluationLog = [];
  }

  /**
   * Parses test runner stderr/stdout into a structured error diagnosis
   * @param {string} rawOutput
   * @returns {object} { errorType, failingFile, lineNumber, message }
   */
  parseTestError(rawOutput = '') {
    if (typeof rawOutput !== 'string') return { errorType: 'UNKNOWN', message: 'No output' };

    const assertionMatch = rawOutput.match(/AssertionError(?: \[[A-Z_]+\])?:\s*([^\n\r]+)/);
    const typeErrorMatch = rawOutput.match(/TypeError(?: \[[A-Z_]+\])?:\s*([^\n\r]+)/);
    const refErrorMatch = rawOutput.match(/ReferenceError:\s*([^\n\r]+)/);
    const stackMatch = rawOutput.match(/at\s+.*?\((.*?):(\d+):(\d+)\)/) || rawOutput.match(/at\s+(.*?):(\d+):(\d+)/);

    const errorType = assertionMatch ? 'AssertionError' : typeErrorMatch ? 'TypeError' : refErrorMatch ? 'ReferenceError' : 'GenericError';
    const message = (assertionMatch || typeErrorMatch || refErrorMatch)?.[1] || rawOutput.slice(0, 200);
    const failingFile = stackMatch?.[1] || null;
    const lineNumber = stackMatch?.[2] ? parseInt(stackMatch[2], 10) : null;

    return {
      errorType,
      message: message.trim(),
      failingFile,
      lineNumber,
      isParseable: Boolean(stackMatch || assertionMatch)
    };
  }

  /**
   * Runs the bounded ReAct Reflexion Loop for a given task and test executor
   * @param {object} params
   * @param {object} params.taskContract
   * @param {Function} params.mutationFn (iteration, errorDiagnosis) => Promise<object>
   * @param {Function} params.testExecutorAsyncFn (mutationResult) => Promise<{ exitCode: number, stdout?: string, stderr?: string }>
   * @param {number} [params.maxRetries]
   * @returns {Promise<object>} Hermetic TDD execution receipt
   */
  async executeReflexionLoop(params = {}) {
    const {
      taskContract = {},
      mutationFn,
      testExecutorAsyncFn,
      maxRetries = this.maxRetries
    } = params;

    if (typeof mutationFn !== 'function' || typeof testExecutorAsyncFn !== 'function') {
      throw new Error('REFLEXION_ERROR: mutationFn and testExecutorAsyncFn are required');
    }

    const evaluationId = `TDD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const iterations = [];
    let currentError = null;
    let resolved = false;
    let finalMutation = null;

    for (let i = 1; i <= maxRetries; i++) {
      const iterStart = Date.now();

      // 1. Thought & Action: Apply mutation based on previous error diagnosis
      const mutationResult = await mutationFn(i, currentError);
      finalMutation = mutationResult;

      // 2. Observation: Run the test suite
      const testResult = await testExecutorAsyncFn(mutationResult);
      const exitCode = typeof testResult?.exitCode === 'number' ? testResult.exitCode : 1;

      if (exitCode === 0) {
        resolved = true;
        iterations.push({
          iteration: i,
          status: 'PASS',
          duration_ms: Date.now() - iterStart,
          exit_code: 0
        });
        break;
      }

      // 3. Reflexion: Diagnose failure and prepare targeted hypothesis for next cycle
      const diagnosis = this.parseTestError((testResult.stderr || '') + '\n' + (testResult.stdout || ''));
      currentError = diagnosis;

      iterations.push({
        iteration: i,
        status: 'FAIL',
        duration_ms: Date.now() - iterStart,
        exit_code: exitCode,
        diagnosis
      });
    }

    const receipt = {
      evaluation_id: evaluationId,
      task_id: taskContract.task_id || 'TASK-UNSPECIFIED',
      resolved,
      total_iterations: iterations.length,
      verdict: resolved ? 'VERIFIED_PASS' : 'REFLEXION_EXHAUSTED_FAIL',
      iterations,
      timestamp: new Date().toISOString()
    };

    receipt.sha256 = calculateSha256(JSON.stringify(receipt));
    this.evaluationLog.push(receipt);
    return receipt;
  }
}
