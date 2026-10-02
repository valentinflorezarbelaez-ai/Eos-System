import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  resolveDefaultEngramStoragePath,
  assertEngramPath,
  buildEngramEnvelope,
  assertEngramEnvelope,
  computeEngramSeal
} from './memory/engram-contract.js';
import { resolveRepoRoot } from './write-barrier/paths.js';

/**
 * @file src/core/memory.js
 * @description Akashic Causal Memory & Lexical Search Engine for EOS Mission OS.
 * Zero external dependencies (pure Node.js native primitives).
 * ROI6: default storage is SSOT `.eos/engram/memory.jsonl` (not docs/intelligence/akasha).
 */
export class EosMemory {
  /**
   * @param {Object} [options]
   * @param {string} [options.storagePath]
   * @param {string} [options.repoRoot]
   * @param {boolean} [options.skipPathAssert] — tests only; still defaults to SSOT path
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || resolveRepoRoot();
    const requested = options.storagePath || resolveDefaultEngramStoragePath(this.repoRoot);
    if (options.skipPathAssert === true) {
      this.storagePath = path.resolve(requested);
    } else {
      const asserted = assertEngramPath(requested, { repoRoot: this.repoRoot });
      this.storagePath = asserted.path;
    }
    this.quarantinedCount = 0;
    this._ensureStorageDirectory();
  }

  _ensureStorageDirectory() {
    const dir = path.dirname(this.storagePath);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Computes SHA-256 seal for a record payload.
   * @param {Object} data
   * @returns {string}
   */
  _computeSeal(data) {
    return computeEngramSeal(data);
  }

  /**
   * Saves a new memory record with cryptographic verification (ROI6 envelope).
   * @param {Object} record
   * @param {string} record.key
   * @param {string} record.content
   * @param {string} [record.title]
   * @param {string} [record.epistemicState]
   * @param {string[]} [record.tags]
   * @param {string} [record.type]
   * @param {string} [record.topic_key]
   * @returns {Promise<Object>}
   */
  async save(record) {
    const id = `MEM-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const entry = buildEngramEnvelope({
      ...record,
      id,
      key: record.key,
      title: record.title || record.key,
      content: record.content,
      epistemicState: record.epistemicState || 'VERIFIED',
      tags: record.tags || []
    });
    assertEngramEnvelope(entry);

    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.storagePath, line, 'utf8');
    return entry;
  }

  /**
   * Loads all healthy records from disk, quarantining tampered lines.
   * Accepts ROI6 envelopes and legacy pre-ROI6 seal-only records.
   * @returns {Promise<Object[]>}
   */
  async loadRecords() {
    let content;
    try {
      // ⚡ Bolt optimization: Avoid TOCTOU existsSync and rely on native try/catch ENOENT
      content = await fs.readFile(this.storagePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }

    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const validRecords = [];
    this.quarantinedCount = 0;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const expectedSeal = this._computeSeal(parsed);
        if (parsed.sha256Seal !== expectedSeal) {
          this.quarantinedCount++;
          continue;
        }
        validRecords.push(parsed);
      } catch {
        this.quarantinedCount++;
      }
    }

    return validRecords;
  }

  /**
   * Retrieves a record by key.
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    const records = await this.loadRecords();
    return records.find(r => r.key === key) || null;
  }

  /**
   * Performs indexed lexical scoring search across memory records.
   * Honest lexical match — not SQLite FTS5.
   * @param {string} query
   * @param {number} [limit=10]
   * @returns {Promise<Array<Object & { score: number }>>}
   */
  async search(query, limit = 10) {
    const records = await this.loadRecords();
    const queryTokens = (query || '').toLowerCase().split(/\s+/).filter(t => t.length > 0);

    if (queryTokens.length === 0) {
      return records.slice(0, limit).map(r => ({ ...r, score: 1 }));
    }

    const scored = [];

    for (const record of records) {
      const searchTarget = `${record.key} ${record.title} ${record.content} ${(record.tags || []).join(' ')}`.toLowerCase();
      let matchCount = 0;

      for (const token of queryTokens) {
        if (searchTarget.includes(token)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const score = matchCount / queryTokens.length;
        scored.push({ ...record, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, limit);
    return results;
  }
}
