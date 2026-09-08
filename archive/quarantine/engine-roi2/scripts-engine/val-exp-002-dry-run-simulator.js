import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValueInstrumentationEngine } from './value-instrumentation-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ValExp002DryRunSimulator {
  constructor() {
    this.instrumentation = new ValueInstrumentationEngine();
    this.simulationMode = 'SYNTHETIC_DRY_RUN_ONLY';
  }

  generateSyntheticParticipants(count = 20) {
    const participants = [];
    for (let i = 1; i <= count; i++) {
      const id = `SYNTH-P${String(i).padStart(3, '0')}`;
      participants.push(id);
    }
    return participants;
  }

  simulateVariantExecution(variant, participantIds) {
    const records = [];

    participantIds.forEach(pId => {
      let trust = 7.0;
      let success = true;
      let abandoned = false;

      // Simulated distribution based on accumulated interventions
      if (variant === 'CONTROL') {
        trust = 6.5 + Math.random() * 1.2; // Mean ~7.1
        success = Math.random() < 0.74;     // ~74%
        abandoned = !success;
      } else if (variant === 'A') {
        trust = 7.5 + Math.random() * 1.0; // Mean ~8.0
        success = Math.random() < 0.85;     // ~85%
        abandoned = !success;
      } else if (variant === 'B') {
        trust = 8.1 + Math.random() * 1.0; // Mean ~8.6
        success = Math.random() < 0.91;     // ~91%
        abandoned = !success;
      } else if (variant === 'C') {
        trust = 8.8 + Math.random() * 0.8; // Mean ~9.2
        success = Math.random() < 0.96;     // ~96%
        abandoned = !success;
      }

      const record = this.instrumentation.recordObservation({
        participantId: pId,
        variant,
        taskId: 'TASK-INSTITUTIONAL-VERIFICATION',
        startedAt: '2026-08-14T12:00:00Z',
        completedAt: '2026-08-14T12:02:00Z',
        success,
        abandoned,
        trustScore: Number(trust.toFixed(1)),
        comprehensionScore: 9,
        rawObservations: [`Simulated raw observation for ${pId} in ${variant}`],
        interpretations: [`Synthetic interpretation`]
      });

      records.push(record);
    });

    return records;
  }

  runFullDryRunExperiment() {
    const participants = this.generateSyntheticParticipants(25);

    const controlRecords = this.simulateVariantExecution('CONTROL', participants);
    const varARecords = this.simulateVariantExecution('A', participants);
    const varBRecords = this.simulateVariantExecution('B', participants);
    const varCRecords = this.simulateVariantExecution('C', participants);

    const aggControl = this.instrumentation.aggregateVariantMetrics(controlRecords, 'CONTROL');
    const aggA = this.instrumentation.aggregateVariantMetrics(varARecords, 'A');
    const aggB = this.instrumentation.aggregateVariantMetrics(varBRecords, 'B');
    const aggC = this.instrumentation.aggregateVariantMetrics(varCRecords, 'C');

    const aggregated = [aggControl, aggA, aggB, aggC];
    const deltas = this.instrumentation.calculateCausalDeltas(aggregated);
    const finalVerdict = this.instrumentation.classifyHypothesisVerdict(aggC);

    return {
      simulationId: `SIM-VAL-EXP-002-${Date.now()}`,
      mode: this.simulationMode,
      governanceGuard: 'ZERO_REAL_EVIDENCE_PRODUCED',
      participantCount: participants.length,
      variantsAggregated: aggregated,
      causalDeltas: deltas,
      hypothesisVerdict: finalVerdict,
      independentAuditMock: {
        sourceValidity: 'SYNTHETIC_MOCK_VERIFIED',
        variantIsolation: 'VERIFIED_IN_MEMORY',
        postHocModificationDetected: false,
        readyForLiveExecutionWhenGap002Closed: true
      }
    };
  }
}
