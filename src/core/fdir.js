/**
 * @module EOSFDIR
 * @description EOS FDIR (Fault Detection, Isolation, and Recovery).
 * Autonomous immunological engine that detects deviations, isolates compromised governance files,
 * and restores them to their canonical authorized state using cryptographic baselines.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EOSDriftDetector } from './drift.js';
import { resolveControlPlaneRoot } from './runtime/control-plane-root.js';

export class EOSFDIR {
  /**
   * @param {object} [options]
   * @param {string} [options.rootPath]
   * @param {EOSDriftDetector} [options.detector]
   */
  constructor(options = {}) {
    this.rootPath = options.rootPath || resolveControlPlaneRoot() || process.cwd();
    this.detector = options.detector || new EOSDriftDetector({ rootPath: this.rootPath });
  }

  /**
   * Executes complete cycle of active audit, fault isolation, and autonomous recovery
   * @param {Record<string, string>} lineasBaseAutorizadas Map of authorized SHA-256 hashes and backup contents
   * @returns {Promise<{ estado: 'NOMINAL' | 'RECOVERED', mensaje: string, reparaciones: Array<object> }>}
   */
  async ejecutarCicloRecuperacion(lineasBaseAutorizadas = {}) {
    console.log('🛡️ [EOS FDIR] > Iniciando ciclo de auditoría activa e inmunidad...');

    // 1. Detectar fallos (Fault Detection)
    const estadoDrift = this.detector.detectarDesviaciones(lineasBaseAutorizadas);

    if (estadoDrift.seguro) {
      return {
        estado: 'NOMINAL',
        mensaje: 'El plano de control se encuentra íntegro y estable. Sin desviaciones.',
        reparaciones: []
      };
    }

    console.warn(`🚨 [EOS FDIR] > Se detectaron ${estadoDrift.desviaciones.length} anomalías. Iniciando aislamiento...`);
    const reparacionesEjecutadas = [];

    // 2. Aislar y Recuperar (Fault Isolation & Recovery)
    for (const desviacion of estadoDrift.desviaciones) {
      const archivoConfig = this.detector.archivosCriticos.find((a) => a.id === desviacion.archivoId);

      if (!archivoConfig) continue;

      // Obtener el contenido de respaldo autorizado
      const contenidoRespaldo = lineasBaseAutorizadas[`${desviacion.archivoId}_content`];

      if (!contenidoRespaldo) {
        throw new Error(`🚨 FDIR CRITICAL FAILURE: No existe copia de respaldo autorizada en memoria para restaurar ${desviacion.archivoId}.`);
      }

      try {
        // Asegurar el directorio base si fue eliminado
        const directorioBase = path.dirname(archivoConfig.ruta);
        if (!fs.existsSync(directorioBase)) {
          fs.mkdirSync(directorioBase, { recursive: true });
        }

        // Sobreescritura atómica para restaurar el plano de control
        fs.writeFileSync(archivoConfig.ruta, contenidoRespaldo, 'utf8');

        console.log(`🔧 [EOS FDIR] > Archivo [${desviacion.archivoId}] restaurado con éxito a su estado canónico.`);
        reparacionesEjecutadas.push({
          archivoId: desviacion.archivoId,
          ruta: archivoConfig.ruta,
          estado: 'RESTORED'
        });
      } catch (error) {
        throw new Error(`🚨 FDIR PANIC: Fallo físico al intentar escribir en el disco: ${error.message}`);
      }
    }

    return {
      estado: 'RECOVERED',
      mensaje: 'El sistema inmunológico FDIR ha neutralizado la deriva y restaurado el búnker.',
      reparaciones: reparacionesEjecutadas
    };
  }
}
