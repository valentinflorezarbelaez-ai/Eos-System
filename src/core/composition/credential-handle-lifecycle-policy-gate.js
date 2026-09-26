/**
 * @module credential-handle-lifecycle-policy-gate
 * SPEC-0158 / Mission EV — Policy Gate for Credential Handle Lifecycle / Rotation Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body;
 *           receipts seal opaque handleId + lifecycleDigest + stage only — never raw secrets,
 *           never new plaintext credentials on rotate
 *   Freeze soft-observe: pin 0eace5df (do NOT rewrite tip pins)
 *   Lifecycle claim:
 *     - Requires opaque handleId + desiredStage (STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD)
 *     - Optional observedLifecycle (hermetic injected stage)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Inject observedLifecycle only — no live secret mutation, no vault/KMS,
 *     no wall-clock authority, no tip-refresh authority, no raw secret material
 *   Distinct from ET bind, EU leak-deny, EQ config staged activation
 *   Refuse PRODUCTION_READY flip / L30–L37 reopen / L38 auto-close (EW–EX pending)
 *   Refuse tip-pin rewrite / tip-refresh / secrets / GHE / CloudAgent / schema-json add
 *   schemas AT_CEILING 35/35
 */
import {
  EV_PRODUCTION_READY,
  EV_FREEZE_PIN_SHORT,
  EV_STAGE_STATES
} from './credential-handle-lifecycle-receipt.js';

/** @type {'NO'} */
export const EV_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EV_POLICY_GATE_KIND = 'eos-credential-handle-lifecycle-policy-gate';

export const EV_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'STAGE_INSPECT',
  'LIFECYCLE_EVAL',
  'ROTATION_SEAL',
  'SEAL'
]);

export const EV_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  LIFECYCLE_UNAUTHORIZED: 'LIFECYCLE_UNAUTHORIZED',
  INVALID_LIFECYCLE_CLAIM: 'INVALID_LIFECYCLE_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_LIFECYCLE: 'MISSING_LIFECYCLE',
  INVALID_LIFECYCLE: 'INVALID_LIFECYCLE',
  MISSING_HANDLE_ID: 'MISSING_HANDLE_ID',
  MISSING_DESIRED_STAGE: 'MISSING_DESIRED_STAGE',
  INVALID_DESIRED_STAGE: 'INVALID_DESIRED_STAGE',
  INVALID_OBSERVED_LIFECYCLE: 'INVALID_OBSERVED_LIFECYCLE',
  LIVE_SECRET_MUTATION_FORBIDDEN: 'LIVE_SECRET_MUTATION_FORBIDDEN',
  LIVE_SECRET_STORE_FORBIDDEN: 'LIVE_SECRET_STORE_FORBIDDEN',
  VAULT_KMS_FORBIDDEN: 'VAULT_KMS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_SECRET_MATERIAL_FORBIDDEN: 'RAW_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  ET_HANDLE_BIND_AS_LIFECYCLE_FORBIDDEN: 'ET_HANDLE_BIND_AS_LIFECYCLE_FORBIDDEN',
  EU_LEAK_DENY_AS_LIFECYCLE_FORBIDDEN: 'EU_LEAK_DENY_AS_LIFECYCLE_FORBIDDEN',
  EQ_STAGED_ACTIVATION_AS_LIFECYCLE_FORBIDDEN: 'EQ_STAGED_ACTIVATION_AS_LIFECYCLE_FORBIDDEN',
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

const LIVE_SECRET_MUTATION_PATTERNS = [
  /\blive\s+secret\s+mutation\b/i,
  /\blive\s+credential\s+mutation\b/i,
  /\bmutate\s+live\s+secret\b/i,
  /\bunsupervised\s+live\s+secret\b/i,
  /\blive\s+rotate\s+secret\b/i,
  /\bclaim(?:ing)?\s+live\s+secret\s+mutation\b/i
];

const LIVE_SECRET_STORE_PATTERNS = [
  /\blive\s+secret\s+store\b/i,
  /\blive\s+vault\b/i,
  /\bsecrets?\s+manager\s+live\b/i,
  /\baws\s+secrets?\s+manager\b/i,
  /\bhashi(?:corp)?\s+vault\s+live\b/i,
  /\bbind\s+live\s+secret\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?secret\s+store/i
];

const VAULT_KMS_PATTERNS = [
  /\bvault\s*\/?\s*kms\b/i,
  /\blive\s+kms\b/i,
  /\bkms\s+rotate\s+live\b/i,
  /\bcall\s+(?:the\s+)?vault\b/i,
  /\baws\s+kms\s+live\b/i,
  /\bclaim(?:ing)?\s+vault(?:\/kms)?\b/i
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

const RAW_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+secret\s+material\b/i,
  /\bseal\s+(?:the\s+)?secret\b/i,
  /\bembed\s+(?:plaintext\s+)?secret\b/i,
  /\bcopy\s+secret\s+material\s+into\s+receipt\b/i,
  /\bplaintext\s+password\s+in\s+receipt\b/i,
  /\bnew\s+plaintext\s+credential\b/i,
  /\bseal\s+rotated\s+secret\b/i
];

const ET_HANDLE_BIND_AS_LIFECYCLE_PATTERNS = [
  /\bmake\s+credential[-_]?handle[-_]?registry\s+the\s+lifecycle\s+port\b/i,
  /\bet\s+bind\s+as\s+(?:the\s+)?lifecycle\s+port\b/i,
  /\belevate\s+et\s+(?:to\s+)?lifecycle\s+port\b/i,
  /\bet\s+as\s+credential[-_]?handle[-_]?lifecycle\b/i
];

const EU_LEAK_DENY_AS_LIFECYCLE_PATTERNS = [
  /\bmake\s+secret[-_]?zero[-_]?leak[-_]?deny\s+the\s+lifecycle\s+port\b/i,
  /\beu\s+leak[-_]?deny\s+as\s+(?:the\s+)?lifecycle\s+port\b/i,
  /\belevate\s+eu\s+(?:to\s+)?lifecycle\s+port\b/i,
  /\beu\s+as\s+credential[-_]?handle[-_]?lifecycle\b/i
];

const EQ_STAGED_ACTIVATION_AS_LIFECYCLE_PATTERNS = [
  /\bmake\s+config[-_]?staged[-_]?activation\s+the\s+lifecycle\s+port\b/i,
  /\beq\s+staged[-_]?activation\s+as\s+(?:the\s+)?lifecycle\s+port\b/i,
  /\belevate\s+eq\s+(?:to\s+)?lifecycle\s+port\b/i,
  /\beq\s+as\s+credential[-_]?handle[-_]?lifecycle\b/i,
  /\bconfig\s+pack\s+as\s+(?:the\s+)?credential[-_]?handle[-_]?lifecycle\b/i
];

const AU_SECRET_LEAK_GUARD_AS_PORT_PATTERNS = [
  /\breopen\s+au\s+secret[-_]?(?:runtime[-_]?broker|leak[-_]?guard)\b/i,
  /\bau\s+secret[-_]?leak[-_]?guard\s+as\s+(?:the\s+)?(?:composition\s+)?port\b/i,
  /\belevate\s+au\s+(?:secret[-_]?broker|leak[-_]?guard)\s+as\s+port\b/i,
  /\bmake\s+au\s+the\s+composition\s+port\b/i
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

export function claimsNetworkWrite(val) {
  if (!val) return false;
  return NETWORK_WRITE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsGhe(val) {
  if (!val) return false;
  return GHE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveSecretMutation(val) {
  if (!val) return false;
  return LIVE_SECRET_MUTATION_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsLiveSecretStore(val) {
  if (!val) return false;
  return LIVE_SECRET_STORE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsVaultKms(val) {
  if (!val) return false;
  return VAULT_KMS_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsRawSecretMaterial(val) {
  if (!val) return false;
  return RAW_SECRET_MATERIAL_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEtHandleBindAsLifecycle(val) {
  if (!val) return false;
  return ET_HANDLE_BIND_AS_LIFECYCLE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEuLeakDenyAsLifecycle(val) {
  if (!val) return false;
  return EU_LEAK_DENY_AS_LIFECYCLE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsEqStagedActivationAsLifecycle(val) {
  if (!val) return false;
  return EQ_STAGED_ACTIVATION_AS_LIFECYCLE_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function claimsAuSecretBrokerAsPort(val) {
  if (!val) return false;
  return AU_SECRET_LEAK_GUARD_AS_PORT_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidStageState(value) {
  return typeof value === 'string' && EV_STAGE_STATES.includes(value);
}

export class CredentialHandleLifecyclePolicyGate {
  /**
   * Evaluates preconditions for the credential-handle lifecycle ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MISSING_CHANGE_ID,
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
        code: EV_CODES.FUNDACION_DENIED,
        reason:
          'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.SECRET_FIELD_FORBIDDEN,
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque handleId + lifecycleDigest + stage only — never raw secrets, never new plaintext credentials on rotate.`
      };
    }

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.SECRET_LEAK_FORBIDDEN,
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
        code: EV_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L30_REOPEN_FORBIDDEN,
        reason:
          'Attempted to reopen Ladder 30. Ladders 30–37 are permanently CLOSED — NEVER reopen L30–L37.'
      };
    }
    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }
    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }
    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }
    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }
    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }
    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }
    if (claimsL37Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L37_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'
      };
    }

    if (claimsL38AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.L38_AUTO_CLOSE_FORBIDDEN,
        reason:
          'Premature or automatic closeout of Ladder 38 is forbidden. Audit+ET+EU MEASURED; EV this satellite; EW–EX pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.TIP_REWRITE_FORBIDDEN,
        reason:
          'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EV is SEPARATE.'
      };
    }

    if (plan.addSchemaJson === true || plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (plan.networkWrite === true || plan.remoteDispatch === true || claimsNetworkWrite(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.NETWORK_WRITE_FORBIDDEN,
        reason:
          'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveSecretMutation === true ||
      plan.mutateLiveSecret === true ||
      claimsLiveSecretMutation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.LIVE_SECRET_MUTATION_FORBIDDEN,
        reason:
          'Live secret mutation is refused. PASS seals hermetic lifecycle receipt only — inject observedLifecycle; do not mutate live secrets.'
      };
    }

    if (
      plan.liveSecretStore === true ||
      plan.bindLiveSecretStore === true ||
      claimsLiveSecretStore(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.LIVE_SECRET_STORE_FORBIDDEN,
        reason:
          'Live secret store is refused. PASS seals hermetic lifecycle receipt only — inject observedLifecycle; do not bind live secret stores.'
      };
    }

    if (plan.vaultKms === true || plan.callVault === true || claimsVaultKms(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.VAULT_KMS_FORBIDDEN,
        reason:
          'Vault/KMS live mutation is refused. EV seals opaque handle lifecycle only — no vault/KMS calls.'
      };
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason:
          'Wall-clock authority is refused. Inject observedLifecycle hermetically; do not use Date.now as authority.'
      };
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason:
          'Tip-refresh authority is refused. Soft-observe pin 0eace5df only; tip-refresh post-EV is SEPARATE.'
      };
    }

    if (
      plan.rawSecretMaterial === true ||
      plan.sealSecret === true ||
      claimsRawSecretMaterial(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.RAW_SECRET_MATERIAL_FORBIDDEN,
        reason:
          'Raw secret material in receipts is refused (Law VI). Seal opaque handleId + lifecycleDigest + stage only — never new plaintext credentials on rotate.'
      };
    }

    if (
      plan.etHandleBindAsLifecycle === true ||
      plan.etAsLifecyclePort === true ||
      claimsEtHandleBindAsLifecycle(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.ET_HANDLE_BIND_AS_LIFECYCLE_FORBIDDEN,
        reason:
          'ET credential-handle registry as the lifecycle port is refused. ET is bind ≠ EV lifecycle rotate.'
      };
    }

    if (
      plan.euLeakDenyAsLifecycle === true ||
      plan.euAsLifecyclePort === true ||
      claimsEuLeakDenyAsLifecycle(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.EU_LEAK_DENY_AS_LIFECYCLE_FORBIDDEN,
        reason:
          'EU secret-zero leak-deny as the lifecycle port is refused. EU is leak-deny ≠ EV lifecycle rotate.'
      };
    }

    if (
      plan.eqStagedActivationAsLifecycle === true ||
      plan.eqAsLifecyclePort === true ||
      claimsEqStagedActivationAsLifecycle(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.EQ_STAGED_ACTIVATION_AS_LIFECYCLE_FORBIDDEN,
        reason:
          'EQ config staged activation as the lifecycle port is refused. EQ activates config packs ≠ EV rotates credential handles.'
      };
    }

    if (
      plan.auSecretBrokerAsPort === true ||
      plan.reopenAu === true ||
      claimsAuSecretBrokerAsPort(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.AU_SECRET_BROKER_AS_PORT_FORBIDDEN,
        reason:
          'AU secret-runtime-broker as composition port is refused. Fold AU concepts into EV semantics; do NOT reopen AU or copy secret material into composition receipts.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EV_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.lifecycle) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MISSING_LIFECYCLE,
        reason: 'Missing lifecycle in active ritual mode'
      };
    }

    if (typeof plan.lifecycle !== 'object' || Array.isArray(plan.lifecycle)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.INVALID_LIFECYCLE,
        reason: 'lifecycle must be a non-null object'
      };
    }

    if (
      !plan.lifecycle.handleId ||
      typeof plan.lifecycle.handleId !== 'string' ||
      !plan.lifecycle.handleId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MISSING_HANDLE_ID,
        reason: 'lifecycle.handleId is required (opaque handle id only — never a secret)'
      };
    }

    if (
      plan.lifecycle.desiredStage === undefined ||
      plan.lifecycle.desiredStage === null ||
      plan.lifecycle.desiredStage === '' ||
      (typeof plan.lifecycle.desiredStage === 'string' && !plan.lifecycle.desiredStage.trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.MISSING_DESIRED_STAGE,
        reason:
          'lifecycle.desiredStage is required (STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD)'
      };
    }

    if (!isValidStageState(plan.lifecycle.desiredStage)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.INVALID_DESIRED_STAGE,
        reason:
          'lifecycle.desiredStage must be one of STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD'
      };
    }

    if (
      plan.lifecycle.observedLifecycle !== undefined &&
      plan.lifecycle.observedLifecycle !== null &&
      !isValidStageState(plan.lifecycle.observedLifecycle)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.INVALID_OBSERVED_LIFECYCLE,
        reason:
          'lifecycle.observedLifecycle must be one of STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD when provided (hermetic injection)'
      };
    }

    if (plan.lifecycle.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.LIFECYCLE_UNAUTHORIZED,
        reason:
          'Fail-closed lifecycle DENY — hermetic lifecycle claim unauthorized (≠ ET bind; ≠ EU leak-deny; ≠ EQ config staged activation).'
      };
    }

    if (
      plan.lifecycle.observedLifecycle !== undefined &&
      plan.lifecycle.observedLifecycle !== null &&
      plan.lifecycle.observedLifecycle !== plan.lifecycle.desiredStage
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.INVALID_LIFECYCLE_CLAIM,
        reason:
          'Fail-closed lifecycle DENY — hermetic observedLifecycle mismatches desiredStage (invalid lifecycle claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EV_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EV_CODES.OK,
      reason:
        'Plan satisfies all credential-handle-lifecycle governance preconditions (≠ ET/EU/EQ ≠ live secret mutation ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EV_PRODUCTION_READY;
void EV_FREEZE_PIN_SHORT;
