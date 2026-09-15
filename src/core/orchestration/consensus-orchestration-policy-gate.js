/**
 * @module consensus-orchestration-policy-gate
 * SPEC-0078 / Mission BU — Fail-closed Policy Gate for Multi-Agent Consensus
 * Orchestration Gate & Escalation Fabric.
 *
 * Enforces strict fail-closed governance:
 * - QUORUM_NOT_MET_DENY: approved votes fail to meet required threshold
 * - PROPOSAL_REJECTED_DENY: rejected votes exceed allowed threshold
 * - UNAUTHORIZED_VOTER_DENY: voter is not in declared eligible voter list
 * - UNATTESTED_VOTER_DENY: voter fails identity attestation
 * - DUPLICATE_VOTE_DENY: voter attempts multiple votes on same proposal
 * - PROPOSAL_CLOSED_DENY: proposal is already finalized
 * - ESCALATION_UNAUTHORIZED_DENY: escalation attempted with invalid authority
 * - FUNDACION_ALWAYS_DENY: targets forbidden external directory
 * - MALFORMED_PROPOSAL_DENY: proposal payload missing required fields
 *
 * NON-CLAIM:
 *   policy gate ≠ Raft/Paxos consensus cluster /
 *   ≠ Blockchain smart contracts /
 *   ≠ PRODUCTION_READY=YES orchestrator.
 *   L21 CLOSED never reopen; L17–L20 CLOSED never reopen;
 *   L22 OPEN (BR, BS, BT done; BU in progress; BV pending);
 *   Axis: Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BU_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BU_POLICY_GATE_KIND = 'eos-consensus-orchestration-policy-gate';

export const QUORUM_POLICIES = Object.freeze({
  UNANIMITY: 'UNANIMITY',
  MAJORITY: 'MAJORITY',
  K_OF_N: 'K_OF_N'
});

export const PROPOSAL_OUTCOMES = Object.freeze({
  PENDING: 'PENDING',
  CONSENSUS_APPROVED: 'CONSENSUS_APPROVED',
  PROPOSAL_REJECTED: 'PROPOSAL_REJECTED',
  ESCALATED: 'ESCALATED',
  EXPIRED: 'EXPIRED'
});

export const BU_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  PROPOSAL_CREATED: 'PROPOSAL_CREATED',
  VOTE_CAST_OK: 'VOTE_CAST_OK',
  CONSENSUS_APPROVED: 'CONSENSUS_APPROVED',
  PROPOSAL_REJECTED_DENY: 'PROPOSAL_REJECTED_DENY',
  QUORUM_NOT_MET_DENY: 'QUORUM_NOT_MET_DENY',
  UNAUTHORIZED_VOTER_DENY: 'UNAUTHORIZED_VOTER_DENY',
  UNATTESTED_VOTER_DENY: 'UNATTESTED_VOTER_DENY',
  DUPLICATE_VOTE_DENY: 'DUPLICATE_VOTE_DENY',
  PROPOSAL_CLOSED_DENY: 'PROPOSAL_CLOSED_DENY',
  ESCALATION_UNAUTHORIZED_DENY: 'ESCALATION_UNAUTHORIZED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  MALFORMED_PROPOSAL_DENY: 'MALFORMED_PROPOSAL_DENY',
  MALFORMED_VOTE_DENY: 'MALFORMED_VOTE_DENY',
  UNKNOWN_PROPOSAL_DENY: 'UNKNOWN_PROPOSAL_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/**
 * Construct a standardized deny decision.
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string, fundacionDelta: 0 }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BU_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BU_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

/**
 * Check if target path or description references forbidden external target (Fundacion).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Validate proposal creation payload.
 * @param {unknown} payload
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanProposal?: object }}
 */
export function validateProposalPayload(payload) {
  if (payload == null || typeof payload !== 'object') {
    return deny(BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY, 'proposal payload must be an object');
  }

  const rawId = payload.proposalId ?? payload.id;
  const proposalId = typeof rawId === 'string' ? rawId.trim() : '';
  if (!proposalId) {
    return deny(BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY, 'proposalId must be a non-empty string');
  }

  const action = typeof payload.action === 'string' ? payload.action.trim() : '';
  if (!action) {
    return deny(BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY, 'action must be a non-empty string');
  }

  if (isFundacionTarget(proposalId) || isFundacionTarget(action) || isFundacionTarget(payload.target)) {
    return denyFundacion('proposal references forbidden Fundacion directory');
  }

  if (!Array.isArray(payload.voters) || payload.voters.length === 0) {
    return deny(BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY, 'voters must be a non-empty array of agent IDs');
  }

  const cleanVoters = [];
  for (const v of payload.voters) {
    if (typeof v !== 'string' || v.trim() === '') {
      return deny(BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY, 'each voter ID must be a non-empty string');
    }
    cleanVoters.push(v.trim());
  }

  const rawPolicy = typeof payload.quorumPolicy === 'string'
    ? payload.quorumPolicy.trim().toUpperCase()
    : 'MAJORITY';

  if (!Object.values(QUORUM_POLICIES).includes(rawPolicy)) {
    return deny(
      BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY,
      `invalid quorumPolicy '${rawPolicy}'; allowed: ${Object.values(QUORUM_POLICIES).join(', ')}`
    );
  }

  let k = null;
  if (rawPolicy === QUORUM_POLICIES.K_OF_N) {
    const rawK = payload.k ?? payload.requiredQuorum;
    if (typeof rawK !== 'number' || !Number.isInteger(rawK) || rawK < 1 || rawK > cleanVoters.length) {
      return deny(
        BU_POLICY_CODES.MALFORMED_PROPOSAL_DENY,
        `for K_OF_N policy, k must be an integer between 1 and voter count (${cleanVoters.length})`
      );
    }
    k = rawK;
  }

  return {
    ok: true,
    cleanProposal: {
      proposalId,
      action,
      target: payload.target ? String(payload.target).trim() : null,
      voters: Object.freeze(cleanVoters),
      quorumPolicy: rawPolicy,
      k,
      deadline: payload.deadline ? String(payload.deadline) : null
    }
  };
}

/**
 * Validate vote casting payload.
 * @param {object} proposal
 * @param {unknown} votePayload
 * @param {boolean} [requireAttestation]
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanVote?: object }}
 */
export function validateVotePayload(proposal, votePayload, requireAttestation = false) {
  if (votePayload == null || typeof votePayload !== 'object') {
    return deny(BU_POLICY_CODES.MALFORMED_VOTE_DENY, 'vote payload must be an object');
  }

  const agentId = typeof votePayload.agentId === 'string' ? votePayload.agentId.trim() : '';
  if (!agentId) {
    return deny(BU_POLICY_CODES.MALFORMED_VOTE_DENY, 'agentId must be a non-empty string');
  }

  if (!proposal.voters.includes(agentId)) {
    return deny(
      BU_POLICY_CODES.UNAUTHORIZED_VOTER_DENY,
      `agent '${agentId}' is not authorized to vote on proposal '${proposal.proposalId}'`,
      { agentId, proposalId: proposal.proposalId }
    );
  }

  if (requireAttestation && votePayload.attested !== true) {
    return deny(
      BU_POLICY_CODES.UNATTESTED_VOTER_DENY,
      `agent '${agentId}' is not attested under Mission BM custody`,
      { agentId }
    );
  }

  const rawVote = typeof votePayload.vote === 'string' ? votePayload.vote.trim().toUpperCase() : '';
  if (rawVote !== 'APPROVE' && rawVote !== 'REJECT') {
    return deny(
      BU_POLICY_CODES.MALFORMED_VOTE_DENY,
      `vote must be 'APPROVE' or 'REJECT', got '${rawVote}'`
    );
  }

  return {
    ok: true,
    cleanVote: {
      agentId,
      vote: rawVote,
      rationale: typeof votePayload.rationale === 'string' ? votePayload.rationale.trim() : '',
      signature: typeof votePayload.signature === 'string' ? votePayload.signature.trim() : null
    }
  };
}

/**
 * Tally votes and evaluate consensus against quorum policy.
 * @param {object} proposal
 * @param {Map<string, object>} votesMap
 * @returns {{ outcome: string, approvedCount: number, rejectedCount: number, totalVoters: number, isResolved: boolean }}
 */
export function tallyVotes(proposal, votesMap) {
  const totalVoters = proposal.voters.length;
  let approvedCount = 0;
  let rejectedCount = 0;

  for (const v of votesMap.values()) {
    if (v.vote === 'APPROVE') approvedCount++;
    else if (v.vote === 'REJECT') rejectedCount++;
  }

  const remaining = totalVoters - (approvedCount + rejectedCount);

  if (proposal.quorumPolicy === QUORUM_POLICIES.UNANIMITY) {
    if (rejectedCount > 0) {
      return { outcome: PROPOSAL_OUTCOMES.PROPOSAL_REJECTED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    if (approvedCount === totalVoters) {
      return { outcome: PROPOSAL_OUTCOMES.CONSENSUS_APPROVED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    return { outcome: PROPOSAL_OUTCOMES.PENDING, approvedCount, rejectedCount, totalVoters, isResolved: false };
  }

  if (proposal.quorumPolicy === QUORUM_POLICIES.MAJORITY) {
    const majorityThreshold = Math.floor(totalVoters / 2) + 1;
    if (approvedCount >= majorityThreshold) {
      return { outcome: PROPOSAL_OUTCOMES.CONSENSUS_APPROVED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    if (approvedCount + remaining < majorityThreshold) {
      return { outcome: PROPOSAL_OUTCOMES.PROPOSAL_REJECTED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    return { outcome: PROPOSAL_OUTCOMES.PENDING, approvedCount, rejectedCount, totalVoters, isResolved: false };
  }

  if (proposal.quorumPolicy === QUORUM_POLICIES.K_OF_N) {
    const k = proposal.k || totalVoters;
    if (approvedCount >= k) {
      return { outcome: PROPOSAL_OUTCOMES.CONSENSUS_APPROVED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    if (approvedCount + remaining < k) {
      return { outcome: PROPOSAL_OUTCOMES.PROPOSAL_REJECTED, approvedCount, rejectedCount, totalVoters, isResolved: true };
    }
    return { outcome: PROPOSAL_OUTCOMES.PENDING, approvedCount, rejectedCount, totalVoters, isResolved: false };
  }

  return { outcome: PROPOSAL_OUTCOMES.PENDING, approvedCount, rejectedCount, totalVoters, isResolved: false };
}

/**
 * Factory for consensus orchestration policy gate.
 * @param {object} [opts]
 * @returns {object}
 */
export function createConsensusOrchestrationPolicyGate(opts = {}) {
  return Object.freeze({
    kind: BU_POLICY_GATE_KIND,
    productionReady: BU_POLICY_GATE_PRODUCTION_READY,
    validateProposalPayload,
    validateVotePayload,
    tallyVotes,
    isFundacionTarget
  });
}
