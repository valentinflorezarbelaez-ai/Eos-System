/**
 * @file tests/eos-bu-dynamic-consensus-orchestration-port.test.js
 * SPEC-0078 / Mission BU — Multi-Agent Consensus Orchestration Gate & Escalation Fabric Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Proposal submission and baseline governance
 * - Quorum policies: UNANIMITY, MAJORITY, and K_OF_N
 * - Authorized and attested vote casting
 * - Duplicate vote and unauthorized voter fail-closed rejection
 * - Consensus evaluation and rejection thresholds
 * - Deadlock escalation by authorized authority
 * - Fundacion ALWAYS_DENY write barrier enforcement
 * - Sealed BU-RCPT-* receipts & cryptographic trail custody verification
 * - Non-claim bounds and Law VI compliance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createConsensusOrchestrationPort,
  buildConsensusOrchestrationReceipt,
  verifyConsensusOrchestrationReceipt,
  isFundacionTarget,
  QUORUM_POLICIES,
  PROPOSAL_OUTCOMES,
  BU_PRODUCTION_READY,
  BU_RECEIPT_KIND,
  BU_CODES,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/dynamic-consensus-orchestration-port.js';

describe('SPEC-0078 Mission BU — Consensus Orchestration Gate & Escalation Fabric', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createConsensusOrchestrationPort({
      now: () => new Date(simulatedTime).toISOString(),
      escalationAuthorities: ['operator-root', 'governance-escalation-key']
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BU_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and rejected', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/consensus.json'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/orchestration'), false);
    });
  });

  describe('2. Consensus Proposal Submission (REQ-EARS-BU-01)', () => {
    test('submits valid proposal with MAJORITY policy and sealed receipt', () => {
      const res = port.submitProposal({
        proposalId: 'prop-deploy-sensor-01',
        action: 'deploy.sensor.module',
        voters: ['agent-alpha', 'agent-beta', 'agent-gamma'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });

      assert.equal(res.ok, true);
      assert.equal(res.code, BU_CODES.SUBMIT_OK);
      assert.equal(res.proposal.proposalId, 'prop-deploy-sensor-01');
      assert.equal(res.proposal.quorumPolicy, 'MAJORITY');
      assert.equal(res.proposal.voters.length, 3);
      assert.equal(res.fundacionDelta, 0);

      assert.ok(res.receipt);
      assert.ok(res.receipt.receiptId.startsWith('BU-RCPT-'));
      assert.equal(res.receipt.status, BU_CODES.SUBMIT_OK);
      assert.equal(res.receipt.outcome, PROPOSAL_OUTCOMES.PENDING);

      const v = verifyConsensusOrchestrationReceipt(res.receipt);
      assert.equal(v.ok, true);
    });

    test('rejects malformed proposal payload', () => {
      const res1 = port.submitProposal(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BU_CODES.MALFORMED_PROPOSAL_DENY);

      const res2 = port.submitProposal({ proposalId: '', action: 'act', voters: ['a'] });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BU_CODES.MALFORMED_PROPOSAL_DENY);

      const res3 = port.submitProposal({ proposalId: 'p1', action: 'act', voters: [] });
      assert.equal(res3.ok, false);
      assert.equal(res3.code, BU_CODES.MALFORMED_PROPOSAL_DENY);
    });

    test('triggers FUNDACION_ALWAYS_DENY on proposal targeting Fundacion', () => {
      const res = port.submitProposal({
        proposalId: 'prop-fundacion-override',
        action: 'write.fundacion.artifacts',
        target: 'C:/Users/valen/Documents/Fundacion/deploy',
        voters: ['agent-1', 'agent-2']
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BU_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
    });
  });

  describe('3. Attestation-Verified Vote Casting (REQ-EARS-BU-02)', () => {
    beforeEach(() => {
      port.submitProposal({
        proposalId: 'prop-vote-test',
        action: 'system.upgrade',
        voters: ['agent-1', 'agent-2', 'agent-3'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });
    });

    test('records valid vote and emits receipt', () => {
      const vote = port.castVote('prop-vote-test', {
        agentId: 'agent-1',
        vote: 'APPROVE',
        rationale: 'All checks verified'
      });

      assert.equal(vote.ok, true);
      assert.equal(vote.code, BU_CODES.VOTE_CAST_OK);
      assert.equal(vote.tally.approvedCount, 1);
      assert.equal(vote.tally.rejectedCount, 0);
      assert.ok(vote.receipt);
    });

    test('rejects unauthorized voter not declared on roster (UNAUTHORIZED_VOTER_DENY)', () => {
      const vote = port.castVote('prop-vote-test', {
        agentId: 'agent-impostor',
        vote: 'APPROVE'
      });

      assert.equal(vote.ok, false);
      assert.equal(vote.code, BU_CODES.UNAUTHORIZED_VOTER_DENY);
    });

    test('rejects duplicate vote by same agent (DUPLICATE_VOTE_DENY)', () => {
      port.castVote('prop-vote-test', { agentId: 'agent-1', vote: 'APPROVE' });

      const dup = port.castVote('prop-vote-test', { agentId: 'agent-1', vote: 'APPROVE' });
      assert.equal(dup.ok, false);
      assert.equal(dup.code, BU_CODES.DUPLICATE_VOTE_DENY);
    });

    test('rejects unattested voter when attestation is required (UNATTESTED_VOTER_DENY)', () => {
      const vote = port.castVote(
        'prop-vote-test',
        { agentId: 'agent-2', vote: 'APPROVE', attested: false },
        { requireAttestation: true }
      );

      assert.equal(vote.ok, false);
      assert.equal(vote.code, BU_CODES.UNATTESTED_VOTER_DENY);
    });
  });

  describe('4. Quorum Evaluation & Fail-Closed Denial (REQ-EARS-BU-03)', () => {
    test('MAJORITY quorum: 2-of-3 approves -> CONSENSUS_APPROVED', () => {
      port.submitProposal({
        proposalId: 'prop-maj',
        action: 'database.patch',
        voters: ['agent-a', 'agent-b', 'agent-c'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });

      port.castVote('prop-maj', { agentId: 'agent-a', vote: 'APPROVE' });
      port.castVote('prop-maj', { agentId: 'agent-b', vote: 'APPROVE' });

      const evalRes = port.evaluateConsensus('prop-maj');
      assert.equal(evalRes.ok, true);
      assert.equal(evalRes.code, BU_CODES.CONSENSUS_APPROVED);
      assert.equal(evalRes.outcome, PROPOSAL_OUTCOMES.CONSENSUS_APPROVED);
    });

    test('UNANIMITY quorum: 1 reject out of 3 fails consensus (PROPOSAL_REJECTED_DENY)', () => {
      port.submitProposal({
        proposalId: 'prop-unan',
        action: 'security.policy.change',
        voters: ['agent-1', 'agent-2', 'agent-3'],
        quorumPolicy: QUORUM_POLICIES.UNANIMITY
      });

      port.castVote('prop-unan', { agentId: 'agent-1', vote: 'APPROVE' });
      port.castVote('prop-unan', { agentId: 'agent-2', vote: 'REJECT', rationale: 'Audit gap' });

      const evalRes = port.evaluateConsensus('prop-unan');
      assert.equal(evalRes.ok, false);
      assert.equal(evalRes.code, BU_CODES.PROPOSAL_REJECTED_DENY);
      assert.equal(evalRes.outcome, PROPOSAL_OUTCOMES.PROPOSAL_REJECTED);
    });

    test('K_OF_N quorum: 2-of-4 required, reaches consensus on 2 approves', () => {
      port.submitProposal({
        proposalId: 'prop-kofn',
        action: 'cache.flush',
        voters: ['a1', 'a2', 'a3', 'a4'],
        quorumPolicy: QUORUM_POLICIES.K_OF_N,
        k: 2
      });

      port.castVote('prop-kofn', { agentId: 'a1', vote: 'APPROVE' });
      port.castVote('prop-kofn', { agentId: 'a2', vote: 'APPROVE' });

      const evalRes = port.evaluateConsensus('prop-kofn');
      assert.equal(evalRes.ok, true);
      assert.equal(evalRes.code, BU_CODES.CONSENSUS_APPROVED);
    });

    test('QUORUM_NOT_MET_DENY when pending votes are needed', () => {
      port.submitProposal({
        proposalId: 'prop-pending',
        action: 'feature.toggle',
        voters: ['a1', 'a2', 'a3'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });

      port.castVote('prop-pending', { agentId: 'a1', vote: 'APPROVE' });

      const evalRes = port.evaluateConsensus('prop-pending');
      assert.equal(evalRes.ok, false);
      assert.equal(evalRes.code, BU_CODES.QUORUM_NOT_MET_DENY);
      assert.equal(evalRes.outcome, PROPOSAL_OUTCOMES.PENDING);
    });
  });

  describe('5. Deadlock Escalation Path (REQ-EARS-BU-04)', () => {
    beforeEach(() => {
      port.submitProposal({
        proposalId: 'prop-deadlock',
        action: 'critical.hotfix',
        voters: ['agent-1', 'agent-2'],
        quorumPolicy: QUORUM_POLICIES.UNANIMITY
      });
      port.castVote('prop-deadlock', { agentId: 'agent-1', vote: 'APPROVE' });
      port.castVote('prop-deadlock', { agentId: 'agent-2', vote: 'REJECT' });
    });

    test('escalates decision with authorized operator key (ESCALATED_OK)', () => {
      const esc = port.escalateDecision('prop-deadlock', {
        authorityId: 'operator-root',
        rationale: 'Security critical hotfix override',
        signature: 'SIG-ROOT-9900'
      });

      assert.equal(esc.ok, true);
      assert.equal(esc.code, BU_CODES.ESCALATED_OK);
      assert.equal(esc.outcome, PROPOSAL_OUTCOMES.ESCALATED);

      assert.ok(esc.receipt);
      assert.equal(esc.receipt.outcome, PROPOSAL_OUTCOMES.ESCALATED);
      assert.equal(esc.receipt.consensusSignature, 'SIG-ROOT-9900');
    });

    test('rejects escalation by unauthorized party (ESCALATION_UNAUTHORIZED_DENY)', () => {
      const esc = port.escalateDecision('prop-deadlock', {
        authorityId: 'unauthorized-user',
        rationale: 'Unauthorized attempt'
      });

      assert.equal(esc.ok, false);
      assert.equal(esc.code, BU_CODES.ESCALATION_UNAUTHORIZED_DENY);
    });
  });

  describe('6. Cryptographic Receipts & Trail Custody (REQ-EARS-BU-05)', () => {
    test('verifies intact receipt chain across proposal lifecycle', () => {
      const p = port.submitProposal({
        proposalId: 'prop-chain',
        action: 'routine.check',
        voters: ['v1', 'v2'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });
      assert.equal(p.ok, true);

      simulatedTime += 1000;
      const v1 = port.castVote('prop-chain', { agentId: 'v1', vote: 'APPROVE' });
      assert.equal(v1.ok, true);

      simulatedTime += 1000;
      const v2 = port.castVote('prop-chain', { agentId: 'v2', vote: 'APPROVE' });
      assert.equal(v2.ok, true);

      simulatedTime += 1000;
      const ev = port.evaluateConsensus('prop-chain');
      assert.equal(ev.ok, true);

      const trail = port.verifyConsensusTrail([
        p.receipt,
        v1.receipt,
        v2.receipt,
        ev.receipt
      ]);

      assert.equal(trail.ok, true);
      assert.equal(trail.code, BU_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 4);
    });

    test('fails trail verification on tampered receipt payload', () => {
      const p = port.submitProposal({
        proposalId: 'prop-tamper',
        action: 'routine.check',
        voters: ['v1'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });

      const tampered = { ...p.receipt, action: 'forged.action' };
      const trail = port.verifyConsensusTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BU_CODES.TRAIL_BREAK);
    });

    test('fails trail verification on broken prevReceiptHash link', () => {
      const p = port.submitProposal({
        proposalId: 'prop-link',
        action: 'routine.check',
        voters: ['v1'],
        quorumPolicy: QUORUM_POLICIES.MAJORITY
      });

      const v1 = port.castVote('prop-link', { agentId: 'v1', vote: 'APPROVE' });

      const forgedV1 = {
        ...v1.receipt,
        prevReceiptHash: '0000000000000000000000000000000000000000000000000000000000000000'
      };

      const trail = port.verifyConsensusTrail([p.receipt, forgedV1]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BU_CODES.TRAIL_BREAK);
    });
  });
});
