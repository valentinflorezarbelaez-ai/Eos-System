/**
 * @module cross-satellite-composition-harness
 * SPEC-0050 / Mission AS — Cross-Satellite Composition Harness (AN×AO×AP×AQ).
 *
 * Injectable composition harness that observes/integrates federation (AN) ×
 * failover (AO) × authority (AP) × export (AQ) fail-closed. Compose, don't
 * rewrite — inject plane fakes/stubs; do not vendor full AN–AQ.
 * Hermetic fakes only — no fetch/http/CloudAgent.
 *
 * NON-CLAIM:
 *   cross-satellite composition ≠ E2E product suite
 *   cross-satellite composition ≠ PRODUCTION_READY integration platform
 *   cross-satellite composition ≠ CloudAgent orchestration
 *   not AT/AU/AV/AW
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: detect provider secret material via runtime-synthesized
 * patterns — never embed a static vendor-key prefix literal in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  AS_RECEIPT_KIND,
  AS_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildCompositionReceipt
} from './composition-receipt.js';
import {
  createAnPlaneStub,
  createAoPlaneStub,
  createApPlaneStub,
  createAqPlaneStub,
  AS_STUB_PRODUCTION_READY
} from './plane-stubs.js';

/** @type {'NO'} */
export const AS_PRODUCTION_READY = 'NO';

export const AS_KIND = 'eos-cross-satellite-composition-harness';

export const AS_CODES = Object.freeze({
  OK: 'OK',
  COMPOSITION_OK: 'COMPOSITION_OK',
  PLANE_INCONSISTENT: 'PLANE_INCONSISTENT',
  COMPOSITION_DENIED: 'COMPOSITION_DENIED',
  MISSING_DEP: 'MISSING_DEP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  EVD_LINK_FAIL: 'EVD_LINK_FAIL',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  HITL_REQUIRED: 'HITL_REQUIRED'
});

const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|token|authorization|secret|password|credential|private[_-]?key).*)$/i;

const LONG_B64_RE = /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = '[REDACTED]';

const PLANE_NAMES = Object.freeze(['AN', 'AO', 'AP', 'AQ']);

/**
 * Typed error for AS composition harness failures.
 */
export class CrossSatelliteCompositionError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AS_CODES.COMPOSITION_DENIED, details = {}) {
    super(sanitizeErrorMessage(message));
    this.name = 'CrossSatelliteCompositionError';
    this.code = code;
    this.details = sanitizeAsPayload(details);
  }
}

/**
 * Law VI deep sanitize for dumps / errors / receipts / getState.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeAsPayload(obj) {
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
    if (/^AS-(RCPT|COMP|SCEN)-[a-z0-9]+$/i.test(value)) return value;
    if (/^(AN|AO|AP|AQ)-/i.test(value)) return value;
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
      /^(scenarioCount|denyCount|okCount|openCount|compositionId|scenarioId|receiptId|receiptDigest|sharedEvdLink|phase|code|status|plane|custodyTip|chainTip|budgetOk|authorityOpen|exportSealed|consistent)$/i.test(
        k
      )
    ) {
      out[k] = sanitizeDeep(v, seen);
      continue;
    }
    if (
      /^(digest|sha256|bodySha256|prevDigest|priorTip|tip|packDigest)$/i.test(
        k
      )
    ) {
      out[k] =
        typeof v === 'string'
          ? redactSecretSubstrings(v)
          : sanitizeDeep(v, seen);
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
 * Detect secret-like fields that must not enter receipts.
 * @param {unknown} obj
 * @returns {boolean}
 */
function containsSecretFields(obj, seen = new WeakSet()) {
  if (obj == null || typeof obj !== 'object') return false;
  if (seen.has(obj)) return false;
  seen.add(obj);
  if (Array.isArray(obj)) {
    return obj.some((v) => containsSecretFields(v, seen));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_RE.test(k) || /^token$/i.test(k)) return true;
    if (typeof v === 'string') {
      const vendorPrefix = ['s', 'k', '-'].join('');
      if (v.startsWith(vendorPrefix) && v.length >= 12) return true;
      if (/^Bearer\s+[A-Za-z0-9._\-+=/]{8,}/i.test(v)) return true;
    }
    if (containsSecretFields(v, seen)) return true;
  }
  return false;
}

let _compSeq = 0;
let _scenSeq = 0;

/**
 * @param {object} [options]
 * @param {{ observe?(req?: object): object, exportCustody?(req?: object): object, getCustodyTip?(): string, plane?: string }} [options.an]
 * @param {{ observe?(req?: object): object, route?(req?: object): object, plane?: string }} [options.ao]
 * @param {{ observe?(req?: object): object, openRequest?(req?: object): object, decide?(d?: object): object, isOpen?(): boolean, plane?: string }} [options.ap]
 * @param {{ observe?(req?: object): object, exportRange?(req?: object): object, getChainTip?(): string, plane?: string }} [options.aq]
 * @param {() => string|number} [options.now]
 * @param {(payload: unknown) => string} [options.hash]
 * @param {(receipt: object) => object} [options.receiptSealer]
 * @param {boolean} [options.requireAllPlanes] — MISSING_DEP if any plane absent
 * @param {boolean} [options.rejectSecretsInRequest]
 * @param {boolean} [options.throwOnDeny]
 * @param {boolean} [options.linkCustodyToExport] — require AN tip ↔ AQ tip agreement
 */
export function createCrossSatelliteCompositionHarness(options = {}) {
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const receiptSealer =
    typeof options.receiptSealer === 'function'
      ? options.receiptSealer
      : null;
  const throwOnDeny = options.throwOnDeny === true;
  const rejectSecretsInRequest = options.rejectSecretsInRequest !== false;
  const requireAllPlanes = options.requireAllPlanes !== false;
  const linkCustodyToExport = options.linkCustodyToExport !== false;

  const an =
    options.an && typeof options.an === 'object' ? options.an : null;
  const ao =
    options.ao && typeof options.ao === 'object' ? options.ao : null;
  const ap =
    options.ap && typeof options.ap === 'object' ? options.ap : null;
  const aq =
    options.aq && typeof options.aq === 'object' ? options.aq : null;

  /** @type {Map<string, object>} */
  const openCompositions = new Map();
  /** @type {object[]} */
  const receipts = [];
  /** @type {object[]} */
  const scenarioLog = [];

  let scenarioCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let inconsistentCount = 0;

  function nonClaimFlags() {
    return {
      compositionNotE2EProductSuite: true,
      compositionNotProductionReadyIntegration: true,
      compositionNotCloudAgentOrchestration: true,
      notAtAuAvAw: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true,
      lawViEnvOnly: true,
      asProductionReadyNo: true
    };
  }

  /**
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body = {}) {
    let receipt = buildCompositionReceipt(sanitizeAsPayload(body), {
      hash: hashFn,
      now: nowFn,
      sharedEvdLink: body.sharedEvdLink != null ? body.sharedEvdLink : null
    });
    receipt = sanitizeAsPayload({
      ...receipt,
      channelKind: AS_KIND,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      nonClaim: nonClaimFlags()
    });
    if (receiptSealer) {
      receipt = sanitizeAsPayload(receiptSealer(receipt));
    }
    receipt = sanitizeAsPayload(receipt);
    receipts.push(receipt);
    return receipt;
  }

  /**
   * @param {string} code
   * @param {object} [extra]
   */
  function denyResult(code, extra = {}) {
    denyCount += 1;
    const receipt = sealReceipt({
      ok: false,
      allow: false,
      code,
      phase: 'DENY',
      decision: 'deny',
      forensic: true,
      ...extra
    });
    const result = sanitizeAsPayload({
      ok: false,
      allow: false,
      code,
      receipt,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND,
      nonClaim: nonClaimFlags(),
      ...extra
    });
    if (throwOnDeny) {
      throw new CrossSatelliteCompositionError(
        `AS deny: ${code}`,
        code,
        extra
      );
    }
    return result;
  }

  function missingPlanes() {
    /** @type {string[]} */
    const missing = [];
    if (!an) missing.push('AN');
    if (!ao) missing.push('AO');
    if (!ap) missing.push('AP');
    if (!aq) missing.push('AQ');
    return missing;
  }

  /**
   * Observe all injected planes and collect consistency report.
   * @param {object} [req]
   */
  function composePlanes(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyResult(AS_CODES.INVALID_REQUEST, {
        reason: 'composePlanes requires an object'
      });
    }

    if (
      req.fundacion === true ||
      req.fundacionWrite === true ||
      (typeof req.target === 'string' && /fundacion/i.test(req.target))
    ) {
      return denyResult(AS_CODES.FUNDACION_DENIED, {
        reason: 'Fundacion ALWAYS DENY — no Fundacion write via composition',
        fundacion: 'ALWAYS_DENY',
        fundacionDelta: 0
      });
    }

    const missing = missingPlanes();
    if (requireAllPlanes && missing.length > 0) {
      return denyResult(AS_CODES.MISSING_DEP, {
        reason: 'one or more plane injectors absent',
        missing,
        dep: missing.join(',')
      });
    }

    if (
      rejectSecretsInRequest &&
      containsSecretFields(req) &&
      (req.persistSecrets === true ||
        req.includeSecretsInReceipt === true ||
        req.sealSecrets === true)
    ) {
      return denyResult(AS_CODES.SECRET_LEAK_FORBIDDEN, {
        reason:
          'composition secrets must not enter sealed receipts / state (Law VI)'
      });
    }

    /** @type {Record<string, object|null>} */
    const observations = { AN: null, AO: null, AP: null, AQ: null };
    /** @type {string[]} */
    const inconsistentPlanes = [];
    /** @type {Record<string, string>} */
    const planeCodes = {};

    const planeMap = { AN: an, AO: ao, AP: ap, AQ: aq };
    for (const name of PLANE_NAMES) {
      const plane = planeMap[name];
      if (!plane) continue;
      let obs;
      try {
        obs =
          typeof plane.observe === 'function'
            ? plane.observe(sanitizeAsPayload(req))
            : {
                ok: false,
                plane: name,
                consistent: false,
                code: 'NO_OBSERVE'
              };
      } catch (err) {
        obs = {
          ok: false,
          plane: name,
          consistent: false,
          code: 'OBSERVE_THROW',
          error: sanitizeErrorMessage(err?.message || 'observe failed')
        };
      }
      obs = sanitizeAsPayload(obs);
      observations[name] = obs;
      planeCodes[name] = obs && obs.code != null ? String(obs.code) : 'UNKNOWN';
      if (
        !obs ||
        obs.ok === false ||
        obs.consistent === false ||
        (name === 'AP' && obs.authorityOpen === true && req.allowOpenAuthority !== true)
      ) {
        // AP open authority is HITL_REQUIRED (not always inconsistency)
        if (name === 'AP' && obs && obs.authorityOpen === true) {
          // tracked separately below
        } else if (!obs || obs.ok === false || obs.consistent === false) {
          inconsistentPlanes.push(name);
        }
      }
    }

    // Cross-plane custody ↔ export tip linkage
    if (
      linkCustodyToExport &&
      observations.AN &&
      observations.AQ &&
      observations.AN.custodyTip != null &&
      observations.AQ.chainTip != null &&
      req.requireTipMatch === true
    ) {
      if (
        String(observations.AN.custodyTip) !==
        String(observations.AQ.chainTip)
      ) {
        if (!inconsistentPlanes.includes('AN')) inconsistentPlanes.push('AN');
        if (!inconsistentPlanes.includes('AQ')) inconsistentPlanes.push('AQ');
      }
    }

    // Detect explicit inconsistency flags from scenario
    if (req.forceInconsistent === true) {
      for (const n of PLANE_NAMES) {
        if (!inconsistentPlanes.includes(n) && observations[n]) {
          inconsistentPlanes.push(n);
        }
      }
    }
    if (Array.isArray(req.inconsistentPlanes)) {
      for (const n of req.inconsistentPlanes) {
        const up = String(n).toUpperCase();
        if (PLANE_NAMES.includes(up) && !inconsistentPlanes.includes(up)) {
          inconsistentPlanes.push(up);
        }
      }
    }

    const apOpen =
      observations.AP && observations.AP.authorityOpen === true;

    if (inconsistentPlanes.length > 0) {
      inconsistentCount += 1;
      return denyResult(AS_CODES.PLANE_INCONSISTENT, {
        reason: 'composed plane reports inconsistent custody/authority/budget/export state',
        inconsistentPlanes,
        planeCodes,
        observations,
        phase: 'COMPOSE'
      });
    }

    if (apOpen && req.allowOpenAuthority !== true) {
      const receipt = sealReceipt({
        ok: false,
        allow: false,
        code: AS_CODES.HITL_REQUIRED,
        phase: 'COMPOSE',
        hitlRequired: true,
        planeCodes,
        observations,
        reason: 'AP authority request open — HITL required before composition advance'
      });
      return sanitizeAsPayload({
        ok: false,
        allow: false,
        code: AS_CODES.HITL_REQUIRED,
        hitlRequired: true,
        observations,
        planeCodes,
        receipt,
        PRODUCTION_READY: AS_PRODUCTION_READY,
        kind: AS_KIND,
        nonClaim: nonClaimFlags()
      });
    }

    return sanitizeAsPayload({
      ok: true,
      code: AS_CODES.OK,
      phase: 'COMPOSE',
      observations,
      planeCodes,
      inconsistentPlanes: [],
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * WHEN operator scenario requires coordinated AN+AO+AP+AQ:
   * run composition harness observing plane interactions fail-closed.
   * @param {object} [scenario]
   */
  function runScenario(scenario = {}) {
    if (scenario == null || typeof scenario !== 'object') {
      return denyResult(AS_CODES.INVALID_REQUEST, {
        reason: 'runScenario requires an object'
      });
    }

    if (
      scenario.fundacion === true ||
      scenario.fundacionWrite === true ||
      (typeof scenario.target === 'string' &&
        /fundacion/i.test(scenario.target))
    ) {
      return denyResult(AS_CODES.FUNDACION_DENIED, {
        reason: 'Fundacion ALWAYS DENY — no Fundacion write via composition',
        fundacion: 'ALWAYS_DENY',
        fundacionDelta: 0
      });
    }

    const missing = missingPlanes();
    if (requireAllPlanes && missing.length > 0) {
      return denyResult(AS_CODES.MISSING_DEP, {
        reason: 'one or more plane injectors absent',
        missing,
        dep: missing.join(',')
      });
    }

    if (
      rejectSecretsInRequest &&
      containsSecretFields(scenario) &&
      (scenario.persistSecrets === true ||
        scenario.includeSecretsInReceipt === true ||
        scenario.sealSecrets === true)
    ) {
      return denyResult(AS_CODES.SECRET_LEAK_FORBIDDEN, {
        reason:
          'scenario secrets must not enter sealed receipts / state (Law VI)'
      });
    }

    // Block advance while another composition is open (unless same id resume)
    if (
      openCompositions.size > 0 &&
      scenario.forceAdvance === true
    ) {
      return denyResult(AS_CODES.COMPOSITION_DENIED, {
        reason:
          'concurrent/open composition blocks inconsistent advance',
        openCount: openCompositions.size,
        openIds: [...openCompositions.keys()]
      });
    }

    _scenSeq += 1;
    _compSeq += 1;
    const at = String(nowFn());
    const scenarioId =
      scenario.scenarioId != null
        ? String(scenario.scenarioId)
        : `AS-SCEN-${hashFn({ at, seq: _scenSeq }).slice(0, 12)}`;
    const compositionId = `AS-COMP-${hashFn({ scenarioId, at, seq: _compSeq }).slice(0, 12)}`;

    // Shared EVD receipt linkage across planes
    const sharedEvdLink = hashFn({
      kind: 'as-shared-evd-link',
      compositionId,
      scenarioId,
      at
    });

    if (!sharedEvdLink) {
      return denyResult(AS_CODES.EVD_LINK_FAIL, {
        reason: 'failed to mint shared EVD receipt linkage',
        scenarioId,
        compositionId
      });
    }

    scenarioCount += 1;

    // Mark composition open while running
    openCompositions.set(compositionId, {
      compositionId,
      scenarioId,
      status: 'open',
      openedAt: at,
      sharedEvdLink
    });

    const composed = composePlanes({
      ...sanitizeAsPayload({
        scenarioId,
        compositionId,
        requireTipMatch: scenario.requireTipMatch === true,
        allowOpenAuthority: scenario.allowOpenAuthority === true,
        inconsistentPlanes: scenario.inconsistentPlanes,
        forceInconsistent: scenario.forceInconsistent === true,
        meta: scenario.meta
      })
    });

    if (!composed.ok) {
      openCompositions.delete(compositionId);
      // Re-seal with scenario linkage if compose denied without full context
      if (composed.receipt) {
        const linked = sealReceipt({
          ok: false,
          allow: false,
          code: composed.code,
          phase: 'SCENARIO',
          scenarioId,
          compositionId,
          sharedEvdLink,
          forensic: true,
          inconsistentPlanes: composed.inconsistentPlanes || null,
          planeCodes: composed.planeCodes || null,
          reason: composed.reason || composed.code,
          hitlRequired: composed.hitlRequired === true
        });
        scenarioLog.push({
          scenarioId,
          compositionId,
          code: composed.code,
          ok: false,
          at
        });
        return sanitizeAsPayload({
          ...composed,
          scenarioId,
          compositionId,
          sharedEvdLink,
          receipt: linked,
          PRODUCTION_READY: AS_PRODUCTION_READY,
          kind: AS_KIND
        });
      }
      openCompositions.delete(compositionId);
      return composed;
    }

    // Optional plane actions: federation export → failover route →
    // authority check → evidence export, all linked by sharedEvdLink
    /** @type {Record<string, object|null>} */
    const planeActions = { AN: null, AO: null, AP: null, AQ: null };

    if (an && typeof an.exportCustody === 'function' && scenario.skipAn !== true) {
      planeActions.AN = sanitizeAsPayload(
        an.exportCustody({ sharedEvdLink, scenarioId, compositionId })
      );
    }
    if (ao && typeof ao.route === 'function' && scenario.skipAo !== true) {
      planeActions.AO = sanitizeAsPayload(
        ao.route({ sharedEvdLink, scenarioId, compositionId })
      );
    }
    if (ap && typeof ap.observe === 'function' && scenario.skipAp !== true) {
      planeActions.AP = sanitizeAsPayload(
        ap.observe({ sharedEvdLink, scenarioId, compositionId })
      );
    }
    if (
      aq &&
      typeof aq.exportRange === 'function' &&
      scenario.skipAq !== true
    ) {
      planeActions.AQ = sanitizeAsPayload(
        aq.exportRange({
          sharedEvdLink,
          scenarioId,
          compositionId,
          missionId: scenario.missionId || 'mission-as'
        })
      );
    }

    // Post-action inconsistency: any plane action ok===false
    /** @type {string[]} */
    const actionInconsistent = [];
    for (const name of PLANE_NAMES) {
      const act = planeActions[name];
      if (act && act.ok === false) actionInconsistent.push(name);
    }
    if (actionInconsistent.length > 0) {
      inconsistentCount += 1;
      openCompositions.delete(compositionId);
      scenarioLog.push({
        scenarioId,
        compositionId,
        code: AS_CODES.PLANE_INCONSISTENT,
        ok: false,
        at
      });
      return denyResult(AS_CODES.PLANE_INCONSISTENT, {
        reason: 'plane action reported failure during composition',
        inconsistentPlanes: actionInconsistent,
        planeActions,
        observations: composed.observations,
        scenarioId,
        compositionId,
        sharedEvdLink,
        phase: 'SCENARIO'
      });
    }

    // Verify shared EVD link present on AQ pack when exported
    if (
      planeActions.AQ &&
      planeActions.AQ.pack &&
      scenario.requireEvdLink === true
    ) {
      if (
        planeActions.AQ.pack.sharedEvdLink == null ||
        String(planeActions.AQ.pack.sharedEvdLink) !== String(sharedEvdLink)
      ) {
        openCompositions.delete(compositionId);
        return denyResult(AS_CODES.EVD_LINK_FAIL, {
          reason: 'AQ pack missing shared EVD receipt linkage',
          scenarioId,
          compositionId,
          sharedEvdLink,
          packLink: planeActions.AQ.pack.sharedEvdLink || null
        });
      }
    }

    okCount += 1;
    openCompositions.delete(compositionId);

    const receipt = sealReceipt({
      ok: true,
      allow: true,
      code: AS_CODES.COMPOSITION_OK,
      phase: 'SCENARIO',
      scenarioId,
      compositionId,
      sharedEvdLink,
      planeCodes: composed.planeCodes,
      planes: {
        AN: !!an,
        AO: !!ao,
        AP: !!ap,
        AQ: !!aq
      },
      forensic: false,
      status: 'complete'
    });

    scenarioLog.push({
      scenarioId,
      compositionId,
      code: AS_CODES.COMPOSITION_OK,
      ok: true,
      at,
      sharedEvdLink
    });

    return sanitizeAsPayload({
      ok: true,
      allow: true,
      code: AS_CODES.COMPOSITION_OK,
      status: 'complete',
      scenarioId,
      compositionId,
      sharedEvdLink,
      observations: composed.observations,
      planeCodes: composed.planeCodes,
      planeActions,
      receipt,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND,
      nonClaim: nonClaimFlags(),
      // Explicit NON-CLAIM surface on happy path
      e2eProductSuiteClaim: false,
      productionReadyIntegrationClaim: false,
      cloudAgentOrchestrationClaim: false
    });
  }

  /**
   * WHILE composition in progress — block inconsistent advance.
   * @param {object} [meta]
   */
  function advanceComposition(meta = {}) {
    if (openCompositions.size > 0) {
      return denyResult(AS_CODES.COMPOSITION_DENIED, {
        reason:
          'concurrent/open composition blocks inconsistent advance',
        openCount: openCompositions.size,
        openIds: [...openCompositions.keys()],
        ...sanitizeAsPayload(meta)
      });
    }
    if (meta == null || typeof meta !== 'object') {
      return denyResult(AS_CODES.INVALID_REQUEST, {
        reason: 'advanceComposition requires an object when provided'
      });
    }
    // Re-compose to confirm consistency before advance
    const composed = composePlanes(sanitizeAsPayload(meta));
    if (!composed.ok) {
      return composed;
    }
    return sanitizeAsPayload({
      ok: true,
      code: AS_CODES.OK,
      advanced: true,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND,
      nonClaim: nonClaimFlags()
    });
  }

  /**
   * Open a composition without completing (for concurrent-block tests).
   * @param {object} [opts]
   */
  function beginComposition(opts = {}) {
    const missing = missingPlanes();
    if (requireAllPlanes && missing.length > 0) {
      return denyResult(AS_CODES.MISSING_DEP, {
        missing,
        dep: missing.join(',')
      });
    }
    _compSeq += 1;
    const at = String(nowFn());
    const compositionId = `AS-COMP-${hashFn({ at, seq: _compSeq, begin: true }).slice(0, 12)}`;
    const sharedEvdLink = hashFn({
      kind: 'as-shared-evd-link',
      compositionId,
      at
    });
    openCompositions.set(compositionId, {
      compositionId,
      status: 'open',
      openedAt: at,
      sharedEvdLink,
      scenarioId: opts.scenarioId || null
    });
    const receipt = sealReceipt({
      ok: true,
      code: AS_CODES.OK,
      phase: 'BEGIN',
      compositionId,
      sharedEvdLink,
      status: 'open'
    });
    return sanitizeAsPayload({
      ok: true,
      code: AS_CODES.OK,
      status: 'open',
      compositionId,
      sharedEvdLink,
      receipt,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND
    });
  }

  /**
   * Close an open composition by id.
   * @param {string} compositionId
   */
  function endComposition(compositionId) {
    if (compositionId == null || String(compositionId).trim() === '') {
      return denyResult(AS_CODES.INVALID_REQUEST, {
        reason: 'endComposition requires compositionId'
      });
    }
    const id = String(compositionId).trim();
    if (!openCompositions.has(id)) {
      return denyResult(AS_CODES.INVALID_REQUEST, {
        reason: 'no open composition for compositionId',
        compositionId: id
      });
    }
    openCompositions.delete(id);
    const receipt = sealReceipt({
      ok: true,
      code: AS_CODES.OK,
      phase: 'END',
      compositionId: id,
      status: 'closed'
    });
    return sanitizeAsPayload({
      ok: true,
      code: AS_CODES.OK,
      status: 'closed',
      compositionId: id,
      receipt,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      kind: AS_KIND
    });
  }

  function getState() {
    return sanitizeAsPayload({
      kind: AS_KIND,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      scenarioCount,
      okCount,
      denyCount,
      inconsistentCount,
      openCount: openCompositions.size,
      openCompositions: [...openCompositions.values()].map((c) =>
        sanitizeAsPayload(c)
      ),
      receiptCount: receipts.length,
      scenarioLog: scenarioLog.slice(-20),
      planes: {
        AN: { present: !!an },
        AO: { present: !!ao },
        AP: { present: !!ap },
        AQ: { present: !!aq }
      },
      fundacion: 'ALWAYS_DENY',
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      e2eProductSuiteClaim: false,
      productionReadyIntegrationClaim: false,
      cloudAgentOrchestrationClaim: false,
      receiptHelperKind: AS_RECEIPT_KIND,
      receiptHelperProductionReady: AS_RECEIPT_PRODUCTION_READY,
      stubProductionReady: AS_STUB_PRODUCTION_READY,
      nonClaim: nonClaimFlags()
    });
  }

  function getReceipts() {
    return receipts.map((r) => sanitizeAsPayload(r));
  }

  function health() {
    return sanitizeAsPayload({
      ok: true,
      kind: AS_KIND,
      PRODUCTION_READY: AS_PRODUCTION_READY,
      scenarioCount,
      openCount: openCompositions.size,
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      e2eProductSuiteClaim: false,
      productionReadyIntegrationClaim: false,
      cloudAgentOrchestrationClaim: false,
      nonClaim: nonClaimFlags()
    });
  }

  return {
    kind: AS_KIND,
    PRODUCTION_READY: AS_PRODUCTION_READY,
    runScenario,
    composePlanes,
    advanceComposition,
    beginComposition,
    endComposition,
    sealReceipt,
    getState,
    getReceipts,
    health,
    sanitizeAsPayload,
    /** @internal */
    _codes: AS_CODES
  };
}

export {
  AS_RECEIPT_KIND,
  AS_RECEIPT_PRODUCTION_READY,
  AS_STUB_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildCompositionReceipt,
  createAnPlaneStub,
  createAoPlaneStub,
  createApPlaneStub,
  createAqPlaneStub
};

export default createCrossSatelliteCompositionHarness;
