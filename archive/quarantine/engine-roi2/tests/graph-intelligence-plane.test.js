import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphIntelligencePlane } from '../scripts/engine/graph-intelligence-plane.js';

// ====================================================
// EOS GRAPH INTELLIGENCE PROGRAM TESTS (G-01 to G-10)
// ====================================================

const graph = new GraphIntelligencePlane();

test('G-01 & G-10: Enforces Constitutional Block on Cross-Project Authority Edges', () => {
  graph.addNode('PRJ-A', 'PROJECT', { projectId: 'PRJ-A' });
  graph.addNode('PRJ-B', 'PROJECT', { projectId: 'PRJ-B' });
  graph.addNode('AUTH-A', 'AUTHORIZATION', { projectId: 'PRJ-A' });
  graph.addNode('AUTH-B', 'AUTHORIZATION', { projectId: 'PRJ-B' });

  // Adding valid within-project authority edge
  assert.doesNotThrow(() => graph.addEdge('PRJ-A', 'AUTH-A', 'GRANTS_AUTHORITY'));

  // Attempting cross-project authority edge must throw Constitutional Violation
  assert.throws(
    () => graph.addEdge('PRJ-A', 'AUTH-B', 'GRANTS_AUTHORITY'),
    /CONSTITUTIONAL_VIOLATION/
  );
});

test('G-02: Evidence Graph traces multi-hop provenance from Belief to Raw Source', () => {
  graph.addNode('SRC-001', 'RAW_SOURCE', { name: 'WCAG 2.2 AA Spec' });
  graph.addNode('EVD-001', 'EXECUTION_EVIDENCE', { score: 100 });
  graph.addNode('LES-001', 'LESSON', { text: 'Semantic landmarks reduce keyboard navigation cycles' });
  graph.addNode('BKM-001', 'BKM', { strategy: 'BKM-A11Y-LANDMARKS' });

  graph.addEdge('SRC-001', 'EVD-001', 'ORIGINATED_FROM');
  graph.addEdge('EVD-001', 'LES-001', 'SUPPORTED_BY');
  graph.addEdge('LES-001', 'BKM-001', 'DERIVED_FROM');

  const trace = graph.traceBeliefProvenance('BKM-001');
  assert.equal(trace.hopsCount, 4);
  assert.equal(trace.isRootedInRawSource, true);
  assert.equal(trace.provenanceChain[3].id, 'SRC-001');
});

test('G-03: Decision Graph retrieves supporting evidence, rejected alternatives and rollback target', () => {
  graph.addNode('DEC-101', 'DECISION', { summary: 'Adopt Playwright MCP for headless audit' });
  graph.addNode('EVD-BENCH-01', 'EVIDENCE', { benchmarkScore: 9.8 });
  graph.addNode('ALT-PUPPETEER', 'ALTERNATIVE', { reason: 'Higher memory overhead' });
  graph.addNode('TOL-PLAYWRIGHT', 'TOOL', { type: 'MCP' });
  graph.addNode('ROLLBACK-PLAN-A', 'ROLLBACK_TARGET', { fallback: 'TOL-AXE-CORE' });

  graph.addEdge('DEC-101', 'EVD-BENCH-01', 'BASED_ON');
  graph.addEdge('DEC-101', 'ALT-PUPPETEER', 'REJECTED_ALTERNATIVE');
  graph.addEdge('DEC-101', 'TOL-PLAYWRIGHT', 'SELECTED_TOOL');
  graph.addEdge('DEC-101', 'ROLLBACK-PLAN-A', 'REVERSIBLE_BY');

  const ctx = graph.getDecisionContext('DEC-101');
  assert.equal(ctx.supportingEvidence.length, 1);
  assert.equal(ctx.rejectedAlternatives.length, 1);
  assert.equal(ctx.selectedTool.id, 'TOL-PLAYWRIGHT');
  assert.equal(ctx.rollbackTarget.id, 'ROLLBACK-PLAN-A');
});

test('G-08: Blast Radius Analysis identifies all agents, tasks and projects affected by tool changes', () => {
  graph.addNode('TOL-CORE-SCRAPER', 'TOOL', {});
  graph.addNode('AGT-RESEARCH-01', 'AGENT', {});
  graph.addNode('TSK-EXTRACT-MARKET', 'TASK', {});
  graph.addNode('PRJ-LUXE', 'PROJECT', { projectId: 'PRJ-LUXE' });

  graph.addEdge('AGT-RESEARCH-01', 'TOL-CORE-SCRAPER', 'USES_TOOL');
  graph.addEdge('TSK-EXTRACT-MARKET', 'TOL-CORE-SCRAPER', 'USES_TOOL');
  graph.addEdge('TOL-CORE-SCRAPER', 'PRJ-LUXE', 'AFFECTS_PROJECT');

  const blast = graph.analyzeToolBlastRadius('TOL-CORE-SCRAPER');
  assert.equal(blast.affectedAgentsCount, 1);
  assert.equal(blast.affectedTasksCount, 1);
  assert.equal(blast.affectedProjectsCount, 1);
  assert.equal(blast.affectedProjects[0], 'PRJ-LUXE');
});

test('G-09: GraphRAG traverses relational path from UserSegment to BKM', () => {
  graph.addNode('SEG-MOBILE-USER', 'USER_SEGMENT', {});
  graph.addNode('JTBD-QUICK-PURCHASE', 'JTBD', {});
  graph.addNode('FEAT-ONE-TAP-CHECKOUT', 'FEATURE', {});
  graph.addNode('CAP-TOKENIZED-PAYMENT', 'CAPABILITY', {});
  graph.addNode('TOL-PAYMENT-GATEWAY', 'TOOL', {});
  graph.addNode('EXP-CHECKOUT-TEST', 'EXPERIMENT', {});
  graph.addNode('BKM-ONE-TAP-CONVERT', 'BKM', {});

  graph.addEdge('SEG-MOBILE-USER', 'JTBD-QUICK-PURCHASE', 'HAS_JOB');
  graph.addEdge('JTBD-QUICK-PURCHASE', 'FEAT-ONE-TAP-CHECKOUT', 'MOTIVATES');
  graph.addEdge('FEAT-ONE-TAP-CHECKOUT', 'CAP-TOKENIZED-PAYMENT', 'REQUIRES');
  graph.addEdge('CAP-TOKENIZED-PAYMENT', 'TOL-PAYMENT-GATEWAY', 'PROVIDED_BY');
  graph.addEdge('TOL-PAYMENT-GATEWAY', 'EXP-CHECKOUT-TEST', 'PROVEN_BY_EXPERIMENT');
  graph.addEdge('EXP-CHECKOUT-TEST', 'BKM-ONE-TAP-CONVERT', 'ESTABLISHED_BKM');

  const rag = graph.traverseGraphRagPath('SEG-MOBILE-USER');
  assert.equal(rag.pathLength, 6);
  assert.notEqual(rag.retrievedBkm, null);
  assert.equal(rag.retrievedBkm.node.id, 'BKM-ONE-TAP-CONVERT');
});

test('G-10: Graph Integrity Audit certifies graph health and flags zero violations', () => {
  const audit = graph.auditGraphIntegrity();
  assert.equal(audit.isHealthy, true);
  assert.equal(audit.orphanEvidenceCount, 0);
  assert.equal(audit.crossProjectAuthorityViolations, 0);
  assert.equal(audit.verdict, 'GRAPH_INTEGRITY_VERIFIED');
});
