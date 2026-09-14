/**
 * @module multi-agent-consensus-gate
 * SPEC-0072 / Mission BO — Multi-Agent Consensus & Two-Key Handoff Gate.
 *
 * Facade: createMultiAgentConsensusGate({ now, hash, custodyPort, handoffEnvelope })
 *   .submitProposal({ proposalId, builderAgentId, proposal, proposalHash?, evidenceHash? })
 *   .submitAttestation({ proposalId, verifierAgentId, decision, evidenceHash })
 *   .evaluateConsensus({ proposalId })
 *   .verifyReceiptTrail(receipts)
 *   .health() / .getState()
 *
 * Two-Key rule: builderAgentId !== verifierAgentId ALWAYS; self-verification DENY.
 * Pure Node.js: crypto only; no net/fs writes; Fundacion ALWAYS_DENY.
 *
 * Optional injectable ports (compose without rewriting siblings):
 *   custodyPort — { assertDisjunction|validate|assertBuilderVerifierDisjunction(req) }
 *                 mirrors src/core/governance/builder-verifier-custody.js
 *                 (and any builder-verifier-custody-gate.js if present — search host)
 *   handoffEnvelope — { validate|create(params) }
 *                 mirrors src/core/orchestration/agent-handoff-envelope.js
 *
 * NON-CLAIM:
 *   multi-agent consensus gate ≠ BFT/PoS/blockchain/P2P gossip /
 *   ≠ heavy Raft/Blockchain /
 *   ≠ PRODUCTION_READY=YES consensus product
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 CLOSED never reopen; L21 OPEN (BM MEASURED; BN MEASURED; BO in progress; BP–BQ pending);
 *   Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
 *   DO NOT rewrite byzantine-consensus-engine.js or siblings —
 *   BO ADDS two-key-* / multi-agent-consensus-gate.js under existing
 *   src/core/consensus/ (BI/BJ sibling-allow pattern).
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/consensus — BO owns two-key-* /
 * multi-agent-consensus-gate.js only.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BO_CEILING
 */

import {
  BO_PRODUCTION_READY as BO_RECEIPT_PR,
  BO_RECEIPT_KIND,
  BO_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalTwoKeySealBody,
  hashTwoKeyReceipt,
  verifyTwoKeyReceipt,
  buildTwoKeyReceipt,
  _resetReceiptSeqForTests
} from './two-key-consensus-receipt.js';

import {
  BO_POLICY_GATE_KIND,
  BO_POLICY_GATE_PRODUCTION_READY,
  BO_POLICY_CODES,
  deny,
  denyMalformed,
  denyFundacion,
  denySelfVerify,
  denyMissingVerifier,
  denyMissingBuilder,
  denyMissingEvidence,
  denyEvidenceMismatch,
  denyAttestationRejected,
  denyPolicy,
  isFundacionTarget,
  normalizeAgentId,
  isTwoKeyDisjunction,
  gateEvaluateConsensus,
  gateSubmitProposal,
  gateSubmitAttestation,
  createTwoKeyConsensusPolicyGate
} from './two-key-consensus-policy-gate.js';

/** @type {'NO'} */
export const BO_PRODUCTION_READY = 'NO';

export const BO_KIND = 'eos-multi-agent-consensus-gate';

export const BO_CODES = Object.freeze({
  ...BO_POLICY_CODES,
  CONSENSUS_GRANTED: 'CONSENSUS_GRANTED',
  CONSENSUS_DENIED: 'CONSENSUS_DENIED',
  PROPOSAL_ACCEPTED: 'PROPOSAL_ACCEPTED',
  ATTESTATION_ACCEPTED: 'ATTESTATION_ACCEPTED',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

export {
  BO_POLICY_CODES,
  BO_POLICY_GATE_KIND,
  BO_POLICY_GATE_PRODUCTION_READY,
  BO_RECEIPT_KIND,
  BO_RECEIPT_PRODUCTION_READY,
  BO_RECEIPT_PR,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalTwoKeySealBody,
  hashTwoKeyReceipt,
  verifyTwoKeyReceipt,
  buildTwoKeyReceipt,
  deny,
  denyMalformed,
  denyFundacion,
  denySelfVerify,
  denyMissingVerifier,
  denyMissingBuilder,
  denyMissingEvidence,
  denyEvidenceMismatch,
  denyAttestationRejected,
  denyPolicy,
  isFundacionTarget,
  normalizeAgentId,
  isTwoKeyDisjunction,
  gateEvaluateConsensus,
  gateSubmitProposal,
  gateSubmitAttestation,
  createTwoKeyConsensusPolicyGate,
  _resetReceiptSeqForTests
};

const AXIS =
  'Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric';

/**
 * Optionally consult custodyPort (builder-verifier-custody compose).
 * Never imports governance/ — injectable only.
 * @param {object|null} custodyPort
 * @param {string} builderAgentId
 * @param {string} verifierAgentId
 * @returns {{ ok: boolean, code?: string, reason?: string }}
 */
function consultCustodyPort(custodyPort, builderAgentId, verifierAgentId) {
  if (!custodyPort || typeof custodyPort !== 'object') {
    return { ok: true };
  }
  try {
    if (typeof custodyPort.assertBuilderVerifierDisjunction === 'function') {
      custodyPort.assertBuilderVerifierDisjunction({
        builder_id: builderAgentId,
        verifier_id: verifierAgentId
      });
      return { ok: true };
    }
    if (typeof custodyPort.assertDisjunction === 'function') {
      custodyPort.assertDisjunction({
        builder_id: builderAgentId,
        verifier_id: verifierAgentId,
        builderAgentId,
        verifierAgentId
      });
      return { ok: true };
    }
    if (typeof custodyPort.validate === 'function') {
      const r = custodyPort.validate({
        builder_id: builderAgentId,
        verifier_id: verifierAgentId,
        builderAgentId,
        verifierAgentId
      });
      if (r && (r.valid === false || r.ok === false)) {
        return {
          ok: false,
          code: r.code || BO_CODES.SELF_VERIFY_DENY,
          reason: r.error || r.reason || 'custodyPort DENY'
        };
      }
      return { ok: true };
    }
    if (typeof custodyPort.validateVerificationReceiptCustody === 'function') {
      const r = custodyPort.validateVerificationReceiptCustody({
        builder_id: builderAgentId,
        verifier_id: verifierAgentId
      });
      if (r && r.valid === false) {
        return {
          ok: false,
          code: r.code || BO_CODES.SELF_VERIFY_DENY,
          reason: r.error || 'custodyPort DENY'
        };
      }
      return { ok: true };
    }
  } catch (err) {
    return {
      ok: false,
      code:
        (err && err.code) || BO_CODES.SELF_VERIFY_DENY,
      reason:
        (err && err.message) || 'custodyPort threw — fail-closed'
    };
  }
  return { ok: true };
}

/**
 * Optionally consult handoffEnvelope (agent-handoff-envelope compose).
 * Never imports orchestration/ — injectable only.
 * @param {object|null} handoffEnvelope
 * @param {object} params
 * @returns {{ ok: boolean, code?: string, reason?: string }}
 */
function consultHandoffEnvelope(handoffEnvelope, params) {
  if (!handoffEnvelope || typeof handoffEnvelope !== 'object') {
    return { ok: true };
  }
  try {
    const envelopeParams = {
      sender_phase: 'builder',
      receiver_phase: 'verifier',
      transition: 'APPLY_TO_VERIFY',
      sender_agent_id: params.builderAgentId,
      receiver_agent_id: params.verifierAgentId,
      payload: {
        change_id: params.proposalId || 'bo-proposal',
        status: 'HANDOFF_PENDING'
      }
    };
    if (typeof handoffEnvelope.validate === 'function') {
      const r = handoffEnvelope.validate(envelopeParams);
      if (r && r.valid === false) {
        return {
          ok: false,
          code: BO_CODES.SELF_VERIFY_DENY,
          reason: (r.errors && r.errors.join('; ')) || 'handoffEnvelope DENY'
        };
      }
      return { ok: true };
    }
    if (typeof handoffEnvelope.create === 'function') {
      handoffEnvelope.create(envelopeParams);
      return { ok: true };
    }
  } catch (err) {
    return {
      ok: false,
      code: (err && err.code) || BO_CODES.SELF_VERIFY_DENY,
      reason: (err && err.message) || 'handoffEnvelope threw — fail-closed'
    };
  }
  return { ok: true };
}

/**
 * Create Multi-Agent Consensus & Two-Key Handoff Gate.
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.custodyPort]
 * @param {object} [opts.handoffEnvelope]
 * @param {boolean} [opts.throwOnDeny=false]
 * @returns {object}
 */
export function createMultiAgentConsensusGate(opts = {}) {
  const now =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;

  const ports = {
    custodyPort: opts.custodyPort || null,
    handoffEnvelope: opts.handoffEnvelope || null
  };

  /** @type {Map<string, object>} */
  const proposals = new Map();
  /** @type {Map<string, object>} */
  const attestations = new Map();
  let lastReceiptHash = null;
  /** @type {object[]} */
  const history = [];
  let proposalCount = 0;
  let attestationCount = 0;
  let evaluateCount = 0;
  let grantCount = 0;
  let denyCount = 0;

  function sealOutcome(body) {
    const receipt = buildTwoKeyReceipt(
      {
        ...body,
        prevReceiptHash:
          body.prevReceiptHash != null
            ? body.prevReceiptHash
            : lastReceiptHash
      },
      { now, hash: hashFn }
    );
    lastReceiptHash = receipt.receiptHash;
    history.push(receipt);
    if (history.length > 256) history.shift();
    return receipt;
  }

  /**
   * Submit a builder proposal (pending two-key attestation).
   * @param {object} [req]
   * @returns {object}
   */
  function submitProposal(req = {}) {
    proposalCount += 1;

    if (isFundacionTarget(req) || req.fundacion === true) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: req.proposalId != null ? String(req.proposalId) : null,
        builderAgentId:
          req.builderAgentId != null ? String(req.builderAgentId) : null,
        verifierAgentId: null,
        proposalHash: null,
        evidenceHash: null,
        reason: 'Fundacion ALWAYS_DENY'
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        fundacion: 'ALWAYS_DENY',
        hermetic: true,
        bftPosBlockchainP2pGossip: false,
        heavyRaftBlockchain: false,
        productionReadyYes: false,
        cloudAgent: false,
        consensusProduct: false
      };
    }

    const gate = gateSubmitProposal(req);
    if (!gate.ok) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: gate.code,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: req.proposalId != null ? String(req.proposalId) : null,
        builderAgentId:
          req.builderAgentId != null ? String(req.builderAgentId) : null,
        verifierAgentId: null,
        proposalHash: null,
        evidenceHash: null,
        reason: gate.reason
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: gate.code,
        reason: gate.reason,
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true
      };
    }

    const proposalId = String(req.proposalId);
    const builderAgentId = normalizeAgentId(req.builderAgentId);
    const proposalPayload =
      req.proposal != null ? req.proposal : req.payload != null ? req.payload : {};
    const proposalHash =
      req.proposalHash != null && String(req.proposalHash).length > 0
        ? String(req.proposalHash)
        : hashFn({ proposalId, builderAgentId, proposal: proposalPayload });
    const evidenceHash =
      req.evidenceHash != null && String(req.evidenceHash).length > 0
        ? String(req.evidenceHash)
        : req.expectedEvidenceHash != null
          ? String(req.expectedEvidenceHash)
          : null;

    proposals.set(proposalId, {
      proposalId,
      builderAgentId,
      proposal: proposalPayload,
      proposalHash,
      evidenceHash,
      submittedAt: String(now())
    });

    return {
      ok: true,
      deny: false,
      denied: false,
      code: BO_CODES.PROPOSAL_ACCEPTED,
      reason: null,
      proposalId,
      builderAgentId,
      proposalHash,
      evidenceHash,
      PRODUCTION_READY: BO_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      bftPosBlockchainP2pGossip: false,
      heavyRaftBlockchain: false,
      productionReadyYes: false,
      cloudAgent: false,
      consensusProduct: false
    };
  }

  /**
   * Submit a verifier attestation for a pending proposal.
   * @param {object} [req]
   * @returns {object}
   */
  function submitAttestation(req = {}) {
    attestationCount += 1;

    if (isFundacionTarget(req) || req.fundacion === true) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: req.proposalId != null ? String(req.proposalId) : null,
        builderAgentId: null,
        verifierAgentId:
          req.verifierAgentId != null ? String(req.verifierAgentId) : null,
        proposalHash: null,
        evidenceHash: null,
        reason: 'Fundacion ALWAYS_DENY'
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        fundacion: 'ALWAYS_DENY',
        hermetic: true
      };
    }

    const proposalId =
      req.proposalId != null ? String(req.proposalId) : '';
    const proposal = proposals.get(proposalId) || null;

    const gate = gateSubmitAttestation(req, {
      builderAgentId: proposal ? proposal.builderAgentId : req.builderAgentId
    });

    if (!gate.ok) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: gate.code,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: proposalId || null,
        builderAgentId: proposal ? proposal.builderAgentId : null,
        verifierAgentId:
          req.verifierAgentId != null ? String(req.verifierAgentId) : null,
        proposalHash: proposal ? proposal.proposalHash : null,
        evidenceHash:
          req.evidenceHash != null ? String(req.evidenceHash) : null,
        reason: gate.reason
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: gate.code,
        reason: gate.reason,
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true
      };
    }

    const verifierAgentId = normalizeAgentId(req.verifierAgentId);
    const decision = gate.decision || 'APPROVE';
    const evidenceHash =
      req.evidenceHash != null && String(req.evidenceHash).length > 0
        ? String(req.evidenceHash)
        : null;

    attestations.set(proposalId, {
      proposalId,
      verifierAgentId,
      decision,
      rejected: gate.rejected === true,
      evidenceHash,
      attestedAt: String(now())
    });

    return {
      ok: true,
      deny: false,
      denied: false,
      code: BO_CODES.ATTESTATION_ACCEPTED,
      reason: null,
      proposalId,
      verifierAgentId,
      decision,
      rejected: gate.rejected === true,
      evidenceHash,
      PRODUCTION_READY: BO_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      bftPosBlockchainP2pGossip: false,
      heavyRaftBlockchain: false,
      productionReadyYes: false,
      cloudAgent: false,
      consensusProduct: false
    };
  }

  /**
   * Evaluate two-key consensus for a proposal + attestation.
   * @param {object} [req]
   * @returns {object}
   */
  function evaluateConsensus(req = {}) {
    evaluateCount += 1;

    if (isFundacionTarget(req) || req.fundacion === true) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: req.proposalId != null ? String(req.proposalId) : null,
        builderAgentId: null,
        verifierAgentId: null,
        proposalHash: null,
        evidenceHash: null,
        reason: 'Fundacion ALWAYS_DENY'
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: BO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Fundacion ALWAYS_DENY',
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        fundacion: 'ALWAYS_DENY',
        hermetic: true,
        bftPosBlockchainP2pGossip: false,
        heavyRaftBlockchain: false,
        productionReadyYes: false,
        cloudAgent: false,
        consensusProduct: false
      };
    }

    const proposalId =
      req.proposalId != null ? String(req.proposalId) : '';
    const proposal = proposals.get(proposalId);
    const attestation = attestations.get(proposalId);

    // Allow inline evaluate without prior submit (test convenience)
    const builderAgentId = normalizeAgentId(
      req.builderAgentId != null
        ? req.builderAgentId
        : proposal
          ? proposal.builderAgentId
          : ''
    );
    const verifierAgentId = normalizeAgentId(
      req.verifierAgentId != null
        ? req.verifierAgentId
        : attestation
          ? attestation.verifierAgentId
          : ''
    );
    const proposalHash =
      req.proposalHash != null
        ? String(req.proposalHash)
        : proposal
          ? proposal.proposalHash
          : null;
    const evidenceHash =
      req.evidenceHash != null
        ? String(req.evidenceHash)
        : attestation && attestation.evidenceHash
          ? attestation.evidenceHash
          : proposal && proposal.evidenceHash
            ? proposal.evidenceHash
            : null;
    const expectedEvidenceHash =
      req.expectedEvidenceHash != null
        ? String(req.expectedEvidenceHash)
        : proposal && proposal.evidenceHash
          ? proposal.evidenceHash
          : evidenceHash;
    const decision =
      req.decision != null
        ? String(req.decision)
        : attestation
          ? attestation.decision
          : 'APPROVE';
    const rejected =
      req.rejected === true ||
      (attestation && attestation.rejected === true) ||
      String(decision).toUpperCase() === 'REJECT' ||
      String(decision).toUpperCase() === 'REJECTED';

    const gate = gateEvaluateConsensus(
      {
        ...req,
        builderAgentId,
        verifierAgentId,
        evidenceHash,
        expectedEvidenceHash,
        decision: rejected ? 'REJECT' : decision,
        rejected,
        proposalId
      },
      {
        builderAgentId,
        verifierAgentId,
        evidenceHash,
        expectedEvidenceHash,
        decision: rejected ? 'REJECT' : decision,
        rejected
      }
    );

    if (!gate.ok) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: gate.code,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: proposalId || null,
        builderAgentId: builderAgentId || null,
        verifierAgentId: verifierAgentId || null,
        proposalHash,
        evidenceHash,
        reason: gate.reason
      });
      const out = {
        ok: false,
        deny: true,
        denied: true,
        code: gate.code,
        reason: gate.reason,
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        bftPosBlockchainP2pGossip: false,
        heavyRaftBlockchain: false,
        productionReadyYes: false,
        cloudAgent: false,
        consensusProduct: false
      };
      if (opts.throwOnDeny) {
        const err = new Error(String(gate.reason || gate.code));
        err.code = gate.code;
        throw err;
      }
      return out;
    }

    // Optional injectable ports — compose without rewrite
    const custody = consultCustodyPort(
      ports.custodyPort,
      builderAgentId,
      verifierAgentId
    );
    if (!custody.ok) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: custody.code || BO_CODES.SELF_VERIFY_DENY,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: proposalId || null,
        builderAgentId,
        verifierAgentId,
        proposalHash,
        evidenceHash,
        reason: custody.reason || 'custodyPort DENY'
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: custody.code || BO_CODES.SELF_VERIFY_DENY,
        reason: custody.reason || 'custodyPort DENY',
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true
      };
    }

    const handoff = consultHandoffEnvelope(ports.handoffEnvelope, {
      builderAgentId,
      verifierAgentId,
      proposalId
    });
    if (!handoff.ok) {
      denyCount += 1;
      const receipt = sealOutcome({
        ok: false,
        deny: true,
        code: handoff.code || BO_CODES.SELF_VERIFY_DENY,
        consensusStatus: 'CONSENSUS_DENIED',
        proposalId: proposalId || null,
        builderAgentId,
        verifierAgentId,
        proposalHash,
        evidenceHash,
        reason: handoff.reason || 'handoffEnvelope DENY'
      });
      return {
        ok: false,
        deny: true,
        denied: true,
        code: handoff.code || BO_CODES.SELF_VERIFY_DENY,
        reason: handoff.reason || 'handoffEnvelope DENY',
        receipt,
        PRODUCTION_READY: BO_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true
      };
    }

    grantCount += 1;
    const receipt = sealOutcome({
      ok: true,
      code: BO_CODES.CONSENSUS_GRANTED,
      consensusStatus: 'CONSENSUS_GRANTED',
      proposalId: proposalId || null,
      builderAgentId,
      verifierAgentId,
      proposalHash,
      evidenceHash,
      reason: null
    });

    return {
      ok: true,
      deny: false,
      denied: false,
      code: BO_CODES.CONSENSUS_GRANTED,
      reason: null,
      receipt,
      PRODUCTION_READY: BO_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      bftPosBlockchainP2pGossip: false,
      heavyRaftBlockchain: false,
      productionReadyYes: false,
      cloudAgent: false,
      consensusProduct: false,
      singleAgentAutoApproval: false,
      unsignedAsyncHandoff: false
    };
  }

  /**
   * Verify sealed BO receipt trail (hash + prevReceiptHash chain).
   * @param {object[]} receipts
   * @returns {object}
   */
  function verifyReceiptTrail(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return {
        ok: false,
        code: BO_CODES.TRAIL_BREAK,
        reason: 'empty trail',
        PRODUCTION_READY: BO_PRODUCTION_READY
      };
    }
    let prev = null;
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const v = verifyTwoKeyReceipt(r, hashFn);
      if (!v.ok) {
        return {
          ok: false,
          code: BO_CODES.TRAIL_BREAK,
          reason: v.reason || 'receipt tamper',
          index: i,
          PRODUCTION_READY: BO_PRODUCTION_READY
        };
      }
      if (i > 0) {
        const expectedPrev = prev.receiptHash || prev.receiptDigest;
        if (
          r.prevReceiptHash != null &&
          String(r.prevReceiptHash) !== String(expectedPrev)
        ) {
          return {
            ok: false,
            code: BO_CODES.TRAIL_BREAK,
            reason: 'prevReceiptHash chain break',
            index: i,
            PRODUCTION_READY: BO_PRODUCTION_READY
          };
        }
      }
      prev = r;
    }
    return {
      ok: true,
      code: BO_CODES.TRAIL_OK,
      length: receipts.length,
      PRODUCTION_READY: BO_PRODUCTION_READY
    };
  }

  function health() {
    return {
      kind: BO_KIND,
      PRODUCTION_READY: BO_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      axis: AXIS,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'CLOSED',
      ladder20: 'CLOSED',
      ladder21: 'OPEN',
      l17NeverReopen: true,
      l18NeverReopen: true,
      l19NeverReopen: true,
      l20NeverReopen: true,
      l20Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      bmMeasured: true,
      bnMeasured: true,
      boInProgress: true,
      bpPending: true,
      bqPending: true,
      bftPosBlockchainP2pGossip: false,
      heavyRaftBlockchain: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      consensusProduct: false,
      singleAgentAutoApproval: false,
      unsignedAsyncHandoff: false,
      notByzantineRewrite: true,
      twoKeyRule: true,
      hermetic: true
    };
  }

  function getState() {
    return {
      kind: BO_KIND,
      PRODUCTION_READY: BO_PRODUCTION_READY,
      proposalCount,
      attestationCount,
      evaluateCount,
      grantCount,
      denyCount,
      historyCount: history.length,
      lastReceiptHash,
      pendingProposals: proposals.size,
      pendingAttestations: attestations.size,
      ports: {
        custodyPort: ports.custodyPort != null,
        handoffEnvelope: ports.handoffEnvelope != null
      }
    };
  }

  return {
    kind: BO_KIND,
    PRODUCTION_READY: BO_PRODUCTION_READY,
    codes: BO_CODES,
    submitProposal,
    submitAttestation,
    evaluateConsensus,
    verifyReceiptTrail,
    health,
    getState
  };
}

export default {
  BO_PRODUCTION_READY,
  BO_KIND,
  BO_CODES,
  createMultiAgentConsensusGate
};
