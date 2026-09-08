import test from 'node:test';
import assert from 'node:assert/strict';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';

test('MCP Tool #74 — eos.pleroma.akasha.engram Wire Protocol & FTS5 Local Memory', async (t) => {
  const server = new EosMcpServer();

  await t.test('CANONICAL_TOOLS exposes eos.pleroma.akasha.engram as tool #74', () => {
    assert.strictEqual(CANONICAL_TOOLS.length, 80);
    const tool = CANONICAL_TOOLS.find(t => t.name === 'eos.pleroma.akasha.engram');
    assert.ok(tool);
    assert.strictEqual(tool.category, 'DATA');
    assert.strictEqual(tool.sideEffects, 'LEDGER_WRITE');
    assert.strictEqual(tool.requiredAuthority, 'A1');
  });

  await t.test('persists and indexes architectural decision in local Engram with FTS5', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const validCall = {
      monadMemoryKey: 'architecture/l0-parser-invariants',
      contentPayload: 'Las invariantes de la gramática formal EBNF son inmutables bajo la ley del tres.',
      executionProfile: {
        fts5IndexingActive: true,
        zeroWastePurgeOnRead: true
      },
      anupadakaProof: 'sha256-anupadaka-proof-seal-074'
    };

    const res = await server.handleToolCall('eos.pleroma.akasha.engram', validCall, env);
    assert.strictEqual(res.status, 'AKASHIC_ENGRAM_RECORD_CONSECRATED');
    assert.strictEqual(res.monadMemoryKey, 'architecture/l0-parser-invariants');
    assert.ok(res.metadata);
    assert.strictEqual(res.metadata.tokenizationStatus, 'LOCK_FREE_FTS5_COMPLETED');
    assert.ok(res.anupadakaSealSignature.startsWith('sha256-'));
  });

  await t.test('rejects execution when fts5IndexingActive is false', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const invalidCall = {
      monadMemoryKey: 'architecture/degraded',
      contentPayload: 'Escoria sin FTS5',
      executionProfile: {
        fts5IndexingActive: false,
        zeroWastePurgeOnRead: true
      },
      anupadakaProof: 'sha256-proof'
    };

    const res = await server.handleToolCall('eos.pleroma.akasha.engram', invalidCall, env);
    assert.strictEqual(res.status, 'DEGRADED_PERSISTENCE_MODE_REJECTED');
    assert.match(res.message, /indexación léxica FTS5/);
  });

  await t.test('rejects call if mandatory fields are missing via schema firewall', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const res = await server.handleToolCall('eos.pleroma.akasha.engram', { monadMemoryKey: 'KEY-1' }, env);
    assert.strictEqual(res.status, 'ERROR');
    assert.match(res.reason, /VALIDATION_FAULT|SCHEMA_VIOLATION/);
  });
});
