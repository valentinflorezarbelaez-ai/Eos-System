/**
 * @module spec-synthesis-compiler-port
 * SPEC-0082 / Mission BY — Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * NON-CLAIM:
 *   spec synthesizer port ≠ automated human architect /
 *   ≠ vibe coding generator /
 *   ≠ PRODUCTION_READY=YES synthesis system.
 *   L22 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L23 OPEN (Mission BY in progress);
 *   Axis: Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/sdd.
 *
 * PRODUCTION_READY: NO
 */

import {
  BY_PRODUCTION_READY,
  BY_RECEIPT_KIND,
  sha256Canonical,
  buildSpecSynthesisReceipt,
  verifySpecSynthesisReceipt
} from './spec-synthesis-receipt.js';

import {
  SpecSynthesisPolicyGate,
  BY_CODES,
  EARS_PATTERNS
} from './spec-synthesis-policy-gate.js';

/** @type {'NO'} */
export const BY_PORT_PRODUCTION_READY = 'NO';

export const BY_PORT_KIND = 'eos-spec-synthesis-compiler-port';

/**
 * Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port.
 */
export class SpecSynthesisCompilerPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new SpecSynthesisPolicyGate();

    /** @type {Map<string, object>} */
    this.specs = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildSpecSynthesisReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Compiles a high-level goal into a formal IEEE 830 EARS and Gherkin BDD specification.
   * @param {object} goal
   * @returns {{ ok: boolean, code: string, specId?: string, spec?: object, receipt: object, reason?: string }}
   */
  compileGoalToSpec(goal) {
    const goalEval = this.gate.evaluateGoal(goal);
    if (!goalEval.valid) {
      const receipt = this._sealReceipt({
        operation: 'SPEC_COMPILE',
        goalId: goal?.goalId || null,
        status: 'DENIED',
        meta: { code: goalEval.code, reason: goalEval.reason }
      });
      return {
        ok: false,
        code: goalEval.code,
        reason: goalEval.reason,
        receipt
      };
    }

    const { goalId, title, objective, context, targetSystem, customRequirements, customScenarios } = goal;
    const cleanId = String(goalId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const specId = `SPEC-BY-${cleanId}`;

    // 1. Synthesize baseline EARS Requirements
    const requirements = [];

    // Event-driven baseline
    requirements.push({
      reqId: `REQ-EARS-${cleanId}-01`,
      type: 'EVENT_DRIVEN',
      statement: `WHEN a valid ${title} request is submitted, THE SYSTEM SHALL execute ${objective}`
    });

    // State-driven baseline
    requirements.push({
      reqId: `REQ-EARS-${cleanId}-02`,
      type: 'STATE_DRIVEN',
      statement: `WHILE processing ${title}, THE SYSTEM SHALL preserve system invariants and transactional integrity`
    });

    // Error-driven baseline
    requirements.push({
      reqId: `REQ-EARS-${cleanId}-03`,
      type: 'ERROR_DRIVEN',
      statement: `IF an anomaly or unrecoverable error occurs, THEN THE SYSTEM SHALL reject the operation fail-closed and emit diagnostic telemetry`
    });

    // Ubiquitous baseline
    requirements.push({
      reqId: `REQ-EARS-${cleanId}-04`,
      type: 'UBIQUITOUS',
      statement: `THE SYSTEM SHALL maintain full cryptographic auditability and zero plain secrets for all operations`
    });

    // Append any valid custom requirements
    if (Array.isArray(customRequirements)) {
      for (let i = 0; i < customRequirements.length; i++) {
        const item = customRequirements[i];
        const stmt = typeof item === 'string' ? item : item?.statement;
        if (stmt) {
          requirements.push({
            reqId: `REQ-EARS-${cleanId}-CUSTOM-${i + 1}`,
            statement: stmt
          });
        }
      }
    }

    // Validate all requirements against EARS grammar and ambiguity rules
    for (const req of requirements) {
      const stmtEval = this.gate.evaluateEARSStatement(req.statement);
      if (!stmtEval.valid) {
        const receipt = this._sealReceipt({
          operation: 'SPEC_COMPILE',
          goalId,
          specId,
          status: 'DENIED',
          meta: { code: stmtEval.code, reason: stmtEval.reason, invalidStatement: req.statement }
        });
        return {
          ok: false,
          code: stmtEval.code,
          reason: `Requirement ${req.reqId} invalid: ${stmtEval.reason}`,
          receipt
        };
      }
      req.pattern = stmtEval.pattern;
    }

    // 2. Synthesize baseline Gherkin BDD Scenarios
    const scenarios = [];

    scenarios.push({
      scenarioId: `BDD-${cleanId}-01`,
      title: `Successful execution of ${title}`,
      given: `the system is in a verified healthy operating state`,
      when: `a valid ${title} operation is triggered with objective ${objective}`,
      then: `the operation completes successfully with exit code 0`,
      and: `state invariants are preserved with zero drift`
    });

    scenarios.push({
      scenarioId: `BDD-${cleanId}-02`,
      title: `Fail-closed rejection of anomalous or unauthorized payload`,
      given: `an input containing invalid fields or unauthorized targets`,
      when: `the system evaluates the incoming request`,
      then: `the operation is rejected fail-closed with structured error code`,
      and: `no state corruption or plain secrets are persisted`
    });

    // Append any valid custom scenarios
    if (Array.isArray(customScenarios)) {
      for (let i = 0; i < customScenarios.length; i++) {
        const sc = customScenarios[i];
        if (sc && typeof sc === 'object') {
          scenarios.push({
            scenarioId: sc.scenarioId || `BDD-${cleanId}-CUSTOM-${i + 1}`,
            title: sc.title || `Custom scenario ${i + 1}`,
            given: sc.given,
            when: sc.when,
            then: sc.then,
            and: sc.and || 'invariants are held'
          });
        }
      }
    }

    // Validate all scenarios against BDD grammar
    for (const sc of scenarios) {
      const scEval = this.gate.evaluateBDDScenario(sc);
      if (!scEval.valid) {
        const receipt = this._sealReceipt({
          operation: 'SPEC_COMPILE',
          goalId,
          specId,
          status: 'DENIED',
          meta: { code: scEval.code, reason: scEval.reason, invalidScenario: sc.scenarioId }
        });
        return {
          ok: false,
          code: scEval.code,
          reason: `Scenario ${sc.scenarioId} invalid: ${scEval.reason}`,
          receipt
        };
      }
    }

    // 3. Assemble Canonical Spec Payload
    const specRecord = {
      specId,
      goalId,
      title,
      objective,
      targetSystem: targetSystem || 'EOS_AUTONOMOUS_CONTROL_PLANE',
      context: context || null,
      requirements,
      scenarios,
      compiledAt: new Date().toISOString()
    };

    const digestHash = this.hashFn({
      specId,
      goalId,
      requirements: requirements.map((r) => ({ id: r.reqId, stmt: r.statement })),
      scenarios: scenarios.map((s) => ({ id: s.scenarioId, title: s.title }))
    });

    specRecord.digestHash = digestHash;
    this.specs.set(specId, specRecord);

    const receipt = this._sealReceipt({
      operation: 'SPEC_COMPILE',
      goalId,
      specId,
      status: 'OK',
      digestHash,
      meta: { requirementCount: requirements.length, scenarioCount: scenarios.length }
    });

    return {
      ok: true,
      code: BY_CODES.SPEC_COMPILED_OK,
      specId,
      spec: Object.freeze({ ...specRecord }),
      receipt
    };
  }

  /**
   * Render compiled spec as standard professional Markdown.
   * @param {string} specId
   * @returns {string|null}
   */
  renderMarkdown(specId) {
    const spec = this.specs.get(specId);
    if (!spec) return null;

    let md = `# Specification — ${spec.title} (${spec.specId})\n\n`;
    md += `**Goal ID:** \`${spec.goalId}\`  \n`;
    md += `**Target System:** \`${spec.targetSystem}\`  \n`;
    md += `**Digest Hash:** \`${spec.digestHash}\`  \n\n`;
    md += `## 1. Functional Requirements (EARS)\n\n`;

    for (const req of spec.requirements) {
      md += `### ${req.reqId} (${req.type || req.pattern || 'EARS'})\n`;
      md += `- ${req.statement}\n\n`;
    }

    md += `## 2. Acceptance Criteria (BDD)\n\n\`\`\`gherkin\n`;
    for (const sc of spec.scenarios) {
      md += `ESCENARIO: ${sc.title}\n`;
      md += `  DADO ${sc.given}\n`;
      md += `  CUANDO ${sc.when}\n`;
      md += `  ENTONCES ${sc.then}\n`;
      if (sc.and) md += `  Y ${sc.and}\n`;
      md += `\n`;
    }
    md += `\`\`\`\n`;

    return md;
  }

  /**
   * Retrieve a compiled spec.
   * @param {string} specId
   * @returns {object|null}
   */
  getSpec(specId) {
    const spec = this.specs.get(specId);
    return spec ? Object.freeze({ ...spec }) : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifySpecTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifySpecSynthesisReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: BY_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: BY_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: BY_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}
