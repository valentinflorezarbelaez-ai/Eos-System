/**
 * @module governed-state-freeze-drift-observer
 * SPEC-0053 / Mission AV — Governed State Freeze & Drift Observer
 * (aka Release Honesty / Freeze-Drift Observer from L17 audit).
 *
 * Observe-only drift detector for tip SSOT vs freeze/matrix/m4 vs
 * observed HEAD / origin/main — without auto-merge / GH enforcement claims.
 *
 * Main API: observe({ freezeTip, matrixTip, observedTip, mode })
 * mode: 'observe' | 'fail-closed'
 *
 * NON-CLAIM:
 *   freeze-drift observer ≠ auto-merge bot
 *   freeze-drift observer ≠ GH required-check enforcement
 *   freeze-drift observer ≠ GH branch-protection mutation
 *   freeze-drift observer ≠ GH billing change
 *   not AW
 *   Fundacion Δ=0 (ALWAYS DENY; no Fundacion writes)
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals in source.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AV_CEILING
 */

import {
  AV_TIP_READER_KIND,
  AV_TIP_READER_PRODUCTION_READY,
  TIP_SHA_RE,
  MAIN_TIP_LINE_RE,
  EVALUATED_TIP_LINE_RE,
  normalizeTip,
  parseMainTip,
  parseEvaluatedTip,
  resolveTipPin,
  createTipPinReader
} from './tip-pin-reader.js';
import {
  AV_RECEIPT_KIND,
  AV_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildDriftReceipt
} from './drift-receipt.js';
import {
  AV_HONESTY_GATE_KIND,
  AV_HONESTY_GATE_PRODUCTION_READY,
  AV_HONESTY_GATE_CODES,
  evaluateHonestyGate,
  createHonestyGate
} from './honesty-gate.js';

/** @type {'NO'} */
export const AV_PRODUCTION_READY = 'NO';

export const AV_KIND = 'eos-governed-state-freeze-drift-observer';

export const AV_CODES = Object.freeze({
  OK: 'OK',
  MATCHED: 'MATCHED',
  DRIFT_MEASURED: 'DRIFT_MEASURED',
  DENY: 'DENY',
  TIP_MISMATCH: 'TIP_MISMATCH',
  FREEZE_MATRIX_MISMATCH: 'FREEZE_MATRIX_MISMATCH',
  INVALID_TIP: 'INVALID_TIP',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_DEP: 'MISSING_DEP',
  HONESTY_CLAIM_DENIED: 'HONESTY_CLAIM_DENIED',
  FUNDACION_DENIED: 'FUNDACION_DENIED'
});

/**
 * Typed error for AV freeze-drift observer failures.
 */
export class FreezeDriftObserverError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = AV_CODES.DENY, details = {}) {
    super(String(message));
    this.name = 'FreezeDriftObserverError';
    this.code = code;
    this.details = details && typeof details === 'object' ? { ...details } : {};
  }
}

/**
 * Resolve a tip from string, or parse from fence text.
 * @param {unknown} tipOrFence
 * @param {'main'|'evaluated'} kind
 * @returns {{ ok: boolean, tip: string|null, code: string, reason?: string }}
 */
function coerceTip(tipOrFence, kind) {
  if (tipOrFence == null || tipOrFence === '') {
    return {
      ok: false,
      tip: null,
      code: AV_CODES.MISSING_DEP,
      reason: `${kind} tip missing`
    };
  }
  const s = String(tipOrFence);
  // Multi-line fence → parse
  if (s.includes('\n') || /^(main_tip|evaluated_tip):/im.test(s)) {
    return kind === 'evaluated' ? parseEvaluatedTip(s) : parseMainTip(s);
  }
  return normalizeTip(s);
}

/**
 * Create Governed State Freeze & Drift Observer.
 *
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @param {'observe'|'fail-closed'} [opts.defaultMode='observe']
 * @param {boolean} [opts.throwOnDeny]
 * @returns {object}
 */
export function createFreezeDriftObserver(opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const defaultMode =
    opts.defaultMode === 'fail-closed' ? 'fail-closed' : 'observe';
  const throwOnDeny = opts.throwOnDeny === true;
  const tipReader = createTipPinReader();
  const honestyGate = createHonestyGate();

  let observeCount = 0;
  let matchCount = 0;
  let driftCount = 0;
  let denyCount = 0;

  /**
   * @param {object} result
   * @returns {object}
   */
  function maybeThrow(result) {
    if (!result.ok && throwOnDeny && result.deny === true) {
      throw new FreezeDriftObserverError(
        result.reason || result.code || 'DENY',
        result.code || AV_CODES.DENY,
        {
          freezeTip: result.freezeTip,
          matrixTip: result.matrixTip,
          observedTip: result.observedTip,
          mismatches: result.mismatches
        }
      );
    }
    return result;
  }

  /**
   * @param {object} body
   * @returns {object}
   */
  function sealReceipt(body) {
    return buildDriftReceipt(body, { hash: hashFn, now: nowFn });
  }

  /**
   * Observe tip SSOT drift across freeze / matrix / observed tips.
   *
   * @param {object} req
   * @param {string} [req.freezeTip] - raw tip or freeze fence text
   * @param {string} [req.matrixTip] - raw tip or matrix fence text
   * @param {string} [req.observedTip] - observed HEAD / origin/main tip
   * @param {string} [req.freezeText] - alias for freeze fence
   * @param {string} [req.matrixText] - alias for matrix fence
   * @param {'observe'|'fail-closed'} [req.mode]
   * @returns {object}
   */
  function observe(req = {}) {
    observeCount += 1;

    if (req == null || typeof req !== 'object') {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AV_CODES.INVALID_REQUEST,
        status: 'DENY',
        phase: 'OBSERVE',
        mode: defaultMode,
        reason: 'observe request required',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code: AV_CODES.INVALID_REQUEST,
        deny: true,
        reason: 'observe request required',
        receipt
      });
    }

    const mode =
      req.mode === 'fail-closed'
        ? 'fail-closed'
        : req.mode === 'observe'
          ? 'observe'
          : defaultMode;

    const freezeRaw =
      req.freezeTip != null ? req.freezeTip : req.freezeText;
    const matrixRaw =
      req.matrixTip != null ? req.matrixTip : req.matrixText;
    const observedRaw = req.observedTip;

    const freeze = coerceTip(freezeRaw, 'main');
    const matrix = coerceTip(matrixRaw, 'evaluated');
    const observed = coerceTip(observedRaw, 'main');

    // Invalid tip formats
    for (const [label, parsed] of [
      ['freeze', freeze],
      ['matrix', matrix],
      ['observed', observed]
    ]) {
      if (
        parsed.code === 'INVALID_TIP' ||
        (parsed.code === 'INVALID_REQUEST' &&
          freezeRaw != null &&
          label === 'freeze') ||
        (parsed.code === 'INVALID_REQUEST' &&
          matrixRaw != null &&
          label === 'matrix')
      ) {
        if (parsed.code === 'INVALID_TIP') {
          denyCount += 1;
          const receipt = sealReceipt({
            ok: false,
            code: AV_CODES.INVALID_TIP,
            status: 'DENY',
            phase: 'VALIDATE',
            mode,
            freezeTip: freeze.tip,
            matrixTip: matrix.tip,
            observedTip: observed.tip,
            reason: `${label}: ${parsed.reason || 'invalid tip'}`,
            deny: true,
            decision: 'DENY'
          });
          return maybeThrow({
            ok: false,
            code: AV_CODES.INVALID_TIP,
            deny: true,
            reason: `${label}: ${parsed.reason || 'invalid tip'}`,
            freezeTip: freeze.tip,
            matrixTip: matrix.tip,
            observedTip: observed.tip,
            receipt
          });
        }
      }
    }

    // Missing deps — need at least freeze + observed (matrix optional but recommended)
    if (!freeze.ok && freeze.code === 'MISSING_DEP') {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AV_CODES.MISSING_DEP,
        status: 'DENY',
        phase: 'VALIDATE',
        mode,
        reason: 'freezeTip required',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code: AV_CODES.MISSING_DEP,
        deny: true,
        reason: 'freezeTip required',
        receipt
      });
    }
    if (!observed.ok && observed.code === 'MISSING_DEP') {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AV_CODES.MISSING_DEP,
        status: 'DENY',
        phase: 'VALIDATE',
        mode,
        freezeTip: freeze.tip,
        reason: 'observedTip required',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code: AV_CODES.MISSING_DEP,
        deny: true,
        reason: 'observedTip required',
        freezeTip: freeze.tip,
        receipt
      });
    }

    // If freeze/matrix/observed failed INVALID_TIP already returned;
    // if still not ok for other reasons after having raw input:
    if (freezeRaw != null && !freeze.ok) {
      denyCount += 1;
      const code =
        freeze.code === 'INVALID_TIP'
          ? AV_CODES.INVALID_TIP
          : AV_CODES.INVALID_REQUEST;
      const receipt = sealReceipt({
        ok: false,
        code,
        status: 'DENY',
        phase: 'VALIDATE',
        mode,
        reason: freeze.reason || 'freeze tip invalid',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code,
        deny: true,
        reason: freeze.reason || 'freeze tip invalid',
        receipt
      });
    }
    if (observedRaw != null && !observed.ok) {
      denyCount += 1;
      const code =
        observed.code === 'INVALID_TIP'
          ? AV_CODES.INVALID_TIP
          : AV_CODES.INVALID_REQUEST;
      const receipt = sealReceipt({
        ok: false,
        code,
        status: 'DENY',
        phase: 'VALIDATE',
        mode,
        freezeTip: freeze.tip,
        reason: observed.reason || 'observed tip invalid',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code,
        deny: true,
        reason: observed.reason || 'observed tip invalid',
        freezeTip: freeze.tip,
        receipt
      });
    }
    if (matrixRaw != null && !matrix.ok) {
      denyCount += 1;
      const code =
        matrix.code === 'INVALID_TIP'
          ? AV_CODES.INVALID_TIP
          : AV_CODES.INVALID_REQUEST;
      const receipt = sealReceipt({
        ok: false,
        code,
        status: 'DENY',
        phase: 'VALIDATE',
        mode,
        freezeTip: freeze.tip,
        observedTip: observed.tip,
        reason: matrix.reason || 'matrix tip invalid',
        deny: true,
        decision: 'DENY'
      });
      return maybeThrow({
        ok: false,
        code,
        deny: true,
        reason: matrix.reason || 'matrix tip invalid',
        freezeTip: freeze.tip,
        observedTip: observed.tip,
        receipt
      });
    }

    /** @type {string[]} */
    const mismatches = [];

    // freeze vs matrix
    if (matrix.ok && freeze.ok && freeze.tip !== matrix.tip) {
      mismatches.push('FREEZE_MATRIX_MISMATCH');
    }
    // freeze vs observed
    if (freeze.ok && observed.ok && freeze.tip !== observed.tip) {
      mismatches.push('TIP_MISMATCH');
    }
    // matrix vs observed (when matrix present)
    if (matrix.ok && observed.ok && matrix.tip !== observed.tip) {
      if (!mismatches.includes('TIP_MISMATCH')) {
        mismatches.push('TIP_MISMATCH');
      }
    }

    const drift = mismatches.length > 0;

    if (!drift) {
      matchCount += 1;
      const gate = evaluateHonestyGate({
        drift: false,
        matched: true,
        mode,
        code: AV_CODES.MATCHED
      });
      const receipt = sealReceipt({
        ok: true,
        code: AV_CODES.MATCHED,
        status: 'MATCHED',
        phase: 'OBSERVE',
        mode,
        freezeTip: freeze.tip,
        matrixTip: matrix.ok ? matrix.tip : null,
        observedTip: observed.tip,
        drift: false,
        deny: false,
        decision: 'MATCHED',
        mismatches: [],
        reason: null
      });
      return {
        ok: true,
        code: AV_CODES.MATCHED,
        status: 'MATCHED',
        drift: false,
        deny: false,
        honestyClaimAllowed: gate.honestyClaimAllowed,
        freezeTip: freeze.tip,
        matrixTip: matrix.ok ? matrix.tip : null,
        observedTip: observed.tip,
        mismatches: [],
        mode,
        // NON-CLAIM — never mutate GH / auto-merge
        autoMerge: false,
        ghBranchProtectionMutation: false,
        ghRequiredCheckEnforcement: false,
        ghBillingChange: false,
        receipt
      };
    }

    // Drift MEASURED
    driftCount += 1;
    let code = AV_CODES.DRIFT_MEASURED;
    if (mismatches.includes('FREEZE_MATRIX_MISMATCH') && mismatches.length === 1) {
      code = AV_CODES.FREEZE_MATRIX_MISMATCH;
    } else if (
      mismatches.includes('TIP_MISMATCH') &&
      !mismatches.includes('FREEZE_MATRIX_MISMATCH')
    ) {
      code = AV_CODES.TIP_MISMATCH;
    } else if (mismatches.includes('FREEZE_MATRIX_MISMATCH')) {
      code = AV_CODES.FREEZE_MATRIX_MISMATCH;
    }

    const gate = evaluateHonestyGate({
      drift: true,
      matched: false,
      mode,
      code
    });

    if (mode === 'fail-closed') {
      denyCount += 1;
      const receipt = sealReceipt({
        ok: false,
        code: AV_CODES.HONESTY_CLAIM_DENIED,
        status: 'DENY',
        phase: 'GATE',
        mode,
        freezeTip: freeze.tip,
        matrixTip: matrix.ok ? matrix.tip : null,
        observedTip: observed.tip,
        drift: true,
        deny: true,
        decision: 'DENY',
        mismatches,
        reason: gate.reason
      });
      return maybeThrow({
        ok: false,
        code: AV_CODES.HONESTY_CLAIM_DENIED,
        status: 'DENY',
        drift: true,
        deny: true,
        honestyClaimAllowed: false,
        freezeTip: freeze.tip,
        matrixTip: matrix.ok ? matrix.tip : null,
        observedTip: observed.tip,
        mismatches,
        mode,
        reason: gate.reason,
        autoMerge: false,
        ghBranchProtectionMutation: false,
        ghRequiredCheckEnforcement: false,
        ghBillingChange: false,
        receipt
      });
    }

    // observe mode: report only — no throw-as-mutation; ok:true for report path
    // but code is DRIFT_MEASURED / TIP_MISMATCH / FREEZE_MATRIX_MISMATCH
    const receipt = sealReceipt({
      ok: true,
      code,
      status: 'DRIFT_MEASURED',
      phase: 'OBSERVE',
      mode,
      freezeTip: freeze.tip,
      matrixTip: matrix.ok ? matrix.tip : null,
      observedTip: observed.tip,
      drift: true,
      deny: false,
      decision: 'REPORT',
      mismatches,
      reason: 'freeze-drift MEASURED (observe-only; no auto-merge)'
    });

    return {
      ok: true,
      code,
      status: 'DRIFT_MEASURED',
      drift: true,
      deny: false,
      honestyClaimAllowed: gate.honestyClaimAllowed,
      freezeTip: freeze.tip,
      matrixTip: matrix.ok ? matrix.tip : null,
      observedTip: observed.tip,
      mismatches,
      mode,
      reason: 'freeze-drift MEASURED (observe-only; no auto-merge)',
      autoMerge: false,
      ghBranchProtectionMutation: false,
      ghRequiredCheckEnforcement: false,
      ghBillingChange: false,
      receipt
    };
  }

  /**
   * Fundacion write — ALWAYS DENY.
   * @param {unknown} [_payload]
   * @returns {object}
   */
  function writeFundacion(_payload) {
    denyCount += 1;
    const receipt = sealReceipt({
      ok: false,
      code: AV_CODES.FUNDACION_DENIED,
      status: 'DENY',
      phase: 'FUNDACION',
      reason: 'Fundacion writes always denied (Δ=0)',
      deny: true,
      decision: 'DENY'
    });
    return maybeThrow({
      ok: false,
      code: AV_CODES.FUNDACION_DENIED,
      deny: true,
      reason: 'Fundacion writes always denied (Δ=0)',
      fundacionDelta: 0,
      receipt
    });
  }

  /**
   * @returns {object}
   */
  function getState() {
    return {
      kind: AV_KIND,
      PRODUCTION_READY: AV_PRODUCTION_READY,
      observeCount,
      matchCount,
      driftCount,
      denyCount,
      fundacionDelta: 0,
      cloudAgent: false,
      autoMerge: false,
      autoMergeClaim: false,
      ghBranchProtectionMutation: false,
      ghRequiredCheckEnforcement: false,
      ghBillingChange: false,
      ghApiMutation: false
    };
  }

  /**
   * @returns {object}
   */
  function health() {
    return {
      kind: AV_KIND,
      PRODUCTION_READY: AV_PRODUCTION_READY,
      ok: true,
      cloudAgent: false,
      usesCloudAgent: false,
      fundacionDelta: 0,
      autoMerge: false,
      autoMergeClaim: false,
      ghBranchProtectionMutation: false,
      ghRequiredCheckEnforcement: false,
      ghBillingChange: false,
      ghApiMutation: false
    };
  }

  /**
   * Surface introspection: confirm no GH mutation / auto-merge APIs.
   * @returns {object}
   */
  function surfaceCapabilities() {
    const api = {
      observe: typeof observe === 'function',
      writeFundacion: typeof writeFundacion === 'function',
      getState: typeof getState === 'function',
      health: typeof health === 'function',
      sealReceipt: typeof sealReceipt === 'function',
      // Explicit NON-CLAIM — these MUST NOT exist as mutation methods
      autoMerge: false,
      mergePullRequest: false,
      updateBranchProtection: false,
      setRequiredStatusChecks: false,
      upgradeGhBilling: false,
      mutateGhApi: false
    };
    return api;
  }

  return {
    kind: AV_KIND,
    PRODUCTION_READY: AV_PRODUCTION_READY,
    codes: AV_CODES,
    observe,
    writeFundacion,
    sealReceipt,
    getState,
    health,
    surfaceCapabilities,
    tipReader,
    honestyGate
  };
}

// Re-exports for test convenience (single import surface)
export {
  AV_TIP_READER_KIND,
  AV_TIP_READER_PRODUCTION_READY,
  TIP_SHA_RE,
  MAIN_TIP_LINE_RE,
  EVALUATED_TIP_LINE_RE,
  normalizeTip,
  parseMainTip,
  parseEvaluatedTip,
  resolveTipPin,
  createTipPinReader,
  AV_RECEIPT_KIND,
  AV_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildDriftReceipt,
  AV_HONESTY_GATE_KIND,
  AV_HONESTY_GATE_PRODUCTION_READY,
  AV_HONESTY_GATE_CODES,
  evaluateHonestyGate,
  createHonestyGate
};

export default {
  AV_KIND,
  AV_PRODUCTION_READY,
  AV_CODES,
  FreezeDriftObserverError,
  createFreezeDriftObserver
};
