/**
 * @module ContextCompiler
 * @version 1.1.0
 * @description Compiles deterministic, token-budgeted prompt context with progressive disclosure.
 * Supports canonical v1.1.0 schema (repository, evidence, decisions, unknowns, constraints, instructions)
 * with explicit backward-compatible adapter for legacy local aliases.
 */

import crypto from 'node:crypto';
import { AuthorityAdapter } from './authority-adapter.js';

class ContextCompiler {
  /**
   * Normalizes raw input to CanonicalContextInputV1
   * @param {Object} rawInput
   * @returns {Object} Normalized canonical input
   */
  static normalizeContextInput(rawInput = {}) {
    const input = rawInput || {};

    // Normalize repository
    const repository = input.repository || input.repoContext || {};
    const normalizedRepo = {
      inventorySummary: repository.inventorySummary || '',
      openFiles: Array.isArray(repository.openFiles) ? repository.openFiles : []
    };

    // Normalize evidence: handle array vs object with verifiedReceipts
    let normalizedEvidence = [];
    if (Array.isArray(input.evidence)) {
      normalizedEvidence = input.evidence.map(e => (typeof e === 'string' ? { id: e, type: 'RECEIPT', status: 'VERIFIED' } : e));
    } else if (input.evidence && Array.isArray(input.evidence.verifiedReceipts)) {
      normalizedEvidence = input.evidence.verifiedReceipts.map(r => ({ id: r, type: 'RECEIPT', status: 'VERIFIED' }));
    } else if (input.evidenceContext && Array.isArray(input.evidenceContext.verifiedReceipts)) {
      normalizedEvidence = input.evidenceContext.verifiedReceipts.map(r => ({ id: r, type: 'RECEIPT', status: 'VERIFIED' }));
    }

    return {
      mission: input.mission || { id: 'MIS-UNKNOWN', type: 'GENERAL', goal: '' },
      project: input.project || { id: 'PRJ-UNKNOWN', rootPath: '.', activeScope: [] },
      contract: input.contract || { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 4000, reserveCompletionTokens: 500 },
      repository: normalizedRepo,
      evidence: normalizedEvidence,
      decisions: Array.isArray(input.decisions) ? input.decisions : [],
      unknowns: Array.isArray(input.unknowns) ? input.unknowns : [],
      constraints: Array.isArray(input.constraints) ? input.constraints : [],
      instructions: Array.isArray(input.instructions) ? input.instructions : []
    };
  }

  /**
   * Compiles context from canonical or adapted input
   * @param {Object} input
   * @returns {Object} ContextReceipt
   */
  static compileMissionContext(input) {
    const norm = this.normalizeContextInput(input);
    const maxBudget = norm.contract.maxBudgetTokens || 4000;
    const auth = AuthorityAdapter.normalize(norm.contract.autonomyLevel);

    const sections = [];
    let currentTokens = 0;

    // Helper: estimate tokens (~4 chars per token)
    const estimateTokens = (text) => Math.ceil(text.length / 4);

    // Priority 1: Mission Header & Goal (MANDATORY)
    const header = [
      `=== MISSION CONTEXT: ${norm.mission.id} ===`,
      `Goal: ${norm.mission.goal}`,
      `Project: ${norm.project.id} (Scope: ${(norm.project.activeScope || []).join(', ') || 'ALL'})`,
      `Authority: ${auth.token} (${auth.mcl}) - Rank ${auth.rank}`
    ].join('\n');
    sections.push({ name: 'HEADER', text: header, tokens: estimateTokens(header), priority: 1 });
    currentTokens += estimateTokens(header);

    // Priority 2: Constraints & Instructions
    if (norm.constraints.length > 0 || norm.instructions.length > 0) {
      const constrText = [
        '--- CONSTRAINTS & INSTRUCTIONS ---',
        ...norm.constraints.map(c => `[CONSTRAINT] ${c}`),
        ...norm.instructions.map(i => `[INSTRUCTION] ${i}`)
      ].join('\n');
      const tokens = estimateTokens(constrText);
      if (currentTokens + tokens <= maxBudget) {
        sections.push({ name: 'CONSTRAINTS', text: constrText, tokens, priority: 2 });
        currentTokens += tokens;
      }
    }

    // Priority 3: Approved Architectural Decisions (ADRs)
    if (norm.decisions.length > 0) {
      const adrText = [
        '--- APPROVED ARCHITECTURAL DECISIONS ---',
        ...norm.decisions.map(d => `[ADR] ${typeof d === 'string' ? d : d.title || d.id}`)
      ].join('\n');
      const tokens = estimateTokens(adrText);
      if (currentTokens + tokens <= maxBudget) {
        sections.push({ name: 'DECISIONS', text: adrText, tokens, priority: 3 });
        currentTokens += tokens;
      }
    }

    // Priority 4: Verified Evidence Receipts
    if (norm.evidence.length > 0) {
      const evdText = [
        '--- VERIFIED EVIDENCE RECEIPTS ---',
        ...norm.evidence.map(e => `[EVIDENCE] ${e.id} (${e.status || 'VERIFIED'})`)
      ].join('\n');
      const tokens = estimateTokens(evdText);
      if (currentTokens + tokens <= maxBudget) {
        sections.push({ name: 'EVIDENCE', text: evdText, tokens, priority: 4 });
        currentTokens += tokens;
      }
    }

    // Priority 5: Known Unknowns & Gaps
    if (norm.unknowns.length > 0) {
      const unkText = [
        '--- UNRESOLVED UNKNOWNS & GAPS ---',
        ...norm.unknowns.map(u => `[GAP] ${typeof u === 'string' ? u : u.description || u.id}`)
      ].join('\n');
      const tokens = estimateTokens(unkText);
      if (currentTokens + tokens <= maxBudget) {
        sections.push({ name: 'UNKNOWNS', text: unkText, tokens, priority: 5 });
        currentTokens += tokens;
      }
    }

    // Priority 6: Repository Summary
    if (norm.repository.inventorySummary) {
      const repoText = [
        '--- REPOSITORY SUMMARY ---',
        norm.repository.inventorySummary
      ].join('\n');
      const tokens = estimateTokens(repoText);
      if (currentTokens + tokens <= maxBudget) {
        sections.push({ name: 'REPOSITORY', text: repoText, tokens, priority: 6 });
        currentTokens += tokens;
      }
    }

    const compiledPrompt = sections.map(s => s.text).join('\n\n');
    const receiptHash = crypto.createHash('sha256').update(compiledPrompt).digest('hex');

    return {
      schemaVersion: '1.1.0',
      missionId: norm.mission.id,
      compiledAt: new Date().toISOString(),
      tokenBudget: {
        maxBudgetTokens: maxBudget,
        usedTokens: currentTokens,
        remainingTokens: Math.max(0, maxBudget - currentTokens)
      },
      authority: {
        token: auth.token,
        mcl: auth.mcl,
        rank: auth.rank
      },
      sectionsIncluded: sections.map(s => s.name),
      sha256: receiptHash,
      compiledPrompt,
      epistemicStatus: sections.length >= 4 ? 'VERIFIED' : 'PARTIALLY_VERIFIED'
    };
  }

  /**
   * Shorthand adapter for backward-compatible compileContext(missionId, nodeId, budget)
   */
  static compileContext(missionId, nodeId, budget = 4000) {
    return this.compileMissionContext({
      mission: { id: missionId, type: 'TASK', goal: `Execute node ${nodeId}` },
      contract: { autonomyLevel: 'LEVEL_1', maxBudgetTokens: budget }
    });
  }
}

export { ContextCompiler };
