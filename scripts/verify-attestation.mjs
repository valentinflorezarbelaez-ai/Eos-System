/**
 * EOS Independent Attestation Verifier (READ-ONLY)
 * Implements SPEC-002 / FR-01, FR-02, FR-03
 * Zero-mutation write barrier: This script NEVER modifies or overwrites the baseline.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const trustDir = path.join(workspaceRoot, '.eos', 'trust');
const pubKeyPath = path.join(trustDir, 'root_pubkey.pem');
const baselinePath = path.join(trustDir, 'baseline.signed.json');

console.log('\n========================================================');
console.log('   EOS ATTESTATION VERIFIER (IMMUTABLE BASELINE AUDIT)');
console.log('========================================================\n');

// 1. Stage 0: Trust Root Existence Audit
if (!fs.existsSync(pubKeyPath)) {
  console.error(' [FAIL] CRITICAL: Root Public Key not found at .eos/trust/root_pubkey.pem');
  process.exit(2);
}
if (!fs.existsSync(baselinePath)) {
  console.error(' [FAIL] CRITICAL: Signed baseline not found at .eos/trust/baseline.signed.json');
  process.exit(2);
}

const pubKeyPem = fs.readFileSync(pubKeyPath, 'utf-8');
const rawManifest = fs.readFileSync(baselinePath, 'utf-8');
const manifest = JSON.parse(rawManifest);

// 2. Stage 1: Asymmetric Ed25519 Signature Verification
const canonicalPayload = JSON.stringify({
  manifestVersion: manifest.manifestVersion,
  keyId: manifest.keyId,
  signedCommit: manifest.signedCommit,
  timestamp: manifest.timestamp,
  files: manifest.files
});

const isSigValid = crypto.verify(
  null,
  Buffer.from(canonicalPayload, 'utf-8'),
  pubKeyPem,
  Buffer.from(manifest.signatureHex, 'hex')
);

if (!isSigValid) {
  console.error(' [FAIL] CRITICAL: Ed25519 digital signature of baseline manifest is INVALID or TAMPERED');
  console.error(' Epistemic Status: REMEDIATION_REQUIRED');
  process.exit(1);
}
console.log(' [PASS] Asymmetric Ed25519 Root Signature: VALID & AUTHENTIC');

// 3. Stage 2: Workspace Hash Verification against Baseline
const baselineMap = new Map();
for (const entry of manifest.files) {
  baselineMap.set(entry.relativePath, entry.sha256);
}

const mutated = [];
const missing = [];

for (const [relPath, expectedHash] of baselineMap.entries()) {
  const fullPath = path.join(workspaceRoot, relPath.replace(/\//g, path.sep));
  if (!fs.existsSync(fullPath)) {
    missing.push(relPath);
  } else {
    const currentHash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(fullPath))
      .digest('hex')
      .toUpperCase();
    if (currentHash !== expectedHash) {
      mutated.push({ relPath, expected: expectedHash, current: currentHash });
    }
  }
}

if (missing.length > 0) {
  console.error(` [FAIL] Missing files detected (${missing.length}):`);
  missing.forEach((f) => console.error(`   - MISSING: ${f}`));
}

if (mutated.length > 0) {
  console.error(` [FAIL] Mutated files detected (${mutated.length}):`);
  mutated.forEach((m) =>
    console.error(`   - MUTATED: ${m.relPath} (Expected: ${m.expected.substring(0, 8)}..., Current: ${m.current.substring(0, 8)}...)`)
  );
}

if (missing.length > 0 || mutated.length > 0) {
  console.error('\n [ABORT] Workspace divergence detected against signed baseline.');
  console.error(' Epistemic Status: FINDINGS_IDENTIFIED');
  process.exit(1);
}

console.log(` [PASS] 100% Files Conform to Signed Baseline (${baselineMap.size} files checked)`);
console.log(' [SUCCESS] ZERO DIVERGENCE (EXIT CODE 0)');
console.log(' Epistemic Status: VERIFIED / PRODUCTION_READY_WITHIN_TESTED_SCOPE\n');
process.exit(0);
