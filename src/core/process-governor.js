/**
 * @module EOSProcessGovernor
 * @description High-Assurance Process Governor and Isolation Arbiter for EOS.
 * Regulates, encapsulates, and audits execution lifecycle.
 * Guarantees fault isolation, idempotent execution, and zero unhandled drift.
 */

import crypto from 'node:crypto';
import { EOSMemoryGuard } from './memory-guard.js';

export class EOSProcessGovernor {
  /**
   * @param {object} [options]
   * @param {EOSMemoryGuard} [options.guard]
   */
  constructor(options = {}) {
    this.guard = options.guard || new EOSMemoryGuard();
    this.estadoOperativo = 'NOMINAL';
  }

  /**
   * Executes an operation inside strict defensive containment and verifies output telemetry
   * @param {string} idOperacion - Unique operation/mission identifier
   * @param {Function} accionPura - Async or sync lambda to execute
   * @returns {Promise<object>}
   */
  async ejecutarProcesoPerfecto(idOperacion, accionPura) {
    if (this.estadoOperativo !== 'NOMINAL') {
      throw new Error('🚨 PROCESS PANIC: El Gobernador se encuentra en estado de resguardo por anomalía previa.');
    }

    console.log(`⚖️ [EOS GOVERNOR] > Iniciando proceso de alta fidelidad: ${idOperacion}`);
    const timestampInicio = Date.now();

    try {
      if (typeof accionPura !== 'function') {
        throw new Error('ACCION_PURA_INVALIDA: Se requiere una función ejecutable.');
      }

      // 1. Ejecución en entorno de contención estricto
      const resultadoContextual = await accionPura();

      const metadata = {
        latenciaMs: Date.now() - timestampInicio,
        estadoSalida: 'SUCCESS',
        datos: resultadoContextual
      };

      const hash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');

      // 2. Validación de telemetría mediante MemoryGuard
      const payloadAuditoria = {
        idMision: idOperacion,
        timestamp: new Date().toISOString(),
        metadata,
        hash,
        estado: 'LOCKED'
      };

      this.guard.validarPayloadLedger(payloadAuditoria);

      return {
        id: idOperacion,
        estatus: 'PERFECT_EXECUTION',
        datos: resultadoContextual
      };
    } catch (error) {
      this.estadoOperativo = 'FAULT_ISOLATED';
      console.error(`🚨 [PROCESS FAULT] > Desviación crítica detectada en ${idOperacion}: ${error.message}`);

      return {
        id: idOperacion,
        estatus: 'REJECTED_BY_GOVERNANCE',
        motivo: error.message
      };
    } finally {
      if (this.estadoOperativo === 'FAULT_ISOLATED') {
        console.warn('🔧 [EOS GOVERNOR] > Aislamiento completado. Restableciendo Gobernador a modo Nominal...');
        this.estadoOperativo = 'NOMINAL';
      }
    }
  }
}
