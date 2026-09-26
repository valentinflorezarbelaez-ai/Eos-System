/**
 * @module outbound-callback-authenticity-policy-gate
 * SPEC-0167 / Mission FE — Policy Gate for Sovereign Outbound Callback Authenticity / Signature-Sign Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin 7b47bf8b (do NOT rewrite tip pins)
 *   Verify:
 *     - Requires handleId (opaque) + authenticityClass + desiredVerdict (SIGNED|UNSIGNED|HOLD)
 *     - Optional observedVerdict (hermetic injected handle state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedVerdict only — no live signature sign endpoints, no wall-clock authority,
 *     no tip-refresh authority, no raw callback secret / HMAC material
 *   Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty
 *   Distinct from EZ webhook authenticity verify (inbound) and FD outbound delivery registry (targets only)
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30–L39 reopen
 *   Refuse L40 auto-close (FF–FH pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  FE_PRODUCTION_READY,
  FE_FREEZE_PIN_SHORT,
  FE_VERDICT_STATES
} from './outbound-callback-authenticity-receipt.js';

/** @type {'NO'} */
export const FE_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FE_POLICY_GATE_KIND = 'eos-outbound-callback-authenticity-policy-gate';

export const FE_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'AUTHENTICITY_SIGN_INSPECT',
  'AUTHENTICITY_SIGN_SEAL',
  'SIGN_SEAL',
  'SEAL'
]);

export const FE_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  SIGN_UNAUTHORIZED: 'SIGN_UNAUTHORIZED',
  INVALID_VERDICT_CLAIM: 'INVALID_VERDICT_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_SIGN: 'MISSING_SIGN',
  INVALID_SIGN: 'INVALID_SIGN',
  MISSING_HANDLE_ID: 'MISSING_HANDLE_ID',
  MISSING_TARGET_OR_DELIVERY_ID: 'MISSING_TARGET_OR_DELIVERY_ID',
  MISSING_AUTHENTICITY_CLASS: 'MISSING_AUTHENTICITY_CLASS',
  MISSING_DESIRED_VERDICT: 'MISSING_DESIRED_VERDICT',
  INVALID_DESIRED_VERDICT: 'INVALID_DESIRED_VERDICT',
  INVALID_OBSERVED_VERDICT: 'INVALID_OBSERVED_VERDICT',
  LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN: 'LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN: 'RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_CREDENTIAL_HANDLE_AS_SIGN_FORBIDDEN: 'ET_CREDENTIAL_HANDLE_AS_SIGN_FORBIDDEN',
  L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_FORBIDDEN: 'L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_FORBIDDEN',
  FF_QUARANTINE_AS_AUTHENTICITY_FORBIDDEN: 'FF_QUARANTINE_AS_AUTHENTICITY_FORBIDDEN',
  AU_SECRET_RUNTIME_AS_AUTHENTICITY_FORBIDDEN: 'AU_SECRET_RUNTIME_AS_AUTHENTICITY_FORBIDDEN',
  FD_REGISTRY_AS_AUTHENTICITY_FORBIDDEN: 'FD_REGISTRY_AS_AUTHENTICITY_FORBIDDEN',
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
  /^hmac[_-]?secret$/i,
  /^signing[_-]?secret$/i,
  /^raw[_-]?signature$/i,
  /^signature$/i,
  /^sig$/i,
  /^x[_-]?hub[_-]?signature$/i,
  /^x[_-]?hub[_-]?signature[_-]?256$/i
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

const LIVE_SIGNATURE_SIGN_ENDPOINT_PATTERNS = [
  /\blive\s+signature\s+sign\s+endpoint\b/i,
  /\blive\s+callback\s+sign\s+endpoint\b/i,
  /\blive\s+sign\s+endpoint\b/i,
  /\bbind\s+live\s+signature\s+sign\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?signature\s+sign\s+endpoint/i,
  /\blive\s+hmac\s+sign\s+endpoint\b/i,
  /\blive\s+outbound\s+sign\s+endpoint\b/i
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
  /\bplaintext\s+(?:hmac|callback|signing)\s+(?:key|secret)\s+in\s+receipt\b/i,
  /\braw\s+signing\s+key\b/i
];

const ET_CREDENTIAL_HANDLE_AS_SIGN_PATTERNS = [
  /\bmake\s+credential[-_]?handle\s+the\s+authenticity\s+sign\s+port\b/i,
  /\bcredential[-_]?handle\s+as\s+(?:the\s+)?authenticity\s+sign\s+port\b/i,
  /\belevate\s+credential[-_]?handle\s+(?:to\s+)?authenticity\s+sign\s+port\b/i,
  /\bet\s+as\s+outbound[-_]?callback[-_]?authenticity\b/i
];

const L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_PATTERNS = [
  /\bmake\s+domain[-_]?event\s+outbound\s+the\s+authenticity\s+sign\s+port\b/i,
  /\bdomain[-_]?event\s+outbound\s+as\s+(?:the\s+)?authenticity\s+sign\s+port\b/i,
  /\belevate\s+l33\s+domain[-_]?event\s+(?:to\s+)?authenticity\s+sign\s+port\b/i,
  /\bl33\s+as\s+outbound[-_]?callback[-_]?authenticity\b/i
];

const FD_REGISTRY_AS_AUTHENTICITY_PATTERNS = [
  /\bmake\s+fd\s+the\s+authenticity\s+port\b/i,
  /\bfd\s+registry\s+as\s+(?:the\s+)?authenticity(?:\s+port)?\b/i,
  /\belevate\s+fd\s+(?:registry\s+)?as\s+authenticity\b/i,
  /\bfd\s+outbound\s+(?:delivery\s+)?registry\s+as\s+(?:the\s+)?authenticity\b/i,
  /\bmake\s+ez\s+the\s+sign\s+port\b/i,
  /\bez\s+verify\s+as\s+(?:the\s+)?sign(?:\s+port)?\b/i
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

export function claimsLiveSignatureSignEndpoint(val) {
  if (!val) return false;
  return LIVE_SIGNATURE_SIGN_ENDPOINT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsEtCredentialHandleAsSign(val) {
  if (!val) return false;
  return ET_CREDENTIAL_HANDLE_AS_SIGN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL33DomainEventOutboundAsSign(val) {
  if (!val) return false;
  return L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFdRegistryAsAuthenticity(val) {
  if (!val) return false;
  return FD_REGISTRY_AS_AUTHENTICITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidVerdictState(value) {
  return typeof value === 'string' && FE_VERDICT_STATES.includes(value);
}

export class OutboundCallbackAuthenticityPolicyGate {
  /**
   * Evaluates preconditions for the outbound-callback authenticity sign ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_CHANGE_ID,
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
        code: FE_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque handleId / targetId / deliveryId / authenticityClass / signClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–39 are permanently CLOSED — NEVER reopen L30–L39.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L39_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 39. Ladder 39 is permanently CLOSED — NEVER reopen L39.'
      };
    }

    if (claimsL40AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L40_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 39 is forbidden. Audit MEASURED; EY this satellite; FF–FH pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-FE is SEPARATE.'
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
        code: FE_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: FE_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveSignatureSignEndpoint === true ||
      plan.bindLiveSignatureSignEndpoint === true ||
      claimsLiveSignatureSignEndpoint(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.LIVE_SIGNATURE_SIGN_ENDPOINT_FORBIDDEN,
        reason: 'Live signature sign endpoint is refused. PASS seals hermetic webhook-authenticity verify receipt only — inject observedVerdict; do not bind live signature sign endpoints.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
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
        code: FE_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin 7b47bf8b only; tip-refresh post-FE is SEPARATE.'
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
        code: FE_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw callback secret / HMAC material in receipts is refused (Law VI). Seal opaque handleId / targetId / deliveryId / authenticityClass / digests only.'
      };
    }

    if (
      plan.etCredentialHandleAsSign === true ||
      plan.etHandleAsSignPort === true ||
      claimsEtCredentialHandleAsSign(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.ET_CREDENTIAL_HANDLE_AS_SIGN_FORBIDDEN,
        reason: 'ET credential-handle as the authenticity sign port is refused. FE is signature-sign via L38 handles — do NOT elevate ET as the sign port.'
      };
    }

    if (
      plan.l33DomainEventOutboundAsSign === true ||
      plan.l33OutboundAsSignPort === true ||
      claimsL33DomainEventOutboundAsSign(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_SIGN_FORBIDDEN,
        reason: 'L33 domain-event outbound as the authenticity sign port is refused. FE is distinct from L33 outbound — do NOT reopen L33.'
      };
    }

    if (
      plan.fdRegistryAsAuthenticity === true ||
      plan.reopenL33DomainEvents === true ||
      claimsFdRegistryAsAuthenticity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.FD_REGISTRY_AS_AUTHENTICITY_FORBIDDEN,
        reason: 'FD outbound delivery registry as the FE authenticity sign port is refused. FE signs via L38 opaque handles; FD is registry/binding only. Do NOT elevate FD as authenticity.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FE_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.sign) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_SIGN,
        reason: 'Missing sign in active ritual mode'
      };
    }

    if (typeof plan.sign !== 'object' || Array.isArray(plan.sign)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.INVALID_SIGN,
        reason: 'sign must be a non-null object'
      };
    }

    if (
      !plan.sign.handleId ||
      typeof plan.sign.handleId !== 'string' ||
      !plan.sign.handleId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_HANDLE_ID,
        reason: 'sign.handleId (opaque) is required'
      };
    }

    if (
      plan.sign.targetId !== undefined &&
      plan.sign.targetId !== null &&
      (typeof plan.sign.targetId !== 'string' || !String(plan.sign.targetId).trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_TARGET_OR_DELIVERY_ID,
        reason: 'sign.targetId when provided must be a non-empty opaque soft-observe FD targetId string'
      };
    }

    if (
      plan.sign.deliveryId !== undefined &&
      plan.sign.deliveryId !== null &&
      (typeof plan.sign.deliveryId !== 'string' || !String(plan.sign.deliveryId).trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_TARGET_OR_DELIVERY_ID,
        reason: 'sign.deliveryId when provided must be a non-empty opaque soft-observe FD deliveryId string'
      };
    }

    if (
      !plan.sign.authenticityClass ||
      typeof plan.sign.authenticityClass !== 'string' ||
      !plan.sign.authenticityClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_AUTHENTICITY_CLASS,
        reason: 'sign.authenticityClass is required'
      };
    }

    if (
      plan.sign.desiredVerdict === undefined ||
      plan.sign.desiredVerdict === null ||
      plan.sign.desiredVerdict === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.MISSING_DESIRED_VERDICT,
        reason: 'sign.desiredVerdict is required (SIGNED|UNSIGNED|HOLD)'
      };
    }

    if (!isValidVerdictState(plan.sign.desiredVerdict)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.INVALID_DESIRED_VERDICT,
        reason: 'sign.desiredVerdict must be one of SIGNED|UNSIGNED|HOLD'
      };
    }

    if (
      plan.sign.observedVerdict !== undefined &&
      plan.sign.observedVerdict !== null &&
      !isValidVerdictState(plan.sign.observedVerdict)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.INVALID_OBSERVED_VERDICT,
        reason: 'sign.observedVerdict must be one of SIGNED|UNSIGNED|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.sign.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.SIGN_UNAUTHORIZED,
        reason:
          'Fail-closed sign DENY — hermetic authenticity sign claim unauthorized (≠ ET credential-handle; ≠ L33 domain-event outbound; ≠ EZ outbound-callback authenticity).'
      };
    }

    if (
      plan.sign.observedVerdict !== undefined &&
      plan.sign.observedVerdict !== null &&
      plan.sign.observedVerdict !== plan.sign.desiredVerdict
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.INVALID_VERDICT_CLAIM,
        reason:
          'Fail-closed sign DENY — hermetic observedVerdict mismatches desiredVerdict (invalid authenticity sign claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: FE_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FE_CODES.OK,
      reason:
        'Plan satisfies all webhook-authenticity-registry governance preconditions (≠ ET/EZ/FD/AU/FF ≠ live signature sign endpoint ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FE_PRODUCTION_READY;
void FE_FREEZE_PIN_SHORT;
