/**
 * @module write-barrier/authorize
 * Fail-closed write authorization against active scope + SSOT + Fundacion.
 */
import path from 'node:path';

import { WriteBarrierDeniedError, WriteBarrierConfigError } from './errors.js';
import { getActiveWriteScope } from './scope.js';
import { loadSsotRoots } from './roots.js';
import {
  externalFundacionRoots,
  isFundacionPath,
  isPathInsideRoot,
  normalizeBarrierPath,
  realpathSafe,
  resolveRepoRoot
} from './paths.js';

/**
 * @typedef {object} WriteAuthVerdict
 * @property {boolean} allowed
 * @property {string} reason
 * @property {string} path
 * @property {string[]} [allowRoots]
 * @property {'MEASURED'} epistemic_class
 */

/**
 * @param {string} targetPath
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {boolean} [options.requireScope=true]
 * @returns {WriteAuthVerdict}
 */
export function authorizeWrite(targetPath, options = {}) {
  const requireScope = options.requireScope !== false;
  const raw = String(targetPath || '');
  if (!raw) {
    return deny('', 'EMPTY_PATH');
  }

  let repoRoot;
  try {
    repoRoot = options.repoRoot
      ? resolveRepoRoot(options.repoRoot, { explicit: true })
      : resolveRepoRoot(process.cwd());
  } catch (err) {
    return deny(raw, `MISCONFIG:${err.message}`);
  }

  const resolved = realpathSafe(raw, repoRoot);

  if (isFundacionPath(raw, resolved)) {
    return deny(resolved, 'FUNDACION_ALWAYS_DENY');
  }
  for (const ext of externalFundacionRoots()) {
    try {
      if (isPathInsideRoot(resolved, realpathSafe(ext, repoRoot)) || isPathInsideRoot(raw, ext)) {
        return deny(resolved, 'FUNDACION_ALWAYS_DENY');
      }
    } catch {
      if (isPathInsideRoot(raw, ext)) {
        return deny(resolved, 'FUNDACION_ALWAYS_DENY');
      }
    }
  }

  let ssot;
  try {
    ssot = loadSsotRoots({ repoRoot });
  } catch (err) {
    const reason =
      err instanceof WriteBarrierConfigError
        ? String(err.message).includes('MISSING')
          ? 'SSOT_CONFIG_MISSING'
          : 'SSOT_CONFIG_INVALID'
        : 'SSOT_MISCONFIG';
    return deny(resolved, reason);
  }

  for (const denyRoot of ssot.resolvedDenyRoots) {
    if (isPathInsideRoot(resolved, denyRoot)) {
      return deny(resolved, 'ALWAYS_DENY_ROOT');
    }
  }
  for (const protectedFile of ssot.resolvedProtectedFiles) {
    if (normalizeBarrierPath(resolved) === normalizeBarrierPath(protectedFile)) {
      return deny(resolved, 'PROTECTED_FILE');
    }
  }

  const scope = getActiveWriteScope();
  if (requireScope && !scope) {
    return deny(resolved, 'NO_ACTIVE_SCOPE');
  }

  const allowRoots = scope?.allowRoots?.length
    ? scope.allowRoots
    : ssot.resolvedAllowRoots;

  if (!allowRoots || allowRoots.length === 0) {
    return deny(resolved, 'EMPTY_ALLOWLIST_FAIL_CLOSED');
  }

  const inside = allowRoots.some((root) => isPathInsideRoot(resolved, root));
  if (!inside) {
    return deny(resolved, 'OUTSIDE_ALLOWLIST', { allowRoots });
  }

  return {
    allowed: true,
    reason: 'OK',
    path: resolved,
    allowRoots,
    epistemic_class: 'MEASURED'
  };
}

/**
 * @param {string} targetPath
 * @param {object} [options]
 * @returns {WriteAuthVerdict}
 */
export function checkWritePathPolicy(targetPath, options = {}) {
  return authorizeWrite(targetPath, { ...options, requireScope: false });
}

/**
 * @param {string} targetPath
 * @param {object} [options]
 */
export function assertWritable(targetPath, options = {}) {
  const verdict = authorizeWrite(targetPath, options);
  if (!verdict.allowed) {
    throw new WriteBarrierDeniedError(verdict.reason, {
      path: verdict.path,
      allowRoots: verdict.allowRoots
    });
  }
  return verdict;
}

/**
 * Legacy protected roots used when SSOT is absent (temp MCP sandboxes / L8).
 * @param {string} repoRoot
 * @returns {string[]}
 */
function legacyProtectedRoots(repoRoot) {
  return [
    realpathSafe(path.join(repoRoot, 'Fundacion'), repoRoot),
    realpathSafe(path.join(repoRoot, 'docs', 'governance'), repoRoot),
    ...externalFundacionRoots().map((r) => {
      try {
        return realpathSafe(r, repoRoot);
      } catch {
        return path.resolve(r);
      }
    })
  ];
}

/**
 * MCP / L8-compatible barrier check.
 * @param {object} args
 */
export function barrierCheck(args = {}) {
  const rawPath = args.path || args.target || '';
  const repoRoot = args.repoRoot
    ? resolveRepoRoot(args.repoRoot, { explicit: true })
    : resolveRepoRoot(process.cwd());
  const resolved = rawPath ? realpathSafe(rawPath, repoRoot) : '';

  let ssot = null;
  let denyRoots = [];
  try {
    ssot = loadSsotRoots({ repoRoot });
    denyRoots = ssot.resolvedDenyRoots;
  } catch {
    denyRoots = legacyProtectedRoots(repoRoot);
  }

  const protectedHit =
    isFundacionPath(rawPath, resolved) ||
    denyRoots.some((root) => isPathInsideRoot(resolved, root) || isPathInsideRoot(rawPath, root));

  if (protectedHit) {
    return {
      path: resolved || path.resolve(String(rawPath || '')),
      allowed: false,
      protected_roots: denyRoots,
      reason: 'PROTECTED_SURFACE',
      scope_active: Boolean(getActiveWriteScope()),
      epistemic_class: 'MEASURED'
    };
  }

  const scope = getActiveWriteScope();
  if (scope) {
    const scoped = authorizeWrite(rawPath, { repoRoot, requireScope: true });
    return {
      path: scoped.path || resolved,
      allowed: scoped.allowed,
      protected_roots: denyRoots,
      reason: scoped.allowed ? 'OK' : scoped.reason,
      scope_active: true,
      epistemic_class: 'MEASURED'
    };
  }

  // No ALS scope: if SSOT present, enforce allowlist membership; else legacy allow
  // (protected surfaces already handled above) for MCP temp sandboxes.
  if (!ssot) {
    return {
      path: resolved || path.resolve(String(rawPath || '')),
      allowed: true,
      protected_roots: denyRoots,
      reason: 'OK',
      scope_active: false,
      epistemic_class: 'MEASURED'
    };
  }

  const policy = checkWritePathPolicy(rawPath, { repoRoot });
  return {
    path: policy.path || resolved,
    allowed: policy.allowed,
    protected_roots: denyRoots,
    reason: policy.allowed ? 'OK' : policy.reason,
    scope_active: false,
    epistemic_class: 'MEASURED'
  };
}

/**
 * @param {string} resolved
 * @param {string} reason
 * @param {object} [extra]
 * @returns {WriteAuthVerdict}
 */
function deny(resolved, reason, extra = {}) {
  return {
    allowed: false,
    reason,
    path: resolved || '',
    ...extra,
    epistemic_class: 'MEASURED'
  };
}
