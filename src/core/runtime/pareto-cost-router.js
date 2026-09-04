import crypto from 'node:crypto';

/**
 * AI Model Pricing and Capability Tiers for EOS Pareto Optimization
 */
export const COST_TIERS = Object.freeze({
  LEAN: Object.freeze({
    id: 'LEAN',
    name: 'Lean Execution Tier',
    recommendedModels: ['gemini-2.5-flash', 'claude-3-5-haiku'],
    costPer1kTokensUSD: 0.0005,
    maxComplexityScore: 3,
    description: 'Fast scaffolding, syntax formatting, linting, and boilerplate generation.'
  }),
  STANDARD: Object.freeze({
    id: 'STANDARD',
    name: 'Standard Engineering Tier',
    recommendedModels: ['claude-3-7-sonnet', 'gpt-4o'],
    costPer1kTokensUSD: 0.008,
    maxComplexityScore: 7,
    description: 'Feature implementation, TDD Red-Green cycles, unit test authoring, refactoring.'
  }),
  DEEP_REASONING: Object.freeze({
    id: 'DEEP_REASONING',
    name: 'Deep Reasoning & Architecture Tier',
    recommendedModels: ['o3-mini', 'gemini-2.5-pro'],
    costPer1kTokensUSD: 0.025,
    maxComplexityScore: 10,
    description: 'Complex architecture design, formal FDIR recovery, multi-agent arbitration, security threat modeling.'
  })
});

/**
 * EOS Pareto Cost Router & Token Ledger
 * Selects optimal intelligence frontier models to minimize cost while ensuring mathematical rigor.
 */
export class ParetoCostRouter {
  constructor() {
    this.ledger = [];
  }

  /**
   * Classifies task into cost tier and recommends optimal model.
   * @param {string} taskDescription
   * @param {number} [complexityScore] Score from 1 to 10
   * @returns {object}
   */
  classifyTaskCostTier(taskDescription = '', complexityScore = 5) {
    let tier = COST_TIERS.STANDARD;

    if (complexityScore <= COST_TIERS.LEAN.maxComplexityScore) {
      tier = COST_TIERS.LEAN;
    } else if (complexityScore > COST_TIERS.STANDARD.maxComplexityScore) {
      tier = COST_TIERS.DEEP_REASONING;
    }

    return {
      taskDescription,
      complexityScore,
      tier,
      recommendedModel: tier.recommendedModels[0],
      alternativeModel: tier.recommendedModels[1],
      classifiedAt: new Date().toISOString()
    };
  }

  /**
   * Records token expenditure and generates cryptographic ledger receipt.
   * @param {string} missionId
   * @param {object} metrics
   * @param {'LEAN'|'STANDARD'|'DEEP_REASONING'} [metrics.tierId]
   * @param {number} [metrics.inputTokens]
   * @param {number} [metrics.outputTokens]
   * @returns {object}
   */
  recordTokenExpenditure(missionId, metrics = {}) {
    const tierId = metrics.tierId || 'STANDARD';
    const tier = COST_TIERS[tierId] || COST_TIERS.STANDARD;
    const inputTokens = metrics.inputTokens || 0;
    const outputTokens = metrics.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Cost calculation (weighted: input 1x, output 3x)
    const inputCostUSD = (inputTokens / 1000) * tier.costPer1kTokensUSD;
    const outputCostUSD = (outputTokens / 1000) * (tier.costPer1kTokensUSD * 3);
    const totalCostUSD = parseFloat((inputCostUSD + outputCostUSD).toFixed(6));

    const receiptPayload = JSON.stringify({
      missionId,
      tierId: tier.id,
      inputTokens,
      outputTokens,
      totalTokens,
      totalCostUSD,
      timestamp: new Date().toISOString()
    });

    const sha256 = crypto.createHash('sha256').update(receiptPayload).digest('hex');

    const receipt = {
      receiptId: `REC-${Date.now()}`,
      missionId,
      tier: tier.id,
      inputTokens,
      outputTokens,
      totalTokens,
      totalCostUSD,
      sha256: `sha256-${sha256}`,
      recordedAt: new Date().toISOString()
    };

    this.ledger.push(receipt);
    return receipt;
  }
}
