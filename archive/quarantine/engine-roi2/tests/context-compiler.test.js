import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ContextCompiler } from '../scripts/engine/context-compiler.js';

test('CC-01: Compiles canonical structured context with header, constraints and scope', () => {
  const input = {
    mission: { id: 'MIS-001', type: 'AUDIT', goal: 'Verify P0.1 runtime contracts' },
    project: { id: 'PRJ-EOS', rootPath: '.', activeScope: ['scripts/engine', 'tests'] },
    contract: { autonomyLevel: 'LEVEL_1', maxBudgetTokens: 4000 },
    constraints: ['No production writes', 'Strict evidence requirement'],
    instructions: ['Execute unit tests first']
  };

  const receipt = ContextCompiler.compileMissionContext(input);
  assert.equal(receipt.schemaVersion, '1.1.0');
  assert.equal(receipt.missionId, 'MIS-001');
  assert.equal(receipt.authority.token, 'A1');
  assert.ok(receipt.sectionsIncluded.includes('HEADER'));
  assert.ok(receipt.sectionsIncluded.includes('CONSTRAINTS'));
  assert.ok(receipt.compiledPrompt.includes('No production writes'));
  assert.ok(receipt.sha256.length === 64);
});

test('CC-02: Progressive disclosure includes ADRs and receipts within budget', () => {
  const input = {
    mission: { id: 'MIS-002', type: 'IMPLEMENTATION', goal: 'Implement Context Compiler' },
    project: { id: 'PRJ-EOS', rootPath: '.', activeScope: ['scripts/engine'] },
    contract: { autonomyLevel: 'LEVEL_2', maxBudgetTokens: 4000 },
    decisions: [{ id: 'ADR-001', title: 'Use JSONL for ledger' }],
    evidence: [{ id: 'EVD-001', type: 'RECEIPT', status: 'VERIFIED' }]
  };

  const receipt = ContextCompiler.compileMissionContext(input);
  assert.ok(receipt.sectionsIncluded.includes('DECISIONS'));
  assert.ok(receipt.sectionsIncluded.includes('EVIDENCE'));
  assert.ok(receipt.tokenBudget.usedTokens > 0);
  assert.ok(receipt.tokenBudget.remainingTokens >= 0);
});

test('CC-03: Omits low-priority artifacts when token budget is constrained', () => {
  const input = {
    mission: { id: 'MIS-003', type: 'COMPACT', goal: 'Test compact budget' },
    project: { id: 'PRJ-EOS', rootPath: '.', activeScope: [] },
    contract: { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 60 },
    repository: { inventorySummary: 'A'.repeat(800) },
    decisions: [{ id: 'ADR-001', title: 'ADR Title' }]
  };

  const receipt = ContextCompiler.compileMissionContext(input);
  assert.ok(!receipt.sectionsIncluded.includes('REPOSITORY'));
  assert.equal(receipt.epistemicStatus, 'PARTIALLY_VERIFIED');
});

test('CC-04: Shorthand compileContext adapter maintains backward compatibility', () => {
  const receipt = ContextCompiler.compileContext('MIS-LEGACY-001', 'NODE-01', 3000);
  assert.equal(receipt.missionId, 'MIS-LEGACY-001');
  assert.equal(receipt.authority.token, 'A1');
  assert.ok(receipt.compiledPrompt.includes('Execute node NODE-01'));
});

test('CC-05: Receipt hash matches SHA-256 of compiled prompt', () => {
  const input = {
    mission: { id: 'MIS-005', type: 'HASH_CHECK', goal: 'Verify hash integrity' },
    contract: { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 2000 }
  };

  const receipt = ContextCompiler.compileMissionContext(input);
  const expectedHash = crypto.createHash('sha256').update(receipt.compiledPrompt).digest('hex');
  assert.equal(receipt.sha256, expectedHash);
});

test('CC-06: Explicit adapter normalizes legacy repoContext and evidenceContext objects', () => {
  const legacyInput = {
    mission: { id: 'MIS-006', type: 'ADAPTER_TEST', goal: 'Test legacy aliases' },
    contract: { autonomyLevel: 'LEVEL_1', maxBudgetTokens: 4000 },
    repoContext: { inventorySummary: 'Legacy repo summary' },
    evidenceContext: { verifiedReceipts: ['EVD-LEGACY-001'] }
  };

  const receipt = ContextCompiler.compileMissionContext(legacyInput);
  assert.ok(receipt.sectionsIncluded.includes('REPOSITORY'));
  assert.ok(receipt.sectionsIncluded.includes('EVIDENCE'));
  assert.ok(receipt.compiledPrompt.includes('Legacy repo summary'));
  assert.ok(receipt.compiledPrompt.includes('EVD-LEGACY-001'));
});
