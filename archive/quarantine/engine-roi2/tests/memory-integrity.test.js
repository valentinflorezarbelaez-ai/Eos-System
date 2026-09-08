import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryIntegrityEngine } from '../scripts/engine/memory-integrity-engine.js';

// ====================================================
// MEMORY INTEGRITY & ANTI-CORRUPTION TESTS
// ====================================================

const engine = new MemoryIntegrityEngine();

test('MemoryIntegrityEngine records experience with cryptographic provenance hash', () => {
  const entry = {
    sourceExecutionId: 'EXEC-TEST-001',
    taskClass: 'WCAG_AUDIT',
    toolId: 'TOL-AXE-CORE',
    success: true,
    latencyMs: 140,
    evidenceRef: 'EVD-AXE-001'
  };

  const record = engine.recordProvenanceEntry(entry);
  assert.ok(record.recordId.startsWith('MEM-EXP-'));
  assert.ok(record.integrityHash.startsWith('sha256:'));
  assert.equal(engine.memoryLayers.EXPERIENCE.length, 1);
});

test('MemoryIntegrityEngine computes temporal memory decay correctly', () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));

  const weightToday = engine.calculateDecayWeight(today.toISOString(), today);
  const weight30Days = engine.calculateDecayWeight(thirtyDaysAgo.toISOString(), today);
  const weight60Days = engine.calculateDecayWeight(sixtyDaysAgo.toISOString(), today);

  assert.equal(weightToday, 1.0);
  assert.equal(weight30Days, 0.5); // 1 half-life
  assert.equal(weight60Days, 0.25); // 2 half-lives
});

test('MemoryIntegrityEngine audits memory health and validates zero corruption', () => {
  const audit = engine.auditMemoryHealth();
  assert.equal(audit.healthStatus, 'INTEGRITY_VERIFIED_ZERO_CORRUPTION');
  assert.equal(audit.tamperProofHashesChecked, true);
});
