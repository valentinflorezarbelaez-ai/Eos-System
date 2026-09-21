/**
 * @module evidence-economy-custody-ledger-port
 * SPEC-0112 / Mission DC — Evidence Economy Custody Ledger Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic Evidence Economy Custody Ledger Port:
 *   - Validates plan via policy gate
 *   - Soft-observes freeze NON-CLAIM labels/fixtures (read-only; do NOT rewrite tip pins)
 *   - Soft-composes DA+DB observe when present (compose) else builtin fixture double
 *   - Soft-observes L28 honesty labels (CV/CW/CX/CY) when present
 *   - Requires DA+DB observe labels for ACTIVE PASS
 *   - custodyMode / ritualMode / honestyMode / aggregationMode: ACTIVE | HOLD
 *   - Decision: PASS | DENY | HOLD
 *   - Seals DC-RCPT-* receipts with forced freeze soft-observe (pin 22d80bce DB MEASURED #405)
 *   - Explicit honesty: custody PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite
 *   - Preserves FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate
 *
 * NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 * ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM.
 * PRODUCTION_READY: NO
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DC_PRODUCTION_READY,
  DC_RECEIPT_KIND,
  DC_FREEZE_PIN,
  DC_FREEZE_PIN_SHORT,
  DC_REQUIRED_OBSERVE_PORTS,
  DC_SOFT_OBSERVE_L28_PORTS,
  DC_FREEZE_NONCLAIM_LABELS,
  DC_FREEZE_OBSERVE_TEMPLATE,
  sha256Canonical,
  forceFreezeObserve,
  buildEvidenceEconomyCustodyLedgerReceipt,
  verifyEvidenceEconomyCustodyLedgerReceipt
} from './evidence-economy-custody-ledger-receipt.js';

import {
  EvidenceEconomyCustodyLedgerPolicyGate,
  DC_CODES,
  evaluateRequiredObserveSet,
  evaluateSoftObserveL28
} from './evidence-economy-custody-ledger-policy-gate.js';

/** @type {'NO'} */
export const DC_PORT_PRODUCTION_READY = 'NO';
export const DC_PORT_KIND = 'eos-evidence-economy-custody-ledger-port';
export {
  DC_FREEZE_PIN,
  DC_FREEZE_PIN_SHORT,
  DC_FREEZE_NONCLAIM_LABELS,
  DC_FREEZE_OBSERVE_TEMPLATE
};

export const DC_SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_COMPOSE_CUSTODY_LEDGER_PROBE',
  'A2_DA_DB_OBSERVE_LABEL_PROBE',
  'A3_DA_DB_SOFT_IMPORT_PROBE',
  'A4_L28_HONESTY_SOFT_OBSERVE_PROBE',
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L28_REOPEN',
  'A9_REFUSE_GHE_CLAIM',
  'A10_REFUSE_AUTO_CLOSE_L29',
  'A11_REFUSE_EXTERNAL_APM',
  'A12_REFUSE_PRODUCTION_READY_FLIP'
]);

export const DC_REFUSE_CODES = Object.freeze({
  MISSING_REQUIRED_OBSERVE_LABELS: 'MISSING_REQUIRED_OBSERVE_LABELS',
  RITUAL_NOT_OK: 'RITUAL_NOT_OK',
  CUSTODY_NOT_OK: 'CUSTODY_NOT_OK',
  HONESTY_NOT_OK: 'HONESTY_NOT_OK',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED',
  L28_REOPEN_REFUSED: 'L28_REOPEN_REFUSED',
  TIP_PIN_REWRITE_REFUSED: 'TIP_PIN_REWRITE_REFUSED',
  GHE_CLAIM_REFUSED: 'GHE_CLAIM_REFUSED',
  AUTO_CLOSE_L29_REFUSED: 'AUTO_CLOSE_L29_REFUSED',
  EXTERNAL_APM_REFUSED: 'EXTERNAL_APM_REFUSED'
});

export const DC_DEFAULT_OBSERVE_LABELS = Object.freeze([
  'DA:observability-aggregation-observe',
  'DB:doctor-ritual-automation-observe',
  'CV:honesty-observe',
  'CW:continuity-observe',
  'CX:local-verify-observe',
  'CY:control-plane-honesty-observe'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Soft-import DA observability aggregation when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportDaObservability(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'control-plane-observability-aggregation-port.js'),
    path.resolve(
      '/workspace/eos-mission-da/src/core/composition/control-plane-observability-aggregation-port.js'
    )
  );
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.builtinObservabilityAggregationDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinObservabilityAggregationDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import-da',
          path: candidate
        };
      }
      if (typeof mod.buildHonestySurface === 'function') {
        return {
          buildHonestySurface: mod.buildHonestySurface,
          HONESTY_PRODUCTION_READY: mod.HONESTY_PRODUCTION_READY || 'NO',
          source: 'soft-import-da',
          path: candidate
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Soft-import DB doctor ritual automation when co-located (compose; don't fork).
 * @param {string} [modulePath]
 * @returns {Promise<object|null>}
 */
export async function softImportDbDoctorRitual(modulePath) {
  const candidates = [];
  if (modulePath) candidates.push(modulePath);
  candidates.push(
    path.join(__dirname, 'doctor-ritual-automation-port.js'),
    path.resolve(
      '/workspace/eos-mission-db/src/core/composition/doctor-ritual-automation-port.js'
    )
  );
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(path.resolve(candidate)).href);
      if (typeof mod.builtinDoctorRitualAutomationDouble === 'function') {
        return {
          buildHonestySurface: mod.builtinDoctorRitualAutomationDouble,
          HONESTY_PRODUCTION_READY: 'NO',
          source: 'soft-import-db',
          path: candidate
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Soft-compose DA+DB observe surfaces when present (prefer DB ritual double, else DA).
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function softImportDaDbObserve(opts = {}) {
  const db = await softImportDbDoctorRitual(opts.dbModulePath);
  if (db) return db;
  const da = await softImportDaObservability(
    opts.daModulePath || opts.honestyModulePath
  );
  if (da) return da;
  return null;
}

/**
 * Soft-compose DA+DB (+ L28 honesty) observe labels (fixtures when absent).
 * @param {string[]} [requested]
 * @returns {{ labels: string[], source: string }}
 */
export function softComposeObserveLabels(requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return { labels: requested.map(String), source: 'plan' };
  }
  return { labels: [...DC_DEFAULT_OBSERVE_LABELS], source: 'fixture-default' };
}

/**
 * Soft-observe freeze NON-CLAIM surfaces (labels/fixtures; never rewrite tip pins).
 * @param {object} [input]
 * @returns {object}
 */
export function softObserveFreezeNonClaims(input = {}) {
  return forceFreezeObserve({
    ...(input.freezeObserve || {}),
    nonClaimLabels: Array.isArray(input.nonClaimLabels)
      ? input.nonClaimLabels.map(String)
      : [...DC_FREEZE_NONCLAIM_LABELS]
  });
}

/**
 * Soft-observe L28 honesty labels as compose-only signals.
 * @param {string[]} [observedPorts]
 * @returns {object}
 */
export function softObserveL28Honesty(observedPorts) {
  const codes = (observedPorts || [])
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const soft = evaluateSoftObserveL28(codes);
  return {
    schema: 'eos.doctor-ritual-l28-honesty-soft-observe.v1',
    softObserve: true,
    ports: [...DC_SOFT_OBSERVE_L28_PORTS],
    present: soft.present,
    missing: soft.missing,
    allPresent: soft.allPresent,
    note: 'L28 honesty soft-observe only — ≠ reopen L28; ≠ hard gate for DB PASS (DA required)'
  };
}

/**
 * Builtin evidence economy custody ledger double for hermetic PASS|DENY|HOLD.
 * @param {object} input
 * @returns {object}
 */
export function builtinEvidenceEconomyCustodyLedgerDouble(input = {}) {
  const observedPorts = Array.isArray(input.observedPorts)
    ? input.observedPorts.map(String)
    : [...DC_DEFAULT_OBSERVE_LABELS];
  const codes = observedPorts
    .map((p) => String(p).trim().toUpperCase().split(/[:|/.\\s_-]/)[0])
    .filter(Boolean);
  const observe = evaluateRequiredObserveSet(codes);
  const softL28 = softObserveL28Honesty(observedPorts);
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map(String)
    : ['DD pending', 'DE pending'];
  const freezeObserve = softObserveFreezeNonClaims(input);

  const non_claim_chips = [
    'NON-CLAIM: Evidence Economy Custody Ledger ≠ PRODUCTION_READY flip',
    'NON-CLAIM: custody ≠ tip-pin rewrite (freeze soft-observe 22d80bce only)',
    'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized',
    'NON-CLAIM: port green ≠ L29 auto-close / ≠ L28 reopen',
    'NON-CLAIM: ≠ GHE / ≠ external APM',
    'NON-CLAIM: freeze NON-CLAIM surfaces observed as labels only — no tip rewrite',
    'NON-CLAIM: L28 honesty soft-observe only — never reopen L28',
    'NON-CLAIM: DA+DB measure labels required for ACTIVE PASS'
  ];
  if (!observe.ok) {
    non_claim_chips.push(
      `NON-CLAIM chip: missing required DA+DB observe (${observe.missing.join(',')}) — not closed by labels alone`
    );
  }
  if (pendingPorts.length) {
    non_claim_chips.push(
      `NON-CLAIM chip: pending-port visible (${pendingPorts.join(', ')}) — not closed by custody ledger port`
    );
  }

  return {
    schema: 'eos.evidence-economy-custody-ledger-observe.v1',
    surface: input.surface || 'fixture',
    PRODUCTION_READY: 'NO',
    freeze_pin: DC_FREEZE_PIN,
    freeze_pin_short: DC_FREEZE_PIN_SHORT,
    freeze_observe: freezeObserve,
    observe: {
      ok: observe.ok,
      missing: observe.missing,
      observed: codes
    },
    honesty: { ok: input.honestyOk !== false },
    ritual: {
      ok: input.ritualOk !== false && observe.ok
    },
    custody: {
      ok: input.custodyOk !== false && input.ritualOk !== false && observe.ok
    },
    soft_observe_l28: softL28,
    pending_ports: pendingPorts,
    non_claim_chips,
    observe_note:
      'Mission DC builtin evidence-economy-custody-ledger double — DA+DB required observe; L28 CV–CY soft-observe; freeze NON-CLAIM soft-observe read-only pin 22d80bce; L17–L28 CLOSED retained; L29 axis open; ≠ tip-pin rewrite ≠ L29 auto-close',
    _builtinDouble: true
  };
}

/**
 * Evaluate observe surface → ok / refuse codes.
 * @param {object} surface
 * @param {object} [acks]
 */
export function evaluateObserveOk(surface, acks = {}) {
  const refuses = [];
  const observeOk = surface?.observe?.ok === true;
  const honestyOk = surface?.honesty?.ok !== false;
  const ritualOk = surface?.ritual?.ok !== false;
  const ackMissing = acks.ackMissingObserveLabels === true;

  if (!observeOk && !ackMissing) {
    refuses.push(DC_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS);
  }
  if (
    surface?.PRODUCTION_READY != null &&
    String(surface.PRODUCTION_READY).toUpperCase() === 'YES'
  ) {
    refuses.push(DC_REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED);
  }
  if (
    surface?.freeze_observe?.readOnly === false ||
    (surface?.freeze_observe?.pin != null &&
      String(surface.freeze_observe.pin) !== DC_FREEZE_PIN &&
      String(surface.freeze_observe.pin) !== DC_FREEZE_PIN_SHORT &&
      !String(surface.freeze_observe.pin).startsWith(DC_FREEZE_PIN_SHORT))
  ) {
    refuses.push(DC_REFUSE_CODES.TIP_PIN_REWRITE_REFUSED);
  }
  if (!honestyOk) refuses.push(DC_REFUSE_CODES.HONESTY_NOT_OK);
  if (!ritualOk && observeOk) {
    refuses.push(DC_REFUSE_CODES.RITUAL_NOT_OK);
  }
  return {
    ok: refuses.length === 0,
    refuseCodes: refuses,
    observeOk,
    honestyOk,
    ritualOk,
    primaryRefuse: refuses.length ? refuses[0] : null
  };
}

/**
 * Map ritualMode + observe eval → decision.
 * @param {string} ritualMode
 * @param {{ ok: boolean }|null} observeEval
 * @returns {'PASS'|'HOLD'|'DENY'}
 */
export function decisionForRitual(ritualMode, observeEval) {
  if (ritualMode === 'HOLD') return 'HOLD';
  if (observeEval && observeEval.ok === true) return 'PASS';
  return 'DENY';
}
/** Aliases for DA/DB/CY API compatibility. */
export const decisionForHonesty = decisionForRitual;
export const decisionForAggregation = decisionForRitual;
export const decisionForCustody = decisionForRitual;
export const decisionForLedger = decisionForRitual;

/**
 * Evidence Economy Custody Ledger Port — hermetic.
 */
export class EvidenceEconomyCustodyLedgerPort {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new EvidenceEconomyCustodyLedgerPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });
    this._injectedHonesty = options.honesty || null;
    this._honestyModulePath = options.honestyModulePath || options.daModulePath || null;
    this._daModulePath = options.daModulePath || options.honestyModulePath || null;
    this._dbModulePath = options.dbModulePath || null;
    this._preferBuiltinDouble = options.preferBuiltinDouble === true;
    this._resolvedHonesty = null;
    /** @type {Map<string, object>} */
    this.decisions = new Map();
    /** @type {Array<object>} */
    this.receipts = [];
    this._lastReceiptHash = null;
    this._governSeq = 0;
  }

  async resolveHonesty() {
    if (this._injectedHonesty?.buildHonestySurface) {
      this._resolvedHonesty = {
        ...this._injectedHonesty,
        HONESTY_PRODUCTION_READY:
          this._injectedHonesty.HONESTY_PRODUCTION_READY || 'NO',
        source: 'injected'
      };
      return this._resolvedHonesty;
    }
    if (this._preferBuiltinDouble) {
      this._resolvedHonesty = {
        buildHonestySurface: builtinEvidenceEconomyCustodyLedgerDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
      return this._resolvedHonesty;
    }
    if (!this._resolvedHonesty) {
      const soft = await softImportDaDbObserve({
        honestyModulePath: this._honestyModulePath,
        daModulePath: this._daModulePath || this._honestyModulePath,
        dbModulePath: this._dbModulePath
      });
      this._resolvedHonesty = soft || {
        buildHonestySurface: builtinEvidenceEconomyCustodyLedgerDouble,
        HONESTY_PRODUCTION_READY: 'NO',
        source: 'builtin-double'
      };
    }
    return this._resolvedHonesty;
  }

  _sealReceipt(fields) {
    const receipt = buildEvidenceEconomyCustodyLedgerReceipt(
      { ...fields, prevReceiptHash: this._lastReceiptHash },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  _deny(plan, evaluation, extra = {}) {
    const reasons = [evaluation.reason, ...(extra.reasons || [])].filter(
      Boolean
    );
    const observedPorts = extra.observedPorts || [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});
    const mode =
      plan?.custodyMode != null
        ? String(plan.custodyMode)
        : plan?.ledgerMode != null
          ? String(plan.ledgerMode)
          : plan?.ritualMode != null
            ? String(plan.ritualMode)
            : plan?.honestyMode != null
              ? String(plan.honestyMode)
              : plan?.aggregationMode != null
                ? String(plan.aggregationMode)
                : plan?.observeMode != null
                  ? String(plan.observeMode)
                  : null;
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      changeId: plan?.changeId != null ? String(plan.changeId) : null,
      decision: 'DENY',
      ritualMode: mode,
      honestyMode: mode,
      phase: plan?.phase != null ? String(plan.phase) : null,
      ritualDigest:
        plan?.custodyDigest != null && String(plan.custodyDigest).trim() !== ''
          ? String(plan.custodyDigest)
          : plan?.ledgerDigest != null && String(plan.ledgerDigest).trim() !== ''
            ? String(plan.ledgerDigest)
            : plan?.ritualDigest != null && String(plan.ritualDigest).trim() !== ''
              ? String(plan.ritualDigest)
              : plan?.honestyDigest != null &&
                  String(plan.honestyDigest).trim() !== ''
                ? String(plan.honestyDigest)
                : plan?.observabilityDigest != null &&
                    String(plan.observabilityDigest).trim() !== ''
                  ? String(plan.observabilityDigest)
                  : this.hashFn({ deny: true, planId: plan?.planId || null }),
      observedPorts,
      ritualOk: extra.ritualOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL29Refused: extra.autoCloseL29Refused === true,
      l28ReopenRefused: extra.l28ReopenRefused === true,
      freezeObserve,
      reasons,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        freezePin: DC_FREEZE_PIN_SHORT
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      changeId: plan?.changeId != null ? String(plan.changeId) : undefined,
      ritualMode: mode || undefined,
      custodyMode: mode || undefined,
      ledgerMode: mode || undefined,
      honestyMode: mode || undefined,
      aggregationMode: mode || undefined,
      observedPorts,
      observedPortCodes: extra.observedPortCodes || [],
      ritualOk: extra.ritualOk ?? false,
      honestyOk: extra.honestyOk ?? false,
      freezeObserve,
      refuseCodes: extra.refuseCodes || [evaluation.code],
      humanGateHeld: extra.humanGateHeld === true,
      autoSealRefused: extra.autoSealRefused === true,
      autoProductionFlipRefused: extra.autoProductionFlipRefused === true,
      tipPinRewriteRefused: extra.tipPinRewriteRefused === true,
      gheClaimRefused: extra.gheClaimRefused === true,
      autoCloseL29Refused: extra.autoCloseL29Refused === true,
      l28ReopenRefused: extra.l28ReopenRefused === true,
      reasons,
      receipt,
      observe: extra.observe || null,
      safeAutomationIds: [...DC_SAFE_AUTOMATION_IDS]
    };
  }

  /**
   * Govern a evidence economy custody ledger plan → PASS | DENY | HOLD + DC-RCPT-*.
   * @param {object} plan
   * @returns {Promise<object>}
   */
  async govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const autoSeal =
        evaluation.code === DC_CODES.AUTO_SEAL_CLAIM_DENY ||
        evaluation.code === DC_CODES.AUTO_SEAL_L29_CLAIM_DENY ||
        evaluation.code === DC_CODES.AUTO_CLOSE_L29_CLAIM_DENY;
      const autoProd =
        evaluation.code === DC_CODES.PRODUCTION_READY_FLIP_DENY ||
        evaluation.code === DC_CODES.AUTO_PRODUCTION_FLIP_CLAIM_DENY;
      const tipPin =
        evaluation.code === DC_CODES.TIP_PIN_REWRITE_CLAIM_DENY ||
        evaluation.code === DC_CODES.TIP_REWRITE_CLAIM_DENY;
      const ghe = evaluation.code === DC_CODES.GHE_CLAIM_DENY;
      const l28 = evaluation.code === DC_CODES.L28_REOPEN_CLAIM_DENY;
      return this._deny(plan, evaluation, {
        autoSealRefused: autoSeal,
        autoProductionFlipRefused: autoProd,
        tipPinRewriteRefused: tipPin,
        gheClaimRefused: ghe,
        autoCloseL29Refused:
          evaluation.code === DC_CODES.AUTO_CLOSE_L29_CLAIM_DENY ||
          evaluation.code === DC_CODES.AUTO_SEAL_L29_CLAIM_DENY,
        l28ReopenRefused: l28,
        humanGateHeld: autoSeal || autoProd,
        refuseCodes: [evaluation.code],
        observedPorts: Array.isArray(plan?.observedPorts)
          ? plan.observedPorts.map(String)
          : []
      });
    }

    this._governSeq += 1;
    const {
      planId,
      changeId,
      ritualMode,
      phase,
      ritualDigest: planDigest,
      observedPorts,
      observedPortCodes,
      observeOk: gateObserveOk,
      ackMissingObserveLabels,
      honestyOk: gateHonestyOk,
      ritualOk: gateRitualOk,
      reasons: planReasons
    } = evaluation;

    let observe = null;
    if (
      ritualMode === 'HOLD' &&
      (!observedPorts || observedPorts.length === 0)
    ) {
      const freezeObserve = softObserveFreezeNonClaims(plan || {});
      observe = {
        schema: 'eos.evidence-economy-custody-ledger-observe.v1',
        surface: 'hold-observe',
        PRODUCTION_READY: 'NO',
        freeze_pin: DC_FREEZE_PIN,
        freeze_observe: freezeObserve,
        observe: { ok: true, missing: [], observed: [] },
        honesty: { ok: true },
        ritual: { ok: true },
        soft_observe_l28: softObserveL28Honesty([]),
        pending_ports: ['DD pending', 'DE pending'],
        non_claim_chips: [
          'NON-CLAIM: HOLD observe ≠ PRODUCTION_READY flip',
          'NON-CLAIM: HOLD observe ≠ L29 auto-close / ≠ L28 reopen',
          'NON-CLAIM: HOLD observe ≠ tip-pin rewrite (freeze soft-observe only)'
        ],
        note: 'HOLD observe — Evidence Economy Custody Ledger; ≠ automatic closure; ≠ tip-pin rewrite'
      };
    } else {
      const runner = await this.resolveHonesty();
      observe = runner.buildHonestySurface({
        observedPorts,
        honestyOk: gateHonestyOk !== false,
        ritualOk: gateRitualOk !== false,
        aggregationOk: gateRitualOk !== false,
        pendingPorts: ['DD pending', 'DE pending'],
        surface: 'evidence-economy-custody-ledger',
        freezeObserve: plan?.freezeObserve
      });
      // Normalize soft-imported DA aggregation / DB ritual → custody/ritual shape
      if (!observe.ritual && observe.aggregation) {
        observe = {
          ...observe,
          ritual: { ok: observe.aggregation.ok !== false },
          custody: { ok: observe.aggregation.ok !== false }
        };
      }
      if (!observe.ritual && observe.custody) {
        observe = {
          ...observe,
          ritual: { ok: observe.custody.ok !== false }
        };
      }
      if (!observe.custody && observe.ritual) {
        observe = {
          ...observe,
          custody: { ok: observe.ritual.ok !== false }
        };
      }
      observe = {
        ...observe,
        PRODUCTION_READY: 'NO',
        freeze_pin: DC_FREEZE_PIN,
        freeze_observe: softObserveFreezeNonClaims({
          freezeObserve: {
            ...(observe.freeze_observe || {}),
            ...(plan?.freezeObserve || {})
          }
        }),
        soft_observe_l28:
          observe.soft_observe_l28 || softObserveL28Honesty(observedPorts)
      };
      if (!observe.observe || typeof observe.observe !== 'object') {
        observe = {
          ...observe,
          observe: {
            ok: gateObserveOk === true,
            missing: DC_REQUIRED_OBSERVE_PORTS.filter(
              (c) => !(observedPortCodes || []).includes(c)
            ),
            observed: [...(observedPortCodes || [])]
          },
          honesty: observe.honesty || { ok: gateHonestyOk !== false },
          ritual: observe.ritual || {
            ok: gateObserveOk === true && gateRitualOk !== false
          }
        };
      }
      if (!observe.ritual) {
        observe = {
          ...observe,
          ritual: {
            ok:
              observe.observe?.ok === true &&
              (observe.honesty?.ok !== false)
          }
        };
      }
    }

    const observeEval = evaluateObserveOk(observe, {
      ackMissingObserveLabels
    });

    // ACTIVE with incomplete required DA+DB observe cannot PASS even with gate ack
    let decision = decisionForRitual(ritualMode, observeEval);
    if (ritualMode === 'ACTIVE' && !gateObserveOk && decision === 'PASS') {
      decision = 'DENY';
      observeEval.ok = false;
      if (
        !observeEval.refuseCodes.includes(
          DC_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        )
      ) {
        observeEval.refuseCodes.push(
          DC_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS
        );
      }
      observeEval.primaryRefuse =
        DC_REFUSE_CODES.MISSING_REQUIRED_OBSERVE_LABELS;
    }

    const nonClaimChips = Array.isArray(observe?.non_claim_chips)
      ? observe.non_claim_chips.map(String)
      : [];
    const pendingPorts = Array.isArray(observe?.pending_ports)
      ? observe.pending_ports.map(String)
      : [];
    const freezeObserve = forceFreezeObserve(plan?.freezeObserve || {});

    if (decision === 'DENY') {
      return this._deny(
        plan,
        {
          code: DC_CODES.RITUAL_REFUSE_DENY,
          reason: `Custody ledger/observe refused: ${observeEval.primaryRefuse || 'unknown'} (≠ PRODUCTION_READY flip / ≠ tip-pin rewrite)`
        },
        {
          ritualOk: false,
          honestyOk: observeEval.honestyOk,
          observedPorts,
          observedPortCodes,
          refuseCodes: observeEval.refuseCodes.length
            ? observeEval.refuseCodes
            : [DC_REFUSE_CODES.RITUAL_NOT_OK],
          observe,
          reasons: planReasons
        }
      );
    }

    const code =
      decision === 'PASS' ? DC_CODES.GOVERN_PASS : DC_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `evidence-economy-custody-ledger govern ${decision}: changeId=${changeId} ritualMode=${ritualMode} phase=${phase} planId=${planId}`,
      `freeze soft-observe: pin=${DC_FREEZE_PIN_SHORT} readOnly=true (≠ tip-pin rewrite)`,
      'NON-CLAIM: custody PASS ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ GHE ≠ L29 auto-close ≠ L28 reopen ≠ external APM',
      'A5_PRESERVE_FUNDACION_ALWAYS_DENY + A6_PRESERVE_HUMAN_PROD_GATE held',
      'A7_REFUSE_TIP_PIN_REWRITE + A8_REFUSE_L28_REOPEN + A9_REFUSE_GHE_CLAIM + A10_REFUSE_AUTO_CLOSE_L29 + A11_REFUSE_EXTERNAL_APM + A12_REFUSE_PRODUCTION_READY_FLIP held',
      `freeze pin ${DC_FREEZE_PIN_SHORT} (DB MEASURED #405 soft-observe; no tip-refresh / no tip-pin rewrite from this package)`,
      'L28 honesty soft-observe (CV/CW/CX/CY) — never reopen L28',
      'Required observe: DA+DB; soft-compose DA+DB when present'
    ];

    const ritualDigest =
      planDigest ||
      this.hashFn({
        changeId,
        ritualMode,
        phase,
        observedPorts,
        refuseCodes: observeEval.refuseCodes,
        decision,
        freezeObserve: {
          pinShort: DC_FREEZE_PIN_SHORT,
          readOnly: true
        }
      });

    const ritualPlanDigest = this.hashFn({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      phase,
      decision,
      observeEval,
      observedPortCodes
    });

    const record = Object.freeze({
      planId,
      changeId,
      ritualDigest,
      ritualMode,
      phase,
      decision,
      ritualOk: observeEval.ritualOk || gateObserveOk,
      honestyOk: observeEval.honestyOk,
      observedPorts: Object.freeze([...observedPorts]),
      observedPortCodes: Object.freeze([...observedPortCodes]),
      refuseCodes: Object.freeze([...observeEval.refuseCodes]),
      reasons: Object.freeze([...reasons]),
      ritualPlanDigest,
      governedAt: new Date().toISOString()
    });
    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      changeId,
      decision,
      ritualMode,
      custodyMode: ritualMode,
      honestyMode: ritualMode,
      phase,
      ritualDigest,
      observedPorts,
      requiredObserveSet: [...DC_REQUIRED_OBSERVE_PORTS],
      ritualOk: record.ritualOk,
      honestyOk: record.honestyOk,
      refuseCodes: observeEval.refuseCodes,
      humanGateHeld: false,
      autoSealRefused: false,
      autoProductionFlipRefused: false,
      tipPinRewriteRefused: false,
      gheClaimRefused: false,
      autoCloseL29Refused: false,
      l28ReopenRefused: false,
      freezeObserve,
      reasons,
      ritualPlanDigest,
      meta: {
        code,
        reasons,
        freezePin: DC_FREEZE_PIN_SHORT,
        freezePinFull: DC_FREEZE_PIN,
        honestySource: this._resolvedHonesty?.source || 'snapshot',
        observedPortCodes,
        softObserveL28: softObserveL28Honesty(observedPorts),
        safeAutomationIds: [...DC_SAFE_AUTOMATION_IDS]
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      changeId,
      ritualMode,
      custodyMode: ritualMode,
      ledgerMode: ritualMode,
      honestyMode: ritualMode,
      aggregationMode: ritualMode,
      phase,
      ritualDigest,
      honestyDigest: ritualDigest,
      observabilityDigest: ritualDigest,
      ritualPlanDigest,
      honestyPlanDigest: ritualPlanDigest,
      observedPorts,
      observedPortCodes,
      ritualOk: record.ritualOk,
      honestyOk: record.honestyOk,
      freezeObserve,
      refuseCodes: observeEval.refuseCodes,
      nonClaimChips,
      pendingPorts,
      softObserveL28: softObserveL28Honesty(observedPorts),
      reasons,
      receipt,
      observe,
      safeAutomationIds: [...DC_SAFE_AUTOMATION_IDS]
    };
  }

  async evaluate(plan) {
    return this.govern(plan);
  }

  getDecision(planId) {
    return this.decisions.get(planId) || null;
  }

  verifyTrail() {
    let prevHash = null;
    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyEvidenceEconomyCustodyLedgerReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: DC_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: DC_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }
      prevHash = receipt.receiptHash;
    }
    return {
      valid: true,
      code: DC_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  DC_PORT_PRODUCTION_READY,
  DC_PORT_KIND,
  DC_PRODUCTION_READY,
  DC_RECEIPT_KIND,
  DC_CODES,
  DC_SAFE_AUTOMATION_IDS,
  DC_REFUSE_CODES,
  DC_FREEZE_PIN,
  DC_FREEZE_PIN_SHORT,
  DC_DEFAULT_OBSERVE_LABELS,
  DC_FREEZE_NONCLAIM_LABELS,
  DC_FREEZE_OBSERVE_TEMPLATE,
  softImportDaObservability,
  softImportDbDoctorRitual,
  softImportDaDbObserve,
  softComposeObserveLabels,
  softObserveFreezeNonClaims,
  softObserveL28Honesty,
  builtinEvidenceEconomyCustodyLedgerDouble,
  evaluateObserveOk,
  decisionForRitual,
  decisionForHonesty,
  decisionForAggregation,
  decisionForCustody,
  decisionForLedger,
  EvidenceEconomyCustodyLedgerPort
};
