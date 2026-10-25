import {
  OntologyGraph,
  OrphanFinding
} from '../core/domain/models/OntologyGraph.js';

export interface FDIRHealingReport {
  readonly timestamp: string;
  readonly status: 'CLEAN' | 'ORPHAN_LINK_DETECTED' | 'HEALED';
  readonly initialEdgesCount: number;
  readonly orphanFindings: readonly OrphanFinding[];
  readonly healedGraph: OntologyGraph;
  readonly purgedEdgesCount: number;
}

/**
 * EOSFDIROntology (Failure Detection, Isolation & Recovery Layer)
 * Acts as the clinical firewall over the Knowledge Ontology.
 * Isolates and purges orphan links, restoring relational harmony.
 */
export class EOSFDIROntology {
  auditAndHeal(graph: OntologyGraph): FDIRHealingReport {
    const findings = graph.detectOrphanLinks();

    if (findings.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        status: 'CLEAN',
        initialEdgesCount: graph.edges.length,
        orphanFindings: [],
        healedGraph: graph,
        purgedEdgesCount: 0
      };
    }

    const { healedGraph, purgedEdgesCount } = graph.healAndPrune();

    return {
      timestamp: new Date().toISOString(),
      status: 'HEALED',
      initialEdgesCount: graph.edges.length,
      orphanFindings: findings,
      healedGraph,
      purgedEdgesCount
    };
  }
}
