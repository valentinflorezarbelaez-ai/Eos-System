/**
 * EOS Administrative Baseline Signing Ceremony (PRIVILEGED / OUT-OF-BAND)
 * Implements SPEC-002 (Ed25519 Asymmetric Root-of-Trust)
 * 
 * Generates .eos/trust/root_pubkey.pem, .eos/trust/root_privkey.pem,
 * and seals .eos/trust/baseline.signed.json.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const trustDir = path.join(workspaceRoot, '.eos', 'trust');

if (!fs.existsSync(trustDir)) {
  fs.mkdirSync(trustDir, { recursive: true });
}

const pubKeyPath = path.join(trustDir, 'root_pubkey.pem');
const privKeyPath = path.join(trustDir, 'root_privkey.pem');
const baselinePath = path.join(trustDir, 'baseline.signed.json');

console.log('\n========================================================');
console.log('   EOS CEREMONY: ASYMMETRIC ED25519 BASELINE SEALING');
console.log('========================================================\n');

// 1. Generate or load Ed25519 keypair
let pubKeyPem, privKeyPem;
if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
  console.log('>>> Loading existing Ed25519 Root Keys from .eos/trust/...');
  pubKeyPem = fs.readFileSync(pubKeyPath, 'utf-8');
  privKeyPem = fs.readFileSync(privKeyPath, 'utf-8');
} else {
  console.log('>>> Generating new Ed25519 Cryptographic Root Keypair...');
  const keypair = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  pubKeyPem = keypair.publicKey;
  privKeyPem = keypair.privateKey;
  fs.writeFileSync(pubKeyPath, pubKeyPem, 'utf-8');
  fs.writeFileSync(privKeyPath, privKeyPem, 'utf-8');
  console.log(` [PASS] Root Public Key: ${pubKeyPath}`);
  console.log(` [PASS] Root Private Key: ${privKeyPath}`);
}

// 2. Scan and hash all tracked workspace files
function getFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(workspaceRoot, full).replace(/\\/g, '/');

    // Exclusion filter
    if (
      rel.startsWith('.git/') ||
      rel === '.git' ||
      rel.startsWith('dist/') ||
      rel === 'dist' ||
      rel.startsWith('.eos/trust/') ||
      rel === '.eos/trust' ||
      rel.startsWith('docs/evidence/') ||
      rel === 'docs/evidence'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = getFilesRecursively(workspaceRoot);
console.log(`>>> Indexed ${allFiles.length} files across workspace.`);

const fileChecksums = allFiles.map((full) => {
  const content = fs.readFileSync(full);
  const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
  const rel = path.relative(workspaceRoot, full).replace(/\\/g, '/');
  return {
    relativePath: rel,
    sha256: hash,
    sizeBytes: fs.statSync(full).size
  };
});

// Sort deterministically by relative path
fileChecksums.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

// 3. Build canonical manifest
const timestamp = new Date().toISOString();
let gitCommit = 'INITIAL_UNCOMMITTED';
try {
  const gitHead = path.join(workspaceRoot, '.git', 'HEAD');
  if (fs.existsSync(gitHead)) {
    const headContent = fs.readFileSync(gitHead, 'utf-8').trim();
    if (headContent.startsWith('ref: ')) {
      const refPath = path.join(workspaceRoot, '.git', headContent.substring(5).trim());
      if (fs.existsSync(refPath)) {
        gitCommit = fs.readFileSync(refPath, 'utf-8').trim();
      }
    } else {
      gitCommit = headContent;
    }
  }
} catch {
  // fallback to initial
}

const canonicalPayload = JSON.stringify({
  manifestVersion: '1.0.0',
  keyId: 'eos-root-ed25519-key-01',
  signedCommit: gitCommit,
  timestamp,
  files: fileChecksums
});

// 4. Sign with Ed25519
const signatureHex = crypto
  .sign(null, Buffer.from(canonicalPayload, 'utf-8'), privKeyPem)
  .toString('hex');

const signedManifest = {
  manifestVersion: '1.0.0',
  keyId: 'eos-root-ed25519-key-01',
  signedCommit: gitCommit,
  timestamp,
  files: fileChecksums,
  signatureHex
};

fs.writeFileSync(baselinePath, JSON.stringify(signedManifest, null, 2), 'utf-8');

console.log('\n========================================================');
console.log(' [SUCCESS] BASELINE SIGNED & SEALED WITH ED25519');
console.log(` Manifest: ${baselinePath}`);
console.log(` Digital Signature: ${signatureHex.substring(0, 32)}...`);
console.log(` Total Files Sealed: ${fileChecksums.length}`);
console.log('========================================================\n');
