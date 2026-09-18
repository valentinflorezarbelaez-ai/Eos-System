/**
 * @module operator-reality-console-policy-gate
 * SPEC-0088 / Mission CE — Policy Gate for Operator Reality Console snapshots.
 * Fail-closed validation for epistemic console plans (entries across ladders),
 * Law VI secret screening, Fundacion write barrier, and max entry bounds.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Operator reality console ≠ full SIEM/APM / ≠ production ops center.
 */

import {
  sha256Canonical,
  CE_STATUS
} from './operator-reality-console-receipt.js';

/** @type {'NO'} */
export const CE_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CE_POLICY_GATE_KIND = 'eos-operator-reality-console-policy-gate';

/** Default maximum entries per console snapshot. */
export const CE_MAX_ENTRIES = 64;

/**
 * Known ladder id set (L11–L24 inclusive) plus optional literal aliases.
 */
export const CE_KNOWN_LADDERS = Object.freeze(
  Array.from({ length: 14 }, (_, i) => `L${11 + i}`)
);

/** Ladder id pattern: L11–L24. */
export const CE_LADDER_ID_PATTERN = /^L(1[1-9]|2[0-4])$/i;

/** Valid epistemic status enum. */
export const CE_VALID_STATUSES = Object.freeze([
  CE_STATUS.MEASURED,
  CE_STATUS.UNKNOWN,
  CE_STATUS.BLOCKED
]);

export const CE_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  SNAPSHOT_VIEW: 'SNAPSHOT_VIEW',
  SNAPSHOT_DENY: 'SNAPSHOT_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_CONSOLE_DENY: 'EMPTY_CONSOLE_DENY',
  EMPTY_ENTRIES_DENY: 'EMPTY_ENTRIES_DENY',
  OVERSIZED_ENTRIES_DENY: 'OVERSIZED_ENTRIES_DENY',
  INVALID_STATUS_DENY: 'INVALID_STATUS_DENY',
  UNKNOWN_LADDER_DENY: 'UNKNOWN_LADDER_DENY',
  INVALID_CONSOLE_ID_DENY: 'INVALID_CONSOLE_ID_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DENY: 'DENY'
});

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

/**
 * Check if a string, object, or property contains secret patterns (Law VI).
 * @param {unknown} value
 * @returns {boolean}
 */
export function scanForSecrets(value) {
  if (value == null) return false;

  if (typeof value === 'string') {
    for (const pat of FORBIDDEN_SECRET_PATTERNS) {
      if (pat.test(value)) return true;
    }
    return false;
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      for (const pat of FORBIDDEN_SECRET_PATTERNS) {
        if (pat.test(serialized)) return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if a target string touches the forbidden Fundacion directory.
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Normalize / validate a ladder id against L11–L24 known set.
 * @param {unknown} ladder
 * @returns {string|null} Uppercased ladder id or null if invalid
 */
export function normalizeLadderId(ladder) {
  if (ladder == null) return null;
  const s = String(ladder).trim().toUpperCase();
  if (!CE_LADDER_ID_PATTERN.test(s)) return null;
  if (!CE_KNOWN_LADDERS.includes(s)) return null;
  return s;
}

/**
 * Policy Gate validator for operator reality console snapshot plans.
 */
export class OperatorRealityConsolePolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEntries]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxEntries =
      options.maxEntries != null
        ? Number(options.maxEntries)
        : CE_MAX_ENTRIES;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a console snapshot plan before VIEW decision.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, consoleId?: string, entries?: object[], snapshotAt?: string }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CE_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    // Plan-level Fundacion targets
    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.consoleId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CE_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CE_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const consoleId =
      plan.consoleId != null ? String(plan.consoleId).trim() : '';
    if (!consoleId) {
      return {
        valid: false,
        code: CE_CODES.INVALID_CONSOLE_ID_DENY,
        reason: 'consoleId must be a non-empty string'
      };
    }
    if (isFundacionTarget(consoleId)) {
      return {
        valid: false,
        code: CE_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'consoleId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const entriesRaw =
      plan.entries != null
        ? plan.entries
        : plan.console != null
          ? plan.console
          : null;

    if (!Array.isArray(entriesRaw)) {
      return {
        valid: false,
        code: CE_CODES.EMPTY_CONSOLE_DENY,
        reason: 'Plan.entries must be a non-empty array of console entries'
      };
    }

    if (entriesRaw.length === 0) {
      return {
        valid: false,
        code: CE_CODES.EMPTY_CONSOLE_DENY,
        reason: 'Empty console entries are rejected fail-closed'
      };
    }

    if (entriesRaw.length > this.maxEntries) {
      return {
        valid: false,
        code: CE_CODES.OVERSIZED_ENTRIES_DENY,
        reason: `Entries exceed max entry bound (${this.maxEntries}); got ${entriesRaw.length}`
      };
    }

    /** @type {object[]} */
    const normalized = [];

    for (let i = 0; i < entriesRaw.length; i++) {
      const entry = entriesRaw[i];
      if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
        return {
          valid: false,
          code: CE_CODES.MALFORMED_PLAN_DENY,
          reason: `Entry at index ${i} must be a non-null object`
        };
      }

      if (
        isFundacionTarget(entry.target) ||
        isFundacionTarget(entry.targetPath) ||
        isFundacionTarget(entry.label) ||
        isFundacionTarget(entry.evidenceRef) ||
        isFundacionTarget(entry.payload)
      ) {
        return {
          valid: false,
          code: CE_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Entry at index ${i} targets Fundacion directory (Fundacion Δ=0 invariant)`
        };
      }

      if (scanForSecrets(entry)) {
        return {
          valid: false,
          code: CE_CODES.SECRET_DETECTED_DENY,
          reason: `Entry at index ${i} labels/payloads contain plain secrets (Law VI)`
        };
      }

      const ladder = normalizeLadderId(entry.ladder);
      if (!ladder) {
        return {
          valid: false,
          code: CE_CODES.UNKNOWN_LADDER_DENY,
          reason: `Entry at index ${i}: ladder '${entry.ladder}' is not in known set L11–L24`
        };
      }

      const status =
        entry.status != null ? String(entry.status).trim().toUpperCase() : '';
      if (!CE_VALID_STATUSES.includes(status)) {
        return {
          valid: false,
          code: CE_CODES.INVALID_STATUS_DENY,
          reason: `Entry at index ${i}: status '${entry.status}' must be MEASURED|UNKNOWN|BLOCKED`
        };
      }

      normalized.push({
        ladder,
        satellite:
          entry.satellite != null && entry.satellite !== ''
            ? String(entry.satellite)
            : null,
        status,
        evidenceRef:
          entry.evidenceRef != null && entry.evidenceRef !== ''
            ? String(entry.evidenceRef)
            : null
      });
    }

    const snapshotAt =
      plan.snapshotAt != null
        ? String(plan.snapshotAt)
        : new Date().toISOString();

    return {
      valid: true,
      code: CE_CODES.PLAN_VALID_OK,
      consoleId,
      entries: normalized,
      snapshotAt
    };
  }
}

export default {
  CE_POLICY_GATE_PRODUCTION_READY,
  CE_POLICY_GATE_KIND,
  CE_MAX_ENTRIES,
  CE_KNOWN_LADDERS,
  CE_LADDER_ID_PATTERN,
  CE_VALID_STATUSES,
  CE_CODES,
  scanForSecrets,
  isFundacionTarget,
  normalizeLadderId,
  OperatorRealityConsolePolicyGate
};
