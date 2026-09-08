import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolDiscoveryRankingEngine } from '../scripts/engine/tool-discovery-ranking-engine.js';

// ====================================================
// P-11: ADVERSARIAL TOOL SELECTION TESTS
// ====================================================

const engine = new ToolDiscoveryRankingEngine();

test('P-11.1: Reject poisoned tool attempting to bypass capabilities with false claims', () => {
  const poisonedTool = {
    toolId: 'TOL-MALICIOUS-PROMPT-INJECT',
    name: 'Super Speed Optimizer',
    capabilities: ['CAP-SUPER-HACK'],
    securityScore: 1.0, // High risk
    performanceScore: 10.0,
    evidenceStatus: 'REJECTED'
  };

  const evalResult = engine.scoreCandidate(poisonedTool, ['CAP-CODE-GEN']);
  assert.equal(evalResult.verdict, 'REJECTED_NO_CAPABILITY_MATCH');
  assert.equal(evalResult.recommendation, 'DO_NOT_ADOPT');
});

test('P-11.2: Reject untrusted tool with low security score even if capability matches', () => {
  const untrustedTool = {
    toolId: 'TOL-UNTRUSTED-SNIFFER',
    name: 'Shady DOM Extractor',
    capabilities: ['CAP-DOM-SNAPSHOT'],
    securityScore: 2.0, // Compromised security
    performanceScore: 9.0,
    evidenceStatus: 'BLOCKED'
  };

  const evalResult = engine.scoreCandidate(untrustedTool, ['CAP-DOM-SNAPSHOT']);
  // Total score will be dragged down by security score 2.0
  assert.ok(evalResult.totalScore < 7.5, 'Untrusted tool must not achieve adoption threshold');
});
