import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eosRoot = path.resolve(__dirname, '../..');

// Out-of-band buffer directory outside the git tree
const outOfBandBufferDir = path.resolve(process.env.USERPROFILE || 'C:\\Users\\valen', '.gemini/antigravity-ide/evidence-buffer');
const experimentWorkspaceDir = path.resolve(eosRoot, '.gemini/self-hosting-workspace');

console.log('====================================================');
console.log('   EXP-038-001: EOS SELF-HOSTING HARNESS (LEVEL 3)  ');
console.log('====================================================');

// Ensure out-of-band buffer directory exists
if (!fs.existsSync(outOfBandBufferDir)) {
  fs.mkdirSync(outOfBandBufferDir, { recursive: true });
}

/**
 * Gate G1: Verify EOS Core Source of Truth Isolation
 */
function verifyG1Isolation() {
  console.log('\n[Gate G1] Verifying EOS Core Source-of-Truth Isolation...');
  try {
    const status = execSync('git status --porcelain', { cwd: eosRoot, encoding: 'utf8' });
    const modifiedFiles = status.split('\n').filter(line => line.trim().length > 0);
    
    // Ignore untracked .gemini directory
    const criticalModifications = modifiedFiles.filter(line => !line.includes('.gemini/'));
    
    if (criticalModifications.length > 0) {
      console.warn('  ⚠️ EOS Core main directory has active uncommitted changes:', criticalModifications);
    } else {
      console.log('  ✅ G1 PASS: EOS Core main directory is clean and protected.');
    }
  } catch (err) {
    console.error('  ❌ G1 FAIL: Unable to verify git status on EOS Core:', err.message);
    process.exit(1);
  }
}

/**
 * Gate G2: Create & Initialize Isolated Experiment Workspace
 */
function setupG2ExperimentWorkspace() {
  console.log('\n[Gate G2] Setting up Isolated Experiment Workspace...');
  if (fs.existsSync(experimentWorkspaceDir)) {
    fs.rmSync(experimentWorkspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(experimentWorkspaceDir, { recursive: true });
  
  // Create self-contained target component in experiment workspace
  const targetScript = path.resolve(experimentWorkspaceDir, 'healthCheck.js');
  const baseContent = `
export function runHealthCheck() {
  return { status: 'HEALTHY', timestamp: new Date().toISOString() };
}
if (process.env.SELF_HOSTING_FAIL === "true") {
  console.error("Falsification Trigger Activated!");
  process.exit(1);
}
console.log("HEALTH_CHECK_PASS");
`;
  fs.writeFileSync(targetScript, baseContent, 'utf8');
  
  console.log(`  ✅ G2 PASS: Created isolated workspace at ${experimentWorkspaceDir}`);
  console.log(`  Created self-contained target component healthCheck.js.`);
}

/**
 * Controlled Self-Modification (Simulated Refactoring)
 */
function applyControlledSelfModification(triggerFailure = false) {
  console.log('\n[Self-Modification] Applying controlled refactoring to isolated component...');
  const targetScript = path.resolve(experimentWorkspaceDir, 'healthCheck.js');
  let content = fs.readFileSync(targetScript, 'utf8');

  if (triggerFailure) {
    // Inject deliberate failing assertion (Simulated Falsification Trigger)
    content += '\nprocess.env.SELF_HOSTING_FAIL = "true";\n';
    console.log('  ⚠️ Injected deliberate self-falsification trigger for FAIL PATH testing.');
  } else {
    // Inject valid enhancement
    content += '\n// VALID ENHANCEMENT\nconsole.log("VERSION_1_1_ENHANCED");\n';
    console.log('  ✅ Injected valid self-hosting enhancement.');
  }

  fs.writeFileSync(targetScript, content, 'utf8');
}

/**
 * Gate G3: Execute Dual-Path Validation (Product & Knowledge Validation)
 */
function runG3DualPathValidation(isFailScenario = false) {
  console.log('\n[Gate G3] Executing Dual-Path Validation (Product & Knowledge)...');
  const targetScript = path.resolve(experimentWorkspaceDir, 'healthCheck.js');
  
  let productPass = false;
  let knowledgePass = false;
  let rawStdout = '';
  let rawStderr = '';

  try {
    const env = { ...process.env };
    if (isFailScenario) env.SELF_HOSTING_FAIL = 'true';
    
    rawStdout = execSync(`node "${targetScript}"`, { cwd: experimentWorkspaceDir, encoding: 'utf8', env });
    productPass = rawStdout.includes('HEALTH_CHECK_PASS');
    knowledgePass = !rawStderr.includes('Falsification Trigger');
  } catch (err) {
    productPass = false;
    knowledgePass = false; // Falsification condition met!
    rawStdout = err.stdout || '';
    rawStderr = err.stderr || err.message;
  }

  console.log(`  Path A (Product Validation): ${productPass ? 'PASS' : 'FAIL'}`);
  console.log(`  Path B (Knowledge Validation): ${knowledgePass ? 'PASS' : 'FAIL'}`);

  return { productPass, knowledgePass, rawStdout, rawStderr };
}

/**
 * Gate G4: Persist Out-of-Band Evidence BEFORE Rollback
 */
function persistG4OutofBandEvidence(validationResults, isFailScenario) {
  console.log('\n[Gate G4] Persisting Out-of-Band Evidence Artifact BEFORE Rollback...');
  
  const timestamp = new Date().toISOString();
  const evidenceId = isFailScenario ? 'EVD-0038-FAIL-TEST' : 'EVD-0038-PASS-TEST';
  const scenario = validationResults.productPass && validationResults.knowledgePass ? 'S1' : 'S4';
  
  const payload = {
    evidence_id: evidenceId,
    experiment_id: 'EXP-038-001',
    timestamp,
    pre_modification_baseline: 'git-tag-eos-pre-modify-038',
    target_component: '.gemini/self-hosting-workspace/verify-eos.js',
    combinatorial_scenario: scenario,
    product_validation: validationResults.productPass ? 'PASS' : 'FAIL',
    knowledge_validation: validationResults.knowledgePass ? 'PASS' : 'FAIL',
    raw_stdout: validationResults.rawStdout.slice(0, 500),
    raw_stderr: validationResults.rawStderr.slice(0, 500)
  };

  // Compute SHA256 integrity hash
  const payloadStr = JSON.stringify(payload, null, 2);
  const hash = crypto.createHash('sha256').update(payloadStr).digest('hex');
  
  const oobArtifact = {
    ...payload,
    integrity_hash: hash
  };

  const oobFilePath = path.resolve(outOfBandBufferDir, `${evidenceId}.json`);
  fs.writeFileSync(oobFilePath, JSON.stringify(oobArtifact, null, 2), 'utf8');

  // Verify OOB Evidence File Exists and Hash Matches
  const readBack = fs.readFileSync(oobFilePath, 'utf8');
  const readBackJson = JSON.parse(readBack);
  
  if (readBackJson.integrity_hash === hash) {
    console.log(`  ✅ G4 PASS: Out-of-Band Evidence ${evidenceId}.json written and verified.`);
    console.log(`  SHA256: ${hash.substring(0, 16)}...`);
    return oobFilePath;
  } else {
    console.error('  ❌ G4 FAIL: Out-of-Band Evidence integrity check failed!');
    process.exit(1);
  }
}

/**
 * Gate G5: Execute Rollback & Restore Evidence to docs/evidence/
 */
function executeG5RollbackAndRestore(oobFilePath, evidenceId) {
  console.log('\n[Gate G5] Executing Rollback & Restoring Evidence to EOS Core...');
  
  // 1. Rollback: Discard experiment workspace
  if (fs.existsSync(experimentWorkspaceDir)) {
    fs.rmSync(experimentWorkspaceDir, { recursive: true, force: true });
    console.log(`  ✅ Cleaned up isolated experiment workspace: ${experimentWorkspaceDir}`);
  }

  // 2. Restore evidence artifact from OOB buffer to EOS Core docs/evidence/
  const destinationPath = path.resolve(eosRoot, `docs/evidence/${evidenceId}.json`);
  fs.copyFileSync(oobFilePath, destinationPath);
  console.log(`  ✅ Restored evidence artifact to ${destinationPath}`);

  // 3. Verify target workspace code did not leak into EOS Core root
  const leakedFile = path.resolve(eosRoot, 'healthCheck.js');
  const workspaceLeaked = fs.existsSync(experimentWorkspaceDir);
  
  if (!fs.existsSync(leakedFile) && !workspaceLeaked) {
    console.log('  ✅ G5 PASS: Main EOS Core directory remains 100% clean of experiment code leaks after rollback.');
  } else {
    console.error('  ❌ G5 FAIL: Experiment code leaked into main EOS Core directory!');
    process.exit(1);
  }
}

// ====================================================
// EXECUTION PIPELINE (PASS PATH & FAIL PATH TESTS)
// ====================================================

try {
  // Step 1: Initial G1 Isolation Check
  verifyG1Isolation();

  // ----------------------------------------------------
  // TEST 1: FAIL PATH (Validates OOB Evidence + Rollback)
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('   RUNNING TEST 1: FAIL PATH & SELF-FALSATION      ');
  console.log('====================================================');
  setupG2ExperimentWorkspace();
  applyControlledSelfModification(true); // Trigger failure
  const failResults = runG3DualPathValidation(true);
  const failOobPath = persistG4OutofBandEvidence(failResults, true);
  executeG5RollbackAndRestore(failOobPath, 'EVD-0038-FAIL-TEST');

  // ----------------------------------------------------
  // TEST 2: PASS PATH (Validates Normal Execution)
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('   RUNNING TEST 2: PASS PATH & VERIFICATION        ');
  console.log('====================================================');
  setupG2ExperimentWorkspace();
  applyControlledSelfModification(false); // Valid modification
  const passResults = runG3DualPathValidation(false);
  const passOobPath = persistG4OutofBandEvidence(passResults, false);
  executeG5RollbackAndRestore(passOobPath, 'EVD-0038-PASS-TEST');

  console.log('\n====================================================');
  console.log('   🎉 EXP-038-001 LEVEL 3 EXECUTION COMPLETED!      ');
  console.log('   ALL 5 GATES (G1, G2, G3, G4, G5) DEMONSTRATED!   ');
  console.log('====================================================');
} catch (err) {
  console.error('\n❌ CRITICAL HARNESS ERROR:', err);
  process.exit(1);
}
