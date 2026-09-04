import { spawn } from 'node:child_process';
import { EosEvidence } from './evidence.js';
import { EosSandbox } from './sandbox.js';

/**
 * @file src/core/harness.js
 * @description Sub-process supervisor and deterministic evidence harness for EOS Kernel L0.
 */
export class EosHarness {
  constructor(options = {}) {
    this.evidence = options.evidence || new EosEvidence();
    this.sandbox = options.sandbox || new EosSandbox();
    this.defaultTimeoutMs = options.defaultTimeoutMs || 10000;
  }

  /**
   * Executes a command in an isolated sub-process with non-blocking stream buffering and timeout supervision.
   * @param {string} command
   * @param {string[]} [args]
   * @param {Object} [options]
   * @param {number} [options.timeoutMs]
   * @param {string} [options.cwd]
   * @param {Record<string, string>} [options.env]
   * @returns {Promise<Object>} Execution result & evidence record
   */
  async execute(command, args = [], options = {}) {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let timer = null;

      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...(options.env || {}) },
        shell: false
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 500);
        }, timeoutMs);
      }

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString('utf8');
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve(this.evidence.createRecord({
          target: `${command} ${args.join(' ')}`.trim(),
          exitCode: 1,
          stdout,
          stderr: `${stderr}\nProcessError: ${err.message}`.trim(),
          durationMs,
          timedOut
        }));
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const exitCode = timedOut ? 143 : (code ?? 0);
        resolve(this.evidence.createRecord({
          target: `${command} ${args.join(' ')}`.trim(),
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs,
          timedOut
        }));
      });
    });
  }
}
