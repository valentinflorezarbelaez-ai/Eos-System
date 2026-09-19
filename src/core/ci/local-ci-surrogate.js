/**
 * @module local-ci-surrogate
 * Post-L26 Workstream C — Local CI surrogate hardening while GitHub Actions
 * is billing-blocked.
 *
 * Fail-closed local gate that:
 *   - runs/wraps verify:strict OR records its result via an injected runner
 *   - checks freeze tip vs HEAD lag honesty (soft-import doctor-hud-honesty
 *     when present; otherwise uses built-in lag helpers / fixtures)
 *   - detects dirty tree (injected)
 *   - detects mission-pack drift via hash/identity of known mission test
 *     files and/or package.json script map
 *   - emits explicit ci_environment encoding BILLING_BLOCKED — never claims
 *     GitHub Actions green
 *
 * NON-CLAIM: Local success ≠ GitHub Actions success ≠ production readiness.
 * PRODUCTION_READY: NO
 * Fundacion Δ=0 · Law VI · never reopen L17–L26 · no L27
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const SURROGATE_SCHEMA = 'eos.local-ci-surrogate.v1';

/** @type {'NO'} */
export const SURROGATE_PRODUCTION_READY = 'NO';

/** Canonical freeze tip (Mission CP #365) — OBSERVED from post-L26 backlog. */
export const CANONICAL_FREEZE_TIP =
  '47cf1a790c95f78a79e34830c4d6515d16dc67d0';

export const FREEZE_GATE_REL = 'docs/releases/EOS_FREEZE_GATE_STATUS.md';

export const TIP_SHA_FLEX_RE = /^[0-9a-f]{7,40}$/i;
export const MAIN_TIP_LINE_RE = /^main_tip:\s*([0-9a-f]{7,40})\b/im;

/** Exit codes — deterministic for CLI / npm scripts. */
export const EXIT = Object.freeze({
  PASS: 0,
  FAIL: 1,
  MISSING_EVIDENCE: 2,
  DIRTY_TREE: 3,
  STALE_FREEZE: 4,
  MISSION_PACK_DRIFT: 5,
  VERIFY_STRICT_FAIL: 6,
  MISSING_PREREQUISITES: 7
});

export const FAILURE_CODES = Object.freeze({
  MISSING_EVIDENCE: 'MISSING_EVIDENCE',
  DIRTY_TREE: 'DIRTY_TREE',
  STALE_FREEZE: 'STALE_FREEZE',
  MISSION_PACK_DRIFT: 'MISSION_PACK_DRIFT',
  VERIFY_STRICT_FAIL: 'VERIFY_STRICT_FAIL',
  MISSING_PREREQUISITES: 'MISSING_PREREQUISITES',
  HONESTY_NOT_VERIFIED: 'HONESTY_NOT_VERIFIED'
});

/**
 * Fixed environment encoding. github_actions is NEVER 'PASS' / 'GREEN'.
 * Local surrogate ACTIVE does not imply remote CI success.
 */
export const CI_ENVIRONMENT_TEMPLATE = Object.freeze({
  github_actions: 'BILLING_BLOCKED',
  local_surrogate: 'ACTIVE',
  github_actions_verdict: 'NOT_RUN',
  note:
    'NON-CLAIM: local surrogate success ≠ GitHub Actions success ≠ production readiness'
});

export const BASELINE_NON_CLAIMS = Object.freeze([
  'NON-CLAIM: Local success ≠ GitHub Actions success ≠ production readiness',
  'NON-CLAIM: ci_environment.github_actions=BILLING_BLOCKED is environment limitation, NOT a green CI result',
  'NON-CLAIM: verify:strict local green ≠ GitHub Actions green',
  'NON-CLAIM: PRODUCTION_READY remains NO; Fundacion Δ=0',
  'NON-CLAIM: never reopen L17–L26; no L27'
]);

/** Default mission-pack SSOT needles (relative paths + package.json script keys). */
export const DEFAULT_MISSION_PACK_PATHS = Object.freeze([
  'tests/eos-m1-strict-verify-cp-lock.test.js',
  'tests/eos-m4-release-ssot-tip.test.js',
  'tests/eos-m5-ci-gameday-seam-pack.test.js'
]);

export const DEFAULT_MISSION_SCRIPT_KEYS = Object.freeze([
  'verify:strict',
  'test:m1',
  'test:m2',
  'test:m3',
  'test:m4',
  'test:m5',
  'ci'
]);

// ─── SHA / freeze helpers (fixture-friendly; soft-compat with honesty module) ─

export function normalizeSha(sha) {
  if (sha == null || sha === '') return null;
  const s = String(sha).trim().toLowerCase();
  if (!TIP_SHA_FLEX_RE.test(s)) return null;
  return s;
}

export function shortSha(sha, n = 7) {
  const s = normalizeSha(sha);
  return s ? s.slice(0, n) : null;
}

export function revsMatch(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length, 40);
  if (n < 7) return false;
  return x.slice(0, n) === y.slice(0, n);
}

export function parseFreezeMainTip(text) {
  if (text == null || typeof text !== 'string') return null;
  const m = text.match(MAIN_TIP_LINE_RE);
  return m ? normalizeSha(m[1]) : null;
}

/**
 * Measurable freeze-vs-HEAD lag. Prefer injected lagCommits; never invent match.
 */
export function measureFreezeLag(input = {}) {
  const freezeRevision =
    normalizeSha(input.freezeRevision) || parseFreezeMainTip(input.freezeText);
  const sourceRevision = normalizeSha(input.sourceRevision);
  const lagProvided =
    input.lagCommits !== undefined && input.lagCommits !== null;
  const lagCommits = lagProvided ? Number(input.lagCommits) : null;

  if (!freezeRevision || !sourceRevision) {
    return {
      epistemic: 'NOT_VERIFIED',
      freeze_revision: freezeRevision,
      freeze_revision_short: shortSha(freezeRevision),
      source_revision: sourceRevision,
      source_revision_short: shortSha(sourceRevision),
      match: false,
      lag_commits: lagCommits,
      lag_measurable: lagProvided && Number.isFinite(lagCommits),
      lag_label: 'UNKNOWN — missing freeze or source revision',
      stale: false
    };
  }

  const match = revsMatch(freezeRevision, sourceRevision);
  let lag_label;
  let lag_measurable = false;
  let stale = false;

  if (match) {
    lag_label = 'MATCH — HEAD equals freeze tip';
    lag_measurable = true;
  } else if (lagProvided && Number.isFinite(lagCommits)) {
    lag_measurable = true;
    if (lagCommits > 0) {
      lag_label = `HEAD_AHEAD — HEAD is ${lagCommits} commit(s) ahead of freeze`;
      // Ahead of freeze is expected post-seal tip growth; stale means freeze tip
      // itself is behind an *expected* freeze identity (caller sets expectedFreeze).
      stale = false;
    } else if (lagCommits < 0) {
      lag_label = `HEAD_BEHIND — HEAD is ${Math.abs(lagCommits)} commit(s) behind freeze`;
      stale = true;
    } else {
      lag_label =
        'DIVERGE — revisions differ but lag_commits=0 (topology unknown)';
      stale = true;
    }
  } else {
    lag_label =
      'DIVERGE — freeze ≠ HEAD; lag_commits not measured (provide lagCommits)';
    stale = true;
  }

  // Explicit expectedFreeze: if freeze tip identity drifted from canonical / expected.
  if (input.expectedFreeze) {
    const expected = normalizeSha(input.expectedFreeze);
    if (expected && !revsMatch(freezeRevision, expected)) {
      stale = true;
      lag_label = `STALE_FREEZE — freeze tip ${shortSha(freezeRevision)} ≠ expected ${shortSha(expected)}`;
    }
  }

  return {
    epistemic: 'OBSERVED',
    freeze_revision: freezeRevision,
    freeze_revision_short: shortSha(freezeRevision),
    source_revision: sourceRevision,
    source_revision_short: shortSha(sourceRevision),
    match,
    lag_commits: match ? 0 : lagCommits,
    lag_measurable: match ? true : lag_measurable,
    lag_label,
    stale
  };
}

/**
 * Soft-import doctor-hud-honesty measureRevisionLag when available.
 * Falls back to built-in measureFreezeLag (hermetic).
 */
export async function resolveLagHonesty(input = {}, options = {}) {
  const honestyPath = options.honestyModulePath;
  if (honestyPath) {
    try {
      const mod = await import(pathToFileURL(path.resolve(honestyPath)).href);
      if (typeof mod.measureRevisionLag === 'function') {
        const lag = mod.measureRevisionLag(input);
        // Map honesty shape → surrogate lag + stale detection
        const expected = normalizeSha(input.expectedFreeze);
        let stale = false;
        if (expected && lag.freeze_revision && !revsMatch(lag.freeze_revision, expected)) {
          stale = true;
        } else if (lag.match !== true && (lag.lag_commits == null || lag.lag_commits < 0)) {
          stale = lag.match !== true && !(lag.lag_commits > 0);
        }
        return { ...lag, stale, honesty_source: 'doctor-hud-honesty' };
      }
    } catch {
      /* fall through */
    }
  }
  return { ...measureFreezeLag(input), honesty_source: 'builtin' };
}

// ─── Dirty tree ──────────────────────────────────────────────────────────────

export function evaluateDirtyTree(input = {}) {
  const dirty = input.dirty === true;
  const dirtyPaths = Array.isArray(input.dirtyPaths)
    ? input.dirtyPaths.map(String)
    : [];
  const summary =
    input.dirtySummary ||
    (dirtyPaths.length
      ? `dirty paths: ${dirtyPaths.slice(0, 8).join(', ')}${
          dirtyPaths.length > 8 ? '…' : ''
        }`
      : dirty
        ? 'working tree dirty (paths not enumerated)'
        : 'working tree clean');

  if (!dirty) {
    return {
      dirty: false,
      blocked: false,
      reason: null,
      summary,
      dirty_paths: dirtyPaths
    };
  }

  return {
    dirty: true,
    blocked: true,
    reason: `DIRTY_TREE: surrogate gate blocked — ${summary}`,
    summary,
    dirty_paths: dirtyPaths
  };
}

// ─── Mission-pack identity / drift ───────────────────────────────────────────

export function sha256Hex(content) {
  return crypto.createHash('sha256').update(String(content), 'utf8').digest('hex');
}

/**
 * Build mission-pack identity from file contents + package.json script map.
 * Missing files are recorded; identity is fail-closed when any required path
 * is absent unless allowMissingPaths is true (host may supply subset).
 */
export function buildMissionPackIdentity(input = {}) {
  const root = input.root || null;
  const paths = Array.isArray(input.paths)
    ? input.paths.map(String)
    : [...DEFAULT_MISSION_PACK_PATHS];
  const scriptKeys = Array.isArray(input.scriptKeys)
    ? input.scriptKeys.map(String)
    : [...DEFAULT_MISSION_SCRIPT_KEYS];

  const files = {};
  const missing = [];

  for (const rel of paths) {
    if (input.fileContents && Object.prototype.hasOwnProperty.call(input.fileContents, rel)) {
      const body = input.fileContents[rel];
      if (body == null) {
        missing.push(rel);
        files[rel] = { present: false, sha256: null };
      } else {
        files[rel] = { present: true, sha256: sha256Hex(body) };
      }
      continue;
    }
    if (!root) {
      missing.push(rel);
      files[rel] = { present: false, sha256: null };
      continue;
    }
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      files[rel] = { present: false, sha256: null };
    } else {
      const body = fs.readFileSync(abs, 'utf8');
      files[rel] = { present: true, sha256: sha256Hex(body) };
    }
  }

  let scripts = {};
  if (input.scripts && typeof input.scripts === 'object') {
    for (const k of scriptKeys) {
      scripts[k] = input.scripts[k] != null ? String(input.scripts[k]) : null;
    }
  } else if (root) {
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const s = pkg.scripts || {};
      for (const k of scriptKeys) {
        scripts[k] = s[k] != null ? String(s[k]) : null;
      }
    } else {
      for (const k of scriptKeys) scripts[k] = null;
    }
  } else {
    for (const k of scriptKeys) scripts[k] = null;
  }

  const scriptFingerprint = sha256Hex(
    JSON.stringify(
      Object.fromEntries(scriptKeys.map((k) => [k, scripts[k]]))
    )
  );

  const fileFingerprint = sha256Hex(
    JSON.stringify(
      Object.fromEntries(paths.map((p) => [p, files[p]?.sha256 || null]))
    )
  );

  const identity = sha256Hex(`${fileFingerprint}:${scriptFingerprint}`);

  return {
    schema: 'eos.mission-pack-identity.v1',
    paths,
    script_keys: scriptKeys,
    files,
    scripts,
    missing_paths: missing,
    file_fingerprint: fileFingerprint,
    script_fingerprint: scriptFingerprint,
    identity
  };
}

/**
 * Compare observed mission-pack identity to expected SSOT.
 * Drift is NEVER silently tolerated.
 */
export function detectMissionPackDrift(observed, expected) {
  if (!expected || typeof expected !== 'object') {
    return {
      drifted: true,
      reason: 'MISSION_PACK_DRIFT: expected identity missing (SSOT required)',
      mismatches: ['expected_identity_absent']
    };
  }
  if (!observed || typeof observed !== 'object') {
    return {
      drifted: true,
      reason: 'MISSION_PACK_DRIFT: observed identity missing',
      mismatches: ['observed_identity_absent']
    };
  }

  const mismatches = [];

  if (
    expected.identity &&
    observed.identity &&
    expected.identity !== observed.identity
  ) {
    mismatches.push(
      `identity: observed=${observed.identity.slice(0, 12)}… expected=${expected.identity.slice(0, 12)}…`
    );
  }

  if (
    expected.file_fingerprint &&
    observed.file_fingerprint &&
    expected.file_fingerprint !== observed.file_fingerprint
  ) {
    mismatches.push('file_fingerprint mismatch');
  }

  if (
    expected.script_fingerprint &&
    observed.script_fingerprint &&
    expected.script_fingerprint !== observed.script_fingerprint
  ) {
    mismatches.push('script_fingerprint mismatch');
  }

  const expFiles = expected.files || {};
  const obsFiles = observed.files || {};
  for (const rel of new Set([...Object.keys(expFiles), ...Object.keys(obsFiles)])) {
    const e = expFiles[rel];
    const o = obsFiles[rel];
    if (!e || !o) {
      mismatches.push(`file ${rel}: presence mismatch`);
      continue;
    }
    if (e.sha256 && o.sha256 && e.sha256 !== o.sha256) {
      mismatches.push(`file ${rel}: sha256 drift`);
    }
    if (e.present !== o.present) {
      mismatches.push(`file ${rel}: present ${o.present} ≠ expected ${e.present}`);
    }
  }

  const expScripts = expected.scripts || {};
  const obsScripts = observed.scripts || {};
  for (const k of new Set([
    ...Object.keys(expScripts),
    ...Object.keys(obsScripts)
  ])) {
    if ((expScripts[k] || null) !== (obsScripts[k] || null)) {
      mismatches.push(`script ${k}: drift`);
    }
  }

  if (Array.isArray(observed.missing_paths) && observed.missing_paths.length) {
    // Missing required SSOT paths count as drift when expected said present
    for (const rel of observed.missing_paths) {
      if (expFiles[rel]?.present === true) {
        mismatches.push(`file ${rel}: missing but expected present`);
      }
    }
  }

  const drifted = mismatches.length > 0;
  return {
    drifted,
    reason: drifted
      ? `MISSION_PACK_DRIFT: ${mismatches.slice(0, 6).join('; ')}${
          mismatches.length > 6 ? '…' : ''
        }`
      : null,
    mismatches
  };
}

// ─── verify:strict runner injection ──────────────────────────────────────────

/**
 * Default no-op runner — callers MUST inject for live host runs.
 * Returns { ok, exitCode, stdout, stderr, evidence }.
 */
export async function defaultVerifyStrictRunner(_opts = {}) {
  return {
    ok: false,
    exitCode: EXIT.MISSING_PREREQUISITES,
    stdout: '',
    stderr: 'verify:strict runner not injected — refuse to invent a pass',
    evidence: null,
    skipped: false,
    missing_runner: true
  };
}

/**
 * Record or execute verify:strict via injected runner.
 * Fail-closed when runner missing and no pre-recorded evidence.
 */
export async function runOrRecordVerifyStrict(input = {}) {
  if (input.recordedResult && typeof input.recordedResult === 'object') {
    const r = input.recordedResult;
    const ok = r.ok === true && Number(r.exitCode) === 0;
    return {
      ok,
      exitCode: ok ? 0 : Number(r.exitCode ?? EXIT.VERIFY_STRICT_FAIL),
      stdout: r.stdout != null ? String(r.stdout) : '',
      stderr: r.stderr != null ? String(r.stderr) : '',
      evidence: r.evidence ?? null,
      source: 'recorded',
      pass_count: r.pass_count ?? null,
      fail_count: r.fail_count ?? null
    };
  }

  const runner =
    typeof input.runner === 'function'
      ? input.runner
      : defaultVerifyStrictRunner;

  const result = await runner({
    cwd: input.cwd,
    args: input.args || ['--strict']
  });

  if (result && result.missing_runner) {
    return {
      ok: false,
      exitCode: EXIT.MISSING_PREREQUISITES,
      stdout: '',
      stderr: result.stderr,
      evidence: null,
      source: 'missing_runner',
      pass_count: null,
      fail_count: null
    };
  }

  const ok = result?.ok === true && Number(result?.exitCode ?? 1) === 0;
  return {
    ok,
    exitCode: ok ? 0 : Number(result?.exitCode ?? EXIT.VERIFY_STRICT_FAIL),
    stdout: result?.stdout != null ? String(result.stdout) : '',
    stderr: result?.stderr != null ? String(result.stderr) : '',
    evidence: result?.evidence ?? null,
    source: 'runner',
    pass_count: result?.pass_count ?? null,
    fail_count: result?.fail_count ?? null
  };
}

// ─── Prerequisites ───────────────────────────────────────────────────────────

/**
 * Documented prerequisites for local verify:strict / surrogate.
 * Missing critical evidence → MISSING_EVIDENCE / MISSING_PREREQUISITES.
 */
export function checkPrerequisites(input = {}) {
  const missing = [];
  const notes = [];

  const requireNode = input.requireNode !== false;
  if (requireNode) {
    const major = Number(process.versions.node.split('.')[0]);
    if (!Number.isFinite(major) || major < 18) {
      missing.push('node>=18');
    } else {
      notes.push(`node=${process.versions.node}`);
    }
  }

  if (input.requireFreezeText === true && !input.freezeText && !input.freezeRevision) {
    missing.push('freeze_tip_evidence');
  }

  if (input.requireSourceRevision === true && !input.sourceRevision) {
    missing.push('source_revision_HEAD');
  }

  if (input.requireMissionPackExpected === true && !input.expectedMissionPack) {
    missing.push('mission_pack_ssot_expected');
  }

  if (input.requireVerifyEvidence === true) {
    // Any recordedResult object counts as evidence (pass OR fail).
    // Absence of both recordedResult and runner is the missing-prereq case.
    const hasRecorded =
      input.recordedResult != null && typeof input.recordedResult === 'object';
    const hasRunner = typeof input.runner === 'function';
    if (!hasRecorded && !hasRunner) {
      missing.push('verify_strict_evidence_or_runner');
    }
  }

  if (Array.isArray(input.extraRequired)) {
    for (const item of input.extraRequired) {
      if (!item.ok) missing.push(String(item.name || 'extra'));
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    notes,
    documented: [
      'Node.js >= 18 (L0 builtins only; no npm install required for surrogate itself)',
      'Working tree checkout of Eos system (host path)',
      'Freeze tip evidence: docs/releases/EOS_FREEZE_GATE_STATUS.md main_tip OR injected freezeRevision',
      'HEAD source revision (git rev-parse HEAD) OR injected sourceRevision',
      'Mission-pack SSOT expected identity (fixture or host-generated)',
      'verify:strict via npm run verify:strict OR injected runner / recordedResult',
      'Clean working tree OR explicit dirty acknowledgement (dirty → fail-closed)',
      'GitHub Actions billing-blocked: encode as ci_environment limitation — never claim GH green'
    ]
  };
}

// ─── ci_environment encoding ─────────────────────────────────────────────────

/**
 * Always emit BILLING_BLOCKED for github_actions.
 * Never map local pass → GH green.
 */
export function buildCiEnvironment(overrides = {}) {
  const env = {
    ...CI_ENVIRONMENT_TEMPLATE,
    ...overrides,
    // Hard pin — overrides cannot claim GH green
    github_actions: 'BILLING_BLOCKED',
    local_surrogate: overrides.local_surrogate || 'ACTIVE',
    github_actions_verdict:
      overrides.github_actions_verdict === 'NOT_RUN' ||
      overrides.github_actions_verdict == null
        ? 'NOT_RUN'
        : 'NOT_RUN'
  };

  // Refuse any attempt to claim GH pass/green via overrides
  if (
    overrides.github_actions === 'PASS' ||
    overrides.github_actions === 'GREEN' ||
    overrides.github_actions === 'SUCCESS' ||
    overrides.github_actions_verdict === 'PASS' ||
    overrides.github_actions_verdict === 'GREEN'
  ) {
    env.refusal =
      'REFUSED claim of GitHub Actions green while billing-blocked; forced NOT_RUN';
  }

  return env;
}

// ─── Main gate ───────────────────────────────────────────────────────────────

/**
 * Run the local CI surrogate gate (fail-closed).
 *
 * @param {object} input
 * @param {string} [input.freezeRevision]
 * @param {string} [input.freezeText]
 * @param {string} [input.sourceRevision] HEAD
 * @param {number|null} [input.lagCommits]
 * @param {string} [input.expectedFreeze] canonical freeze tip identity
 * @param {boolean} [input.dirty]
 * @param {string[]} [input.dirtyPaths]
 * @param {object} [input.expectedMissionPack] SSOT identity
 * @param {object} [input.observedMissionPack] prebuilt observed identity
 * @param {string} [input.root] repo root for identity build
 * @param {object} [input.fileContents] fixture file map
 * @param {object} [input.scripts] package.json scripts map
 * @param {Function} [input.runner] async verify:strict runner
 * @param {object} [input.recordedResult] pre-recorded verify:strict result
 * @param {boolean} [input.skipVerifyStrict] skip verify step (tests only; still needs evidence flag)
 * @returns {Promise<object>} gate record
 */
export async function runLocalCiSurrogate(input = {}) {
  const failures = [];
  const expectedFreeze =
    normalizeSha(input.expectedFreeze) || CANONICAL_FREEZE_TIP;

  // 1) Prerequisites
  const prereq = checkPrerequisites({
    freezeText: input.freezeText,
    freezeRevision: input.freezeRevision,
    sourceRevision: input.sourceRevision,
    expectedMissionPack: input.expectedMissionPack,
    recordedResult: input.recordedResult,
    runner: input.runner,
    requireFreezeText: input.requireFreezeText !== false,
    requireSourceRevision: input.requireSourceRevision !== false,
    requireMissionPackExpected: input.requireMissionPackExpected !== false,
    requireVerifyEvidence:
      input.skipVerifyStrict === true
        ? false
        : input.requireVerifyEvidence !== false,
    extraRequired: input.extraRequired
  });

  if (!prereq.ok) {
    const code = prereq.missing.includes('verify_strict_evidence_or_runner')
      ? FAILURE_CODES.MISSING_PREREQUISITES
      : FAILURE_CODES.MISSING_EVIDENCE;
    failures.push({
      code,
      detail: `missing: ${prereq.missing.join(', ')}`
    });
  }

  // 2) Dirty tree
  const dirty = evaluateDirtyTree({
    dirty: input.dirty,
    dirtyPaths: input.dirtyPaths,
    dirtySummary: input.dirtySummary
  });
  if (dirty.blocked) {
    failures.push({
      code: FAILURE_CODES.DIRTY_TREE,
      detail: dirty.reason
    });
  }

  // 3) Freeze / HEAD lag honesty
  const lag = await resolveLagHonesty(
    {
      freezeRevision: input.freezeRevision,
      freezeText: input.freezeText,
      sourceRevision: input.sourceRevision,
      lagCommits: input.lagCommits,
      expectedFreeze
    },
    { honestyModulePath: input.honestyModulePath }
  );

  if (lag.epistemic === 'NOT_VERIFIED') {
    failures.push({
      code: FAILURE_CODES.HONESTY_NOT_VERIFIED,
      detail: lag.lag_label
    });
  } else if (lag.stale === true) {
    failures.push({
      code: FAILURE_CODES.STALE_FREEZE,
      detail: lag.lag_label
    });
  }

  // 4) Mission-pack drift (SSOT)
  let observed =
    input.observedMissionPack ||
    buildMissionPackIdentity({
      root: input.root,
      paths: input.missionPackPaths,
      scriptKeys: input.missionScriptKeys,
      fileContents: input.fileContents,
      scripts: input.scripts
    });

  let drift = { drifted: false, reason: null, mismatches: [] };
  if (input.expectedMissionPack) {
    drift = detectMissionPackDrift(observed, input.expectedMissionPack);
    if (drift.drifted) {
      failures.push({
        code: FAILURE_CODES.MISSION_PACK_DRIFT,
        detail: drift.reason,
        mismatches: drift.mismatches
      });
    }
  }

  // 5) verify:strict
  let verify = {
    ok: null,
    exitCode: null,
    source: 'skipped',
    pass_count: null,
    fail_count: null,
    stdout: '',
    stderr: ''
  };

  if (input.skipVerifyStrict === true) {
    verify = {
      ok: true,
      exitCode: 0,
      source: 'skipped_by_flag',
      pass_count: null,
      fail_count: null,
      stdout: '',
      stderr: 'verify:strict skipped by explicit flag (fixture/test only)'
    };
  } else if (
    prereq.ok ||
    input.recordedResult ||
    typeof input.runner === 'function'
  ) {
    verify = await runOrRecordVerifyStrict({
      runner: input.runner,
      recordedResult: input.recordedResult,
      cwd: input.root || input.cwd
    });
    if (!verify.ok) {
      const code =
        verify.source === 'missing_runner'
          ? FAILURE_CODES.MISSING_PREREQUISITES
          : FAILURE_CODES.VERIFY_STRICT_FAIL;
      // Avoid duplicate missing-prereq if already recorded
      if (
        !failures.some(
          (f) =>
            f.code === code &&
            code === FAILURE_CODES.MISSING_PREREQUISITES
        )
      ) {
        failures.push({
          code,
          detail:
            verify.stderr ||
            `verify:strict failed exit=${verify.exitCode}`
        });
      } else if (code === FAILURE_CODES.VERIFY_STRICT_FAIL) {
        failures.push({
          code,
          detail:
            verify.stderr ||
            `verify:strict failed exit=${verify.exitCode}`
        });
      }
    }
  }

  // 6) ci_environment — always BILLING_BLOCKED; never GH green
  const ci_environment = buildCiEnvironment(input.ciEnvironmentOverrides);

  const ok = failures.length === 0;
  const primary = ok ? null : failures[0].code;

  const exitCode = ok
    ? EXIT.PASS
    : primary === FAILURE_CODES.MISSING_EVIDENCE
      ? EXIT.MISSING_EVIDENCE
      : primary === FAILURE_CODES.DIRTY_TREE
        ? EXIT.DIRTY_TREE
        : primary === FAILURE_CODES.STALE_FREEZE ||
            primary === FAILURE_CODES.HONESTY_NOT_VERIFIED
          ? EXIT.STALE_FREEZE
          : primary === FAILURE_CODES.MISSION_PACK_DRIFT
            ? EXIT.MISSION_PACK_DRIFT
            : primary === FAILURE_CODES.VERIFY_STRICT_FAIL
              ? EXIT.VERIFY_STRICT_FAIL
              : primary === FAILURE_CODES.MISSING_PREREQUISITES
                ? EXIT.MISSING_PREREQUISITES
                : EXIT.FAIL;

  const non_claims = [
    ...BASELINE_NON_CLAIMS,
    ...(Array.isArray(input.extraNonClaims) ? input.extraNonClaims : [])
  ];

  return {
    schema: SURROGATE_SCHEMA,
    PRODUCTION_READY: SURROGATE_PRODUCTION_READY,
    ok,
    exit_code: exitCode,
    primary_failure: primary,
    failures,
    ci_environment,
    prerequisites: prereq,
    dirty,
    freeze_lag: lag,
    mission_pack: {
      observed,
      expected_identity: input.expectedMissionPack?.identity ?? null,
      drift
    },
    verify_strict: {
      ok: verify.ok,
      exit_code: verify.exitCode,
      source: verify.source,
      pass_count: verify.pass_count,
      fail_count: verify.fail_count,
      evidence: verify.evidence ?? null
    },
    non_claims,
    note: ok
      ? 'LOCAL_SURROGATE_PASS — environment limitation BILLING_BLOCKED recorded; NOT a GitHub Actions green'
      : `LOCAL_SURROGATE_FAIL — ${primary}`,
    fundacion_delta: 0,
    law_vi: true
  };
}

/**
 * Map gate result to process exit code (deterministic).
 */
export function exitCodeFromGate(gate) {
  if (!gate || typeof gate !== 'object') return EXIT.FAIL;
  if (typeof gate.exit_code === 'number') return gate.exit_code;
  return gate.ok ? EXIT.PASS : EXIT.FAIL;
}

/**
 * CLI-friendly summary string (no ANSI).
 */
export function formatGateSummary(gate) {
  if (!gate) return 'local-ci-surrogate: no gate result';
  const lines = [
    `schema: ${gate.schema}`,
    `ok: ${gate.ok}`,
    `exit_code: ${gate.exit_code}`,
    `PRODUCTION_READY: ${gate.PRODUCTION_READY}`,
    `ci_environment.github_actions: ${gate.ci_environment?.github_actions}`,
    `ci_environment.local_surrogate: ${gate.ci_environment?.local_surrogate}`,
    `ci_environment.github_actions_verdict: ${gate.ci_environment?.github_actions_verdict}`,
    `freeze_lag: ${gate.freeze_lag?.lag_label || 'n/a'}`,
    `dirty: ${gate.dirty?.dirty === true}`,
    `mission_pack.drifted: ${gate.mission_pack?.drift?.drifted === true}`,
    `verify_strict.ok: ${gate.verify_strict?.ok}`,
    `primary_failure: ${gate.primary_failure || 'none'}`,
    `note: ${gate.note}`
  ];
  for (const nc of gate.non_claims || []) {
    lines.push(`  ${nc}`);
  }
  return lines.join('\n');
}

// Avoid unused import lint in some bundlers — createRequire reserved for host glue
void createRequire;
