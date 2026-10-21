/**
 * @module bidirectional-mismatch-quarantine-deny-policy-gate
 * SPEC-0173 / Mission FK — Policy Gate for Bidirectional Mismatch Quarantine / Deny Port.
 * Pure Layer-0 Node.js. Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed
 *   Freeze soft-observe: pin 038a9a4 (do NOT rewrite tip pins)
 *   Mismatch:
 *     - Consumes opaque FI correlation binding (correlationId + bindingId)
 *     - Consumes opaque FJ round-trip verdict refs (roundTripId + requestId + replyId)
 *     - Requires requestDigest + replyDigest (64-hex sha256) + mismatchClass
 *     - Requires desiredDisposition (QUARANTINE|DENY|HOLD)
 *     - Requires hermetic observedVerdict (VERIFIED|MISMATCH|HOLD)
 *     - authorized must be true for PASS
 *   PASS requires observedVerdict === MISMATCH + desiredDisposition QUARANTINE|DENY.
 *   VERIFIED / HOLD verdict => no-op HOLD (never a false quarantine).
 *   Refuse live HTTP egress / wall-clock authority / tip-refresh authority / FI/FJ/FL elevate /
 *     raw mismatch secret material
 *   Refuse PRODUCTION_READY flip / L30–L40 reopen / L41 auto-close (FL–FM pending) /
 *     tip-pin rewrite / schema-json add / GHE / CloudAgent / mass prune / network writes
 *   schemas AT_CEILING 35/35
 */

import {
  FK_PRODUCTION_READY,
  FK_FREEZE_PIN_SHORT,
  FK_DISPOSITIONS,
  FK_VERDICTS
} from './bidirectional-mismatch-quarantine-deny-receipt.js';

/** @type {'NO'} */
export const FK_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FK_POLICY_GATE_KIND = 'eos-bidirectional-mismatch-quarantine-deny-policy-gate';

export const FK_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'FI_BINDING_INSPECT',
  'FJ_VERDICT_INSPECT',
  'MISMATCH_CLASSIFY',
  'QUARANTINE_DENY_SEAL',
  'SEAL'
]);

export const FK_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISMATCH_UNAUTHORIZED: 'MISMATCH_UNAUTHORIZED',
  INVALID_MISMATCH_CLAIM: 'INVALID_MISMATCH_CLAIM',
  VERDICT_INCONSISTENT: 'VERDICT_INCONSISTENT',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_MISMATCH: 'MISSING_MISMATCH',
  INVALID_MISMATCH: 'INVALID_MISMATCH',
  MISSING_CORRELATION_ID: 'MISSING_CORRELATION_ID',
  MISSING_BINDING_ID: 'MISSING_BINDING_ID',
  MISSING_ROUND_TRIP_ID: 'MISSING_ROUND_TRIP_ID',
  MISSING_REQUEST_ID: 'MISSING_REQUEST_ID',
  MISSING_REPLY_ID: 'MISSING_REPLY_ID',
  MISSING_REQUEST_DIGEST: 'MISSING_REQUEST_DIGEST',
  MISSING_REPLY_DIGEST: 'MISSING_REPLY_DIGEST',
  INVALID_REQUEST_DIGEST: 'INVALID_REQUEST_DIGEST',
  INVALID_REPLY_DIGEST: 'INVALID_REPLY_DIGEST',
  MISSING_MISMATCH_CLASS: 'MISSING_MISMATCH_CLASS',
  MISSING_DESIRED_DISPOSITION: 'MISSING_DESIRED_DISPOSITION',
  INVALID_DESIRED_DISPOSITION: 'INVALID_DESIRED_DISPOSITION',
  MISSING_OBSERVED_VERDICT: 'MISSING_OBSERVED_VERDICT',
  INVALID_OBSERVED_VERDICT: 'INVALID_OBSERVED_VERDICT',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN: 'RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FI_AS_QUARANTINE_FORBIDDEN: 'FI_AS_QUARANTINE_FORBIDDEN',
  FJ_AS_QUARANTINE_FORBIDDEN: 'FJ_AS_QUARANTINE_FORBIDDEN',
  FL_AS_QUARANTINE_FORBIDDEN: 'FL_AS_QUARANTINE_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
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
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
  NETWORK_WRITE_FORBIDDEN: 'NETWORK_WRITE_FORBIDDEN',
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
  /^mismatch[_-]?secret$/i,
  /^quarantine[_-]?secret$/i,
  /^request[_-]?hmac$/i,
  /^reply[_-]?hmac$/i,
  /^request[_-]?payload$/i,
  /^reply[_-]?payload$/i,
  /^raw[_-]?request[_-]?payload$/i,
  /^raw[_-]?reply[_-]?payload$/i,
  /^quarantine[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i
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
  /rm\s+-rf/i,
  /\bunlinkSync\b/i,
  /\bdestructive\s+delete\b/i
];

const MASS_PRUNE_PATTERNS = [
  /\bmass[-_]?prune\b/i,
  /\bbulk[-_]?prune\b/i,
  /\bprune\s+all\b/i,
  /\bexecute\s+prune\b/i,
  /\brun\s+prune\s+now\b/i,
  /\bperform\s+mass\s+delete\b/i
];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:git\s+)?tip/i,
  /force[-_]?push\s+main/i,
  /rebase[-_]?origin[-_]?main/i,
  /git\s+reset\s+--hard\s+origin/i,
  /modify\s+historical\s+tip/i,
  /rewrite\s+freeze\s+tip/i,
  /advance\s+EXPECTED_TIP/i
];

const SCHEMA_JSON_PATTERNS = [
  /docs\/schemas\/.*\.json/i,
  /add\s+(?:new\s+)?schema\s+json/i,
  /create\s+docs\/schemas/i,
  /schemas?\s+AT_CEILING\s+bypass/i,
  /raise\s+schema\s+ceiling/i
];

const NETWORK_WRITE_PATTERNS = [
  /\bnetwork\s+write\b/i,
  /\bhttp\s+(?:post|put|patch)\b/i,
  /\bfetch\s*\(/i,
  /\baxios\./i,
  /\bremote\s+dispatch\b/i
];

const GHE_PATTERNS = [
  /\bGHE\b/,
  /GitHub\s+Enterprise/i,
  /claim\s+GHA\s+green/i,
  /enterprise\s+branch\s+protection\s+enforced/i
];

const LIVE_HTTP_EGRESS_PATTERNS = [
  /\blive\s+HTTP\s+egress\b/i,
  /\blive\s+http\s+egress\b/i,
  /\blive\s+quarantine\s+dispatch\b/i,
  /\blive\s+outbound\s+delivery\b/i,
  /\blive\s+network\s+egress\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?HTTP\s+egress/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /\bwall[-_]?clock\s+authority\b/i,
  /\bwall[-_]?clock\s+rollout\s+authority\b/i,
  /\bDate\.now\s+as\s+(?:rollout\s+)?authority\b/i,
  /\blive\s+wall[-_]?clock\b/i,
  /\bclaim(?:ing)?\s+wall[-_]?clock(?:\s+authority|\s+rollout)?/i
];

const TIP_REFRESH_AUTHORITY_PATTERNS = [
  /\btip[-_]?refresh\s+authority\b/i,
  /\btip[-_]?refresh\s+as\s+authority\b/i,
  /\bclaim(?:ing)?\s+tip[-_]?refresh\b/i,
  /\badvance\s+EXPECTED_TIP\s+from\s+this\s+mission\b/i
];

const RAW_MISMATCH_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+request\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+reply\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+mismatch\s+(?:secret|hmac|payload)\b/i,
  /\bseal\s+(?:the\s+)?(?:request|reply|mismatch)\s+secret\b/i,
  /\bcopy\s+(?:request|reply)\s+payload\s+into\s+quarantine\b/i,
  /\bquarantine\s+(?:the\s+)?raw\s+payload\b/i
];

const FI_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?quarantine\s+(?:deny\s+)?port\b/i,
  /\bfi\s+correlation\s+registry\s+as\s+(?:the\s+)?quarantine\s+port\b/i,
  /\belevate\s+fi\s+(?:to\s+)?quarantine\b/i
];

const FJ_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fj\s+(?:the\s+)?quarantine\s+(?:deny\s+)?port\b/i,
  /\bfj\s+round[-_]?trip\s+as\s+(?:the\s+)?quarantine\s+port\b/i,
  /\belevate\s+fj\s+(?:to\s+)?quarantine\b/i
];

const FL_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fl\s+(?:the\s+)?quarantine\s+(?:deny\s+)?port\b/i,
  /\bfl\s+honesty\s+attestation\s+as\s+(?:the\s+)?quarantine\s+port\b/i,
  /\belevate\s+fl\s+(?:to\s+)?quarantine\b/i
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
export const claimsSchemaJsonAdd = (v) => claimsAny(v, SCHEMA_JSON_PATTERNS);
export const claimsNetworkWrite = (v) => claimsAny(v, NETWORK_WRITE_PATTERNS);
export const claimsGhe = (v) => claimsAny(v, GHE_PATTERNS);
export const claimsLiveHttpEgress = (v) => claimsAny(v, LIVE_HTTP_EGRESS_PATTERNS);
export const claimsWallClockAuthority = (v) => claimsAny(v, WALL_CLOCK_AUTHORITY_PATTERNS);
export const claimsTipRefreshAuthority = (v) => claimsAny(v, TIP_REFRESH_AUTHORITY_PATTERNS);
export const claimsRawMismatchSecretMaterial = (v) =>
  claimsAny(v, RAW_MISMATCH_SECRET_MATERIAL_PATTERNS);
export const claimsFiAsQuarantine = (v) => claimsAny(v, FI_AS_QUARANTINE_PATTERNS);
export const claimsFjAsQuarantine = (v) => claimsAny(v, FJ_AS_QUARANTINE_PATTERNS);
export const claimsFlAsQuarantine = (v) => claimsAny(v, FL_AS_QUARANTINE_PATTERNS);

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
export const claimsL31Reopen = (v) => claimsLadderReopen(v, 31);
export const claimsL32Reopen = (v) => claimsLadderReopen(v, 32);
export const claimsL33Reopen = (v) => claimsLadderReopen(v, 33);
export const claimsL34Reopen = (v) => claimsLadderReopen(v, 34);
export const claimsL35Reopen = (v) => claimsLadderReopen(v, 35);
export const claimsL36Reopen = (v) => claimsLadderReopen(v, 36);
export const claimsL37Reopen = (v) => claimsLadderReopen(v, 37);
export const claimsL38Reopen = (v) => claimsLadderReopen(v, 38);
export const claimsL39Reopen = (v) => claimsLadderReopen(v, 39);
export const claimsL40Reopen = (v) => claimsLadderReopen(v, 40);

const L41_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
  /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i,
  /close\s+l(?:adder)?[\s_-]*41\s+now/i
];

export const claimsL41AutoClose = (v) => claimsAny(v, L41_AUTO_CLOSE_PATTERNS);

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidDisposition(value) {
  return typeof value === 'string' && FK_DISPOSITIONS.includes(value);
}

export function isValidVerdict(value) {
  return typeof value === 'string' && FK_VERDICTS.includes(value);
}

export function isValidSha256Hex(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}


export class BidirectionalMismatchQuarantineDenyPolicyGate {
  /**
   * Evaluates preconditions for the mismatch quarantine/deny ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    const deny = (code, reason) => ({ ok: false, decision: 'DENY', code, reason });
    const hold = (reason) => ({ ok: true, decision: 'HOLD', code: FK_CODES.HOLD, reason });

    if (!plan || typeof plan !== 'object') {
      return deny(FK_CODES.DENY, 'Invalid plan: input must be an object');
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return deny(FK_CODES.MISSING_PLAN_ID, 'Missing planId in input');
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return deny(FK_CODES.MISSING_CHANGE_ID, 'Missing changeId in input');
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return deny(
        FK_CODES.FUNDACION_DENIED,
        'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return deny(
        FK_CODES.SECRET_FIELD_FORBIDDEN,
        `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque FI/FJ ids, classes, verdicts and digests of non-secret metadata only.`
      );
    }

    if (scanForSecrets(planClean)) {
      return deny(
        FK_CODES.SECRET_LEAK_FORBIDDEN,
        'Plan contains potential plain secret token. Law VI absolute rejection.'
      );
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return deny(FK_CODES.HARD_DELETE_FORBIDDEN, 'Hard delete / purge operations are strictly forbidden in EOS governance.');
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return deny(FK_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune operations are strictly forbidden.');
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return deny(FK_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.');
    }

    for (let ladder = 30; ladder <= 40; ladder += 1) {
      if (plan[`reopenL${ladder}`] === true || claimsLadderReopen(planClean, ladder)) {
        return deny(
          FK_CODES[`L${ladder}_REOPEN_FORBIDDEN`],
          `Attempted to reopen Ladder ${ladder}. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.`
        );
      }
    }

    if (plan.autoCloseL41 === true || claimsL41AutoClose(planClean)) {
      return deny(FK_CODES.L41_AUTO_CLOSE_FORBIDDEN, 'L41 auto-close is refused. FL–FM remain pending; L41 closure is a separate governed act.');
    }

    if (plan.tipRewrite === true || claimsTipRewrite(planClean)) {
      return deny(FK_CODES.TIP_REWRITE_FORBIDDEN, 'Tip-pin rewrite is refused. Soft-observe pin 038a9a4 only.');
    }

    if (plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return deny(FK_CODES.SCHEMA_JSON_ADD_FORBIDDEN, 'Schema JSON add is refused. schemas AT_CEILING 35/35.');
    }

    if (plan.networkWrite === true || claimsNetworkWrite(planClean)) {
      return deny(FK_CODES.NETWORK_WRITE_FORBIDDEN, 'Network write is refused. Hermetic in-memory only.');
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return deny(FK_CODES.GHE_CLAIM_FORBIDDEN, 'GHE / enterprise enforcement claims are refused.');
    }


    if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
      return deny(FK_CODES.LIVE_HTTP_EGRESS_FORBIDDEN, 'Live HTTP egress is refused. PASS seals a hermetic quarantine/deny decision only.');
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return deny(FK_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN, 'Wall-clock authority is refused. Inject observedVerdict hermetically.');
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return deny(FK_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN, 'Tip-refresh authority is refused. Soft-observe pin 038a9a4 only; tip-refresh is SEPARATE.');
    }

    if (plan.rawSecretMaterial === true || plan.sealSecret === true || claimsRawMismatchSecretMaterial(planClean)) {
      return deny(
        FK_CODES.RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN,
        'Raw mismatch secret / HMAC / request-reply payload material in quarantine records is refused (Law VI). Seal opaque ids, classes, verdicts and digests only.'
      );
    }

    if (plan.fiAsQuarantine === true || claimsFiAsQuarantine(planClean)) {
      return deny(FK_CODES.FI_AS_QUARANTINE_FORBIDDEN, 'FI correlation registry as the quarantine port is refused. FK acts on FJ verdicts; it does not reopen or replace FI.');
    }

    if (plan.fjAsQuarantine === true || claimsFjAsQuarantine(planClean)) {
      return deny(FK_CODES.FJ_AS_QUARANTINE_FORBIDDEN, 'FJ round-trip integrity as the quarantine port is refused. FK consumes FJ verdicts; FJ stays integrity-only.');
    }

    if (plan.flAsQuarantine === true || claimsFlAsQuarantine(planClean)) {
      return deny(FK_CODES.FL_AS_QUARANTINE_FORBIDDEN, 'FL honesty attestation as the quarantine port is refused. FL is the next satellite; FK does not attest.');
    }

    if (plan.ritualMode === 'HOLD') {
      return hold('Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.');
    }

    if (plan.ritualMode !== undefined && !['ACTIVE', 'DRY_RUN'].includes(plan.ritualMode)) {
      return deny(FK_CODES.INVALID_RITUAL_MODE, 'ritualMode must be ACTIVE|HOLD|DRY_RUN when provided');
    }

    if (!plan.mismatch) {
      return deny(FK_CODES.MISSING_MISMATCH, 'Missing mismatch in active ritual mode');
    }

    if (typeof plan.mismatch !== 'object' || Array.isArray(plan.mismatch)) {
      return deny(FK_CODES.INVALID_MISMATCH, 'mismatch must be a non-null object');
    }


    const mm = plan.mismatch;

    const requiredString = [
      ['correlationId', FK_CODES.MISSING_CORRELATION_ID, 'mismatch.correlationId (opaque FI binding) is required'],
      ['bindingId', FK_CODES.MISSING_BINDING_ID, 'mismatch.bindingId (opaque FI binding) is required'],
      ['roundTripId', FK_CODES.MISSING_ROUND_TRIP_ID, 'mismatch.roundTripId (opaque FJ verdict) is required'],
      ['requestId', FK_CODES.MISSING_REQUEST_ID, 'mismatch.requestId (opaque FJ request handle) is required'],
      ['replyId', FK_CODES.MISSING_REPLY_ID, 'mismatch.replyId (opaque FJ reply handle) is required'],
      ['mismatchClass', FK_CODES.MISSING_MISMATCH_CLASS, 'mismatch.mismatchClass is required']
    ];

    for (const [field, code, reason] of requiredString) {
      if (!mm[field] || typeof mm[field] !== 'string' || !mm[field].trim()) {
        return deny(code, reason);
      }
    }

    if (!mm.requestDigest || typeof mm.requestDigest !== 'string' || !mm.requestDigest.trim()) {
      return deny(FK_CODES.MISSING_REQUEST_DIGEST, 'mismatch.requestDigest is required');
    }

    if (!mm.replyDigest || typeof mm.replyDigest !== 'string' || !mm.replyDigest.trim()) {
      return deny(FK_CODES.MISSING_REPLY_DIGEST, 'mismatch.replyDigest is required');
    }

    if (!isValidSha256Hex(mm.requestDigest)) {
      return deny(FK_CODES.INVALID_REQUEST_DIGEST, 'mismatch.requestDigest must be a 64-hex sha256 digest');
    }

    if (!isValidSha256Hex(mm.replyDigest)) {
      return deny(FK_CODES.INVALID_REPLY_DIGEST, 'mismatch.replyDigest must be a 64-hex sha256 digest');
    }

    if (
      mm.desiredDisposition === undefined ||
      mm.desiredDisposition === null ||
      mm.desiredDisposition === ''
    ) {
      return deny(
        FK_CODES.MISSING_DESIRED_DISPOSITION,
        'mismatch.desiredDisposition is required (QUARANTINE|DENY|HOLD)'
      );
    }

    if (!isValidDisposition(mm.desiredDisposition)) {
      return deny(
        FK_CODES.INVALID_DESIRED_DISPOSITION,
        'mismatch.desiredDisposition must be one of QUARANTINE|DENY|HOLD'
      );
    }

    if (
      mm.observedVerdict === undefined ||
      mm.observedVerdict === null ||
      mm.observedVerdict === ''
    ) {
      return deny(
        FK_CODES.MISSING_OBSERVED_VERDICT,
        'mismatch.observedVerdict is required (VERIFIED|MISMATCH|HOLD)'
      );
    }

    if (!isValidVerdict(mm.observedVerdict)) {
      return deny(
        FK_CODES.INVALID_OBSERVED_VERDICT,
        'mismatch.observedVerdict must be one of VERIFIED|MISMATCH|HOLD'
      );
    }

    if (mm.authorized !== true) {
      return deny(
        FK_CODES.MISMATCH_UNAUTHORIZED,
        'Fail-closed mismatch DENY — hermetic quarantine claim unauthorized (≠ FI registry; ≠ FJ integrity; ≠ FL attestation).'
      );
    }

    if (mm.observedVerdict === 'VERIFIED') {
      return hold('No mismatch observed (VERIFIED) — no-op HOLD; FK never issues a false quarantine.');
    }

    if (mm.observedVerdict === 'HOLD') {
      return hold('Observed verdict is HOLD — no-op HOLD; FK requires an explicit MISMATCH verdict for quarantine/deny.');
    }

    if (mm.observedVerdict !== 'MISMATCH') {
      return deny(
        FK_CODES.VERDICT_INCONSISTENT,
        'Fail-closed mismatch DENY — observedVerdict is inconsistent with a quarantine/deny decision.'
      );
    }

    if (mm.desiredDisposition === 'HOLD') {
      return hold('desiredDisposition is HOLD — no-op HOLD; no quarantine/deny executed.');
    }

    if (mm.desiredDisposition !== 'QUARANTINE' && mm.desiredDisposition !== 'DENY') {
      return deny(
        FK_CODES.INVALID_MISMATCH_CLAIM,
        'Fail-closed mismatch DENY — desiredDisposition must be QUARANTINE or DENY for a mismatch decision.'
      );
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return deny(FK_CODES.AUTO_SEAL_FORBIDDEN, 'Auto-seal is forbidden without human gate holding.');
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FK_CODES.OK,
      reason:
        'Plan satisfies all mismatch quarantine/deny governance preconditions (≠ FI registry ≠ FJ integrity ≠ FL attestation ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FK_PRODUCTION_READY;
void FK_FREEZE_PIN_SHORT;

