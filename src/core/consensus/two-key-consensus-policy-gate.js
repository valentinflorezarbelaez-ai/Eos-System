/**
 * @module two-key-consensus-policy-gate
 * SPEC-0072 / Mission BO — Fail-closed policy for Multi-Agent Consensus &
 * Two-Key Handoff Gate: self-verification DENY / missing verifier /
 * evidence mismatch / attestation REJECTED / Fundacion ALWAYS_DENY /
 * malformed DENY.
 *
 * Two-Key rule: builderAgentId !== verifierAgentId ALWAYS; self-verification DENY.
 *
 * DENY codes: MALFORMED_PAYLOAD, FUNDACION_ALWAYS_DENY, SELF_VERIFY_DENY,
 * MISSING_VERIFIER, MISSING_BUILDER, MISSING_EVIDENCE, EVIDENCE_MISMATCH,
 * ATTESTATION_REJECTED, POLICY_DENY, DENY, OK, CONSENSUS_GRANTED.
 *
 * NON-CLAIM:
 *   policy-gate ≠ BFT/PoS/blockchain/P2P gossip /
 *   ≠ PRODUCTION_READY=YES consensus product
 *   L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 *   L21 OPEN; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/consensus (BO-owned two-key-* /
 * multi-agent-consensus-gate.js; sibling byzantine engine ALLOWED —
 * BI/BJ pattern; DO NOT rewrite).
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BO_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BO_POLICY_GATE_KIND = 'eos-two-key-consensus-policy-gate';

export const BO_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  CONSENSUS_GRANTED: 'CONSENSUS_GRANTED',
  CONSENSUS_DENIED: 'CONSENSUS_DENIED',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FUNDACION_DENY: 'FUNDACION_ALWAYS_DENY',
  SELF_VERIFY_DENY: 'SELF_VERIFY_DENY',
  MISSING_VERIFIER: 'MISSING_VERIFIER',
  MISSING_BUILDER: 'MISSING_BUILDER',
  MISSING_EVIDENCE: 'MISSING_EVIDENCE',
  EVIDENCE_MISMATCH: 'EVIDENCE_MISMATCH',
  ATTESTATION_REJECTED: 'ATTESTATION_REJECTED',
  POLICY_DENY: 'POLICY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  PROPOSAL_ACCEPTED: 'PROPOSAL_ACCEPTED',
  ATTESTATION_ACCEPTED: 'ATTESTATION_ACCEPTED'
});

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BO_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed consensus payload',
  extra = {}
) {
  return deny(BO_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyFundacion(
  reason = 'Fundacion ALWAYS_DENY',
  extra = {}
) {
  return deny(BO_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denySelfVerify(
  reason = 'builderAgentId === verifierAgentId — self-verification DENY',
  extra = {}
) {
  return deny(BO_POLICY_CODES.SELF_VERIFY_DENY, reason, extra);
}

export function denyMissingVerifier(
  reason = 'verifierAgentId required for two-key consensus',
  extra = {}
) {
  return deny(BO_POLICY_CODES.MISSING_VERIFIER, reason, extra);
}

export function denyMissingBuilder(
  reason = 'builderAgentId required for two-key consensus',
  extra = {}
) {
  return deny(BO_POLICY_CODES.MISSING_BUILDER, reason, extra);
}

export function denyMissingEvidence(
  reason = 'evidenceHash required for consensus grant',
  extra = {}
) {
  return deny(BO_POLICY_CODES.MISSING_EVIDENCE, reason, extra);
}

export function denyEvidenceMismatch(
  reason = 'evidenceHash mismatch between proposal and attestation',
  extra = {}
) {
  return deny(BO_POLICY_CODES.EVIDENCE_MISMATCH, reason, extra);
}

export function denyAttestationRejected(
  reason = 'verifier attestation REJECTED',
  extra = {}
) {
  return deny(BO_POLICY_CODES.ATTESTATION_REJECTED, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BO_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Detect Fundacion targets (ALWAYS DENY).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'string') {
    const n = String(target).toLowerCase().replace(/\\/g, '/');
    return (
      n.includes('fundacion') ||
      n.includes('documents/fundacion') ||
      n === 'fundacion'
    );
  }
  if (typeof target === 'object') {
    const o = /** @type {Record<string, unknown>} */ (target);
    if (o.fundacion === true || o.writeFundacion === true) return true;
    if (o.isFundacion === true) return true;
    const id = o.id != null ? String(o.id).toLowerCase() : '';
    const name = o.name != null ? String(o.name).toLowerCase() : '';
    const targetId =
      o.targetId != null ? String(o.targetId).toLowerCase() : '';
    const proposalId =
      o.proposalId != null ? String(o.proposalId).toLowerCase() : '';
    const builder =
      o.builderAgentId != null ? String(o.builderAgentId).toLowerCase() : '';
    const verifier =
      o.verifierAgentId != null
        ? String(o.verifierAgentId).toLowerCase()
        : '';
    if (
      id === 'fundacion' ||
      name === 'fundacion' ||
      targetId.includes('fundacion') ||
      id.includes('fundacion') ||
      proposalId.includes('fundacion') ||
      builder.includes('fundacion') ||
      verifier.includes('fundacion')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize agent id (trim; strip zero-width / control).
 * @param {unknown} id
 * @returns {string}
 */
export function normalizeAgentId(id) {
  if (id == null) return '';
  return String(id)
    .replace(
      /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,
      ''
    )
    .trim();
}

/**
 * Two-Key disjunction: builderAgentId !== verifierAgentId (case-insensitive).
 * @param {string} builderAgentId
 * @param {string} verifierAgentId
 * @returns {boolean}
 */
export function isTwoKeyDisjunction(builderAgentId, verifierAgentId) {
  const b = normalizeAgentId(builderAgentId);
  const v = normalizeAgentId(verifierAgentId);
  if (!b || !v) return false;
  return b.toLowerCase() !== v.toLowerCase();
}

/**
 * Gate a consensus evaluation request — fail-closed.
 * @param {object} req
 * @param {object} [ctx]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateEvaluateConsensus(req = {}, ctx = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('evaluateConsensus request required');
  }

  if (
    isFundacionTarget(req) ||
    isFundacionTarget(req.target) ||
    req.fundacion === true
  ) {
    return denyFundacion('Fundacion ALWAYS_DENY on consensus evaluation');
  }

  const builderAgentId = normalizeAgentId(
    req.builderAgentId != null
      ? req.builderAgentId
      : ctx.builderAgentId != null
        ? ctx.builderAgentId
        : ''
  );
  const verifierAgentId = normalizeAgentId(
    req.verifierAgentId != null
      ? req.verifierAgentId
      : ctx.verifierAgentId != null
        ? ctx.verifierAgentId
        : ''
  );

  if (!builderAgentId) {
    return denyMissingBuilder('builderAgentId required for two-key consensus');
  }
  if (!verifierAgentId) {
    return denyMissingVerifier(
      'verifierAgentId required for two-key consensus'
    );
  }

  if (!isTwoKeyDisjunction(builderAgentId, verifierAgentId)) {
    return denySelfVerify(
      `builderAgentId '${builderAgentId}' cannot self-verify (Two-Key rule)`
    );
  }

  const decision = String(
    req.decision != null
      ? req.decision
      : ctx.decision != null
        ? ctx.decision
        : ''
  ).toUpperCase();

  if (
    decision === 'REJECT' ||
    decision === 'REJECTED' ||
    decision === 'DENY' ||
    req.rejected === true ||
    ctx.rejected === true
  ) {
    return denyAttestationRejected('verifier attestation REJECTED');
  }

  const evidenceHash =
    req.evidenceHash != null
      ? String(req.evidenceHash)
      : ctx.evidenceHash != null
        ? String(ctx.evidenceHash)
        : '';
  const expectedEvidenceHash =
    req.expectedEvidenceHash != null
      ? String(req.expectedEvidenceHash)
      : ctx.expectedEvidenceHash != null
        ? String(ctx.expectedEvidenceHash)
        : req.proposalEvidenceHash != null
          ? String(req.proposalEvidenceHash)
          : ctx.proposalEvidenceHash != null
            ? String(ctx.proposalEvidenceHash)
            : '';

  if (!evidenceHash && req.requireEvidence !== false && ctx.requireEvidence !== false) {
    return denyMissingEvidence('evidenceHash required for consensus grant');
  }

  if (
    evidenceHash &&
    expectedEvidenceHash &&
    evidenceHash !== expectedEvidenceHash
  ) {
    return denyEvidenceMismatch(
      'evidenceHash mismatch between proposal and attestation'
    );
  }

  if (
    decision &&
    decision !== 'APPROVE' &&
    decision !== 'APPROVED' &&
    decision !== 'GRANT' &&
    decision !== 'GRANTED' &&
    decision !== 'OK' &&
    decision !== 'CONSENSUS_GRANTED'
  ) {
    return denyAttestationRejected(
      `unsupported attestation decision: ${decision}`
    );
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BO_POLICY_CODES.CONSENSUS_GRANTED,
    reason: null,
    builderAgentId,
    verifierAgentId,
    evidenceHash: evidenceHash || null
  };
}

/**
 * Gate submitProposal — fail-closed basics.
 * @param {object} req
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function gateSubmitProposal(req = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('submitProposal request required');
  }
  if (
    isFundacionTarget(req) ||
    isFundacionTarget(req.target) ||
    req.fundacion === true
  ) {
    return denyFundacion('Fundacion ALWAYS_DENY on submitProposal');
  }
  const builderAgentId = normalizeAgentId(req.builderAgentId);
  if (!builderAgentId) {
    return denyMissingBuilder('builderAgentId required on submitProposal');
  }
  if (req.proposalId == null || String(req.proposalId).trim() === '') {
    return denyMalformed('proposalId required on submitProposal');
  }
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BO_POLICY_CODES.PROPOSAL_ACCEPTED,
    reason: null,
    builderAgentId
  };
}

/**
 * Gate submitAttestation — fail-closed Two-Key + rejection.
 * @param {object} req
 * @param {object} [ctx] — proposal context { builderAgentId, proposalEvidenceHash }
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function gateSubmitAttestation(req = {}, ctx = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('submitAttestation request required');
  }
  if (
    isFundacionTarget(req) ||
    isFundacionTarget(req.target) ||
    req.fundacion === true
  ) {
    return denyFundacion('Fundacion ALWAYS_DENY on submitAttestation');
  }

  const verifierAgentId = normalizeAgentId(req.verifierAgentId);
  if (!verifierAgentId) {
    return denyMissingVerifier(
      'verifierAgentId required on submitAttestation'
    );
  }

  const builderAgentId = normalizeAgentId(
    ctx.builderAgentId != null
      ? ctx.builderAgentId
      : req.builderAgentId != null
        ? req.builderAgentId
        : ''
  );

  if (builderAgentId && !isTwoKeyDisjunction(builderAgentId, verifierAgentId)) {
    return denySelfVerify(
      `builderAgentId '${builderAgentId}' cannot self-attest (Two-Key rule)`
    );
  }

  const decision = String(req.decision != null ? req.decision : '').toUpperCase();
  if (
    decision === 'REJECT' ||
    decision === 'REJECTED' ||
    decision === 'DENY' ||
    req.rejected === true
  ) {
    // Accept the attestation record but mark as rejected for evaluate
    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BO_POLICY_CODES.ATTESTATION_ACCEPTED,
      reason: null,
      rejected: true,
      verifierAgentId,
      decision: 'REJECT'
    };
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BO_POLICY_CODES.ATTESTATION_ACCEPTED,
    reason: null,
    rejected: false,
    verifierAgentId,
    decision: decision || 'APPROVE'
  };
}

/**
 * Create a reusable policy gate object.
 * @param {object} [opts]
 * @returns {object}
 */
export function createTwoKeyConsensusPolicyGate(opts = {}) {
  return {
    kind: BO_POLICY_GATE_KIND,
    PRODUCTION_READY: BO_POLICY_GATE_PRODUCTION_READY,
    codes: BO_POLICY_CODES,
    gateEvaluateConsensus: (req, ctx) =>
      gateEvaluateConsensus(req, { ...opts, ...(ctx || {}) }),
    gateSubmitProposal,
    gateSubmitAttestation,
    isFundacionTarget,
    isTwoKeyDisjunction,
    normalizeAgentId,
    deny,
    denySelfVerify,
    denyMissingVerifier,
    denyMissingBuilder,
    denyMissingEvidence,
    denyEvidenceMismatch,
    denyAttestationRejected,
    denyFundacion,
    denyMalformed,
    denyPolicy
  };
}

export default {
  BO_POLICY_GATE_PRODUCTION_READY,
  BO_POLICY_GATE_KIND,
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
};
