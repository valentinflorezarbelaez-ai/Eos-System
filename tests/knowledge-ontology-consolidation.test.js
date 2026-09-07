import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EOSKnowledgeOntology, LAYER_TAXONOMY_MAP } from '../src/core/knowledge-ontology.js';
import { EOSFDIROntology } from '../src/core/fdir-ontology.js';
import { RelationalTraceabilityMatrix, TRACE_LAYERS, RELATION_TYPES } from '../src/core/ontology/relational-traceability-matrix.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('EOSKnowledgeOntology Consolidation & Relational Lineage Integration', () => {
  it('maps all 7 trace layers to the 4 canonical taxonomy types', () => {
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L0_INTAKE], 'MISSION');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L1_SPEC], 'GOVERNANCE');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L2_PLAN], 'ARCHITECTURE');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L3_TASK], 'MISSION');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L4_CODE], 'ARCHITECTURE');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L5_TEST], 'METRIC');
    assert.equal(LAYER_TAXONOMY_MAP[TRACE_LAYERS.L6_EVIDENCE], 'METRIC');
  });

  it('hydrates knowledge ontology directly from a 7-layer RelationalTraceabilityMatrix', () => {
    const rtm = new RelationalTraceabilityMatrix();

    // Register nodes across all 7 layers
    rtm.registerNode({ id: 'ITK-001', layer: TRACE_LAYERS.L0_INTAKE, label: 'Client Needs' });
    rtm.registerNode({ id: 'SPEC-001', layer: TRACE_LAYERS.L1_SPEC, label: 'Auth Specification' });
    rtm.registerNode({ id: 'PLAN-001', layer: TRACE_LAYERS.L2_PLAN, label: 'Auth Architecture Plan' });
    rtm.registerNode({ id: 'TSK-001', layer: TRACE_LAYERS.L3_TASK, label: 'Implement JWT Token' });
    rtm.registerNode({ id: 'src/auth/jwt.js', layer: TRACE_LAYERS.L4_CODE, label: 'jwt.js' });
    rtm.registerNode({ id: 'tests/jwt.test.js', layer: TRACE_LAYERS.L5_TEST, label: 'jwt.test.js' });
    rtm.registerNode({ id: 'EVD-001', layer: TRACE_LAYERS.L6_EVIDENCE, label: 'Receipt EVD-001' });

    // Connect them sequentially
    rtm.connect('ITK-001', 'SPEC-001', RELATION_TYPES.INFORMS);
    rtm.connect('SPEC-001', 'PLAN-001', RELATION_TYPES.ARCHITECTED_BY);
    rtm.connect('PLAN-001', 'TSK-001', RELATION_TYPES.DECOMPOSED_INTO);
    rtm.connect('TSK-001', 'src/auth/jwt.js', RELATION_TYPES.IMPLEMENTED_BY);
    rtm.connect('src/auth/jwt.js', 'tests/jwt.test.js', RELATION_TYPES.VERIFIED_BY);
    rtm.connect('tests/jwt.test.js', 'EVD-001', RELATION_TYPES.SEALED_BY);

    const ontology = new EOSKnowledgeOntology();
    const stats = ontology.hydrateFromTraceMatrix(rtm);

    assert.equal(stats.hydratedNodes, 7, 'Must hydrate all 7 nodes');
    assert.equal(stats.hydratedEdges, 6, 'Must hydrate all 6 forward edges');

    // Verify taxonomy types in ontology
    assert.equal(ontology.obtenerNodo('ITK-001').tipo, 'MISSION');
    assert.equal(ontology.obtenerNodo('SPEC-001').tipo, 'GOVERNANCE');
    assert.equal(ontology.obtenerNodo('PLAN-001').tipo, 'ARCHITECTURE');
    assert.equal(ontology.obtenerNodo('TSK-001').tipo, 'MISSION');
    assert.equal(ontology.obtenerNodo('src/auth/jwt.js').tipo, 'ARCHITECTURE');
    assert.equal(ontology.obtenerNodo('tests/jwt.test.js').tipo, 'METRIC');
    assert.equal(ontology.obtenerNodo('EVD-001').tipo, 'METRIC');

    // Verify enlaces
    const specNode = ontology.obtenerNodo('SPEC-001');
    assert.equal(specNode.enlaces.length, 1);
    assert.equal(specNode.enlaces[0].destino, 'PLAN-001');
    assert.equal(specNode.enlaces[0].relacion, RELATION_TYPES.ARCHITECTED_BY);
  });

  it('provides complete upstream and downstream cross-layer lineage via obtenerLinaje', () => {
    const rtm = new RelationalTraceabilityMatrix();
    rtm.registerNode({ id: 'SPEC-001', layer: TRACE_LAYERS.L1_SPEC });
    rtm.registerNode({ id: 'PLAN-001', layer: TRACE_LAYERS.L2_PLAN });
    rtm.registerNode({ id: 'TSK-001', layer: TRACE_LAYERS.L3_TASK });

    rtm.connect('SPEC-001', 'PLAN-001', RELATION_TYPES.ARCHITECTED_BY);
    rtm.connect('PLAN-001', 'TSK-001', RELATION_TYPES.DECOMPOSED_INTO);

    const ontology = new EOSKnowledgeOntology({ rtm });
    const lineage = ontology.obtenerLinaje('PLAN-001');

    assert.equal(lineage.entity.id, 'PLAN-001');
    assert.equal(lineage.upstream.length, 1);
    assert.equal(lineage.upstream[0].source, 'SPEC-001');
    assert.equal(lineage.downstream.length, 1);
    assert.equal(lineage.downstream[0].target, 'TSK-001');
  });

  it('delegates blast radius calculation and relational integrity audit to RTM', () => {
    const rtm = new RelationalTraceabilityMatrix();
    rtm.registerNode({ id: 'src/core/db.js', layer: TRACE_LAYERS.L4_CODE });
    rtm.registerNode({ id: 'tests/db.test.js', layer: TRACE_LAYERS.L5_TEST });
    rtm.connect('src/core/db.js', 'tests/db.test.js', RELATION_TYPES.VERIFIED_BY);

    const ontology = new EOSKnowledgeOntology({ rtm });

    const blast = ontology.calculateBlastRadius('src/core/db.js');
    assert.ok(blast.target);
    assert.equal(blast.totalAffectedCount, 1);

    const integrity = ontology.auditRelationalIntegrity();
    assert.ok(typeof integrity.healthScore === 'number');
    assert.ok(integrity.status);
  });

  it('FDIR immune healer purges corrupt links on consolidated graph and verifies relational integrity', async () => {
    const rtm = new RelationalTraceabilityMatrix();
    rtm.registerNode({ id: 'GOV-ROOT', layer: TRACE_LAYERS.L1_SPEC });
    rtm.registerNode({ id: 'ARCH-ROOT', layer: TRACE_LAYERS.L2_PLAN });
    rtm.connect('GOV-ROOT', 'ARCH-ROOT', RELATION_TYPES.ARCHITECTED_BY);

    const ontology = new EOSKnowledgeOntology({ rtm });

    // Plant corrupt orphan link using test-only inject API
    ontology.injectCorruptLinkForTest('GOV-ROOT', {
      destino: 'NON-EXISTENT-TARGET',
      relacion: 'DEPENDS_ON'
    });

    const fdir = new EOSFDIROntology(ontology);
    const result = await fdir.auditarYSanarGrafo();

    assert.equal(result.estado, 'SANED');
    assert.ok(result.totalReparaciones >= 1);
    assert.equal(result.reparaciones[0].accion, 'ORPHAN_LINK_PURGED');
    assert.ok(result.auditoriaRelacional);

    // Verify orphan was purged from live node
    const node = ontology.obtenerNodo('GOV-ROOT');
    assert.ok(!node.enlaces.some(e => e.destino === 'NON-EXISTENT-TARGET'));
    assert.ok(node.enlaces.some(e => e.destino === 'ARCH-ROOT'));
  });
});
