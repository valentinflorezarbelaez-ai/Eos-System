/**
 * @module CursorReturnIngestionEngine
 * @description Ingests, validates, reconciles, and evaluates structured Cursor Return Packages
 * against original Task Contracts without automatically mutating files.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

/** Fail-closed defaults when a task contract omits protected_surfaces. */
export const DEFAULT_PROTECTED_SURFACES = [
  'docs/governance/**',
  'src/core/**',
  'Fundacion/',
  'Fundacion'
];

/** Surfaces every planned mission contract must carry (R-BOUNDARY-01). */
export const MISSION_PROTECTED_SURFACES = ['docs/governance/**', 'Fundacion/', 'Fundacion'];

/**
 * True when a return-package path touches a protected surface.
 * Matches POSIX and Windows separators and nested Fundacion/ prefixes.
 */
export function touchesProtectedSurface(filePath, surfaces = DEFAULT_PROTECTED_SURFACES) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  if (!normalized) return false;
  const parts = normalized.split('/').filter(Boolean);

  for (const surface of surfaces) {
    const prefix = String(surface)
      .replace(/\\/g, '/')
      .replace(/\/\*\*$/, '')
      .replace(/\/\*$/, '')
      .replace(/\/$/, '');
    if (!prefix) continue;
    if (normalized === prefix || normalized.startsWith(prefix + '/')) return true;
    const prefixParts = prefix.split('/').filter(Boolean);
    if (prefixParts.length === 1 && parts.includes(prefixParts[0])) return true;
    if (prefixParts.length > 1) {
      const needle = prefixParts.join('/');
      if (normalized.includes(`/${needle}/`) || normalized.endsWith(`/${needle}`)) return true;
    }
  }
  return false;
}

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

    // 2. Anti-Replay Nonce Verification (nonce is required; omission is fail-closed)
    const nonce = typeof returnPkg.nonce === 'string' ? returnPkg.nonce.trim() : '';
    if (!nonce) {
      deviations.push('REPLAY_NONCE_REQUIRED: Return package must include a non-empty nonce.');
      isSecurityViolation = true;
    } else if (this.consumedNonces.has(nonce)) {
      deviations.push(`REPLAY_ATTEMPT_DETECTED: Nonce '${nonce}' has already been processed.`);
      isSecurityViolation = true;
    } else {
      this.consumedNonces.add(nonce);
    }

    // 3. Protected Surfaces & Scope Boundary Verification
    const protectedSurfaces = taskContract.protected_surfaces?.length
      ? taskContract.protected_surfaces
      : DEFAULT_PROTECTED_SURFACES;
    for (const file of returnPkg.affected_files || []) {
      if (file.action === 'READ_ONLY') continue;
      if (touchesProtectedSurface(file.path, protectedSurfaces)) {
        deviations.push(`PROTECTED_SURFACE_MUTATION_ATTEMPT: Attempted ${file.action} on protected path '${file.path}'`);
        isSecurityViolation = true;
      }
    }

    // 4. Unauthorized tool usage
    const allowedTools = taskContract.allowed_tools || [];
    const usedTools = returnPkg.tools_used || [];
    for (const tool of usedTools) {
      if (!allowedTools.includes(tool)) {
        deviations.push(`UNAUTHORIZED_TOOL: Tool '${tool}' is not in task contract allowed_tools.`);
        isSecurityViolation = true;
      }
    }

    // 5. Secret Leakage Detection
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

    // 6. Epistemic Test Verification
    const testResults = returnPkg.test_results || { total_tests: 0, passed_tests: 0, failed_tests: 0, pass_rate: 0 };
    if (returnPkg.status === 'COMPLETED') {
      if (testResults.failed_tests > 0 || testResults.pass_rate < 1.0) {
        deviations.push(`EPISTEMIC_CONTRADICTION: Status is COMPLETED but test pass rate is ${(testResults.pass_rate * 100).toFixed(1)}% (${testResults.failed_tests} failures)`);
      }
      if (testResults.total_tests === 0 && (returnPkg.affected_files || []).some(f => f.action === 'MODIFY' || f.action === 'CREATE')) {
        risks.push('UNTESTED_MUTATION: Code was modified but 0 tests were executed.');
      }
    }

    // 7. Verdict Determination
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
      'evidence', 'unknowns', 'risks', 'nonce'
    ];
    for (const field of required) {
      if (pkg[field] === undefined) {
        throw new Error(`INVALID_RETURN_PACKAGE: Missing required field '${field}'`);
      }
    }
  }
}
