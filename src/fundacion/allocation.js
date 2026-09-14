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
    // ⚡ Bolt: Single-pass loops to replace chained .filter().reduce()
    // Impact: Avoids intermediate array allocations and reduces time complexity.
    let totalDonated = 0;
    for (const item of this.core.ledger) {
      if (item.destination === projectId || item.data?.destination === projectId) {
        totalDonated += (item.amount || item.data?.amount || 0);
      }
    }

    let totalAllocated = 0;
    for (const item of this.allocations) {
      if (item.projectId === projectId) {
        totalAllocated += item.amount;
      }
    }

    return totalDonated - totalAllocated;
  }

  /**
   * Generates a consolidated public transparency audit matrix.
   * @returns {object} Public audit report
   */
  generatePublicAuditReport() {
    // ⚡ Bolt: Use a single-pass hash map approach instead of looping over projects
    // and performing .filter().reduce() inside the loop.
    // Impact: Reduces time complexity from O(N*M) to O(N+M)
    const projectSummary = {};

    // First pass: aggregate all donations from the ledger
    for (const item of this.core.ledger) {
      const dest = item.destination || item.data?.destination;
      if (dest) {
        if (!projectSummary[dest]) {
          projectSummary[dest] = { totalDonated: 0, totalAllocated: 0, netBalance: 0 };
        }
        projectSummary[dest].totalDonated += (item.amount || item.data?.amount || 0);
      }
    }

    // Second pass: aggregate all allocations
    for (const item of this.allocations) {
      const pid = item.projectId;
      if (pid) {
        if (!projectSummary[pid]) {
          projectSummary[pid] = { totalDonated: 0, totalAllocated: 0, netBalance: 0 };
        }
        projectSummary[pid].totalAllocated += item.amount;
      }
    }

    // Third pass: compute net balances
    for (const pid in projectSummary) {
      if (Object.prototype.hasOwnProperty.call(projectSummary, pid)) {
        projectSummary[pid].netBalance = projectSummary[pid].totalDonated - projectSummary[pid].totalAllocated;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      projects: projectSummary
    };
  }
}
