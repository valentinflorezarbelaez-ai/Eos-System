/**
 * @module local-rc-packaging-artifact-notary-port
 * SPEC-0063 / Mission BF — Local Release Candidate Packaging & Artifact
 * Notary Port.
 *
 * Hermetic in-process governed RC packaging + notary:
 *   packageAndNotarize({ artifacts, policy, aqNotaryObserve,
 *                        applySeal, deliverySeal, replaySeal, ports })
 *
 * Phases: VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL
 * NO real tarball fs / NO GH Releases / NO public registry / NO network.
 * Zero CloudAgent.
 *
 * Optional injectable ports (compose/extend — do NOT rewrite AQ/BC/BD/BE
 * into this payload):
 *   ports.aqNotary / ports.aqNotaryObserve — AQ evidence export/notary observe
 *   ports.bcApply / ports.bdDelivery / ports.beReplay — BC/BD/BE seal observe
 *
 * Fail-closed DENY: PRODUCTION_READY=YES implication, public registry /
 * GH Releases publish intent, Fundacion path touch, empty/malformed
 * artifacts, missing/invalid required BC/BD/BE seals when policy requires,
 * custody break on seals, HITL unapproved.
 *
 * NON-CLAIM:
 *   port ≠ PRODUCTION_READY=YES flip /
 *   ≠ public registry publish /
 *   ≠ GH Releases product
 *   not BG
 *   Fundacion Δ=0 (ALWAYS DENY default; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *   L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED);
 *   L19 OPEN (BC+BD+BE MEASURED; BF in progress; BG pending);
 *   Axis: Sovereign Delivery & Verification Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BF_CEILING
 */

import {
  BF_BOUNDARY_KIND,
  BF_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  impliesProductionReadyYes,
  detectPublishIntent,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  extractDigest,
  normalizeArtifact,
  normalizeArtifacts,
  canonicalManifestBody,
  hasArtifactCustodyFields,
  hasSealCustodyFields,
  observeAqNotary,
  observeBcApply,
  observeBdDelivery,
  observeBeReplay
} from './rc-package-boundary.js';
import {
  BF_RECEIPT_KIND,
  BF_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildNotaryReceipt
} from './notary-receipt.js';
import {
  BF_POLICY_GATE_KIND,
  BF_POLICY_GATE_PRODUCTION_READY,
  BF_POLICY_CODES,
  deny,
  denyProductionReadyYes,
  denyRegistryPublish,
  denyGhReleases,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyReplaySeal,
  denyMalformedArtifacts,
  denyEmptyArtifacts,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  denyCustody,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkReplaySeal,
  checkHitl,
  checkCustody,
  gatePackagingRequest,
  createRcPackagingPolicyGate
} from './rc-packaging-policy-gate.js';

/** @type {'NO'} */
export const BF_PRODUCTION_READY = 'NO';

export const BF_KIND = 'eos-local-rc-packaging-artifact-notary-port';

export const BF_CODES = Object.freeze({
  OK: 'OK',
  PACKAGED: 'PACKAGED',
  DENY: 'DENY',
  PRODUCTION_READY_YES_DENY: 'PRODUCTION_READY_YES_DENY',
  REGISTRY_PUBLISH_DENY: 'REGISTRY_PUBLISH_DENY',
  GH_RELEASES_DENY: 'GH_RELEASES_DENY',
  FUNDACION_DENY: 'FUNDACION_DENY',
  HITL_DENY: 'HITL_DENY',
  APPLY_SEAL_DENY: 'APPLY_SEAL_DENY',
  DELIVERY_SEAL_DENY: 'DELIVERY_SEAL_DENY',
  REPLAY_SEAL_DENY: 'REPLAY_SEAL_DENY',
  MALFORMED_ARTIFACTS: 'MALFORMED_ARTIFACTS',
  EMPTY_ARTIFACTS: 'EMPTY_ARTIFACTS',
  INVALID_REQUEST: 'INVALID_REQUEST',
  EMPTY_REQUEST: 'EMPTY_REQUEST',
  POLICY_DENY: 'POLICY_DENY',
  LAW_VI_DENY: 'LAW_VI_DENY',
  CUSTODY_BREAK: 'CUSTODY_BREAK'
});

export const BF_PHASES = Object.freeze({
  VALIDATE: 'VALIDATE',
  GATE: 'GATE',
  PACKAGE: 'PACKAGE',
  NOTARIZE: 'NOTARIZE',
  SEAL: 'SEAL'
});

export const BF_PHASE_ORDER = Object.freeze([
  BF_PHASES.VALIDATE,
  BF_PHASES.GATE,
  BF_PHASES.PACKAGE,
  BF_PHASES.NOTARIZE,
  BF_PHASES.SEAL
]);

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

/**
 * Typed error for Local RC Packaging & Artifact Notary Port failures.
 */
export class LocalRcPackagingArtifactNotaryError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = BF_CODES.DENY, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'LocalRcPackagingArtifactNotaryError';
    this.code = code;
    this.details = sanitizeBfPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBfPayload(obj) {
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
      /^(tokens|tokensIn|tokensOut|tokensUsed|tokenThreshold|maxTokens|costUnits|costUsed|costThreshold|maxCostUnits|promptTokens|completionTokens|totalTokens|receiptDigest|sha256|digest|manifestDigest)$/i.test(
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
 * Create the Local RC Packaging & Artifact Notary Port.
 *
 * Optional injectable hooks (do NOT rewrite AQ/BC/BD/BE):
 *   ports.aqNotary / ports.aqNotaryObserve
 *   ports.bcApply / ports.bdDelivery / ports.beReplay
 *
 * @param {object} [options]
 * @returns {object}
 */
export function createLocalRcPackagingArtifactNotaryPort(options = {}) {
  const portsIn =
    options.ports && typeof options.ports === 'object' ? options.ports : {};
  const aqNotary =
    portsIn.aqNotary ||
    portsIn.aqNotaryObserve ||
    options.aqNotary ||
    options.aqNotaryObserve ||
    null;
  const bcApply = portsIn.bcApply || options.bcApply || null;
  const bdDelivery =
    portsIn.bdDelivery ||
    portsIn.deliverySeal ||
    options.bdDelivery ||
    options.deliverySeal ||
    null;
  const beReplay =
    portsIn.beReplay ||
    portsIn.replaySeal ||
    options.beReplay ||
    options.replaySeal ||
    null;

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
  const defaultRequireDeliverySeal =
    options.requireDeliverySeal === true ||
    (options.policies && options.policies.requireDeliverySeal === true);
  const defaultRequireReplaySeal =
    options.requireReplaySeal === true ||
    (options.policies && options.policies.requireReplaySeal === true);
  const defaultRequireCustody =
    options.requireCustody === true ||
    (options.policies && options.policies.requireCustody === true);

  const policyGate = createRcPackagingPolicyGate({});

  let packageCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let lastCode = null;
  let lastOk = null;
  let lastReceiptId = null;
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  let lastPhases = [];

  function sealReceipt(body) {
    const receipt = buildNotaryReceipt(body, { hash: hashFn, now: nowFn });
    const safe = /** @type {object} */ (sanitizeBfPayload(receipt));
    receipts.push(safe);
    if (receipts.length > 50) receipts.shift();
    lastReceiptId = safe.receiptId;
    return safe;
  }

  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new LocalRcPackagingArtifactNotaryError(
        result.reason || result.code || 'DENY',
        result.code || BF_CODES.DENY,
        { receipt: result.receipt, phases: result.phases }
      );
    }
    return result;
  }

  function nonClaimFlags() {
    return {
      productionReadyYesFlip: false,
      publicRegistryPublish: false,
      ghReleasesProduct: false,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      notBg: true,
      bcMeasured: true,
      bdMeasured: true,
      beMeasured: true
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
    if (!phases.includes(BF_PHASES.SEAL)) phases.push(BF_PHASES.SEAL);
    lastPhases = phases;
    const receipt = sealReceipt({
      ok: false,
      code,
      status: 'DENY',
      phase: BF_PHASES.SEAL,
      phases,
      reason,
      deny: true,
      decision: 'DENY',
      hermetic: true,
      manifestDigest: extra.manifestDigest || null,
      artifactCount: extra.artifactCount != null ? extra.artifactCount : null,
      artifactIds: extra.artifactIds || [],
      meta: extra.meta
    });
    return maybeThrow(
      sanitizeBfPayload({
        ok: false,
        allow: false,
        deny: true,
        denied: true,
        code,
        kind: BF_KIND,
        PRODUCTION_READY: BF_PRODUCTION_READY,
        reason,
        phases,
        hermetic: true,
        realTarball: false,
        registry: false,
        ghReleases: false,
        network: false,
        ...nonClaimFlags(),
        receipt,
        manifest: extra.manifest || null,
        ...(extra.resultExtra || {})
      })
    );
  }

  /**
   * Main API: package allowlisted artifact digests and notarize.
   *
   * @param {object} req
   * @param {object[]} [req.artifacts]
   * @param {object} [req.policy]
   * @param {unknown} [req.aqNotaryObserve]
   * @param {unknown} [req.applySeal]
   * @param {unknown} [req.deliverySeal]
   * @param {unknown} [req.replaySeal]
   * @param {object} [req.ports]
   * @returns {object}
   */
  function packageAndNotarize(req = {}) {
    packageCount += 1;
    lastPhases = [];

    // ── VALIDATE ─────────────────────────────────────────────────────────
    lastPhases.push(BF_PHASES.VALIDATE);

    if (req == null || typeof req !== 'object') {
      return finishDeny(
        BF_CODES.INVALID_REQUEST,
        'packageAndNotarize() requires an object request',
        { phases: [...lastPhases] }
      );
    }

    const keys = Object.keys(req);
    const hasArtifacts = req.artifacts != null;
    if (keys.length === 0 || !hasArtifacts) {
      return finishDeny(BF_CODES.EMPTY_REQUEST, 'empty request', {
        phases: [...lastPhases]
      });
    }

    if (
      req.fundacion === true ||
      req.writeFundacion === true ||
      isFundacionPath(req)
    ) {
      lastPhases.push(BF_PHASES.GATE);
      return finishDeny(BF_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases]
      });
    }

    const policy =
      req.policy && typeof req.policy === 'object' ? req.policy : {};

    if (impliesProductionReadyYes(req) || impliesProductionReadyYes(policy)) {
      lastPhases.push(BF_PHASES.GATE);
      return finishDeny(
        BF_CODES.PRODUCTION_READY_YES_DENY,
        'PRODUCTION_READY=YES implication DENY',
        { phases: [...lastPhases] }
      );
    }

    const pub = detectPublishIntent(req);
    const pubPol = detectPublishIntent(policy);
    if (pub.intent || pubPol.intent) {
      lastPhases.push(BF_PHASES.GATE);
      const hit = pub.intent ? pub : pubPol;
      const reason = hit.reason;
      const isGh =
        hit.kind === 'gh-releases' ||
        /GH Releases publish intent/i.test(reason || '') ||
        req.ghReleases === true ||
        req.ghRelease === true ||
        req.githubReleases === true ||
        req.publishGhRelease === true ||
        policy.ghReleases === true ||
        policy.ghRelease === true ||
        policy.githubReleases === true ||
        req.publish === 'gh-releases' ||
        policy.publish === 'gh-releases' ||
        req.target === 'gh-releases' ||
        policy.target === 'gh-releases';
      return finishDeny(
        isGh ? BF_CODES.GH_RELEASES_DENY : BF_CODES.REGISTRY_PUBLISH_DENY,
        reason ||
          (isGh
            ? 'GH Releases publish intent DENY'
            : 'public registry publish intent DENY'),
        { phases: [...lastPhases] }
      );
    }

    const requireApplySeal =
      policy.requireApplySeal === true ||
      req.requireApplySeal === true ||
      defaultRequireApplySeal;
    const requireDeliverySeal =
      policy.requireDeliverySeal === true ||
      req.requireDeliverySeal === true ||
      defaultRequireDeliverySeal;
    const requireReplaySeal =
      policy.requireReplaySeal === true ||
      req.requireReplaySeal === true ||
      defaultRequireReplaySeal;
    const requireCustody =
      policy.requireCustody === true ||
      req.requireCustody === true ||
      defaultRequireCustody;

    const reqPorts =
      req.ports && typeof req.ports === 'object' ? req.ports : {};
    const activeAq =
      reqPorts.aqNotary ||
      reqPorts.aqNotaryObserve ||
      req.aqNotaryObserve ||
      aqNotary;
    const activeBc = reqPorts.bcApply || req.applySeal || bcApply;
    const activeBd =
      reqPorts.bdDelivery ||
      reqPorts.deliverySeal ||
      req.deliverySeal ||
      bdDelivery;
    const activeBe =
      reqPorts.beReplay ||
      reqPorts.replaySeal ||
      req.replaySeal ||
      beReplay;

    const norm = normalizeArtifacts(req.artifacts);
    if (!norm.ok) {
      const code =
        norm.reason && /empty/i.test(norm.reason)
          ? BF_CODES.EMPTY_ARTIFACTS
          : BF_CODES.MALFORMED_ARTIFACTS;
      return finishDeny(code, norm.reason || 'malformed artifacts', {
        phases: [...lastPhases]
      });
    }
    const artifacts = norm.artifacts;

    // ── GATE ─────────────────────────────────────────────────────────────
    lastPhases.push(BF_PHASES.GATE);

    if (
      isFundacionPath(req) ||
      isFundacionPath(artifacts) ||
      artifacts.some((a) => isFundacionPath(a))
    ) {
      return finishDeny(BF_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
        phases: [...lastPhases],
        artifactCount: artifacts.length,
        artifactIds: artifacts.map((a) => a.id)
      });
    }

    const hitl = checkHitl(req, policy);
    if (!hitl.ok) {
      return finishDeny(
        BF_CODES.HITL_DENY,
        hitl.reason || 'HITL required / unapproved',
        {
          phases: [...lastPhases],
          artifactCount: artifacts.length,
          artifactIds: artifacts.map((a) => a.id)
        }
      );
    }

    const leakBody = { artifacts: req.artifacts, policy };
    const leak = detectSecretLeakage(leakBody, {
      treatFakeAsLeak: policy.treatFakeAsLeak === true
    });
    if (leak.leak) {
      return finishDeny(
        BF_CODES.LAW_VI_DENY,
        leak.reason || 'Law VI leakage DENY',
        {
          phases: [...lastPhases],
          artifactCount: artifacts.length,
          artifactIds: artifacts.map((a) => a.id)
        }
      );
    }

    if (requireCustody) {
      for (const a of artifacts) {
        const c = hasArtifactCustodyFields(a);
        if (!c.ok) {
          return finishDeny(
            BF_CODES.CUSTODY_BREAK,
            c.reason || 'broken custody (missing seal fields)',
            {
              phases: [...lastPhases],
              artifactCount: artifacts.length,
              artifactIds: artifacts.map((x) => x.id)
            }
          );
        }
      }
    }

    // Also DENY custody break when an explicitly broken seal is passed
    // (sealed:false / ok:false) even if not required — caller asserted
    // custody and it failed.
    const maybeBroken = [
      { seal: req.applySeal, label: 'apply' },
      { seal: req.deliverySeal, label: 'delivery' },
      { seal: req.replaySeal, label: 'replay' }
    ];
    for (const { seal } of maybeBroken) {
      if (seal != null && typeof seal === 'object') {
        const s = /** @type {Record<string, unknown>} */ (seal);
        if (s.sealed === false || s.ok === false || s.custodyBreak === true) {
          return finishDeny(
            BF_CODES.CUSTODY_BREAK,
            'broken custody (missing seal fields)',
            {
              phases: [...lastPhases],
              artifactCount: artifacts.length,
              artifactIds: artifacts.map((a) => a.id)
            }
          );
        }
      }
    }

    if (requireApplySeal) {
      const sealCheck = checkApplySeal(
        req.applySeal != null ? req.applySeal : activeBc,
        { required: true }
      );
      if (!sealCheck.ok) {
        return finishDeny(
          BF_CODES.APPLY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BC apply seal',
          {
            phases: [...lastPhases],
            artifactCount: artifacts.length,
            artifactIds: artifacts.map((a) => a.id)
          }
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
          BF_CODES.DELIVERY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BD delivery seal',
          {
            phases: [...lastPhases],
            artifactCount: artifacts.length,
            artifactIds: artifacts.map((a) => a.id)
          }
        );
      }
    }

    if (requireReplaySeal) {
      const sealCheck = checkReplaySeal(
        req.replaySeal != null ? req.replaySeal : activeBe,
        { required: true }
      );
      if (!sealCheck.ok) {
        return finishDeny(
          BF_CODES.REPLAY_SEAL_DENY,
          sealCheck.reason || 'missing or invalid BE replay seal',
          {
            phases: [...lastPhases],
            artifactCount: artifacts.length,
            artifactIds: artifacts.map((a) => a.id)
          }
        );
      }
    }

    // ── PACKAGE (in-memory allowlisted digest manifest) ──────────────────
    lastPhases.push(BF_PHASES.PACKAGE);

    const manifestBody = canonicalManifestBody(artifacts);
    const manifestDigest = hashFn(manifestBody);
    const manifest = {
      ...manifestBody,
      manifestDigest,
      hermetic: true,
      realTarball: false,
      registry: false,
      ghReleases: false
    };

    // ── NOTARIZE (compose AQ observe + seal digests) ─────────────────────
    lastPhases.push(BF_PHASES.NOTARIZE);

    const observeCtx = {
      kind: BF_KIND,
      manifestDigest,
      PRODUCTION_READY: 'NO'
    };
    const aqMeta = observeAqNotary(activeAq, observeCtx);
    const bcMeta = observeBcApply(activeBc, observeCtx);
    const bdMeta = observeBdDelivery(activeBd, observeCtx);
    const beMeta = observeBeReplay(activeBe, observeCtx);

    // ── SEAL ─────────────────────────────────────────────────────────────
    lastPhases.push(BF_PHASES.SEAL);
    okCount += 1;
    lastCode = BF_CODES.PACKAGED;
    lastOk = true;

    const artifactIds = artifacts.map((a) => a.id);
    const receipt = sealReceipt({
      ok: true,
      code: BF_CODES.PACKAGED,
      status: 'PACKAGED',
      phase: BF_PHASES.SEAL,
      phases: [...lastPhases],
      manifestDigest,
      artifactCount: artifacts.length,
      artifactIds,
      reason: null,
      deny: false,
      decision: 'PACKAGED',
      hermetic: true,
      meta: {
        hermetic: true,
        realTarball: false,
        registry: false,
        ghReleases: false,
        network: false,
        aqMeta,
        bcMeta,
        bdMeta,
        beMeta
      }
    });

    return sanitizeBfPayload({
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BF_CODES.PACKAGED,
      kind: BF_KIND,
      PRODUCTION_READY: BF_PRODUCTION_READY,
      phases: [...lastPhases],
      hermetic: true,
      realTarball: false,
      registry: false,
      ghReleases: false,
      network: false,
      manifestDigest,
      artifactCount: artifacts.length,
      artifactIds,
      aqInjected: !!(aqMeta && aqMeta.injected),
      bcInjected: !!(bcMeta && bcMeta.injected),
      bdInjected: !!(bdMeta && bdMeta.injected),
      beInjected: !!(beMeta && beMeta.injected),
      aqObserved: !!(aqMeta && aqMeta.observed),
      bcObserved: !!(bcMeta && bcMeta.observed),
      bdObserved: !!(bdMeta && bdMeta.observed),
      beObserved: !!(beMeta && beMeta.observed),
      ...nonClaimFlags(),
      receipt,
      manifest
    });
  }

  function getState() {
    return sanitizeBfPayload({
      kind: BF_KIND,
      PRODUCTION_READY: BF_PRODUCTION_READY,
      packageCount,
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
      kind: BF_KIND,
      PRODUCTION_READY: BF_PRODUCTION_READY,
      ok: true,
      productionReadyYesFlip: false,
      publicRegistryPublish: false,
      ghReleasesProduct: false,
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
      beMeasured: true,
      beStatus: 'BE MEASURED',
      notBg: true,
      bgPending: true,
      bfInProgress: true,
      // L17 CLOSED never reopen; L18 CLOSED never reopen markers
      l17NeverReopen: true,
      l18NeverReopen: true
    };
  }

  /**
   * Fundacion write surface — ALWAYS DENY.
   */
  function writeFundacion(_req = {}) {
    return finishDeny(BF_CODES.FUNDACION_DENY, 'Fundacion ALWAYS_DENY', {
      phases: [BF_PHASES.SEAL]
    });
  }

  return {
    kind: BF_KIND,
    PRODUCTION_READY: BF_PRODUCTION_READY,
    codes: BF_CODES,
    packageAndNotarize,
    getState,
    health,
    writeFundacion,
    sealReceipt,
    policyGate,
    sanitizeBfPayload,
    // NON-CLAIM
    productionReadyYesFlip: false,
    publicRegistryPublish: false,
    ghReleasesProduct: false,
    cloudAgent: false
  };
}

/**
 * One-shot convenience.
 * @param {object} req
 * @param {object} [portOpts]
 */
export function packageAndNotarize(req, portOpts = {}) {
  const port = createLocalRcPackagingArtifactNotaryPort(portOpts);
  return port.packageAndNotarize(req);
}

export {
  BF_BOUNDARY_KIND,
  BF_BOUNDARY_PRODUCTION_READY,
  REDACTED,
  collectPaths,
  isFundacionPath,
  impliesProductionReadyYes,
  detectPublishIntent,
  redactSecretSubstrings,
  detectSecretLeakage,
  scrubSecrets,
  extractDigest,
  normalizeArtifact,
  normalizeArtifacts,
  canonicalManifestBody,
  hasArtifactCustodyFields,
  hasSealCustodyFields,
  observeAqNotary,
  observeBcApply,
  observeBdDelivery,
  observeBeReplay,
  BF_RECEIPT_KIND,
  BF_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  buildNotaryReceipt,
  BF_POLICY_GATE_KIND,
  BF_POLICY_GATE_PRODUCTION_READY,
  BF_POLICY_CODES,
  deny,
  denyProductionReadyYes,
  denyRegistryPublish,
  denyGhReleases,
  denyFundacion,
  denyHitl,
  denyApplySeal,
  denyDeliverySeal,
  denyReplaySeal,
  denyMalformedArtifacts,
  denyEmptyArtifacts,
  denyInvalidRequest,
  denyEmpty,
  denyPolicy,
  denyLawVi,
  denyCustody,
  checkSeal,
  checkApplySeal,
  checkDeliverySeal,
  checkReplaySeal,
  checkHitl,
  checkCustody,
  gatePackagingRequest,
  createRcPackagingPolicyGate
};

export default {
  BF_KIND,
  BF_PRODUCTION_READY,
  BF_CODES,
  BF_PHASES,
  createLocalRcPackagingArtifactNotaryPort,
  packageAndNotarize,
  sanitizeBfPayload,
  LocalRcPackagingArtifactNotaryError
};
