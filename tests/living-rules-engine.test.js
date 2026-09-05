import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LivingRulesEngine } from '../src/core/rules/living-rules-engine.js';

test('LivingRulesEngine: audits rules directory, calculates token density and flags bloat', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-rules-test-'));
  const rulesDir = path.join(tmpDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Create a minimal EARS rule file
  fs.writeFileSync(
    path.join(rulesDir, '01-valid-ears.mdc'),
    '# Standard\n- CUANDO un evento ocurra, EL SISTEMA responderá de forma determinista.'
  );

  // Create a bloated non-EARS rule file (> 250 tokens / 1000 chars of prose)
  const verboseProse = '- In this section we will discuss the philosophical implications of software development without adhering to formal standards, which causes developers to wander aimlessly through infinite loops of unstructured coding sessions where nothing is clearly defined and everything is guessed. '.repeat(10);
  fs.writeFileSync(
    path.join(rulesDir, '02-bloated.mdc'),
    `# Verbose\n${verboseProse}`
  );

  const engine = new LivingRulesEngine({
    baseDir: tmpDir,
    maxTokensPerRule: 200
  });

  const audit = engine.auditRules({
    searchDirs: [rulesDir]
  });

  assert.equal(audit.auditedFilesCount, 2);
  assert.ok(audit.totalEstimatedTokens > 0);
  assert.ok(audit.bloatedRulesCount >= 1);
  assert.equal(audit.status, 'OPTIMIZATION_RECOMMENDED');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('LivingRulesEngine: distills atomic EARS rule from a security veto event', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-distill-test-'));
  const engine = new LivingRulesEngine({
    baseDir: tmpDir,
    rulesRegistryPath: path.join(tmpDir, 'docs', 'rules', 'LIVING_RULES_REGISTRY.json')
  });

  const vetoEvent = {
    source: 'VETO_REJECTED',
    desk: 'SecurityDesk',
    reason: 'Hardcoded secret detected: unhashed key found in config'
  };

  const livingRule = engine.distillRule(vetoEvent);

  assert.ok(livingRule.rule_id.startsWith('RULE-LIV-'));
  assert.equal(livingRule.title, 'Zero Plain Secrets Invariant');
  assert.ok(livingRule.statement.startsWith('SI '));
  assert.ok(livingRule.statement.includes('ENTONCES EL SISTEMA'));
  assert.equal(livingRule.ears_pattern, 'SI_ENTONCES');

  // Verify persistence
  const registry = engine._loadRegistry();
  assert.equal(registry.rules.length, 1);
  assert.equal(registry.rules[0].rule_id, livingRule.rule_id);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('LivingRulesEngine: distills atomic EARS rule from test failure event', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-distill-test-'));
  const engine = new LivingRulesEngine({ baseDir: tmpDir });

  const failureEvent = {
    source: 'TEST_FAILURE',
    context: 'assertion error in state-machine transition'
  };

  const livingRule = engine.distillRule(failureEvent);

  assert.ok(livingRule.rule_id.startsWith('RULE-LIV-'));
  assert.equal(livingRule.title, 'Continuous Test Verification Gate');
  assert.ok(livingRule.statement.startsWith('CUANDO '));
  assert.ok(livingRule.statement.includes('EL SISTEMA'));

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('LivingRulesEngine: exports minimal prompt context strictly bounded by token budget', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-prompt-test-'));
  const canonicalPath = path.join(tmpDir, 'CANONICAL_INDEX.json');

  const mockRules = {
    rules: [
      { rule_id: 'R-01', statement: 'Rule 1 statement for prompt inclusion.' },
      { rule_id: 'R-02', statement: 'Rule 2 statement for prompt inclusion.' },
      { rule_id: 'R-03', statement: 'Rule 3 statement for prompt inclusion.' }
    ]
  };
  fs.writeFileSync(canonicalPath, JSON.stringify(mockRules, null, 2));

  const engine = new LivingRulesEngine({
    baseDir: tmpDir,
    canonicalIndexPath: canonicalPath
  });

  const exportResult = engine.exportMinimalPromptContext({ maxTokens: 80 });

  assert.ok(exportResult.promptContext.includes('EOS MINIMAL LIVING RULES'));
  assert.ok(exportResult.tokenCount <= 80);
  assert.ok(exportResult.ruleCount >= 1);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
