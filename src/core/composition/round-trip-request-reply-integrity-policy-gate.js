/**
 * @module round-trip-request-reply-integrity-policy-gate
 * SPEC-0172 / Mission FJ — Policy Gate for Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js. Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed
 *   Freeze soft-observe: pin 8903b57 (do NOT rewrite tip pins)
 *   Round trip:
 *     - Consumes opaque FI correlation binding (correlationId + bindingId)
 *     - Requires opaque requestId + replyId + requestDigest + replyDigest (sha256 hex)
 *     - Requires correlationClass + integrityClass + desiredIntegrity (VERIFIED|MISMATCH|HOLD)
 *     - Optional observedIntegrity (hermetic injected handle state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Refuse live HTTP egress / wall-clock authority / tip-refresh authority / FI-as-round-trip /
 *     FK quarantine-as-round-trip / raw round-trip secret material
 *   Refuse PRODUCTION_READY flip / L30–L40 reopen / L41 auto-close (FK–FM pending) /
 *     tip-pin rewrite / schema-json add / GHE / CloudAgent / mass prune / network writes
 *   schemas AT_CEILING 35/35
 */

import {
  FJ_PRODUCTION_READY,
  FJ_FREEZE_PIN_SHORT,
  FJ_INTEGRITY_STATES
} from './round-trip-request-reply-integrity-receipt.js';

/** @type {'NO'} */
export const FJ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FJ_POLICY_GATE_KIND = 'eos-round-trip-request-reply-integrity-policy-gate';

export const FJ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'FI_BINDING_INSPECT',
  'REQUEST_DIGEST_INSPECT',
  'REPLY_DIGEST_INSPECT',
  'ROUND_TRIP_INTEGRITY_SEAL',
  'SEAL'
]);

export const FJ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  ROUND_TRIP_UNAUTHORIZED: 'ROUND_TRIP_UNAUTHORIZED',
  INTEGRITY_MISMATCH: 'INTEGRITY_MISMATCH',
  INTEGRITY_CHAIN_MISMATCH: 'INTEGRITY_CHAIN_MISMATCH',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ROUND_TRIP: 'MISSING_ROUND_TRIP',
  INVALID_ROUND_TRIP: 'INVALID_ROUND_TRIP',
  MISSING_CORRELATION_ID: 'MISSING_CORRELATION_ID',
  MISSING_BINDING_ID: 'MISSING_BINDING_ID',
  MISSING_REQUEST_ID: 'MISSING_REQUEST_ID',
  MISSING_REPLY_ID: 'MISSING_REPLY_ID',
  MISSING_REQUEST_DIGEST: 'MISSING_REQUEST_DIGEST',
  MISSING_REPLY_DIGEST: 'MISSING_REPLY_DIGEST',
  INVALID_REQUEST_DIGEST: 'INVALID_REQUEST_DIGEST',
  INVALID_REPLY_DIGEST: 'INVALID_REPLY_DIGEST',
  MISSING_CORRELATION_CLASS: 'MISSING_CORRELATION_CLASS',
  MISSING_INTEGRITY_CLASS: 'MISSING_INTEGRITY_CLASS',
  MISSING_DESIRED_INTEGRITY: 'MISSING_DESIRED_INTEGRITY',
  INVALID_DESIRED_INTEGRITY: 'INVALID_DESIRED_INTEGRITY',
  INVALID_OBSERVED_INTEGRITY: 'INVALID_OBSERVED_INTEGRITY',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN: 'RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FI_AS_ROUND_TRIP_FORBIDDEN: 'FI_AS_ROUND_TRIP_FORBIDDEN',
  FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN: 'FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN',
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

/** Law VI — refuse secret-looking field names fail-closed (never seal secrets). */
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
  /^round[_-]?trip[_-]?secret$/i,
  /^roundtrip[_-]?secret$/i,
  /^request[_-]?hmac$/i,
  /^reply[_-]?hmac$/i,
  /^request[_-]?payload$/i,
  /^reply[_-]?payload$/i,
  /^raw[_-]?request[_-]?payload$/i,
  /^raw[_-]?reply[_-]?payload$/i,
  /^webhook[_-]?payload$/i,
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
  /\blive\s+outbound\s+delivery\b/i,
  /\blive\s+request[-_ ]reply\b/i,
  /\blive\s+network\s+egress\b/i,
  /\bbind\s+live\s+HTTP\s+egress\b/i,
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

const RAW_ROUND_TRIP_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+request\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+reply\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+round[-_]?trip\s+(?:secret|hmac)\b/i,
  /\bseal\s+(?:the\s+)?(?:request|reply|round[-_]?trip)\s+secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:request|reply)\s+(?:payload|secret)\b/i,
  /\bplaintext\s+(?:hmac|request|reply)\s+(?:key|secret)\s+in\s+receipt\b/i
];

const FI_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfi\s+correlation\s+registry\s+as\s+(?:the\s+)?round[-_]?trip\s+port\b/i,
  /\belevate\s+fi\s+(?:to\s+)?round[-_]?trip\s+integrity\b/i
];

const FK_QUARANTINE_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fk\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfk\s+mismatch\s+quarantine\s+as\s+round[-_]?trip\s+integrity\b/i,
  /\belevate\s+fk\s+(?:to\s+)?round[-_]?trip\s+integrity\b/i
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

/**
 * Walk object keys for Law VI secret-looking field names.
 * @param {unknown} val
 * @returns {string|null} offending field name or null
 */
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
  const str = stringifySafe(val);
  return SECRET_PATTERNS.some((pat) => pat.test(str));
}

function claimsAny(val, patterns) {
  if (!val) return false;
  return patterns.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsProductionReadyFlip(val) {
  return claimsAny(val, PR_FLIP_PATTERNS);
}

export function claimsHardDelete(val) {
  return claimsAny(val, HARD_DELETE_PATTERNS);
}

export function claimsMassPrune(val) {
  return claimsAny(val, MASS_PRUNE_PATTERNS);
}

export function claimsTipRewrite(val) {
  return claimsAny(val, TIP_REWRITE_PATTERNS);
}

export function claimsSchemaJsonAdd(val) {
  return claimsAny(val, SCHEMA_JSON_PATTERNS);
}

export function claimsNetworkWrite(val) {
  return claimsAny(val, NETWORK_WRITE_PATTERNS);
}

export function claimsGhe(val) {
  return claimsAny(val, GHE_PATTERNS);
}

export function claimsLiveHttpEgress(val) {
  return claimsAny(val, LIVE_HTTP_EGRESS_PATTERNS);
}

export function claimsWallClockAuthority(val) {
  return claimsAny(val, WALL_CLOCK_AUTHORITY_PATTERNS);
}

export function claimsTipRefreshAuthority(val) {
  return claimsAny(val, TIP_REFRESH_AUTHORITY_PATTERNS);
}

export function claimsRawRoundTripSecretMaterial(val) {
  return claimsAny(val, RAW_ROUND_TRIP_SECRET_MATERIAL_PATTERNS);
}

export function claimsFiAsRoundTrip(val) {
  return claimsAny(val, FI_AS_ROUND_TRIP_PATTERNS);
}

export function claimsFkQuarantineAsRoundTrip(val) {
  return claimsAny(val, FK_QUARANTINE_AS_ROUND_TRIP_PATTERNS);
}

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
  if (!patterns) return false;
  return claimsAny(val, patterns);
}

export function claimsL30Reopen(val) {
  return claimsLadderReopen(val, 30);
}
export function claimsL31Reopen(val) {
  return claimsLadderReopen(val, 31);
}
export function claimsL32Reopen(val) {
  return claimsLadderReopen(val, 32);
}
export function claimsL33Reopen(val) {
  return claimsLadderReopen(val, 33);
}
export function claimsL34Reopen(val) {
  return claimsLadderReopen(val, 34);
}
export function claimsL35Reopen(val) {
  return claimsLadderReopen(val, 35);
}
export function claimsL36Reopen(val) {
  return claimsLadderReopen(val, 36);
}
export function claimsL37Reopen(val) {
  return claimsLadderReopen(val, 37);
}
export function claimsL38Reopen(val) {
  return claimsLadderReopen(val, 38);
}
export function claimsL39Reopen(val) {
  return claimsLadderReopen(val, 39);
}
export function claimsL40Reopen(val) {
  return claimsLadderReopen(val, 40);
}

const L41_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
  /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i,
  /close\s+l(?:adder)?[\s_-]*41\s+now/i
];

export function claimsL41AutoClose(val) {
  return claimsAny(val, L41_AUTO_CLOSE_PATTERNS);
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidIntegrityState(value) {
  return typeof value === 'string' && FJ_INTEGRITY_STATES.includes(value);
}

export function isValidSha256Hex(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}


export class RoundTripRequestReplyIntegrityPolicyGate {
  /**
   * Evaluates preconditions for the round-trip / request-reply integrity ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    const deny = (code, reason) => ({ ok: false, decision: 'DENY', code, reason });

    if (!plan || typeof plan !== 'object') {
      return deny(FJ_CODES.DENY, 'Invalid plan: input must be an object');
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return deny(FJ_CODES.MISSING_PLAN_ID, 'Missing planId in input');
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return deny(FJ_CODES.MISSING_CHANGE_ID, 'Missing changeId in input');
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return deny(
        FJ_CODES.FUNDACION_DENIED,
        'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return deny(
        FJ_CODES.SECRET_FIELD_FORBIDDEN,
        `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque correlation/request/reply ids, classes and digests of non-secret metadata only.`
      );
    }

    if (scanForSecrets(planClean)) {
      return deny(
        FJ_CODES.SECRET_LEAK_FORBIDDEN,
        'Plan contains potential plain secret token. Law VI absolute rejection.'
      );
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return deny(
        FJ_CODES.HARD_DELETE_FORBIDDEN,
        'Hard delete / purge operations are strictly forbidden in EOS governance.'
      );
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return deny(FJ_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune operations are strictly forbidden.');
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return deny(
        FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      );
    }

    for (let ladder = 30; ladder <= 40; ladder += 1) {
      if (plan[`reopenL${ladder}`] === true || claimsLadderReopen(planClean, ladder)) {
        return deny(
          FJ_CODES[`L${ladder}_REOPEN_FORBIDDEN`],
          `Attempted to reopen Ladder ${ladder}. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.`
        );
      }
    }

    if (plan.autoCloseL41 === true || claimsL41AutoClose(planClean)) {
      return deny(
        FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        'L41 auto-close is refused. FK–FM remain pending; L41 closure is a separate governed act.'
      );
    }

    if (plan.tipRewrite === true || claimsTipRewrite(planClean)) {
      return deny(
        FJ_CODES.TIP_REWRITE_FORBIDDEN,
        'Tip-pin rewrite is refused. Soft-observe pin 8903b57 only.'
      );
    }

    if (plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return deny(
        FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        'Schema JSON add is refused. schemas AT_CEILING 35/35.'
      );
    }

    if (plan.networkWrite === true || claimsNetworkWrite(planClean)) {
      return deny(
        FJ_CODES.NETWORK_WRITE_FORBIDDEN,
        'Network write is refused. Hermetic in-memory only.'
      );
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return deny(FJ_CODES.GHE_CLAIM_FORBIDDEN, 'GHE / enterprise enforcement claims are refused.');
    }


    if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
      return deny(
        FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
        'Live HTTP egress is refused. PASS seals a hermetic round-trip integrity receipt only — inject observedIntegrity; do not bind live request/reply transport.'
      );
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return deny(
        FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        'Wall-clock authority is refused. Inject observedIntegrity hermetically; do not use Date.now as authority.'
      );
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return deny(
        FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        'Tip-refresh authority is refused. Soft-observe pin 8903b57 only; tip-refresh is SEPARATE.'
      );
    }

    if (
      plan.rawSecretMaterial === true ||
      plan.sealSecret === true ||
      claimsRawRoundTripSecretMaterial(planClean)
    ) {
      return deny(
        FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN,
        'Raw round-trip secret / HMAC / request-reply payload material in receipts is refused (Law VI). Seal opaque ids, classes and digests only.'
      );
    }

    if (plan.fiAsRoundTrip === true || plan.fiAsRoundTripPort === true || claimsFiAsRoundTrip(planClean)) {
      return deny(
        FJ_CODES.FI_AS_ROUND_TRIP_FORBIDDEN,
        'FI correlation registry as the round-trip port is refused. FJ consumes the opaque FI binding; it does not reopen or replace FI.'
      );
    }

    if (plan.fkQuarantineAsRoundTrip === true || claimsFkQuarantineAsRoundTrip(planClean)) {
      return deny(
        FJ_CODES.FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN,
        'FK mismatch quarantine as the round-trip port is refused. FK is the next satellite; FJ is integrity verification only.'
      );
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (plan.ritualMode !== undefined && !['ACTIVE', 'DRY_RUN'].includes(plan.ritualMode)) {
      return deny(
        FJ_CODES.INVALID_RITUAL_MODE,
        'ritualMode must be ACTIVE|HOLD|DRY_RUN when provided'
      );
    }

    if (!plan.roundTrip) {
      return deny(FJ_CODES.MISSING_ROUND_TRIP, 'Missing roundTrip in active ritual mode');
    }

    if (typeof plan.roundTrip !== 'object' || Array.isArray(plan.roundTrip)) {
      return deny(FJ_CODES.INVALID_ROUND_TRIP, 'roundTrip must be a non-null object');
    }


    const rt = plan.roundTrip;

    const requiredString = [
      ['correlationId', FJ_CODES.MISSING_CORRELATION_ID, 'roundTrip.correlationId (opaque FI binding) is required'],
      ['bindingId', FJ_CODES.MISSING_BINDING_ID, 'roundTrip.bindingId (opaque FI binding) is required'],
      ['requestId', FJ_CODES.MISSING_REQUEST_ID, 'roundTrip.requestId (opaque request handle) is required'],
      ['replyId', FJ_CODES.MISSING_REPLY_ID, 'roundTrip.replyId (opaque reply handle) is required'],
      ['correlationClass', FJ_CODES.MISSING_CORRELATION_CLASS, 'roundTrip.correlationClass is required'],
      ['integrityClass', FJ_CODES.MISSING_INTEGRITY_CLASS, 'roundTrip.integrityClass is required']
    ];

    for (const [field, code, reason] of requiredString) {
      if (!rt[field] || typeof rt[field] !== 'string' || !rt[field].trim()) {
        return deny(code, reason);
      }
    }

    if (!rt.requestDigest || typeof rt.requestDigest !== 'string' || !rt.requestDigest.trim()) {
      return deny(FJ_CODES.MISSING_REQUEST_DIGEST, 'roundTrip.requestDigest is required');
    }

    if (!rt.replyDigest || typeof rt.replyDigest !== 'string' || !rt.replyDigest.trim()) {
      return deny(FJ_CODES.MISSING_REPLY_DIGEST, 'roundTrip.replyDigest is required');
    }

    if (!isValidSha256Hex(rt.requestDigest)) {
      return deny(FJ_CODES.INVALID_REQUEST_DIGEST, 'roundTrip.requestDigest must be a 64-hex sha256 digest');
    }

    if (!isValidSha256Hex(rt.replyDigest)) {
      return deny(FJ_CODES.INVALID_REPLY_DIGEST, 'roundTrip.replyDigest must be a 64-hex sha256 digest');
    }

    if (rt.desiredIntegrity === undefined || rt.desiredIntegrity === null || rt.desiredIntegrity === '') {
      return deny(
        FJ_CODES.MISSING_DESIRED_INTEGRITY,
        'roundTrip.desiredIntegrity is required (VERIFIED|MISMATCH|HOLD)'
      );
    }

    if (!isValidIntegrityState(rt.desiredIntegrity)) {
      return deny(
        FJ_CODES.INVALID_DESIRED_INTEGRITY,
        'roundTrip.desiredIntegrity must be one of VERIFIED|MISMATCH|HOLD'
      );
    }

    if (
      rt.observedIntegrity !== undefined &&
      rt.observedIntegrity !== null &&
      !isValidIntegrityState(rt.observedIntegrity)
    ) {
      return deny(
        FJ_CODES.INVALID_OBSERVED_INTEGRITY,
        'roundTrip.observedIntegrity must be one of VERIFIED|MISMATCH|HOLD when provided (hermetic injection)'
      );
    }

    if (rt.authorized !== true) {
      return deny(
        FJ_CODES.ROUND_TRIP_UNAUTHORIZED,
        'Fail-closed round-trip DENY — hermetic integrity claim unauthorized (≠ FI registry; ≠ FK quarantine).'
      );
    }

    if (
      rt.observedIntegrity !== undefined &&
      rt.observedIntegrity !== null &&
      rt.observedIntegrity !== rt.desiredIntegrity
    ) {
      return deny(
        FJ_CODES.INTEGRITY_MISMATCH,
        'Fail-closed round-trip DENY — hermetic observedIntegrity mismatches desiredIntegrity (invalid integrity claim).'
      );
    }

    if (rt.desiredIntegrity !== 'VERIFIED') {
      return deny(
        FJ_CODES.INTEGRITY_MISMATCH,
        'Fail-closed round-trip DENY — desiredIntegrity is not VERIFIED; PASS requires VERIFIED round-trip integrity.'
      );
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return deny(FJ_CODES.AUTO_SEAL_FORBIDDEN, 'Auto-seal is forbidden without human gate holding.');
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Plan satisfies all round-trip / request-reply integrity governance preconditions (≠ FI registry ≠ FK quarantine ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FJ_PRODUCTION_READY;
void FJ_FREEZE_PIN_SHORT;

