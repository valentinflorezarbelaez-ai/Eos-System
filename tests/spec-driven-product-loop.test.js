import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OpenSpecLifecycleAdapter,
  CognitiveGraphSpecBridge,
  SddMcpMatcher,
  SpecDrivenProductLoopEngine
} from '../scripts/engine/spec-driven-product-loop.js';
import { createTddPhaseReceipt, TDD_PHASES } from '../src/core/sdd/tdd-evidence-receipt.js';

function fixtureReceipts(taskId) {
  return [
    createTddPhaseReceipt({
      phase: TDD_PHASES.RED,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 1,
      output: 'not ok'
    }),
    createTddPhaseReceipt({
      phase: TDD_PHASES.GREEN,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 0,
      output: 'ok 1'
    }),
    createTddPhaseReceipt({
      phase: TDD_PHASES.TRIANGULATE,
      task_id: taskId,
      command: `node --test tests/${taskId}.test.js`,
      exit_code: 0,
      output: 'ok 2'
    })
  ];
}

// ====================================================
// EOS SPEC-DRIVEN PRODUCT LOOP TESTS (SDD-01..12)
// ====================================================

const engine = new SpecDrivenProductLoopEngine();

test('SDD-02 & 03: /enrich-us and /new + /ff create structured change envelope and task list', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'Accessible checkout dialog', persona: 'Keyboard user' });

  assert.equal(enriched.status, 'ENRICHED');
  assert.ok(enriched.jtbd.includes('Accessible checkout dialog'));

  const change = adapter.executeNewAndFastForward('CHG-TEST-001', enriched);
  assert.equal(change.state, 'SPEC_FAST_FORWARDED');
  assert.equal(change.tasksList.length, 2);
  assert.ok(change.artifacts.specs.includes('core.spec.md'));
});

test('SDD-04: CognitiveGraphSpecBridge maps OpenSpec change to typed graph nodes and edges', () => {
  const bridge = new CognitiveGraphSpecBridge();
  const changeData = { context: { jtbd: 'Job to be done' } };
  const res = bridge.bridgeChangeToGraph('CHG-TEST-001', changeData);

  assert.equal(res.nodesCount, 5);
  assert.equal(res.edgesCount, 4);
  assert.equal(res.graphTombstonePreserved, true);
  assert.equal(res.verdict, 'OPENSPEC_BRIDGED_TO_COGNITIVE_GRAPH');
});

test('SDD-05b: /apply without TDD receipts cannot claim implementation complete', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'Button', persona: 'All' });
  adapter.executeNewAndFastForward('CHG-002-BARE', enriched);
  assert.throws(
    () => adapter.executeApply('CHG-002-BARE', 'TASK-01'),
    (err) => err.code === 'TDD_EVIDENCE_MISSING'
  );
});

test('SDD-05 & 06: /apply executes small tasks incrementally one at a time under TDD', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'Button', persona: 'All' });
  adapter.executeNewAndFastForward('CHG-002', enriched);

  const applied = adapter.executeApply('CHG-002', 'TASK-01', { tddReceipts: fixtureReceipts('TASK-01') });
  assert.equal(applied.task.status, 'IMPLEMENTED_WITH_TDD');
  assert.ok(applied.task.diffHash.length === 64);
  assert.equal(applied.verdict, 'TASK_APPLIED_INCREMENTALLY');
});

test('SDD-07 & 08: /verify and /adversarial-review validate spec compliance and red team checks', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'Nav', persona: 'All' });
  adapter.executeNewAndFastForward('CHG-003', enriched);
  adapter.executeApply('CHG-003', 'TASK-01', { tddReceipts: fixtureReceipts('TASK-01') });
  adapter.executeApply('CHG-003', 'TASK-02', { tddReceipts: fixtureReceipts('TASK-02') });

  const verify = adapter.executeVerify('CHG-003');
  assert.equal(verify.verified, true);
  assert.equal(verify.specComplianceScore, 10.0);

  const adv = adapter.executeAdversarialReview('CHG-003');
  assert.equal(adv.redTeamPassed, true);
  assert.equal(adv.securityVulnerabilities, 0);
  assert.equal(adv.verdict, 'ADVERSARIAL_REVIEW_PASSED');
  assert.equal(adv.stance, 'INFORMATIONAL');
  assert.equal(adv.authorizes_delivery, false);
});

test('SDD-09 & 10: /archive and /commit persist BKM into Engram and generate conventional commit', () => {
  const adapter = new OpenSpecLifecycleAdapter();
  const enriched = adapter.executeEnrichUs({ goal: 'Footer', persona: 'All' });
  adapter.executeNewAndFastForward('CHG-004', enriched);

  const archive = adapter.executeArchive('CHG-004');
  assert.equal(archive.persistedInEngram, true);
  assert.equal(archive.state, 'ARCHIVED');

  const commit = adapter.executeCommit('CHG-004');
  assert.ok(commit.commitMessage.startsWith('feat(checkout):'));
  assert.equal(commit.worktreePruneSafe, true);
  assert.equal(commit.verdict, 'COMMITTED_ATOMICALLY');
});

test('SDD-11: SddMcpMatcher binds appropriate MCPs to specific OpenSpec phases', () => {
  const matcher = new SddMcpMatcher();
  assert.equal(matcher.bindMcpToPhase('/enrich-us').mcp, 'jira-mcp');
  assert.equal(matcher.bindMcpToPhase('/verify').mcp, 'playwright-mcp');
  assert.equal(matcher.bindMcpToPhase('/apply').mcp, 'context7-mcp');
  assert.equal(matcher.bindMcpToPhase('/commit').mcp, 'github-mcp');
});

test('SDD-12: Executes full end-to-end Spec-Driven Product Loop (SDD-01 to SDD-12)', () => {
  const fullRun = engine.executeFullSddLoop('CHG-END-TO-END', {
    goal: 'Checkout Modal',
    persona: 'Keyboard User',
    explicitSddRequest: true,
    tddReceipts: fixtureReceipts('TASK-FULL')
  });

  assert.equal(fullRun.allStagesPassed, true);
  assert.equal(fullRun.tasksApplied.length, 2);
  assert.equal(fullRun.verification.verified, true);
  assert.equal(fullRun.adversarial.redTeamPassed, true);
  assert.equal(fullRun.archive.persistedInEngram, true);
  assert.equal(fullRun.verdict, 'EOS_SPEC_DRIVEN_PRODUCT_LOOP_001_COMPLETED');
});
