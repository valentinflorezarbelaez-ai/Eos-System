/**
 * @file src/fundacion/allocation.js
 * @version 1.0.0
 * @description Capital allocation and public transparency audit module for Fundación Pilot.
 * Pure L0 implementation with mathematical balance assertions.
 */

import crypto from 'node:crypto';

export class FundacionAllocation {
  /**
   * @param {import('./core.js').FundacionCore} core - Instance of FundacionCore
   */
  constructor(core) {
    this.core = core;
    this.allocations = [];
  }

  /**
   * Allocates capital to a specific project after verifying available balance.
   * @param {object} params
   * @param {string} params.projectId
   * @param {number} params.amountToAllocate
   * @param {string} params.purpose
   * @returns {object} Allocation receipt
   */
  allocateFunds({ projectId, amountToAllocate, purpose }) {
    if (typeof amountToAllocate !== 'number' || isNaN(amountToAllocate) || amountToAllocate <= 0) {
      const error = new Error('ERR-FUN-INVALID-ALLOCATION-AMOUNT: Allocation amount must be positive.');
      error.code = 'ERR-FUN-INVALID-ALLOCATION-AMOUNT';
      throw error;
    }

    const availableBalance = this.getProjectBalance(projectId);

    if (amountToAllocate > availableBalance) {
      const error = new Error(
        `ERR-FUN-INSUFFICIENT-PROJECT-FUNDS: Requested ${amountToAllocate} exceeds available balance of ${availableBalance} for project ${projectId}.`
      );
      error.code = 'ERR-FUN-INSUFFICIENT-PROJECT-FUNDS';
      throw error;
    }

    const timestamp = new Date().toISOString();
    const hashData = { projectId, amountToAllocate, purpose, timestamp, count: this.allocations.length };
    const digest = crypto.createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
    const allocationId = `ALC-${digest.substring(0, 16).toUpperCase()}`;

    const receipt = {
      allocationId,
      projectId,
      amount: amountToAllocate,
      purpose,
      timestamp,
      status: 'ALLOCATED',
      digest: `sha256-${digest}`
    };

    this.allocations.push(receipt);
    return receipt;
  }

  /**
   * Computes the net available funds for a given project.
   * @param {string} projectId
   * @returns {number} Available balance
   */
  getProjectBalance(projectId) {
    const totalDonated = this.core.ledger
      .filter(item => (item.destination === projectId || item.data?.destination === projectId))
      .reduce((sum, item) => sum + (item.amount || item.data?.amount || 0), 0);

    const totalAllocated = this.allocations
      .filter(item => item.projectId === projectId)
      .reduce((sum, item) => sum + item.amount, 0);

    return totalDonated - totalAllocated;
  }

  /**
   * Generates a consolidated public transparency audit matrix.
   * @returns {object} Public audit report
   */
  generatePublicAuditReport() {
    const projectSummary = {};

    // Collect all project IDs from donations and allocations
    const projectIds = new Set();
    this.core.ledger.forEach(item => {
      const dest = item.destination || item.data?.destination;
      if (dest) projectIds.add(dest);
    });
    this.allocations.forEach(item => {
      if (item.projectId) projectIds.add(item.projectId);
    });

    for (const pid of projectIds) {
      const totalDonated = this.core.ledger
        .filter(item => (item.destination === pid || item.data?.destination === pid))
        .reduce((sum, item) => sum + (item.amount || item.data?.amount || 0), 0);

      const totalAllocated = this.allocations
        .filter(item => item.projectId === pid)
        .reduce((sum, item) => sum + item.amount, 0);

      projectSummary[pid] = {
        totalDonated,
        totalAllocated,
        netBalance: totalDonated - totalAllocated
      };
    }

    return {
      timestamp: new Date().toISOString(),
      projects: projectSummary
    };
  }
}
