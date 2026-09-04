import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EOS Automated Canary Deploy Pipeline - L0 (Node built-ins only)
 * Executes the strict sequential gates required to package, seal, and verify the Canary release.
 */
function runDeployPipeline() {
  console.log('🚀 [EOS DEPLOY] > Initiating master Canary deployment pipeline...');
  const root = process.cwd();

  const sequence = [
    { cmd: 'npm run boundary:verify', desc: 'Git Boundary Harmonization (Chaos evacuation)' },
    { cmd: 'npm run pleroma:purge', desc: 'Pleroma Purge (Technical debt evacuation)' },
    { cmd: 'npm run package:runtime', desc: 'Package Extraction (L0 standalone core segregation)' },
    { cmd: 'npm run package:receipt', desc: 'Cryptographic Sealing (Distribution receipt signing)' },
    { cmd: 'npm run verify:strict', desc: 'Strict Verification (482 baseline checkpoints audit)' }
  ];

  try {
    for (const step of sequence) {
      console.log(`\n▶️ Executing Gate: ${step.desc} [${step.cmd}]...`);

      // Execute synchronously inheriting stdio for full transparency
      execSync(step.cmd, { stdio: 'inherit', cwd: root });

      console.log(`🍏 Gate approved: ${step.desc} passed successfully.`);
    }

    // Verify physical existence of distribution receipt before concluding
    const receiptPath = path.join(root, 'docs', 'audits', 'EOS_DISTRIBUTION_CANARY_RECEIPT.json');
    if (!fs.existsSync(receiptPath)) {
      throw new Error('DEPLOYMENT VIOLATION: Pipeline completed but distribution receipt was not compiled.');
    }

    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
    console.log('\n================================================================');
    console.log('🎉 DEPLOYMENT SUCCESS: EOS Mission OS Canary Release is completely sealed!');
    console.log(`🔒 Build Integrity Hash: ${receipt.missionChainHash}`);
    console.log('================================================================');
    process.exit(0);

  } catch (error) {
    console.error(`\n🚨 [DEPLOYMENT CRITICAL PANIC] > Pipeline aborted due to gate violation: ${error.message}`);
    process.exit(1);
  }
}

runDeployPipeline();
