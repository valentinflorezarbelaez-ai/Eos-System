import fs from 'node:fs';
import path from 'node:path';
import { MissionRuntime } from '../src/core/runtime/mission-runtime.js';

/**
 * EOS Autonomous Intent Injection Engine - L0 (Node built-ins only)
 * Drives the elite agent SDLC loop with mathematical precision and zero risk tolerance.
 */
export function executeAutonomousIntake() {
  console.log('🚀 [EOS AGENT SDLC] > Initiating zero-error autonomous intake pipeline...');

  const root = process.cwd();
  const runtime = new MissionRuntime({ rootPath: root });

  // 1. Definición milimétrica del caso de prueba / problemática real a resolver
  const targetMissionId = `CORE-ROUTING-${Date.now()}`;
  const mockSpecPath = path.join(root, 'docs', 'specs', 'core-routing-engine_spec.md');
  const mockSrcPath = path.join(root, 'src', 'core', 'runtime', 'core-routing-engine.js');
  const mockTestPath = path.join(root, 'tests', 'core-routing-engine.test.js');

  try {
    // Inicializar el Vaso de Hermes (Creación de andamiaje limpio controlado)
    if (!fs.existsSync(path.dirname(mockSpecPath))) fs.mkdirSync(path.dirname(mockSpecPath), { recursive: true });
    if (!fs.existsSync(path.dirname(mockSrcPath))) fs.mkdirSync(path.dirname(mockSrcPath), { recursive: true });
    if (!fs.existsSync(path.dirname(mockTestPath))) fs.mkdirSync(path.dirname(mockTestPath), { recursive: true });

    // Cristalizar las tres fuerzas físicas en el disco de forma impecable
    fs.writeFileSync(mockSpecPath, '# Core Routing Engine Spec\n- EARS: verified', 'utf-8');
    fs.writeFileSync(mockSrcPath, '// Production Code\nexport class CoreRouter { execute() { return true; } }', 'utf-8');
    fs.writeFileSync(mockTestPath, '// Resistance Test\nimport test from "node:test";\nimport assert from "node:assert/strict";', 'utf-8');

    console.log(`\n▶️ [GATE 1] > Evaluating Sefirotic Affinity Resonance for node: [${targetMissionId}]...`);
    // Valida que el namespace no colisione con misiones preexistentes en el Kabbalah Ledger
    runtime.orchestrator.initiateOctavePipeline(targetMissionId, [mockSpecPath], {
      optionsConsidered: ['INJECT_NOMINAL_ROUTING_SERVICE'],
      why: 'Problematic requirement demands autonomous microservice resolution.'
    });
    console.log('  🍏 Gate approved: No vibrational dissonance detected.');

    console.log('\n▶️ [GATE 2] > Advancing to ARCH_GEOMETRY and validation of the Holy Triamazikamno...');
    // Transicionar secuencialmente por las octavas de la máquina de estados
    runtime.orchestrator.advanceWithShockPoints(targetMissionId, 'SPEC_CRYSTALLIZATION');
    runtime.orchestrator.advanceWithShockPoints(targetMissionId, 'ARCH_GEOMETRY');

    // Fuerza la aduana interactiva de las tres fuerzas primarias (Spec + Test + Código)
    runtime.orchestrator.advanceWithShockPoints(targetMissionId, 'TDD_FRAGUA_ROJO', {
      componentName: 'core-routing-engine'
    });
    console.log('  🍏 Gate approved: Holy Triamazikamno perfectly balanced.');

    console.log('\n================================================================');
    console.log('🎉 INJECTION SUCCESS: The agent-driven solution has achieved stable manifestation!');
    console.log(`🔒 Active Mission State: ${runtime.orchestrator.activeMissions.get(targetMissionId).currentTemple}`);
    console.log('================================================================');

    // Limpieza atómica de artefactos simulados para preservar el Git Boundary impecable
    try { fs.unlinkSync(mockSpecPath); } catch {}
    try { fs.unlinkSync(mockSrcPath); } catch {}
    try { fs.unlinkSync(mockTestPath); } catch {}

    if (process.argv[1] && process.argv[1].endsWith('execute-autonomous-intake.js')) {
      process.exit(0);
    }
    return { status: 'SUCCESS', missionId: targetMissionId };

  } catch (error) {
    console.error(`\n🚨 [SDLC PIPELINE ABORTED] > Execution frozen due to failure vector: ${error.message}`);
    try { fs.unlinkSync(mockSpecPath); } catch {}
    try { fs.unlinkSync(mockSrcPath); } catch {}
    try { fs.unlinkSync(mockTestPath); } catch {}

    if (process.argv[1] && process.argv[1].endsWith('execute-autonomous-intake.js')) {
      process.exit(1);
    }
    return { status: 'ERROR', message: error.message };
  }
}

if (process.argv[1] && process.argv[1].endsWith('execute-autonomous-intake.js')) {
  executeAutonomousIntake();
}
