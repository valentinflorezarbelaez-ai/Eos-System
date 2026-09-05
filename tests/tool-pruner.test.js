import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pruneToolsByPhase, resolveToolPhase, TOOL_PHASES } from '../src/core/mcp/tool-pruner.js';

describe('EOS Tool Pruner (LIDR & Vercel Principle)', () => {
  const sampleTools = [
    { name: 'eos.workspace.discover', category: 'WORKSPACE', sideEffects: 'READ_ONLY' },
    { name: 'eos.context.compile', category: 'CONTEXT', sideEffects: 'READ_ONLY' },
    { name: 'eos.mission.start', category: 'MISSION', sideEffects: 'LEDGER_WRITE' },
    { name: 'eos.ledger.update_feature', category: 'LEDGER', sideEffects: 'LEDGER_WRITE' },
    { name: 'eos.verifier.run', category: 'QUALITY', sideEffects: 'READ_ONLY' },
    { name: 'eos.evidence.record', category: 'EVIDENCE', sideEffects: 'LEDGER_WRITE' }
  ];

  test('all phase returns all tools unchanged', () => {
    const res = pruneToolsByPhase(sampleTools, 'all');
    assert.equal(res.length, sampleTools.length);
  });

  test('explore phase filters to read-only discovery tools', () => {
    const res = pruneToolsByPhase(sampleTools, 'explore');
    assert.ok(res.length > 0);
    assert.ok(res.length < sampleTools.length);
    assert.ok(res.some((t) => t.name === 'eos.workspace.discover'));
    assert.ok(res.some((t) => t.name === 'eos.context.compile'));
    // Must NOT contain mutating ledger write tools
    assert.ok(!res.some((t) => t.name === 'eos.ledger.update_feature'));
    assert.ok(!res.some((t) => t.name === 'eos.evidence.record'));
  });

  test('implement phase filters to mission and code mutating tools', () => {
    const res = pruneToolsByPhase(sampleTools, 'implement');
    assert.ok(res.length > 0);
    assert.ok(res.some((t) => t.name === 'eos.mission.start'));
    assert.ok(res.some((t) => t.name === 'eos.ledger.update_feature'));
    // Must NOT contain verifier tools
    assert.ok(!res.some((t) => t.name === 'eos.verifier.run'));
  });

  test('verify phase filters to verifiers, evidence, and quality tools', () => {
    const res = pruneToolsByPhase(sampleTools, 'verify');
    assert.ok(res.length > 0);
    assert.ok(res.some((t) => t.name === 'eos.verifier.run'));
    assert.ok(res.some((t) => t.name === 'eos.evidence.record'));
    // Must NOT contain workspace discover
    assert.ok(!res.some((t) => t.name === 'eos.workspace.discover'));
  });

  test('resolveToolPhase reads from argv and env', () => {
    assert.equal(resolveToolPhase(['node', 'server.js', '--phase=explore']), 'explore');
    assert.equal(resolveToolPhase(['node', 'server.js', '--tool-phase=verify']), 'verify');
    assert.equal(resolveToolPhase(['node', 'server.js'], { EOS_TOOL_PHASE: 'implement' }), 'implement');
    assert.equal(resolveToolPhase(['node', 'server.js'], {}), 'all');
  });
});
