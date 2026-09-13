/**
 * @module ast-policy-gate
 * SPEC-0056 / Mission AY — Fail-closed DENY helpers for AST & Semantic Graph
 * Reasoning Port.
 *
 * Codes: PATH_NOT_ALLOWLISTED, SYNTAX_ERROR, MALFORMED_GRAPH, UNSAFE_QUERY,
 * INVALID_REQUEST, FUNDACION_DENY, QUERY_EMPTY, MISSING_DEP.
 *
 * NON-CLAIM:
 *   policy-gate ≠ full IDE / ≠ language-server marketplace /
 *   ≠ CloudAgent code intelligence SaaS
 *   not AZ/BA/BB
 *   Fundacion Δ=0 (ALWAYS DENY default)
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AY_POLICY_GATE_PRODUCTION_READY = 'NO';

export const AY_POLICY_GATE_KIND = 'eos-ast-semantic-policy-gate';

export const AY_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  PATH_NOT_ALLOWLISTED: 'PATH_NOT_ALLOWLISTED',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  MALFORMED_GRAPH: 'MALFORMED_GRAPH',
  UNSAFE_QUERY: 'UNSAFE_QUERY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  FUNDACION_DENY: 'FUNDACION_DENY',
  QUERY_EMPTY: 'QUERY_EMPTY',
  MISSING_DEP: 'MISSING_DEP',
  COMPLETED: 'COMPLETED'
});

/** Default hermetic allowlisted artifact paths (fixtures / in-memory only). */
export const DEFAULT_ALLOWLISTED_PATHS = Object.freeze([
  'fixtures/hello.js',
  'fixtures/sample-module.js',
  'fixtures/allowlisted-module.js',
  'src/core/developer-engine/ast-semantic-port.js',
  'workspace/allowlisted-artifact.js',
  'memory://fixture'
]);

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    code: code || AY_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyPathNotAllowlisted(
  reason = 'path not allowlisted',
  extra = {}
) {
  return deny(AY_POLICY_CODES.PATH_NOT_ALLOWLISTED, reason, extra);
}

export function denySyntaxError(reason = 'syntax error', extra = {}) {
  return deny(AY_POLICY_CODES.SYNTAX_ERROR, reason, extra);
}

export function denyMalformedGraph(reason = 'malformed graph', extra = {}) {
  return deny(AY_POLICY_CODES.MALFORMED_GRAPH, reason, extra);
}

export function denyUnsafeQuery(reason = 'unsafe query', extra = {}) {
  return deny(AY_POLICY_CODES.UNSAFE_QUERY, reason, extra);
}

export function denyInvalidRequest(reason = 'invalid request', extra = {}) {
  return deny(AY_POLICY_CODES.INVALID_REQUEST, reason, extra);
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(AY_POLICY_CODES.FUNDACION_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyQueryEmpty(reason = 'query empty', extra = {}) {
  return deny(AY_POLICY_CODES.QUERY_EMPTY, reason, extra);
}

/**
 * Check artifact path against allowlist (exact, basename, or memory://).
 * In-memory source-only requests may use artifactPath null with sourceText —
 * caller handles that. This gate checks path when present.
 * @param {unknown} artifactPath
 * @param {Iterable<string>|string[]} [allowlist]
 * @returns {{ ok: boolean, code: string, reason: string|null, artifactPath?: string }}
 */
export function checkPathAllowlisted(
  artifactPath,
  allowlist = DEFAULT_ALLOWLISTED_PATHS
) {
  if (
    artifactPath == null ||
    typeof artifactPath !== 'string' ||
    !artifactPath.trim()
  ) {
    return {
      ok: false,
      code: AY_POLICY_CODES.INVALID_REQUEST,
      reason: 'artifactPath required when path-gated'
    };
  }
  const path = String(artifactPath).trim().replace(/\\/g, '/');
  const set = new Set([...allowlist].map((p) => String(p).replace(/\\/g, '/')));
  if (set.has(path)) {
    return {
      ok: true,
      code: AY_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  // memory:// fixtures
  if (path.startsWith('memory://') && set.has('memory://fixture')) {
    return {
      ok: true,
      code: AY_POLICY_CODES.OK,
      reason: null,
      artifactPath: path
    };
  }
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  for (const a of set) {
    const ab = a.includes('/') ? a.slice(a.lastIndexOf('/') + 1) : a;
    if (ab === base && base.length > 0) {
      return {
        ok: true,
        code: AY_POLICY_CODES.OK,
        reason: null,
        artifactPath: path
      };
    }
  }
  return {
    ok: false,
    code: AY_POLICY_CODES.PATH_NOT_ALLOWLISTED,
    reason: 'path not allowlisted',
    artifactPath: path
  };
}

/**
 * Unsafe query detector — reject eval/exec/network/filesystem escape patterns.
 * @param {unknown} query
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function checkQuerySafe(query) {
  if (query == null) {
    return {
      ok: false,
      code: AY_POLICY_CODES.QUERY_EMPTY,
      reason: 'query required'
    };
  }
  if (typeof query === 'string' && !query.trim()) {
    return {
      ok: false,
      code: AY_POLICY_CODES.QUERY_EMPTY,
      reason: 'query empty'
    };
  }
  const blob =
    typeof query === 'string'
      ? query
      : typeof query === 'object'
        ? JSON.stringify(query)
        : String(query);
  // Reject obvious unsafe / escape patterns (hermetic fail-closed)
  if (
    /\b(?:eval|Function|execSync|spawnSync|child_process|process\.exit)\b/.test(
      blob
    ) ||
    /\b(?:fetch|http\.request|net\.connect)\s*\(/.test(blob) ||
    /\.\.\/|\.\.\\/.test(blob)
  ) {
    return {
      ok: false,
      code: AY_POLICY_CODES.UNSAFE_QUERY,
      reason: 'unsafe query pattern'
    };
  }
  return { ok: true, code: AY_POLICY_CODES.OK, reason: null };
}

/**
 * Create a policy-gate surface with injectable allowlist.
 * @param {object} [opts]
 * @param {string[]} [opts.allowlistedPaths]
 * @returns {object}
 */
export function createAstPolicyGate(opts = {}) {
  const allowlisted = [
    ...(opts.allowlistedPaths ||
      opts.allowlistedArtifacts ||
      DEFAULT_ALLOWLISTED_PATHS)
  ];

  return {
    kind: AY_POLICY_GATE_KIND,
    PRODUCTION_READY: AY_POLICY_GATE_PRODUCTION_READY,
    codes: AY_POLICY_CODES,
    deny,
    denyPathNotAllowlisted,
    denySyntaxError,
    denyMalformedGraph,
    denyUnsafeQuery,
    denyInvalidRequest,
    denyFundacion,
    denyQueryEmpty,
    checkPathAllowlisted: (p) => checkPathAllowlisted(p, allowlisted),
    checkQuerySafe,
    listAllowlistedPaths: () => [...allowlisted],
    // NON-CLAIM surface
    fullIde: false,
    languageServerMarketplace: false,
    cloudAgentCodeIntelligence: false,
    cloudAgent: false,
    fundacionDelta: 0
  };
}

export default {
  AY_POLICY_GATE_KIND,
  AY_POLICY_GATE_PRODUCTION_READY,
  AY_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyPathNotAllowlisted,
  denySyntaxError,
  denyMalformedGraph,
  denyUnsafeQuery,
  denyInvalidRequest,
  denyFundacion,
  denyQueryEmpty,
  checkPathAllowlisted,
  checkQuerySafe,
  createAstPolicyGate
};
