#!/usr/bin/env node
/**
 * T4 — CLI entry for Mission OS / EVD observe pack (CI-safe).
 *
 * Default: N=1 aligned fixture; cleans sandbox.
 * Options:
 *   --json           print JSON report
 *   --keep-sandbox   retain temp sandbox
 *   --allow-diverge  do not fail when tip not ALIGNED (informational)
 *
 * PRODUCTION_READY remains NO. Not a production soak.
 *
 * Usage:
 *   node scripts/ci/mission-os-evd-observe-pack.js
 *   node scripts/ci/mission-os-evd-observe-pack.js --json
 */

import {
  runMissionOsEvdObservePack,
  formatObservePackReport
} from '../../src/core/observability/mission-os-evd-observe-pack.js';

function parseArgs(argv) {
  const out = { json: false, keepSandbox: false, requireAligned: true };
  for (const a of argv) {
    if (a === '--json') out.json = true;
    else if (a === '--keep-sandbox') out.keepSandbox = true;
    else if (a === '--allow-diverge') out.requireAligned = false;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const report = runMissionOsEvdObservePack({
  keepSandbox: args.keepSandbox,
  requireAligned: args.requireAligned
});

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatObservePackReport(report));
}

if (!report.ok) {
  process.exitCode = 1;
}