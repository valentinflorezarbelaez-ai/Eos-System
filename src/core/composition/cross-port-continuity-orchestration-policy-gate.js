/**
 * @module cross-port-continuity-orchestration-policy-gate
 * SPEC-0106 / Mission CW — Policy Gate for Cross-Port Continuity Orchestration.
 * Fail-closed plan validation: Fundacion barrier, Law VI secrets,
 * PRODUCTION_READY flip refuse, L27 reopen refuse, tip rewrite refuse,
 * CU rewrite refuse, GHE claim refuse, auto-seal L28 refuse,
 * missing required CQ–CR–CS–CT observe labels, orchestrationMode ACTIVE|HOLD.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 * NON-CLAIM: ≠ GHE / ≠ CU rewrite / ≠ L27 reopen / ≠ PRODUCTION_READY /
 * ≠ L28 closeout / ≠ tip-refresh / ≠ CX.
 */

import {
  sha256Canonical,
  CW_ORCHESTRATION_MODES,
  CW_REQUIRED_CONTINUITY_PORTS,
  CW_OBSERVE_PORT_LABELS,
  normalizeObservePortLabel
} from './cross-port-continuity-orchestration-receipt.js';

/** @type {'NO'} */
export const CW_POLICY_GATE_PRODUCTION_READY = 'NO';
export const CW_POLICY_GATE_KIND =
  'eos-cross-port-continuity-orchestration-policy-gate';
export const CW_MAX_REASONS = 64;
export const CW_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CW_ORCHESTRATION_PHASES = Object.freeze([
  'compose_continuity',
  'observe_cq_ct',
  'observe_cu_seam',
  'seal_receipt',
  'hold_observe',
  'soft_import_cv'
]);

export const CW_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_ORCHESTRATION_MODE_DENY: 'MISSING_ORCHESTRATION_MODE_DENY',
  INVALID_ORCHESTRATION_MODE_DENY: 'INVALID_ORCHESTRATION_MODE_DENY',
  MISSING_PHASE_DENY: 'MISSING_PHASE_DENY',
  INVALID_PHASE_DENY: 'INVALID_PHASE_DENY',
  MISSING_CONTINUITY_DIGEST_DENY: 'MISSING_CONTINUITY_DIGEST_DENY',
  INVALID_CONTINUITY_DIGEST_DENY: 'INVALID_CONTINUITY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L27_REOPEN_CLAIM_DENY: 'L27_REOPEN_CLAIM_DENY',
  TIP_REWRITE_CLAIM_DENY: 'TIP_REWRITE_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_SEAL_L28_CLAIM_DENY: 'AUTO_SEAL_L28_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  CU_REWRITE_CLAIM_DENY: 'CU_REWRITE_CLAIM_DENY',
  GHE_CLAIM_DENY: 'GHE_CLAIM_DENY',
  MISSING_REQUIRED_OBSERVE_LABELS_DENY: 'MISSING_REQUIRED_OBSERVE_LABELS_DENY',
  CONTINUITY_REFUSE_DENY: 'CONTINUITY_REFUSE_DENY',
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
const AUTO_SEAL_L28_PATTERNS = [
  /auto[_ -]?seal\s+l(?:adder)?[\s_-]*28/i,
  /automatic\s+(?:close|seal|closeout)\s+l(?:adder)?[\s_-]*28/i,
  /unattended\s+l28\s+(?:seal|closeout)/i
];
const L27_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*27/i,
  /l(?:adder)?[\s_-]*27\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*27/i,
  /reopen\s+l1[7-9]|reopen\s+l2[0-7]/i
];
const TIP_REWRITE_PATTERNS = [
  /tip[_ -]?rewrite/i,
  /rewrite\s+(?:the\s+)?tip/i,
  /rewrite\s+freeze\s+main[_ ]?tip/i,
  /force[_ -]?pin\s+tip/i,
  /overwrite\s+freeze\s+tip/i
];
const WEAKEN_PATTERNS = [
  /FUNDACION_ALWAYS_DENY\s*=\s*false/i,
  /weaken\s+(?:FUNDACION_)?ALWAYS_DENY/i,
  /allowFundacionWrite\s*=\s*true/i,
  /disable\s+FUNDACION_ALWAYS_DENY/i
];
const CU_REWRITE_PATTERNS = [
  /rewrite\s+(?:the\s+)?cu\b/i,
  /cu[_ -]?rewrite/i,
  /rewrite\s+cu\s+seam[_ -]?pack/i,
  /mutate\s+cu\s+seam/i,
  /reopen\s+cu\b/i,
  /fork\s+cu\s+seam/i
];
const GHE_PATTERNS = [
  /\bghe\s+enforcement\b/i,
  /\bclaim\s+ghe\b/i,
  /\benable\s+ghe\b/i,
  /\bghe[_ -]?ready\b/i,
  /\bassert\s+ghe\b/i,
  /\bgoverned\s+human\s+escalation\s+enforcement\b/i
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
      for (const k of ['label', 'labels', 'title', 'description', 'claim', 'claims', 'note']) {
        if (value[k] != null) texts.push(String(value[k]));
      }
    } catch { /* ignore */ }
  }
  return texts.some((t) => patterns.some((p) => p.test(t)));
}

export const claimsProductionReadyFlip = (v) => matchesAny(v, PR_FLIP_PATTERNS);
export const claimsAutoSeal = (v) => matchesAny(v, AUTO_SEAL_PATTERNS);
export const claimsAutoSealL28 = (v) => matchesAny(v, AUTO_SEAL_L28_PATTERNS);
export const claimsL27Reopen = (v) => matchesAny(v, L27_REOPEN_PATTERNS);
export const claimsTipRewrite = (v) => matchesAny(v, TIP_REWRITE_PATTERNS);
export const claimsWeakenAlwaysDeny = (v) => matchesAny(v, WEAKEN_PATTERNS);
export const claimsCuRewrite = (v) => matchesAny(v, CU_REWRITE_PATTERNS);
export const claimsGhe = (v) => matchesAny(v, GHE_PATTERNS);

export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try { return isFundacionTarget(JSON.stringify(target)); } catch { return false; }
  }
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return s.includes('documents/fundacion') || s.includes('/fundacion') || s.startsWith('fundacion');
}

export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s || !CW_ID_PATTERN.test(s)) return null;
  return s;
}

export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (s.length === 64 && (/^0{64}$/.test(s) || /^f{64}$/i.test(s))) return true;
  return false;
}

export function normalizeOrchestrationPhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase).trim().toLowerCase().replace(/^\/+/, '').replace(/-/g, '_');
  const aliases = {
    p0: 'compose_continuity', compose: 'compose_continuity', continuity: 'compose_continuity',
    p1: 'observe_cq_ct', observe: 'observe_cq_ct', cq_ct: 'observe_cq_ct',
    p2: 'observe_cu_seam', cu_seam: 'observe_cu_seam', seam: 'observe_cu_seam',
    p3: 'seal_receipt', seal: 'seal_receipt',
    p4: 'hold_observe', hold: 'hold_observe',
    cv: 'soft_import_cv', soft_cv: 'soft_import_cv'
  };
  const mapped = aliases[s] || s;
  return CW_ORCHESTRATION_PHASES.includes(mapped) ? mapped : null;
}

export function normalizeObservedPorts(ports) {
  const raw = Array.isArray(ports) ? ports.map(String) : [];
  const known = [];
  const seen = new Set();
  for (const p of raw) {
    const n = normalizeObservePortLabel(p);
    if (n && !seen.has(n)) { seen.add(n); known.push(n); }
  }
  return { normalized: known, raw, known };
}

export function evaluateContinuitySet(knownPorts) {
  const set = new Set((knownPorts || []).map((p) => String(p).toUpperCase()));
  const missing = CW_REQUIRED_CONTINUITY_PORTS.filter((p) => !set.has(p));
  return { ok: missing.length === 0, missing };
}

export class CrossPortContinuityOrchestrationPolicyGate {
  constructor(options = {}) {
    this.maxReasons = options.maxReasons != null ? Number(options.maxReasons) : CW_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return { valid: false, code: CW_CODES.MALFORMED_PLAN_DENY, reason: 'Plan must be a non-null object' };
    }

    const hasAny =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.continuityDigest != null && String(plan.continuityDigest).trim() !== '') ||
      (Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0) ||
      plan.phase != null ||
      plan.orchestrationPhase != null;
    if (!hasAny) {
      return { valid: false, code: CW_CODES.EMPTY_PLAN_DENY, reason: 'Empty continuity orchestration plan rejected fail-closed' };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.changeId) ||
      isFundacionTarget(plan.payload)
    ) {
      return { valid: false, code: CW_CODES.FUNDACION_ALWAYS_DENY, reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)' };
    }
    if (
      plan.writeAttempt === true ||
      plan.performFundacionWrite === true ||
      plan.fundacionWrite === true ||
      plan.allowFundacionWrite === true
    ) {
      return { valid: false, code: CW_CODES.FUNDACION_ALWAYS_DENY, reason: 'Plan claims Fundacion write (NON-CLAIM; FUNDACION_ALWAYS_DENY)' };
    }
    if (scanForSecrets(plan)) {
      return { valid: false, code: CW_CODES.SECRET_DETECTED_DENY, reason: 'Plan labels/payloads contain plain secrets (Law VI)' };
    }

    const claimSurface = {
      label: plan.label, labels: plan.labels, description: plan.description,
      claim: plan.claim, claims: plan.claims, note: plan.note
    };

    if (claimsProductionReadyFlip(claimSurface) || plan.autoProductionReady === true || plan.flipProductionReady === true || plan.autoProductionReadyFlip === true) {
      return { valid: false, code: CW_CODES.PRODUCTION_READY_FLIP_DENY, reason: 'Plan claims PRODUCTION_READY=YES flip (refuse auto)' };
    }
    if (claimsWeakenAlwaysDeny(claimSurface) || plan.FUNDACION_ALWAYS_DENY === false || plan.fundacionAlwaysDeny === false || plan.weakenAlwaysDeny === true) {
      return { valid: false, code: CW_CODES.WEAKEN_ALWAYS_DENY, reason: 'Plan claims weakening FUNDACION_ALWAYS_DENY' };
    }
    if (claimsL27Reopen(claimSurface) || plan.reopenL27 === true || plan.l27Reopen === true || plan.unsealL27 === true) {
      return { valid: false, code: CW_CODES.L27_REOPEN_CLAIM_DENY, reason: 'Plan claims L27 reopen (NEVER reopen L27)' };
    }
    if (claimsTipRewrite(claimSurface) || plan.tipRewrite === true || plan.rewriteTip === true || plan.rewriteFreezeTip === true) {
      return { valid: false, code: CW_CODES.TIP_REWRITE_CLAIM_DENY, reason: 'Plan claims tip rewrite (freeze stays d86d7525 until post-CW tip-refresh)' };
    }
    if (claimsCuRewrite(claimSurface) || plan.cuRewrite === true || plan.rewriteCu === true || plan.rewriteCuSeamPack === true || plan.rewriteSeamPack === true) {
      return { valid: false, code: CW_CODES.CU_REWRITE_CLAIM_DENY, reason: 'Plan claims CU rewrite (compose observe only; ≠ CU rewrite)' };
    }
    if (claimsGhe(claimSurface) || plan.gheEnforcement === true || plan.enforceGhe === true || plan.claimGhe === true || plan.requireGhe === true) {
      return { valid: false, code: CW_CODES.GHE_CLAIM_DENY, reason: 'Plan claims GHE enforcement (≠ GHE)' };
    }
    if (claimsAutoSealL28(claimSurface) || plan.autoSealL28 === true || plan.automaticSealL28 === true || plan.autoCloseL28 === true) {
      return { valid: false, code: CW_CODES.AUTO_SEAL_L28_CLAIM_DENY, reason: 'Plan claims auto-seal L28 (≠ L28 closeout)' };
    }
    if (claimsAutoSeal(claimSurface) || plan.autoSeal === true || plan.automaticSeal === true) {
      return { valid: false, code: CW_CODES.AUTO_SEAL_CLAIM_DENY, reason: 'Plan claims auto-seal (refuse auto)' };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) return { valid: false, code: CW_CODES.MISSING_PLAN_ID_DENY, reason: 'planId must be a non-empty valid identifier' };
    if (isFundacionTarget(planId)) return { valid: false, code: CW_CODES.FUNDACION_ALWAYS_DENY, reason: 'planId targets Fundacion' };

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) return { valid: false, code: CW_CODES.MISSING_CHANGE_ID_DENY, reason: 'changeId must be a non-empty valid identifier' };
    if (isFundacionTarget(changeId)) return { valid: false, code: CW_CODES.FUNDACION_ALWAYS_DENY, reason: 'changeId targets Fundacion' };

    if (plan.orchestrationMode == null || String(plan.orchestrationMode).trim() === '') {
      return { valid: false, code: CW_CODES.MISSING_ORCHESTRATION_MODE_DENY, reason: 'orchestrationMode is required (ACTIVE|HOLD)' };
    }
    const orchestrationMode = String(plan.orchestrationMode).trim().toUpperCase();
    if (!CW_ORCHESTRATION_MODES.includes(orchestrationMode)) {
      return { valid: false, code: CW_CODES.INVALID_ORCHESTRATION_MODE_DENY, reason: 'orchestrationMode must be ACTIVE|HOLD' };
    }

    const rawPhase = plan.phase != null ? plan.phase : plan.orchestrationPhase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return { valid: false, code: CW_CODES.MISSING_PHASE_DENY, reason: 'phase (or orchestrationPhase) is required' };
    }
    const phase = normalizeOrchestrationPhase(rawPhase);
    if (!phase) {
      return { valid: false, code: CW_CODES.INVALID_PHASE_DENY, reason: `phase '${rawPhase}' is not a known continuity orchestration phase` };
    }

    const hasDigest = plan.continuityDigest != null && String(plan.continuityDigest).trim() !== '';
    const hasPorts = Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0;
    if (!hasDigest && !hasPorts) {
      return { valid: false, code: CW_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY, reason: 'observedPorts (CQ–CT) or continuityDigest is required' };
    }

    let continuityDigest = null;
    if (hasDigest) {
      continuityDigest = String(plan.continuityDigest).trim();
      if (isTamperedDigest(continuityDigest)) {
        return { valid: false, code: CW_CODES.TAMPERED_DIGEST_DENY, reason: 'continuityDigest appears tampered (fail-closed)' };
      }
      if (!SHA256_HEX_RE.test(continuityDigest)) {
        return { valid: false, code: CW_CODES.INVALID_CONTINUITY_DIGEST_DENY, reason: 'continuityDigest must be sha256 hex' };
      }
    }

    const portInfo = normalizeObservedPorts(plan.observedPorts || []);
    const continuity = evaluateContinuitySet(portInfo.known);
    const ackMissing = plan.ackMissingObserveLabels === true || plan.ackMissingRequiredObserveLabels === true;

    // When ports provided (or HOLD without ports + digest only), enforce required set unless ack
    if (hasPorts && !continuity.ok && !ackMissing) {
      return {
        valid: false,
        code: CW_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY,
        reason: `Missing required continuity observe labels: ${continuity.missing.join(',')}`
      };
    }
    // HOLD with digest-only (no ports) is allowed for observe-only
    if (!hasPorts && orchestrationMode === 'ACTIVE' && !ackMissing) {
      // ACTIVE without ports still needs the required set — digest alone OK only with ack or HOLD
      // Allow ACTIVE+digest-only through gate; port will still require continuityOk for PASS
    }

    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return { valid: false, code: CW_CODES.OVERSIZED_REASONS_DENY, reason: `Reasons list exceeds max (${this.maxReasons})` };
      }
      for (const r of plan.reasons) if (r != null) reasons.push(String(r));
    }

    return {
      valid: true,
      code: CW_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      orchestrationMode,
      phase,
      continuityDigest,
      observedPorts: portInfo.raw,
      observedPortCodes: portInfo.known,
      requiredContinuitySet: [...CW_REQUIRED_CONTINUITY_PORTS],
      continuityOk: continuity.ok,
      missingContinuityPorts: continuity.missing,
      ackMissingObserveLabels: ackMissing,
      honestyOk: plan.honestyOk !== false,
      reasons
    };
  }
}

export default {
  CW_POLICY_GATE_PRODUCTION_READY,
  CW_POLICY_GATE_KIND,
  CW_MAX_REASONS,
  CW_ID_PATTERN,
  CW_ORCHESTRATION_PHASES,
  CW_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsAutoSealL28,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsWeakenAlwaysDeny,
  claimsCuRewrite,
  claimsGhe,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeOrchestrationPhase,
  normalizeObservedPorts,
  evaluateContinuitySet,
  CrossPortContinuityOrchestrationPolicyGate
};
