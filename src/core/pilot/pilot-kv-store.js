/**
 * @module PilotKvStore
 * @description High-Performance In-Memory Key-Value Store with TTL Eviction and SHA-256 State Ledger.
 * Built under Clean Architecture (Ports & Adapters) and Node Built-in zero-dependency rules.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class PilotKvStore {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultTtlMs]
   */
  constructor(options = {}) {
    this.defaultTtlMs = options.defaultTtlMs || 0; // 0 = no expiration
    this.store = new Map();
    this.history = [];
  }

  /**
   * Sets a key-value pair with optional TTL
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs]
   * @returns {object} Operation receipt with state hash
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }

    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    const entry = { value, expiresAt };
    this.store.set(key, entry);

    const event = {
      op: 'SET',
      key,
      value,
      expires_at: expiresAt,
      timestamp: new Date().toISOString()
    };

    const receipt = {
      status: 'OK',
      key,
      expires_at: expiresAt,
      state_hash: this.getStateHash(),
      timestamp: event.timestamp
    };

    this.history.push(event);
    return receipt;
  }

  /**
   * Gets a value by key, returning null if expired or missing
   * @param {string} key
   * @returns {*} Value or null
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Deletes a key from the store
   * @param {string} key
   * @returns {boolean} True if deleted, false if not found
   */
  delete(key) {
    const existed = this.store.delete(key);
    if (existed) {
      this.history.push({ op: 'DELETE', key, timestamp: new Date().toISOString() });
    }
    return existed;
  }

  /**
   * Calculates the deterministic SHA-256 hash of the active store state
   * @returns {string}
   */
  getStateHash() {
    const serialized = Array.from(this.store.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${JSON.stringify(v.value)}`)
      .join('|');

    return calculateSha256(serialized);
  }

  /**
   * Returns store telemetry and statistics
   * @returns {object}
   */
  getTelemetry() {
    return {
      total_keys: this.store.size,
      total_operations: this.history.length,
      state_hash: this.getStateHash(),
      timestamp: new Date().toISOString()
    };
  }
}
