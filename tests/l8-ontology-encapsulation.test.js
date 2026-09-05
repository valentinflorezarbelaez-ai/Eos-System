/**
 * L8-K01 — Ontology encapsulation + FDIR two-phase reverse-edge purge (RED).
 *
 * Current main:
 *   - obtenerNodo() returns the live node; callers can push orphan enlaces
 *     (used by tests/fdir-sentinel-integration.test.js as a surgical inject).
 *   - nodos is a public writable Map; invalid tipo can be planted without
 *     going through registrarNodo (which throws).
 *   - EOSFDIROntology.auditarYSanarGrafo is single-pass: if A→B is visited
 *     before B is purged as invalid type, A's edge to B survives.
 *
 * This suite documents the encapsulation/two-phase contract and MUST FAIL
 * until a GREEN remediation PR. Do not change production here — existing
 * fdir-sentinel-integration stays intact.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EOSKnowledgeOntology } from '../src/core/knowledge-ontology.js';
import { EOSFDIROntology } from '../src/core/fdir-ontology.js';

const NODE_A = 'GOV-L8-K01-A';
const NODE_B = 'ARCH-L8-K01-B';
const NODE_C = 'METRIC-L8-K01-C';
const INVALID_TIPO = 'NOT_A_TAXON';

describe('L8-K01 ontology encapsulation (fail-closed)', () => {
  it('obtenerNodo must not expose a mutable live node that can inject orphans', () => {
    const ontology = new EOSKnowledgeOntology();
    ontology.registrarNodo(NODE_A, 'GOVERNANCE', { rol: 'l8-k01-source' });
    ontology.registrarNodo(NODE_B, 'ARCHITECTURE', { rol: 'l8-k01-target' });
    ontology.crearEnlace(NODE_A, NODE_B, 'GOVERNS');

    const exposed = ontology.obtenerNodo(NODE_A);
    assert.ok(exposed, 'precondition: source node must exist');

    let mutationThrew = false;
    try {
      exposed.enlaces.push({ destino: 'NODO-INEXISTENTE', relacion: 'DEPENDS_ON' });
    } catch {
      mutationThrew = true;
    }

    const stored = ontology.obtenerNodo(NODE_A);
    const orphanSurvived = Boolean(
      stored?.enlaces?.some((enlace) => enlace.destino === 'NODO-INEXISTENTE')
    );

    assert.equal(
      orphanSurvived,
      false,
      'L8-K01: obtenerNodo must return a frozen copy so surgical push cannot corrupt the graph'
    );
    assert.ok(
      mutationThrew || Object.isFrozen(exposed) || Object.isFrozen(exposed.enlaces),
      'L8-K01: public encapsulation API must freeze/copy the node (or throw on mutation)'
    );
  });

  it('nodos.set with invalid tipo must throw (no public Map injection)', () => {
    const ontology = new EOSKnowledgeOntology();
    ontology.registrarNodo(NODE_A, 'GOVERNANCE');

    assert.throws(
      () => {
        ontology.nodos.set('BAD-L8-K01', {
          id: 'BAD-L8-K01',
          tipo: INVALID_TIPO,
          metadatos: {},
          enlaces: []
        });
      },
      /ONTOLOGY FAULT|TAXONOM|encapsul/i,
      'L8-K01: planting an invalid tipo via nodos.set must go through an API that throws'
    );
    assert.equal(
      ontology.nodos.has('BAD-L8-K01'),
      false,
      'L8-K01: invalid tipo must not remain in the graph after a rejected set'
    );
  });

  it('FDIR two-phase: edges to nodes purged as invalid type in the same pass must also be removed', async () => {
    const ontology = new EOSKnowledgeOntology();
    // Insertion order A → B → C so a single-pass healer visits A before
    // purging B/C. That is the snapshot that fails on current main.
    ontology.registrarNodo(NODE_A, 'GOVERNANCE', { rol: 'survivor' });
    ontology.registrarNodo(NODE_B, 'ARCHITECTURE', { rol: 'invalid-b' });
    ontology.registrarNodo(NODE_C, 'METRIC', { rol: 'invalid-c' });
    ontology.crearEnlace(NODE_A, NODE_B, 'GOVERNS');
    ontology.crearEnlace(NODE_A, NODE_C, 'MEASURES');
    ontology.crearEnlace(NODE_B, NODE_A, 'GOVERNED_BY');

    // Surgical type corruption (same technique as fdir-sentinel-integration).
    ontology.obtenerNodo(NODE_B).tipo = INVALID_TIPO;
    ontology.obtenerNodo(NODE_C).tipo = INVALID_TIPO;

    const snapshotBefore = {
      aEdges: (ontology.obtenerNodo(NODE_A)?.enlaces || []).map((e) => e.destino).sort(),
      bTipo: ontology.obtenerNodo(NODE_B)?.tipo,
      cTipo: ontology.obtenerNodo(NODE_C)?.tipo
    };
    assert.deepEqual(snapshotBefore.aEdges, [NODE_B, NODE_C].sort());
    assert.equal(snapshotBefore.bTipo, INVALID_TIPO);
    assert.equal(snapshotBefore.cTipo, INVALID_TIPO);

    const fdir = new EOSFDIROntology(ontology);
    const diagnostico = await fdir.auditarYSanarGrafo();

    assert.equal(ontology.obtenerNodo(NODE_B), undefined, 'B must be purged as invalid type');
    assert.equal(ontology.obtenerNodo(NODE_C), undefined, 'C must be purged as invalid type');

    const aAfter = ontology.obtenerNodo(NODE_A);
    assert.ok(aAfter, 'A (valid) must survive');

    const remainingDestinos = (aAfter.enlaces || []).map((e) => e.destino).sort();
    assert.deepEqual(
      remainingDestinos,
      [],
      `L8-K01 two-phase: A edges to purged B/C must be removed in the same pass (observed ${JSON.stringify(remainingDestinos)})`
    );

    const acciones = (diagnostico.reparaciones || []).map((r) => r.accion);
    assert.ok(
      acciones.includes('PURGED_INVALID_TYPE'),
      'report must include PURGED_INVALID_TYPE'
    );
    assert.ok(
      acciones.includes('ORPHAN_LINK_PURGED'),
      'L8-K01 two-phase: report must include ORPHAN_LINK_PURGED for reverse/stale edges'
    );
  });
});
