import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolDiscoveryRankingEngine } from '../scripts/engine/tool-discovery-ranking-engine.js';

// ====================================================
// TOOL DISCOVERY & RANKING ENGINE TESTS
// ====================================================

const engine = new ToolDiscoveryRankingEngine();

test('ToolDiscoveryRankingEngine ranks candidates based on capability fit and multi-dimensional scores', () => {
  const candidates = [
    {
      toolId: 'TOL-PLAYWRIGHT-MCP',
      name: 'Playwright MCP',
      capabilities: ['CAP-BROWSER-NAVIGATE', 'CAP-DOM-SNAPSHOT', 'CAP-A11Y-TREE'],
      securityScore: 9.0,
      performanceScore: 8.0,
      evidenceStatus: 'SANDBOX_VERIFIED',
      epistemicType: 'EMPIRICAL'
    },
    {
      toolId: 'TOL-GENERIC-HTTP',
      name: 'Basic HTTP Client',
      capabilities: ['CAP-HTTP-GET'],
      securityScore: 8.0,
      performanceScore: 9.0,
      evidenceStatus: 'SANDBOX_READY',
      epistemicType: 'ASSUMPTION'
    }
  ];

  const required = ['CAP-BROWSER-NAVIGATE', 'CAP-DOM-SNAPSHOT'];
  const ranked = engine.rankCandidates(candidates, required);

  assert.equal(ranked[0].toolId, 'TOL-PLAYWRIGHT-MCP');
  assert.equal(ranked[0].recommendation, 'RECOMMEND_ADOPTION');
  assert.equal(ranked[0].epistemicType, 'EMPIRICAL');

  assert.equal(ranked[1].toolId, 'TOL-GENERIC-HTTP');
  assert.equal(ranked[1].verdict, 'REJECTED_NO_CAPABILITY_MATCH');
});

test('ToolDiscoveryRankingEngine rejects candidates with zero capability fit', () => {
  const candidate = {
    toolId: 'TOL-AUDIO-SYNTH',
    name: 'Audio Synthesizer',
    capabilities: ['CAP-AUDIO-GEN']
  };

  const evalResult = engine.scoreCandidate(candidate, ['CAP-SECURITY-AUDIT']);
  assert.equal(evalResult.verdict, 'REJECTED_NO_CAPABILITY_MATCH');
  assert.equal(evalResult.recommendation, 'DO_NOT_ADOPT');
});
