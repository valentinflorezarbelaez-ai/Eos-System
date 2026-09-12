/**
 * @module multi-workstation-session-federation-port
 * SPEC-0045 / Mission AN — Multi-Workstation / Session Federation Port.
 *
 * Injectable federation port over AI+W-style session custody: export /
 * import sealed portable custody envelopes across local peer workstations,
 * fail-closed sync (no partial apply; no silent merge), conflict DENY +
 * sealed receipt. Hermetic fakes only (no real LAN in CI).
 *
 * Law VI: sanitize/redact secrets from receipts / getState (runtime
 * vendor-key prefix synth — never static vendor-key literals in source).
 *
 * NON-CLAIM:
 *   operator federation ≠ cloud agent fleet
 *   multi-workstation sync ≠ multi-tenant SaaS
 *   federation port ≠ CloudAgent / ≠ Cursor cloud path
 *   federation ≠ PRODUCTION_READY
 *   not AO/AP/AQ/AR
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  AN_ENVELOPE_KIND,
  AN_ENVELOPE_PRODUCTION_READY,
  defaultHash as envelopeDefaultHash,
  sealEnvelope,
  verifyEnvelopeDigest,
  stableStringify,
  structuredCloneSafe
} from './federation-custody-envelope.js';

/** @type {'NO'} */
export const AN_PRODUCTION_READY = 'NO';

export const AN_KIND = 'eos-multi-workstation-session-federation-port';

export const AN_CODES = Object.freeze({
  OK: 'OK',
  EXPORTED: 'EXPORTED',
  IMPORTED: 'IMPORTED',
  SYNCED: 'SYNCED',
  DENY: 'DENY',
  TAMPER_DETECTED: 'TAMPER_DETECTED',
  TIP_MISMATCH: 'TIP_MISMATCH',
  CUSTODY_CONFLICT: 'CUSTODY_CONFLICT',
  PARTIAL_APPLY_FORBIDDEN: 'PARTIAL_APPLY_FORBIDDEN',
  UNKNOWN_SESSION: 'UNKNOWN_SESSION',
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
  MISSING_DEP: 'MISSING_DEP',
  FUNDACION_DENY: 'FUNDACION_DENY',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  INVALID_INPUT: 'INVALID_INPUT'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for federation port failures.
 */
export class MultiWorkstationFederationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AN_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'MultiWorkstationFederationError';
    this.code = code;
    this.details = sanitizeAnPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAnPayload(obj) {
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
    // Preserve eos-* kinds / kebab identifiers (not secrets)
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
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
      /^(tokens|tokensIn|tokensOut|generation|custodyGeneration|envelopeCount|applied|denied)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(custodyDigest|digest|sha256|bodySha256|expectedDigest|actualDigest|prevDigest|tipPin|envelopeId)$/i.test(
        k
      )
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
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  return envelopeDefaultHash(payload);
}

export { stableStringify, sealEnvelope, verifyEnvelopeDigest };

/**
 * Create default in-memory session store { load, save, list }.
 * @returns {{ load(id: string): object|null, save(id: string, record: object): void, list(): object[] }}
 */
export function createMemorySessionStore() {
  const map = new Map();
  return {
    load(id) {
      if (id == null || id === '') return null;
      const rec = map.get(String(id));
      return rec == null ? null : structuredCloneSafe(rec);
    },
    save(id, record) {
      map.set(String(id), structuredCloneSafe(record));
    },
    list() {
      return [...map.entries()].map(([id, rec]) => ({
        id,
        ...structuredCloneSafe(rec)
      }));
    },
    _map: map
  };
}

/**
 * Create in-memory peer transport for hermetic CI (no real LAN).
 * Maps peerId → array of envelopes / messages.
 * @returns {{ send(peerId, msg): void, receive(peerId): object[], clear(peerId?): void }}
 */
export function createMemoryPeerTransport() {
  /** @type {Map<string, object[]>} */
  const queues = new Map();
  return {
    send(peerId, msg) {
      const key = String(peerId);
      const q = queues.get(key) || [];
      q.push(structuredCloneSafe(msg));
      queues.set(key, q);
    },
    receive(peerId) {
      const key = String(peerId);
      const q = queues.get(key) || [];
      queues.set(key, []);
      return q.map((m) => structuredCloneSafe(m));
    },
    clear(peerId) {
      if (peerId == null) queues.clear();
      else queues.delete(String(peerId));
    },
    _queues: queues
  };
}

/**
 * Create the Multi-Workstation Session Federation Port.
 *
 * @param {object} [options]
 * @param {string} [options.workstationId]
 * @param {{ load(id): object|null, save(id, record): void, list?: () => object[] }} [options.sessionStore]
 * @param {(payload: any) => string} [options.hash]
 * @param {() => string} [options.now]
 * @param {(receipt: object) => void} [options.ledgerAppend]
 * @param {{ send(peerId, msg): void, receive?(peerId): object[] }} [options.peerTransport]
 * @param {boolean} [options.throwOnDeny=false]
 * @param {boolean} [options.requireSessionStore=false] — if true, MISSING_DEP when store absent
 */
export function createMultiWorkstationSessionFederationPort(options = {}) {
  const requireSessionStore = options.requireSessionStore === true;
  const hasStore =
    options.sessionStore &&
    typeof options.sessionStore.load === 'function' &&
    typeof options.sessionStore.save === 'function';

  if (requireSessionStore && !hasStore) {
    // Factory still returns a port that DENYs all ops with MISSING_DEP
  }

  const sessionStore = hasStore
    ? options.sessionStore
    : requireSessionStore
      ? null
      : createMemorySessionStore();

  const workstationId =
    typeof options.workstationId === 'string' && options.workstationId
      ? options.workstationId
      : `WS-${Date.now().toString(36)}`;

  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const ledgerAppend =
    typeof options.ledgerAppend === 'function' ? options.ledgerAppend : null;
  const peerTransport =
    options.peerTransport && typeof options.peerTransport.send === 'function'
      ? options.peerTransport
      : createMemoryPeerTransport();
  const throwOnDeny = options.throwOnDeny === true;

  /** Local custody heads: sessionId → custodyDigest */
  /** @type {Map<string, string>} */
  const custodyHeads = new Map();

  /** @type {object[]} */
  const receipts = [];

  /** @type {{ exports: number, imports: number, syncs: number, denials: number, lastCode: string|null }} */
  const metrics = {
    exports: 0,
    imports: 0,
    syncs: 0,
    denials: 0,
    lastCode: null
  };

  let seq = 0;
  let syncInProgress = false;
  let envelopeSeq = 0;

  /**
   * @param {object} partial
   */
  function emitReceipt(partial) {
    seq += 1;
    const receipt = sanitizeAnPayload({
      id: `AN-RCPT-${String(seq).padStart(4, '0')}`,
      at: now(),
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      workstationId,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 100) receipts.shift();
    if (ledgerAppend) {
      try {
        ledgerAppend(receipt);
      } catch {
        /* observer faults must not crash federation port */
      }
    }
    return receipt;
  }

  /**
   * @param {object} outcome
   */
  function sealReceipt(outcome = {}) {
    return emitReceipt({
      sealed: true,
      ok: outcome.ok !== false,
      allow: outcome.allow !== false && outcome.ok !== false,
      code: outcome.code || AN_CODES.OK,
      phase: outcome.phase || 'SEAL',
      ...outcome
    });
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
    const result = sanitizeAnPayload({
      ok: false,
      allow: false,
      code,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      receipt,
      ...extra
    });
    if (throwOnDeny) {
      throw new MultiWorkstationFederationError(
        extra.message || `DENY: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  function ensureStore(phase) {
    if (!sessionStore) {
      return deny(AN_CODES.MISSING_DEP, {
        phase,
        dep: 'sessionStore',
        message: 'sessionStore not injected — federation unavailable'
      });
    }
    return null;
  }

  /**
   * Export a durable session as a sealed portable custody envelope.
   * @param {string} sessionId
   */
  function exportHandoff(sessionId) {
    if (syncInProgress) {
      return deny(AN_CODES.SYNC_IN_PROGRESS, {
        phase: 'EXPORT',
        sessionId: sessionId != null ? String(sessionId) : null,
        message: 'federation sync in progress — fail-closed'
      });
    }

    const missing = ensureStore('EXPORT');
    if (missing) return missing;

    if (sessionId == null || sessionId === '') {
      return deny(AN_CODES.INVALID_INPUT, {
        phase: 'EXPORT',
        message: 'exportHandoff requires sessionId'
      });
    }

    const sid = String(sessionId);
    const record = sessionStore.load(sid);
    if (!record) {
      return deny(AN_CODES.UNKNOWN_SESSION, {
        phase: 'EXPORT',
        sessionId: sid,
        message: 'unknown session — cannot export handoff'
      });
    }

    if (isFundacionTarget(record) || isFundacionTarget(record.meta) || isFundacionTarget(record.payload)) {
      return deny(AN_CODES.FUNDACION_DENY, {
        phase: 'EXPORT',
        sessionId: sid,
        message: 'Fundacion ALWAYS DENY — no Fundacion paths in federation export'
      });
    }

    const custodyDigest =
      record.custodyDigest ||
      hashFn({
        sessionId: sid,
        generation: record.generation ?? 1,
        snapshot: record
      });

    const tipPin =
      record.tipPin ||
      record.snapshotHash ||
      custodyDigest;

    envelopeSeq += 1;
    const envelopeId = `AN-ENV-${workstationId}-${String(envelopeSeq).padStart(4, '0')}`;

    const payload = sanitizeAnPayload({
      session: {
        sessionId: sid,
        state: record.state || 'ACTIVE',
        generation: record.generation ?? 1,
        custodyDigest,
        tipPin,
        meta: record.meta || {},
        custodyChain: record.custodyChain || [],
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null
      },
      fromWorkstation: workstationId,
      target: record.target || null
    });

    if (isFundacionTarget(payload)) {
      return deny(AN_CODES.FUNDACION_DENY, {
        phase: 'EXPORT',
        sessionId: sid,
        message: 'Fundacion ALWAYS DENY — envelope targets Fundacion'
      });
    }

    const envelope = sealEnvelope(
      {
        envelopeId,
        fromWorkstation: workstationId,
        sessionId: sid,
        tipPin,
        custodyDigest,
        payload,
        sealedAt: now()
      },
      hashFn
    );

    custodyHeads.set(sid, custodyDigest);
    metrics.exports += 1;
    metrics.lastCode = AN_CODES.EXPORTED;

    const receipt = sealReceipt({
      ok: true,
      allow: true,
      code: AN_CODES.EXPORTED,
      phase: 'EXPORT',
      sessionId: sid,
      envelopeId,
      custodyDigest,
      tipPin,
      digest: envelope.digest
    });

    return sanitizeAnPayload({
      ok: true,
      allow: true,
      code: AN_CODES.EXPORTED,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      sessionId: sid,
      envelope,
      receipt
    });
  }

  /**
   * Verify a sealed envelope (digest + shape).
   * @param {object} envelope
   */
  function verifyEnvelope(envelope) {
    const check = verifyEnvelopeDigest(envelope, hashFn);
    if (!check.ok) {
      return sanitizeAnPayload({
        ok: false,
        allow: false,
        code: check.code || AN_CODES.INVALID_ENVELOPE,
        kind: AN_KIND,
        PRODUCTION_READY: AN_PRODUCTION_READY,
        expectedDigest: check.expectedDigest,
        actualDigest: check.actualDigest
      });
    }
    if (isFundacionTarget(envelope) || isFundacionTarget(envelope.payload)) {
      return sanitizeAnPayload({
        ok: false,
        allow: false,
        code: AN_CODES.FUNDACION_DENY,
        kind: AN_KIND,
        PRODUCTION_READY: AN_PRODUCTION_READY,
        message: 'Fundacion ALWAYS DENY'
      });
    }
    return sanitizeAnPayload({
      ok: true,
      allow: true,
      code: AN_CODES.OK,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      envelopeId: envelope.envelopeId,
      sessionId: envelope.sessionId,
      digest: envelope.digest
    });
  }

  /**
   * Import a sealed handoff envelope from a peer workstation.
   * @param {object} envelope
   * @param {{ expectedTip?: string }} [opts]
   */
  function importHandoff(envelope, opts = {}) {
    if (syncInProgress) {
      return deny(AN_CODES.SYNC_IN_PROGRESS, {
        phase: 'IMPORT',
        sessionId: envelope?.sessionId ?? null,
        message: 'federation sync in progress — fail-closed'
      });
    }

    const missing = ensureStore('IMPORT');
    if (missing) return missing;

    if (!envelope || typeof envelope !== 'object') {
      return deny(AN_CODES.INVALID_ENVELOPE, {
        phase: 'IMPORT',
        message: 'importHandoff requires envelope object'
      });
    }

    if (isFundacionTarget(envelope) || isFundacionTarget(envelope.payload)) {
      return deny(AN_CODES.FUNDACION_DENY, {
        phase: 'IMPORT',
        sessionId: envelope.sessionId || null,
        message: 'Fundacion ALWAYS DENY — envelope targets Fundacion'
      });
    }

    const verified = verifyEnvelopeDigest(envelope, hashFn);
    if (!verified.ok) {
      return deny(verified.code || AN_CODES.TAMPER_DETECTED, {
        phase: 'IMPORT',
        sessionId: envelope.sessionId || null,
        envelopeId: envelope.envelopeId || null,
        message: 'envelope digest verification failed — DENY fail-closed',
        expectedDigest: verified.expectedDigest,
        actualDigest: verified.actualDigest
      });
    }

    const sid = String(envelope.sessionId);
    const expectedTip = opts.expectedTip;
    if (
      expectedTip != null &&
      expectedTip !== '' &&
      envelope.tipPin != null &&
      String(envelope.tipPin) !== String(expectedTip)
    ) {
      return deny(AN_CODES.TIP_MISMATCH, {
        phase: 'IMPORT',
        sessionId: sid,
        envelopeId: envelope.envelopeId,
        message: 'tip pin mismatch — DENY import',
        expectedTip: String(expectedTip),
        actualTip: envelope.tipPin
      });
    }

    // Conflicting custody heads: local head exists and differs from envelope
    // (and is not the same workstation re-importing its own export).
    const localHead = custodyHeads.get(sid);
    const existing = sessionStore.load(sid);
    if (existing && localHead && localHead !== envelope.custodyDigest) {
      // Allow if local is empty/placeholder; otherwise conflict
      const localDigest = existing.custodyDigest || localHead;
      if (
        localDigest &&
        localDigest !== envelope.custodyDigest &&
        existing.fromWorkstation !== envelope.fromWorkstation
      ) {
        return deny(AN_CODES.CUSTODY_CONFLICT, {
          phase: 'IMPORT',
          sessionId: sid,
          envelopeId: envelope.envelopeId,
          message:
            'conflicting custody heads — DENY import (no silent merge)',
          localCustodyDigest: localDigest,
          remoteCustodyDigest: envelope.custodyDigest
        });
      }
      // Same workstation or identical digest — still conflict if heads diverge
      if (localDigest && localDigest !== envelope.custodyDigest) {
        return deny(AN_CODES.CUSTODY_CONFLICT, {
          phase: 'IMPORT',
          sessionId: sid,
          envelopeId: envelope.envelopeId,
          message:
            'conflicting custody heads on same session — DENY fail-closed',
          localCustodyDigest: localDigest,
          remoteCustodyDigest: envelope.custodyDigest
        });
      }
    }

    const sessionPayload =
      envelope.payload && envelope.payload.session
        ? structuredCloneSafe(envelope.payload.session)
        : {
            sessionId: sid,
            custodyDigest: envelope.custodyDigest,
            tipPin: envelope.tipPin,
            generation: 1,
            state: 'ACTIVE'
          };

    const record = {
      ...sessionPayload,
      sessionId: sid,
      custodyDigest: envelope.custodyDigest,
      tipPin: envelope.tipPin || sessionPayload.tipPin,
      importedFrom: envelope.fromWorkstation,
      importedEnvelopeId: envelope.envelopeId,
      importedAt: now(),
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      federation: true
    };

    if (isFundacionTarget(record) || isFundacionTarget(record.meta)) {
      return deny(AN_CODES.FUNDACION_DENY, {
        phase: 'IMPORT',
        sessionId: sid,
        message: 'Fundacion ALWAYS DENY — imported record targets Fundacion'
      });
    }

    sessionStore.save(sid, record);
    custodyHeads.set(sid, envelope.custodyDigest);
    metrics.imports += 1;
    metrics.lastCode = AN_CODES.IMPORTED;

    const receipt = sealReceipt({
      ok: true,
      allow: true,
      code: AN_CODES.IMPORTED,
      phase: 'IMPORT',
      sessionId: sid,
      envelopeId: envelope.envelopeId,
      custodyDigest: envelope.custodyDigest,
      tipPin: envelope.tipPin,
      fromWorkstation: envelope.fromWorkstation
    });

    return sanitizeAnPayload({
      ok: true,
      allow: true,
      code: AN_CODES.IMPORTED,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      sessionId: sid,
      record: publicRecordView(record),
      receipt
    });
  }

  /**
   * Fail-closed peer sync: verify ALL envelopes first; apply none on any deny.
   * No partial apply; no silent merge of divergent session ledgers.
   * @param {string} peerId
   * @param {object[]|{ envelopes?: object[], diff?: object[] }} envelopesOrDiff
   */
  function syncPeer(peerId, envelopesOrDiff) {
    if (syncInProgress) {
      return deny(AN_CODES.SYNC_IN_PROGRESS, {
        phase: 'SYNC',
        peerId: peerId != null ? String(peerId) : null,
        message: 'nested sync forbidden — fail-closed'
      });
    }

    const missing = ensureStore('SYNC');
    if (missing) return missing;

    if (peerId == null || peerId === '') {
      return deny(AN_CODES.INVALID_INPUT, {
        phase: 'SYNC',
        message: 'syncPeer requires peerId'
      });
    }

    /** @type {object[]} */
    let envelopes = [];
    if (Array.isArray(envelopesOrDiff)) {
      envelopes = envelopesOrDiff;
    } else if (envelopesOrDiff && typeof envelopesOrDiff === 'object') {
      if (Array.isArray(envelopesOrDiff.envelopes)) {
        envelopes = envelopesOrDiff.envelopes;
      } else if (Array.isArray(envelopesOrDiff.diff)) {
        envelopes = envelopesOrDiff.diff;
      } else {
        return deny(AN_CODES.INVALID_INPUT, {
          phase: 'SYNC',
          peerId: String(peerId),
          message: 'syncPeer requires envelopes[] or { envelopes|diff }'
        });
      }
    } else {
      return deny(AN_CODES.INVALID_INPUT, {
        phase: 'SYNC',
        peerId: String(peerId),
        message: 'syncPeer requires envelopes array or diff object'
      });
    }

    syncInProgress = true;
    try {
      // Phase 1: verify ALL — fail-closed; collect denials; apply none yet
      /** @type {object[]} */
      const denials = [];
      for (let i = 0; i < envelopes.length; i += 1) {
        const env = envelopes[i];
        if (!env || typeof env !== 'object') {
          denials.push({
            index: i,
            code: AN_CODES.INVALID_ENVELOPE,
            message: 'invalid envelope at index'
          });
          continue;
        }
        if (isFundacionTarget(env) || isFundacionTarget(env.payload)) {
          denials.push({
            index: i,
            code: AN_CODES.FUNDACION_DENY,
            sessionId: env.sessionId || null,
            message: 'Fundacion ALWAYS DENY'
          });
          continue;
        }
        const verified = verifyEnvelopeDigest(env, hashFn);
        if (!verified.ok) {
          denials.push({
            index: i,
            code: verified.code || AN_CODES.TAMPER_DETECTED,
            sessionId: env.sessionId || null,
            envelopeId: env.envelopeId || null,
            expectedDigest: verified.expectedDigest,
            actualDigest: verified.actualDigest
          });
          continue;
        }
        const sid = String(env.sessionId);
        const localHead = custodyHeads.get(sid);
        const existing = sessionStore.load(sid);
        if (
          existing &&
          localHead &&
          localHead !== env.custodyDigest &&
          (existing.custodyDigest || localHead) !== env.custodyDigest
        ) {
          denials.push({
            index: i,
            code: AN_CODES.CUSTODY_CONFLICT,
            sessionId: sid,
            envelopeId: env.envelopeId,
            localCustodyDigest: existing.custodyDigest || localHead,
            remoteCustodyDigest: env.custodyDigest
          });
        }
      }

      if (denials.length > 0) {
        // Fail-closed: ZERO partial apply
        metrics.denials += 1;
        metrics.lastCode = AN_CODES.PARTIAL_APPLY_FORBIDDEN;
        const receipt = sealReceipt({
          ok: false,
          allow: false,
          code: AN_CODES.PARTIAL_APPLY_FORBIDDEN,
          phase: 'SYNC',
          peerId: String(peerId),
          envelopeCount: envelopes.length,
          denied: denials.length,
          applied: 0,
          denials,
          message:
            'sync denied — no partial apply; no silent merge of divergent ledgers'
        });
        return sanitizeAnPayload({
          ok: false,
          allow: false,
          code: AN_CODES.PARTIAL_APPLY_FORBIDDEN,
          kind: AN_KIND,
          PRODUCTION_READY: AN_PRODUCTION_READY,
          peerId: String(peerId),
          applied: 0,
          denied: denials.length,
          denials,
          receipt
        });
      }

      // Phase 2: apply ALL (atomic from caller's perspective)
      /** @type {object[]} */
      const applied = [];
      for (const env of envelopes) {
        const sid = String(env.sessionId);
        const sessionPayload =
          env.payload && env.payload.session
            ? structuredCloneSafe(env.payload.session)
            : {
                sessionId: sid,
                custodyDigest: env.custodyDigest,
                tipPin: env.tipPin,
                generation: 1,
                state: 'ACTIVE'
              };
        const record = {
          ...sessionPayload,
          sessionId: sid,
          custodyDigest: env.custodyDigest,
          tipPin: env.tipPin || sessionPayload.tipPin,
          importedFrom: env.fromWorkstation,
          importedEnvelopeId: env.envelopeId,
          importedAt: now(),
          syncedFromPeer: String(peerId),
          kind: AN_KIND,
          PRODUCTION_READY: AN_PRODUCTION_READY,
          federation: true
        };
        sessionStore.save(sid, record);
        custodyHeads.set(sid, env.custodyDigest);
        applied.push({
          sessionId: sid,
          envelopeId: env.envelopeId,
          custodyDigest: env.custodyDigest
        });
      }

      // Optional: notify peer transport (hermetic fake)
      try {
        peerTransport.send(String(peerId), {
          type: 'SYNC_ACK',
          fromWorkstation: workstationId,
          applied: applied.length,
          at: now()
        });
      } catch {
        /* transport faults must not unwind successful local apply after verify */
      }

      metrics.syncs += 1;
      metrics.imports += applied.length;
      metrics.lastCode = AN_CODES.SYNCED;

      const receipt = sealReceipt({
        ok: true,
        allow: true,
        code: AN_CODES.SYNCED,
        phase: 'SYNC',
        peerId: String(peerId),
        envelopeCount: envelopes.length,
        applied: applied.length,
        denied: 0
      });

      return sanitizeAnPayload({
        ok: true,
        allow: true,
        code: AN_CODES.SYNCED,
        kind: AN_KIND,
        PRODUCTION_READY: AN_PRODUCTION_READY,
        peerId: String(peerId),
        applied: applied.length,
        sessions: applied,
        receipt
      });
    } finally {
      syncInProgress = false;
    }
  }

  function health() {
    const listed =
      sessionStore && typeof sessionStore.list === 'function'
        ? sessionStore.list()
        : [];
    return sanitizeAnPayload({
      ok: true,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      workstationId,
      sessionCount: listed.length,
      custodyHeadCount: custodyHeads.size,
      metrics: { ...metrics },
      syncInProgress,
      deps: {
        sessionStore: !!sessionStore,
        peerTransport: !!peerTransport,
        ledgerAppend: !!ledgerAppend,
        hash: true
      },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: {
        federationNotCloudFleet: true,
        federationNotMultiTenantSaas: true,
        federationNotCloudAgent: true,
        federationNotProductionReady: true,
        notAoApAqAr: true,
        fundacionDelta0: true
      }
    });
  }

  function getState() {
    const listed =
      sessionStore && typeof sessionStore.list === 'function'
        ? sessionStore.list()
        : [];
    return sanitizeAnPayload({
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      workstationId,
      sessionCount: listed.length,
      custodyHeads: Object.fromEntries(custodyHeads.entries()),
      metrics: { ...metrics },
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      syncInProgress,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      depsPresent: {
        sessionStore: !!sessionStore,
        peerTransport: true,
        ledgerAppend: !!ledgerAppend
      },
      nonClaim: {
        federationNotCloudFleet: true,
        federationNotMultiTenantSaas: true,
        federationNotCloudAgent: true,
        federationNotProductionReady: true,
        notAoApAqAr: true,
        fundacionDelta0: true
      }
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeAnPayload({ ...r }));
  }

  /**
   * Test helper: seed a session into the store (hermetic).
   * @param {string} sessionId
   * @param {object} [partial]
   */
  function _seedSessionForTest(sessionId, partial = {}) {
    if (!sessionStore) return false;
    const sid = String(sessionId);
    const custodyDigest =
      partial.custodyDigest ||
      hashFn({ sessionId: sid, seed: true, n: partial.generation ?? 1 });
    const record = {
      sessionId: sid,
      state: partial.state || 'ACTIVE',
      generation: partial.generation ?? 1,
      custodyDigest,
      tipPin: partial.tipPin || custodyDigest,
      meta: partial.meta || {},
      custodyChain: partial.custodyChain || [],
      createdAt: partial.createdAt || now(),
      updatedAt: partial.updatedAt || now(),
      target: partial.target || null,
      kind: AN_KIND,
      PRODUCTION_READY: AN_PRODUCTION_READY,
      ...partial
    };
    sessionStore.save(sid, record);
    custodyHeads.set(sid, custodyDigest);
    return true;
  }

  /**
   * Test helper: set local custody head without matching store (conflict sim).
   * @param {string} sessionId
   * @param {string} digest
   */
  function _setCustodyHeadForTest(sessionId, digest) {
    custodyHeads.set(String(sessionId), String(digest));
  }

  return {
    kind: AN_KIND,
    PRODUCTION_READY: AN_PRODUCTION_READY,
    workstationId,
    exportHandoff,
    importHandoff,
    syncPeer,
    verifyEnvelope,
    sealReceipt,
    health,
    getState,
    getReceipts,
    sanitizeAnPayload,
    /** @internal hermetic test hooks */
    _seedSessionForTest,
    _setCustodyHeadForTest,
    _isSyncInProgress: () => syncInProgress
  };
}

/**
 * @param {object} record
 */
function publicRecordView(record) {
  if (!record) return null;
  return {
    sessionId: record.sessionId,
    state: record.state,
    generation: record.generation,
    custodyDigest: record.custodyDigest,
    tipPin: record.tipPin,
    importedFrom: record.importedFrom || null,
    importedEnvelopeId: record.importedEnvelopeId || null,
    syncedFromPeer: record.syncedFromPeer || null,
    kind: AN_KIND,
    PRODUCTION_READY: AN_PRODUCTION_READY
  };
}

/**
 * @param {object} obj
 * @returns {boolean}
 */
function isFundacionTarget(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.fundacionWrite === true) return true;
  if (obj.target === 'fundacion') return true;
  if (obj.path === 'Documents/Fundacion') return true;
  if (typeof obj.path === 'string' && /fundacion/i.test(obj.path)) return true;
  if (typeof obj.target === 'string' && /fundacion/i.test(obj.target)) {
    return true;
  }
  if (obj.payload && typeof obj.payload === 'object') {
    if (isFundacionTarget(obj.payload)) return true;
  }
  if (obj.meta && typeof obj.meta === 'object') {
    if (isFundacionTarget(obj.meta)) return true;
  }
  if (obj.session && typeof obj.session === 'object') {
    if (isFundacionTarget(obj.session)) return true;
  }
  return false;
}

export default createMultiWorkstationSessionFederationPort;
