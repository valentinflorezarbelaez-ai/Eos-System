#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { issueApiKey, resolveApiKeyStorePath } from '../src/mcp/api-key-gate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  process.stderr.write('usage: node scripts/eos-mcp-api-key.js issue [--store path]\n');
}

const args = process.argv.slice(2);
if (args[0] !== 'issue') {
  usage();
  process.exit(1);
}

let storePath = resolveApiKeyStorePath(root, process.env);
const storeFlag = args.indexOf('--store');
if (storeFlag !== -1) {
  const value = args[storeFlag + 1];
  if (!value) {
    usage();
    process.exit(1);
  }
  storePath = path.resolve(value);
}

let issued;
try {
  issued = issueApiKey({ storePath });
} catch (err) {
  process.stderr.write(`issue failed: ${err.message}\n`);
  process.exit(1);
}

process.stdout.write(`${issued.secret}\n`);
process.stderr.write(`hash written to ${issued.storePath}\n`);
