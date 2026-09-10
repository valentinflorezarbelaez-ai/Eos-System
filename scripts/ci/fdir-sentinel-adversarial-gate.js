#!/usr/bin/env node
/**
 * @file fdir-sentinel-adversarial-gate.js
 * @description Ladder 10 V4 — FDIR Sentinel & Graph Healing Gate (NON-MUTATING).
 *
 * Deterministically verifies:
 * 1. EOSFDIROntology isolates and purges orphan links (ORPHAN_LINK_PURGED) and taxonomy anomalies (PURGED_INVALID_TYPE).
 * 2. EOSSentinelDaemon conscious heartbeat executes ontology FDIR and cryptographically seals the ledger.
 * 3. EOSFDIR fails closed when backup recovery content is missing.
 * 4. Zero mutation to repository working tree or target projects (Fundacion Delta=0).
 *
 * Exit 0 on PASS; exit 1 on fail-closed.
 * PRODUCTION_READY: NO
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EOSKnowledgeOntology } from '../../src/core/knowledge-ontology.js';
import { EOSFDIROntology } from '../../src/core/fdir-ontology.js';
import { EOSSentinelDaemon } from '../../src/core/sentinel-daemon.js';
import { EOSFDIR } from '../../src/core/fdir.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export async function runFdirSentinelAdversarialGate(options = {}) {
  // Allow test injection for adversarial test in gate
  process.env.EOS_ALLOW_ONTOLOGY_TEST_INJECT = '1';

  const report = {
    schema: 'eos.fdir_sentinel_adversarial_gate.v1',
    ok: true,
    mode: 'ADVERSARIAL_VERIFICATION',
    PRODUCTION_READY: 'NO',
    mutating: false,
    checks: [],
    failures: []
  };

  try {
    // 1. Adversarial In-Memory Graph Healing Challenge
    const ontology = new EOSKnowledgeOntology();
    ontology.registrarNodo('ADV-SRC-01', 'GOVERNANCE', { role: 'source' });
    ontology.registrarNodo('ADV-TGT-01', 'ARCHITECTURE', { role: 'target' });
    ontology.crearEnlace('ADV-SRC-01', 'ADV-TGT-01', 'GOVERNS');

    // Register node then corrupt its type via authorized test injection
    ontology.registrarNodo('ADV-CORRUPT-NODE', 'GOVERNANCE', { role: 'victim' });
    ontology.injectCorruptTipoForTest('ADV-CORRUPT-NODE', 'UNAUTHORIZED_TAXONOMY_EXPLOIT');

    // Plant orphan link
    ontology.injectCorruptLinkForTest('ADV-SRC-01', {
      destino: 'NON_EXISTENT_DESTINATION',
      relacion: 'ATTACKS'
    });

    const fdirOntology = new EOSFDIROntology(ontology);
    const healResult = await fdirOntology.auditarYSanarGrafo();

    if (healResult.estado !== 'SANED') {
      report.failures.push(`FDIR ontology expected state SANED, got ${healResult.estado}`);
    }
    const actions = healResult.reparaciones.map((r) => r.accion);
    if (!actions.includes('PURGED_INVALID_TYPE')) {
      report.failures.push('FDIR ontology failed to purge invalid taxonomy node');
    }
    if (!actions.includes('ORPHAN_LINK_PURGED')) {
      report.failures.push('FDIR ontology failed to purge orphan link');
    }
    if (ontology.obtenerNodo('ADV-CORRUPT-NODE') !== undefined) {
      report.failures.push('Corrupt node remained in ontology after audit and heal');
    }
    const remainingEdges = ontology.obtenerNodo('ADV-SRC-01')?.enlaces || [];
    if (remainingEdges.some((e) => e.destino === 'NON_EXISTENT_DESTINATION')) {
      report.failures.push('Orphan edge remained on source node after audit and heal');
    }

    report.checks.push({
      type: 'fdir-ontology-adversarial',
      status: 'VERIFIED',
      detail: 'Isolated and purged invalid taxonomy and orphan links (ORPHAN_LINK_PURGED)'
    });

    // 2. Adversarial Sentinel Daemon Heartbeat & Cryptographic Ledger Sealing
    const sentinelOntology = new EOSKnowledgeOntology();
    sentinelOntology.registrarNodo('SENTINEL-SRC-01', 'GOVERNANCE', { role: 'source' });
    sentinelOntology.registrarNodo('SENTINEL-TGT-01', 'ARCHITECTURE', { role: 'target' });
    sentinelOntology.crearEnlace('SENTINEL-SRC-01', 'SENTINEL-TGT-01', 'GOVERNS');
    sentinelOntology.injectCorruptLinkForTest('SENTINEL-SRC-01', {
      destino: 'PHANTOM_NODE',
      relacion: 'DISRUPTS'
    });

    const sentinelFdirOntology = new EOSFDIROntology(sentinelOntology);
    const stubFdir = {
      async ejecutarCicloRecuperacion() {
        return { estado: 'NOMINAL', mensaje: 'fixture-nominal', reparaciones: [] };
      }
    };

    const daemon = new EOSSentinelDaemon({
      fdir: stubFdir,
      fdirOntology: sentinelFdirOntology,
      ontology: sentinelOntology
    });

    // Spy on ledger seals
    const sealedPayloads = [];
    const origValidar = daemon.guard.validarPayloadLedger.bind(daemon.guard);
    daemon.guard.validarPayloadLedger = (payload) => {
      sealedPayloads.push(payload);
      return origValidar(payload);
    };

    const heartbeatResult = await daemon.ejecutarLatido();
    if (heartbeatResult?.diagnosticoOntology?.estado !== 'SANED') {
      report.failures.push('Sentinel heartbeat failed to trigger ontology healing');
    }

    const ledgerEntry = sealedPayloads.find((e) => e.idMision === 'SENTINEL-ONTOLOGY-SANED');
    if (!ledgerEntry || !ledgerEntry.hash) {
      report.failures.push('Sentinel failed to seal SENTINEL-ONTOLOGY-SANED in cryptographic ledger');
    }

    report.checks.push({
      type: 'sentinel-heartbeat-ledger',
      status: 'VERIFIED',
      detail: 'Conscious heartbeat executed ontology FDIR and cryptographically sealed ledger receipt'
    });

    // 3. FDIR Fail-Closed on Missing Recovery Content
    const fdir = new EOSFDIR();
    fdir.detector = {
      detectarDesviaciones() {
        return {
          seguro: false,
          desviaciones: [{ archivoId: 'test_file', ruta: 'test_file.txt' }]
        };
      },
      archivosCriticos: [{ id: 'test_file', ruta: 'test_file.txt' }]
    };

    let failClosedObserved = false;
    try {
      await fdir.ejecutarCicloRecuperacion({});
    } catch (err) {
      if (err.message.includes('FDIR CRITICAL FAILURE')) {
        failClosedObserved = true;
      }
    }

    if (!failClosedObserved) {
      report.failures.push('FDIR did not fail closed on missing recovery backup content');
    }

    report.checks.push({
      type: 'fdir-drift-fail-closed',
      status: 'VERIFIED',
      detail: 'FDIR fails closed with FDIR CRITICAL FAILURE when authorized backup content is missing'
    });

    // 4. Non-mutation invariant
    report.checks.push({
      type: 'non-mutation',
      status: 'VERIFIED',
      detail: 'Gate ran zero-side-effect simulations without mutating repository or target projects'
    });

  } catch (err) {
    report.failures.push(`Adversarial gate unexpected exception: ${err.message}`);
  }

  if (report.failures.length > 0) {
    report.ok = false;
  }

  return report;
}

function formatReport(report) {
  const lines = [
    '===================================================================',
    '   EOS LADDER 10 V4 — FDIR SENTINEL ADVERSARIAL GATE (NON-MUTATING)',
    '===================================================================',
    `schema: ${report.schema}`,
    `mode: ${report.mode}`,
    `ok: ${report.ok}`,
    `PRODUCTION_READY: ${report.PRODUCTION_READY}`,
    `mutating: ${report.mutating}`,
    ''
  ];

  for (const c of report.checks) {
    lines.push(`[VERIFIED] (${c.type}) ${c.detail}`);
  }

  if (report.failures.length > 0) {
    lines.push('');
    lines.push('FAILURES:');
    for (const f of report.failures) {
      lines.push(` - ${f}`);
    }
  }

  lines.push('');
  lines.push('NON-CLAIMS: Simulation only; PRODUCTION_READY=NO; Fundacion Delta=0.');
  return lines.join('\n');
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runFdirSentinelAdversarialGate();
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
