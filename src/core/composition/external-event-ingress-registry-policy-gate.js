/**
 * @module external-event-ingress-registry-policy-gate
 * SPEC-0161 / Mission EY — Policy Gate for Sovereign External Event Ingress Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin 987702da (do NOT rewrite tip pins)
 *   Binding:
 *     - Requires ingressId (opaque) + sourceClass + desiredBinding (BOUND|UNBOUND|HOLD)
 *     - Optional observedBinding (hermetic injected handle state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedBinding only — no live webhook endpoints, no wall-clock authority,
 *     no tip-refresh authority, no raw webhook secret / HMAC material
 *   Distinct from ET credential-handle, L33 domain-event outbound, EU secret-zero leak-deny, EW credential honesty
 *   Distinct from EZ webhook authenticity (outbound ≠ ingress registry)
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30–L38 reopen
 *   Refuse L39 auto-close (EZ–FC pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EY_PRODUCTION_READY,
  EY_FREEZE_PIN_SHORT,
  EY_BINDING_STATES
} from './external-event-ingress-registry-receipt.js';

/** @type {'NO'} */
export const EY_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EY_POLICY_GATE_KIND = 'eos-external-event-ingress-registry-policy-gate';

export const EY_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'INGRESS_INSPECT',
  'INGRESS_SEAL',
  'BINDING_SEAL',
  'SEAL'
]);

export const EY_CODES = Object.freeze({
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
  MISSING_INGRESS_ID: 'MISSING_INGRESS_ID',
  MISSING_SOURCE_ID: 'MISSING_SOURCE_ID',
  MISSING_SOURCE_CLASS: 'MISSING_SOURCE_CLASS',
  MISSING_DESIRED_BINDING: 'MISSING_DESIRED_BINDING',
  INVALID_DESIRED_BINDING: 'INVALID_DESIRED_BINDING',
  INVALID_OBSERVED_BINDING: 'INVALID_OBSERVED_BINDING',
  LIVE_WEBHOOK_ENDPOINT_FORBIDDEN: 'LIVE_WEBHOOK_ENDPOINT_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN: 'RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN: 'ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN',
  L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN: 'L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN',
  EZ_WEBHOOK_AUTH_AS_REGISTRY_FORBIDDEN: 'EZ_WEBHOOK_AUTH_AS_REGISTRY_FORBIDDEN',
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

const LIVE_WEBHOOK_ENDPOINT_PATTERNS = [
  /\blive\s+webhook\s+endpoint\b/i,
  /\blive\s+webhook\s+receiver\b/i,
  /\blive\s+ingress\s+endpoint\b/i,
  /\blive\s+webhook\s+listener\b/i,
  /\bbind\s+live\s+webhook\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?webhook\s+endpoint/i
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

const EZ_WEBHOOK_AUTH_AS_REGISTRY_PATTERNS = [
  /\breopen\s+l33\s+domain[-_]?event\s+outbound\b/i,
  /\bez\s+webhook[-_]?authenticity\s+as\s+(?:the\s+)?registry\b/i,
  /\belevate\s+ez\s+webhook[-_]?auth\s+as\s+registry\b/i,
  /\bmake\s+ez\s+the\s+ingress\s+registry\b/i
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

export function claimsLiveWebhookEndpoint(val) {
  if (!val) return false;
  return LIVE_WEBHOOK_ENDPOINT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsEzWebhookAuthAsRegistry(val) {
  if (!val) return false;
  return EZ_WEBHOOK_AUTH_AS_REGISTRY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidBindingState(value) {
  return typeof value === 'string' && EY_BINDING_STATES.includes(value);
}

export class ExternalEventIngressRegistryPolicyGate {
  /**
   * Evaluates preconditions for the external-event-ingress registry binding ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_CHANGE_ID,
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
        code: EY_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque ingress ids / sourceClass / bindingClass / digests of non-secret metadata only.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–37 are permanently CLOSED — NEVER reopen L30–L38.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'
      };
    }

    if (claimsL39AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.L39_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 39 is forbidden. Audit MEASURED; EY this satellite; EZ–FC pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.TIP_REWRITE_FORBIDDEN,
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
        code: EY_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EY_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveWebhookEndpoint === true ||
      plan.bindLiveWebhookEndpoint === true ||
      claimsLiveWebhookEndpoint(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.LIVE_WEBHOOK_ENDPOINT_FORBIDDEN,
        reason: 'Live webhook endpoint is refused. PASS seals hermetic external-event-ingress binding receipt only — inject observedBinding; do not bind live webhook endpoints.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
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
        code: EY_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin 987702da only; tip-refresh post-EY is SEPARATE.'
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
        code: EY_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw webhook secret / HMAC material in receipts is refused (Law VI). Seal opaque ingressId / sourceId / sourceClass / digests only.'
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
        code: EY_CODES.ET_CREDENTIAL_HANDLE_AS_INGRESS_FORBIDDEN,
        reason: 'ET credential-handle as the ingress port is refused. EY is external-event-ingress registry bind — do NOT elevate ET as the ingress port.'
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
        code: EY_CODES.L33_DOMAIN_EVENT_OUTBOUND_AS_INGRESS_FORBIDDEN,
        reason: 'L33 domain-event outbound as the ingress port is refused. EY is distinct from L33 outbound — do NOT reopen L33.'
      };
    }

    if (
      plan.ezWebhookAuthAsRegistry === true ||
      plan.reopenL33DomainEvents === true ||
      claimsEzWebhookAuthAsRegistry(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.EZ_WEBHOOK_AUTH_AS_REGISTRY_FORBIDDEN,
        reason: 'EZ webhook authenticity as the EY registry is refused. EY is registry/binding only; EZ is the next satellite. Do NOT reopen L33 outbound.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EY_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.binding) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_BINDING,
        reason: 'Missing binding in active ritual mode'
      };
    }

    if (typeof plan.binding !== 'object' || Array.isArray(plan.binding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.INVALID_BINDING,
        reason: 'binding must be a non-null object'
      };
    }

    if (
      !plan.binding.ingressId ||
      typeof plan.binding.ingressId !== 'string' ||
      !plan.binding.ingressId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_INGRESS_ID,
        reason: 'binding.ingressId (opaque) is required'
      };
    }

    if (
      !plan.binding.sourceId ||
      typeof plan.binding.sourceId !== 'string' ||
      !plan.binding.sourceId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_SOURCE_ID,
        reason: 'binding.sourceId (opaque) is required'
      };
    }

    if (
      !plan.binding.sourceClass ||
      typeof plan.binding.sourceClass !== 'string' ||
      !plan.binding.sourceClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.MISSING_SOURCE_CLASS,
        reason: 'binding.sourceClass is required'
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
        code: EY_CODES.MISSING_DESIRED_BINDING,
        reason: 'binding.desiredBinding is required (BOUND|UNBOUND|HOLD)'
      };
    }

    if (!isValidBindingState(plan.binding.desiredBinding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.INVALID_DESIRED_BINDING,
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
        code: EY_CODES.INVALID_OBSERVED_BINDING,
        reason: 'binding.observedBinding must be one of BOUND|UNBOUND|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.binding.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.BINDING_UNAUTHORIZED,
        reason:
          'Fail-closed binding DENY — hermetic ingress claim unauthorized (≠ ET credential-handle; ≠ L33 domain-event outbound; ≠ EZ webhook authenticity).'
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
        code: EY_CODES.INVALID_BINDING_CLAIM,
        reason:
          'Fail-closed binding DENY — hermetic observedBinding mismatches desiredBinding (invalid ingress binding claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EY_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EY_CODES.OK,
      reason:
        'Plan satisfies all external-event-ingress-registry governance preconditions (≠ ET/L33/EU/EW/EZ ≠ live webhook endpoint ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EY_PRODUCTION_READY;
void EY_FREEZE_PIN_SHORT;
