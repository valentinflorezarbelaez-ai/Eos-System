import test from 'node:test';
import assert from 'node:assert/strict';
import { ValueInstrumentationEngine } from '../scripts/engine/value-instrumentation-engine.js';

// ====================================================
// WS-02: VALUE INSTRUMENTATION ENGINE TESTS
// ====================================================

const engine = new ValueInstrumentationEngine();

test('WS-02.1: Record observation with strict raw vs interpreted separation', () => {
  const record = engine.recordObservation({
    participantId: 'P001',
    variant: 'A',
    taskId: 'TASK-VERIFY-ORG',
    startedAt: '2026-08-14T10:00:00Z',
    completedAt: '2026-08-14T10:01:30Z',
    success: true,
    abandoned: false,
    trustScore: 9,
    comprehensionScore: 10,
    rawObservations: ['Clicked footer legal link', 'Read NIT number aloud'],
    interpretations: ['Participant verified legal entity without hesitation']
  });

  assert.equal(record.participantId, 'P001');
  assert.equal(record.durationMs, 90000);
  assert.equal(record.metrics.trustScore, 9);
  assert.equal(record.epistemicLayers.rawObservations.length, 2);
  assert.equal(record.epistemicLayers.interpretations.length, 1);
  assert.equal(record.epistemicLayers.rawObservations[0].type, 'RAW_OBSERVATION');
  assert.equal(record.epistemicLayers.interpretations[0].type, 'INTERPRETATION_DERIVED');
});

test('WS-02.2: Aggregate variant metrics accurately', () => {
  const records = [
    engine.recordObservation({ participantId: 'P1', variant: 'CONTROL', taskId: 'T1', success: true, abandoned: false, trustScore: 7 }),
    engine.recordObservation({ participantId: 'P2', variant: 'CONTROL', taskId: 'T1', success: false, abandoned: true, trustScore: 5 }),
    engine.recordObservation({ participantId: 'P3', variant: 'CONTROL', taskId: 'T1', success: true, abandoned: false, trustScore: 8 })
  ];

  const agg = engine.aggregateVariantMetrics(records, 'CONTROL');
  assert.equal(agg.sampleSize, 3);
  assert.equal(agg.completionRate, 0.6667);
  assert.equal(agg.dropoffRate, 0.3333);
  assert.equal(agg.meanTrustScore, 6.67);
});

test('WS-02.3: Calculate marginal causal deltas (ΔA, ΔB, ΔC)', () => {
  const aggregatedVariants = [
    { variant: 'CONTROL', completionRate: 0.74, dropoffRate: 0.26, meanTrustScore: 7.1 },
    { variant: 'A', completionRate: 0.85, dropoffRate: 0.15, meanTrustScore: 8.0 },
    { variant: 'B', completionRate: 0.91, dropoffRate: 0.09, meanTrustScore: 8.6 },
    { variant: 'C', completionRate: 0.96, dropoffRate: 0.04, meanTrustScore: 9.2 }
  ];

  const deltas = engine.calculateCausalDeltas(aggregatedVariants);

  // ΔA = A - Control
  assert.equal(deltas.deltaA_vs_Control.deltaTrust, 0.90);
  assert.equal(deltas.deltaA_vs_Control.deltaCompletionRate, 0.11);
  assert.equal(deltas.deltaA_vs_Control.deltaDropoffRate, -0.11);

  // ΔB = B - A
  assert.equal(deltas.deltaB_vs_A.deltaTrust, 0.60);
  assert.equal(deltas.deltaB_vs_A.deltaCompletionRate, 0.06);

  // ΔC = C - B
  assert.equal(deltas.deltaC_vs_B.deltaTrust, 0.60);
  assert.equal(deltas.deltaC_vs_B.deltaCompletionRate, 0.05);

  // Total C vs Control
  assert.equal(deltas.totalIntervention_C_vs_Control.deltaTrust, 2.10);
  assert.equal(deltas.totalIntervention_C_vs_Control.deltaCompletionRate, 0.22);
});

test('WS-02.4: Epistemic classification against immutable criteria (Trust >= 8.5, Completion >= 90%, Drop-off <= 10%)', () => {
  // CONFIRMED
  assert.equal(engine.classifyHypothesisVerdict({ sampleSize: 20, meanTrustScore: 8.7, completionRate: 0.92, dropoffRate: 0.08 }), 'CONFIRMED');

  // PARTIALLY_SUPPORTED
  assert.equal(engine.classifyHypothesisVerdict({ sampleSize: 20, meanTrustScore: 8.6, completionRate: 0.85, dropoffRate: 0.15 }), 'PARTIALLY_SUPPORTED');

  // REFUTED
  assert.equal(engine.classifyHypothesisVerdict({ sampleSize: 20, meanTrustScore: 6.5, completionRate: 0.70, dropoffRate: 0.30 }), 'REFUTED');

  // INCONCLUSIVE (low sample)
  assert.equal(engine.classifyHypothesisVerdict({ sampleSize: 3, meanTrustScore: 6.0, completionRate: 0.50, dropoffRate: 0.50 }), 'INCONCLUSIVE');
});
