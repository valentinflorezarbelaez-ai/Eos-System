/**
 * @module policy-pack-binding-port
 * SPEC-0152 / Mission EP — Sovereign Policy-Pack Binding & Evaluation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Ladder 37 axis: Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric.
 * Existing EO feature-flag / FDIR trip surfaces are runtime/governance oriented —
 * not a receipted Layer-0 feature-flag governance port. This port seals hermetic
 * policy-pack binding/evaluation governance receipts:
 *   - Validates binding (packId + bindingClass + desiredBinding BOUND|UNBOUND|HOLD;
 *     optional observedBinding injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EP-RCPT-* receipts with bindingDigest
 *   - Maintains verifiable audit trail of binding PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic pack-binding claim invalid or unauthorized
 *   - PASS seals hermetic binding receipt only — NOT a live remote policy engine,
 *     NOT wall-clock authority, NOT a EO feature-flag port, NOT DX circuit breaker axis
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L36 reopen,
 *     L37 auto-close, schema-json add
 *
 * Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 75131386 (do NOT rewrite tip pins)
 *   Seals chained EP-RCPT-* receipts with verifiable bindingDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L36; refuse L37 auto-close (EQ–ES pending)
 *
 * PASS = sealed policy-pack binding receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live remote policy engine ≠ wall-clock authority ≠ EO flag port ≠ FDIR axis
 */

import {
  EP_PRODUCTION_READY,
  sha256Canonical,
  buildPolicyPackBindingReceipt,
  verifyPolicyPackBindingReceipt
} from './policy-pack-binding-receipt.js';

import {
  PolicyPackBindingPolicyGate,
  EP_CODES
} from './policy-pack-binding-policy-gate.js';

/** @type {'NO'} */
export const EP_PORT_PRODUCTION_READY = 'NO';
export const EP_PORT_KIND = 'eos-policy-pack-binding-port';

export class PolicyPackBindingPort {
  /**
   * @param {object} [opts]
   * @param {PolicyPackBindingPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new PolicyPackBindingPolicyGate();
    this.trail = [];
    this.productionReady = EP_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the policy-pack binding/evaluation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EP_CODES.BINDING_UNAUTHORIZED) status = 'BINDING_UNAUTHORIZED';
      else if (gateRes.code === EP_CODES.INVALID_BINDING_CLAIM) status = 'INVALID_BINDING_CLAIM';

      const deniedReceipt = buildPolicyPackBindingReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-37-mission-ep',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        binding: input.binding
          ? {
              ...input.binding,
              evaluated: false,
              status
            }
          : null,
        bindingDigest: sha256Canonical(
          JSON.stringify({ planId: input.planId, denied: true, code: gateRes.code })
        ),
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
      const holdReceipt = buildPolicyPackBindingReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        binding: input.binding
          ? { ...input.binding, evaluated: false, status: 'HELD' }
          : null,
        bindingDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EP_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedToggle = {
      ...input.binding,
      evaluated: true,
      status: 'EVALUATED',
      failClosed: true,
      hermeticInjectedPackBinding: true,
      distinctFromEoFeatureFlag: true,
      distinctFromDxCircuitBreaker: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      binding: sealedToggle,
      timestamp: new Date().toISOString()
    };
    const bindingDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildPolicyPackBindingReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      binding: sealedToggle,
      bindingDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      packHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        remotePolicyEngineRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromEoFeatureFlag: true,
        distinctFromEjAdmission: true,
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EP_CODES.OK,
      reason:
        'Hermetic policy-pack-binding governance receipt sealed (≠ EO flag port ≠ FDIR axis ≠ remote policy engine ≠ tip-refresh ≠ PRODUCTION_READY).',
      receipt: passReceipt
    };
  }

  /**
   * Verifies the cryptographic chain integrity of the port's receipt trail
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const validRes = verifyPolicyPackBindingReceipt(receipt);
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

void EP_PRODUCTION_READY;
