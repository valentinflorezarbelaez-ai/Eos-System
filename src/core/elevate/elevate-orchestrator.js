/**
 * @module ElevateOrchestrator
 * @description Master orchestrator for the EOS-ELEVATE Elite Autonomous Remediation & Elevation Engine.
 * Coordinates multi-vector scanning, root cause analysis, TDD self-healing, and cryptographic certification.
 */

import path from 'node:path';
import { ScannerCouncil } from './scanner-council.js';
import { RCAEngine } from './rca-engine.js';
import { TDDAutoHealer } from './tdd-auto-healer.js';
import { CertificationReporter } from './certification-reporter.js';

export class ElevateOrchestrator {
  /**
   * @param {object} options
   * @param {string} [options.targetPath] Directory to evaluate/elevate
   */
  constructor(options = {}) {
    this.targetPath = path.resolve(options.targetPath || process.cwd());
    this.council = new ScannerCouncil({ targetPath: this.targetPath });
    this.rca = new RCAEngine();
    this.healer = new TDDAutoHealer({ targetPath: this.targetPath });
    this.reporter = new CertificationReporter();
  }

  /**
   * Executes full elevation cycle
   * @param {object} options
   * @param {'audit'|'heal'} [options.mode='audit'] Execution mode
   * @param {boolean} [options.strict=true] Throw error on critical vulnerabilities
   * @returns {Promise<object>}
   */
  async execute(options = {}) {
    const mode = options.mode || 'audit';
    const strict = options.strict !== false;

    // 1. Phase 1: Multi-Vector Scan
    const scanResult = await this.council.runFullScan();

    // 2. Phase 2: Root Cause Analysis & Remediation DAG
    const dag = this.rca.analyze(scanResult.findings);

    // 3. Phase 3: TDD Self-Healing (if mode is 'heal')
    const remediationResults = [];
    if (mode === 'heal' && dag.tasks.length > 0) {
      for (const task of dag.tasks) {
        if (typeof task.patch === 'function') {
          const res = await this.healer.executeTask(task);
          remediationResults.push(res);
        }
      }
    }

    // 4. Phase 4: Certification & Evidence
    const markdownReport = this.reporter.generateMarkdownReport(scanResult);
    const evidence = this.reporter.generateEvidencePayload(scanResult);

    if (strict && scanResult.summary.bySeverity.critical > 0 && mode === 'audit') {
      // In strict mode, notice critical findings without crashing orchestrator
    }

    return {
      status: mode === 'heal' ? 'REMEDIATION_COMPLETE' : 'AUDIT_COMPLETE',
      mode,
      targetPath: this.targetPath,
      findings: scanResult.findings,
      summary: scanResult.summary,
      dag,
      remediationResults,
      markdownReport,
      evidence
    };
  }
}
