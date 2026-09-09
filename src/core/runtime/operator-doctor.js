/**
 * @module OperatorDoctor
 * @description Read-only health check for local governed EOS use.
 * Detects homedir MCP leaks and missing control-plane files. No network, no writes.
 * N3: post-fusion existence/light checks (verify/fusion-cp/custody/engram/evd-seal/pre-push).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RUNTIME_ENGINE_FILES } from './engine-surface.js';
import { evaluatePurposeFulfillment } from './purpose-fulfillment.js';

function exists(p) {
  return fs.existsSync(p);
}

function addCheck(checks, id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail: detail || '' });
}

/**
 * Post-fusion critical paths — fail-closed on missing (existence/light).
 * Relative to control-plane root.
 */
export const POST_FUSION_CRITICAL_PATHS = Object.freeze([
  { id: 'VERIFY', rel: 'scripts/verify-eos.js' },
  { id: 'FUSION_CP', rel: 'scripts/lib/fusion-cp-lock.js' },
  { id: 'CUSTODY', rel: 'src/core/sdd/evidence-custody.js' },
  { id: 'ENGRAM', rel: 'src/core/memory/engram-contract.js' },
  { id: 'EVD_SEAL', rel: 'src/core/sdd/evd-seal-path.js' },
  { id: 'PRE_PUSH', rel: 'scripts/pre-push-hook.js' }
]);

/**
 * Doctor wiring paths (bin + module). Checked when not skipped.
 */
export const DOCTOR_WIRING_PATHS = Object.freeze([
  { id: 'BIN_EOS_DOCTOR', rel: 'bin/eos-doctor.js' },
  { id: 'OPERATOR_DOCTOR_MODULE', rel: 'src/core/runtime/operator-doctor.js' }
]);

/**
 * @param {object} [options]
 * @param {string} options.root control-plane root
 * @param {string} [options.homedir]
 * @param {boolean} [options.skipMcpFile]
 * @param {boolean} [options.skipPurpose]
 * @param {boolean} [options.skipRuntimeEngines]
 * @param {boolean} [options.skipPostFusion] skip N3 fusion-era path checks
 * @param {boolean} [options.skipDoctorWiring] skip bin/module self-wiring checks
 * @param {string} [options.workspaceMcpPath]
 * @returns {{ ok: boolean, root: string, homedir_leak: boolean, checks: object[], failed: string[] }}
 */
export function runOperatorDoctor(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const homedir = path.resolve(options.homedir || os.homedir());
  const checks = [];

  addCheck(
    checks,
    'BIN_EOS',
    exists(path.join(root, 'bin', 'eos.js')),
    'bin/eos.js'
  );
  addCheck(
    checks,
    'MCP_SERVER',
    exists(path.join(root, 'src', 'mcp-server.js')),
    'src/mcp-server.js'
  );
  addCheck(
    checks,
    'VERIFIER',
    exists(path.join(root, 'scripts', 'verify-eos.js')),
    'scripts/verify-eos.js'
  );
  addCheck(
    checks,
    'CURRENT_MISSION',
    exists(path.join(root, 'EOS-MISSION-CONTROL', 'CURRENT_MISSION.json')),
    'EOS-MISSION-CONTROL/CURRENT_MISSION.json'
  );

  const leak = path.normalize(root) === path.normalize(homedir);
  addCheck(
    checks,
    'NO_HOMEDIR_LEAK',
    !leak,
    leak ? `control plane root equals homedir (${homedir})` : 'root is not homedir'
  );

  if (!options.skipRuntimeEngines) {
    const missing = RUNTIME_ENGINE_FILES.filter((rel) => !exists(path.join(root, rel)));
    addCheck(
      checks,
      'RUNTIME_ENGINE_SURFACE',
      missing.length === 0,
      missing.length === 0
        ? `${RUNTIME_ENGINE_FILES.length} live engines`
        : `missing ${missing.join(', ')}`
    );
  }

  if (!options.skipMcpFile) {
    const mcpPath = options.workspaceMcpPath || path.join(root, '.cursor', 'mcp.json');
    if (!exists(mcpPath)) {
      addCheck(checks, 'WORKSPACE_MCP_PIN', false, `${mcpPath} missing`);
    } else {
      let pinned = false;
      let detail = 'eos-local cwd/args must reference control-plane root';
      try {
        const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
        const eos = mcp.mcpServers && mcp.mcpServers['eos-local'];
        const cwd = eos && eos.cwd ? path.normalize(eos.cwd) : '';
        const args = ((eos && eos.args) || []).join(' ');
        pinned =
          Boolean(eos) &&
          (cwd === path.normalize(root) ||
            args.includes('mcp-server.js'));
        if (pinned) detail = 'eos-local pinned';
      } catch (err) {
        detail = `mcp.json parse error: ${err.message}`;
      }
      addCheck(checks, 'WORKSPACE_MCP_PIN', pinned, detail);
    }
  }

  if (!options.skipPurpose) {
    const purpose = evaluatePurposeFulfillment(root);
    addCheck(
      checks,
      'PURPOSE_LOCAL_LOOP',
      purpose.local_ok,
      purpose.summary
    );
  }

  // N3 — post-fusion critical presence (fail-closed). Existence/light only; no network/writes.
  if (!options.skipPostFusion) {
    for (const item of POST_FUSION_CRITICAL_PATHS) {
      const abs = path.join(root, item.rel);
      const ok = exists(abs);
      addCheck(
        checks,
        item.id,
        ok,
        ok ? item.rel : `missing critical path: ${item.rel}`
      );
    }
  }

  if (!options.skipDoctorWiring) {
    for (const item of DOCTOR_WIRING_PATHS) {
      const abs = path.join(root, item.rel);
      const ok = exists(abs);
      addCheck(
        checks,
        item.id,
        ok,
        ok ? item.rel : `missing doctor wiring: ${item.rel}`
      );
    }

    // Light package script lock (eos:doctor or doctor)
    const pkgPath = path.join(root, 'package.json');
    if (!exists(pkgPath)) {
      addCheck(checks, 'EOS_DOCTOR_SCRIPT', false, 'package.json missing');
    } else {
      let hasScript = false;
      let detail = 'package.json scripts.eos:doctor (or doctor) missing';
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const scripts = pkg.scripts || {};
        hasScript = Boolean(scripts['eos:doctor'] || scripts.doctor);
        if (hasScript) {
          detail = scripts['eos:doctor']
            ? `eos:doctor=${scripts['eos:doctor']}`
            : `doctor=${scripts.doctor}`;
        }
      } catch (err) {
        detail = `package.json parse error: ${err.message}`;
      }
      addCheck(checks, 'EOS_DOCTOR_SCRIPT', hasScript, detail);
    }
  }

  const failed = checks.filter((c) => !c.ok).map((c) => c.id);
  return {
    ok: failed.length === 0,
    root,
    homedir_leak: leak,
    checks,
    failed
  };
}

export function formatDoctorReport(report) {
  const lines = [
    '================================================================================',
    'EOS DOCTOR — local governed control-plane check',
    '================================================================================',
    `ROOT: ${report.root}`,
    `HOMEDIR_LEAK: ${report.homedir_leak ? 'YES' : 'NO'}`,
    `VERDICT: ${report.ok ? 'PASS' : 'FAIL'}`,
    '',
    ...report.checks.map((c) => `[${c.ok ? 'PASS' : 'FAIL'}] ${c.id} — ${c.detail}`),
    '================================================================================'
  ];
  return lines.join('\n');
}


/**
 * CLI entry used by bin/eos-doctor.js (read-only; no network/writes).
 * @param {string[]} argv
 * @param {{ root?: string }} [options]
 * @returns {{ output: string, exitCode: number, report: object|null }}
 */
export function runOperatorDoctorCli(argv = [], options = {}) {
  let root = options.root || process.cwd();
  let json = false;
  let help = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') help = true;
    else if (a === '--json') json = true;
    else if (a === '--root' && argv[i + 1]) {
      root = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  if (help) {
    return {
      output: 'eos-doctor read-only local check. Flags: --root --json --help\n',
      exitCode: 0,
      report: null
    };
  }
  const report = runOperatorDoctor({ root });
  const output = json
    ? `${JSON.stringify(report, null, 2)}\n`
    : `${formatDoctorReport(report)}\n`;
  return { output, exitCode: report.ok ? 0 : 1, report };
}
