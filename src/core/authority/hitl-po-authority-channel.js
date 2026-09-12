/**
 * @module hitl-po-authority-channel
 * SPEC-0047 / Mission AP — HITL / PO Authority Channel Hardening.
 *
 * Injectable authority channel over AI HITL + AK constitution gate
 * building blocks: escalate → openRequest → decide(approve|deny) /
 * tickTimeout → resume / DENY + sealed receipt with AJ-like ledger tip
 * linkage. Injectable scheduler pause for AF-like dependent cycles.
 * Hermetic fakes only — no fetch/http/CloudAgent.
 *
 * NON-CLAIM:
 *   HITL/PO authority channel ≠ GH required-check / branch-protection enforcement
 *   HITL/PO authority channel ≠ org IAM product
 *   HITL/PO authority channel ≠ PRODUCTION_READY approval SaaS
 *   not AQ/AR
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  AP_RECEIPT_KIND,
  AP_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildAuthorityReceipt
} from './authority-receipt.js';

/** @type {'NO'} */
export const AP_PRODUCTION_READY = 'NO';

export const AP_KIND = 'eos-hitl-po-authority-channel';

export const AP_CODES = Object.freeze({
  OK: 'OK',
  HITL_REQUIRED: 'HITL_REQUIRED',
  AUTHORITY_DENIED: 'AUTHORITY_DENIED',
  AUTHORITY_TIMEOUT: 'AUTHORITY_TIMEOUT',
  AUTHORITY_OPEN: 'AUTHORITY_OPEN',
  AUTHORITY_APPROVED: 'AUTHORITY_APPROVED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  LEDGER_LINK_FAIL: 'LEDGER_LINK_FAIL',
  SCHEDULER_BLOCKED: 'SCHEDULER_BLOCKED'
});

/** Allowed decision verbs. */
export const AP_DECISIONS = Object.freeze({
  APPROVE: 'approve',
  DENY: 'deny'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for AP authority channel failures.
 */
export class HitlPoAuthorityChannelError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AP_CODES.AUTHORITY_DENIED, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'HitlPoAuthorityChannelError';
    this.code = code;
    this.details = sanitizeApPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeApPayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (/^AP-(REQ|RCPT)-[a-z0-9]+$/i.test(value)) return value;
    if (LONG_B64_RE.test(value) && !value.includes('-')) return REDACTED;
    if (LONG_B64_RE.test(value) && /^[A-Za-z0-9+/=]{40,}$/.test(value)) {
      return REDACTED;
    }
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      /^(timeoutMs|openCount|decideCount|timeoutCount|cycleAdvanceAttempts|requestId|actionId|ledgerTip|receiptDigest|receiptId|phase|decision|status)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(digest|sha256|bodySha256|prevDigest|priorTip|tip)$/i.test(k)
    ) {
      out[k] =
        typeof v === 'string' ? redactSecretSubstrings(v) : sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefix built at
 * runtime (Law VI — never embed static vendor-key literals).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(
    `\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`,
    'g'
  );
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * Detect secret-like fields that must not enter receipts.
 * @param {unknown} obj
 * @returns {boolean}
 */
function containsSecretFields(obj, seen = new WeakSet()) {
  if (obj == null || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((v) => containsSecretFields(v, seen));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) return true;
    if (typeof v === 'string') {
      const vendorPrefix = ['s', 'k', '-'].join('');
      if (v.startsWith(vendorPrefix) && v.length >= 12) return true;
      if (/^Bearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(v)) return true;
    }
    if (containsSecretFields(v, seen)) return true;
  }
  return false;
}

/**
 * Create a hermetic AJ-like ledger stub for tip linkage in tests.
 * @param {object} [options]
 * @param {string} [options.tip]
 * @param {(payload: unknown) => string} [options.hash]
 */
export function createMemoryAuthorityLedger(options = {}) {
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  let tip =
    options.tip != null
      ? String(options.tip)
      : hashFn({ genesis: true, kind: 'ap-ledger-stub' });
  /** @type {object[]} */
  const entries = [];
  return {
    kind: 'eos-ap-aj-like-ledger-stub',
    PRODUCTION_READY: AP_PRODUCTION_READY,
    tip() {
      return tip;
    },
    append(entry) {
      const body = sanitizeApPayload({
        ...entry,
        prevTip: tip,
        at: entry && entry.at != null ? entry.at : new Date().toISOString()
      });
      const digest = hashFn(body);
      const record = { ...body, digest };
      entries.push(record);
      tip = digest;
      return sanitizeApPayload({ ok: true, tip, digest, entry: record });
    },
    getEntries() {
      return entries.map((e) => sanitizeApPayload(e));
    }
  };
}

/**
 * Create a hermetic AF-like scheduler stub that can be paused.
 * @param {object} [options]
 */
export function createMemoryAuthorityScheduler(options = {}) {
  let paused = options.paused === true;
  /** @type {string[]} */
  const pauseReasons = [];
  let cycleCount = 0;
  /** @type {object[]} */
  const blockedAttempts = [];
  return {
    kind: 'eos-ap-af-like-scheduler-stub',
    PRODUCTION_READY: AP_PRODUCTION_READY,
    isPaused() {
      return paused;
    },
    pause(reason) {
      paused = true;
      if (reason) pauseReasons.push(String(reason));
      return { ok: true, paused: true, reason: reason || null };
    },
    resume(reason) {
      paused = false;
      return { ok: true, paused: false, reason: reason || null };
    },
    /**
     * Attempt to advance an AF-like dependent cycle.
     * WHILE authority open → SCHEDULER_BLOCKED.
     */
    advanceCycle(meta = {}) {
      if (paused) {
        const blocked = sanitizeApPayload({
          ok: false,
          code: AP_CODES.SCHEDULER_BLOCKED,
          reason: 'scheduler paused for open authority request',
          ...meta
        });
        blockedAttempts.push(blocked);
        return blocked;
      }
      cycleCount += 1;
      return sanitizeApPayload({
        ok: true,
        code: AP_CODES.OK,
        cycleCount,
        ...meta
      });
    },
    getCycleCount() {
      return cycleCount;
    },
    getPauseReasons() {
      return pauseReasons.slice();
    },
    getBlockedAttempts() {
      return blockedAttempts.map((b) => sanitizeApPayload(b));
    }
  };
}

/**
 * Optional AK-like constitution gate stub (pass-through or deny).
 * @param {object} [options]
 * @param {boolean} [options.alwaysAllow]
 * @param {(req: object) => object} [options.evaluate]
 */
export function createMemoryConstitutionGate(options = {}) {
  const alwaysAllow = options.alwaysAllow !== false;
  return {
    kind: 'eos-ap-ak-like-gate-stub',
    PRODUCTION_READY: AP_PRODUCTION_READY,
    evaluate(req = {}) {
      if (typeof options.evaluate === 'function') {
        return options.evaluate(req);
      }
      if (!alwaysAllow) {
        return {
          ok: false,
          allow: false,
          code: 'POLICY_DENY',
          message: 'constitution gate DENY'
        };
      }
      return { ok: true, allow: true, code: 'OK' };
    }
  };
}

let _reqSeq = 0;

/**
 * @param {object} [options]
 * @param {{ tip(): string, append?(entry: object): object }} [options.ledger]
 * @param {{ pause(reason?: string): object, resume(reason?: string): object, isPaused(): boolean, advanceCycle?(meta?: object): object }} [options.scheduler]
 * @param {{ evaluate(req: object): object }} [options.constitutionGate]
 * @param {() => string|number} [options.now]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {(receipt: object) => object} [options.receiptSealer]
 * @param {number} [options.defaultTimeoutMs]
 * @param {boolean} [options.requireLedger]
 * @param {boolean} [options.requireScheduler]
 * @param {boolean} [options.throwOnDeny]
 * @param {boolean} [options.rejectSecretsInRequest]
 * @param {boolean} [options.autoApproveOnTimeout] — MUST stay false (fail-closed)
 */
export function createHitlPoAuthorityChannel(options = {}) {
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const receiptSealer =
    typeof options.receiptSealer === 'function'
      ? options.receiptSealer
      : null;
  const throwOnDeny = options.throwOnDeny === true;
  const rejectSecretsInRequest = options.rejectSecretsInRequest !== false;
  const requireLedger = options.requireLedger === true;
  const requireScheduler = options.requireScheduler === true;
  // Fail-closed: never auto-approve on timeout (ignore truthy attempts)
  const autoApproveOnTimeout = false;
  void options.autoApproveOnTimeout;
  void autoApproveOnTimeout;

  const ledger =
    options.ledger && typeof options.ledger === 'object'
      ? options.ledger
      : null;
  const scheduler =
    options.scheduler && typeof options.scheduler === 'object'
      ? options.scheduler
      : null;
  const constitutionGate =
    options.constitutionGate && typeof options.constitutionGate === 'object'
      ? options.constitutionGate
      : null;

  const defaultTimeoutMs =
    options.defaultTimeoutMs != null
      ? Math.max(1, Number(options.defaultTimeoutMs) || 1)
      : 60_000;

  /** @type {Map<string, object>} */
  const openRequests = new Map();
  /** @type {object[]} */
  const receipts = [];
  /** @type {object[]} */
  const decisionLog = [];

  let openCount = 0;
  let decideCount = 0;
  let timeoutCount = 0;
  let approveCount = 0;
  let denyCount = 0;

  function nonClaimFlags() {
    return {
      authorityNotGhBranchProtection: true,
      authorityNotOrgIam: true,
      authorityNotApprovalSaas: true,
      notAqAr: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      lawViEnvOnly: true,
      noAutoApproveOnTimeout: true
    };
  }

  function currentLedgerTip() {
    if (!ledger) return null;
    if (typeof ledger.tip === 'function') {
      try {
        return ledger.tip();
      } catch {
        return null;
      }
    }
    if (ledger.tip != null) return String(ledger.tip);
    return null;
  }

  /**
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body = {}) {
    const tip = currentLedgerTip();
    let receipt = buildAuthorityReceipt(sanitizeApPayload(body), {
      hash: hashFn,
      now: nowFn,
      ledgerTip: tip
    });
    // Overlay channel kind on top of receipt helper kind for channel seals
    receipt = sanitizeApPayload({
      ...receipt,
      channelKind: AP_KIND,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: nonClaimFlags()
    });
    if (receiptSealer) {
      receipt = sanitizeApPayload(receiptSealer(receipt));
    }
    receipt = sanitizeApPayload(receipt);

    // Optional AJ-like ledger append for sealed receipt linkage
    if (ledger && typeof ledger.append === 'function') {
      try {
        const linked = ledger.append({
          type: 'authority-receipt',
          receiptId: receipt.receiptId,
          code: receipt.code,
          requestId: receipt.requestId,
          phase: receipt.phase,
          decision: receipt.decision || null
        });
        if (linked && linked.tip) {
          receipt = sanitizeApPayload({
            ...receipt,
            ledgerTip: linked.tip,
            replayLink: { ledgerTip: linked.tip, kind: 'aj-like-ledger-tip' }
          });
        }
      } catch (err) {
        // LEDGER_LINK_FAIL is recorded but does not wipe the sealed receipt
        receipt = sanitizeApPayload({
          ...receipt,
          ledgerLinkError: sanitizeErrorMessage(err?.message || 'ledger append failed')
        });
      }
    }

    receipts.push(receipt);
    return receipt;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function denyResult(code, extra = {}) {
    const receipt = sealReceipt({
      ok: false,
      allow: false,
      code,
      phase: 'DENY',
      decision: extra.decision || 'deny',
      forensic: true,
      ...extra
    });
    const result = sanitizeApPayload({
      ok: false,
      allow: false,
      code,
      receipt,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      kind: AP_KIND,
      ...extra
    });
    if (throwOnDeny) {
      throw new HitlPoAuthorityChannelError(
        `AP deny: ${code}`,
        code,
        extra
      );
    }
    return result;
  }

  /**
   * WHEN long-horizon autonomy action requires HITL/PO authority:
   * pause scheduling + open authority request with sealed receipt linkage.
   * @param {object} request
   */
  function openRequest(request = {}) {
    if (request == null || typeof request !== 'object') {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: 'openRequest requires an object'
      });
    }

    if (requireLedger && !ledger) {
      return denyResult(AP_CODES.MISSING_DEP, { dep: 'ledger' });
    }
    if (requireScheduler && !scheduler) {
      return denyResult(AP_CODES.MISSING_DEP, { dep: 'scheduler' });
    }

    if (
      rejectSecretsInRequest &&
      containsSecretFields(request) &&
      (request.persistSecrets === true ||
        request.includeSecretsInReceipt === true ||
        request.sealSecrets === true)
    ) {
      return denyResult(AP_CODES.SECRET_LEAK_FORBIDDEN, {
        reason:
          'authority secrets must not enter sealed receipts / state (Law VI)'
      });
    }

    // Optional AK-like constitution pre-check
    if (constitutionGate && typeof constitutionGate.evaluate === 'function') {
      const gateOut = constitutionGate.evaluate({
        action: 'authority.open',
        ...sanitizeApPayload({
          actionId: request.actionId,
          reason: request.reason
        })
      });
      if (gateOut && gateOut.ok === false) {
        return denyResult(AP_CODES.AUTHORITY_DENIED, {
          reason: 'constitution gate DENY on open',
          gate: sanitizeApPayload(gateOut)
        });
      }
    }

    const actionId =
      request.actionId != null ? String(request.actionId).trim() : '';
    if (!actionId) {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: 'openRequest requires actionId'
      });
    }

    // Reject Fundacion write targets (ALWAYS DENY / Δ=0)
    if (
      request.fundacion === true ||
      request.fundacionWrite === true ||
      (typeof request.target === 'string' &&
        /fundacion/i.test(request.target))
    ) {
      return denyResult(AP_CODES.AUTHORITY_DENIED, {
        reason: 'Fundacion ALWAYS DENY — no Fundacion write via authority channel',
        fundacion: 'ALWAYS_DENY',
        fundacionDelta: 0
      });
    }

    _reqSeq += 1;
    const at = String(nowFn());
    const timeoutMs =
      request.timeoutMs != null
        ? Math.max(1, Number(request.timeoutMs) || defaultTimeoutMs)
        : defaultTimeoutMs;
    const openedAtMs =
      typeof request.openedAtMs === 'number'
        ? request.openedAtMs
        : Date.now();

    const tipBefore = currentLedgerTip();
    if (requireLedger && (tipBefore == null || tipBefore === '')) {
      return denyResult(AP_CODES.LEDGER_LINK_FAIL, {
        reason: 'ledger tip unavailable for sealed receipt linkage'
      });
    }

    const requestId = `AP-REQ-${hashFn({ actionId, at, seq: _reqSeq }).slice(0, 12)}`;

    // Pause injectable scheduler (AF-like dependent cycles)
    if (scheduler && typeof scheduler.pause === 'function') {
      scheduler.pause(`authority-open:${requestId}`);
    }

    const record = sanitizeApPayload({
      requestId,
      actionId,
      status: 'open',
      code: AP_CODES.AUTHORITY_OPEN,
      reason: request.reason != null ? String(request.reason) : null,
      timeoutMs,
      openedAt: at,
      openedAtMs,
      expiresAtMs: openedAtMs + timeoutMs,
      ledgerTipAtOpen: tipBefore,
      meta: sanitizeApPayload(request.meta || {}),
      decision: null,
      decidedAt: null
    });

    openRequests.set(requestId, record);
    openCount += 1;

    const receipt = sealReceipt({
      ok: true,
      allow: false,
      code: AP_CODES.HITL_REQUIRED,
      phase: 'OPEN',
      requestId,
      actionId,
      status: 'open',
      timeoutMs,
      hitlRequired: true,
      schedulerPaused: scheduler
        ? typeof scheduler.isPaused === 'function'
          ? scheduler.isPaused()
          : true
        : null
    });

    return sanitizeApPayload({
      ok: true,
      allow: false,
      code: AP_CODES.HITL_REQUIRED,
      status: 'open',
      requestId,
      actionId,
      timeoutMs,
      hitlRequired: true,
      schedulerPaused: receipt.schedulerPaused,
      receipt,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      kind: AP_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * PO/HITL decide: approve → resume; deny → DENY + forensic receipt.
   * @param {string} requestId
   * @param {'approve'|'deny'|object} decision
   */
  function decide(requestId, decision = {}) {
    if (requestId == null || String(requestId).trim() === '') {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: 'decide requires requestId'
      });
    }
    const id = String(requestId).trim();
    const record = openRequests.get(id);
    if (!record) {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: 'no open authority request for requestId',
        requestId: id
      });
    }
    if (record.status !== 'open') {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: `request already ${record.status}`,
        requestId: id,
        status: record.status
      });
    }

    let verb =
      typeof decision === 'string'
        ? decision
        : decision && decision.decision != null
          ? decision.decision
          : decision && decision.approve === true
            ? AP_DECISIONS.APPROVE
            : decision && decision.deny === true
              ? AP_DECISIONS.DENY
              : null;

    if (verb != null) verb = String(verb).toLowerCase().trim();
    if (verb !== AP_DECISIONS.APPROVE && verb !== AP_DECISIONS.DENY) {
      return denyResult(AP_CODES.INVALID_REQUEST, {
        reason: 'decide requires approve|deny',
        requestId: id
      });
    }

    // Law VI on decision payload
    if (
      decision &&
      typeof decision === 'object' &&
      rejectSecretsInRequest &&
      containsSecretFields(decision) &&
      (decision.persistSecrets === true ||
        decision.includeSecretsInReceipt === true)
    ) {
      return denyResult(AP_CODES.SECRET_LEAK_FORBIDDEN, {
        reason: 'decision must not persist secrets into receipts (Law VI)',
        requestId: id
      });
    }

    decideCount += 1;
    const at = String(nowFn());

    if (verb === AP_DECISIONS.APPROVE) {
      approveCount += 1;
      record.status = 'approved';
      record.decision = AP_DECISIONS.APPROVE;
      record.decidedAt = at;
      record.code = AP_CODES.AUTHORITY_APPROVED;
      openRequests.delete(id);

      if (scheduler && typeof scheduler.resume === 'function') {
        scheduler.resume(`authority-approve:${id}`);
      }

      const receipt = sealReceipt({
        ok: true,
        allow: true,
        code: AP_CODES.AUTHORITY_APPROVED,
        phase: 'DECIDE',
        decision: AP_DECISIONS.APPROVE,
        requestId: id,
        actionId: record.actionId,
        status: 'approved',
        actor:
          decision && typeof decision === 'object' && decision.actor
            ? String(decision.actor)
            : 'po-hitl',
        forensic: false
      });

      const out = sanitizeApPayload({
        ok: true,
        allow: true,
        code: AP_CODES.AUTHORITY_APPROVED,
        status: 'approved',
        requestId: id,
        actionId: record.actionId,
        decision: AP_DECISIONS.APPROVE,
        resumed: true,
        receipt,
        PRODUCTION_READY: AP_PRODUCTION_READY,
        kind: AP_KIND,
        nonClaim: nonClaimFlags()
      });
      decisionLog.push({
        requestId: id,
        decision: AP_DECISIONS.APPROVE,
        at
      });
      return out;
    }

    // DENY path — forensic receipt, no auto-approve
    denyCount += 1;
    record.status = 'denied';
    record.decision = AP_DECISIONS.DENY;
    record.decidedAt = at;
    record.code = AP_CODES.AUTHORITY_DENIED;
    openRequests.delete(id);

    // On deny we still resume scheduler so the system is not permanently wedged,
    // but the pending action is DENY'd (caller must not treat as approve).
    if (scheduler && typeof scheduler.resume === 'function') {
      scheduler.resume(`authority-deny:${id}`);
    }

    const receipt = sealReceipt({
      ok: false,
      allow: false,
      code: AP_CODES.AUTHORITY_DENIED,
      phase: 'DECIDE',
      decision: AP_DECISIONS.DENY,
      requestId: id,
      actionId: record.actionId,
      status: 'denied',
      forensic: true,
      actor:
        decision && typeof decision === 'object' && decision.actor
          ? String(decision.actor)
          : 'po-hitl',
      reason:
        decision && typeof decision === 'object' && decision.reason
          ? String(decision.reason)
          : 'explicit DENY'
    });

    decisionLog.push({
      requestId: id,
      decision: AP_DECISIONS.DENY,
      at
    });

    return sanitizeApPayload({
      ok: false,
      allow: false,
      code: AP_CODES.AUTHORITY_DENIED,
      status: 'denied',
      requestId: id,
      actionId: record.actionId,
      decision: AP_DECISIONS.DENY,
      forensic: true,
      receipt,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      kind: AP_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * IF authority request times out → DENY (no auto-approve) + forensic receipt.
   * @param {object} [opts]
   * @param {number} [opts.nowMs]
   * @param {string} [opts.requestId] — tick one; else all open
   */
  function tickTimeout(opts = {}) {
    const nowMs =
      typeof opts.nowMs === 'number' ? opts.nowMs : Date.now();
    /** @type {object[]} */
    const timedOut = [];

    const ids =
      opts.requestId != null
        ? [String(opts.requestId)]
        : [...openRequests.keys()];

    for (const id of ids) {
      const record = openRequests.get(id);
      if (!record || record.status !== 'open') continue;
      if (nowMs < record.expiresAtMs) continue;

      timeoutCount += 1;
      denyCount += 1;
      record.status = 'timeout';
      record.decision = AP_DECISIONS.DENY;
      record.decidedAt = String(nowFn());
      record.code = AP_CODES.AUTHORITY_TIMEOUT;
      openRequests.delete(id);

      if (scheduler && typeof scheduler.resume === 'function') {
        scheduler.resume(`authority-timeout:${id}`);
      }

      const receipt = sealReceipt({
        ok: false,
        allow: false,
        code: AP_CODES.AUTHORITY_TIMEOUT,
        phase: 'TIMEOUT',
        decision: AP_DECISIONS.DENY,
        requestId: id,
        actionId: record.actionId,
        status: 'timeout',
        forensic: true,
        autoApproved: false,
        reason: 'authority request timed out — DENY (no auto-approve)'
      });

      const result = sanitizeApPayload({
        ok: false,
        allow: false,
        code: AP_CODES.AUTHORITY_TIMEOUT,
        status: 'timeout',
        requestId: id,
        actionId: record.actionId,
        decision: AP_DECISIONS.DENY,
        autoApproved: false,
        forensic: true,
        receipt,
        PRODUCTION_READY: AP_PRODUCTION_READY,
        kind: AP_KIND
      });
      timedOut.push(result);
      decisionLog.push({
        requestId: id,
        decision: 'timeout-deny',
        at: record.decidedAt
      });
    }

    return sanitizeApPayload({
      ok: timedOut.length === 0,
      code:
        timedOut.length === 0 ? AP_CODES.OK : AP_CODES.AUTHORITY_TIMEOUT,
      timedOut,
      openRemaining: openRequests.size,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      kind: AP_KIND,
      autoApproveOnTimeout: false
    });
  }

  /**
   * WHILE an authority request is open, dependent AF-like cycles must not advance.
   * @param {object} [meta]
   */
  function tryAdvanceDependentCycle(meta = {}) {
    if (openRequests.size > 0) {
      // Ensure scheduler stays paused
      if (
        scheduler &&
        typeof scheduler.isPaused === 'function' &&
        !scheduler.isPaused() &&
        typeof scheduler.pause === 'function'
      ) {
        scheduler.pause('authority-open-reassert');
      }
      if (scheduler && typeof scheduler.advanceCycle === 'function') {
        return sanitizeApPayload({
          ...scheduler.advanceCycle({
            ...meta,
            blockedBy: 'authority-open'
          }),
          code: AP_CODES.SCHEDULER_BLOCKED,
          openRequestCount: openRequests.size,
          PRODUCTION_READY: AP_PRODUCTION_READY,
          kind: AP_KIND
        });
      }
      return sanitizeApPayload({
        ok: false,
        allow: false,
        code: AP_CODES.SCHEDULER_BLOCKED,
        reason: 'open authority request blocks dependent cycle advance',
        openRequestCount: openRequests.size,
        PRODUCTION_READY: AP_PRODUCTION_READY,
        kind: AP_KIND
      });
    }

    if (scheduler && typeof scheduler.advanceCycle === 'function') {
      return sanitizeApPayload({
        ...scheduler.advanceCycle(meta),
        PRODUCTION_READY: AP_PRODUCTION_READY,
        kind: AP_KIND
      });
    }

    if (requireScheduler && !scheduler) {
      return denyResult(AP_CODES.MISSING_DEP, { dep: 'scheduler' });
    }

    return sanitizeApPayload({
      ok: true,
      code: AP_CODES.OK,
      reason: 'no open authority; no scheduler injectable — noop advance',
      PRODUCTION_READY: AP_PRODUCTION_READY,
      kind: AP_KIND
    });
  }

  function getOpenRequests() {
    return [...openRequests.values()].map((r) => sanitizeApPayload(r));
  }

  function getState() {
    return sanitizeApPayload({
      kind: AP_KIND,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      openCount: openRequests.size,
      totalOpened: openCount,
      decideCount,
      timeoutCount,
      approveCount,
      denyCount,
      openRequests: getOpenRequests(),
      receiptCount: receipts.length,
      decisionLog: decisionLog.slice(-20),
      ledger: ledger
        ? {
            present: true,
            tip: currentLedgerTip()
          }
        : { present: false },
      scheduler: scheduler
        ? {
            present: true,
            paused:
              typeof scheduler.isPaused === 'function'
                ? scheduler.isPaused()
                : null
          }
        : { present: false },
      constitutionGate: { present: !!constitutionGate },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      autoApproveOnTimeout: false,
      receiptHelperKind: AP_RECEIPT_KIND,
      receiptHelperProductionReady: AP_RECEIPT_PRODUCTION_READY,
      nonClaim: nonClaimFlags()
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeApPayload(r));
  }

  function health() {
    return sanitizeApPayload({
      ok: true,
      kind: AP_KIND,
      PRODUCTION_READY: AP_PRODUCTION_READY,
      openCount: openRequests.size,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      autoApproveOnTimeout: false,
      nonClaim: nonClaimFlags()
    });
  }

  return {
    kind: AP_KIND,
    PRODUCTION_READY: AP_PRODUCTION_READY,
    openRequest,
    decide,
    tickTimeout,
    tryAdvanceDependentCycle,
    sealReceipt,
    getState,
    getOpenRequests,
    getReceipts,
    health,
    sanitizeApPayload,
    /** @internal */
    _codes: AP_CODES
  };
}

export {
  AP_RECEIPT_KIND,
  AP_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildAuthorityReceipt
};

export default createHitlPoAuthorityChannel;
