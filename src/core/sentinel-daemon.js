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
   */
  constructor(config = {}) {
    this.intervaloMs = config.intervaloMs || 5000;
    this.rootPath = config.rootPath;
    this.detector = new EOSDriftDetector({ rootPath: this.rootPath });
    this.fdir = new EOSFDIR({ rootPath: this.rootPath, detector: this.detector });
    this.guard = new EOSMemoryGuard();
    this.lineasBaseAutorizadas = null;
    this.handleInterval = null;
    this.estado = 'STOPPED';
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
   * Internal conscious heartbeat: scans for drift and triggers hot FDIR self-healing
   */
  async _ejecutarLatidoConsciente() {
    try {
      const diagnostico = await this.fdir.ejecutarCicloRecuperacion(this.lineasBaseAutorizadas);

      if (diagnostico.estado === 'RECOVERED') {
        console.warn(`🚨 [EOS SENTINEL] > ¡Fascinación o intrusión neutralizada en caliente!\nDetalle: ${diagnostico.mensaje}`);

        const metadata = {
          ley: 'UNIDAD_Y_RECTITUD',
          reparaciones: diagnostico.reparaciones
        };
        const hash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');

        const payloadEvidencia = {
          idMision: 'SENTINEL-HEAL-AUTONOMOUS',
          timestamp: new Date().toISOString(),
          metadata,
          hash,
          estado: 'LOCKED'
        };

        this.guard.validarPayloadLedger(payloadEvidencia);
      }
    } catch (error) {
      console.error(`🚨 [SENTINEL PANIC] > Interrupción en el flujo de la conciencia de fondo: ${error.message}`);
    }
  }
}
