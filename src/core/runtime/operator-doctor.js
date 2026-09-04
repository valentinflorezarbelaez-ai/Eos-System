/**
 * @module OperatorDoctor
 * @description Read-only health check for local governed EOS use.
 * Detects homedir MCP leaks and missing control-plane files. No network, no writes.
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
 * @param {object} [options]
 * @param {string} options.root control-plane root
 * @param {string} [options.homedir]
 * @param {boolean} [options.skipMcpFile]
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
