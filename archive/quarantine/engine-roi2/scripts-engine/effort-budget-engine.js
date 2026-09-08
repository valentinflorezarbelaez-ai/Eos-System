import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class EffortBudgetEngine {
  constructor() {
    this.archetypes = {
      TRIVIAL_FIX: {
        agentCount: 1,
        researchDepth: 'MINIMAL_LOOKUP',
        testingRigor: 'UNIT_ASSERTION_ONLY',
        parallelismAllowed: false,
        evidenceRequired: 'LOCAL_TEST_PASS',
        maxExecutionCycles: 5
      },
      STANDARD_LANDING_PAGE: {
        agentCount: 3,
        researchDepth: 'JTBD_AND_COMPETITORS',
        testingRigor: 'ACCESSIBILITY_PERFORMANCE_BROWSER_QA',
        parallelismAllowed: true,
        evidenceRequired: 'FORENSIC_USER_AND_A11Y_EVIDENCE',
        maxExecutionCycles: 25
      },
      COMPLEX_SAAS_ENTERPRISE: {
        agentCount: 6,
        researchDepth: 'DEEP_ARCHITECTURE_THREAT_MODEL_MULTI_SOURCE',
        testingRigor: 'ADVERSARIAL_CHAOS_STABILITY_100_CYCLES',
        parallelismAllowed: true,
        evidenceRequired: 'MULTI_DIMENSIONAL_AUDITED_PACKAGE',
        maxExecutionCycles: 100
      }
    };
  }

  calculateEffortBudget(projectProfile) {
    const {
      complexity = 'MEDIUM', // 'LOW' | 'MEDIUM' | 'HIGH'
      risk = 'LOW', // 'LOW' | 'MEDIUM' | 'CRITICAL'
      userImpact = 'MODERATE', // 'LOW' | 'HIGH'
      uncertainty = 'LOW', // 'LOW' | 'HIGH'
      reversibility = 'HIGH' // 'HIGH' | 'LOW'
    } = projectProfile;

    let selectedArchetypeKey = 'STANDARD_LANDING_PAGE';

    if (complexity === 'LOW' && risk === 'LOW' && uncertainty === 'LOW') {
      selectedArchetypeKey = 'TRIVIAL_FIX';
    } else if (complexity === 'HIGH' || risk === 'CRITICAL' || uncertainty === 'HIGH' || reversibility === 'LOW') {
      selectedArchetypeKey = 'COMPLEX_SAAS_ENTERPRISE';
    }

    const budget = this.archetypes[selectedArchetypeKey];

    return {
      profileEvaluated: projectProfile,
      archetypeSelected: selectedArchetypeKey,
      budgetAllocated: budget,
      antiOverEngineeringGuard: selectedArchetypeKey === 'TRIVIAL_FIX' ? 'BLOCKED_SPAWNING_EXCESSIVE_AGENTS' : 'UNRESTRICTED',
      antiUnderEngineeringGuard: selectedArchetypeKey === 'COMPLEX_SAAS_ENTERPRISE' ? 'MANDATORY_ADVERSARIAL_AUDIT' : 'STANDARD'
    };
  }

  // Section 58 Cost Governance: 5-dimensional operational budget allocator
  allocateOperationalBudget(spec = {}) {
    return {
      tokenBudget: spec.tokenBudget || 50000,
      timeBudgetMs: spec.timeBudgetMs || 30000,
      costBudgetUsd: spec.costBudgetUsd !== undefined ? spec.costBudgetUsd : 0.50,
      retryBudget: spec.retryBudget !== undefined ? spec.retryBudget : 3,
      agentBudget: spec.agentBudget || 3
    };
  }

  // Section 58 & B-07: Operational Budget Exhaustion & Enforcement Guard
  evaluateBudgetState(allocated, consumed = {}) {
    const exhaustedDimensions = [];

    if ((consumed.tokensUsed || 0) > allocated.tokenBudget) {
      exhaustedDimensions.push({ dimension: 'TOKEN_BUDGET', allocated: allocated.tokenBudget, consumed: consumed.tokensUsed });
    }
    if ((consumed.timeElapsedMs || 0) > allocated.timeBudgetMs) {
      exhaustedDimensions.push({ dimension: 'TIME_BUDGET', allocated: allocated.timeBudgetMs, consumed: consumed.timeElapsedMs });
    }
    if ((consumed.costUsd || 0) > allocated.costBudgetUsd) {
      exhaustedDimensions.push({ dimension: 'COST_BUDGET', allocated: allocated.costBudgetUsd, consumed: consumed.costUsd });
    }
    if ((consumed.retriesAttempted || 0) > allocated.retryBudget) {
      exhaustedDimensions.push({ dimension: 'RETRY_BUDGET', allocated: allocated.retryBudget, consumed: consumed.retriesAttempted });
    }
    if ((consumed.agentsSpawned || 0) > allocated.agentBudget) {
      exhaustedDimensions.push({ dimension: 'AGENT_BUDGET', allocated: allocated.agentBudget, consumed: consumed.agentsSpawned });
    }

    if (exhaustedDimensions.length > 0) {
      return {
        status: 'BUDGET_EXHAUSTED',
        action: 'HARD_STOP_PRESERVE_EVIDENCE',
        privilegeEscalationAllowed: false,
        uncontrolledRetriesBlocked: true,
        exhaustedDimensions,
        verdict: 'OPERATION_HALTED_ON_BUDGET_LIMIT'
      };
    }

    return {
      status: 'WITHIN_BUDGET',
      action: 'CONTINUE',
      privilegeEscalationAllowed: false,
      uncontrolledRetriesBlocked: false,
      exhaustedDimensions: [],
      verdict: 'OPERATION_PERMITTED'
    };
  }
}
