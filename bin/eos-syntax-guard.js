#!/usr/bin/env node

/**
 * @file bin/eos-syntax-guard.js
 * @version 1.0.0
 * @description CLI Wrapper for Boris Cherny Post-Tool-Use Syntax Guard (Pure L0).
 * Usage: node bin/eos-syntax-guard.js <file1> [file2]...
 */

import { SyntaxGuard } from '../src/core/governance/syntax-guard.js';

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(`
🛡️  EOS POST-TOOL-USE SYNTAX GUARD (Boris Cherny Standard)
Usage:
  node bin/eos-syntax-guard.js <file1> [file2]...
`);
    return;
  }

  const guard = new SyntaxGuard();
  const { allValid, results } = guard.validateFiles(argv);

  for (const r of results) {
    if (r.valid) {
      console.log(`✔ [SYNTAX OK] [${r.language}] ${r.filePath}`);
    } else {
      console.error(`🚨 [SYNTAX ERROR] [${r.language}] ${r.filePath}`);
      console.error(`   ${r.error}`);
    }
  }

  if (!allValid) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('eos-syntax-guard.js')) {
  main();
}
