#!/usr/bin/env node
/**
 * Host-level OpenSpec CLI adapter.
 * Shells out to `openspec` on PATH. Does not import npm packages.
 * Does not run npm install. Not part of src/core (L0).
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

const INSTALL_DOC = 'docs/manuals/OPENSPEC_RUNTIME.md';

const args = process.argv.slice(2);
const child = spawn('openspec', args, { stdio: 'inherit' });

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    process.stderr.write(
      'OpenSpec CLI is not on PATH (not installed for this L0 clone).\n' +
        `Optional host install is documented in ${INSTALL_DOC}.\n` +
        'This helper never adds npm dependencies or imports @fission-ai/openspec.\n'
    );
    process.exit(2);
  }
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
