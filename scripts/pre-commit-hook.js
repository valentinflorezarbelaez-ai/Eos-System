#!/usr/bin/env node

/**
 * @file scripts/pre-commit-hook.js
 * @description Deterministic pre-commit hook for EOS control plane.
 * Enforces Law VI (Zero Plain Secrets) and executes verify:strict before allowing any Git commit.
 */

import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
  { name: 'GitHub Personal Token', regex: /gh[pousr]-[a-zA-Z0-9]{36}/ },
  { name: 'Generic Bearer Token in code', regex: /bearer\s+["'][a-zA-Z0-9._-]{30,}["']/i },
  { name: 'Private Key Header', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
];

export function scanDiffForSecrets(diffText) {
  const violations = [];
  const lines = diffText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only check added lines in diff
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        violations.push({
          pattern: pattern.name,
          line: line.substring(1).trim().slice(0, 80)
        });
      }
    }
  }
  return violations;
}

export function runPreCommitGuard(options = {}) {
  const cwd = options.cwd || rootDir;
  console.log('\n================================================================================');
  console.log('🛡️  EOS HARNESS ENGINEERING: PRE-COMMIT DETERMINISTIC GUARD');
  console.log('================================================================================\n');

  // 1. Check staged files
  let stagedFiles = [];
  try {
    const stagedOutput = execSync('git diff --cached --name-only', { cwd, encoding: 'utf8' }).trim();
    stagedFiles = stagedOutput ? stagedOutput.split('\n').map(f => f.trim()).filter(Boolean) : [];
  } catch (err) {
    console.warn(`[WARN] Could not retrieve git staged files: ${err.message}`);
  }

  if (stagedFiles.length === 0) {
    console.log('ℹ️  No staged files found. Skipping pre-commit verification.\n');
    return { success: true, reason: 'NO_STAGED_FILES' };
  }

  console.log(`[1/2] Checking ${stagedFiles.length} staged file(s) for sensitive secrets (Law VI)...`);

  // 2. Secret scanning on staged diff
  try {
    const diff = execSync('git diff --cached', { cwd, encoding: 'utf8' });
    const violations = scanDiffForSecrets(diff);
    if (violations.length > 0) {
      console.error('\n❌ [BLOCK] Law VI (Zero Plain Secrets) Violation Detected in Staged Changes:');
      for (const v of violations) {
        console.error(`   - Pattern: ${v.pattern}`);
        console.error(`     Snippet: ${v.line}`);
      }
      console.error('\nCommit aborted. Remove sensitive credentials before committing.\n');
      return { success: false, reason: 'SECRET_DETECTED', violations };
    }
  } catch (err) {
    console.error(`❌ [BLOCK] Error during diff secret scan: ${err.message}`);
    return { success: false, reason: 'SCAN_ERROR', error: err.message };
  }
  console.log('   ✅ 0 sensitive credentials detected.');

  // 3. Strict verification
  console.log('\n[2/2] Running EOS strict invariant verification (npm run verify:strict)...');
  const verifyRes = spawnSync('node', ['scripts/verify-eos.js', '--strict'], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (verifyRes.status !== 0) {
    console.error('\n❌ [BLOCK] verify:strict FAILED! Invariant checks rejected this commit.');
    if (verifyRes.stdout) console.error(verifyRes.stdout.trim());
    if (verifyRes.stderr) console.error(verifyRes.stderr.trim());
    console.error('\nCommit aborted. Run "npm run verify:strict" locally to diagnose and repair findings.\n');
    return { success: false, reason: 'VERIFY_FAILED', exitCode: verifyRes.status };
  }

  console.log('   ✅ All system invariants verified successfully.');
  console.log('\n================================================================================');
  console.log('🏆 [EOS PRE-COMMIT GUARD]: PASS — Sealed & ready for commit.');
  console.log('================================================================================\n');

  return { success: true };
}

// Direct CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = runPreCommitGuard();
  process.exit(result.success ? 0 : 1);
}
