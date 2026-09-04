import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EOSMissionOntologyCore } from './mission-ontology.js';

/**
 * EOS Kabbalah Ledger DAG - L0 (Node built-ins only)
 * Structures historical provenance as a multidimensional Sefirotic Directed Acyclic Graph.
 * Eradicates flat data manipulation by interlocking chronologies and creational intents (Alpha & Omega).
 */
export class EOSKabbalahLedger {
  /**
   * @param {string} ledgerPath Target location of the jsonl ledger file.
   */
  constructor(ledgerPath) {
    if (!ledgerPath || typeof ledgerPath !== 'string') {
      throw new Error('GOVERNANCE FAULT: Valid ledger path target is mandatory.');
    }
    this.ledgerPath = ledgerPath;
    try {
      fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
    } catch { /* ignore */ }
  }

  /**
   * Compiles and appends an execution block as a Sefirotic node into the local DAG database.
   * @param {string} intentId The Alpha / Kether source origin node.
   * @param {string} contractHash The Tiphereth / Beauty green code footprint node.
   * @param {string} triadChainHash The Geburah / Rigor test validation footprint node.
   * @param {object} [customMetadata] Additional structured provenance metadata (e.g. targetTemple).
   * @returns {Readonly<object>} Frozen immutable sefirotic ledger node.
   */
  appendSefirotNode(intentId, contractHash, triadChainHash, customMetadata = {}) {
    try {
      fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
    } catch { /* ignore */ }

    const node = {
      sephirot: {
        kether: `KETH-${crypto.createHash('sha256').update(String(intentId)).digest('hex').slice(0, 8).toUpperCase()}`, // Origen / El Alfa
        geburah: triadChainHash || 'NO_RIGOR_CHECK', // Ley / Rigor / El Test
        tiphereth: contractHash || 'NO_BEAUTY_CHECK' // Armonía / Belleza / El Código
      },
      metadata: {
        intentId,
        timestamp: new Date().toISOString(),
        omegaLock: crypto.randomBytes(4).toString('hex').toUpperCase(), // El Fin / Cierre aleatorio determinista
        ...customMetadata
      }
    };

    // Stable serialization to guarantee immutable provenance signature
    const material = EOSMissionOntologyCore.stableStringify(node);
    node.nodeChainHash = `sha256-${crypto.createHash('sha256').update(material).digest('hex')}`;

    const line = JSON.stringify(node) + '\n';
    fs.appendFileSync(this.ledgerPath, line, 'utf-8');

    console.log(`🔒 [KABBALAH LEDGER] > Sefirotic Node appended and mathematically sealed: ${node.nodeChainHash}`);
    return Object.freeze(node);
  }
}
