/**
 * @module sovereign-developer-engine
 * SPEC-0055 / Mission AX — Sovereign Developer Engine Core / Autonomous Code Loop.
 *
 * Hermetic orchestration seam that wires injectable ports:
 *   afLoop (optional AF-like step runner)
 *   agTools (optional AG-like tool invoke)
 *   budgetGate · hitlGate · lawViGate · writeBarrier
 *
 * Does NOT rewrite AF/AG modules into this payload — inject interfaces/fakes only.
 *
 * Main API: runGovernedCodeLoop({ artifactPath, intent, ports, policies })
 * Phases: PLAN → EDIT → VERIFY → SEAL (fail-closed).
 *
 * Law VI: sanitize/redact apiKey/token/authorization from errors and dumps;
 * never embed static vendor-key prefix contiguous literals.
 *
 * NON-CLAIM:
 *   sovereign developer engine ≠ unsupervised internet-facing agent
 *   sovereign developer engine ≠ PRODUCTION_READY coding SaaS
 *   sovereign developer engine ≠ CloudAgent orchestration
 *   not AY/AZ/BA/BB
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 OPEN; axis Sovereign Developer Engine
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AX_CEILING
 */

import {
  AX_PHASES,
  AX_PHASE_ORDER,
  AX_PHASES_KIND,
  AX_PHASES_PRODUCTION_READY,
  isValidPhase,
  phaseIndex,
  nextPhase,
  canTransition,
  assertPhaseOrder
} from './code-loop-phases.js';
import {
  AX_POLICY_GATE_KIND,
  AX_POLICY_GATE_PRODUCTION_READY,
  AX_POLICY_CODES,
  DEFAULT_ALLOWLISTED_ARTIFACTS,
  deny,
  denyBudget,
  denyHitl,
  denyLawVi,
  denyFundacion,
  denyArtifactNotAllowlisted,
  denyInvalidRequest,
  normalizeGateResult,
  checkArtifactAllowlisted,
  createPolicyGate
} from './policy-gate.js';
import {
  AX_RECEIPT_KIND,
  AX_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildEngineReceipt
} from './engine-receipt.js';

/** @type {'NO'} */
export const AX_PRODUCTION_READY = 'NO';

export const AX_KIND = 'eos-sovereign-developer-engine-core';

export const AX_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  BUDGET_DENY: 'BUDGET_DENY',
  HITL_REQUIRED: 'HITL_REQUIRED',
  LAW_VI_DENY: 'LAW_VI_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  ARTIFACT_NOT_ALLOWLISTED: 'ARTIFACT_NOT_ALLOWLISTED',
  VERIFY_FAILED: 'VERIFY_FAILED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PHASE_DENIED: 'PHASE_DENIED'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for Sovereign Developer Engine failures.
 */
export class SovereignDeveloperEngineError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AX_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'SovereignDeveloperEngineError';
    this.code = code;
    this.details = sanitizeAxPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAxPayload(obj) {
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
    // Preserve sha256 digests
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
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = sanitizeDeep(v, seen);
  }
  return out;
}

/**
 * Redact secret-looking substrings. Vendor-style key prefixes built at
 * runtime via concat (never as static contiguous literals — Law VI).
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
  const vendorRe = new RegExp(`\\b(${vendorPrefix}[A-Za-z0-9]{8,})\\b`, 'g');
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
 * Default HITL: ALWAYS DENY (fail-closed) when approval is required.
 * @param {object} _request
 * @returns {boolean}
 */
function defaultHitlDeny(_request) {
  return false;
}

/**
 * Default writeBarrier: Fundacion ALWAYS DENY.
 * @param {object} req
 * @returns {{ ok: boolean, allow: boolean, code: string, reason: string }}
 */
function defaultWriteBarrier(req = {}) {
  const target = String(req.target || req.path || req.kind || '');
  if (/fundacion/i.test(target) || req.fundacion === true) {
    return {
      ok: false,
      allow: false,
      code: AX_CODES.FUNDACION_DENY,
      reason: 'Fundacion ALWAYS_DENY'
    };
  }
  // Non-Fundacion local allowlisted writes: allow by default in hermetic loop
  return {
    ok: true,
    allow: true,
    code: AX_CODES.OK,
    reason: 'local write allowed'
  };
}

/**
 * Default Law VI gate: deny if payload looks like it carries raw secrets.
 * @param {object} req
 * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string }}
 */
function defaultLawViGate(req = {}) {
  const blob = stableStringify(req);
  const vendorPrefix = ['s', 'k', '-'].join('');
  if (blob.includes(vendorPrefix) && /[A-Za-z0-9]{8,}/.test(blob)) {
    // Only trip when a vendor-style contiguous key appears as a value-ish token
    const re = new RegExp(`\\b${vendorPrefix}[A-Za-z0-9]{8,}\\b`);
    if (re.test(blob)) {
      return {
        ok: false,
        allow: false,
        code: AX_CODES.LAW_VI_DENY,
        reason: 'Law VI: forbidden provider secret material detected'
      };
    }
  }
  return { ok: true, allow: true, code: AX_CODES.OK };
}

/**
 * Default budget gate: allow.
 * @returns {{ ok: boolean, allow: boolean, code: string }}
 */
function defaultBudgetAllow() {
  return { ok: true, allow: true, code: AX_CODES.OK };
}

/**
 * Create the Sovereign Developer Engine Core.
 *
 * @param {object} [options]
 * @param {object} [options.ports]
 * @param {object} [options.ports.afLoop] — optional AF-like step runner
 * @param {object} [options.ports.agTools] — optional AG-like tool invoke
 * @param {object} [options.ports.budgetGate]
 * @param {object} [options.ports.hitlGate]
 * @param {object} [options.ports.lawViGate]
 * @param {object} [options.ports.writeBarrier]
 * @param {object} [options.policies]
 * @param {string[]} [options.policies.allowlistedArtifacts]
 * @param {boolean} [options.policies.requireHitl]
 * @param {boolean} [options.throwOnDeny]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {() => string} [options.now]
 * @returns {object}
 */
export function createSovereignDeveloperEngine(options = {}) {
  const portsIn = options.ports && typeof options.ports === 'object'
    ? options.ports
    : {};
  // Also accept top-level port injects for convenience
  const afLoop = portsIn.afLoop || options.afLoop || null;
  const agTools = portsIn.agTools || options.agTools || null;
  const budgetGate =
    portsIn.budgetGate || options.budgetGate || { check: defaultBudgetAllow, beforeCall: defaultBudgetAllow };
  const hitlGate =
    portsIn.hitlGate ||
    options.hitlGate ||
    { approve: defaultHitlDeny };
  const lawViGate =
    portsIn.lawViGate ||
    options.lawViGate ||
    { check: defaultLawViGate };
  const writeBarrier =
    portsIn.writeBarrier ||
    options.writeBarrier ||
    { check: defaultWriteBarrier, allow: defaultWriteBarrier };

  const policies =
    options.policies && typeof options.policies === 'object'
      ? options.policies
      : {};
  const allowlisted =
    policies.allowlistedArtifacts ||
    options.allowlistedArtifacts ||
    DEFAULT_ALLOWLISTED_ARTIFACTS;
  const requireHitl = policies.requireHitl === true || options.requireHitl === true;
  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const policyGate = createPolicyGate({ allowlistedArtifacts: [...allowlisted] });

  let loopCount = 0;
  let completedCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  /**
   * @param {object} body
   */
  function sealReceipt(body) {
    const receipt = buildEngineReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeAxPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  /**
   * @param {object} result
   */
  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new SovereignDeveloperEngineError(
        result.reason || result.code || 'DENY',
        result.code || AX_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  /**
   * Invoke a gate port (check / beforeCall / approve / allow).
   * @param {object|null} gate
   * @param {string[]} methods
   * @param {object} arg
   * @param {string} denyCode
   */
  function invokeGate(gate, methods, arg, denyCode) {
    if (!gate || typeof gate !== 'object') {
      return {
        ok: false,
        allow: false,
        deny: true,
        code: AX_CODES.MISSING_DEP,
        reason: 'missing gate'
      };
    }
    for (const m of methods) {
      if (typeof gate[m] === 'function') {
        const raw = gate[m](arg);
        // approve() may return boolean
        if (typeof raw === 'boolean') {
          return raw
            ? { ok: true, allow: true, deny: false, code: AX_CODES.OK, reason: null }
            : {
                ok: false,
                allow: false,
                deny: true,
                code: denyCode,
                reason: 'gate returned false'
              };
        }
        return normalizeGateResult(raw, denyCode);
      }
    }
    return {
      ok: false,
      allow: false,
      deny: true,
      code: AX_CODES.MISSING_DEP,
      reason: `gate missing methods: ${methods.join('|')}`
    };
  }

  /**
   * Governed autonomous code loop: Plan → Edit → Verify → Seal.
   *
   * @param {object} req
   * @param {string} req.artifactPath
   * @param {object|string} [req.intent]
   * @param {object} [req.ports] — per-call port overrides
   * @param {object} [req.policies]
   * @returns {Promise<object>|object}
   */
  async function runGovernedCodeLoop(req = {}) {
    loopCount += 1;
    lastPhases = [];

    if (req == null || typeof req !== 'object') {
      denyCount += 1;
      lastCode = AX_CODES.INVALID_REQUEST;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AX_CODES.INVALID_REQUEST,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [],
        reason: 'runGovernedCodeLoop requires an object request',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AX_CODES.INVALID_REQUEST,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: 'runGovernedCodeLoop requires an object request',
          phases: [],
          receipt
        })
      );
    }

    const callPorts =
      req.ports && typeof req.ports === 'object' ? req.ports : {};
    const callPolicies =
      req.policies && typeof req.policies === 'object' ? req.policies : {};
    const effectiveAllow =
      callPolicies.allowlistedArtifacts || allowlisted;
    const effectiveRequireHitl =
      callPolicies.requireHitl === true || requireHitl === true;
    const intent =
      typeof req.intent === 'string'
        ? { summary: req.intent }
        : req.intent && typeof req.intent === 'object'
          ? req.intent
          : {};
    const intentSummary =
      intent.summary || intent.goal || intent.description || 'governed-code-loop';
    const artifactPath = req.artifactPath;

    const activeBudget = callPorts.budgetGate || budgetGate;
    const activeHitl = callPorts.hitlGate || hitlGate;
    const activeLawVi = callPorts.lawViGate || lawViGate;
    const activeWrite = callPorts.writeBarrier || writeBarrier;
    const activeAf = callPorts.afLoop || afLoop;
    const activeAg = callPorts.agTools || agTools;

    // ── 0. Artifact allowlist ──────────────────────────────────────────────
    const art = checkArtifactAllowlisted(artifactPath, effectiveAllow);
    if (!art.ok) {
      denyCount += 1;
      lastCode = art.code;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: art.code,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [],
        artifactPath: art.artifactPath || artifactPath || null,
        intentSummary,
        reason: art.reason,
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: art.code,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: art.reason,
          artifactPath: art.artifactPath || artifactPath || null,
          phases: [],
          receipt
        })
      );
    }

    // ── 0b. Law VI pre-check on intent ─────────────────────────────────────
    const lawVi = invokeGate(
      activeLawVi,
      ['check', 'evaluate', 'allow'],
      { intent, artifactPath: art.artifactPath },
      AX_CODES.LAW_VI_DENY
    );
    if (!lawVi.ok) {
      denyCount += 1;
      const code =
        lawVi.code === AX_CODES.MISSING_DEP
          ? AX_CODES.MISSING_DEP
          : AX_CODES.LAW_VI_DENY;
      lastCode = code;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: lawVi.reason || 'Law VI DENY',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: lawVi.reason || 'Law VI DENY',
          artifactPath: art.artifactPath,
          phases: [],
          receipt
        })
      );
    }

    // ── 0c. Budget gate ────────────────────────────────────────────────────
    const budget = invokeGate(
      activeBudget,
      ['beforeCall', 'check', 'shouldAllow', 'allow'],
      { intent, artifactPath: art.artifactPath, phase: AX_PHASES.PLAN },
      AX_CODES.BUDGET_DENY
    );
    if (!budget.ok) {
      denyCount += 1;
      const code =
        budget.code === AX_CODES.MISSING_DEP
          ? AX_CODES.MISSING_DEP
          : [
                'ECR_TRIPPED',
                'TOKEN_BUDGET_EXCEEDED',
                'COST_BUDGET_EXCEEDED',
                AX_CODES.BUDGET_DENY
              ].includes(String(budget.code))
            ? AX_CODES.BUDGET_DENY
            : AX_CODES.BUDGET_DENY;
      lastCode = code;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: budget.reason || 'budget DENY',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: budget.reason || 'budget DENY',
          artifactPath: art.artifactPath,
          phases: [],
          receipt
        })
      );
    }

    // ── 0d. HITL gate ──────────────────────────────────────────────────────
    const needsHitl =
      effectiveRequireHitl ||
      intent.requiresHitl === true ||
      intent.hitl === true;
    if (needsHitl) {
      const hitl = invokeGate(
        activeHitl,
        ['approve', 'check', 'allow'],
        { intent, artifactPath: art.artifactPath },
        AX_CODES.HITL_REQUIRED
      );
      if (!hitl.ok) {
        denyCount += 1;
        lastCode = AX_CODES.HITL_REQUIRED;
        lastOk = false;
        const receipt = sealReceipt({
          ok: false,
          code: AX_CODES.HITL_REQUIRED,
          status: 'DENY',
          phase: AX_PHASES.SEAL,
          phases: [],
          artifactPath: art.artifactPath,
          intentSummary,
          reason: hitl.reason || 'HITL required',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAxPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AX_CODES.HITL_REQUIRED,
            kind: AX_KIND,
            PRODUCTION_READY: AX_PRODUCTION_READY,
            reason: hitl.reason || 'HITL required',
            artifactPath: art.artifactPath,
            phases: [],
            receipt
          })
        );
      }
    }

    // ── 0e. Write barrier / Fundacion ──────────────────────────────────────
    const fundacionAttempt =
      intent.fundacion === true ||
      intent.writeFundacion === true ||
      /fundacion/i.test(String(intent.target || ''));
    if (fundacionAttempt) {
      const wb = invokeGate(
        activeWrite,
        ['check', 'allow', 'beforeWrite'],
        {
          fundacion: true,
          target: intent.target || 'Fundacion',
          artifactPath: art.artifactPath
        },
        AX_CODES.FUNDACION_DENY
      );
      // Even if injectable returns allow, force DENY for Fundacion (Δ=0)
      denyCount += 1;
      lastCode = AX_CODES.FUNDACION_DENY;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AX_CODES.FUNDACION_DENY,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: wb.reason || 'Fundacion ALWAYS_DENY',
        deny: true,
        decision: 'DENY',
        meta: { writeBarrierCode: wb.code }
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AX_CODES.FUNDACION_DENY,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: 'Fundacion ALWAYS_DENY',
          artifactPath: art.artifactPath,
          phases: [],
          fundacionDelta: 0,
          receipt
        })
      );
    }

    // ── PLAN ───────────────────────────────────────────────────────────────
    lastPhases.push(AX_PHASES.PLAN);
    let planResult = {
      ok: true,
      code: AX_CODES.OK,
      plan: {
        artifactPath: art.artifactPath,
        intent: intentSummary,
        steps: ['plan', 'edit', 'verify', 'seal']
      }
    };
    if (activeAf && typeof activeAf === 'object') {
      const runner =
        typeof activeAf.runStep === 'function'
          ? activeAf.runStep
          : typeof activeAf.runCycle === 'function'
            ? activeAf.runCycle
            : typeof activeAf.plan === 'function'
              ? activeAf.plan
              : null;
      if (runner) {
        planResult = await Promise.resolve(
          runner.call(activeAf, {
            phase: AX_PHASES.PLAN,
            artifactPath: art.artifactPath,
            intent
          })
        );
        if (planResult && planResult.ok === false) {
          denyCount += 1;
          lastCode = planResult.code || AX_CODES.DENY;
          lastOk = false;
          const receipt = sealReceipt({
            ok: false,
            code: lastCode,
            status: 'DENY',
            phase: AX_PHASES.PLAN,
            phases: [...lastPhases],
            artifactPath: art.artifactPath,
            intentSummary,
            reason: planResult.reason || 'PLAN failed',
            deny: true,
            decision: 'DENY'
          });
          return maybeThrow(
            sanitizeAxPayload({
              ok: false,
              allow: false,
              deny: true,
              code: lastCode,
              kind: AX_KIND,
              PRODUCTION_READY: AX_PRODUCTION_READY,
              reason: planResult.reason || 'PLAN failed',
              artifactPath: art.artifactPath,
              phases: [...lastPhases],
              receipt
            })
          );
        }
      }
    }

    // ── EDIT ───────────────────────────────────────────────────────────────
    lastPhases.push(AX_PHASES.EDIT);
    // Write-barrier check before edit (non-Fundacion)
    const editBarrier = invokeGate(
      activeWrite,
      ['check', 'allow', 'beforeWrite'],
      {
        fundacion: false,
        target: art.artifactPath,
        phase: AX_PHASES.EDIT
      },
      AX_CODES.FUNDACION_DENY
    );
    if (!editBarrier.ok && editBarrier.code === AX_CODES.FUNDACION_DENY) {
      denyCount += 1;
      lastCode = AX_CODES.FUNDACION_DENY;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AX_CODES.FUNDACION_DENY,
        status: 'DENY',
        phase: AX_PHASES.EDIT,
        phases: [...lastPhases],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: editBarrier.reason || 'write barrier DENY',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AX_CODES.FUNDACION_DENY,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: editBarrier.reason || 'write barrier DENY',
          artifactPath: art.artifactPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    let editResult = {
      ok: true,
      code: AX_CODES.OK,
      edit: { artifactPath: art.artifactPath, applied: true, hermetic: true }
    };
    if (activeAg && typeof activeAg === 'object') {
      const invoker =
        typeof activeAg.invoke === 'function'
          ? activeAg.invoke
          : typeof activeAg.callTool === 'function'
            ? activeAg.callTool
            : typeof activeAg.edit === 'function'
              ? activeAg.edit
              : null;
      if (invoker) {
        editResult = await Promise.resolve(
          invoker.call(activeAg, {
            tool: 'editArtifact',
            phase: AX_PHASES.EDIT,
            artifactPath: art.artifactPath,
            intent
          })
        );
        if (editResult && editResult.ok === false) {
          denyCount += 1;
          lastCode = editResult.code || AX_CODES.DENY;
          lastOk = false;
          const receipt = sealReceipt({
            ok: false,
            code: lastCode,
            status: 'DENY',
            phase: AX_PHASES.EDIT,
            phases: [...lastPhases],
            artifactPath: art.artifactPath,
            intentSummary,
            reason: editResult.reason || 'EDIT failed',
            deny: true,
            decision: 'DENY'
          });
          return maybeThrow(
            sanitizeAxPayload({
              ok: false,
              allow: false,
              deny: true,
              code: lastCode,
              kind: AX_KIND,
              PRODUCTION_READY: AX_PRODUCTION_READY,
              reason: editResult.reason || 'EDIT failed',
              artifactPath: art.artifactPath,
              phases: [...lastPhases],
              receipt
            })
          );
        }
      }
    }

    // ── VERIFY ─────────────────────────────────────────────────────────────
    lastPhases.push(AX_PHASES.VERIFY);
    const verifyOk =
      intent.forceVerifyFail !== true &&
      !(editResult && editResult.verify === false);
    if (!verifyOk) {
      denyCount += 1;
      lastCode = AX_CODES.VERIFY_FAILED;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AX_CODES.VERIFY_FAILED,
        status: 'DENY',
        phase: AX_PHASES.VERIFY,
        phases: [...lastPhases],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: 'VERIFY failed',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AX_CODES.VERIFY_FAILED,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: 'VERIFY failed',
          artifactPath: art.artifactPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    // Optional afLoop verify hook
    if (activeAf && typeof activeAf.verify === 'function') {
      const v = await Promise.resolve(
        activeAf.verify({
          phase: AX_PHASES.VERIFY,
          artifactPath: art.artifactPath,
          plan: planResult,
          edit: editResult
        })
      );
      if (v && v.ok === false) {
        denyCount += 1;
        lastCode = AX_CODES.VERIFY_FAILED;
        lastOk = false;
        const receipt = sealReceipt({
          ok: false,
          code: AX_CODES.VERIFY_FAILED,
          status: 'DENY',
          phase: AX_PHASES.VERIFY,
          phases: [...lastPhases],
          artifactPath: art.artifactPath,
          intentSummary,
          reason: v.reason || 'VERIFY failed',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAxPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AX_CODES.VERIFY_FAILED,
            kind: AX_KIND,
            PRODUCTION_READY: AX_PRODUCTION_READY,
            reason: v.reason || 'VERIFY failed',
            artifactPath: art.artifactPath,
            phases: [...lastPhases],
            receipt
          })
        );
      }
    }

    // ── SEAL ───────────────────────────────────────────────────────────────
    lastPhases.push(AX_PHASES.SEAL);
    const order = assertPhaseOrder(lastPhases);
    if (!order.ok) {
      denyCount += 1;
      lastCode = AX_CODES.PHASE_DENIED;
      lastOk = false;
      const receipt = sealReceipt({
        ok: false,
        code: AX_CODES.PHASE_DENIED,
        status: 'DENY',
        phase: AX_PHASES.SEAL,
        phases: [...lastPhases],
        artifactPath: art.artifactPath,
        intentSummary,
        reason: order.reason,
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow(
        sanitizeAxPayload({
          ok: false,
          allow: false,
          deny: true,
          code: AX_CODES.PHASE_DENIED,
          kind: AX_KIND,
          PRODUCTION_READY: AX_PRODUCTION_READY,
          reason: order.reason,
          artifactPath: art.artifactPath,
          phases: [...lastPhases],
          receipt
        })
      );
    }

    completedCount += 1;
    lastCode = AX_CODES.COMPLETED;
    lastOk = true;
    const receipt = sealReceipt({
      ok: true,
      code: AX_CODES.COMPLETED,
      status: 'COMPLETED',
      phase: AX_PHASES.SEAL,
      phases: [...lastPhases],
      artifactPath: art.artifactPath,
      intentSummary,
      reason: null,
      deny: false,
      decision: 'COMPLETED',
      meta: {
        planOk: planResult?.ok !== false,
        editOk: editResult?.ok !== false,
        hermetic: true
      }
    });

    return sanitizeAxPayload({
      ok: true,
      allow: true,
      deny: false,
      code: AX_CODES.COMPLETED,
      kind: AX_KIND,
      PRODUCTION_READY: AX_PRODUCTION_READY,
      artifactPath: art.artifactPath,
      phases: [...lastPhases],
      plan: planResult?.plan || planResult,
      edit: editResult?.edit || editResult,
      fundacionDelta: 0,
      cloudAgent: false,
      unsupervisedInternetAgency: false,
      productionReadyCodingSaas: false,
      receipt
    });
  }

  function getState() {
    return sanitizeAxPayload({
      kind: AX_KIND,
      PRODUCTION_READY: AX_PRODUCTION_READY,
      loopCount,
      completedCount,
      denyCount,
      lastCode,
      lastOk,
      lastReceiptId,
      lastPhases: [...lastPhases],
      receiptCount: receipts.length,
      fundacionDelta: 0,
      cloudAgent: false,
      unsupervisedInternetAgency: false,
      productionReadyCodingSaas: false
    });
  }

  function health() {
    return {
      kind: AX_KIND,
      PRODUCTION_READY: AX_PRODUCTION_READY,
      ok: true,
      cloudAgent: false,
      usesCloudAgent: false,
      unsupervisedInternetAgency: false,
      productionReadyCodingSaas: false,
      codingSaasClaim: false,
      internetFacingAgency: false,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      antigravityFirst: true,
      ladder17: 'CLOSED',
      ladder18: 'OPEN',
      axis: 'Sovereign Developer Engine'
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    denyCount += 1;
    lastCode = AX_CODES.FUNDACION_DENY;
    lastOk = false;
    const receipt = sealReceipt({
      ok: false,
      code: AX_CODES.FUNDACION_DENY,
      status: 'DENY',
      phase: AX_PHASES.SEAL,
      phases: [],
      reason: 'Fundacion ALWAYS_DENY',
      deny: true,
      decision: 'DENY'
    });
    return sanitizeAxPayload({
      ok: false,
      allow: false,
      deny: true,
      code: AX_CODES.FUNDACION_DENY,
      fundacionDelta: 0,
      reason: 'Fundacion ALWAYS_DENY',
      receipt
    });
  }

  return {
    kind: AX_KIND,
    PRODUCTION_READY: AX_PRODUCTION_READY,
    codes: AX_CODES,
    runGovernedCodeLoop,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    // re-export helpers for tests
    sanitizeAxPayload,
    // NON-CLAIM
    cloudAgent: false,
    unsupervisedInternetAgency: false,
    productionReadyCodingSaas: false
  };
}

/**
 * One-shot convenience: create engine (optional opts) and run loop.
 * @param {object} req
 * @param {object} [engineOpts]
 */
export async function runGovernedCodeLoop(req, engineOpts = {}) {
  const engine = createSovereignDeveloperEngine(engineOpts);
  return engine.runGovernedCodeLoop(req);
}

export {
  AX_PHASES,
  AX_PHASE_ORDER,
  AX_PHASES_KIND,
  AX_PHASES_PRODUCTION_READY,
  isValidPhase,
  phaseIndex,
  nextPhase,
  canTransition,
  assertPhaseOrder,
  AX_POLICY_GATE_KIND,
  AX_POLICY_GATE_PRODUCTION_READY,
  AX_POLICY_CODES,
  DEFAULT_ALLOWLISTED_ARTIFACTS,
  deny,
  denyBudget,
  denyHitl,
  denyLawVi,
  denyFundacion,
  denyArtifactNotAllowlisted,
  denyInvalidRequest,
  normalizeGateResult,
  checkArtifactAllowlisted,
  createPolicyGate,
  AX_RECEIPT_KIND,
  AX_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildEngineReceipt
};

export default {
  AX_KIND,
  AX_PRODUCTION_READY,
  AX_CODES,
  createSovereignDeveloperEngine,
  runGovernedCodeLoop,
  sanitizeAxPayload,
  SovereignDeveloperEngineError
};
