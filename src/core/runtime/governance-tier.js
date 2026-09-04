import crypto from 'node:crypto';

/**
 * Canonical Governance Tier Definitions
 */
export const GOVERNANCE_TIERS = Object.freeze({
  TIER_1_FAST_TRACK: Object.freeze({
    id: 'TIER_1_FAST_TRACK',
    name: 'Fast-Track Hotfix / Micro-patch',
    description: '4-step expedited loop for localized bugfixes and micro-refactoring.',
    stepsCount: 4,
    steps: Object.freeze([
      '1_FAILING_TEST',
      '2_SURGICAL_PATCH',
      '3_PASSING_TEST',
      '4_CRYPTO_EVIDENCE_RECORD'
    ]),
    maxFilesAllowed: 3,
    requiresHumanSignoff: true
  }),
  TIER_2_STANDARD_FEATURE: Object.freeze({
    id: 'TIER_2_STANDARD_FEATURE',
    name: 'Standard Feature / Component',
    description: '8-step structured lifecycle for feature additions and non-core modules.',
    stepsCount: 8,
    steps: Object.freeze([
      '1_SPEC_EARS',
      '2_PLAN_HEXAGONAL',
      '3_TASKS_DAG',
      '4_TDD_CYCLE',
      '5_UNIT_LOGIC_TESTS',
      '6_CORE_AUDITS_PARALLEL',
      '7_EVIDENCE_GENERATION',
      '8_STAGING_VERIFY'
    ]),
    maxFilesAllowed: 12,
    requiresHumanSignoff: false
  }),
  TIER_3_CORE_MISSION: Object.freeze({
    id: 'TIER_3_CORE_MISSION',
    name: 'Core Mission / Architectural Mutation',
    description: 'Complete 21-step mission lifecycle for system architectures and high-risk changes.',
    stepsCount: 21,
    steps: Object.freeze([
      '1_INTAKE',
      '2_RECONNAISSANCE',
      '3_CONTEXT_UNDERSTANDING',
      '4_REQUIREMENTS_EARS',
      '5_RESEARCH',
      '6_ARCHITECTURE_ADR',
      '7_DESIGN_SYSTEM',
      '8_SPECIFICATION_APPROVAL',
      '9_AUTHORIZATION_GATE',
      '10_IMPLEMENTATION_TDD',
      '11_UNIT_LOGIC_TESTING',
      '12_SECURITY_AUDITING',
      '13_QUALITY_AUDITING',
      '14_ACCESSIBILITY_AUDITING',
      '15_PERFORMANCE_AUDITING',
      '16_SEO_AUDITING',
      '17_BROWSER_QA',
      '18_EVIDENCE_COLLECTION',
      '19_STRICT_INTEGRITY_AUDIT',
      '20_DEPLOYMENT',
      '21_POST_DEPLOY_VERIFY'
    ]),
    maxFilesAllowed: Infinity,
    requiresHumanSignoff: true
  })
});

/**
 * Classifier to automatically assess risk and assign the optimal governance tier.
 */
export class GovernanceTierClassifier {
  /**
   * Evaluates task context parameters to determine the appropriate governance tier.
   * @param {object} context
   * @param {string} context.description
   * @param {Array<string>} [context.targetFiles]
   * @param {boolean} [context.modifiesSecurityBoundary]
   * @param {boolean} [context.modifiesGovernanceSchema]
   * @param {boolean} [context.introducesNewDependencies]
   * @returns {Readonly<object>}
   */
  classify(context = {}) {
    const targetFiles = context.targetFiles || [];
    const filesCount = targetFiles.length;
    const isSecurityCritical = Boolean(context.modifiesSecurityBoundary);
    const isGovernanceCritical = Boolean(context.modifiesGovernanceSchema);
    const isDependencyCritical = Boolean(context.introducesNewDependencies);

    const touchesConstitutionOrRules = targetFiles.some(f => 
      f.includes('CONSTITUTION') || 
      f.includes('.agents/AGENTS.md') || 
      f.includes('authority-adapter') ||
      f.includes('.cursorrules')
    );

    // Tier 3 criteria: High stakes, security, architecture, governance changes
    if (isSecurityCritical || isGovernanceCritical || isDependencyCritical || touchesConstitutionOrRules || filesCount > 12) {
      const tierDef = GOVERNANCE_TIERS.TIER_3_CORE_MISSION;
      return Object.freeze({
        tier: tierDef.id,
        name: tierDef.name,
        stepsCount: tierDef.stepsCount,
        steps: [...tierDef.steps],
        requiresHumanSignoff: true,
        riskClassification: 'HIGH_STAKES_MISSION',
        reason: 'Modifies security boundary, governance rules, or exceeds multi-file complexity threshold.'
      });
    }

    // Tier 1 criteria: Small hotfixes, <= 3 files, strictly test + implementation
    const isHotfix = filesCount <= 3 && !targetFiles.some(f => f.includes('docs/specs') || f.includes('docs/architecture'));
    if (isHotfix && (context.description?.toLowerCase().includes('fix') || context.description?.toLowerCase().includes('patch') || context.description?.toLowerCase().includes('typo'))) {
      const tierDef = GOVERNANCE_TIERS.TIER_1_FAST_TRACK;
      return Object.freeze({
        tier: tierDef.id,
        name: tierDef.name,
        stepsCount: tierDef.stepsCount,
        steps: [...tierDef.steps],
        requiresHumanSignoff: false,
        riskClassification: 'LOW_RISK_FAST_TRACK',
        reason: 'Localized micro-patch or hotfix with minimal blast radius.'
      });
    }

    // Default: Tier 2 (Standard Feature)
    const tierDef = GOVERNANCE_TIERS.TIER_2_STANDARD_FEATURE;
    return Object.freeze({
      tier: tierDef.id,
      name: tierDef.name,
      stepsCount: tierDef.stepsCount,
      steps: [...tierDef.steps],
      requiresHumanSignoff: false,
      riskClassification: 'STANDARD_FEATURE_LIFECYCLE',
      reason: 'Standard module or component lifecycle with EARS spec and parallel audits.'
    });
  }
}

/**
 * State machine enforcing valid step progression within an assigned Governance Tier.
 */
export class GovernanceTierExecutor {
  /**
   * @param {'TIER_1_FAST_TRACK'|'TIER_2_STANDARD_FEATURE'|'TIER_3_CORE_MISSION'} tierId
   */
  constructor(tierId = 'TIER_2_STANDARD_FEATURE') {
    const tierDef = GOVERNANCE_TIERS[tierId];
    if (!tierDef) {
      throw new Error(`GOVERNANCE_FAULT: Unknown tier ID [${tierId}].`);
    }
    this.tierDef = tierDef;
    this.currentStepIndex = -1;
    this.currentStep = null;
    this.history = [];
  }

  /**
   * Transitions to the next step in the assigned tier DAG.
   * @param {string} stepName
   * @param {object} payload
   * @returns {object} Step transition result or cryptographic completion receipt
   */
  transition(stepName, payload = {}) {
    const expectedNextIndex = this.currentStepIndex + 1;
    const expectedStep = this.tierDef.steps[expectedNextIndex];

    if (stepName !== expectedStep) {
      throw new Error(`INVALID_TIER_TRANSITION: Attempted to transition to [${stepName}] but expected [${expectedStep}] at index ${expectedNextIndex} of ${this.tierDef.id}. Gate skip blocked.`);
    }

    this.currentStepIndex = expectedNextIndex;
    this.currentStep = stepName;
    const stepRecord = {
      step: stepName,
      timestamp: new Date().toISOString(),
      payload
    };
    this.history.push(stepRecord);

    if (this.isComplete()) {
      const summaryPayload = JSON.stringify({
        tier: this.tierDef.id,
        history: this.history
      });
      const receiptHash = crypto.createHash('sha256').update(summaryPayload).digest('hex');
      return {
        status: 'VERIFIED',
        tier: this.tierDef.id,
        receiptHash: `sha256-${receiptHash}`,
        stepsExecuted: this.history.length,
        completedAt: new Date().toISOString()
      };
    }

    return {
      status: 'IN_PROGRESS',
      step: stepName,
      stepIndex: this.currentStepIndex,
      totalSteps: this.tierDef.stepsCount
    };
  }

  isComplete() {
    return this.currentStepIndex === this.tierDef.stepsCount - 1;
  }
}
