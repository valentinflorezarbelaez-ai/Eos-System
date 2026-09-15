/**
 * @module dynamic-consensus-orchestration-port
 * SPEC-0078 / Mission BU — Multi-Agent Consensus Orchestration Gate & Escalation Fabric.
 *
 * Facade: createConsensusOrchestrationPort({ now, hash, policyGate, attestationPort, escalationAuthorities })
 *   .submitProposal(payload)
 *   .castVote(proposalId, votePayload, opts)
 *   .evaluateConsensus(proposalId)
 *   .escalateDecision(proposalId, escalationPayload)
 *   .getProposalStatus(proposalId)
 *   .verifyConsensusTrail(receipts)
 *
 * Pure Layer-0 hermetic multi-agent consensus voting & deadlock escalation.
 * Emits cryptographically sealed BU-RCPT-* receipts via node:crypto.
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; quorum not met → QUORUM_NOT_MET_DENY;
 *   unauthorized voter → UNAUTHORIZED_VOTER_DENY; duplicate vote → DUPLICATE_VOTE_DENY;
 *   unattested voter → UNATTESTED_VOTER_DENY; proposal closed → PROPOSAL_CLOSED_DENY.
 *
 * NON-CLAIM:
 *   consensus port ≠ Raft/Paxos consensus cluster /
 *   ≠ Blockchain smart contracts /
 *   ≠ PRODUCTION_READY=YES distributed consensus product.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR, BS, BT done; BU in progress; BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BU_CEILING
 */

import {
  BU_PRODUCTION_READY as BU_RECEIPT_PR,
  BU_RECEIPT_KIND,
  BU_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalConsensusOrchestrationSealBody,
  hashConsensusOrchestrationReceipt,
  verifyConsensusOrchestrationReceipt,
  buildConsensusOrchestrationReceipt,
  _resetReceiptSeqForTests
} from './consensus-orchestration-receipt.js';

import {
  BU_POLICY_GATE_KIND,
  BU_POLICY_GATE_PRODUCTION_READY,
  BU_POLICY_CODES,
  QUORUM_POLICIES,
  PROPOSAL_OUTCOMES,
  deny,
  denyFundacion,
  isFundacionTarget,
  validateProposalPayload,
  validateVotePayload,
  tallyVotes,
  createConsensusOrchestrationPolicyGate
} from './consensus-orchestration-policy-gate.js';

/** @type {'NO'} */
export const BU_PRODUCTION_READY = 'NO';

export const BU_KIND = 'eos-dynamic-consensus-orchestration-port';

export const BU_CODES = Object.freeze({
  ...BU_POLICY_CODES,
  SUBMIT_OK: 'SUBMIT_OK',
  ESCALATED_OK: 'ESCALATED_OK',
  STATUS_GET_OK: 'STATUS_GET_OK'
});

export {
  BU_POLICY_CODES,
  BU_POLICY_GATE_KIND,
  BU_POLICY_GATE_PRODUCTION_READY,
  BU_RECEIPT_KIND,
  BU_RECEIPT_PRODUCTION_READY,
  BU_RECEIPT_PR,
  QUORUM_POLICIES,
  PROPOSAL_OUTCOMES,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalConsensusOrchestrationSealBody,
  hashConsensusOrchestrationReceipt,
  verifyConsensusOrchestrationReceipt,
  buildConsensusOrchestrationReceipt,
  _resetReceiptSeqForTests,
  isFundacionTarget,
  validateProposalPayload,
  validateVotePayload,
  tallyVotes
};

/**
 * Factory for Multi-Agent Consensus Orchestration Gate & Escalation Port.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.policyGate]
 * @param {object} [opts.attestationPort]
 * @param {boolean} [opts.requireAttestation]
 * @param {string[]} [opts.escalationAuthorities]
 * @returns {object}
 */
export function createConsensusOrchestrationPort(opts = {}) {
  const nowFn = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
  const hashFn = typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const policyGate = opts.policyGate || createConsensusOrchestrationPolicyGate();
  const defaultRequireAttestation = opts.requireAttestation === true;
  const escalationAuthorities = new Set(
    Array.isArray(opts.escalationAuthorities) ? opts.escalationAuthorities : ['operator-root', 'system-escalation-key']
  );

  /**
   * @type {Map<string, {
   *   proposal: object,
   *   votes: Map<string, object>,
   *   outcome: string,
   *   history: Array<object>,
   *   lastReceiptHash: string|null
   * }>}
   */
  const proposals = new Map();

  /**
   * Submit a new consensus proposal.
   * @param {object} rawPayload
   * @param {object} [submitOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, proposal?: object, receipt: object, fundacionDelta: 0 }}
   */
  function submitProposal(rawPayload, submitOpts = {}) {
    const timestamp = String(nowFn());
    const val = policyGate.validateProposalPayload(rawPayload);

    if (!val.ok) {
      const fallbackId =
        rawPayload && typeof rawPayload === 'object' && rawPayload.proposalId
          ? String(rawPayload.proposalId)
          : 'PROP-UNKNOWN';

      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: fallbackId,
          action: 'unknown',
          quorumPolicy: 'UNKNOWN',
          tallyDigest: null,
          outcome: 'DENIED',
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: val.code || BU_CODES.MALFORMED_PROPOSAL_DENY,
        reason: val.reason || 'invalid proposal payload',
        receipt,
        fundacionDelta: 0
      };
    }

    const clean = val.cleanProposal;
    const initialTally = { approved: 0, rejected: 0, total: clean.voters.length };
    const tallyDigest = hashFn(initialTally);

    const receipt = buildConsensusOrchestrationReceipt(
      {
        proposalId: clean.proposalId,
        action: clean.action,
        quorumPolicy: clean.quorumPolicy,
        tallyDigest,
        outcome: PROPOSAL_OUTCOMES.PENDING,
        status: BU_CODES.SUBMIT_OK,
        timestamp,
        consensusSignature: submitOpts.consensusSignature || null,
        prevReceiptHash: null
      },
      { hash: hashFn, now: nowFn }
    );

    const record = {
      proposal: clean,
      votes: new Map(),
      outcome: PROPOSAL_OUTCOMES.PENDING,
      history: [receipt],
      lastReceiptHash: receipt.receiptHash
    };

    proposals.set(clean.proposalId, record);

    return {
      ok: true,
      allow: true,
      code: BU_CODES.SUBMIT_OK,
      proposal: clean,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Cast an attested vote on an active proposal.
   * @param {string} proposalId
   * @param {object} rawVote
   * @param {object} [voteOpts]
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, outcome?: string, tally?: object, receipt: object, fundacionDelta: 0 }}
   */
  function castVote(proposalId, rawVote, voteOpts = {}) {
    const timestamp = String(nowFn());
    const propRecord = proposals.get(String(proposalId).trim());

    if (!propRecord) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: String(proposalId),
          action: 'unknown',
          quorumPolicy: 'UNKNOWN',
          tallyDigest: null,
          outcome: 'DENIED',
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.UNKNOWN_PROPOSAL_DENY,
        reason: `proposal '${proposalId}' not found`,
        receipt,
        fundacionDelta: 0
      };
    }

    if (propRecord.outcome !== PROPOSAL_OUTCOMES.PENDING) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: propRecord.proposal.proposalId,
          action: propRecord.proposal.action,
          quorumPolicy: propRecord.proposal.quorumPolicy,
          tallyDigest: null,
          outcome: propRecord.outcome,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: propRecord.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.PROPOSAL_CLOSED_DENY,
        reason: `proposal '${propRecord.proposal.proposalId}' is already closed with outcome '${propRecord.outcome}'`,
        receipt,
        fundacionDelta: 0
      };
    }

    const voterId = rawVote && typeof rawVote === 'object' && rawVote.agentId ? String(rawVote.agentId).trim() : '';
    if (propRecord.votes.has(voterId)) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: propRecord.proposal.proposalId,
          action: propRecord.proposal.action,
          quorumPolicy: propRecord.proposal.quorumPolicy,
          tallyDigest: null,
          outcome: propRecord.outcome,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: propRecord.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.DUPLICATE_VOTE_DENY,
        reason: `agent '${voterId}' has already cast a vote on proposal '${propRecord.proposal.proposalId}'`,
        receipt,
        fundacionDelta: 0
      };
    }

    const requireAttestation = voteOpts.requireAttestation ?? defaultRequireAttestation;
    const voteCheck = policyGate.validateVotePayload(propRecord.proposal, rawVote, requireAttestation);

    if (!voteCheck.ok) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: propRecord.proposal.proposalId,
          action: propRecord.proposal.action,
          quorumPolicy: propRecord.proposal.quorumPolicy,
          tallyDigest: null,
          outcome: propRecord.outcome,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: propRecord.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: voteCheck.code,
        reason: voteCheck.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    // Record valid vote
    const cleanVote = voteCheck.cleanVote;
    propRecord.votes.set(cleanVote.agentId, cleanVote);

    // Tally current state
    const tally = policyGate.tallyVotes(propRecord.proposal, propRecord.votes);
    if (tally.isResolved) {
      propRecord.outcome = tally.outcome;
    }

    const tallyDigest = hashFn(tally);

    const receipt = buildConsensusOrchestrationReceipt(
      {
        proposalId: propRecord.proposal.proposalId,
        action: propRecord.proposal.action,
        quorumPolicy: propRecord.proposal.quorumPolicy,
        tallyDigest,
        outcome: propRecord.outcome,
        status: BU_CODES.VOTE_CAST_OK,
        timestamp,
        consensusSignature: cleanVote.signature || null,
        prevReceiptHash: propRecord.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    propRecord.history.push(receipt);
    propRecord.lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BU_CODES.VOTE_CAST_OK,
      outcome: propRecord.outcome,
      tally,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Evaluate consensus resolution for a proposal.
   * @param {string} proposalId
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, outcome: string, tally: object, receipt: object, fundacionDelta: 0 }}
   */
  function evaluateConsensus(proposalId) {
    const timestamp = String(nowFn());
    const propRecord = proposals.get(String(proposalId).trim());

    if (!propRecord) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: String(proposalId),
          action: 'unknown',
          quorumPolicy: 'UNKNOWN',
          tallyDigest: null,
          outcome: 'DENIED',
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.UNKNOWN_PROPOSAL_DENY,
        reason: `proposal '${proposalId}' not found`,
        outcome: 'UNKNOWN',
        tally: null,
        receipt,
        fundacionDelta: 0
      };
    }

    const tally = policyGate.tallyVotes(propRecord.proposal, propRecord.votes);
    if (tally.isResolved) {
      propRecord.outcome = tally.outcome;
    }

    const tallyDigest = hashFn(tally);

    const isApproved = propRecord.outcome === PROPOSAL_OUTCOMES.CONSENSUS_APPROVED;
    const isRejected = propRecord.outcome === PROPOSAL_OUTCOMES.PROPOSAL_REJECTED;

    const code = isApproved
      ? BU_CODES.CONSENSUS_APPROVED
      : isRejected
        ? BU_CODES.PROPOSAL_REJECTED_DENY
        : BU_CODES.QUORUM_NOT_MET_DENY;

    const receipt = buildConsensusOrchestrationReceipt(
      {
        proposalId: propRecord.proposal.proposalId,
        action: propRecord.proposal.action,
        quorumPolicy: propRecord.proposal.quorumPolicy,
        tallyDigest,
        outcome: propRecord.outcome,
        status: code,
        timestamp,
        consensusSignature: null,
        prevReceiptHash: propRecord.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    propRecord.history.push(receipt);
    propRecord.lastReceiptHash = receipt.receiptHash;

    return {
      ok: isApproved,
      allow: isApproved,
      code,
      reason: isApproved
        ? 'consensus quorum approved'
        : isRejected
          ? 'consensus proposal rejected by votes'
          : 'consensus quorum not yet met',
      outcome: propRecord.outcome,
      tally,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Escalate an unresolved or deadlocked proposal.
   * @param {string} proposalId
   * @param {object} escalationPayload
   * @returns {{ ok: boolean, allow: boolean, code: string, reason?: string, outcome: string, receipt: object, fundacionDelta: 0 }}
   */
  function escalateDecision(proposalId, escalationPayload = {}) {
    const timestamp = String(nowFn());
    const propRecord = proposals.get(String(proposalId).trim());

    if (!propRecord) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: String(proposalId),
          action: 'unknown',
          quorumPolicy: 'UNKNOWN',
          tallyDigest: null,
          outcome: 'DENIED',
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: null
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.UNKNOWN_PROPOSAL_DENY,
        reason: `proposal '${proposalId}' not found`,
        outcome: 'UNKNOWN',
        receipt,
        fundacionDelta: 0
      };
    }

    const authId =
      typeof escalationPayload.authorityId === 'string' ? escalationPayload.authorityId.trim() : '';

    if (!authId || !escalationAuthorities.has(authId)) {
      const receipt = buildConsensusOrchestrationReceipt(
        {
          proposalId: propRecord.proposal.proposalId,
          action: propRecord.proposal.action,
          quorumPolicy: propRecord.proposal.quorumPolicy,
          tallyDigest: null,
          outcome: propRecord.outcome,
          status: 'DENIED',
          timestamp,
          consensusSignature: null,
          prevReceiptHash: propRecord.lastReceiptHash
        },
        { hash: hashFn, now: nowFn }
      );

      return {
        ok: false,
        allow: false,
        code: BU_CODES.ESCALATION_UNAUTHORIZED_DENY,
        reason: `authority '${authId}' is not authorized to escalate consensus decisions`,
        outcome: propRecord.outcome,
        receipt,
        fundacionDelta: 0
      };
    }

    propRecord.outcome = PROPOSAL_OUTCOMES.ESCALATED;

    const consensusSig =
      typeof escalationPayload.signature === 'string' && escalationPayload.signature.trim() !== ''
        ? escalationPayload.signature.trim()
        : `ESCALATION-SIG-${authId}`;

    const receipt = buildConsensusOrchestrationReceipt(
      {
        proposalId: propRecord.proposal.proposalId,
        action: propRecord.proposal.action,
        quorumPolicy: propRecord.proposal.quorumPolicy,
        tallyDigest: hashFn({ escalatedBy: authId, rationale: escalationPayload.rationale || 'deadlock override' }),
        outcome: PROPOSAL_OUTCOMES.ESCALATED,
        status: BU_CODES.ESCALATED_OK,
        timestamp,
        consensusSignature: consensusSig,
        prevReceiptHash: propRecord.lastReceiptHash
      },
      { hash: hashFn, now: nowFn }
    );

    propRecord.history.push(receipt);
    propRecord.lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      code: BU_CODES.ESCALATED_OK,
      reason: `proposal escalated by authorized authority '${authId}'`,
      outcome: PROPOSAL_OUTCOMES.ESCALATED,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Get proposal status and vote summary.
   * @param {string} proposalId
   * @returns {{ ok: boolean, code: string, status?: object, reason?: string }}
   */
  function getProposalStatus(proposalId) {
    const propRecord = proposals.get(String(proposalId).trim());
    if (!propRecord) {
      return {
        ok: false,
        code: BU_CODES.UNKNOWN_PROPOSAL_DENY,
        reason: `proposal '${proposalId}' not found`
      };
    }

    return {
      ok: true,
      code: BU_CODES.STATUS_GET_OK,
      status: {
        proposalId: propRecord.proposal.proposalId,
        action: propRecord.proposal.action,
        quorumPolicy: propRecord.proposal.quorumPolicy,
        outcome: propRecord.outcome,
        voters: propRecord.proposal.voters,
        votesCast: propRecord.votes.size,
        historyCount: propRecord.history.length
      }
    };
  }

  /**
   * Verify an execution consensus trail of receipts for cryptographic integrity.
   * @param {Array<object>} receiptsToVerify
   * @param {(payload: unknown) => string} [customHash]
   * @returns {{ ok: boolean, code: string, verifiedCount: number, error?: string }}
   */
  function verifyConsensusTrail(receiptsToVerify, customHash = hashFn) {
    if (!Array.isArray(receiptsToVerify) || receiptsToVerify.length === 0) {
      return {
        ok: false,
        code: BU_CODES.TRAIL_BREAK,
        verifiedCount: 0,
        error: 'receipts list is empty or not an array'
      };
    }

    let prevHash = null;
    let verifiedCount = 0;

    for (let i = 0; i < receiptsToVerify.length; i++) {
      const r = receiptsToVerify[i];
      const check = verifyConsensusOrchestrationReceipt(r, customHash);
      if (!check.ok) {
        return {
          ok: false,
          code: BU_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `receipt at index ${i} failed hash check: ${check.reason}`
        };
      }

      if (i > 0 && r.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BU_CODES.TRAIL_BREAK,
          verifiedCount,
          error: `chain break at index ${i}: prevReceiptHash '${r.prevReceiptHash}' does not match previous receiptHash '${prevHash}'`
        };
      }

      prevHash = r.receiptHash;
      verifiedCount++;
    }

    return {
      ok: true,
      code: BU_CODES.TRAIL_OK,
      verifiedCount
    };
  }

  /**
   * Reset internal state (for testing).
   */
  function _resetForTests() {
    proposals.clear();
    _resetReceiptSeqForTests();
  }

  return Object.freeze({
    kind: BU_KIND,
    productionReady: BU_PRODUCTION_READY,
    submitProposal,
    castVote,
    evaluateConsensus,
    escalateDecision,
    getProposalStatus,
    verifyConsensusTrail,
    _resetForTests
  });
}
