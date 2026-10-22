/**
 * @module ladder41-seam-policy-gate
 * SPEC-0175 / Mission FM — Policy Gate for Ladder 41 CI Seam-Pack Consolidation & Closeout.
 * Pure Layer-0. Refuse secrets, Fundacion, tip rewrite, L30–L40 reopen,
 * tip-seal-in-product claim, schema-json add, unsupervised L41 auto-close without
 * humanGateHeld, GHE, mass-prune, hard delete, CloudAgent, PRODUCTION_READY flip.
 * Tip-seal L41 CLOSED is SEPARATE after FM merge + tip-refresh.
 * Distinct from FH L40 seam / FC L39 seam / EX L38 / ES L37.
 */
import { FM_PRODUCTION_READY, FM_FREEZE_PIN_SHORT } from './ladder41-seam-receipt.js';

/** @type {'NO'} */
export const FM_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FM_POLICY_GATE_KIND = 'eos-ladder41-seam-policy-gate';

export const FM_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'SEAM_INSPECT',
  'CHAIN_SEAL',
  'CLOSEOUT_PROPOSE',
  'SEAL'
]);

export const FM_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  L31_REOPEN_FORBIDDEN: 'L31_REOPEN_FORBIDDEN',
  L32_REOPEN_FORBIDDEN: 'L32_REOPEN_FORBIDDEN',
  L33_REOPEN_FORBIDDEN: 'L33_REOPEN_FORBIDDEN',
  L34_REOPEN_FORBIDDEN: 'L34_REOPEN_FORBIDDEN',
  L35_REOPEN_FORBIDDEN: 'L35_REOPEN_FORBIDDEN',
  L36_REOPEN_FORBIDDEN: 'L36_REOPEN_FORBIDDEN',
  L37_REOPEN_FORBIDDEN: 'L37_REOPEN_FORBIDDEN',
  L38_REOPEN_FORBIDDEN: 'L38_REOPEN_FORBIDDEN',
  L39_REOPEN_FORBIDDEN: 'L39_REOPEN_FORBIDDEN',
  L40_REOPEN_FORBIDDEN: 'L40_REOPEN_FORBIDDEN',
  L41_AUTO_CLOSE_FORBIDDEN: 'L41_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  TIP_SEAL_FORBIDDEN: 'TIP_SEAL_FORBIDDEN',
  TIP_SEAL_IN_PRODUCT_FORBIDDEN: 'TIP_SEAL_IN_PRODUCT_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
  CLOUDAGENT_FORBIDDEN: 'CLOUDAGENT_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  NETWORK_WRITE_FORBIDDEN: 'NETWORK_WRITE_FORBIDDEN',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  SATELLITE_AS_SEAM_FORBIDDEN: 'SATELLITE_AS_SEAM_FORBIDDEN',
  INVALID_RITUAL_MODE: 'INVALID_RITUAL_MODE',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

const SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
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

const HARD_DELETE_PATTERNS = [
  /force[-_]?delete/i,
  /\bpurge\b/i,
  /hard[-_]?delete/i,
  /\bdestroy\b/i,
  /permanent(?:ly)?\s+delete/i,
  /rm\s+-rf/i
];

const MASS_PRUNE_PATTERNS = [
  /\bmass[\s_-]?prune\b/i,
  /\bbulk[-_]?prune\b/i,
  /\bprune\s+all\b/i,
  /\bexecute\s+prune\b/i,
  /\bperform\s+mass\s+delete\b/i
];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:the\s+)?tip\s+pin/i,
  /tip[-_]?pin\s+rewrite/i,
  /overwrite\s+freeze\s+main_tip/i,
  /force\s+push\s+tip\s+pin/i
];

const TIP_SEAL_PATTERNS = [
  /tip[-_\s]?seal\s+l(?:adder)?[\s_-]*41/i,
  /seal\s+(?:formal\s+)?l(?:adder)?[\s_-]*41\s+closed/i,
  /formal\s+l(?:adder)?[\s_-]*41\s+closed/i,
  /mark\s+l(?:adder)?[\s_-]*41\s+closed/i
];

const TIP_SEAL_IN_PRODUCT_PATTERNS = [
  /tip[-_\s]?seal\s+in\s+(?:the\s+)?product/i,
  /product\s+package\s+(?:performs|does|owns)\s+the\s+tip[-_\s]?seal/i,
  /close\s+l41\s+in\s+this\s+package/i
];

const SCHEMA_JSON_PATTERNS = [
  /add\s+(?:a\s+)?schema\s+json/i,
  /new\s+schema\.json/i,
  /raise\s+AT_CEILING/i
];

const GHE_PATTERNS = [/\bGHE\b/, /github\s+enterprise\s+enforcement/i, /green\s+check\s+enforced/i];

const CLOUDAGENT_PATTERNS = [/\bCloudAgent\b/i, /cloud\s+agent\s+fleet/i];

const NETWORK_WRITE_PATTERNS = [/network\s+write/i, /http\s+post\s+to/i, /socket\s+write/i];

const LIVE_HTTP_EGRESS_PATTERNS = [
  /live\s+http\s+egress/i,
  /bind\s+live\s+http/i,
  /real\s+network\s+call/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /wall[-_\s]?clock\s+authority/i,
  /use\s+Date\.now\s+as\s+authority/i
];

const SATELLITE_AS_SEAM_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?seam\s+port\b/i,
  /\bmake\s+fj\s+(?:the\s+)?seam\s+port\b/i,
  /\bmake\s+fk\s+(?:the\s+)?seam\s+port\b/i,
  /\bmake\s+fl\s+(?:the\s+)?seam\s+port\b/i,
  /\belevate\s+(?:fi|fj|fk|fl)\s+(?:to\s+)?seam\b/i
];

const LADDER_REOPEN_PATTERNS = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 11 }, (_, i) => {
      const n = 30 + i;
      return [
        n,
        [
          new RegExp(`reopen\\s+l(?:adder)?[\\s_-]*${n}`, 'i'),
          new RegExp(`l(?:adder)?[\\s_-]*${n}\\s+reopen`, 'i'),
          new RegExp(`unseal\\s+l(?:adder)?[\\s_-]*${n}`, 'i')
        ]
      ];
    })
  )
);

function stringifySafe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function claimsAny(val, patterns) {
  if (!val) return false;
  return patterns.some((pat) => pat.test(stringifySafe(val)));
}

export const claimsProductionReadyFlip = (v) => claimsAny(v, PR_FLIP_PATTERNS);
export const claimsHardDelete = (v) => claimsAny(v, HARD_DELETE_PATTERNS);
export const claimsMassPrune = (v) => claimsAny(v, MASS_PRUNE_PATTERNS);
export const claimsTipRewrite = (v) => claimsAny(v, TIP_REWRITE_PATTERNS);
export const claimsTipSeal = (v) => claimsAny(v, TIP_SEAL_PATTERNS);
export const claimsTipSealInProduct = (v) => claimsAny(v, TIP_SEAL_IN_PRODUCT_PATTERNS);
export const claimsSchemaJsonAdd = (v) => claimsAny(v, SCHEMA_JSON_PATTERNS);
export const claimsGhe = (v) => claimsAny(v, GHE_PATTERNS);
export const claimsCloudAgent = (v) => claimsAny(v, CLOUDAGENT_PATTERNS);
export const claimsNetworkWrite = (v) => claimsAny(v, NETWORK_WRITE_PATTERNS);
export const claimsLiveHttpEgress = (v) => claimsAny(v, LIVE_HTTP_EGRESS_PATTERNS);
export const claimsWallClockAuthority = (v) => claimsAny(v, WALL_CLOCK_AUTHORITY_PATTERNS);
export const claimsSatelliteAsSeam = (v) => claimsAny(v, SATELLITE_AS_SEAM_PATTERNS);
export const claimsL41AutoClose = (v) =>
  claimsAny(v, [
    /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
    /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
    /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i
  ]);

export function claimsLadderReopen(val, ladder) {
  const patterns = LADDER_REOPEN_PATTERNS[ladder];
  return patterns ? claimsAny(val, patterns) : false;
}

export function scanForSecrets(val) {
  if (!val) return false;
  return SECRET_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export class Ladder41SeamPolicyGate {
  /**
   * Evaluates fail-closed preconditions for the Ladder 41 seam/closeout ritual.
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason?: string }}
   */
  evaluatePreconditions(plan = {}) {
    const deny = (code, reason) => ({ ok: false, decision: 'DENY', code, reason });
    const mode = plan.ritualMode || 'ACTIVE';

    if (!plan || typeof plan !== 'object') return deny(FM_CODES.DENY, 'Invalid plan');
    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return deny(FM_CODES.MISSING_PLAN_ID, 'Missing planId in input');
    }
    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return deny(FM_CODES.MISSING_CHANGE_ID, 'Missing changeId in input');
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return deny(
        FM_CODES.FUNDACION_ALWAYS_DENY,
        'Target path references Fundacion. FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(plan)) {
      return deny(FM_CODES.HARD_DELETE_FORBIDDEN, 'Hard delete / purge refused');
    }
    if (plan.massPrune === true || claimsMassPrune(plan)) {
      return deny(FM_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune refused (inventory != delete)');
    }
    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(plan)) {
      return deny(FM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, 'PRODUCTION_READY must remain NO');
    }
    if (scanForSecrets(plan)) {
      return deny(FM_CODES.SECRET_LEAK_FORBIDDEN, 'Potential plain secret token refused (Law VI)');
    }

    for (let ladder = 30; ladder <= 40; ladder += 1) {
      if (plan[`reopenL${ladder}`] === true || claimsLadderReopen(plan, ladder)) {
        return deny(
          FM_CODES[`L${ladder}_REOPEN_FORBIDDEN`],
          `L${ladder} CLOSED — NEVER reopen L30–L40`
        );
      }
    }

    const wantsL41Close =
      claimsL41AutoClose(plan) ||
      plan.l41AutoClose === true ||
      plan.tipSealL41 === true ||
      plan.sealL41Closed === true;
    if (wantsL41Close && !plan.humanGateHeld) {
      return deny(
        FM_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        'L41 auto-close / tip-seal refused without humanGateHeld (tip-seal SEPARATE)'
      );
    }

    if (claimsTipRewrite(plan) || plan.tipRewrite === true || plan.rewriteFreezeTip === true) {
      return deny(
        FM_CODES.TIP_REWRITE_FORBIDDEN,
        `Freeze tip rewrite refused — soft-observe pin ${FM_FREEZE_PIN_SHORT} only`
      );
    }
    if (claimsTipSealInProduct(plan) || plan.tipSealInProduct === true) {
      return deny(
        FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN,
        'Tip-seal-in-product claim refused — seam-pack != tip-seal'
      );
    }
    if (claimsTipSeal(plan) && !plan.humanGateHeld) {
      return deny(
        FM_CODES.TIP_SEAL_FORBIDDEN,
        'Tip-seal L41 CLOSED is SEPARATE after FM merge + tip-refresh — not this package'
      );
    }
    if (claimsSchemaJsonAdd(plan) || plan.schemaJsonAdd === true) {
      return deny(FM_CODES.SCHEMA_JSON_ADD_FORBIDDEN, 'Schema JSON add refused — AT_CEILING 35/35');
    }
    if (plan.networkWrite === true || claimsNetworkWrite(plan)) {
      return deny(FM_CODES.NETWORK_WRITE_FORBIDDEN, 'Network write refused — hermetic only');
    }
    if (plan.liveHttpEgress === true || claimsLiveHttpEgress(plan)) {
      return deny(FM_CODES.LIVE_HTTP_EGRESS_FORBIDDEN, 'Live HTTP egress refused');
    }
    if (plan.wallClockAuthority === true || claimsWallClockAuthority(plan)) {
      return deny(FM_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN, 'Wall-clock authority refused');
    }
    if (plan.fiAsSeam === true || plan.fjAsSeam === true || plan.fkAsSeam === true || plan.flAsSeam === true) {
      return deny(
        FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN,
        'Elevating a satellite as the seam port is refused — the seam consolidates, it does not replace'
      );
    }
    if (claimsSatelliteAsSeam(plan)) {
      return deny(FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN, 'Satellite-as-seam elevation refused');
    }
    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return deny(FM_CODES.AUTO_SEAL_FORBIDDEN, 'autoSeal without humanGateHeld refused');
    }
    if (claimsGhe(plan) || plan.claimGhe === true) {
      return deny(FM_CODES.GHE_CLAIM_FORBIDDEN, 'Seam-pack != GHE enforcement');
    }
    if (claimsCloudAgent(plan) || plan.cloudAgent === true) {
      return deny(FM_CODES.CLOUDAGENT_FORBIDDEN, 'CloudAgent out of path — Antigravity-first');
    }
    if (mode !== 'ACTIVE' && mode !== 'HOLD' && mode !== 'DRY_RUN') {
      return deny(FM_CODES.INVALID_RITUAL_MODE, 'ritualMode must be ACTIVE|HOLD|DRY_RUN');
    }
    if (mode === 'HOLD') return { ok: true, decision: 'HOLD', code: FM_CODES.HOLD };
    return { ok: true, decision: 'PASS', code: FM_CODES.OK };
  }
}

void FM_PRODUCTION_READY;
