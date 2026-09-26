/**
 * @module outbound-delivery-quarantine-retry-deny-policy-gate
 * SPEC-0168 / Mission FF — Policy Gate for Outbound Delivery Quarantine & Retry-Deny Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin 1079bddf (do NOT rewrite tip pins)
 *   Quarantine:
 *     - Requires deliveryId (opaque) + quarantineClass + desiredStage
 *       (QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT)
 *     - Optional observedStage (hermetic injected quarantine state)
 *     - Optional soft-observe FD targetId / FE authenticityRef (opaque)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedStage only — no live outbound delivery mutation, no live HTTP egress endpoints,
 *     no wall-clock authority, no tip-refresh authority, no raw callback secret / payload material
 *   Distinct from FD outbound delivery registry, FE outbound callback authenticity, EB dead-letter quarantine,
 *     L36 admission/backpressure, EU secret-zero, EV handle lifecycle, FG outbound honesty
 *   Refuse PRODUCTION_READY flip / L30–L39 reopen / L40 auto-close / tip rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent / schema-json add / mass prune
 *   schemas AT_CEILING 35/35
 */

import {
  FF_PRODUCTION_READY,
  FF_FREEZE_PIN_SHORT,
  FF_STAGE_STATES
} from './outbound-delivery-quarantine-retry-deny-receipt.js';

/** @type {'NO'} */
export const FF_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FF_POLICY_GATE_KIND = 'eos-outbound-delivery-quarantine-retry-deny-policy-gate';

export const FF_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'QUARANTINE_INSPECT',
  'RETRY_DENY_SEAL',
  'ACK_SEAL',
  'QUARANTINE_SEAL',
  'SEAL'
]);

export const FF_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  QUARANTINE_UNAUTHORIZED: 'QUARANTINE_UNAUTHORIZED',
  INVALID_STAGE_CLAIM: 'INVALID_STAGE_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_QUARANTINE: 'MISSING_QUARANTINE',
  INVALID_QUARANTINE: 'INVALID_QUARANTINE',
  MISSING_DELIVERY_ID: 'MISSING_DELIVERY_ID',
  MISSING_TARGET_ID: 'MISSING_TARGET_ID',
  MISSING_QUARANTINE_CLASS: 'MISSING_QUARANTINE_CLASS',
  MISSING_DESIRED_STAGE: 'MISSING_DESIRED_STAGE',
  INVALID_DESIRED_STAGE: 'INVALID_DESIRED_STAGE',
  INVALID_OBSERVED_STAGE: 'INVALID_OBSERVED_STAGE',
  LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN: 'LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN',
  LIVE_HTTP_EGRESS_ENDPOINT_FORBIDDEN: 'LIVE_HTTP_EGRESS_ENDPOINT_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN: 'RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN',
  RAW_PAYLOAD_MATERIAL_FORBIDDEN: 'RAW_PAYLOAD_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  FD_REGISTRY_AS_QUARANTINE_FORBIDDEN: 'FD_REGISTRY_AS_QUARANTINE_FORBIDDEN',
  FE_AUTHENTICITY_AS_QUARANTINE_FORBIDDEN: 'FE_AUTHENTICITY_AS_QUARANTINE_FORBIDDEN',
  EB_DEAD_LETTER_AS_QUARANTINE_FORBIDDEN: 'EB_DEAD_LETTER_AS_QUARANTINE_FORBIDDEN',
  L36_ADMISSION_AS_QUARANTINE_FORBIDDEN: 'L36_ADMISSION_AS_QUARANTINE_FORBIDDEN',
  FG_HONESTY_AS_QUARANTINE_FORBIDDEN: 'FG_HONESTY_AS_QUARANTINE_FORBIDDEN',
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
  L40_AUTO_CLOSE_FORBIDDEN: 'L40_AUTO_CLOSE_FORBIDDEN',
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
  /^webhook[_-]?secret$/i,
  /^hmac[_-]?key$/i,
  /^hmac[_-]?secret$/i,
  /^signature[_-]?secret$/i,
  /^signing[_-]?key$/i,
  /^webhook[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i,
  /^webhook[_-]?token$/i,
  /^signing[_-]?secret$/i,
  /^raw[_-]?signature$/i,
  /^signature$/i,
  /^sig$/i,
  /^x[_-]?hub[_-]?signature$/i,
  /^x[_-]?hub[_-]?signature[_-]?256$/i,
  /^payload[_-]?body$/i,
  /^raw[_-]?body$/i,
  /^callback[_-]?body$/i,
  /^callback[_-]?payload$/i,
  /^delivery[_-]?payload$/i
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

const L40_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*40/i,
  /l(?:adder)?[\s_-]*40\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*40/i,
  /close\s+l(?:adder)?[\s_-]*40\s+now/i
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

const LIVE_OUTBOUND_DELIVERY_MUTATION_PATTERNS = [
  /\blive\s+outbound\s+delivery\s+mutation\b/i,
  /\blive\s+quarantine\s+mutation\b/i,
  /\bmutate\s+live\s+outbound\s+delivery\b/i,
  /\bunsupervised\s+live\s+outbound\s+delivery\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?outbound\s+delivery\s+mutation/i
];

const LIVE_HTTP_EGRESS_ENDPOINT_PATTERNS = [
  /\blive\s+HTTP\s+egress\s+endpoint\b/i,
  /\blive\s+http\s+egress\s+endpoint\b/i,
  /\blive\s+outbound\s+delivery\s+endpoint\b/i,
  /\blive\s+outbound\s+delivery\s+receiver\b/i,
  /\bbind\s+live\s+HTTP\s+egress\b/i,
  /\bbind\s+live\s+http\s+egress\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?HTTP\s+egress\s+endpoint/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?http\s+egress\s+endpoint/i
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

const RAW_CALLBACK_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+callback\s+secret\b/i,
  /\braw\s+hmac\s+(?:key|secret|material)\b/i,
  /\bseal\s+(?:the\s+)?(?:callback\s+)?secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:callback\s+)?secret\b/i,
  /\bcopy\s+(?:callback\s+)?secret\s+material\s+into\s+receipt\b/i,
  /\bplaintext\s+(?:hmac|callback)\s+(?:key|secret)\s+in\s+receipt\b/i
];

const RAW_PAYLOAD_MATERIAL_PATTERNS = [
  /\braw\s+(?:webhook\s+)?payload\b/i,
  /\bseal\s+(?:the\s+)?(?:raw\s+)?payload\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:webhook\s+)?payload\b/i,
  /\bcopy\s+payload\s+(?:body\s+)?into\s+receipt\b/i,
  /\braw\s+body\s+in\s+receipt\b/i
];

const FD_REGISTRY_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fd\s+the\s+quarantine\s+port\b/i,
  /\bfd\s+registry\s+as\s+(?:the\s+)?quarantine(?:\s+port)?\b/i,
  /\belevate\s+fd\s+(?:registry\s+)?as\s+quarantine\b/i,
  /\bfd\s+outbound\s+delivery\s+registry\s+as\s+(?:the\s+)?quarantine\b/i
];

const FE_AUTHENTICITY_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fe\s+the\s+quarantine\s+port\b/i,
  /\bfe\s+authenticity\s+as\s+(?:the\s+)?quarantine(?:\s+port)?\b/i,
  /\belevate\s+fe\s+(?:authenticity\s+)?as\s+quarantine\b/i,
  /\boutbound\s+callback\s+authenticity\s+as\s+(?:the\s+)?quarantine\b/i
];

const EB_DEAD_LETTER_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+eb\s+the\s+outbound\s+quarantine\s+port\b/i,
  /\beb\s+dead[-_]?letter\s+as\s+(?:the\s+)?outbound\s+quarantine\b/i,
  /\belevate\s+dead[-_]?letter\s+quarantine\s+as\s+outbound\s+quarantine\b/i,
  /\breopen\s+l34\s+dead[-_]?letter\b/i
];

const L36_ADMISSION_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+l36\s+admission\s+the\s+quarantine\s+port\b/i,
  /\bl36\s+admission\s+as\s+(?:the\s+)?ingress\s+quarantine\b/i,
  /\belevate\s+admission\s+backpressure\s+as\s+quarantine\b/i,
  /\breopen\s+l36\s+admission\b/i
];

const FG_HONESTY_AS_QUARANTINE_PATTERNS = [
  /\bmake\s+fg\s+the\s+quarantine\s+port\b/i,
  /\bfg\s+honesty\s+as\s+(?:the\s+)?quarantine(?:\s+port)?\b/i,
  /\belevate\s+fg\s+(?:honesty\s+)?as\s+quarantine\b/i
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

export function claimsL40AutoClose(val) {
  if (!val) return false;
  return L40_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsLiveOutboundDeliveryMutation(val) {
  if (!val) return false;
  return LIVE_OUTBOUND_DELIVERY_MUTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveHttpEgressEndpoint(val) {
  if (!val) return false;
  return LIVE_HTTP_EGRESS_ENDPOINT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawCallbackSecretMaterial(val) {
  if (!val) return false;
  return RAW_CALLBACK_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawPayloadMaterial(val) {
  if (!val) return false;
  return RAW_PAYLOAD_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFdRegistryAsQuarantine(val) {
  if (!val) return false;
  return FD_REGISTRY_AS_QUARANTINE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFeAuthenticityAsQuarantine(val) {
  if (!val) return false;
  return FE_AUTHENTICITY_AS_QUARANTINE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEbDeadLetterAsQuarantine(val) {
  if (!val) return false;
  return EB_DEAD_LETTER_AS_QUARANTINE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL36AdmissionAsQuarantine(val) {
  if (!val) return false;
  return L36_ADMISSION_AS_QUARANTINE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFgHonestyAsQuarantine(val) {
  if (!val) return false;
  return FG_HONESTY_AS_QUARANTINE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidStageState(value) {
  return typeof value === 'string' && FF_STAGE_STATES.includes(value);
}

export class OutboundDeliveryQuarantineRetryDenyPolicyGate {
  /**
   * Evaluates preconditions for the outbound delivery quarantine / retry-deny ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_CHANGE_ID,
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
        code: FF_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque deliveryId / targetId / quarantineClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–38 are permanently CLOSED — NEVER reopen L30–L39.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L39_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 39. Ladder 39 is permanently CLOSED — NEVER reopen L39.'
      };
    }

    if (claimsL40AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L40_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 40 is forbidden. Audit MEASURED; FD+FE MEASURED; FF this satellite; FG–FH pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-FF is SEPARATE.'
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
        code: FF_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: FF_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveOutboundDeliveryMutation === true ||
      plan.mutateLiveOutboundDelivery === true ||
      claimsLiveOutboundDeliveryMutation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.LIVE_OUTBOUND_DELIVERY_MUTATION_FORBIDDEN,
        reason: 'Live outbound delivery mutation is refused. PASS seals hermetic quarantine/retry-deny receipt only — inject observedStage; do not mutate live outbound delivery.'
      };
    }

    if (
      plan.liveHttpEgressEndpoint === true ||
      plan.bindLiveHttpEgressEndpoint === true ||
      claimsLiveHttpEgressEndpoint(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.LIVE_HTTP_EGRESS_ENDPOINT_FORBIDDEN,
        reason: 'Live HTTP egress endpoint is refused. PASS seals hermetic quarantine/retry-deny receipt only.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority is refused. Inject observedStage hermetically; do not use Date.now as authority.'
      };
    }

    if (
      plan.tipRefreshAuthority === true ||
      claimsTipRefreshAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin 1079bddf only; tip-refresh post-FF is SEPARATE.'
      };
    }

    if (
      plan.rawSecretMaterial === true ||
      plan.sealSecret === true ||
      claimsRawCallbackSecretMaterial(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw callback secret / HMAC material in receipts is refused (Law VI). Seal opaque deliveryId / targetId / quarantineClass / digests only.'
      };
    }

    if (
      plan.rawPayloadMaterial === true ||
      plan.sealPayload === true ||
      claimsRawPayloadMaterial(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.RAW_PAYLOAD_MATERIAL_FORBIDDEN,
        reason: 'Raw webhook payload / body in receipts is refused (Law VI). Seal opaque digests + stage only.'
      };
    }

    if (
      plan.fdRegistryAsQuarantine === true ||
      claimsFdRegistryAsQuarantine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.FD_REGISTRY_AS_QUARANTINE_FORBIDDEN,
        reason: 'FD outbound delivery registry as the FF quarantine port is refused. FF is quarantine/retry-deny; FD is registry/binding only.'
      };
    }

    if (
      plan.feAuthenticityAsQuarantine === true ||
      claimsFeAuthenticityAsQuarantine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.FE_AUTHENTICITY_AS_QUARANTINE_FORBIDDEN,
        reason: 'FE outbound callback authenticity as the FF quarantine port is refused. FF is quarantine/retry-deny; FE is authenticity sign only.'
      };
    }

    if (
      plan.ebDeadLetterAsQuarantine === true ||
      plan.reopenL34DeadLetter === true ||
      claimsEbDeadLetterAsQuarantine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.EB_DEAD_LETTER_AS_QUARANTINE_FORBIDDEN,
        reason: 'EB dead-letter quarantine as the FF outbound quarantine port is refused. Fold concepts only — do NOT reopen L34.'
      };
    }

    if (
      plan.l36AdmissionAsQuarantine === true ||
      plan.reopenL36Admission === true ||
      claimsL36AdmissionAsQuarantine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.L36_ADMISSION_AS_QUARANTINE_FORBIDDEN,
        reason: 'L36 admission/backpressure as the FF quarantine port is refused. Fold concepts only — do NOT reopen L36.'
      };
    }

    if (
      plan.fgHonestyAsQuarantine === true ||
      claimsFgHonestyAsQuarantine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.FG_HONESTY_AS_QUARANTINE_FORBIDDEN,
        reason: 'FG outbound honesty as the FF quarantine port is refused. FG is next satellite — do NOT elevate FG as quarantine.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FF_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.quarantine) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_QUARANTINE,
        reason: 'Missing quarantine in active ritual mode'
      };
    }

    if (typeof plan.quarantine !== 'object' || Array.isArray(plan.quarantine)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.INVALID_QUARANTINE,
        reason: 'quarantine must be a non-null object'
      };
    }

    if (
      !plan.quarantine.deliveryId ||
      typeof plan.quarantine.deliveryId !== 'string' ||
      !plan.quarantine.deliveryId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_DELIVERY_ID,
        reason: 'quarantine.deliveryId (opaque) is required'
      };
    }

    if (
      plan.quarantine.targetId !== undefined &&
      plan.quarantine.targetId !== null &&
      (typeof plan.quarantine.targetId !== 'string' || !String(plan.quarantine.targetId).trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_TARGET_ID,
        reason: 'quarantine.targetId when provided must be a non-empty opaque soft-observe FD targetId string'
      };
    }

    if (
      !plan.quarantine.quarantineClass ||
      typeof plan.quarantine.quarantineClass !== 'string' ||
      !plan.quarantine.quarantineClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_QUARANTINE_CLASS,
        reason: 'quarantine.quarantineClass is required'
      };
    }

    if (
      plan.quarantine.desiredStage === undefined ||
      plan.quarantine.desiredStage === null ||
      plan.quarantine.desiredStage === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.MISSING_DESIRED_STAGE,
        reason: 'quarantine.desiredStage is required (QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT)'
      };
    }

    if (!isValidStageState(plan.quarantine.desiredStage)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.INVALID_DESIRED_STAGE,
        reason: 'quarantine.desiredStage must be one of QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT'
      };
    }

    if (
      plan.quarantine.observedStage !== undefined &&
      plan.quarantine.observedStage !== null &&
      !isValidStageState(plan.quarantine.observedStage)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.INVALID_OBSERVED_STAGE,
        reason: 'quarantine.observedStage must be one of QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT when provided (hermetic injection)'
      };
    }

    if (plan.quarantine.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.QUARANTINE_UNAUTHORIZED,
        reason:
          'Fail-closed quarantine DENY — hermetic quarantine/retry-deny claim unauthorized (≠ FD outbound delivery registry; ≠ FE outbound callback authenticity; ≠ EB dead-letter; ≠ L36 admission).'
      };
    }

    if (
      plan.quarantine.observedStage !== undefined &&
      plan.quarantine.observedStage !== null &&
      plan.quarantine.observedStage !== plan.quarantine.desiredStage
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.INVALID_STAGE_CLAIM,
        reason:
          'Fail-closed quarantine DENY — hermetic observedStage mismatches desiredStage (invalid quarantine/retry-deny stage claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: FF_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FF_CODES.OK,
      reason:
        'Plan satisfies all outbound-delivery-quarantine-retry-deny governance preconditions (≠ FD/FE/EB/L36/FG ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FF_PRODUCTION_READY;
void FF_FREEZE_PIN_SHORT;
