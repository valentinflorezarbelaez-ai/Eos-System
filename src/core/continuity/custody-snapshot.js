/**
 * @module custody-snapshot
 * SPEC-0051 / Mission AT — Custody snapshot + injectable store fakes.
 *
 * Thin hermetic helpers for sealing allowlisted session custody snapshots
 * used by the operator continuity / crash-recovery port. Reuse AI+W
 * conceptual building blocks (injectable custody store) — do not rewrite
 * full AI/AN.
 *
 * NON-CLAIM:
 *   custody snapshot ≠ HA multi-region SaaS
 *   custody snapshot ≠ multi-AZ failover product
 *   custody snapshot ≠ CloudAgent fleet recovery
 *   not AU/AV/AW
 *   Fundacion Δ=0
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

import { defaultHash, stableStringify } from './continuity-receipt.js';

/** @type {'NO'} */
export const AT_SNAPSHOT_PRODUCTION_READY = 'NO';

export const AT_SNAPSHOT_KIND = 'eos-custody-snapshot';

export const AT_STORE_KIND = 'eos-continuity-custody-store';

/** Allowlisted session state fields restored on restart. */
export const ALLOWLISTED_SESSION_KEYS = Object.freeze([
  'sessionId',
  'status',
  'generation',
  'tipPin',
  'allowlistedState',
  'meta',
  'envelopeDigest'
]);

/**
 * @param {unknown} value
 * @returns {any}
 */
function structuredCloneSafe(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Project request/session into allowlisted state only.
 * @param {object} session
 * @returns {object}
 */
export function projectAllowlistedState(session = {}) {
  /** @type {Record<string, unknown>} */
  const out = {};
  const src =
    session.allowlistedState && typeof session.allowlistedState === 'object'
      ? { ...session, ...session.allowlistedState }
      : session;
  for (const k of ALLOWLISTED_SESSION_KEYS) {
    if (src[k] !== undefined) out[k] = structuredCloneSafe(src[k]);
  }
  if (out.sessionId == null && session.sessionId != null) {
    out.sessionId = String(session.sessionId);
  }
  if (out.status == null) out.status = 'CHECKPOINTED';
  if (out.generation == null) out.generation = 1;
  return out;
}

/**
 * Seal a custody snapshot (adds digest).
 * @param {object} partial
 * @param {(payload: unknown) => string} [hashFn]
 * @param {() => string|number} [nowFn]
 * @returns {object}
 */
export function sealCustodySnapshot(partial = {}, hashFn = defaultHash, nowFn) {
  const now =
    typeof nowFn === 'function' ? nowFn : () => new Date().toISOString();
  const allowlistedState = projectAllowlistedState(partial);
  const body = {
    kind: AT_SNAPSHOT_KIND,
    PRODUCTION_READY: AT_SNAPSHOT_PRODUCTION_READY,
    checkpointId:
      partial.checkpointId != null
        ? String(partial.checkpointId)
        : `AT-CP-${hashFn({ sid: allowlistedState.sessionId, at: String(now()) }).slice(0, 12)}`,
    sessionId:
      allowlistedState.sessionId != null
        ? String(allowlistedState.sessionId)
        : null,
    tipPin: partial.tipPin != null ? String(partial.tipPin) : null,
    head: partial.head != null ? String(partial.head) : null,
    allowlistedState,
    sealedAt: String(now()),
    fundacionDelta: 0,
    cloudAgent: false,
    haMultiRegionClaim: false,
    multiAzFailoverClaim: false,
    cloudAgentFleetClaim: false
  };
  const custodyDigest = hashFn({
    kind: body.kind,
    checkpointId: body.checkpointId,
    sessionId: body.sessionId,
    tipPin: body.tipPin,
    head: body.head,
    allowlistedState: body.allowlistedState,
    sealedAt: body.sealedAt
  });
  return Object.freeze({
    ...body,
    custodyDigest,
    sealed: true
  });
}

/**
 * Verify snapshot digest integrity.
 * @param {object} snapshot
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, code?: string, expectedDigest?: string, actualDigest?: string }}
 */
export function verifyCustodySnapshot(snapshot, hashFn = defaultHash) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, code: 'INVALID_SNAPSHOT' };
  }
  if (snapshot.sealed !== true || snapshot.custodyDigest == null) {
    return { ok: false, code: 'UNSEALED_SNAPSHOT' };
  }
  const expected = hashFn({
    kind: snapshot.kind || AT_SNAPSHOT_KIND,
    checkpointId: snapshot.checkpointId,
    sessionId: snapshot.sessionId,
    tipPin: snapshot.tipPin ?? null,
    head: snapshot.head ?? null,
    allowlistedState: snapshot.allowlistedState,
    sealedAt: snapshot.sealedAt
  });
  if (expected !== snapshot.custodyDigest) {
    return {
      ok: false,
      code: 'TAMPER_DETECTED',
      expectedDigest: expected,
      actualDigest: String(snapshot.custodyDigest)
    };
  }
  return { ok: true };
}

/**
 * Create a thin injectable custody store (AI-compatible load/save/list).
 * @param {object} [options]
 * @param {Map<string, object>} [options.map]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {() => string|number} [options.now]
 */
export function createContinuityCustodyStore(options = {}) {
  /** @type {Map<string, object>} */
  const map = options.map instanceof Map ? options.map : new Map();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  /** @type {Map<string, string[]>} sessionId → checkpoint ids (heads) */
  const headsBySession = new Map();

  /**
   * @param {string} id
   * @returns {object|null}
   */
  function load(id) {
    if (id == null || id === '') return null;
    const rec = map.get(String(id));
    return rec == null ? null : structuredCloneSafe(rec);
  }

  /**
   * @param {string} id
   * @param {object} record
   */
  function save(id, record) {
    if (id == null || id === '') {
      throw new Error('continuity-custody-store: id required');
    }
    map.set(String(id), structuredCloneSafe(record));
  }

  /**
   * @returns {object[]}
   */
  function list() {
    return [...map.entries()].map(([id, rec]) => ({
      id,
      ...structuredCloneSafe(rec)
    }));
  }

  /**
   * Persist a sealed snapshot and track custody head for the session.
   * @param {object} snapshot
   * @returns {object}
   */
  function putSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('continuity-custody-store: snapshot required');
    }
    const id = String(snapshot.checkpointId);
    save(id, snapshot);
    const sid = snapshot.sessionId != null ? String(snapshot.sessionId) : null;
    if (sid) {
      const heads = headsBySession.get(sid) || [];
      if (!heads.includes(id)) heads.push(id);
      headsBySession.set(sid, heads);
      // Also index latest by sessionId for convenience
      save(`session:${sid}:latest`, {
        checkpointId: id,
        sessionId: sid,
        tipPin: snapshot.tipPin ?? null,
        custodyDigest: snapshot.custodyDigest,
        head: snapshot.head ?? id
      });
    }
    return structuredCloneSafe(snapshot);
  }

  /**
   * @param {string} sessionId
   * @returns {string[]}
   */
  function listHeads(sessionId) {
    return [...(headsBySession.get(String(sessionId)) || [])];
  }

  /**
   * @param {string} sessionId
   * @returns {object|null}
   */
  function loadLatest(sessionId) {
    const meta = load(`session:${String(sessionId)}:latest`);
    if (!meta || !meta.checkpointId) return null;
    return load(meta.checkpointId);
  }

  /**
   * Test helper: corrupt a stored snapshot in-place (tamper fixture).
   * @param {string} checkpointId
   * @param {object} [patch]
   */
  function tamper(checkpointId, patch = { allowlistedState: { mutated: true } }) {
    const rec = map.get(String(checkpointId));
    if (!rec) return false;
    const next = {
      ...rec,
      ...patch,
      allowlistedState: {
        ...(rec.allowlistedState || {}),
        ...(patch.allowlistedState || {})
      }
    };
    // Keep old custodyDigest so verify fails
    map.set(String(checkpointId), next);
    return true;
  }

  /**
   * Test helper: register an extra conflicting head without replacing latest.
   * @param {string} sessionId
   * @param {object} snapshot
   */
  function forceExtraHead(sessionId, snapshot) {
    const sid = String(sessionId);
    const sealed =
      snapshot.sealed === true
        ? snapshot
        : sealCustodySnapshot(
            { ...snapshot, sessionId: sid },
            hashFn,
            nowFn
          );
    putSnapshot(sealed);
    return sealed;
  }

  return {
    kind: AT_STORE_KIND,
    PRODUCTION_READY: AT_SNAPSHOT_PRODUCTION_READY,
    load,
    save,
    list,
    putSnapshot,
    listHeads,
    loadLatest,
    tamper,
    forceExtraHead,
    hash: hashFn,
    /** @internal */
    _map: map,
    /** @internal */
    _headsBySession: headsBySession
  };
}

/**
 * Optional thin AN-envelope continuity adapter (conceptual reuse — not full AN).
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 */
export function createAnEnvelopeContinuityAdapter(opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();

  /**
   * Seal a portable envelope over an allowlisted custody snapshot.
   * @param {object} snapshot
   * @param {object} [meta]
   */
  function wrapSnapshot(snapshot, meta = {}) {
    const body = {
      kind: 'eos-federation-custody-envelope-continuity',
      PRODUCTION_READY: AT_SNAPSHOT_PRODUCTION_READY,
      envelopeId:
        meta.envelopeId ||
        `AT-ENV-${hashFn({ cp: snapshot.checkpointId, at: String(nowFn()) }).slice(0, 12)}`,
      sessionId: snapshot.sessionId,
      tipPin: snapshot.tipPin ?? null,
      custodyDigest: snapshot.custodyDigest,
      checkpointId: snapshot.checkpointId,
      payload: {
        allowlistedState: snapshot.allowlistedState,
        sealed: true
      },
      sealedAt: String(nowFn())
    };
    const digest = hashFn(body);
    return Object.freeze({ ...body, digest, sealed: true });
  }

  /**
   * @param {object} envelope
   */
  function verify(envelope) {
    if (!envelope || typeof envelope !== 'object') {
      return { ok: false, code: 'INVALID_ENVELOPE' };
    }
    const { digest, sealed, ...rest } = envelope;
    const expected = hashFn(rest);
    if (expected !== digest) {
      return { ok: false, code: 'TAMPER_DETECTED' };
    }
    return { ok: true, checkpointId: envelope.checkpointId };
  }

  return {
    kind: 'eos-an-envelope-continuity-adapter',
    PRODUCTION_READY: AT_SNAPSHOT_PRODUCTION_READY,
    wrapSnapshot,
    verify
  };
}

export { defaultHash, stableStringify };

export default {
  AT_SNAPSHOT_KIND,
  AT_SNAPSHOT_PRODUCTION_READY,
  AT_STORE_KIND,
  ALLOWLISTED_SESSION_KEYS,
  projectAllowlistedState,
  sealCustodySnapshot,
  verifyCustodySnapshot,
  createContinuityCustodyStore,
  createAnEnvelopeContinuityAdapter
};
