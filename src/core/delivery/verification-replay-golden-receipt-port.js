/**
 * @module verification-replay-golden-receipt-port
 * SPEC-0062 / Mission BE — Verification Replay & Golden Receipt Port.
 *
 * Hermetic in-process governed replay:
 *   replay({ candidate, golden, policy, ledgerObserve,
 *            autonomyReplayObserve, deliverySeal, applySeal, ports })
 *
 * Phases: VALIDATE → GATE → REPLAY → COMPARE → SEAL
 * NO real verify:strict subprocess / NO SIEM / NO network. Zero CloudAgent.
 *
 * Optional injectable ports (compose/extend — do NOT rewrite AJ/AL/BC/BD
 * into this payload):
 *   ports.ajLedger / ports.ledgerObserve — AJ evidence ledger observe
 *   ports.alReplay / ports.autonomyReplayObserve — AL forensic/replay observe
 *   ports.bcApply / ports.bdDelivery — BC/BD seal observe
 *
 * Fail-closed DENY: digest mismatch / drift vs golden, broken custody
 * (missing seal fields), Fundacion path touch, missing/invalid required
 * BC/BD seals when policy requires, malformed candidate/golden, empty
 * request, HITL unapproved.
 *
 * NON-CLAIM:
 *   port ≠ SIEM product /
 *   ≠ billing accuracy SaaS /
 *   ≠ PRODUCTION_READY verification product
 *   not BF/BG
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC+BD MEASURED; BE in progress; BF–BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BE_CEILING
 */

import {
  BE_BOUNDARY_KIND,
  BE_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  indexGoldens,
  canonicalReplayBody,
  extractDigest,
  normalizeGolden,
  normalizeCandidate,
  hasCustodyFields,
  compareDigests,
  resolveGolden,
  observeAjLedger,
  observeAlReplay,
  observeBcApply,
  observeBdDelivery
} from './golden-receipt-boundary.js';
import {
  BE_RECEIPT_KIND,
  BE_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildReplayReceipt
} from './replay-receipt.js';
import {
  BE_POLICY_GATE_KIND,
  BE_POLICY_GATE_PRODUCTION_READY,
  BE_POLICY_CODES,
  deny,
  denyMismatch,
  denyDrift,
  denyCustody,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyMalformedCandidate,
  denyMalformedGolden,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkHitl,
  checkCustody,
  gateReplayRequest,
  createReplayPolicyGate
} from './replay-policy-gate.js';

/** @type {'NO'} */
export const BE_PRODUCTION_READY = 'NO';

export const BE_KIND = 'eos-verification-replay-golden-receipt-port';

export const BE_CODES = Object.freeze({
  OK: 'OK',
  MATCHED: 'MATCHED',
  DENY: 'DENY',
  DIGEST_MISMATCH: 'DIGEST_MISMATCH',
  DRIFT_DENY: 'DRIFT_DENY',
  CUSTODY_BREAK: 'CUSTODY_BREAK',
  FUNDACION_DENY: 'FUNDACION_DENY',
  HITL_DENY: 'HITL_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  DELIVERY_SEAL_DENY: 'DELIVERY_SEAL_DENY',
  MALFORMED_CANDIDATE: 'MALFORMED_CANDIDATE',
  MALFORMED_GOLDEN: 'MALFORMED_GOLDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  EMPTY_REQUEST: 'EMPTY_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY'
});

export const BE_PHASES = Object.freeze({
  VALIDATE: 'VALIDATE',
  GATE: 'GATE',
  REPLAY: 'REPLAY',
  COMPARE: 'COMPARE',
  SEAL: 'SEAL'
});

export const BE_PHASE_ORDER = Object.freeze([
  BE_PHASES.VALIDATE,
  BE_PHASES.GATE,
  BE_PHASES.REPLAY,
  BE_PHASES.COMPARE,
  BE_PHASES.SEAL
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Verification Replay & Golden Receipt Port failures.
 */
export class VerificationReplayGoldenReceiptError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = BE_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'VerificationReplayGoldenReceiptError';
    this.code = code;
    this.details = sanitizeBePayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBePayload(obj) {
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
 * Create the Verification Replay & Golden Receipt Port.
 *
 * Optional injectable hooks (do NOT rewrite AJ/AL/BC/BD):
 *   ports.ajLedger / ports.ledgerObserve
 *   ports.alReplay / ports.autonomyReplayObserve
 *   ports.bcApply / ports.bdDelivery
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createVerificationReplayGoldenReceiptPort(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const ajLedger =
    portsIn.ajLedger ||
    portsIn.ledgerObserve ||
    options.ajLedger ||
    options.ledgerObserve ||
    null;
  const alReplay =
    portsIn.alReplay ||
    portsIn.autonomyReplayObserve ||
    options.alReplay ||
    options.autonomyReplayObserve ||
    null;
  const bcApply = portsIn.bcApply || options.bcApply || null;
  const bdDelivery =
    portsIn.bdDelivery ||
    portsIn.deliverySeal ||
    options.bdDelivery ||
    options.deliverySeal ||
    null;

  const throwOnDeny = options.throwOnDeny === true;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : sha256Canonical;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  const goldenMap = indexGoldens(options.goldens || options.goldenMap || {});

  const defaultRequireApplySeal =
    options.requireApplySeal === true ||
    (options.policies && options.policies.requireApplySeal === true);
  const defaultRequireDeliverySeal =
    options.requireDeliverySeal === true ||
    (options.policies && options.policies.requireDeliverySeal === true);

  const policyGate = createReplayPolicyGate({});

  let replayCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let matchCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  function sealReceipt(body) {
    const receipt = buildReplayReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeBePayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new VerificationReplayGoldenReceiptError(
        result.reason || result.code || 'DENY',
        result.code || BE_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  function nonClaimFlags() {
    return {
      siemProduct: false,
      billingAccuracySaas: false,
      productionReadyVerificationProduct: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      notBf: true,
      notBg: true,
      bcMeasured: true,
      bdMeasured: true
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
    if (!phases.includes(BE_PHASES.SEAL)) phases.push(BE_PHASES.SEAL);
    lastPhases = phases;
    const receipt = sealReceipt({
      ok: false,
      code,
      status: 'DENY',
      phase: BE_PHASES.SEAL,
      phases,
      reason,
      deny: true,
      decision: 'DENY',
      hermetic: true,
      match: false,
      goldenId: extra.goldenId || null,
      candidateDigest: extra.candidateDigest || null,
      goldenDigest: extra.goldenDigest || null,
      meta: extra.meta
    });
    return maybeThrow(
      sanitizeBePayload({
        ok: false,
        allow: false,
        deny: true,
        denied: true,
        match: false,
        code,
        kind: BE_KIND,
        PRODUCTION_READY: BE_PRODUCTION_READY,
        reason,
        phases,
        hermetic: true,
        realVerifyStrict: false,
        siem: false,
        network: false,
        ...nonClaimFlags(),
        receipt,
        ...(extra.resultExtra || {})
      })
    );
  }

  /**
   * Main API: replay a sealed candidate against a golden receipt.
   *
   * @param {object} req
   * @param {object} [req.candidate]
   * @param {object|string} [req.golden]
   * @param {string} [req.goldenId]
   * @param {object} [req.policy]
   * @param {unknown} [req.ledgerObserve]
   * @param {unknown} [req.autonomyReplayObserve]
   * @param {unknown} [req.deliverySeal]
   * @param {unknown} [req.applySeal]
   * @param {object} [req.ports]
   * @returns {object}
   */
  function replay(req = {}) {
    replayCount += 1;
    lastPhases = [];

    // ── VALIDATE ─────────────────────────────────────────────────────────
    lastPhases.push(BE_PHASES.VALIDATE);

    if (req == null || typeof req !== 'object') {
      return finishDeny(
        BE_CODES.INVALID_REQUEST,
        'replay() requires an object request',
        { phases: [...lastPhases] }
      );
    }

    const keys = Object.keys(req);
    const hasCandidate = req.candidate != null;
    const hasGolden = req.golden != null || req.goldenId != null;
    if (keys.length === 0 || (!hasCandidate && !hasGolden)) {
      return finishDeny(BE_CODES.EMPTY_REQUEST, 'empty request', {
        phases: [...lastPhases]
      });
    }

    if (
      req.fundacion === true ||
      req.writeFundacion === true ||
      isFundacionPath(req)
    ) {
      lastPhases.push(BE_PHASES.GATE);
      return finishDeny(BE_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases]
      });
    }

    const policy =
      req.policy && typeof req.policy === 'object' ? req.policy : {};

    const requireApplySeal =
      policy.requireApplySeal === true ||
      req.requireApplySeal === true ||
      defaultRequireApplySeal;
    const requireDeliverySeal =
      policy.requireDeliverySeal === true ||
      req.requireDeliverySeal === true ||
      defaultRequireDeliverySeal;
    const treatMismatchAsDrift = policy.treatMismatchAsDrift === true;

    const reqPorts =
      req.ports && typeof req.ports === 'object' ? req.ports : {};
    const activeAj =
      reqPorts.ajLedger ||
      reqPorts.ledgerObserve ||
      req.ledgerObserve ||
      ajLedger;
    const activeAl =
      reqPorts.alReplay ||
      reqPorts.autonomyReplayObserve ||
      req.autonomyReplayObserve ||
      alReplay;
    const activeBc = reqPorts.bcApply || req.applySeal || bcApply;
    const activeBd =
      reqPorts.bdDelivery ||
      reqPorts.deliverySeal ||
      req.deliverySeal ||
      bdDelivery;

    if (!hasCandidate) {
      return finishDeny(BE_CODES.MALFORMED_CANDIDATE, 'candidate required', {
        phases: [...lastPhases]
      });
    }

    const normC = normalizeCandidate(req.candidate);
    if (!normC.ok || !normC.candidate) {
      return finishDeny(
        BE_CODES.MALFORMED_CANDIDATE,
        normC.reason || 'malformed candidate',
        { phases: [...lastPhases] }
      );
    }
    const candidate = normC.candidate;

    const goldenArg = req.golden != null ? req.golden : req.goldenId;
    const resolved = resolveGolden(goldenArg, goldenMap, candidate);
    if (!resolved.ok || !resolved.golden) {
      const reason = resolved.reason || 'malformed golden';
      const code =
        reason === 'golden not found'
          ? BE_CODES.MALFORMED_GOLDEN
          : BE_CODES.MALFORMED_GOLDEN;
      return finishDeny(code, reason, {
        phases: [...lastPhases],
        goldenId: resolved.goldenId
      });
    }
    const golden = resolved.golden;
    const goldenId = resolved.goldenId || golden.id;

    // ── GATE ─────────────────────────────────────────────────────────────
    lastPhases.push(BE_PHASES.GATE);

    if (
      isFundacionPath(req) ||
      isFundacionPath(candidate) ||
      isFundacionPath(golden) ||
      isFundacionPath(candidate.payload) ||
      isFundacionPath(golden.payload)
    ) {
      return finishDeny(BE_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases],
        goldenId
      });
    }

    const hitl = checkHitl(req, policy);
    if (!hitl.ok) {
      return finishDeny(
        BE_CODES.HITL_DENY,
        hitl.reason || 'HITL required / unapproved',
        { phases: [...lastPhases], goldenId }
      );
    }

    const leakBody = {
      candidate: req.candidate,
      golden: typeof req.golden === 'object' ? req.golden : undefined
    };
    const leak = detectSecretLeakage(leakBody, {
      treatFakeAsLeak: policy.treatFakeAsLeak === true
    });
    if (leak.leak) {
      return finishDeny(
        BE_CODES.LAW_VI_DENY,
        leak.reason || 'Law VI leakage DENY',
        { phases: [...lastPhases], goldenId }
      );
    }

    const custody = checkCustody(candidate);
    if (!custody.ok) {
      return finishDeny(
        BE_CODES.CUSTODY_BREAK,
        custody.reason || 'broken custody (missing seal fields)',
        { phases: [...lastPhases], goldenId }
      );
    }

    if (requireApplySeal) {
      const sealCheck = checkApplySeal(
        req.applySeal != null ? req.applySeal : activeBc,
        { required: true }
      );
      if (!sealCheck.ok) {
        return finishDeny(
          BE_CODES.APPLY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BC apply seal',
          { phases: [...lastPhases], goldenId }
        );
      }
    }

    if (requireDeliverySeal) {
      const sealCheck = checkDeliverySeal(
        req.deliverySeal != null ? req.deliverySeal : activeBd,
        { required: true }
      );
      if (!sealCheck.ok) {
        return finishDeny(
          BE_CODES.DELIVERY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BD delivery seal',
          { phases: [...lastPhases], goldenId }
        );
      }
    }

    // ── REPLAY (recompute canonical digest — no live verify:strict) ──────
    lastPhases.push(BE_PHASES.REPLAY);

    const replayBody = canonicalReplayBody(candidate);
    const recomputed = hashFn(replayBody);
    const declared = candidate.digest;
    if (declared && String(declared).toLowerCase() !== String(recomputed).toLowerCase()) {
      // Declared seal digest does not match recomputed canonical — custody break
      // unless the declared digest is the pre-agreed golden digest we will
      // compare in COMPARE (candidate may carry the original receipt digest
      // while payload is the replay source of truth).
      // Only treat as custody break when payload is missing (cannot recompute
      // independently) — already handled. When both exist and differ from
      // each other AND golden, COMPARE will DENY mismatch. Continue.
    }

    // ── COMPARE ──────────────────────────────────────────────────────────
    lastPhases.push(BE_PHASES.COMPARE);

    let goldenDigest = golden.digest;
    if (!goldenDigest && golden.payload != null) {
      goldenDigest = hashFn(canonicalReplayBody(golden));
    }
    if (!goldenDigest) {
      return finishDeny(BE_CODES.MALFORMED_GOLDEN, 'golden digest missing', {
        phases: [...lastPhases],
        goldenId,
        candidateDigest: recomputed
      });
    }

    const cmp = compareDigests(recomputed, goldenDigest);
    if (!cmp.match) {
      const code = treatMismatchAsDrift
        ? BE_CODES.DRIFT_DENY
        : BE_CODES.DIGEST_MISMATCH;
      const reason = treatMismatchAsDrift
        ? 'replay drift vs golden'
        : 'digest mismatch vs golden';
      return finishDeny(code, reason, {
        phases: [...lastPhases],
        goldenId,
        candidateDigest: recomputed,
        goldenDigest
      });
    }

    const observeCtx = {
      kind: BE_KIND,
      goldenId,
      PRODUCTION_READY: 'NO'
    };
    const ajMeta = observeAjLedger(activeAj, observeCtx);
    const alMeta = observeAlReplay(activeAl, observeCtx);
    const bcMeta = observeBcApply(activeBc, observeCtx);
    const bdMeta = observeBdDelivery(activeBd, observeCtx);

    // ── SEAL ─────────────────────────────────────────────────────────────
    lastPhases.push(BE_PHASES.SEAL);
    okCount += 1;
    matchCount += 1;
    lastCode = BE_CODES.MATCHED;
    lastOk = true;

    const receipt = sealReceipt({
      ok: true,
      code: BE_CODES.MATCHED,
      status: 'MATCHED',
      phase: BE_PHASES.SEAL,
      phases: [...lastPhases],
      match: true,
      goldenId,
      candidateDigest: recomputed,
      goldenDigest,
      reason: null,
      deny: false,
      decision: 'MATCHED',
      hermetic: true,
      meta: {
        hermetic: true,
        realVerifyStrict: false,
        siem: false,
        network: false,
        ajMeta,
        alMeta,
        bcMeta,
        bdMeta
      }
    });

    return sanitizeBePayload({
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      match: true,
      code: BE_CODES.MATCHED,
      kind: BE_KIND,
      PRODUCTION_READY: BE_PRODUCTION_READY,
      phases: [...lastPhases],
      hermetic: true,
      realVerifyStrict: false,
      siem: false,
      network: false,
      goldenId,
      candidateDigest: recomputed,
      goldenDigest,
      ajInjected: !!(ajMeta && ajMeta.injected),
      alInjected: !!(alMeta && alMeta.injected),
      bcInjected: !!(bcMeta && bcMeta.injected),
      bdInjected: !!(bdMeta && bdMeta.injected),
      ajObserved: !!(ajMeta && ajMeta.observed),
      alObserved: !!(alMeta && alMeta.observed),
      bcObserved: !!(bcMeta && bcMeta.observed),
      bdObserved: !!(bdMeta && bdMeta.observed),
      ...nonClaimFlags(),
      receipt
    });
  }

  function getState() {
    return sanitizeBePayload({
      kind: BE_KIND,
      PRODUCTION_READY: BE_PRODUCTION_READY,
      replayCount,
      okCount,
      denyCount,
      matchCount,
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
      kind: BE_KIND,
      PRODUCTION_READY: BE_PRODUCTION_READY,
      ok: true,
      siemProduct: false,
      billingAccuracySaas: false,
      productionReadyVerificationProduct: false,
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
      bdMeasured: true,
      bdStatus: 'BD MEASURED',
      notBf: true,
      notBg: true,
      bfPending: true,
      bgPending: true,
      beInProgress: true,
      // L17 CLOSED never reopen; L18 CLOSED never reopen markers
      l17NeverReopen: true,
      l18NeverReopen: true
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    return finishDeny(BE_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
      phases: [BE_PHASES.SEAL]
    });
  }

  return {
    kind: BE_KIND,
    PRODUCTION_READY: BE_PRODUCTION_READY,
    codes: BE_CODES,
    replay,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    sanitizeBePayload,
    // NON-CLAIM
    siemProduct: false,
    billingAccuracySaas: false,
    productionReadyVerificationProduct: false,
    cloudAgent: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [portOpts]
 */
export function replay(req, portOpts = {}) {
  const port = createVerificationReplayGoldenReceiptPort(portOpts);
  return port.replay(req);
}

export {
  BE_BOUNDARY_KIND,
  BE_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  indexGoldens,
  canonicalReplayBody,
  extractDigest,
  normalizeGolden,
  normalizeCandidate,
  hasCustodyFields,
  compareDigests,
  resolveGolden,
  observeAjLedger,
  observeAlReplay,
  observeBcApply,
  observeBdDelivery,
  BE_RECEIPT_KIND,
  BE_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildReplayReceipt,
  BE_POLICY_GATE_KIND,
  BE_POLICY_GATE_PRODUCTION_READY,
  BE_POLICY_CODES,
  deny,
  denyMismatch,
  denyDrift,
  denyCustody,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyMalformedCandidate,
  denyMalformedGolden,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkHitl,
  checkCustody,
  gateReplayRequest,
  createReplayPolicyGate
};

export default {
  BE_KIND,
  BE_PRODUCTION_READY,
  BE_CODES,
  BE_PHASES,
  createVerificationReplayGoldenReceiptPort,
  replay,
  sanitizeBePayload,
  VerificationReplayGoldenReceiptError
};
