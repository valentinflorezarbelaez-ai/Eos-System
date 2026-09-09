/**
 * @module sentinel-fdir-lock
 * N6 — Sentinel/FDIR strict-verify lock (Ladder 3 H6).
 *
 * Fail-closed existence + light import/API smoke for eos-sentinel,
 * sentinel-daemon, FDIR, and FDIR ontology. Construct only — no heartbeat
 * soak, no setInterval, no disk recovery campaigns.
 *
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

import { EOSSentinelDaemon } from '../../src/core/sentinel-daemon.js';
import { EOSFDIR } from '../../src/core/fdir.js';
import { EOSFDIROntology } from '../../src/core/fdir-ontology.js';
import { EOSKnowledgeOntology } from '../../src/core/knowledge-ontology.js';

/** Relative paths that must exist for operator defense integrity. */
export const SENTINEL_FDIR_REQUIRED_PATHS = Object.freeze([
  'bin/eos-sentinel.js',
  'src/core/sentinel-daemon.js',
  'src/core/fdir.js',
  'src/core/fdir-ontology.js'
]);

/**
 * @param {string} rootDir
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditSentinelFdir(rootDir) {
  const checks = [];
  const failures = [];
  const root = path.resolve(rootDir || process.cwd());

  for (const rel of SENTINEL_FDIR_REQUIRED_PATHS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      failures.push({
        path: rel,
        message: 'Sentinel/FDIR required path missing',
        type: 'sentinel-fdir-lock'
      });
    } else {
      checks.push({
        path: rel,
        status: 'VERIFIED',
        type: 'sentinel-fdir-lock'
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, checks, failures };
  }

  // --- Sentinel daemon light smoke (construct only; no iniciar / soak) ---
  try {
    if (typeof EOSSentinelDaemon !== 'function') {
      throw new Error('EOSSentinelDaemon not a constructor');
    }
    const stubFdir = {
      async ejecutarCicloRecuperacion() {
        return { estado: 'NOMINAL', mensaje: 'n6-smoke', reparaciones: [] };
      }
    };
    const daemon = new EOSSentinelDaemon({
      rootPath: root,
      intervaloMs: 60000,
      fdir: stubFdir
    });
    if (daemon.estado !== 'STOPPED') {
      throw new Error('daemon expected STOPPED before iniciar, got ' + daemon.estado);
    }
    if (typeof daemon.iniciar !== 'function' || typeof daemon.detener !== 'function') {
      throw new Error('daemon missing iniciar/detener');
    }
    if (typeof daemon.ejecutarLatido !== 'function') {
      throw new Error('daemon missing ejecutarLatido');
    }
    if (!daemon.fdir || typeof daemon.fdir.ejecutarCicloRecuperacion !== 'function') {
      throw new Error('daemon fdir injection missing');
    }
    checks.push({
      path: 'EOSSentinelDaemon (ctor STOPPED + iniciar/detener/ejecutarLatido; no soak)',
      status: 'VERIFIED',
      type: 'sentinel-fdir-daemon'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/sentinel-daemon.js',
      message: 'Sentinel daemon smoke failed: ' + err.message,
      type: 'sentinel-fdir-daemon'
    });
  }

  // --- FDIR light smoke (construct + API surface; no recovery cycle) ---
  try {
    if (typeof EOSFDIR !== 'function') {
      throw new Error('EOSFDIR not a constructor');
    }
    const fdir = new EOSFDIR({ rootPath: root });
    if (typeof fdir.ejecutarCicloRecuperacion !== 'function') {
      throw new Error('EOSFDIR missing ejecutarCicloRecuperacion');
    }
    if (!fdir.detector) {
      throw new Error('EOSFDIR missing detector');
    }
    checks.push({
      path: 'EOSFDIR (ctor + ejecutarCicloRecuperacion; no soak)',
      status: 'VERIFIED',
      type: 'sentinel-fdir-engine'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/fdir.js',
      message: 'FDIR smoke failed: ' + err.message,
      type: 'sentinel-fdir-engine'
    });
  }

  // --- FDIR ontology light smoke (construct + API; no live graph sanitize) ---
  try {
    if (typeof EOSFDIROntology !== 'function') {
      throw new Error('EOSFDIROntology not a constructor');
    }
    if (typeof EOSKnowledgeOntology !== 'function') {
      throw new Error('EOSKnowledgeOntology not a constructor');
    }
    const ontology = new EOSKnowledgeOntology();
    const ontFdir = new EOSFDIROntology(ontology);
    if (typeof ontFdir.auditarYSanarGrafo !== 'function') {
      throw new Error('EOSFDIROntology missing auditarYSanarGrafo');
    }
    let denied = false;
    try {
      new EOSFDIROntology(null);
    } catch {
      denied = true;
    }
    if (!denied) {
      throw new Error('EOSFDIROntology should fail-closed without ontology instance');
    }
    checks.push({
      path: 'EOSFDIROntology (ctor + auditarYSanarGrafo + null deny; no soak)',
      status: 'VERIFIED',
      type: 'sentinel-fdir-ontology'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/fdir-ontology.js',
      message: 'FDIR ontology smoke failed: ' + err.message,
      type: 'sentinel-fdir-ontology'
    });
  }

  return { ok: failures.length === 0, checks, failures };
}

export default auditSentinelFdir;
