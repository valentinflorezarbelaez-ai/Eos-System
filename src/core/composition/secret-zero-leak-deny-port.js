/**
 * @module secret-zero-leak-deny-port
 * SPEC-0157 / Mission EU — Secret-Zero Leak-Deny & Redaction Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 38 axis: Sovereign Credential-Handle & Secret-Zero Governance Fabric.
 * Existing Mission AU secret surfaces (src/core/secrets/*) are runtime/env-broker
 * oriented — not a receipted Layer-0 composition credential-handle governance port.
 * This port seals hermetic credential-handle registry claim receipts:
 *   - Validates claim (subjectKind opaque + desiredAction + desiredAction DENY_LEAK|REDACT|HOLD;
 *     optional observedScan injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EU-RCPT-* receipts with redactionDigest
 *     (sha256 of opaque handle metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of claim PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic claim receipt only — NOT a live secret store,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EO/EP/EQ/ER/AU ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L37 reopen,
 *     L38 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; secretMaterialRefused / secretZeroHeld
 *   Freeze soft-observe: pin bc24c17b (do NOT rewrite tip pins)
 *   Seals chained EU-RCPT-* receipts with verifiable redactionDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L37; refuse L38 auto-close (EV–EX pending)
 *
 * PASS = sealed credential-handle claim ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live secret store ≠ wall-clock authority ≠ EO/EP/EQ/ER/AU
 */

import {
  EU_PRODUCTION_READY,
  sha256Canonical,
  computeRedactionDigest,
  buildSecretZeroLeakDenyReceipt,
  verifySecretZeroLeakDenyReceipt
} from './secret-zero-leak-deny-receipt.js';

import {
  SecretZeroLeakDenyPolicyGate,
  EU_CODES
} from './secret-zero-leak-deny-policy-gate.js';

/** @type {'NO'} */
export const EU_PORT_PRODUCTION_READY = 'NO';
export const EU_PORT_KIND = 'eos-secret-zero-leak-deny-port';

export class SecretZeroLeakDenyPort {
  /**
   * @param {object} [opts]
   * @param {SecretZeroLeakDenyPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new SecretZeroLeakDenyPolicyGate();
    this.trail = [];
    this.productionReady = EU_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the credential-handle registry claim ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EU_CODES.REDACTION_UNAUTHORIZED) status = 'REDACTION_UNAUTHORIZED';
      else if (gateRes.code === EU_CODES.INVALID_REDACTION_CLAIM) status = 'INVALID_REDACTION_CLAIM';
      else if (
        gateRes.code === EU_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === EU_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === EU_CODES.RAW_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildSecretZeroLeakDenyReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-38-mission-eu',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        claim: input.claim
          ? {
              subjectKind: input.claim.subjectKind,
              desiredAction: input.claim.desiredAction,
              leakClass: input.claim.leakClass,
              desiredAction: input.claim.desiredAction,
              observedScan: input.claim.observedScan,
              authorized: input.claim.authorized,
              evaluated: false,
              status
            }
          : null,
        redactionDigest: sha256Canonical(
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
      const holdReceipt = buildSecretZeroLeakDenyReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        claim: input.claim
          ? {
              subjectKind: input.claim.subjectKind,
              desiredAction: input.claim.desiredAction,
              leakClass: input.claim.leakClass,
              desiredAction: input.claim.desiredAction,
              observedScan: input.claim.observedScan,
              authorized: input.claim.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        redactionDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EU_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBinding = {
      subjectKind: input.claim.subjectKind,
      desiredAction: input.claim.desiredAction,
      leakClass: input.claim.leakClass || 'credential-handle',
      desiredAction: input.claim.desiredAction,
      observedScan: input.claim.observedScan,
      authorized: true,
      evaluated: true,
      status: 'REDACTION_EVALUATED',
      failClosed: true,
      hermeticInjectedLeakScan: true,
      distinctFromEoFeatureFlag: true,
      distinctFromEpPolicyPack: true,
      distinctFromEtCredentialHandleRegistry: true,
      distinctFromAuSecretLeakGuard: true
    };

    const redactionDigest = computeRedactionDigest(sealedBinding);

    const passReceipt = buildSecretZeroLeakDenyReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      claim: sealedBinding,
      redactionDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      leakHold: {
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
        distinctFromAuSecretLeakGuard: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EU_CODES.OK,
      reason:
        'Hermetic secret-zero-leak-deny governance receipt sealed (≠ EO/EP/EQ/ER/ET/AU ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifySecretZeroLeakDenyReceipt(receipt);
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

void EU_PRODUCTION_READY;
