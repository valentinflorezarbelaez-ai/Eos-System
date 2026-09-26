/**
 * @module credential-handle-lifecycle-port
 * SPEC-0158 / Mission EV — Credential Handle Lifecycle / Rotation Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 38 axis: Sovereign Credential-Handle & Secret-Zero Governance Fabric.
 * Existing ET bind / EU leak-deny / EQ config staged-activation surfaces are distinct —
 * this port seals hermetic opaque-handle lifecycle (STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD)
 * receipts chained to L37 EQ staged activation and L33–L36 intakes without unsupervised
 * live secret mutation:
 *   - Validates lifecycle (opaque handleId + desiredStage; optional observedLifecycle
 *     injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EV-RCPT-* receipts with lifecycleDigest
 *     (sha256 of opaque handle metadata only — never secret bytes, never new plaintext
 *     credentials on rotate)
 *   - Maintains verifiable audit trail of lifecycle PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic lifecycle receipt only — NOT live secret mutation, NOT vault/KMS,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT ET/EU/EQ ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L37 reopen,
 *     L38 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; secretMaterialRefused / secretZeroHeld
 *   Freeze soft-observe: pin 0eace5df (do NOT rewrite tip pins)
 *   Seals chained EV-RCPT-* receipts with verifiable lifecycleDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L37; refuse L38 auto-close (EW–EX pending)
 *
 * PASS = sealed handle lifecycle ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret mutation ≠ wall-clock authority ≠ ET/EU/EQ
 */
import {
  EV_PRODUCTION_READY,
  sha256Canonical,
  computeLifecycleDigest,
  buildCredentialHandleLifecycleReceipt,
  verifyCredentialHandleLifecycleReceipt
} from './credential-handle-lifecycle-receipt.js';

import {
  CredentialHandleLifecyclePolicyGate,
  EV_CODES
} from './credential-handle-lifecycle-policy-gate.js';

/** @type {'NO'} */
export const EV_PORT_PRODUCTION_READY = 'NO';
export const EV_PORT_KIND = 'eos-credential-handle-lifecycle-port';

export class CredentialHandleLifecyclePort {
  /**
   * @param {object} [opts]
   * @param {CredentialHandleLifecyclePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CredentialHandleLifecyclePolicyGate();
    this.trail = [];
    this.productionReady = EV_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the credential-handle lifecycle ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EV_CODES.LIFECYCLE_UNAUTHORIZED) status = 'LIFECYCLE_UNAUTHORIZED';
      else if (gateRes.code === EV_CODES.INVALID_LIFECYCLE_CLAIM) status = 'INVALID_LIFECYCLE_CLAIM';
      else if (
        gateRes.code === EV_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === EV_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === EV_CODES.RAW_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildCredentialHandleLifecycleReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-38-mission-ev',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        lifecycle: input.lifecycle
          ? {
              handleId: input.lifecycle.handleId,
              handleClass: input.lifecycle.handleClass,
              desiredStage: input.lifecycle.desiredStage,
              observedLifecycle: input.lifecycle.observedLifecycle,
              authorized: input.lifecycle.authorized,
              evaluated: false,
              status
            }
          : null,
        lifecycleDigest: sha256Canonical(
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
      const holdReceipt = buildCredentialHandleLifecycleReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        lifecycle: input.lifecycle
          ? {
              handleId: input.lifecycle.handleId,
              handleClass: input.lifecycle.handleClass,
              desiredStage: input.lifecycle.desiredStage,
              observedLifecycle: input.lifecycle.observedLifecycle,
              authorized: input.lifecycle.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        lifecycleDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EV_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedLifecycle = {
      handleId: input.lifecycle.handleId,
      handleClass: input.lifecycle.handleClass || 'credential-handle',
      desiredStage: input.lifecycle.desiredStage,
      observedLifecycle: input.lifecycle.observedLifecycle,
      authorized: true,
      evaluated: true,
      status: 'LIFECYCLE_EVALUATED',
      failClosed: true,
      hermeticInjectedLifecycle: true,
      distinctFromEtCredentialHandleRegistry: true,
      distinctFromEuSecretZeroLeakDeny: true,
      distinctFromEqStagedActivation: true
    };

    const lifecycleDigest = computeLifecycleDigest(sealedLifecycle);

    const passReceipt = buildCredentialHandleLifecycleReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      lifecycle: sealedLifecycle,
      lifecycleDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      lifecycleHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveSecretMutationRefused: true,
        liveSecretStoreRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawSecretMaterialRefused: true,
        vaultKmsRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        secretMaterialRefused: true,
        secretZeroHeld: true,
        distinctFromEtCredentialHandleRegistry: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEqStagedActivation: true,
        distinctFromEoFeatureFlag: true,
        distinctFromEpPolicyPack: true,
        distinctFromErConfigHonesty: true,
        distinctFromAuSecretRuntimeBroker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EV_CODES.OK,
      reason:
        'Hermetic credential-handle-lifecycle governance receipt sealed (≠ ET/EU/EQ ≠ live secret mutation ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyCredentialHandleLifecycleReceipt(receipt);
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

void EV_PRODUCTION_READY;
