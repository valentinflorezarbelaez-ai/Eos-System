/**
 * @file src/fundacion/core.js
 * @version 1.0.0
 * @description Core functional logic for the Fundación pilot.
 * Implements an immutable hash-chained transaction ledger under L0 pure built-ins.
 */

import crypto from 'node:crypto';

export class FundacionCore {
  constructor() {
    this.ledger = [];
    this.isAuditing = false;
  }

  /**
   * Initializes the Fundación Core and resets ledger state.
   */
  async inicializar() {
    this.ledger = [];
    this.isAuditing = true;
    return true;
  }

  /**
   * Returns current count of recorded transactions in the ledger.
   * @returns {number}
   */
  getLedgerCount() {
    return this.ledger.length;
  }

  /**
   * Registers a new donation under BDD business rules.
   * Supports both registerDonation and registrarDonacion aliases.
   * @param {object} payload - Donation parameters
   * @returns {object} Transaction receipt
   */
  registerDonation({ donorId, amount, destination }) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      const error = new Error('ERR-FUN-INVALID-AMOUNT: Donation amount must be greater than zero.');
      error.code = 'ERR-FUN-INVALID-AMOUNT';
      throw error;
    }

    const timestamp = new Date().toISOString();
    const previousHash = this.ledger.length > 0
      ? this.ledger[this.ledger.length - 1].hashSha256
      : '0'.repeat(64);

    const blockData = { donorId, amount, destination, timestamp, previousHash };
    const hashSha256 = crypto
      .createHash('sha256')
      .update(JSON.stringify(blockData))
      .digest('hex');

    const txId = `TX-${hashSha256.substring(0, 16).toUpperCase()}`;

    const receipt = {
      txId,
      timestamp,
      hashSha256,
      status: 'CONSECRATED',
      donorId,
      amount,
      destination,
      previousHash,
      data: { donorId, amount, destination }
    };

    this.ledger.push(receipt);
    return receipt;
  }

  /**
   * Spanish alias for registerDonation
   */
  async registrarDonacion(payload) {
    return this.registerDonation(payload);
  }

  /**
   * Verifies the cryptographic chain integrity of the ledger.
   * @returns {boolean} True if 100% tamper-free.
   */
  verifyLedgerIntegrity() {
    for (let i = 0; i < this.ledger.length; i++) {
      const current = this.ledger[i];
      const previousHash = i > 0 ? this.ledger[i - 1].hashSha256 : '0'.repeat(64);

      const donorId = current.donorId || current.data?.donorId;
      const amount = current.amount !== undefined ? current.amount : current.data?.amount;
      const destination = current.destination || current.data?.destination;

      const blockData = {
        donorId,
        amount,
        destination,
        timestamp: current.timestamp,
        previousHash
      };

      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(blockData))
        .digest('hex');

      if (current.hashSha256 !== expectedHash) {
        return false;
      }
    }
    return true;
  }
}
