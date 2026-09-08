import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class GraphIntelligencePlane {
  constructor() {
    this.nodes = new Map(); // id -> { id, type, properties }
    this.edges = [];        // [{ sourceId, targetId, relationType, properties }]
    this.indexes = {
      byType: new Map(),
      byProject: new Map()
    };
  }

  // G-01: Canonical Node and Edge Insertion
  addNode(id, type, properties = {}) {
    if (!id || !type) throw new Error('INVALID_NODE: id and type are required');
    const node = { id, type, properties, createdAt: new Date().toISOString() };
    this.nodes.set(id, node);

    if (!this.indexes.byType.has(type)) {
      this.indexes.byType.set(type, new Set());
    }
    this.indexes.byType.get(type).add(id);

    if (properties.projectId) {
      if (!this.indexes.byProject.has(properties.projectId)) {
        this.indexes.byProject.set(properties.projectId, new Set());
      }
      this.indexes.byProject.get(properties.projectId).add(id);
    }
    return node;
  }

  addEdge(sourceId, targetId, relationType, properties = {}) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error(`EDGE_CREATION_FAILED: Nodes ${sourceId} or ${targetId} do not exist`);
    }

    // Constitutional Invariant: Cross-project authority edge is strictly blocked
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);
    const sourceProj = sourceNode.properties.projectId;
    const targetProj = targetNode.properties.projectId;

    if (relationType === 'GRANTS_AUTHORITY' && sourceProj && targetProj && sourceProj !== targetProj) {
      throw new Error(`CONSTITUTIONAL_VIOLATION: Authority edge cannot cross project boundary (${sourceProj} -> ${targetProj})`);
    }

    const edge = { sourceId, targetId, relationType, properties, createdAt: new Date().toISOString() };
    this.edges.push(edge);
    return edge;
  }

  // G-02: Evidence & Provenance Trace Traversal
  traceBeliefProvenance(beliefNodeId) {
    const trace = [];
    let currentId = beliefNodeId;

    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;
      trace.push({ id: node.id, type: node.type, properties: node.properties });

      // Find incoming SUPPORTED_BY or DERIVED_FROM edge
      const edge = this.edges.find(e => e.targetId === currentId && ['SUPPORTED_BY', 'DERIVED_FROM', 'ORIGINATED_FROM'].includes(e.relationType));
      currentId = edge ? edge.sourceId : null;
    }

    return {
      beliefNodeId,
      provenanceChain: trace,
      hopsCount: trace.length,
      isRootedInRawSource: trace.some(n => n.type === 'RAW_SOURCE' || n.type === 'EXECUTION_EVIDENCE')
    };
  }

  // G-03: Decision Graph Lookup
  getDecisionContext(decisionId) {
    const decision = this.nodes.get(decisionId);
    if (!decision || decision.type !== 'DECISION') {
      throw new Error(`DECISION_NOT_FOUND: ${decisionId}`);
    }

    const supportingEvidence = this.edges
      .filter(e => e.sourceId === decisionId && e.relationType === 'BASED_ON')
      .map(e => this.nodes.get(e.targetId));

    const rejectedAlternatives = this.edges
      .filter(e => e.sourceId === decisionId && e.relationType === 'REJECTED_ALTERNATIVE')
      .map(e => this.nodes.get(e.targetId));

    const selectedTool = this.edges
      .filter(e => e.sourceId === decisionId && e.relationType === 'SELECTED_TOOL')
      .map(e => this.nodes.get(e.targetId))[0] || null;

    const rollbackTarget = this.edges
      .filter(e => e.sourceId === decisionId && e.relationType === 'REVERSIBLE_BY')
      .map(e => this.nodes.get(e.targetId))[0] || null;

    return {
      decisionId,
      properties: decision.properties,
      supportingEvidence,
      rejectedAlternatives,
      selectedTool,
      rollbackTarget
    };
  }

  // G-08: Blast Radius / Impact Analysis (What is affected if Tool X changes?)
  analyzeToolBlastRadius(toolId) {
    const affectedAgents = new Set();
    const affectedTasks = new Set();
    const affectedProjects = new Set();

    for (const edge of this.edges) {
      if (edge.targetId === toolId && edge.relationType === 'USES_TOOL') {
        const source = this.nodes.get(edge.sourceId);
        if (source.type === 'AGENT') affectedAgents.add(source.id);
        if (source.type === 'TASK') affectedTasks.add(source.id);
      }
      if (edge.sourceId === toolId && edge.relationType === 'AFFECTS_PROJECT') {
        affectedProjects.add(edge.targetId);
      }
    }

    return {
      toolId,
      affectedAgentsCount: affectedAgents.size,
      affectedTasksCount: affectedTasks.size,
      affectedProjectsCount: affectedProjects.size,
      affectedAgents: Array.from(affectedAgents),
      affectedTasks: Array.from(affectedTasks),
      affectedProjects: Array.from(affectedProjects)
    };
  }

  // G-09: GraphRAG Multi-Hop Relational Retrieval
  traverseGraphRagPath(userSegmentId) {
    const pathTrace = [];
    let currentId = userSegmentId;

    const traversalRelations = ['HAS_JOB', 'MOTIVATES', 'REQUIRES', 'PROVIDED_BY', 'PROVEN_BY_EXPERIMENT', 'ESTABLISHED_BKM'];

    for (const rel of traversalRelations) {
      const edge = this.edges.find(e => e.sourceId === currentId && e.relationType === rel);
      if (!edge) break;
      const nextNode = this.nodes.get(edge.targetId);
      pathTrace.push({ relation: rel, node: nextNode });
      currentId = nextNode.id;
    }

    return {
      startNodeId: userSegmentId,
      pathLength: pathTrace.length,
      pathTrace,
      retrievedBkm: pathTrace.find(p => p.node.type === 'BKM') || null
    };
  }

  // G-10: Graph Integrity & Anti-Contamination Audit
  auditGraphIntegrity() {
    let orphanEvidenceCount = 0;
    let crossProjectAuthorityViolations = 0;
    let staleAuthorizationEdges = 0;

    for (const [id, node] of this.nodes) {
      if (node.type === 'EVIDENCE') {
        const hasConnection = this.edges.some(e => e.sourceId === id || e.targetId === id);
        if (!hasConnection) orphanEvidenceCount++;
      }
    }

    for (const edge of this.edges) {
      if (edge.relationType === 'GRANTS_AUTHORITY') {
        const src = this.nodes.get(edge.sourceId);
        const tgt = this.nodes.get(edge.targetId);
        if (src.properties.projectId !== tgt.properties.projectId) {
          crossProjectAuthorityViolations++;
        }
      }
      if (edge.properties.revoked === true && edge.relationType === 'ACTIVE_AUTHORIZATION') {
        staleAuthorizationEdges++;
      }
    }

    const isHealthy = orphanEvidenceCount === 0 && crossProjectAuthorityViolations === 0 && staleAuthorizationEdges === 0;

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      orphanEvidenceCount,
      crossProjectAuthorityViolations,
      staleAuthorizationEdges,
      isHealthy,
      verdict: isHealthy ? 'GRAPH_INTEGRITY_VERIFIED' : 'GRAPH_INTEGRITY_VIOLATIONS_DETECTED'
    };
  }
}
