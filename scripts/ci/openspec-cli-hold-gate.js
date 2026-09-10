#!/usr/bin/env node
/**
 * U6 OpenSpec CLI HOLD gate (NON-MUTATING).
 *
 * Detects host OpenSpec CLI presence. Never npm installs.
 * Modes: CLI_ABSENT_HOLD (default when absent) | CLI_PRESENT_SMOKE (only if proven).
 * Exit 0 on PASS; exit 1 on fail-closed. PRODUCTION_READY: NO
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditOpenspecCliHoldLock,
  probeOpenspecCli,
  OPENSPEC_CLI_HOLD_EVIDENCE_DOC
} from '../lib/openspec-cli-hold-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export function runOpenspecCliHoldGate(options = {}) {
  const report = {
    schema: 'eos.openspec_cli_hold_gate.v1',
    ok: false,
    mode: 'UNKNOWN',
    PRODUCTION_READY: 'NO',
    mutating: false,
    cliPresent: false,
    checks: [],
    failures: [],
    probe: null
  };

  let liveProbe = options.liveProbe;
  if (options.skipLiveProbe === true) {
    liveProbe = options.liveProbe || { present: false, probed: false };
  } else if (liveProbe === undefined) {
    liveProbe = probeOpenspecCli(rootDir);
    report.probe = liveProbe;
  } else {
    report.probe = liveProbe;
  }

  const audit = auditOpenspecCliHoldLock(rootDir, {
    skipLiveProbe: options.skipLiveProbe === true,
    liveProbe,
    skipPathChecks: options.skipPathChecks === true
  });

  report.checks.push(...audit.checks);
  report.failures.push(
    ...audit.failures.map((f) => f.message || JSON.stringify(f))
  );
  report.mode = audit.mode;
  report.ok = audit.ok;
  report.cliPresent = audit.cliPresent === true;

  report.checks.push({
    path: 'NON-MUTATING: gate never npm installs OpenSpec CLI',
    status: 'VERIFIED',
    type: 'openspec-cli-hold-gate'
  });

  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS U6 — OPENSPEC CLI HOLD GATE (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'cliPresent: ' + report.cliPresent,
    'evidence: ' + OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
    ''
  ];
  if (report.probe) {
    lines.push(
      'probe.present: ' + report.probe.present,
      'probe.helperExit: ' + String(report.probe.helperExit),
      ''
    );
  }
  for (const c of report.checks) {
    lines.push('[VERIFIED] ' + (c.path || c));
  }
  if (report.failures.length) {
    lines.push('');
    lines.push('FAILURES:');
    for (const f of report.failures) lines.push(' - ' + f);
  }
  lines.push('');
  lines.push(
    'NON-CLAIMS: HOLD != CLI installed; helper exit 2 != L0 failure; do NOT invent PRESENT'
  );
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = { skipLiveProbe: false, help: false };
  for (const a of argv) {
    if (a === '--skip-live-probe') out.skipLiveProbe = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Usage: node scripts/ci/openspec-cli-hold-gate.js [--skip-live-probe]\n' +
        'NON-MUTATING. Never installs CLI. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runOpenspecCliHoldGate({
    skipLiveProbe: args.skipLiveProbe
  });
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
