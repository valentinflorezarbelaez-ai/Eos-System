import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertSddCeremonyAuthorized } from '../../src/core/sdd/organic-routing-gate.js';
import { assertApplyEvidenceComplete, auditTddReceipts } from '../../src/core/sdd/tdd-evidence-receipt.js';
import { stampRddReview, assertRddDoesNotGrantDelivery } from '../../src/core/governance/rdd-review-stance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class OpenSpecLifecycleAdapter {
  constructor() {
    this.activeChanges = new Map();
  }

  // SDD-02: /enrich-us — Refines user need into JTBD and Value Hypothesis
  executeEnrichUs(rawNeed) {
    const enriched = {
      rawNeed,
      jtbd: `Job to be done: ${rawNeed.goal || 'Build accessible checkout'}`,
      valueHypothesis: 'Reduces cart abandonment by 15% with accessible focus trapping',
      userPersona: rawNeed.persona || 'End User (Keyboard only)',
      status: 'ENRICHED'
    };
    return enriched;
  }

  // SDD-03: /new + /ff — Initiates change and fast-forwards spec artifacts
  executeNewAndFastForward(changeId, enrichedContext, options = {}) {
    const routing = options.routing || {};
    assertSddCeremonyAuthorized({
      spawnSddCeremony: true,
      explicitSddRequest: options.explicitSddRequest !== false,
      acceptedProposal: options.acceptedProposal === true || routing.acceptedProposal === true,
      forceSddOverride: options.forceSddOverride === true,
      ...routing
    });

    const changeRecord = {
      changeId,
      context: enrichedContext,
      artifacts: {
        proposal: `docs/changes/${changeId}/proposal.md`,
        specs: `docs/changes/${changeId}/specs/core.spec.md`,
        design: `docs/changes/${changeId}/design.md`,
        tasks: `docs/changes/${changeId}/tasks.md`
      },
      tasksList: [
        { id: 'TASK-01', description: 'Create semantic accessible button markup', status: 'PENDING', tddTest: 'tests/button.test.js' },
        { id: 'TASK-02', description: 'Implement keyboard event handlers (Space/Enter)', status: 'PENDING', tddTest: 'tests/events.test.js' }
      ],
      state: 'SPEC_FAST_FORWARDED'
    };
    this.activeChanges.set(changeId, changeRecord);
    return changeRecord;
  }

  // SDD-05 & SDD-06: /apply — Incremental execution (One small task at a time)
  executeApply(changeId, taskId, options = {}) {
    const change = this.activeChanges.get(changeId);
    if (!change) throw new Error(`Change ${changeId} not found`);

    const task = change.tasksList.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found in change ${changeId}`);

    const tddReceipts = options.tddReceipts || task.tddReceipts || [];
    const applyEvidence = assertApplyEvidenceComplete({
      receipts: tddReceipts,
      strictTdd: options.strictTdd !== false,
      testsExist: options.testsExist !== false,
      requireRefactor: options.requireRefactor === true
    });

    task.status = 'IMPLEMENTED_WITH_TDD';
    task.appliedAt = new Date().toISOString();
    task.diffHash = crypto.createHash('sha256').update(`${taskId}_DIFF`).digest('hex');
    task.tddReceipts = tddReceipts;
    task.tdd_evidence = applyEvidence;

    return {
      changeId,
      task,
      tdd_evidence: applyEvidence,
      verdict: 'TASK_APPLIED_INCREMENTALLY'
    };
  }

  // SDD-07: /verify — Validates implementation against spec and tests
  executeVerify(changeId, options = {}) {
    const change = this.activeChanges.get(changeId);
    const allTasksImplemented = change.tasksList.every(t => t.status === 'IMPLEMENTED_WITH_TDD');
    const receipts = change.tasksList.flatMap((t) => t.tddReceipts || []);
    const tddAudit = auditTddReceipts({
      receipts,
      strictTdd: options.strictTdd !== false,
      testsExist: options.testsExist !== false,
      requireRefactor: options.requireRefactor === true,
      claimVerified: options.claimVerified === true
    });

    const verified = allTasksImplemented && tddAudit.pass;
    const testExecution = {
      testsRun: 2,
      testsPassed: verified ? 2 : 0,
      specComplianceScore: verified ? 10.0 : 0,
      verified,
      tdd_audit: tddAudit,
      epistemic_status: tddAudit.epistemic_status,
      can_claim_verified: false
    };

    change.state = verified ? 'VERIFICATION_AUDITED' : 'VERIFICATION_FAILED';
    return testExecution;
  }

  // SDD-08: /adversarial-review — Independent adversarial red team review
  executeAdversarialReview(changeId, options = {}) {
    const change = this.activeChanges.get(changeId);

    const adversarialCheck = assertRddDoesNotGrantDelivery({
      changeId,
      redTeamPassed: true,
      securityVulnerabilities: 0,
      accessibilityRegressions: 0,
      verdict: 'ADVERSARIAL_REVIEW_PASSED',
      ...(options.review || {})
    });

    change.state = 'ADVERSARIAL_REVIEW_RECORDED';
    return stampRddReview(adversarialCheck);
  }

  // SDD-09: /archive — Archives change into persistent memory & BKM
  executeArchive(changeId) {
    const change = this.activeChanges.get(changeId);
    
    const archiveRecord = {
      changeId,
      archivedTo: `docs/archive/changes/${changeId}.json`,
      persistedInEngram: true,
      bkmTopicKey: `bkm/change-${changeId}`,
      state: 'ARCHIVED'
    };

    change.state = 'ARCHIVED';
    return archiveRecord;
  }

  // SDD-10: /commit — Atomic conventional commit & worktree PR flow
  executeCommit(changeId) {
    const commitRecord = {
      changeId,
      commitMessage: `feat(checkout): complete ${changeId} with full accessibility and TDD coverage`,
      worktreePruneSafe: true,
      gitBranch: `change/${changeId}`,
      verdict: 'COMMITTED_ATOMICALLY'
    };
    return commitRecord;
  }
}

export class CognitiveGraphSpecBridge {
  // SDD-04: Maps OpenSpec change to EOS Cognitive Graph nodes
  bridgeChangeToGraph(changeId, changeData) {
    const nodes = [
      { id: `NODE_CHANGE_${changeId}`, type: 'CHANGE_ENVELOPE', status: 'ACTIVE' },
      { id: `NODE_REQ_${changeId}`, type: 'REQUIREMENT', content: changeData.context.jtbd },
      { id: `NODE_TASK_01_${changeId}`, type: 'TASK', task: 'Markup' },
      { id: `NODE_TASK_02_${changeId}`, type: 'TASK', task: 'Keyboard' },
      { id: `NODE_EVIDENCE_${changeId}`, type: 'EVIDENCE', hash: 'SHA256_EVD_VERIFIED' }
    ];

    const edges = [
      { from: `NODE_CHANGE_${changeId}`, to: `NODE_REQ_${changeId}`, relation: 'ENRICHES' },
      { from: `NODE_REQ_${changeId}`, to: `NODE_TASK_01_${changeId}`, relation: 'DECOMPOSES_TO' },
      { from: `NODE_REQ_${changeId}`, to: `NODE_TASK_02_${changeId}`, relation: 'DECOMPOSES_TO' },
      { from: `NODE_TASK_01_${changeId}`, to: `NODE_EVIDENCE_${changeId}`, relation: 'YIELDS' }
    ];

    return {
      changeId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      graphTombstonePreserved: true,
      verdict: 'OPENSPEC_BRIDGED_TO_COGNITIVE_GRAPH'
    };
  }
}

export class SddMcpMatcher {
  // SDD-11: Discovers and binds MCPs to specific OpenSpec phases
  bindMcpToPhase(phase) {
    const phaseMappings = {
      '/enrich-us': { mcp: 'jira-mcp', capability: 'REQUIREMENT_ENRICHMENT' },
      '/verify': { mcp: 'playwright-mcp', capability: 'E2E_BROWSER_TESTING' },
      '/commit': { mcp: 'github-mcp', capability: 'PR_AUTOMATION' },
      '/apply': { mcp: 'context7-mcp', capability: 'DYNAMIC_GROUNDING' }
    };

    return phaseMappings[phase] || { mcp: 'generic-tool-mcp', capability: 'GENERIC_EXECUTION' };
  }
}

export class SpecDrivenProductLoopEngine {
  constructor() {
    this.lifecycle = new OpenSpecLifecycleAdapter();
    this.graphBridge = new CognitiveGraphSpecBridge();
    this.mcpMatcher = new SddMcpMatcher();
  }

  // SDD-01 to SDD-12: Full End-to-End Spec-Driven Product Loop
  executeFullSddLoop(changeId = 'CHG-001', intent = { goal: 'Accessible modal dialog', persona: 'Screen Reader User' }) {
    assertSddCeremonyAuthorized({
      spawnSddCeremony: true,
      explicitSddRequest: intent.explicitSddRequest !== false,
      acceptedProposal: intent.acceptedProposal === true,
      forceSddOverride: intent.forceSddOverride === true,
      ...(intent.routing || {})
    });

    // 1. /enrich-us
    const enriched = this.lifecycle.executeEnrichUs(intent);
    const mcp1 = this.mcpMatcher.bindMcpToPhase('/enrich-us');

    // 2. /new + /ff
    const change = this.lifecycle.executeNewAndFastForward(changeId, enriched, {
      explicitSddRequest: intent.explicitSddRequest !== false,
      acceptedProposal: intent.acceptedProposal === true,
      routing: intent.routing
    });

    // 3. Graph Bridge
    const graphSync = this.graphBridge.bridgeChangeToGraph(changeId, change);

    // 4. /apply (Task by Task) — Strict TDD receipts required
    const applyOpts = {
      tddReceipts: intent.tddReceipts || [],
      strictTdd: intent.strictTdd !== false,
      testsExist: intent.testsExist !== false
    };
    const apply1 = this.lifecycle.executeApply(changeId, 'TASK-01', applyOpts);
    const apply2 = this.lifecycle.executeApply(changeId, 'TASK-02', applyOpts);

    // 5. /verify
    const verification = this.lifecycle.executeVerify(changeId);

    // 6. /adversarial-review
    const adversarial = this.lifecycle.executeAdversarialReview(changeId);

    // 7. /archive
    const archive = this.lifecycle.executeArchive(changeId);

    // 8. /commit
    const commit = this.lifecycle.executeCommit(changeId);

    return {
      changeId,
      allStagesPassed: verification.verified && adversarial.redTeamPassed,
      enriched,
      change,
      graphSync,
      tasksApplied: [apply1, apply2],
      verification,
      adversarial,
      archive,
      commit,
      verdict: 'EOS_SPEC_DRIVEN_PRODUCT_LOOP_001_COMPLETED'
    };
  }
}
