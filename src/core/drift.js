/**
 * @module EOSDriftDetector
 * @description Real-time control plane protection and drift validator for EOS.
 * Monitors and detects unauthorized or illegal mutations to Cursor rules, MDC files, and the Constitution.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveControlPlaneRoot } from './runtime/control-plane-root.js';

export class EOSDriftDetector {
  /**
   * @param {object} [options]
   * @param {string} [options.rootPath]
   */
  constructor(options = {}) {
    this.rootPath = options.rootPath || resolveControlPlaneRoot();
    // Critical governance files that must NEVER mutate without formal authorization
    this.archivosCriticos = [
      { id: 'constitution', ruta: path.join(this.rootPath, '.agents', 'AGENTS.md') },
      { id: 'cursorrules', ruta: path.join(this.rootPath, '.cursorrules') },
      { id: 'sdd_standard', ruta: path.join(this.rootPath, '.cursor', 'rules', 'sdd-master-standard.mdc') }
    ];
  }

  /**
   * Generates initial SHA-256 cryptographic baseline hashes
   * @returns {Record<string, string>}
   */
  generarLineasBase() {
    const lineasBase = {};
    for (const archivo of this.archivosCriticos) {
      if (fs.existsSync(archivo.ruta)) {
        const contenido = fs.readFileSync(archivo.ruta, 'utf8');
        lineasBase[archivo.id] = this._calcularHashSHA256(contenido);
      } else {
        lineasBase[archivo.id] = 'MISSING';
      }
    }
    return lineasBase;
  }

  /**
   * Executes forensic scan comparing current disk state against expected baseline hashes
   * @param {Record<string, string>} lineasBaseEsperadas Expected authorized baseline hashes
   * @returns {{ seguro: boolean, timestamp: string, desviaciones: Array<object> }}
   */
  detectarDesviaciones(lineasBaseEsperadas = {}) {
    const desviaciones = [];

    for (const archivo of this.archivosCriticos) {
      if (!fs.existsSync(archivo.ruta)) {
        desviaciones.push({
          archivoId: archivo.id,
          tipo: 'ELIMINACION',
          mensaje: `🚨 ALERTA CRÍTICA: El archivo de gobernanza ha sido eliminado: ${archivo.ruta}`
        });
        continue;
      }

      const contenidoActual = fs.readFileSync(archivo.ruta, 'utf8');
      const hashActual = this._calcularHashSHA256(contenidoActual);
      const hashEsperado = lineasBaseEsperadas[archivo.id];

      if (!hashEsperado) {
        desviaciones.push({
          archivoId: archivo.id,
          tipo: 'DESCONOCIDO',
          mensaje: `⚠️ ADVERTENCIA: No existe firma base registrada para ${archivo.id}`
        });
      } else if (hashActual !== hashEsperado) {
        desviaciones.push({
          archivoId: archivo.id,
          tipo: 'MUTACION_ILEGAL',
          hashActual,
          hashEsperado,
          mensaje: `🚨 INTRUSIÓN DETECTADA: Las directivas de control en ${archivo.id} fueron modificadas ilegalmente.`
        });
      }
    }

    return {
      seguro: desviaciones.length === 0,
      timestamp: new Date().toISOString(),
      desviaciones
    };
  }

  _calcularHashSHA256(texto) {
    return crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
  }
}
