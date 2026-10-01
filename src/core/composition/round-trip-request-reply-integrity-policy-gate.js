/**
 * @module round-trip-request-reply-integrity-policy-gate
 * SPEC-0172 / Mission FJ — Policy Gate for Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   RoundTrip:
 *     - Requires correlationId (FI) + requestId + replyId + ingressId + sourceId (L39)
 *       + targetId + deliveryId (L40) + integrityClass + desiredVerdict (INTACT|BROKEN|HOLD)
 *     - Optional observedVerdict (hermetic injected integrity state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedVerdict only — no live HTTP egress, no wall-clock authority,
 *     no tip-refresh authority, no raw request/reply payload secret material
 *   Distinct from FI correlation registry, EY ingress, FD outbound, FK quarantine
 *   Distinct from Canary/Fundacion delivery
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30–L40 reopen
 *   Refuse L41 auto-close (FK–FM pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  FJ_PRODUCTION_READY,
  FJ_FREEZE_PIN_SHORT,
  FJ_VERDICT_STATES
} from './round-trip-request-reply-integrity-receipt.js';

/** @type {'NO'} */
export const FJ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FJ_POLICY_GATE_KIND = 'eos-round-trip-request-reply-integrity-policy-gate';

export const FJ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'INTEGRITY_INSPECT',
  'INGRESS_REF_SEAL',
  'OUTBOUND_REF_SEAL',
  'INTEGRITY_SEAL',
  'SEAL'
]);

export const FJ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  INTEGRITY_UNAUTHORIZED: 'INTEGRITY_UNAUTHORIZED',
  INVALID_INTEGRITY_CLAIM: 'INVALID_INTEGRITY_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ROUND_TRIP: 'MISSING_ROUND_TRIP',
  INVALID_ROUND_TRIP: 'INVALID_ROUND_TRIP',
  MISSING_CORRELATION_ID: 'MISSING_CORRELATION_ID',
  MISSING_REQUEST_ID: 'MISSING_REQUEST_ID',
  MISSING_REPLY_ID: 'MISSING_REPLY_ID',
  MISSING_INGRESS_ID: 'MISSING_INGRESS_ID',
  MISSING_SOURCE_ID: 'MISSING_SOURCE_ID',
  MISSING_TARGET_ID: 'MISSING_TARGET_ID',
  MISSING_DELIVERY_ID: 'MISSING_DELIVERY_ID',
  MISSING_INTEGRITY_CLASS: 'MISSING_INTEGRITY_CLASS',
  MISSING_DESIRED_VERDICT: 'MISSING_DESIRED_VERDICT',
  INVALID_DESIRED_VERDICT: 'INVALID_DESIRED_VERDICT',
  INVALID_OBSERVED_VERDICT: 'INVALID_OBSERVED_VERDICT',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_INTEGRITY_SECRET_MATERIAL_FORBIDDEN: 'RAW_INTEGRITY_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  EY_INGRESS_AS_INTEGRITY_FORBIDDEN: 'EY_INGRESS_AS_INTEGRITY_FORBIDDEN',
  FD_OUTBOUND_AS_INTEGRITY_FORBIDDEN: 'FD_OUTBOUND_AS_INTEGRITY_FORBIDDEN',
  FI_REGISTRY_AS_INTEGRITY_FORBIDDEN: 'FI_REGISTRY_AS_INTEGRITY_FORBIDDEN',
  FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN: 'FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
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
  /^rawsecret$/i,
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
  /^callback[_-]?secret$/i,
  /^webhook[_-]?secret$/i,
  /^hmac[_-]?key$/i,
  /^hmac[_-]?secret$/i,
  /^signature[_-]?secret$/i,
  /^correlation[_-]?secret$/i,
  /^correlation[_-]?payload$/i,
  /^raw[_-]?correlation[_-]?payload$/i,
  /^signing[_-]?key$/i,
  /^webhook[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i,
  /^request[_-]?payload$/i,
  /^reply[_-]?payload$/i,
  /^round[_-]?trip[_-]?secret$/i,
  /^integrity[_-]?secret$/i
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

const L30_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*30/i,
  /l(?:adder)?[\s_-]*30\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*30/i
];

const L31_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*31/i,
  /l(?:adder)?[\s_-]*31\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*31/i
];

const L32_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*32/i,
  /l(?:adder)?[\s_-]*32\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*32/i
];

const L33_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*33/i,
  /l(?:adder)?[\s_-]*33\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*33/i
];

const L34_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*34/i,
  /l(?:adder)?[\s_-]*34\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*34/i
];

const L35_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*35/i,
  /l(?:adder)?[\s_-]*35\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*35/i
];

const L36_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*36/i,
  /l(?:adder)?[\s_-]*36\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*36/i
];

const L37_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*37/i,
  /l(?:adder)?[\s_-]*37\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*37/i
];

const L38_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*38/i,
  /l(?:adder)?[\s_-]*38\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*38/i
];

const L39_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*39/i,
  /l(?:adder)?[\s_-]*39\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*39/i
];

const L40_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*40/i,
  /l(?:adder)?[\s_-]*40\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*40/i
];

const L41_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
  /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i,
  /close\s+l(?:adder)?[\s_-]*41\s+now/i
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
  /\blive\s+outbound\s+callback\b/i,
  /\blive\s+network\s+egress\b/i,
  /\bbind\s+live\s+HTTP\s+egress\b/i,
  /\bbind\s+live\s+http\s+egress\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?HTTP\s+egress/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?http\s+egress/i,
  /\bclaim(?:ing)?\s+live\s+outbound\s+delivery/i
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

const RAW_INTEGRITY_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+callback\s+secret\b/i,
  /\braw\s+webhook\s+secret\b/i,
  /\braw\s+hmac\s+(?:key|secret|material)\b/i,
  /\bseal\s+(?:the\s+)?(?:callback|webhook)\s+secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:callback|webhook)\s+secret\b/i,
  /\bcopy\s+(?:callback|webhook)\s+secret\s+material\s+into\s+receipt\b/i,
  /\bplaintext\s+(?:hmac|callback|webhook)\s+(?:key|secret)\s+in\s+receipt\b/i,
  /\bplaintext\s+URL\s+with\s+embedded\s+secret\b/i
];

const EY_INGRESS_AS_INTEGRITY_PATTERNS = [
  /\bmake\s+ey\s+(?:the\s+)?(?:bidirectional\s+)?(?:correlation\s+(?:registry\s+)?|round[-_]?trip\s+integrity\s+)port\b/i,
  /\bey\s+ingress\s+as\s+(?:the\s+)?(?:round[-_]?trip\s+)?integrity\s+port\b/i,
  /\belevate\s+ey\s+ingress\s+(?:to\s+)?(?:correlation|integrity)\s+port\b/i,
  /\bey\s+as\s+(?:bidirectional[-_]?delivery[-_]?correlation|round[-_]?trip[-_]?integrity)\b/i
];

const FD_OUTBOUND_AS_INTEGRITY_PATTERNS = [
  /\bmake\s+fd\s+(?:the\s+)?(?:bidirectional\s+)?(?:correlation\s+(?:registry\s+)?|round[-_]?trip\s+integrity\s+)port\b/i,
  /\bfd\s+outbound\s+as\s+(?:the\s+)?(?:round[-_]?trip\s+)?integrity\s+port\b/i,
  /\belevate\s+fd\s+outbound\s+(?:to\s+)?(?:correlation|integrity)\s+port\b/i,
  /\bfd\s+as\s+(?:bidirectional[-_]?delivery[-_]?correlation|round[-_]?trip[-_]?integrity)\b/i
];

const FI_REGISTRY_AS_INTEGRITY_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?(?:round[-_]?trip\s+)?integrity\s+port\b/i,
  /\bmake\s+fi\s+the\s+correlation\s+registry\b/i,
  /\bfi\s+(?:correlation\s+)?registry\s+as\s+(?:the\s+)?(?:round[-_]?trip\s+)?integrity\b/i,
  /\belevate\s+fi\s+(?:correlation\s+)?registry\s+as\s+integrity\b/i,
  /\bcanary\s+WebhookPayloadDispatcher\s+as\s+(?:the\s+)?composition\s+port\b/i
];

const FK_QUARANTINE_AS_INTEGRITY_PATTERNS = [
  /\bmake\s+fk\s+(?:the\s+)?(?:round[-_]?trip\s+)?integrity\s+port\b/i,
  /\bfk\s+quarantine\s+as\s+(?:the\s+)?integrity\b/i,
  /\belevate\s+fk\s+quarantine\s+as\s+integrity\b/i
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

export function claimsProductionReadyFlip(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return PR_FLIP_PATTERNS.some((pat) => pat.test(str));
}

export function claimsHardDelete(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return HARD_DELETE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsMassPrune(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return MASS_PRUNE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL30Reopen(val) {
  if (!val) return false;
  return L30_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL31Reopen(val) {
  if (!val) return false;
  return L31_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL32Reopen(val) {
  if (!val) return false;
  return L32_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL33Reopen(val) {
  if (!val) return false;
  return L33_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL34Reopen(val) {
  if (!val) return false;
  return L34_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL35Reopen(val) {
  if (!val) return false;
  return L35_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL36Reopen(val) {
  if (!val) return false;
  return L36_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL37Reopen(val) {
  if (!val) return false;
  return L37_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL38Reopen(val) {
  if (!val) return false;
  return L38_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL39Reopen(val) {
  if (!val) return false;
  return L39_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL40Reopen(val) {
  if (!val) return false;
  return L40_REOPEN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL41AutoClose(val) {
  if (!val) return false;
  return L41_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRewrite(val) {
  if (!val) return false;
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsSchemaJsonAdd(val) {
  if (!val) return false;
  return SCHEMA_JSON_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsNetworkWrite(val) {
  if (!val) return false;
  return NETWORK_WRITE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsGhe(val) {
  if (!val) return false;
  return GHE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveHttpEgress(val) {
  if (!val) return false;
  return LIVE_HTTP_EGRESS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawIntegritySecretMaterial(val) {
  if (!val) return false;
  return RAW_INTEGRITY_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEyIngressAsIntegrity(val) {
  if (!val) return false;
  return EY_INGRESS_AS_INTEGRITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFdOutboundAsIntegrity(val) {
  if (!val) return false;
  return FD_OUTBOUND_AS_INTEGRITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFiRegistryAsIntegrity(val) {
  if (!val) return false;
  return FI_REGISTRY_AS_INTEGRITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFkQuarantineAsIntegrity(val) {
  if (!val) return false;
  return FK_QUARANTINE_AS_INTEGRITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidVerdictState(value) {
  return typeof value === 'string' && FJ_VERDICT_STATES.includes(value);
}

export class RoundTripRequestReplyIntegrityPolicyGate {
  /**
   * Evaluates preconditions for the round-trip request-reply integrity verify ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_CHANGE_ID,
        reason: 'Missing changeId in input'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque correlationId / roundTripId / ingressId / sourceId / targetId / deliveryId / integrityClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

        if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–39 are permanently CLOSED — NEVER reopen L30–L40.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L39_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 39. Ladder 39 is permanently CLOSED — NEVER reopen L39.'
      };
    }

    if (claimsL40Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L40_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 40. Ladder 40 is permanently CLOSED — NEVER reopen L40.'
      };
    }

    if (claimsL41AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 41 is forbidden. Audit MEASURED; FI MEASURED; FJ this satellite; FK–FM pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-FJ is SEPARATE.'
      };
    }

    if (
      plan.addSchemaJson === true ||
      plan.schemaJsonAdd === true ||
      claimsSchemaJsonAdd(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (
      plan.networkWrite === true ||
      plan.remoteDispatch === true ||
      claimsNetworkWrite(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveHttpEgress === true ||
      plan.bindLiveHttpEgress === true ||
      claimsLiveHttpEgress(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
        reason: 'Live HTTP egress is refused. PASS seals hermetic round-trip integrity receipt only — inject observedVerdict; do not bind live HTTP egress / network.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority is refused. Inject observedVerdict hermetically; do not use Date.now as authority.'
      };
    }

    if (
      plan.tipRefreshAuthority === true ||
      claimsTipRefreshAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin 78141c3d only; tip-refresh post-FJ is SEPARATE.'
      };
    }

    if (
      plan.rawSecretMaterial === true ||
      plan.sealSecret === true ||
      claimsRawIntegritySecretMaterial(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.RAW_INTEGRITY_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw correlation secret / HMAC / correlation payload secret material in receipts is refused (Law VI). Seal opaque correlationId / ingressId / sourceId / targetId / deliveryId / digests only.'
      };
    }

    if (
      plan.eyIngressAsIntegrity === true ||
      plan.eyIngressAsIntegrityPort === true ||
      claimsEyIngressAsIntegrity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.EY_INGRESS_AS_INTEGRITY_FORBIDDEN,
        reason: 'EY ingress registry as the integrity port is refused. FJ is round-trip integrity verify — do NOT elevate EY as the integrity port.'
      };
    }

    if (
      plan.fdOutboundAsIntegrity === true ||
      plan.fdOutboundAsIntegrityPort === true ||
      claimsFdOutboundAsIntegrity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.FD_OUTBOUND_AS_INTEGRITY_FORBIDDEN,
        reason: 'FD outbound registry as the integrity port is refused. FJ is distinct from FD outbound — do NOT reopen L40 / elevate FD as integrity.'
      };
    }

    if (
      plan.fiRegistryAsIntegrity === true ||
      plan.reopenL40Outbound === true ||
      claimsFiRegistryAsIntegrity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.FI_REGISTRY_AS_INTEGRITY_FORBIDDEN,
        reason: 'FI correlation registry as the integrity port is refused. FI is registry/binding only; FJ is round-trip integrity verify.'
      };
    }

    if (
      plan.fkQuarantineAsIntegrity === true ||
      claimsFkQuarantineAsIntegrity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN,
        reason: 'FK quarantine as the integrity port is refused. FK is the next satellite — do NOT implement here.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.roundTrip) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_ROUND_TRIP,
        reason: 'Missing roundTrip in active ritual mode'
      };
    }

    if (typeof plan.roundTrip !== 'object' || Array.isArray(plan.roundTrip)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_ROUND_TRIP,
        reason: 'roundTrip must be a non-null object'
      };
    }

    if (
      !plan.roundTrip.correlationId ||
      typeof plan.roundTrip.correlationId !== 'string' ||
      !plan.roundTrip.correlationId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_CORRELATION_ID,
        reason: 'roundTrip.correlationId (opaque FI soft-observe) is required'
      };
    }

    if (
      !plan.roundTrip.requestId ||
      typeof plan.roundTrip.requestId !== 'string' ||
      !plan.roundTrip.requestId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_REQUEST_ID,
        reason: 'roundTrip.requestId (opaque request ref) is required'
      };
    }

    if (
      !plan.roundTrip.replyId ||
      typeof plan.roundTrip.replyId !== 'string' ||
      !plan.roundTrip.replyId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_REPLY_ID,
        reason: 'roundTrip.replyId (opaque reply ref) is required'
      };
    }

    if (
      !plan.roundTrip.ingressId ||
      typeof plan.roundTrip.ingressId !== 'string' ||
      !plan.roundTrip.ingressId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_INGRESS_ID,
        reason: 'roundTrip.ingressId (opaque L39 soft-observe) is required'
      };
    }

    if (
      !plan.roundTrip.sourceId ||
      typeof plan.roundTrip.sourceId !== 'string' ||
      !plan.roundTrip.sourceId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_SOURCE_ID,
        reason: 'roundTrip.sourceId (opaque L39 soft-observe) is required'
      };
    }

    if (
      !plan.roundTrip.targetId ||
      typeof plan.roundTrip.targetId !== 'string' ||
      !plan.roundTrip.targetId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_TARGET_ID,
        reason: 'roundTrip.targetId (opaque L40 soft-observe) is required'
      };
    }

    if (
      !plan.roundTrip.deliveryId ||
      typeof plan.roundTrip.deliveryId !== 'string' ||
      !plan.roundTrip.deliveryId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_DELIVERY_ID,
        reason: 'roundTrip.deliveryId (opaque L40 soft-observe) is required'
      };
    }

    if (
      !plan.roundTrip.integrityClass ||
      typeof plan.roundTrip.integrityClass !== 'string' ||
      !plan.roundTrip.integrityClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_INTEGRITY_CLASS,
        reason: 'roundTrip.integrityClass is required'
      };
    }

    if (
      plan.roundTrip.desiredVerdict === undefined ||
      plan.roundTrip.desiredVerdict === null ||
      plan.roundTrip.desiredVerdict === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_DESIRED_VERDICT,
        reason: 'roundTrip.desiredVerdict is required (INTACT|BROKEN|HOLD)'
      };
    }

    if (!isValidVerdictState(plan.roundTrip.desiredVerdict)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_DESIRED_VERDICT,
        reason: 'roundTrip.desiredVerdict must be one of INTACT|BROKEN|HOLD'
      };
    }

    if (
      plan.roundTrip.observedVerdict !== undefined &&
      plan.roundTrip.observedVerdict !== null &&
      !isValidVerdictState(plan.roundTrip.observedVerdict)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_OBSERVED_VERDICT,
        reason: 'roundTrip.observedVerdict must be one of INTACT|BROKEN|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.roundTrip.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INTEGRITY_UNAUTHORIZED,
        reason:
          'Fail-closed integrity DENY — hermetic round-trip claim unauthorized (≠ EY ingress; ≠ FD outbound; ≠ FI registry; ≠ FK quarantine).'
      };
    }

    if (
      plan.roundTrip.observedVerdict !== undefined &&
      plan.roundTrip.observedVerdict !== null &&
      plan.roundTrip.observedVerdict !== plan.roundTrip.desiredVerdict
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_INTEGRITY_CLAIM,
        reason:
          'Fail-closed integrity DENY — hermetic observedVerdict mismatches desiredVerdict (invalid round-trip integrity claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Plan satisfies all round-trip-request-reply-integrity governance preconditions (≠ EY/FD/FJ/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FJ_PRODUCTION_READY;
void FJ_FREEZE_PIN_SHORT;
