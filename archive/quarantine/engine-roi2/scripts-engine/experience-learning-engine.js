import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ExperienceLearningEngine {
  constructor() {
    this.toolExperience = [];
    this.agentPerformance = [];
    this.failurePatterns = [];
  }

  recordToolExecution(record) {
    const {
      toolId,
      taskType,
      projectType,
      success,
      qualityScore = 8.0,
      latencyMs = 100,
      costUsd = 0.0,
      errorMessage = null,
      evidenceRef = null
    } = record;

    if (!toolId || !taskType) {
      throw new Error('INVALID_TOOL_EXPERIENCE: toolId and taskType are required');
    }

    const entry = {
      executionId: `EXP-TOOL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      toolId,
      taskType,
      projectType: projectType || 'GENERAL',
      success: Boolean(success),
      qualityScore: Number(qualityScore),
      latencyMs: Number(latencyMs),
      costUsd: Number(costUsd),
      errorMessage,
      evidenceRef,
      recordedAt: new Date().toISOString()
    };

    this.toolExperience.push(entry);

    // If execution failed, analyze for failure pattern
    if (!entry.success && errorMessage) {
      this.extractFailurePattern(toolId, taskType, errorMessage);
    }

    return entry;
  }

  recordAgentPerformance(record) {
    const {
      agentId,
      domain,
      taskType,
      accuracyScore = 9.0,
      executionSpeed = 'FAST',
      evidenceQuality = 'VERIFIED',
      success = true
    } = record;

    if (!agentId || !domain) {
      throw new Error('INVALID_AGENT_PERFORMANCE: agentId and domain are required');
    }

    const entry = {
      agentId,
      domain,
      taskType,
      accuracyScore: Number(accuracyScore),
      executionSpeed,
      evidenceQuality,
      success: Boolean(success),
      recordedAt: new Date().toISOString()
    };

    this.agentPerformance.push(entry);
    return entry;
  }

  extractFailurePattern(toolId, taskType, errorMessage) {
    const existing = this.failurePatterns.find(
      fp => fp.toolId === toolId && fp.taskType === taskType && fp.errorMessage === errorMessage
    );

    if (existing) {
      existing.occurrences += 1;
      existing.lastObserved = new Date().toISOString();
      if (existing.occurrences >= 3) {
        existing.status = 'CONFIRMED_LIMITATION';
      }
    } else {
      this.failurePatterns.push({
        patternId: `FAIL-PAT-${this.failurePatterns.length + 1}`,
        toolId,
        taskType,
        errorMessage,
        occurrences: 1,
        status: 'OBSERVED_INCIDENT',
        mitigationSuggestion: `Apply timeout guard or fallback to alternative tool for ${taskType}`,
        firstObserved: new Date().toISOString(),
        lastObserved: new Date().toISOString()
      });
    }
  }

  getEmpiricalToolScore(toolId, taskType) {
    const relevant = this.toolExperience.filter(
      e => e.toolId === toolId && (!taskType || e.taskType === taskType)
    );

    if (relevant.length === 0) {
      return {
        sampleSize: 0,
        successRate: null,
        avgQuality: null,
        avgLatencyMs: null,
        epistemicType: 'ASSUMPTION'
      };
    }

    const successCount = relevant.filter(e => e.success).length;
    const totalQuality = relevant.reduce((sum, e) => sum + e.qualityScore, 0);
    const totalLatency = relevant.reduce((sum, e) => sum + e.latencyMs, 0);

    return {
      sampleSize: relevant.length,
      successRate: Number((successCount / relevant.length).toFixed(2)),
      avgQuality: Number((totalQuality / relevant.length).toFixed(2)),
      avgLatencyMs: Number((totalLatency / relevant.length).toFixed(1)),
      epistemicType: 'EMPIRICAL'
    };
  }

  compareCandidates(toolAId, toolBId, taskType) {
    const statsA = this.getEmpiricalToolScore(toolAId, taskType);
    const statsB = this.getEmpiricalToolScore(toolBId, taskType);

    let winner = null;
    let rationale = '';

    if (statsA.sampleSize > 0 && statsB.sampleSize > 0) {
      if (statsA.successRate > statsB.successRate) {
        winner = toolAId;
        rationale = `Tool ${toolAId} has higher empirical success rate (${statsA.successRate * 100}% vs ${statsB.successRate * 100}%)`;
      } else if (statsB.successRate > statsA.successRate) {
        winner = toolBId;
        rationale = `Tool ${toolBId} has higher empirical success rate (${statsB.successRate * 100}% vs ${statsA.successRate * 100}%)`;
      } else {
        winner = statsA.avgLatencyMs < statsB.avgLatencyMs ? toolAId : toolBId;
        rationale = `Equal success rate; preferred based on lower latency (${winner === toolAId ? statsA.avgLatencyMs : statsB.avgLatencyMs}ms)`;
      }
    } else {
      winner = statsA.sampleSize > 0 ? toolAId : toolBId;
      rationale = 'Preferred based on presence of empirical execution evidence over unexecuted assumption';
    }

    return {
      taskType,
      candidateA: { toolId: toolAId, stats: statsA },
      candidateB: { toolId: toolBId, stats: statsB },
      recommendedTool: winner,
      decisionRationale: rationale
    };
  }
}
