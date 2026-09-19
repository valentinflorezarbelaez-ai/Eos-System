/**
 * @module adversarial-verification-port
 * SPEC-0093 / Mission CJ — Continuous Adversarial Verification Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic adversarial probe port:
 *   - Validates probe plan via policy gate
 *   - Challenges MEASURED claims hermetically (evidenceDigest present/consistent)
 *   - Decision: PASS | CHALLENGE | DENY
 *   - Seals CJ-RCPT-* receipts with findings
 *   - No network / no GH API
 *
 * NON-CLAIM:
 *   Continuous Adversarial Verification Port ≠ red-team consulting product /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG + CH + CI MEASURED · CJ in progress · CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/verification.
 *
 * PRODUCTION_READY: NO
 */

import {
  CJ_PRODUCTION_READY,
  CJ_RECEIPT_KIND,
  sha256Canonical,
  buildAdversarialVerificationReceipt,
  verifyAdversarialVerificationReceipt
} from './adversarial-verification-receipt.js';

import {
  AdversarialVerificationPolicyGate,
  CJ_CODES
} from './adversarial-verification-policy-gate.js';

/** @type {'NO'} */
export const CJ_PORT_PRODUCTION_READY = 'NO';

export const CJ_PORT_KIND = 'eos-adversarial-verification-port';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

/**
 * Continuous Adversarial Verification Port — hermetic claim challenge.
 */
export class AdversarialVerificationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxTargets]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new AdversarialVerificationPolicyGate({
      maxTargets: options.maxTargets,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.probes = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._probeSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildAdversarialVerificationReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Seal a DENY / gate-reject outcome.
   * @private
   */
  _deny(plan, evaluation, extraFindings = []) {
    const reasons = [evaluation.reason];
    const targets = Array.isArray(plan?.targets)
      ? plan.targets.map((t) => ({
          claimId: t?.claimId != null ? String(t.claimId) : 'unknown',
          claimedStatus:
            t?.claimedStatus != null
              ? String(t.claimedStatus).toUpperCase()
              : 'UNKNOWN'
        }))
      : [];
    const findings = [
      {
        severity: 'FAIL',
        message: evaluation.reason || 'probe denied fail-closed'
      },
      ...extraFindings
    ];
    const receipt = this._sealReceipt({
      operation: 'PROBE',
      probeId: plan?.probeId != null ? String(plan.probeId) : null,
      decision: 'DENY',
      targetCount: targets.length,
      targets,
      findings,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      probeId: plan?.probeId != null ? String(plan.probeId) : undefined,
      reasons,
      findings,
      targets,
      receipt
    };
  }

  /**
   * Hermetically challenge validated targets.
   * FAIL if MEASURED but evidenceDigest missing/tampered;
   * WARN on weak evidence; INFO when consistent.
   * @private
   * @param {Array<object>} targets
   * @returns {{ findings: Array<{severity: string, message: string}>, decision: string }}
   */
  _challengeTargets(targets) {
    /** @type {Array<{severity: string, message: string}>} */
    const findings = [];

    for (const t of targets) {
      const { claimId, claimedStatus } = t;

      if (claimedStatus === 'MEASURED') {
        if (!t.evidenceDigest) {
          findings.push({
            severity: 'FAIL',
            message: `claim ${claimId}: MEASURED but evidenceDigest missing`
          });
          continue;
        }

        if (!SHA256_HEX_RE.test(t.evidenceDigest)) {
          findings.push({
            severity: 'FAIL',
            message: `claim ${claimId}: evidenceDigest tampered or not sha256 hex`
          });
          continue;
        }

        if (
          t.expectedDigest != null &&
          t.expectedDigest !== t.evidenceDigest
        ) {
          findings.push({
            severity: 'FAIL',
            message: `claim ${claimId}: evidenceDigest mismatches expectedDigest (tampered)`
          });
          continue;
        }

        if (t.evidenceQuality === 'weak') {
          findings.push({
            severity: 'WARN',
            message: `claim ${claimId}: MEASURED with weak evidenceQuality`
          });
          continue;
        }

        findings.push({
          severity: 'INFO',
          message: `claim ${claimId}: MEASURED evidenceDigest consistent`
        });
        continue;
      }

      if (claimedStatus === 'UNKNOWN') {
        findings.push({
          severity: 'INFO',
          message: `claim ${claimId}: status UNKNOWN (not asserting MEASURED)`
        });
        continue;
      }

      if (claimedStatus === 'BLOCKED') {
        findings.push({
          severity: 'INFO',
          message: `claim ${claimId}: status BLOCKED (not asserting MEASURED)`
        });
        continue;
      }

      findings.push({
        severity: 'FAIL',
        message: `claim ${claimId}: unexpected claimedStatus ${claimedStatus}`
      });
    }

    const hasFail = findings.some((f) => f.severity === 'FAIL');
    const hasWarn = findings.some((f) => f.severity === 'WARN');

    let decision = 'PASS';
    if (hasFail) decision = 'DENY';
    else if (hasWarn) decision = 'CHALLENGE';

    return { findings, decision };
  }

  /**
   * Probe a plan → PASS | CHALLENGE | DENY + sealed CJ receipt.
   * Hermetic: no network, no GH API; challenges MEASURED claims via digests.
   *
   * @param {object} plan
   * @returns {object}
   */
  probe(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._probeSeq += 1;
    const { probeId, targets, reasons: planReasons } = evaluation;

    const { findings, decision } = this._challengeTargets(targets);

    const sealedTargets = targets.map((t) => ({
      claimId: t.claimId,
      claimedStatus: t.claimedStatus
    }));

    if (decision === 'DENY') {
      const reasons = [
        ...(planReasons || []),
        `adversarial probe DENY: FAIL findings against MEASURED claims probeId=${probeId}`
      ];
      const probeDigest = this.hashFn({
        probeId,
        targets: sealedTargets,
        findings,
        decision
      });
      const receipt = this._sealReceipt({
        operation: 'PROBE',
        probeId,
        decision: 'DENY',
        targetCount: sealedTargets.length,
        targets: sealedTargets,
        findings,
        reasons,
        probeDigest,
        meta: {
          code: CJ_CODES.PROBE_DENY,
          reasons,
          probeDigest
        }
      });
      return {
        ok: false,
        code: CJ_CODES.PROBE_DENY,
        decision: 'DENY',
        probeId,
        targets: sealedTargets,
        findings,
        reasons,
        probeDigest,
        receipt
      };
    }

    const code =
      decision === 'PASS' ? CJ_CODES.PROBE_PASS : CJ_CODES.PROBE_CHALLENGE;

    const reasons = [
      ...(planReasons || []),
      `adversarial probe ${decision}: targets=${sealedTargets.length} probeId=${probeId}`
    ];

    const probeDigest = this.hashFn({
      probeId,
      targets: sealedTargets,
      findings,
      decision
    });

    const record = Object.freeze({
      probeId,
      targets: Object.freeze(sealedTargets.map((t) => Object.freeze({ ...t }))),
      findings: Object.freeze(findings.map((f) => Object.freeze({ ...f }))),
      decision,
      reasons: Object.freeze([...reasons]),
      probeDigest,
      probedAt: new Date().toISOString()
    });

    this.probes.set(probeId, record);

    const receipt = this._sealReceipt({
      operation: 'PROBE',
      probeId,
      decision,
      targetCount: sealedTargets.length,
      targets: sealedTargets,
      findings,
      reasons,
      probeDigest,
      meta: {
        code,
        reasons,
        probeDigest
      }
    });

    return {
      ok: true,
      code,
      decision,
      probeId,
      targets: sealedTargets,
      findings,
      reasons,
      probeDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored probe record by id.
   * @param {string} probeId
   * @returns {object|null}
   */
  getProbe(probeId) {
    const record = this.probes.get(probeId);
    return record ? record : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyAdversarialVerificationReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CJ_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CJ_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: CJ_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CJ_PORT_PRODUCTION_READY,
  CJ_PORT_KIND,
  CJ_PRODUCTION_READY,
  CJ_RECEIPT_KIND,
  CJ_CODES,
  AdversarialVerificationPort
};
