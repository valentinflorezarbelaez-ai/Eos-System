/**
 * @module write-barrier/scope
 * Process-scoped write authorization via AsyncLocalStorage.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import { loadSsotRoots, resolveScopedAllowRoots } from './roots.js';
import { WriteBarrierConfigError } from './errors.js';

/** @type {AsyncLocalStorage<{ allowRoots: string[], repoRoot: string, ssot: object, label?: string }>} */
const writeScopeStorage = new AsyncLocalStorage();

/**
 * @returns {{ allowRoots: string[], repoRoot: string, ssot: object, label?: string } | null}
 */
export function getActiveWriteScope() {
  return writeScopeStorage.getStore() || null;
}

/**
 * Open an explicit write scope. Mutations (via authorizeWrite / hooks) only
 * succeed for paths under the effective realpath allowlist.
 *
 * @template T
 * @param {object} options
 * @param {string} [options.repoRoot]
 * @param {string[]} [options.roots] Repo-relative or absolute roots (intersected with SSOT)
 * @param {string} [options.label]
 * @param {() => (T | Promise<T>)} fn
 * @returns {Promise<T>}
 */
export async function withWriteScope(options = {}, fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('withWriteScope requires a callback function');
  }

  let ssot;
  try {
    ssot = loadSsotRoots({ repoRoot: options.repoRoot });
  } catch (err) {
    if (err instanceof WriteBarrierConfigError) throw err;
    throw new WriteBarrierConfigError(
      `WRITE_BARRIER_SSOT_MISCONFIG: ${err.message}`,
      { cause: err }
    );
  }

  const allowRoots = resolveScopedAllowRoots(options.roots, ssot);
  const scope = {
    allowRoots,
    repoRoot: ssot.repoRoot,
    ssot,
    label: options.label || 'write-scope'
  };

  return writeScopeStorage.run(scope, fn);
}

/**
 * Synchronous variant for sync call sites.
 * @template T
 * @param {object} options
 * @param {() => T} fn
 * @returns {T}
 */
export function withWriteScopeSync(options = {}, fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('withWriteScopeSync requires a callback function');
  }
  const ssot = loadSsotRoots({ repoRoot: options.repoRoot });
  const allowRoots = resolveScopedAllowRoots(options.roots, ssot);
  const scope = {
    allowRoots,
    repoRoot: ssot.repoRoot,
    ssot,
    label: options.label || 'write-scope'
  };
  return writeScopeStorage.run(scope, fn);
}
