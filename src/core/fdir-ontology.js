/**
 * @module EOSFDIROntology
 * @description Fault Detection, Isolation, and Recovery (FDIR) immune engine for EOS Knowledge Ontology.
 * Scans the relationship graph, purges orphan links, removes taxonomy violations,
 * and records cryptographic telemetry via EOSMemoryGuard.
 */

import crypto from 'node:crypto';
import { EOSMemoryGuard } from './memory-guard.js';

export class EOSFDIROntology {
  /**
   * @param {import('./knowledge-ontology.js').EOSKnowledgeOntology} ontologyInstance
   * @param {object} [options]
   * @param {EOSMemoryGuard} [options.guard]
   */
  constructor(ontologyInstance, options = {}) {
    if (!ontologyInstance) {
      throw new Error('🚨 FDIR ONTOLOGY FAULT: Se requiere la instancia viva de la Ontología para inyectar el escudo.');
    }
    this.ontology = ontologyInstance;
    this.guard = options.guard || new EOSMemoryGuard();
  }

  /**
   * Scans the knowledge graph, purges invalid taxonomy and orphan links atomically.
   * @returns {Promise<{ estado: 'NOMINAL' | 'SANED', totalReparaciones: number, reparaciones: Array<object> }>}
   */
  async auditarYSanarGrafo() {
    console.log('⚖️ [EOS FDIR ONTOLOGY] > Iniciando escaneo forense de consistencia relacional...');
    const reparaciones = [];

    // Snapshot before mutate so insertion-order single-pass cannot skip reverse edges.
    const snapshot = [...this.ontology.nodos.entries()];

    // Phase 1 — purge invalid taxonomy (fixed-point: deleted ids are gone before edge walk).
    for (const [idNodo, nodo] of snapshot) {
      if (!this.ontology.tiposPermitidos.includes(nodo.tipo)) {
        console.warn(`🚨 FDIR ONTOLOGY > Anomalía taxonómica en nodo [${idNodo}]. Tipo inválido: ${nodo.tipo}. Purgando...`);
        this.ontology.nodos.delete(idNodo);
        reparaciones.push({ nodoId: idNodo, accion: 'PURGED_INVALID_TYPE', tipoInvalido: nodo.tipo });
      }
    }

    // Phase 2 — purge edges whose destino was removed in phase 1 (or was already missing).
    const remaining = [...this.ontology.nodos.entries()];
    for (const [idNodo, nodo] of remaining) {
      const enlacesValidos = [];
      for (const enlace of nodo.enlaces) {
        if (!this.ontology.nodos.has(enlace.destino)) {
          console.warn(`🚨 FDIR ONTOLOGY > Enlace huérfano detectado: [${idNodo}] ➔ [${enlace.destino}]. Aislando...`);
          reparaciones.push({
            nodoId: idNodo,
            destinoCorrupto: enlace.destino,
            relacion: enlace.relacion,
            accion: 'ORPHAN_LINK_PURGED'
          });
        } else {
          enlacesValidos.push(enlace);
        }
      }

      nodo.enlaces = enlacesValidos;
    }

    const estadoFinal = reparaciones.length === 0 ? 'NOMINAL' : 'SANED';

    // Si hubo intervención del escudo, generamos y validamos el recibo telemétrico
    if (estadoFinal === 'SANED') {
      const metadata = { reparaciones, timestamp: new Date().toISOString() };
      const rawContent = JSON.stringify(metadata);
      const hash = crypto.createHash('sha256').update(rawContent).digest('hex');

      const payloadEvidencia = {
        idMision: 'FDIR-ONTOLOGY-SANED',
        timestamp: new Date().toISOString(),
        metadata,
        hash
      };
      this.guard.validarPayloadLedger(payloadEvidencia);
    }

    return {
      estado: estadoFinal,
      totalReparaciones: reparaciones.length,
      reparaciones
    };
  }
}
