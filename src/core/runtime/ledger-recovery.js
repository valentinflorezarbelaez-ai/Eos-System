import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { EOSMissionOntologyCore } from './mission-ontology.js';

/**
 * EOS Ledger Recovery Manager - L0 (Node built-ins only)
 * Audits, cleans, and fixes filesystem JSONL truncations derived from un-graceful process kills.
 * Implements atomic temp-file write + renameSync to prevent mid-recovery corruption.
 */
export class EOSLedgerRecovery {
  /**
   * @param {string} ledgerPath Target ledger JSONL file
   */
  constructor(ledgerPath) {
    if (!ledgerPath || typeof ledgerPath !== 'string') {
      throw new Error('GOVERNANCE FAULT: Valid ledger target file path is required.');
    }
    this.ledgerPath = ledgerPath;
  }

  /**
   * Performs atomic file rewrite using temp file + renameSync.
   * @param {string} content
   * @private
   */
  #atomicWrite(content) {
    const dir = path.dirname(this.ledgerPath);
    const tmpPath = path.join(dir, `.tmp_recovery_${process.pid}_${Date.now()}`);
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, this.ledgerPath);
  }

  /**
   * Parses and audits the ledger file line-by-line.
   * Reverts tail truncation or panics on historical mutation.
   * @returns {{ status: string, recoveredBlocks: number }} Verification telemetry receipt
   */
  auditAndRepair() {
    if (!fs.existsSync(this.ledgerPath)) {
      return { status: 'CLEAN_GENESIS', recoveredBlocks: 0 };
    }

    const rawContent = fs.readFileSync(this.ledgerPath, 'utf-8');
    const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const validRawLines = [];
    let stateCorrupted = false;

    for (let i = 0; i < lines.length; i++) {
      const lineStr = lines[i];
      try {
        const block = JSON.parse(lineStr);

        // Isolate block hash metadata for stableStringify execution
        const blockToVerify = { ...block };
        const originalHash = blockToVerify.missionChainHash;
        delete blockToVerify.missionChainHash;

        const material = EOSMissionOntologyCore.stableStringify(blockToVerify);
        const currentHash = `sha256-${crypto.createHash('sha256').update(material).digest('hex')}`;

        if (originalHash !== currentHash) {
          if (i < lines.length - 1) {
            throw new Error(`CRITICAL PANIC: PROVENANCE_VIOLATION detected at block index ${i}. Intermediate history altered.`);
          } else {
            stateCorrupted = true;
            break;
          }
        }

        // Retain exact original line string to preserve byte order
        validRawLines.push(lineStr);
      } catch (err) {
        if (err.message && err.message.includes('PROVENANCE_VIOLATION')) {
          throw err;
        }
        if (i === lines.length - 1) {
          stateCorrupted = true;
          break;
        } else {
          throw new Error(`CRITICAL PANIC: PROVENANCE_VIOLATION intermediate line corrupt or unparseable: ${err.message}`);
        }
      }
    }

    if (stateCorrupted) {
      const healthyContent = validRawLines.length > 0
        ? validRawLines.join('\n') + '\n'
        : '';
      this.#atomicWrite(healthyContent);
      return { status: 'RECOVERED_NOMINAL', recoveredBlocks: validRawLines.length };
    }

    return { status: 'NOMINAL_INTEGRITY', recoveredBlocks: validRawLines.length };
  }
}
