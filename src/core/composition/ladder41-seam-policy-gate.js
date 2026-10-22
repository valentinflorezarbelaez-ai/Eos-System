/**
 * @module ladder41-seam-policy-gate
 * SPEC-0175 / Mission FM — Ladder 41 CI Seam-Pack Consolidation & Closeout Policy Gate.
 * Pure Layer-0 Node.js. Never seal secrets (Law VI).
 *
 * Fail-closed preconditions for consolidating the FI/FJ/FK/FL satellites into a
 * Ladder 41 seam-pack decision record.
 *
 * Freeze soft-observe pin: f5948926 (post-#581 merge / FL MEASURED soft-observe).
 * NEVER reopen L30–L40; refuse L41 auto-close without humanGateHeld; refuse tip-seal in product.
 * PRODUCTION_READY: NO
 */

import {
  FM_CHAIN_ORDER,
  FM_FREEZE_PIN_SHORT,
  FM_PRODUCTION_READY,
  FM_SEAM_CLASSES,
  FM_SATELLITE_SPECS
} from './ladder41-seam-receipt.js';

/** @type {'NO'} */
export const FM_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FM_POLICY_GATE_KIND = 'eos-ladder41-seam-policy-gate';

export const FM_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'FI_OBSERVE',
  'FJ_OBSERVE',
  'FK_OBSERVE',
  'FL_OBSERVE',
  'SEAM_CLASSIFY',
  'SEAM_SEAL'
]);

export const FM_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
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
  TIP_SEAL_IN_PRODUCT_FORBIDDEN: 'TIP_SEAL_IN_PRODUCT_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  NETWORK_WRITE_FORBIDDEN: 'NETWORK_WRITE_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  SATELLITE_AS_SEAM_FORBIDDEN: 'SATELLITE_AS_SEAM_FORBIDDEN',
  RAW_SEAM_SECRET_MATERIAL_FORBIDDEN: 'RAW_SEAM_SECRET_MATERIAL_FORBIDDEN',
  INVALID_RITUAL_MODE: 'INVALID_RITUAL_MODE',
  MISSING_SEAM: 'MISSING_SEAM',
  INVALID_SEAM: 'INVALID_SEAM',
  MISSING_CHAIN: 'MISSING_CHAIN',
  INVALID_CHAIN_MEMBER: 'INVALID_CHAIN_MEMBER',
  MISSING_CHAIN_ORDER: 'MISSING_CHAIN_ORDER',
  INVALID_CHAIN_ORDER: 'INVALID_CHAIN_ORDER',
  MISSING_SATELLITE_SPECS: 'MISSING_SATELLITE_SPECS',
  INVALID_SATELLITE_SPECS: 'INVALID_SATELLITE_SPECS',
  MISSING_SEAM_CLASS: 'MISSING_SEAM_CLASS',
  INVALID_SEAM_CLASS: 'INVALID_SEAM_CLASS',
  MISSING_DESIRED_SEAL: 'MISSING_DESIRED_SEAL',
  INVALID_DESIRED_SEAL: 'INVALID_DESIRED_SEAL',
  MISSING_OBSERVED_CHAIN_COMPLETE: 'MISSING_OBSERVED_CHAIN_COMPLETE',
  INVALID_OBSERVED_CHAIN_COMPLETE: 'INVALID_OBSERVED_CHAIN_COMPLETE',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
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

const SECRET_FIELD_NAME_PATTERNS = [
  /^password$/i,
  /^passwd$/i,
  /^pwd$/i,
  /^token$/i,
  /^access[_-]?token$/i,
  /^refresh[_-]?token$/i,
  /^id[_-]?token$/i,
  /^api[_-]?key$/i,
  /^apikey$/i,
  /^private[_-]?key$/i,
  /^privatekey$/i,
  /^raw[_-]?secret$/i,
  /^secret$/i,
  /^client[_-]?secret$/i,
  /^bearer$/i,
  /^authorization$/i,
  /^auth[_-]?header$/i,
  /^credential(?:s)?$/i,
  /^plaintext[_-]?secret$/i,
  /^secret[_-]?value$/i,
  /^secret[_-]?bytes$/i,
  /^pem$/i,
  /^ssh[_-]?key$/i,
  /^hmac[_-]?key$/i,
  /^hmac[_-]?secret$/i,
  /^signature[_-]?secret$/i,
  /^signing[_-]?key$/i,
  /^request[_-]?hmac$/i,
  /^reply[_-]?hmac$/i,
  /^request[_-]?payload$/i,
  /^reply[_-]?payload$/i,
  /^raw[_-]?request[_-]?payload$/i,
  /^raw[_-]?reply[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i,
  /^seam[_-]?secret$/i,
  /^seam[_-]?payload$/i,
  /^seam[_-]?hmac$/i
];

const PR_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const HARD_DELETE_PATTERNS = [/force[-_]?delete/i, /\bpurge\b/i, /hard[-_]?delete/i, /\bdestroy\b/i];

const MASS_PRUNE_PATTERNS = [/mass\s+prune/i, /prune\s+all/i, /delete\s+all\s+tests/i, /bulk\s+delete/i];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:the\s+)?(?:freeze\s+)?tip[\s_-]?pin/i,
  /tip[_-]?pin\s+rewrite/i,
  /overwrite\s+freeze\s+main_tip/i,
  /force\s+push\s+tip\s+pin/i
];

const TIP_SEAL_IN_PRODUCT_PATTERNS = [
  /\btip[-_\s]?seal\b/i,
  /\bseal\s+the\s+tip\b/i,
  /\bmark\s+l(?:adder)?[\s_-]*41\s+(?:as\s+)?closed\b/i,
  /\bformal\s+l(?:adder)?[\s_-]*41\s+closed\b/i,
  /\bclaim\s+l(?:adder)?[\s_-]*41\s+closed\b/i
];

const SCHEMA_JSON_PATTERNS = [
  /add\s+\w*\s*schema[\s_.-]?json/i,
  /new\s+schema[\s_.-]?json/i,
  /raise\s+AT_CEILING/i
];

const NETWORK_WRITE_PATTERNS = [/network\s+write/i, /http\s+post\s+to/i, /socket\s+write/i];

const GHE_PATTERNS = [/\bGHE\b/, /github\s+enforcement/i, /green\s+check\s+enforced/i];

const LIVE_HTTP_EGRESS_PATTERNS = [
  /live\s+http\s+egress/i,
  /bind\s+live\s+http/i,
  /fetch\s+the\s+live\s+endpoint/i,
  /real\s+network\s+call/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /wall[-_\s]?clock\s+authority/i,
  /use\s+Date\.now\s+as\s+authority/i,
  /trust\s+the\s+system\s+clock/i
];

const TIP_REFRESH_AUTHORITY_PATTERNS = [
  /tip[-_\s]?refresh\s+authority/i,
  /advance\s+the\s+freeze\s+pin/i,
  /this\s+package\s+refreshes\s+the\s+tip/i
];

const RAW_SEAM_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+seam\s+(?:secret|payload|hmac)\b/i,
  /\bseal\s+(?:the\s+)?seam\s+secret\b/i,
  /\bcopy\s+(?:payload|secret)\s+into\s+(?:the\s+)?seam\s+receipt\b/i
];

const SATELLITE_AS_SEAM_PATTERNS = [
  /\b(?:make|elevate|couple|promote)\s+(?:fi|fj|fk|fl)\s+(?:as\s+)?(?:the\s+)?seam\b/i,
  /\b(?:fi|fj|fk|fl)\s+(?:registry|integrity|quarantine|attestation)\s+as\s+(?:the\s+)?seam\b/i,
  /\buse\s+(?:fi|fj|fk|fl)\s+as\s+(?:the\s+)?ladder\s*41\s+seam\b/i
];

const L41_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
  /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i,
  /close\s+l(?:adder)?[\s_-]*41\s+now/i
];

function stringifySafe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function stripReceipts(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.endsWith('Receipt') || key.endsWith('ReceiptLink') || key === 'priorReceipts') {
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      clone[key] = stripReceipts(val);
    } else {
      clone[key] = val;
    }
  }
  return clone;
}

export function findSecretLookingField(val) {
  if (!val || typeof val !== 'object') return null;
  const stack = [val];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    for (const [key, child] of Object.entries(cur)) {
      if (SECRET_FIELD_NAME_PATTERNS.some((pat) => pat.test(key))) {
        return key;
      }
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return null;
}

export function scanForSecrets(val) {
  if (!val) return false;
  return SECRET_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

function claimsAny(val, patterns) {
  if (!val) return false;
  return patterns.some((pat) => pat.test(stringifySafe(val)));
}

export const claimsProductionReadyFlip = (v) => claimsAny(v, PR_FLIP_PATTERNS);
export const claimsHardDelete = (v) => claimsAny(v, HARD_DELETE_PATTERNS);
export const claimsMassPrune = (v) => claimsAny(v, MASS_PRUNE_PATTERNS);
export const claimsTipRewrite = (v) => claimsAny(v, TIP_REWRITE_PATTERNS);
export const claimsTipSealInProduct = (v) => claimsAny(v, TIP_SEAL_IN_PRODUCT_PATTERNS);
export const claimsSchemaJsonAdd = (v) => claimsAny(v, SCHEMA_JSON_PATTERNS);
export const claimsNetworkWrite = (v) => claimsAny(v, NETWORK_WRITE_PATTERNS);
export const claimsGhe = (v) => claimsAny(v, GHE_PATTERNS);
export const claimsLiveHttpEgress = (v) => claimsAny(v, LIVE_HTTP_EGRESS_PATTERNS);
export const claimsWallClockAuthority = (v) => claimsAny(v, WALL_CLOCK_AUTHORITY_PATTERNS);
export const claimsTipRefreshAuthority = (v) => claimsAny(v, TIP_REFRESH_AUTHORITY_PATTERNS);
export const claimsRawSeamSecretMaterial = (v) => claimsAny(v, RAW_SEAM_SECRET_MATERIAL_PATTERNS);
export const claimsSatelliteAsSeam = (v) => claimsAny(v, SATELLITE_AS_SEAM_PATTERNS);
export const claimsL41AutoClose = (v) => claimsAny(v, L41_AUTO_CLOSE_PATTERNS);

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

export function claimsLadderReopen(val, ladder) {
  const patterns = LADDER_REOPEN_PATTERNS[ladder];
  return patterns ? claimsAny(val, patterns) : false;
}

export const claimsL30Reopen = (v) => claimsLadderReopen(v, 30);
export const claimsL40Reopen = (v) => claimsLadderReopen(v, 40);

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidSeamClass(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidDesiredSeal(value) {
  return typeof value === 'string' && FM_SEAM_CLASSES.includes(value);
}

export function isValidSha256Hex(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function sameSequence(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);
}

export function isValidChainOrder(value) {
  return sameSequence(value, FM_CHAIN_ORDER);
}

export function isValidSatelliteSpecs(value) {
  return sameSequence(value, FM_SATELLITE_SPECS);
}

export class Ladder41SeamPolicyGate {
  /**
   * Evaluates preconditions for the Ladder 41 seam-pack consolidation ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    const deny = (code, reason) => ({ ok: false, decision: 'DENY', code, reason });
    const hold = (reason) => ({ ok: true, decision: 'HOLD', code: FM_CODES.HOLD, reason });

    if (!plan || typeof plan !== 'object') {
      return deny(FM_CODES.DENY, 'Invalid plan: input must be an object');
    }

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
        FM_CODES.FUNDACION_DENIED,
        'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return deny(
        FM_CODES.SECRET_FIELD_FORBIDDEN,
        `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Seam receipts may seal opaque chain booleans, labels and spec ordinals only.`
      );
    }

    if (scanForSecrets(planClean)) {
      return deny(
        FM_CODES.SECRET_LEAK_FORBIDDEN,
        'Plan contains potential plain secret token. Law VI absolute rejection.'
      );
    }

    if (
      plan.forceDelete === true ||
      plan.purge === true ||
      plan.hardDelete === true ||
      claimsHardDelete(planClean)
    ) {
      return deny(
        FM_CODES.HARD_DELETE_FORBIDDEN,
        'Hard delete / purge operations are strictly forbidden in EOS governance.'
      );
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return deny(FM_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune operations are strictly forbidden.');
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return deny(
        FM_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      );
    }

    for (let ladder = 30; ladder <= 40; ladder += 1) {
      if (plan[`reopenL${ladder}`] === true || claimsLadderReopen(planClean, ladder)) {
        return deny(
          FM_CODES[`L${ladder}_REOPEN_FORBIDDEN`],
          `Attempted to reopen Ladder ${ladder}. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.`
        );
      }
    }

    if (
      plan.tipSealInProduct === true ||
      plan.tipSeal === true ||
      plan.claimsFormalL41Closed === true ||
      claimsTipSealInProduct(planClean)
    ) {
      return deny(
        FM_CODES.TIP_SEAL_IN_PRODUCT_FORBIDDEN,
        'Tip-seal / Formal L41 CLOSED inside the product package is refused. Tip-seal is a SEPARATE governed act after FM merge + tip-refresh.'
      );
    }

    if (plan.autoCloseL41 === true || claimsL41AutoClose(planClean)) {
      return deny(
        FM_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        'L41 auto-close is refused. L41 closure requires the governed tip-seal act with humanGateHeld.'
      );
    }

    if (plan.tipRewrite === true || claimsTipRewrite(planClean)) {
      return deny(
        FM_CODES.TIP_REWRITE_FORBIDDEN,
        `Tip-pin rewrite is refused. Soft-observe pin ${FM_FREEZE_PIN_SHORT} only.`
      );
    }

    if (plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return deny(FM_CODES.SCHEMA_JSON_ADD_FORBIDDEN, 'Schema JSON add is refused. schemas AT_CEILING 35/35.');
    }

    if (plan.networkWrite === true || claimsNetworkWrite(planClean)) {
      return deny(FM_CODES.NETWORK_WRITE_FORBIDDEN, 'Network write is refused. Hermetic in-memory only.');
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return deny(FM_CODES.GHE_CLAIM_FORBIDDEN, 'GHE / enterprise enforcement claims are refused.');
    }

    if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
      return deny(
        FM_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
        'Live HTTP egress is refused. PASS seals a hermetic seam consolidation only.'
      );
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return deny(FM_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN, 'Wall-clock authority is refused.');
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return deny(
        FM_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        `Tip-refresh authority is refused. Soft-observe pin ${FM_FREEZE_PIN_SHORT} only; tip-refresh is SEPARATE.`
      );
    }

    if (
      plan.satelliteAsSeam === true ||
      plan.fiAsSeam === true ||
      plan.fjAsSeam === true ||
      plan.fkAsSeam === true ||
      plan.flAsSeam === true ||
      claimsSatelliteAsSeam(planClean)
    ) {
      return deny(
        FM_CODES.SATELLITE_AS_SEAM_FORBIDDEN,
        'Satellite-as-seam elevation is refused. FI/FJ/FK/FL stay distinct; FM consolidates their opaque observations only.'
      );
    }

    if (plan.rawSecretMaterial === true || plan.sealSecret === true || claimsRawSeamSecretMaterial(planClean)) {
      return deny(
        FM_CODES.RAW_SEAM_SECRET_MATERIAL_FORBIDDEN,
        'Raw seam secret / payload material in seam records is refused (Law VI).'
      );
    }

    if (plan.ritualMode === 'HOLD') {
      return hold('Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.');
    }

    if (plan.ritualMode !== undefined && !['ACTIVE', 'DRY_RUN'].includes(plan.ritualMode)) {
      return deny(FM_CODES.INVALID_RITUAL_MODE, 'ritualMode must be ACTIVE|HOLD|DRY_RUN when provided');
    }

    if (!plan.seam) {
      return deny(FM_CODES.MISSING_SEAM, 'Missing seam in active ritual mode');
    }

    if (typeof plan.seam !== 'object' || Array.isArray(plan.seam)) {
      return deny(FM_CODES.INVALID_SEAM, 'seam must be a non-null object');
    }

    const seam = plan.seam;

    if (!seam.chain || typeof seam.chain !== 'object' || Array.isArray(seam.chain)) {
      return deny(FM_CODES.MISSING_CHAIN, 'seam.chain is required (opaque fi/fj/fk/fl booleans)');
    }

    for (const member of FM_CHAIN_ORDER) {
      if (typeof seam.chain[member.toLowerCase()] !== 'boolean') {
        return deny(
          FM_CODES.INVALID_CHAIN_MEMBER,
          `seam.chain.${member.toLowerCase()} must be a boolean (opaque observation only)`
        );
      }
    }

    if (seam.chainOrder === undefined || seam.chainOrder === null) {
      return deny(FM_CODES.MISSING_CHAIN_ORDER, 'seam.chainOrder is required');
    }

    if (!isValidChainOrder(seam.chainOrder)) {
      return deny(
        FM_CODES.INVALID_CHAIN_ORDER,
        `seam.chainOrder must be exactly ${JSON.stringify(FM_CHAIN_ORDER)}`
      );
    }

    if (seam.satelliteSpecs === undefined || seam.satelliteSpecs === null) {
      return deny(FM_CODES.MISSING_SATELLITE_SPECS, 'seam.satelliteSpecs is required');
    }

    if (!isValidSatelliteSpecs(seam.satelliteSpecs)) {
      return deny(
        FM_CODES.INVALID_SATELLITE_SPECS,
        `seam.satelliteSpecs must be exactly ${JSON.stringify(FM_SATELLITE_SPECS)}`
      );
    }

    if (seam.seamClass === undefined || seam.seamClass === null || seam.seamClass === '') {
      return deny(FM_CODES.MISSING_SEAM_CLASS, 'seam.seamClass is required');
    }

    if (!isValidSeamClass(seam.seamClass)) {
      return deny(FM_CODES.INVALID_SEAM_CLASS, 'seam.seamClass must be a non-empty string');
    }

    if (seam.desiredSeal === undefined || seam.desiredSeal === null || seam.desiredSeal === '') {
      return deny(FM_CODES.MISSING_DESIRED_SEAL, 'seam.desiredSeal is required (SEAM_PACK|HOLD)');
    }

    if (!isValidDesiredSeal(seam.desiredSeal)) {
      return deny(FM_CODES.INVALID_DESIRED_SEAL, 'seam.desiredSeal must be one of SEAM_PACK|HOLD');
    }

    if (seam.observedChainComplete === undefined || seam.observedChainComplete === null) {
      return deny(FM_CODES.MISSING_OBSERVED_CHAIN_COMPLETE, 'seam.observedChainComplete is required');
    }

    if (typeof seam.observedChainComplete !== 'boolean') {
      return deny(FM_CODES.INVALID_OBSERVED_CHAIN_COMPLETE, 'seam.observedChainComplete must be a boolean');
    }

    const humanGateHeld = seam.humanGateHeld === true || plan.humanGateHeld === true;

    if (seam.closeoutClaimed === true && !humanGateHeld) {
      return deny(
        FM_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        'L41 closeout claimed without humanGateHeld. Automatic L41 closeout is forbidden.'
      );
    }

    if (seam.desiredSeal === 'HOLD') {
      return hold('desiredSeal is HOLD — no-op HOLD; no seam-pack consolidation executed.');
    }

    const chainIncomplete = FM_CHAIN_ORDER.some((member) => seam.chain[member.toLowerCase()] !== true);

    if (chainIncomplete || seam.observedChainComplete !== true) {
      return hold(
        'Chain is partial — no-op HOLD. FM never seals a false SEAM_PACK over an incomplete satellite chain.'
      );
    }

    if (plan.autoSeal === true && !humanGateHeld) {
      return deny(FM_CODES.AUTO_SEAL_FORBIDDEN, 'Auto-seal is forbidden without human gate holding.');
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FM_CODES.OK,
      reason:
        'Plan satisfies all Ladder 41 seam-pack consolidation preconditions (≠ tip-refresh ≠ tip-seal ≠ Formal L41 CLOSED ≠ PRODUCTION_READY).'
    };
  }
}

void FM_POLICY_GATE_PRODUCTION_READY;
