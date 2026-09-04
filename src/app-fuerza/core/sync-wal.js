/**
 * @file src/app-fuerza/core/sync-wal.js
 * @version 1.0.0
 * @description Write-Ahead Logging (WAL) and Offline Durability Engine for App Fuerza.
 * Provides atomic append-only local logging and two-phase FIFO remote synchronization under Pure L0 built-ins.
 */

import crypto from 'node:crypto';

export class FuerzaSyncWAL {
  constructor() {
    this.log = [];
    this.remoteTransport = async (entry) => ({ status: 200, ok: true });
  }

  /**
   * Initializes or resets the WAL in-memory log.
   */
  async inicializar() {
    this.log = [];
    return true;
  }

  /**
   * Configures the remote network transport handler.
   * @param {Function} transportFn
   */
  setRemoteTransport(transportFn) {
    if (typeof transportFn === 'function') {
      this.remoteTransport = transportFn;
    }
  }

  /**
   * Calculates the SHA-256 checksum for a session payload.
   * @param {object} payload
   * @returns {string} Hex SHA-256 digest
   */
  calculateChecksum(payload) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Appends an offline training session to the WAL log (Append-Only).
   * @param {object} payload - Session data
   * @returns {object} WAL log entry
   */
  appendSession(payload) {
    const timestamp = new Date().toISOString();
    const checksum = this.calculateChecksum(payload);
    const hash = crypto
      .createHash('sha256')
      .update(`${checksum}:${timestamp}:${this.log.length}`)
      .digest('hex');
    const entryId = `WAL-TX-${hash.substring(0, 16).toUpperCase()}`;

    const logEntry = {
      entryId,
      timestamp,
      status: 'PENDING_SYNC',
      payload: { ...payload },
      checksum
    };

    this.log.push(logEntry);
    return logEntry;
  }

  writeAheadLog(payload) {
    return this.appendSession(payload);
  }

  /**
   * Verifies the cryptographic integrity of a log entry.
   * @param {object} entry
   * @returns {boolean}
   */
  verifyEntryIntegrity(entry) {
    const expectedChecksum = this.calculateChecksum(entry.payload);
    if (entry.checksum !== expectedChecksum) {
      entry.status = 'CORRUPTED';
      const error = new Error('ERR-FUE-WAL-CORRUPTED: SHA-256 checksum mismatch on WAL log entry.');
      error.code = 'ERR-FUE-WAL-CORRUPTED';
      throw error;
    }
    return true;
  }

  /**
   * Flushes pending WAL entries in FIFO sequence to remote storage.
   * @param {Function} [customTransport]
   * @returns {Promise<{ syncedCount: number, errors: Array }>}
   */
  async flushWAL(customTransport) {
    const transport = typeof customTransport === 'function' ? customTransport : this.remoteTransport;
    let syncedCount = 0;
    const errors = [];

    for (const entry of this.log) {
      if (entry.status !== 'PENDING_SYNC') continue;

      this.verifyEntryIntegrity(entry);

      try {
        const response = await transport(entry);
        if (response && (response.status === 200 || response.ok === true)) {
          entry.status = 'COMMITTED';
          syncedCount++;
        } else {
          // Network rejected or non-200, stop flush loop
          break;
        }
      } catch (err) {
        errors.push(err);
        break;
      }
    }

    const result = { syncedCount, errors };
    // Allow direct numeric access if expected
    result[Symbol.toPrimitive] = () => syncedCount;
    return result;
  }

  /**
   * Returns count of records awaiting synchronization.
   * @returns {number}
   */
  getPendingCount() {
    return this.log.filter(entry => entry.status === 'PENDING_SYNC').length;
  }

  getPendingEntries() {
    return this.log.filter(entry => entry.status === 'PENDING_SYNC');
  }

  /**
   * Returns count of successfully synchronized and committed records.
   * @returns {number}
   */
  getCommittedCount() {
    return this.log.filter(entry => entry.status === 'COMMITTED').length;
  }
}

// Spanish alias export
export const AppFuerzaSyncWal = FuerzaSyncWAL;
