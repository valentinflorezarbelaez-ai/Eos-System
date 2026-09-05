/**
 * REQ-EARS-FDIR-ONT-01 — Sentinel heartbeat must trigger ontology FDIR
 * and purge orphan links with accion ORPHAN_LINK_PURGED (Constitution §5).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EOSKnowledgeOntology } from '../src/core/knowledge-ontology.js';
import { EOSFDIROntology } from '../src/core/fdir-ontology.js';
import { EOSSentinelDaemon } from '../src/core/sentinel-daemon.js';

const ORPHAN_DESTINO = 'NODO-INEXISTENTE';
const SOURCE_ID = 'GOV-SENTINEL-01';
const TARGET_ID = 'ARCH-SENTINEL-01';

function buildGraphWithOrphanLink() {
  const ontology = new EOSKnowledgeOntology();
  ontology.registrarNodo(SOURCE_ID, 'GOVERNANCE', { rol: 'sentinel-source' });
  ontology.registrarNodo(TARGET_ID, 'ARCHITECTURE', { rol: 'sentinel-target' });
  ontology.crearEnlace(SOURCE_ID, TARGET_ID, 'GOVERNS');

  // crearEnlace forbids orphans; plant a corrupt destino via the test-only inject API.
  ontology.injectCorruptLinkForTest(SOURCE_ID, {
    destino: ORPHAN_DESTINO,
    relacion: 'DEPENDS_ON'
  });

  return ontology;
}

function stubFdir() {
  return {
    async ejecutarCicloRecuperacion() {
      return { estado: 'NOMINAL', mensaje: 'fixture-nominal', reparaciones: [] };
    }
  };
}

async function latidoSinTimer(daemon) {
  if (typeof daemon.ejecutarLatido === 'function') {
    return daemon.ejecutarLatido();
  }
  return daemon._ejecutarLatidoConsciente();
}

function diagnosticoOntologyDe(daemon, latidoResult) {
  return (
    latidoResult?.diagnosticoOntology ||
    daemon.lastDiagnosticoOntology ||
    daemon.lastSaned ||
    null
  );
}

describe('REQ-EARS-FDIR-ONT-01 sentinel ↔ ontology FDIR', () => {
  it('heartbeat triggers ontology sanitation and purges orphan links (ORPHAN_LINK_PURGED)', async () => {
    const ontology = buildGraphWithOrphanLink();
    const fdirOntology = new EOSFDIROntology(ontology);
    const daemon = new EOSSentinelDaemon({
      fdir: stubFdir(),
      fdirOntology,
      ontology
    });

    // Avoid real FDIR disk writes if constructor ignores injected fdir (RED).
    daemon.lineasBaseAutorizadas = daemon.detector.generarLineasBase();

    assert.equal(
      ontology.obtenerNodo(SOURCE_ID).enlaces.some((enlace) => enlace.destino === ORPHAN_DESTINO),
      true,
      'precondition: orphan link must exist before heartbeat'
    );

    const latidoResult = await latidoSinTimer(daemon);
    const diagnostico = diagnosticoOntologyDe(daemon, latidoResult);

    assert.ok(diagnostico, 'heartbeat must expose ontology diagnostico (return, lastSaned, or lastDiagnosticoOntology)');
    assert.equal(diagnostico.estado, 'SANED');
    assert.ok(
      (diagnostico.reparaciones || []).some((item) => item.accion === 'ORPHAN_LINK_PURGED'),
      'report must include accion ORPHAN_LINK_PURGED'
    );

    const enlacesTrasLatido = ontology.obtenerNodo(SOURCE_ID).enlaces;
    assert.equal(
      enlacesTrasLatido.some((enlace) => enlace.destino === ORPHAN_DESTINO),
      false,
      'orphan link must be removed from the source node'
    );
    assert.equal(enlacesTrasLatido.length, 1);
    assert.equal(enlacesTrasLatido[0].destino, TARGET_ID);
  });
});
