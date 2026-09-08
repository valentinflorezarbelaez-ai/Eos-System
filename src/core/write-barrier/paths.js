/**
 * @module write-barrier/paths
 * Windows-safe path normalization and realpath resolution for missing targets.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * @param {string} input
 * @returns {string}
 */
export function normalizeBarrierPath(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .toLowerCase();
}

/**
 * Resolve a path with realpath when possible. Missing leaf walks up to an
 * existing parent and rejoins the tail (Windows + POSIX safe).
 * @param {string} targetPath
 * @param {string} [cwd]
 * @returns {string}
 */
export function realpathSafe(targetPath, cwd = process.cwd()) {
  const resolved = path.resolve(cwd, targetPath);
  try {
    return fs.realpathSync(resolved);
  } catch {
    const tail = [];
    let current = resolved;
    while (true) {
      const parent = path.dirname(current);
      tail.unshift(path.basename(current));
      if (parent === current) {
        return resolved;
      }
      try {
        return path.join(fs.realpathSync(parent), ...tail);
      } catch {
        current = parent;
      }
    }
  }
}

/**
 * True for in-repo Fundacion segments and external Documents/Fundacion.
 * @param {...string} candidates
 * @returns {boolean}
 */
export function isFundacionPath(...candidates) {
  return candidates.some((candidate) => {
    const normalized = normalizeBarrierPath(candidate);
    if (!normalized) return false;
    if (normalized.includes('documents/fundacion')) return true;
    return /(^|\/)fundacion(\/|$)/.test(normalized);
  });
}

/**
 * @param {string} candidate
 * @param {string} root
 * @returns {boolean}
 */
export function isPathInsideRoot(candidate, root) {
  const cand = normalizeBarrierPath(candidate);
  const base = normalizeBarrierPath(root).replace(/\/$/, '');
  if (!base) return false;
  return cand === base || cand.startsWith(`${base}/`);
}

/**
 * When `explicit` is true (or start is passed as already-known root), do not walk parents.
 * Otherwise walk upward for package.json + SSOT config.
 * @param {string} [start]
 * @param {{ explicit?: boolean }} [options]
 * @returns {string}
 */
export function resolveRepoRoot(start = process.cwd(), options = {}) {
  const explicit = options.explicit === true;
  const resolvedStart = path.resolve(start);
  if (explicit) {
    try {
      return fs.realpathSync(resolvedStart);
    } catch {
      return resolvedStart;
    }
  }

  let current = resolvedStart;
  while (true) {
    const pkg = path.join(current, 'package.json');
    const ssot = path.join(current, 'config', 'security', 'write-barrier-ssot-roots.json');
    if (fs.existsSync(pkg) && fs.existsSync(ssot)) {
      try {
        return fs.realpathSync(current);
      } catch {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      try {
        return fs.realpathSync(resolvedStart);
      } catch {
        return resolvedStart;
      }
    }
    current = parent;
  }
}

/**
 * Extra external Fundacion roots (homedir) — never allowlisted.
 * @returns {string[]}
 */
export function externalFundacionRoots() {
  return [path.join(os.homedir(), 'Documents', 'Fundacion')];
}
