#!/usr/bin/env node
/**
 * T8 Dirty DEFER triage gate — NON-MUTATING observational.
 * Does not delete DEFER paths. Exit 0 when lock green.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditDirtyDeferTriageLock } from '../lib/dirty-defer-triage-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const audit = auditDirtyDeferTriageLock(rootDir);
const payload = {
  ok: audit.ok,
  mode: audit.mode,
  mutating: false,
  checks: audit.checks.length,
  failures: audit.failures
};

if (!audit.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
