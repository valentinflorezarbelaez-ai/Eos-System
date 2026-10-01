/**
 * @module round-trip-request-reply-integrity-port
 * SPEC-0172 / Mission FJ — Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0. Never seal secrets (Law VI).
 *
 * Verifies hermetic request/reply integrity across opaque refs already correlated
 * by Mission FI. Does not reopen L39/L40, does not replace the FI registry, and
 * does not implement FK quarantine.
 *
 * PRODUCTION_READY: NO
 * PASS = sealed round-trip integrity ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/EY/FD/Canary
 */

import {
  FJ_PRODUCTION_READY,
  sha256Canonical,
  computeIntegrityDigest,
  buildRoundTripRequestReplyIntegrityReceipt,
  verifyRoundTripRequestReplyIntegrityReceipt
} from './round-trip-request-reply-integrity-receipt.js';

import {
  RoundTripRequestReplyIntegrityPolicyGate,
  FJ_CODES
} from './round-trip-request-reply-integrity-policy-gate.js';

/** @type {'NO'} */
export const FJ_PORT_PRODUCTION_READY = 'NO';
export const FJ_PORT_KIND = 'eos-round-trip-request-reply-integrity-port';

const OPAQUE_KEYS = [
  'correlationId',
  'bindingId',
  'ingressId',
  'sourceId',
  'targetId',
  'deliveryId',
  'correlationClass',
  'bindingClass',
  'desiredBinding',
  'observedBinding',
  'requestRef',
  'replyRef',
  'requestDigest',
  'replyDigest',
  'correlationDigest',
  'desiredIntegrity',
  'observedIntegrity',
  'authorized'
];

function opaqueRoundTrip(roundTrip, status, evaluated) {
  if (!roundTrip || typeof roundTrip !== 'object') return null;
  const sealed = { evaluated, status, failClosed: true, hermeticInjectedRoundTrip: true };
  for (const key of OPAQUE_KEYS) {
    if (roundTrip[key] !== undefined) sealed[key] = roundTrip[key];
  }
  return sealed;
}

export class RoundTripRequestReplyIntegrityPort {
  /**
   * @param {object} [opts]
   * @param {RoundTripRequestReplyIntegrityPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new RoundTripRequestReplyIntegrityPolicyGate();
    this.trail = [];
    this.productionReady = FJ_PORT_PRODUCTION_READY;
  }

  /**
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const prevReceiptHash =
      this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FJ_CODES.INTEGRITY_UNAUTHORIZED) status = 'INTEGRITY_UNAUTHORIZED';
      else if (gateRes.code === FJ_CODES.INTEGRITY_MISMATCH) status = 'INTEGRITY_MISMATCH';
      else if (gateRes.code === FJ_CODES.INTEGRITY_NOT_INTACT) status = 'INTEGRITY_NOT_INTACT';
      else if (
        gateRes.code === FJ_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FJ_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FJ_CODES.RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'CORRELATION_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildRoundTripRequestReplyIntegrityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fj',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        roundTrip: opaqueRoundTrip(input.roundTrip, status, false),
        integrityDigest: sha256Canonical(
          JSON.stringify({ planId: input.planId, denied: true, code: gateRes.code })
        ),
        prevReceiptHash
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
      const holdReceipt = buildRoundTripRequestReplyIntegrityReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        roundTrip: opaqueRoundTrip(input.roundTrip, 'HELD', false),
        integrityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealed = opaqueRoundTrip(input.roundTrip, 'INTACT_EVALUATED', true);
    sealed.distinctFromFiCorrelationRegistry = true;
    sealed.distinctFromFkQuarantine = true;
    const integrityDigest = computeIntegrityDigest(sealed);

    const passReceipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      roundTrip: sealed,
      integrityDigest,
      fiReceiptHash: gateRes.fiReceiptHash || null,
      prevReceiptHash
    });
    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Hermetic round-trip integrity receipt sealed (≠ FI registry ≠ FK quarantine ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
      receipt: passReceipt
    };
  }

  /**
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const validRes = verifyRoundTripRequestReplyIntegrityReceipt(receipt);
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
