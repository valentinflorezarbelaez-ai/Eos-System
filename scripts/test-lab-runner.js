#!/usr/bin/env node
/**
 * @file scripts/test-lab-runner.js
 * @description Cross-platform L0 runner for EOS-Lab test suites.
 * Discovers *.test.js / *.test.mjs under EOS-Lab and delegates to node --test.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.cwd(), 'EOS-Lab');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, out);
    } else if (/\.test\.(js|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root).sort();
if (files.length === 0) {
  console.log('[EOS LAB RUNNER] No lab test files found. Nothing to run.');
  process.exit(0);
}

console.log(`[EOS LAB RUNNER] Executing ${files.length} lab test file(s)...`);
const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  timeout: 300000
});

if (result.error) {
  console.error(`[EOS LAB RUNNER] ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
