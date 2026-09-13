/**
 * @module local-sandbox-container-port
 * SPEC-0058 / Mission BA — Local Sandboxed Container / Worker Isolation Port.
 *
 * Hermetic in-process sandbox simulator:
 *   runIsolated({ step, rootPrison, allowlist, timeoutMs, networkPolicy, ports })
 *
 * Enforce: filesystem root prison, env scrubbing, process timeout, network block.
 * NO real Docker / daemon required. Zero K8s / managed-SaaS / CloudAgent.
 *
 * Optional injectable ports (compose/extend — do NOT rewrite L9/L10 /
 * compute-worker / AX/AY/AZ into this payload):
 *   ports.computeWorker / ports.l9Worker / ports.l10Isolation
 *   ports.axEngine / ports.ayPort / ports.azRepair
 *
 * Fail-closed: path escape / network egress / Fundacion / timeout / policy
 * breakout → DENY + sealed receipt.
 * WHILE isolation active → no K8s multi-tenant / managed SaaS claim.
 *
 * NON-CLAIM:
 *   port ≠ K8s multi-tenant cloud /
 *   ≠ managed container SaaS /
 *   ≠ CloudAgent remote fleet
 *   not BB
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 OPEN; AX+AY+AZ MEASURED
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BA_CEILING
 */

import {
  BA_BOUNDARY_KIND,
  BA_BOUNDARY_PRODUCTION_READY,
  DEFAULT_ROOT_PRISON,
  DEFAULT_KEEP_ENV,
  REDACTED,
  normalizeAbs,
  normalizePrisonPath,
  isPathInsidePrison,
  detectEscape,
  collectStepPaths,
  detectStepEscape,
  isFundacionPath,
  isNetworkAttempt,
  isPolicyEscape,
  redactSecretSubstrings,
  scrubEnv,
  isEnvScrubbed
} from './sandbox-boundary.js';
import {
  BA_RECEIPT_KIND,
  BA_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildIsolationReceipt
} from './isolation-receipt.js';
import {
  BA_POLICY_GATE_KIND,
  BA_POLICY_GATE_PRODUCTION_READY,
  BA_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyEscape,
  denyNetwork,
  denyFundacion,
  denyTimeout,
  denyInvalidRequest,
  denyPolicy,
  denyMissingDep,
  denyArtifactNotAllowlisted,
  checkPathAllowlisted,
  createSandboxPolicyGate
} from './sandbox-policy-gate.js';

/** @type {'NO'} */
export const BA_PRODUCTION_READY = 'NO';

export const BA_KIND = 'eos-local-sandboxed-container-worker-isolation';

export const BA_CODES = Object.freeze({
  OK: 'OK',
  COMPLETED: 'COMPLETED',
  DENY: 'DENY',
  ESCAPE_DENY: 'ESCAPE_DENY',
  NETWORK_DENY: 'NETWORK_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  POLICY_DENY: 'POLICY_DENY',
  TIMEOUT_DENY: 'TIMEOUT_DENY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_DEP: 'MISSING_DEP',
  ARTIFACT_NOT_ALLOWLISTED: 'ARTIFACT_NOT_ALLOWLISTED'
});

export const BA_PHASES = Object.freeze({
  VALIDATE: 'VALIDATE',
  GATE: 'GATE',
  BOUNDARY: 'BOUNDARY',
  ISOLATE: 'ISOLATE',
  SEAL: 'SEAL'
});

export const BA_PHASE_ORDER = Object.freeze([
  BA_PHASES.VALIDATE,
  BA_PHASES.GATE,
  BA_PHASES.BOUNDARY,
  BA_PHASES.ISOLATE,
  BA_PHASES.SEAL
]);

export const DEFAULT_TIMEOUT_MS = 5000;

export const DEFAULT_NETWORK_POLICY = 'deny-all';

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Local Sandbox Isolation Port failures.
 */
export class LocalSandboxIsolationError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = BA_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'LocalSandboxIsolationError';
    this.code = code;
    this.details = sanitizeBaPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBaPayload(obj) {
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|timeoutMs)$/i.test(
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
 * Normalize a step input into a plain object.
 * @param {unknown} step
 * @returns {object|null}
 */
export function normalizeStep(step) {
  if (step == null) return null;
  if (typeof step === 'string') {
    return { id: step, action: 'exec' };
  }
  if (typeof step !== 'object') return null;
  return /** @type {object} */ (step);
}

/**
 * Missing-dependency signal on a step / ports surface.
 * @param {object} step
 * @param {object} ports
 * @returns {boolean}
 */
export function isMissingDep(step, ports = {}) {
  if (!step || typeof step !== 'object') return false;
  if (step.missingDep === true) return true;
  const code = String(step.code || step.errorCode || '').toUpperCase();
  if (code === 'MISSING_DEP' || code === 'ERR_MODULE_NOT_FOUND') return true;
  const requires = step.requires != null ? String(step.requires) : '';
  if (!requires) return false;
  const key = requires.toLowerCase();
  const has =
    ports[requires] ||
    ports[key] ||
    (key.includes('worker') &&
      (ports.computeWorker || ports.l9Worker || ports.l10Isolation)) ||
    (key.includes('ax') && ports.axEngine) ||
    (key.includes('ay') && ports.ayPort) ||
    (key.includes('az') && ports.azRepair);
  return !has;
}

/**
 * Create the Local Sandboxed Container / Worker Isolation Port.
 *
 * Optional injectable hooks (do NOT rewrite L9/L10 / AX/AY/AZ):
 *   ports.computeWorker / ports.l9Worker / ports.l10Isolation
 *   ports.axEngine / ports.ayPort / ports.azRepair
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createLocalSandboxContainerPort(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const computeWorker =
    portsIn.computeWorker ||
    portsIn.l9Worker ||
    portsIn.l10Isolation ||
    portsIn.workerIsolation ||
    options.computeWorker ||
    options.l9Worker ||
    options.l10Isolation ||
    null;
  const axEngine = portsIn.axEngine || options.axEngine || null;
  const ayPort = portsIn.ayPort || portsIn.astPort || options.ayPort || null;
  const azRepair =
    portsIn.azRepair || portsIn.selfRepair || options.azRepair || null;

  const allowlisted =
    options.allowlistedPaths ||
    options.allowlist ||
    (options.policies && options.policies.allowlistedPaths) ||
    DEFAULT_ALLOWLISTED_PATHS;

  const defaultPrison = normalizePrisonPath(
    options.rootPrison || DEFAULT_ROOT_PRISON
  );
  const defaultTimeout =
    typeof options.timeoutMs === 'number' && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const policyGate = createSandboxPolicyGate({
    allowlistedPaths: [...allowlisted]
  });

  let runCount = 0;
  let completedCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  let isolationActive = false;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  function sealReceipt(body) {
    const receipt = buildIsolationReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeBaPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new LocalSandboxIsolationError(
        result.reason || result.code || 'DENY',
        result.code || BA_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  function nonClaimFlags() {
    return {
      k8sMultiTenantCloud: false,
      managedContainerSaas: false,
      cloudAgentRemoteFleet: false,
      cloudAgent: false,
      usesDockerDaemon: false,
      usesCloudAgent: false,
      fundacionDelta: 0
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
    const phases = Array.isArray(extra.phases) ? [...extra.phases] : [...lastPhases];
    if (!phases.includes(BA_PHASES.SEAL)) phases.push(BA_PHASES.SEAL);
    lastPhases = phases;
    const receipt = sealReceipt({
      ok: false,
      code,
      status: 'DENY',
      phase: BA_PHASES.SEAL,
      phases,
      reason,
      deny: true,
      decision: 'DENY',
      isolated: false,
      hermetic: true,
      artifactPath: extra.artifactPath != null ? extra.artifactPath : null,
      rootPrison: extra.rootPrison != null ? extra.rootPrison : defaultPrison,
      networkPolicy: extra.networkPolicy || DEFAULT_NETWORK_POLICY,
      timeoutMs: extra.timeoutMs != null ? extra.timeoutMs : defaultTimeout,
      meta: extra.meta
    });
    return maybeThrow(
      sanitizeBaPayload({
        ok: false,
        allow: false,
        deny: true,
        code,
        kind: BA_KIND,
        PRODUCTION_READY: BA_PRODUCTION_READY,
        reason,
        phases,
        isolated: false,
        hermetic: true,
        dockerDaemon: false,
        isolationActive: false,
        ...nonClaimFlags(),
        receipt,
        ...(extra.resultExtra || {})
      })
    );
  }

  /**
   * Main API: run a developer-engine / self-repair step in isolation.
   *
   * @param {object} req
   * @param {object|string} [req.step]
   * @param {string} [req.rootPrison]
   * @param {string[]} [req.allowlist]
   * @param {number} [req.timeoutMs]
   * @param {string|object} [req.networkPolicy]
   * @param {object} [req.ports]
   * @returns {object}
   */
  function runIsolated(req = {}) {
    runCount += 1;
    lastPhases = [];
    isolationActive = true;

    try {
      // ── VALIDATE ───────────────────────────────────────────────────────
      lastPhases.push(BA_PHASES.VALIDATE);

      if (req == null || typeof req !== 'object') {
        return finishDeny(
          BA_CODES.INVALID_REQUEST,
          'runIsolated() requires an object request',
          { phases: [...lastPhases] }
        );
      }

      if (
        req.fundacion === true ||
        req.writeFundacion === true ||
        /fundacion/i.test(String(req.target || ''))
      ) {
        lastPhases.push(BA_PHASES.GATE);
        return finishDeny(BA_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
          phases: [...lastPhases],
          artifactPath: req.step?.artifactPath || req.target || null
        });
      }

      const step = normalizeStep(req.step);
      if (!step) {
        return finishDeny(BA_CODES.INVALID_REQUEST, 'step required', {
          phases: [...lastPhases]
        });
      }

      if (req.rootPrison !== undefined && String(req.rootPrison).trim() === '') {
        return finishDeny(BA_CODES.INVALID_REQUEST, 'rootPrison empty', {
          phases: [...lastPhases]
        });
      }

      const prison = normalizePrisonPath(req.rootPrison || defaultPrison);
      const effectiveAllow =
        req.allowlist || req.allowlistedPaths || allowlisted;
      const timeoutMs =
        typeof req.timeoutMs === 'number' && req.timeoutMs > 0
          ? req.timeoutMs
          : typeof step.timeoutMs === 'number' && step.timeoutMs > 0
            ? step.timeoutMs
            : defaultTimeout;
      const networkPolicy = DEFAULT_NETWORK_POLICY;
      const artifactPath =
        step.artifactPath != null
          ? String(step.artifactPath).replace(/\\/g, '/')
          : null;

      const reqPorts =
        req.ports && typeof req.ports === 'object' ? req.ports : {};
      const activeWorker =
        reqPorts.computeWorker ||
        reqPorts.l9Worker ||
        reqPorts.l10Isolation ||
        computeWorker;
      const activeAx = reqPorts.axEngine || axEngine;
      const activeAy = reqPorts.ayPort || reqPorts.astPort || ayPort;
      const activeAz = reqPorts.azRepair || reqPorts.selfRepair || azRepair;
      const livePorts = {
        ...portsIn,
        ...reqPorts,
        computeWorker: activeWorker,
        axEngine: activeAx,
        ayPort: activeAy,
        azRepair: activeAz
      };

      // ── GATE ───────────────────────────────────────────────────────────
      lastPhases.push(BA_PHASES.GATE);

      if (isFundacionPath(step) || isFundacionPath(req)) {
        return finishDeny(BA_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
          phases: [...lastPhases],
          artifactPath,
          rootPrison: prison,
          timeoutMs,
          networkPolicy
        });
      }

      if (isNetworkAttempt(step) || req.network === true) {
        return finishDeny(BA_CODES.NETWORK_DENY, 'network egress DENY', {
          phases: [...lastPhases],
          artifactPath,
          rootPrison: prison,
          timeoutMs,
          networkPolicy,
          resultExtra: { networkPolicy }
        });
      }

      if (isPolicyEscape(step)) {
        return finishDeny(BA_CODES.POLICY_DENY, 'policy escape DENY', {
          phases: [...lastPhases],
          artifactPath,
          rootPrison: prison,
          timeoutMs,
          networkPolicy
        });
      }

      if (isMissingDep(step, livePorts)) {
        return finishDeny(BA_CODES.MISSING_DEP, 'missing dependency', {
          phases: [...lastPhases],
          artifactPath,
          rootPrison: prison,
          timeoutMs,
          networkPolicy
        });
      }

      // ── BOUNDARY ───────────────────────────────────────────────────────
      lastPhases.push(BA_PHASES.BOUNDARY);

      const escape = detectStepEscape(step, prison);
      if (escape.escape) {
        return finishDeny(
          BA_CODES.ESCAPE_DENY,
          escape.reason || 'path outside root prison',
          {
            phases: [...lastPhases],
            artifactPath: escape.candidate || artifactPath,
            rootPrison: prison,
            timeoutMs,
            networkPolicy,
            resultExtra: {
              rootPrison: prison,
              escapedPath: escape.candidate
            }
          }
        );
      }

      if (artifactPath) {
        const art = checkPathAllowlisted(artifactPath, effectiveAllow);
        if (!art.ok) {
          return finishDeny(
            BA_CODES.ARTIFACT_NOT_ALLOWLISTED,
            art.reason || 'artifact not allowlisted',
            {
              phases: [...lastPhases],
              artifactPath: art.artifactPath || artifactPath,
              rootPrison: prison,
              timeoutMs,
              networkPolicy
            }
          );
        }
      }

      const scrubbedEnv = scrubEnv(step.env || {});

      // ── ISOLATE (hermetic in-process simulator) ────────────────────────
      lastPhases.push(BA_PHASES.ISOLATE);

      const durationMs =
        typeof step.durationMs === 'number' && step.durationMs >= 0
          ? step.durationMs
          : 0;
      if (durationMs > timeoutMs) {
        return finishDeny(BA_CODES.TIMEOUT_DENY, 'process timeout DENY', {
          phases: [...lastPhases],
          artifactPath,
          rootPrison: prison,
          timeoutMs,
          networkPolicy,
          resultExtra: { timeoutMs, durationMs }
        });
      }

      // Optional L9/L10 compute-worker inject — compose only (metadata)
      let workerMeta = null;
      let axMeta = null;
      let ayMeta = null;
      let azMeta = null;

      if (activeWorker && typeof activeWorker === 'object') {
        const run =
          typeof activeWorker.run === 'function'
            ? activeWorker.run
            : typeof activeWorker.isolate === 'function'
              ? activeWorker.isolate
              : typeof activeWorker.execute === 'function'
                ? activeWorker.execute
                : typeof activeWorker.compute === 'function'
                  ? activeWorker.compute
                  : null;
        if (run) {
          try {
            const wr = run.call(activeWorker, {
              step,
              rootPrison: prison,
              timeoutMs,
              networkPolicy,
              PRODUCTION_READY: 'NO',
              kind: BA_KIND
            });
            if (wr && typeof wr.then === 'function') {
              workerMeta = { workerOk: true, async: true, injected: true };
            } else if (wr && wr.ok === false) {
              workerMeta = {
                workerOk: false,
                code: wr.code || 'DENY',
                injected: true
              };
            } else {
              workerMeta = { workerOk: true, injected: true };
            }
          } catch {
            workerMeta = { workerOk: false, injected: true };
          }
        } else {
          workerMeta = { workerOk: true, injected: true, noop: true };
        }
      }

      if (activeAx && typeof activeAx === 'object') {
        axMeta = { injected: true };
      }
      if (activeAy && typeof activeAy === 'object') {
        ayMeta = { injected: true };
      }
      if (activeAz && typeof activeAz === 'object') {
        azMeta = { injected: true };
      }

      const isolation = {
        filesystem: 'root-prison',
        network: networkPolicy,
        timeoutMs,
        envScrubbed: isEnvScrubbed(scrubbedEnv),
        hermetic: true,
        dockerDaemon: false,
        simulator: 'in-process'
      };

      const simulated = {
        exitCode: 0,
        stdout: step.expectedStdout != null ? String(step.expectedStdout) : 'isolated-ok',
        durationMs,
        hermetic: true,
        dockerDaemon: false
      };

      // ── SEAL ───────────────────────────────────────────────────────────
      lastPhases.push(BA_PHASES.SEAL);
      completedCount += 1;
      lastCode = BA_CODES.COMPLETED;
      lastOk = true;

      const receipt = sealReceipt({
        ok: true,
        code: BA_CODES.COMPLETED,
        status: 'COMPLETED',
        phase: BA_PHASES.SEAL,
        phases: [...lastPhases],
        artifactPath,
        rootPrison: prison,
        networkPolicy,
        timeoutMs,
        reason: null,
        deny: false,
        decision: 'COMPLETED',
        isolated: true,
        hermetic: true,
        meta: {
          hermetic: true,
          isolated: true,
          dockerDaemon: false,
          envScrubbed: isolation.envScrubbed,
          workerMeta,
          axMeta,
          ayMeta,
          azMeta
        }
      });

      return sanitizeBaPayload({
        ok: true,
        allow: true,
        deny: false,
        code: BA_CODES.COMPLETED,
        kind: BA_KIND,
        PRODUCTION_READY: BA_PRODUCTION_READY,
        phases: [...lastPhases],
        isolated: true,
        hermetic: true,
        dockerDaemon: false,
        isolationActive: true,
        rootPrison: prison,
        networkPolicy,
        timeoutMs,
        env: scrubbedEnv,
        isolation,
        simulated,
        workerInjected: !!(workerMeta && workerMeta.injected),
        axInjected: !!(axMeta && axMeta.injected),
        ayInjected: !!(ayMeta && ayMeta.injected),
        azInjected: !!(azMeta && azMeta.injected),
        ...nonClaimFlags(),
        receipt
      });
    } finally {
      isolationActive = false;
    }
  }

  function getState() {
    return sanitizeBaPayload({
      kind: BA_KIND,
      PRODUCTION_READY: BA_PRODUCTION_READY,
      runCount,
      completedCount,
      denyCount,
      lastCode,
      lastOk,
      lastReceiptId,
      lastPhases: [...lastPhases],
      receiptCount: receipts.length,
      isolationActive,
      ...nonClaimFlags()
    });
  }

  function health() {
    return {
      kind: BA_KIND,
      PRODUCTION_READY: BA_PRODUCTION_READY,
      ok: true,
      k8sMultiTenantCloud: false,
      managedContainerSaas: false,
      cloudAgentRemoteFleet: false,
      cloudAgent: false,
      usesDockerDaemon: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      antigravityFirst: true,
      ladder17: 'CLOSED',
      ladder18: 'OPEN',
      axisMeasured: 'AX+AY+AZ',
      axis: 'Local Sandboxed Container / Worker Isolation Port',
      isolationActive: false,
      bbPending: true
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    isolationActive = false;
    return finishDeny(BA_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
      phases: [BA_PHASES.SEAL]
    });
  }

  return {
    kind: BA_KIND,
    PRODUCTION_READY: BA_PRODUCTION_READY,
    codes: BA_CODES,
    runIsolated,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    sanitizeBaPayload,
    // NON-CLAIM
    k8sMultiTenantCloud: false,
    managedContainerSaas: false,
    cloudAgentRemoteFleet: false,
    cloudAgent: false,
    usesDockerDaemon: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [portOpts]
 */
export function runIsolated(req, portOpts = {}) {
  const port = createLocalSandboxContainerPort(portOpts);
  return port.runIsolated(req);
}

export {
  BA_BOUNDARY_KIND,
  BA_BOUNDARY_PRODUCTION_READY,
  DEFAULT_ROOT_PRISON,
  DEFAULT_KEEP_ENV,
  REDACTED,
  normalizeAbs,
  normalizePrisonPath,
  isPathInsidePrison,
  detectEscape,
  collectStepPaths,
  detectStepEscape,
  isFundacionPath,
  isNetworkAttempt,
  isPolicyEscape,
  redactSecretSubstrings,
  scrubEnv,
  isEnvScrubbed,
  BA_RECEIPT_KIND,
  BA_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildIsolationReceipt,
  BA_POLICY_GATE_KIND,
  BA_POLICY_GATE_PRODUCTION_READY,
  BA_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyEscape,
  denyNetwork,
  denyFundacion,
  denyTimeout,
  denyInvalidRequest,
  denyPolicy,
  denyMissingDep,
  denyArtifactNotAllowlisted,
  checkPathAllowlisted,
  createSandboxPolicyGate
};

export default {
  BA_KIND,
  BA_PRODUCTION_READY,
  BA_CODES,
  BA_PHASES,
  createLocalSandboxContainerPort,
  runIsolated,
  sanitizeBaPayload,
  LocalSandboxIsolationError
};
