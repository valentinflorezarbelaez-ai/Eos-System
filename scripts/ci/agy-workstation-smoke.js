#!/usr/bin/env node
/**
 * T7 AGY workstation smoke gate (NON-MUTATING).
 *
 * Observational: audits checklist/evidence honesty; optionally probes
 * `agy-daemon.cmd status` / local agy without Admin elevation.
 * NEVER runs install/uninstall/restart.
 *
 * Exit 0 on PASS; exit 1 on fail-closed. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  auditAgyWorkstationLock,
  AGY_WORKSTATION_EVIDENCE_DOC
} from '../lib/agy-workstation-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Probe daemon status without Admin. Returns structured snapshot.
 * Safe on non-Windows: returns unavailable (does not fail by itself).
 */
export function probeAgyWorkstation(root = rootDir) {
  const result = {
    platform: process.platform,
    agyPresent: false,
    agyPath: null,
    daemonStatusText: '',
    daemonInstalled: null,
    probed: false
  };

  if (process.platform !== 'win32') {
    result.daemonStatusText = 'probe skipped (non-Windows)';
    return result;
  }

  result.probed = true;
  const localAgy = path.join(
    process.env.LOCALAPPDATA || '',
    'agy',
    'bin',
    'agy.exe'
  );
  if (localAgy && fs.existsSync(localAgy)) {
    result.agyPresent = true;
    result.agyPath = localAgy;
  }

  const daemonCmd = path.join(root, 'agy-daemon.cmd');
  if (fs.existsSync(daemonCmd)) {
    const proc = spawnSync('cmd.exe', ['/c', daemonCmd, 'status'], {
      encoding: 'utf8',
      timeout: 20000,
      windowsHide: true
    });
    const out = String(proc.stdout || '') + String(proc.stderr || '');
    result.daemonStatusText = out.trim();
    if (/Not installed/i.test(out)) {
      result.daemonInstalled = false;
    } else if (/installed/i.test(out)) {
      result.daemonInstalled = true;
    }
  } else {
    result.daemonStatusText = 'agy-daemon.cmd missing from repo root';
    result.daemonInstalled = false;
  }

  return result;
}

export function runAgyWorkstationSmoke(options = {}) {
  const report = {
    schema: 'eos.agy_workstation_smoke.v1',
    ok: false,
    mode: 'UNKNOWN',
    PRODUCTION_READY: 'NO',
    mutating: false,
    adminRequired: false,
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

  const audit = auditAgyWorkstationLock(rootDir, {
    skipLiveProbe: options.skipLiveProbe === true || !liveProbe,
    liveProbe: liveProbe || undefined,
    skipPathChecks: options.skipPathChecks === true
  });

  // When we have a real probe on Windows, always reconcile honesty
  if (liveProbe && liveProbe.probed) {
    const reAudit = auditAgyWorkstationLock(rootDir, {
      skipLiveProbe: false,
      liveProbe,
      skipPathChecks: options.skipPathChecks === true
    });
    report.checks.push(...reAudit.checks);
    report.failures.push(
      ...reAudit.failures.map((f) => f.message || JSON.stringify(f))
    );
    report.mode = reAudit.mode;
    report.ok = reAudit.ok;
  } else {
    report.checks.push(...audit.checks);
    report.failures.push(
      ...audit.failures.map((f) => f.message || JSON.stringify(f))
    );
    report.mode = audit.mode;
    report.ok = audit.ok;
  }

  report.checks.push({
    path: 'NON-MUTATING: smoke never runs Admin install',
    status: 'VERIFIED',
    type: 'agy-workstation-smoke'
  });

  return report;
}

function formatReport(report) {
  const lines = [
    '====================================================',
    '   EOS T7 — AGY WORKSTATION SMOKE (NON-MUTATING)',
    '====================================================',
    'mode: ' + report.mode,
    'ok: ' + report.ok,
    'PRODUCTION_READY=' + report.PRODUCTION_READY,
    'mutating: false',
    'adminRequired: false',
    'evidence: ' + AGY_WORKSTATION_EVIDENCE_DOC,
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
    'NON-CLAIMS: checklist != daemon installed; smoke != Admin install; no pretend INSTALLED'
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
      'Usage: node scripts/ci/agy-workstation-smoke.js [--skip-live-probe]\n' +
        'NON-MUTATING. No Admin. PRODUCTION_READY=NO.'
    );
    process.exit(0);
  }
  const report = runAgyWorkstationSmoke({
    skipLiveProbe: args.skipLiveProbe
  });
  console.log(formatReport(report));
  process.exit(report.ok ? 0 : 1);
}
