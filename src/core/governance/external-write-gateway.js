/**
 * @module external-write-gateway
 * SPEC-0025a / Mission T-gate — External Project Write-Barrier Gateway L2.
 *
 * Fail-closed overlay that authorizes writes against a **hermetic fixture
 * project root** only after six Level-2 preconditions are satisfied.
 * Additive: does NOT mutate write-barrier always-deny for real Fundacion
 * (ADR-0013 / FUNDACION_ALWAYS_DENY / Δ=0 intact).
 *
 * NON-CLAIM:
 *   Gateway allow ≠ Fundacion Δ=0 flipped.
 *   Hermetic fixture ≠ production Fundacion (Documents/Fundacion).
 *   Level-2 receipts ≠ PRODUCTION_READY.
 *   Does NOT claim CloudAgent path or PRODUCTION_READY=YES.
 *   Does NOT weaken write-barrier FUNDACION_ALWAYS_DENY for real Fundacion.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 * Prefer not mutating src/core/write-barrier/* (gateway is additive overlay).
 */

import { createHash } from 'node:crypto';
import path from 'node:path';

/** @type {'NO'} */
export const EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY = 'NO';

export const EXTERNAL_WRITE_GATEWAY_KIND = 'eos-external-write-gateway-l2';

/** Six Level-2 preconditions — all required; fail-closed. */
export const EXTERNAL_WRITE_PRECONDITIONS = Object.freeze([
  'REGISTERED',
  'INTAKE_COMPLETE',
  'SPEC_APPROVED',
  'AUDIT_COMPLETE',
  'OWNER_APPROVAL',
  'LEVEL_2_AUTHORIZED'
]);

export const EXTERNAL_WRITE_CODES = Object.freeze({
  EXTERNAL_WRITE_PRECONDITION_FAILED: 'EXTERNAL_WRITE_PRECONDITION_FAILED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  OUTSIDE_HERMETIC_FIXTURE: 'OUTSIDE_HERMETIC_FIXTURE',
  EXTERNAL_WRITE_VERIFIER_FAILED: 'EXTERNAL_WRITE_VERIFIER_FAILED',
  EXTERNAL_WRITE_APPLY_FAILED: 'EXTERNAL_WRITE_APPLY_FAILED',
  EXTERNAL_WRITE_DENIED: 'EXTERNAL_WRITE_DENIED'
});

/**
 * Typed error for external write gateway failures.
 */
export class ExternalWriteGatewayError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_DENIED, details = {}) {
    super(message);
    this.name = 'ExternalWriteGatewayError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * Windows-safe path normalize (mirrors write-barrier/paths normalizeBarrierPath).
 * @param {string} input
 * @returns {string}
 */
export function normalizeGatewayPath(input) {
  return String(input || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .toLowerCase();
}

/**
 * Default detector for real Fundacion paths (Documents/Fundacion + /Fundacion/
 * segments) — same semantics as write-barrier `isFundacionPath`.
 * @param {string} p
 * @returns {boolean}
 */
export function defaultIsRealFundacionPath(p) {
  const normalized = normalizeGatewayPath(p);
  if (!normalized) return false;
  if (normalized.includes('documents/fundacion')) return true;
  return /(^|\/)fundacion(\/|$)/.test(normalized);
}

/**
 * True only if targetPath resolves inside fixtureRoot (hermetic sandbox).
 * @param {string} targetPath
 * @param {string} fixtureRoot
 * @returns {boolean}
 */
export function isHermeticFixturePath(targetPath, fixtureRoot) {
  if (!fixtureRoot) return false;
  const cand = normalizeGatewayPath(path.resolve(String(targetPath || '')));
  const base = normalizeGatewayPath(path.resolve(String(fixtureRoot))).replace(/\/$/, '');
  if (!base) return false;
  return cand === base || cand.startsWith(`${base}/`);
}

/**
 * Always-deny helper for real Fundacion-looking paths.
 * @param {string} targetPath
 * @param {(p: string) => boolean} [isRealFundacionPath]
 * @returns {{ allowed: false, reason: 'FUNDACION_ALWAYS_DENY', path: string, PRODUCTION_READY: 'NO' } | null}
 */
export function denyRealFundacion(targetPath, isRealFundacionPath = defaultIsRealFundacionPath) {
  if (isRealFundacionPath(targetPath)) {
    return {
      allowed: false,
      reason: EXTERNAL_WRITE_CODES.FUNDACION_ALWAYS_DENY,
      path: String(targetPath || ''),
      PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY
    };
  }
  return null;
}

/**
 * Receipt truthy / { ok: true } acceptance.
 * @param {*} value
 * @returns {boolean}
 */
function receiptOk(value) {
  if (value === true) return true;
  if (value && typeof value === 'object' && value.ok === true) return true;
  if (typeof value === 'string' && value.trim().length > 0) return true;
  return false;
}

/**
 * Default precondition evaluator — fail-closed on any missing/false key.
 * REGISTERED may also be satisfied via registry membership when receipts omit it.
 * @param {string} projectId
 * @param {object} receipts
 * @param {Set<string>|Map|object|string[]} [registry]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function defaultEvaluatePreconditions(projectId, receipts, registry) {
  const missing = [];
  const r = receipts && typeof receipts === 'object' ? receipts : {};

  for (const key of EXTERNAL_WRITE_PRECONDITIONS) {
    if (key === 'REGISTERED') {
      const inRegistry = isProjectRegistered(projectId, registry);
      if (!receiptOk(r.REGISTERED) && !inRegistry) {
        missing.push(key);
      }
      continue;
    }
    if (!receiptOk(r[key])) {
      missing.push(key);
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * @param {string} projectId
 * @param {Set<string>|Map|object|string[]|undefined} registry
 * @returns {boolean}
 */
function isProjectRegistered(projectId, registry) {
  if (!projectId || !registry) return false;
  if (registry instanceof Set) return registry.has(projectId);
  if (registry instanceof Map) return registry.has(projectId);
  if (Array.isArray(registry)) return registry.includes(projectId);
  if (typeof registry === 'object') return Boolean(registry[projectId]);
  return false;
}

/**
 * SHA-256 hex of content.
 * @param {string|Buffer|object} payload
 * @returns {string}
 */
export function contentSha256(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : JSON.stringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Create L2 External Write Gateway (fail-closed, hermetic fixture only).
 *
 * @param {object} [opts]
 * @param {string} [opts.fixtureRoot] absolute path to hermetic sandbox project
 * @param {(p: string) => boolean} [opts.isRealFundacionPath]
 * @param {(projectId: string, receipts: object) => { ok: boolean, missing: string[] }} [opts.evaluatePreconditions]
 * @param {Set<string>|Map|object|string[]} [opts.registry] registered project ids
 * @param {Function} [opts.applyDiff]
 * @param {Function} [opts.rollbackDiff]
 * @param {Function} [opts.runVerifier]
 * @returns {object}
 */
export function createExternalWriteGateway(opts = {}) {
  const fixtureRoot = opts.fixtureRoot ? path.resolve(String(opts.fixtureRoot)) : null;
  const isRealFundacionPath = opts.isRealFundacionPath || defaultIsRealFundacionPath;
  const registry = opts.registry ?? new Set();
  const evaluatePreconditions =
    opts.evaluatePreconditions ||
    ((projectId, receipts) => defaultEvaluatePreconditions(projectId, receipts, registry));

  /**
   * @param {string} projectId
   * @param {object} receipts
   * @returns {{ ok: true, missing: [] }}
   */
  function assertPreconditions(projectId, receipts) {
    const result = evaluatePreconditions(projectId, receipts);
    const missing = Array.isArray(result?.missing) ? result.missing : [];
    if (!result?.ok || missing.length > 0) {
      const keys = missing.length ? missing : ['UNKNOWN'];
      throw new ExternalWriteGatewayError(
        `EXTERNAL_WRITE_PRECONDITION_FAILED: missing ${keys.join(',')}`,
        EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_PRECONDITION_FAILED,
        { missing: keys, projectId }
      );
    }
    return { ok: true, missing: [] };
  }

  /**
   * @param {{ projectId: string, targetPath: string, receipts?: object }} args
   * @returns {{ allowed: boolean, reason: string, path: string, preconditions: object, PRODUCTION_READY: 'NO', missing?: string[] }}
   */
  function authorizeExternalWrite({ projectId, targetPath, receipts } = {}) {
    const rawPath = String(targetPath || '');
    const base = {
      path: rawPath,
      preconditions: { ...Object.fromEntries(EXTERNAL_WRITE_PRECONDITIONS.map((k) => [k, false])) },
      PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY
    };

    // 1) Real Fundacion — ALWAYS DENY (even if all 6 preconditions pass)
    const fundacionDeny = denyRealFundacion(rawPath, isRealFundacionPath);
    if (fundacionDeny) {
      return {
        ...base,
        allowed: false,
        reason: EXTERNAL_WRITE_CODES.FUNDACION_ALWAYS_DENY,
        path: fundacionDeny.path
      };
    }

    // 2) Must be inside hermetic fixture root
    if (!fixtureRoot || !isHermeticFixturePath(rawPath, fixtureRoot)) {
      return {
        ...base,
        allowed: false,
        reason: EXTERNAL_WRITE_CODES.OUTSIDE_HERMETIC_FIXTURE
      };
    }

    // 3) All six Level-2 preconditions
    const evalResult = evaluatePreconditions(projectId, receipts || {});
    const missing = Array.isArray(evalResult?.missing) ? evalResult.missing : [];
    const preconditions = {};
    for (const key of EXTERNAL_WRITE_PRECONDITIONS) {
      preconditions[key] = !missing.includes(key);
    }
    if (!evalResult?.ok || missing.length > 0) {
      return {
        ...base,
        allowed: false,
        reason: EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_PRECONDITION_FAILED,
        preconditions,
        missing
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      path: path.resolve(rawPath),
      preconditions,
      PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY
    };
  }

  /**
   * Authorize → applyDiff → runVerifier; verifier fail → rollback + fail-closed.
   *
   * @param {object} args
   * @returns {Promise<object>}
   */
  async function runGovernedWrite({
    projectId,
    targetPath,
    receipts,
    content,
    applyDiff,
    rollbackDiff,
    runVerifier
  } = {}) {
    const verdict = authorizeExternalWrite({ projectId, targetPath, receipts });
    if (!verdict.allowed) {
      throw new ExternalWriteGatewayError(
        `external write denied: ${verdict.reason}${
          verdict.missing?.length ? ` missing=${verdict.missing.join(',')}` : ''
        }`,
        verdict.reason,
        { missing: verdict.missing, path: verdict.path, verdict }
      );
    }

    const apply = applyDiff || opts.applyDiff;
    const rollback = rollbackDiff || opts.rollbackDiff;
    const verifier = runVerifier || opts.runVerifier;

    if (typeof apply !== 'function') {
      throw new ExternalWriteGatewayError(
        'EXTERNAL_WRITE_APPLY_FAILED: applyDiff required',
        EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_APPLY_FAILED
      );
    }

    let applied = false;
    try {
      await apply({ projectId, targetPath, content, path: verdict.path });
      applied = true;
    } catch (err) {
      throw new ExternalWriteGatewayError(
        `EXTERNAL_WRITE_APPLY_FAILED: ${err?.message || err}`,
        EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_APPLY_FAILED,
        { cause: err }
      );
    }

    if (typeof verifier === 'function') {
      let verifyResult;
      try {
        verifyResult = await verifier({ projectId, targetPath, content, path: verdict.path });
      } catch (err) {
        if (typeof rollback === 'function') {
          await rollback({ projectId, targetPath, content, path: verdict.path, reason: 'verifier_threw' });
        }
        throw new ExternalWriteGatewayError(
          `EXTERNAL_WRITE_VERIFIER_FAILED: ${err?.message || err}`,
          EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_VERIFIER_FAILED,
          { cause: err, rolledBack: true }
        );
      }
      const ok =
        verifyResult === true ||
        verifyResult?.ok === true ||
        verifyResult?.passed === true;
      if (!ok) {
        if (typeof rollback === 'function') {
          await rollback({
            projectId,
            targetPath,
            content,
            path: verdict.path,
            reason: 'verifier_failed'
          });
        }
        throw new ExternalWriteGatewayError(
          'EXTERNAL_WRITE_VERIFIER_FAILED: verifier rejected write',
          EXTERNAL_WRITE_CODES.EXTERNAL_WRITE_VERIFIER_FAILED,
          { verifyResult, rolledBack: true }
        );
      }
    }

    const sha256 = contentSha256(content ?? '');
    return {
      ok: true,
      allowed: true,
      reason: 'OK',
      path: verdict.path,
      projectId,
      sha256,
      applied,
      PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY,
      kind: EXTERNAL_WRITE_GATEWAY_KIND,
      // NON-CLAIM markers on receipt
      fundacionDeltaOpened: false,
      hermeticFixtureOnly: true
    };
  }

  function health() {
    return {
      kind: EXTERNAL_WRITE_GATEWAY_KIND,
      PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY,
      fundacionDeltaOpened: false,
      fundacionAlwaysDenyIntact: true,
      hermeticFixtureOnly: true,
      cloudAgent: false,
      level2ReceiptsMeanProductionReady: false,
      fixtureRoot: fixtureRoot || null,
      preconditions: [...EXTERNAL_WRITE_PRECONDITIONS]
    };
  }

  function status() {
    return health();
  }

  return {
    assertPreconditions,
    authorizeExternalWrite,
    runGovernedWrite,
    health,
    status,
    fixtureRoot,
    kind: EXTERNAL_WRITE_GATEWAY_KIND,
    PRODUCTION_READY: EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY
  };
}

export default createExternalWriteGateway;
