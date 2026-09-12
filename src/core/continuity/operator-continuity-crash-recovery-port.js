/**
 * @module operator-continuity-crash-recovery-port
 * SPEC-0051 / Mission AT — Operator Continuity / Crash-Recovery Custody Port.
 *
 * Injectable continuity port that restarts governed sessions after process
 * crash using sealed custody on disk. Reuse AI+W (+ optional AN envelopes)
 * as conceptual building blocks — injectable custody store fakes; don't
 * rewrite full AI/AN. Hermetic fakes only — no fetch/http/CloudAgent.
 *
 * NON-CLAIM:
 *   operator continuity ≠ HA multi-region SaaS
 *   operator continuity ≠ multi-AZ failover product
 *   operator continuity ≠ CloudAgent fleet recovery
 *   not AU/AV/AW
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  AT_RECEIPT_KIND,
  AT_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildContinuityReceipt
} from './continuity-receipt.js';
import {
  AT_SNAPSHOT_KIND,
  AT_SNAPSHOT_PRODUCTION_READY,
  AT_STORE_KIND,
  ALLOWLISTED_SESSION_KEYS,
  projectAllowlistedState,
  sealCustodySnapshot,
  verifyCustodySnapshot,
  createContinuityCustodyStore,
  createAnEnvelopeContinuityAdapter
} from './custody-snapshot.js';

/** @type {'NO'} */
export const AT_PRODUCTION_READY = 'NO';

export const AT_KIND = 'eos-operator-continuity-crash-recovery-port';

export const AT_CODES = Object.freeze({
  OK: 'OK',
  RESTART_OK: 'RESTART_OK',
  TAMPER_DETECTED: 'TAMPER_DETECTED',
  TIP_MISMATCH: 'TIP_MISMATCH',
  CUSTODY_CONFLICT: 'CUSTODY_CONFLICT',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PARTIAL_APPLY_FORBIDDEN: 'PARTIAL_APPLY_FORBIDDEN'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for AT continuity port failures.
 */
export class OperatorContinuityError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AT_CODES.INVALID_REQUEST, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'OperatorContinuityError';
    this.code = code;
    this.details = sanitizeAtPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAtPayload(obj) {
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
    // Git tip pins (40-char SHA-1) and short StartsWith tips — not secrets
    if (/^[a-f0-9]{7,40}$/i.test(value)) return value;
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (/^AT-(RCPT|CP|ENV|SESS)-[a-z0-9]+$/i.test(value)) return value;
    if (LONG_B64_RE.test(value) && !value.includes('-') && !/^[a-f0-9]+$/i.test(value)) {
      return REDACTED;
    }
    if (LONG_B64_RE.test(value) && /^[A-Za-z0-9+/=]{40,}$/.test(value) && !/^[a-f0-9]+$/i.test(value)) {
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
      /^(checkpointCount|restartCount|denyCount|crashCount|sessionId|checkpointId|receiptId|receiptDigest|custodyDigest|phase|code|status|tipPin|expectedTip|actualTip|head|generation|recoveryInProgress)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(digest|sha256|bodySha256|prevDigest|priorTip|tip|packDigest)$/i.test(
        k
      )
    ) {
      out[k] =
        typeof v === 'string'
          ? redactSecretSubstrings(v)
          : sanitizeDeep(v, seen);
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

let _cpSeq = 0;

/**
 * @param {object} [options]
 * @param {{ load(id: string): object|null, save(id: string, record: object): void, list?(): object[], putSnapshot?(s: object): object, listHeads?(sid: string): string[], loadLatest?(sid: string): object|null, tamper?(id: string, patch?: object): boolean }} [options.store]
 * @param {string} [options.expectedTip] — tip pin that restart must match
 * @param {() => string|number} [options.now]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {(receipt: object) => object} [options.receiptSealer]
 * @param {object} [options.anEnvelope] — optional AN envelope continuity adapter
 * @param {boolean} [options.requireStore]
 * @param {boolean} [options.rejectSecretsInRequest]
 * @param {boolean} [options.throwOnDeny]
 * @param {boolean} [options.failClosedPartialApply] — default true
 */
export function createOperatorContinuityCrashRecoveryPort(options = {}) {
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
  const requireStore = options.requireStore !== false;
  const failClosedPartialApply = options.failClosedPartialApply !== false;
  const expectedTip =
    options.expectedTip != null ? String(options.expectedTip) : null;

  const store =
    options.store && typeof options.store === 'object'
      ? options.store
      : requireStore
        ? null
        : createContinuityCustodyStore({ hash: hashFn, now: nowFn });

  const anEnvelope =
    options.anEnvelope && typeof options.anEnvelope === 'object'
      ? options.anEnvelope
      : null;

  /** @type {Map<string, object>} live in-process session state */
  const liveSessions = new Map();
  /** @type {object[]} */
  const receipts = [];
  /** @type {Set<string>} sessions currently in recovery */
  const recovering = new Set();

  let checkpointCount = 0;
  let restartCount = 0;
  let denyCount = 0;
  let crashCount = 0;

  function nonClaimFlags() {
    return {
      continuityNotHaMultiRegionSaas: true,
      continuityNotMultiAzFailover: true,
      continuityNotCloudAgentFleetRecovery: true,
      notAuAvAw: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      lawViEnvOnly: true,
      atProductionReadyNo: true
    };
  }

  /**
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body = {}) {
    let receipt = buildContinuityReceipt(sanitizeAtPayload(body), {
      hash: hashFn,
      now: nowFn
    });
    receipt = sanitizeAtPayload({
      ...receipt,
      channelKind: AT_KIND,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      partialApply: false,
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false,
      nonClaim: nonClaimFlags()
    });
    if (receiptSealer) {
      receipt = sanitizeAtPayload(receiptSealer(receipt));
    }
    receipt = sanitizeAtPayload(receipt);
    receipts.push(receipt);
    return receipt;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function denyResult(code, extra = {}) {
    denyCount += 1;
    // Fail-closed: clear any recovery-in-progress markers for this session
    if (extra.sessionId != null) {
      recovering.delete(String(extra.sessionId));
    }
    const receipt = sealReceipt({
      ok: false,
      allow: false,
      code,
      phase: 'DENY',
      decision: 'deny',
      forensic: true,
      recoveryInProgress: false,
      partialApply: false,
      ...extra
    });
    const result = sanitizeAtPayload({
      ok: false,
      allow: false,
      code,
      receipt,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      kind: AT_KIND,
      nonClaim: nonClaimFlags(),
      partialApply: false,
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false,
      ...extra
    });
    if (throwOnDeny) {
      throw new OperatorContinuityError(`AT deny: ${code}`, code, extra);
    }
    return result;
  }

  function assertNoFundacion(req) {
    if (
      req.fundacion === true ||
      req.fundacionWrite === true ||
      (typeof req.target === 'string' && /fundacion/i.test(req.target))
    ) {
      return denyResult(AT_CODES.FUNDACION_DENIED, {
        reason: 'Fundacion ALWAYS DENY — no Fundacion write via continuity',
        fundacion: 'ALWAYS_DENY',
        fundacionDelta: 0,
        sessionId: req.sessionId != null ? String(req.sessionId) : null
      });
    }
    return null;
  }

  function assertNoSecretLeak(req) {
    if (
      rejectSecretsInRequest &&
      containsSecretFields(req) &&
      (req.persistSecrets === true ||
        req.includeSecretsInReceipt === true ||
        req.sealSecrets === true)
    ) {
      return denyResult(AT_CODES.SECRET_LEAK_FORBIDDEN, {
        reason:
          'continuity secrets must not enter sealed receipts / state (Law VI)',
        sessionId: req.sessionId != null ? String(req.sessionId) : null
      });
    }
    return null;
  }

  /**
   * WHEN governed session is live — checkpoint sealed custody to injectable store.
   * @param {object} [req]
   */
  function checkpoint(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'checkpoint requires an object'
      });
    }

    const fundDeny = assertNoFundacion(req);
    if (fundDeny) return fundDeny;
    const leakDeny = assertNoSecretLeak(req);
    if (leakDeny) return leakDeny;

    if (!store || typeof store.save !== 'function') {
      return denyResult(AT_CODES.MISSING_DEP, {
        reason: 'custody store injector absent',
        missing: ['store'],
        dep: 'store'
      });
    }

    if (req.sessionId == null || String(req.sessionId).trim() === '') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'checkpoint requires sessionId'
      });
    }

    // WHILE recovery in progress — fail-closed, no partial apply
    if (recovering.has(String(req.sessionId))) {
      return denyResult(AT_CODES.PARTIAL_APPLY_FORBIDDEN, {
        reason:
          'continuity recovery in progress — no checkpoint / partial apply',
        sessionId: String(req.sessionId),
        recoveryInProgress: true
      });
    }

    const sessionId = String(req.sessionId).trim();
    const tipPin =
      req.tipPin != null
        ? String(req.tipPin)
        : expectedTip != null
          ? expectedTip
          : null;

    _cpSeq += 1;
    const at = String(nowFn());
    const checkpointId =
      req.checkpointId != null
        ? String(req.checkpointId)
        : `AT-CP-${hashFn({ sessionId, at, seq: _cpSeq }).slice(0, 12)}`;

    const allowlistedState = projectAllowlistedState({
      sessionId,
      status: req.status || 'CHECKPOINTED',
      generation:
        req.generation != null
          ? Number(req.generation)
          : (liveSessions.get(sessionId)?.generation || 0) + 1,
      tipPin,
      allowlistedState: req.allowlistedState || req.state || {},
      meta: req.meta,
      envelopeDigest: req.envelopeDigest
    });

    const head = req.head != null ? String(req.head) : checkpointId;

    let snapshot = sealCustodySnapshot(
      {
        checkpointId,
        sessionId,
        tipPin,
        head,
        allowlistedState,
        status: allowlistedState.status,
        generation: allowlistedState.generation
      },
      hashFn,
      nowFn
    );

    // Optional AN envelope wrap
    let envelope = null;
    if (anEnvelope && typeof anEnvelope.wrapSnapshot === 'function') {
      envelope = sanitizeAtPayload(
        anEnvelope.wrapSnapshot(snapshot, { sessionId })
      );
      if (envelope && envelope.digest) {
        snapshot = Object.freeze({
          ...snapshot,
          envelopeDigest: envelope.digest
        });
      }
    }

    if (typeof store.putSnapshot === 'function') {
      store.putSnapshot(snapshot);
    } else {
      store.save(checkpointId, snapshot);
      store.save(`session:${sessionId}:latest`, {
        checkpointId,
        sessionId,
        tipPin,
        custodyDigest: snapshot.custodyDigest,
        head
      });
    }

    liveSessions.set(sessionId, {
      sessionId,
      status: 'CHECKPOINTED',
      generation: allowlistedState.generation,
      tipPin,
      checkpointId,
      custodyDigest: snapshot.custodyDigest,
      head,
      live: true,
      crashed: false
    });

    checkpointCount += 1;

    const receipt = sealReceipt({
      ok: true,
      allow: true,
      code: AT_CODES.OK,
      phase: 'CHECKPOINT',
      sessionId,
      checkpointId,
      tipPin,
      custodyDigest: snapshot.custodyDigest,
      status: 'CHECKPOINTED',
      forensic: false
    });

    return sanitizeAtPayload({
      ok: true,
      allow: true,
      code: AT_CODES.OK,
      status: 'CHECKPOINTED',
      sessionId,
      checkpointId,
      tipPin,
      custodyDigest: snapshot.custodyDigest,
      snapshot,
      envelope,
      receipt,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      kind: AT_KIND,
      nonClaim: nonClaimFlags(),
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false
    });
  }

  /**
   * Simulate process crash: clear live state; sealed custody remains on store.
   * @param {object} [req]
   */
  function simulateCrash(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'simulateCrash requires an object'
      });
    }

    const fundDeny = assertNoFundacion(req);
    if (fundDeny) return fundDeny;

    if (req.sessionId == null || String(req.sessionId).trim() === '') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'simulateCrash requires sessionId'
      });
    }

    const sessionId = String(req.sessionId).trim();
    const prior = liveSessions.get(sessionId);
    if (!prior) {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'no live session to crash',
        sessionId
      });
    }

    // Wipe live process state — custody remains on injectable store ("disk")
    liveSessions.delete(sessionId);
    recovering.delete(sessionId);
    crashCount += 1;

    const receipt = sealReceipt({
      ok: true,
      allow: true,
      code: AT_CODES.OK,
      phase: 'CRASH',
      sessionId,
      checkpointId: prior.checkpointId || null,
      tipPin: prior.tipPin || null,
      custodyDigest: prior.custodyDigest || null,
      status: 'CRASHED',
      forensic: false
    });

    return sanitizeAtPayload({
      ok: true,
      code: AT_CODES.OK,
      status: 'CRASHED',
      sessionId,
      liveCleared: true,
      custodyOnDisk: true,
      priorCheckpointId: prior.checkpointId || null,
      receipt,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      kind: AT_KIND,
      nonClaim: nonClaimFlags(),
      // Explicit NON-CLAIM: crash sim ≠ HA multi-region / multi-AZ / CloudAgent
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false
    });
  }

  /**
   * WHEN governed session process crashed with sealed custody on disk:
   * offer continuity restart restoring allowlisted session state.
   * IF tamper / tip mismatch / conflicting heads → DENY + sealed receipt.
   * WHILE recovery in progress → fail-closed (no partial apply).
   * @param {object} [req]
   */
  function restart(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'restart requires an object'
      });
    }

    const fundDeny = assertNoFundacion(req);
    if (fundDeny) return fundDeny;
    const leakDeny = assertNoSecretLeak(req);
    if (leakDeny) return leakDeny;

    if (!store || typeof store.load !== 'function') {
      return denyResult(AT_CODES.MISSING_DEP, {
        reason: 'custody store injector absent',
        missing: ['store'],
        dep: 'store'
      });
    }

    if (req.sessionId == null || String(req.sessionId).trim() === '') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'restart requires sessionId'
      });
    }

    const sessionId = String(req.sessionId).trim();

    // Fail-closed: refuse partial apply while another recovery is open
    if (recovering.has(sessionId) && req.forcePartialApply === true) {
      return denyResult(AT_CODES.PARTIAL_APPLY_FORBIDDEN, {
        reason:
          'WHILE continuity recovery in progress — no partial apply; fail-closed',
        sessionId,
        recoveryInProgress: true
      });
    }

    // Mark recovery in progress (fail-closed window)
    recovering.add(sessionId);

    try {
      // Resolve checkpoint
      let snapshot = null;
      if (req.checkpointId != null) {
        snapshot = store.load(String(req.checkpointId));
      } else if (typeof store.loadLatest === 'function') {
        snapshot = store.loadLatest(sessionId);
      } else {
        const meta = store.load(`session:${sessionId}:latest`);
        if (meta && meta.checkpointId) {
          snapshot = store.load(String(meta.checkpointId));
        }
      }

      if (!snapshot) {
        return denyResult(AT_CODES.INVALID_REQUEST, {
          reason: 'no sealed custody on disk for session',
          sessionId
        });
      }

      // Conflicting custody heads
      if (typeof store.listHeads === 'function') {
        const heads = store.listHeads(sessionId);
        if (
          heads.length > 1 &&
          req.allowMultipleHeads !== true &&
          req.checkpointId == null
        ) {
          return denyResult(AT_CODES.CUSTODY_CONFLICT, {
            reason: 'conflicting custody heads for session',
            sessionId,
            heads,
            checkpointId: snapshot.checkpointId || null
          });
        }
        // Explicit conflict force
        if (req.forceConflict === true || (heads.length > 1 && req.requireSingleHead === true && req.checkpointId == null)) {
          return denyResult(AT_CODES.CUSTODY_CONFLICT, {
            reason: 'conflicting custody heads for session',
            sessionId,
            heads,
            checkpointId: snapshot.checkpointId || null
          });
        }
      }
      if (req.forceConflict === true) {
        return denyResult(AT_CODES.CUSTODY_CONFLICT, {
          reason: 'conflicting custody heads forced',
          sessionId,
          checkpointId: snapshot.checkpointId || null
        });
      }

      // Tamper detection
      const verified = verifyCustodySnapshot(snapshot, hashFn);
      if (!verified.ok) {
        return denyResult(AT_CODES.TAMPER_DETECTED, {
          reason: 'custody snapshot tamper detected — DENY restart',
          sessionId,
          checkpointId: snapshot.checkpointId || null,
          verifyCode: verified.code || 'TAMPER_DETECTED',
          expectedDigest: verified.expectedDigest || null,
          actualDigest: verified.actualDigest || null
        });
      }

      // Optional AN envelope verify
      if (
        anEnvelope &&
        typeof anEnvelope.verify === 'function' &&
        req.envelope != null
      ) {
        const envCheck = anEnvelope.verify(req.envelope);
        if (!envCheck.ok) {
          return denyResult(AT_CODES.TAMPER_DETECTED, {
            reason: 'AN envelope continuity tamper — DENY restart',
            sessionId,
            checkpointId: snapshot.checkpointId || null,
            verifyCode: envCheck.code || 'TAMPER_DETECTED'
          });
        }
      }

      // Tip mismatch
      const tipToCheck =
        req.expectedTip != null
          ? String(req.expectedTip)
          : expectedTip != null
            ? expectedTip
            : null;
      if (
        tipToCheck != null &&
        snapshot.tipPin != null &&
        String(snapshot.tipPin) !== tipToCheck
      ) {
        return denyResult(AT_CODES.TIP_MISMATCH, {
          reason: 'continuity tip pin mismatch — DENY restart',
          sessionId,
          checkpointId: snapshot.checkpointId || null,
          expectedTip: tipToCheck,
          actualTip: snapshot.tipPin
        });
      }
      if (req.forceTipMismatch === true) {
        return denyResult(AT_CODES.TIP_MISMATCH, {
          reason: 'continuity tip pin mismatch forced',
          sessionId,
          checkpointId: snapshot.checkpointId || null
        });
      }

      // Explicit partial-apply attempt during recovery → DENY
      if (failClosedPartialApply && req.partialApply === true) {
        return denyResult(AT_CODES.PARTIAL_APPLY_FORBIDDEN, {
          reason:
            'WHILE continuity recovery in progress — no partial apply; fail-closed',
          sessionId,
          recoveryInProgress: true
        });
      }

      // Restore allowlisted state into live process (no Fundacion mutation)
      const restored = projectAllowlistedState(snapshot.allowlistedState || snapshot);
      const generation =
        restored.generation != null ? Number(restored.generation) : 1;

      liveSessions.set(sessionId, {
        sessionId,
        status: 'RESTARTED',
        generation,
        tipPin: snapshot.tipPin ?? tipToCheck,
        checkpointId: snapshot.checkpointId,
        custodyDigest: snapshot.custodyDigest,
        head: snapshot.head || snapshot.checkpointId,
        live: true,
        crashed: false,
        restoredFrom: snapshot.checkpointId
      });

      restartCount += 1;
      recovering.delete(sessionId);

      const receipt = sealReceipt({
        ok: true,
        allow: true,
        code: AT_CODES.RESTART_OK,
        phase: 'RESTART',
        sessionId,
        checkpointId: snapshot.checkpointId,
        tipPin: snapshot.tipPin ?? null,
        custodyDigest: snapshot.custodyDigest,
        status: 'RESTARTED',
        forensic: false,
        recoveryInProgress: false
      });

      return sanitizeAtPayload({
        ok: true,
        allow: true,
        code: AT_CODES.RESTART_OK,
        status: 'RESTARTED',
        sessionId,
        checkpointId: snapshot.checkpointId,
        tipPin: snapshot.tipPin ?? null,
        custodyDigest: snapshot.custodyDigest,
        restored,
        receipt,
        PRODUCTION_READY: AT_PRODUCTION_READY,
        kind: AT_KIND,
        nonClaim: nonClaimFlags(),
        fundacionDelta: 0,
        partialApply: false,
        haMultiRegionClaim: false,
        multiAzFailoverClaim: false,
        cloudAgentFleetClaim: false
      });
    } catch (err) {
      recovering.delete(sessionId);
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: sanitizeErrorMessage(err?.message || 'restart failed'),
        sessionId
      });
    }
  }

  /**
   * Attempt a partial apply during recovery (always DENY when fail-closed).
   * @param {object} [req]
   */
  function applyPartial(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyResult(AT_CODES.INVALID_REQUEST, {
        reason: 'applyPartial requires an object'
      });
    }
    const sessionId =
      req.sessionId != null ? String(req.sessionId) : null;
    if (sessionId) recovering.add(sessionId);
    return denyResult(AT_CODES.PARTIAL_APPLY_FORBIDDEN, {
      reason:
        'WHILE continuity recovery in progress — no partial apply; fail-closed',
      sessionId,
      recoveryInProgress: true
    });
  }

  function getState() {
    return sanitizeAtPayload({
      kind: AT_KIND,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      checkpointCount,
      restartCount,
      denyCount,
      crashCount,
      liveSessionCount: liveSessions.size,
      liveSessions: [...liveSessions.values()].map((s) =>
        sanitizeAtPayload(s)
      ),
      recovering: [...recovering],
      recoveryInProgress: recovering.size > 0,
      receiptCount: receipts.length,
      storePresent: !!store,
      anEnvelopePresent: !!anEnvelope,
      expectedTip,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false,
      partialApply: false,
      receiptHelperKind: AT_RECEIPT_KIND,
      receiptHelperProductionReady: AT_RECEIPT_PRODUCTION_READY,
      snapshotKind: AT_SNAPSHOT_KIND,
      snapshotProductionReady: AT_SNAPSHOT_PRODUCTION_READY,
      storeKind: AT_STORE_KIND,
      allowlistedKeys: [...ALLOWLISTED_SESSION_KEYS],
      nonClaim: nonClaimFlags()
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeAtPayload(r));
  }

  function health() {
    return sanitizeAtPayload({
      ok: true,
      kind: AT_KIND,
      PRODUCTION_READY: AT_PRODUCTION_READY,
      checkpointCount,
      restartCount,
      crashCount,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      haMultiRegionClaim: false,
      multiAzFailoverClaim: false,
      cloudAgentFleetClaim: false,
      partialApply: false,
      nonClaim: nonClaimFlags()
    });
  }

  return {
    kind: AT_KIND,
    PRODUCTION_READY: AT_PRODUCTION_READY,
    checkpoint,
    simulateCrash,
    restart,
    applyPartial,
    sealReceipt,
    getState,
    getReceipts,
    health,
    sanitizeAtPayload,
    /** @internal */
    _codes: AT_CODES,
    /** @internal */
    _liveSessions: liveSessions,
    /** @internal */
    _recovering: recovering
  };
}

export {
  AT_RECEIPT_KIND,
  AT_RECEIPT_PRODUCTION_READY,
  AT_SNAPSHOT_KIND,
  AT_SNAPSHOT_PRODUCTION_READY,
  AT_STORE_KIND,
  ALLOWLISTED_SESSION_KEYS,
  stableStringify,
  defaultHash,
  buildContinuityReceipt,
  projectAllowlistedState,
  sealCustodySnapshot,
  verifyCustodySnapshot,
  createContinuityCustodyStore,
  createAnEnvelopeContinuityAdapter
};

export default createOperatorContinuityCrashRecoveryPort;
