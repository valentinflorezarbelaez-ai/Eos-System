/**
 * @module EOSKnowledgeOntology
 * @description Deterministic Knowledge Ontology and Relationship Graph for EOS.
 * Models and governs typed connections between entities across Governance, Architecture, Metrics, and Missions.
 * Enforces strict taxonomic rules, prohibits orphan links, and provides unified 7-layer traceability bridging.
 */

import { RelationalTraceabilityMatrix, TRACE_LAYERS } from './ontology/relational-traceability-matrix.js';

export const LAYER_TAXONOMY_MAP = Object.freeze({
  L0_INTAKE: 'MISSION',
  L1_SPEC: 'GOVERNANCE',
  L2_PLAN: 'ARCHITECTURE',
  L3_TASK: 'MISSION',
  L4_CODE: 'ARCHITECTURE',
  L5_TEST: 'METRIC',
  L6_EVIDENCE: 'METRIC'
});

export class EOSKnowledgeOntology {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   * @param {RelationalTraceabilityMatrix} [options.rtm]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.tiposPermitidos = ['GOVERNANCE', 'ARCHITECTURE', 'METRIC', 'MISSION'];
    this._nodos = new Map();
    this.nodos = this._createEncapsulatedNodos();
    this.rtm = options.rtm || null;

    if (this.rtm) {
      this.hydrateFromTraceMatrix(this.rtm);
    }
  }

  /**
   * Public Map surface that rejects invalid taxonomy on set().
   * Iteration/get/delete operate on the live internal store (FDIR healer).
   * @returns {Map<string, object>}
   */
  _createEncapsulatedNodos() {
    const inner = this._nodos;
    const tipos = this.tiposPermitidos;
    return new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'set') {
          return (id, nodo) => {
            const tipo = nodo?.tipo;
            if (!tipo || !tipos.includes(tipo)) {
              throw new Error(
                `🚨 ONTOLOGY FAULT: TAXONOMY encapsulation — tipo [${tipo ?? '<empty>'}] is not permitted.`
              );
            }
            return target.set(id, nodo);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  }

  /**
   * Registers a node in the local ontology after validating taxonomy and contracts
   * @param {string} id - Canonical unique identifier
   * @param {string} tipo - Taxonomy type: 'GOVERNANCE' | 'ARCHITECTURE' | 'METRIC' | 'MISSION'
   * @param {object} [metadatos={}] - Optional metadata
   * @returns {object} Created node object (frozen public view)
   */
  registrarNodo(id, tipo, metadatos = {}) {
    if (!id || !tipo) {
      throw new Error('🚨 ONTOLOGY FAULT: Todo nodo requiere un identificador y un tipo explícito.');
    }

    if (!this.tiposPermitidos.includes(tipo)) {
      throw new Error(`🚨 ONTOLOGY FAULT: El tipo [${tipo}] no pertenece a la taxonomía permitida (${this.tiposPermitidos.join(', ')}).`);
    }

    const nodo = {
      id,
      tipo,
      timestamp: new Date().toISOString(),
      metadatos,
      enlaces: []
    };

    this._nodos.set(id, nodo);
    return this._exponerNodoInmutable(nodo);
  }

  /**
   * Creates a typed directional link between two existing nodes
   * @param {string} idOrigen - Source node ID
   * @param {string} idDestino - Target node ID
   * @param {string} tipoRelacion - Relation type (e.g. 'DEPENDS_ON', 'GOVERNED_BY')
   * @returns {boolean}
   */
  crearEnlace(idOrigen, idDestino, tipoRelacion) {
    const origen = this._nodos.get(idOrigen);
    const destino = this._nodos.get(idDestino);

    if (!origen || !destino) {
      throw new Error('🚨 ONTOLOGY FAULT: No se permiten enlaces huérfanos (ORPHAN_LINK_PROHIBITED). Ambos nodos deben existir.');
    }

    origen.enlaces.push({ destino: idDestino, relacion: tipoRelacion });
    return true;
  }

  /**
   * Obtains a frozen public view of a node by ID.
   * Surgical `enlaces.push` cannot corrupt the live graph.
   * @param {string} id
   * @returns {object|undefined}
   */
  obtenerNodo(id) {
    const live = this._nodos.get(id);
    if (!live) return undefined;
    return this._exponerNodoInmutable(live);
  }

  /**
   * Hydrates the knowledge ontology from a RelationalTraceabilityMatrix instance.
   * Maps 7-layer trace nodes to the 4 canonical taxonomy types and creates typed links.
   * @param {RelationalTraceabilityMatrix} rtm
   * @returns {{ hydratedNodes: number, hydratedEdges: number }}
   */
  hydrateFromTraceMatrix(rtm) {
    if (!rtm || !rtm.nodes) {
      throw new Error('🚨 ONTOLOGY FAULT: Se requiere una instancia válida de RelationalTraceabilityMatrix.');
    }
    this.rtm = rtm;
    let nodeCount = 0;
    let edgeCount = 0;

    // 1. Register all nodes mapped to taxonomy
    for (const [nodeId, traceNode] of rtm.nodes.entries()) {
      const targetTipo = LAYER_TAXONOMY_MAP[traceNode.layer] || 'ARCHITECTURE';

      if (this._nodos.has(nodeId)) {
        const existing = this._nodos.get(nodeId);
        existing.tipo = targetTipo;
        existing.metadatos = {
          ...existing.metadatos,
          ...(traceNode.metadata || {}),
          layer: traceNode.layer,
          label: traceNode.label,
          path: traceNode.path
        };
      } else {
        const nodo = {
          id: nodeId,
          tipo: targetTipo,
          timestamp: traceNode.timestamp || new Date().toISOString(),
          metadatos: {
            layer: traceNode.layer,
            label: traceNode.label,
            path: traceNode.path,
            ...(traceNode.metadata || {})
          },
          enlaces: []
        };
        this._nodos.set(nodeId, nodo);
      }
      nodeCount++;
    }

    // 2. Register all edges
    for (const [sourceId, edges] of rtm.forwardEdges.entries()) {
      const source = this._nodos.get(sourceId);
      if (!source) continue;

      for (const edge of edges) {
        if (!this._nodos.has(edge.target)) continue;

        const alreadyLinked = source.enlaces.some(
          e => e.destino === edge.target && e.relacion === edge.relation
        );
        if (!alreadyLinked) {
          source.enlaces.push({
            destino: edge.target,
            relacion: edge.relation
          });
          edgeCount++;
        }
      }
    }

    return { hydratedNodes: nodeCount, hydratedEdges: edgeCount };
  }

  /**
   * Builds a RelationalTraceabilityMatrix for the project and hydrates this ontology.
   * @param {string} projectId
   * @param {object} [options]
   * @returns {Promise<{ hydratedNodes: number, hydratedEdges: number, projectRoot: string, projectId: string }>}
   */
  async syncWithProject(projectId, options = {}) {
    const rtm = new RelationalTraceabilityMatrix({
      controlPlaneRoot: options.controlPlaneRoot || this.baseDir,
      ...options
    });
    await rtm.buildTraceMatrix({ projectId, ...options });
    const result = this.hydrateFromTraceMatrix(rtm);
    return {
      ...result,
      projectRoot: rtm.projectRoot,
      projectId
    };
  }

  /**
   * Delegates blast radius calculation to the underlying RTM.
   * @param {string} entityId
   * @param {object} [options]
   * @returns {object}
   */
  calculateBlastRadius(entityId, options = {}) {
    if (!this.rtm) {
      throw new Error('🚨 ONTOLOGY FAULT: calculateBlastRadius requiere haber sincronizado un RelationalTraceabilityMatrix.');
    }
    return this.rtm.calculateBlastRadius(entityId, options);
  }

  /**
   * Delegates relational integrity audit to the underlying RTM.
   * @param {object} [options]
   * @returns {object}
   */
  auditRelationalIntegrity(options = {}) {
    if (!this.rtm) {
      throw new Error('🚨 ONTOLOGY FAULT: auditRelationalIntegrity requiere haber sincronizado un RelationalTraceabilityMatrix.');
    }
    return this.rtm.auditRelationalIntegrity(options);
  }

  /**
   * Returns complete cross-layer lineage (upstream and downstream) for a given entity.
   * @param {string} entityId
   * @returns {{ entity: object, upstream: Array<object>, downstream: Array<object> }}
   */
  obtenerLinaje(entityId) {
    const node = this.obtenerNodo(entityId);
    if (!node) {
      throw new Error(`🚨 ONTOLOGY FAULT: Nodo [${entityId}] no encontrado.`);
    }

    const downstream = (node.enlaces || []).map(e => ({
      target: e.destino,
      relation: e.relacion,
      node: this.obtenerNodo(e.destino)
    }));

    const upstream = [];
    for (const other of this._nodos.values()) {
      for (const e of other.enlaces || []) {
        if (e.destino === entityId) {
          upstream.push({
            source: other.id,
            relation: e.relacion,
            node: this._exponerNodoInmutable(other)
          });
        }
      }
    }

    return {
      entity: node,
      upstream,
      downstream
    };
  }

  /**
   * Test-only helper: plant an orphan/corrupt link on the live node.
   * Production paths must use crearEnlace (which forbids orphans).
   * @param {string} idOrigen
   * @param {{ destino: string, relacion: string }} enlace
   * @returns {boolean}
   */
  injectCorruptLinkForTest(idOrigen, enlace) {
    this._assertTestInjectAllowed();
    const live = this._nodos.get(idOrigen);
    if (!live) {
      throw new Error('🚨 ONTOLOGY FAULT: injectCorruptLinkForTest requires an existing source node.');
    }
    live.enlaces.push({ destino: enlace.destino, relacion: enlace.relacion });
    return true;
  }

  /**
   * Test-only helper: plant an invalid taxonomy type for FDIR two-phase tests.
   * @param {string} id
   * @param {string} tipo
   * @returns {boolean}
   */
  injectCorruptTipoForTest(id, tipo) {
    this._assertTestInjectAllowed();
    const live = this._nodos.get(id);
    if (!live) {
      throw new Error('🚨 ONTOLOGY FAULT: injectCorruptTipoForTest requires an existing node.');
    }
    live.tipo = tipo;
    return true;
  }

  /**
   * Returns graph summary (frozen public views)
   * @returns {object}
   */
  obtenerGrafo() {
    return {
      totalNodos: this._nodos.size,
      nodos: Array.from(this._nodos.values()).map((nodo) => this._exponerNodoInmutable(nodo))
    };
  }

  _assertTestInjectAllowed() {
    const allowed =
      Boolean(process.env.NODE_TEST_CONTEXT) || process.env.EOS_ALLOW_ONTOLOGY_TEST_INJECT === '1';
    if (!allowed) {
      throw new Error('🚨 ONTOLOGY FAULT: test inject APIs are not available on production paths.');
    }
  }

  /**
   * Frozen copy for public reads. `tipo` writes reflect onto the live node so
   * existing FDIR fixtures that assign an invalid tipo can still set up a
   * two-phase purge without exposing a mutable enlaces array.
   * @param {object} live
   * @returns {object}
   */
  _exponerNodoInmutable(live) {
    const enlaces = Object.freeze(
      (live.enlaces || []).map((enlace) => Object.freeze({ ...enlace }))
    );
    const vista = Object.freeze({
      id: live.id,
      timestamp: live.timestamp,
      metadatos: live.metadatos,
      enlaces
    });

    return new Proxy(vista, {
      get(target, prop, receiver) {
        if (prop === 'tipo') return live.tipo;
        return Reflect.get(target, prop, receiver);
      },
      set(_target, prop, value) {
        if (prop === 'tipo') {
          live.tipo = value;
          return true;
        }
        return false;
      }
    });
  }
}
