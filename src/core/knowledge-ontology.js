/**
 * @module EOSKnowledgeOntology
 * @description Deterministic Knowledge Ontology and Relationship Graph for EOS.
 * Models and governs typed connections between entities across Governance, Architecture, Metrics, and Missions.
 * Enforces strict taxonomic rules and prohibits orphan links.
 */

export class EOSKnowledgeOntology {
  constructor() {
    this.nodos = new Map();
    this.tiposPermitidos = ['GOVERNANCE', 'ARCHITECTURE', 'METRIC', 'MISSION'];
  }

  /**
   * Registers a node in the local ontology after validating taxonomy and contracts
   * @param {string} id - Canonical unique identifier
   * @param {string} tipo - Taxonomy type: 'GOVERNANCE' | 'ARCHITECTURE' | 'METRIC' | 'MISSION'
   * @param {object} [metadatos={}] - Optional metadata
   * @returns {object} Created node object
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

    this.nodos.set(id, nodo);
    return nodo;
  }

  /**
   * Creates a typed directional link between two existing nodes
   * @param {string} idOrigen - Source node ID
   * @param {string} idDestino - Target node ID
   * @param {string} tipoRelacion - Relation type (e.g. 'DEPENDS_ON', 'GOVERNED_BY')
   * @returns {boolean}
   */
  crearEnlace(idOrigen, idDestino, tipoRelacion) {
    const origen = this.nodos.get(idOrigen);
    const destino = this.nodos.get(idDestino);

    if (!origen || !destino) {
      throw new Error('🚨 ONTOLOGY FAULT: No se permiten enlaces huérfanos (ORPHAN_LINK_PROHIBITED). Ambos nodos deben existir.');
    }

    origen.enlaces.push({ destino: idDestino, relacion: tipoRelacion });
    return true;
  }

  /**
   * Obtains a node by ID
   * @param {string} id
   * @returns {object|undefined}
   */
  obtenerNodo(id) {
    return this.nodos.get(id);
  }

  /**
   * Returns graph summary
   * @returns {object}
   */
  obtenerGrafo() {
    return {
      totalNodos: this.nodos.size,
      nodos: Array.from(this.nodos.values())
    };
  }
}
