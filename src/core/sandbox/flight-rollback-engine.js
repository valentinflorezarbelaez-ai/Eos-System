/**
 * @module flight-rollback-engine
 * SPEC-0031 / Mission Z — Atomic snapshot / rollback for Target Flight Sandbox.
 *
 * Ports: hashTree (default SHA-256 of sorted path→content map), applyMutation,
 * restoreSnapshot. Hermetic in-memory tree is the test surface. Real Fundacion
 * roots are ALWAYS DENIED (never walked, never restored onto).
 *
 * NON-CLAIM:
 *   Snapshot / rollback ≠ live Fundacion writes.
 *   Simulation ≠ Fundacion Δ opened.
 *   Engine restore ≠ PRODUCTION_READY.
 *   This is NOT a rewrite of write-barrier / external-write-gateway.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** @type {'NO'} */
export const ROLLBACK_ENGINE_PRODUCTION_READY = 'NO';

export const ROLLBACK_ENGINE_KIND = 'eos-flight-rollback-engine';

export const ROLLBACK_CODES = Object.freeze({
  FLIGHT_SNAPSHOT_INVALID: 'FLIGHT_SNAPSHOT_INVALID',
  FLIGHT_SNAPSHOT_TAMPERED: 'FLIGHT_SNAPSHOT_TAMPERED',
  FLIGHT_SNAPSHOT_FAILED: 'FLIGHT_SNAPSHOT_FAILED',
  FLIGHT_ROLLBACK_FAILED: 'FLIGHT_ROLLBACK_FAILED',
  FLIGHT_ROOT_NOT_EPHEMERAL: 'FLIGHT_ROOT_NOT_EPHEMERAL',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FLIGHT_APPLY_FAILED: 'FLIGHT_APPLY_FAILED'
});

/**
 * Typed error for rollback engine failures (fail-closed).
 */
export class FlightRollbackError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = ROLLBACK_CODES.FLIGHT_ROLLBACK_FAILED, details = {}) {
    super(message);
    this.name = 'FlightRollbackError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * SHA-256 hex of a string / Buffer / JSON body (sealEvd style).
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
 * Windows-safe path normalize (mirrors T-gate / write-barrier).
 * @param {string} input
 * @returns {string}
 */
export function normalizeEnginePath(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .toLowerCase();
}

/**
 * Default detector for real Fundacion paths (Documents/Fundacion + /Fundacion/).
 * @param {string} p
 * @returns {boolean}
 */
export function defaultIsRealFundacionPath(p) {
  const normalized = normalizeEnginePath(p);
  if (!normalized) return false;
  if (normalized.includes('documents/fundacion')) return true;
  return /(^|\/)fundacion(\/|$)/.test(normalized);
}

/**
 * Clone a path→content map (string values only).
 * @param {object} entries
 * @returns {Record<string, string>}
 */
export function cloneEntries(entries) {
  const src = entries && typeof entries === 'object' ? entries : {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of Object.keys(src)) {
    out[key] = src[key] == null ? '' : String(src[key]);
  }
  return out;
}

/**
 * Default hashTree: SHA-256 of sorted path→content map (canonical, deterministic).
 * @param {object} entries
 * @returns {string}
 */
export function defaultHashTree(entries) {
  const map = entries && typeof entries === 'object' ? entries : {};
  const keys = Object.keys(map).sort();
  const canon = keys.map((k) => `${k}\n${map[k] == null ? '' : String(map[k])}`).join('\n--\n');
  return defaultHash(canon);
}

/**
 * Apply a mutation plan onto a path→content map (pure).
 * @param {object} tree
 * @param {object} plan
 * @returns {Record<string, string>}
 */
export function applyPlanToEntries(tree, plan) {
  const next = cloneEntries(tree);
  const p = plan && typeof plan === 'object' ? plan : {};
  const writes = p.writes && typeof p.writes === 'object' ? p.writes : null;
  const files = p.files && typeof p.files === 'object' ? p.files : null;
  const source = writes || files || {};
  for (const [filePath, content] of Object.entries(source)) {
    if (defaultIsRealFundacionPath(filePath)) {
      throw new FlightRollbackError(
        `FUNDACION_ALWAYS_DENY: mutation path ${filePath}`,
        ROLLBACK_CODES.FUNDACION_ALWAYS_DENY,
        { path: filePath }
      );
    }
    next[filePath] = content == null ? '' : String(content);
  }
  const deletes = Array.isArray(p.deletes) ? p.deletes : [];
  for (const filePath of deletes) {
    if (defaultIsRealFundacionPath(filePath)) {
      throw new FlightRollbackError(
        `FUNDACION_ALWAYS_DENY: delete path ${filePath}`,
        ROLLBACK_CODES.FUNDACION_ALWAYS_DENY,
        { path: filePath }
      );
    }
    delete next[filePath];
  }
  if (Array.isArray(p.ops)) {
    for (const op of p.ops) {
      if (!op || typeof op !== 'object') continue;
      const filePath = String(op.path || '');
      if (defaultIsRealFundacionPath(filePath)) {
        throw new FlightRollbackError(
          `FUNDACION_ALWAYS_DENY: op path ${filePath}`,
          ROLLBACK_CODES.FUNDACION_ALWAYS_DENY,
          { path: filePath }
        );
      }
      if (op.op === 'write' || op.op === 'set') {
        next[filePath] = op.content == null ? '' : String(op.content);
      } else if (op.op === 'delete' || op.op === 'unlink') {
        delete next[filePath];
      }
    }
  }
  return next;
}

/**
 * Walk a directory under os.tmpdir() into a path→content map. Fail-closed
 * on Fundacion or any root that is not ephemeral.
 * @param {string} root
 * @returns {Record<string, string>}
 */
function readEphemeralRoot(root) {
  if (defaultIsRealFundacionPath(root)) {
    throw new FlightRollbackError(
      `FUNDACION_ALWAYS_DENY: refuse to snapshot ${root}`,
      ROLLBACK_CODES.FUNDACION_ALWAYS_DENY,
      { path: root }
    );
  }
  const abs = path.resolve(String(root || ''));
  const tmp = path.resolve(os.tmpdir());
  const absN = normalizeEnginePath(abs);
  const tmpN = normalizeEnginePath(tmp);
  if (absN !== tmpN && !absN.startsWith(`${tmpN}/`)) {
    throw new FlightRollbackError(
      `FLIGHT_ROOT_NOT_EPHEMERAL: only os.tmpdir() roots allowed, got ${root}`,
      ROLLBACK_CODES.FLIGHT_ROOT_NOT_EPHEMERAL,
      { path: root }
    );
  }
  /** @type {Record<string, string>} */
  const entries = {};
  const walk = (dir, relBase) => {
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch (err) {
      throw new FlightRollbackError(
        `FLIGHT_SNAPSHOT_FAILED: ${err?.message || err}`,
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_FAILED,
        { cause: err, path: dir }
      );
    }
    for (const name of names) {
      const full = path.join(dir, name);
      const rel = relBase ? `${relBase}/${name}` : name;
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full, rel);
      else if (st.isFile()) entries[rel] = fs.readFileSync(full, 'utf8');
    }
  };
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    walk(abs, '');
  }
  return entries;
}

/**
 * Create a flight rollback engine.
 *
 * @param {object} [opts]
 * @param {object} [opts.tree] initial in-memory path→content map
 * @param {(entries: object) => string} [opts.hashTree]
 * @param {(tree: object, plan: object) => object|Promise<object>} [opts.applyMutation]
 * @param {(snapshot: object) => void|Promise<void>} [opts.restoreSnapshot]
 * @param {() => string|Date} [opts.now]
 * @param {(p: string) => boolean} [opts.isRealFundacionPath]
 * @returns {object}
 */
export function createFlightRollbackEngine(opts = {}) {
  const hashTree = typeof opts.hashTree === 'function' ? opts.hashTree : defaultHashTree;
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const isRealFundacionPath =
    typeof opts.isRealFundacionPath === 'function'
      ? opts.isRealFundacionPath
      : defaultIsRealFundacionPath;

  let tree = cloneEntries(opts.tree || {});

  function isoNow() {
    const v = nowFn();
    return v instanceof Date ? v.toISOString() : String(v);
  }

  /**
   * @param {object|string} [treeOrRoot]
   * @returns {{ sha256: string, entries: Record<string, string>, at: string }}
   */
  function captureSnapshot(treeOrRoot) {
    let entries;
    if (treeOrRoot == null) {
      entries = cloneEntries(tree);
    } else if (typeof treeOrRoot === 'string') {
      if (isRealFundacionPath(treeOrRoot)) {
        throw new FlightRollbackError(
          `FUNDACION_ALWAYS_DENY: refuse to snapshot ${treeOrRoot}`,
          ROLLBACK_CODES.FUNDACION_ALWAYS_DENY,
          { path: treeOrRoot }
        );
      }
      entries = readEphemeralRoot(treeOrRoot);
      tree = cloneEntries(entries);
    } else if (typeof treeOrRoot === 'object' && !Array.isArray(treeOrRoot)) {
      entries = cloneEntries(treeOrRoot);
      tree = cloneEntries(treeOrRoot);
    } else {
      throw new FlightRollbackError(
        'FLIGHT_SNAPSHOT_INVALID: treeOrRoot must be an object map, a tmpdir root, or omitted',
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_INVALID
      );
    }

    let sha256;
    try {
      sha256 = hashTree(entries);
    } catch (err) {
      throw new FlightRollbackError(
        `FLIGHT_SNAPSHOT_FAILED: hashTree threw ${err?.message || err}`,
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_FAILED,
        { cause: err }
      );
    }
    if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(sha256)) {
      throw new FlightRollbackError(
        'FLIGHT_SNAPSHOT_FAILED: hashTree must return 64-hex sha256',
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_FAILED
      );
    }
    return {
      sha256: sha256.toLowerCase(),
      entries: cloneEntries(entries),
      at: isoNow()
    };
  }

  /**
   * Restore snapshot into the bound tree (and optional restoreSnapshot port).
   * Fail-closed on missing/tampered snapshot.
   * @param {object} snapshot
   * @returns {Promise<{ ok: true, sha256: string, restored: true, PRODUCTION_READY: 'NO' }>}
   */
  async function rollback(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new FlightRollbackError(
        'FLIGHT_SNAPSHOT_INVALID: rollback requires a snapshot object',
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_INVALID
      );
    }
    if (typeof snapshot.sha256 !== 'string' || !snapshot.entries || typeof snapshot.entries !== 'object') {
      throw new FlightRollbackError(
        'FLIGHT_SNAPSHOT_INVALID: snapshot missing sha256/entries',
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_INVALID
      );
    }
    let recomputed;
    try {
      recomputed = hashTree(snapshot.entries);
    } catch (err) {
      throw new FlightRollbackError(
        `FLIGHT_SNAPSHOT_TAMPERED: hashTree threw during verify ${err?.message || err}`,
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_TAMPERED,
        { cause: err }
      );
    }
    if (String(recomputed).toLowerCase() !== String(snapshot.sha256).toLowerCase()) {
      throw new FlightRollbackError(
        'FLIGHT_SNAPSHOT_TAMPERED: snapshot hash mismatch',
        ROLLBACK_CODES.FLIGHT_SNAPSHOT_TAMPERED,
        { expected: snapshot.sha256, actual: recomputed }
      );
    }
    try {
      if (typeof opts.restoreSnapshot === 'function') {
        await opts.restoreSnapshot(snapshot);
      }
      tree = cloneEntries(snapshot.entries);
    } catch (err) {
      if (err instanceof FlightRollbackError) throw err;
      throw new FlightRollbackError(
        `FLIGHT_ROLLBACK_FAILED: ${err?.message || err}`,
        ROLLBACK_CODES.FLIGHT_ROLLBACK_FAILED,
        { cause: err }
      );
    }
    return {
      ok: true,
      sha256: String(snapshot.sha256).toLowerCase(),
      restored: true,
      PRODUCTION_READY: ROLLBACK_ENGINE_PRODUCTION_READY
    };
  }

  /**
   * Apply a mutation plan to the bound tree.
   * @param {object} plan
   * @returns {Promise<{ ok: true, tree: Record<string, string> }>}
   */
  async function applyMutation(plan) {
    try {
      if (typeof opts.applyMutation === 'function') {
        const next = await opts.applyMutation(cloneEntries(tree), plan);
        if (next && typeof next === 'object') tree = cloneEntries(next);
      } else {
        tree = applyPlanToEntries(tree, plan);
      }
    } catch (err) {
      if (err instanceof FlightRollbackError) throw err;
      throw new FlightRollbackError(
        `FLIGHT_APPLY_FAILED: ${err?.message || err}`,
        ROLLBACK_CODES.FLIGHT_APPLY_FAILED,
        { cause: err }
      );
    }
    return { ok: true, tree: cloneEntries(tree) };
  }

  function getTree() {
    return cloneEntries(tree);
  }

  function health() {
    return {
      kind: ROLLBACK_ENGINE_KIND,
      PRODUCTION_READY: ROLLBACK_ENGINE_PRODUCTION_READY,
      entryCount: Object.keys(tree).length,
      fundacionDeltaOpened: false,
      hermeticInMemory: true
    };
  }

  return {
    captureSnapshot,
    rollback,
    applyMutation,
    getTree,
    health,
    hashTree,
    kind: ROLLBACK_ENGINE_KIND,
    PRODUCTION_READY: ROLLBACK_ENGINE_PRODUCTION_READY
  };
}

export default createFlightRollbackEngine;
