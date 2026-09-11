#!/usr/bin/env node
/**
 * U7 SpecBoot DEFER stubs gate (NON-MUTATING).
 *
 * Verifies IGNORE disposition for SpecBoot checklist docs (S2 TPC
 * must-not-invent). Index pointer lives under docs/harness/.
 * Never invents Gentleman standards. Never stages ai-specs.
 * Exit 0 on PASS; exit 1 on fail-closed. PRODUCTION_READY: NO
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditSpecbootDeferStubsLock,
  SPECBOOT_DEFER_STUBS_EVIDENCE_DOC
} from '../lib/specboot-defer-stubs-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export function runSpecbootDeferStubsGate(options = {}) {
  const report = {
    schema: 'eos.specboot_defer_stubs_gate.v1',
    ok: false,
    mode: 'UNKNOWN',
    PRODUCTION_READY: 'NO',
    mutating: false,
    checks: [],
    failures: []
  };

  const audit = auditSpecbootDeferStubsLock(rootDir, {
    skipPathChecks: options.skipPathChecks === true,
    skipStubChecks: options.skipStubChecks === true,
    evidenceDocText: options.evidenceDocText,
    ritualDocText: options.ritualDocText,
    indexDocText: options.indexDocText,
    stubTexts: options.stubTexts,
    docMissing: options.docMissing === true
  });

  report.checks.push(...audit.checks);
  report.failures.push(
    ...audit.failures.map((f) => f.message || JSON.stringify(f))
  );
  report.mode = audit.mode;
  report.ok = audit.ok;

  report.checks.push({
    path: 'NON-MUTATING: gate never invents Gentleman standards or stages ai-specs',
    status: 'VERIFIED',
    type: 'specboot-defer-stubs-gate'
  });

  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS U7 — SPECBOOT DEFER STUBS GATE (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'evidence: ' + SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
    ''
  ];
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
    'NON-CLAIMS: harness INDEX != Gentleman complete; no Gentleman invent; IGNORE != invent forbidden paths; ai-specs DEFER'
  );
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = { help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
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
      'Usage: node scripts/ci/specboot-defer-stubs-gate.js\n' +
        'NON-MUTATING. IGNORE. No Gentleman invent. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runSpecbootDeferStubsGate();
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
