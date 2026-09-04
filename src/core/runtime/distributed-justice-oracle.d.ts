import { MessageEnvelope } from './okidanokh-validator.js';

export interface DAGNode {
  hash: string;
  envelope: MessageEnvelope;
  cohesionShocks?: number;
  timestamp?: number;
  transientBuffer?: { fill(value: number): any };
  purged?: boolean;
}

export class DistributedJusticeOracle {
  /**
   * Resuelve de manera fría y determinista una colisión entre dos ramas concurrentes en el DAG.
   * Aplica la ecuación de desempate en 4 niveles y ejecuta la poda Zero-Waste del nodo perdedor.
   */
  public static adjudicate(nodeA: DAGNode, nodeB: DAGNode): DAGNode;

  /**
   * Poda física Zero-Waste del nodo perdedor mediante sobreescritura con 0x00.
   */
  private static _purgeNode(node: DAGNode): void;
}
