/**
 * @module webhook-authenticity-registry-policy-gate
 * SPEC-0162 / Mission EZ — Policy Gate for Sovereign Webhook Authenticity / Signature-Verify Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin cc9161f9 (do NOT rewrite tip pins)
 *   Verify:
 *     - Requires handleId (opaque) + authenticityClass + desiredVerdict (AUTHENTIC|INAUTHENTIC|HOLD)
 *     - Optional observedVerdict (hermetic injected handle state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedVerdict only — no live signature verify endpoints, no wall-clock authority,
 *     no tip-refresh authority, no raw webhook secret / HMAC material
 *   Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty
 *   Distinct from EY ingress registry (outbound ≠ ingress registry)
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30–L38 reopen
 *   Refuse L39 auto-close (FA–FC pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EZ_PRODUCTION_READY,
  EZ_FREEZE_PIN_SHORT,
  EZ_VERDICT_STATES
} from './webhook-authenticity-receipt.js';

/** @type {'NO'} */
export const EZ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EZ_POLICY_GATE_KIND = 'eos-webhook-authenticity-policy-gate';

export const EZ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'AUTHENTICITY_INSPECT',
  'AUTHENTICITY_SEAL',
  'VERIFY_SEAL',
  'SEAL'
]);

export const EZ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  VERIFY_UNAUTHORIZED: 'VERIFY_UNAUTHORIZED',
  INVALID_VERDICT_CLAIM: 'INVALID_VERDICT_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_VERIFY: 'MISSING_VERIFY',
  INVALID_VERIFY: 'INVALID_VERIFY',
  MISSING_HANDLE_ID: 'MISSING_HANDLE_ID',
  MISSING_SOURCE_ID: 'MISSING_SOURCE_ID',
  MISSING_AUTHENTICITY_CLASS: 'MISSING_AUTHENTICITY_CLASS',
  MISSING_DESIRED_VERDICT: 'MISSING_DESIRED_VERDICT',
  INVALID_DESIRED_VERDICT: 'INVALID_DESIRED_VERDICT',
  INVALID_OBSERVED_VERDICT: 'INVALID_OBSERVED_VERDICT',
  LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN: 'LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN: 'RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN: 'ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN',
  L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN: 'L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN',
  FA_QUARANTINE_AS_AUTHENTICITY_FORBIDDEN: 'FA_QUARANTINE_AS_AUTHENTICITY_FORBIDDEN',
  AU_SECRET_RUNTIME_AS_AUTHENTICITY_FORBIDDEN: 'AU_SECRET_RUNTIME_AS_AUTHENTICITY_FORBIDDEN',
  EY_INGRESS_AS_AUTHENTICITY_FORBIDDEN: 'EY_INGRESS_AS_AUTHENTICITY_FORBIDDEN',
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
  L39_AUTO_CLOSE_FORBIDDEN: 'L39_AUTO_CLOSE_FORBIDDEN',
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

const L39_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*39/i,
  /l(?:adder)?[\s_-]*39\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*39/i,
  /close\s+l(?:adder)?[\s_-]*39\s+now/i
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

const LIVE_SIGNATURE_VERIFY_ENDPOINT_PATTERNS = [
  /\blive\s+webhook\s+endpoint\b/i,
  /\blive\s+webhook\s+receiver\b/i,
  /\blive\s+ingress\s+endpoint\b/i,
  /\blive\s+webhook\s+listener\b/i,
  /\bbind\s+live\s+webhook\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?webhook\s+endpoint/i,
  /\blive\s+signature\s+verify\s+endpoint\b/i,
  /\blive\s+signature\s+verify\s+receiver\b/i,
  /\bbind\s+live\s+signature\s+verify\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?signature\s+verify\s+endpoint/i
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

const RAW_WEBHOOK_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+webhook\s+secret\b/i,
  /\braw\s+hmac\s+(?:key|secret|material)\b/i,
  /\bseal\s+(?:the\s+)?(?:webhook\s+)?secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:webhook\s+)?secret\b/i,
  /\bcopy\s+(?:webhook\s+)?secret\s+material\s+into\s+receipt\b/i,
  /\bplaintext\s+(?:hmac|webhook)\s+(?:key|secret)\s+in\s+receipt\b/i
];

const ET_CREDENTIAL_HANDLE_AS_INGRESS_PATTERNS = [
  /\bmake\s+credential[-_]?handle\s+the\s+ingress\s+port\b/i,
  /\bcredential[-_]?handle\s+as\s+(?:the\s+)?ingress\s+port\b/i,
  /\belevate\s+credential[-_]?handle\s+(?:to\s+)?ingress\s+port\b/i,
  /\bet\s+as\s+external[-_]?event[-_]?ingress\b/i
];

const L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_PATTERNS = [
  /\bmake\s+domain[-_]?event\s+outbound\s+the\s+ingress\s+port\b/i,
  /\bdomain[-_]?event\s+outbound\s+as\s+(?:the\s+)?ingress\s+port\b/i,
  /\belevate\s+l33\s+domain[-_]?event\s+(?:to\s+)?ingress\s+port\b/i,
  /\bl33\s+as\s+external[-_]?event[-_]?ingress\b/i
];

const EY_INGRESS_AS_AUTHENTICITY_PATTERNS = [
  /\bmake\s+ey\s+the\s+authenticity\s+port\b/i,
  /\bey\s+ingress\s+as\s+(?:the\s+)?authenticity(?:\s+port)?\b/i,
  /\belevate\s+ey\s+(?:ingress\s+)?as\s+authenticity\b/i,
  /\bey\s+ingress\s+registry\s+as\s+(?:the\s+)?authenticity\b/i,
  /\breopen\s+l33\s+domain[-_]?event\s+outbound\b/i
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

export function claimsL39AutoClose(val) {
  if (!val) return false;
  return L39_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsLiveSignatureVerifyEndpoint(val) {
  if (!val) return false;
  return LIVE_SIGNATURE_VERIFY_ENDPOINT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawWebhookSecretMaterial(val) {
  if (!val) return false;
  return RAW_WEBHOOK_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEtCredentialHandleAsIngress(val) {
  if (!val) return false;
  return ET_CREDENTIAL_HANDLE_AS_INGRESS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL33DomainEventOutboundAsIngress(val) {
  if (!val) return false;
  return L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEyIngressAsAuthenticity(val) {
  if (!val) return false;
  return EY_INGRESS_AS_AUTHENTICITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidVerdictState(value) {
  return typeof value === 'string' && EZ_VERDICT_STATES.includes(value);
}

export class WebhookAuthenticityPolicyGate {
  /**
   * Evaluates preconditions for the webhook authenticity verify ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_CHANGE_ID,
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
        code: EZ_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque ingress ids / authenticityClass / verifyClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–37 are permanently CLOSED — NEVER reopen L30–L38.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L39_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 39 is forbidden. Audit MEASURED; EY this satellite; FA–FC pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EY is SEPARATE.'
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
        code: EZ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EZ_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveSignatureVerifyEndpoint === true ||
      plan.bindLiveSignatureVerifyEndpoint === true ||
      claimsLiveSignatureVerifyEndpoint(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.LIVE_SIGNATURE_VERIFY_ENDPOINT_FORBIDDEN,
        reason: 'Live webhook endpoint is refused. PASS seals hermetic webhook-authenticity verify receipt only — inject observedVerdict; do not bind live signature verify endpoints.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
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
        code: EZ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin cc9161f9 only; tip-refresh post-EZ is SEPARATE.'
      };
    }

    if (
      plan.rawSecretMaterial === true ||
      plan.sealSecret === true ||
      claimsRawWebhookSecretMaterial(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw webhook secret / HMAC material in receipts is refused (Law VI). Seal opaque handleId / sourceId / authenticityClass / digests only.'
      };
    }

    if (
      plan.etCredentialHandleAsIngress === true ||
      plan.etHandleAsIngressPort === true ||
      claimsEtCredentialHandleAsIngress(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN,
        reason: 'ET credential-handle as the ingress port is refused. EY is webhook authenticity bind — do NOT elevate ET as the ingress port.'
      };
    }

    if (
      plan.l33DomainEventOutboundAsIngress === true ||
      plan.l33OutboundAsIngressPort === true ||
      claimsL33DomainEventOutboundAsIngress(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN,
        reason: 'L33 domain-event outbound as the ingress port is refused. EY is distinct from L33 outbound — do NOT reopen L33.'
      };
    }

    if (
      plan.eyIngressAsAuthenticity === true ||
      plan.reopenL33DomainEvents === true ||
      claimsEyIngressAsAuthenticity(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.EY_INGRESS_AS_AUTHENTICITY_FORBIDDEN,
        reason: 'EY ingress registry as the EZ authenticity port is refused. EZ verifies via L38 opaque handles; EY is registry/binding only. Do NOT elevate EY as authenticity.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EZ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.verify) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_VERIFY,
        reason: 'Missing verify in active ritual mode'
      };
    }

    if (typeof plan.verify !== 'object' || Array.isArray(plan.verify)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.INVALID_VERIFY,
        reason: 'verify must be a non-null object'
      };
    }

    if (
      !plan.verify.handleId ||
      typeof plan.verify.handleId !== 'string' ||
      !plan.verify.handleId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_HANDLE_ID,
        reason: 'verify.handleId (opaque) is required'
      };
    }

    if (
      plan.verify.sourceId !== undefined &&
      plan.verify.sourceId !== null &&
      (typeof plan.verify.sourceId !== 'string' || !String(plan.verify.sourceId).trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_SOURCE_ID,
        reason: 'verify.sourceId when provided must be a non-empty opaque soft-observe EY sourceId string'
      };
    }

    if (
      !plan.verify.authenticityClass ||
      typeof plan.verify.authenticityClass !== 'string' ||
      !plan.verify.authenticityClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_AUTHENTICITY_CLASS,
        reason: 'verify.authenticityClass is required'
      };
    }

    if (
      plan.verify.desiredVerdict === undefined ||
      plan.verify.desiredVerdict === null ||
      plan.verify.desiredVerdict === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.MISSING_DESIRED_VERDICT,
        reason: 'verify.desiredVerdict is required (AUTHENTIC|INAUTHENTIC|HOLD)'
      };
    }

    if (!isValidVerdictState(plan.verify.desiredVerdict)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.INVALID_DESIRED_VERDICT,
        reason: 'verify.desiredVerdict must be one of AUTHENTIC|INAUTHENTIC|HOLD'
      };
    }

    if (
      plan.verify.observedVerdict !== undefined &&
      plan.verify.observedVerdict !== null &&
      !isValidVerdictState(plan.verify.observedVerdict)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.INVALID_OBSERVED_VERDICT,
        reason: 'verify.observedVerdict must be one of AUTHENTIC|INAUTHENTIC|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.verify.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.VERIFY_UNAUTHORIZED,
        reason:
          'Fail-closed verify DENY — hermetic authenticity claim unauthorized (≠ ET credential-handle; ≠ L33 domain-event outbound; ≠ EZ webhook authenticity).'
      };
    }

    if (
      plan.verify.observedVerdict !== undefined &&
      plan.verify.observedVerdict !== null &&
      plan.verify.observedVerdict !== plan.verify.desiredVerdict
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.INVALID_VERDICT_CLAIM,
        reason:
          'Fail-closed verify DENY — hermetic observedVerdict mismatches desiredVerdict (invalid authenticity verify claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EZ_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EZ_CODES.OK,
      reason:
        'Plan satisfies all webhook-authenticity-registry governance preconditions (≠ ET/EU/EY/AU/FA ≠ live signature verify endpoint ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EZ_PRODUCTION_READY;
void EZ_FREEZE_PIN_SHORT;
