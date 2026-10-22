/**
 * @module bidirectional-delivery-honesty-attestation-policy-gate
 * SPEC-0174 / Mission FL — Bidirectional Delivery Honesty & Integrity Attestation Policy Gate.
 * Pure Layer-0 Node.js. Never seal secrets (Law VI).
 *
 * Fail-closed preconditions for attesting bidirectional delivery honesty/integrity claims.
 * FL attests a claim; it never copies, moves, quarantines or seals payload bytes.
 *
 * Freeze soft-observe pin: e1a17e9b (post-#578 merge / FK MEASURED soft-observe).
 * NEVER reopen L30–L40; refuse L41 auto-close (FM pending).
 * PRODUCTION_READY: NO
 */

import {
  FL_ATTESTATIONS,
  FL_CLAIMS,
  FL_FREEZE_PIN_SHORT,
  FL_PRODUCTION_READY
} from './bidirectional-delivery-honesty-attestation-receipt.js';

/** @type {'NO'} */
export const FL_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FL_POLICY_GATE_KIND = 'eos-bidirectional-delivery-honesty-attestation-policy-gate';

export const FL_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'FI_BINDING_INSPECT',
  'FJ_VERDICT_INSPECT',
  'FK_DECISION_INSPECT',
  'HONESTY_CLAIM_CLASSIFY',
  'ATTESTATION_SEAL',
  'SEAL'
]);

export const FL_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  ATTESTATION_UNAUTHORIZED: 'ATTESTATION_UNAUTHORIZED',
  INVALID_ATTESTATION_CLAIM: 'INVALID_ATTESTATION_CLAIM',
  CLAIM_CONTRADICTED: 'CLAIM_CONTRADICTED',
  CLAIM_UNVERIFIED: 'CLAIM_UNVERIFIED',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ATTESTATION: 'MISSING_ATTESTATION',
  INVALID_ATTESTATION: 'INVALID_ATTESTATION',
  MISSING_CORRELATION_ID: 'MISSING_CORRELATION_ID',
  MISSING_BINDING_ID: 'MISSING_BINDING_ID',
  MISSING_ROUND_TRIP_ID: 'MISSING_ROUND_TRIP_ID',
  MISSING_REQUEST_ID: 'MISSING_REQUEST_ID',
  MISSING_REPLY_ID: 'MISSING_REPLY_ID',
  MISSING_QUARANTINE_DECISION_ID: 'MISSING_QUARANTINE_DECISION_ID',
  MISSING_REQUEST_DIGEST: 'MISSING_REQUEST_DIGEST',
  MISSING_REPLY_DIGEST: 'MISSING_REPLY_DIGEST',
  INVALID_REQUEST_DIGEST: 'INVALID_REQUEST_DIGEST',
  INVALID_REPLY_DIGEST: 'INVALID_REPLY_DIGEST',
  MISSING_MISMATCH_DIGEST: 'MISSING_MISMATCH_DIGEST',
  INVALID_MISMATCH_DIGEST: 'INVALID_MISMATCH_DIGEST',
  MISSING_ATTESTATION_CLASS: 'MISSING_ATTESTATION_CLASS',
  MISSING_DESIRED_ATTESTATION: 'MISSING_DESIRED_ATTESTATION',
  INVALID_DESIRED_ATTESTATION: 'INVALID_DESIRED_ATTESTATION',
  MISSING_OBSERVED_CLAIM: 'MISSING_OBSERVED_CLAIM',
  INVALID_OBSERVED_CLAIM: 'INVALID_OBSERVED_CLAIM',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN: 'RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FI_AS_ATTESTATION_FORBIDDEN: 'FI_AS_ATTESTATION_FORBIDDEN',
  FJ_AS_ATTESTATION_FORBIDDEN: 'FJ_AS_ATTESTATION_FORBIDDEN',
  FK_AS_ATTESTATION_FORBIDDEN: 'FK_AS_ATTESTATION_FORBIDDEN',
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
  /^request[_-]?hmac$/i,
  /^reply[_-]?hmac$/i,
  /^request[_-]?payload$/i,
  /^reply[_-]?payload$/i,
  /^raw[_-]?request[_-]?payload$/i,
  /^raw[_-]?reply[_-]?payload$/i,
  /^raw[_-]?payload$/i,
  /^payload[_-]?hmac$/i,
  /^attestation[_-]?secret$/i,
  /^attestation[_-]?payload$/i,
  /^claim[_-]?hmac$/i,
  /^honesty[_-]?secret$/i
];

const PR_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const HARD_DELETE_PATTERNS = [/force[-_]?delete/i, /\bpurge\b/i, /hard[-_]?delete/i, /\bdestroy\b/i];

const MASS_PRUNE_PATTERNS = [/mass\s+prune/i, /prune\s+all/i, /delete\s+all\s+tests/i, /bulk\s+delete/i];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:the\s+)?tip\s+pin/i,
  /tip[_-]?pin\s+rewrite/i,
  /overwrite\s+freeze\s+main_tip/i,
  /force\s+push\s+tip\s+pin/i
];

const SCHEMA_JSON_PATTERNS = [
  /add\s+(?:a\s+)?schema\s+json/i,
  /new\s+schema\.json/i,
  /raise\s+AT_CEILING/i
];

const NETWORK_WRITE_PATTERNS = [/network\s+write/i, /http\s+post\s+to/i, /socket\s+write/i];

const GHE_PATTERNS = [/\bGHE\b/, /github\s+enforcement/i, /green\s+check\s+enforced/i];

const LIVE_HTTP_EGRESS_PATTERNS = [
  /live\s+http\s+egress/i,
  /bind\s+live\s+http/i,
  /fetch\s+the\s+live\s+endpoint/i,
  /real\s+network\s+call/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /wall[-_\s]?clock\s+authority/i,
  /use\s+Date\.now\s+as\s+authority/i,
  /trust\s+the\s+system\s+clock/i
];

const TIP_REFRESH_AUTHORITY_PATTERNS = [
  /tip[-_\s]?refresh\s+authority/i,
  /advance\s+the\s+freeze\s+pin/i,
  /this\s+package\s+refreshes\s+the\s+tip/i
];

const RAW_ATTESTATION_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+request\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+reply\s+(?:payload|secret|hmac)\b/i,
  /\braw\s+attestation\s+(?:secret|hmac|payload)\b/i,
  /\bseal\s+(?:the\s+)?(?:request|reply|attestation)\s+secret\b/i,
  /\bcopy\s+(?:request|reply)\s+payload\s+into\s+(?:attestation|receipt)\b/i
];

const FI_AS_ATTESTATION_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?attestation\s+port\b/i,
  /\bfi\s+correlation\s+registry\s+as\s+(?:the\s+)?attestation\s+port\b/i,
  /\belevate\s+fi\s+(?:to\s+)?attestation\b/i
];

const FJ_AS_ATTESTATION_PATTERNS = [
  /\bmake\s+fj\s+(?:the\s+)?attestation\s+port\b/i,
  /\bfj\s+round[-_]?trip\s+as\s+(?:the\s+)?attestation\s+port\b/i,
  /\belevate\s+fj\s+(?:to\s+)?attestation\b/i
];

const FK_AS_ATTESTATION_PATTERNS = [
  /\bmake\s+fk\s+(?:the\s+)?attestation\s+port\b/i,
  /\bfk\s+quarantine\s+as\s+(?:the\s+)?attestation\s+port\b/i,
  /\belevate\s+fk\s+(?:to\s+)?attestation\b/i
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
  return SECRET_PATTERNS.some((pat) => pat.test(stringifySafe(val)));
}

function claimsAny(val, patterns) {
  if (!val) return false;
  return patterns.some((pat) => pat.test(stringifySafe(val)));
}

export const claimsProductionReadyFlip = (v) => claimsAny(v, PR_FLIP_PATTERNS);
export const claimsHardDelete = (v) => claimsAny(v, HARD_DELETE_PATTERNS);
export const claimsMassPrune = (v) => claimsAny(v, MASS_PRUNE_PATTERNS);
export const claimsTipRewrite = (v) => claimsAny(v, TIP_REWRITE_PATTERNS);
export const claimsSchemaJsonAdd = (v) => claimsAny(v, SCHEMA_JSON_PATTERNS);
export const claimsNetworkWrite = (v) => claimsAny(v, NETWORK_WRITE_PATTERNS);
export const claimsGhe = (v) => claimsAny(v, GHE_PATTERNS);
export const claimsLiveHttpEgress = (v) => claimsAny(v, LIVE_HTTP_EGRESS_PATTERNS);
export const claimsWallClockAuthority = (v) => claimsAny(v, WALL_CLOCK_AUTHORITY_PATTERNS);
export const claimsTipRefreshAuthority = (v) => claimsAny(v, TIP_REFRESH_AUTHORITY_PATTERNS);
export const claimsRawAttestationSecretMaterial = (v) =>
  claimsAny(v, RAW_ATTESTATION_SECRET_MATERIAL_PATTERNS);
export const claimsFiAsAttestation = (v) => claimsAny(v, FI_AS_ATTESTATION_PATTERNS);
export const claimsFjAsAttestation = (v) => claimsAny(v, FJ_AS_ATTESTATION_PATTERNS);
export const claimsFkAsAttestation = (v) => claimsAny(v, FK_AS_ATTESTATION_PATTERNS);

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
  return patterns ? claimsAny(val, patterns) : false;
}

export const claimsL30Reopen = (v) => claimsLadderReopen(v, 30);
export const claimsL31Reopen = (v) => claimsLadderReopen(v, 31);
export const claimsL32Reopen = (v) => claimsLadderReopen(v, 32);
export const claimsL33Reopen = (v) => claimsLadderReopen(v, 33);
export const claimsL34Reopen = (v) => claimsLadderReopen(v, 34);
export const claimsL35Reopen = (v) => claimsLadderReopen(v, 35);
export const claimsL36Reopen = (v) => claimsLadderReopen(v, 36);
export const claimsL37Reopen = (v) => claimsLadderReopen(v, 37);
export const claimsL38Reopen = (v) => claimsLadderReopen(v, 38);
export const claimsL39Reopen = (v) => claimsLadderReopen(v, 39);
export const claimsL40Reopen = (v) => claimsLadderReopen(v, 40);

const L41_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*41/i,
  /l(?:adder)?[\s_-]*41\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*41/i,
  /close\s+l(?:adder)?[\s_-]*41\s+now/i
];

export const claimsL41AutoClose = (v) => claimsAny(v, L41_AUTO_CLOSE_PATTERNS);

export function isFundacionTarget(target) {
  if (!target) return false;
  return /(?:Fundacion|fundacion)/i.test(stringifySafe(target));
}

export function isValidAttestation(value) {
  return typeof value === 'string' && FL_ATTESTATIONS.includes(value);
}

export function isValidClaim(value) {
  return typeof value === 'string' && FL_CLAIMS.includes(value);
}

export function isValidSha256Hex(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

export class BidirectionalDeliveryHonestyAttestationPolicyGate {
  /**
   * Evaluates preconditions for the honesty & integrity attestation ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    const deny = (code, reason) => ({ ok: false, decision: 'DENY', code, reason });
    const hold = (reason) => ({ ok: true, decision: 'HOLD', code: FL_CODES.HOLD, reason });

    if (!plan || typeof plan !== 'object') {
      return deny(FL_CODES.DENY, 'Invalid plan: input must be an object');
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return deny(FL_CODES.MISSING_PLAN_ID, 'Missing planId in input');
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return deny(FL_CODES.MISSING_CHANGE_ID, 'Missing changeId in input');
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return deny(
        FL_CODES.FUNDACION_DENIED,
        'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    const planClean = stripReceipts(plan);

    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return deny(
        FL_CODES.SECRET_FIELD_FORBIDDEN,
        `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Attestation receipts may seal opaque FI/FJ/FK ids, classes, claims and digests of non-secret metadata only.`
      );
    }

    if (scanForSecrets(planClean)) {
      return deny(
        FL_CODES.SECRET_LEAK_FORBIDDEN,
        'Plan contains potential plain secret token. Law VI absolute rejection.'
      );
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return deny(FL_CODES.HARD_DELETE_FORBIDDEN, 'Hard delete / purge operations are strictly forbidden in EOS governance.');
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return deny(FL_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune operations are strictly forbidden.');
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return deny(FL_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.');
    }

    for (let ladder = 30; ladder <= 40; ladder += 1) {
      if (plan[`reopenL${ladder}`] === true || claimsLadderReopen(planClean, ladder)) {
        return deny(
          FL_CODES[`L${ladder}_REOPEN_FORBIDDEN`],
          `Attempted to reopen Ladder ${ladder}. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.`
        );
      }
    }

    if (plan.autoCloseL41 === true || claimsL41AutoClose(planClean)) {
      return deny(FL_CODES.L41_AUTO_CLOSE_FORBIDDEN, 'L41 auto-close is refused. FM remains pending; L41 closure is a separate governed act.');
    }

    if (plan.tipRewrite === true || claimsTipRewrite(planClean)) {
      return deny(FL_CODES.TIP_REWRITE_FORBIDDEN, `Tip-pin rewrite is refused. Soft-observe pin ${FL_FREEZE_PIN_SHORT} only.`);
    }

    if (plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return deny(FL_CODES.SCHEMA_JSON_ADD_FORBIDDEN, 'Schema JSON add is refused. schemas AT_CEILING 35/35.');
    }

    if (plan.networkWrite === true || claimsNetworkWrite(planClean)) {
      return deny(FL_CODES.NETWORK_WRITE_FORBIDDEN, 'Network write is refused. Hermetic in-memory only.');
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return deny(FL_CODES.GHE_CLAIM_FORBIDDEN, 'GHE / enterprise enforcement claims are refused.');
    }

    if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
      return deny(FL_CODES.LIVE_HTTP_EGRESS_FORBIDDEN, 'Live HTTP egress is refused. PASS seals a hermetic attestation only.');
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return deny(FL_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN, 'Wall-clock authority is refused. Inject observedClaim hermetically.');
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return deny(FL_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN, `Tip-refresh authority is refused. Soft-observe pin ${FL_FREEZE_PIN_SHORT} only; tip-refresh is SEPARATE.`);
    }

    if (plan.rawSecretMaterial === true || plan.sealSecret === true || claimsRawAttestationSecretMaterial(planClean)) {
      return deny(
        FL_CODES.RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN,
        'Raw attestation secret / HMAC / request-reply payload material in attestation records is refused (Law VI). Seal opaque ids, classes, claims and digests only.'
      );
    }

    if (plan.fiAsAttestation === true || claimsFiAsAttestation(planClean)) {
      return deny(FL_CODES.FI_AS_ATTESTATION_FORBIDDEN, 'FI correlation registry as the attestation port is refused. FL attests claims; it does not reopen or replace FI.');
    }

    if (plan.fjAsAttestation === true || claimsFjAsAttestation(planClean)) {
      return deny(FL_CODES.FJ_AS_ATTESTATION_FORBIDDEN, 'FJ round-trip integrity as the attestation port is refused. FL consumes FJ verdicts; FJ stays integrity-only.');
    }

    if (plan.fkAsAttestation === true || claimsFkAsAttestation(planClean)) {
      return deny(FL_CODES.FK_AS_ATTESTATION_FORBIDDEN, 'FK mismatch quarantine as the attestation port is refused. FL consumes FK decisions; FK stays quarantine-only.');
    }

    if (plan.ritualMode === 'HOLD') {
      return hold('Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.');
    }

    if (plan.ritualMode !== undefined && !['ACTIVE', 'DRY_RUN'].includes(plan.ritualMode)) {
      return deny(FL_CODES.INVALID_RITUAL_MODE, 'ritualMode must be ACTIVE|HOLD|DRY_RUN when provided');
    }

    if (!plan.attestation) {
      return deny(FL_CODES.MISSING_ATTESTATION, 'Missing attestation in active ritual mode');
    }

    if (typeof plan.attestation !== 'object' || Array.isArray(plan.attestation)) {
      return deny(FL_CODES.INVALID_ATTESTATION, 'attestation must be a non-null object');
    }

    const at = plan.attestation;

    const requiredString = [
      ['correlationId', FL_CODES.MISSING_CORRELATION_ID, 'attestation.correlationId (opaque FI binding) is required'],
      ['bindingId', FL_CODES.MISSING_BINDING_ID, 'attestation.bindingId (opaque FI binding) is required'],
      ['roundTripId', FL_CODES.MISSING_ROUND_TRIP_ID, 'attestation.roundTripId (opaque FJ verdict) is required'],
      ['requestId', FL_CODES.MISSING_REQUEST_ID, 'attestation.requestId (opaque FJ request handle) is required'],
      ['replyId', FL_CODES.MISSING_REPLY_ID, 'attestation.replyId (opaque FJ reply handle) is required'],
      ['quarantineDecisionId', FL_CODES.MISSING_QUARANTINE_DECISION_ID, 'attestation.quarantineDecisionId (opaque FK decision) is required'],
      ['attestationClass', FL_CODES.MISSING_ATTESTATION_CLASS, 'attestation.attestationClass is required']
    ];

    for (const [field, code, reason] of requiredString) {
      if (!at[field] || typeof at[field] !== 'string' || !at[field].trim()) {
        return deny(code, reason);
      }
    }

    if (!at.requestDigest || typeof at.requestDigest !== 'string' || !at.requestDigest.trim()) {
      return deny(FL_CODES.MISSING_REQUEST_DIGEST, 'attestation.requestDigest is required');
    }

    if (!at.replyDigest || typeof at.replyDigest !== 'string' || !at.replyDigest.trim()) {
      return deny(FL_CODES.MISSING_REPLY_DIGEST, 'attestation.replyDigest is required');
    }

    if (!at.mismatchDigest || typeof at.mismatchDigest !== 'string' || !at.mismatchDigest.trim()) {
      return deny(FL_CODES.MISSING_MISMATCH_DIGEST, 'attestation.mismatchDigest (opaque FK digest) is required');
    }

    if (!isValidSha256Hex(at.requestDigest)) {
      return deny(FL_CODES.INVALID_REQUEST_DIGEST, 'attestation.requestDigest must be a 64-hex sha256 digest');
    }

    if (!isValidSha256Hex(at.replyDigest)) {
      return deny(FL_CODES.INVALID_REPLY_DIGEST, 'attestation.replyDigest must be a 64-hex sha256 digest');
    }

    if (!isValidSha256Hex(at.mismatchDigest)) {
      return deny(FL_CODES.INVALID_MISMATCH_DIGEST, 'attestation.mismatchDigest must be a 64-hex sha256 digest');
    }

    if (at.desiredAttestation === undefined || at.desiredAttestation === null || at.desiredAttestation === '') {
      return deny(
        FL_CODES.MISSING_DESIRED_ATTESTATION,
        'attestation.desiredAttestation is required (ATTEST_INTEGRITY|ATTEST_HONESTY|HOLD)'
      );
    }

    if (!isValidAttestation(at.desiredAttestation)) {
      return deny(
        FL_CODES.INVALID_DESIRED_ATTESTATION,
        'attestation.desiredAttestation must be one of ATTEST_INTEGRITY|ATTEST_HONESTY|HOLD'
      );
    }

    if (at.observedClaim === undefined || at.observedClaim === null || at.observedClaim === '') {
      return deny(
        FL_CODES.MISSING_OBSERVED_CLAIM,
        'attestation.observedClaim is required (CONSISTENT|CONTRADICTED|UNVERIFIED|HOLD)'
      );
    }

    if (!isValidClaim(at.observedClaim)) {
      return deny(
        FL_CODES.INVALID_OBSERVED_CLAIM,
        'attestation.observedClaim must be one of CONSISTENT|CONTRADICTED|UNVERIFIED|HOLD'
      );
    }

    if (at.authorized !== true) {
      return deny(
        FL_CODES.ATTESTATION_UNAUTHORIZED,
        'Fail-closed attestation DENY — hermetic attestation claim unauthorized (≠ FI registry; ≠ FJ integrity; ≠ FK quarantine).'
      );
    }

    if (at.observedClaim === 'CONTRADICTED') {
      return deny(
        FL_CODES.CLAIM_CONTRADICTED,
        'Fail-closed attestation DENY — observedClaim is CONTRADICTED. FL never attests a contradicted honesty/integrity claim.'
      );
    }

    if (at.observedClaim === 'UNVERIFIED') {
      return hold('observedClaim is UNVERIFIED — no-op HOLD; FL attests only verified claims.');
    }

    if (at.observedClaim === 'HOLD') {
      return hold('observedClaim is HOLD — no-op HOLD; FL requires an explicit CONSISTENT claim to attest.');
    }

    if (at.observedClaim !== 'CONSISTENT') {
      return deny(
        FL_CODES.CLAIM_UNVERIFIED,
        'Fail-closed attestation DENY — observedClaim is inconsistent with an attestation decision.'
      );
    }

    if (at.desiredAttestation === 'HOLD') {
      return hold('desiredAttestation is HOLD — no-op HOLD; no attestation executed.');
    }

    if (at.desiredAttestation !== 'ATTEST_INTEGRITY' && at.desiredAttestation !== 'ATTEST_HONESTY') {
      return deny(
        FL_CODES.INVALID_ATTESTATION_CLAIM,
        'Fail-closed attestation DENY — desiredAttestation must be ATTEST_INTEGRITY or ATTEST_HONESTY.'
      );
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return deny(FL_CODES.AUTO_SEAL_FORBIDDEN, 'Auto-seal is forbidden without human gate holding.');
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FL_CODES.OK,
      reason:
        'Plan satisfies all dishonesty/integrity attestation governance preconditions (≠ FI registry ≠ FJ integrity ≠ FK quarantine ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FL_PRODUCTION_READY;
