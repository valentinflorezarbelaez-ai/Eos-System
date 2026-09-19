/**
 * Minimal local-ci-surrogate fixture double for hermetic Mission CQ tests.
 * Preserves BILLING_BLOCKED / ACTIVE / NOT_RUN encoding.
 * Soft-import of real local-ci-surrogate.js is preferred when present on host.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

export const SURROGATE_SCHEMA = 'eos.local-ci-surrogate.v1';
/** @type {'NO'} */
export const SURROGATE_PRODUCTION_READY = 'NO';

export const CI_ENVIRONMENT_TEMPLATE = Object.freeze({
  github_actions: 'BILLING_BLOCKED',
  local_surrogate: 'ACTIVE',
  github_actions_verdict: 'NOT_RUN',
  note:
    'NON-CLAIM: local surrogate success ≠ GitHub Actions success ≠ production readiness'
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

export function buildCiEnvironment(overrides = {}) {
  const env = {
    ...CI_ENVIRONMENT_TEMPLATE,
    ...overrides,
    github_actions: 'BILLING_BLOCKED',
    local_surrogate: overrides.local_surrogate || 'ACTIVE',
    github_actions_verdict: 'NOT_RUN'
  };
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

function sha256Hex(content) {
  return createHash('sha256').update(String(content), 'utf8').digest('hex');
}

/**
 * Minimal fail-closed surrogate gate (fixture double).
 * Honors dirty / stale / drift / verify matrix from input.
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function runLocalCiSurrogate(input = {}) {
  const failures = [];

  if (input.dirty === true) {
    failures.push({
      code: FAILURE_CODES.DIRTY_TREE,
      detail: 'DIRTY_TREE: fixture double blocked'
    });
  }

  if (input.stale === true || input.freezeStale === true) {
    failures.push({
      code: FAILURE_CODES.STALE_FREEZE,
      detail: 'STALE_FREEZE: fixture double blocked'
    });
  }

  if (input.drift === true || input.missionPackDrift === true) {
    failures.push({
      code: FAILURE_CODES.MISSION_PACK_DRIFT,
      detail: 'MISSION_PACK_DRIFT: fixture double blocked'
    });
  }

  let verifyOk = true;
  if (input.recordedResult && typeof input.recordedResult === 'object') {
    verifyOk =
      input.recordedResult.ok === true &&
      Number(input.recordedResult.exitCode ?? 1) === 0;
  } else if (input.verifyFail === true) {
    verifyOk = false;
  } else if (input.skipVerifyStrict === true) {
    verifyOk = true;
  } else if (
    input.requireVerifyEvidence !== false &&
    input.recordedResult == null &&
    typeof input.runner !== 'function' &&
    input.skipVerifyStrict !== true &&
    input.assumeVerifyPass !== true
  ) {
    failures.push({
      code: FAILURE_CODES.MISSING_PREREQUISITES,
      detail: 'missing: verify_strict_evidence_or_runner'
    });
    verifyOk = false;
  }

  if (!verifyOk && !failures.some((f) => f.code === FAILURE_CODES.MISSING_PREREQUISITES)) {
    failures.push({
      code: FAILURE_CODES.VERIFY_STRICT_FAIL,
      detail: 'verify:strict failed (fixture double)'
    });
  }

  if (input.missingEvidence === true) {
    failures.push({
      code: FAILURE_CODES.MISSING_EVIDENCE,
      detail: 'missing evidence (fixture double)'
    });
  }

  const ok = failures.length === 0;
  const primary = ok ? null : failures[0].code;
  const ci_environment = buildCiEnvironment(input.ciEnvironmentOverrides);

  return {
    schema: SURROGATE_SCHEMA,
    PRODUCTION_READY: SURROGATE_PRODUCTION_READY,
    ok,
    exit_code: ok ? 0 : 1,
    primary_failure: primary,
    failures,
    ci_environment,
    dirty: {
      dirty: input.dirty === true,
      blocked: input.dirty === true
    },
    freeze_lag: {
      stale: input.stale === true || input.freezeStale === true,
      lag_label:
        input.stale || input.freezeStale
          ? 'STALE_FREEZE — fixture'
          : 'MATCH — fixture'
    },
    mission_pack: {
      drift: {
        drifted: input.drift === true || input.missionPackDrift === true
      }
    },
    verify_strict: {
      ok: verifyOk,
      exit_code: verifyOk ? 0 : 6,
      source: input.skipVerifyStrict
        ? 'skipped_by_flag'
        : input.recordedResult
          ? 'recorded'
          : input.assumeVerifyPass
            ? 'assumed_fixture'
            : 'fixture'
    },
    non_claims: [
      'NON-CLAIM: Local success ≠ GitHub Actions success ≠ production readiness'
    ],
    note: ok
      ? 'LOCAL_SURROGATE_PASS — BILLING_BLOCKED recorded; NOT a GitHub Actions green'
      : `LOCAL_SURROGATE_FAIL — ${primary}`,
    fundacion_delta: 0,
    law_vi: true,
    _fixture: true,
    _identity: sha256Hex(`fixture:${ok}:${primary}`)
  };
}

export default {
  SURROGATE_SCHEMA,
  SURROGATE_PRODUCTION_READY,
  CI_ENVIRONMENT_TEMPLATE,
  FAILURE_CODES,
  buildCiEnvironment,
  runLocalCiSurrogate
};
