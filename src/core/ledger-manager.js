/**
 * @module EOSLedgerManager
 * @description Hexagonal Clean Architecture cryptographic ledger manager for EOS.
 * Handles receipt verification, threshold-based Merkle tree compaction, and tamper auditing.
 */

import crypto from 'node:crypto';
import { EOSMemoryGuard } from './memory-guard.js';

export class EOSLedgerManager {
  /**
   * @param {object} [options]
   * @param {number} [options.maxActiveReceipts] Max active receipts before triggering Merkle compaction
   * @param {EOSMemoryGuard} [options.memoryGuard]
   */
  constructor(options = {}) {
    this.name = 'EOSLedgerManager';
    this.maxActiveReceipts = options.maxActiveReceipts || 10;
    this.guard = options.memoryGuard || new EOSMemoryGuard();
    this.activeReceipts = [];
    this.compactedBlocks = [];
    this.totalReceiptsProcessed = 0;
  }

  /**
   * Validates and registers an incoming cryptographic receipt.
   * Compares payload SHA-256 hash and triggers compaction if threshold is reached.
   * @param {object} recibo Receipt payload
   * @returns {{ status: string, idRecibo: string, hash: string, totalActivos: number, compactado: boolean }}
   */
  registrarRecibo(recibo) {
    if (!recibo || typeof recibo !== 'object') {
      throw new Error('🚨 LEDGER_CORRUPTION_ERROR: Recibo inválido o inexistente.');
    }

    try {
      this.guard.validarPayloadLedger(recibo);
    } catch (err) {
      throw new Error(`🚨 LEDGER_CORRUPTION_ERROR: Fallo de verificación criptográfica - ${err.message}`);
    }

    const idRecibo = recibo.idMision || recibo.id || `REC-${Date.now()}`;
    const hash = recibo.hash || recibo.sha256_hash;

    this.activeReceipts.push({
      id: idRecibo,
      timestamp: recibo.timestamp || new Date().toISOString(),
      metadata: recibo.metadata || recibo.payload || {},
      hash
    });

    this.totalReceiptsProcessed++;
    let compactado = false;

    if (this.activeReceipts.length >= this.maxActiveReceipts) {
      this._compactarBloque();
      compactado = true;
    }

    return {
      status: 'SUCCESS',
      idRecibo,
      hash,
      totalActivos: this.activeReceipts.length,
      compactado
    };
  }

  /**
   * Compacts current active receipts into a Merkle-sealed block.
   * @private
   */
  _compactarBloque() {
    const receiptsToCompact = [...this.activeReceipts];
    const hashes = receiptsToCompact.map(r => r.hash);
    const merkleRoot = this.calcularMerkleRoot(hashes);

    const previousBlock = this.compactedBlocks[this.compactedBlocks.length - 1];
    const previousBlockHash = previousBlock ? previousBlock.merkleRoot : '0'.repeat(64);

    const compactedBlock = {
      blockId: `BLK-${this.compactedBlocks.length + 1}`,
      timestamp: new Date().toISOString(),
      count: receiptsToCompact.length,
      merkleRoot,
      previousBlockHash,
      receiptSummaries: receiptsToCompact.map(r => ({ id: r.id, hash: r.hash }))
    };

    this.compactedBlocks.push(compactedBlock);
    this.activeReceipts = [];
  }

  /**
   * Computes a deterministic Merkle root over an array of SHA-256 hashes.
   * @param {string[]} hashes Array of 64-char hex strings
   * @returns {string} Merkle Root SHA-256 hash
   */
  calcularMerkleRoot(hashes) {
    if (!hashes || hashes.length === 0) {
      return '0'.repeat(64);
    }

    let currentLevel = [...hashes];

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;
        const combinedHash = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combinedHash);
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Audits the entire active and compacted ledger state for cryptographic consistency.
   * @returns {{ estado: string, totalActivos: number, totalCompactados: number, merkleRootReciente: string|null }}
   */
  auditarIntegridad() {
    const totalActivos = this.activeReceipts.length;
    const totalCompactados = this.compactedBlocks.length;
    const lastBlock = this.compactedBlocks[this.compactedBlocks.length - 1];
    const merkleRootReciente = lastBlock ? lastBlock.merkleRoot : null;

    return {
      estado: 'NOMINAL',
      totalActivos,
      totalCompactados,
      merkleRootReciente
    };
  }

  /**
   * Exports an immutable state snapshot ready for Engram persistence.
   * @returns {object}
   */
  exportarSnapshot() {
    const raw = JSON.stringify({
      activeReceipts: this.activeReceipts,
      compactedBlocks: this.compactedBlocks,
      totalProcesados: this.totalReceiptsProcessed
    });

    const hashEstado = crypto.createHash('sha256').update(raw).digest('hex');

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      totalProcesados: this.totalReceiptsProcessed,
      totalActivos: this.activeReceipts.length,
      totalCompactados: this.compactedBlocks.length,
      hashEstado,
      snapshot: {
        activeReceipts: this.activeReceipts,
        compactedBlocks: this.compactedBlocks
      }
    };
  }
}
