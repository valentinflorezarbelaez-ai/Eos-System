import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';

function makeSandboxRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-engram-'));
  fs.mkdirSync(path.join(root, 'config', 'security'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"mcp-engram-sandbox"}');
  fs.writeFileSync(
    path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json'),
    '{"roots":[]}'
  );
  return root;
}

test('MCP Tool #74 — eos.pleroma.akasha.engram ROI6 honest local adapter', async (t) => {
  const sandbox = makeSandboxRepo();
  const server = new EosMcpServer(null, { baseDir: sandbox });

  t.after(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  await t.test('CANONICAL_TOOLS exposes eos.pleroma.akasha.engram as tool #74', () => {
    assert.strictEqual(CANONICAL_TOOLS.length, 80);
    const tool = CANONICAL_TOOLS.find(t => t.name === 'eos.pleroma.akasha.engram');
    assert.ok(tool);
    assert.strictEqual(tool.category, 'DATA');
    assert.strictEqual(tool.sideEffects, 'LEDGER_WRITE');
    assert.strictEqual(tool.requiredAuthority, 'A1');
    assert.doesNotMatch(tool.description, /SQLite FTS5 full-text lexical indexing/);
  });

  await t.test('persists via EosMemory JSONL adapter without FTS5 claims', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const validCall = {
      monadMemoryKey: 'architecture/l0-parser-invariants',
      contentPayload: 'Las invariantes de la gramática formal EBNF son inmutables bajo la ley del tres.',
      executionProfile: {
        fts5IndexingActive: false,
        zeroWastePurgeOnRead: true
      },
      anupadakaProof: 'sha256-anupadaka-proof-seal-074'
    };

    const res = await server.handleToolCall('eos.pleroma.akasha.engram', validCall, env);
    assert.strictEqual(res.status, 'LOCAL_ENGRAM_ADAPTER_PERSISTED');
    assert.strictEqual(res.monadMemoryKey, 'architecture/l0-parser-invariants');
    assert.strictEqual(res.fts5, false);
    assert.strictEqual(res.backend, 'eos-memory-jsonl');
    assert.ok(res.envelope);
    assert.ok(res.storagePath);
  });

  await t.test('rejects FTS5 request honestly — use external engram MCP', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const fts5Call = {
      monadMemoryKey: 'architecture/fts5-wanted',
      contentPayload: 'Needs real FTS5',
      executionProfile: {
        fts5IndexingActive: true,
        zeroWastePurgeOnRead: true
      },
      anupadakaProof: 'sha256-proof'
    };

    const res = await server.handleToolCall('eos.pleroma.akasha.engram', fts5Call, env);
    assert.strictEqual(res.status, 'FTS5_NOT_AVAILABLE_USE_EXTERNAL_ENGRAM');
    assert.strictEqual(res.fts5, false);
    assert.match(res.message, /external engram MCP|eos-mcp\.ssot/i);
  });

  await t.test('rejects call if mandatory fields are missing via schema firewall', async () => {
    const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };
    const res = await server.handleToolCall('eos.pleroma.akasha.engram', { monadMemoryKey: 'KEY-1' }, env);
    assert.strictEqual(res.status, 'ERROR');
    assert.match(res.reason, /VALIDATION_FAULT|SCHEMA_VIOLATION/);
  });
});
