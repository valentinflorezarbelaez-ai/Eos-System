/**
 * @module ladder33-seam-policy-gate
 * SPEC-0135 / Mission DY — Policy Gate for Ladder 33 CI Seam-Pack Consolidation & Closeout.
 * Pure Layer-0. Refuse secrets, Fundacion, tip rewrite, L30-L32 reopen,
 * unsupervised L33 auto-close without humanGateHeld, GHE, mass-prune, hard delete, CloudAgent,
 * PRODUCTION_READY flip. Tip-seal L33 CLOSED is SEPARATE after DY merge.
 */
import { DY_PRODUCTION_READY, DY_FREEZE_PIN_SHORT } from './ladder33-seam-receipt.js';

/** @type {'NO'} */
export const DY_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DY_POLICY_GATE_KIND = 'eos-ladder33-seam-policy-gate';

export const DY_RITUAL_PHASES = Object.freeze(['PREFLIGHT','SEAM_INSPECT','CHAIN_SEAL','CLOSEOUT_PROPOSE','SEAL']);

export const DY_CODES = Object.freeze({
  OK:'OK', PASS:'PASS', DENY:'DENY', HOLD:'HOLD',
  MISSING_PLAN_ID:'MISSING_PLAN_ID', MISSING_CHANGE_ID:'MISSING_CHANGE_ID',
  HARD_DELETE_FORBIDDEN:'HARD_DELETE_FORBIDDEN', MASS_PRUNE_FORBIDDEN:'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN:'SECRET_LEAK_FORBIDDEN', FUNDACION_DENIED:'FUNDACION_DENIED',
  FUNDACION_ALWAYS_DENY:'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_FORBIDDEN:'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN:'L30_REOPEN_FORBIDDEN', L31_REOPEN_FORBIDDEN:'L31_REOPEN_FORBIDDEN',
  L32_REOPEN_FORBIDDEN:'L32_REOPEN_FORBIDDEN', L33_AUTO_CLOSE_FORBIDDEN:'L33_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN:'TIP_REWRITE_FORBIDDEN', TIP_SEAL_FORBIDDEN:'TIP_SEAL_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN:'AUTO_SEAL_FORBIDDEN', GHE_CLAIM_FORBIDDEN:'GHE_CLAIM_FORBIDDEN',
  CLOUDAGENT_FORBIDDEN:'CLOUDAGENT_FORBIDDEN', INVALID_RITUAL_MODE:'INVALID_RITUAL_MODE',
  TRAIL_OK:'TRAIL_OK', TRAIL_BREAK:'TRAIL_BREAK'
});

const SECRET_PATTERNS = [/AIzaSy[A-Za-z0-9_-]{30,}/,/sk-[A-Za-z0-9_-]{20,}/,/ghp_[A-Za-z0-9]{36}/,/github_pat_[A-Za-z0-9_]{40,}/,/xox[baprs]-[A-Za-z0-9-]{10,}/,/Bearer\s+[A-Za-z0-9_\-\.]{30,}/i];
const PR_FLIP_PATTERNS = [/PRODUCTION_READY\s*=\s*YES/i,/PRODUCTION[_ ]READY\s*:\s*YES/i,/flip\s+PRODUCTION_READY\s+to\s+YES/i,/claim\s+PRODUCTION_READY\s*=\s*YES/i,/auto(?:matic)?\s+production[_ ]?ready\s+flip/i];
const HARD_DELETE_PATTERNS = [/force[-_]?delete/i,/\bpurge\b/i,/hard[-_]?delete/i,/\bdestroy\b/i,/permanent(?:ly)?\s+delete/i,/rm\s+-rf/i,/\bunlinkSync\b/i,/\bdestructive\s+delete\b/i];
const MASS_PRUNE_PATTERNS = [/\bmass[-_]?prune\b/i,/\bbulk[-_]?prune\b/i,/\bprune\s+all\b/i,/\bexecute\s+prune\b/i,/\brun\s+prune\s+now\b/i,/\bperform\s+mass\s+delete\b/i];
const L30_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*30/i,/l(?:adder)?[\s_-]*30\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*30/i];
const L31_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*31/i,/l(?:adder)?[\s_-]*31\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*31/i];
const L32_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*32/i,/l(?:adder)?[\s_-]*32\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*32/i];
const L33_AUTO_CLOSE_PATTERNS = [/auto[-_]?close\s+l(?:adder)?[\s_-]*33/i,/l(?:adder)?[\s_-]*33\s+auto[-_]?close/i,/unsupervised\s+l(?:adder)?[\s_-]*33\s+close/i,/tip[-_]?seal\s+l(?:adder)?[\s_-]*33\s+closed/i,/seal\s+l(?:adder)?[\s_-]*33\s+closed\s+now/i];
const TIP_REWRITE_PATTERNS = [/rewrite\s+freeze\s+tip/i,/tip[-_]?pin\s+rewrite/i,/rewrite\s+tip[-_]?pin/i,/mutate\s+freeze\s+pin/i,/force[-_]?update\s+freeze\s+tip/i,/overwrite\s+freeze\s+tip/i];
const TIP_SEAL_PATTERNS = [/tip[-_]?seal\s+l(?:adder)?[\s_-]*33/i,/tip[-_]?refresh\s+l(?:adder)?[\s_-]*33\s+closed/i,/flip\s+freeze\s+to\s+closed/i,/seal\s+freeze\s+l33\s+closed/i];
const GHE_PATTERNS = [/\bGHE\b/,/GitHub\s+Enterprise/i,/required[-_]?check\s+enforcement/i,/branch\s+protection\s+enforced/i,/GHA\s+green\s+claim/i];
const CLOUDAGENT_PATTERNS = [/CloudAgent/i,/cursor\s+cloud\s+agent/i];

function flattenPlan(plan) {
  const parts = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') { parts.push(String(v)); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (typeof v === 'object') { for (const [k, val] of Object.entries(v)) { parts.push(k); walk(val); } }
  };
  walk(plan);
  return parts.join(' ');
}

export function scanForSecrets(str) { return SECRET_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsProductionReadyFlip(str) { return PR_FLIP_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsHardDelete(str) { return HARD_DELETE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsMassPrune(str) { return MASS_PRUNE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsTipRewrite(str) { return TIP_REWRITE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsTipSeal(str) { return TIP_SEAL_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL30Reopen(str) { return L30_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL31Reopen(str) { return L31_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL32Reopen(str) { return L32_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL33AutoClose(str) { return L33_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsGhe(str) { return GHE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsCloudAgent(str) { return CLOUDAGENT_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function isFundacionTarget(str) { const s = String(str || ''); return /Fundacion/i.test(s) || /Documents\/Fundacion/i.test(s); }

export class Ladder33SeamPolicyGate {
  constructor() {
    this.productionReady = DY_POLICY_GATE_PRODUCTION_READY;
    this.freezePinShort = DY_FREEZE_PIN_SHORT;
  }

  evaluatePreconditions(plan = {}) {
    if (!plan.planId) return { ok:false, decision:'DENY', code:DY_CODES.MISSING_PLAN_ID, reason:'planId required' };
    if (!plan.changeId) return { ok:false, decision:'DENY', code:DY_CODES.MISSING_CHANGE_ID, reason:'changeId required' };
    const mode = plan.ritualMode || 'ACTIVE';
    if (!['ACTIVE','HOLD','DRY_RUN'].includes(mode)) return { ok:false, decision:'DENY', code:DY_CODES.INVALID_RITUAL_MODE, reason:'Invalid ritualMode: '+mode };
    const blob = flattenPlan(plan);
    const target = plan.target || plan.path || '';
    if (isFundacionTarget(target) || isFundacionTarget(blob) || plan.fundacionWrite === true)
      return { ok:false, decision:'DENY', code:DY_CODES.FUNDACION_ALWAYS_DENY, reason:'Fundacion Delta=0 — FUNDACION_ALWAYS_DENY' };
    if (scanForSecrets(blob) || plan.sealSecret === true)
      return { ok:false, decision:'DENY', code:DY_CODES.SECRET_LEAK_FORBIDDEN, reason:'Law VI — secret leakage refused' };
    if (claimsProductionReadyFlip(blob) || plan.flipProductionReady === true || plan.productionReady === 'YES')
      return { ok:false, decision:'DENY', code:DY_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, reason:'PRODUCTION_READY flip refused' };
    if (claimsHardDelete(blob) || plan.hardDelete === true)
      return { ok:false, decision:'DENY', code:DY_CODES.HARD_DELETE_FORBIDDEN, reason:'Hard delete refused' };
    if (claimsMassPrune(blob) || plan.massPrune === true)
      return { ok:false, decision:'DENY', code:DY_CODES.MASS_PRUNE_FORBIDDEN, reason:'Mass prune refused' };
    if (claimsL30Reopen(blob) || plan.reopenL30 === true)
      return { ok:false, decision:'DENY', code:DY_CODES.L30_REOPEN_FORBIDDEN, reason:'L30 CLOSED — NEVER reopen' };
    if (claimsL31Reopen(blob) || plan.reopenL31 === true)
      return { ok:false, decision:'DENY', code:DY_CODES.L31_REOPEN_FORBIDDEN, reason:'L31 CLOSED — NEVER reopen' };
    if (claimsL32Reopen(blob) || plan.reopenL32 === true)
      return { ok:false, decision:'DENY', code:DY_CODES.L32_REOPEN_FORBIDDEN, reason:'L32 CLOSED — NEVER reopen' };
    const wantsL33Close = claimsL33AutoClose(blob) || plan.l33AutoClose === true || plan.tipSealL33 === true || plan.sealL33Closed === true;
    if (wantsL33Close && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:DY_CODES.L33_AUTO_CLOSE_FORBIDDEN, reason:'L33 auto-close / tip-seal refused without humanGateHeld (tip-seal SEPARATE)' };
    if (claimsTipRewrite(blob) || plan.tipRewrite === true || plan.rewriteFreezeTip === true)
      return { ok:false, decision:'DENY', code:DY_CODES.TIP_REWRITE_FORBIDDEN, reason:'Freeze tip rewrite refused — soft-observe pin only' };
    if (claimsTipSeal(blob) && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:DY_CODES.TIP_SEAL_FORBIDDEN, reason:'Tip-seal L33 CLOSED is SEPARATE after DY merge — not this package' };
    if (plan.autoSeal === true && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:DY_CODES.AUTO_SEAL_FORBIDDEN, reason:'autoSeal without humanGateHeld refused' };
    if (claimsGhe(blob) || plan.claimGhe === true)
      return { ok:false, decision:'DENY', code:DY_CODES.GHE_CLAIM_FORBIDDEN, reason:'Seam-pack != GHE enforcement' };
    if (claimsCloudAgent(blob) || plan.cloudAgent === true)
      return { ok:false, decision:'DENY', code:DY_CODES.CLOUDAGENT_FORBIDDEN, reason:'CloudAgent out of path — Antigravity-first' };
    if (mode === 'HOLD') return { ok:true, decision:'HOLD', code:DY_CODES.HOLD };
    return { ok:true, decision:'PASS', code:DY_CODES.OK };
  }
}
