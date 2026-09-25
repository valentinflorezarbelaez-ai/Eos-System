/**
 * @module config-staged-activation-port
 * SPEC-0153 / Mission EQ — Config Change / Staged Activation Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Ladder 37 axis: Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric.
 * Existing EO feature-flag / EP policy-pack surfaces are distinct —
 * this port seals hermetic staged config/flag activation change receipts chained
 * to L33–L36 intakes:
 *   - Validates activation (configKey + activationClass + desiredStage
 *     STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD; optional observedActivation injected
 *     hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EQ-RCPT-* receipts with activationDigest
 *   - Maintains verifiable audit trail of activation PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic stage claim invalid or unauthorized
 *   - PASS seals hermetic activation receipt only — NOT live unsupervised mutation,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT remote config push,
 *     NOT EO feature-flag port, NOT EP policy-pack port, NOT DX circuit breaker axis
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L36 reopen,
 *     L37 auto-close, schema-json add
 *
 * Distinct from EJ/EK admission/backpressure, EG schedule wake, EH temporal honesty.
 * Fold emergency-override narrowly into fail-closed staged activation —
 * do NOT reopen FDIR/DX as the axis.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 748000c3 (do NOT rewrite tip pins)
 *   Seals chained EQ-RCPT-* receipts with verifiable activationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L36; refuse L37 auto-close (ER–ES pending)
 *
 * PASS = sealed staged-activation receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live unsupervised mutation ≠ wall-clock authority ≠ remote config push
 * ≠ EO flag port ≠ EP pack port ≠ FDIR axis
 */

import {
  EQ_PRODUCTION_READY,
  sha256Canonical,
  buildConfigStagedActivationReceipt,
  verifyConfigStagedActivationReceipt
} from './config-staged-activation-receipt.js';

import {
  ConfigStagedActivationPolicyGate,
  EQ_CODES
} from './config-staged-activation-policy-gate.js';

/** @type {'NO'} */
export const EQ_PORT_PRODUCTION_READY = 'NO';
export const EQ_PORT_KIND = 'eos-config-staged-activation-port';

export class ConfigStagedActivationPort {
  /**
   * @param {object} [opts]
   * @param {ConfigStagedActivationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ConfigStagedActivationPolicyGate();
    this.trail = [];
    this.productionReady = EQ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the staged-activation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EQ_CODES.ACTIVATION_UNAUTHORIZED) status = 'ACTIVATION_UNAUTHORIZED';
      else if (gateRes.code === EQ_CODES.INVALID_ACTIVATION_CLAIM) status = 'INVALID_ACTIVATION_CLAIM';

      const deniedReceipt = buildConfigStagedActivationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-37-mission-eq',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        activation: input.activation
          ? {
              ...input.activation,
              evaluated: false,
              status
            }
          : null,
        activationDigest: sha256Canonical(
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
      const holdReceipt = buildConfigStagedActivationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        activation: input.activation
          ? { ...input.activation, evaluated: false, status: 'HELD' }
          : null,
        activationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EQ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedActivation = {
      ...input.activation,
      evaluated: true,
      status: 'EVALUATED',
      failClosed: true,
      hermeticInjectedStageClaim: true,
      distinctFromEoFeatureFlag: true,
      distinctFromEpPolicyPackBinding: true,
      distinctFromDxCircuitBreaker: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      activation: sealedActivation,
      timestamp: new Date().toISOString()
    };
    const activationDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildConfigStagedActivationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      activation: sealedActivation,
      activationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      activationHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        remoteConfigPushRefused: true,
        wallClockAuthorityRefused: true,
        liveUnsupervisedMutationRefused: true,
        tipRefreshAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromEoFeatureFlag: true,
        distinctFromEpPolicyPackBinding: true,
        distinctFromEjAdmission: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EQ_CODES.OK,
      reason:
        'Hermetic staged-activation governance receipt sealed (≠ EO flag port ≠ EP pack port ≠ FDIR axis ≠ remote config push ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyConfigStagedActivationReceipt(receipt);
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

void EQ_PRODUCTION_READY;
