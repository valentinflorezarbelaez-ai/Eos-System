/**
 * @module semantic-graph
 * SPEC-0056 / Mission AY — Semantic graph nodes/edges helpers for AST &
 * Semantic Graph Reasoning Port.
 *
 * Node kinds: symbol, module, import, export, call
 * Edge kinds: dependency, calls, imports, exports, declares, member_of
 *
 * NON-CLAIM:
 *   semantic graph ≠ full IDE / ≠ language-server marketplace /
 *   ≠ CloudAgent code intelligence SaaS
 *   not AZ/BA/BB
 *   Fundacion Δ=0
 *   Antigravity-first
 *   L17 CLOSED never reopen; L18 OPEN; AX MEASURED; compose/extend AG + inject into AX
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AY_GRAPH_PRODUCTION_READY = 'NO';

export const AY_GRAPH_KIND = 'eos-ast-semantic-graph';

export const NODE_KINDS = Object.freeze({
  SYMBOL: 'symbol',
  MODULE: 'module',
  IMPORT: 'import',
  EXPORT: 'export',
  CALL: 'call'
});

export const EDGE_KINDS = Object.freeze({
  DEPENDENCY: 'dependency',
  CALLS: 'calls',
  IMPORTS: 'imports',
  EXPORTS: 'exports',
  DECLARES: 'declares',
  MEMBER_OF: 'member_of'
});

/**
 * Create an empty hermetic semantic graph.
 * @param {object} [meta]
 * @returns {object}
 */
export function createGraph(meta = {}) {
  return {
    kind: AY_GRAPH_KIND,
    PRODUCTION_READY: AY_GRAPH_PRODUCTION_READY,
    nodes: [],
    edges: [],
    meta: {
      hermetic: true,
      fullIde: false,
      languageServerMarketplace: false,
      cloudAgentCodeIntelligence: false,
      ...meta
    }
  };
}

/**
 * @param {object} graph
 * @param {object} node
 * @returns {object} the node (with id)
 */
export function addNode(graph, node) {
  if (!graph || typeof graph !== 'object' || !Array.isArray(graph.nodes)) {
    throw new Error('addNode: malformed graph');
  }
  if (!node || typeof node !== 'object' || !node.kind || !node.name) {
    throw new Error('addNode: node requires kind and name');
  }
  const id =
    node.id != null
      ? String(node.id)
      : `${node.kind}:${node.name}:${graph.nodes.length}`;
  const n = {
    id,
    kind: String(node.kind),
    name: String(node.name),
    ...(node.line != null ? { line: Number(node.line) } : {}),
    ...(node.col != null ? { col: Number(node.col) } : {}),
    ...(node.meta != null ? { meta: node.meta } : {})
  };
  graph.nodes.push(n);
  return n;
}

/**
 * @param {object} graph
 * @param {object} edge
 * @returns {object}
 */
export function addEdge(graph, edge) {
  if (!graph || typeof graph !== 'object' || !Array.isArray(graph.edges)) {
    throw new Error('addEdge: malformed graph');
  }
  if (!edge || typeof edge !== 'object' || !edge.kind || !edge.from || !edge.to) {
    throw new Error('addEdge: edge requires kind, from, to');
  }
  const e = {
    id:
      edge.id != null
        ? String(edge.id)
        : `e:${edge.kind}:${edge.from}->${edge.to}:${graph.edges.length}`,
    kind: String(edge.kind),
    from: String(edge.from),
    to: String(edge.to),
    ...(edge.meta != null ? { meta: edge.meta } : {})
  };
  graph.edges.push(e);
  return e;
}

/**
 * @param {object} graph
 * @param {string} id
 * @returns {object|null}
 */
export function findNodeById(graph, id) {
  if (!isWellFormedGraph(graph)) return null;
  return graph.nodes.find((n) => n.id === id) || null;
}

/**
 * @param {object} graph
 * @param {string} kind
 * @param {string} [name]
 * @returns {object[]}
 */
export function findNodes(graph, kind, name) {
  if (!isWellFormedGraph(graph)) return [];
  return graph.nodes.filter((n) => {
    if (kind && n.kind !== kind) return false;
    if (name != null && n.name !== name) return false;
    return true;
  });
}

/**
 * @param {object} graph
 * @param {string} [kind]
 * @param {string} [from]
 * @param {string} [to]
 * @returns {object[]}
 */
export function findEdges(graph, kind, from, to) {
  if (!isWellFormedGraph(graph)) return [];
  return graph.edges.filter((e) => {
    if (kind && e.kind !== kind) return false;
    if (from != null && e.from !== from) return false;
    if (to != null && e.to !== to) return false;
    return true;
  });
}

/**
 * Symbol resolution stub: find symbol nodes by name.
 * @param {object} graph
 * @param {string} name
 * @returns {object[]}
 */
export function resolveSymbol(graph, name) {
  return findNodes(graph, NODE_KINDS.SYMBOL, name);
}

/**
 * Call hierarchy stub: callers of a symbol / calls from a symbol.
 * @param {object} graph
 * @param {string} symbolName
 * @returns {{ callees: object[], callers: object[], calls: object[] }}
 */
export function callHierarchy(graph, symbolName) {
  const symbols = resolveSymbol(graph, symbolName);
  const symbolIds = new Set(symbols.map((s) => s.id));
  const calls = findEdges(graph, EDGE_KINDS.CALLS).filter(
    (e) => symbolIds.has(e.from) || symbolIds.has(e.to)
  );
  const callees = [];
  const callers = [];
  for (const e of calls) {
    if (symbolIds.has(e.from)) {
      const t = findNodeById(graph, e.to);
      if (t) callees.push(t);
    }
    if (symbolIds.has(e.to)) {
      const f = findNodeById(graph, e.from);
      if (f) callers.push(f);
    }
  }
  return { callees, callers, calls };
}

/**
 * List import nodes / import edges.
 * @param {object} graph
 * @returns {{ imports: object[], edges: object[] }}
 */
export function listImports(graph) {
  return {
    imports: findNodes(graph, NODE_KINDS.IMPORT),
    edges: findEdges(graph, EDGE_KINDS.IMPORTS)
  };
}

/**
 * List export nodes / export edges.
 * @param {object} graph
 * @returns {{ exports: object[], edges: object[] }}
 */
export function listExports(graph) {
  return {
    exports: findNodes(graph, NODE_KINDS.EXPORT),
    edges: findEdges(graph, EDGE_KINDS.EXPORTS)
  };
}

/**
 * Dependency edges (module → imported module).
 * @param {object} graph
 * @returns {object[]}
 */
export function listDependencies(graph) {
  return findEdges(graph, EDGE_KINDS.DEPENDENCY);
}

/**
 * Validate graph shape (fail-closed).
 * @param {unknown} graph
 * @returns {boolean}
 */
export function isWellFormedGraph(graph) {
  if (graph == null || typeof graph !== 'object') return false;
  const g = /** @type {Record<string, unknown>} */ (graph);
  if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return false;
  for (const n of g.nodes) {
    if (
      n == null ||
      typeof n !== 'object' ||
      typeof /** @type {any} */ (n).id !== 'string' ||
      typeof /** @type {any} */ (n).kind !== 'string' ||
      typeof /** @type {any} */ (n).name !== 'string'
    ) {
      return false;
    }
  }
  for (const e of g.edges) {
    if (
      e == null ||
      typeof e !== 'object' ||
      typeof /** @type {any} */ (e).kind !== 'string' ||
      typeof /** @type {any} */ (e).from !== 'string' ||
      typeof /** @type {any} */ (e).to !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Snapshot summary for receipts (no secrets).
 * @param {object} graph
 * @returns {object}
 */
export function graphSummary(graph) {
  if (!isWellFormedGraph(graph)) {
    return { wellFormed: false, nodeCount: 0, edgeCount: 0 };
  }
  const byKind = {};
  for (const n of graph.nodes) {
    byKind[n.kind] = (byKind[n.kind] || 0) + 1;
  }
  return {
    wellFormed: true,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    byKind,
    hermetic: true,
    fullIde: false,
    languageServerMarketplace: false,
    cloudAgentCodeIntelligence: false
  };
}

export default {
  AY_GRAPH_KIND,
  AY_GRAPH_PRODUCTION_READY,
  NODE_KINDS,
  EDGE_KINDS,
  createGraph,
  addNode,
  addEdge,
  findNodeById,
  findNodes,
  findEdges,
  resolveSymbol,
  callHierarchy,
  listImports,
  listExports,
  listDependencies,
  isWellFormedGraph,
  graphSummary
};
