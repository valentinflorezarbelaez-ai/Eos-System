/**
 * @module credential-honesty-attestation-policy-gate
 * SPEC-0159 / Mission EW — Policy Gate for Credential Honesty & Handle Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields; synthetic tokens in tests;
 *     seal opaque handleId + attestationDigest + stage/verdict only
 *   Freeze soft-observe: pin 376378be (do NOT rewrite tip pins)
 *   Attestation:
 *     - Requires attestation with handleId + subjectKind + honestyClaims
 *     - subjectKind ∈ CREDENTIAL_HANDLE | HANDLE_BINDING | HANDLE_LIFECYCLE | COMPOSITE
 *     - honestyClaims must assert softObserveFreeze, noLiveSecretStore,
 *       productionReadyNo, schemasAtCeiling, secretZeroHeld
 *     - Optional observedClaim (hermetic); bindingMatch + digestConsistent for PASS
 *     - authorized must be true for PASS
 *   ALLOW/PASS seals hermetic honesty attestation receipt only
 *   Soft-observe of freeze pins alone is NOT handle truth
 *   Refuse live secret store / vault-KMS / wall-clock / tip-refresh / unsupervised mutation
 *   Refuse PRODUCTION_READY flip / tip-pin rewrite / schema-json add
 *   Refuse L30–L37 reopen; refuse L38 auto-close (EX pending)
 *   Refuse secrets / GHE / CloudAgent / Fundacion / mass prune
 *   schemas AT_CEILING 35/35
 *   Distinct from ET / EU / EV / ER / EM / EH / AU — attestation only
 */

import {
  EW_PRODUCTION_READY,
  EW_FREEZE_PIN_SHORT,
  EW_SUBJECT_KINDS,
  EW_ATTESTATION_STAGES
} from './credential-honesty-attestation-receipt.js';

/** @type {'NO'} */
export const EW_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EW_POLICY_GATE_KIND = 'eos-credential-honesty-attestation-policy-gate';

export const EW_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'ATTEST_INSPECT',
  'HONESTY_SEAL',
  'APPLY_SEAL',
  'SEAL'
]);

export const EW_CODES = Object.freeze({
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
  MISSING_HANDLE_ID: 'MISSING_HANDLE_ID',
  MISSING_SUBJECT_KIND: 'MISSING_SUBJECT_KIND',
  INVALID_SUBJECT_KIND: 'INVALID_SUBJECT_KIND',
  MISSING_HONESTY_CLAIMS: 'MISSING_HONESTY_CLAIMS',
  INVALID_HONESTY_CLAIMS: 'INVALID_HONESTY_CLAIMS',
  INVALID_ATTESTATION_STAGE: 'INVALID_ATTESTATION_STAGE',
  LIVE_SECRET_STORE_HONESTY_LIE: 'LIVE_SECRET_STORE_HONESTY_LIE',
  LIVE_SECRET_STORE_FORBIDDEN: 'LIVE_SECRET_STORE_FORBIDDEN',
  LIVE_SECRET_MUTATION_FORBIDDEN: 'LIVE_SECRET_MUTATION_FORBIDDEN',
  VAULT_KMS_FORBIDDEN: 'VAULT_KMS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  LIVE_UNSUPERVISED_MUTATION_FORBIDDEN: 'LIVE_UNSUPERVISED_MUTATION_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_SECRET_MATERIAL_FORBIDDEN: 'RAW_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_HANDLE_BIND_AS_ATTESTATION_FORBIDDEN: 'ET_HANDLE_BIND_AS_ATTESTATION_FORBIDDEN',
  EU_LEAK_DENY_AS_ATTESTATION_FORBIDDEN: 'EU_LEAK_DENY_AS_ATTESTATION_FORBIDDEN',
  EV_LIFECYCLE_AS_ATTESTATION_FORBIDDEN: 'EV_LIFECYCLE_AS_ATTESTATION_FORBIDDEN',
  ER_CONFIG_HONESTY_AS_HANDLE_FORBIDDEN: 'ER_CONFIG_HONESTY_AS_HANDLE_FORBIDDEN',
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
  L38_AUTO_CLOSE_FORBIDDEN: 'L38_AUTO_CLOSE_FORBIDDEN',
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
  /^new[_-]?password$/i,
  /^new[_-]?secret$/i,
  /^rotated[_-]?secret$/i,
  /^plaintext[_-]?credential$/i
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

const L38_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*38/i,
  /l(?:adder)?[\s_-]*38\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*38/i,
  /close\s+l(?:adder)?[\s_-]*38\s+now/i
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

const LIVE_SECRET_STORE_HONESTY_LIE_PATTERNS = [
  /\blive[-_\s]?secret[-_\s]?store\s+authority\b/i,
  /\blive[-_\s]?remote[-_\s]?secret[-_\s]?store\s+authority\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?secret[-_\s]?store\b/i,
  /\bnoLiveSecretStore\s*[:=]\s*false\b/i,
  /\bsoft[-_\s]?observe\s+alone\s+(?:is|=)\s+handle\s+truth\b/i,
  /\bsoft[-_\s]?observe\s+freeze\s+pins?\s+alone\s+(?:is|=)\s+handle\s+truth\b/i,
  /\bassert\s+live[-_\s]?secret[-_\s]?store\s+honest\b/i,
  /\blive\s+secret[-_\s]?store\s+truth\b/i
];

const LIVE_SECRET_STORE_PATTERNS = [
  /\blive[-_\s]?secret[-_\s]?store\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?secret[-_\s]?store\b/i
];

const LIVE_SECRET_MUTATION_PATTERNS = [
  /\blive[-_\s]?secret[-_\s]?mutation\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?secret[-_\s]?mutation\b/i,
  /\bunsupervised\s+secret\s+mutation\b/i
];

const VAULT_KMS_PATTERNS = [
  /\bvault\s*\/\s*kms\b/i,
  /\bvault[-_\s]?kms\b/i,
  /\bclaim(?:ing)?\s+vault\b/i,
  /\bkms\s+rotate\b/i,
  /\bvault\/kms\b/i
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
  /\btip[-_\s]?refresh\s+as\s+handle\s+truth\b/i
];

const ET_AS_ATTESTATION_PATTERNS = [
  /make\s+credential-handle-registry\s+the\s+attestation\s+port/i,
  /elevate\s+et\s+as\s+attestation/i,
  /et\s+bind\s+as\s+attestation/i
];

const EU_AS_ATTESTATION_PATTERNS = [
  /make\s+secret-zero-leak-deny\s+the\s+attestation\s+port/i,
  /elevate\s+eu\s+as\s+attestation/i,
  /eu\s+leak-deny\s+as\s+attestation/i
];

const EV_AS_ATTESTATION_PATTERNS = [
  /make\s+credential-handle-lifecycle\s+the\s+attestation\s+port/i,
  /elevate\s+ev\s+as\s+attestation/i,
  /ev\s+lifecycle\s+as\s+attestation/i
];

const ER_AS_HANDLE_PATTERNS = [
  /make\s+config-honesty-attestation\s+the\s+handle\s+port/i,
  /elevate\s+er\s+as\s+handle\s+attestation/i,
  /er\s+config\s+honesty\s+as\s+handle/i
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
export function claimsL38AutoClose(val) {
  if (!val) return false;
  return L38_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsLiveSecretStoreHonestyLie(val) {
  if (!val) return false;
  return LIVE_SECRET_STORE_HONESTY_LIE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveSecretStore(val) {
  if (!val) return false;
  return LIVE_SECRET_STORE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveSecretMutation(val) {
  if (!val) return false;
  return LIVE_SECRET_MUTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsVaultKms(val) {
  if (!val) return false;
  return VAULT_KMS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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

export function claimsEtAsAttestation(val) {
  if (!val) return false;
  return ET_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsEuAsAttestation(val) {
  if (!val) return false;
  return EU_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsEvAsAttestation(val) {
  if (!val) return false;
  return EV_AS_ATTESTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}
export function claimsErAsHandle(val) {
  if (!val) return false;
  return ER_AS_HANDLE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
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
    claims.noLiveSecretStore === true &&
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
  if (!EW_SUBJECT_KINDS.includes(observedClaim.claimKind)) {
    return {
      ok: false,
      reason:
        'observedClaim.claimKind must be one of CREDENTIAL_HANDLE|HANDLE_BINDING|HANDLE_LIFECYCLE|COMPOSITE'
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

export class CredentialHonestyAttestationPolicyGate {
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
        code: EW_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MISSING_CHANGE_ID,
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
        code: EW_CODES.FUNDACION_DENIED,
        reason:
          'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const secretField = findSecretLookingField(plan);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI absolute rejection — secret-looking field refused: ${secretField}`
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.SECRET_LEAK_FORBIDDEN,
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
        code: EW_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–37 are permanently CLOSED — NEVER reopen L30–L37.'
      };
    }
    if (claimsL31Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L31_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 31. NEVER reopen L31.' };
    }
    if (claimsL32Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L32_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 32. NEVER reopen L32.' };
    }
    if (claimsL33Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L33_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 33. NEVER reopen L33.' };
    }
    if (claimsL34Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L34_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 34. NEVER reopen L34.' };
    }
    if (claimsL35Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L35_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 35. NEVER reopen L35.' };
    }
    if (claimsL36Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L36_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 36. NEVER reopen L36.' };
    }
    if (claimsL37Reopen(planClean)) {
      return { ok: false, decision: 'DENY', code: EW_CODES.L37_REOPEN_FORBIDDEN, reason: 'Attempted to reopen Ladder 37. NEVER reopen L37.' };
    }
    if (claimsL38AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.L38_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 38 is forbidden. EX pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.TIP_REWRITE_FORBIDDEN,
        reason:
          'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (plan.addSchemaJson === true || plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveSecretStoreAuthority === true ||
      plan.claimLiveSecretStore === true ||
      claimsLiveSecretStoreHonestyLie(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.LIVE_SECRET_STORE_HONESTY_LIE,
        reason:
          'Live secret store honesty lie refused. Attestation ≠ live secret store ≠ soft-observe-as-handle-truth ≠ tip-refresh.'
      };
    }

    if (plan.liveSecretStore === true || claimsLiveSecretStore(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.LIVE_SECRET_STORE_FORBIDDEN,
        reason: 'Live secret store refused. Hermetic attestation only.'
      };
    }

    if (plan.liveSecretMutation === true || claimsLiveSecretMutation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.LIVE_SECRET_MUTATION_FORBIDDEN,
        reason: 'Live secret mutation refused. Attestation only — does not mutate secret stores.'
      };
    }

    if (plan.vaultKms === true || claimsVaultKms(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.VAULT_KMS_FORBIDDEN,
        reason: 'Vault/KMS mutation refused. Attestation only.'
      };
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason:
          'Wall-clock authority is refused. Inject observedClaim hermetically; do not use Date.now as authority.'
      };
    }

    if (plan.liveUnsupervisedMutation === true || claimsLiveUnsupervisedMutation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.LIVE_UNSUPERVISED_MUTATION_FORBIDDEN,
        reason:
          'Live unsupervised mutation refused. Attestation only — does not bind/rotate/revoke handles.'
      };
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority refused. Tip-refresh post-EW is SEPARATE.'
      };
    }

    if (plan.rawSecretMaterial === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.RAW_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw secret material refused (Law VI).'
      };
    }

    if (claimsEtAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.ET_HANDLE_BIND_AS_ATTESTATION_FORBIDDEN,
        reason: 'ET credential-handle registry must not be elevated as the EW attestation port.'
      };
    }
    if (claimsEuAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.EU_LEAK_DENY_AS_ATTESTATION_FORBIDDEN,
        reason: 'EU secret-zero leak-deny must not be elevated as the EW attestation port.'
      };
    }
    if (claimsEvAsAttestation(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.EV_LIFECYCLE_AS_ATTESTATION_FORBIDDEN,
        reason: 'EV credential-handle lifecycle must not be elevated as the EW attestation port.'
      };
    }
    if (claimsErAsHandle(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.ER_CONFIG_HONESTY_AS_HANDLE_FORBIDDEN,
        reason: 'ER config honesty must not be elevated as the EW handle attestation port.'
      };
    }
    if (claimsAuAsPort(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.AU_SECRET_BROKER_AS_PORT_FORBIDDEN,
        reason: 'AU secret-runtime-broker must not be reopened as the EW attestation port.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EW_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.attestation) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MISSING_ATTESTATION,
        reason: 'Missing attestation in active ritual mode'
      };
    }

    if (typeof plan.attestation !== 'object' || Array.isArray(plan.attestation)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.INVALID_ATTESTATION,
        reason: 'attestation must be a non-null object'
      };
    }

    if (
      !plan.attestation.handleId ||
      typeof plan.attestation.handleId !== 'string' ||
      !plan.attestation.handleId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MISSING_HANDLE_ID,
        reason: 'attestation.handleId is required (opaque handle only — never secret material)'
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
        code: EW_CODES.MISSING_SUBJECT_KIND,
        reason: 'attestation.subjectKind is required'
      };
    }

    if (!EW_SUBJECT_KINDS.includes(plan.attestation.subjectKind)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.INVALID_SUBJECT_KIND,
        reason:
          'attestation.subjectKind must be one of CREDENTIAL_HANDLE|HANDLE_BINDING|HANDLE_LIFECYCLE|COMPOSITE'
      };
    }

    if (
      plan.attestation.attestationStage !== undefined &&
      plan.attestation.attestationStage !== null &&
      !EW_ATTESTATION_STAGES.includes(plan.attestation.attestationStage)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.INVALID_ATTESTATION_STAGE,
        reason:
          'attestation.attestationStage must be one of BINDING_MATCH|DIGEST_CONSISTENCY|SECRET_REFUSED|COMPOSITE'
      };
    }

    if (!plan.attestation.honestyClaims) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.MISSING_HONESTY_CLAIMS,
        reason: 'attestation.honestyClaims is required'
      };
    }

    if (!honestyClaimsAreValid(plan.attestation.honestyClaims)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.INVALID_HONESTY_CLAIMS,
        reason:
          'attestation.honestyClaims must assert softObserveFreeze, noLiveSecretStore, productionReadyNo, schemasAtCeiling, secretZeroHeld all true'
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
        code: EW_CODES.INVALID_ATTESTATION_CLAIM,
        reason: `Fail-closed attestation DENY — ${claimCheck.reason}`
      };
    }

    if (plan.attestation.bindingMatch === false) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.BINDING_MISMATCH,
        reason: 'Fail-closed attestation DENY — binding match failed for opaque handleId.'
      };
    }

    if (plan.attestation.digestConsistent === false) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.DIGEST_INCONSISTENT,
        reason: 'Fail-closed attestation DENY — attestationDigest consistency check failed.'
      };
    }

    if (plan.attestation.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.ATTESTATION_UNAUTHORIZED,
        reason:
          'Fail-closed attestation DENY — hermetic claim unauthorized (≠ ET bind; ≠ EU leak-deny; ≠ EV lifecycle; ≠ ER config honesty).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EW_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EW_CODES.OK,
      reason:
        'Plan satisfies all credential honesty attestation preconditions (≠ live secret store ≠ wall-clock ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EV/ER/EM/EH/AU). Soft-observe alone ≠ handle truth.'
    };
  }
}

void EW_PRODUCTION_READY;
void EW_FREEZE_PIN_SHORT;
