import { describe, it, expect } from 'vitest';
import { OntologyGraph } from '../../../src/core/domain/models/OntologyGraph.js';
import type { OntologyNode, OntologyEdge } from '../../../src/core/domain/models/OntologyGraph.js';

describe('OntologyGraph', () => {
  const nodeA: OntologyNode = { id: 'REQ-001', label: 'Login Requirement', entityType: 'REQUIREMENT' };
  const nodeB: OntologyNode = { id: 'SPEC-001', label: 'Login Spec', entityType: 'SPEC' };
  const nodeC: OntologyNode = { id: 'MOD-001', label: 'Auth Module', entityType: 'MODULE' };

  const validEdge: OntologyEdge = { sourceId: 'REQ-001', targetId: 'SPEC-001', relation: 'TRACES_TO' };
  const orphanSourceEdge: OntologyEdge = { sourceId: 'GHOST-001', targetId: 'SPEC-001', relation: 'VERIFIES' };
  const orphanTargetEdge: OntologyEdge = { sourceId: 'REQ-001', targetId: 'GHOST-002', relation: 'DEPENDS_ON' };

  // --- Construction ---

  it('creates an empty graph', () => {
    const graph = new OntologyGraph();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('creates a graph with nodes and edges', () => {
    const graph = new OntologyGraph([nodeA, nodeB], [validEdge]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  it('freezes nodes and edges', () => {
    const graph = new OntologyGraph([nodeA], [validEdge]);
    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodes)).toBe(true);
    expect(Object.isFrozen(graph.edges)).toBe(true);
  });

  // --- Orphan Detection ---

  it('detects no orphans in a valid graph', () => {
    const graph = new OntologyGraph([nodeA, nodeB], [validEdge]);
    const findings = graph.detectOrphanLinks();
    expect(findings).toHaveLength(0);
  });

  it('detects orphan link with missing source', () => {
    const graph = new OntologyGraph([nodeB], [orphanSourceEdge]);
    const findings = graph.detectOrphanLinks();
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe('SOURCE_NOT_FOUND');
    expect(findings[0]!.edge.sourceId).toBe('GHOST-001');
  });

  it('detects orphan link with missing target', () => {
    const graph = new OntologyGraph([nodeA, nodeB], [orphanTargetEdge]);
    const findings = graph.detectOrphanLinks();
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe('TARGET_NOT_FOUND');
    expect(findings[0]!.edge.targetId).toBe('GHOST-002');
  });

  it('detects multiple orphans simultaneously', () => {
    const graph = new OntologyGraph([nodeC], [orphanSourceEdge, orphanTargetEdge]);
    const findings = graph.detectOrphanLinks();
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty findings for graph with no edges', () => {
    const graph = new OntologyGraph([nodeA, nodeB], []);
    expect(graph.detectOrphanLinks()).toHaveLength(0);
  });

  // --- FDIR Healing ---

  it('heals a graph by pruning orphan edges', () => {
    const graph = new OntologyGraph(
      [nodeA, nodeB],
      [validEdge, orphanSourceEdge, orphanTargetEdge]
    );
    const { healedGraph, purgedEdgesCount } = graph.healAndPrune();
    expect(purgedEdgesCount).toBe(2);
    expect(healedGraph.edges).toHaveLength(1);
    expect(healedGraph.edges[0]!.sourceId).toBe('REQ-001');
    expect(healedGraph.edges[0]!.targetId).toBe('SPEC-001');
  });

  it('heals a clean graph with 0 purged edges', () => {
    const graph = new OntologyGraph([nodeA, nodeB], [validEdge]);
    const { healedGraph, purgedEdgesCount } = graph.healAndPrune();
    expect(purgedEdgesCount).toBe(0);
    expect(healedGraph.edges).toHaveLength(1);
  });

  it('heals a graph with all orphan edges', () => {
    const graph = new OntologyGraph([], [validEdge, orphanSourceEdge]);
    const { healedGraph, purgedEdgesCount } = graph.healAndPrune();
    expect(purgedEdgesCount).toBe(2);
    expect(healedGraph.edges).toHaveLength(0);
  });

  it('returns a new OntologyGraph instance (immutability)', () => {
    const graph = new OntologyGraph([nodeA, nodeB], [validEdge, orphanSourceEdge]);
    const { healedGraph } = graph.healAndPrune();
    expect(healedGraph).not.toBe(graph);
    expect(graph.edges).toHaveLength(2); // original unchanged
    expect(healedGraph.edges).toHaveLength(1);
  });
});
