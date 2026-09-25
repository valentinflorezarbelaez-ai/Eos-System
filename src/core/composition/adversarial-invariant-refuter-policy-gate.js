/**
 * @module adversarial-invariant-refuter-policy-gate
 * SPEC-0122 / Mission DL — Policy Gate for Adversarial Invariant Refuter Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 20cb9abd
 *   Refutation report verification required (unhandledBreaches === 0, resilienceStatus !== 'COMPROMISED')
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L29 reopen
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DL_PRODUCTION_READY,
  DL_FREEZE_PIN_SHORT
} from './adversarial-invariant-refuter-receipt.js';

/** @type {'NO'} */
export const DL_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DL_POLICY_GATE_KIND = 'eos-adversarial-invariant-refuter-policy-gate';

export const DL_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'CHAOS_INJECTION',
  'OBSERVE',
  'VERIFY'
]);

export const DL_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  CHALLENGE: 'CHALLENGE',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_REFUTATION_REPORT: 'MISSING_REFUTATION_REPORT',
  INVALID_REFUTATION_REPORT: 'INVALID_REFUTATION_REPORT',
  INVARIANT_BREACH_DETECTED: 'INVARIANT_BREACH_DETECTED',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  INVALID_RITUAL_MODE: 'INVALID_RITUAL_MODE',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

const SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

const PR_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const HARD_DELETE_PATTERNS = [
  /force[-_]?delete/i,
  /\bpurge\b/i,
  /hard[-_]?delete/i,
  /\bdestroy\b/i,
  /permanent(?:ly)?\s+delete/i,
  /rm\s+-rf/i,
  /\bunlinkSync\b/i,
  /\bdestructive\s+delete\b/i
];

const MASS_PRUNE_PATTERNS = [
  /\bmass[-_]?prune\b/i,
  /\bbulk[-_]?prune\b/i,
  /\bprune\s+all\b/i,
  /\bexecute\s+prune\b/i,
  /\brun\s+prune\s+now\b/i,
  /\bperform\s+mass\s+delete\b/i
];

const L30_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*30/i,
  /l(?:adder)?[\s_-]*30\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*30/i,
  /reopen\s+l(?:adder)?[\s_-]*29/i,
  /l(?:adder)?[\s_-]*29\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*29/i
];

const TIP_REWRITE_PATTERNS = [
  /tip[_ -]?rewrite/i,
  /rewrite\s+(?:the\s+)?tip/i,
  /rewrite\s+freeze\s+main[_ ]?tip/i,
  /force[_ -]?pin\s+tip/i,
  /overwrite\s+freeze\s+tip/i,
  /tip[_ -]?pin[_ -]?rewrite/i,
  /rewrite\s+freeze\s+tip[_ -]?pin/i,
  /mutate\s+freeze\s+pin/i
];

const AUTO_SEAL_PATTERNS = [
  /auto[_ -]?seal/i,
  /automatic\s+seal/i,
  /seal\s+without\s+human/i,
  /unattended\s+seal/i
];

const RECEIPT_EXCLUSION_KEYS = new Set([
  'receipt',
  'priorReceipts',
  'freezeObserve',
  'nonClaimLabels',
  'nonClaimNotes'
]);

function stripReceipts(val, depth = 0) {
  if (val == null || depth > 5) return val;
  if (Array.isArray(val)) return val.map((x) => stripReceipts(x, depth + 1));
  if (typeof val === 'object') {
    if (val.receiptId || val.receiptHash) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (RECEIPT_EXCLUSION_KEYS.has(k)) continue;
      const stripped = stripReceipts(v, depth + 1);
      if (stripped !== undefined) {
        out[k] = stripped;
      }
    }
    return out;
  }
  return val;
}

function matchesAny(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') {
    texts.push(value);
  } else if (typeof value === 'object') {
    try {
      const stripped = stripReceipts(value);
      if (stripped != null) {
        texts.push(JSON.stringify(stripped));
        for (const k of Object.keys(stripped)) {
          if (stripped[k] != null && typeof stripped[k] === 'string') {
            texts.push(stripped[k]);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return texts.some((t) => patterns.some((p) => p.test(t)));
}

export function scanForSecrets(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    return SECRET_PATTERNS.some((p) => p.test(value));
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      return SECRET_PATTERNS.some((p) => p.test(s));
    } catch {
      return false;
    }
  }
  return false;
}

export function claimsProductionReadyFlip(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.productionReady === 'YES' || v.productionReady === true) return true;
  }
  return matchesAny(v, PR_FLIP_PATTERNS);
}

export function claimsHardDelete(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.forceDelete === true || v.purge === true || v.hardDelete === true) return true;
  }
  return matchesAny(v, HARD_DELETE_PATTERNS);
}

export function claimsMassPrune(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.massPrune === true) return true;
  }
  return matchesAny(v, MASS_PRUNE_PATTERNS);
}

export function claimsL30Reopen(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.reopenL30 === true || v.reopenL29 === true) return true;
  }
  return matchesAny(v, L30_REOPEN_PATTERNS);
}

export function claimsTipRewrite(v) {
  return matchesAny(v, TIP_REWRITE_PATTERNS);
}

export function claimsAutoSeal(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.autoSeal === true) return true;
  }
  return matchesAny(v, AUTO_SEAL_PATTERNS);
}

export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try {
      if (Array.isArray(target)) {
        return target.some(isFundacionTarget);
      }
      return isFundacionTarget(JSON.stringify(target));
    } catch {
      return false;
    }
  }
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

export class AdversarialInvariantRefuterPolicyGate {
  constructor(options = {}) {
    this.options = options;
  }

  evaluatePreconditions(input = {}) {
    // 1. Law VI: Secret scan
    if (scanForSecrets(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Law VI: Secrets detected in payload'
      };
    }

    // 2. Fundacion write barrier
    if (
      isFundacionTarget(input) ||
      isFundacionTarget(input.targetPath) ||
      (Array.isArray(input.paths) && input.paths.some(isFundacionTarget))
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.FUNDACION_DENIED,
        reason: 'Fundacion write barrier violated: FUNDACION_ALWAYS_DENY (Δ=0)'
      };
    }

    // 3. Hard delete refusal
    if (claimsHardDelete(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete is forbidden'
      };
    }

    // 4. Mass prune refusal
    if (claimsMassPrune(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune is forbidden'
      };
    }

    // 5. PRODUCTION_READY flip refusal
    if (claimsProductionReadyFlip(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'PRODUCTION_READY remains strictly NO'
      };
    }

    // 6. L30 / L29 reopen refusal
    if (claimsL30Reopen(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Ladders 17 through 30 are permanently CLOSED'
      };
    }

    // 7. Auto-seal refusal
    if (claimsAutoSeal(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden; human gate held'
      };
    }

    // 8. Tip rewrite refusal
    if (claimsTipRewrite(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Freeze tip rewrite is forbidden'
      };
    }

    // 9. Required planId & changeId
    if (!input.planId || typeof input.planId !== 'string') {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.MISSING_PLAN_ID,
        reason: 'Missing required planId'
      };
    }
    if (!input.changeId || typeof input.changeId !== 'string') {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.MISSING_CHANGE_ID,
        reason: 'Missing required changeId'
      };
    }

    // 10. Refutation report validation
    if (!input.refutationReport) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.MISSING_REFUTATION_REPORT,
        reason: 'Missing required refutationReport'
      };
    }
    if (typeof input.refutationReport !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.INVALID_REFUTATION_REPORT,
        reason: 'refutationReport must be an object'
      };
    }

    const { unhandledBreaches, resilienceStatus, warningsCount } = input.refutationReport;

    if (Number(unhandledBreaches) > 0) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.INVARIANT_BREACH_DETECTED,
        reason: `Adversarial refutation detected ${unhandledBreaches} unhandled invariant breach(es)`
      };
    }

    if (resilienceStatus === 'COMPROMISED') {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.INVARIANT_BREACH_DETECTED,
        reason: 'Adversarial refutation status is COMPROMISED'
      };
    }

    // 11. Ritual mode check
    const mode = input.ritualMode || 'ACTIVE';
    if (!['ACTIVE', 'HOLD', 'DRY_RUN'].includes(mode)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DL_CODES.INVALID_RITUAL_MODE,
        reason: `Invalid ritualMode "${mode}"`
      };
    }

    if (mode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DL_CODES.OK,
        reason: 'Adversarial refuter ritual in HOLD mode'
      };
    }

    if (Number(warningsCount) > 0 && input.allowChallengeMode === true) {
      return {
        ok: true,
        decision: 'CHALLENGE',
        code: DL_CODES.OK,
        reason: `Adversarial refuter surfaced ${warningsCount} warning(s) under CHALLENGE mode`
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DL_CODES.OK,
      reason: 'Adversarial invariant refutation preconditions satisfied'
    };
  }
}
