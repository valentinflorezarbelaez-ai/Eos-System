/**
 * @module round-trip-integrity-governance-port
 * SPEC-0172 / Mission FJ — Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 41 axis: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
 * Composes over Mission FI correlated opaque refs and verifies request/reply round-trip
 * integrity from sha256 digests only — without live HTTP egress, wall-clock authority,
 * or sealing raw payloads.
 *
 * This port seals hermetic round-trip integrity receipts:
 *   - Validates roundTrip (correlationId + roundTripId + requestRef + replyRef
 *     + requestDigest + echoedRequestDigest + replyDigest + roundTripClass
 *     + desiredIntegrity MATCH|MISMATCH|HOLD; optional observedIntegrity;
 *     authorized must be true)
 *   - Emits cryptographically verifiable FJ-RCPT-* receipts with roundTripDigest
 *     (sha256 of opaque refs + digests only — never secret bytes)
 *   - Maintains verifiable audit trail of integrity PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized, digest mismatch,
 *     MISMATCH requested in ACTIVE mode, OR secret-looking fields present
 *   - PASS seals hermetic round-trip integrity receipt only — NOT a live HTTP egress,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT FI/FK/EY/FD/Canary ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L40 reopen,
 *     L41 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; roundTripSecretMaterialRefused / roundTripSecretZeroHeld
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   Seals chained FJ-RCPT-* receipts with verifiable roundTripDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 *
 * PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/EY/FD/Canary
 */

import {
  FJ_PRODUCTION_READY,
  computeRoundTripDigest,
  verifyRoundTripIntegrity,
  buildRoundTripIntegrityGovernanceReceipt,
  verifyRoundTripIntegrityGovernanceReceipt
} from './round-trip-integrity-governance-receipt.js';

import {
  RoundTripIntegrityGovernancePolicyGate,
  FJ_CODES
} from './round-trip-integrity-governance-policy-gate.js';

/** @type {'NO'} */
export const FJ_PORT_PRODUCTION_READY = 'NO';
export const FJ_PORT_KIND = 'eos-round-trip-integrity-governance-port';

export class RoundTripIntegrityGovernancePort {
  /**
   * @param {object} [opts]
   * @param {RoundTripIntegrityGovernancePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new RoundTripIntegrityGovernancePolicyGate();
    this.trail = [];
    this.productionReady = FJ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the round-trip / request-reply integrity ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FJ_CODES.ROUND_TRIP_UNAUTHORIZED) status = 'ROUND_TRIP_UNAUTHORIZED';
      else if (gateRes.code === FJ_CODES.INVALID_ROUND_TRIP_CLAIM) status = 'INVALID_ROUND_TRIP_CLAIM';
      else if (gateRes.code === FJ_CODES.ROUND_TRIP_DIGEST_MISMATCH) status = 'ROUND_TRIP_DIGEST_MISMATCH';
      else if (gateRes.code === FJ_CODES.ROUND_TRIP_MISMATCH_REFUSED) status = 'ROUND_TRIP_MISMATCH_REFUSED';
      else if (
        gateRes.code === FJ_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FJ_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'ROUND_TRIP_SECRET_MATERIAL_REFUSED';
      }

      const deniedRoundTrip = input.roundTrip
        ? {
            correlationId: input.roundTrip.correlationId,
            roundTripId: input.roundTrip.roundTripId,
            requestRef: input.roundTrip.requestRef,
            replyRef: input.roundTrip.replyRef,
            requestDigest: input.roundTrip.requestDigest,
            echoedRequestDigest: input.roundTrip.echoedRequestDigest,
            replyDigest: input.roundTrip.replyDigest,
            roundTripClass: input.roundTrip.roundTripClass,
            integrityClass: input.roundTrip.integrityClass,
            desiredIntegrity: input.roundTrip.desiredIntegrity,
            observedIntegrity: input.roundTrip.observedIntegrity,
            authorized: input.roundTrip.authorized,
            evaluated: false,
            status
          }
        : null;

      const deniedReceipt = buildRoundTripIntegrityGovernanceReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fj',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        roundTrip: deniedRoundTrip,
        roundTripDigest: computeRoundTripDigest(deniedRoundTrip || {}),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(deniedReceipt);
      return {
        ok: false,
        decision: 'DENY',
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: deniedReceipt
      };
    }

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const heldRoundTrip = input.roundTrip
        ? {
            correlationId: input.roundTrip.correlationId,
            roundTripId: input.roundTrip.roundTripId,
            requestRef: input.roundTrip.requestRef,
            replyRef: input.roundTrip.replyRef,
            requestDigest: input.roundTrip.requestDigest,
            echoedRequestDigest: input.roundTrip.echoedRequestDigest,
            replyDigest: input.roundTrip.replyDigest,
            roundTripClass: input.roundTrip.roundTripClass,
            integrityClass: input.roundTrip.integrityClass,
            desiredIntegrity: input.roundTrip.desiredIntegrity,
            observedIntegrity: input.roundTrip.observedIntegrity,
            authorized: input.roundTrip.authorized,
            evaluated: false,
            status: 'HELD'
          }
        : null;

      const holdReceipt = buildRoundTripIntegrityGovernanceReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        roundTrip: heldRoundTrip,
        roundTripDigest: computeRoundTripDigest(heldRoundTrip || {}),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const integrity = verifyRoundTripIntegrity(input.roundTrip);

    const sealedRoundTrip = {
      correlationId: input.roundTrip.correlationId,
      roundTripId: input.roundTrip.roundTripId,
      requestRef: input.roundTrip.requestRef,
      replyRef: input.roundTrip.replyRef,
      requestDigest: input.roundTrip.requestDigest,
      echoedRequestDigest: input.roundTrip.echoedRequestDigest,
      replyDigest: input.roundTrip.replyDigest,
      roundTripClass: input.roundTrip.roundTripClass || 'request-reply-round-trip',
      integrityClass: input.roundTrip.integrityClass || 'request-reply-round-trip',
      desiredIntegrity: 'MATCH',
      observedIntegrity: 'MATCH',
      requestIntegrityMatch: true,
      integrityVerified: true,
      authorized: true,
      evaluated: true,
      status: 'ROUND_TRIP_VERIFIED',
      failClosed: true,
      hermeticInjectedRoundTrip: true,
      composesOverFiCorrelationRegistry: true,
      softObserveL39IngressRefsOnly: true,
      softObserveL40OutboundRefsOnly: true,
      distinctFromFiCorrelationRegistry: true,
      distinctFromEyIngressRegistry: true,
      distinctFromFdOutboundRegistry: true,
      distinctFromFkMismatchQuarantine: true
    };

    const roundTripDigest = computeRoundTripDigest(sealedRoundTrip);

    const passReceipt = buildRoundTripIntegrityGovernanceReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      roundTrip: sealedRoundTrip,
      roundTripDigest,
      integrityDigest: integrity.integrityDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      integrityHold: {
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
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Hermetic round-trip / request-reply integrity governance receipt sealed (≠ FI registry replacement ≠ FK quarantine ≠ EY/FD/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
      receipt: passReceipt
    };
  }

  /**
   * Verifies one sealed receipt: canonical hash + roundTripDigest linkage + digest MATCH.
   * @param {object} receipt
   * @returns {{ ok: boolean, reason?: string }}
   */
  verifyRoundTrip(receipt) {
    const base = verifyRoundTripIntegrityGovernanceReceipt(receipt);
    if (!base.ok) return base;

    const rt = receipt.roundTrip || {};
    const expected = computeRoundTripDigest(rt);
    if (receipt.roundTripDigest !== expected) {
      return { ok: false, reason: 'roundTripDigest mismatch' };
    }

    if (receipt.decision !== 'PASS') {
      return { ok: true };
    }

    const integrity = verifyRoundTripIntegrity(rt);
    if (!integrity.ok) {
      return { ok: false, reason: integrity.reason || 'round-trip integrity mismatch' };
    }

    if (receipt.integrityDigest !== integrity.integrityDigest) {
      return { ok: false, reason: 'integrityDigest mismatch' };
    }

    return { ok: true };
  }

  /**
   * Verifies the cryptographic chain integrity of the port's receipt trail
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const validRes = this.verifyRoundTrip(receipt);
      if (!validRes.ok) {
        return { ok: false, verifiedCount: i, error: `Invalid receipt at ${i}: ${validRes.reason}` };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          verifiedCount: i,
          error: `Chain broken at ${i}: prevHash mismatch. Expected ${prevHash}, got ${receipt.prevReceiptHash}`
        };
      }
      prevHash = receipt.receiptHash;
    }
    return { ok: true, verifiedCount: this.trail.length };
  }
}

void FJ_PRODUCTION_READY;

