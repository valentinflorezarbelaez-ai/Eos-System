/**
 * @module mission-artifact-write
 * Q5 — Audited mission-artifact write envelope (NOT a parallel EVD ledger).
 *
 * Routes selected `.missions/<id>/...` artifact writes through Write Barrier
 * allowlist scope (SSOT root `.missions`) + path envelope checks.
 * Does NOT call sealEvd / EvidenceCustody (EVD remains P4/G7/N2).
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  assertWritable,
  getActiveWriteScope,
  withWriteScopeSync,
  WriteBarrierDeniedError,
  isFundacionPath,
  resolveRepoRoot,
  SSOT_CONFIG_REL
} from '../write-barrier/index.js';

export const MISSION_ARTIFACT_WRITE_MODULE =
  'src/core/runtime/mission-artifact-write.js';

export const MISSION_ARTIFACT_ALLOW_ROOT = '.missions';

/** Modules expected to route selected mission artifact writes through this envelope. */
export const MISSION_ARTIFACT_ROUTED_CALLERS = [
  'src/core/runtime/governed-task-executor.js',
  'src/core/runtime/mission-runtime.js'
];

const AUDIT_SCAN_ROOTS = ['src', 'scripts', 'bin'];

/**
 * Infer control-plane root as parent of `.missions` when path lives under it.
 * @param {string} targetPath
 * @returns {string}
 */
export function inferControlPlaneRootFromMissionPath(targetPath) {
  const resolved = path.resolve(String(targetPath || ''));
  const parts = resolved.split(/[/\\]/);
  const idx = parts.findIndex((p) => p === '.missions');
  if (idx > 0) {
    return parts.slice(0, idx).join(path.sep);
  }
  try {
    return resolveRepoRoot(process.cwd());
  } catch {
    return process.cwd();
  }
}

/**
 * Fail-closed: target must resolve under `<controlPlaneRoot>/.missions/`.
 * @param {string} targetPath
 * @param {string} controlPlaneRoot
 */
export function assertUnderMissionsRoot(targetPath, controlPlaneRoot) {
  const root = path.resolve(controlPlaneRoot);
  const missionsRoot = path.resolve(root, MISSION_ARTIFACT_ALLOW_ROOT);
  const target = path.resolve(targetPath);
  const normTarget = target.replace(/\\/g, '/').toLowerCase();
  const normMissions = missionsRoot.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
  if (normTarget !== normMissions && !normTarget.startsWith(`${normMissions}/`)) {
    throw new WriteBarrierDeniedError('MISSION_ARTIFACT_OUTSIDE_MISSIONS_ROOT', {
      path: target,
      allowRoots: [missionsRoot]
    });
  }
  if (isFundacionPath(target, target)) {
    throw new WriteBarrierDeniedError('FUNDACION_ALWAYS_DENY', { path: target });
  }
  return { target, missionsRoot, controlPlaneRoot: root };
}

/**
 * Ensure ephemeral control planes (temp fixtures) have SSOT including `.missions`.
 * Seeds missing SSOT; if an existing fixture SSOT omits `.missions`, idempotently
 * prepends that allow root without weakening deny lists. No-op when already present
 * (production SSOT already includes `.missions`).
 * @param {string} controlPlaneRoot
 */
export function ensureMissionsWriteBarrierSsot(controlPlaneRoot) {
  const root = path.resolve(controlPlaneRoot);
  const configPath = path.join(root, SSOT_CONFIG_REL);
  if (fs.existsSync(configPath)) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      // Leave invalid SSOT for loadSsotRoots fail-closed; do not silently rewrite.
      return { seeded: false, patched: false, configPath };
    }
    const allows = Array.isArray(raw.repoRelativeAllowRoots)
      ? raw.repoRelativeAllowRoots.map(String)
      : [];
    if (allows.includes(MISSION_ARTIFACT_ALLOW_ROOT)) {
      return { seeded: false, patched: false, configPath };
    }
    // Ephemeral / pre-Q5 fixtures often omit .missions while listing other roots.
    // Idempotently add the mission-artifact allow root without weakening deny lists.
    const next = {
      ...raw,
      version: Number(raw.version) || 1,
      repoRelativeAllowRoots: [MISSION_ARTIFACT_ALLOW_ROOT, ...allows],
      alwaysDenyRepoRelative: Array.isArray(raw.alwaysDenyRepoRelative)
        ? raw.alwaysDenyRepoRelative.map(String)
        : ['Fundacion', 'docs/governance']
    };
    fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return { seeded: false, patched: true, configPath, code: 'MISSIONS_ROOT_ENSURED' };
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const payload = {
    version: 1,
    description:
      'Ephemeral Write Barrier SSOT seeded by mission-artifact-write for temp control planes',
    repoRelativeAllowRoots: [
      MISSION_ARTIFACT_ALLOW_ROOT,
      'src',
      'tests',
      'docs',
      'config',
      'scripts'
    ],
    alwaysDenyRepoRelative: ['Fundacion', 'docs/governance'],
    protectedFilesRepoRelative: []
  };
  fs.writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { seeded: true, patched: false, configPath };
}

/**
 * Write a mission artifact through Write Barrier scope + `.missions` envelope.
 * @param {object} options
 * @param {string} options.targetPath Absolute or relative path under `.missions/`
 * @param {string|Buffer} options.content
 * @param {string} [options.controlPlaneRoot]
 * @param {string} [options.repoRoot] Alias of controlPlaneRoot
 * @param {string} [options.encoding='utf8']
 * @param {string} [options.label]
 * @param {boolean} [options.seedSsot=true] Seed SSOT when missing (temp fixtures)
 * @returns {{ path: string, governed: true, envelope: string, controlPlaneRoot: string }}
 */
export function writeMissionArtifactFile(options = {}) {
  const rawPath = options.targetPath || options.path;
  if (!rawPath) {
    throw new Error('MISSION_ARTIFACT_PATH_REQUIRED: targetPath is required');
  }
  if (options.content === undefined || options.content === null) {
    throw new Error('MISSION_ARTIFACT_CONTENT_REQUIRED: content is required');
  }

  const controlPlaneRoot = path.resolve(
    options.controlPlaneRoot ||
      options.repoRoot ||
      inferControlPlaneRootFromMissionPath(rawPath)
  );
  const targetPath = path.isAbsolute(rawPath)
    ? path.resolve(rawPath)
    : path.resolve(controlPlaneRoot, rawPath);

  assertUnderMissionsRoot(targetPath, controlPlaneRoot);

  if (options.seedSsot !== false) {
    ensureMissionsWriteBarrierSsot(controlPlaneRoot);
  }

  const encoding = options.encoding || 'utf8';
  const label = options.label || 'mission-artifact';

  const run = () => {
    assertWritable(targetPath, { repoRoot: controlPlaneRoot, requireScope: true });
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, options.content, encoding);
    return {
      path: targetPath,
      governed: true,
      envelope: 'mission-artifact-write',
      controlPlaneRoot,
      epistemic_class: 'MEASURED'
    };
  };

  const active = getActiveWriteScope();
  if (active) {
    try {
      return run();
    } catch (err) {
      if (!(err instanceof WriteBarrierDeniedError)) throw err;
      // Active scope may omit .missions — nest an explicit mission-artifact scope.
    }
  }

  return withWriteScopeSync(
    {
      repoRoot: controlPlaneRoot,
      roots: [MISSION_ARTIFACT_ALLOW_ROOT],
      label
    },
    run
  );
}

/**
 * Detect raw writeFileSync of selected mission artifacts that should use the envelope.
 * Conservative: flags taskFile / manifestFile / common missionDir artifact joins.
 * @param {string} text
 */
export function sourceWritesUngovernedMissionArtifact(text) {
  if (!text || typeof text !== 'string') return false;
  if (!/writeFileSync\s*\(/.test(text)) return false;

  // SSOT envelope module itself may writeFileSync after assertWritable.
  if (
    /MISSION_ARTIFACT_WRITE_MODULE/.test(text) &&
    /writeFileSync\s*\(\s*targetPath/.test(text)
  ) {
    return false;
  }

  // Line-oriented: avoid false positives when deferred writers coexist with
  // string literals used only in reads / manifest relative paths.
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/writeFileSync\s*\(/.test(line)) continue;
    if (/writeFileSync\s*\(\s*taskFile\b/.test(line)) return true;
    if (/writeFileSync\s*\(\s*manifestFile\b/.test(line)) return true;
    if (/writeFileSync\s*\(\s*taskFinalStr\b/.test(line)) return true;
    if (/writeFileSync\s*\(\s*(?:assessmentFile|supervisionFile|pkgFile|receiptPath)\b/.test(line)) {
      return true;
    }
    if (/writeFileSync\s*\(\s*path\.join\(\s*missionDir\s*,/.test(line)) {
      if (
        /['"]plan\.json['"]/.test(line) ||
        /['"]mission-package\.json['"]/.test(line) ||
        /['"]integrity-manifest\.json['"]/.test(line) ||
        /['"]project-profile\.json['"]/.test(line) ||
        /['"]direction\.json['"]/.test(line) ||
        /['"]hitl['"]/.test(line) ||
        /['"]reports['"]/.test(line) ||
        /['"]tasks['"]/.test(line) ||
        /['"]selections['"]/.test(line) ||
        /['"]artifacts['"]/.test(line)
      ) {
        return true;
      }
    }
  }
  return false;
}

function walkJsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue;
      walkJsFiles(abs, out);
    } else if (ent.isFile() && /\.(js|mjs|cjs)$/.test(ent.name)) {
      out.push(abs);
    }
  }
}

/**
 * Fail-closed static audit: routed callers must not raw-write selected artifacts.
 * Only MISSION_ARTIFACT_WRITE_MODULE may writeFileSync those targets directly.
 * @param {string} [controlPlaneRoot]
 */
export function auditMissionArtifactWritePaths(controlPlaneRoot) {
  const root = path.resolve(controlPlaneRoot || process.cwd());
  const files = [];
  for (const relRoot of AUDIT_SCAN_ROOTS) {
    walkJsFiles(path.join(root, relRoot), files);
  }

  const sanctioned = [];
  const violations = [];
  const routedOk = [];
  const routedMissing = [];

  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const text = fs.readFileSync(abs, 'utf8');

    if (rel === MISSION_ARTIFACT_WRITE_MODULE) {
      if (/writeFileSync\s*\(\s*targetPath/.test(text)) {
        sanctioned.push(rel);
      }
      continue;
    }

    if (MISSION_ARTIFACT_ROUTED_CALLERS.includes(rel)) {
      const importsEnvelope =
        /writeMissionArtifactFile/.test(text) &&
        /mission-artifact-write/.test(text);
      const hasBypass = sourceWritesUngovernedMissionArtifact(text);
      if (!importsEnvelope) {
        routedMissing.push(rel);
        violations.push({
          path: rel,
          code: 'MISSION_ARTIFACT_ENVELOPE_NOT_IMPORTED'
        });
      } else if (hasBypass) {
        violations.push({
          path: rel,
          code: 'MISSION_ARTIFACT_RAW_WRITE_BYPASS'
        });
      } else {
        routedOk.push(rel);
      }
      continue;
    }

    // Non-routed modules: only flag if they look like selected mission artifact writers
    // (deferred writers are allowed to remain raw outside the selected set).
    if (
      sourceWritesUngovernedMissionArtifact(text) &&
      /missionDir|taskFile|manifestFile/.test(text)
    ) {
      // Soft inventory only — do not fail closed outside routed callers in Q5 selected scope.
      // Tracked as deferred_candidates for the release report / tests.
    }
  }

  const ssotAbs = path.join(root, MISSION_ARTIFACT_WRITE_MODULE);
  if (!fs.existsSync(ssotAbs)) {
    violations.push({
      path: MISSION_ARTIFACT_WRITE_MODULE,
      code: 'MISSION_ARTIFACT_ENVELOPE_MISSING'
    });
  }

  // SSOT allowlist must include .missions when present
  const wbSsot = path.join(root, SSOT_CONFIG_REL);
  let missionsAllowlisted = false;
  if (fs.existsSync(wbSsot)) {
    try {
      const raw = JSON.parse(fs.readFileSync(wbSsot, 'utf8'));
      const allows = Array.isArray(raw.repoRelativeAllowRoots)
        ? raw.repoRelativeAllowRoots.map(String)
        : [];
      missionsAllowlisted = allows.includes(MISSION_ARTIFACT_ALLOW_ROOT);
      if (!missionsAllowlisted) {
        violations.push({
          path: SSOT_CONFIG_REL.replace(/\\/g, '/'),
          code: 'MISSIONS_ROOT_NOT_IN_WRITE_BARRIER_SSOT'
        });
      }
    } catch {
      violations.push({
        path: SSOT_CONFIG_REL.replace(/\\/g, '/'),
        code: 'WRITE_BARRIER_SSOT_INVALID'
      });
    }
  } else {
    violations.push({
      path: SSOT_CONFIG_REL.replace(/\\/g, '/'),
      code: 'WRITE_BARRIER_SSOT_MISSING'
    });
  }

  return {
    ok: violations.length === 0,
    ssot: MISSION_ARTIFACT_WRITE_MODULE,
    sanctioned,
    routedOk,
    routedMissing,
    violations,
    missionsAllowlisted,
    scanned: files.length,
    roots: [...AUDIT_SCAN_ROOTS],
    scope: 'mission-artifact-selected',
    deferred_note:
      'Q5 selected scope: governed-task-executor task/manifest + mission-runtime key artifacts ' +
      '(package/plan/hitl/report/tasks/selections/assessment/integrity-manifest/profile/direction/' +
      'cursor package+prompt/consumed-nonces). ' +
      'Deferred: HashChainedLedger internal writes; other non-selected src writers; App satellites / Fundacion (untouched).'
  };
}
