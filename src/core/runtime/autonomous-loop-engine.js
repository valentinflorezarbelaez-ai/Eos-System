/**
 * @module AutonomousLoopEngine
 * @description Closed-Loop Mutation Sensor and Surgical TDD Auto-Healer for EOS.
 * Delivers Tier 3 Loop Engineering: sub-second mutation sensing, surgical test dispatch
 * via RelationalTraceabilityMatrix, and structured failure diagnosis via CursorTDDAutoHealer.
 *
 * Implements SPEC-EOS-005.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RelationalTraceabilityMatrix } from '../ontology/relational-traceability-matrix.js';
import { CursorTDDAutoHealer } from './cursor-tdd-auto-healer.js';
import { resolveControlPlaneRoot } from './control-plane-root.js';

export class AutonomousLoopEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.controlPlaneRoot]
   * @param {string} [options.baseDir]
   * @param {number} [options.maxHealingAttempts]
   */
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || resolveControlPlaneRoot();
    this.baseDir = options.baseDir || this.controlPlaneRoot;
    this.maxHealingAttempts = options.maxHealingAttempts || 3;

    this.rtm = new RelationalTraceabilityMatrix({
      controlPlaneRoot: this.controlPlaneRoot,
      baseDir: this.baseDir
    });

    this.healer = new CursorTDDAutoHealer({
      maxAttempts: this.maxHealingAttempts
    });

    this.fileHashes = new Map(); // path -> sha256
    this.debounceTimers = new Map(); // path -> NodeJS.Timeout
    this.watchers = new Set(); // active FSWatcher instances
  }

  /**
   * Helper to compute SHA-256 hash of a file or string
   * @param {string} contentOrPath
   * @param {boolean} [isFile=false]
   * @returns {string}
   */
  _sha256(contentOrPath, isFile = false) {
    const hash = crypto.createHash('sha256');
    if (isFile) {
      if (fs.existsSync(contentOrPath)) {
        hash.update(fs.readFileSync(contentOrPath));
        return hash.digest('hex');
      }
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
    hash.update(contentOrPath);
    return hash.digest('hex');
  }

  /**
   * Asynchronous helper to compute SHA-256 hash of a file or string
   * @param {string} contentOrPath
   * @param {boolean} [isFile=false]
   * @returns {Promise<string>}
   */
  async _sha256Async(contentOrPath, isFile = false) {
    const hash = crypto.createHash('sha256');
    if (isFile) {
      try {
        const buffer = await fs.promises.readFile(contentOrPath);
        hash.update(buffer);
        return hash.digest('hex');
      } catch (err) {
        if (err.code === 'ENOENT') {
          return '0000000000000000000000000000000000000000000000000000000000000000';
        }
        throw err;
      }
    }
    hash.update(contentOrPath);
    return hash.digest('hex');
  }

  /**
   * Executes a single surgical verification pass on a mutated file or target
   * @param {string} targetFile
   * @param {object} [options]
   * @param {string} [options.projectId]
   * @param {boolean} [options.heal=false]
   * @returns {object} Surgical pass result
   */
  runSurgicalPass(targetFile, options = {}) {
    if (!targetFile) {
      throw new Error('TARGET_FILE_REQUIRED: runSurgicalPass requires a target file path.');
    }

    const startTime = Date.now();
    const resolvedPath = path.isAbsolute(targetFile)
      ? path.relative(this.controlPlaneRoot, targetFile).replace(/\\/g, '/')
      : targetFile.replace(/\\/g, '/');

    const fullPath = path.resolve(this.controlPlaneRoot, resolvedPath);
    const targetProject = options.projectId || 'PRJ-EOS-CONTROL-PLANE';

    // 1. Build matrix and calculate blast radius
    this.rtm.buildProjectMatrix(targetProject);
    const blast = this.rtm.calculateEntityBlastRadius(resolvedPath);
    const testsToRun = [...(blast.tests_to_revalidate || [])];
    const isTargetTest = resolvedPath.includes('test') ||
      resolvedPath.endsWith('.test.js') ||
      resolvedPath.endsWith('.test.ts') ||
      resolvedPath.endsWith('.spec.js') ||
      resolvedPath.endsWith('.spec.ts');

    if (isTargetTest && !testsToRun.includes(resolvedPath) && fs.existsSync(fullPath)) {
      testsToRun.unshift(resolvedPath);
    }

    const executionLogs = [];
    let isSuccess = true;
    let failureDiagnostic = null;

    if (testsToRun.length > 0) {
      // 2. Execute only impacted tests
      for (const testRel of testsToRun) {
        const fullTestPath = path.resolve(this.controlPlaneRoot, testRel);
        if (!fs.existsSync(fullTestPath)) continue;

        const childEnv = { ...process.env, NODE_ENV: 'test' };
        delete childEnv.NODE_TEST_CONTEXT;

        const runner = spawnSync(process.execPath, ['--test', fullTestPath], {
          cwd: this.controlPlaneRoot,
          encoding: 'utf8',
          timeout: 30000,
          env: childEnv
        });

        const output = (runner.stdout || '') + (runner.stderr || '');
        executionLogs.push({
          test: testRel,
          exitCode: runner.status,
          output: output.slice(0, 4000)
        });

        if (runner.status !== 0) {
          isSuccess = false;
          // Parse failure with TDD Auto-Healer
          const parsedTest = this.healer.parseTestFailure(output);
          const parsedCompile = this.healer.parseCompileFailure(output);
          failureDiagnostic = parsedTest.hasFailure ? parsedTest : parsedCompile;

          // If healing requested, prepare diagnosis
          if (options.heal && failureDiagnostic.hasFailure) {
            failureDiagnostic.healingRecommendation = {
              targetFile: resolvedPath,
              failingTest: testRel,
              action: `Apply minimal delta patch to resolve ${failureDiagnostic.errorType || 'ASSERTION_FAIL'}`,
              attemptsRemaining: this.maxHealingAttempts
            };
          }
          break; // Stop at first failing test in surgical pass
        }
      }
    } else {
      // 3. Fallback: Syntax verification if it's a code file
      const ext = path.extname(resolvedPath);
      if (['.js', '.ts', '.mjs', '.cjs'].includes(ext) && fs.existsSync(fullPath)) {
        const check = spawnSync(process.execPath, ['--check', fullPath], {
          cwd: this.controlPlaneRoot,
          encoding: 'utf8',
          timeout: 5000
        });

        if (check.status !== 0) {
          isSuccess = false;
          const output = (check.stdout || '') + (check.stderr || '');
          failureDiagnostic = this.healer.parseCompileFailure(output);
          executionLogs.push({
            check: 'syntax',
            exitCode: check.status,
            output
          });
        } else {
          executionLogs.push({
            check: 'syntax',
            exitCode: 0,
            output: 'SYNTAX_OK'
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    const result = {
      target_file: resolvedPath,
      project_id: targetProject,
      status: isSuccess ? 'VERIFIED' : 'REGRESSION_DETECTED',
      result: isSuccess ? 'PASS' : 'FAIL',
      tests_executed: testsToRun,
      duration_ms: durationMs,
      risk_tier: blast.risk_tier,
      invalidated_evidence_count: blast.invalidated_evidence.length,
      failure_diagnostic: failureDiagnostic,
      execution_logs: executionLogs,
      timestamp: new Date().toISOString()
    };

    result.sha256 = this._sha256(JSON.stringify({
      target: result.target_file,
      status: result.status,
      tests: result.tests_executed,
      time: result.timestamp
    }));

    return result;
  }

  /**
   * Starts a non-blocking filesystem watcher with debouncing and SHA-256 deduplication
   * @param {string} targetDir
   * @param {object} [options]
   * @param {function} [onCycleComplete] Callback receiving result after each surgical cycle
   * @returns {object} Watcher handle
   */
  startWatcher(targetDir = this.controlPlaneRoot, options = {}, onCycleComplete = null) {
    if (!fs.existsSync(targetDir)) {
      throw new Error(`WATCH_TARGET_NOT_FOUND: Directory '${targetDir}' does not exist.`);
    }

    const ignoredNames = new Set([
      'node_modules',
      '.git',
      '.missions',
      '.next',
      '.turbo',
      '.venv',
      'venv',
      '__pycache__',
      'dist',
      'build',
      '.tempmediaStorage'
    ]);

    const debounceMs = options.debounceMs || 150;

    const watcher = fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const normName = filename.replace(/\\/g, '/');
      const parts = normName.split('/');

      // Ignore vendor and hidden directories
      if (parts.some(p => ignoredNames.has(p) || (p.startsWith('.') && p !== '.missions'))) {
        return;
      }

      // Filter only relevant code, test, and doc extensions
      const ext = path.extname(normName);
      if (!['.js', '.ts', '.mjs', '.py', '.json', '.md'].includes(ext)) {
        return;
      }

      const fullPath = path.resolve(targetDir, normName);
      if (!fs.existsSync(fullPath)) return;

      // Debounce events per file
      if (this.debounceTimers.has(normName)) {
        clearTimeout(this.debounceTimers.get(normName));
      }

      const timer = setTimeout(async () => {
        this.debounceTimers.delete(normName);

        try {
          // Check SHA-256 content hash delta asynchronously to unblock event loop
          const currentHash = await this._sha256Async(fullPath, true);
          const previousHash = this.fileHashes.get(normName);

          if (previousHash === currentHash) {
            // Timestamp changed without content mutation (no-op)
            return;
          }

          this.fileHashes.set(normName, currentHash);

          // Run surgical verification pass
          const passResult = this.runSurgicalPass(normName, options);
          if (typeof onCycleComplete === 'function') {
            onCycleComplete(passResult);
          }
        } catch {
          // Graceful fault tolerance in loop watcher
        }
      }, debounceMs);

      this.debounceTimers.set(normName, timer);
    });

    this.watchers.add(watcher);
    return watcher;
  }

  /**
   * Stops all active watchers and clears pending debounce timers
   */
  stopWatcher() {
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // Ignore close errors
      }
    }
    this.watchers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Formats surgical loop result into an ASCII terminal status block
   * @param {object} result
   * @returns {string}
   */
  formatLoopReport(result) {
    const isPass = result.status === 'VERIFIED';
    const pill = isPass ? '🟢 VERIFIED' : '🔴 REGRESSION DETECTED';
    const lines = [
      '================================================================================',
      `⚡ EOS AUTONOMOUS LOOP: ${pill} [${result.duration_ms}ms]`,
      '================================================================================',
      `Mutated Target : ${result.target_file}`,
      `Risk Tier      : ${result.risk_tier}`,
      `Tests Run      : ${result.tests_executed.length > 0 ? result.tests_executed.join(', ') : 'Syntax Check Only (node --check)'}`,
      `Digest SHA-256 : ${result.sha256}`
    ];

    if (!isPass && result.failure_diagnostic) {
      const diag = result.failure_diagnostic;
      lines.push('--------------------------------------------------------------------------------');
      lines.push('⚠️  DIAGNOSTIC ROOT CAUSE:');
      lines.push(`   Type    : ${diag.errorType || 'ASSERTION_FAIL'}`);
      lines.push(`   Message : ${diag.message || 'Test assertion failed'}`);
      if (diag.filePath && diag.lineNumber) {
        lines.push(`   Location: ${diag.filePath}:${diag.lineNumber}`);
      }
      if (diag.healingRecommendation) {
        lines.push(`   Healing : ${diag.healingRecommendation.action}`);
      }
    }

    lines.push('================================================================================');
    return lines.join('\n');
  }
}
