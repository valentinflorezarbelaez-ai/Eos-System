import { createHash } from 'node:crypto';
import { OkidanokhValidator } from './okidanokh-validator.js';

/**
 * Oráculo de Justicia Distribuida - Consenso Determinista L0
 */
export class DistributedJusticeOracle {
  /**
   * Resuelve una colisión entre dos ramas concurrentes en el DAG
   * @param {Object} nodeA Primer bloque candidato
   * @param {Object} nodeB Segundo bloque candidato
   * @returns {Object} El bloque ganador legítimo
   */
  static adjudicate(nodeA, nodeB) {
    // Nivel 1: Validación del Sello del Okidanokh
    const validA = OkidanokhValidator.validate(nodeA.envelope);
    const validB = OkidanokhValidator.validate(nodeB.envelope);

    if (!validA && !validB) {
      this._purgeNode(nodeA);
      this._purgeNode(nodeB);
      throw new Error('JusticePurgeException: Ambas ramas carecen de alineación triádica.');
    }
    if (!validA) { this._purgeNode(nodeA); return nodeB; }
    if (!validB) { this._purgeNode(nodeB); return nodeA; }

    // Nivel 2: Cohesión Triádica (Cantidad de Shocks)
    const shocksA = nodeA.cohesionShocks || 0;
    const shocksB = nodeB.cohesionShocks || 0;
    if (shocksA !== shocksB) {
      const loser = shocksA < shocksB ? nodeA : nodeB;
      const winner = shocksA > shocksB ? nodeA : nodeB;
      this._purgeNode(loser);
      return winner;
    }

    // Nivel 3: Antigüedad Criptográfica (Menor Timestamp)
    const timeA = nodeA.timestamp || Infinity;
    const timeB = nodeB.timestamp || Infinity;
    if (timeA !== timeB) {
      const loser = timeA > timeB ? nodeA : nodeB;
      const winner = timeA < timeB ? nodeA : nodeB;
      this._purgeNode(loser);
      return winner;
    }

    // Nivel 4: Desempate Lexicográfico de Hash Invariante
    const hashA = nodeA.hash || '';
    const hashB = nodeB.hash || '';
    if (hashA < hashB) {
      this._purgeNode(nodeB);
      return nodeA;
    } else {
      this._purgeNode(nodeA);
      return nodeB;
    }
  }

  /**
   * Poda física Zero-Waste del nodo perdedor
   * @private
   */
  static _purgeNode(node) {
    if (node && node.transientBuffer && typeof node.transientBuffer.fill === 'function') {
      node.transientBuffer.fill(0x00);
    }
    node.purged = true;
  }
}
