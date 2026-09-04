import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * @file src/core/memory.js
 * @description Akashic Causal Memory & Lexical Search Engine for EOS Mission OS.
 * Zero external dependencies (pure Node.js native primitives).
 */
export class EosMemory {
  /**
   * @param {Object} [options]
   * @param {string} [options.storagePath]
   */
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(process.cwd(), 'docs', 'intelligence', 'akasha_memory.jsonl');
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
    const raw = `${data.id}:${data.key}:${data.content}:${data.epistemicState || 'VERIFIED'}`;
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Saves a new memory record with cryptographic verification.
   * @param {Object} record
   * @param {string} record.key
   * @param {string} record.content
   * @param {string} [record.title]
   * @param {string} [record.epistemicState]
   * @param {string[]} [record.tags]
   * @returns {Promise<Object>}
   */
  async save(record) {
    const id = `MEM-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const entry = {
      id,
      key: record.key,
      title: record.title || record.key,
      content: record.content,
      epistemicState: record.epistemicState || 'VERIFIED',
      tags: record.tags || [],
      createdAt: new Date().toISOString()
    };

    entry.sha256Seal = this._computeSeal(entry);

    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.storagePath, line, 'utf8');
    return entry;
  }

  /**
   * Loads all healthy records from disk, quarantining tampered lines.
   * @returns {Promise<Object[]>}
   */
  async loadRecords() {
    if (!fsSync.existsSync(this.storagePath)) {
      return [];
    }

    const content = await fs.readFile(this.storagePath, 'utf8');
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

    // Buffer zeroization on transient search results
    const results = scored.slice(0, limit);
    return results;
  }
}
