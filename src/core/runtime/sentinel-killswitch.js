import fs from 'node:fs';
import crypto from 'node:crypto';
import { EOSMissionOntologyCore } from './mission-ontology.js';

/**
 * EOS Sentinel Kill-Switch - L0 (Node built-ins only)
 * Intercepts constitutional misalignment and monitors the integrity of the 41 MCP tools.
 */
export class EOSSentinelKillSwitch {
  /**
   * @param {string} ledgerPath Path to the jsonl ledger file.
   * @param {string} [mcpServerPath] Path to the core mcp server file tracking tools.
   */
  constructor(ledgerPath, mcpServerPath = 'src/mcp-server.js') {
    if (!ledgerPath) {
      throw new Error('GOVERNANCE FAULT: Ledger path is a mandatory target.');
    }
    this.ledgerPath = ledgerPath;
    this.mcpServerPath = mcpServerPath;
  }

  /**
   * Computes the SHA-256 hash of the target file to detect structural changes.
   * @private
   */
  #computeFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Validates the active MCP server footprint against a known safe baseline.
   * @param {string} expectedServerHash The authorized checksum of the 41 tools configuration.
   */
  auditMCPServerIntegrity(expectedServerHash) {
    if (!fs.existsSync(this.mcpServerPath)) {
      this.enforceSystemFreeze('Mandatory src/mcp-server.js file has been physically removed from disk.');
    }

    const currentHash = this.#computeFileHash(this.mcpServerPath);
    if (currentHash !== expectedServerHash) {
      this.enforceSystemFreeze(`MCP Server catalog mutation identified. Structural divergence in tools layout. Current: ${currentHash.slice(0, 8)}`);
    }
    return true;
  }

  /**
   * Triggers an immediate synchronous system freeze if any constitutional breach is identified.
   * @param {string} triggerContext Description of the violation.
   */
  enforceSystemFreeze(triggerContext) {
    console.error(`🚨 [SENTINEL PANIC] > CONSTITUTIONAL BREACH INTERCEPTED: ${triggerContext}`);
    const ontology = new EOSMissionOntologyCore();

    const emergencyDecision = {
      optionsConsidered: ['HALT_ALL_WRITE_OPERATIONS', 'FORCE_SYSTEM_EXIT'],
      why: `Sentinel isolated an unauthorized mutation: ${triggerContext.trim()}`,
      confidence: 1.0,
      decisionIssued: 'FORCE_SYSTEM_EXIT',
      outcome: 'SYSTEM_FROZEN_BY_CONSTITUTIONAL_GUARD'
    };

    const emergencyBlock = ontology.compileDecisionBlock(
      { intentId: 'INT-SENTINEL-LOCK', contractHash: 'MCP_CATALOG_CORRUPTION' },
      emergencyDecision
    );

    try {
      fs.appendFileSync(this.ledgerPath, JSON.stringify(emergencyBlock) + '\n', 'utf-8');
      console.error(`🔒 [SENTINEL] > Emergency block appended securely to ledger.`);
    } catch (fsErr) {
      console.error(`🚨 [SENTINEL CRITICAL] > Failed to write emergency metadata: ${fsErr.message}`);
    }

    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw new Error(`SYSTEM_FROZEN_BY_SENTINEL: ${emergencyBlock.missionChainHash}`);
    }
  }
}
