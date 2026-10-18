/**
 * @module round-trip-request-reply-integrity-receipt
 * SPEC-0172 / Mission FJ — Round-Trip Request-Reply Integrity Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     roundTripDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   requestReplyBinding,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawRoundTripSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   roundTripHold { hermeticInMemoryOnly: true, failClosed: true,
 *                   liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                   tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                   rawRoundTripSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                   governedSealOnly: true, roundTripSecretMaterialRefused: true,
 *                   roundTripSecretZeroHeld: true,
 *                   softObserveL39IngressRefsOnly: true,
 *                   softObserveL40OutboundRefsOnly: true,
 *                   distinctFromEyIngressRegistry: true,
 *                   distinctFromFdOutboundRegistry: true,
 *                   distinctFromFiCorrelationRegistry: true,
 *                   distinctFromCanaryDeliveryDispatcher: true }
 *
 * Freeze soft-observe pin is `78141c3d` (tip-open #564 / tip-refresh #565 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Soft-observe opaque L39 request ingress refs + L40 reply outbound refs.
 * Evaluates round-trip request-reply integrity & SLA constraints — without reopening L39/L40.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed round-trip request-reply integrity receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FI/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FJ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FJ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FJ_RECEIPT_KIND = 'eos-round-trip-request-reply-integrity-receipt';
export const FJ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FJ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FJ_OPERATION = 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY';
export const FJ_INTEGRITY_STATES = Object.freeze(['MATCH', 'MISMATCH', 'TIMED_OUT', 'HOLD']);

export const FJ_FREEZE_PIN = '78141c3d295579f210589301230af5d0853df392';
export const FJ_FREEZE_PIN_SHORT = '78141c3d';

export const FJ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Round-Trip Request-Reply Integrity Port ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 reopen refused',
  'NON-CLAIM: L37 reopen refused',
  'NON-CLAIM: L38 reopen refused',
  'NON-CLAIM: L39 reopen refused',
  'NON-CLAIM: L40 reopen refused',
  'NON-CLAIM: L41 auto-close refused (FK–FM pending)',
  'NON-CLAIM: Live HTTP egress / wall-clock authority / tip-refresh authority refused',
  'NON-CLAIM: Raw request/reply payload secret material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EY ingress registry / FD outbound registry / FI correlation registry / Canary delivery dispatcher',
  'NON-CLAIM: Soft-observe L39 request ingress + L40 reply outbound opaque refs only — do NOT reopen L39/L40',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed round-trip request-reply integrity receipt ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FJ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FJ_ROUND_TRIP_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawRoundTripSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  roundTripSecretMaterialRefused: true,
  roundTripSecretZeroHeld: true,
  softObserveL39IngressRefsOnly: true,
  softObserveL40OutboundRefsOnly: true,
  distinctFromEyIngressRegistry: true,
  distinctFromFdOutboundRegistry: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromCanaryDeliveryDispatcher: true
});

let sequenceCounter = 0;

export function _resetReceiptSeqForTests() {
  sequenceCounter = 0;
}

/**
 * Pure L0 sha256 canonical hex digest string
 * @param {string} payload
 * @returns {string}
 */
export function sha256Canonical(payload) {
  return createHash('sha256').update(String(payload), 'utf8').digest('hex');
}

/**
 * Computes canonical roundTripDigest from opaque request-reply attributes only.
 * @param {object} binding
 * @returns {string}
 */
export function computeRoundTripDigest(binding) {
  if (!binding || typeof binding !== 'object') {
    return sha256Canonical(JSON.stringify({ emptyBinding: true }));
  }

  const payload = {
    correlationId: String(binding.correlationId || ''),
    requestId: String(binding.requestId || binding.ingressId || ''),
    replyId: String(binding.replyId || binding.deliveryId || ''),
    requestDigest: String(binding.requestDigest || ''),
    replyDigest: String(binding.replyDigest || ''),
    desiredIntegrity: String(binding.desiredIntegrity || ''),
    observedIntegrity: String(binding.observedIntegrity || ''),
    roundTripLatencyMs: Number(binding.roundTripLatencyMs || 0),
    maxAllowedLatencyMs: Number(binding.maxAllowedLatencyMs || 0)
  };

  return sha256Canonical(JSON.stringify(payload));
}

/**
 * Builds canonical seal body JSON string for receipt verification
 * @param {object} params
 * @returns {string}
 */
export function canonicalRoundTripRequestReplyIntegritySealBody(params) {
  const obj = {
    receiptId: params.receiptId,
    operation: FJ_OPERATION,
    planId: params.planId,
    decision: params.decision,
    changeId: params.changeId,
    roundTripDigest: params.roundTripDigest,
    timestamp: params.timestamp,
    fundacionDelta: 0,
    prevReceiptHash: params.prevReceiptHash
  };
  return JSON.stringify(obj);
}

/**
 * Builds a sealed, verifiable FJ-RCPT-* receipt
 * @param {object} opts
 * @returns {object}
 */
export function buildRoundTripRequestReplyIntegrityReceipt(opts = {}) {
  const seq = ++sequenceCounter;
  const timestamp = opts.timestamp || new Date().toISOString();
  const receiptId = opts.receiptId || `FJ-RCPT-${Date.now()}-${seq}`;
  const planId = opts.planId || 'plan-round-trip-integrity';
  const decision = FJ_DECISIONS.includes(opts.decision) ? opts.decision : 'DENY';
  const changeId = opts.changeId || 'eos-ladder-41-mission-fj';
  const ritualMode = FJ_RITUAL_MODES.includes(opts.ritualMode) ? opts.ritualMode : 'ACTIVE';
  const prevReceiptHash = opts.prevReceiptHash || '0'.repeat(64);

  const requestReplyBinding = opts.requestReplyBinding
    ? {
        correlationId: String(opts.requestReplyBinding.correlationId || ''),
        requestId: String(opts.requestReplyBinding.requestId || opts.requestReplyBinding.ingressId || ''),
        replyId: String(opts.requestReplyBinding.replyId || opts.requestReplyBinding.deliveryId || ''),
        requestDigest: String(opts.requestReplyBinding.requestDigest || ''),
        replyDigest: String(opts.requestReplyBinding.replyDigest || ''),
        desiredIntegrity: String(opts.requestReplyBinding.desiredIntegrity || 'MATCH'),
        observedIntegrity: String(opts.requestReplyBinding.observedIntegrity || 'MATCH'),
        roundTripLatencyMs: Number(opts.requestReplyBinding.roundTripLatencyMs || 0),
        maxAllowedLatencyMs: Number(opts.requestReplyBinding.maxAllowedLatencyMs || 0),
        authorized: Boolean(opts.requestReplyBinding.authorized),
        evaluated: Boolean(opts.requestReplyBinding.evaluated !== false),
        status: String(opts.requestReplyBinding.status || 'PASS')
      }
    : null;

  const roundTripDigest = opts.roundTripDigest || computeRoundTripDigest(requestReplyBinding);

  const sealParams = {
    receiptId,
    planId,
    decision,
    changeId,
    roundTripDigest,
    timestamp,
    prevReceiptHash
  };

  const sealBody = canonicalRoundTripRequestReplyIntegritySealBody(sealParams);
  const receiptHash = sha256Canonical(sealBody);

  const receipt = {
    receiptId,
    operation: FJ_OPERATION,
    planId,
    decision,
    changeId,
    roundTripDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash,
    receiptHash,
    kind: FJ_RECEIPT_KIND,
    productionReady: FJ_PRODUCTION_READY,
    ritualMode,
    requestReplyBinding,
    freezeObserve: Object.freeze({
      pin: FJ_FREEZE_PIN,
      pinShort: FJ_FREEZE_PIN_SHORT,
      tipRewriteRefused: true,
      productionReadyFlipRefused: true,
      l30ReopenRefused: true,
      l31ReopenRefused: true,
      l32ReopenRefused: true,
      l33ReopenRefused: true,
      l34ReopenRefused: true,
      l35ReopenRefused: true,
      l36ReopenRefused: true,
      l37ReopenRefused: true,
      l38ReopenRefused: true,
      l39ReopenRefused: true,
      l40ReopenRefused: true,
      l41AutoCloseRefused: true,
      liveHttpEgressRefused: true,
      wallClockAuthorityRefused: true,
      tipRefreshAuthorityRefused: true,
      rawRoundTripSecretMaterialRefused: true,
      schemaJsonAddRefused: true,
      readOnly: true,
      nonClaimLabels: FJ_FREEZE_NONCLAIM_LABELS
    }),
    ceilingHold: FJ_CEILING_HOLD_TEMPLATE,
    roundTripHold: FJ_ROUND_TRIP_HOLD_TEMPLATE
  };

  return Object.freeze(receipt);
}

/**
 * Cryptographically verifies an FJ-RCPT-* receipt
 * @param {object} receipt
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyRoundTripRequestReplyIntegrityReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, reason: 'INVALID_RECEIPT_OBJECT' };
  }
  if (receipt.kind !== FJ_RECEIPT_KIND) {
    return { valid: false, reason: 'INVALID_RECEIPT_KIND' };
  }
  if (receipt.productionReady !== FJ_PRODUCTION_READY) {
    return { valid: false, reason: 'INVALID_PRODUCTION_READY_FLAG' };
  }
  if (receipt.operation !== FJ_OPERATION) {
    return { valid: false, reason: 'INVALID_OPERATION' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { valid: false, reason: 'INVALID_FUNDACION_DELTA' };
  }

  const sealBody = canonicalRoundTripRequestReplyIntegritySealBody(receipt);
  const recomputedHash = sha256Canonical(sealBody);

  if (recomputedHash !== receipt.receiptHash) {
    return { valid: false, reason: 'RECEIPT_HASH_MISMATCH' };
  }

  return { valid: true };
}
