/**
 * @module round-trip-integrity-governance-policy-gate
 * SPEC-0172 / Mission FJ — Policy Gate for Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; refuse secret-looking fields fail-closed;
 *           synthetic tokens in tests must be clearly fake and never appear in seal body
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   Round trip:
 *     - Requires correlationId (FI correlated opaque ref) + roundTripId +
 *       requestRef + replyRef (distinct) + sha256 requestDigest / echoedRequestDigest /
 *       replyDigest + roundTripClass + desiredIntegrity (MATCH|MISMATCH|HOLD)
 *     - Optional observedIntegrity (hermetic injected reply-leg observation)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *     - MATCH requires requestDigest === echoedRequestDigest (round-trip integrity)
 *     - MISMATCH in ACTIVE mode is refused (FK quarantine is the next satellite)
 *   Inject observedIntegrity only — no live HTTP egress, no wall-clock authority,
 *     no tip-refresh authority, no raw round-trip / request / reply secret material
 *   Composes over FI correlated refs — distinct from FI registry, EY ingress, FD outbound
 *   Distinct from FK bidirectional mismatch quarantine (next)
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
  FJ_INTEGRITY_STATES,
  isValidDigestHex,
  verifyRoundTripIntegrity
} from './round-trip-integrity-governance-receipt.js';

import {
  findSecretLookingField,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsHardDelete,
  claimsMassPrune,
  claimsL30Reopen,
  claimsL31Reopen,
  claimsL32Reopen,
  claimsL33Reopen,
  claimsL34Reopen,
  claimsL35Reopen,
  claimsL36Reopen,
  claimsL37Reopen,
  claimsL38Reopen,
  claimsL39Reopen,
  claimsL40Reopen,
  claimsL41AutoClose,
  claimsTipRewrite,
  claimsSchemaJsonAdd,
  claimsNetworkWrite,
  claimsGhe,
  claimsLiveHttpEgress,
  claimsWallClockAuthority,
  claimsTipRefreshAuthority,
  isFundacionTarget
} from './bidirectional-delivery-correlation-registry-policy-gate.js';

/** @type {'NO'} */
export const FJ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FJ_POLICY_GATE_KIND = 'eos-round-trip-integrity-governance-policy-gate';

export const FJ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'CORRELATION_REF_INSPECT',
  'REQUEST_REF_SEAL',
  'REPLY_REF_SEAL',
  'INTEGRITY_VERIFY',
  'SEAL'
]);

export const FJ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ROUND_TRIP: 'MISSING_ROUND_TRIP',
  INVALID_ROUND_TRIP: 'INVALID_ROUND_TRIP',
  MISSING_CORRELATION_ID: 'MISSING_CORRELATION_ID',
  MISSING_ROUND_TRIP_ID: 'MISSING_ROUND_TRIP_ID',
  MISSING_REQUEST_REF: 'MISSING_REQUEST_REF',
  MISSING_REPLY_REF: 'MISSING_REPLY_REF',
  ROUND_TRIP_REF_COLLISION: 'ROUND_TRIP_REF_COLLISION',
  MISSING_REQUEST_DIGEST: 'MISSING_REQUEST_DIGEST',
  INVALID_REQUEST_DIGEST: 'INVALID_REQUEST_DIGEST',
  MISSING_ECHOED_REQUEST_DIGEST: 'MISSING_ECHOED_REQUEST_DIGEST',
  INVALID_ECHOED_REQUEST_DIGEST: 'INVALID_ECHOED_REQUEST_DIGEST',
  MISSING_REPLY_DIGEST: 'MISSING_REPLY_DIGEST',
  INVALID_REPLY_DIGEST: 'INVALID_REPLY_DIGEST',
  MISSING_ROUND_TRIP_CLASS: 'MISSING_ROUND_TRIP_CLASS',
  MISSING_DESIRED_INTEGRITY: 'MISSING_DESIRED_INTEGRITY',
  INVALID_DESIRED_INTEGRITY: 'INVALID_DESIRED_INTEGRITY',
  INVALID_OBSERVED_INTEGRITY: 'INVALID_OBSERVED_INTEGRITY',
  ROUND_TRIP_DIGEST_MISMATCH: 'ROUND_TRIP_DIGEST_MISMATCH',
  ROUND_TRIP_MISMATCH_REFUSED: 'ROUND_TRIP_MISMATCH_REFUSED',
  ROUND_TRIP_UNAUTHORIZED: 'ROUND_TRIP_UNAUTHORIZED',
  INVALID_ROUND_TRIP_CLAIM: 'INVALID_ROUND_TRIP_CLAIM',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN: 'RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN: 'FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN',
  EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN: 'EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN',
  FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN: 'FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN',
  FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN: 'FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN',
  CANARY_AS_ROUND_TRIP_FORBIDDEN: 'CANARY_AS_ROUND_TRIP_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
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
  NETWORK_WRITE_FORBIDDEN: 'NETWORK_WRITE_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN'
});

const RAW_ROUND_TRIP_SECRET_MATERIAL_PATTERNS = [
  /\braw\s+round[-_]?trip\s+secret\b/i,
  /\braw\s+request\s+(?:payload|secret)\b/i,
  /\braw\s+reply\s+(?:payload|secret)\b/i,
  /\bseal\s+(?:the\s+)?(?:request|reply|round[-_]?trip)\s+secret\b/i,
  /\bembed\s+(?:plaintext\s+)?(?:request|reply)\s+secret\b/i,
  /\bplaintext\s+(?:request|reply)\s+payload\s+in\s+receipt\b/i,
  /\bcopy\s+raw\s+request\s+payload\s+into\s+receipt\b/i
];

const FI_REGISTRY_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fi\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfi\s+(?:correlation\s+)?registry\s+as\s+(?:the\s+)?round[-_]?trip\b/i,
  /\belevate\s+fi\s+(?:correlation\s+)?registry\s+as\s+round[-_]?trip\b/i,
  /\bfi\s+as\s+round[-_]?trip[-_]?integrity\b/i
];

const EY_INGRESS_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+ey\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bey\s+ingress\s+as\s+(?:the\s+)?round[-_]?trip\b/i,
  /\belevate\s+ey\s+ingress\s+(?:to\s+)?round[-_]?trip\b/i
];

const FD_OUTBOUND_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fd\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfd\s+outbound\s+as\s+(?:the\s+)?round[-_]?trip\b/i,
  /\belevate\s+fd\s+outbound\s+(?:to\s+)?round[-_]?trip\b/i
];

const FK_QUARANTINE_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fk\s+(?:the\s+)?round[-_]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfk\s+(?:mismatch\s+)?quarantine\s+as\s+(?:the\s+)?round[-_]?trip\b/i,
  /\belevate\s+fk\s+quarantine\s+(?:to\s+)?round[-_]?trip\b/i
];

const CANARY_AS_ROUND_TRIP_PATTERNS = [
  /\bcanary\s+WebhookPayloadDispatcher\s+as\s+(?:the\s+)?round[-_]?trip\b/i,
  /\bcanary\s+(?:delivery\s+)?dispatcher\s+as\s+(?:the\s+)?round[-_]?trip\b/i
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

function claimsWith(patterns, val) {
  if (!val) return false;
  return patterns.some((pat) => pat.test(stringifySafe(val)));
}

export function isValidIntegrityState(value) {
  return typeof value === 'string' && FJ_INTEGRITY_STATES.includes(value);
}

export function claimsRawRoundTripSecretMaterial(val) {
  return claimsWith(RAW_ROUND_TRIP_SECRET_MATERIAL_PATTERNS, val);
}

export function claimsFiRegistryAsRoundTrip(val) {
  return claimsWith(FI_REGISTRY_AS_ROUND_TRIP_PATTERNS, val);
}

export function claimsEyIngressAsRoundTrip(val) {
  return claimsWith(EY_INGRESS_AS_ROUND_TRIP_PATTERNS, val);
}

export function claimsFdOutboundAsRoundTrip(val) {
  return claimsWith(FD_OUTBOUND_AS_ROUND_TRIP_PATTERNS, val);
}

export function claimsFkQuarantineAsRoundTrip(val) {
  return claimsWith(FK_QUARANTINE_AS_ROUND_TRIP_PATTERNS, val);
}

export function claimsCanaryAsRoundTrip(val) {
  return claimsWith(CANARY_AS_ROUND_TRIP_PATTERNS, val);
}

export class RoundTripIntegrityGovernancePolicyGate {
  /**
   * Evaluates preconditions for the round-trip / request-reply integrity governance ritual
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
        reason: `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts may seal opaque correlationId / roundTripId / requestRef / replyRef / roundTripClass / integrityClass / digests of non-secret metadata only.`
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

    const ladderChecks = [
      [claimsL30Reopen, FJ_CODES.L30_REOPEN_FORBIDDEN, 30],
      [claimsL31Reopen, FJ_CODES.L31_REOPEN_FORBIDDEN, 31],
      [claimsL32Reopen, FJ_CODES.L32_REOPEN_FORBIDDEN, 32],
      [claimsL33Reopen, FJ_CODES.L33_REOPEN_FORBIDDEN, 33],
      [claimsL34Reopen, FJ_CODES.L34_REOPEN_FORBIDDEN, 34],
      [claimsL35Reopen, FJ_CODES.L35_REOPEN_FORBIDDEN, 35],
      [claimsL36Reopen, FJ_CODES.L36_REOPEN_FORBIDDEN, 36],
      [claimsL37Reopen, FJ_CODES.L37_REOPEN_FORBIDDEN, 37],
      [claimsL38Reopen, FJ_CODES.L38_REOPEN_FORBIDDEN, 38],
      [claimsL39Reopen, FJ_CODES.L39_REOPEN_FORBIDDEN, 39],
      [claimsL40Reopen, FJ_CODES.L40_REOPEN_FORBIDDEN, 40]
    ];

    for (const [claims, code, ladder] of ladderChecks) {
      if (claims(planClean)) {
        return {
          ok: false,
          decision: 'DENY',
          code,
          reason: `Attempted to reopen Ladder ${ladder}. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.`
        };
      }
    }

    if (claimsL41AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 41 is forbidden. Audit MEASURED; FI + FJ measured; FK–FM pending.'
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

    if (plan.addSchemaJson === true || plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }


    if (plan.networkWrite === true || plan.remoteDispatch === true || claimsNetworkWrite(planClean)) {
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

    if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
        reason: 'Live HTTP egress is refused. PASS seals hermetic round-trip integrity governance receipts only — inject observedIntegrity; do not bind live HTTP egress / network.'
      };
    }

    if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority is refused. Inject observedIntegrity hermetically; do not use Date.now as authority.'
      };
    }

    if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused. Soft-observe pin 78141c3d only; tip-refresh post-FJ is SEPARATE.'
      };
    }

    if (plan.rawSecretMaterial === true || plan.sealSecret === true || claimsRawRoundTripSecretMaterial(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN,
        reason: 'Raw round-trip / request / reply secret material in receipts is refused (Law VI). Seal opaque correlationId / roundTripId / requestRef / replyRef / sha256 digests only.'
      };
    }

    const elevateChecks = [
      [
        plan.fiRegistryAsRoundTrip === true || plan.fiAsRoundTripPort === true || claimsFiRegistryAsRoundTrip(planClean),
        FJ_CODES.FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN,
        'FI correlation registry as the round-trip integrity port is refused. FJ composes over FI refs — do NOT replace the FI registry.'
      ],
      [
        plan.eyIngressAsRoundTrip === true || claimsEyIngressAsRoundTrip(planClean),
        FJ_CODES.EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN,
        'EY ingress registry as the round-trip integrity port is refused. FJ is distinct from EY ingress — do NOT reopen L39.'
      ],
      [
        plan.fdOutboundAsRoundTrip === true || claimsFdOutboundAsRoundTrip(planClean),
        FJ_CODES.FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN,
        'FD outbound registry as the round-trip integrity port is refused. FJ is distinct from FD outbound — do NOT reopen L40.'
      ],
      [
        plan.fkQuarantineAsRoundTrip === true || claimsFkQuarantineAsRoundTrip(planClean),
        FJ_CODES.FK_QUARANTINE_AS_ROUND_TRIP_FORBIDDEN,
        'FK bidirectional mismatch quarantine as the round-trip integrity port is refused. FK is the next satellite — FJ is integrity governance only.'
      ],
      [
        plan.canaryDispatcherAsRoundTrip === true || claimsCanaryAsRoundTrip(planClean),
        FJ_CODES.CANARY_AS_ROUND_TRIP_FORBIDDEN,
        'Canary WebhookPayloadDispatcher as the round-trip integrity port is refused. FJ is distinct from Canary delivery dispatch.'
      ]
    ];

    for (const [hit, code, reason] of elevateChecks) {
      if (hit) {
        return { ok: false, decision: 'DENY', code, reason };
      }
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

    const rt = plan.roundTrip;

    const requiredOpaque = [
      ['correlationId', FJ_CODES.MISSING_CORRELATION_ID, 'roundTrip.correlationId (opaque FI correlated ref) is required'],
      ['roundTripId', FJ_CODES.MISSING_ROUND_TRIP_ID, 'roundTrip.roundTripId (opaque) is required'],
      ['requestRef', FJ_CODES.MISSING_REQUEST_REF, 'roundTrip.requestRef (opaque request leg ref) is required'],
      ['replyRef', FJ_CODES.MISSING_REPLY_REF, 'roundTrip.replyRef (opaque reply leg ref) is required'],
      ['roundTripClass', FJ_CODES.MISSING_ROUND_TRIP_CLASS, 'roundTrip.roundTripClass is required']
    ];

    for (const [field, code, reason] of requiredOpaque) {
      if (!rt[field] || typeof rt[field] !== 'string' || !rt[field].trim()) {
        return { ok: false, decision: 'DENY', code, reason };
      }
    }

    if (rt.requestRef.trim() === rt.replyRef.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.ROUND_TRIP_REF_COLLISION,
        reason: 'roundTrip.requestRef and roundTrip.replyRef must be distinct opaque refs (request leg ≠ reply leg)'
      };
    }

    const digestFields = [
      ['requestDigest', FJ_CODES.MISSING_REQUEST_DIGEST, FJ_CODES.INVALID_REQUEST_DIGEST],
      ['echoedRequestDigest', FJ_CODES.MISSING_ECHOED_REQUEST_DIGEST, FJ_CODES.INVALID_ECHOED_REQUEST_DIGEST],
      ['replyDigest', FJ_CODES.MISSING_REPLY_DIGEST, FJ_CODES.INVALID_REPLY_DIGEST]
    ];

    for (const [field, missingCode, invalidCode] of digestFields) {
      if (rt[field] === undefined || rt[field] === null || rt[field] === '') {
        return {
          ok: false,
          decision: 'DENY',
          code: missingCode,
          reason: `roundTrip.${field} (sha256 hex digest) is required`
        };
      }
      if (!isValidDigestHex(rt[field])) {
        return {
          ok: false,
          decision: 'DENY',
          code: invalidCode,
          reason: `roundTrip.${field} must be a 64-char sha256 hex digest (no raw payload bytes)`
        };
      }
    }

    if (
      rt.desiredIntegrity === undefined ||
      rt.desiredIntegrity === null ||
      rt.desiredIntegrity === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.MISSING_DESIRED_INTEGRITY,
        reason: 'roundTrip.desiredIntegrity is required (MATCH|MISMATCH|HOLD)'
      };
    }

    if (!isValidIntegrityState(rt.desiredIntegrity)) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_DESIRED_INTEGRITY,
        reason: 'roundTrip.desiredIntegrity must be one of MATCH|MISMATCH|HOLD'
      };
    }

    if (
      rt.observedIntegrity !== undefined &&
      rt.observedIntegrity !== null &&
      !isValidIntegrityState(rt.observedIntegrity)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_OBSERVED_INTEGRITY,
        reason: 'roundTrip.observedIntegrity must be one of MATCH|MISMATCH|HOLD when provided (hermetic injection)'
      };
    }

    if (rt.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.ROUND_TRIP_UNAUTHORIZED,
        reason:
          'Fail-closed round-trip DENY — hermetic integrity claim unauthorized (≠ FI registry; ≠ FK quarantine; ≠ EY ingress; ≠ FD outbound).'
      };
    }

    if (
      rt.observedIntegrity !== undefined &&
      rt.observedIntegrity !== null &&
      rt.observedIntegrity !== rt.desiredIntegrity
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.INVALID_ROUND_TRIP_CLAIM,
        reason:
          'Fail-closed round-trip DENY — hermetic observedIntegrity mismatches desiredIntegrity (invalid integrity claim).'
      };
    }

    if (rt.desiredIntegrity === 'MISMATCH') {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.ROUND_TRIP_MISMATCH_REFUSED,
        reason:
          'Round-trip integrity MISMATCH is refused in ACTIVE mode (fail-closed). Quarantine/deny on mismatch is Mission FK (next satellite).'
      };
    }

    if (rt.desiredIntegrity === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        reason: 'Plan requests integrity HOLD: zero mutations allowed; no PASS seal.'
      };
    }

    const integrity = verifyRoundTripIntegrity(rt);
    if (!integrity.ok) {
      return {
        ok: false,
        decision: 'DENY',
        code: FJ_CODES.ROUND_TRIP_DIGEST_MISMATCH,
        reason: `Fail-closed round-trip DENY — ${integrity.reason || 'request/reply digest mismatch'}`
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
        'Plan satisfies all round-trip / request-reply integrity governance preconditions (≠ FI registry replacement ≠ FK quarantine ≠ EY/FD/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void FJ_PRODUCTION_READY;
void FJ_FREEZE_PIN_SHORT;

