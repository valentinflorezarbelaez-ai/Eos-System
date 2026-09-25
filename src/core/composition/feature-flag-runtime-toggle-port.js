/**
 * @module feature-flag-runtime-toggle-port
 * SPEC-0151 / Mission EO — Sovereign Feature-Flag & Runtime Toggle Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Ladder 37 axis: Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric.
 * Existing sentinel-killswitch / FDIR trip surfaces are runtime/governance oriented —
 * not a receipted Layer-0 feature-flag governance port. This port seals hermetic
 * feature-flag / runtime-toggle governance receipts:
 *   - Validates toggle (flagKey + toggleClass + desiredState ON|OFF|HOLD;
 *     optional observedState injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EO-RCPT-* receipts with toggleDigest
 *   - Maintains verifiable audit trail of toggle PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic flag/toggle claim invalid or unauthorized
 *   - PASS seals hermetic toggle receipt only — NOT a live remote config SDK,
 *     NOT wall-clock rollout authority, NOT a sentinel-killswitch port, NOT FDIR trip axis
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L36 reopen,
 *     L37 auto-close, schema-json add
 *
 * Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty).
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin f333afaf (do NOT rewrite tip pins)
 *   Seals chained EO-RCPT-* receipts with verifiable toggleDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L36; refuse L37 auto-close (EP–ES pending)
 *
 * PASS = sealed feature-flag/toggle receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live remote config SDK ≠ wall-clock rollout authority ≠ killswitch port ≠ FDIR axis
 */

import {
  EO_PRODUCTION_READY,
  sha256Canonical,
  buildFeatureFlagRuntimeToggleReceipt,
  verifyFeatureFlagRuntimeToggleReceipt
} from './feature-flag-runtime-toggle-receipt.js';

import {
  FeatureFlagRuntimeTogglePolicyGate,
  EO_CODES
} from './feature-flag-runtime-toggle-policy-gate.js';

/** @type {'NO'} */
export const EO_PORT_PRODUCTION_READY = 'NO';
export const EO_PORT_KIND = 'eos-feature-flag-runtime-toggle-port';

export class FeatureFlagRuntimeTogglePort {
  /**
   * @param {object} [opts]
   * @param {FeatureFlagRuntimeTogglePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new FeatureFlagRuntimeTogglePolicyGate();
    this.trail = [];
    this.productionReady = EO_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the feature-flag / runtime-toggle ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EO_CODES.TOGGLE_UNAUTHORIZED) status = 'TOGGLE_UNAUTHORIZED';
      else if (gateRes.code === EO_CODES.INVALID_TOGGLE_CLAIM) status = 'INVALID_TOGGLE_CLAIM';

      const deniedReceipt = buildFeatureFlagRuntimeToggleReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-37-mission-eo',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        toggle: input.toggle
          ? {
              ...input.toggle,
              evaluated: false,
              status
            }
          : null,
        toggleDigest: sha256Canonical(
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
      const holdReceipt = buildFeatureFlagRuntimeToggleReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        toggle: input.toggle
          ? { ...input.toggle, evaluated: false, status: 'HELD' }
          : null,
        toggleDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EO_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedToggle = {
      ...input.toggle,
      evaluated: true,
      status: 'EVALUATED',
      failClosed: true,
      hermeticInjectedFlagState: true,
      distinctFromSentinelKillswitch: true,
      distinctFromFdirTrip: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      toggle: sealedToggle,
      timestamp: new Date().toISOString()
    };
    const toggleDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildFeatureFlagRuntimeToggleReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      toggle: sealedToggle,
      toggleDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      toggleHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        remoteConfigSdkRefused: true,
        wallClockRolloutAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromSentinelKillswitch: true,
        distinctFromFdirTrip: true,
        distinctFromEjAdmission: true,
        distinctFromEhTemporalHonesty: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EO_CODES.OK,
      reason:
        'Hermetic feature-flag/runtime-toggle governance receipt sealed (≠ killswitch port ≠ FDIR axis ≠ remote config SDK ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyFeatureFlagRuntimeToggleReceipt(receipt);
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

void EO_PRODUCTION_READY;
