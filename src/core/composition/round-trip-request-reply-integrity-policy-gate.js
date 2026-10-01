/**
 * @module round-trip-request-reply-integrity-policy-gate
 * SPEC-0172 / Mission FJ — fail-closed round-trip integrity preconditions.
 * Reuses Mission FI governance detectors instead of cloning them.
 * Pure Layer-0. Never seal secrets (Law VI). PRODUCTION_READY: NO.
 */

import {
  FJ_PRODUCTION_READY,
  FJ_FREEZE_PIN_SHORT,
  FJ_INTEGRITY_STATES,
  isSha256Hex
} from './round-trip-request-reply-integrity-receipt.js';

import {
  computeCorrelationDigest,
  verifyBidirectionalDeliveryCorrelationRegistryReceipt,
  FI_BINDING_STATES
} from './bidirectional-delivery-correlation-registry-receipt.js';

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
  claimsRawCorrelationSecretMaterial,
  claimsEyIngressAsCorrelation,
  claimsFdOutboundAsCorrelation,
  claimsFjRoundTripAsRegistry,
  isFundacionTarget
} from './bidirectional-delivery-correlation-registry-policy-gate.js';

/** @type {'NO'} */
export const FJ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const FJ_POLICY_GATE_KIND = 'eos-round-trip-request-reply-integrity-policy-gate';

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
  MISSING_INGRESS_ID: 'MISSING_INGRESS_ID',
  MISSING_SOURCE_ID: 'MISSING_SOURCE_ID',
  MISSING_TARGET_ID: 'MISSING_TARGET_ID',
  MISSING_DELIVERY_ID: 'MISSING_DELIVERY_ID',
  MISSING_CORRELATION_CLASS: 'MISSING_CORRELATION_CLASS',
  MISSING_DESIRED_BINDING: 'MISSING_DESIRED_BINDING',
  INVALID_DESIRED_BINDING: 'INVALID_DESIRED_BINDING',
  INVALID_OBSERVED_BINDING: 'INVALID_OBSERVED_BINDING',
  MISSING_REQUEST_REF: 'MISSING_REQUEST_REF',
  MISSING_REPLY_REF: 'MISSING_REPLY_REF',
  ROUND_TRIP_REFS_COLLAPSED: 'ROUND_TRIP_REFS_COLLAPSED',
  MISSING_REQUEST_DIGEST: 'MISSING_REQUEST_DIGEST',
  MISSING_REPLY_DIGEST: 'MISSING_REPLY_DIGEST',
  INVALID_DIGEST: 'INVALID_DIGEST',
  MISSING_CORRELATION_DIGEST: 'MISSING_CORRELATION_DIGEST',
  CORRELATION_DIGEST_MISMATCH: 'CORRELATION_DIGEST_MISMATCH',
  MISSING_FI_RECEIPT: 'MISSING_FI_RECEIPT',
  FI_RECEIPT_INVALID: 'FI_RECEIPT_INVALID',
  FI_RECEIPT_NOT_PASS: 'FI_RECEIPT_NOT_PASS',
  FI_CORRELATION_MISMATCH: 'FI_CORRELATION_MISMATCH',
  MISSING_DESIRED_INTEGRITY: 'MISSING_DESIRED_INTEGRITY',
  INVALID_DESIRED_INTEGRITY: 'INVALID_DESIRED_INTEGRITY',
  INVALID_OBSERVED_INTEGRITY: 'INVALID_OBSERVED_INTEGRITY',
  MISSING_OBSERVED_INTEGRITY: 'MISSING_OBSERVED_INTEGRITY',
  INTEGRITY_MISMATCH: 'INTEGRITY_MISMATCH',
  INTEGRITY_NOT_INTACT: 'INTEGRITY_NOT_INTACT',
  INTEGRITY_UNAUTHORIZED: 'INTEGRITY_UNAUTHORIZED',
  LIVE_HTTP_EGRESS_FORBIDDEN: 'LIVE_HTTP_EGRESS_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN: 'RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN',
  SECRET_FIELD_FORBIDDEN: 'SECRET_FIELD_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN: 'EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN',
  FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN: 'FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN',
  FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN: 'FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN',
  FJ_AS_REGISTRY_FORBIDDEN: 'FJ_AS_REGISTRY_FORBIDDEN',
  FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN: 'FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN',
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

const FI_AS_ROUND_TRIP_PATTERNS = [
  /\bmake\s+fi\s+the\s+round[-_\s]?trip\s+(?:integrity\s+)?port\b/i,
  /\belevate\s+fi\s+(?:registry\s+)?as\s+round[-_\s]?trip\b/i,
  /\bfi\s+registry\s+as\s+(?:the\s+)?round[-_\s]?trip\s+port\b/i
];

const FK_AS_INTEGRITY_PATTERNS = [
  /\bmake\s+fk\s+the\s+round[-_\s]?trip\s+(?:integrity\s+)?port\b/i,
  /\bfk\s+quarantine\s+as\s+(?:the\s+)?integrity\s+port\b/i,
  /\belevate\s+fk\s+quarantine\s+as\s+integrity\b/i
];

const LADDER_GUARDS = [
  [claimsL30Reopen, FJ_CODES.L30_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 30. Ladders 30–40 are permanently CLOSED — NEVER reopen L30–L40.'],
  [claimsL31Reopen, FJ_CODES.L31_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'],
  [claimsL32Reopen, FJ_CODES.L32_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'],
  [claimsL33Reopen, FJ_CODES.L33_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'],
  [claimsL34Reopen, FJ_CODES.L34_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'],
  [claimsL35Reopen, FJ_CODES.L35_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'],
  [claimsL36Reopen, FJ_CODES.L36_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'],
  [claimsL37Reopen, FJ_CODES.L37_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 37. Ladder 37 is permanently CLOSED — NEVER reopen L37.'],
  [claimsL38Reopen, FJ_CODES.L38_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 38. Ladder 38 is permanently CLOSED — NEVER reopen L38.'],
  [claimsL39Reopen, FJ_CODES.L39_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 39. Ladder 39 is permanently CLOSED — NEVER reopen L39.'],
  [claimsL40Reopen, FJ_CODES.L40_REOPEN_FORBIDDEN, 'Attempted to reopen Ladder 40. Ladder 40 is permanently CLOSED — NEVER reopen L40.']
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
    if (key === 'fiReceipt' || key.endsWith('Receipt') || key.endsWith('ReceiptLink') || key === 'priorReceipts') {
      continue;
    }
    clone[key] = val && typeof val === 'object' ? stripReceipts(val) : val;
  }
  return clone;
}

function deny(code, reason) {
  return { ok: false, decision: 'DENY', code, reason };
}

function hasOpaque(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function matchesAny(val, patterns) {
  if (!val) return false;
  const text = stringifySafe(val);
  return patterns.some((pat) => pat.test(text));
}

function governanceDeny(plan, planClean) {
  if (
    plan.forceDelete === true ||
    plan.purge === true ||
    plan.hardDelete === true ||
    claimsHardDelete(planClean)
  ) {
    return deny(FJ_CODES.HARD_DELETE_FORBIDDEN, 'Hard delete / purge operations are strictly forbidden in EOS governance.');
  }
  if (plan.massPrune === true || claimsMassPrune(planClean)) {
    return deny(FJ_CODES.MASS_PRUNE_FORBIDDEN, 'Mass prune operations are strictly forbidden.');
  }
  if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
    return deny(FJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN, 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.');
  }
  for (const [claims, code, reason] of LADDER_GUARDS) {
    if (claims(planClean)) return deny(code, reason);
  }
  if (claimsL41AutoClose(planClean)) {
    return deny(
      FJ_CODES.L41_AUTO_CLOSE_FORBIDDEN,
      'Premature or automatic closeout of Ladder 41 is forbidden. Audit MEASURED; FI sealed; FJ this satellite; FK–FM pending.'
    );
  }
  if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
    return deny(
      FJ_CODES.TIP_REWRITE_FORBIDDEN,
      'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-FJ is SEPARATE.'
    );
  }
  if (plan.addSchemaJson === true || plan.schemaJsonAdd === true || claimsSchemaJsonAdd(planClean)) {
    return deny(FJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN, 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.');
  }
  if (plan.networkWrite === true || plan.remoteDispatch === true || claimsNetworkWrite(planClean)) {
    return deny(FJ_CODES.NETWORK_WRITE_FORBIDDEN, 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.');
  }
  if (claimsGhe(planClean) || plan.claimGhe === true) {
    return deny(FJ_CODES.GHE_CLAIM_FORBIDDEN, 'GHE / enterprise enforcement claims are refused.');
  }
  if (plan.liveHttpEgress === true || plan.bindLiveHttpEgress === true || claimsLiveHttpEgress(planClean)) {
    return deny(
      FJ_CODES.LIVE_HTTP_EGRESS_FORBIDDEN,
      'Live HTTP egress is refused. PASS seals a hermetic round-trip integrity receipt only.'
    );
  }
  if (plan.wallClockAuthority === true || claimsWallClockAuthority(planClean)) {
    return deny(FJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN, 'Wall-clock authority is refused. Inject observedIntegrity hermetically.');
  }
  if (plan.tipRefreshAuthority === true || claimsTipRefreshAuthority(planClean)) {
    return deny(
      FJ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
      'Tip-refresh authority is refused. Soft-observe pin 78141c3d only; tip-refresh post-FJ is SEPARATE.'
    );
  }
  if (plan.rawSecretMaterial === true || plan.sealSecret === true || claimsRawCorrelationSecretMaterial(planClean)) {
    return deny(
      FJ_CODES.RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN,
      'Raw correlation secret / payload material in receipts is refused (Law VI). Seal opaque refs and digests only.'
    );
  }
  if (plan.eyIngressAsRoundTrip === true || claimsEyIngressAsCorrelation(planClean)) {
    return deny(
      FJ_CODES.EY_INGRESS_AS_ROUND_TRIP_FORBIDDEN,
      'EY ingress registry as the round-trip port is refused. FJ verifies integrity; it does not reopen L39.'
    );
  }
  if (plan.fdOutboundAsRoundTrip === true || claimsFdOutboundAsCorrelation(planClean)) {
    return deny(
      FJ_CODES.FD_OUTBOUND_AS_ROUND_TRIP_FORBIDDEN,
      'FD outbound registry as the round-trip port is refused. FJ is distinct from FD; do NOT reopen L40.'
    );
  }
  if (plan.fjRoundTripAsRegistry === true || claimsFjRoundTripAsRegistry(planClean)) {
    return deny(
      FJ_CODES.FJ_AS_REGISTRY_FORBIDDEN,
      'Using FJ as the FI correlation registry is refused. FI is binding only; FJ is integrity verify.'
    );
  }
  if (
    plan.fiRegistryAsRoundTrip === true ||
    plan.fiAsRoundTripPort === true ||
    matchesAny(planClean, FI_AS_ROUND_TRIP_PATTERNS)
  ) {
    return deny(
      FJ_CODES.FI_REGISTRY_AS_ROUND_TRIP_FORBIDDEN,
      'FI correlation registry as the round-trip port is refused. FJ consumes a verified FI receipt; it does not replace FI.'
    );
  }
  if (
    plan.fkQuarantineAsIntegrity === true ||
    plan.fkAsIntegrityPort === true ||
    matchesAny(planClean, FK_AS_INTEGRITY_PATTERNS)
  ) {
    return deny(
      FJ_CODES.FK_QUARANTINE_AS_INTEGRITY_FORBIDDEN,
      'FK quarantine as the integrity port is refused. FK is the next satellite.'
    );
  }
  return null;
}

function requireOpaque(roundTrip, field, code) {
  if (!hasOpaque(roundTrip[field])) {
    return deny(code, `roundTrip.${field} (opaque) is required`);
  }
  return null;
}

/**
 * Fail-closed round-trip integrity preconditions.
 */
export class RoundTripRequestReplyIntegrityPolicyGate {
  /**
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string, fiReceiptHash?: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return deny(FJ_CODES.DENY, 'Invalid plan: input must be an object');
    }
    if (!hasOpaque(plan.planId)) {
      return deny(FJ_CODES.MISSING_PLAN_ID, 'Missing planId in input');
    }
    if (!hasOpaque(plan.changeId)) {
      return deny(FJ_CODES.MISSING_CHANGE_ID, 'Missing changeId in input');
    }
    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return deny(
        FJ_CODES.FUNDACION_DENIED,
        'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      );
    }

    const planClean = stripReceipts(plan);
    const secretField = findSecretLookingField(planClean);
    if (secretField) {
      return deny(
        FJ_CODES.SECRET_FIELD_FORBIDDEN,
        `Law VI fail-closed DENY — secret-looking field "${secretField}" refused. Receipts seal opaque refs and digests only.`
      );
    }
    if (scanForSecrets(planClean)) {
      return deny(FJ_CODES.SECRET_LEAK_FORBIDDEN, 'Plan contains potential plain secret token. Law VI absolute rejection.');
    }

    const governed = governanceDeny(plan, planClean);
    if (governed) return governed;

    if (plan.ritualMode && !['ACTIVE', 'HOLD', 'DRY_RUN'].includes(plan.ritualMode)) {
      return deny(FJ_CODES.INVALID_RITUAL_MODE, 'ritualMode must be ACTIVE, HOLD, or DRY_RUN');
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
      return deny(FJ_CODES.MISSING_ROUND_TRIP, 'Missing roundTrip in active ritual mode');
    }
    if (typeof plan.roundTrip !== 'object' || Array.isArray(plan.roundTrip)) {
      return deny(FJ_CODES.INVALID_ROUND_TRIP, 'roundTrip must be a non-null object');
    }

    const rt = plan.roundTrip;
    const structural = [
      requireOpaque(rt, 'correlationId', FJ_CODES.MISSING_CORRELATION_ID),
      requireOpaque(rt, 'ingressId', FJ_CODES.MISSING_INGRESS_ID),
      requireOpaque(rt, 'sourceId', FJ_CODES.MISSING_SOURCE_ID),
      requireOpaque(rt, 'targetId', FJ_CODES.MISSING_TARGET_ID),
      requireOpaque(rt, 'deliveryId', FJ_CODES.MISSING_DELIVERY_ID),
      requireOpaque(rt, 'correlationClass', FJ_CODES.MISSING_CORRELATION_CLASS)
    ].find(Boolean);
    if (structural) return structural;

    if (!hasOpaque(rt.desiredBinding)) {
      return deny(FJ_CODES.MISSING_DESIRED_BINDING, 'roundTrip.desiredBinding is required (BOUND|UNBOUND|HOLD)');
    }
    if (!FI_BINDING_STATES.includes(rt.desiredBinding)) {
      return deny(FJ_CODES.INVALID_DESIRED_BINDING, 'roundTrip.desiredBinding must be one of BOUND|UNBOUND|HOLD');
    }
    if (rt.observedBinding !== undefined && rt.observedBinding !== null && !FI_BINDING_STATES.includes(rt.observedBinding)) {
      return deny(FJ_CODES.INVALID_OBSERVED_BINDING, 'roundTrip.observedBinding must be one of BOUND|UNBOUND|HOLD when provided');
    }

    const refs = [
      requireOpaque(rt, 'requestRef', FJ_CODES.MISSING_REQUEST_REF),
      requireOpaque(rt, 'replyRef', FJ_CODES.MISSING_REPLY_REF)
    ].find(Boolean);
    if (refs) return refs;
    if (rt.requestRef === rt.replyRef) {
      return deny(FJ_CODES.ROUND_TRIP_REFS_COLLAPSED, 'requestRef and replyRef must be distinct opaque refs');
    }

    if (rt.authorized !== true) {
      return deny(
        FJ_CODES.INTEGRITY_UNAUTHORIZED,
        'Fail-closed integrity DENY — hermetic round-trip claim unauthorized (≠ FI registry; ≠ FK quarantine).'
      );
    }

    if (!hasOpaque(rt.desiredIntegrity)) {
      return deny(FJ_CODES.MISSING_DESIRED_INTEGRITY, 'roundTrip.desiredIntegrity is required (INTACT|BROKEN|HOLD)');
    }
    if (!FJ_INTEGRITY_STATES.includes(rt.desiredIntegrity)) {
      return deny(FJ_CODES.INVALID_DESIRED_INTEGRITY, 'roundTrip.desiredIntegrity must be one of INTACT|BROKEN|HOLD');
    }
    if (rt.observedIntegrity === undefined || rt.observedIntegrity === null || rt.observedIntegrity === '') {
      return deny(FJ_CODES.MISSING_OBSERVED_INTEGRITY, 'roundTrip.observedIntegrity is required (hermetic injection)');
    }
    if (!FJ_INTEGRITY_STATES.includes(rt.observedIntegrity)) {
      return deny(FJ_CODES.INVALID_OBSERVED_INTEGRITY, 'roundTrip.observedIntegrity must be one of INTACT|BROKEN|HOLD');
    }
    if (rt.observedIntegrity !== rt.desiredIntegrity) {
      return deny(
        FJ_CODES.INTEGRITY_MISMATCH,
        'Fail-closed integrity DENY — hermetic observedIntegrity mismatches desiredIntegrity.'
      );
    }
    if (rt.desiredIntegrity !== 'INTACT') {
      return deny(
        FJ_CODES.INTEGRITY_NOT_INTACT,
        'Fail-closed integrity DENY — round trip is not INTACT. PASS seals INTACT pairs only.'
      );
    }

    if (!hasOpaque(rt.requestDigest)) {
      return deny(FJ_CODES.MISSING_REQUEST_DIGEST, 'roundTrip.requestDigest (sha256 hex) is required');
    }
    if (!hasOpaque(rt.replyDigest)) {
      return deny(FJ_CODES.MISSING_REPLY_DIGEST, 'roundTrip.replyDigest (sha256 hex) is required');
    }
    if (!isSha256Hex(rt.requestDigest) || !isSha256Hex(rt.replyDigest)) {
      return deny(FJ_CODES.INVALID_DIGEST, 'requestDigest and replyDigest must be lowercase sha256 hex');
    }
    if (!hasOpaque(rt.correlationDigest)) {
      return deny(FJ_CODES.MISSING_CORRELATION_DIGEST, 'roundTrip.correlationDigest from Mission FI is required');
    }
    if (!isSha256Hex(rt.correlationDigest)) {
      return deny(FJ_CODES.INVALID_DIGEST, 'correlationDigest must be lowercase sha256 hex');
    }

    const recomputed = computeCorrelationDigest({
      correlationId: rt.correlationId,
      bindingId: rt.bindingId,
      ingressId: rt.ingressId,
      sourceId: rt.sourceId,
      targetId: rt.targetId,
      deliveryId: rt.deliveryId,
      correlationClass: rt.correlationClass,
      bindingClass: rt.bindingClass,
      desiredBinding: rt.desiredBinding,
      observedBinding: rt.observedBinding
    });
    if (recomputed !== rt.correlationDigest) {
      return deny(
        FJ_CODES.CORRELATION_DIGEST_MISMATCH,
        'correlationDigest does not match opaque L39 ingress + L40 outbound correlation metadata.'
      );
    }

    if (!plan.fiReceipt) {
      return deny(FJ_CODES.MISSING_FI_RECEIPT, 'A verified Mission FI PASS receipt is required to compose round-trip integrity.');
    }
    const fiCheck = verifyBidirectionalDeliveryCorrelationRegistryReceipt(plan.fiReceipt);
    if (!fiCheck.ok) {
      return deny(FJ_CODES.FI_RECEIPT_INVALID, `Mission FI receipt failed verification: ${fiCheck.reason}`);
    }
    if (plan.fiReceipt.decision !== 'PASS') {
      return deny(FJ_CODES.FI_RECEIPT_NOT_PASS, 'Mission FI receipt must be a PASS seal before round-trip integrity can pass.');
    }
    if (plan.fiReceipt.correlationDigest !== rt.correlationDigest) {
      return deny(
        FJ_CODES.FI_CORRELATION_MISMATCH,
        'Mission FI receipt correlationDigest does not match the round-trip correlationDigest.'
      );
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return deny(FJ_CODES.AUTO_SEAL_FORBIDDEN, 'Auto-seal is forbidden without human gate holding.');
    }

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Plan satisfies round-trip integrity preconditions (≠ FI registry ≠ FK quarantine ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
      fiReceiptHash: plan.fiReceipt.receiptHash
    };
  }
}

void FJ_PRODUCTION_READY;
void FJ_FREEZE_PIN_SHORT;
