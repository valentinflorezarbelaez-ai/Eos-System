/**
 * OntologyNode and OntologyGraph (Pure Domain)
 * Implements clinical FDIR graph healing against orphan links.
 */

export interface OntologyNode {
  readonly id: string;
  readonly label: string;
  readonly entityType: 'REQUIREMENT' | 'SPEC' | 'EVIDENCE' | 'MODULE' | 'TASK';
}

export interface OntologyEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relation: 'TRACES_TO' | 'VERIFIES' | 'DEPENDS_ON' | 'IMPLEMENTS';
}

export interface OrphanFinding {
  readonly edge: OntologyEdge;
  readonly reason: 'SOURCE_NOT_FOUND' | 'TARGET_NOT_FOUND';
  readonly detectedAt: string;
}

export class OntologyGraph {
  readonly nodes: readonly OntologyNode[];
  readonly edges: readonly OntologyEdge[];

  constructor(
    nodes: readonly OntologyNode[] = [],
    edges: readonly OntologyEdge[] = []
  ) {
    this.nodes = Object.freeze([...nodes]);
    this.edges = Object.freeze([...edges]);
    Object.freeze(this);
  }

  /**
   * Scans all edges against active node IDs.
   * Detects any ORPHAN_LINK_DETECTED anomalies.
   */
  detectOrphanLinks(): readonly OrphanFinding[] {
    const validNodeIds = new Set(this.nodes.map((n) => n.id));
    const findings: OrphanFinding[] = [];
    const now = new Date().toISOString();

    for (const edge of this.edges) {
      if (!validNodeIds.has(edge.sourceId)) {
        findings.push({
          edge,
          reason: 'SOURCE_NOT_FOUND',
          detectedAt: now
        });
      } else if (!validNodeIds.has(edge.targetId)) {
        findings.push({
          edge,
          reason: 'TARGET_NOT_FOUND',
          detectedAt: now
        });
      }
    }

    return Object.freeze(findings);
  }

  /**
   * Autonomous FDIR Healing:
   * Prunes orphan links and returns a healed, consistent OntologyGraph.
   */
  healAndPrune(): { healedGraph: OntologyGraph; purgedEdgesCount: number } {
    const validNodeIds = new Set(this.nodes.map((n) => n.id));
    const validEdges = this.edges.filter(
      (e) => validNodeIds.has(e.sourceId) && validNodeIds.has(e.targetId)
    );

    const purgedEdgesCount = this.edges.length - validEdges.length;
    const healedGraph = new OntologyGraph(this.nodes, validEdges);

    return {
      healedGraph,
      purgedEdgesCount
    };
  }
}
