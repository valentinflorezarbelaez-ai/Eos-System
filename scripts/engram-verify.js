#!/usr/bin/env node
/**
 * ROI6 light Engram contract verify — default path SSOT + envelope round-trip.
 * Does not require live `engram` CLI.
 */
import { verifyEngramContract, ENGRAM_SCHEMA_ID } from '../src/core/memory/engram-contract.js';
import { resolveRepoRoot } from '../src/core/write-barrier/paths.js';

const root = resolveRepoRoot();
try {
  const result = verifyEngramContract(root);
  console.log(JSON.stringify({
    VERDICT: 'PASS',
    schema: ENGRAM_SCHEMA_ID,
    ...result,
    note: 'Local JSONL SSOT only. Real FTS5 = external engram MCP on PATH (config/mcp/eos-mcp.ssot.json).'
  }, null, 2));
  process.exit(0);
} catch (err) {
  console.error(JSON.stringify({
    VERDICT: 'FAIL',
    error: err.message,
    code: err.code || null,
    deny_code: err.deny_code || null
  }, null, 2));
  process.exit(1);
}
