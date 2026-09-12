/**
 * @module multi-session-autonomy-coordinator
 * SPEC-0040 / Mission AI — Multi-Session Autonomy Coordinator.
 *
 * Persistent multi-session orchestration over AF cycle horizons:
 * create / suspend / resume with durable custody snapshots, generation
 * counters, and fail-closed drift detection. Optional injectable AF
 * loop for runCycle. HITL default deny when requireHitl.
 *
 * Law VI: sanitize/redact secrets from getState / receipts (runtime
 * vendor-key prefix synth — never static vendor-key literals in source).
 *
 * NON-CLAIM:
 *   multi-session ≠ PRODUCTION_READY
 *   multi-session ≠ unbounded autonomy product / agent fleet
 *   not AJ/AK/AL/AM
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';
import {
  createSessionCustodyStore,
  defaultHash as storeDefaultHash
} from './session-custody-store.js';

/** @type {'NO'} */
export const AI_PRODUCTION_READY = 'NO';

export const AI_KIND = 'eos-multi-session-autonomy-coordinator';

export const AI_SESSION_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
});

export const AI_CODES = Object.freeze({
  OK: 'OK',
  CREATED: 'CREATED',
  SUSPENDED: 'SUSPENDED',
  RESUMED: 'RESUMED',
  DENY: 'DENY',
  UNKNOWN_SESSION: 'UNKNOWN_SESSION',
  SESSION_DRIFT: 'SESSION_DRIFT',
  INVALID_STATE: 'INVALID_STATE',
  HITL_REQUIRED: 'HITL_REQUIRED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_INPUT: 'INVALID_INPUT',
  FUNDACION_DENY: 'FUNDACION_DENY',
  CYCLE_COMPLETED: 'CYCLE_COMPLETED',
  CYCLE_DENIED: 'CYCLE_DENIED'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for multi-session autonomy coordinator failures.
 */
export class MultiSessionAutonomyError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AI_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'MultiSessionAutonomyError';
    this.code = code;
    this.details = sanitizeAiPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAiPayload(obj) {
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
    // Preserve SHA-256 hex digests (64 hex) used by custody chain
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value)) return REDACTED;
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|generation|custodyGeneration)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    // Custody digests / snapshot hashes are integrity material, not secrets
    if (
      /^(custodyDigest|snapshotHash|digest|sha256|bodySha256|restoredCustodyDigest|restoredSnapshotHash|expectedHash|recomputedHash|expectedDigest|actualDigest|prevDigest)$/i.test(
        k
      )
    ) {
      out[k] = typeof v === 'string' ? redactSecretSubstrings(v) : sanitizeDeep(v, seen);
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
 * runtime (Law VI / AF11 — never embed static vendor-key literals).
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
 * Default HITL: ALWAYS DENY (fail-closed).
 * @returns {boolean}
 */
function defaultHitlDeny() {
  return false;
}

/**
 * Stable JSON stringify (sorted keys) for snapshot hashing.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : stableStringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Create default in-memory store port { load, save, list }.
 * @returns {{ load(id: string): object|null, save(id: string, record: object): void, list(): object[] }}
 */
export function createMemoryStore() {
  const map = new Map();
  return {
    load(id) {
      if (id == null || id === '') return null;
      const rec = map.get(String(id));
      return rec == null ? null : JSON.parse(JSON.stringify(rec));
    },
    save(id, record) {
      map.set(String(id), JSON.parse(JSON.stringify(record)));
    },
    list() {
      return [...map.entries()].map(([id, rec]) => ({
        id,
        ...JSON.parse(JSON.stringify(rec))
      }));
    },
    _map: map
  };
}

/**
 * Create the Multi-Session Autonomy Coordinator.
 *
 * @param {object} [options]
 * @param {{ load(id): object|null, save(id, record): void, list(): object[] }} [options.store]
 * @param {object} [options.loop] — optional AF loop { runCycle(intent) }
 * @param {{ approve(request): boolean|Promise<boolean> }} [options.hitl]
 * @param {boolean} [options.requireHitl=false] — privileged ops need HITL
 * @param {(payload: any) => string} [options.hash]
 * @param {() => string} [options.now]
 * @param {(receipt: object) => void} [options.onReceipt]
 * @param {boolean} [options.throwOnDeny=false]
 * @param {boolean} [options.resumeActiveIdempotent=false] — if true, resume of ACTIVE is OK no-op
 */
export function createMultiSessionAutonomyCoordinator(options = {}) {
  const store =
    options.store &&
    typeof options.store.load === 'function' &&
    typeof options.store.save === 'function'
      ? options.store
      : createMemoryStore();

  const custodyStore =
    options.custodyStore && typeof options.custodyStore.appendSnapshot === 'function'
      ? options.custodyStore
      : createSessionCustodyStore({
          hash: options.hash || storeDefaultHash,
          now: options.now
        });

  const loop =
    options.loop && typeof options.loop === 'object' ? options.loop : null;

  const hitl =
    options.hitl && typeof options.hitl.approve === 'function'
      ? options.hitl
      : { approve: defaultHitlDeny };

  const requireHitl = options.requireHitl === true;
  const throwOnDeny = options.throwOnDeny === true;
  const resumeActiveIdempotent = options.resumeActiveIdempotent === true;

  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const onReceipt =
    typeof options.onReceipt === 'function' ? options.onReceipt : null;

  /** @type {object[]} */
  const receipts = [];

  /** @type {{ sessionsCreated: number, suspends: number, resumes: number, cycles: number, denials: number, lastCode: string|null }} */
  const metrics = {
    sessionsCreated: 0,
    suspends: 0,
    resumes: 0,
    cycles: 0,
    denials: 0,
    lastCode: null
  };

  let seq = 0;

  /**
   * @param {object} partial
   */
  function emitReceipt(partial) {
    seq += 1;
    const receipt = sanitizeAiPayload({
      id: `AI-RCPT-${String(seq).padStart(4, '0')}`,
      at: now(),
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 100) receipts.shift();
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        /* observer faults must not crash coordinator */
      }
    }
    return receipt;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function deny(code, extra = {}) {
    metrics.denials += 1;
    metrics.lastCode = code;
    const receipt = emitReceipt({
      ok: false,
      allow: false,
      code,
      phase: extra.phase || 'DENY',
      sessionId: extra.sessionId ?? null,
      ...extra
    });
    const result = sanitizeAiPayload({
      ok: false,
      allow: false,
      code,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      receipt,
      ...extra
    });
    if (throwOnDeny) {
      throw new MultiSessionAutonomyError(
        extra.message || `DENY: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  /**
   * Build a frozen serializable custody snapshot from a session record.
   * @param {object} record
   */
  function buildSnapshot(record) {
    const snap = {
      sessionId: record.sessionId,
      state: record.state,
      generation: record.generation,
      custodyDigest: record.custodyDigest,
      custodyChain: [...(record.custodyChain || [])],
      meta: record.meta ? JSON.parse(JSON.stringify(record.meta)) : {},
      cycleCount: record.cycleCount || 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      suspendedAt: record.suspendedAt || null,
      lastIntent: record.lastIntent
        ? JSON.parse(JSON.stringify(record.lastIntent))
        : null,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      kind: AI_KIND
    };
    return Object.freeze(JSON.parse(JSON.stringify(snap)));
  }

  /**
   * Compute custody hash over the canonical snapshot fields
   * (excludes updatedAt volatility where needed — uses generation + chain).
   * @param {object} record
   */
  function computeCustodyHash(record) {
    const canonical = {
      sessionId: record.sessionId,
      state: record.state,
      generation: record.generation,
      custodyChain: record.custodyChain || [],
      meta: record.meta || {},
      cycleCount: record.cycleCount || 0,
      createdAt: record.createdAt,
      lastIntent: record.lastIntent || null
    };
    return hashFn(canonical);
  }

  /**
   * @param {object} [meta]
   */
  async function createSession(meta = {}) {
    if (meta != null && typeof meta !== 'object') {
      return deny(AI_CODES.INVALID_INPUT, {
        phase: 'CREATE',
        message: 'createSession meta must be an object'
      });
    }

    // Fundacion hard deny in meta
    if (meta && isFundacionIntent(meta)) {
      return deny(AI_CODES.FUNDACION_DENY, {
        phase: 'CREATE',
        message: 'Fundacion ALWAYS DENY — no Fundacion paths in session meta'
      });
    }

    if (requireHitl) {
      const hitlResult = await checkHitl({
        op: 'createSession',
        meta
      });
      if (!hitlResult.ok) return hitlResult;
    }

    const sessionId =
      (meta && typeof meta.sessionId === 'string' && meta.sessionId) ||
      `AI-SESS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const existing = store.load(sessionId);
    if (existing) {
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'CREATE',
        sessionId,
        message: 'session id already exists'
      });
    }

    const createdAt = now();
    const safeMeta = sanitizeAiPayload({ ...(meta || {}) });
    // drop sessionId from meta copy if present
    if (safeMeta && typeof safeMeta === 'object') {
      delete /** @type {any} */ (safeMeta).sessionId;
    }

    /** @type {object} */
    let record = {
      sessionId,
      state: AI_SESSION_STATES.ACTIVE,
      generation: 1,
      custodyDigest: null,
      custodyChain: [],
      meta: safeMeta,
      cycleCount: 0,
      createdAt,
      updatedAt: createdAt,
      suspendedAt: null,
      lastIntent: null,
      snapshotHash: null,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY
    };

    // Seed custody chain
    const chainAppend = custodyStore.appendSnapshot(
      sessionId,
      buildSnapshot(record)
    );
    record.custodyChain = [
      {
        digest: chainAppend.digest,
        prevDigest: chainAppend.prevDigest,
        at: createdAt,
        generation: 1,
        event: 'CREATE'
      }
    ];
    record.custodyDigest = chainAppend.digest;
    record.snapshotHash = computeCustodyHash(record);

    store.save(sessionId, record);
    metrics.sessionsCreated += 1;
    metrics.lastCode = AI_CODES.CREATED;

    const receipt = emitReceipt({
      ok: true,
      allow: true,
      code: AI_CODES.CREATED,
      phase: 'CREATE',
      sessionId,
      generation: record.generation,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash
    });

    return sanitizeAiPayload({
      ok: true,
      allow: true,
      code: AI_CODES.CREATED,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionId,
      state: record.state,
      generation: record.generation,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash,
      receipt,
      session: publicSessionView(record)
    });
  }

  /**
   * @param {string} id
   */
  async function suspendSession(id) {
    if (id == null || id === '') {
      return deny(AI_CODES.INVALID_INPUT, {
        phase: 'SUSPEND',
        message: 'suspendSession requires id'
      });
    }

    const record = store.load(String(id));
    if (!record) {
      return deny(AI_CODES.UNKNOWN_SESSION, {
        phase: 'SUSPEND',
        sessionId: String(id),
        message: 'unknown session'
      });
    }

    if (record.state === AI_SESSION_STATES.SUSPENDED) {
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'SUSPEND',
        sessionId: record.sessionId,
        message: 'session already SUSPENDED — suspend twice fail-closed',
        state: record.state
      });
    }

    if (record.state !== AI_SESSION_STATES.ACTIVE) {
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'SUSPEND',
        sessionId: record.sessionId,
        message: `cannot suspend from ${record.state}`,
        state: record.state
      });
    }

    if (requireHitl) {
      const hitlResult = await checkHitl({
        op: 'suspendSession',
        sessionId: record.sessionId
      });
      if (!hitlResult.ok) return hitlResult;
    }

    const suspendedAt = now();
    record.state = AI_SESSION_STATES.SUSPENDED;
    record.generation = Number(record.generation || 0) + 1;
    record.suspendedAt = suspendedAt;
    record.updatedAt = suspendedAt;

    const chainAppend = custodyStore.appendSnapshot(
      record.sessionId,
      buildSnapshot(record)
    );
    record.custodyChain = [
      ...(record.custodyChain || []),
      {
        digest: chainAppend.digest,
        prevDigest: chainAppend.prevDigest,
        at: suspendedAt,
        generation: record.generation,
        event: 'SUSPEND'
      }
    ];
    record.custodyDigest = chainAppend.digest;
    record.snapshotHash = computeCustodyHash(record);
    // Freeze sealed snapshot for resume drift checks
    record.sealedSnapshot = buildSnapshot(record);

    store.save(record.sessionId, record);
    metrics.suspends += 1;
    metrics.lastCode = AI_CODES.SUSPENDED;

    const receipt = emitReceipt({
      ok: true,
      allow: true,
      code: AI_CODES.SUSPENDED,
      phase: 'SUSPEND',
      sessionId: record.sessionId,
      generation: record.generation,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash
    });

    return sanitizeAiPayload({
      ok: true,
      allow: true,
      code: AI_CODES.SUSPENDED,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionId: record.sessionId,
      state: record.state,
      generation: record.generation,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash,
      sealedSnapshot: record.sealedSnapshot,
      receipt,
      session: publicSessionView(record)
    });
  }

  /**
   * @param {string} id
   */
  async function resumeSession(id) {
    if (id == null || id === '') {
      return deny(AI_CODES.INVALID_INPUT, {
        phase: 'RESUME',
        message: 'resumeSession requires id'
      });
    }

    const record = store.load(String(id));
    if (!record) {
      return deny(AI_CODES.UNKNOWN_SESSION, {
        phase: 'RESUME',
        sessionId: String(id),
        message: 'unknown session'
      });
    }

    if (record.state === AI_SESSION_STATES.ACTIVE) {
      if (resumeActiveIdempotent) {
        const receipt = emitReceipt({
          ok: true,
          allow: true,
          code: AI_CODES.RESUMED,
          phase: 'RESUME',
          sessionId: record.sessionId,
          generation: record.generation,
          idempotent: true,
          message: 'resume ACTIVE idempotent no-op'
        });
        return sanitizeAiPayload({
          ok: true,
          allow: true,
          code: AI_CODES.RESUMED,
          kind: AI_KIND,
          PRODUCTION_READY: AI_PRODUCTION_READY,
          sessionId: record.sessionId,
          state: record.state,
          generation: record.generation,
          idempotent: true,
          receipt,
          session: publicSessionView(record)
        });
      }
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'RESUME',
        sessionId: record.sessionId,
        message: 'session already ACTIVE — resume active fail-closed',
        state: record.state
      });
    }

    if (record.state !== AI_SESSION_STATES.SUSPENDED) {
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'RESUME',
        sessionId: record.sessionId,
        message: `cannot resume from ${record.state}`,
        state: record.state
      });
    }

    // Drift detection: recompute hash vs sealed snapshotHash / generation
    const expectedHash = record.snapshotHash;
    const recomputed = computeCustodyHash(record);
    if (
      !expectedHash ||
      recomputed !== expectedHash ||
      (record.sealedSnapshot &&
        Number(record.sealedSnapshot.generation) !== Number(record.generation))
    ) {
      return deny(AI_CODES.SESSION_DRIFT, {
        phase: 'RESUME',
        sessionId: record.sessionId,
        message: 'snapshot hash/generation mismatch on resume — DENY fail-closed',
        expectedHash,
        recomputedHash: recomputed,
        generation: record.generation,
        sealedGeneration: record.sealedSnapshot
          ? record.sealedSnapshot.generation
          : null
      });
    }

    // Also verify custody chain tip matches
    if (
      record.sealedSnapshot &&
      record.sealedSnapshot.custodyDigest &&
      record.sealedSnapshot.custodyDigest !== record.custodyDigest
    ) {
      return deny(AI_CODES.SESSION_DRIFT, {
        phase: 'RESUME',
        sessionId: record.sessionId,
        message: 'custody digest drift on resume',
        expectedDigest: record.sealedSnapshot.custodyDigest,
        actualDigest: record.custodyDigest
      });
    }

    if (typeof custodyStore.verifyChain === 'function') {
      const chainCheck = custodyStore.verifyChain(record.sessionId);
      if (chainCheck && chainCheck.ok === false) {
        return deny(AI_CODES.SESSION_DRIFT, {
          phase: 'RESUME',
          sessionId: record.sessionId,
          message: 'custody chain verification failed',
          chainCheck
        });
      }
    }

    if (requireHitl) {
      const hitlResult = await checkHitl({
        op: 'resumeSession',
        sessionId: record.sessionId
      });
      if (!hitlResult.ok) return hitlResult;
    }

    const resumedAt = now();
    const priorGeneration = record.generation;
    const priorDigest = record.custodyDigest;
    const priorHash = record.snapshotHash;

    record.state = AI_SESSION_STATES.ACTIVE;
    record.generation = Number(record.generation || 0) + 1;
    record.updatedAt = resumedAt;
    record.suspendedAt = null;

    const chainAppend = custodyStore.appendSnapshot(
      record.sessionId,
      buildSnapshot(record)
    );
    record.custodyChain = [
      ...(record.custodyChain || []),
      {
        digest: chainAppend.digest,
        prevDigest: chainAppend.prevDigest,
        at: resumedAt,
        generation: record.generation,
        event: 'RESUME',
        restoredFromGeneration: priorGeneration,
        restoredFromDigest: priorDigest,
        restoredFromHash: priorHash
      }
    ];
    record.custodyDigest = chainAppend.digest;
    record.snapshotHash = computeCustodyHash(record);
    record.sealedSnapshot = null;

    store.save(record.sessionId, record);
    metrics.resumes += 1;
    metrics.lastCode = AI_CODES.RESUMED;

    const receipt = emitReceipt({
      ok: true,
      allow: true,
      code: AI_CODES.RESUMED,
      phase: 'RESUME',
      sessionId: record.sessionId,
      generation: record.generation,
      priorGeneration,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash,
      restoredCustodyDigest: priorDigest,
      restoredSnapshotHash: priorHash
    });

    return sanitizeAiPayload({
      ok: true,
      allow: true,
      code: AI_CODES.RESUMED,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionId: record.sessionId,
      state: record.state,
      generation: record.generation,
      priorGeneration,
      custodyDigest: record.custodyDigest,
      snapshotHash: record.snapshotHash,
      // Prove no silent drift: prior custody restored into chain
      restoredCustodyDigest: priorDigest,
      restoredSnapshotHash: priorHash,
      receipt,
      session: publicSessionView(record)
    });
  }

  /**
   * @param {string} id
   */
  function getSession(id) {
    if (id == null || id === '') {
      return sanitizeAiPayload({
        ok: false,
        code: AI_CODES.INVALID_INPUT,
        session: null
      });
    }
    const record = store.load(String(id));
    if (!record) {
      return sanitizeAiPayload({
        ok: false,
        code: AI_CODES.UNKNOWN_SESSION,
        sessionId: String(id),
        session: null
      });
    }
    return sanitizeAiPayload({
      ok: true,
      code: AI_CODES.OK,
      sessionId: record.sessionId,
      session: publicSessionView(record)
    });
  }

  function listSessions() {
    const rows = typeof store.list === 'function' ? store.list() : [];
    return sanitizeAiPayload({
      ok: true,
      code: AI_CODES.OK,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      count: rows.length,
      sessions: rows.map((r) => publicSessionView(r))
    });
  }

  /**
   * Optional AF loop injection — run one cycle bound to a session.
   * @param {string} sessionId
   * @param {object} intent
   */
  async function runCycle(sessionId, intent = {}) {
    if (sessionId == null || sessionId === '') {
      return deny(AI_CODES.INVALID_INPUT, {
        phase: 'RUN_CYCLE',
        message: 'runCycle requires sessionId'
      });
    }

    const record = store.load(String(sessionId));
    if (!record) {
      return deny(AI_CODES.UNKNOWN_SESSION, {
        phase: 'RUN_CYCLE',
        sessionId: String(sessionId),
        message: 'unknown session'
      });
    }

    if (record.state !== AI_SESSION_STATES.ACTIVE) {
      return deny(AI_CODES.INVALID_STATE, {
        phase: 'RUN_CYCLE',
        sessionId: record.sessionId,
        message: `runCycle requires ACTIVE (have ${record.state})`,
        state: record.state
      });
    }

    if (intent != null && typeof intent !== 'object') {
      return deny(AI_CODES.INVALID_INPUT, {
        phase: 'RUN_CYCLE',
        sessionId: record.sessionId,
        message: 'intent must be an object'
      });
    }

    if (isFundacionIntent(intent)) {
      return deny(AI_CODES.FUNDACION_DENY, {
        phase: 'RUN_CYCLE',
        sessionId: record.sessionId,
        message: 'Fundacion ALWAYS DENY — no Fundacion writes from AI runCycle'
      });
    }

    if (!loop || typeof loop.runCycle !== 'function') {
      return deny(AI_CODES.MISSING_DEP, {
        phase: 'RUN_CYCLE',
        sessionId: record.sessionId,
        dep: 'loop',
        message: 'AF loop not injected — runCycle unavailable'
      });
    }

    if (
      requireHitl ||
      intent.requiresHitl === true ||
      intent.hitl === true
    ) {
      const hitlResult = await checkHitl({
        op: 'runCycle',
        sessionId: record.sessionId,
        intent
      });
      if (!hitlResult.ok) return hitlResult;
    }

    let cycleResult;
    try {
      cycleResult = await Promise.resolve(
        loop.runCycle({
          ...intent,
          sessionId: record.sessionId,
          generation: record.generation
        })
      );
    } catch (err) {
      return deny(AI_CODES.CYCLE_DENIED, {
        phase: 'RUN_CYCLE',
        sessionId: record.sessionId,
        message: sanitizeErrorMessage(err?.message || 'loop.runCycle threw'),
        cause: err?.code || 'LOOP_ERROR'
      });
    }

    const cycleOk = cycleResult && cycleResult.ok !== false && cycleResult.allow !== false;
    record.cycleCount = Number(record.cycleCount || 0) + 1;
    record.lastIntent = sanitizeAiPayload({
      intent: intent.intent || intent.prompt || null,
      requiresHitl: !!(intent.requiresHitl || intent.hitl)
    });
    record.updatedAt = now();

    // Advance custody lightly after cycle (same generation, new chain tip)
    const chainAppend = custodyStore.appendSnapshot(
      record.sessionId,
      buildSnapshot(record)
    );
    record.custodyChain = [
      ...(record.custodyChain || []),
      {
        digest: chainAppend.digest,
        prevDigest: chainAppend.prevDigest,
        at: record.updatedAt,
        generation: record.generation,
        event: 'RUN_CYCLE',
        cycleOk: !!cycleOk
      }
    ];
    record.custodyDigest = chainAppend.digest;
    record.snapshotHash = computeCustodyHash(record);
    store.save(record.sessionId, record);

    metrics.cycles += 1;
    metrics.lastCode = cycleOk
      ? AI_CODES.CYCLE_COMPLETED
      : AI_CODES.CYCLE_DENIED;

    const receipt = emitReceipt({
      ok: !!cycleOk,
      allow: !!cycleOk,
      code: cycleOk ? AI_CODES.CYCLE_COMPLETED : AI_CODES.CYCLE_DENIED,
      phase: 'RUN_CYCLE',
      sessionId: record.sessionId,
      generation: record.generation,
      cycleCount: record.cycleCount,
      custodyDigest: record.custodyDigest,
      loopCode: cycleResult?.code || null
    });

    return sanitizeAiPayload({
      ok: !!cycleOk,
      allow: !!cycleOk,
      code: cycleOk ? AI_CODES.CYCLE_COMPLETED : AI_CODES.CYCLE_DENIED,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionId: record.sessionId,
      generation: record.generation,
      cycleCount: record.cycleCount,
      cycleResult: summarizeCycle(cycleResult),
      custodyDigest: record.custodyDigest,
      receipt,
      session: publicSessionView(record)
    });
  }

  /**
   * @param {object} request
   */
  async function checkHitl(request) {
    let approved = false;
    try {
      approved = await Promise.resolve(
        hitl.approve({
          ...request,
          kind: AI_KIND,
          reason: 'requireHitl'
        })
      );
    } catch (err) {
      return deny(AI_CODES.HITL_REQUIRED, {
        phase: request.op || 'HITL',
        sessionId: request.sessionId || null,
        message: sanitizeErrorMessage(err?.message || 'HITL approve failed'),
        hitlRequired: true,
        approved: false
      });
    }
    if (approved !== true) {
      return deny(AI_CODES.HITL_REQUIRED, {
        phase: request.op || 'HITL',
        sessionId: request.sessionId || null,
        message: 'HITL gate DENY (default fail-closed)',
        hitlRequired: true,
        approved: false
      });
    }
    return { ok: true, allow: true, approved: true };
  }

  async function health() {
    const listed =
      typeof store.list === 'function' ? store.list() : [];
    return sanitizeAiPayload({
      ok: true,
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionCount: listed.length,
      metrics: { ...metrics },
      deps: {
        store: true,
        loop: !!(loop && typeof loop.runCycle === 'function'),
        hitl: typeof hitl.approve === 'function',
        custodyStore: true
      },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: {
        multiSessionNotProductionReady: true,
        notUnboundedAutonomyProduct: true,
        notAjAkAlAm: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getState() {
    const listed =
      typeof store.list === 'function' ? store.list() : [];
    return sanitizeAiPayload({
      kind: AI_KIND,
      PRODUCTION_READY: AI_PRODUCTION_READY,
      sessionCount: listed.length,
      sessions: listed.map((r) => publicSessionView(r)),
      metrics: { ...metrics },
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      requireHitl,
      resumeActiveIdempotent,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      depsPresent: {
        store: true,
        loop: !!loop,
        hitl: true,
        custodyStore: true
      },
      nonClaim: {
        multiSessionNotProductionReady: true,
        notUnboundedAutonomyProduct: true,
        notAjAkAlAm: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeAiPayload({ ...r }));
  }

  /**
   * Test / forensic helper: mutate stored record to simulate drift.
   * Not part of public product API — used by hermetic tests only.
   * @param {string} id
   * @param {(record: object) => void} mutator
   */
  function _tamperForTest(id, mutator) {
    const record = store.load(String(id));
    if (!record) return false;
    mutator(record);
    store.save(String(id), record);
    return true;
  }

  return {
    kind: AI_KIND,
    PRODUCTION_READY: AI_PRODUCTION_READY,
    createSession,
    suspendSession,
    resumeSession,
    getSession,
    listSessions,
    runCycle,
    health,
    getState,
    getReceipts,
    sanitizeAiPayload,
    /** @internal hermetic test hook */
    _tamperForTest
  };
}

/**
 * @param {object} record
 */
function publicSessionView(record) {
  if (!record) return null;
  return {
    sessionId: record.sessionId || record.id,
    state: record.state,
    generation: record.generation,
    custodyDigest: record.custodyDigest,
    snapshotHash: record.snapshotHash,
    cycleCount: record.cycleCount || 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    suspendedAt: record.suspendedAt || null,
    meta: record.meta || {},
    custodyChainLength: Array.isArray(record.custodyChain)
      ? record.custodyChain.length
      : 0,
    kind: AI_KIND,
    PRODUCTION_READY: AI_PRODUCTION_READY
  };
}

/**
 * @param {object|null} cycleResult
 */
function summarizeCycle(cycleResult) {
  if (cycleResult == null || typeof cycleResult !== 'object') {
    return null;
  }
  return {
    ok: cycleResult.ok,
    allow: cycleResult.allow,
    code: cycleResult.code || null,
    kind: cycleResult.kind || null
  };
}

/**
 * @param {object} obj
 * @returns {boolean}
 */
function isFundacionIntent(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.fundacionWrite === true) return true;
  if (obj.target === 'fundacion') return true;
  if (obj.path === 'Documents/Fundacion') return true;
  if (typeof obj.path === 'string' && /fundacion/i.test(obj.path)) return true;
  return false;
}

export default createMultiSessionAutonomyCoordinator;
