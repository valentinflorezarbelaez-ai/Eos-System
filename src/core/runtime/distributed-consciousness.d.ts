import { MessageEnvelope } from './okidanokh-validator.js';

export interface QuantumNodeState {
  nodeId: string;
  resonanceToken: string;
  amplitudeAlpha?: number;
  amplitudeBeta?: number;
  isEntangled?: boolean;
}

export interface ResonanceNodeConfig {
  envelope: MessageEnvelope;
  transientBuffer?: { fill(value: number): any };
}

export interface ResonanceNodeEntry {
  nodeId: string;
  status: 'ACTIVE_RESONANCE' | 'DISCONNECTED_COLLAPSED';
  resonanceToken: string;
  lastSyncTime: number;
  transientBuffer?: { fill(value: number): any } | null;
  collapseReason?: string;
}

export class DistributedConsciousnessPlane {
  public localNodeId: string;
  public genesisHash: string;
  public nodes: Map<string, ResonanceNodeEntry>;
  public stateLedger: Array<{ delta: any; hash: string; timestamp: number }>;

  constructor(options?: { localNodeId?: string; genesisHash?: string });

  /**
   * Acopla un nodo remoto al plano de resonancia L1.
   */
  public linkNode(nodeId: string, nodeConfig?: ResonanceNodeConfig): {
    status: string;
    nodeId: string;
    resonanceToken: string;
    pleromaHash: string;
  };

  /**
   * Difunde una actualización de estado de forma síncrona a toda la red.
   */
  public broadcastState(stateDelta: any): {
    broadcastStatus: string;
    payloadHash: string;
    syncedNodes: number;
  };

  /**
   * Ejecuta el colapso de onda y la purga inmediata de un nodo disonante.
   */
  public collapseWave(nodeId: string, reason?: string): {
    status: string;
    nodeId: string;
    reason?: string;
    purged?: boolean;
  };
}
