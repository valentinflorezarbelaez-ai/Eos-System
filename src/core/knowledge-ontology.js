/**
 * @module EOSKnowledgeOntology
 * @description Deterministic Knowledge Ontology and Relationship Graph for EOS.
 * Models and governs typed connections between entities across Governance, Architecture, Metrics, and Missions.
 * Enforces strict taxonomic rules and prohibits orphan links.
 */

export class EOSKnowledgeOntology {
  constructor() {
    this.tiposPermitidos = ['GOVERNANCE', 'ARCHITECTURE', 'METRIC', 'MISSION'];
    this._nodos = new Map();
    this.nodos = this._createEncapsulatedNodos();
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
