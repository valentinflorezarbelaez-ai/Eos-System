/**
 * @module LsmTreeStorageEngine
 * @description [1% Canon - Artefacto 5 (DDIA / Database Internals)]
 * Implements an LSM-Tree storage engine with in-memory MemTable, append-only WAL, and immutable SSTable flush.
 */

import { calculateSha256 } from '../../sdd/epistemic-evidence-engine.js';

export class LsmTreeStorageEngine {
  constructor(options = {}) {
    this.memTableThreshold = options.memTableThreshold || 5; // flush after 5 keys
    this.memTable = new Map();
    this.wal = [];
    this.ssTables = []; // Immutable flushed sorted tables
  }

  put(key, value) {
    if (!key) throw new Error('LSM_ERROR: key cannot be empty');

    // 1. Append to Write-Ahead Log (WAL)
    const walEntry = { op: 'PUT', key, value, ts: Date.now() };
    this.wal.push(walEntry);

    // 2. Insert into in-memory MemTable
    this.memTable.set(key, value);

    // 3. Flush to immutable SSTable if threshold reached
    if (this.memTable.size >= this.memTableThreshold) {
      this.flushMemTableToSsTable();
    }

    return {
      status: 'PUT_SUCCESS',
      key,
      memtable_size: this.memTable.size,
      sstable_count: this.ssTables.length
    };
  }

  get(key) {
    // 1. Check in-memory MemTable (most recent)
    if (this.memTable.has(key)) {
      return { value: this.memTable.get(key), source: 'MEMTABLE' };
    }

    // 2. Search SSTables in reverse chronological order
    for (let i = this.ssTables.length - 1; i >= 0; i--) {
      const sstable = this.ssTables[i];
      if (sstable.table.has(key)) {
        return { value: sstable.table.get(key), source: `SSTABLE_LEVEL_${i}` };
      }
    }

    return { value: null, source: 'NOT_FOUND' };
  }

  flushMemTableToSsTable() {
    // Sort keys alphabetically
    const sortedKeys = Array.from(this.memTable.keys()).sort();
    const sortedTable = new Map();

    for (const k of sortedKeys) {
      sortedTable.set(k, this.memTable.get(k));
    }

    const sstable = {
      id: `SSTABLE-${Date.now()}-${this.ssTables.length + 1}`,
      table: sortedTable,
      key_count: sortedTable.size,
      min_key: sortedKeys[0],
      max_key: sortedKeys[sortedKeys.length - 1],
      created_at: new Date().toISOString()
    };

    sstable.sha256 = calculateSha256(JSON.stringify(Array.from(sortedTable.entries())));
    this.ssTables.push(sstable);
    this.memTable.clear();

    return sstable;
  }
}
