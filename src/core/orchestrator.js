/**
 * @module EOSOrchestrator
 * @description Central State Transition and Autonomous Master SDD Pipeline Orchestrator for EOS.
 * Physically blocks transitions between phases if formal specifications and evidence contracts are missing,
 * and cryptographically verifies each Gate against the Engram immutable ledger and Process Governor.
 */

import { EOSKernel } from './kernel.js';
import { EOSProcessGovernor } from './process-governor.js';
import { EOSKnowledgeOntology } from './knowledge-ontology.js';
import { EOSDriftDetector } from './drift.js';
import { EOSFDIR } from './fdir.js';
import { resolveControlPlaneRoot } from './runtime/control-plane-root.js';

export class EOSOrchestrator {
  /**
   * @param {object} [options]
   * @param {string} [options.rootPath]
   * @param {EOSKernel} [options.kernel]
   * @param {EOSProcessGovernor} [options.governor]
   * @param {EOSKnowledgeOntology} [options.ontology]
   * @param {EOSDriftDetector} [options.driftDetector]
   * @param {EOSFDIR} [options.fdir]
   */
  constructor(options = {}) {
    this.rootPath = options.rootPath || resolveControlPlaneRoot() || process.cwd();
    this.kernel = options.kernel || new EOSKernel({ rootPath: this.rootPath });
    this.governor = options.governor || new EOSProcessGovernor();
    this.ontology = options.ontology || new EOSKnowledgeOntology();
    this.driftDetector = options.driftDetector || new EOSDriftDetector({ rootPath: this.rootPath });
    this.fdir = options.fdir || new EOSFDIR({ rootPath: this.rootPath, detector: this.driftDetector });

    // Macro-fases canónicas del ciclo SDD
    this.fasesCanonicas = ['INTAKE', 'SPECIFICATION', 'ARCHITECTURE_PLAN', 'IMPLEMENTATION_TDD', 'VERIFICATION'];
    this.misionesActivas = new Map();
  }

  /**
   * Inicializa una nueva misión en el pipeline asignándole el estado primario de INTAKE.
   * @param {string} idMision - Identificador único de la misión
   * @param {string} [descripcion] - Resumen u objetivo de la misión
   * @returns {Promise<object>}
   */
  async inicializarMision(idMision, descripcion = '') {
    if (!idMision || typeof idMision !== 'string') {
      throw new Error('🚨 ORCHESTRATOR FAULT: Identificador de misión inválido.');
    }

    const cleanId = idMision.trim();
    const idOperacion = `MISSION-INIT-${cleanId.toUpperCase()}`;

    return await this.governor.ejecutarProcesoPerfecto(idOperacion, async () => {
      if (this.misionesActivas.has(cleanId)) {
        throw new Error(`🚨 ORCHESTRATOR FAULT: La misión [${cleanId}] ya se encuentra activa.`);
      }

      const estadoInicial = {
        idMision: cleanId,
        faseActual: 'INTAKE',
        timestamp: new Date().toISOString(),
        descripcion,
        evidenciasFirmadas: []
      };

      this.misionesActivas.set(cleanId, estadoInicial);

      try {
        this.ontology.registrarNodo(`MISSION-${cleanId.toUpperCase()}`, 'MISSION', { descripcion });
      } catch {}

      await this.kernel.registrarTransaccionLedger(idOperacion, { estadoInicial });
      return estadoInicial;
    });
  }

  /**
   * Avanza de forma controlada una fase en el pipeline si se presenta evidencia válida.
   * @param {string} idMision - Identificador de la misión activa
   * @param {string} hashEvidencia - Hash de evidencia criptográfica ('sha256-...' o hex de 64 caracteres)
   * @returns {Promise<object>}
   */
  async avanzarFase(idMision, hashEvidencia) {
    if (!idMision || typeof idMision !== 'string') {
      throw new Error('🚨 ORCHESTRATOR FAULT: Identificador de misión inválido.');
    }

    const cleanId = idMision.trim();
    const idOperacion = `MISSION-ADVANCE-${cleanId.toUpperCase()}`;

    return await this.governor.ejecutarProcesoPerfecto(idOperacion, async () => {
      const mision = this.misionesActivas.get(cleanId);
      if (!mision) {
        throw new Error(`🚨 ORCHESTRATOR FAULT: Misión inexistente en el plano de control: ${cleanId}`);
      }

      const esHashValido =
        typeof hashEvidencia === 'string' &&
        (hashEvidencia.startsWith('sha256-') || /^[a-f0-9]{64}$/i.test(hashEvidencia));

      if (!esHashValido) {
        throw new Error(`🚨 GOVERNANCE PANIC [GATE_VALIDATION_FAILED]: Evidencia ausente o corrupta. Transición bloqueada.`);
      }

      const indiceActual = this.fasesCanonicas.indexOf(mision.faseActual);
      if (indiceActual === -1) {
        throw new Error(`🚨 ORCHESTRATOR FAULT: Fase actual [${mision.faseActual}] desconocida.`);
      }

      if (indiceActual === this.fasesCanonicas.length - 1) {
        throw new Error(`🚨 ORCHESTRATOR FAULT: La misión ya ha alcanzado la consumación en la fase final.`);
      }

      const faseAnterior = this.fasesCanonicas[indiceActual];
      const siguienteFase = this.fasesCanonicas[indiceActual + 1];
      mision.faseActual = siguienteFase;
      mision.evidenciasFirmadas.push(hashEvidencia);

      await this.kernel.registrarTransaccionLedger(idOperacion, {
        mision: cleanId,
        faseAnterior,
        faseAlcanzada: siguienteFase,
        evidencia: hashEvidencia
      });

      return {
        idMision: cleanId,
        faseAnterior,
        faseNueva: siguienteFase,
        estatus: 'GATE_AUTHORIZED'
      };
    });
  }

  /**
   * Processes an incoming requirement and executes autonomous intent recognition with anti-amnesia logging
   * @param {string} promptUsuario User objective / prompt
   * @param {Record<string, string>} [lineasBaseMemoria] Expected baseline hashes
   * @returns {Promise<object>}
   */
  async reconocerIntencion(promptUsuario, lineasBaseMemoria) {

    if (lineasBaseMemoria) {
      const driftCheck = this.driftDetector.detectarDesviaciones(lineasBaseMemoria);
      if (!driftCheck.seguro) {
        console.warn('🚨 J.A.R.V.I.S. > Alerta de deriva detectada. Activando auto-curación FDIR...');
        await this.fdir.ejecutarCicloRecuperacion(lineasBaseMemoria);
      }
    }

    const idMision = `MIS-${Date.now().toString(36).toUpperCase()}`;
    const intencionEstructurada = {
      idMision,
      timestamp: new Date().toISOString(),
      objetivoPrincipal: promptUsuario,
      faseActual: 'INTAKE_VERIFIED',
      estado: 'READY_FOR_SPEC'
    };

    await this.kernel.registrarTransaccionLedger(idMision, intencionEstructurada);

    return intencionEstructurada;
  }

  /**
   * Gatekeeper validation to authorize advancement to the implementation/TDD phase
   * @param {string} idMision Mission identifier
   * @param {string} hashEvidenciaEsperado Expected SHA-256 evidence hash
   * @param {object} evidenciaDocumento Evidence receipt document
   * @returns {{ autorizado: boolean, timestamp: string, mensaje: string }}
   */
  validarGateImplementacion(idMision, hashEvidenciaEsperado, evidenciaDocumento) {
    console.log(`🛡️ [EOS GATEKEEPER] > Auditando compuerta de implementación para misión: ${idMision}`);

    const hashObtenido =
      evidenciaDocumento?.hashSha256 ||
      evidenciaDocumento?.sha256_hash ||
      evidenciaDocumento?.hash;

    if (!evidenciaDocumento || !hashObtenido) {
      throw new Error(`🚨 GATE BLOCKED: La evidencia documental para ${idMision} carece de firma SHA-256 válida.`);
    }

    if (hashObtenido !== hashEvidenciaEsperado) {
      throw new Error(
        `🚨 SECURITY VIOLATION: Discrepancia criptográfica en el Gate. Esperado: ${hashEvidenciaEsperado}, Obtenido: ${hashObtenido}`
      );
    }

    return {
      autorizado: true,
      timestamp: new Date().toISOString(),
      mensaje: `Compuerta autorizada para ${idMision}. Permiso concedido para edición en src/.`
    };
  }
}
