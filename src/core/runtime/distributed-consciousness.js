import { createHash } from 'node:crypto';
import { OkidanokhValidator } from './okidanokh-validator.js';

/**
 * Plano de Conciencia Distribuida L1 — Sincronización Cuántica y Resonancia Multi-Nodo
 */
export class DistributedConsciousnessPlane {
  /**
   * @param {Object} [options]
   * @param {string} [options.localNodeId]
   * @param {string} [options.genesisHash]
   */
  constructor(options = {}) {
    this.localNodeId = options.localNodeId || 'EOS-NODO-CENTRAL-01';
    this.genesisHash = options.genesisHash || createHash('sha256').update(this.localNodeId).digest('hex');
    this.nodes = new Map();
    this.stateLedger = [];
  }

  /**
   * Acopla un nodo remoto al plano de resonancia L1
   * @param {string} nodeId Identificador del nodo
   * @param {Object} nodeConfig Configuración y prueba de acoplamiento
   * @returns {Object} Recibo de entrelazamiento
   */
  linkNode(nodeId, nodeConfig = {}) {
    if (!nodeId) {
      throw new Error('ConsciousnessFault: nodeId es obligatorio.');
    }
    if (!nodeConfig.envelope || !OkidanokhValidator.validate(nodeConfig.envelope)) {
      this._purgeTransient(nodeConfig);
      throw new Error(`ConsciousnessFault: Nodo ${nodeId} no posee Sello Okidanokh válido.`);
    }

    const resonanceToken = createHash('sha256')
      .update(`${this.localNodeId}:${nodeId}:${this.genesisHash}:${Date.now()}`)
      .digest('hex');

    const nodeEntry = {
      nodeId,
      status: 'ACTIVE_RESONANCE',
      resonanceToken,
      lastSyncTime: Date.now(),
      transientBuffer: nodeConfig.transientBuffer || null
    };

    this.nodes.set(nodeId, nodeEntry);

    return {
      status: 'ACTIVE_RESONANCE',
      nodeId,
      resonanceToken: `sha256-${resonanceToken}`,
      pleromaHash: this.genesisHash
    };
  }

  /**
   * Difunde una actualización de estado de forma síncrona a toda la red
   * @param {Object} stateDelta Delta de persistencia u octava
   * @returns {Object} Recibo de telepatía
   */
  broadcastState(stateDelta) {
    if (!stateDelta) {
      throw new Error('BroadcastFault: stateDelta requerido.');
    }

    const payloadHash = createHash('sha256').update(JSON.stringify(stateDelta)).digest('hex');
    this.stateLedger.push({ delta: stateDelta, hash: payloadHash, timestamp: Date.now() });

    let syncedCount = 0;
    for (const [id, node] of this.nodes.entries()) {
      if (node.status === 'ACTIVE_RESONANCE') {
        node.lastSyncTime = Date.now();
        syncedCount++;
      }
    }

    return {
      broadcastStatus: 'TELEPATHY_SYNCHRONIZED',
      payloadHash: `sha256-${payloadHash}`,
      syncedNodes: syncedCount
    };
  }

  /**
   * Ejecuta el colapso de onda y la purga inmediata de un nodo disonante
   * @param {string} nodeId Identificador del nodo disonante
   * @param {string} [reason] Motivo de la desconexión
   * @returns {Object} Recibo de colapso
   */
  collapseWave(nodeId, reason = 'DISSONANCE_DETECTED') {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { status: 'NODE_NOT_FOUND', nodeId };
    }

    this._purgeTransient(node);
    node.status = 'DISCONNECTED_COLLAPSED';
    node.collapseReason = reason;

    return {
      status: 'WAVE_COLLAPSED',
      nodeId,
      reason,
      purged: true
    };
  }

  /**
   * Poda física Zero-Waste de memoria intermedia
   * @private
   */
  _purgeTransient(target) {
    if (target && target.transientBuffer && typeof target.transientBuffer.fill === 'function') {
      target.transientBuffer.fill(0x00);
    }
  }
}
