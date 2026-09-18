/**
 * @module mission-archive-replay-policy-gate
 * SPEC-0091 / Mission CH — Policy Gate for Long-Horizon Mission Archive & Replay.
 * Fail-closed validation for archive/replay plans (trail entries),
 * Law VI secret screening, Fundacion write barrier, max entry bounds,
 * digest shape (64 hex), and rejection of empty trails.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Long-horizon mission archive & replay ≠ production data lake /
 * ≠ SIEM retention SaaS / ≠ Fundacion writes.
 */

import { sha256Canonical } from './mission-archive-replay-receipt.js';

/** @type {'NO'} */
export const CH_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CH_POLICY_GATE_KIND = 'eos-mission-archive-replay-policy-gate';

/** Default maximum trail entries per archive plan. */
export const CH_MAX_ENTRIES = 64;

/**
 * Mission id pattern (alphanumeric / mission-code style).
 * Examples: CG, CH, BZ, mission-cg, eos-ladder-25
 */
export const CH_MISSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * Receipt id pattern (mission-prefixed sealed receipts).
 * Examples: CG-RCPT-20260918-0001, CH-RCPT-20260918-0002, CF-RCPT-abc
 */
export const CH_RECEIPT_ID_PATTERN = /^[A-Z]{1,4}-RCPT-[A-Za-z0-9-]{1,96}$/;

/** 64-char lowercase hex digest (sha256). */
export const CH_DIGEST_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Archive id pattern.
 * Examples: eos-archive-demo, trail-l25-ch-001
 */
export const CH_ARCHIVE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

export const CH_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  ARCHIVE_ALLOW: 'ARCHIVE_ALLOW',
  REPLAY_ALLOW: 'REPLAY_ALLOW',
  ARCHIVE_DENY: 'ARCHIVE_DENY',
  REPLAY_DENY: 'REPLAY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  EMPTY_TRAIL_DENY: 'EMPTY_TRAIL_DENY',
  OVERSIZED_TRAIL_DENY: 'OVERSIZED_TRAIL_DENY',
  INVALID_ARCHIVE_ID_DENY: 'INVALID_ARCHIVE_ID_DENY',
  INVALID_MISSION_ID_DENY: 'INVALID_MISSION_ID_DENY',
  INVALID_RECEIPT_ID_DENY: 'INVALID_RECEIPT_ID_DENY',
  INVALID_DIGEST_DENY: 'INVALID_DIGEST_DENY',
  ARCHIVE_NOT_FOUND_DENY: 'ARCHIVE_NOT_FOUND_DENY',
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
 * Normalize / validate a mission id.
 * @param {unknown} missionId
 * @returns {string|null}
 */
export function normalizeMissionIdStrict(missionId) {
  if (missionId == null) return null;
  const s = String(missionId).trim();
  if (!s) return null;
  if (!CH_MISSION_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Normalize / validate a receipt id.
 * @param {unknown} receiptId
 * @returns {string|null}
 */
export function normalizeReceiptIdStrict(receiptId) {
  if (receiptId == null) return null;
  const s = String(receiptId).trim();
  if (!s) return null;
  if (!CH_RECEIPT_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Normalize / validate a 64-hex digest.
 * @param {unknown} digest
 * @returns {string|null}
 */
export function normalizeDigestStrict(digest) {
  if (digest == null) return null;
  const s = String(digest).trim().toLowerCase();
  if (!s) return null;
  if (!CH_DIGEST_PATTERN.test(s)) return null;
  return s;
}

/**
 * Policy Gate validator for mission archive & replay plans.
 */
export class MissionArchiveReplayPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEntries]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxEntries =
      options.maxEntries != null
        ? Number(options.maxEntries)
        : CH_MAX_ENTRIES;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Shared prechecks (Fundacion / secrets / archiveId).
   * @param {unknown} plan
   * @returns {{ valid: false, code: string, reason: string }|{ valid: true, archiveId: string }}
   */
  _precheck(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CH_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.archiveId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CH_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CH_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const archiveId =
      plan.archiveId != null ? String(plan.archiveId).trim() : '';
    if (!archiveId || !CH_ARCHIVE_ID_PATTERN.test(archiveId)) {
      return {
        valid: false,
        code: CH_CODES.INVALID_ARCHIVE_ID_DENY,
        reason: 'archiveId must be a non-empty valid archive identifier'
      };
    }
    if (isFundacionTarget(archiveId)) {
      return {
        valid: false,
        code: CH_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'archiveId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    return { valid: true, archiveId };
  }

  /**
   * Validate trail entries array (shared by archive plans).
   * @param {unknown} entriesRaw
   * @returns {{ valid: false, code: string, reason: string }|{ valid: true, trailEntries: Array<{missionId:string,receiptId:string,digest:string}> }}
   */
  _validateTrailEntries(entriesRaw) {
    if (!Array.isArray(entriesRaw)) {
      return {
        valid: false,
        code: CH_CODES.EMPTY_PLAN_DENY,
        reason: 'Plan.trailEntries must be a non-empty array of trail entries'
      };
    }

    if (entriesRaw.length === 0) {
      return {
        valid: false,
        code: CH_CODES.EMPTY_TRAIL_DENY,
        reason: 'Empty trailEntries are rejected fail-closed'
      };
    }

    if (entriesRaw.length > this.maxEntries) {
      return {
        valid: false,
        code: CH_CODES.OVERSIZED_TRAIL_DENY,
        reason: `Trail entries exceed max entry bound (${this.maxEntries}); got ${entriesRaw.length}`
      };
    }

    /** @type {Array<{missionId:string,receiptId:string,digest:string}>} */
    const trailEntries = [];
    for (let i = 0; i < entriesRaw.length; i++) {
      const raw = entriesRaw[i];
      if (raw == null || typeof raw !== 'object') {
        return {
          valid: false,
          code: CH_CODES.MALFORMED_PLAN_DENY,
          reason: `Trail entry at index ${i} must be an object`
        };
      }

      if (
        isFundacionTarget(raw.missionId) ||
        isFundacionTarget(raw.receiptId) ||
        isFundacionTarget(raw.path) ||
        isFundacionTarget(raw.target)
      ) {
        return {
          valid: false,
          code: CH_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Trail entry at index ${i} targets Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (scanForSecrets(raw)) {
        return {
          valid: false,
          code: CH_CODES.SECRET_DETECTED_DENY,
          reason: `Trail entry at index ${i} contains plain secrets (Law VI)`
        };
      }

      const missionId = normalizeMissionIdStrict(raw.missionId);
      if (!missionId) {
        return {
          valid: false,
          code: CH_CODES.INVALID_MISSION_ID_DENY,
          reason: `Trail entry at index ${i}: missionId '${raw.missionId}' is invalid`
        };
      }
      if (isFundacionTarget(missionId)) {
        return {
          valid: false,
          code: CH_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Trail entry at index ${i} missionId targets Fundacion`
        };
      }

      const receiptId = normalizeReceiptIdStrict(raw.receiptId);
      if (!receiptId) {
        return {
          valid: false,
          code: CH_CODES.INVALID_RECEIPT_ID_DENY,
          reason: `Trail entry at index ${i}: receiptId '${raw.receiptId}' is invalid`
        };
      }

      const digest = normalizeDigestStrict(raw.digest);
      if (!digest) {
        return {
          valid: false,
          code: CH_CODES.INVALID_DIGEST_DENY,
          reason: `Trail entry at index ${i}: digest must be 64 lowercase hex chars`
        };
      }

      trailEntries.push({ missionId, receiptId, digest });
    }

    return { valid: true, trailEntries };
  }

  /**
   * Evaluate an archive plan before ARCHIVE decision.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, archiveId?: string, trailEntries?: Array<object> }}
   */
  evaluateArchivePlan(plan) {
    const pre = this._precheck(plan);
    if (!pre.valid) return pre;

    const entriesRaw =
      plan.trailEntries != null
        ? plan.trailEntries
        : plan.entries != null
          ? plan.entries
          : null;

    const trail = this._validateTrailEntries(entriesRaw);
    if (!trail.valid) return trail;

    return {
      valid: true,
      code: CH_CODES.PLAN_VALID_OK,
      archiveId: pre.archiveId,
      trailEntries: trail.trailEntries
    };
  }

  /**
   * Evaluate a replay plan before REPLAY decision.
   * Replay may supply archiveId only (looked up in port) or inline trailEntries
   * for sealed-trail verification. When trailEntries present, they are validated.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, archiveId?: string, trailEntries?: Array<object>|null, replayCursor?: string|null }}
   */
  evaluateReplayPlan(plan) {
    const pre = this._precheck(plan);
    if (!pre.valid) return pre;

    const replayCursor =
      plan.replayCursor != null && String(plan.replayCursor).trim() !== ''
        ? String(plan.replayCursor).trim()
        : null;

    if (replayCursor && isFundacionTarget(replayCursor)) {
      return {
        valid: false,
        code: CH_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'replayCursor targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }
    if (replayCursor && scanForSecrets(replayCursor)) {
      return {
        valid: false,
        code: CH_CODES.SECRET_DETECTED_DENY,
        reason: 'replayCursor contains plain secrets (Law VI)'
      };
    }

    const entriesRaw =
      plan.trailEntries != null
        ? plan.trailEntries
        : plan.entries != null
          ? plan.entries
          : null;

    if (entriesRaw != null) {
      const trail = this._validateTrailEntries(entriesRaw);
      if (!trail.valid) return trail;
      return {
        valid: true,
        code: CH_CODES.PLAN_VALID_OK,
        archiveId: pre.archiveId,
        trailEntries: trail.trailEntries,
        replayCursor
      };
    }

    // archiveId-only replay: port must resolve sealed in-memory archive
    return {
      valid: true,
      code: CH_CODES.PLAN_VALID_OK,
      archiveId: pre.archiveId,
      trailEntries: null,
      replayCursor
    };
  }

  /**
   * Default evaluatePlan routes to archive (backward-compat with CG-style single entry).
   * @param {unknown} plan
   */
  evaluatePlan(plan) {
    return this.evaluateArchivePlan(plan);
  }
}

export default {
  CH_POLICY_GATE_PRODUCTION_READY,
  CH_POLICY_GATE_KIND,
  CH_MAX_ENTRIES,
  CH_MISSION_ID_PATTERN,
  CH_RECEIPT_ID_PATTERN,
  CH_DIGEST_PATTERN,
  CH_ARCHIVE_ID_PATTERN,
  CH_CODES,
  scanForSecrets,
  isFundacionTarget,
  normalizeMissionIdStrict,
  normalizeReceiptIdStrict,
  normalizeDigestStrict,
  MissionArchiveReplayPolicyGate
};
