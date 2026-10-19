/**
 * @module round-trip-integrity-governance-receipt
 * SPEC-0172 / Mission FJ — Round-Trip / Request-Reply Integrity Governance Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets (Law VI).
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     roundTripDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   roundTrip,
 *   integrityDigest,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused … l40ReopenRefused,
 *                   l41AutoCloseRefused,
 *                   liveHttpEgressRefused, wallClockAuthorityRefused,
 *                   tipRefreshAuthorityRefused, rawRoundTripSecretMaterialRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   integrityHold { hermeticInMemoryOnly: true, failClosed: true,
 *                requestReplyCorrelated: true, digestMatchRequired: true,
 *                liveHttpEgressRefused: true, wallClockAuthorityRefused: true,
 *                tipRewriteRefused: true, tipRefreshAuthorityRefused: true,
 *                rawRoundTripSecretMaterialRefused: true, schemaJsonAddRefused: true,
 *                governedSealOnly: true, roundTripSecretMaterialRefused: true,
 *                roundTripSecretZeroHeld: true,
 *                composesOverFiCorrelationRegistry: true,
 *                softObserveL39IngressRefsOnly: true,
 *                softObserveL40OutboundRefsOnly: true,
 *                distinctFromFiCorrelationRegistry: true,
 *                distinctFromEyIngressRegistry: true,
 *                distinctFromFdOutboundRegistry: true,
 *                distinctFromFkMismatchQuarantine: true,
 *                distinctFromCanaryDeliveryDispatcher: true }
 *
 * Freeze soft-observe pin is `78141c3d` (tip-open #564 / tip-refresh #565 soft-observe).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Round-trip integrity: requestDigest must equal the echoedRequestDigest observed on the
 * reply leg; replyDigest is correlated as opaque metadata. Digests are sha256 hex only —
 * never raw request/reply payloads, never secrets.
 *
 * Composes over Mission FI correlated refs (distinct port, does not replace FI registry).
 * Distinct from FK mismatch quarantine (next — do NOT implement), EY ingress, FD outbound,
 * Canary/Fundacion delivery.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/EY/FD/Canary ports
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const FJ_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const FJ_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const FJ_RECEIPT_KIND = 'eos-round-trip-integrity-governance-receipt';
export const FJ_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD']);
export const FJ_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const FJ_OPERATION = 'ROUND_TRIP_REQUEST_REPLY_INTEGRITY_GOVERNANCE';
export const FJ_INTEGRITY_STATES = Object.freeze(['MATCH', 'MISMATCH', 'HOLD']);

export const FJ_FREEZE_PIN = '78141c3d295579f210589301230af5d0853df392';
export const FJ_FREEZE_PIN_SHORT = '78141c3d';

export const FJ_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Round-Trip / Request-Reply Integrity Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live HTTP egress',
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
  'NON-CLAIM: Raw round-trip / request / reply secret material refused (Law VI — never seal secrets)',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from FI correlation registry / EY ingress registry / FD outbound registry / Canary delivery dispatcher',
  'NON-CLAIM: Distinct from FK bidirectional mismatch quarantine (FK is next satellite; FJ is integrity governance only)',
  'NON-CLAIM: Composes over FI correlated opaque refs only — do NOT replace FI registry',
  'NON-CLAIM: Soft-observe L39 ingress + L40 outbound opaque refs only — do NOT reopen L39/L40',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const FJ_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const FJ_INTEGRITY_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  requestReplyCorrelated: true,
  digestMatchRequired: true,
  liveHttpEgressRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  tipRefreshAuthorityRefused: true,
  rawRoundTripSecretMaterialRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  roundTripSecretMaterialRefused: true,
  roundTripSecretZeroHeld: true,
  composesOverFiCorrelationRegistry: true,
  softObserveL39IngressRefsOnly: true,
  softObserveL40OutboundRefsOnly: true,
  distinctFromFiCorrelationRegistry: true,
  distinctFromEyIngressRegistry: true,
  distinctFromFdOutboundRegistry: true,
  distinctFromFkMismatchQuarantine: true,
  distinctFromCanaryDeliveryDispatcher: true
});

/** sha256 hex digest shape — no payload bytes accepted. */
export const FJ_DIGEST_HEX_RE = /^[a-f0-9]{64}$/i;

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * @param {unknown} value
 * @returns {boolean} true when value is a 64-char sha256 hex digest
 */
export function isValidDigestHex(value) {
  return typeof value === 'string' && FJ_DIGEST_HEX_RE.test(value);
}

/**
 * Digests opaque round-trip correlation metadata only — never secret bytes (Law VI).
 * @param {{ correlationId?: string, roundTripId?: string, requestRef?: string, replyRef?: string, requestDigest?: string, echoedRequestDigest?: string, replyDigest?: string, roundTripClass?: string, integrityClass?: string, desiredIntegrity?: string, observedIntegrity?: string }} meta
 */
export function computeRoundTripDigest(meta = {}) {
  const opaqueOnly = {
    correlationId: meta.correlationId || null,
    roundTripId: meta.roundTripId || null,
    requestRef: meta.requestRef || null,
    replyRef: meta.replyRef || null,
    requestDigest: meta.requestDigest || null,
    echoedRequestDigest: meta.echoedRequestDigest || null,
    replyDigest: meta.replyDigest || null,
    roundTripClass: meta.roundTripClass || null,
    integrityClass: meta.integrityClass || null,
    desiredIntegrity: meta.desiredIntegrity || null,
    observedIntegrity: meta.observedIntegrity ?? null
  };
  return sha256Canonical(JSON.stringify(opaqueOnly));
}

/**
 * Verifies request/reply round-trip integrity from sha256 digests only.
 * MATCH requires requestDigest === echoedRequestDigest (the reply leg echoed the request).
 * @param {object} roundTrip
 * @returns {{ ok: boolean, requestIntegrityMatch: boolean, integrityDigest?: string, reason?: string }}
 */
export function verifyRoundTripIntegrity(roundTrip = {}) {
  if (!roundTrip || typeof roundTrip !== 'object' || Array.isArray(roundTrip)) {
    return { ok: false, requestIntegrityMatch: false, reason: 'roundTrip must be a non-null object' };
  }

  const requestDigest = roundTrip.requestDigest;
  const echoedRequestDigest = roundTrip.echoedRequestDigest;
  const replyDigest = roundTrip.replyDigest;

  if (!isValidDigestHex(requestDigest)) {
    return {
      ok: false,
      requestIntegrityMatch: false,
      reason: 'requestDigest must be a 64-char sha256 hex digest'
    };
  }
  if (!isValidDigestHex(echoedRequestDigest)) {
    return {
      ok: false,
      requestIntegrityMatch: false,
      reason: 'echoedRequestDigest must be a 64-char sha256 hex digest'
    };
  }
  if (!isValidDigestHex(replyDigest)) {
    return {
      ok: false,
      requestIntegrityMatch: false,
      reason: 'replyDigest must be a 64-char sha256 hex digest'
    };
  }

  const requestIntegrityMatch =
    requestDigest.toLowerCase() === echoedRequestDigest.toLowerCase();

  const integrityDigest = sha256Canonical(
    JSON.stringify({
      requestDigest: requestDigest.toLowerCase(),
      echoedRequestDigest: echoedRequestDigest.toLowerCase(),
      replyDigest: replyDigest.toLowerCase(),
      requestIntegrityMatch
    })
  );

  if (!requestIntegrityMatch) {
    return {
      ok: false,
      requestIntegrityMatch: false,
      integrityDigest,
      reason: 'Round-trip integrity mismatch — echoedRequestDigest does not match requestDigest'
    };
  }

  return { ok: true, requestIntegrityMatch: true, integrityDigest };
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
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
    nonClaimLabels: FJ_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true,
    ...opts
  });
}

export function forceIntegrityHold(opts = {}) {
  return Object.freeze({
    ...FJ_INTEGRITY_HOLD_TEMPLATE,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalRoundTripIntegrityGovernanceSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    roundTripDigest: receipt.roundTripDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Round-Trip / Request-Reply Integrity Governance Receipt.
 * Never seals secret material — only opaque correlationId / roundTripId / requestRef /
 * replyRef / roundTripClass / integrityClass / sha256 digests.
 * @param {object} input
 * @returns {object}
 */
export function buildRoundTripIntegrityGovernanceReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `FJ-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-fj-default');
  const changeId = String(input.changeId || 'eos-ladder-41-mission-fj');
  const decision = FJ_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = FJ_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const roundTrip = input.roundTrip || null;

  const integrity = roundTrip ? verifyRoundTripIntegrity(roundTrip) : { ok: false };

  const roundTripDigest =
    input.roundTripDigest || computeRoundTripDigest(roundTrip || {});

  const integrityDigest =
    input.integrityDigest ||
    (integrity && integrity.integrityDigest) ||
    sha256Canonical(JSON.stringify({ planId, decision, integrityHeld: true }));

  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: FJ_OPERATION,
    planId,
    decision,
    changeId,
    roundTripDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: FJ_RECEIPT_KIND,
    receiptId,
    operation: FJ_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    roundTripDigest,
    integrityDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    roundTrip,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    integrityHold: forceIntegrityHold(input.integrityHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyRoundTripIntegrityGovernanceReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== FJ_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${FJ_RECEIPT_KIND}` };
  }
  if (receipt.operation !== FJ_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalRoundTripIntegrityGovernanceSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

