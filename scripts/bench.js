#!/usr/bin/env node
/**
 * @file scripts/bench.js
 * @description L0 latency baseline for critical EOS control-plane surfaces.
 * Fails when a surface exceeds its budget. Defaults are intentionally generous
 * to avoid false negatives on shared CI runners; tighten after baselining.
 */

import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const CASES = [
  { id: 'doctor', args: ['bin/eos-doctor.js', '--json'], budgetMs: 1000 },
  { id: 'hud_no_verify', args: ['bin/eos-hud.js', '--no-verify'], budgetMs: 1500 },
  { id: 'verify_strict', args: ['scripts/verify-eos.js', '--strict'], budgetMs: 3000 }
];

const results = [];
for (const item of CASES) {
  const start = performance.now();
  const res = spawnSync(process.execPath, item.args, {
    stdio: 'ignore',
    timeout: item.budgetMs + 5000
  });
  const elapsed = Math.round(performance.now() - start);
  results.push({
    id: item.id,
    ms: elapsed,
    budget_ms: item.budgetMs,
    exit: res.status,
    ok: res.status === 0 && elapsed <= item.budgetMs
  });
}

console.log('[EOS BENCH] baseline');
for (const r of results) {
  console.log(
    `  ${r.id.padEnd(16)} ${String(r.ms).padStart(6)} ms  budget=${r.budget_ms} ms  exit=${r.exit}  ${r.ok ? 'PASS' : 'FAIL'}`
  );
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`[EOS BENCH] FAIL: ${failed.map((r) => r.id).join(', ')}`);
  process.exit(1);
}
console.log('[EOS BENCH] PASS');
