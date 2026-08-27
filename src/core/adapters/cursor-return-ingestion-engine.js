/**
 * @module CursorReturnIngestionEngine
 * @description Ingests, validates, reconciles, and evaluates structured Cursor Return Packages
 * against original Task Contracts without automatically mutating files.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

/**
 * Surfaces no task contract may authorise mutation of, whatever the contract says.
 * A task contract is authored per-mission and could otherwise silently omit the external
 * target or the governance record, which is how a return package declaring a write to
 * Fundacion/ passed ingestion as ACCEPT.
 */
export const CONSTITUTIONAL_PROTECTED_SURFACES = Object.freeze([
  'Fundacion/**',
  'docs/governance/**',
  '.eos/ledger/**',
  '.missions/**',
  'CONSTITUTION.md'
]);

export class CursorReturnIngestionEngine {
  constructor(options = {}) {
    this.consumedNonces = new Set(options.consumedNonces || []);
    this.secretPatterns = [
      /(?:bearer\s+[a-zA-Z0-9_\-\.]{20,})/i,
      /(?:api[_-]?key[\s:=]+['"][a-zA-Z0-9_\-]{20,}['"])/i,
      /(?:sk-[a-zA-Z0-9]{32,})/i,
      /(?:ghp_[a-zA-Z0-9]{36})/i,
      /(?:BEGIN\s+PRIVATE\s+KEY)/i
    ];
  }

  /**
   * Evaluates and reconciles a Cursor Return Package against a Task Contract
   * @param {Object} returnPkg The parsed cursor return package
   * @param {Object} taskContract The original canonical task contract
   * @returns {Object} { verdict, authorized, deviations, risks, reconciliation_hash }
   */
  ingestAndEvaluate(returnPkg = {}, taskContract = {}) {
    this._validateSchemaFields(returnPkg);

    const deviations = [];
    const risks = [];
    let isSecurityViolation = false;

    // 1. Task and Mission Identity Matching
    if (returnPkg.mission_id !== taskContract.mission_id) {
      deviations.push(`MISSION_ID_MISMATCH: Return package mission_id '${returnPkg.mission_id}' != contract '${taskContract.mission_id}'`);
    }
    if (returnPkg.task_id !== taskContract.task_id) {
      deviations.push(`TASK_ID_MISMATCH: Return package task_id '${returnPkg.task_id}' != contract '${taskContract.task_id}'`);
    }

    // 2. Anti-Replay Nonce Verification
    if (returnPkg.nonce) {
      if (this.consumedNonces.has(returnPkg.nonce)) {
        deviations.push(`REPLAY_ATTEMPT_DETECTED: Nonce '${returnPkg.nonce}' has already been processed.`);
        isSecurityViolation = true;
      } else {
        this.consumedNonces.add(returnPkg.nonce);
      }
    }

    // 3. Protected Surfaces & Scope Boundary Verification
    // The contract's own surfaces are unioned with the constitutional floor: a contract can
    // widen protection but never lower it below the floor.
    const protectedSurfaces = [
      ...new Set([
        ...(taskContract.protected_surfaces || ['docs/governance/**', 'src/core/**']),
        ...CONSTITUTIONAL_PROTECTED_SURFACES
      ])
    ];
    for (const file of returnPkg.affected_files || []) {
      for (const surface of protectedSurfaces) {
        const prefix = surface.replace('/**', '').replace('/*', '');
        if (file.path.startsWith(prefix) && file.action !== 'READ_ONLY') {
          deviations.push(`PROTECTED_SURFACE_MUTATION_ATTEMPT: Attempted ${file.action} on protected path '${file.path}'`);
          isSecurityViolation = true;
        }
      }
    }

    // 4. Secret Leakage Detection
    const payloadToScan = [
      returnPkg.diff || '',
      returnPkg.summary || '',
      JSON.stringify(returnPkg.commands_executed || []),
      JSON.stringify(returnPkg.test_results || {})
    ].join('\n');

    for (const pattern of this.secretPatterns) {
      if (pattern.test(payloadToScan)) {
        deviations.push('SECRET_LEAKAGE_DETECTED: Return package contains detected secret or token pattern.');
        isSecurityViolation = true;
        break;
      }
    }

    // 5. Epistemic Test Verification
    const testResults = returnPkg.test_results || { total_tests: 0, passed_tests: 0, failed_tests: 0, pass_rate: 0 };
    if (returnPkg.status === 'COMPLETED') {
      if (testResults.failed_tests > 0 || testResults.pass_rate < 1.0) {
        deviations.push(`EPISTEMIC_CONTRADICTION: Status is COMPLETED but test pass rate is ${(testResults.pass_rate * 100).toFixed(1)}% (${testResults.failed_tests} failures)`);
      }
      if (testResults.total_tests === 0 && (returnPkg.affected_files || []).some(f => f.action === 'MODIFY' || f.action === 'CREATE')) {
        risks.push('UNTESTED_MUTATION: Code was modified but 0 tests were executed.');
      }
    }

    // 6. Verdict Determination
    let verdict = 'ACCEPT';
    if (isSecurityViolation) {
      verdict = 'REJECT';
    } else if (deviations.length > 0) {
      verdict = returnPkg.status === 'BLOCKED' ? 'ESCALATE_HITL' : 'REQUEST_CORRECTION';
    } else if (returnPkg.status === 'BLOCKED') {
      verdict = 'ESCALATE_HITL';
    } else if (returnPkg.status === 'FAILED') {
      verdict = 'REQUEST_CORRECTION';
    } else if (returnPkg.status === 'NEEDS_REVIEW') {
      verdict = 'ESCALATE_HITL';
    }

    const assessmentPayload = {
      mission_id: returnPkg.mission_id,
      task_id: returnPkg.task_id,
      verdict,
      deviations,
      risks,
      apply_diff_authorized: false // Strict invariant: never auto-applied without approval
    };

    const reconciliation_hash = calculateSha256(JSON.stringify(assessmentPayload));

    return {
      ...assessmentPayload,
      reconciliation_hash
    };
  }

  _validateSchemaFields(pkg) {
    const required = [
      'schema_version', 'mission_id', 'task_id', 'status', 'summary',
      'affected_files', 'diff', 'commands_executed', 'test_results',
      'evidence', 'unknowns', 'risks'
    ];
    for (const field of required) {
      if (pkg[field] === undefined) {
        throw new Error(`INVALID_RETURN_PACKAGE: Missing required field '${field}'`);
      }
    }
  }
}
