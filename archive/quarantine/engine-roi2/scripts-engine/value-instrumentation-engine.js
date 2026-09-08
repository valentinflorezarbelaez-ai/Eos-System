import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ValueInstrumentationEngine {
  constructor() {
    this.immutableTargets = {
      trustScore: 8.5,
      taskCompletionRate: 0.90,
      dropoffRate: 0.10
    };
  }

  recordObservation(observation) {
    const {
      participantId,
      variant,
      taskId,
      startedAt,
      completedAt,
      success,
      abandoned,
      trustScore,
      comprehensionScore,
      rawObservations = [],
      interpretations = []
    } = observation;

    if (!participantId || !variant || !taskId) {
      throw new Error('INVALID_OBSERVATION: participantId, variant, and taskId are strictly required');
    }

    const durationMs = (startedAt && completedAt) 
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime() 
      : 0;

    return {
      recordId: `REC-${participantId}-${variant}-${taskId}`,
      participantId,
      variant,
      taskId,
      startedAt,
      completedAt,
      durationMs,
      metrics: {
        success: Boolean(success),
        abandoned: Boolean(abandoned),
        trustScore: Number(trustScore) || 0,
        comprehensionScore: Number(comprehensionScore) || 0
      },
      epistemicLayers: {
        rawObservations: rawObservations.map(obs => ({
          type: 'RAW_OBSERVATION',
          timestamp: new Date().toISOString(),
          data: obs
        })),
        interpretations: interpretations.map(interp => ({
          type: 'INTERPRETATION_DERIVED',
          timestamp: new Date().toISOString(),
          data: interp
        }))
      }
    };
  }

  aggregateVariantMetrics(records, variant) {
    const variantRecords = records.filter(r => r.variant === variant);
    if (variantRecords.length === 0) {
      return {
        variant,
        sampleSize: 0,
        completionRate: 0,
        dropoffRate: 0,
        meanTrustScore: 0,
        meanComprehensionScore: 0,
        meanDurationMs: 0
      };
    }

    const n = variantRecords.length;
    const successes = variantRecords.filter(r => r.metrics.success).length;
    const abandonments = variantRecords.filter(r => r.metrics.abandoned).length;
    const totalTrust = variantRecords.reduce((acc, r) => acc + r.metrics.trustScore, 0);
    const totalComprehension = variantRecords.reduce((acc, r) => acc + r.metrics.comprehensionScore, 0);
    const totalDuration = variantRecords.reduce((acc, r) => acc + r.durationMs, 0);

    return {
      variant,
      sampleSize: n,
      completionRate: Number((successes / n).toFixed(4)),
      dropoffRate: Number((abandonments / n).toFixed(4)),
      meanTrustScore: Number((totalTrust / n).toFixed(2)),
      meanComprehensionScore: Number((totalComprehension / n).toFixed(2)),
      meanDurationMs: Math.round(totalDuration / n)
    };
  }

  calculateCausalDeltas(aggregatedVariants) {
    const control = aggregatedVariants.find(v => v.variant === 'CONTROL') || { completionRate: 0, dropoffRate: 0, meanTrustScore: 0 };
    const varA = aggregatedVariants.find(v => v.variant === 'A') || { completionRate: 0, dropoffRate: 0, meanTrustScore: 0 };
    const varB = aggregatedVariants.find(v => v.variant === 'B') || { completionRate: 0, dropoffRate: 0, meanTrustScore: 0 };
    const varC = aggregatedVariants.find(v => v.variant === 'C') || { completionRate: 0, dropoffRate: 0, meanTrustScore: 0 };

    return {
      deltaA_vs_Control: {
        description: 'Marginal effect of Verified Official Institutional Data',
        deltaTrust: Number((varA.meanTrustScore - control.meanTrustScore).toFixed(2)),
        deltaCompletionRate: Number((varA.completionRate - control.completionRate).toFixed(4)),
        deltaDropoffRate: Number((varA.dropoffRate - control.dropoffRate).toFixed(4))
      },
      deltaB_vs_A: {
        description: 'Marginal incremental effect of Accreditation Banner',
        deltaTrust: Number((varB.meanTrustScore - varA.meanTrustScore).toFixed(2)),
        deltaCompletionRate: Number((varB.completionRate - varA.completionRate).toFixed(4)),
        deltaDropoffRate: Number((varB.dropoffRate - varA.dropoffRate).toFixed(4))
      },
      deltaC_vs_B: {
        description: 'Marginal incremental effect of Public Transparency Document Center',
        deltaTrust: Number((varC.meanTrustScore - varB.meanTrustScore).toFixed(2)),
        deltaCompletionRate: Number((varC.completionRate - varB.completionRate).toFixed(4)),
        deltaDropoffRate: Number((varC.dropoffRate - varB.dropoffRate).toFixed(4))
      },
      totalIntervention_C_vs_Control: {
        description: 'Cumulative total effect across all 3 interventions',
        deltaTrust: Number((varC.meanTrustScore - control.meanTrustScore).toFixed(2)),
        deltaCompletionRate: Number((varC.completionRate - control.completionRate).toFixed(4)),
        deltaDropoffRate: Number((varC.dropoffRate - control.dropoffRate).toFixed(4))
      }
    };
  }

  classifyHypothesisVerdict(metrics) {
    const trustPassed = metrics.meanTrustScore >= this.immutableTargets.trustScore;
    const completionPassed = metrics.completionRate >= this.immutableTargets.taskCompletionRate;
    const dropoffPassed = metrics.dropoffRate <= this.immutableTargets.dropoffRate;

    if (trustPassed && completionPassed && dropoffPassed) {
      return 'CONFIRMED';
    }
    if (trustPassed || completionPassed) {
      return 'PARTIALLY_SUPPORTED';
    }
    if (metrics.sampleSize < 5) {
      return 'INCONCLUSIVE';
    }
    return 'REFUTED';
  }
}
