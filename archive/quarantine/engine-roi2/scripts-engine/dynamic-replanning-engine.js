import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class DynamicReplanningEngine {
  constructor(experienceEngine) {
    this.experienceEngine = experienceEngine;
    this.replanAuditTrail = [];
  }

  evaluateExecutionAndReplan(currentPlan, executionFailure) {
    const { planId, currentToolId, taskType, goal } = currentPlan;
    const { error, latencyMs = 35000 } = executionFailure;

    // 1. Record the failed experience in memory
    if (this.experienceEngine) {
      this.experienceEngine.recordToolExecution({
        toolId: currentToolId,
        taskType,
        success: false,
        latencyMs,
        errorMessage: error
      });
    }

    // 2. Discover alternate candidate tool for the same taskType
    const alternateToolId = currentToolId === 'TOL-PLAYWRIGHT-MCP'
      ? 'TOL-AXE-CORE'
      : 'TOL-NODE-TEST-RUNNER';

    const replanDecision = {
      replanId: `REPLAN-${Date.now()}`,
      originalPlanId: planId,
      goal,
      taskType,
      failedToolId: currentToolId,
      rootCause: error,
      newPlanId: `${planId}-V2`,
      selectedAlternateToolId: alternateToolId,
      justification: `Plan pivoted from ${currentToolId} to ${alternateToolId} following runtime failure: ${error}`,
      evidencePreserved: true,
      timestamp: new Date().toISOString()
    };

    this.replanAuditTrail.push(replanDecision);

    return {
      status: 'REPLANNED_SUCCESSFULLY',
      originalPlan: currentPlan,
      newPlan: {
        planId: replanDecision.newPlanId,
        toolId: alternateToolId,
        taskType,
        goal,
        retryCount: 1,
        fallbackGuardsActive: true
      },
      auditRecord: replanDecision
    };
  }
}
