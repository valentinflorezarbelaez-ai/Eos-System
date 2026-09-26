/**
 * @module outbound-delivery-callback-registry-policy-gate
 * SPEC-0166 / Mission FD — Policy Gate for Sovereign External Event Outbound Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin f9a14e16 (do NOT rewrite tip pins)
 *   Binding:
 *     - Requires targetId (opaque) + targetClass + desiredBinding (BOUND|UNBOUND|HOLD)
 *     - Optional observedBinding (hermetic injected handle state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedBinding only — no live HTTP egresss, no wall-clock authority,
 *     no tip-refresh authority, no raw webhook secret / HMAC material
 *   Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty
 *   Distinct from EZ webhook authenticity (outbound ≠ outbound registry)
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30–L39 reopen
 *   Refuse L40 auto-close (FE–FH pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  FD_PRODUCTION_READY,
  FD_FREEZE_PIN_SHORT,
  FD_BINDING_STATES
} from './outbound-delivery-callback-registry-receipt.js';

/** @type {'NO'} */
export const FD_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FD_POLICY_GATE_KIND = 'eos-outbound-delivery-callback-registry-policy-gate';

export const FD_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'TARGET_INSPECT',
  'TARGET_SEAL',
  'BINDING_SEAL',
  'SEAL'
]);

export const FD_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  BINDING_UNAUTHORIZED: 'BINDING_UNAUTHORIZED',
  INVALID_BINDING_CLAIM: 'INVALID_BINDING_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_BINDING: 'MISSING_BINDING',
  INVALID_BINDING: 'INVALID_BINDING',
  MISSING_TARGET_ID: 'MISSING_TARGET_ID',
  MISSING_DELIVERY_ID: 'MISSING_DELIVERY_ID',
  MISSING_TARGET_CLASS: 'MISSING_TARGET_CLASS',
  MISSING_DESIRED_BINDING: 'MISSING_DESIRED_BINDING',
  INVALID_DESIRED_BINDING: 'INVALID_DESIRED_BINDING',
  INVALID_OBSERVED_BINDING: 'INVALID_OBSERVED_BINDING',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN: 'RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_CREDENTIAL_HANDLE_AS_OUTBOUND_FORBIDDEN: 'ET_CREDENTIAL_HANDLE_AS_OUTBOUND_FORBIDDEN',
  L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_FORBIDDEN: 'L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_FORBIDDEN',
  FE_SIGNATURE_SIGN_AS_REGISTRY_FORBIDDEN: 'FE_SIGNATURE_SIGN_AS_REGISTRY_FORBIDDEN',
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
  /^callback[_-]?secret$/i,
  /^webhook[_-]?secret$/i,
  /^hmac[_-]?key$/i,
  /^hmac[_-]?secret$/i,
  /^signature[_-]?secret$/i,
  /^signing[_-]?key$/i,
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

const RAW_CALLBACK_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+callback\s+secret\b/i,
  /\braw\s+webhook\s+secret\b/i,
  /\braw\s+hmac\s+(?:key|secret|material)\b/i,
  /\bseal\s+(?:the\s+)?(?:callback|webhook)\s+secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:callback|webhook)\s+secret\b/i,
  /\bcopy\s+(?:callback|webhook)\s+secret\s+material\s+into\s+receipt\b/i,
  /\bplaintext\s+(?:hmac|callback|webhook)\s+(?:key|secret)\s+in\s+receipt\b/i,
  /\bplaintext\s+URL\s+with\s+embedded\s+secret\b/i
];

const ET_CREDENTIAL_HANDLE_AS_OUTBOUND_PATTERNS = [
  /\bmake\s+credential[-_]?handle\s+the\s+outbound\s+port\b/i,
  /\bcredential[-_]?handle\s+as\s+(?:the\s+)?outbound\s+(?:callback\s+)?(?:registry\s+)?port\b/i,
  /\belevate\s+credential[-_]?handle\s+(?:to\s+)?outbound\s+port\b/i,
  /\bet\s+as\s+outbound[-_]?delivery[-_]?callback\b/i
];

const L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_PATTERNS = [
  /\bmake\s+domain[-_]?event\s+outbound\s+the\s+callback\s+registry\b/i,
  /\bdomain[-_]?event\s+outbound\s+as\s+(?:the\s+)?callback\s+registry\b/i,
  /\belevate\s+l33\s+domain[-_]?event\s+(?:to\s+)?callback\s+registry\b/i,
  /\bl33\s+as\s+outbound[-_]?delivery[-_]?callback\b/i
];

const FE_SIGNATURE_SIGN_AS_REGISTRY_PATTERNS = [
  /\bmake\s+fe\s+the\s+outbound\s+registry\b/i,
  /\bfe\s+signature[-_]?sign\s+as\s+(?:the\s+)?registry\b/i,
  /\belevate\s+fe\s+signature[-_]?sign\s+as\s+registry\b/i,
  /\bmake\s+ey\s+the\s+outbound\s+registry\b/i,
  /\belevate\s+ey\s+ingress\s+as\s+outbound\s+registry\b/i,
  /\bcanary\s+WebhookPayloadDispatcher\s+as\s+(?:the\s+)?composition\s+port\b/i
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

export function claimsRawCallbackSecretMaterial(val) {
  if (!val) return false;
  return RAW_CALLBACK_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEtCredentialHandleAsOutbound(val) {
  if (!val) return false;
  return ET_CREDENTIAL_HANDLE_AS_OUTBOUND_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsL33DomainEventAsCallbackRegistry(val) {
  if (!val) return false;
  return L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsFeSignatureSignAsRegistry(val) {
  if (!val) return false;
  return FE_SIGNATURE_SIGN_AS_REGISTRY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidBindingState(value) {
  return typeof value === 'string' && FD_BINDING_STATES.includes(value);
}

export class OutboundDeliveryCallbackRegistryPolicyGate {
  /**
   * Evaluates preconditions for the outbound-delivery-callback registry binding ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_CHANGE_ID,
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
        code: FD_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque targetId / deliveryId / targetClass / bindingClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

        if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–39 are permanently CLOSED — NEVER reopen L30–L39.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L39_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 39. Ladder 39 is permanently CLOSED — NEVER reopen L39.'
      };
    }

    if (claimsL40AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L40_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 40 is forbidden. Audit MEASURED; FD this satellite; FE–FH pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-FD is SEPARATE.'
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
        code: FD_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: FD_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.GHE_CLAIM_FORBIDDEN,
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
        code: FD_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
        reason: 'Live HTTP egress is refused. PASS seals hermetic outbound-delivery-callback binding receipt only — inject observedBinding; do not bind live HTTP egress / network.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority is refused. Inject observedBinding hermetically; do not use Date.now as authority.'
      };
    }

    if (
      plan.tipRefreshAuthority === true ||
      claimsTipRefreshAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin f9a14e16 only; tip-refresh post-FD is SEPARATE.'
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
        code: FD_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw callback secret / HMAC / webhook secret material in receipts is refused (Law VI). Seal opaque targetId / deliveryId / targetClass / digests only.'
      };
    }

    if (
      plan.etCredentialHandleAsOutbound === true ||
      plan.etHandleAsOutboundPort === true ||
      claimsEtCredentialHandleAsOutbound(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.ET_CREDENTIAL_HANDLE_AS_OUTBOUND_FORBIDDEN,
        reason: 'ET credential-handle as the outbound port is refused. FD is outbound-delivery-callback registry bind — do NOT elevate ET as the outbound port.'
      };
    }

    if (
      plan.l33DomainEventAsCallbackRegistry === true ||
      plan.l33AsCallbackRegistryPort === true ||
      claimsL33DomainEventAsCallbackRegistry(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.L33_DOMAIN_EVENT_AS_CALLBACK_REGISTRY_FORBIDDEN,
        reason: 'L33 domain-event outbound as the callback registry is refused. FD is distinct from L33 outbound messaging — do NOT reopen L33.'
      };
    }

    if (
      plan.feSignatureSignAsRegistry === true ||
      plan.reopenL33DomainEvents === true ||
      claimsFeSignatureSignAsRegistry(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.FE_SIGNATURE_SIGN_AS_REGISTRY_FORBIDDEN,
        reason: 'FE signature-sign / EY ingress / Canary dispatcher as the FD registry is refused. FD is registry/binding only; FE is the next satellite.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FD_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.binding) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_BINDING,
        reason: 'Missing binding in active ritual mode'
      };
    }

    if (typeof plan.binding !== 'object' || Array.isArray(plan.binding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.INVALID_BINDING,
        reason: 'binding must be a non-null object'
      };
    }

    if (
      !plan.binding.targetId ||
      typeof plan.binding.targetId !== 'string' ||
      !plan.binding.targetId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_TARGET_ID,
        reason: 'binding.targetId (opaque) is required'
      };
    }

    if (
      !plan.binding.deliveryId ||
      typeof plan.binding.deliveryId !== 'string' ||
      !plan.binding.deliveryId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_DELIVERY_ID,
        reason: 'binding.deliveryId (opaque) is required'
      };
    }

    if (
      !plan.binding.targetClass ||
      typeof plan.binding.targetClass !== 'string' ||
      !plan.binding.targetClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_TARGET_CLASS,
        reason: 'binding.targetClass is required'
      };
    }

    if (
      plan.binding.desiredBinding === undefined ||
      plan.binding.desiredBinding === null ||
      plan.binding.desiredBinding === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.MISSING_DESIRED_BINDING,
        reason: 'binding.desiredBinding is required (BOUND|UNBOUND|HOLD)'
      };
    }

    if (!isValidBindingState(plan.binding.desiredBinding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.INVALID_DESIRED_BINDING,
        reason: 'binding.desiredBinding must be one of BOUND|UNBOUND|HOLD'
      };
    }

    if (
      plan.binding.observedBinding !== undefined &&
      plan.binding.observedBinding !== null &&
      !isValidBindingState(plan.binding.observedBinding)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.INVALID_OBSERVED_BINDING,
        reason: 'binding.observedBinding must be one of BOUND|UNBOUND|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.binding.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.BINDING_UNAUTHORIZED,
        reason:
          'Fail-closed binding DENY — hermetic outbound claim unauthorized (≠ EY ingress; ≠ ET credential-handle; ≠ L33 domain-event; ≠ FE signature-sign).'
      };
    }

    if (
      plan.binding.observedBinding !== undefined &&
      plan.binding.observedBinding !== null &&
      plan.binding.observedBinding !== plan.binding.desiredBinding
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.INVALID_BINDING_CLAIM,
        reason:
          'Fail-closed binding DENY — hermetic observedBinding mismatches desiredBinding (invalid outbound binding claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: FD_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FD_CODES.OK,
      reason:
        'Plan satisfies all outbound-delivery-callback-registry governance preconditions (≠ EY/ET/L33/Canary/FE ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FD_PRODUCTION_READY;
void FD_FREEZE_PIN_SHORT;
