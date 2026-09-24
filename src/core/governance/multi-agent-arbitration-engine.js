/**
 * @module MultiAgentArbitrationEngine
 * @description Agency-Grade Multi-Agent Consensus & Byzantine Peer Review Arbitration Engine (eos council / eos arbitrate).
 * Enforces NASA IV&V Anti-Self-Certification, multi-desk balloting, VETO authority, and cryptographic consensus sealing.
 * Pure L0 Node.js implementation (zero npm dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveControlPlaneRoot } from '../runtime/control-plane-root.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const COUNCIL_DESKS = Object.freeze({
  SECURITY: 'DESK_SECURITY',
  ARCHITECTURE: 'DESK_ARCHITECTURE',
  QUALITY: 'DESK_QUALITY',
  PERFORMANCE: 'DESK_PERFORMANCE',
  VERIFICATION: 'DESK_VERIFICATION'
});

export const BALLOT_VERDICTS = Object.freeze({
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  VETO: 'VETO',
  ABSTAIN: 'ABSTAIN'
});

export const CONSENSUS_STATUSES = Object.freeze({
  CONSENSUS_VERIFIED: 'CONSENSUS_VERIFIED',
  VETO_REJECTED: 'VETO_REJECTED',
  REJECTED_LACK_OF_QUORUM: 'REJECTED_LACK_OF_QUORUM',
  REJECTED_MISSING_INDEPENDENT_EVIDENCE: 'REJECTED_MISSING_INDEPENDENT_EVIDENCE'
});

export class MultiAgentArbitrationEngine {
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || resolveControlPlaneRoot();
  }

  /**
   * Casts an independent evaluation ballot from a specialized desk
   * @param {string} deskId 
   * @param {object} artifact 
   * @returns {object} Signed Ballot
   */
  castBallot(deskId, artifact = {}) {
    const ballotId = `BLT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let fileContent = artifact.content || '';
    if (!fileContent && artifact.filePath) {
      try {
        const stats = fs.statSync(artifact.filePath);
        if (stats.isFile()) {
          fileContent = fs.readFileSync(artifact.filePath, 'utf-8');
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    const findings = [];
    let verdict = BALLOT_VERDICTS.APPROVE;
    let confidence = 'HIGH';

    if (deskId === COUNCIL_DESKS.SECURITY) {
      // 1. Check for plain credentials / API keys (Law VI)
      const secretRegex = /[a-zA-Z0-9_]*(?:api[_-]?key|secret|password|bearer|private[_-]?key|token)[a-zA-Z0-9_]*\s*[:=]\s*['"`]([a-zA-Z0-9_\-./+]{8,})['"`]/gi;
      let match;
      while ((match = secretRegex.exec(fileContent)) !== null) {
        if (!match[1].startsWith('sha256-') && !match[1].startsWith('http') && !match[1].includes('placeholder')) {
          findings.push({
            ruleId: 'SEC-001-PLAIN-CREDENTIAL',
            severity: 'CRITICAL',
            message: `Detected potential plain credential or API key: '${match[0].slice(0, 30)}...'`,
            context: match[0]
          });
          verdict = BALLOT_VERDICTS.VETO;
        }
      }

      // 2. Check for dangerous evals
      if (/\beval\s*\(|new\s+Function\s*\(/i.test(fileContent)) {
        findings.push({
          ruleId: 'SEC-002-DYNAMIC-CODE-EXECUTION',
          severity: 'CRITICAL',
          message: 'Arbitrary dynamic code execution (eval or Function constructor) detected.'
        });
        verdict = BALLOT_VERDICTS.VETO;
      }
    } else if (deskId === COUNCIL_DESKS.ARCHITECTURE) {
      // Check Clean Architecture & Hexagonal Boundaries
      const isDomainCore = artifact.filePath && (artifact.filePath.includes('/core/') || artifact.filePath.includes('\\core\\'));
      if (isDomainCore) {
        // Domain core must not import framework or outer UI layers directly
        if (/from\s+['"](express|fastify|react|vue|next|electron|tailwindcss)['"]/i.test(fileContent)) {
          findings.push({
            ruleId: 'ARCH-001-HEXAGONAL-ISOLATION-BREACH',
            severity: 'CRITICAL',
            message: 'Domain core directly imports presentation/framework layer, violating Hexagonal Architecture.'
          });
          verdict = BALLOT_VERDICTS.VETO;
        }
      }
    } else if (deskId === COUNCIL_DESKS.QUALITY) {
      // Check code quality, empty catch blocks, syntax
      const emptyCatch = /catch\s*\([^)]*\)\s*\{\s*\}/g;
      if (emptyCatch.test(fileContent)) {
        findings.push({
          ruleId: 'QUAL-001-SILENT-EXCEPTION-SWALLOW',
          severity: 'WARNING',
          message: 'Empty catch block silently swallowing exceptions without logging or handling.'
        });
        verdict = BALLOT_VERDICTS.REJECT;
      }
    } else if (deskId === COUNCIL_DESKS.PERFORMANCE) {
      // Check file bloat & complexity bounds
      const lineCount = fileContent.split(/\r?\n/).length;
      if (lineCount > 1500) {
        findings.push({
          ruleId: 'PERF-001-MONOLITHIC-FILE-COMPLEXITY',
          severity: 'WARNING',
          message: `File exceeds 1,500 lines (${lineCount} lines). Recommend decomposition.`
        });
        // Non-blocking warning for performance
      }
    } else if (deskId === COUNCIL_DESKS.VERIFICATION) {
      // NASA IV&V Anti-Self-Certification Invariant
      const implementerClaimDone = artifact.implementerClaim === 'DONE';
      const verifierEvidence = artifact.verifierEvidence;

      if (implementerClaimDone && (!verifierEvidence || verifierEvidence.exitCode !== 0)) {
        findings.push({
          ruleId: 'IVV-001-ANTI-SELF-CERTIFICATION-VIOLATION',
          severity: 'BLOCKING',
          message: 'BUILDER_CANNOT_BE_FINAL_AUTHORITY: Independent verifier evidence with exitCode 0 is mandatory.'
        });
        verdict = BALLOT_VERDICTS.REJECT;
      }
    }

    const ballot = {
      ballot_id: ballotId,
      desk_id: deskId,
      timestamp: new Date().toISOString(),
      verdict,
      confidence,
      findings_count: findings.length,
      findings
    };

    ballot.sha256 = calculateSha256(JSON.stringify(ballot));
    return ballot;
  }

  /**
   * Conducts full multi-agent council deliberation across all 5 specialized desks
   * @param {object} proposal 
   * @param {string} proposal.projectId
   * @param {string} [proposal.filePath]
   * @param {string} [proposal.content]
   * @param {string} [proposal.implementerClaim]
   * @param {object} [proposal.verifierEvidence]
   * @returns {object} Deliberation & Consensus Envelope
   */
  conductCouncilDeliberation(proposal = {}) {
    const proposalId = `PRP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const startTime = Date.now();

    // 1. Cast ballots from all 5 specialized desks
    const ballots = [
      this.castBallot(COUNCIL_DESKS.SECURITY, proposal),
      this.castBallot(COUNCIL_DESKS.ARCHITECTURE, proposal),
      this.castBallot(COUNCIL_DESKS.QUALITY, proposal),
      this.castBallot(COUNCIL_DESKS.PERFORMANCE, proposal),
      this.castBallot(COUNCIL_DESKS.VERIFICATION, proposal)
    ];

    // 2. Evaluate Byzantine Quorum & Consensus
    const evaluation = this.evaluateConsensus(ballots, proposal);
    const durationMs = Date.now() - startTime;

    const consensusEnvelope = {
      consensus_id: `CNS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      proposal_id: proposalId,
      project_id: proposal.projectId || 'PRJ-EOS-CONTROL-PLANE',
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      status: evaluation.status,
      approved: evaluation.approved,
      quorum_percentage: evaluation.quorum_percentage,
      tally: evaluation.tally,
      has_veto: evaluation.has_veto,
      veto_reasons: evaluation.veto_reasons,
      ballots,
      remediation_order: evaluation.approved ? null : this.generateRemediationOrder(ballots, proposal)
    };

    consensusEnvelope.sha256 = calculateSha256(JSON.stringify(consensusEnvelope));
    return consensusEnvelope;
  }

  /**
   * Evaluates consensus across ballots enforcing VETO and supermajority rules
   * @param {Array<object>} ballots 
   * @param {object} proposal 
   * @returns {object}
   */
  evaluateConsensus(ballots = [], proposal = {}) {
    let approveCount = 0;
    let rejectCount = 0;
    let vetoCount = 0;
    const vetoReasons = [];

    for (const b of ballots) {
      if (b.verdict === BALLOT_VERDICTS.VETO) {
        vetoCount += 1;
        vetoReasons.push(`[${b.desk_id}] VETO: ${b.findings.map(f => f.message).join(' | ')}`);
      } else if (b.verdict === BALLOT_VERDICTS.APPROVE) {
        approveCount += 1;
      } else if (b.verdict === BALLOT_VERDICTS.REJECT) {
        rejectCount += 1;
      }
    }

    const totalVotes = ballots.length;
    const quorumPercentage = Math.round((approveCount / totalVotes) * 100);

    // Rule 1: Immediate VETO overrides any majority
    if (vetoCount > 0) {
      return {
        approved: false,
        status: CONSENSUS_STATUSES.VETO_REJECTED,
        quorum_percentage: quorumPercentage,
        has_veto: true,
        veto_reasons: vetoReasons,
        tally: { approve: approveCount, reject: rejectCount, veto: vetoCount, total: totalVotes }
      };
    }

    // Rule 2: NASA IV&V Verification check
    const verificationBallot = ballots.find(b => b.desk_id === COUNCIL_DESKS.VERIFICATION);
    if (verificationBallot && verificationBallot.verdict === BALLOT_VERDICTS.REJECT) {
      return {
        approved: false,
        status: CONSENSUS_STATUSES.REJECTED_MISSING_INDEPENDENT_EVIDENCE,
        quorum_percentage: quorumPercentage,
        has_veto: false,
        veto_reasons: [],
        tally: { approve: approveCount, reject: rejectCount, veto: vetoCount, total: totalVotes }
      };
    }

    // Rule 3: Supermajority threshold (>= 80%)
    if (quorumPercentage >= 80) {
      return {
        approved: true,
        status: CONSENSUS_STATUSES.CONSENSUS_VERIFIED,
        quorum_percentage: quorumPercentage,
        has_veto: false,
        veto_reasons: [],
        tally: { approve: approveCount, reject: rejectCount, veto: vetoCount, total: totalVotes }
      };
    }

    return {
      approved: false,
      status: CONSENSUS_STATUSES.REJECTED_LACK_OF_QUORUM,
      quorum_percentage: quorumPercentage,
      has_veto: false,
      veto_reasons: [],
      tally: { approve: approveCount, reject: rejectCount, veto: vetoCount, total: totalVotes }
    };
  }

  /**
   * Generates a surgical remediation order when deliberation fails
   * @param {Array<object>} ballots 
   * @param {object} proposal 
   * @returns {object} Remediation Order
   */
  generateRemediationOrder(ballots = [], proposal = {}) {
    const orderId = `RMD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const allFindings = [];

    for (const b of ballots) {
      for (const f of b.findings) {
        allFindings.push({
          desk: b.desk_id,
          severity: f.severity,
          ruleId: f.ruleId,
          message: f.message,
          remedy: this.#getPrescribedRemedy(f.ruleId)
        });
      }
    }

    return {
      order_id: orderId,
      project_id: proposal.projectId || 'PRJ-EOS-CONTROL-PLANE',
      timestamp: new Date().toISOString(),
      actionable_items: allFindings,
      assigned_to: 'SURGICAL_TDD_HEALER',
      priority: allFindings.some(f => f.severity === 'CRITICAL') ? 'P0_IMMEDIATE_BLOCK' : 'P1_REQUIRED'
    };
  }

  #getPrescribedRemedy(ruleId) {
    switch (ruleId) {
      case 'SEC-001-PLAIN-CREDENTIAL':
        return 'Extract secret immediately into environment variable or runtime secret store. Re-run git filter-branch if committed.';
      case 'SEC-002-DYNAMIC-CODE-EXECUTION':
        return 'Refactor dynamic string evaluation to static, compiled lookup functions or pure data structures.';
      case 'ARCH-001-HEXAGONAL-ISOLATION-BREACH':
        return 'Invert dependency: define abstract port in domain core, implement concrete adapter in outer infrastructure layer.';
      case 'QUAL-001-SILENT-EXCEPTION-SWALLOW':
        return 'Log exception telemetry or rethrow with structured error envelope.';
      case 'IVV-001-ANTI-SELF-CERTIFICATION-VIOLATION':
        return 'Execute test suite via independent verifier subprocess (node --test) and capture exitCode === 0 evidence.';
      default:
        return 'Inspect code and satisfy strict quality and governance invariants.';
    }
  }

  /**
   * Formats a high-density terminal report for council deliberation
   * @param {object} consensus 
   * @returns {string} Formatted terminal string
   */
  formatCouncilReport(consensus) {
    const width = 80;
    const divider = '='.repeat(width);
    const subDivider = '-'.repeat(width);

    let out = `\n${divider}\n`;
    out += `⚖️  EOS MULTI-AGENT ARBITRATION COUNCIL // SUPREME COURT VERDICT\n`;
    out += `    Enforcing NASA IV&V Anti-Self-Certification & Byzantine Consensus\n`;
    out += `${divider}\n\n`;

    out += `• Consensus ID:       ${consensus.consensus_id}\n`;
    out += `• Proposal ID:        ${consensus.proposal_id}\n`;
    out += `• Project ID:         ${consensus.project_id}\n`;
    out += `• Quorum Percentage:  ${consensus.quorum_percentage}%\n`;
    out += `• Status:             ${consensus.status}\n`;
    out += `• Final Verdict:      ${consensus.approved ? 'APPROVED (RELEASE_AUTHORIZED)' : 'REJECTED (REMEDIATION_REQUIRED)'}\n\n`;

    out += `[BALLOT TALLY BY SPECIALIZED DESK]\n`;
    out += `${subDivider}\n`;
    for (const b of consensus.ballots) {
      const mark = b.verdict === BALLOT_VERDICTS.APPROVE ? '✅' : (b.verdict === BALLOT_VERDICTS.VETO ? '🛑' : '⚠️');
      out += `  ${mark} [${b.desk_id.padEnd(19)}] Verdict: ${b.verdict.padEnd(8)} (Findings: ${b.findings_count})\n`;
      for (const f of b.findings) {
        out += `      ↳ [${f.severity}] ${f.ruleId}: ${f.message}\n`;
      }
    }

    if (consensus.has_veto) {
      out += `\n🛑 [ACTIVE VETOES ENFORCED]:\n`;
      for (const v of consensus.veto_reasons) {
        out += `  - ${v}\n`;
      }
    }

    if (consensus.remediation_order) {
      out += `\n📋 [REMEDIATION ORDER ${consensus.remediation_order.order_id}]:\n`;
      for (const item of consensus.remediation_order.actionable_items) {
        out += `  - [${item.severity}] ${item.ruleId} -> Action: ${item.remedy}\n`;
      }
    }

    out += `\n${divider}\n`;
    out += `INTEGRITY HASH: ${consensus.sha256}\n`;
    out += `${divider}\n`;

    return out;
  }
}
