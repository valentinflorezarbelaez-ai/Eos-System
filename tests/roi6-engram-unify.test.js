import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ENGRAM_SCHEMA_ID,
  ENGRAM_RELATIVE_STORAGE,
  resolveDefaultEngramStoragePath,
  assertEngramPath,
  buildEngramEnvelope,
  assertEngramEnvelope,
  verifyEngramContract,
  computeEngramSeal
} from '../src/core/memory/engram-contract.js';
import { EosMemory } from '../src/core/memory.js';
import { GentlemanSddBridge } from '../src/core/adapters/gentleman-sdd-bridge.js';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';

function makeSandboxRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roi6-engram-'));
  fs.mkdirSync(path.join(root, 'config', 'security'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"roi6-sandbox"}');
  fs.writeFileSync(
    path.join(root, 'config', 'security', 'write-barrier-ssot-roots.json'),
    '{"roots":[]}'
  );
  return root;
}

describe('ROI6 Engram path/contract unify', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = makeSandboxRepo();
  });

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it('default path resolves under .eos/engram/memory.jsonl', () => {
    const p = resolveDefaultEngramStoragePath(sandbox);
    assert.equal(path.normalize(p), path.normalize(path.join(sandbox, '.eos', 'engram', 'memory.jsonl')));
    const asserted = assertEngramPath(p, { repoRoot: sandbox });
    assert.equal(asserted.ok, true);
    assert.match(asserted.path.replace(/\\/g, '/'), /\.eos\/engram\/memory\.jsonl$/);
  });

  it('DENY Fundacion paths', () => {
    assert.throws(
      () => assertEngramPath(path.join(sandbox, 'Fundacion', 'memory.jsonl'), { repoRoot: sandbox }),
      (err) => err.code === 'ENGRAM_PATH_DENY' && err.deny_code === 'FUNDACION'
    );
  });

  it('DENY legacy akasha path (fail-closed drift)', () => {
    const legacy = path.join(sandbox, 'docs', 'intelligence', 'akasha_memory.jsonl');
    assert.throws(
      () => assertEngramPath(legacy, { repoRoot: sandbox }),
      (err) => err.code === 'ENGRAM_PATH_DENY' && err.deny_code === 'LEGACY_AKASHA'
    );
  });

  it('legacy redirect opt-in returns SSOT path', () => {
    const legacy = path.join(sandbox, 'docs', 'intelligence', 'akasha_memory.jsonl');
    const r = assertEngramPath(legacy, { repoRoot: sandbox, allowLegacyRedirect: true });
    assert.equal(r.legacyRedirect, true);
    assert.equal(path.normalize(r.path), path.normalize(resolveDefaultEngramStoragePath(sandbox)));
  });

  it('DENY random paths outside .eos/engram/', () => {
    assert.throws(
      () => assertEngramPath(path.join(sandbox, 'tmp', 'random.jsonl'), { repoRoot: sandbox }),
      (err) => err.code === 'ENGRAM_PATH_DENY' && err.deny_code === 'OUTSIDE_SSOT'
    );
  });

  it('envelope round-trip seal + schema', () => {
    const env = buildEngramEnvelope({
      key: 'roi6/test',
      title: 'ROI6',
      content: 'What: unify\nWhy: truth'
    });
    assert.equal(env.schema, ENGRAM_SCHEMA_ID);
    assert.equal(env.fts5, false);
    assert.equal(env.backend, 'eos-memory-jsonl');
    assert.equal(env.sha256Seal, computeEngramSeal(env));
    assertEngramEnvelope(env);
  });

  it('DENY envelope that claims fts5=true', () => {
    const env = buildEngramEnvelope({ key: 'x', content: 'y', title: 't' });
    env.fts5 = true;
    assert.throws(() => assertEngramEnvelope(env), (err) => err.deny_code === 'FAKE_FTS5');
  });

  it('EosMemory defaults to SSOT path and persists envelope', async () => {
    const mem = new EosMemory({ repoRoot: sandbox });
    assert.equal(
      path.normalize(mem.storagePath),
      path.normalize(resolveDefaultEngramStoragePath(sandbox))
    );
    const saved = await mem.save({
      key: 'architecture/roi6',
      title: 'ROI6',
      content: 'local jsonl only'
    });
    assert.equal(saved.schema, ENGRAM_SCHEMA_ID);
    assert.equal(saved.fts5, false);
    const got = await mem.get('architecture/roi6');
    assert.ok(got);
    assert.equal(got.sha256Seal, saved.sha256Seal);
    assert.ok(fs.existsSync(mem.storagePath));
  });

  it('Gentleman bridge uses SSOT envelope', () => {
    const bridge = new GentlemanSddBridge();
    const envelope = bridge.formatEngramMemoryEnvelope({
      title: 'Adopt SSOT',
      decision: 'Use .eos/engram/',
      rationale: 'One path',
      domain: 'memory'
    });
    assert.equal(envelope.schema, ENGRAM_SCHEMA_ID);
    assert.equal(envelope.fts5, false);
    assert.match(envelope.content, /What:/);
    assertEngramEnvelope(envelope);
  });

  it('verifyEngramContract round-trips', () => {
    const v = verifyEngramContract(sandbox);
    assert.equal(v.ok, true);
    assert.equal(v.fts5Local, false);
    assert.equal(v.schema, ENGRAM_SCHEMA_ID);
    assert.match(v.relative, /\.eos\/engram\/memory\.jsonl/);
  });

  it('MCP eos.pleroma.akasha.engram is honest adapter (no FTS5 consecration)', async () => {
    const tool = CANONICAL_TOOLS.find((t) => t.name === 'eos.pleroma.akasha.engram');
    assert.ok(tool);
    assert.match(tool.description, /JSONL|adapter|deprecated|external/i);
    assert.doesNotMatch(tool.description, /SQLite FTS5 full-text/);

    const server = new EosMcpServer(null, { baseDir: sandbox });
    const env = {
      EOS_MODE: 'read-write',
      EOS_AUTONOMY_LEVEL: 'LEVEL_1',
      EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false'
    };

    const rejected = await server.handleToolCall(
      'eos.pleroma.akasha.engram',
      {
        monadMemoryKey: 'architecture/roi6-fts5-request',
        contentPayload: 'must not claim FTS5',
        executionProfile: { fts5IndexingActive: true, zeroWastePurgeOnRead: true },
        anupadakaProof: 'sha256-proof'
      },
      env
    );
    assert.equal(rejected.status, 'FTS5_NOT_AVAILABLE_USE_EXTERNAL_ENGRAM');
    assert.equal(rejected.fts5, false);
    assert.match(rejected.message, /external engram MCP|eos-mcp\.ssot/i);

    const persisted = await server.handleToolCall(
      'eos.pleroma.akasha.engram',
      {
        monadMemoryKey: 'architecture/roi6-local',
        contentPayload: 'honest local JSONL persist',
        executionProfile: { fts5IndexingActive: false, zeroWastePurgeOnRead: true },
        anupadakaProof: 'sha256-proof'
      },
      env
    );
    assert.equal(persisted.status, 'LOCAL_ENGRAM_ADAPTER_PERSISTED');
    assert.equal(persisted.fts5, false);
    assert.equal(persisted.backend, 'eos-memory-jsonl');
    assert.ok(persisted.envelope);
    assert.equal(persisted.envelope.schema, ENGRAM_SCHEMA_ID);
    assert.doesNotMatch(JSON.stringify(persisted), /LOCK_FREE_FTS5_COMPLETED|AKASHIC_ENGRAM_RECORD_CONSECRATED/);
  });
});
