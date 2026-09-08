import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutiveArbitrationEngine } from '../scripts/engine/executive-arbitration-engine.js';

// ====================================================
// CONTRADICTION DETECTION & RESOLUTION TESTS
// ====================================================

const engine = new ExecutiveArbitrationEngine();

test('ExecutiveArbitrationEngine detects direct factual contradictions and flags CONFLICTED', () => {
  const claimA = {
    source: 'DOCS_AGENT',
    subject: 'MCP_PROTOCOL_ARCHITECTURE',
    assertion: true,
    value: 'STATELESS_REQUESTS'
  };

  const claimB = {
    source: 'LEGACY_AGENT',
    subject: 'MCP_PROTOCOL_ARCHITECTURE',
    assertion: false,
    value: 'STATEFUL_SESSION_SOCKET_REQUIRED'
  };

  const result = engine.detectContradiction(claimA, claimB);

  assert.equal(result.hasContradiction, true);
  assert.equal(result.status, 'CONFLICTED');
  assert.equal(result.record.resolutionPolicy, 'HALT_AUTO_ASSUMPTION_REQUIRE_PRIMARY_SOURCE_RESEARCH');
  assert.equal(engine.contradictions.length, 1);
});

test('ExecutiveArbitrationEngine passes consistent claims without flagging contradiction', () => {
  const claim1 = { source: 'A', subject: 'PORT', value: '3000' };
  const claim2 = { source: 'B', subject: 'PORT', value: '3000' };

  const result = engine.detectContradiction(claim1, claim2);
  assert.equal(result.hasContradiction, false);
  assert.equal(result.status, 'CONSISTENT');
});
