/**
 * @module ladder39-seam-policy-gate
 * SPEC-0165 / Mission FC — Policy Gate for Ladder 39 CI Seam-Pack Consolidation & Closeout.
 * Pure Layer-0. Refuse secrets, Fundacion, tip rewrite, L30-L38 reopen,
 * tip-seal-in-product claim, schema-json add,
 * unsupervised L39 auto-close without humanGateHeld, GHE, mass-prune, hard delete, CloudAgent,
 * PRODUCTION_READY flip. Tip-seal L39 CLOSED is SEPARATE after FC merge + tip-refresh.
 * Distinct from EX L38 seam / ES L37 / EN L36 / EI L35 / AU secrets runtime.
 */
import { FC_PRODUCTION_READY, FC_FREEZE_PIN_SHORT } from './ladder39-seam-receipt.js';

/** @type {'NO'} */
export const FC_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FC_POLICY_GATE_KIND = 'eos-ladder39-seam-policy-gate';

export const FC_RITUAL_PHASES = Object.freeze(['PREFLIGHT','SEAM_INSPECT','CHAIN_SEAL','CLOSEOUT_PROPOSE','SEAL']);

export const FC_CODES = Object.freeze({
  OK:'OK', PASS:'PASS', DENY:'DENY', HOLD:'HOLD',
  MISSING_PLAN_ID:'MISSING_PLAN_ID', MISSING_CHANGE_ID:'MISSING_CHANGE_ID',
  HARD_DELETE_FORBIDDEN:'HARD_DELETE_FORBIDDEN', MASS_PRUNE_FORBIDDEN:'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN:'SECRET_LEAK_FORBIDDEN', FUNDACION_DENIED:'FUNDACION_DENIED',
  FUNDACION_ALWAYS_DENY:'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_FORBIDDEN:'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN:'L30_REOPEN_FORBIDDEN', L31_REOPEN_FORBIDDEN:'L31_REOPEN_FORBIDDEN',
  L32_REOPEN_FORBIDDEN:'L32_REOPEN_FORBIDDEN', L33_REOPEN_FORBIDDEN:'L33_REOPEN_FORBIDDEN',
  L34_REOPEN_FORBIDDEN:'L34_REOPEN_FORBIDDEN',
  L35_REOPEN_FORBIDDEN:'L35_REOPEN_FORBIDDEN',
  L36_REOPEN_FORBIDDEN:'L36_REOPEN_FORBIDDEN',
  L37_REOPEN_FORBIDDEN:'L37_REOPEN_FORBIDDEN',
  L38_REOPEN_FORBIDDEN:'L38_REOPEN_FORBIDDEN',
  L39_AUTO_CLOSE_FORBIDDEN:'L39_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN:'TIP_REWRITE_FORBIDDEN', TIP_SEAL_FORBIDDEN:'TIP_SEAL_FORBIDDEN',
  TIP_SEAL_IN_PRODUCT_FORBIDDEN:'TIP_SEAL_IN_PRODUCT_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN:'AUTO_SEAL_FORBIDDEN', GHE_CLAIM_FORBIDDEN:'GHE_CLAIM_FORBIDDEN',
  CLOUDAGENT_FORBIDDEN:'CLOUDAGENT_FORBIDDEN',
  AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN:'AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN:'SCHEMA_JSON_ADD_FORBIDDEN',
  INVALID_RITUAL_MODE:'INVALID_RITUAL_MODE',
  TRAIL_OK:'TRAIL_OK', TRAIL_BREAK:'TRAIL_BREAK'
});

const SECRET_PATTERNS = [/AIzaSy[A-Za-z0-9_-]{30,}/,/sk-[A-Za-z0-9_-]{20,}/,/ghp_[A-Za-z0-9]{36}/,/github_pat_[A-Za-z0-9_]{40,}/,/xox[baprs]-[A-Za-z0-9-]{10,}/,/Bearer\s+[A-Za-z0-9_\-\.]{30,}/i];
const PR_FLIP_PATTERNS = [/PRODUCTION_READY\s*=\s*YES/i,/PRODUCTION[_ ]READY\s*:\s*YES/i,/flip\s+PRODUCTION_READY\s+to\s+YES/i,/claim\s+PRODUCTION_READY\s*=\s*YES/i,/auto(?:matic)?\s+production[_ ]?ready\s+flip/i];
const HARD_DELETE_PATTERNS = [/force[-_]?delete/i,/\bpurge\b/i,/hard[-_]?delete/i,/\bdestroy\b/i,/permanent(?:ly)?\s+delete/i,/rm\s+-rf/i,/\bunlinkSync\b/i,/\bdestructive\s+delete\b/i];
const MASS_PRUNE_PATTERNS = [/\bmass[-_]?prune\b/i,/\bbulk[-_]?prune\b/i,/\bprune\s+all\b/i,/\bexecute\s+prune\b/i,/\brun\s+prune\s+now\b/i,/\bperform\s+mass\s+delete\b/i];
const L30_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*30/i,/l(?:adder)?[\s_-]*30\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*30/i];
const L31_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*31/i,/l(?:adder)?[\s_-]*31\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*31/i];
const L32_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*32/i,/l(?:adder)?[\s_-]*32\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*32/i];
const L33_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*33/i,/l(?:adder)?[\s_-]*33\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*33/i];
const L34_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*34/i,/l(?:adder)?[\s_-]*34\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*34/i];
const L35_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*35/i,/l(?:adder)?[\s_-]*35\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*35/i];
const L36_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*36/i,/l(?:adder)?[\s_-]*36\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*36/i];
const L37_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*37/i,/l(?:adder)?[\s_-]*37\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*37/i];
const L38_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*38/i,/l(?:adder)?[\s_-]*38\s+reopen/i,/unseal\s+l(?:adder)?[\s_-]*38/i];
const L39_AUTO_CLOSE_PATTERNS = [/auto[-_]?close\s+l(?:adder)?[\s_-]*39/i,/l(?:adder)?[\s_-]*39\s+auto[-_]?close/i,/unsupervised\s+l(?:adder)?[\s_-]*39\s+close/i,/tip[-_]?seal\s+l(?:adder)?[\s_-]*39\s+closed/i,/seal\s+l(?:adder)?[\s_-]*39\s+closed\s+now/i,/formal\s+l(?:adder)?[\s_-]*39\s+closed/i];
const TIP_REWRITE_PATTERNS = [/rewrite\s+freeze\s+tip/i,/tip[-_]?pin\s+rewrite/i,/rewrite\s+tip[-_]?pin/i,/mutate\s+freeze\s+pin/i,/force[-_]?update\s+freeze\s+tip/i,/overwrite\s+freeze\s+tip/i];
const TIP_SEAL_PATTERNS = [/tip[-_]?seal\s+l(?:adder)?[\s_-]*39/i,/tip[-_]?refresh\s+l(?:adder)?[\s_-]*39\s+closed/i,/flip\s+freeze\s+to\s+closed/i,/seal\s+freeze\s+l39\s+closed/i];
const TIP_SEAL_IN_PRODUCT_PATTERNS = [/tip[-_]?seal[-_]?in[-_]?product/i,/claim\s+tip[-_]?seal\s+in\s+this\s+(?:pr|package|product)/i,/this\s+pr\s+tip[-_]?seals\s+l39/i,/product\s+pr\s+closes\s+l39/i];
const SCHEMA_JSON_ADD_PATTERNS = [/add\s+(?:new\s+)?schema\s*json/i,/docs\/schemas\/.*\.json/i,/new\s+docs\/schemas/i,/schema[-_]?json\s+add/i,/create\s+schema\s+json/i];
const GHE_PATTERNS = [/\bGHE\b/,/GitHub\s+Enterprise/i,/required[-_]?check\s+enforcement/i,/branch\s+protection\s+enforced/i,/GHA\s+green\s+claim/i];
const CLOUDAGENT_PATTERNS = [/CloudAgent/i,/cursor\s+cloud\s+agent/i];
const AU_SECRETS_PATTERNS = [/reopen\s+au\s+secrets/i,/au\s+secrets\s+runtime\s+reopen/i,/mutate\s+live\s+secret\s+store/i,/live\s+secret\s+material/i];

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
export function claimsTipSealInProduct(str) { return TIP_SEAL_IN_PRODUCT_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsSchemaJsonAdd(str) { return SCHEMA_JSON_ADD_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL30Reopen(str) { return L30_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL31Reopen(str) { return L31_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL32Reopen(str) { return L32_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL33Reopen(str) { return L33_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL34Reopen(str) { return L34_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL35Reopen(str) { return L35_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL36Reopen(str) { return L36_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL37Reopen(str) { return L37_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL38Reopen(str) { return L38_REOPEN_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsL39AutoClose(str) { return L39_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsGhe(str) { return GHE_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsCloudAgent(str) { return CLOUDAGENT_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function claimsAuSecretsRuntimeReopen(str) { return AU_SECRETS_PATTERNS.some((pat) => pat.test(String(str || ''))); }
export function isFundacionTarget(str) { const s = String(str || ''); return /Fundacion/i.test(s) || /Documents\/Fundacion/i.test(s); }

export class Ladder39SeamPolicyGate {
  constructor() {
    this.productionReady = FC_POLICY_GATE_PRODUCTION_READY;
    this.freezePinShort = FC_FREEZE_PIN_SHORT;
  }

  evaluatePreconditions(plan = {}) {
    if (!plan.planId) return { ok:false, decision:'DENY', code:FC_CODES.MISSING_PLAN_ID, reason:'planId required' };
    if (!plan.changeId) return { ok:false, decision:'DENY', code:FC_CODES.MISSING_CHANGE_ID, reason:'changeId required' };
    const mode = plan.ritualMode || 'ACTIVE';
    if (!['ACTIVE','HOLD','DRY_RUN'].includes(mode)) return { ok:false, decision:'DENY', code:FC_CODES.INVALID_RITUAL_MODE, reason:'Invalid ritualMode: '+mode };
    const blob = flattenPlan(plan);
    const target = plan.target || plan.path || '';
    if (isFundacionTarget(target) || isFundacionTarget(blob) || plan.fundacionWrite === true)
      return { ok:false, decision:'DENY', code:FC_CODES.FUNDACION_ALWAYS_DENY, reason:'Fundacion Delta=0 — FUNDACION_ALWAYS_DENY' };
    if (scanForSecrets(blob) || plan.sealSecret === true)
      return { ok:false, decision:'DENY', code:FC_CODES.SECRET_LEAK_FORBIDDEN, reason:'Law VI — secret leakage refused' };
    if (claimsProductionReadyFlip(blob) || plan.flipProductionReady === true || plan.productionReady === 'YES')
      return { ok:false, decision:'DENY', code:FC_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, reason:'PRODUCTION_READY flip refused' };
    if (claimsHardDelete(blob) || plan.hardDelete === true)
      return { ok:false, decision:'DENY', code:FC_CODES.HARD_DELETE_FORBIDDEN, reason:'Hard delete refused' };
    if (claimsMassPrune(blob) || plan.massPrune === true)
      return { ok:false, decision:'DENY', code:FC_CODES.MASS_PRUNE_FORBIDDEN, reason:'Mass prune refused' };
    if (claimsL30Reopen(blob) || plan.reopenL30 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L30_REOPEN_FORBIDDEN, reason:'L30 CLOSED — NEVER reopen' };
    if (claimsL31Reopen(blob) || plan.reopenL31 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L31_REOPEN_FORBIDDEN, reason:'L31 CLOSED — NEVER reopen' };
    if (claimsL32Reopen(blob) || plan.reopenL32 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L32_REOPEN_FORBIDDEN, reason:'L32 CLOSED — NEVER reopen' };
    if (claimsL33Reopen(blob) || plan.reopenL33 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L33_REOPEN_FORBIDDEN, reason:'L33 CLOSED — NEVER reopen' };
    if (claimsL34Reopen(blob) || plan.reopenL34 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L34_REOPEN_FORBIDDEN, reason:'L34 CLOSED — NEVER reopen' };
    if (claimsL35Reopen(blob) || plan.reopenL35 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L35_REOPEN_FORBIDDEN, reason:'L35 CLOSED — NEVER reopen' };
    if (claimsL36Reopen(blob) || plan.reopenL36 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L36_REOPEN_FORBIDDEN, reason:'L36 CLOSED — NEVER reopen' };
    if (claimsL37Reopen(blob) || plan.reopenL37 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L37_REOPEN_FORBIDDEN, reason:'L37 CLOSED — NEVER reopen' };
    if (claimsL38Reopen(blob) || plan.reopenL38 === true)
      return { ok:false, decision:'DENY', code:FC_CODES.L38_REOPEN_FORBIDDEN, reason:'L38 CLOSED — NEVER reopen' };
    const wantsL39Close = claimsL39AutoClose(blob) || plan.l39AutoClose === true || plan.tipSealL39 === true || plan.sealL39Closed === true;
    if (wantsL39Close && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:FC_CODES.L39_AUTO_CLOSE_FORBIDDEN, reason:'L39 auto-close / tip-seal refused without humanGateHeld (tip-seal SEPARATE)' };
    if (claimsTipRewrite(blob) || plan.tipRewrite === true || plan.rewriteFreezeTip === true)
      return { ok:false, decision:'DENY', code:FC_CODES.TIP_REWRITE_FORBIDDEN, reason:'Freeze tip rewrite refused — soft-observe pin only' };
    if (claimsTipSealInProduct(blob) || plan.tipSealInProduct === true)
      return { ok:false, decision:'DENY', code:FC_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN, reason:'Tip-seal-in-product claim refused — closeout satellite ≠ tip-seal' };
    if (claimsTipSeal(blob) && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:FC_CODES.TIP_SEAL_FORBIDDEN, reason:'Tip-seal L39 CLOSED is SEPARATE after FC merge + tip-refresh — not this package' };
    if (claimsSchemaJsonAdd(blob) || plan.schemaJsonAdd === true || plan.addSchemaJson === true)
      return { ok:false, decision:'DENY', code:FC_CODES.SCHEMA_JSON_ADD_FORBIDDEN, reason:'Schema-json add refused — AT_CEILING 35/35' };
    if (plan.autoSeal === true && !plan.humanGateHeld)
      return { ok:false, decision:'DENY', code:FC_CODES.AUTO_SEAL_FORBIDDEN, reason:'autoSeal without humanGateHeld refused' };
    if (claimsGhe(blob) || plan.claimGhe === true)
      return { ok:false, decision:'DENY', code:FC_CODES.GHE_CLAIM_FORBIDDEN, reason:'Seam-pack != GHE enforcement' };
    if (claimsCloudAgent(blob) || plan.cloudAgent === true)
      return { ok:false, decision:'DENY', code:FC_CODES.CLOUDAGENT_FORBIDDEN, reason:'CloudAgent out of path — Antigravity-first' };
    if (claimsAuSecretsRuntimeReopen(blob) || plan.reopenAuSecretsRuntime === true || plan.liveSecretStore === true)
      return { ok:false, decision:'DENY', code:FC_CODES.AU_SECRETS_RUNTIME_REOPEN_FORBIDDEN, reason:'AU secrets runtime reopen / live secret store refused — Law VI hermetic only' };
    if (mode === 'HOLD') return { ok:true, decision:'HOLD', code:FC_CODES.HOLD };
    return { ok:true, decision:'PASS', code:FC_CODES.OK };
  }
}
