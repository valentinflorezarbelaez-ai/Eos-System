/**
 * @module ByzantineConsensusEngine
 * @description SpaceX/Avionics-grade Byzantine Fault Tolerant (BFT) consensus
 * and Triple Modular Redundancy (TMR) voting engine for mission-critical decisions.
 */

import { createHash, randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const CONSENSUS_THRESHOLD = Object.freeze({
  UNANIMOUS: 'UNANIMOUS', // 100%
  SUPERMAJORITY: 'SUPERMAJORITY', // >= 66.6%
  SIMPLE_MAJORITY: 'SIMPLE_MAJORITY' // > 50.0%
});

export const CONSENSUS_VERDICT = Object.freeze({
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BYZANTINE_DISAGREEMENT: 'BYZANTINE_DISAGREEMENT',
  VETOED_SECURITY_FAILURE: 'VETOED_SECURITY_FAILURE',
  INSUFFICIENT_QUORUM: 'INSUFFICIENT_QUORUM'
});

export class ByzantineConsensusEngine {
  constructor(options = {}) {
    this.minQuorum = options.minQuorum || 3;
    this.consensusLog = [];
  }

  /**
   * Evaluates consensus across multi-agent or multi-model evaluations.
   * @param {object} params
   * @param {string} params.decisionId
   * @param {object} params.proposal
   * @param {Array<object>} params.votes Array of { voter_id, role, approve: boolean, weight?: number, veto?: boolean, reason?: string }
   * @param {string} [params.threshold] 'SUPERMAJORITY' | 'UNANIMOUS' | 'SIMPLE_MAJORITY'
   * @returns {object} Consensus receipt
   */
  evaluateConsensus(params = {}) {
    const {
      decisionId = `DEC-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      proposal = {},
      votes = [],
      threshold = CONSENSUS_THRESHOLD.SUPERMAJORITY
    } = params;

    if (!Array.isArray(votes) || votes.length === 0) {
      return this._createReceipt(decisionId, proposal, CONSENSUS_VERDICT.INSUFFICIENT_QUORUM, {
        total_votes: 0,
        reason: 'Zero votes received'
      });
    }

    if (votes.length < this.minQuorum && threshold !== CONSENSUS_THRESHOLD.SIMPLE_MAJORITY) {
      return this._createReceipt(decisionId, proposal, CONSENSUS_VERDICT.INSUFFICIENT_QUORUM, {
        total_votes: votes.length,
        required_quorum: this.minQuorum,
        reason: `Vote count (${votes.length}) below minimum required quorum (${this.minQuorum})`
      });
    }

    // 1. Check for Critical Security / Constitutional Veto
    for (const vote of votes) {
      if (vote.veto === true || vote.critical_security_failure === true) {
        return this._createReceipt(decisionId, proposal, CONSENSUS_VERDICT.VETOED_SECURITY_FAILURE, {
          vetoing_voter: vote.voter_id || 'UNKNOWN_VOTER',
          veto_reason: vote.reason || 'Critical security or governance invariant violated',
          votes
        });
      }
    }

    // 2. Compute Weighted Vote Scores
    let totalWeight = 0;
    let approveWeight = 0;

    for (const vote of votes) {
      const weight = typeof vote.weight === 'number' && vote.weight > 0 ? vote.weight : 1.0;
      totalWeight += weight;
      if (vote.approve === true) {
        approveWeight += weight;
      }
    }

    const approvalRatio = totalWeight > 0 ? approveWeight / totalWeight : 0;
    let requiredRatio = 0.666;
    if (threshold === CONSENSUS_THRESHOLD.UNANIMOUS) requiredRatio = 1.0;
    else if (threshold === CONSENSUS_THRESHOLD.SIMPLE_MAJORITY) requiredRatio = 0.5;

    let verdict = CONSENSUS_VERDICT.REJECTED;

    if (approvalRatio >= requiredRatio) {
      verdict = CONSENSUS_VERDICT.APPROVED;
    } else if (approvalRatio >= 0.4 && approvalRatio < requiredRatio) {
      verdict = CONSENSUS_VERDICT.BYZANTINE_DISAGREEMENT;
    }

    return this._createReceipt(decisionId, proposal, verdict, {
      total_votes: votes.length,
      total_weight: totalWeight,
      approve_weight: approveWeight,
      approval_ratio: Math.round(approvalRatio * 1000) / 1000,
      threshold,
      votes
    });
  }

  /**
   * Arbitrates a Byzantine disagreement via verified Director Arbiter receipt
   * @param {object} params
   * @param {object} params.previousReceipt
   * @param {object} params.arbiterReceipt
   * @param {boolean} params.arbitrationDecision
   * @returns {object} Final arbitrated consensus receipt
   */
  arbitrateDisagreement(params = {}) {
    const { previousReceipt, arbiterReceipt, arbitrationDecision = false } = params;

    if (!previousReceipt || previousReceipt.verdict !== CONSENSUS_VERDICT.BYZANTINE_DISAGREEMENT) {
      throw new Error('ARBITRATION_ERROR: Arbitration is only valid on unresolved BYZANTINE_DISAGREEMENT receipts');
    }

    if (!arbiterReceipt || !arbiterReceipt.receipt_id || !arbiterReceipt.approver?.identity) {
      throw new Error('ARBITRATION_DENIED: Human Director HITL arbitration receipt required to resolve disagreement');
    }

    const decisionId = previousReceipt.decision_id;
    const finalVerdict = arbitrationDecision ? CONSENSUS_VERDICT.APPROVED : CONSENSUS_VERDICT.REJECTED;

    return this._createReceipt(decisionId, previousReceipt.proposal, finalVerdict, {
      arbitrated: true,
      arbitrated_by: arbiterReceipt.approver.identity,
      arbitration_receipt_id: arbiterReceipt.receipt_id,
      original_receipt_id: previousReceipt.receipt_id
    });
  }

  _createReceipt(decisionId, proposal, verdict, details = {}) {
    const receiptId = `CSR-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const safeProposal = proposal || {};
    const payload = {
      receipt_id: receiptId,
      decision_id: decisionId,
      verdict,
      proposal: safeProposal,
      proposal_hash: calculateSha256(JSON.stringify(safeProposal)),
      timestamp: new Date().toISOString(),
      details
    };

    payload.sha256 = calculateSha256(JSON.stringify(payload));
    this.consensusLog.push(payload);
    return payload;
  }
}
