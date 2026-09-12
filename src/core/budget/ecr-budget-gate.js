/**
 * @module ecr-budget-gate
 * SPEC-0036 / Mission AE — thin execution-loop seam over ECR.
 *
 * Wraps createTokenBudgetCircuitBreaker for beforeCall / afterCall hooks
 * without implementing AF autonomous loop.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 * NON-CLAIM: ECR ≠ billing platform ≠ PRODUCTION_READY; not AF/AG/AH
 */

import {
  createTokenBudgetCircuitBreaker,
  createECR,
  ECR_KIND,
  ECR_PRODUCTION_READY,
  ECR_CODES,
  sanitizeEcrPayload
} from './token-budget-circuit-breaker.js';

export const ECR_GATE_KIND = 'eos-ecr-budget-gate';

/**
 * @param {object} [options] — forwarded to createTokenBudgetCircuitBreaker
 * plus optional `breaker` injectable.
 */
export function createEcrBudgetGate(options = {}) {
  const breaker =
    options.breaker && typeof options.breaker === 'object'
      ? options.breaker
      : createTokenBudgetCircuitBreaker(options);

  /**
   * Pre-call gate — DENY if tripped / over budget.
   */
  function beforeCall(_ctx = {}) {
    const result = breaker.check();
    return sanitizeEcrPayload({
      ...result,
      gate: 'beforeCall',
      gateKind: ECR_GATE_KIND
    });
  }

  /**
   * Post-call usage record — may trip.
   * @param {object} usage
   */
  function afterCall(usage = {}) {
    const result = breaker.recordUsage(usage);
    return sanitizeEcrPayload({
      ...result,
      gate: 'afterCall',
      gateKind: ECR_GATE_KIND
    });
  }

  function allow() {
    return breaker.shouldAllow();
  }

  return {
    kind: ECR_GATE_KIND,
    PRODUCTION_READY: ECR_PRODUCTION_READY,
    breaker,
    beforeCall,
    afterCall,
    allow,
    check: () => breaker.check(),
    trip: (...args) => breaker.trip(...args),
    reset: (...args) => breaker.reset(...args),
    health: async () => {
      const h = await Promise.resolve(breaker.health());
      return sanitizeEcrPayload({
        ...h,
        gateKind: ECR_GATE_KIND
      });
    },
    getState: () =>
      sanitizeEcrPayload({
        ...breaker.getState(),
        gateKind: ECR_GATE_KIND,
        ecrKind: ECR_KIND
      })
  };
}

export {
  createTokenBudgetCircuitBreaker,
  createECR,
  ECR_KIND,
  ECR_PRODUCTION_READY,
  ECR_CODES,
  sanitizeEcrPayload
};

export default createEcrBudgetGate;
