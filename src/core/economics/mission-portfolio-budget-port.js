/**
 * @module mission-portfolio-budget-port
 * SPEC-0086 / Mission CC — Mission Economics & Portfolio Budget Governor Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic portfolio governor:
 *   - Validates envelope plan via policy gate
 *   - Sums allocation latency/cost/risk vs envelope budgets
 *   - Decision: ALLOW | THROTTLE | DENY
 *   - Seals CC-RCPT-* receipts with digest chain
 *
 * NON-CLAIM:
 *   Mission economics portfolio ≠ FinOps SaaS /
 *   ≠ cloud billing integrator /
 *   ≠ PRODUCTION_READY=YES economics system.
 *   L17–L23 CLOSED never reopen;
 *   L24 OPEN (Audit + CB MEASURED · CC in progress · CD–CF pending);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/economics.
 *
 * Does NOT claim FinOps SaaS / does NOT touch Fundacion /
 * does NOT break token-economics-audit-engine.js.
 *
 * PRODUCTION_READY: NO
 */

import {
  CC_PRODUCTION_READY,
  CC_RECEIPT_KIND,
  sha256Canonical,
  buildMissionPortfolioBudgetReceipt,
  verifyMissionPortfolioBudgetReceipt
} from './mission-portfolio-budget-receipt.js';

import {
  MissionPortfolioBudgetPolicyGate,
  CC_CODES,
  CC_THROTTLE_RATIO
} from './mission-portfolio-budget-policy-gate.js';

/** @type {'NO'} */
export const CC_PORT_PRODUCTION_READY = 'NO';

export const CC_PORT_KIND = 'eos-mission-portfolio-budget-port';

/**
 * Sum allocation dimensions into totals.
 * @param {object[]} allocations
 * @returns {{ latencyMs: number, costUnits: number, riskScore: number }}
 */
export function computeAllocationTotals(allocations) {
  let latencyMs = 0;
  let costUnits = 0;
  let riskScore = 0;
  for (const row of allocations) {
    latencyMs += row.latencyMs;
    costUnits += row.costUnits;
    riskScore += row.riskScore;
  }
  return { latencyMs, costUnits, riskScore };
}

/**
 * Decide ALLOW / THROTTLE / DENY from totals vs envelope budgets.
 * @param {object} totals
 * @param {object} envelope
 * @param {number} [throttleRatio]
 * @returns {{ decision: 'ALLOW'|'THROTTLE'|'DENY', code: string, reasons: string[] }}
 */
export function decideBudget(totals, envelope, throttleRatio = CC_THROTTLE_RATIO) {
  /** @type {string[]} */
  const reasons = [];

  const dims = [
    ['latencyMs', totals.latencyMs, envelope.latencyMsBudget],
    ['costUnits', totals.costUnits, envelope.costUnitsBudget],
    ['riskScore', totals.riskScore, envelope.riskScoreBudget]
  ];

  let hardBreach = false;
  let softThrottle = false;

  for (const [name, used, budget] of dims) {
    if (used > budget) {
      hardBreach = true;
      reasons.push(
        `${name} over budget: used ${used} > budget ${budget}`
      );
    } else if (budget > 0 && used / budget >= throttleRatio) {
      softThrottle = true;
      reasons.push(
        `${name} at throttle band: used ${used} / budget ${budget} ≥ ${throttleRatio}`
      );
    }
  }

  if (hardBreach) {
    return {
      decision: 'DENY',
      code: CC_CODES.OVER_BUDGET_DENY,
      reasons
    };
  }

  if (softThrottle) {
    return {
      decision: 'THROTTLE',
      code: CC_CODES.OVER_BUDGET_THROTTLE,
      reasons
    };
  }

  return {
    decision: 'ALLOW',
    code: CC_CODES.EVALUATE_ALLOW,
    reasons: ['all dimensions within budget and below throttle ratio']
  };
}

/**
 * Mission Portfolio Budget Governor Port.
 */
export class MissionPortfolioBudgetPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxAllocations]
   * @param {number} [options.throttleRatio]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.throttleRatio =
      options.throttleRatio != null
        ? Number(options.throttleRatio)
        : CC_THROTTLE_RATIO;
    this.gate = new MissionPortfolioBudgetPolicyGate({
      maxAllocations: options.maxAllocations,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.portfolios = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._evalSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildMissionPortfolioBudgetReceipt(
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
   * Evaluate a portfolio envelope plan → decision + sealed CC receipt.
   * @param {object} plan
   * @returns {{ ok: boolean, code: string, decision?: string, portfolioId?: string, envelope?: object, allocations?: object[], totals?: object, reasons?: string[], rootDigest?: string, receipt: object, reason?: string }}
   */
  evaluate(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const receipt = this._sealReceipt({
        operation: 'EVALUATE',
        portfolioId:
          plan?.portfolioId != null ? String(plan.portfolioId) : null,
        decision: 'DENY',
        rootDigest: null,
        allocationCount: Array.isArray(plan?.allocations)
          ? plan.allocations.length
          : 0,
        meta: { code: evaluation.code, reason: evaluation.reason, reasons: [evaluation.reason] }
      });
      return {
        ok: false,
        code: evaluation.code,
        decision: 'DENY',
        reason: evaluation.reason,
        reasons: [evaluation.reason],
        receipt
      };
    }

    const { envelope, allocations } = evaluation;
    this._evalSeq += 1;
    const portfolioId =
      evaluation.portfolioId != null
        ? evaluation.portfolioId
        : `CC-PORTFOLIO-${String(this._evalSeq).padStart(4, '0')}`;

    const totals = computeAllocationTotals(allocations);
    const verdict = decideBudget(totals, envelope, this.throttleRatio);

    const rootDigest = this.hashFn({
      portfolioId,
      envelope,
      allocations,
      totals,
      decision: verdict.decision,
      reasons: verdict.reasons
    });

    const record = Object.freeze({
      portfolioId,
      envelope: Object.freeze({ ...envelope }),
      allocations: Object.freeze(allocations.map((a) => Object.freeze({ ...a }))),
      totals: Object.freeze({ ...totals }),
      decision: verdict.decision,
      reasons: Object.freeze([...verdict.reasons]),
      rootDigest,
      evaluatedAt: new Date().toISOString()
    });

    this.portfolios.set(portfolioId, record);

    const ok = verdict.decision !== 'DENY';
    const receipt = this._sealReceipt({
      operation: 'EVALUATE',
      portfolioId,
      decision: verdict.decision,
      rootDigest,
      allocationCount: allocations.length,
      meta: {
        code: verdict.code,
        reasons: verdict.reasons,
        totals,
        envelope
      }
    });

    return {
      ok,
      code: verdict.code,
      decision: verdict.decision,
      portfolioId,
      envelope,
      allocations,
      totals,
      reasons: verdict.reasons,
      rootDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored portfolio evaluation by id.
   * @param {string} portfolioId
   * @returns {object|null}
   */
  getPortfolio(portfolioId) {
    const record = this.portfolios.get(portfolioId);
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
      const verifyRes = verifyMissionPortfolioBudgetReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CC_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CC_CODES.TRAIL_BREAK,
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
      code: CC_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CC_PORT_PRODUCTION_READY,
  CC_PORT_KIND,
  CC_PRODUCTION_READY,
  CC_RECEIPT_KIND,
  CC_CODES,
  computeAllocationTotals,
  decideBudget,
  MissionPortfolioBudgetPort
};
