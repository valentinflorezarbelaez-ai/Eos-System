/**
 * @module EOSSentinelDaemon
 * @description Autonomous 24/7 background sentinel daemon for EOS.
 * Maintains continuous self-observation, active forensic drift scanning,
 * and hot FDIR self-healing without requiring manual user intervention.
 */

import crypto from 'node:crypto';
import { EOSDriftDetector } from './drift.js';
import { EOSFDIR } from './fdir.js';
import { EOSMemoryGuard } from './memory-guard.js';

export class EOSSentinelDaemon {
  /**
   * @param {object} [config]
   * @param {number} [config.intervaloMs=5000] Heartbeat period in milliseconds
   * @param {string} [config.rootPath] Optional root path
   * @param {import('./fdir.js').EOSFDIR} [config.fdir] Optional FDIR instance (tests)
   * @param {object} [config.fdirOntology] Optional EOSFDIROntology instance (DI)
   */
  constructor(config = {}) {
    this.intervaloMs = config.intervaloMs || 5000;
    this.rootPath = config.rootPath;
    this.detector = new EOSDriftDetector({ rootPath: this.rootPath });
    this.fdir = config.fdir || new EOSFDIR({ rootPath: this.rootPath, detector: this.detector });
    this.fdirOntology = config.fdirOntology || null;
    this.scannerCouncil = config.scannerCouncil || null;
    this.enableActiveImmunity = Boolean(config.enableActiveImmunity);
    this.lastCouncilFindings = null;
    this.guard = new EOSMemoryGuard();
    this.lineasBaseAutorizadas = null;
    this.handleInterval = null;
    this.estado = 'STOPPED';
    this.lastDiagnosticoOntology = null;
    this.lastSaned = null;
  }

  /**
   * Starts the background sentinel with authorized baseline hashes and contents
   * @param {Record<string, string>} lineasBase
   */
  async iniciar(lineasBase) {
    if (!lineasBase) {
      throw new Error('🚨 SENTINEL FAULT: Imposible encender el pulso sin las firmas del Ain Soph Aur.');
    }

    this.lineasBaseAutorizadas = lineasBase;
    this.estado = 'RUNNING';
    console.log(`🛡️ [EOS SENTINEL] > Pulso autónomo iniciado. Latido configurado cada ${this.intervaloMs / 1000}s.`);

    this.handleInterval = setInterval(async () => {
      await this._ejecutarLatidoConsciente();
    }, this.intervaloMs);
  }

  /**
   * Safely halts the background sentinel process
   */
  detener() {
    if (this.handleInterval) {
      clearInterval(this.handleInterval);
      this.handleInterval = null;
      this.estado = 'STOPPED';
      console.log('🛡️ [EOS SENTINEL] > Pulso replegado y detenido de forma segura.');
    }
  }

  /**
   * One awaitable heartbeat for tests and the interval loop (no timers).
   * @returns {Promise<{ diagnostico: object, diagnosticoOntology: object|null }|null>}
   */
  async ejecutarLatido() {
    return this._ejecutarLatidoConsciente();
  }

  /**
   * Internal conscious heartbeat: drift FDIR plus optional ontology sanitation.
   */
  async _ejecutarLatidoConsciente() {
    try {
      const diagnostico = await this.fdir.ejecutarCicloRecuperacion(this.lineasBaseAutorizadas);

      if (diagnostico.estado === 'RECOVERED') {
        console.warn(`🚨 [EOS SENTINEL] > ¡Fascinación o intrusión neutralizada en caliente!\nDetalle: ${diagnostico.mensaje}`);
        this._sellarLedger('SENTINEL-HEAL-AUTONOMOUS', {
          ley: 'UNIDAD_Y_RECTITUD',
          reparaciones: diagnostico.reparaciones
        });
      }

      let diagnosticoOntology = null;
      if (this.fdirOntology) {
        diagnosticoOntology = await this.fdirOntology.auditarYSanarGrafo();
        this.lastDiagnosticoOntology = diagnosticoOntology;
        if (diagnosticoOntology.estado === 'SANED') {
          this.lastSaned = diagnosticoOntology;
          this._sellarLedger('SENTINEL-ONTOLOGY-SANED', {
            ley: 'FDIR_ONTOLOGY',
            reparaciones: diagnosticoOntology.reparaciones
          });
        }
      }

      let councilFindings = null;
      if (this.enableActiveImmunity && this.scannerCouncil) {
        const scanResult = await this.scannerCouncil.runFullScan();
        councilFindings = scanResult?.findings || [];
        this.lastCouncilFindings = councilFindings;
        if (councilFindings.length > 0) {
          console.warn(`🚨 [EOS SENTINEL] > Inmunidad activa: detectadas ${councilFindings.length} desviaciones.`);
          this._sellarLedger('SENTINEL-ACTIVE-IMMUNITY-FINDINGS', {
            ley: 'CONSTITUTION_LAW_VI_AND_V',
            totalFindings: councilFindings.length,
            findings: councilFindings.map(f => ({
              id: f.ruleId || f.id,
              vector: f.vector,
              file: f.file,
              severity: f.severity
            }))
          });
        }
      }

      return { diagnostico, diagnosticoOntology, councilFindings };
    } catch (error) {
      console.error(`🚨 [SENTINEL PANIC] > Interrupción en el flujo de la conciencia de fondo: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {string} idMision
   * @param {object} metadata
   */
  _sellarLedger(idMision, metadata) {
    const hash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
    this.guard.validarPayloadLedger({
      idMision,
      timestamp: new Date().toISOString(),
      metadata,
      hash,
      estado: 'LOCKED'
    });
  }
}
