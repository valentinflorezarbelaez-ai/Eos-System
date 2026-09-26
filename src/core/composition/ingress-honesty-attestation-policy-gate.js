/**
 * @module ingress-honesty-attestation-policy-gate
 * SPEC-0164 / Mission FB — Policy Gate for External Event Ingress Honesty & Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields / webhook secrets / HMAC keys / raw payloads;
 *     seal opaque ingressId/sourceId/handleId + attestationDigest + stage/verdict only
 *   Freeze soft-observe: pin 57edb92e (do NOT rewrite tip pins)
 *   Attestation:
 *     - Requires attestation with ingressId + subjectKind + honestyClaims
 *     - subjectKind ∈ EXTERNAL_EVENT_INGRESS | INGRESS_BINDING | WEBHOOK_AUTHENTICITY | QUARANTINE_CONSISTENCY | COMPOSITE
 *     - honestyClaims must assert softObserveFreeze, noLiveIngressMutation,
 *       productionReadyNo, schemasAtCeiling, secretZeroHeld
 *     - Optional observedClaim (hermetic); bindingMatch + digestConsistent for PASS
 *     - authorized must be true for PASS
 *   Soft-observe of freeze pins alone is NOT ingress honesty truth
 *   Soft-observe EY/EZ/FA opaque ids only
 *   Refuse live ingress mutation / live webhook endpoint / wall-clock / tip-refresh / unsupervised mutation
 *   Refuse PRODUCTION_READY flip / tip-pin rewrite / schema-json add
 *   Refuse L30–L38 reopen; refuse L39 auto-close (FC pending)
 *   Refuse secrets / GHE / CloudAgent / Fundacion / mass prune
 *   schemas AT_CEILING 35/35
 *   Distinct from EY / EZ / FA / EW / ER / EH / EM / EU / EV / AU — attestation only
 */

import {
  FB_PRODUCTION_READY,
  FB_FREEZE_PIN_SHORT,
  FB_SUBJECT_KINDS,
  FB_ATTESTATION_STAGES
} from './ingress-honesty-attestation-receipt.js';

/** @type {'NO'} */
export const FB_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FB_POLICY_GATE_KIND = 'eos-ingress-honesty-attestation-policy-gate';

export const FB_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'ATTEST_INSPECT',
  'HONESTY_SEAL',
  'APPLY_SEAL',
  'SEAL'
]);

export const FB_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  ATTESTATION_UNAUTHORIZED: 'ATTESTATION_UNAUTHORIZED',
  INVALID_ATTESTATION_CLAIM: 'INVALID_ATTESTATION_CLAIM',
  BINDING_MISMATCH: 'BINDING_MISMATCH',
  DIGEST_INCONSISTENT: 'DIGEST_INCONSISTENT',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ATTESTATION: 'MISSING_ATTESTATION',
  INVALID_ATTESTATION: 'INVALID_ATTESTATION',
  MISSING_INGRESS_ID: 'MISSING_INGRESS_ID',
  MISSING_SUBJECT_KIND: 'MISSING_SUBJECT_KIND',
  INVALID_SUBJECT_KIND: 'INVALID_SUBJECT_KIND',
  MISSING_HONESTY_CLAIMS: 'MISSING_HONESTY_CLAIMS',
  INVALID_HONESTY_CLAIMS: 'INVALID_HONESTY_CLAIMS',
  INVALID_ATTESTATION_STAGE: 'INVALID_ATTESTATION_STAGE',
  LIVE_INGRESS_HONESTY_LIE: 'LIVE_INGRESS_HONESTY_LIE',
  LIVE_INGRESS_MUTATION_FORBIDDEN: 'LIVE_INGRESS_MUTATION_FORBIDDEN',
  LIVE_WEBHOOK_INGRESS_ENDPOINT_FORBIDDEN: 'LIVE_WEBHOOK_INGRESS_ENDPOINT_FORBIDDEN',
  RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN: 'RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  LIVE_UNSUPERVISED_MUTATION_FORBIDDEN: 'LIVE_UNSUPERVISED_MUTATION_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_PAYLOAD_MATERIAL_FORBIDDEN: 'RAW_PAYLOAD_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  EY_INGRESS_REGISTRY_AS_ATTESTATION_FORBIDDEN: 'EY_INGRESS_REGISTRY_AS_ATTESTATION_FORBIDDEN',
  EZ_WEBHOOK_AUTH_AS_ATTESTATION_FORBIDDEN: 'EZ_WEBHOOK_AUTH_AS_ATTESTATION_FORBIDDEN',
  FA_QUARANTINE_AS_ATTESTATION_FORBIDDEN: 'FA_QUARANTINE_AS_ATTESTATION_FORBIDDEN',
  EW_CREDENTIAL_HONESTY_AS_INGRESS_FORBIDDEN: 'EW_CREDENTIAL_HONESTY_AS_INGRESS_FORBIDDEN',
  AU_SECRET_BROKER_AS_PORT_FORBIDDEN: 'AU_SECRET_BROKER_AS_PORT_FORBIDDEN',
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
  /^signing[_-]?secret$/i,
  /^webhook[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i,
  /^webhook[_-]?token$/i,
  /^raw[_-]?signature$/i,
  /^signature$/i,
  /^x[_-]?hub[_-]?signature$/i,
  /^x[_-]?hub[_-]?signature[_-]?256$/i,
  /^payload[_-]?body$/i
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

const L30_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*30/i, /l(?:adder)?[\s_-]*30\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*30/i];
const L31_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*31/i, /l(?:adder)?[\s_-]*31\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*31/i];
const L32_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*32/i, /l(?:adder)?[\s_-]*32\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*32/i];
const L33_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*33/i, /l(?:adder)?[\s_-]*33\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*33/i];
const L34_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*34/i, /l(?:adder)?[\s_-]*34\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*34/i];
const L35_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*35/i, /l(?:adder)?[\s_-]*35\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*35/i];
const L36_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*36/i, /l(?:adder)?[\s_-]*36\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*36/i];
const L37_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*37/i, /l(?:adder)?[\s_-]*37\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*37/i];

const L38_REOPEN_PATTERNS = [/reopen\s+l(?:adder)?[\s_-]*38/i, /l(?:adder)?[\s_-]*38\s+reopen/i, /unseal\s+l(?:adder)?[\s_-]*38/i];
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

const GHE_PATTERNS = [/\bGHE\b/, /GitHub\s+Enterprise/i, /claim\s+GHA\s+green/i, /enterprise\s+branch\s+protection\s+enforced/i];

const LIVE_INGRESS_HONESTY_LIE_PATTERNS = [
  /\blive[-_\s]?ingress[-_\s]?mutation\s+authority\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?ingress\b/i,
  /\bnoLiveIngressMutation\s*[:=]\s*false\b/i,
  /\bsoft[-_\s]?observe\s+alone\s+(?:is|=)\s+ingress\s+(?:honesty\s+)?truth\b/i,
  /\bsoft[-_\s]?observe\s+freeze\s+pins?\s+alone\s+(?:is|=)\s+ingress\s+truth\b/i,
  /\bassert\s+live[-_\s]?ingress\s+honest\b/i,
  /\blive\s+ingress\s+truth\b/i
];

const LIVE_INGRESS_MUTATION_PATTERNS = [
  /\blive[-_\s]?ingress[-_\s]?mutation\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?ingress[-_\s]?mutation\b/i
];

const LIVE_WEBHOOK_INGRESS_ENDPOINT_PATTERNS = [
  /\blive\s+webhook\s+ingress\s+endpoint\b/i,
  /\blive\s+webhook\s+endpoint\b/i,
  /\blive\s+webhook\s+receiver\b/i,
  /\bbind\s+live\s+webhook\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?webhook\s+ingress\s+endpoint/i
];

const RAW_WEBHOOK_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+webhook\s+secret\b/i,
  /\braw\s+hmac\s+(?:key|secret|material)\b/i,
  /\bseal\s+(?:the\s+)?(?:webhook\s+)?secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:webhook\s+)?secret\b/i,
  /\bplaintext\s+(?:hmac|webhook)\s+(?:key|secret)\s+in\s+receipt\b/i
];

const WALL_CLOCK_PATTERNS = [
  /\bwall[-_\s]?clock\s+authority\b/i,
  /\bDate\.now\s+as\s+authority\b/i,
  /\bclaim(?:ing)?\s+wall[-_\s]?clock\b/i
];

const LIVE_MUTATION_PATTERNS = [
  /\blive[-_\s]?unsupervised[-_\s]?mutation\b/i,
  /\bunsupervised\s+handle\s+mutation\b/i,
  /\bunsupervised\s+secret\s+mutation\b/i
];

const TIP_REFRESH_AUTHORITY_PATTERNS = [
  /\btip[-_\s]?refresh\s+authority\b/i,
  /\bclaim(?:ing)?\s+tip[-_\s]?refresh\b/i,
  /\btip[-_\s]?refresh\s+as\s+ingress\s+truth\b/i
];
const RAW_PAYLOAD_MATERIAL_PATTERNS = [
  /\braw\s+(?:webhook\s+)?payload\b/i,
  /\bseal\s+(?:the\s+)?(?:raw\s+)?payload\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:webhook\s+)?payload\b/i,
  /\bcopy\s+payload\s+(?:body\s+)?into\s+receipt\b/i
];

const EY_AS_ATTESTATION_PATTERNS = [
  /make\s+external-event-ingress-registry\s+the\s+attestation\s+port/i,
  /elevate\s+ey\s+as\s+attestation/i,
  /ey\s+ingress\s+registry\s+as\s+attestation/i
];

const EZ_AS_ATTESTATION_PATTERNS = [
  /make\s+webhook-authenticity\s+the\s+attestation\s+port/i,
  /elevate\s+ez\s+as\s+attestation/i,
  /ez\s+webhook\s+authenticity\s+as\s+attestation/i
];

const FA_AS_ATTESTATION_PATTERNS = [
  /make\s+ingress-quarantine-replay-deny\s+the\s+attestation\s+port/i,
  /elevate\s+fa\s+as\s+attestation/i,
  /fa\s+quarantine\s+as\s+attestation/i
];

const EW_AS_INGRESS_PATTERNS = [
  /make\s+credential-honesty-attestation\s+the\s+ingress\s+port/i,
  /elevate\s+ew\s+as\s+ingress\s+attestation/i,
  /ew\s+credential\s+honesty\s+as\s+ingress/i
];

const AU_AS_PORT_PATTERNS = [
  /make\s+secret-runtime-broker\s+the\s+attestation\s+port/i,
  /elevate\s+au\s+as\s+attestation/i,
  /reopen\s+au\s+secret/i
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

export function scanForSecrets(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SECRET_PATTERNS.some((pat) => pat.test(str));
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

export function claimsProductionReadyFlip(val) {
  if (!val) return false;
  return PR_FLIP_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsHardDelete(val) {
  if (!val) return false;
  return HARD_DELETE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsMassPrune(val) {
  if (!val) return false;
  return MASS_PRUNE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsGhe(val) {
  if (!val) return false;
  return GHE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveIngressHonestyLie(val) {
  if (!val) return false;
  return LIVE_INGRESS_HONESTY_LIE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveIngressMutation(val) {
  if (!val) return false;
  return LIVE_INGRESS_MUTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveWebhookIngressEndpoint(val) {
  if (!val) return false;
  return LIVE_WEBHOOK_INGRESS_ENDPOINT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawWebhookSecretMaterial(val) {
  if (!val) return false;
  return RAW_WEBHOOK_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawPayloadMaterial(val) {
  if (!val) return false;
  return RAW_PAYLOAD_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  return WALL_CLOCK_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveUnsupervisedMutation(val) {
  if (!val) return false;
  return LIVE_MUTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEyAsAttestation(val) {
  if (!val) return false;
  return EY_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsEzAsAttestation(val) {
  if (!val) return false;
  return EZ_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsFaAsAttestation(val) {
  if (!val) return false;
  return FA_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsEwAsIngress(val) {
  if (!val) return false;
  return EW_AS_INGRESS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsAuAsPort(val) {
  if (!val) return false;
  return AU_AS_PORT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

function honestyClaimsAreValid(claims) {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return false;
  return (
    claims.softObserveFreeze === true &&
    claims.noLiveIngressMutation === true &&
    claims.productionReadyNo === true &&
    claims.schemasAtCeiling === true &&
    claims.secretZeroHeld === true
  );
}

function observedClaimIsValid(observedClaim, subjectKind) {
  if (observedClaim === undefined || observedClaim === null) return { ok: true };
  if (typeof observedClaim !== 'object' || Array.isArray(observedClaim)) {
    return { ok: false, reason: 'observedClaim must be a non-null object when provided' };
  }
  if (
    !observedClaim.claimKind ||
    typeof observedClaim.claimKind !== 'string' ||
    !observedClaim.claimKind.trim()
  ) {
    return { ok: false, reason: 'observedClaim.claimKind is required when observedClaim is provided' };
  }
  if (!FB_SUBJECT_KINDS.includes(observedClaim.claimKind)) {
    return {
      ok: false,
      reason:
        'observedClaim.claimKind must be one of EXTERNAL_EVENT_INGRESS|INGRESS_BINDING|WEBHOOK_AUTHENTICITY|QUARANTINE_CONSISTENCY|COMPOSITE'
    };
  }
  if (
    subjectKind !== 'COMPOSITE' &&
    observedClaim.claimKind !== 'COMPOSITE' &&
    observedClaim.claimKind !== subjectKind
  ) {
    return {
      ok: false,
      reason: 'observedClaim.claimKind must match attestation.subjectKind (unless COMPOSITE)'
    };
  }
  return { ok: true };
}

export class IngressHonestyAttestationPolicyGate {
  /**
   * Evaluates preconditions for the credential honesty attestation ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_CHANGE_ID,
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
        code: FB_CODES.FUNDACION_DENIED,
        reason:
          'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const secretField = findSecretLookingField(plan);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI absolute rejection — secret-looking field refused: ${secretField}`
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (
      plan.forceDelete === true ||
      plan.purge === true ||
      plan.hardDelete === true ||
      claimsHardDelete(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–37 are permanently CLOSED — NEVER reopen L30–L37.'
      };
    }
    if (claimsL31Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L31_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 31. NEVER reopen L31.' };
    }
    if (claimsL32Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L32_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 32. NEVER reopen L32.' };
    }
    if (claimsL33Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L33_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 33. NEVER reopen L33.' };
    }
    if (claimsL34Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L34_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 34. NEVER reopen L34.' };
    }
    if (claimsL35Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L35_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 35. NEVER reopen L35.' };
    }
    if (claimsL36Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L36_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 36. NEVER reopen L36.' };
    }
    if (claimsL37Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: FB_CODES.L37_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 37. NEVER reopen L37.' };
    }
    if (claimsL38Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.L38_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 38. Ladders 30–38 are permanently CLOSED — NEVER reopen L30–L38.'
      };
    }
    if (claimsL39AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.L39_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 39 is forbidden. FC pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.TIP_REWRITE_FORBIDDEN,
        reason:
          'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (plan.addSchemaJson === true || plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveIngressMutationAuthority === true || plan.claimLiveIngress === true || claimsLiveIngressHonestyLie(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.LIVE_INGRESS_HONESTY_LIE,
        reason:
          'Live secret store honesty lie refused. Attestation ≠ live secret store ≠ soft-observe-as-handle-truth ≠ tip-refresh.'
      };
    }

    if (plan.liveIngressMutation === true || claimsLiveIngressMutation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.LIVE_INGRESS_MUTATION_FORBIDDEN,
        reason: 'Live secret store refused. Hermetic attestation only.'
      };
    }

    if (plan.liveWebhookIngressEndpoint === true || claimsLiveWebhookIngressEndpoint(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.LIVE_WEBHOOK_INGRESS_ENDPOINT_FORBIDDEN,
        reason: 'Live secret mutation refused. Attestation only — does not mutate secret stores.'
      };
    }

    if (plan.rawWebhookSecretMaterial === true || claimsRawWebhookSecretMaterial(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Vault/KMS mutation refused. Attestation only.'
      };
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason:
          'Wall-clock authority is refused. Inject observedClaim hermetically; do not use Date.now as authority.'
      };
    }

    if (plan.liveUnsupervisedMutation === true || claimsLiveUnsupervisedMutation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.LIVE_UNSUPERVISED_MUTATION_FORBIDDEN,
        reason:
          'Live unsupervised mutation refused. Attestation only — does not bind/rotate/revoke handles.'
      };
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority refused. Tip-refresh post-FB is SEPARATE.'
      };
    }

    if (plan.rawPayloadMaterial === true || claimsRawPayloadMaterial(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.RAW_PAYLOAD_MATERIAL_FORBIDDEN,
        reason: 'Raw secret material refused (Law VI).'
      };
    }

    if (claimsEyAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.EY_INGRESS_REGISTRY_AS_ATTESTATION_FORBIDDEN,
        reason: 'EY external-event-ingress registry must not be elevated as the FB attestation port.'
      };
    }
    if (claimsEzAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.EZ_WEBHOOK_AUTH_AS_ATTESTATION_FORBIDDEN,
        reason: 'EZ webhook authenticity must not be elevated as the FB attestation port.'
      };
    }
    if (claimsFaAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.FA_QUARANTINE_AS_ATTESTATION_FORBIDDEN,
        reason: 'FA ingress quarantine/replay-deny must not be elevated as the FB attestation port.'
      };
    }
    if (claimsEwAsIngress(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.EW_CREDENTIAL_HONESTY_AS_INGRESS_FORBIDDEN,
        reason: 'EW credential honesty must not be elevated as the FB ingress attestation port.'
      };
    }
    if (claimsAuAsPort(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.AU_SECRET_BROKER_AS_PORT_FORBIDDEN,
        reason: 'AU secret-runtime-broker must not be reopened as the FB attestation port.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FB_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.attestation) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_ATTESTATION,
        reason: 'Missing attestation in active ritual mode'
      };
    }

    if (typeof plan.attestation !== 'object' || Array.isArray(plan.attestation)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.INVALID_ATTESTATION,
        reason: 'attestation must be a non-null object'
      };
    }

    if (
      !plan.attestation.ingressId ||
      typeof plan.attestation.ingressId !== 'string' ||
      !plan.attestation.ingressId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_INGRESS_ID,
        reason: 'attestation.ingressId is required (opaque ingress id only — never secrets/webhook bodies/HMAC keys)'
      };
    }

    if (
      !plan.attestation.subjectKind ||
      typeof plan.attestation.subjectKind !== 'string' ||
      !plan.attestation.subjectKind.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_SUBJECT_KIND,
        reason: 'attestation.subjectKind is required'
      };
    }

    if (!FB_SUBJECT_KINDS.includes(plan.attestation.subjectKind)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.INVALID_SUBJECT_KIND,
        reason:
          'attestation.subjectKind must be one of EXTERNAL_EVENT_INGRESS|INGRESS_BINDING|WEBHOOK_AUTHENTICITY|QUARANTINE_CONSISTENCY|COMPOSITE'
      };
    }

    if (
      plan.attestation.attestationStage !== undefined &&
      plan.attestation.attestationStage !== null &&
      !FB_ATTESTATION_STAGES.includes(plan.attestation.attestationStage)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.INVALID_ATTESTATION_STAGE,
        reason:
          'attestation.attestationStage must be one of BINDING_MATCH|AUTHENTICITY_MATCH|DIGEST_CONSISTENCY|SECRET_REFUSED|COMPOSITE'
      };
    }

    if (!plan.attestation.honestyClaims) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.MISSING_HONESTY_CLAIMS,
        reason: 'attestation.honestyClaims is required'
      };
    }

    if (!honestyClaimsAreValid(plan.attestation.honestyClaims)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.INVALID_HONESTY_CLAIMS,
        reason:
          'attestation.honestyClaims must assert softObserveFreeze, noLiveIngressMutation, productionReadyNo, schemasAtCeiling, secretZeroHeld all true'
      };
    }

    const claimCheck = observedClaimIsValid(
      plan.attestation.observedClaim,
      plan.attestation.subjectKind
    );
    if (!claimCheck.ok) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.INVALID_ATTESTATION_CLAIM,
        reason: `Fail-closed attestation DENY — ${claimCheck.reason}`
      };
    }

    if (plan.attestation.bindingMatch === false) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.BINDING_MISMATCH,
        reason: 'Fail-closed attestation DENY — binding match failed for opaque handleId.'
      };
    }

    if (plan.attestation.digestConsistent === false) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.DIGEST_INCONSISTENT,
        reason: 'Fail-closed attestation DENY — attestationDigest consistency check failed.'
      };
    }

    if (plan.attestation.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.ATTESTATION_UNAUTHORIZED,
        reason:
          'Fail-closed attestation DENY — hermetic claim unauthorized (≠ EY bind; ≠ EZ authenticity; ≠ FA quarantine; ≠ EW credential honesty).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: FB_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FB_CODES.OK,
      reason:
        'Plan satisfies all ingress honesty attestation preconditions (≠ live ingress mutation ≠ wall-clock ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA/EW/ER/EH/EM/EU/EV/AU). Soft-observe alone ≠ ingress honesty truth.'
    };
  }
}

void FB_PRODUCTION_READY;
void FB_FREEZE_PIN_SHORT;
