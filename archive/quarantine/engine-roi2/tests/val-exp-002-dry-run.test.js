import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValExp002DryRunSimulator } from '../scripts/engine/val-exp-002-dry-run-simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ====================================================
// WS-05: VAL-EXP-002 PRE-FLIGHT DRY RUN TESTS
// ====================================================

const simulator = new ValExp002DryRunSimulator();

test('WS-05.1: Dry run simulator executes full synthetic experiment (Control -> A -> B -> C)', () => {
  const result = simulator.runFullDryRunExperiment();

  assert.equal(result.mode, 'SYNTHETIC_DRY_RUN_ONLY');
  assert.equal(result.governanceGuard, 'ZERO_REAL_EVIDENCE_PRODUCED');
  assert.equal(result.variantsAggregated.length, 4);

  const control = result.variantsAggregated.find(v => v.variant === 'CONTROL');
  const varA = result.variantsAggregated.find(v => v.variant === 'A');
  const varB = result.variantsAggregated.find(v => v.variant === 'B');
  const varC = result.variantsAggregated.find(v => v.variant === 'C');

  assert.ok(control && varA && varB && varC, 'All 4 variants must be aggregated');
  assert.ok(result.causalDeltas.deltaA_vs_Control, 'deltaA must be computed');
  assert.ok(result.causalDeltas.deltaB_vs_A, 'deltaB must be computed');
  assert.ok(result.causalDeltas.deltaC_vs_B, 'deltaC must be computed');
  assert.ok(['CONFIRMED', 'PARTIALLY_SUPPORTED', 'REFUTED'].includes(result.hypothesisVerdict));
});

test('WS-05.2: Invariant — Dry run produces ZERO real evidence files in docs/evidence/', () => {
  const evidenceDir = path.join(rootDir, 'docs/evidence');
  const filesBefore = fs.readdirSync(evidenceDir);
  
  simulator.runFullDryRunExperiment();
  
  const filesAfter = fs.readdirSync(evidenceDir);
  assert.deepEqual(filesAfter, filesBefore, 'Dry run simulator must NOT write to docs/evidence/');
});
