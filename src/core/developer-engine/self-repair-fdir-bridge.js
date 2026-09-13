/**
 * @module self-repair-fdir-bridge
 * SPEC-0057 / Mission AZ — Deterministic Self-Repair & FDIR Remediation Bridge.
 *
 * Hermetic bridge:
 *   proposeRepair({ fault, allowlist, ports }) → classify → plan → seal
 *
 * Optional injectable ports (compose/extend — do NOT rewrite V/AX/AY):
 *   ports.fdirRemediator / ports.fdirPort — V-style FDIR loop fake
 *   ports.axFault / ports.axEngine       — AX loop fault surface fake
 *
 * Fail-closed: unbounded self-mod / Fundacion writes / Law VI leakage → DENY.
 * WHILE self-repair in progress → no AGI claim; PRODUCTION_READY=NO.
 *
 * NON-CLAIM:
 *   bridge ≠ unbounded self-modifying AGI /
 *   ≠ unsupervised internet remediator /
 *   ≠ CloudAgent self-heal fleet
 *   not BA/BB
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 OPEN; AX+AY MEASURED
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AZ_CEILING
 */

import {
  AZ_CLASSIFIER_KIND,
  AZ_CLASSIFIER_PRODUCTION_READY,
  FAULT_CLASSES,
  REMEDIABLE_CLASSES,
  DENY_CLASSES,
  classifyFault,
  isRemediableClass,
  isDenyClass
} from './fault-classifier.js';
import {
  AZ_PLAN_KIND,
  AZ_PLAN_PRODUCTION_READY,
  PLAN_ACTIONS,
  stableStringify as planStableStringify,
  planHash,
  stepsForClass,
  buildRepairPlan
} from './repair-plan.js';
import {
  AZ_RECEIPT_KIND,
  AZ_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildRepairReceipt
} from './repair-receipt.js';
import {
  AZ_POLICY_GATE_KIND,
  AZ_POLICY_GATE_PRODUCTION_READY,
  AZ_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyUnboundedSelfMod,
  denyFundacion,
  denyLawVi,
  denyNotRemediable,
  denyInvalidFault,
  denyInvalidRequest,
  denyHitlRequired,
  checkPathAllowlisted,
  createRepairPolicyGate
} from './repair-policy-gate.js';

/** @type {'NO'} */
export const AZ_PRODUCTION_READY = 'NO';

export const AZ_KIND = 'eos-deterministic-self-repair-fdir-bridge';

export const AZ_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  UNBOUNDED_SELF_MOD_FORBIDDEN: 'UNBOUNDED_SELF_MOD_FORBIDDEN',
  FUNDACION_DENY: 'FUNDACION_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  NOT_REMEDIABLE: 'NOT_REMEDIABLE',
  INVALID_FAULT: 'INVALID_FAULT',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  HITL_REQUIRED: 'HITL_REQUIRED'
});

export const AZ_PHASES = Object.freeze({
  CLASSIFY: 'CLASSIFY',
  GATE: 'GATE',
  PLAN: 'PLAN',
  BRIDGE: 'BRIDGE',
  SEAL: 'SEAL'
});

export const AZ_PHASE_ORDER = Object.freeze([
  AZ_PHASES.CLASSIFY,
  AZ_PHASES.GATE,
  AZ_PHASES.PLAN,
  AZ_PHASES.BRIDGE,
  AZ_PHASES.SEAL
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

/**
 * Typed error for Self-Repair FDIR Bridge failures.
 */
export class SelfRepairFdirBridgeError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AZ_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'SelfRepairFdirBridgeError';
    this.code = code;
    this.details = sanitizeAzPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAzPayload(obj) {
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
    if (
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|planHash)$/i.test(
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
 * Map deny-class → AZ_CODES.
 * @param {string} faultClass
 * @returns {string}
 */
function denyCodeForClass(faultClass) {
  switch (faultClass) {
    case FAULT_CLASSES.UNBOUNDED_SELF_MOD:
      return AZ_CODES.UNBOUNDED_SELF_MOD_FORBIDDEN;
    case FAULT_CLASSES.FUNDACION_WRITE:
      return AZ_CODES.FUNDACION_DENY;
    case FAULT_CLASSES.LAW_VI_LEAK:
      return AZ_CODES.LAW_VI_DENY;
    case FAULT_CLASSES.UNKNOWN:
      return AZ_CODES.NOT_REMEDIABLE;
    default:
      return AZ_CODES.DENY;
  }
}

/**
 * Create the Deterministic Self-Repair & FDIR Remediation Bridge.
 *
 * Optional injectable hooks (do NOT rewrite V/AX/AY):
 *   ports.fdirRemediator / ports.fdirPort — optional V-like FDIR surface
 *   ports.axFault / ports.axEngine       — optional AX-like fault surface
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createSelfRepairFdirBridge(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const fdirRemediator =
    portsIn.fdirRemediator ||
    portsIn.fdirPort ||
    options.fdirRemediator ||
    options.fdirPort ||
    null;
  const axFault =
    portsIn.axFault ||
    portsIn.axEngine ||
    options.axFault ||
    options.axEngine ||
    null;

  const allowlisted =
    options.allowlistedPaths ||
    options.allowlist ||
    (options.policies && options.policies.allowlistedPaths) ||
    DEFAULT_ALLOWLISTED_PATHS;

  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const policyGate = createRepairPolicyGate({
    allowlistedPaths: [...allowlisted]
  });

  let proposeCount = 0;
  let completedCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  let inProgress = false;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  function sealReceipt(body) {
    const receipt = buildRepairReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeAzPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new SelfRepairFdirBridgeError(
        result.reason || result.code || 'DENY',
        result.code || AZ_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  /**
   * Main API: propose a deterministic self-repair plan via FDIR bridge.
   *
   * @param {object} req
   * @param {object|string} [req.fault]
   * @param {string[]} [req.allowlist]
   * @param {object} [req.ports]
   * @param {boolean} [req.fundacion]
   * @returns {object}
   */
  function proposeRepair(req = {}) {
    proposeCount += 1;
    lastPhases = [];
    inProgress = true;

    try {
      if (req == null || typeof req !== 'object') {
        denyCount += 1;
        lastCode = AZ_CODES.INVALID_REQUEST;
        lastOk = false;
        const receipt = sealReceipt({
          ok: false,
          code: AZ_CODES.INVALID_REQUEST,
          status: 'DENY',
          phase: AZ_PHASES.CLASSIFY,
          phases: [],
          reason: 'proposeRepair() requires an object request',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAzPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AZ_CODES.INVALID_REQUEST,
            kind: AZ_KIND,
            PRODUCTION_READY: AZ_PRODUCTION_READY,
            reason: 'proposeRepair() requires an object request',
            phases: [],
            unboundedSelfModifyingAgi: false,
            unsupervisedInternetRemediator: false,
            cloudAgentSelfHealFleet: false,
            cloudAgent: false,
            fundacionDelta: 0,
            receipt
          })
        );
      }

      // Explicit Fundacion write attempt — ALWAYS DENY
      if (
        req.fundacion === true ||
        req.writeFundacion === true ||
        /fundacion/i.test(String(req.target || ''))
      ) {
        denyCount += 1;
        lastCode = AZ_CODES.FUNDACION_DENY;
        lastOk = false;
        lastPhases = [AZ_PHASES.CLASSIFY, AZ_PHASES.GATE, AZ_PHASES.SEAL];
        const plan = buildRepairPlan({
          faultClass: FAULT_CLASSES.FUNDACION_WRITE,
          denied: true,
          denyCode: AZ_CODES.FUNDACION_DENY,
          artifactPath: req.fault?.artifactPath || null,
          allowlist: req.allowlist || allowlisted
        });
        const receipt = sealReceipt({
          ok: false,
          code: AZ_CODES.FUNDACION_DENY,
          status: 'DENY',
          phase: AZ_PHASES.SEAL,
          phases: [...lastPhases],
          faultClass: FAULT_CLASSES.FUNDACION_WRITE,
          artifactPath: plan.artifactPath,
          planHash: plan.planHash,
          planId: plan.planId,
          reason: 'Fundacion ALWAYS_DENY',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAzPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AZ_CODES.FUNDACION_DENY,
            kind: AZ_KIND,
            PRODUCTION_READY: AZ_PRODUCTION_READY,
            reason: 'Fundacion ALWAYS_DENY',
            fundacionDelta: 0,
            faultClass: FAULT_CLASSES.FUNDACION_WRITE,
            plan,
            phases: [...lastPhases],
            unboundedSelfModifyingAgi: false,
            unsupervisedInternetRemediator: false,
            cloudAgentSelfHealFleet: false,
            cloudAgent: false,
            receipt
          })
        );
      }

      // ── CLASSIFY ─────────────────────────────────────────────────────────
      lastPhases.push(AZ_PHASES.CLASSIFY);
      const fault = req.fault;
      if (fault == null) {
        denyCount += 1;
        lastCode = AZ_CODES.INVALID_FAULT;
        lastOk = false;
        lastPhases.push(AZ_PHASES.SEAL);
        const receipt = sealReceipt({
          ok: false,
          code: AZ_CODES.INVALID_FAULT,
          status: 'DENY',
          phase: AZ_PHASES.SEAL,
          phases: [...lastPhases],
          reason: 'fault required',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAzPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AZ_CODES.INVALID_FAULT,
            kind: AZ_KIND,
            PRODUCTION_READY: AZ_PRODUCTION_READY,
            reason: 'fault required',
            phases: [...lastPhases],
            unboundedSelfModifyingAgi: false,
            unsupervisedInternetRemediator: false,
            cloudAgentSelfHealFleet: false,
            cloudAgent: false,
            fundacionDelta: 0,
            receipt
          })
        );
      }

      const classification = classifyFault(fault);
      const faultClass = classification.class;
      const artifactPath =
        (typeof fault === 'object' && fault?.artifactPath) ||
        req.artifactPath ||
        null;
      const effectiveAllow = req.allowlist || req.allowlistedPaths || allowlisted;

      // ── GATE ─────────────────────────────────────────────────────────────
      lastPhases.push(AZ_PHASES.GATE);

      // Path allowlist when present (for remediable syntax/dep/schema)
      if (
        artifactPath &&
        classification.remediable &&
        (faultClass === FAULT_CLASSES.SYNTAX_ERROR ||
          faultClass === FAULT_CLASSES.MISSING_DEPENDENCY ||
          faultClass === FAULT_CLASSES.SCHEMA_DEVIATION)
      ) {
        const art = checkPathAllowlisted(artifactPath, effectiveAllow);
        if (!art.ok) {
          denyCount += 1;
          lastCode = AZ_CODES.INVALID_REQUEST;
          lastOk = false;
          lastPhases.push(AZ_PHASES.SEAL);
          const plan = buildRepairPlan({
            faultClass,
            denied: true,
            denyCode: AZ_CODES.INVALID_REQUEST,
            artifactPath,
            allowlist: effectiveAllow
          });
          const receipt = sealReceipt({
            ok: false,
            code: AZ_CODES.INVALID_REQUEST,
            status: 'DENY',
            phase: AZ_PHASES.SEAL,
            phases: [...lastPhases],
            faultClass,
            artifactPath: art.artifactPath || artifactPath,
            planHash: plan.planHash,
            planId: plan.planId,
            reason: art.reason || 'path not allowlisted',
            deny: true,
            decision: 'DENY'
          });
          return maybeThrow(
            sanitizeAzPayload({
              ok: false,
              allow: false,
              deny: true,
              code: AZ_CODES.INVALID_REQUEST,
              kind: AZ_KIND,
              PRODUCTION_READY: AZ_PRODUCTION_READY,
              reason: art.reason || 'path not allowlisted',
              faultClass,
              classification,
              plan,
              phases: [...lastPhases],
              unboundedSelfModifyingAgi: false,
              unsupervisedInternetRemediator: false,
              cloudAgentSelfHealFleet: false,
              cloudAgent: false,
              fundacionDelta: 0,
              receipt
            })
          );
        }
      }

      // DENY classes → sealed DENY
      if (classification.deny || isDenyClass(faultClass)) {
        denyCount += 1;
        const code = denyCodeForClass(faultClass);
        lastCode = code;
        lastOk = false;
        lastPhases.push(AZ_PHASES.PLAN, AZ_PHASES.SEAL);
        const plan = buildRepairPlan({
          faultClass,
          denied: true,
          denyCode: code,
          artifactPath,
          allowlist: effectiveAllow
        });
        const receipt = sealReceipt({
          ok: false,
          code,
          status: 'DENY',
          phase: AZ_PHASES.SEAL,
          phases: [...lastPhases],
          faultClass,
          artifactPath: artifactPath
            ? String(artifactPath).replace(/\\/g, '/')
            : null,
          planHash: plan.planHash,
          planId: plan.planId,
          reason: classification.reason,
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAzPayload({
            ok: false,
            allow: false,
            deny: true,
            code,
            kind: AZ_KIND,
            PRODUCTION_READY: AZ_PRODUCTION_READY,
            reason: classification.reason,
            faultClass,
            classification,
            plan,
            phases: [...lastPhases],
            unboundedSelfModifyingAgi: false,
            unsupervisedInternetRemediator: false,
            cloudAgentSelfHealFleet: false,
            cloudAgent: false,
            fundacionDelta: 0,
            receipt
          })
        );
      }

      // Not remediable (UNKNOWN etc.)
      if (!classification.remediable) {
        denyCount += 1;
        lastCode = AZ_CODES.NOT_REMEDIABLE;
        lastOk = false;
        lastPhases.push(AZ_PHASES.PLAN, AZ_PHASES.SEAL);
        const plan = buildRepairPlan({
          faultClass,
          denied: true,
          denyCode: AZ_CODES.NOT_REMEDIABLE,
          artifactPath,
          allowlist: effectiveAllow
        });
        const receipt = sealReceipt({
          ok: false,
          code: AZ_CODES.NOT_REMEDIABLE,
          status: 'DENY',
          phase: AZ_PHASES.SEAL,
          phases: [...lastPhases],
          faultClass,
          artifactPath: artifactPath
            ? String(artifactPath).replace(/\\/g, '/')
            : null,
          planHash: plan.planHash,
          planId: plan.planId,
          reason: classification.reason || 'not remediable',
          deny: true,
          decision: 'DENY'
        });
        return maybeThrow(
          sanitizeAzPayload({
            ok: false,
            allow: false,
            deny: true,
            code: AZ_CODES.NOT_REMEDIABLE,
            kind: AZ_KIND,
            PRODUCTION_READY: AZ_PRODUCTION_READY,
            reason: classification.reason || 'not remediable',
            faultClass,
            classification,
            plan,
            phases: [...lastPhases],
            unboundedSelfModifyingAgi: false,
            unsupervisedInternetRemediator: false,
            cloudAgentSelfHealFleet: false,
            cloudAgent: false,
            fundacionDelta: 0,
            receipt
          })
        );
      }

      // ── PLAN ─────────────────────────────────────────────────────────────
      lastPhases.push(AZ_PHASES.PLAN);
      const plan = buildRepairPlan({
        faultClass,
        classification,
        denied: false,
        artifactPath: artifactPath
          ? String(artifactPath).replace(/\\/g, '/')
          : null,
        allowlist: effectiveAllow
      });

      // Budget trip always includes HITL escalate step — surface HITL flag
      const hitlRequired =
        faultClass === FAULT_CLASSES.BUDGET_TRIP ||
        plan.steps.some((s) => s.action === PLAN_ACTIONS.ESCALATE_HITL);

      // ── BRIDGE (optional FDIR / AX inject — compose only) ────────────────
      lastPhases.push(AZ_PHASES.BRIDGE);
      let fdirMeta = null;
      let axMeta = null;

      const reqPorts =
        req.ports && typeof req.ports === 'object' ? req.ports : {};
      const activeFdir =
        reqPorts.fdirRemediator ||
        reqPorts.fdirPort ||
        fdirRemediator;
      const activeAx = reqPorts.axFault || reqPorts.axEngine || axFault;

      if (activeFdir && typeof activeFdir === 'object') {
        const propose =
          typeof activeFdir.propose === 'function'
            ? activeFdir.propose
            : typeof activeFdir.diagnose === 'function'
              ? activeFdir.diagnose
              : typeof activeFdir.run === 'function'
                ? activeFdir.run
                : null;
        if (propose) {
          try {
            const fr = propose.call(activeFdir, {
              fault,
              plan,
              PRODUCTION_READY: 'NO',
              kind: AZ_KIND
            });
            // Sync only in hermetic bridge (async fakes may return thenable —
            // we only record metadata; never await network)
            if (fr && typeof fr.then === 'function') {
              fdirMeta = { fdirOk: true, async: true, injected: true };
            } else if (fr && fr.ok === false) {
              fdirMeta = {
                fdirOk: false,
                code: fr.code || 'DENY',
                injected: true
              };
            } else {
              fdirMeta = { fdirOk: true, injected: true };
            }
          } catch {
            fdirMeta = { fdirOk: false, injected: true };
          }
        } else {
          fdirMeta = { fdirOk: true, injected: true, noop: true };
        }
      }

      if (activeAx && typeof activeAx === 'object') {
        const report =
          typeof activeAx.reportFault === 'function'
            ? activeAx.reportFault
            : typeof activeAx.getState === 'function'
              ? () => activeAx.getState()
              : null;
        if (report) {
          try {
            const axr = report.call(activeAx, { fault, plan });
            axMeta = {
              axOk: axr?.ok !== false,
              injected: true
            };
          } catch {
            axMeta = { axOk: false, injected: true };
          }
        } else {
          axMeta = { axOk: true, injected: true, noop: true };
        }
      }

      // ── SEAL ─────────────────────────────────────────────────────────────
      lastPhases.push(AZ_PHASES.SEAL);
      completedCount += 1;
      lastCode = hitlRequired ? AZ_CODES.HITL_REQUIRED : AZ_CODES.COMPLETED;
      // HITL_REQUIRED is still a successful bounded plan proposal (ok=true)
      // but surfaces operator escalation — not a DENY.
      const code = hitlRequired ? AZ_CODES.HITL_REQUIRED : AZ_CODES.COMPLETED;
      lastOk = true;
      const receipt = sealReceipt({
        ok: true,
        code,
        status: hitlRequired ? 'HITL_REQUIRED' : 'COMPLETED',
        phase: AZ_PHASES.SEAL,
        phases: [...lastPhases],
        faultClass,
        artifactPath: plan.artifactPath,
        planHash: plan.planHash,
        planId: plan.planId,
        reason: null,
        deny: false,
        decision: hitlRequired ? 'HITL_REQUIRED' : 'COMPLETED',
        meta: {
          hermetic: true,
          bounded: true,
          deterministic: true,
          fdirMeta,
          axMeta,
          hitlRequired
        }
      });

      return sanitizeAzPayload({
        ok: true,
        allow: true,
        deny: false,
        code,
        kind: AZ_KIND,
        PRODUCTION_READY: AZ_PRODUCTION_READY,
        faultClass,
        classification,
        plan,
        phases: [...lastPhases],
        hitlRequired,
        fundacionDelta: 0,
        unboundedSelfModifyingAgi: false,
        unsupervisedInternetRemediator: false,
        cloudAgentSelfHealFleet: false,
        cloudAgent: false,
        fdirInjected: !!(fdirMeta && fdirMeta.injected),
        axInjected: !!(axMeta && axMeta.injected),
        receipt
      });
    } finally {
      inProgress = false;
    }
  }

  function getState() {
    return sanitizeAzPayload({
      kind: AZ_KIND,
      PRODUCTION_READY: AZ_PRODUCTION_READY,
      proposeCount,
      completedCount,
      denyCount,
      lastCode,
      lastOk,
      lastReceiptId,
      lastPhases: [...lastPhases],
      receiptCount: receipts.length,
      inProgress,
      fundacionDelta: 0,
      unboundedSelfModifyingAgi: false,
      unsupervisedInternetRemediator: false,
      cloudAgentSelfHealFleet: false,
      cloudAgent: false
    });
  }

  function health() {
    return {
      kind: AZ_KIND,
      PRODUCTION_READY: AZ_PRODUCTION_READY,
      ok: true,
      unboundedSelfModifyingAgi: false,
      unsupervisedInternetRemediator: false,
      cloudAgentSelfHealFleet: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      antigravityFirst: true,
      ladder17: 'CLOSED',
      ladder18: 'OPEN',
      axisMeasured: 'AX+AY',
      axis: 'Deterministic Self-Repair & FDIR Remediation Bridge',
      inProgress: false
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    denyCount += 1;
    lastCode = AZ_CODES.FUNDACION_DENY;
    lastOk = false;
    const receipt = sealReceipt({
      ok: false,
      code: AZ_CODES.FUNDACION_DENY,
      status: 'DENY',
      phase: AZ_PHASES.SEAL,
      phases: [],
      reason: 'Fundacion ALWAYS_DENY',
      deny: true,
      decision: 'DENY'
    });
    return sanitizeAzPayload({
      ok: false,
      allow: false,
      deny: true,
      code: AZ_CODES.FUNDACION_DENY,
      fundacionDelta: 0,
      reason: 'Fundacion ALWAYS_DENY',
      unboundedSelfModifyingAgi: false,
      unsupervisedInternetRemediator: false,
      cloudAgentSelfHealFleet: false,
      cloudAgent: false,
      receipt
    });
  }

  return {
    kind: AZ_KIND,
    PRODUCTION_READY: AZ_PRODUCTION_READY,
    codes: AZ_CODES,
    proposeRepair,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    classifyFault,
    buildRepairPlan,
    sanitizeAzPayload,
    // NON-CLAIM
    unboundedSelfModifyingAgi: false,
    unsupervisedInternetRemediator: false,
    cloudAgentSelfHealFleet: false,
    cloudAgent: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [bridgeOpts]
 */
export function proposeRepair(req, bridgeOpts = {}) {
  const bridge = createSelfRepairFdirBridge(bridgeOpts);
  return bridge.proposeRepair(req);
}

export {
  AZ_CLASSIFIER_KIND,
  AZ_CLASSIFIER_PRODUCTION_READY,
  FAULT_CLASSES,
  REMEDIABLE_CLASSES,
  DENY_CLASSES,
  classifyFault,
  isRemediableClass,
  isDenyClass,
  AZ_PLAN_KIND,
  AZ_PLAN_PRODUCTION_READY,
  PLAN_ACTIONS,
  planStableStringify,
  planHash,
  stepsForClass,
  buildRepairPlan,
  AZ_RECEIPT_KIND,
  AZ_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildRepairReceipt,
  AZ_POLICY_GATE_KIND,
  AZ_POLICY_GATE_PRODUCTION_READY,
  AZ_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyUnboundedSelfMod,
  denyFundacion,
  denyLawVi,
  denyNotRemediable,
  denyInvalidFault,
  denyInvalidRequest,
  denyHitlRequired,
  checkPathAllowlisted,
  createRepairPolicyGate
};

export default {
  AZ_KIND,
  AZ_PRODUCTION_READY,
  AZ_CODES,
  AZ_PHASES,
  createSelfRepairFdirBridge,
  proposeRepair,
  sanitizeAzPayload,
  SelfRepairFdirBridgeError
};
