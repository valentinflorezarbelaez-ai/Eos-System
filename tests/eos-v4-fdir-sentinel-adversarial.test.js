import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EOSKnowledgeOntology } from '../src/core/knowledge-ontology.js';
import { EOSFDIROntology } from '../src/core/fdir-ontology.js';
import { EOSSentinelDaemon } from '../src/core/sentinel-daemon.js';
import { EOSFDIR } from '../src/core/fdir.js';
import { runFdirSentinelAdversarialGate } from '../scripts/ci/fdir-sentinel-adversarial-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('Ladder 10 V4 — FDIR Sentinel & Graph Healing Gate', () => {
  it('V4: OpenSpec change artifacts exist', () => {
    const base = path.join(rootDir, 'openspec/changes/eos-v4-fdir-gate');
    for (const rel of ['.openspec.yaml', 'proposal.md', 'tasks.md']) {
      assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
    }
  });

  it('V4: package.json wires test:v4', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:v4'],
      'node --test tests/eos-v4-fdir-sentinel-adversarial.test.js',
      'package.json must declare test:v4'
    );
  });

  it('V4: EOSFDIROntology dynamically isolates taxonomy anomalies and orphan links', async () => {
    process.env.EOS_ALLOW_ONTOLOGY_TEST_INJECT = '1';
    const ontology = new EOSKnowledgeOntology();
    ontology.registrarNodo('NODO-VALIDO-1', 'GOVERNANCE', { rol: 'legitimate' });
    ontology.registrarNodo('NODO-VALIDO-2', 'ARCHITECTURE', { rol: 'legitimate' });
    ontology.crearEnlace('NODO-VALIDO-1', 'NODO-VALIDO-2', 'GOVERNS');

    // Register node then corrupt its type via authorized test injection
    ontology.registrarNodo('NODO-MALICIOSO', 'GOVERNANCE', { rol: 'compromised' });
    ontology.injectCorruptTipoForTest('NODO-MALICIOSO', 'UNAUTHORIZED_EXPLOIT_TYPE');

    // Plant orphan link pointing to ghost node
    ontology.injectCorruptLinkForTest('NODO-VALIDO-1', {
      destino: 'GHOST-NODE-404',
      relacion: 'ATTACKS'
    });

    const fdirOntology = new EOSFDIROntology(ontology);
    const resultado = await fdirOntology.auditarYSanarGrafo();

    assert.equal(resultado.estado, 'SANED', 'must transition state to SANED');
    assert.ok(resultado.totalReparaciones >= 2, 'must record at least 2 repairs');

    const acciones = resultado.reparaciones.map((r) => r.accion);
    assert.ok(acciones.includes('PURGED_INVALID_TYPE'), 'must purge invalid taxonomy type');
    assert.ok(acciones.includes('ORPHAN_LINK_PURGED'), 'must purge orphan link');

    // Verify invalid node is gone
    assert.equal(ontology.obtenerNodo('NODO-MALICIOSO'), undefined, 'malicious node must be deleted');

    // Verify valid relationship is preserved and orphan link removed
    const enlaces = ontology.obtenerNodo('NODO-VALIDO-1').enlaces;
    assert.equal(enlaces.length, 1, 'must retain only 1 valid link');
    assert.equal(enlaces[0].destino, 'NODO-VALIDO-2', 'valid edge must be preserved');
  });

  it('V4: EOSSentinelDaemon heartbeat triggers ontology FDIR and seals ledger', async () => {
    process.env.EOS_ALLOW_ONTOLOGY_TEST_INJECT = '1';
    const ontology = new EOSKnowledgeOntology();
    ontology.registrarNodo('GOV-SENTINEL-ALPHA', 'GOVERNANCE', { rol: 'guardian' });
    ontology.registrarNodo('ARCH-SENTINEL-BETA', 'ARCHITECTURE', { rol: 'base' });
    ontology.crearEnlace('GOV-SENTINEL-ALPHA', 'ARCH-SENTINEL-BETA', 'GOVERNS');

    // Inject orphan link
    ontology.injectCorruptLinkForTest('GOV-SENTINEL-ALPHA', {
      destino: 'NON-EXISTENT-PHANTOM',
      relacion: 'LEAKS'
    });

    const fdirOntology = new EOSFDIROntology(ontology);
    const stubFdir = {
      async ejecutarCicloRecuperacion() {
        return { estado: 'NOMINAL', mensaje: 'fixture-nominal', reparaciones: [] };
      }
    };

    const daemon = new EOSSentinelDaemon({
      fdir: stubFdir,
      fdirOntology,
      ontology
    });

    // Spy on ledger seals
    const sealed = [];
    const origValidar = daemon.guard.validarPayloadLedger.bind(daemon.guard);
    daemon.guard.validarPayloadLedger = (payload) => {
      sealed.push(payload);
      return origValidar(payload);
    };

    const latidoResult = await daemon.ejecutarLatido();
    assert.ok(latidoResult.diagnosticoOntology, 'latido must produce diagnosticoOntology');
    assert.equal(latidoResult.diagnosticoOntology.estado, 'SANED');
    assert.ok(
      latidoResult.diagnosticoOntology.reparaciones.some((r) => r.accion === 'ORPHAN_LINK_PURGED')
    );

    // Verify cryptographic ledger receipt
    const entry = sealed.find((e) => e.idMision === 'SENTINEL-ONTOLOGY-SANED');
    assert.ok(entry, 'ledger must contain entry for SENTINEL-ONTOLOGY-SANED');
    assert.ok(entry.hash, 'ledger entry must contain SHA-256 hash');
  });

  it('V4: EOSFDIR fails closed when recovery backup content is missing', async () => {
    const fdir = new EOSFDIR();
    // Simulate drift detection returning deviations but without corresponding _content backup
    fdir.detector = {
      detectarDesviaciones() {
        return {
          seguro: false,
          desviaciones: [{ archivoId: 'cursorrules', ruta: '.cursorrules' }]
        };
      },
      archivosCriticos: [{ id: 'cursorrules', ruta: '.cursorrules' }]
    };

    await assert.rejects(
      async () => {
        await fdir.ejecutarCicloRecuperacion({});
      },
      /FDIR CRITICAL FAILURE/
    );
  });

  it('V4: runFdirSentinelAdversarialGate passes cleanly and is non-mutating', async () => {
    const report = await runFdirSentinelAdversarialGate();
    assert.equal(report.ok, true, JSON.stringify(report.failures));
    assert.equal(report.schema, 'eos.fdir_sentinel_adversarial_gate.v1');
    assert.equal(report.PRODUCTION_READY, 'NO');
    assert.equal(report.mutating, false);
    assert.ok(report.checks.length >= 3);
    assert.equal(report.failures.length, 0);
  });

  it('V4: CI workflow seam-pack includes test:v4 and keeps prior locks', () => {
    const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
    assert.match(yaml, /^  seam-pack:/m);
    assert.ok(yaml.includes('npm run test:v4'), 'ci.yml missing npm run test:v4');
    assert.ok(yaml.includes('npm run test:v3'), 'ci.yml missing npm run test:v3');
    assert.ok(yaml.includes('npm run test:v2'), 'ci.yml missing npm run test:v2');
  });

  it('V4: CI_CD_CONTRACT.md documents V4 seam-pack note', () => {
    const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
    assert.ok(md.includes('V4 seam-pack note'), 'CI_CD_CONTRACT.md missing V4 seam-pack note');
    assert.ok(md.includes('test:v4'), 'CI_CD_CONTRACT.md missing test:v4');
  });
});

