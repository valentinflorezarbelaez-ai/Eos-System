/**
 * @module complexity-inventory-remeasure-policy-gate
 * SPEC-0115 / Mission DF — Policy Gate for Complexity Inventory Re-measure & Ceiling Hold.
 * Fail-closed plan validation: Fundacion barrier, Law VI secrets,
 * PRODUCTION_READY flip refuse, L29 reopen refuse, tip-pin rewrite refuse,
 * GHE claim refuse, auto-close L30 refuse, delete/mass-prune claim refuse,
 * missing planId/changeId/phase/remeasureMode,
 * missing required POST_L26+ADR_0075+T6 observe surfaces (unless ack).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 * NON-CLAIM: Complexity Inventory Re-measure Port ≠ delete authorization ≠
 * mass prune ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠
 * GHE ≠ L30 auto-close ≠ L29 reopen ≠ unsupervised delete.
 * Inventory/plan ≠ delete auth (ADR-0075 / Post-L26 A).
 */

import {
  sha256Canonical,
  DF_REMEASURE_MODES,
  DF_REQUIRED_OBSERVE_SURFACES,
  DF_FREEZE_PIN_SHORT,
  normalizeObserveSurfaceLabel
} from './complexity-inventory-remeasure-receipt.js';

/** @type {'NO'} */
export const DF_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DF_POLICY_GATE_KIND =
  'eos-complexity-inventory-remeasure-policy-gate';
export const DF_MAX_REASONS = 64;
export const DF_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const DF_REMEASURE_PHASES = Object.freeze([
  'compose_remeasure_port',
  'observe_freeze_nonclaims',
  'soft_import_ceiling_surfaces',
  'seal_receipt',
  'hold_observe',
  'runbook_fixture'
]);
/** Aliases for DA/CY API compatibility. */
export const DF_AGGREGATION_PHASES = DF_REMEASURE_PHASES;
export const DF_HONESTY_PHASES = DF_REMEASURE_PHASES;
export const DF_RITUAL_PHASES = DF_REMEASURE_PHASES;

export const DF_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_REMEASURE_MODE_DENY: 'MISSING_REMEASURE_MODE_DENY',
  INVALID_REMEASURE_MODE_DENY: 'INVALID_REMEASURE_MODE_DENY',
  MISSING_AGGREGATION_MODE_DENY: 'MISSING_REMEASURE_MODE_DENY',
  INVALID_AGGREGATION_MODE_DENY: 'INVALID_REMEASURE_MODE_DENY',
  MISSING_HONESTY_MODE_DENY: 'MISSING_REMEASURE_MODE_DENY',
  INVALID_HONESTY_MODE_DENY: 'INVALID_REMEASURE_MODE_DENY',
  MISSING_PHASE_DENY: 'MISSING_PHASE_DENY',
  INVALID_PHASE_DENY: 'INVALID_PHASE_DENY',
  MISSING_INVENTORY_DIGEST_DENY: 'MISSING_INVENTORY_DIGEST_DENY',
  INVALID_INVENTORY_DIGEST_DENY: 'INVALID_INVENTORY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L29_REOPEN_CLAIM_DENY: 'L29_REOPEN_CLAIM_DENY',
  TIP_REWRITE_CLAIM_DENY: 'TIP_REWRITE_CLAIM_DENY',
  TIP_PIN_REWRITE_CLAIM_DENY: 'TIP_PIN_REWRITE_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_SEAL_L30_CLAIM_DENY: 'AUTO_SEAL_L30_CLAIM_DENY',
  AUTO_CLOSE_L30_CLAIM_DENY: 'AUTO_CLOSE_L30_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  GHE_CLAIM_DENY: 'GHE_CLAIM_DENY',
  DELETE_AUTH_CLAIM_DENY: 'DELETE_AUTH_CLAIM_DENY',
  MASS_PRUNE_CLAIM_DENY: 'MASS_PRUNE_CLAIM_DENY',
  UNSUPERVISED_DELETE_CLAIM_DENY: 'UNSUPERVISED_DELETE_CLAIM_DENY',
  MISSING_REQUIRED_OBSERVE_SURFACES_DENY: 'MISSING_REQUIRED_OBSERVE_SURFACES_DENY',
  MISSING_REQUIRED_OBSERVE_LABELS_DENY: 'MISSING_REQUIRED_OBSERVE_SURFACES_DENY',
  INVENTORY_REFUSE_DENY: 'INVENTORY_REFUSE_DENY',
  DENY: 'DENY',
  HOLD: 'HOLD'
});

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];
const PR_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];
const AUTO_SEAL_PATTERNS = [
  /auto[_ -]?seal/i,
  /automatic\s+seal/i,
  /seal\s+without\s+human/i,
  /unattended\s+seal/i
];
const AUTO_SEAL_L30_PATTERNS = [
  /auto[_ -]?seal\s+l(?:adder)?[\s_-]*30/i,
  /automatic\s+(?:close|seal|closeout)\s+l(?:adder)?[\s_-]*30/i,
  /unattended\s+l30\s+(?:seal|closeout)/i,
  /auto[_ -]?close\s+l(?:adder)?[\s_-]*30/i
];
const L29_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*29/i,
  /l(?:adder)?[\s_-]*29\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*29/i
];
const TIP_REWRITE_PATTERNS = [
  /tip[_ -]?rewrite/i,
  /rewrite\s+(?:the\s+)?tip/i,
  /rewrite\s+freeze\s+main[_ ]?tip/i,
  /force[_ -]?pin\s+tip/i,
  /overwrite\s+freeze\s+tip/i,
  /tip[_ -]?pin[_ -]?rewrite/i,
  /rewrite\s+freeze\s+tip[_ -]?pin/i,
  /mutate\s+freeze\s+pin/i
];
const WEAKEN_PATTERNS = [
  /FUNDACION_ALWAYS_DENY\s*=\s*false/i,
  /weaken\s+(?:FUNDACION_)?ALWAYS_DENY/i,
  /allowFundacionWrite\s*=\s*true/i,
  /disable\s+FUNDACION_ALWAYS_DENY/i
];
const GHE_PATTERNS = [
  /\bghe\s+enforcement\b/i,
  /\bclaim\s+ghe\b/i,
  /\benable\s+ghe\b/i,
  /\bghe[_ -]?ready\b/i,
  /\bassert\s+ghe\b/i,
  /\bgoverned\s+human\s+escalation\s+enforcement\b/i,
  /required[\s-]?check\s+enforcement/i
];
const DELETE_AUTH_PATTERNS = [
  /\bdelete\s+authorization\b/i,
  /\bauthorize\s+delete\b/i,
  /\bdelete\s+auth\b/i,
  /\binventory\s*=\s*delete\s+auth\b/i,
  /\bgrant\s+delete\s+(?:auth|authorization|permission)\b/i,
  /\bunsupervised\s+delete\b/i
];
const MASS_PRUNE_PATTERNS = [
  /\bmass[_ -]?prune\b/i,
  /\bbulk[_ -]?prune\b/i,
  /\bprune\s+all\b/i,
  /\bexecute\s+prune\b/i,
  /\brun\s+prune\s+now\b/i,
  /\bperform\s+mass\s+delete\b/i
];

export function scanForSecrets(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    return SECRET_PATTERNS.some((p) => p.test(value));
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      return SECRET_PATTERNS.some((p) => p.test(s));
    } catch {
      return false;
    }
  }
  return false;
}

function matchesAny(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') texts.push(value);
  else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of [
        'label',
        'labels',
        'title',
        'description',
        'claim',
        'claims',
        'note',
        'remeasureMode',
        'aggregationMode',
        'honestyMode',
        'ritualMode',
        'observeMode'
      ]) {
        if (value[k] != null) texts.push(String(value[k]));
      }
    } catch {
      /* ignore */
    }
  }
  return texts.some((t) => patterns.some((p) => p.test(t)));
}

export const claimsProductionReadyFlip = (v) => matchesAny(v, PR_FLIP_PATTERNS);
export const claimsAutoSeal = (v) => matchesAny(v, AUTO_SEAL_PATTERNS);
export const claimsAutoSealL30 = (v) => matchesAny(v, AUTO_SEAL_L30_PATTERNS);
export const claimsL29Reopen = (v) => matchesAny(v, L29_REOPEN_PATTERNS);
export const claimsTipRewrite = (v) => matchesAny(v, TIP_REWRITE_PATTERNS);
export const claimsTipPinRewrite = claimsTipRewrite;
export const claimsWeakenAlwaysDeny = (v) => matchesAny(v, WEAKEN_PATTERNS);
export const claimsGhe = (v) => matchesAny(v, GHE_PATTERNS);
export const claimsDeleteAuth = (v) => matchesAny(v, DELETE_AUTH_PATTERNS);
export const claimsMassPrune = (v) => matchesAny(v, MASS_PRUNE_PATTERNS);
export const claimsUnsupervisedDelete = (v) =>
  matchesAny(v, [/unsupervised\s+delete/i, /delete\s+without\s+human/i]);

export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try {
      return isFundacionTarget(JSON.stringify(target));
    } catch {
      return false;
    }
  }
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s || !DF_ID_PATTERN.test(s)) return null;
  return s;
}

export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (s.length === 64 && (/^0{64}$/.test(s) || /^f{64}$/i.test(s))) return true;
  return false;
}

export function normalizeRemeasurePhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    p0: 'compose_remeasure_port',
    compose: 'compose_remeasure_port',
    remeasure: 'compose_remeasure_port',
    inventory: 'compose_remeasure_port',
    complexity: 'compose_remeasure_port',
    p1: 'observe_freeze_nonclaims',
    observe: 'observe_freeze_nonclaims',
    freeze: 'observe_freeze_nonclaims',
    freeze_nonclaims: 'observe_freeze_nonclaims',
    p2: 'soft_import_ceiling_surfaces',
    soft_ceiling: 'soft_import_ceiling_surfaces',
    ceiling_surfaces: 'soft_import_ceiling_surfaces',
    soft_import: 'soft_import_ceiling_surfaces',
    p3: 'seal_receipt',
    seal: 'seal_receipt',
    p4: 'hold_observe',
    hold: 'hold_observe',
    fixture: 'runbook_fixture',
    runbook: 'runbook_fixture'
  };
  const mapped = aliases[s] || s;
  return DF_REMEASURE_PHASES.includes(mapped) ? mapped : null;
}
export const normalizeAggregationPhase = normalizeRemeasurePhase;
export const normalizeHonestyPhase = normalizeRemeasurePhase;
export const normalizeRitualPhase = normalizeRemeasurePhase;

export function normalizeObservedSurfaces(surfaces) {
  const raw = Array.isArray(surfaces) ? surfaces.map(String) : [];
  const known = [];
  const seen = new Set();
  for (const p of raw) {
    const n = normalizeObserveSurfaceLabel(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      known.push(n);
    }
  }
  return { normalized: known, raw, known };
}

export function evaluateRequiredObserveSet(knownSurfaces) {
  const set = new Set((knownSurfaces || []).map((p) => String(p).toUpperCase()));
  const missing = DF_REQUIRED_OBSERVE_SURFACES.filter((p) => !set.has(p));
  return { ok: missing.length === 0, missing };
}

export class ComplexityInventoryRemeasurePolicyGate {
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : DF_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: DF_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAny =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.inventoryDigest != null &&
        String(plan.inventoryDigest).trim() !== '') ||
      (plan.observabilityDigest != null &&
        String(plan.observabilityDigest).trim() !== '') ||
      (plan.honestyDigest != null && String(plan.honestyDigest).trim() !== '') ||
      (Array.isArray(plan.observedSurfaces) &&
        plan.observedSurfaces.length > 0) ||
      (Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0) ||
      plan.phase != null ||
      plan.remeasurePhase != null ||
      plan.aggregationPhase != null ||
      plan.honestyPhase != null ||
      plan.ritualPhase != null;
    if (!hasAny) {
      return {
        valid: false,
        code: DF_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty complexity inventory remeasure plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.changeId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: DF_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }
    if (
      plan.writeAttempt === true ||
      plan.performFundacionWrite === true ||
      plan.fundacionWrite === true ||
      plan.allowFundacionWrite === true
    ) {
      return {
        valid: false,
        code: DF_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan claims Fundacion write (NON-CLAIM; FUNDACION_ALWAYS_DENY)'
      };
    }
    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: DF_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets (Law VI)'
      };
    }

    const claimSurface = {
      label: plan.label,
      labels: plan.labels,
      description: plan.description,
      claim: plan.claim,
      claims: plan.claims,
      note: plan.note,
      remeasureMode: plan.remeasureMode,
      aggregationMode: plan.aggregationMode,
      honestyMode: plan.honestyMode,
      ritualMode: plan.ritualMode,
      observeMode: plan.observeMode
    };

    if (
      claimsProductionReadyFlip(claimSurface) ||
      plan.autoProductionReady === true ||
      plan.flipProductionReady === true ||
      plan.autoProductionReadyFlip === true
    ) {
      return {
        valid: false,
        code: DF_CODES.PRODUCTION_READY_FLIP_DENY,
        reason: 'Plan claims PRODUCTION_READY=YES flip (refuse auto)'
      };
    }
    if (
      claimsWeakenAlwaysDeny(claimSurface) ||
      plan.FUNDACION_ALWAYS_DENY === false ||
      plan.fundacionAlwaysDeny === false ||
      plan.weakenAlwaysDeny === true
    ) {
      return {
        valid: false,
        code: DF_CODES.WEAKEN_ALWAYS_DENY,
        reason: 'Plan claims weakening FUNDACION_ALWAYS_DENY'
      };
    }
    if (
      claimsL29Reopen(claimSurface) ||
      plan.reopenL29 === true ||
      plan.l29Reopen === true ||
      plan.unsealL29 === true
    ) {
      return {
        valid: false,
        code: DF_CODES.L29_REOPEN_CLAIM_DENY,
        reason: 'Plan claims L29 reopen (NEVER reopen L29 — formal CLOSED retained)'
      };
    }
    if (
      claimsTipRewrite(claimSurface) ||
      plan.tipRewrite === true ||
      plan.rewriteTip === true ||
      plan.rewriteFreezeTip === true ||
      plan.tipPinRewrite === true ||
      plan.rewriteTipPin === true ||
      plan.rewriteFreezeTipPin === true
    ) {
      return {
        valid: false,
        code: DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan claims tip-pin rewrite (freeze stays 36c99107 soft-observe only)'
      };
    }
    if (
      claimsGhe(claimSurface) ||
      plan.gheEnforcement === true ||
      plan.enforceGhe === true ||
      plan.claimGhe === true ||
      plan.requireGhe === true
    ) {
      return {
        valid: false,
        code: DF_CODES.GHE_CLAIM_DENY,
        reason: 'Plan claims GHE enforcement (≠ GHE)'
      };
    }
    if (
      claimsDeleteAuth(claimSurface) ||
      plan.deleteAuth === true ||
      plan.authorizeDelete === true ||
      plan.deleteAuthorization === true ||
      plan.inventoryIsDeleteAuth === true
    ) {
      return {
        valid: false,
        code: DF_CODES.DELETE_AUTH_CLAIM_DENY,
        reason:
          'Plan claims delete authorization (inventory≠delete-auth; ADR-0075 / Post-L26 A)'
      };
    }
    if (
      claimsMassPrune(claimSurface) ||
      plan.massPrune === true ||
      plan.bulkPrune === true ||
      plan.executePrune === true ||
      plan.performMassPrune === true
    ) {
      return {
        valid: false,
        code: DF_CODES.MASS_PRUNE_CLAIM_DENY,
        reason: 'Plan claims mass prune (≠ mass prune; plan≠execution)'
      };
    }
    if (
      claimsUnsupervisedDelete(claimSurface) ||
      plan.unsupervisedDelete === true
    ) {
      return {
        valid: false,
        code: DF_CODES.UNSUPERVISED_DELETE_CLAIM_DENY,
        reason: 'Plan claims unsupervised delete (≠ unsupervised delete)'
      };
    }
    if (
      claimsAutoSealL30(claimSurface) ||
      plan.autoSealL30 === true ||
      plan.automaticSealL30 === true ||
      plan.autoCloseL30 === true
    ) {
      return {
        valid: false,
        code: DF_CODES.AUTO_CLOSE_L30_CLAIM_DENY,
        reason: 'Plan claims auto-close/seal L30 (≠ L30 auto-close)'
      };
    }
    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: DF_CODES.AUTO_SEAL_CLAIM_DENY,
        reason: 'Plan claims auto-seal (refuse auto)'
      };
    }

    if (
      plan.freezeObserve &&
      typeof plan.freezeObserve === 'object' &&
      (plan.freezeObserve.readOnly === false ||
        plan.freezeObserve.tipRewrite === true ||
        (plan.freezeObserve.pin != null &&
          String(plan.freezeObserve.pin) !== DF_FREEZE_PIN_SHORT &&
          !String(plan.freezeObserve.pin).startsWith(DF_FREEZE_PIN_SHORT)))
    ) {
      return {
        valid: false,
        code: DF_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan freezeObserve claims tip-pin rewrite (forced soft-observe 36c99107)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: DF_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: DF_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: DF_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: DF_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion'
      };
    }

    const rawMode =
      plan.remeasureMode != null
        ? plan.remeasureMode
        : plan.aggregationMode != null
          ? plan.aggregationMode
          : plan.honestyMode != null
            ? plan.honestyMode
            : plan.ritualMode != null
              ? plan.ritualMode
              : plan.observeMode;
    if (rawMode == null || String(rawMode).trim() === '') {
      return {
        valid: false,
        code: DF_CODES.MISSING_REMEASURE_MODE_DENY,
        reason:
          'remeasureMode (or aggregationMode/honestyMode/ritualMode) is required (ACTIVE|HOLD)'
      };
    }
    const remeasureMode = String(rawMode).trim().toUpperCase();
    if (!DF_REMEASURE_MODES.includes(remeasureMode)) {
      return {
        valid: false,
        code: DF_CODES.INVALID_REMEASURE_MODE_DENY,
        reason: 'remeasureMode must be ACTIVE|HOLD'
      };
    }

    const rawPhase =
      plan.phase != null
        ? plan.phase
        : plan.remeasurePhase != null
          ? plan.remeasurePhase
          : plan.aggregationPhase != null
            ? plan.aggregationPhase
            : plan.honestyPhase != null
              ? plan.honestyPhase
              : plan.ritualPhase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return {
        valid: false,
        code: DF_CODES.MISSING_PHASE_DENY,
        reason: 'phase (or remeasurePhase/aggregationPhase/honestyPhase) is required'
      };
    }
    const phase = normalizeRemeasurePhase(rawPhase);
    if (!phase) {
      return {
        valid: false,
        code: DF_CODES.INVALID_PHASE_DENY,
        reason: `phase '${rawPhase}' is not a known complexity inventory remeasure phase`
      };
    }

    const digestRaw =
      plan.inventoryDigest != null
        ? plan.inventoryDigest
        : plan.observabilityDigest != null
          ? plan.observabilityDigest
          : plan.honestyDigest != null
            ? plan.honestyDigest
            : plan.ritualDigest;
    const hasDigest = digestRaw != null && String(digestRaw).trim() !== '';
    const surfaceList =
      Array.isArray(plan.observedSurfaces) && plan.observedSurfaces.length > 0
        ? plan.observedSurfaces
        : Array.isArray(plan.observedPorts)
          ? plan.observedPorts
          : [];
    const hasSurfaces = surfaceList.length > 0;
    if (!hasDigest && !hasSurfaces) {
      return {
        valid: false,
        code: DF_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY,
        reason:
          'observedSurfaces (POST_L26+ADR_0075+T6+) or inventoryDigest is required'
      };
    }

    let inventoryDigest = null;
    if (hasDigest) {
      inventoryDigest = String(digestRaw).trim();
      if (isTamperedDigest(inventoryDigest)) {
        return {
          valid: false,
          code: DF_CODES.TAMPERED_DIGEST_DENY,
          reason: 'inventoryDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(inventoryDigest)) {
        return {
          valid: false,
          code: DF_CODES.INVALID_INVENTORY_DIGEST_DENY,
          reason: 'inventoryDigest must be sha256 hex'
        };
      }
    }

    const surfaceInfo = normalizeObservedSurfaces(surfaceList);
    const observeEval = evaluateRequiredObserveSet(surfaceInfo.known);
    const ackMissing =
      plan.ackMissingObserveSurfaces === true ||
      plan.ackMissingObserveLabels === true ||
      plan.ackMissingRequiredObserveLabels === true;

    if (hasSurfaces && !observeEval.ok && !ackMissing) {
      return {
        valid: false,
        code: DF_CODES.MISSING_REQUIRED_OBSERVE_SURFACES_DENY,
        reason: `Missing required observe surfaces: ${observeEval.missing.join(',')}`
      };
    }

    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: DF_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max (${this.maxReasons})`
        };
      }
      for (const r of plan.reasons) if (r != null) reasons.push(String(r));
    }

    return {
      valid: true,
      code: DF_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      remeasureMode,
      aggregationMode: remeasureMode,
      honestyMode: remeasureMode,
      ritualMode: remeasureMode,
      phase,
      inventoryDigest,
      observabilityDigest: inventoryDigest,
      honestyDigest: inventoryDigest,
      observedSurfaces: surfaceInfo.raw,
      observedPorts: surfaceInfo.raw,
      observedSurfaceCodes: surfaceInfo.known,
      observedPortCodes: surfaceInfo.known,
      requiredObserveSet: [...DF_REQUIRED_OBSERVE_SURFACES],
      observeOk: observeEval.ok,
      missingObserveSurfaces: observeEval.missing,
      missingObservePorts: observeEval.missing,
      ackMissingObserveSurfaces: ackMissing,
      ackMissingObserveLabels: ackMissing,
      honestyOk: plan.honestyOk !== false,
      inventoryOk: plan.inventoryOk !== false,
      ceilingHoldOk: plan.ceilingHoldOk !== false,
      aggregationOk: plan.aggregationOk !== false,
      reasons
    };
  }
}

export default {
  DF_POLICY_GATE_PRODUCTION_READY,
  DF_POLICY_GATE_KIND,
  DF_MAX_REASONS,
  DF_ID_PATTERN,
  DF_REMEASURE_PHASES,
  DF_AGGREGATION_PHASES,
  DF_HONESTY_PHASES,
  DF_RITUAL_PHASES,
  DF_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsAutoSealL30,
  claimsL29Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsDeleteAuth,
  claimsMassPrune,
  claimsUnsupervisedDelete,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeRemeasurePhase,
  normalizeAggregationPhase,
  normalizeHonestyPhase,
  normalizeRitualPhase,
  normalizeObservedSurfaces,
  evaluateRequiredObserveSet,
  ComplexityInventoryRemeasurePolicyGate
};
