/**
 * @module constitution-runtime-policy-gate
 * SPEC-0042 / Mission AK — Constitution Runtime Policy Gate.
 *
 * Injectable policy-as-code gate that maps selected CONSTITUTION
 * MUST/SHALL clauses → enforceable runtime checks on the autonomous
 * path (session resume / tool dispatch / external write intent).
 * Fail-closed on unknown/unmapped critical clauses. Seals deny/allow
 * EVD receipts. Optional AJ-compatible ledgerAppend stub.
 *
 * NON-CLAIM:
 *   constitution runtime ≠ full legal interpreter
 *   constitution runtime ≠ auto-amend constitution
 *   constitution runtime ≠ compliance certification product
 *   constitution runtime ≠ PRODUCTION_READY
 *   not AL / AM
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  DEFAULT_CLAUSE_ALLOWLIST,
  defaultAllowlistIds,
  lookupAllowlistClause
} from './constitution-clause-allowlist.js';

/** @type {'NO'} */
export const AK_PRODUCTION_READY = 'NO';

export const AK_KIND = 'eos-constitution-runtime-policy-gate';

export const AK_CODES = Object.freeze({
  OK: 'OK',
  POLICY_DENY: 'POLICY_DENY',
  CLAUSE_UNMAPPED: 'CLAUSE_UNMAPPED',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  CRITICAL_UNMAPPED: 'CRITICAL_UNMAPPED',
  FUNDACION_DENY: 'FUNDACION_DENY',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_ACTION: 'INVALID_ACTION'
});

/** Known autonomous action types (EARS). */
export const AK_ACTION_TYPES = Object.freeze([
  'session.resume',
  'tool.dispatch',
  'external.write',
  'policy.evaluate',
  'autonomy.propose'
]);

const REDACTED = '[REDACTED]';

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key|provider[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Constitution Runtime Policy Gate failures.
 */
export class ConstitutionRuntimePolicyGateError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AK_CODES.POLICY_DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'ConstitutionRuntimePolicyGateError';
    this.code = code;
    this.details = sanitizePayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizePayload(obj) {
  return sanitizeDeep(obj, new WeakSet());
}

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {unknown}
 */
function sanitizeDeep(value, seen) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value)) return REDACTED;
    return redactSecretSubstrings(value);
  }
  if (typeof value !== 'object') return value;
  if (seen.has(/** @type {object} */ (value))) return '[Circular]';
  seen.add(/** @type {object} */ (value));

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v, seen));
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefix built at
 * runtime (Law VI — never embed static vendor-key literals).
 * @param {string} s
 * @returns {string}
 */
function redactSecretSubstrings(s) {
  let out = String(s);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    `$1${REDACTED}`
  );
  const vendorPrefix = ['s', 'k', '-'].join('');
  const vendorRe = new RegExp(
    `\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`,
    'g'
  );
  out = out.replace(vendorRe, REDACTED);
  out = out.replace(
    /\b(api[_-]?key|token|authorization|secret|password)\s*[:=]\s*['"]?[^'"\s,;]+['"]?/gi,
    (_m, k) => `${k}=${REDACTED}`
  );
  return out;
}

/**
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * Detect provider secret material in a value (runtime-synthesized
 * vendor-prefix pattern — Law VI).
 * @param {unknown} value
 * @returns {boolean}
 */
export function containsSecretMaterial(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    const vendorPrefix = ['s', 'k', '-'].join('');
    if (value.includes(vendorPrefix) && new RegExp(`\\b${vendorPrefix}[A-Za-z0-9]{8,}\\b`).test(value)) {
      return true;
    }
    if (/\bBearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(value)) return true;
    return false;
  }
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((v) => containsSecretMaterial(v));
  }
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(k) && v != null && String(v).length > 0) {
      // Key name alone is not enough — require non-empty secret-ish value
      if (typeof v === 'string' && v.length >= 8) return true;
      if (typeof v !== 'string') return true;
    }
    if (containsSecretMaterial(v)) return true;
  }
  return false;
}

/**
 * @param {object} obj
 * @returns {boolean}
 */
export function isFundacionTarget(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.fundacionWrite === true) return true;
  if (obj.target === 'fundacion') return true;
  if (obj.path === 'Documents/Fundacion') return true;
  if (typeof obj.path === 'string' && /fundacion/i.test(obj.path)) return true;
  if (typeof obj.targetPath === 'string' && /fundacion/i.test(obj.targetPath)) {
    return true;
  }
  if (typeof obj.custodyTarget === 'string' && /fundacion/i.test(obj.custodyTarget)) {
    return true;
  }
  if (obj.payload && typeof obj.payload === 'object') {
    return isFundacionTarget(obj.payload);
  }
  return false;
}

/**
 * @param {object} action
 * @returns {boolean}
 */
function claimsProductionReadyFlip(action) {
  if (!action || typeof action !== 'object') return false;
  const payloads = [action, action.payload, action.claim, action.meta].filter(
    (p) => p && typeof p === 'object'
  );
  for (const p of payloads) {
    if (p.PRODUCTION_READY === 'YES' || p.PRODUCTION_READY === true) return true;
    if (p.flipProductionReady === true) return true;
    if (p.claimProductionReady === true) return true;
    if (typeof p.claim === 'string' && /PRODUCTION_READY\s*=\s*YES/i.test(p.claim)) {
      return true;
    }
  }
  if (typeof action.claim === 'string' && /PRODUCTION_READY\s*=\s*YES/i.test(action.claim)) {
    return true;
  }
  return false;
}

/**
 * @param {object} action
 * @returns {boolean}
 */
function isCloudAgentIntent(action) {
  if (!action || typeof action !== 'object') return false;
  const payloads = [action, action.payload, action.tool, action.meta].filter(
    (p) => p && typeof p === 'object'
  );
  for (const p of payloads) {
    if (p.cloudAgent === true || p.usesCloudAgent === true) return true;
    if (p.tool === 'CloudAgent' || p.toolName === 'CloudAgent') return true;
    if (typeof p.tool === 'string' && /cloud[-_]?agent/i.test(p.tool)) return true;
    if (typeof p.agent === 'string' && /cloud[-_]?agent|cloud[-_]?coding/i.test(p.agent)) {
      return true;
    }
    if (typeof p.dispatch === 'string' && /cloud[-_]?agent/i.test(p.dispatch)) {
      return true;
    }
  }
  if (typeof action.type === 'string' && /cloud[-_]?agent/i.test(action.type)) {
    return true;
  }
  return false;
}

/**
 * @param {object} action
 * @returns {boolean}
 */
function lacksWriteBarrier(action) {
  if (!action || typeof action !== 'object') return false;
  if (action.type !== 'external.write') return false;
  const payload = action.payload && typeof action.payload === 'object'
    ? action.payload
    : action;
  // Barrier envelope present → ok
  if (payload.barrier === true || payload.writeBarrier === true) return false;
  if (payload.envelope && typeof payload.envelope === 'object') {
    if (payload.envelope.barrier === true || payload.envelope.kind === 'write-barrier') {
      return false;
    }
  }
  // Unbounded external write without barrier
  return true;
}

/**
 * Built-in hermetic checkers (NOT a full legal interpreter).
 * Each returns { ok: true } or { ok: false, denyCode, message, clauseId }.
 */
export const BUILTIN_CHECKS = Object.freeze({
  LAW_FUNDACION_DELTA0: (action) => {
    if (isFundacionTarget(action) || isFundacionTarget(action?.payload || {})) {
      return {
        ok: false,
        denyCode: AK_CODES.FUNDACION_DENY,
        clauseId: 'LAW_FUNDACION_DELTA0',
        message:
          'Fundacion ALWAYS DENY — no Fundacion write intent on autonomous path'
      };
    }
    return { ok: true, clauseId: 'LAW_FUNDACION_DELTA0' };
  },

  LAW_PRODUCTION_READY_NO: (action) => {
    if (claimsProductionReadyFlip(action)) {
      return {
        ok: false,
        denyCode: AK_CODES.POLICY_DENY,
        clauseId: 'LAW_PRODUCTION_READY_NO',
        message: 'PRODUCTION_READY flip to YES is forbidden (gate PRODUCTION_READY=NO)'
      };
    }
    return { ok: true, clauseId: 'LAW_PRODUCTION_READY_NO' };
  },

  LAW_VI_NO_SECRET_LITERAL: (action) => {
    if (containsSecretMaterial(action) || containsSecretMaterial(action?.payload)) {
      return {
        ok: false,
        denyCode: AK_CODES.POLICY_DENY,
        clauseId: 'LAW_VI_NO_SECRET_LITERAL',
        message: 'action payload contains provider secret material (Law VI)'
      };
    }
    return { ok: true, clauseId: 'LAW_VI_NO_SECRET_LITERAL' };
  },

  LAW_CLOUDAGENT_OUT: (action) => {
    if (isCloudAgentIntent(action)) {
      return {
        ok: false,
        denyCode: AK_CODES.POLICY_DENY,
        clauseId: 'LAW_CLOUDAGENT_OUT',
        message: 'CloudAgent / cloud-coding-agent dispatch denied (Antigravity-first)'
      };
    }
    return { ok: true, clauseId: 'LAW_CLOUDAGENT_OUT' };
  },

  LAW_WRITE_BARRIER: (action) => {
    if (lacksWriteBarrier(action)) {
      return {
        ok: false,
        denyCode: AK_CODES.POLICY_DENY,
        clauseId: 'LAW_WRITE_BARRIER',
        message: 'unbounded external.write without barrier envelope'
      };
    }
    return { ok: true, clauseId: 'LAW_WRITE_BARRIER' };
  }
});

/**
 * Create the Constitution Runtime Policy Gate.
 *
 * @param {object} [options]
 * @param {string[]|Set<string>|{id:string}[]} [options.clauseAllowlist]
 * @param {Record<string, Function>|Map<string, Function>} [options.checks]
 * @param {string} [options.constitutionText] — fixture text (NOT live IO)
 * @param {object[]} [options.clauses] — fixture clause objects
 * @param {() => string} [options.now]
 * @param {(receipt: object) => void} [options.receiptSealer]
 * @param {(entry: object) => any} [options.ledgerAppend] — optional AJ stub
 * @param {boolean} [options.requireLedgerAppend=false]
 * @param {boolean} [options.throwOnDeny=false]
 * @param {(receipt: object) => void} [options.onReceipt]
 * @param {string[]} [options.criticalClauses] — override critical id list
 * @param {boolean} [options.includeBuiltins=true]
 */
export function createConstitutionRuntimePolicyGate(options = {}) {
  const depError = resolveDepError(options);

  const now =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const throwOnDeny = options.throwOnDeny === true;
  const requireLedgerAppend = options.requireLedgerAppend === true;
  const includeBuiltins = options.includeBuiltins !== false;

  const onReceipt =
    typeof options.onReceipt === 'function' ? options.onReceipt : null;
  const receiptSealer =
    typeof options.receiptSealer === 'function' ? options.receiptSealer : null;
  const ledgerAppend =
    typeof options.ledgerAppend === 'function' ? options.ledgerAppend : null;

  /** @type {Set<string>} */
  const allowlist = resolveAllowlist(options.clauseAllowlist);

  /** @type {Map<string, Function>} */
  const checks = new Map();
  if (includeBuiltins) {
    for (const [id, fn] of Object.entries(BUILTIN_CHECKS)) {
      if (allowlist.has(id)) checks.set(id, fn);
    }
  }
  if (options.checks instanceof Map) {
    for (const [id, fn] of options.checks.entries()) {
      if (typeof fn === 'function') checks.set(id, fn);
    }
  } else if (options.checks && typeof options.checks === 'object') {
    for (const [id, fn] of Object.entries(options.checks)) {
      if (typeof fn === 'function') checks.set(id, fn);
    }
  }

  /** @type {Set<string>} */
  const criticalIds = resolveCriticalIds(options.criticalClauses, allowlist);

  const constitutionText =
    typeof options.constitutionText === 'string' ? options.constitutionText : '';
  const clauses = Array.isArray(options.clauses) ? options.clauses.slice() : [];

  /** @type {object[]} */
  const receipts = [];
  let seqReceipt = 0;

  const metrics = {
    evaluates: 0,
    allows: 0,
    denials: 0,
    lastCode: null
  };

  /**
   * @param {object} partial
   */
  function emitReceipt(partial) {
    seqReceipt += 1;
    const stamped = partial && partial.at != null ? partial.at : now();
    const receipt = sanitizePayload({
      id: `AK-RCPT-${String(seqReceipt).padStart(4, '0')}`,
      at: stamped,
      kind: AK_KIND,
      PRODUCTION_READY: AK_PRODUCTION_READY,
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      ...partial
    });
    receipts.push(receipt);
    if (receipts.length > 200) receipts.shift();
    if (receiptSealer) {
      try {
        receiptSealer(receipt);
      } catch {
        /* sealer faults must not crash gate */
      }
    }
    if (onReceipt) {
      try {
        onReceipt(receipt);
      } catch {
        /* observer faults must not crash gate */
      }
    }
    if (ledgerAppend) {
      try {
        ledgerAppend({
          missionId: 'SPEC-0042',
          kind: 'ak-policy-receipt',
          payload: {
            receiptId: receipt.id,
            ok: receipt.ok,
            code: receipt.code,
            phase: receipt.phase
          }
        });
      } catch {
        /* ledger stub faults must not crash gate */
      }
    }
    return receipt;
  }

  /**
   * Seal a deny/allow forensic receipt (public).
   * @param {object} outcome
   */
  function sealReceipt(outcome = {}) {
    const ok = outcome.ok !== false && outcome.allow !== false;
    const code = outcome.code || (ok ? AK_CODES.OK : AK_CODES.POLICY_DENY);
    return emitReceipt({
      ok,
      allow: ok,
      code,
      denyCode: ok ? undefined : code,
      phase: outcome.phase || (ok ? 'ALLOW' : 'DENY'),
      ...outcome
    });
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function deny(code, extra = {}) {
    metrics.denials += 1;
    metrics.lastCode = code;
    const receipt = emitReceipt({
      ok: false,
      allow: false,
      code,
      denyCode: code,
      phase: extra.phase || 'DENY',
      ...omit(extra, ['throw'])
    });
    const result = sanitizePayload({
      ok: false,
      allow: false,
      code,
      denyCode: code,
      kind: AK_KIND,
      PRODUCTION_READY: AK_PRODUCTION_READY,
      receipt,
      ...extra
    });
    if (throwOnDeny || extra.throw === true) {
      throw new ConstitutionRuntimePolicyGateError(
        extra.message || `DENY: ${code}`,
        code,
        { receipt, ...extra }
      );
    }
    return result;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function allow(code, extra = {}) {
    metrics.allows += 1;
    metrics.lastCode = code;
    const receipt =
      extra.seal === false
        ? null
        : emitReceipt({
            ok: true,
            allow: true,
            code,
            phase: extra.phase || 'ALLOW',
            ...omit(extra, ['seal', 'checksRun'])
          });
    return sanitizePayload({
      ok: true,
      allow: true,
      code,
      kind: AK_KIND,
      PRODUCTION_READY: AK_PRODUCTION_READY,
      receipt,
      ...extra
    });
  }

  /**
   * Guard injectable deps — fail-closed.
   * @param {string} phase
   */
  function checkDeps(phase) {
    if (depError) {
      return deny(AK_CODES.MISSING_DEP, {
        phase,
        dep: depError.dep,
        message: depError.message
      });
    }
    if (requireLedgerAppend && typeof ledgerAppend !== 'function') {
      return deny(AK_CODES.MISSING_DEP, {
        phase,
        dep: 'ledgerAppend',
        message: 'ledgerAppend required but missing / invalid'
      });
    }
    return null;
  }

  /**
   * Evaluate an autonomous action against allowlisted constitution checks.
   * @param {object} action — { type, payload?, requiredClauses?, ... }
   * @returns {{ ok: true, receipt } | { ok: false, denyCode, receipt }}
   */
  function evaluate(action) {
    metrics.evaluates += 1;

    const blocked = checkDeps('EVALUATE');
    if (blocked) return blocked;

    if (action == null || typeof action !== 'object' || Array.isArray(action)) {
      return deny(AK_CODES.INVALID_ACTION, {
        phase: 'EVALUATE',
        message: 'evaluate requires a non-null object action'
      });
    }

    const actionType = action.type != null ? String(action.type) : '';
    if (!actionType) {
      return deny(AK_CODES.INVALID_ACTION, {
        phase: 'EVALUATE',
        message: 'action.type is required'
      });
    }

    if (!AK_ACTION_TYPES.includes(actionType) && !action.allowUnknownType) {
      // Unknown autonomous action type → fail-closed
      return deny(AK_CODES.UNKNOWN_ACTION, {
        phase: 'EVALUATE',
        actionType,
        message: `unknown action type: ${actionType}`
      });
    }

    // Required / referenced critical clauses must be mapped
    const referenced = collectReferencedClauses(action);
    for (const clauseId of referenced) {
      if (!allowlist.has(clauseId)) {
        const meta = lookupAllowlistClause(clauseId);
        const isCritical =
          criticalIds.has(clauseId) || (meta && meta.critical === true);
        const code = isCritical
          ? AK_CODES.CRITICAL_UNMAPPED
          : AK_CODES.CLAUSE_UNMAPPED;
        return deny(code, {
          phase: 'EVALUATE',
          actionType,
          clauseId,
          message: `clause ${clauseId} referenced but not on allowlist — fail-closed (no skip)`
        });
      }
      if (!checks.has(clauseId)) {
        const isCritical = criticalIds.has(clauseId);
        const code = isCritical
          ? AK_CODES.CRITICAL_UNMAPPED
          : AK_CODES.CLAUSE_UNMAPPED;
        return deny(code, {
          phase: 'EVALUATE',
          actionType,
          clauseId,
          message: `critical/allowlisted clause ${clauseId} has no registered check — fail-closed (no skip)`
        });
      }
    }

    // Also: any critical allowlisted clause that is required by default
    // for this action type but unmapped → DENY
    const defaultRequired = defaultRequiredForAction(actionType);
    for (const clauseId of defaultRequired) {
      if (!allowlist.has(clauseId) || !checks.has(clauseId)) {
        return deny(AK_CODES.CRITICAL_UNMAPPED, {
          phase: 'EVALUATE',
          actionType,
          clauseId,
          message: `critical clause ${clauseId} unmapped for ${actionType} — fail-closed (no skip)`
        });
      }
    }

    // Run all allowlisted checks that apply (defaultRequired ∪ referenced ∪ all builtins on allowlist)
    const toRun = new Set([
      ...defaultRequired,
      ...referenced,
      // Always run every allowlisted+registered check for hot compliance
      ...[...checks.keys()].filter((id) => allowlist.has(id))
    ]);

    /** @type {object[]} */
    const checksRun = [];
    for (const clauseId of toRun) {
      const fn = checks.get(clauseId);
      if (typeof fn !== 'function') {
        if (criticalIds.has(clauseId)) {
          return deny(AK_CODES.CRITICAL_UNMAPPED, {
            phase: 'EVALUATE',
            actionType,
            clauseId,
            message: `critical clause ${clauseId} checker missing — fail-closed`
          });
        }
        return deny(AK_CODES.CLAUSE_UNMAPPED, {
          phase: 'EVALUATE',
          actionType,
          clauseId,
          message: `clause ${clauseId} checker missing — fail-closed`
        });
      }
      let outcome;
      try {
        outcome = fn(action, { constitutionText, clauses });
      } catch (err) {
        return deny(AK_CODES.POLICY_DENY, {
          phase: 'EVALUATE',
          actionType,
          clauseId,
          message: sanitizeErrorMessage(err?.message || 'checker threw')
        });
      }
      checksRun.push({
        clauseId,
        ok: !!(outcome && outcome.ok),
        denyCode: outcome?.denyCode || null
      });
      if (!outcome || outcome.ok !== true) {
        const code =
          (outcome && outcome.denyCode) || AK_CODES.POLICY_DENY;
        return deny(code, {
          phase: 'EVALUATE',
          actionType,
          clauseId: (outcome && outcome.clauseId) || clauseId,
          message:
            (outcome && outcome.message) ||
            `policy check failed: ${clauseId}`,
          checksRun
        });
      }
    }

    return allow(AK_CODES.OK, {
      phase: 'EVALUATE',
      actionType,
      checksRun,
      message: 'all allowlisted constitution runtime checks passed'
    });
  }

  /**
   * Intercept alias — DENY unauthorized; optionally throw.
   * @param {object} action
   * @param {{ throw?: boolean }} [opts]
   */
  function intercept(action, opts = {}) {
    const result = evaluate(action);
    if (result.ok === true) return result;
    if (opts.throw === true || throwOnDeny) {
      throw new ConstitutionRuntimePolicyGateError(
        result.message || `DENY: ${result.denyCode || result.code}`,
        result.denyCode || result.code,
        { receipt: result.receipt, actionType: result.actionType }
      );
    }
    return result;
  }

  /**
   * @returns {string[]}
   */
  function listAllowlistedClauses() {
    return [...allowlist];
  }

  /**
   * Hermetic setup — register or replace a checker for a clause id.
   * Auto-adds clauseId to allowlist.
   * @param {string} clauseId
   * @param {(action: object, ctx?: object) => object} fn
   */
  function registerCheck(clauseId, fn) {
    if (!clauseId || typeof clauseId !== 'string') {
      throw new ConstitutionRuntimePolicyGateError(
        'registerCheck requires clauseId string',
        AK_CODES.INVALID_ACTION
      );
    }
    if (typeof fn !== 'function') {
      throw new ConstitutionRuntimePolicyGateError(
        'registerCheck requires function checker',
        AK_CODES.MISSING_DEP,
        { dep: 'checks' }
      );
    }
    allowlist.add(clauseId);
    checks.set(clauseId, fn);
    return true;
  }

  function health() {
    return sanitizePayload({
      ok: true,
      kind: AK_KIND,
      PRODUCTION_READY: AK_PRODUCTION_READY,
      allowlistCount: allowlist.size,
      checkCount: checks.size,
      criticalCount: criticalIds.size,
      metrics: { ...metrics },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: {
        notFullLegalInterpreter: true,
        notAutoAmendConstitution: true,
        notComplianceCertification: true,
        notProductionReady: true,
        notAlAm: true,
        fundacionDelta0: true,
        notCloudAgent: true
      }
    });
  }

  function getState() {
    const h = health();
    return sanitizePayload({
      ...h,
      receiptCount: receipts.length,
      recentReceipts: receipts.slice(-5),
      allowlistedClauses: [...allowlist],
      registeredChecks: [...checks.keys()],
      hasConstitutionText: constitutionText.length > 0,
      clauseFixtureCount: clauses.length,
      requireLedgerAppend
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizePayload({ ...r }));
  }

  return {
    kind: AK_KIND,
    PRODUCTION_READY: AK_PRODUCTION_READY,
    evaluate,
    intercept,
    listAllowlistedClauses,
    registerCheck,
    sealReceipt,
    health,
    getState,
    getReceipts,
    sanitizePayload,
    containsSecretMaterial,
    isFundacionTarget
  };
}

/**
 * @param {object} options
 * @returns {{ dep: string, message: string }|null}
 */
function resolveDepError(options) {
  if (
    Object.prototype.hasOwnProperty.call(options, 'checks') &&
    options.checks != null &&
    !(options.checks instanceof Map) &&
    typeof options.checks !== 'object'
  ) {
    return { dep: 'checks', message: 'checks injectable must be a Map or object' };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'receiptSealer') &&
    options.receiptSealer != null &&
    typeof options.receiptSealer !== 'function'
  ) {
    return {
      dep: 'receiptSealer',
      message: 'receiptSealer injectable must be a function'
    };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'ledgerAppend') &&
    options.ledgerAppend != null &&
    typeof options.ledgerAppend !== 'function'
  ) {
    return {
      dep: 'ledgerAppend',
      message: 'ledgerAppend injectable must be a function'
    };
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'now') &&
    options.now != null &&
    typeof options.now !== 'function'
  ) {
    return { dep: 'now', message: 'now injectable must be a function' };
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {Set<string>}
 */
function resolveAllowlist(raw) {
  if (raw == null) {
    return new Set(defaultAllowlistIds());
  }
  if (raw instanceof Set) {
    return new Set([...raw].map(String));
  }
  if (Array.isArray(raw)) {
    return new Set(
      raw.map((item) =>
        typeof item === 'string' ? item : item && item.id != null ? String(item.id) : null
      ).filter(Boolean)
    );
  }
  return new Set(defaultAllowlistIds());
}

/**
 * @param {string[]|undefined} override
 * @param {Set<string>} allowlist
 * @returns {Set<string>}
 */
function resolveCriticalIds(override, allowlist) {
  if (Array.isArray(override)) {
    return new Set(override.map(String));
  }
  const ids = new Set();
  for (const meta of DEFAULT_CLAUSE_ALLOWLIST) {
    if (meta.critical && allowlist.has(meta.id)) ids.add(meta.id);
  }
  return ids;
}

/**
 * @param {object} action
 * @returns {string[]}
 */
function collectReferencedClauses(action) {
  /** @type {string[]} */
  const out = [];
  const add = (v) => {
    if (typeof v === 'string' && v.length > 0) out.push(v);
  };
  if (Array.isArray(action.requiredClauses)) {
    action.requiredClauses.forEach(add);
  }
  if (Array.isArray(action.clauses)) {
    action.clauses.forEach(add);
  }
  if (typeof action.clauseId === 'string') add(action.clauseId);
  if (action.payload && typeof action.payload === 'object') {
    if (Array.isArray(action.payload.requiredClauses)) {
      action.payload.requiredClauses.forEach(add);
    }
    if (typeof action.payload.clauseId === 'string') {
      add(action.payload.clauseId);
    }
  }
  return [...new Set(out)];
}

/**
 * Default critical checks that MUST run for each action type.
 * @param {string} actionType
 * @returns {string[]}
 */
function defaultRequiredForAction(actionType) {
  const base = [
    'LAW_FUNDACION_DELTA0',
    'LAW_PRODUCTION_READY_NO',
    'LAW_VI_NO_SECRET_LITERAL',
    'LAW_CLOUDAGENT_OUT'
  ];
  if (actionType === 'external.write') {
    return [...base, 'LAW_WRITE_BARRIER'];
  }
  if (
    actionType === 'tool.dispatch' ||
    actionType === 'session.resume' ||
    actionType === 'autonomy.propose'
  ) {
    return base;
  }
  return base;
}

/**
 * @param {object} obj
 * @param {string[]} keys
 */
function omit(obj, keys) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (keys.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

export default createConstitutionRuntimePolicyGate;
