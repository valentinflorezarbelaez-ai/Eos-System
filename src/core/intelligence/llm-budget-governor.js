/**
 * @module LlmBudgetGovernor
 * @description Real-time token and USD accounting engine for EOS LLM Invocations.
 * Enforces per-mission hard caps, preflight token checks, real consumption decrementing,
 * and fail-closed budget denial without fabricating artificial telemetry.
 */

import { LlmBudgetError } from '../ports/llm-port.js';

export class LlmBudgetGovernor {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultMaxTokens=50000]
   * @param {number} [options.defaultMaxCostUsd=0.50]
   */
  constructor(options = {}) {
    this.defaultMaxTokens = options.defaultMaxTokens || 50000;
    this.defaultMaxCostUsd = options.defaultMaxCostUsd || 0.50;
    this.missionBudgets = new Map(); // missionId -> { maxTokens, maxCostUsd, consumedTokens, consumedCostUsd, callCount }
    this.usageLog = [];
  }

  /**
   * Initializes or updates a mission's budget limit
   * @param {string} missionId
   * @param {object} [limits]
   */
  initMissionBudget(missionId, limits = {}) {
    if (!missionId || typeof missionId !== 'string') {
      throw new Error('BUDGET_GOVERNOR_ERROR: missionId is required.');
    }

    const existing = this.missionBudgets.get(missionId) || {
      consumedTokens: 0,
      consumedCostUsd: 0.0,
      callCount: 0
    };

    const budget = {
      mission_id: missionId,
      maxTokens: limits.max_tokens || limits.maxTokens || this.defaultMaxTokens,
      maxCostUsd: limits.max_cost_usd || limits.maxCostUsd || this.defaultMaxCostUsd,
      consumedTokens: existing.consumedTokens,
      consumedCostUsd: existing.consumedCostUsd,
      callCount: existing.callCount,
      initialized_at: new Date().toISOString()
    };

    this.missionBudgets.set(missionId, budget);
    return budget;
  }

  /**
   * Retrieves budget status for a mission
   * @param {string} missionId
   */
  getBudget(missionId) {
    if (!this.missionBudgets.has(missionId)) {
      return this.initMissionBudget(missionId);
    }
    const b = this.missionBudgets.get(missionId);
    return {
      ...b,
      remainingTokens: Math.max(0, b.maxTokens - b.consumedTokens),
      remainingCostUsd: Math.max(0, Number((b.maxCostUsd - b.consumedCostUsd).toFixed(6)))
    };
  }

  /**
   * Preflight validation before dispatching to provider
   * @param {string} missionId
   * @param {number} [estimatedTokens=1000]
   */
  assertPreflightBudget(missionId, estimatedTokens = 1000) {
    const budget = this.getBudget(missionId);

    if (budget.consumedTokens + estimatedTokens > budget.maxTokens) {
      throw new LlmBudgetError(
        `BUDGET_EXCEEDED: Token limit reached for mission '${missionId}'. Limit: ${budget.maxTokens}, Consumed: ${budget.consumedTokens}, Requested estimate: ${estimatedTokens}.`,
        { missionId, budget }
      );
    }

    if (budget.consumedCostUsd >= budget.maxCostUsd) {
      throw new LlmBudgetError(
        `BUDGET_EXCEEDED: Cost limit reached for mission '${missionId}'. Max USD: $${budget.maxCostUsd}, Consumed USD: $${budget.consumedCostUsd}.`,
        { missionId, budget }
      );
    }

    return true;
  }

  /**
   * Records verified usage after an LLM invocation
   * @param {string} missionId
   * @param {string|null} taskId
   * @param {object} usage { input_tokens, output_tokens, total_tokens, estimated_cost_usd }
   */
  recordUsage(missionId, taskId, usage = {}) {
    const budget = this.getBudget(missionId);

    const inputTokens = Number(usage.input_tokens) || 0;
    const outputTokens = Number(usage.output_tokens) || 0;
    const totalTokens = Number(usage.total_tokens) || (inputTokens + outputTokens);
    const costUsd = Number(usage.estimated_cost_usd) || 0.0;

    budget.consumedTokens += totalTokens;
    budget.consumedCostUsd = Number((budget.consumedCostUsd + costUsd).toFixed(6));
    budget.callCount += 1;

    const record = {
      mission_id: missionId,
      task_id: taskId,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd
      },
      budget_after: {
        consumed_tokens: budget.consumedTokens,
        remaining_tokens: Math.max(0, budget.maxTokens - budget.consumedTokens),
        consumed_cost_usd: budget.consumedCostUsd,
        remaining_cost_usd: Math.max(0, Number((budget.maxCostUsd - budget.consumedCostUsd).toFixed(6)))
      },
      timestamp: new Date().toISOString()
    };

    this.usageLog.push(record);
    this.missionBudgets.set(missionId, budget);

    return record;
  }
}
