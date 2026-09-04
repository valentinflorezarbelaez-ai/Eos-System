import fs from 'node:fs';
import path from 'node:path';

/**
 * EOS Isolated Runtime Packager - L0 (Node built-ins only)
 * Extracts and compiles the verified Core Runtime into a clean, standalone npm package structure.
 */
function buildIsolatedPackage() {
  console.log('📦 [EOS PACKAGER] > Initiating clean Core Runtime extraction...');

  const root = process.cwd();
  const targetDir = path.join(root, 'dist', 'runtime-core');
  const runtimeSrcDir = path.join(root, 'src', 'core', 'runtime');

  try {
    // 1. Clean and reset the targeted isolation worktree
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });

    // 2. Map and copy verified, clean L0 components
    const directCopyFiles = [
      'mission-ontology.js',
      'ledger-recovery.js',
      'sentinel-killswitch.js',
      'context-compiler.js'
    ];

    for (const file of directCopyFiles) {
      const srcPath = path.join(runtimeSrcDir, file);
      const destPath = path.join(targetDir, 'src', file);

      if (!fs.existsSync(srcPath)) {
        throw new Error(`PACKAGING VIOLATION: Mandatory component missing from source: ${file}`);
      }

      fs.copyFileSync(srcPath, destPath);
      console.log(`  ➔ Extracted and verified component: src/${file}`);
    }

    // 3. Extract pure standalone EOSMissionRuntime without monorepo-internal engine imports
    const standaloneMissionRuntimeContent = `import { EOSContextCompiler } from './context-compiler.js';
import { EOSMissionOntologyCore } from './mission-ontology.js';

/**
 * EOS Mission Runtime Core (Isolated Standalone L0 Distribution)
 * L0 (Node built-ins only). Orchestrates pipeline transitions and secures the intake lifecycle.
 */
export class EOSMissionRuntime {
  /**
   * @param {object} [dependencies] Injected core instances
   */
  constructor(dependencies = {}) {
    this.compiler = new EOSContextCompiler(dependencies.compilerConfig || {});
    this.ontology = new EOSMissionOntologyCore();
    this.currentMissionState = 'STOPPED';
  }

  /**
   * Executes the strict INTAKE lifecycle phase by compiling source file provenance.
   * @param {string} missionId Canonical ID of the operation.
   * @param {Array<string>} sourceFiles Array of path locations to audit and embed.
   * @param {object} authorityInfo Transparency metadata block from the human operator.
   * @returns {object} Immutable sealed decision block.
   */
  executeIntakePhase(missionId, sourceFiles = [], authorityInfo = {}) {
    this.currentMissionState = 'INTAKE_EXECUTION';
    console.log(\`📡 [EOS RUNTIME] > Initiating absolute compliance intake for: \${missionId}\`);

    // 1. Compute entrypoint file provenance hashes via L0 compiler
    const contextBlock = this.compiler.compileContext(sourceFiles);

    // 2. Prepare payload contract footprint
    const previousPayload = {
      intentId: \`INT-INTAKE-\${missionId.toUpperCase()}\`,
      contractHash: 'GENESIS_INTEGRITY_BASE',
      evidenceChain: ['DETERMINISTIC_CHECK'],
      provenanceReceipt: contextBlock.provenanceReceipt
    };

    // 3. Compile and seal the state transition block with mandatory explainability logging
    const sealedDecisionBlock = this.ontology.compileDecisionBlock(previousPayload, {
      optionsConsidered: authorityInfo.optionsConsidered || ['INITIALIZE_NOMINAL_PIPELINE'],
      why: authorityInfo.why || 'System boot and requirement injection verification.',
      confidence: authorityInfo.confidence ?? 1.0,
      decisionIssued: 'TRANSITION_TO_SPECIFICATION',
      outcome: 'INTAKE_COMPLETED'
    });

    this.currentMissionState = 'SPECIFICATION_READY';
    return sealedDecisionBlock;
  }
}
`;
    fs.writeFileSync(
      path.join(targetDir, 'src', 'mission-runtime.js'),
      standaloneMissionRuntimeContent,
      'utf-8'
    );
    console.log('  ➔ Extracted and verified component: src/mission-runtime.js (Standalone Pure L0)');

    // 4. Generate strict standalone manifest (Enforcing L0 dependency laws)
    const packageManifest = {
      name: '@eos/runtime-core',
      version: '1.0.0-canary.0',
      description: 'EOS Mission OS - Isolated L0 Governed Runtime Core',
      type: 'module',
      main: './index.js',
      engines: {
        node: '>=20.0.0'
      },
      dependencies: {},
      devDependencies: {},
      private: true
    };

    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(packageManifest, null, 2),
      'utf-8'
    );

    // 5. Inject a clean consumer entrypoint exporting pure L0 core modules
    const entrypointTemplate = `export { EOSMissionRuntime } from './src/mission-runtime.js';
export { EOSContextCompiler } from './src/context-compiler.js';
export { EOSMissionOntologyCore } from './src/mission-ontology.js';
export { EOSLedgerRecovery } from './src/ledger-recovery.js';
export { EOSSentinelKillSwitch } from './src/sentinel-killswitch.js';
`;
    fs.writeFileSync(path.join(targetDir, 'index.js'), entrypointTemplate, 'utf-8');

    console.log('✨ [EOS PACKAGER] > Standalone package compiled successfully at: dist/runtime-core/');
  } catch (error) {
    console.error(`🚨 [PACKAGING PANIC] > Isolated distribution failed: ${error.message}`);
    process.exit(1);
  }
}

buildIsolatedPackage();
