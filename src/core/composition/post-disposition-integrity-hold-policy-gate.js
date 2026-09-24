/**
 * @module post-disposition-integrity-hold-policy-gate
 * SPEC-0118 / Mission DI — Policy Gate for Post-Disposition Integrity & Docs SSOT Hold Ritual Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 3d0c2e0b
 *   DH receipt linkage required (decision=PASS)
 *   Integrity check verification required (status=VERIFIED, failures=0)
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L29 reopen
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DI_PRODUCTION_READY,
  DI_FREEZE_PIN_SHORT
} from './post-disposition-integrity-hold-receipt.js';

/** @type {'NO'} */
export const DI_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DI_POLICY_GATE_KIND = 'eos-post-disposition-integrity-hold-policy-gate';

export const DI_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'OBSERVE',
  'EXECUTION',
  'VERIFY'
]);

export const DI_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_DH_RECEIPT: 'MISSING_DH_RECEIPT',
  INVALID_DH_RECEIPT: 'INVALID_DH_RECEIPT',
  INTEGRITY_CHECK_FAILED: 'INTEGRITY_CHECK_FAILED',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L29_REOPEN_FORBIDDEN: 'L29_REOPEN_FORBIDDEN',
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

const L29_REOPEN_PATTERNS = [
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

function matchesAny(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') {
    texts.push(value);
  } else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of Object.keys(value)) {
        if (value[k] != null && typeof value[k] === 'string') {
          texts.push(value[k]);
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

export function claimsL29Reopen(v) {
  if (v == null) return false;
  if (typeof v === 'object') {
    if (v.reopenL29 === true) return true;
  }
  return matchesAny(v, L29_REOPEN_PATTERNS);
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

export class PostDispositionIntegrityHoldPolicyGate {
  constructor(options = {}) {
    this.options = options;
  }

  evaluatePreconditions(input = {}) {
    // 1. Law VI: Secret scan
    if (scanForSecrets(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.SECRET_LEAK_FORBIDDEN,
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
        code: DI_CODES.FUNDACION_DENIED,
        reason: 'Fundacion write barrier violated: FUNDACION_ALWAYS_DENY (Δ=0)'
      };
    }

    // 3. Hard delete refusal
    if (claimsHardDelete(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete is forbidden'
      };
    }

    // 4. Mass prune refusal
    if (claimsMassPrune(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune is forbidden'
      };
    }

    // 5. PRODUCTION_READY flip refusal
    if (claimsProductionReadyFlip(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'PRODUCTION_READY remains strictly NO'
      };
    }

    // 6. L29 reopen refusal
    if (claimsL29Reopen(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.L29_REOPEN_FORBIDDEN,
        reason: 'Ladder 29 is permanently CLOSED'
      };
    }

    // 7. Auto-seal refusal
    if (claimsAutoSeal(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden; human gate held'
      };
    }

    // 8. Tip rewrite refusal
    if (claimsTipRewrite(input)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Freeze tip rewrite is forbidden'
      };
    }

    // 9. Required planId & changeId
    if (!input.planId || typeof input.planId !== 'string') {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.MISSING_PLAN_ID,
        reason: 'Missing required planId'
      };
    }
    if (!input.changeId || typeof input.changeId !== 'string') {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.MISSING_CHANGE_ID,
        reason: 'Missing required changeId'
      };
    }

    // 10. DH receipt linkage
    if (!input.dhReceipt || typeof input.dhReceipt !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.MISSING_DH_RECEIPT,
        reason: 'Missing required DH receipt linkage'
      };
    }
    if (input.dhReceipt.decision !== 'PASS') {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.INVALID_DH_RECEIPT,
        reason: 'Linked DH receipt decision must be PASS'
      };
    }

    // 11. Integrity check verification
    if (input.integrity && typeof input.integrity === 'object') {
      if (input.integrity.status !== 'VERIFIED' || (Number(input.integrity.failures) || 0) > 0) {
        return {
          ok: false,
          decision: 'DENY',
          code: DI_CODES.INTEGRITY_CHECK_FAILED,
          reason: `Integrity check failed: status=${input.integrity.status}, failures=${input.integrity.failures}`
        };
      }
    }

    // 12. Ritual mode check
    const mode = input.ritualMode || 'ACTIVE';
    if (!['ACTIVE', 'HOLD', 'DRY_RUN'].includes(mode)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DI_CODES.INVALID_RITUAL_MODE,
        reason: `Invalid ritualMode "${mode}"`
      };
    }

    if (mode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DI_CODES.OK,
        reason: 'Integrity hold ritual in HOLD mode'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DI_CODES.OK,
      reason: 'Post-disposition integrity hold preconditions satisfied'
    };
  }
}
