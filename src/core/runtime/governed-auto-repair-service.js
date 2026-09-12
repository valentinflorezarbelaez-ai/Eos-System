/**
 * @module GovernedAutoRepairService
 * @description Governed Closed-Loop TDD Auto-Repair Service for EOS.
 * Combines failure analysis, GovernedLlmService structured patch generation,
 * strict schema validation via repair-directive.schema.json, anti-infinite-loop detection,
 * and bounded re-verification (Red ➔ Patch ➔ Green).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { CursorTDDAutoHealer } from './cursor-tdd-auto-healer.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

/**
 * Parses a command string into an executable and arguments, respecting quotes.
 * @param {string} cmd
 * @returns {{executable: string, args: string[]}}
 */
function parseCommand(cmd) {
  if (Array.isArray(cmd)) {
    return { executable: cmd[0], args: cmd.slice(1) };
  }
  const tokens = [];
  let currentToken = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];
    if ((char === '"' || char === "'") && (i === 0 || cmd[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuotes = false;
        quoteChar = '';
      } else {
        currentToken += char;
      }
    } else if (char === ' ' && !inQuotes) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return {
    executable: tokens[0],
    args: tokens.slice(1)
  };
}


export class GovernedAutoRepairService {
  /**
   * @param {object} [options]
   * @param {object} [options.llmService] GovernedLlmService instance
   * @param {SchemaValidator} [options.validator]
   * @param {number} [options.maxAttempts] Max repair cycles (default: 3)
   */
  constructor(options = {}) {
    this.llmService = options.llmService || null;
    this.validator = options.validator || new SchemaValidator();
    this.healer = new CursorTDDAutoHealer({ maxAttempts: options.maxAttempts || 3 });
    this.maxAttempts = options.maxAttempts || 3;
  }

  /**
   * Runs the bounded closed-loop auto-repair cycle.
   * @param {object} params
   * @param {string} params.missionDir Mission directory
   * @param {object} params.taskContract Task contract
   * @param {string} params.initialTestLog Initial failure stdout/stderr
   * @param {string} params.targetSourcePath Path to source file to be patched
   * @param {object} [params.options]
   * @param {Function} [params.options.testRunnerFn] Custom test runner for testing
   * @param {Function} [params.options.patcherFn] Custom patcher for testing
   * @returns {Promise<object>}
   */
  async repairFailingTask({
    missionDir,
    taskContract,
    initialTestLog,
    targetSourcePath,
    options = {}
  }) {
    let currentLog = initialTestLog;
    let attempts = 0;
    const history = [];
    const seenPatchHashes = new Set();

    while (attempts < this.maxAttempts) {
      attempts++;
      const failureAnalysis = this.healer.parseTestFailure(currentLog);

      if (!failureAnalysis.hasFailure) {
        // No failure detected in logs -> Already green
        return {
          status: 'HEALED_VERIFIED',
          attempts,
          history
        };
      }

      // Read current source code
      let currentSource = '';
      if (fs.existsSync(targetSourcePath)) {
        currentSource = fs.readFileSync(targetSourcePath, 'utf8');
      }

      let repairDirective = null;

      // Generate repair directive via custom patcher or GovernedLlmService
      if (typeof options.patcherFn === 'function') {
        repairDirective = await options.patcherFn({
          attempt: attempts,
          failureAnalysis,
          currentSource,
          taskContract
        });
      } else if (this.llmService) {
        const repairPrompt = `Fix the failing test for task ${taskContract.task_id} (${taskContract.objective}).
Error: ${failureAnalysis.errorType} in ${failureAnalysis.failingTest}
Expected: ${failureAnalysis.expected}
Actual: ${failureAnalysis.actual}
Log: ${failureAnalysis.rawSnippet}

Current Source (${targetSourcePath}):
${currentSource}

Provide the complete repaired source code replacement conforming to repair-directive.schema.json.`;

        const llmResult = await this.llmService.generateStructuredOutput({
          caller_agent_id: taskContract.agent_id || 'AGENT-REPAIR-01',
          mission_id: taskContract.mission_id,
          authority_token: taskContract.authority_level || 'LEVEL_1',
          schemaName: 'repair-directive.schema.json',
          prompt: repairPrompt,
          domainContext: 'auto-repair'
        });

        repairDirective = llmResult.parsed;
      } else {
        throw new Error('GOVERNANCE_FAULT: GovernedAutoRepairService requires GovernedLlmService or patcherFn.');
      }

      // 1. Assert Directive Validity against Schema
      this.validator.assertValid(repairDirective, 'repair-directive.schema.json', 'repair-directive');

      // 2. Anti-Infinite-Loop Check
      const patchHash = calculateSha256(repairDirective.replacement_code || '');
      if (seenPatchHashes.has(patchHash)) {
        return {
          status: 'ANTI_INFINITE_LOOP_TRIP',
          attempts,
          reason: 'Identical patch proposed twice consecutively. Aborting auto-repair to conserve budget.',
          history
        };
      }
      seenPatchHashes.add(patchHash);

      // 3. Apply Patch to Source File
      fs.writeFileSync(targetSourcePath, repairDirective.replacement_code, 'utf8');

      // 4. Re-run Verification Runner
      let testResult = { exitCode: 1, stdout: '', stderr: '' };
      if (typeof options.testRunnerFn === 'function') {
        testResult = await options.testRunnerFn({
          taskContract,
          cwd: options.cwd || path.dirname(targetSourcePath),
          missionDir
        });
      } else if (options.command || taskContract.execution_command) {
        const cmd = options.command || taskContract.execution_command;
        const cwd = options.cwd || path.dirname(targetSourcePath);
        try {
          const { executable, args } = parseCommand(cmd);
          const spawnResult = spawnSync(executable, args, {
            cwd,
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test' },
            timeout: 30000
          });

          if (spawnResult.error) {
            throw spawnResult.error;
          }

          testResult = {
            exitCode: spawnResult.status ?? (spawnResult.signal ? 1 : 0),
            stdout: spawnResult.stdout ? spawnResult.stdout.toString() : '',
            stderr: spawnResult.stderr ? spawnResult.stderr.toString() : ''
          };
        } catch (err) {
          testResult = {
            exitCode: err.status ?? 1,
            stdout: err.stdout?.toString() || '',
            stderr: err.stderr?.toString() || err.message
          };
        }
      }

      history.push({
        attempt: attempts,
        failureAnalysis,
        directive: repairDirective,
        testResult
      });

      if (testResult.exitCode === 0) {
        return {
          status: 'HEALED_VERIFIED',
          attempts,
          history,
          lastDirective: repairDirective
        };
      }

      currentLog = (testResult.stderr || '') + '\n' + (testResult.stdout || '');
    }

    // Max attempts exhausted without green
    return {
      status: 'BUDGET_EXHAUSTED_FDIR_TRIPPED',
      attempts,
      recommendation: 'Escalate to HITL. Maximum repair iterations exhausted without passing tests.',
      history
    };
  }
}
