import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * EOS Automated TDD Executor - L0 (Node built-ins only)
 * Runs a closed-loop execution engine: Test ➔ Capture Fault ➔ Apply Code Patch ➔ Re-Test until Green.
 */
export class EOSTDDExecutor {
  /**
   * @param {object} [config]
   */
  constructor(config = {}) {
    this.maxIterations = config.maxIterations ?? 5;
  }

  /**
   * Runs the automated loop over a newly scaffolded or breaking component.
   * @param {string} srcPath Path to the source file to fix.
   * @param {string} testPath Path to the test runner execution target.
   * @param {Function} simulatedFixRoutine Callback performing the patch write.
   * @returns {{ status: string, iterations: number, lastError: string|null }} Execution telemetry block.
   */
  executeTDDLoop(srcPath, testPath, simulatedFixRoutine) {
    if (!fs.existsSync(srcPath) || !fs.existsSync(testPath)) {
      throw new Error('GOVERNANCE FAULT: Source and test paths must physically exist to initiate TDD loop.');
    }

    let iterations = 0;
    let completedCleanly = false;
    let lastErrorContext = '';

    console.log(`⚡ [EOS TDD] > Initiating automated execution loop for test target: ${testPath}`);

    // Sanitize child environment to avoid nested node:test runner IPC collisions
    const childEnv = { ...process.env };
    Object.keys(childEnv).forEach(k => {
      if (k.startsWith('NODE_TEST_') || k.startsWith('NODE_V8_COVERAGE')) {
        delete childEnv[k];
      }
    });
    childEnv.NODE_ENV = 'test';

    while (iterations < this.maxIterations) {
      iterations++;
      console.log(`  ➔ Iteration [${iterations}/${this.maxIterations}]: Spawning test runner sub-process...`);

      try {
        // Execute the native test runner synchronously in pipe isolation mode
        execSync(`node --test "${testPath}"`, { stdio: 'pipe', env: childEnv });

        // If no exception is thrown, exit code was 0 -> Test is green
        completedCleanly = true;
        break;
      } catch (childError) {
        // Capture stderr/stdout buffer from the failed assertion execution
        lastErrorContext = childError.stderr?.toString() || childError.stdout?.toString() || childError.message;
        console.warn(`  ⚠️ Assertion failed on iteration ${iterations}. Dispatching fix patch...`);

        // Apply mutation via the routine
        if (typeof simulatedFixRoutine === 'function') {
          simulatedFixRoutine(srcPath, lastErrorContext);
        } else {
          throw new Error('GOVERNANCE FAULT: Missing automated fix routine code writer.');
        }
      }
    }

    if (!completedCleanly) {
      return {
        status: 'TDD_BUDGET_EXCEEDED',
        iterations,
        lastError: lastErrorContext.trim()
      };
    }

    console.log(`✨ [EOS TDD] > Target achieved. Component is 100% green at iteration ${iterations}.`);
    return {
      status: 'TDD_AUTO_HEALED_GREEN',
      iterations,
      lastError: null
    };
  }
}
