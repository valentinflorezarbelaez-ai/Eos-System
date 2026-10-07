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
 * Protected roots used when SSOT is absent (still fail-closed; never used to allow).
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
 * MCP / L8-compatible barrier check — fail-closed at the MCP boundary.
 *
 * Contract:
 * - EMPTY_PATH / PROTECTED_SURFACE / SSOT_CONFIG_* / NO_ACTIVE_SCOPE / OUTSIDE_ALLOWLIST → deny
 * - Active ALS scope + path inside allowlist → allow
 * - No legacy allow when SSOT or scope is missing
 *
 * @param {object} args
 */
export function barrierCheck(args = {}) {
  const rawPath = args.path || args.target || '';

  let repoRoot;
  try {
    repoRoot = args.repoRoot
      ? resolveRepoRoot(args.repoRoot, { explicit: true })
      : resolveRepoRoot(process.cwd());
  } catch (err) {
    return {
      path: String(rawPath || ''),
      allowed: false,
      protected_roots: [],
      reason: `MISCONFIG:${err.message}`,
      scope_active: Boolean(getActiveWriteScope()),
      epistemic_class: 'MEASURED'
    };
  }

  if (!rawPath) {
    return {
      path: '',
      allowed: false,
      protected_roots: [],
      reason: 'EMPTY_PATH',
      scope_active: Boolean(getActiveWriteScope()),
      epistemic_class: 'MEASURED'
    };
  }

  const resolved = realpathSafe(rawPath, repoRoot);

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

  // Fail-closed: missing/invalid SSOT never allows (removed legacy allow path).
  if (!ssot) {
    return {
      path: resolved || path.resolve(String(rawPath || '')),
      allowed: false,
      protected_roots: denyRoots,
      reason: 'SSOT_CONFIG_MISSING',
      scope_active: Boolean(getActiveWriteScope()),
      epistemic_class: 'MEASURED'
    };
  }

  // Fail-closed: MCP write surface requires an active ALS write scope.
  const scope = getActiveWriteScope();
  if (!scope) {
    return {
      path: resolved || path.resolve(String(rawPath || '')),
      allowed: false,
      protected_roots: denyRoots,
      reason: 'NO_ACTIVE_SCOPE',
      scope_active: false,
      epistemic_class: 'MEASURED'
    };
  }

  const scoped = authorizeWrite(rawPath, { repoRoot, requireScope: true });
  let reason = scoped.reason;
  if (!scoped.allowed && /FUNDACION|ALWAYS_DENY|PROTECTED/i.test(String(reason))) {
    reason = 'PROTECTED_SURFACE';
  }
  return {
    path: scoped.path || resolved,
    allowed: scoped.allowed,
    protected_roots: denyRoots,
    reason: scoped.allowed ? 'OK' : reason,
    scope_active: true,
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
