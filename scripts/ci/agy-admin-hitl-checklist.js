#!/usr/bin/env node
/**
 * U5 AGY Admin HITL checklist gate (NON-MUTATING).
 *
 * Extends T7 smoke honesty. Documents adminRequired=true install path.
 * NEVER runs install/uninstall/restart. Fail-closed: status remains
 * DAEMON_ABSENT / Not installed unless PRESENT proven.
 *
 * Exit 0 on PASS; exit 1 on fail-closed. PRODUCTION_READY: NO
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditAgyAdminHitlLock,
  AGY_ADMIN_HITL_EVIDENCE_DOC,
  AGY_ADMIN_HITL_DOCUMENTED_PATH
} from '../lib/agy-admin-hitl-lock.js';
import { probeAgyWorkstation } from './agy-workstation-smoke.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

export function runAgyAdminHitlChecklist(options = {}) {
  const report = {
    schema: 'eos.agy_admin_hitl_checklist.v1',
    ok: false,
    mode: 'UNKNOWN',
    PRODUCTION_READY: 'NO',
    mutating: false,
    adminRequired: true,
    installExecuted: false,
    documentedPath: { ...AGY_ADMIN_HITL_DOCUMENTED_PATH },
    checks: [],
    failures: [],
    probe: null
  };

  let liveProbe = options.liveProbe;
  if (options.skipLiveProbe === true) {
    liveProbe = null;
  } else if (liveProbe === undefined) {
    liveProbe = probeAgyWorkstation(rootDir);
    report.probe = liveProbe;
  } else {
    report.probe = liveProbe;
  }

  const audit = auditAgyAdminHitlLock(rootDir, {
    skipLiveProbe: options.skipLiveProbe === true || !liveProbe,
    liveProbe: liveProbe || undefined,
    skipPathChecks: options.skipPathChecks === true,
    skipT7Baseline: options.skipT7Baseline === true
  });

  report.checks.push(...audit.checks);
  report.failures.push(
    ...audit.failures.map((f) => f.message || JSON.stringify(f))
  );
  report.mode = audit.mode;
  report.ok = audit.ok;
  report.adminRequired = true;
  report.installExecuted = false;

  report.checks.push({
    path: 'NON-MUTATING: gate never runs Admin install (adminRequired documented only)',
    status: 'VERIFIED',
    type: 'agy-admin-hitl-checklist'
  });

  // Extra honesty: if probed Not installed, force ABSENT expectation
  if (liveProbe && liveProbe.probed && liveProbe.daemonInstalled === false) {
    if (report.mode !== 'DAEMON_ABSENT') {
      report.ok = false;
      report.failures.push(
        'U5 fail-closed: live probe Not installed but mode is not DAEMON_ABSENT'
      );
    } else {
      report.checks.push({
        path: 'U5 probe corroborates DAEMON_ABSENT / Not installed',
        status: 'VERIFIED',
        type: 'agy-admin-hitl-checklist'
      });
    }
  }

  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS U5 — AGY ADMIN HITL CHECKLIST (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'adminRequired: true (documented path only)',
    'installExecuted: false',
    'documentedCommand: ' + report.documentedPath.command,
    'evidence: ' + AGY_ADMIN_HITL_EVIDENCE_DOC,
    ''
  ];
  if (report.probe) {
    lines.push(
      'probe.agyPresent: ' + report.probe.agyPresent,
      'probe.daemonInstalled: ' + String(report.probe.daemonInstalled),
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
    'NON-CLAIMS: checklist != daemon installed; adminRequired documented != executed; no pretend INSTALLED'
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
      'Usage: node scripts/ci/agy-admin-hitl-checklist.js [--skip-live-probe]\n' +
        'NON-MUTATING. adminRequired=true documented but NOT executed. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runAgyAdminHitlChecklist({
    skipLiveProbe: args.skipLiveProbe
  });
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
