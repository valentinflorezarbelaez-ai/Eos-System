/**
 * @module EconomicContractValidator
 * @description Enterprise Economic & Operational Risk Contract Engine for EOS.
 * Extends formal EARS functional contracts with quantitative business, financial,
 * SLA, and blast radius risk invariants (Economic Contract Requirements - ECR).
 * Pure L0 Node.js implementation (zero npm dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';

export const REVERSIBILITY_TIERS = Object.freeze({
  FULL_REVERSIBLE: 'FULL_REVERSIBLE',
  COMPENSATING_TX: 'COMPENSATING_TX',
  IRREVERSIBLE: 'IRREVERSIBLE'
});

export const DEFAULT_ECONOMIC_LIMITS = Object.freeze({
  max_tokens: 50000,
  max_cost_usd: 0.50,
  max_latency_ms: 1000,
  max_memory_mb: 256,
  max_blast_radius: 5,
  max_financial_exposure_usd: 1000.00,
  reversibility_tier: REVERSIBILITY_TIERS.FULL_REVERSIBLE
});

export class EconomicContractValidator {
  /**
   * @param {object} [options]
   * @param {object} [options.defaultLimits]
   */
  constructor(options = {}) {
    this.defaultLimits = { ...DEFAULT_ECONOMIC_LIMITS, ...(options.defaultLimits || {}) };
  }

  /**
   * Extracts economic and risk invariants declared in specification text.
   * Scans for formal ECR markdown sections and key-value declarations.
   * @param {string} specContent
   * @returns {object} Extracted economic contract bounds
   */
  extractEconomicContract(specContent = '') {
    if (!specContent || typeof specContent !== 'string') {
      return { ...this.defaultLimits, source: 'DEFAULT_FALLBACK' };
    }

    const limits = { ...this.defaultLimits, source: 'SPEC_EXTRACTED' };

    // Regex matchers for common economic and SLA declarations in Markdown specs
    const tokenMatch = specContent.match(/(?:max[_\s-]?tokens?|token[_\s-]?budget)[:\s*`]+([0-9,]+)/i);
    if (tokenMatch) {
      limits.max_tokens = parseInt(tokenMatch[1].replace(/,/g, ''), 10);
    }

    const costMatch = specContent.match(/(?:max[_\s-]?cost|cost[_\s-]?budget|budget[_\s-]?usd)[:\s*`]+\$?([0-9.]+)/i);
    if (costMatch) {
      limits.max_cost_usd = parseFloat(costMatch[1]);
    }

    const latencyMatch = specContent.match(/(?:max[_\s-]?latency|sla[_\s-]?latency|latency[_\s-]?budget)[:\s*`]+([0-9.]+)\s*(?:ms|s)?/i);
    if (latencyMatch) {
      const val = parseFloat(latencyMatch[1]);
      limits.max_latency_ms = latencyMatch[0].toLowerCase().includes('s') && !latencyMatch[0].toLowerCase().includes('ms')
        ? val * 1000
        : val;
    }

    const memoryMatch = specContent.match(/(?:max[_\s-]?memory|memory[_\s-]?budget)[:\s*`]+([0-9.]+)\s*(?:mb|gb)?/i);
    if (memoryMatch) {
      const val = parseFloat(memoryMatch[1]);
      limits.max_memory_mb = memoryMatch[0].toLowerCase().includes('gb') ? val * 1024 : val;
    }

    const blastMatch = specContent.match(/(?:max[_\s-]?blast[_\s-]?radius|blast[_\s-]?radius)[:\s*`]+([0-9]+)/i);
    if (blastMatch) {
      limits.max_blast_radius = parseInt(blastMatch[1], 10);
    }

    const reversibilityMatch = specContent.match(/(?:reversibility[_\s-]?tier|reversibility)[:\s*`]+(FULL_REVERSIBLE|COMPENSATING_TX|IRREVERSIBLE)/i);
    if (reversibilityMatch) {
      limits.reversibility_tier = reversibilityMatch[1].toUpperCase();
    }

    const exposureMatch = specContent.match(/(?:max[_\s-]?financial[_\s-]?exposure|exposure[_\s-]?usd)[:\s*`]+\$?([0-9,.]+)/i);
    if (exposureMatch) {
      limits.max_financial_exposure_usd = parseFloat(exposureMatch[1].replace(/,/g, ''));
    }

    return limits;
  }

  /**
   * Validates execution telemetry against economic and risk contract boundaries.
   * @param {object} contract - Contract limits (from extractEconomicContract or custom)
   * @param {object} telemetry - Observed execution metrics
   * @param {number} [telemetry.tokens_consumed]
   * @param {number} [telemetry.cost_usd]
   * @param {number} [telemetry.latency_ms]
   * @param {number} [telemetry.memory_mb]
   * @param {number} [telemetry.blast_radius]
   * @param {number} [telemetry.financial_exposure_usd]
   * @param {string} [telemetry.reversibility_tier]
   * @param {boolean} [telemetry.human_authorized=false]
   * @returns {object} Validation result, circuit breaker state, violations, and score
   */
  evaluateTelemetry(contract = {}, telemetry = {}) {
    const activeContract = { ...this.defaultLimits, ...contract };
    const violations = [];

    // 1. Token Budget Invariant
    if (typeof telemetry.tokens_consumed === 'number') {
      if (telemetry.tokens_consumed > activeContract.max_tokens) {
        violations.push({
          metric: 'tokens_consumed',
          limit: activeContract.max_tokens,
          actual: telemetry.tokens_consumed,
          severity: 'BLOCKING',
          message: `Token budget exceeded: consumed ${telemetry.tokens_consumed} > limit ${activeContract.max_tokens}`
        });
      }
    }

    // 2. Financial Cost Invariant
    if (typeof telemetry.cost_usd === 'number') {
      if (telemetry.cost_usd > activeContract.max_cost_usd) {
        violations.push({
          metric: 'cost_usd',
          limit: activeContract.max_cost_usd,
          actual: telemetry.cost_usd,
          severity: 'BLOCKING',
          message: `Cost ceiling exceeded: cost $${telemetry.cost_usd.toFixed(4)} > budget $${activeContract.max_cost_usd.toFixed(4)}`
        });
      }
    }

    // 3. Operational SLA (Latency) Invariant
    if (typeof telemetry.latency_ms === 'number') {
      if (telemetry.latency_ms > activeContract.max_latency_ms) {
        violations.push({
          metric: 'latency_ms',
          limit: activeContract.max_latency_ms,
          actual: telemetry.latency_ms,
          severity: 'BLOCKING',
          message: `SLA latency violated: p99 ${telemetry.latency_ms}ms > threshold ${activeContract.max_latency_ms}ms`
        });
      }
    }

    // 4. Memory Footprint Invariant
    if (typeof telemetry.memory_mb === 'number') {
      if (telemetry.memory_mb > activeContract.max_memory_mb) {
        violations.push({
          metric: 'memory_mb',
          limit: activeContract.max_memory_mb,
          actual: telemetry.memory_mb,
          severity: 'BLOCKING',
          message: `Memory budget violated: ${telemetry.memory_mb.toFixed(1)}MB > ceiling ${activeContract.max_memory_mb}MB`
        });
      }
    }

    // 5. Blast Radius Invariant
    if (typeof telemetry.blast_radius === 'number') {
      if (telemetry.blast_radius > activeContract.max_blast_radius) {
        violations.push({
          metric: 'blast_radius',
          limit: activeContract.max_blast_radius,
          actual: telemetry.blast_radius,
          severity: 'BLOCKING',
          message: `Blast radius threshold exceeded: ${telemetry.blast_radius} affected entities > limit ${activeContract.max_blast_radius}`
        });
      }
    }

    // 6. Financial Risk Exposure Invariant
    if (typeof telemetry.financial_exposure_usd === 'number') {
      if (telemetry.financial_exposure_usd > activeContract.max_financial_exposure_usd) {
        violations.push({
          metric: 'financial_exposure_usd',
          limit: activeContract.max_financial_exposure_usd,
          actual: telemetry.financial_exposure_usd,
          severity: 'BLOCKING',
          message: `Financial risk exposure exceeded: $${telemetry.financial_exposure_usd} > cap $${activeContract.max_financial_exposure_usd}`
        });
      }
    }

    // 7. Reversibility & Authorization Gate
    const effectiveReversibility = telemetry.reversibility_tier || activeContract.reversibility_tier;
    if (effectiveReversibility === REVERSIBILITY_TIERS.IRREVERSIBLE && !telemetry.human_authorized) {
      violations.push({
        metric: 'reversibility_tier',
        limit: 'REQUIRES_HUMAN_AUTHORIZATION',
        actual: 'IRREVERSIBLE_UNAUTHORIZED',
        severity: 'BLOCKING',
        message: 'Irreversible mutation requires explicit human authorization gate approval'
      });
    }

    const compliant = violations.length === 0;
    const circuitBreakerTripped = !compliant;
    const verdict = compliant ? 'ECONOMIC_CONTRACT_SATISFIED' : 'CIRCUIT_BREAKER_TRIPPED';

    // Compute Economic Efficiency Score (0 - 100)
    let efficiencyScore = 100;
    if (compliant) {
      const ratios = [];
      if (typeof telemetry.tokens_consumed === 'number' && activeContract.max_tokens > 0) {
        ratios.push(telemetry.tokens_consumed / activeContract.max_tokens);
      }
      if (typeof telemetry.cost_usd === 'number' && activeContract.max_cost_usd > 0) {
        ratios.push(telemetry.cost_usd / activeContract.max_cost_usd);
      }
      if (typeof telemetry.latency_ms === 'number' && activeContract.max_latency_ms > 0) {
        ratios.push(telemetry.latency_ms / activeContract.max_latency_ms);
      }

      if (ratios.length > 0) {
        const avgUtilization = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        efficiencyScore = Math.max(10, Number(((1 - avgUtilization * 0.5) * 100).toFixed(1)));
      }
    } else {
      efficiencyScore = Math.max(0, 100 - violations.length * 35);
    }

    return {
      compliant,
      verdict,
      circuit_breaker_tripped: circuitBreakerTripped,
      violations_count: violations.length,
      violations,
      efficiency_score: efficiencyScore,
      contract_evaluated: activeContract,
      observed_telemetry: telemetry,
      timestamp: new Date().toISOString()
    };
  }
}
