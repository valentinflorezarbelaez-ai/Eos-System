/**
 * @module session-custody-store
 * SPEC-0040 / Mission AI — thin hash-chained session custody store.
 *
 * Append-only in-memory (or injectable map) snapshots with SHA-256 chain.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: custody store ≠ EVD ledger product (AJ) ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const AI_STORE_PRODUCTION_READY = 'NO';

export const AI_STORE_KIND = 'eos-session-custody-store';

/**
 * @param {string|Buffer|object} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : JSON.stringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Create a thin hash-chained custody store for session snapshots.
 *
 * Port surface compatible with coordinator injectable `store`:
 *   load(id) / save(id, record) / list()
 *
 * Also exposes chain helpers: appendSnapshot / verifyChain / getChain.
 *
 * @param {object} [options]
 * @param {Map<string, object>} [options.map] — injectable backing map
 * @param {(payload: any) => string} [options.hash]
 * @param {() => string} [options.now]
 */
export function createSessionCustodyStore(options = {}) {
  /** @type {Map<string, object>} */
  const map =
    options.map instanceof Map ? options.map : new Map();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  /** @type {Map<string, object[]>} sessionId → chain entries */
  const chains = new Map();

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
      throw new Error('session-custody-store: id required');
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
   * Append a hash-chained snapshot entry for a session.
   * @param {string} sessionId
   * @param {object} snapshot
   * @returns {{ entry: object, digest: string, prevDigest: string|null }}
   */
  function appendSnapshot(sessionId, snapshot) {
    const sid = String(sessionId);
    const chain = chains.get(sid) || [];
    const prevDigest =
      chain.length > 0 ? chain[chain.length - 1].digest : null;
    const body = {
      sessionId: sid,
      at: now(),
      prevDigest,
      snapshot: structuredCloneSafe(snapshot),
      PRODUCTION_READY: AI_STORE_PRODUCTION_READY,
      kind: AI_STORE_KIND
    };
    const digest = hashFn(body);
    const entry = { ...body, digest };
    chain.push(entry);
    chains.set(sid, chain);
    return { entry, digest, prevDigest };
  }

  /**
   * Verify hash chain integrity for a session.
   * @param {string} sessionId
   * @returns {{ ok: boolean, length: number, code?: string }}
   */
  function verifyChain(sessionId) {
    const chain = chains.get(String(sessionId)) || [];
    let prev = null;
    for (let i = 0; i < chain.length; i += 1) {
      const entry = chain[i];
      if (entry.prevDigest !== prev) {
        return {
          ok: false,
          length: chain.length,
          code: 'CHAIN_PREV_MISMATCH',
          index: i
        };
      }
      const { digest, ...body } = entry;
      const expected = hashFn(body);
      if (expected !== digest) {
        return {
          ok: false,
          length: chain.length,
          code: 'CHAIN_DIGEST_MISMATCH',
          index: i
        };
      }
      prev = digest;
    }
    return { ok: true, length: chain.length };
  }

  /**
   * @param {string} sessionId
   * @returns {object[]}
   */
  function getChain(sessionId) {
    const chain = chains.get(String(sessionId)) || [];
    return chain.map((e) => structuredCloneSafe(e));
  }

  return {
    kind: AI_STORE_KIND,
    PRODUCTION_READY: AI_STORE_PRODUCTION_READY,
    load,
    save,
    list,
    appendSnapshot,
    verifyChain,
    getChain,
    /** @internal test helper */
    _map: map
  };
}

/**
 * @param {unknown} value
 * @returns {any}
 */
function structuredCloneSafe(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export default createSessionCustodyStore;
