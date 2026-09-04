import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '../docs/schemas');
const files = [
  'mission-package.schema.json',
  'task-contract.schema.json',
  'hitl-receipt.schema.json',
  'project-profile.schema.json',
  'stack-candidate.schema.json',
  'architecture-decision.schema.json',
  'model-capability.schema.json',
  'endpoint-contract.schema.json',
  'integration-contract.schema.json',
  'token-economics-audit.schema.json',
  'mission-executive-report.schema.json',
  'cursor-return-package.schema.json',
  'role-profile.schema.json',
  'agent-selection-record.schema.json',
  'task-supervision-evaluation.schema.json',
  'external-canary-contract.schema.json',
  'golden-blueprint.schema.json'
];

for (const name of files) {
  const schemaPath = resolve(root, name);
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing schema file: ${schemaPath}`);
  }
  const raw = readFileSync(schemaPath, 'utf-8');
  const data = JSON.parse(raw);
  if (data.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`Invalid $schema in ${name}: ${data.$schema}`);
  }
  if (!data.$id) {
    throw new Error(`Missing $id in ${name}`);
  }
  if (data.type !== 'object') {
    throw new Error(`Expected type 'object' in ${name}, got ${data.type}`);
  }
  if (data.additionalProperties !== false) {
    throw new Error(`Expected additionalProperties: false in ${name}`);
  }
  const requiredCount = Array.isArray(data.required) ? data.required.length : 0;
  console.log(`VALID ${name}: ${requiredCount} required top-level fields`);
}

console.log('ALL SCHEMAS VALID');
