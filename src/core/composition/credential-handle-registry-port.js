/**
 * @module credential-handle-registry-port
 * SPEC-0156 / Mission ET — Sovereign Credential-Handle Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 38 axis: Sovereign Credential-Handle & Secret-Zero Governance Fabric.
 * Existing Mission AU secret surfaces (src/core/secrets/*) are runtime/env-broker
 * oriented — not a receipted Layer-0 composition credential-handle governance port.
 * This port seals hermetic credential-handle registry binding receipts:
 *   - Validates binding (handleId opaque + handleClass + desiredBinding BOUND|UNBOUND|HOLD;
 *     optional observedBinding injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable ET-RCPT-* receipts with handleDigest
 *     (sha256 of opaque handle metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of binding PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic binding receipt only — NOT a live secret store,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EO/EP/EQ/ER/AU ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L37 reopen,
 *     L38 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; secretMaterialRefused / secretZeroHeld
 *   Freeze soft-observe: pin 2b747fb0 (do NOT rewrite tip pins)
 *   Seals chained ET-RCPT-* receipts with verifiable handleDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L37; refuse L38 auto-close (EU–EX pending)
 *
 * PASS = sealed credential-handle binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU
 */

import {
  ET_PRODUCTION_READY,
  sha256Canonical,
  computeHandleDigest,
  buildCredentialHandleRegistryReceipt,
  verifyCredentialHandleRegistryReceipt
} from './credential-handle-registry-receipt.js';

import {
  CredentialHandleRegistryPolicyGate,
  ET_CODES
} from './credential-handle-registry-policy-gate.js';

/** @type {'NO'} */
export const ET_PORT_PRODUCTION_READY = 'NO';
export const ET_PORT_KIND = 'eos-credential-handle-registry-port';

export class CredentialHandleRegistryPort {
  /**
   * @param {object} [opts]
   * @param {CredentialHandleRegistryPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CredentialHandleRegistryPolicyGate();
    this.trail = [];
    this.productionReady = ET_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the credential-handle registry binding ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === ET_CODES.BINDING_UNAUTHORIZED) status = 'BINDING_UNAUTHORIZED';
      else if (gateRes.code === ET_CODES.INVALID_BINDING_CLAIM) status = 'INVALID_BINDING_CLAIM';
      else if (
        gateRes.code === ET_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === ET_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === ET_CODES.RAW_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildCredentialHandleRegistryReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-38-mission-et',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        binding: input.binding
          ? {
              handleId: input.binding.handleId,
              handleClass: input.binding.handleClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status
            }
          : null,
        handleDigest: sha256Canonical(
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
      const holdReceipt = buildCredentialHandleRegistryReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        binding: input.binding
          ? {
              handleId: input.binding.handleId,
              handleClass: input.binding.handleClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        handleDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: ET_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBinding = {
      handleId: input.binding.handleId,
      handleClass: input.binding.handleClass,
      bindingClass: input.binding.bindingClass || 'credential-handle',
      desiredBinding: input.binding.desiredBinding,
      observedBinding: input.binding.observedBinding,
      authorized: true,
      evaluated: true,
      status: 'BOUND_EVALUATED',
      failClosed: true,
      hermeticInjectedHandleBinding: true,
      distinctFromEoFeatureFlag: true,
      distinctFromEpPolicyPack: true,
      distinctFromAuSecretRuntimeBroker: true
    };

    const handleDigest = computeHandleDigest(sealedBinding);

    const passReceipt = buildCredentialHandleRegistryReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      binding: sealedBinding,
      handleDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      handleHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveSecretStoreRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        secretMaterialRefused: true,
        secretZeroHeld: true,
        distinctFromEoFeatureFlag: true,
        distinctFromEpPolicyPack: true,
        distinctFromEqStagedActivation: true,
        distinctFromErConfigHonesty: true,
        distinctFromAuSecretRuntimeBroker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: ET_CODES.OK,
      reason:
        'Hermetic credential-handle-registry governance receipt sealed (≠ EO/EP/EQ/ER/AU ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyCredentialHandleRegistryReceipt(receipt);
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

void ET_PRODUCTION_READY;
