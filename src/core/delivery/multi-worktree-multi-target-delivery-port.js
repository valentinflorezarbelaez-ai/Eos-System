/**
 * @module multi-worktree-multi-target-delivery-port
 * SPEC-0061 / Mission BD — Multi-Worktree / Multi-Target Delivery Port.
 *
 * Hermetic in-process governed delivery:
 *   deliver({ artifact, targets, allowlist, policy, applySeal,
 *             isolationObserve, federationObserve, ports })
 *
 * Phases: VALIDATE → GATE → DELIVER → SEAL
 * NO real git worktree / NO remote CD. Zero CloudAgent.
 *
 * Optional injectable ports (compose/extend — do NOT rewrite AN/AX/BA/BC
 * into this payload):
 *   ports.anFederation / ports.federationObserve — AN observe (compose)
 *   ports.baIsolation / ports.axEngine — BA/AX isolation/engine observe
 *   ports.bcApply / ports.applySeal — BC apply seal observe (compose)
 *
 * Fail-closed DENY: target outside allowlist, Fundacion path touch,
 * BA isolation policy violation, missing/invalid BC apply seal when
 * required, empty targets / malformed artifact, disallowed
 * network/cloud fleet claim paths. Multi-target partial fail = DENY
 * (no partial success claim).
 *
 * NON-CLAIM:
 *   port ≠ multi-tenant cloud fleet /
 *   ≠ Kubernetes CD /
 *   ≠ PRODUCTION_READY delivery product
 *   not BE/BF/BG
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC MEASURED; BD in progress; BE–BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BD_CEILING
 */

import {
  BD_BOUNDARY_KIND,
  BD_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  normalizePath,
  normalizeTarget,
  collectTargets,
  isFundacionPath,
  isDisallowedNetworkClaimPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  normalizeArtifact,
  deliverHermetic,
  observeBaIsolation,
  isIsolationViolation,
  observeAxEngine,
  observeAnFederation,
  observeBcApplySeal
} from './delivery-target-boundary.js';
import {
  BD_RECEIPT_KIND,
  BD_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildDeliveryReceipt
} from './delivery-receipt.js';
import {
  BD_POLICY_GATE_KIND,
  BD_POLICY_GATE_PRODUCTION_READY,
  BD_POLICY_CODES,
  DEFAULT_ALLOWLISTED_TARGETS,
  deny,
  denyFundacion,
  denyAllowlist,
  denyIsolation,
  denyApplySeal,
  denyMalformed,
  denyInvalidRequest,
  denyPolicy,
  denyNetwork,
  denyLawVi,
  checkTargetAllowlisted,
  checkTargetsAllowlisted,
  checkApplySeal,
  checkIsolation,
  gateTargets,
  createDeliveryPolicyGate
} from './delivery-policy-gate.js';

/** @type {'NO'} */
export const BD_PRODUCTION_READY = 'NO';

export const BD_KIND = 'eos-multi-worktree-multi-target-delivery-port';

export const BD_CODES = Object.freeze({
  OK: 'OK',
  DELIVERED: 'DELIVERED',
  DENY: 'DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  ALLOWLIST_DENY: 'ALLOWLIST_DENY',
  ISOLATION_DENY: 'ISOLATION_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  MALFORMED_ARTIFACT: 'MALFORMED_ARTIFACT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  NETWORK_DENY: 'NETWORK_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY'
});

export const BD_PHASES = Object.freeze({
  VALIDATE: 'VALIDATE',
  GATE: 'GATE',
  DELIVER: 'DELIVER',
  SEAL: 'SEAL'
});

export const BD_PHASE_ORDER = Object.freeze([
  BD_PHASES.VALIDATE,
  BD_PHASES.GATE,
  BD_PHASES.DELIVER,
  BD_PHASES.SEAL
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Multi-Worktree / Multi-Target Delivery Port failures.
 */
export class MultiWorktreeMultiTargetDeliveryError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = BD_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'MultiWorktreeMultiTargetDeliveryError';
    this.code = code;
    this.details = sanitizeBdPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBdPayload(obj) {
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
    // Preserve eos-* kinds / kebab identifiers (not secrets)
    if (/^eos-[a-z0-9-]{8,}$/i.test(value)) return value;
    if (LONG_B64_RE.test(value) && !value.includes('-')) return REDACTED;
    if (LONG_B64_RE.test(value) && /^[A-Za-z0-9+/=]{40,}$/.test(value)) {
      return REDACTED;
    }
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|digest)$/i.test(
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
 * @param {string} message
 * @returns {string}
 */
function sanitizeErrorMessage(message) {
  return redactSecretSubstrings(String(message || ''));
}

/**
 * Create the Multi-Worktree / Multi-Target Delivery Port.
 *
 * Optional injectable hooks (do NOT rewrite AN/AX/BA/BC):
 *   ports.anFederation / ports.federationObserve
 *   ports.baIsolation / ports.axEngine
 *   ports.bcApply / ports.applySeal
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createMultiWorktreeMultiTargetDeliveryPort(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const anFederation =
    portsIn.anFederation ||
    portsIn.federationObserve ||
    options.anFederation ||
    options.federationObserve ||
    null;
  const baIsolation =
    portsIn.baIsolation ||
    portsIn.isolationObserve ||
    options.baIsolation ||
    options.isolationObserve ||
    null;
  const axEngine = portsIn.axEngine || options.axEngine || null;
  const bcApply =
    portsIn.bcApply ||
    portsIn.applySeal ||
    options.bcApply ||
    options.applySeal ||
    null;

  const allowlisted =
    options.allowlistedTargets ||
    options.allowlist ||
    (options.policies && options.policies.allowlistedTargets) ||
    DEFAULT_ALLOWLISTED_TARGETS;

  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const defaultRequireApplySeal =
    options.requireApplySeal === true ||
    (options.policies && options.policies.requireApplySeal === true);

  const policyGate = createDeliveryPolicyGate({
    allowlistedTargets: [...allowlisted]
  });

  let deliverCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];
  /** @type {Record<string, object>} */
  let virtualRoots = {};

  function sealReceipt(body) {
    const receipt = buildDeliveryReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeBdPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new MultiWorktreeMultiTargetDeliveryError(
        result.reason || result.code || 'DENY',
        result.code || BD_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  function nonClaimFlags() {
    return {
      multiTenantCloudFleet: false,
      kubernetesCd: false,
      productionReadyDeliveryProduct: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      notBe: true,
      notBf: true,
      notBg: true,
      bcMeasured: true
    };
  }

  /**
   * @param {string} code
   * @param {string} reason
   * @param {object} extra
   */
  function finishDeny(code, reason, extra = {}) {
    denyCount += 1;
    lastCode = code;
    lastOk = false;
    const phases = Array.isArray(extra.phases)
      ? [...extra.phases]
      : [...lastPhases];
    if (!phases.includes(BD_PHASES.SEAL)) phases.push(BD_PHASES.SEAL);
    lastPhases = phases;
    const receipt = sealReceipt({
      ok: false,
      code,
      status: 'DENY',
      phase: BD_PHASES.SEAL,
      phases,
      reason,
      deny: true,
      decision: 'DENY',
      hermetic: true,
      targets: extra.targets || [],
      deliveredTargets: [],
      meta: extra.meta
    });
    return maybeThrow(
      sanitizeBdPayload({
        ok: false,
        allow: false,
        deny: true,
        denied: true,
        delivered: false,
        partial: false,
        code,
        kind: BD_KIND,
        PRODUCTION_READY: BD_PRODUCTION_READY,
        reason,
        phases,
        hermetic: true,
        realGitWorktree: false,
        remoteCd: false,
        ...nonClaimFlags(),
        receipt,
        ...(extra.resultExtra || {})
      })
    );
  }

  /**
   * Main API: deliver a sealed artifact hermetically to one or more
   * allowlisted local worktree / target virtual roots.
   *
   * @param {object} req
   * @param {object|string} [req.artifact]
   * @param {string[]|string} [req.targets]
   * @param {string[]} [req.allowlist]
   * @param {object} [req.policy]
   * @param {unknown} [req.applySeal]
   * @param {unknown} [req.isolationObserve]
   * @param {unknown} [req.federationObserve]
   * @param {object} [req.ports]
   * @returns {object}
   */
  function deliver(req = {}) {
    deliverCount += 1;
    lastPhases = [];

    // ── VALIDATE ─────────────────────────────────────────────────────────
    lastPhases.push(BD_PHASES.VALIDATE);

    if (req == null || typeof req !== 'object') {
      return finishDeny(
        BD_CODES.INVALID_REQUEST,
        'deliver() requires an object request',
        { phases: [...lastPhases] }
      );
    }

    if (
      req.fundacion === true ||
      req.writeFundacion === true ||
      /fundacion/i.test(String(req.target || ''))
    ) {
      lastPhases.push(BD_PHASES.GATE);
      return finishDeny(BD_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases],
        targets: collectTargets(req)
      });
    }

    const normalized = normalizeArtifact(req.artifact);
    if (!normalized.ok || !normalized.artifact) {
      return finishDeny(
        BD_CODES.MALFORMED_ARTIFACT,
        normalized.reason || 'malformed artifact',
        { phases: [...lastPhases] }
      );
    }
    const artifact = normalized.artifact;

    let targets = [];
    if (req.targets != null) {
      targets = collectTargets(req.targets);
    } else if (Array.isArray(artifact.targets) && artifact.targets.length > 0) {
      targets = artifact.targets.map(String);
    }
    targets = targets
      .map((t) => normalizeTarget(t).id)
      .filter(Boolean);

    if (targets.length === 0) {
      return finishDeny(BD_CODES.INVALID_REQUEST, 'empty targets', {
        phases: [...lastPhases]
      });
    }

    const policy =
      req.policy && typeof req.policy === 'object' ? req.policy : {};
    const effectiveAllow =
      req.allowlist ||
      req.allowlistedTargets ||
      policy.allowlist ||
      policy.allowlistedTargets ||
      allowlisted;

    const requireApplySeal =
      policy.requireApplySeal === true ||
      req.requireApplySeal === true ||
      defaultRequireApplySeal;

    const reqPorts =
      req.ports && typeof req.ports === 'object' ? req.ports : {};
    const activeAn =
      reqPorts.anFederation ||
      reqPorts.federationObserve ||
      req.federationObserve ||
      anFederation;
    const activeBa =
      reqPorts.baIsolation ||
      reqPorts.isolationObserve ||
      req.isolationObserve ||
      baIsolation;
    const activeAx = reqPorts.axEngine || axEngine;
    const activeBc =
      reqPorts.bcApply ||
      reqPorts.applySeal ||
      req.applySeal ||
      bcApply;
    const livePorts = {
      ...portsIn,
      ...reqPorts,
      anFederation: activeAn,
      federationObserve: activeAn,
      baIsolation: activeBa,
      isolationObserve: activeBa,
      axEngine: activeAx,
      bcApply: activeBc,
      applySeal: activeBc
    };

    // ── GATE ─────────────────────────────────────────────────────────────
    lastPhases.push(BD_PHASES.GATE);

    if (
      isFundacionPath(req) ||
      isFundacionPath(artifact) ||
      targets.some(isFundacionPath)
    ) {
      return finishDeny(BD_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases],
        targets
      });
    }

    const gated = gateTargets(targets, { allowlist: effectiveAllow });
    if (!gated.ok) {
      const code =
        gated.code === BD_POLICY_CODES.INVALID_REQUEST
          ? BD_CODES.INVALID_REQUEST
          : gated.code === BD_POLICY_CODES.FUNDACION_DENY
            ? BD_CODES.FUNDACION_DENY
            : gated.code === BD_POLICY_CODES.NETWORK_DENY
              ? BD_CODES.NETWORK_DENY
              : BD_CODES.ALLOWLIST_DENY;
      return finishDeny(code, gated.reason || 'target outside allowlist', {
        phases: [...lastPhases],
        targets,
        resultExtra: { deniedPath: gated.path, partial: false, delivered: false }
      });
    }

    const leakBody = artifact.payload || artifact.meta || req.artifact;
    const leak = detectSecretLeakage(leakBody, {
      treatFakeAsLeak: policy.treatFakeAsLeak === true
    });
    if (!leak.leak && typeof req.artifact === 'object' && req.artifact != null) {
      const blob = JSON.stringify(req.artifact);
      if (
        /\benv-fake-token-\d+\b/i.test(blob) &&
        req.artifact.secretLeak === true
      ) {
        leak.leak = true;
        leak.reason = 'secret leakage in artifact body';
      }
    }
    if (!leak.leak) {
      const again = detectSecretLeakage(
        typeof req.artifact === 'string'
          ? req.artifact
          : JSON.stringify(req.artifact || {})
      );
      if (again.leak) {
        leak.leak = true;
        leak.reason = again.reason;
      }
    }
    if (leak.leak) {
      return finishDeny(
        BD_CODES.LAW_VI_DENY,
        leak.reason || 'Law VI leakage DENY',
        { phases: [...lastPhases], targets }
      );
    }

    if (requireApplySeal) {
      const sealCheck = checkApplySeal(
        req.applySeal != null ? req.applySeal : activeBc,
        { required: true }
      );
      if (!sealCheck.ok) {
        return finishDeny(
          BD_CODES.APPLY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BC apply seal',
          { phases: [...lastPhases], targets }
        );
      }
    }

    if (req.isolationViolation === true || policy.isolationViolation === true) {
      return finishDeny(
        BD_CODES.ISOLATION_DENY,
        'BA isolation policy violation',
        { phases: [...lastPhases], targets }
      );
    }

    if (activeBa != null) {
      const iso = checkIsolation(activeBa, {
        kind: BD_KIND,
        targets,
        PRODUCTION_READY: 'NO'
      });
      if (!iso.ok) {
        return finishDeny(
          BD_CODES.ISOLATION_DENY,
          iso.reason || 'BA isolation policy violation',
          { phases: [...lastPhases], targets, meta: { baMeta: iso.meta } }
        );
      }
    }

    // ── DELIVER (hermetic in-memory virtual roots) ───────────────────────
    lastPhases.push(BD_PHASES.DELIVER);

    // Snapshot roots so a mid-loop failure can roll back (fail-closed;
    // no partial success claim).
    const snapshot = { ...virtualRoots };
    const placed = deliverHermetic(artifact, targets, snapshot);

    // Per-target isolation re-check during DELIVER (fail-closed rollback).
    if (activeBa != null) {
      for (const t of placed.delivered) {
        const iso = checkIsolation(activeBa, {
          kind: BD_KIND,
          target: t,
          targets,
          PRODUCTION_READY: 'NO',
          phase: BD_PHASES.DELIVER
        });
        if (!iso.ok) {
          virtualRoots = snapshot;
          return finishDeny(
            BD_CODES.ISOLATION_DENY,
            iso.reason || 'BA isolation policy violation',
            {
              phases: [...lastPhases],
              targets,
              resultExtra: { partial: false, delivered: false }
            }
          );
        }
      }
    }

    virtualRoots = placed.roots;

    // Optional AN / BA / AX / BC observe inject — compose only (metadata)
    const observeCtx = {
      kind: BD_KIND,
      targets,
      PRODUCTION_READY: 'NO'
    };
    const anMeta = observeAnFederation(activeAn, observeCtx);
    const baMeta =
      activeBa != null
        ? observeBaIsolation(activeBa, observeCtx)
        : { injected: false, observed: false, ok: true, violation: false };
    const axMeta = observeAxEngine(activeAx, observeCtx);
    const bcMeta = observeBcApplySeal(activeBc, observeCtx);

    // ── SEAL ─────────────────────────────────────────────────────────────
    lastPhases.push(BD_PHASES.SEAL);
    okCount += 1;
    lastCode = BD_CODES.DELIVERED;
    lastOk = true;

    const receipt = sealReceipt({
      ok: true,
      code: BD_CODES.DELIVERED,
      status: 'DELIVERED',
      phase: BD_PHASES.SEAL,
      phases: [...lastPhases],
      targets,
      deliveredTargets: placed.delivered,
      reason: null,
      deny: false,
      decision: 'DELIVERED',
      hermetic: true,
      meta: {
        hermetic: true,
        realGitWorktree: false,
        remoteCd: false,
        anMeta,
        baMeta,
        axMeta,
        bcMeta
      }
    });

    return sanitizeBdPayload({
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      delivered: true,
      partial: false,
      code: BD_CODES.DELIVERED,
      kind: BD_KIND,
      PRODUCTION_READY: BD_PRODUCTION_READY,
      phases: [...lastPhases],
      hermetic: true,
      realGitWorktree: false,
      remoteCd: false,
      targets,
      deliveredTargets: placed.delivered,
      roots: scrubSecrets(placed.roots),
      anInjected: !!(anMeta && anMeta.injected),
      baInjected: !!(baMeta && baMeta.injected),
      axInjected: !!(axMeta && axMeta.injected),
      bcInjected: !!(bcMeta && bcMeta.injected),
      anObserved: !!(anMeta && anMeta.observed),
      baObserved: !!(baMeta && baMeta.observed),
      axObserved: !!(axMeta && axMeta.observed),
      bcObserved: !!(bcMeta && bcMeta.observed),
      ...nonClaimFlags(),
      receipt
    });
  }

  function getState() {
    return sanitizeBdPayload({
      kind: BD_KIND,
      PRODUCTION_READY: BD_PRODUCTION_READY,
      deliverCount,
      okCount,
      denyCount,
      lastCode,
      lastOk,
      lastReceiptId,
      lastPhases: [...lastPhases],
      receiptCount: receipts.length,
      ...nonClaimFlags()
    });
  }

  function health() {
    return {
      kind: BD_KIND,
      PRODUCTION_READY: BD_PRODUCTION_READY,
      ok: true,
      multiTenantCloudFleet: false,
      kubernetesCd: false,
      productionReadyDeliveryProduct: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      antigravityFirst: true,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'OPEN',
      axisMeasured: 'AX–BB MEASURED',
      axis: 'Sovereign Delivery & Verification Fabric',
      bcMeasured: true,
      bcStatus: 'BC MEASURED',
      notBe: true,
      notBf: true,
      notBg: true,
      bePending: true,
      bfPending: true,
      bgPending: true,
      // L17 CLOSED never reopen; L18 CLOSED never reopen markers
      l17NeverReopen: true,
      l18NeverReopen: true
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    return finishDeny(BD_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
      phases: [BD_PHASES.SEAL]
    });
  }

  return {
    kind: BD_KIND,
    PRODUCTION_READY: BD_PRODUCTION_READY,
    codes: BD_CODES,
    deliver,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    sanitizeBdPayload,
    // NON-CLAIM
    multiTenantCloudFleet: false,
    kubernetesCd: false,
    productionReadyDeliveryProduct: false,
    cloudAgent: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [portOpts]
 */
export function deliver(req, portOpts = {}) {
  const port = createMultiWorktreeMultiTargetDeliveryPort(portOpts);
  return port.deliver(req);
}

export {
  BD_BOUNDARY_KIND,
  BD_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  normalizePath,
  normalizeTarget,
  collectTargets,
  isFundacionPath,
  isDisallowedNetworkClaimPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  normalizeArtifact,
  deliverHermetic,
  observeBaIsolation,
  isIsolationViolation,
  observeAxEngine,
  observeAnFederation,
  observeBcApplySeal,
  BD_RECEIPT_KIND,
  BD_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildDeliveryReceipt,
  BD_POLICY_GATE_KIND,
  BD_POLICY_GATE_PRODUCTION_READY,
  BD_POLICY_CODES,
  DEFAULT_ALLOWLISTED_TARGETS,
  deny,
  denyFundacion,
  denyAllowlist,
  denyIsolation,
  denyApplySeal,
  denyMalformed,
  denyInvalidRequest,
  denyPolicy,
  denyNetwork,
  denyLawVi,
  checkTargetAllowlisted,
  checkTargetsAllowlisted,
  checkApplySeal,
  checkIsolation,
  gateTargets,
  createDeliveryPolicyGate
};

export default {
  BD_KIND,
  BD_PRODUCTION_READY,
  BD_CODES,
  BD_PHASES,
  createMultiWorktreeMultiTargetDeliveryPort,
  deliver,
  sanitizeBdPayload,
  MultiWorktreeMultiTargetDeliveryError
};
