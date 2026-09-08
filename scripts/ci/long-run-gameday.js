#!/usr/bin/env node
/**
 * ROI5 — CLI entry for long-run / GameDay harness.
 *
 * Default: short CI run (25 iterations).
 * Operator soak: --soak (50) or --iterations N (opt-in, keep CI fast).
 *
 * Does NOT start ROI6. PRODUCTION_READY remains NO.
 *
 * Usage:
 *   node scripts/ci/long-run-gameday.js
 *   node scripts/ci/long-run-gameday.js --iterations 40 --json
 *   node scripts/ci/long-run-gameday.js --soak --keep-sandbox
 */

import {
  LongRunGameDayHarness,
  parseLongRunArgs,
  DEFAULT_CI_ITERATIONS
} from '../../src/core/adversarial/long-run-gameday-harness.js';

const args = parseLongRunArgs(process.argv.slice(2));
const harness = new LongRunGameDayHarness({
  keepSandbox: args.keepSandbox
});

let summary;
try {
  summary = harness.run({
    iterations: args.iterations || DEFAULT_CI_ITERATIONS,
    writeReport: true
  });
} finally {
  if (!args.keepSandbox) {
    harness.cleanup();
  }
}

if (args.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('EOS ROI5 LONG-RUN GAMEDAY');
  console.log(
    JSON.stringify(
      {
        PRODUCTION_READY: summary.PRODUCTION_READY,
        iterations_executed: summary.iterations_executed,
        passed: summary.passed,
        failed: summary.failed,
        all_passed: summary.all_passed,
        fundacion_untouched: summary.fundacion_untouched,
        fundacion_delta: summary.fundacion_delta,
        custody_final: summary.custody_final,
        report_path: summary.report_path || null,
        sandbox_root: args.keepSandbox ? summary.sandbox_root : '(cleaned)'
      },
      null,
      2
    )
  );
}

if (!summary.all_passed) {
  process.exitCode = 1;
}
