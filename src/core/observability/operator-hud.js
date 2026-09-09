/**
 * @module OperatorHud
 * @description Single-truth operator status panel. Live git + this-run verify-eos
 * are VERIFIED; mission/freeze/matrix flags are OBSERVED with source paths.
 * Does not invent PRODUCTION_READY or echo unattributed historical slogans.
 * L0: Node built-ins only. Not a dashboard framework.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

export const HUD_SCHEMA = 'eos.operator-hud.v1';
export const HUD_EPISTEMIC = Object.freeze({
  VERIFIED: 'VERIFIED',
  OBSERVED: 'OBSERVED',
  NOT_VERIFIED: 'NOT VERIFIED',
  DATED_FILE_CLAIM: 'DATED_FILE_CLAIM'
});

export const VERIFY_SURFACE_TYPES = Object.freeze([
  'organic-gate',
  'tdd-receipts',
  'rdd-stance',
  'l0-purity',
  // Post-fusion verify surfaces (exact type strings from verify-eos.js / fusion-cp-lock.js)
  'evidence-custody',
  'engram-contract',
  'fusion-cp-lock',
  'fusion-cp-write-barrier',
  'fusion-cp-mission-loop',
  'fusion-cp-mcp-ssot',
  'fusion-cp-gameday'
]);

const CANONICAL_E2E_REL = 'docs/evidence/canonical_e2e_openspec_tdd_2026';
const MISSION_REL = 'EOS-MISSION-CONTROL/CURRENT_MISSION.json';
const STATE_REL = 'EOS-MISSION-CONTROL/CURRENT_STATE.json';
const INCIDENTS_REL = 'EOS-MISSION-CONTROL/INCIDENTS.json';
const BUDGET_REL = 'EOS-MISSION-CONTROL/BUDGET.json';
const FREEZE_REL = 'docs/releases/EOS_FREEZE_GATE_STATUS.md';
const MATRIX_REL = 'docs/releases/RELEASE_CAPABILITY_MATRIX.md';
const DEFAULT_SNAPSHOT_REL = '.eos/operator-hud.json';

const STALE_SLOGAN_RULES = Object.freeze([
  { id: 'stale_test_total', re: /\b1440\s+tests\b/i },
  { id: 'stale_check_total', re: /\b482\s+checks\b/i }
]);

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readJson(filePath) {
  const raw = readUtf8(filePath);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function relExists(baseDir, rel) {
  return fs.existsSync(path.join(baseDir, rel));
}

/**
 * Refuse unattributed historical slogans. A matching line is allowed only when
 * it also contains `source:`.
 */
export function assertHudTextHonest(text) {
  const lines = String(text || '').split(/\r?\n/);
  for (const rule of STALE_SLOGAN_RULES) {
    for (const line of lines) {
      if (!rule.re.test(line)) continue;
      if (!/source\s*:/i.test(line)) {
        const err = new Error(`HUD refused unattributed stale claim: ${rule.id}`);
        err.code = 'STALE_CLAIM_REFUSED';
        throw err;
      }
    }
  }
  return true;
}

export function summarizeVerifySurfaces(report = {}) {
  const checks = report.checks || [];
  const failures = report.failures || [];
  const surfaces = {};
  for (const type of VERIFY_SURFACE_TYPES) {
    const passed = checks.filter((row) => row.type === type).length;
    const failed = failures.filter((row) => row.type === type).length;
    if (passed === 0 && failed === 0) {
      surfaces[type] = {
        status: HUD_EPISTEMIC.NOT_VERIFIED,
        passed: 0,
        failed: 0,
        epistemic: HUD_EPISTEMIC.NOT_VERIFIED
      };
    } else {
      surfaces[type] = {
        status: failed > 0 ? 'FAIL' : HUD_EPISTEMIC.VERIFIED,
        passed,
        failed,
        epistemic: HUD_EPISTEMIC.VERIFIED
      };
    }
  }
  return surfaces;
}

export function summarizeVerifyReport(report, meta = {}) {
  if (!report || typeof report !== 'object') {
    return {
      ran: false,
      command: meta.command || 'node scripts/verify-eos.js --strict --json',
      exit_code: meta.exit_code ?? null,
      status: null,
      passed: null,
      failed: null,
      epistemic: HUD_EPISTEMIC.NOT_VERIFIED,
      timestamp: null,
      surfaces: summarizeVerifySurfaces({})
    };
  }
  const checks = Array.isArray(report.checks) ? report.checks : [];
  const failures = Array.isArray(report.failures) ? report.failures : [];
  return {
    ran: true,
    command: meta.command || 'node scripts/verify-eos.js --strict --json',
    exit_code: meta.exit_code ?? (report.status === 'PASS' ? 0 : 1),
    status: report.status || (failures.length ? 'FAIL' : 'PASS'),
    passed: checks.length,
    failed: failures.length,
    epistemic: HUD_EPISTEMIC.VERIFIED,
    timestamp: report.timestamp || null,
    surfaces: summarizeVerifySurfaces(report)
  };
}


/**
 * OBSERVED freeze-file main_tip vs live git HEAD.
 * Informational / fail-closed mismatch only — never invents PRODUCTION_READY.
 */
export function observeFreezeTipVsHead(baseDir, options = {}) {
  const source = FREEZE_REL;
  const text = readUtf8(path.join(baseDir, source));
  const freezeMatch = text ? text.match(/^main_tip:\s*([0-9a-f]{7,40})\b/mi) : null;
  const freeze_main_tip = freezeMatch ? freezeMatch[1] : null;

  let live_head = options.liveHead || null;
  let head_error = null;
  if (!live_head) {
    const run = options.execGit || ((args) =>
      execFileSync('git', args, { cwd: baseDir, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
    );
    try {
      live_head = run(['rev-parse', 'HEAD']);
    } catch (err) {
      head_error = err.message;
      live_head = null;
    }
  }

  if (!freeze_main_tip || !live_head) {
    return {
      epistemic: HUD_EPISTEMIC.NOT_VERIFIED,
      source,
      freeze_main_tip,
      live_head,
      match: false,
      note: 'Informational only; missing freeze tip or live HEAD — no PRODUCTION_READY claim',
      error: head_error || (!freeze_main_tip ? 'main_tip not parsed from freeze gate' : null)
    };
  }

  const tipShort = freeze_main_tip.slice(0, 7);
  const headShort = live_head.slice(0, 7);
  const match =
    live_head === freeze_main_tip ||
    live_head.startsWith(freeze_main_tip) ||
    freeze_main_tip.startsWith(headShort) ||
    live_head.startsWith(tipShort);

  return {
    epistemic: HUD_EPISTEMIC.OBSERVED,
    source,
    freeze_main_tip,
    live_head,
    match,
    note: match
      ? 'OBSERVED freeze tip matches live HEAD (informational; PRODUCTION_READY unchanged)'
      : 'OBSERVED freeze tip diverges from live HEAD (informational / fail-closed; no PRODUCTION_READY claim)'
  };
}

function measureGit(baseDir, gitIdentity, execGit) {
  if (gitIdentity && gitIdentity.head_short) {
    return {
      head_short: gitIdentity.head_short,
      head_full: gitIdentity.head_full || null,
      branch: gitIdentity.branch || null,
      epistemic: HUD_EPISTEMIC.VERIFIED,
      source: gitIdentity.source || 'git rev-parse'
    };
  }
  const run = execGit || ((args) =>
    execFileSync('git', args, { cwd: baseDir, encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  );
  try {
    const head_full = run(['rev-parse', 'HEAD']);
    return {
      head_short: head_full.slice(0, 7),
      head_full,
      branch: run(['rev-parse', '--abbrev-ref', 'HEAD']),
      epistemic: HUD_EPISTEMIC.VERIFIED,
      source: 'git rev-parse'
    };
  } catch (err) {
    return {
      head_short: null,
      branch: null,
      epistemic: HUD_EPISTEMIC.NOT_VERIFIED,
      source: 'git rev-parse',
      error: err.message
    };
  }
}

function defaultRunVerify(baseDir) {
  const command = 'node scripts/verify-eos.js --strict --json';
  const result = spawnSync(process.execPath, ['scripts/verify-eos.js', '--strict', '--json'], {
    cwd: baseDir,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 20 * 1024 * 1024
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout || '');
  } catch {
    report = null;
  }
  return { report, exit_code: result.status, command, stderr: result.stderr };
}

function observeMission(baseDir) {
  const source = MISSION_REL;
  const data = readJson(path.join(baseDir, source));
  if (!data) {
    return {
      epistemic: HUD_EPISTEMIC.NOT_VERIFIED,
      source,
      id: null,
      status: null,
      updated_at: null,
      raw: null
    };
  }
  return {
    epistemic: HUD_EPISTEMIC.OBSERVED,
    source,
    id: data.mission_id || null,
    status: data.status || null,
    updated_at: data.updated_at || null,
    raw: data
  };
}

function addObservation(bucket, flag, value, source) {
  if (value == null || value === '') return;
  bucket.push({
    flag,
    value: String(value),
    epistemic: HUD_EPISTEMIC.OBSERVED,
    source
  });
}

function observeFlagsFromText(text, source, flags) {
  const rows = [];
  if (!text) return rows;
  for (const line of text.split(/\r?\n/)) {
    for (const flag of flags) {
      if (!line.includes(flag)) continue;
      const keyed = line.match(new RegExp(`${flag}\\s*[:=]\\s*"?([^\\s",]+)"?`));
      if (keyed) {
        addObservation(rows, flag, keyed[1], source);
        continue;
      }
      const dictamen = line.match(/dictamen\s*[:=]\s*"?([^\s"]+)/i);
      if (dictamen) addObservation(rows, flag, dictamen[1], source);
    }
  }
  return rows;
}

function observeReadiness(baseDir, mission) {
  const flags = ['PRODUCTION_READY', 'COMPLETE_FOR_LOCAL_GOVERNED_USE'];
  const byFlag = {
    PRODUCTION_READY: { observations: [] },
    COMPLETE_FOR_LOCAL_GOVERNED_USE: { observations: [] }
  };

  if (mission.raw?.dictamen) {
    for (const flag of flags) {
      addObservation(byFlag[flag].observations, flag, mission.raw.dictamen[flag], mission.source);
    }
  }

  for (const rel of [FREEZE_REL, MATRIX_REL]) {
    const text = readUtf8(path.join(baseDir, rel));
    for (const row of observeFlagsFromText(text, rel, flags)) {
      byFlag[row.flag].observations.push(row);
    }
  }

  return byFlag;
}

function observeFileClaims(baseDir, mission) {
  const claims = [];
  const state = readJson(path.join(baseDir, STATE_REL));
  if (state) {
    if (state.test_health) {
      claims.push({
        metric: 'test_health',
        value: state.test_health,
        epistemic: HUD_EPISTEMIC.DATED_FILE_CLAIM,
        source: STATE_REL,
        dated: state.updated_at || null,
        note: 'Not live. Prefer verify.passed from this run.'
      });
    }
    if (state.strict_checks) {
      claims.push({
        metric: 'strict_checks',
        value: state.strict_checks,
        epistemic: HUD_EPISTEMIC.DATED_FILE_CLAIM,
        source: STATE_REL,
        dated: state.updated_at || null,
        note: 'Not live. Prefer verify.passed from this run.'
      });
    }
  }
  const evid = mission.raw?.evidence;
  if (evid?.tests_full) {
    claims.push({
      metric: 'tests_full',
      value: evid.tests_full,
      epistemic: HUD_EPISTEMIC.DATED_FILE_CLAIM,
      source: MISSION_REL,
      dated: mission.updated_at || null,
      note: 'Mission-control historical claim, not this-run verify.'
    });
  }
  if (evid?.strict_verifier) {
    claims.push({
      metric: 'strict_verifier',
      value: evid.strict_verifier,
      epistemic: HUD_EPISTEMIC.DATED_FILE_CLAIM,
      source: MISSION_REL,
      dated: mission.updated_at || null,
      note: 'Mission-control historical claim, not this-run verify.'
    });
  }
  return claims;
}

function observeErrorBudget(baseDir, mission, verify) {
  const incidents = readJson(path.join(baseDir, INCIDENTS_REL)) || {};
  const budget = readJson(path.join(baseDir, BUDGET_REL)) || {};
  const openIncidents = Number(incidents.open_incidents_count || 0);
  const missionBlocked = Number(mission.raw?.progress_summary?.blocked || 0);
  const verifyFailures = Number(verify.failed || 0);
  const blockers = [];
  if (missionBlocked > 0) {
    blockers.push({
      kind: 'mission',
      detail: `progress_summary.blocked=${missionBlocked}`,
      source: MISSION_REL
    });
  }
  if (verifyFailures > 0) {
    blockers.push({
      kind: 'verify',
      detail: `verify-eos failures=${verifyFailures}`,
      source: verify.command
    });
  }
  if (openIncidents > 0) {
    blockers.push({
      kind: 'incident',
      detail: `open_incidents=${openIncidents}`,
      source: INCIDENTS_REL
    });
  }
  return {
    epistemic: HUD_EPISTEMIC.OBSERVED,
    open_incidents: openIncidents,
    mission_blocked: missionBlocked,
    verify_failures: verifyFailures,
    budget_status: budget.budget_status || null,
    sources: [INCIDENTS_REL, BUDGET_REL, MISSION_REL],
    blockers
  };
}

function numericEvdId(name) {
  const match = /^EVD-(\d+)\.json$/i.exec(name);
  return match ? Number(match[1]) : null;
}

function observeLastEvd(baseDir) {
  const dir = path.join(baseDir, 'docs/evidence');
  if (!fs.existsSync(dir)) {
    return { id: null, path: null, status: null, epistemic: HUD_EPISTEMIC.NOT_VERIFIED, source: 'docs/evidence/' };
  }
  let best = null;
  for (const name of fs.readdirSync(dir)) {
    const num = numericEvdId(name);
    if (num == null) continue;
    if (!best || num > best.num) best = { num, name };
  }
  if (!best) {
    return { id: null, path: null, status: null, epistemic: HUD_EPISTEMIC.NOT_VERIFIED, source: 'docs/evidence/' };
  }
  const rel = `docs/evidence/${best.name}`;
  const parsed = readJson(path.join(baseDir, rel)) || {};
  return {
    id: parsed.id || `EVD-${String(best.num).padStart(4, '0')}`,
    path: rel,
    status: parsed.status || null,
    timestamp: parsed.timestamp || null,
    epistemic: HUD_EPISTEMIC.OBSERVED,
    source: 'docs/evidence/'
  };
}

function observeCanonicalE2e(baseDir) {
  const present = relExists(baseDir, CANONICAL_E2E_REL);
  const operatorReportRel = `${CANONICAL_E2E_REL}/OPERATOR_REPORT.md`;
  if (!present) {
    return {
      present: false,
      path: `${CANONICAL_E2E_REL}/`,
      operator_report: null,
      epistemic: HUD_EPISTEMIC.NOT_VERIFIED
    };
  }
  return {
    present: true,
    path: `${CANONICAL_E2E_REL}/`,
    operator_report: relExists(baseDir, operatorReportRel) ? operatorReportRel : null,
    epistemic: HUD_EPISTEMIC.OBSERVED
  };
}

export function collectOperatorHud(options = {}) {
  const baseDir = options.baseDir || process.cwd();
  const skipVerify = options.skipVerify === true;
  let verify;
  if (options.verifyReport) {
    verify = summarizeVerifyReport(options.verifyReport, {
      command: options.verifyCommand,
      exit_code: options.verifyExitCode
    });
  } else if (skipVerify) {
    verify = summarizeVerifyReport(null, { command: options.verifyCommand });
  } else {
    const runner = options.runVerify || defaultRunVerify;
    const ran = runner(baseDir);
    verify = summarizeVerifyReport(ran.report, {
      command: ran.command,
      exit_code: ran.exit_code
    });
    if (!ran.report) {
      verify.epistemic = HUD_EPISTEMIC.NOT_VERIFIED;
      verify.error = ran.stderr || 'verify JSON missing';
    }
  }

  const git = measureGit(baseDir, options.gitIdentity, options.execGit);
  const mission = observeMission(baseDir);
  const readiness = observeReadiness(baseDir, mission);
  const file_claims = observeFileClaims(baseDir, mission);
  const error_budget = observeErrorBudget(baseDir, mission, verify);
  const evidence = {
    last_evd: observeLastEvd(baseDir),
    canonical_e2e: observeCanonicalE2e(baseDir)
  };

  const freeze_tip = observeFreezeTipVsHead(baseDir, {
    liveHead: options.liveHead || git.head_full || git.head_short || null,
    execGit: options.execGit
  });

  return {
    schema: HUD_SCHEMA,
    generated_at: options.now || new Date().toISOString(),
    git,
    verify,
    freeze_tip,
    mission: {
      epistemic: mission.epistemic,
      source: mission.source,
      id: mission.id,
      status: mission.status,
      updated_at: mission.updated_at
    },
    readiness,
    error_budget,
    evidence,
    file_claims
  };
}

function fmtSurface(surfaces) {
  return VERIFY_SURFACE_TYPES.map((type) => {
    const row = surfaces[type];
    return `${type}=${row?.status || HUD_EPISTEMIC.NOT_VERIFIED}`;
  }).join('  ');
}

export function renderOperatorHud(snapshot) {
  const git = snapshot.git || {};
  const verify = snapshot.verify || {};
  const mission = snapshot.mission || {};
  const readiness = snapshot.readiness || {};
  const budget = snapshot.error_budget || {};
  const evidence = snapshot.evidence || {};
  const claims = snapshot.file_claims || [];

  const freezeTip = snapshot.freeze_tip || {};
  const freezeMatchLabel =
    freezeTip.match === true ? 'MATCH' : freezeTip.match === false ? 'DIVERGE' : 'UNKNOWN';

  const lines = [
    'EOS OPERATOR HUD — live truth panel',
    `generated: ${snapshot.generated_at || ''}`,
    '============================================================',
    `GIT          ${git.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}  HEAD=${git.head_short || 'UNKNOWN'}  branch=${git.branch || 'UNKNOWN'}`,
    `             source: ${git.source || 'git rev-parse'}`,
    `FREEZE_TIP  ${freezeTip.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}  match=${freezeMatchLabel}  freeze=${freezeTip.freeze_main_tip || 'UNKNOWN'}  live=${freezeTip.live_head || 'UNKNOWN'}`,
    `             source: ${freezeTip.source || FREEZE_REL}  note: informational only — no PRODUCTION_READY claim`,
    '------------------------------------------------------------',
    `VERIFY       ${verify.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}  this run: ${verify.command || 'verify-eos --strict --json'}`,
    `             passed=${verify.passed ?? 'n/a'}  failed=${verify.failed ?? 'n/a'}  status=${verify.status || 'n/a'}  exit=${verify.exit_code ?? 'n/a'}`,
    `             ${fmtSurface(verify.surfaces || {})}`,
    '------------------------------------------------------------',
    `MISSION      ${mission.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}  id=${mission.id || 'UNKNOWN'}`,
    `             status=${mission.status || 'UNKNOWN'}`,
    `             source: ${mission.source || MISSION_REL}`,
    '------------------------------------------------------------',
    'READINESS    OBSERVED from files — not invented'
  ];

  for (const flag of ['PRODUCTION_READY', 'COMPLETE_FOR_LOCAL_GOVERNED_USE']) {
    const rows = readiness[flag]?.observations || [];
    if (rows.length === 0) {
      lines.push(`             ${flag}=UNKNOWN  epistemic=${HUD_EPISTEMIC.NOT_VERIFIED}`);
      continue;
    }
    for (const row of rows) {
      lines.push(`             ${flag}=${row.value}  ${row.epistemic}`);
      lines.push(`               source: ${row.source}`);
    }
  }

  lines.push('------------------------------------------------------------');
  lines.push(`ERROR BUDGET ${budget.epistemic || HUD_EPISTEMIC.OBSERVED}`);
  lines.push(
    `             open_incidents=${budget.open_incidents ?? 'n/a'}  mission_blocked=${budget.mission_blocked ?? 'n/a'}  verify_failures=${budget.verify_failures ?? 'n/a'}`
  );
  lines.push(`             budget=${budget.budget_status || 'UNKNOWN'}`);
  if ((budget.blockers || []).length === 0) {
    lines.push('             blockers: none recorded');
  } else {
    for (const blocker of budget.blockers) {
      lines.push(`             blocker: ${blocker.detail}  source: ${blocker.source}`);
    }
  }

  const lastEvd = evidence.last_evd || {};
  const e2e = evidence.canonical_e2e || {};
  lines.push('------------------------------------------------------------');
  lines.push(
    `EVIDENCE     ${lastEvd.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}  last EVD=${lastEvd.id || 'NONE'}  ${lastEvd.path || ''}`
  );
  lines.push(
    `             canonical E2E: ${e2e.present ? e2e.path : 'absent'}  ${e2e.epistemic || HUD_EPISTEMIC.NOT_VERIFIED}`
  );
  if (e2e.operator_report) lines.push(`             operator_report: ${e2e.operator_report}`);

  lines.push('------------------------------------------------------------');
  lines.push('FILE CLAIMS  DATED_FILE_CLAIM (not live SSOT)');
  if (claims.length === 0) {
    lines.push('             none');
  } else {
    for (const claim of claims) {
      lines.push(`             ${claim.metric}=${claim.value}`);
      lines.push(`               source: ${claim.source}${claim.dated ? `  dated: ${claim.dated}` : ''}`);
    }
  }

  lines.push('============================================================');
  lines.push('Legend: VERIFIED=this-run measured | OBSERVED=file with source');
  lines.push('        NOT VERIFIED=missing | DATED_FILE_CLAIM=historical, not SSOT');
  lines.push('Honesty: unattributed historical test/check slogans are refused');

  const text = lines.join('\n');
  assertHudTextHonest(text);
  return text;
}

export function writeHudSnapshot(snapshot, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(snapshot, null, 2)}\n`);
  return dest;
}

export function getHudHelp() {
  return `eos-hud / eos-top — EOS operator live truth panel

USAGE:
  node bin/eos-hud.js [--json] [--no-verify] [--write] [--snapshot <path>]
  node bin/eos-top.js [same flags]
  npm run eos:hud -- [flags]

FLAGS:
  --json           Print the snapshot as JSON (stdout is JSON only)
  --no-verify      Skip spawning verify-eos; verify panel is NOT VERIFIED
  --write          Write snapshot to .eos/operator-hud.json
  --snapshot PATH  Write snapshot to PATH (implies --write)
  --help           This help

HOW TO READ STATUSES:
  VERIFIED          Measured in THIS run (git rev-parse, verify-eos --strict --json)
  OBSERVED          Copied from a named file; always includes source path
  NOT VERIFIED      Missing file, skipped verify, or unparseable output
  DATED_FILE_CLAIM  Historical number in a file (path + date). Not live SSOT.

The HUD does not invent PRODUCTION_READY and does not echo unattributed
historical test/check slogans. Prefer this-run verify.passed over file claims.
`;
}

export function runOperatorHudCli(argv = [], options = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { exitCode: 0, output: getHudHelp() };
  }

  const baseDir = options.baseDir || process.cwd();
  const asJson = argv.includes('--json');
  const skipVerify = argv.includes('--no-verify');
  const snapshotIdx = argv.indexOf('--snapshot');
  const snapshotPath = snapshotIdx !== -1 ? argv[snapshotIdx + 1] : null;
  const shouldWrite = argv.includes('--write') || Boolean(snapshotPath);

  const snapshot = collectOperatorHud({
    baseDir,
    skipVerify,
    gitIdentity: options.gitIdentity,
    verifyReport: options.verifyReport,
    runVerify: options.runVerify
  });

  if (shouldWrite) {
    const dest = snapshotPath
      ? path.resolve(baseDir, snapshotPath)
      : path.join(baseDir, DEFAULT_SNAPSHOT_REL);
    writeHudSnapshot(snapshot, dest);
    snapshot.snapshot_path = dest;
  }

  const output = asJson ? `${JSON.stringify(snapshot, null, 2)}\n` : `${renderOperatorHud(snapshot)}\n`;
  return { exitCode: 0, output, snapshot };
}
