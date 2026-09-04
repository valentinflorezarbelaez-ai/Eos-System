/**
 * @module TddEvidenceReceipt
 * @description ADR-0010 Strict TDD evidence for /apply-equivalent and /verify.
 * RED → GREEN → TRIANGULATE → REFACTOR with command-output receipts.
 * Missing receipts cannot claim VERIFIED and cannot pass the verify gate
 * when Strict TDD is in scope. Builder cannot self-certify VERIFIED.
 */

import { EpistemicEvidenceEngine, EPISTEMIC_STATUSES, EVIDENCE_CATEGORIES } from './epistemic-evidence-engine.js';

export const TDD_PHASES = Object.freeze({
  RED: 'RED',
  GREEN: 'GREEN',
  TRIANGULATE: 'TRIANGULATE',
  REFACTOR: 'REFACTOR'
});

export const REQUIRED_APPLY_PHASES = Object.freeze([TDD_PHASES.RED, TDD_PHASES.GREEN]);

function receiptPhase(receipt) {
  return receipt?.tdd_phase || receipt?.evidence_payload?.tdd_phase || null;
}

function asExitCode(options) {
  if (typeof options.exit_code === 'number') return options.exit_code;
  if (typeof options.exitCode === 'number') return options.exitCode;
  return null;
}

/**
 * Build one auditable TDD phase receipt. Command output is required.
 * RED must fail (exit_code !== 0). Later phases must pass (exit_code === 0).
 * Status is NOT_VERIFIED — the builder must not self-certify VERIFIED.
 */
export function createTddPhaseReceipt(options = {}) {
  const phase = options.phase;
  if (!phase || !Object.values(TDD_PHASES).includes(phase)) {
    const err = new Error(`TDD_PHASE_INVALID: expected RED|GREEN|TRIANGULATE|REFACTOR, got ${phase}`);
    err.code = 'TDD_PHASE_INVALID';
    throw err;
  }

  const command = options.command || options.command_executed;
  if (!command || typeof command !== 'string') {
    const err = new Error('TDD_COMMAND_REQUIRED: TDD receipts need a recorded command (ADR-0010).');
    err.code = 'TDD_COMMAND_REQUIRED';
    throw err;
  }

  const exitCode = asExitCode(options);
  if (exitCode === null) {
    const err = new Error('TDD_EXIT_CODE_REQUIRED: TDD receipts need a numeric exit_code.');
    err.code = 'TDD_EXIT_CODE_REQUIRED';
    throw err;
  }

  if (phase === TDD_PHASES.RED && exitCode === 0) {
    const err = new Error('TDD_RED_MUST_FAIL: RED receipt must record a failing test (exit_code !== 0).');
    err.code = 'TDD_RED_MUST_FAIL';
    throw err;
  }
  if (phase !== TDD_PHASES.RED && exitCode !== 0) {
    const err = new Error(`TDD_PHASE_MUST_PASS: ${phase} receipt must record a passing command (exit_code === 0).`);
    err.code = 'TDD_PHASE_MUST_PASS';
    throw err;
  }

  const base = EpistemicEvidenceEngine.createReceipt({
    receipt_id: options.receipt_id,
    evidence_id: options.evidence_id,
    mission_id: options.mission_id,
    task_id: options.task_id,
    category: options.category || EVIDENCE_CATEGORIES.UNIT_TEST,
    status: options.status || EPISTEMIC_STATUSES.NOT_VERIFIED,
    command_executed: command,
    exit_code: exitCode,
    execution_context: {
      command,
      exit_code: exitCode,
      tdd_phase: phase
    },
    evidence_payload: {
      tdd_phase: phase,
      output: options.output || options.stdout || '',
      ...(options.evidence_payload || {})
    },
    assertions: options.assertions || [`TDD phase ${phase} recorded`],
    verifier_id: options.verifier_id || 'APPLY_BUILDER_NOT_VERIFIER',
    timestamp: options.timestamp
  });

  if (base.status === EPISTEMIC_STATUSES.VERIFIED && (options.verifier_id || 'APPLY_BUILDER_NOT_VERIFIER') === 'APPLY_BUILDER_NOT_VERIFIER') {
    const err = new Error('TDD_SELF_CERTIFY_DENIED: Builder receipts cannot be stamped VERIFIED (BUILDER ≠ VERIFIER).');
    err.code = 'TDD_SELF_CERTIFY_DENIED';
    throw err;
  }

  return {
    ...base,
    tdd_phase: phase
  };
}

function requiredPhases({ strictTdd, testsExist, requireRefactor }) {
  const required = [...REQUIRED_APPLY_PHASES];
  if (strictTdd || testsExist) {
    required.push(TDD_PHASES.TRIANGULATE);
  }
  if (requireRefactor) {
    required.push(TDD_PHASES.REFACTOR);
  }
  return required;
}

function presentPhases(receipts = []) {
  return new Set(receipts.map(receiptPhase).filter(Boolean));
}

/**
 * Gate for /apply-equivalent claims that implementation is complete.
 * Missing RED/GREEN (and TRIANGULATE when Strict TDD / tests exist) denies the claim.
 * Even a complete receipt set cannot self-certify VERIFIED.
 */
export function evaluateApplyClaim(options = {}) {
  const receipts = options.receipts || [];
  const claimComplete = options.claimComplete === true || options.claim_complete === true;
  const strictTdd = options.strictTdd === true || options.strict_tdd === true;
  const testsExist = options.testsExist === true || options.tests_exist === true;
  const requireRefactor = options.requireRefactor === true || options.require_refactor === true;

  if (!claimComplete) {
    return {
      allowed: true,
      can_claim_verified: false,
      epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
      code: 'APPLY_IN_PROGRESS',
      missing: [],
      phases_present: [...presentPhases(receipts)]
    };
  }

  const required = requiredPhases({ strictTdd, testsExist, requireRefactor });
  const present = presentPhases(receipts);
  const missing = required.filter((phase) => !present.has(phase));

  if (missing.length > 0) {
    return {
      allowed: false,
      can_claim_verified: false,
      epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
      code: 'TDD_EVIDENCE_MISSING',
      missing,
      phases_present: [...present],
      next_action: `Record TDD receipts for: ${missing.join(', ')} (ADR-0010). Cannot claim VERIFIED.`
    };
  }

  return {
    allowed: true,
    can_claim_verified: false,
    epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
    code: 'TDD_APPLY_RECORDED',
    missing: [],
    phases_present: [...present],
    next_action: 'Leave /verify to an independent pass (BUILDER ≠ VERIFIER).'
  };
}

/**
 * Independent verify-side audit of TDD receipts. Missing receipts fail the gate
 * when Strict TDD is in scope. Does not stamp the change VERIFIED.
 */
export function auditTddReceipts(options = {}) {
  const strictTdd = options.strictTdd === true || options.strict_tdd === true;
  const testsExist = options.testsExist === true || options.tests_exist === true;
  const inScope = strictTdd || testsExist || options.inScope === true;
  const receipts = options.receipts || [];

  if (!inScope && receipts.length === 0) {
    return {
      pass: true,
      in_scope: false,
      can_claim_verified: false,
      epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
      code: 'TDD_NOT_IN_SCOPE'
    };
  }

  const apply = evaluateApplyClaim({
    receipts,
    claimComplete: true,
    strictTdd: strictTdd || inScope,
    testsExist,
    requireRefactor: options.requireRefactor === true || options.require_refactor === true
  });

  if (!apply.allowed) {
    return {
      pass: false,
      in_scope: true,
      can_claim_verified: false,
      epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
      code: apply.code,
      missing: apply.missing,
      phases_present: apply.phases_present,
      next_action: apply.next_action
    };
  }

  if (options.claimVerified === true || options.claim_verified === true) {
    return {
      pass: false,
      in_scope: true,
      can_claim_verified: false,
      epistemic_status: EPISTEMIC_STATUSES.NOT_VERIFIED,
      code: 'TDD_VERIFIED_CLAIM_DENIED',
      missing: [],
      phases_present: apply.phases_present,
      next_action: 'Receipts can be audited; they do not authorize a VERIFIED stamp without independent evidence (ADR-0010).'
    };
  }

  return {
    pass: true,
    in_scope: true,
    can_claim_verified: false,
    epistemic_status: 'PARTIALLY VERIFIED',
    code: 'TDD_RECEIPTS_AUDITED',
    missing: [],
    phases_present: apply.phases_present
  };
}

export function assertApplyEvidenceComplete(options = {}) {
  const decision = evaluateApplyClaim({ ...options, claimComplete: true });
  if (!decision.allowed) {
    const err = new Error(`TDD_EVIDENCE_MISSING: ${decision.next_action}`);
    err.code = decision.code;
    err.decision = decision;
    throw err;
  }
  return decision;
}
