import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiBkmCompositionEngine } from '../scripts/engine/multi-bkm-composition-engine.js';

test('H-01: Inventory Existing BKMs and Candidate Observations without fabricating artifacts', () => {
  const engine = new MultiBkmCompositionEngine();
  const inventory = engine.inventoryCandidateBkms();

  assert.equal(inventory.activeBkms.length, 1);
  assert.equal(inventory.activeBkms[0].bkm_id, 'BKM-CANARY-001');
  assert.equal(inventory.candidateObservations.length, 1);
  assert.equal(inventory.candidateObservations[0].observation_id, 'OBS-CANARY-002');
  assert.equal(inventory.compositionReadiness, 'READY_FOR_COMPOSITION_ANALYSIS');
});

test('H-02: Semantic Compatibility Matrix identifies COMPATIBLE vs CONFLICTING pairs', () => {
  const engine = new MultiBkmCompositionEngine();

  // Test Compatible pair (BKM-CANARY-001 + OBS-CANARY-002)
  const compat = engine.evaluateSemanticCompatibility('BKM-CANARY-001', 'OBS-CANARY-002');
  assert.equal(compat.relationship, 'COMPATIBLE');
  assert.equal(compat.interactionMode, 'AMPLIFIES');
  assert.equal(compat.policy, 'AUTHORIZED_FOR_SHADOW_COMPOSITION');

  // Test Conflicting pair with Negative BKM (BKM-CANARY-001 + NEG-BKM-001)
  const conflict = engine.evaluateSemanticCompatibility('BKM-CANARY-001', 'NEG-BKM-001');
  assert.equal(conflict.relationship, 'CONFLICTING');
  assert.equal(conflict.antiCompositionTriggered, true);
  assert.equal(conflict.policy, 'DO_NOT_COMPOSE');
});

test('H-05 & H-07: Shadow Composition Simulation computes Composition Delta and Interaction Effects', () => {
  const engine = new MultiBkmCompositionEngine();

  // 4-arm shadow experiment data:
  // Control = 48.0%
  // Arm A (Sanitization only) = 75.0%
  // Arm B (Accessible Feedback only) = 70.0%
  // Arm A+B (Composite) = 93.3%
  const shadow = engine.simulateShadowComposition({
    controlRate: 0.4800,
    armARate: 0.7500,
    armBRate: 0.7000,
    armABRate: 0.9333,
    armACost: 0.20,
    armBCost: 0.15,
    armABCost: 0.35
  });

  // Delta_comp = 0.9333 - max(0.75, 0.70) = +0.1833 (+18.33%)
  assert.equal(shadow.deltaComposition, 0.1833);
  // Interaction = 0.9333 - 0.75 - 0.70 + 0.48 = -0.0367
  assert.equal(shadow.interactionEffect, -0.0367);
  assert.equal(shadow.verdict, 'COMPOSITION_SUPPORTED');
  assert.equal(shadow.synergyDemonstrated, true);
});

test('H-08: Blast Radius Audit strictly blocks authority escalation and core modifications', () => {
  const engine = new MultiBkmCompositionEngine();
  const audit = engine.auditBlastRadius('BKM-CANARY-001', 'OBS-CANARY-002');

  assert.equal(audit.knowledgeTransferAllowed, true);
  assert.equal(audit.authorityEscalationDetected, false);
  assert.equal(audit.externalWriteAttempted, false);
  assert.equal(audit.coreState, 'FROZEN');
  assert.equal(audit.verdict, 'BLAST_RADIUS_CONTAINED_ZERO_AUTHORITY_ESCALATION');
});
