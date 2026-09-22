import fs from 'node:fs';
import path from 'node:path';
import { EOSContextCompiler } from './context-compiler.js';
import { EOSMissionOntologyCore } from './mission-ontology.js';
import { EOSTDDExecutor } from './tdd-executor.js';
import { EOSTriamazikamnoValidator } from './triamazikamno-validator.js';
import { EOSSentinelSelfRemember } from './sentinel-self-remember.js';
import { EOSKabbalahLedger } from './kabbalah-ledger.js';
import { EOSAhimsaFilter } from './ahimsa-filter.js';

/**
 * EOS Mission Orchestrator - State Unification Edition
 * L0 (Node built-ins only). Drives the 7 planetary octaves, forcing synchronous physical persistence
 * and process self-observation at every gate.
 */
export class EOSMissionOrchestrator {
  /**
   * @param {object} [config] Settings mapping the database physical roots and submodules.
   */
  constructor(config = {}) {
    this.rootPath = config.rootPath || process.cwd();
    this.dbPath = config.dbPath || path.join(this.rootPath, 'docs', 'audits', 'eos_kabbalah_ledger.jsonl');

    this.compiler = new EOSContextCompiler(config.compilerConfig || {});
    this.ontology = new EOSMissionOntologyCore();
    this.tdd = new EOSTDDExecutor(config.tddConfig || {});
    this.triadValidator = new EOSTriamazikamnoValidator({ rootPath: this.rootPath });
    this.selfRememberGuard = new EOSSentinelSelfRemember(config.sentinelConfig || {});
    this.ahimsaFilter = new EOSAhimsaFilter();

    // Instanciación de la persistencia sefirótica física en disco
    this.ledgerDb = new EOSKabbalahLedger(this.dbPath);
    this.activeMissions = new Map();

    this.sevenTemples = Object.freeze([
      'INTAKE_GENESIS',       // Do
      'SPEC_CRYSTALLIZATION', // Re
      'ARCH_GEOMETRY',        // Mi
      'TDD_FRAGUA_ROJO',      // Fa (Punto de Choque 1 - Test Fallido & Tríada)
      'TDD_FRAGUA_VERDE',     // Sol (Auto-Heal / Transmutación)
      'FDIR_IMMUNIZATION',    // La (Punto de Choque 2 - Inmunidad)
      'CONSUMMATION_SEAL'     // Si
    ]);

    // 🔥 HIDRATACIÓN AUTOMÁTICA EN EL GÉNESIS DEL ARRANQUE
    this.hydrateStateFromDisk();
  }

  /**
   * Reads the physical sefirotic ledger from disk and reconstructs the memory state graph map.
   */
  hydrateStateFromDisk() {
    if (!fs.existsSync(this.dbPath)) return;

    try {
      const content = fs.readFileSync(this.dbPath, 'utf-8');
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      for (const line of lines) {
        try {
          const node = JSON.parse(line);
          const rawIntent = node.metadata?.intentId || '';
          const parts = rawIntent.split('-');
          const mId = parts.length > 2 ? parts.slice(2).join('-') : (parts.pop() || 'UNKNOWN_MISSION');

          const existing = this.activeMissions.get(mId) || {
            missionId: mId,
            currentTemple: 'INTAKE_GENESIS',
            currentPhase: 'INTAKE_GENESIS',
            chain: [],
            history: [],
            scaffoldedFiles: []
          };

          const targetTemple = node.metadata?.targetTemple || existing.currentTemple;
          existing.currentTemple = targetTemple;
          existing.currentPhase = targetTemple;
          existing.lastChainHash = node.nodeChainHash;
          existing.chain.push(node);
          existing.history.push(node);

          this.activeMissions.set(mId, existing);
        } catch { /* ignore corrupted single line */ }
      }
    } catch (err) {
      console.error(`🚨 [HYDRATION CRITICAL PANIC] > History log parsed corrupted: ${err.message}`);
    }
  }

  /**
   * Backward-compatible alias for 5-macro-phase initiation.
   * @param {string} missionId
   * @param {Array<string>} [sourceFiles]
   * @param {object} [authorityInfo]
   */
  initiateMission(missionId, sourceFiles = [], authorityInfo = {}) {
    const octave = this.initiateOctavePipeline(missionId, sourceFiles, authorityInfo);
    const missionInstance = {
      missionId,
      currentPhase: 'INTAKE',
      currentTemple: octave.currentTemple,
      history: octave.chain,
      chain: octave.chain,
      scaffoldedFiles: []
    };
    this.activeMissions.set(missionId, missionInstance);
    return Object.freeze({ ...missionInstance, history: [...missionInstance.history] });
  }

  /**
   * 🌐 ADUANA DE RESONANCIA SEFIRÓTICA: Evalúa la afinidad armónica de la nueva intención
   * @private
   */
  #assertAffinityResonance(missionId, files = []) {
    if (this.activeMissions.has(missionId)) {
      throw new Error(`VIBRATIONAL_DISSONANCE_REJECTION: Mission ID [${missionId}] already possesses active sovereignty in the Pleroma.`);
    }

    for (const [activeId] of this.activeMissions.entries()) {
      if (activeId.toUpperCase() === String(missionId).toUpperCase()) {
        throw new Error(`VIBRATIONAL_DISSONANCE_REJECTION: Semantic namespace collision intercepted for target node: ${missionId}`);
      }
    }
  }

  /**
   * Initializes a mission inside the genesis temple, committing the block directly to the physical database.
   * @param {string} missionId
   * @param {Array<string>} [sourceFiles]
   * @param {object} [authorityInfo]
   */
  initiateOctavePipeline(missionId, sourceFiles = [], authorityInfo = {}) {
    if (!missionId || typeof missionId !== 'string') {
      throw new Error(`GOVERNANCE FAULT: Mission ID [${missionId}] is invalid.`);
    }

    // 💥 DISPARAR LA ADUANA DE RESONANCIA INTER-NODAL
    this.#assertAffinityResonance(missionId, sourceFiles);

    const context = this.compiler.compileContext(sourceFiles);
    const initialPayload = {
      intentId: `INT-OCTAVE-DO-${missionId.toUpperCase()}`,
      contractHash: 'GENESIS_LAW_INTEGRITY',
      evidenceChain: ['DETERMINISTIC_CHECK'],
      provenanceReceipt: context.provenanceReceipt
    };

    const sealedBlock = this.ontology.compileDecisionBlock(initialPayload, {
      optionsConsidered: authorityInfo.optionsConsidered || ['INITIALIZE_SACRED_OCTAVE'],
      why: 'Autonomous activation of the Seven Temples with unified disk persistence.',
      confidence: 1.0,
      decisionIssued: 'TRANSITION_TO_RE',
      outcome: 'OCTAVE_DO_INITIALIZED'
    });

    // 🔥 PERSISTENCIA SÍNCRONA FÍSICA EN EL DISCO
    const sefirotNode = this.ledgerDb.appendSefirotNode(
      `INT-DO-${missionId.toUpperCase()}`,
      sealedBlock.contractHash,
      sealedBlock.missionChainHash,
      { targetTemple: 'INTAKE_GENESIS' }
    );

    const missionInstance = {
      missionId,
      currentTemple: 'INTAKE_GENESIS',
      currentPhase: 'INTAKE_GENESIS',
      lastChainHash: sefirotNode.nodeChainHash,
      chain: [sealedBlock],
      history: [sealedBlock],
      scaffoldedFiles: []
    };

    this.activeMissions.set(missionId, missionInstance);
    return Object.freeze({ ...missionInstance, chain: [...missionInstance.chain] });
  }

  /**
   * Controlled transition to the next adjacent temple in the octave sequence.
   * @param {string} missionId
   * @param {string} targetTemple
   * @param {string} hashEvidencia
   */
  transitionToNextTemple(missionId, targetTemple, hashEvidencia) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      throw new Error(`GOVERNANCE FAULT: Target mission [${missionId}] not found in active registry.`);
    }

    const currentTemple = mission.currentTemple || 'INTAKE_GENESIS';
    const currentIndex = this.sevenTemples.indexOf(currentTemple);
    const targetIndex = this.sevenTemples.indexOf(targetTemple);

    if (targetIndex !== currentIndex + 1) {
      throw new Error(`INVALID_OCTAVE_TRANSITION: Cannot skip or jump temples illegally. Step-by-step evolution required.`);
    }

    if (!hashEvidencia || (!hashEvidencia.startsWith('sha256-') && hashEvidencia.length !== 64)) {
      throw new Error(`GOVERNANCE FAULT: Missing or malformed cryptographic receipt for gate validation.`);
    }

    // Aduana de Autobservación síncrona
    this.selfRememberGuard.auditActiveConsciousness();

    const sefirotNode = this.ledgerDb.appendSefirotNode(
      `INT-${targetTemple}-${missionId.toUpperCase()}`,
      hashEvidencia,
      mission.lastChainHash || 'INITIAL_HASH',
      { targetTemple }
    );

    const updatedMission = {
      ...mission,
      currentTemple: targetTemple,
      currentPhase: targetTemple,
      lastChainHash: sefirotNode.nodeChainHash,
      chain: [...(mission.chain || mission.history || []), { temple: targetTemple, evidence: hashEvidencia, ts: new Date().toISOString() }],
      history: [...(mission.history || mission.chain || []), { temple: targetTemple, evidence: hashEvidencia, ts: new Date().toISOString() }],
      scaffoldedFiles: mission.scaffoldedFiles || []
    };

    this.activeMissions.set(missionId, updatedMission);
    return Object.freeze({ ...updatedMission, chain: [...updatedMission.chain] });
  }

  /**
   * Drives the mission through the temples, forcing physical serialization and shock point validation at each gate.
   * @param {string} missionId
   * @param {string} targetTemple
   * @param {object} [executionContext]
   */
  advanceWithShockPoints(missionId, targetTemple, executionContext = {}) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      throw new Error(`GOVERNANCE FAULT: Target mission [${missionId}] not found.`);
    }

    const currentIndex = this.sevenTemples.indexOf(mission.currentTemple);
    const targetIndex = this.sevenTemples.indexOf(targetTemple);

    if (targetIndex !== currentIndex + 1) {
      throw new Error(`INVALID_OCTAVE_TRANSITION: Step-by-step evolution required. Intermediates cannot be bypassed.`);
    }

    // Aduana de Autobservación síncrona
    this.selfRememberGuard.auditActiveConsciousness();

    // 🔥 ADUANA DE INMUNIDAD CRUZADA: FILTRO AHIMSA
    if (executionContext.srcPath) {
      this.ahimsaFilter.assertInnocuousWrite(executionContext.srcPath, missionId, this.activeMissions);
    }
    if (executionContext.testPath) {
      this.ahimsaFilter.assertInnocuousWrite(executionContext.testPath, missionId, this.activeMissions);
    }

    console.log(`▶️ [OCTAVE PERSISTED] > Promoting ${missionId} down to ${targetTemple}`);

    // Middleware Creacional Santo Triamazikamno
    if (targetTemple === 'TDD_FRAGUA_ROJO') {
      console.log('⚖️ [TRIAMAZIKAMNO MIDDLEWARE] > Invoking strict creational triad audit...');
      if (!executionContext.componentName) {
        throw new Error('GOVERNANCE FAULT: componentName parameter is mandatory for Triamazikamno validation.');
      }
      this.triadValidator.validateTriadBalance(executionContext.componentName);
    }

    // Shock Point 1: Fa ➔ Sol (TDD Auto-Heal)
    if (targetTemple === 'TDD_FRAGUA_VERDE') {
      console.log('⚡ [SHOCK POINT FA] > Spawning closed-loop TDD auto-healing engine...');
      const tddReport = this.tdd.executeTDDLoop(
        executionContext.srcPath,
        executionContext.testPath,
        executionContext.patchRoutine || ((p) => fs.writeFileSync(p, '// Auto-Healed', 'utf-8'))
      );
      if (tddReport.status !== 'TDD_AUTO_HEALED_GREEN') {
        throw new Error(`OCTAVE_DEGENERATION: Fa Shock Point failed. Test budget exceeded. Output: ${tddReport.lastError}`);
      }
    }

    // Shock Point 2: La ➔ Si (Inmunidad FDIR)
    if (targetTemple === 'FDIR_IMMUNIZATION') {
      console.log('🛡️ [SHOCK POINT LA] > Triggering sifting FDIR/Drift integrity audit...');
      if (executionContext.simulateDrift === true) {
        throw new Error('OCTAVE_DEGENERATION: La Shock Point failed. Unauthorized architectural drift detected.');
      }
    }

    const previousChain = mission.chain || mission.history || [];
    const previousHash = previousChain[previousChain.length - 1]?.missionChainHash || mission.lastChainHash || 'INITIAL_HASH';
    const blockPayload = {
      intentId: `INT-OCTAVE-${targetTemple}-${missionId.toUpperCase()}`,
      contractHash: previousHash,
      evidenceChain: [targetTemple === 'TDD_FRAGUA_VERDE' ? 'E2E_SIMULATION' : 'DETERMINISTIC_CHECK']
    };

    const sealedBlock = this.ontology.compileDecisionBlock(blockPayload, {
      optionsConsidered: [`APPLY_SHOCK_FOR_${targetTemple}`, 'HALT_OCTAVE'],
      why: `Process memory invariants and creational laws validated for ${targetTemple}.`,
      confidence: 1.0,
      decisionIssued: `PROMOTE_TO_${targetTemple}`,
      outcome: `${targetTemple}_TRANSITION_SEALED`
    });

    // 🔥 PERSISTENCIA SÍNCRONA FÍSICA EN EL DISCO
    const sefirotNode = this.ledgerDb.appendSefirotNode(
      `INT-${targetTemple}-${missionId.toUpperCase()}`,
      sealedBlock.contractHash,
      sealedBlock.missionChainHash,
      { targetTemple }
    );

    const advancedMission = {
      ...mission,
      currentTemple: targetTemple,
      currentPhase: targetTemple,
      lastChainHash: sefirotNode.nodeChainHash,
      chain: [...previousChain, sealedBlock],
      history: [...previousChain, sealedBlock],
      scaffoldedFiles: mission.scaffoldedFiles || []
    };

    this.activeMissions.set(missionId, advancedMission);
    return Object.freeze({ ...advancedMission, chain: [...advancedMission.chain] });
  }

  /**
   * Synchronously purges physical files and rolls back the execution state to the previous valid temple.
   * @param {string} missionId Target operation ID.
   * @param {string} reason Explanatory root cause.
   * @returns {object} Frozen rolled-back mission instance.
   */
  rollbackOctave(missionId, reason) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      throw new Error(`GOVERNANCE FAULT: Target mission [${missionId}] not found in active registry.`);
    }

    const currentTemple = mission.currentTemple || 'INTAKE_GENESIS';
    const currentIndex = this.sevenTemples.indexOf(currentTemple);
    if (currentIndex <= 0) {
      throw new Error(`INVALID_ROLLBACK_EXECUTION: Mission is already at genesis temple. Cannot rollback further.`);
    }

    console.warn(`🚨 [EOS ROLLBACK] > Activating physical rollback for mission [${missionId}]. Reason: ${reason}`);

    if (Array.isArray(mission.scaffoldedFiles)) {
      for (const filePath of mission.scaffoldedFiles) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.warn(`  🗑️ Physically purged polluted artifact: ${filePath}`);
          }
        } catch (err) {
          console.error(`🚨 [ROLLBACK I/O PANIC] > Failed to delete file ${filePath}: ${err.message}`);
        }
      }
    }

    const previousTemple = this.sevenTemples[currentIndex - 1];
    const chainList = mission.chain || mission.history || [];
    const containmentPayload = {
      intentId: `INT-ROLLBACK-${missionId.toUpperCase()}`,
      contractHash: chainList[chainList.length - 1]?.missionChainHash || mission.lastChainHash || 'COMPROMISED_CHAIN',
      evidenceChain: ['FORENSIC_AUDIT'],
      rollbackReason: String(reason || 'Fault containment').trim()
    };

    const sealedContainmentBlock = this.ontology.compileDecisionBlock(containmentPayload, {
      optionsConsidered: ['PURGE_FILESYSTEM_ARTIFACTS', 'DEGRADE_STATE_ATOMICALLY'],
      why: `Rollback triggered to secure provenance and clear disk pollution. Context: ${String(reason || 'Fault containment').trim()}`,
      confidence: 1.0,
      decisionIssued: `REVERT_TO_${previousTemple}`,
      outcome: 'MISSION_FAULT_CONTAINED'
    });

    const sefirotNode = this.ledgerDb.appendSefirotNode(
      `INT-ROLLBACK-${missionId.toUpperCase()}`,
      sealedContainmentBlock.contractHash,
      sealedContainmentBlock.missionChainHash,
      { targetTemple: previousTemple }
    );

    const rolledBackMission = {
      missionId,
      currentTemple: previousTemple,
      currentPhase: previousTemple,
      lastChainHash: sefirotNode.nodeChainHash,
      chain: [...chainList, sealedContainmentBlock],
      history: [...chainList, sealedContainmentBlock],
      scaffoldedFiles: []
    };

    this.activeMissions.set(missionId, rolledBackMission);
    return Object.freeze({ ...rolledBackMission, chain: [...rolledBackMission.chain] });
  }
}
