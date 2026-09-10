/**
 * @module openspec-cli-hold-lock
 * U6 — OpenSpec CLI optional HOLD lock (Ladder 9 K6).
 *
 * Fail-closed: detect host OpenSpec CLI presence. If ABSENT → mode CLI_ABSENT_HOLD
 * with ritual/checklist + evidence. If PRESENT → CLI_PRESENT_SMOKE only when probe
 * proves it. NEVER invents install success. NEVER npm installs. Not part of src/core.
 *
 * NON-CLAIM: HOLD != CLI installed; helper exit 2 != L0 clone failure;
 * smoke != PRODUCTION_READY. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const OPENSPEC_CLI_HOLD_EVIDENCE_DOC =
  'docs/releases/EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md';

export const OPENSPEC_CLI_HOLD_RITUAL_DOC =
  'docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md';

export const OPENSPEC_CLI_HOLD_EVIDENCE_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (U6 / K6 DoD)',
  '## Status snapshot (honest probe)',
  '## No-claims',
  'CLI_ABSENT',
  'HOLD',
  'optional',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'CloudAgent',
  'do NOT invent'
]);

export const OPENSPEC_CLI_HOLD_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 CLI_ABSENT_HOLD',
  '## 2.2 CLI_PRESENT_SMOKE',
  '## 3. Operator checklist',
  '## 5. Non-claims',
  'FORBIDDEN',
  'NON-MUTATING',
  'optional this quarter',
  'CloudAgent out of'
]);

export const OPENSPEC_CLI_HOLD_REQUIRED_PATHS = Object.freeze([
  OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
  OPENSPEC_CLI_HOLD_RITUAL_DOC,
  'scripts/lib/openspec-cli-hold-lock.js',
  'scripts/ci/openspec-cli-hold-gate.js',
  'tests/eos-u6-openspec-cli-hold.test.js',
  'scripts/openspec-cli.js',
  'docs/manuals/OPENSPEC_RUNTIME.md',
  'openspec/changes/eos-u6-openspec-cli-hold/proposal.md'
]);

export const OPENSPEC_CLI_HOLD_NON_CLAIMS = Object.freeze([
  'HOLD / checklist != OpenSpec CLI installed',
  'helper exit 2 (CLI absent) != L0 clone failure',
  'CLI_PRESENT_SMOKE only when PATH probe proves binary',
  'FORBIDDEN invent install success when ABSENT',
  'smoke != PRODUCTION_READY flip',
  'PRODUCTION_READY remains NO',
  'OpenSpec light change folder ok even if CLI absent'
]);

/**
 * Probe host OpenSpec CLI (PATH + repo helper). Never installs.
 * @param {string} rootDir
 * @param {{ present?: boolean, probed?: boolean, helperExit?: number, versionText?: string, raw?: string }|null} [override]
 */
export function probeOpenspecCli(rootDir, override = null) {
  if (override && typeof override === 'object') {
    return {
      present: override.present === true,
      probed: override.probed !== false,
      helperExit: override.helperExit,
      versionText: override.versionText || '',
      raw: override.raw || ''
    };
  }

  const helper = path.join(rootDir, 'scripts/openspec-cli.js');
  const result = spawnSync(process.execPath, [helper, '--version'], {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env
  });

  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const raw = (stdout + stderr).trim();
  const helperExit = typeof result.status === 'number' ? result.status : 1;
  const present = helperExit === 0;

  return {
    present,
    probed: true,
    helperExit,
    versionText: present ? stdout.trim() || raw : '',
    raw
  };
}

function inferModeFromEvidence(text) {
  if (text.includes('CLI_ABSENT_HOLD')) return 'CLI_ABSENT_HOLD';
  if (text.includes('CLI_PRESENT_SMOKE')) return 'CLI_PRESENT_SMOKE';
  if (text.includes('CLI_ABSENT') && text.includes('HOLD')) return 'CLI_ABSENT_HOLD';
  if (text.includes('CLI_PRESENT') && /SMOKE|smoke/.test(text)) return 'CLI_PRESENT_SMOKE';
  return 'UNKNOWN';
}


/**
 * @param {string} rootDir
 * @param {object} [options]
 */
export function auditOpenspecCliHoldLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';

  if (options.docMissing === true) {
    failures.push({
      path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
      message: 'U6 OpenSpec CLI HOLD evidence doc missing (fail-closed)',
      type: 'openspec-cli-hold-lock'
    });
    return { ok: false, checks, failures, mode, cliPresent: false };
  }

  let evidenceText = options.evidenceDocText;
  if (evidenceText === undefined) {
    const full = path.join(rootDir, OPENSPEC_CLI_HOLD_EVIDENCE_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
        message: 'U6 OpenSpec CLI HOLD evidence doc missing (fail-closed)',
        type: 'openspec-cli-hold-lock'
      });
      return { ok: false, checks, failures, mode, cliPresent: false };
    }
    evidenceText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC + ' exists',
    status: 'VERIFIED',
    type: 'openspec-cli-hold-lock'
  });

  let ritualText = options.ritualDocText;
  if (ritualText === undefined) {
    const full = path.join(rootDir, OPENSPEC_CLI_HOLD_RITUAL_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: OPENSPEC_CLI_HOLD_RITUAL_DOC,
        message: 'U6 OpenSpec CLI HOLD ritual missing (fail-closed)',
        type: 'openspec-cli-hold-lock'
      });
      return { ok: false, checks, failures, mode, cliPresent: false };
    }
    ritualText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: OPENSPEC_CLI_HOLD_RITUAL_DOC + ' exists',
    status: 'VERIFIED',
    type: 'openspec-cli-hold-lock'
  });

  for (const needle of OPENSPEC_CLI_HOLD_EVIDENCE_REQUIRED_SECTIONS) {
    if (!evidenceText.includes(needle)) {
      failures.push({
        path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
        message: 'U6 evidence required section/needle missing: ' + needle,
        type: 'openspec-cli-hold-lock'
      });
    }
  }
  if (failures.filter((f) => f.path === OPENSPEC_CLI_HOLD_EVIDENCE_DOC && /required section/.test(f.message)).length === 0) {
    checks.push({
      path: 'U6 evidence required sections present',
      status: 'VERIFIED',
      type: 'openspec-cli-hold-lock'
    });
  }

  for (const needle of OPENSPEC_CLI_HOLD_RITUAL_REQUIRED_SECTIONS) {
    if (!ritualText.includes(needle)) {
      failures.push({
        path: OPENSPEC_CLI_HOLD_RITUAL_DOC,
        message: 'U6 ritual required section/needle missing: ' + needle,
        type: 'openspec-cli-hold-lock'
      });
    }
  }
  if (failures.filter((f) => f.path === OPENSPEC_CLI_HOLD_RITUAL_DOC && /required section/.test(f.message)).length === 0) {
    checks.push({
      path: 'U6 ritual required sections present',
      status: 'VERIFIED',
      type: 'openspec-cli-hold-lock'
    });
  }

  const productionReadyNo =
    evidenceText.includes('PRODUCTION_READY:** NO') ||
    evidenceText.includes('PRODUCTION_READY: NO') ||
    evidenceText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
      message: 'U6 evidence must keep PRODUCTION_READY: NO',
      type: 'openspec-cli-hold-lock'
    });
  } else {
    checks.push({
      path: 'U6 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'openspec-cli-hold-lock'
    });
  }

  mode = inferModeFromEvidence(evidenceText);
  if (mode === 'UNKNOWN') {
    failures.push({
      path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
      message: 'U6 evidence must declare CLI_ABSENT_HOLD or CLI_PRESENT_SMOKE',
      type: 'openspec-cli-hold-lock'
    });
  } else {
    checks.push({
      path: 'U6 mode ' + mode,
      status: 'VERIFIED',
      type: 'openspec-cli-hold-lock'
    });
  }

  const inventBan =
    evidenceText.includes('do NOT invent') ||
    evidenceText.includes('Do NOT invent') ||
    ritualText.includes('FORBIDDEN');
  if (!inventBan) {
    failures.push({
      path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
      message: 'U6 must forbid inventing OpenSpec install success',
      type: 'openspec-cli-hold-lock'
    });
  } else {
    checks.push({
      path: 'U6 NON-CLAIM do NOT invent install success',
      status: 'VERIFIED',
      type: 'openspec-cli-hold-lock'
    });
  }

  let probe = { present: false, probed: false };
  if (options.skipLiveProbe === true) {
    probe = options.liveProbe || { present: false, probed: false };
  } else if (options.liveProbe) {
    probe = options.liveProbe;
  } else {
    probe = probeOpenspecCli(rootDir);
  }

  const cliPresent = probe.present === true;

  // Fail-closed honesty: pretend PRESENT when probe ABSENT
  if (probe.probed !== false) {
    if (mode === 'CLI_PRESENT_SMOKE' && !cliPresent) {
      failures.push({
        path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
        message:
          'U6 fail-closed: evidence claims CLI_PRESENT_SMOKE but probe shows CLI ABSENT — do NOT invent install success',
        type: 'openspec-cli-hold-lock'
      });
    } else if (mode === 'CLI_ABSENT_HOLD' && cliPresent) {
      // Soft: allow HOLD docs while CLI happens to be present only if evidence still says ABSENT — fail
      failures.push({
        path: OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
        message:
          'U6 honesty: probe shows CLI PRESENT but evidence mode is CLI_ABSENT_HOLD — refresh evidence to CLI_PRESENT_SMOKE',
        type: 'openspec-cli-hold-lock'
      });
    } else if (mode === 'CLI_ABSENT_HOLD' && !cliPresent) {
      checks.push({
        path: 'U6 probe corroborates CLI_ABSENT / HOLD',
        status: 'VERIFIED',
        type: 'openspec-cli-hold-lock'
      });
    } else if (mode === 'CLI_PRESENT_SMOKE' && cliPresent) {
      checks.push({
        path: 'U6 probe corroborates CLI_PRESENT_SMOKE',
        status: 'VERIFIED',
        type: 'openspec-cli-hold-lock'
      });
    }
  }

  if (!options.skipPathChecks) {
    for (const rel of OPENSPEC_CLI_HOLD_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required U6 OpenSpec CLI HOLD path missing',
          type: 'openspec-cli-hold-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    mode,
    cliPresent
  };
}
