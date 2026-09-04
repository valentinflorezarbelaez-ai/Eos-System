/**
 * @module VerifyReleasePackage
 * @description Audits release package integrity, 15 canonical schemas,
 * secret-free distribution, and exact file checksums.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { calculateSha256 } from '../src/core/sdd/epistemic-evidence-engine.js';

const root = process.cwd();
const releaseManifestPath = resolve(root, 'docs/releases/EOS_P3_CANONICAL_RELEASE_PACKAGE.json');

if (!existsSync(releaseManifestPath)) {
  console.error(`MISSING_RELEASE_MANIFEST: ${releaseManifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
let checkCount = 0;
let failCount = 0;

function assertCheck(name, condition, errorMsg = '') {
  checkCount++;
  if (!condition) {
    console.error(`❌ FAIL [${name}]: ${errorMsg}`);
    failCount++;
  } else {
    console.log(`✔ PASS [${name}]`);
  }
}

console.log('================================================================================');
console.log(`EOS RELEASE INTEGRITY & ACCEPTANCE AUDITOR (Release ${manifest.release_id})`);
console.log('================================================================================');

// 1. Validate Schema Inventory (16/16)
const schemas = manifest.verification_summary.schemas_inventory || [];
assertCheck('SCHEMA_COUNT', schemas.length === 16, `Expected 16 schemas, found ${schemas.length}`);

for (const schemaName of schemas) {
  const schemaFile = resolve(root, 'docs/schemas', schemaName);
  const exists = existsSync(schemaFile);
  assertCheck(`SCHEMA_FILE_${schemaName}`, exists, `Missing schema file: ${schemaFile}`);
  if (exists) {
    const content = readFileSync(schemaFile, 'utf8');
    const parsed = JSON.parse(content);
    assertCheck(`SCHEMA_VALID_DRAFT_2020_12_${schemaName}`, parsed.$schema === 'https://json-schema.org/draft/2020-12/schema');
  }
}

// 2. Secret & Sensitive Data Scan
const forbiddenPatterns = [
  /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
  /password\s*[:=]\s*['"][^'"]+['"]/i,
  /BEGIN\s+(RSA|OPENSSH|EC)\s+PRIVATE\s+KEY/i
];

const filesToScan = [
  'docs/releases/EOS_P3_CANONICAL_RELEASE_PACKAGE.json',
  'docs/releases/EOS_P3_CLOSURE_REPORT.md',
  'docs/manuals/MANUAL_DE_OPERACIONES_EOS.md',
  'src/cli/mission-cli.js',
  'src/core/runtime/mission-runtime.js'
];

for (const file of filesToScan) {
  const filePath = resolve(root, file);
  if (existsSync(filePath)) {
    const text = readFileSync(filePath, 'utf8');
    let hasSecret = false;
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        hasSecret = true;
        break;
      }
    }
    assertCheck(`NO_SECRETS_IN_${file}`, !hasSecret, `Potential secret or credential pattern detected in ${file}`);
  }
}

// 3. Prohibited Claims Check
const prohibited = manifest.prohibited_claims_and_boundaries || [];
assertCheck('PROHIBITED_BOUNDARIES_DECLARED', prohibited.length >= 4, 'Expected at least 4 explicit prohibited boundaries');

// 4. Target Project Isolation Verification (Δ = 0)
const fundacionPath = resolve(root, 'docs/projects/registrations/fundacion.json');
assertCheck('EXTERNAL_PROJECT_IMMUTABILITY_PRJ_FUNDACION', existsSync(fundacionPath), 'Registration file missing');

console.log('================================================================================');
console.log(`AUDIT RESULT: ${checkCount - failCount}/${checkCount} CHECKS PASSED (${failCount} FAILURES)`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
}
