/**
 * @module write-barrier/roots
 * Load SSOT allowlist config and resolve repo-relative roots via realpath.
 */
import fs from 'node:fs';
import path from 'node:path';

import { WriteBarrierConfigError } from './errors.js';
import { realpathSafe, resolveRepoRoot } from './paths.js';

export const SSOT_CONFIG_REL = path.join('config', 'security', 'write-barrier-ssot-roots.json');

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot] When provided, treated as explicit root (no parent walk)
 * @param {string} [options.configPath]
 */
export function loadSsotRoots(options = {}) {
  const repoRoot = options.repoRoot
    ? resolveRepoRoot(options.repoRoot, { explicit: true })
    : resolveRepoRoot(process.cwd());

  const configPath = options.configPath
    ? path.resolve(options.configPath)
    : path.join(repoRoot, SSOT_CONFIG_REL);

  if (!fs.existsSync(configPath)) {
    throw new WriteBarrierConfigError(
      `WRITE_BARRIER_SSOT_MISSING: SSOT config not found at ${SSOT_CONFIG_REL}`,
      { configPath, repoRoot }
    );
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new WriteBarrierConfigError(
      `WRITE_BARRIER_SSOT_INVALID: cannot parse SSOT config: ${err.message}`,
      { configPath, repoRoot }
    );
  }

  const repoRelativeAllowRoots = Array.isArray(raw.repoRelativeAllowRoots)
    ? raw.repoRelativeAllowRoots.map(String)
    : null;
  if (!repoRelativeAllowRoots || repoRelativeAllowRoots.length === 0) {
    throw new WriteBarrierConfigError(
      'WRITE_BARRIER_SSOT_INVALID: repoRelativeAllowRoots must be a non-empty array',
      { configPath, repoRoot }
    );
  }

  const alwaysDenyRepoRelative = Array.isArray(raw.alwaysDenyRepoRelative)
    ? raw.alwaysDenyRepoRelative.map(String)
    : ['Fundacion'];
  const protectedFilesRepoRelative = Array.isArray(raw.protectedFilesRepoRelative)
    ? raw.protectedFilesRepoRelative.map(String)
    : [];

  const resolvedAllowRoots = repoRelativeAllowRoots.map((rel) =>
    realpathSafe(path.join(repoRoot, rel), repoRoot)
  );
  const resolvedDenyRoots = alwaysDenyRepoRelative.map((rel) =>
    realpathSafe(path.join(repoRoot, rel), repoRoot)
  );
  const resolvedProtectedFiles = protectedFilesRepoRelative.map((rel) =>
    realpathSafe(path.join(repoRoot, rel), repoRoot)
  );

  return {
    version: Number(raw.version) || 1,
    repoRelativeAllowRoots,
    alwaysDenyRepoRelative,
    protectedFilesRepoRelative,
    resolvedAllowRoots,
    resolvedDenyRoots,
    resolvedProtectedFiles,
    configPath,
    repoRoot
  };
}

/**
 * Intersect requested roots with SSOT allow roots.
 * @param {string[]} requestedRoots
 * @param {ReturnType<typeof loadSsotRoots>} ssot
 * @returns {string[]}
 */
export function resolveScopedAllowRoots(requestedRoots, ssot) {
  const req =
    Array.isArray(requestedRoots) && requestedRoots.length > 0
      ? requestedRoots
      : ssot.repoRelativeAllowRoots;

  const resolvedRequested = req.map((entry) => {
    if (path.isAbsolute(entry)) {
      return realpathSafe(entry, ssot.repoRoot);
    }
    return realpathSafe(path.join(ssot.repoRoot, entry), ssot.repoRoot);
  });

  const effective = [];
  for (const candidate of resolvedRequested) {
    const underSsot = ssot.resolvedAllowRoots.some((ssotRoot) => {
      const c = candidate.replace(/\\/g, '/').toLowerCase();
      const s = ssotRoot.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
      return c === s || c.startsWith(`${s}/`) || s.startsWith(`${c}/`);
    });
    if (underSsot) {
      effective.push(candidate);
    }
  }
  return [...new Set(effective)];
}
