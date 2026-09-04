import crypto from 'node:crypto';

/**
 * EOS Mission Ontology Core & Explainability Logger - Extended Graph Edition
 * L0 (node:crypto only). Forces traceable choice graphs on every authority decision.
 * Generates deterministic end-to-end cryptographic provenance over paths taken and discarded.
 */
export class EOSMissionOntologyCore {
  constructor() {
    this.allowedEvidenceClasses = Object.freeze([
      'DETERMINISTIC_CHECK',
      'CONTRACT_VERIFICATION',
      'HITL_APPROVAL',
      'CRYPTOGRAPHIC_RECEIPT',
      'E2E_SIMULATION',
      'METRIC_THRESHOLD',
      'FORENSIC_AUDIT',
    ]);
    this.clasesEvidenciaPermitidas = this.allowedEvidenceClasses;
  }

  /**
   * Deterministic JSON serialization (sorted keys) so hashes are stable.
   * @param {*} value
   * @returns {string}
   */
  static stableStringify(value) {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => EOSMissionOntologyCore.stableStringify(v)).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    const body = keys
      .map((k) => `${JSON.stringify(k)}:${EOSMissionOntologyCore.stableStringify(value[k])}`)
      .join(',');
    return `{${body}}`;
  }

  /**
   * Compiles, validates and cryptographically seals a mission decision block with Transparency Graph mapping.
   * @param {object} previousPayload Previous state / payload
   * @param {object} authorityDecision Decision details from authority
   * @returns {Readonly<object>} Immutable sealed decision block
   */
  compileDecisionBlock(previousPayload = {}, authorityDecision = {}) {
    const optionsConsidered = authorityDecision.optionsConsidered || authorityDecision.opcionesConsideradas;
    const why = authorityDecision.why || authorityDecision.justificacion;
    const confidence = authorityDecision.confidence !== undefined ? authorityDecision.confidence : authorityDecision.confianza;
    const decisionIssued = authorityDecision.decisionIssued || authorityDecision.decisionEmitida || authorityDecision.decision || 'PENDING';
    const outcome = authorityDecision.outcome || authorityDecision.resultado || 'PENDING';

    // 1. Mandatory transparency guardrails
    if (!Array.isArray(optionsConsidered) || optionsConsidered.length === 0) {
      throw new Error('🚨 GOVERNANCE FAULT: Transparency violated. optionsConsidered must be a non-empty array.');
    }
    if (typeof why !== 'string' || why.trim().length < 10) {
      throw new Error('🚨 GOVERNANCE FAULT: Transparency violated. "why" must be a string of at least 10 characters.');
    }
    if (typeof confidence !== 'number' || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('🚨 GOVERNANCE FAULT: confidence must be a number in the closed interval [0.0, 1.0].');
    }

    // 2. Transparency Graph generation (sub-graph of alternatives)
    const sortedOptions = [...optionsConsidered].sort();
    const optionsGraph = sortedOptions.map((option, index) => ({
      nodeId: `OPT-${index}`,
      alternative: option,
      status: option === decisionIssued ? 'SELECTED' : 'DISCARDED',
      weightHash: crypto.createHash('sha256').update(`${option}-${why.trim()}`).digest('hex').slice(0, 8)
    }));

    const optionsGraphHash = `sha256-${crypto
      .createHash('sha256')
      .update(EOSMissionOntologyCore.stableStringify(optionsGraph))
      .digest('hex')}`;

    // 3. Canonical decision block structure with Transparency Graph
    const decisionBlock = {
      intentId: previousPayload.intentId || previousPayload.idIntencion || 'UNKNOWN',
      contractHash: previousPayload.contractHash || previousPayload.hashContrato || 'NOT_FOUND',
      authorityReceipt: {
        timestamp: new Date().toISOString(),
        justification: {
          optionsConsidered: Object.freeze([...optionsConsidered]),
          why: why.trim(),
          confidence,
          transparencyGraphHash: optionsGraphHash
        },
        decision: decisionIssued ?? 'UNDECLARED',
        graphNodes: Object.freeze(optionsGraph)
      },
      evidenceChain: Object.freeze([...(previousPayload.evidenceChain || previousPayload.cadenaEvidencias || [])]),
      outcome: outcome ?? 'PENDING',
    };

    // 4. End-to-end cryptographic seal over the entire decision graph
    const material = EOSMissionOntologyCore.stableStringify(decisionBlock);
    const digest = crypto.createHash('sha256').update(material).digest('hex');
    decisionBlock.missionChainHash = `sha256-${digest}`;

    return Object.freeze(decisionBlock);
  }

  /**
   * Alias for Spanish compatibility.
   */
  compilarBloqueDecision(previous = {}, decision = {}) {
    return this.compileDecisionBlock(previous, decision);
  }

  /**
   * Validates if a decision block has well-formed hash and valid chain graph structure.
   * @param {object} block
   * @returns {boolean}
   */
  isWellFormedChain(block) {
    if (!block || typeof block !== 'object' || !block.intentId || !block.contractHash || !block.missionChainHash) {
      return false;
    }
    if (!block.authorityReceipt?.justification?.transparencyGraphHash) {
      return false;
    }

    const blockToVerify = { ...block };
    const declaredHash = blockToVerify.missionChainHash;
    delete blockToVerify.missionChainHash;

    const material = EOSMissionOntologyCore.stableStringify(blockToVerify);
    const computedHash = `sha256-${crypto.createHash('sha256').update(material).digest('hex')}`;

    return declaredHash === computedHash && /^sha256-[a-f0-9]{64}$/.test(declaredHash);
  }
}
