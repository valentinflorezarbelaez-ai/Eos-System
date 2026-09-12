#!/usr/bin/env node
/**
 * @file eos-compute-worker-cli.js
 * @description SPEC-0008/0010 Tier-2 CLI for eos-compute-worker.
 *
 * Usage: node scripts/runners/eos-compute-worker-cli.js --change=<changeId>
 * Optional: --mcp-check (print MCP projection, exit 0)
 *           --enforce-mcp (abort exit 4 on DEFICIENT)
 *           --dispatch-tool=<server>:<tool>:<json_args> (repeatable; SPEC-0012)
 *           --tool-dry-run (dispatch only, skip apply/verify)
 *
 * Reads openspec/changes/<changeId>/tasks.md, validates write scope,
 * runs executeComputeRun with real git rollback on breach.
 * Exit 0 on COMPLETED; non-zero fail-closed otherwise.
 *
 * PRODUCTION_READY: NO | Fundacion Delta=0 | AT_CEILING | no src/core mutation
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  parseCheckboxTasks,
  assertWritePathsInScope,
  buildComputePlan,
  executeComputeRun,
  ComputeWorkerError,
  defaultAllowRoots
} from './eos-compute-worker.js';
import { McpToolDispatcher } from '../../src/core/mcp/mcp-tool-dispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/**
 * Parse CLI argv for --change=<id> (and optional --root=).
 * @param {string[]} argv
 */
export function parseCliArgs(argv = []) {
  const out = {
    changeId: null,
    root: null,
    writes: null,
    mcpCheck: false,
    enforceMcp: false,
    dispatchTools: [],
    toolDryRun: false
  };
  for (const arg of argv) {
    if (arg.startsWith('--change=')) {
      out.changeId = arg.slice('--change='.length).trim();
    } else if (arg.startsWith('--root=')) {
      out.root = arg.slice('--root='.length).trim();
    } else if (arg.startsWith('--writes=')) {
      out.writes = arg
        .slice('--writes='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === '--mcp-check') {
      out.mcpCheck = true;
    } else if (arg === '--enforce-mcp') {
      out.enforceMcp = true;
    } else if (arg === '--tool-dry-run') {
      out.toolDryRun = true;
    } else if (arg.startsWith('--dispatch-tool=')) {
      const raw = arg.slice('--dispatch-tool='.length);
      const first = raw.indexOf(':');
      if (first < 0) {
        out.dispatchTools.push({
          serverName: raw.trim(),
          toolName: '',
          arguments: {}
        });
        continue;
      }
      const second = raw.indexOf(':', first + 1);
      const serverName = raw.slice(0, first).trim();
      const toolName =
        second < 0 ? raw.slice(first + 1).trim() : raw.slice(first + 1, second).trim();
      const jsonRaw = second < 0 ? '{}' : raw.slice(second + 1);
      let toolArgs = {};
      try {
        toolArgs = jsonRaw.trim() ? JSON.parse(jsonRaw) : {};
      } catch {
        toolArgs = {};
      }
      if (toolArgs === null || typeof toolArgs !== 'object' || Array.isArray(toolArgs)) {
        toolArgs = {};
      }
      out.dispatchTools.push({
        serverName,
        toolName,
        arguments: toolArgs
      });
    }
  }
  return out;
}

/**
 * Default planned writes for a change (OpenSpec tasks + allow-root anchors).
 * @param {string} changeId
 */
export function defaultPlannedWrites(changeId) {
  return [
    `openspec/changes/${changeId}/tasks.md`,
    `openspec/changes/${changeId}/proposal.md`
  ];
}

/**
 * Real git rollback for planned write paths (checkout + clean).
 * @param {object} args
 * @param {object} args.plan
 * @param {string} [args.cwd]
 * @param {string} [args.reason]
 */
export function gitRollbackDiff({ plan, cwd = process.cwd(), reason } = {}) {
  const paths = ((plan && plan.plannedWrites) || []).filter(Boolean);
  const results = [];
  // Fail-closed no-op when no concrete pathspecs — never run bare git clean -fd.
  if (paths.length === 0) {
    return { rolledBack: true, reason: reason || null, results, skipped: 'NO_PATHS' };
  }
  const checkout = spawnSync('git', ['checkout', '--', ...paths], {
    cwd,
    encoding: 'utf8'
  });
  results.push({
    cmd: 'git checkout',
    status: checkout.status,
    stderr: checkout.stderr || ''
  });
  const clean = spawnSync('git', ['clean', '-fd', '--', ...paths], {
    cwd,
    encoding: 'utf8'
  });
  results.push({
    cmd: 'git clean',
    status: clean.status,
    stderr: clean.stderr || ''
  });
  return { rolledBack: true, reason: reason || null, results };
}

/**
 * Default verifier: run npm test + verify:strict (injectable in unit tests).
 * @param {object} opts
 * @param {string} opts.cwd
 */
export async function defaultRunVerifier({ cwd = process.cwd() } = {}) {
  const testRun = spawnSync('npm', ['test'], { cwd, encoding: 'utf8', shell: true });
  if (testRun.status !== 0) {
    return {
      ok: false,
      exitCode: testRun.status,
      reason: 'npm test failed',
      commands: ['npm test', 'npm run verify:strict']
    };
  }
  const verifyRun = spawnSync('npm', ['run', 'verify:strict'], {
    cwd,
    encoding: 'utf8',
    shell: true
  });
  if (verifyRun.status !== 0) {
    return {
      ok: false,
      exitCode: verifyRun.status,
      reason: 'npm run verify:strict failed',
      commands: ['npm test', 'npm run verify:strict']
    };
  }
  return {
    ok: true,
    exitCode: 0,
    commands: ['npm test', 'npm run verify:strict']
  };
}

/**
 * Core CLI runner (testable; does not call process.exit).
 * @param {string[]} argv
 * @param {object} [deps]
 * @returns {Promise<{ exitCode: number, result?: object, error?: string }>}
 */
export async function runComputeWorkerCli(argv = [], deps = {}) {
  const parsed = parseCliArgs(argv);
  const root = path.resolve(deps.root || parsed.root || DEFAULT_ROOT);
  const changeId = parsed.changeId;

  if (!changeId) {
    return {
      exitCode: 2,
      error: 'CHANGE_ID_REQUIRED: pass --change=<changeId>'
    };
  }

  const tasksPath = path.join(root, 'openspec', 'changes', changeId, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    return {
      exitCode: 2,
      error: `TASKS_MD_MISSING: ${tasksPath}`
    };
  }

  let tasks;
  try {
    const md = fs.readFileSync(tasksPath, 'utf8');
    tasks = parseCheckboxTasks(md);
  } catch (err) {
    return {
      exitCode: 2,
      error: String(err && err.message ? err.message : err)
    };
  }

  const plannedWrites = parsed.writes || deps.plannedWrites || defaultPlannedWrites(changeId);

  try {
    assertWritePathsInScope(plannedWrites, { changeId });
  } catch (err) {
    return {
      exitCode: 3,
      error: String(err && err.message ? err.message : err)
    };
  }

  const builderId =
    deps.builderId ||
    process.env.EOS_BUILDER_ID ||
    'eos-compute-worker-cli-builder';
  const verifierId =
    deps.verifierId ||
    process.env.EOS_VERIFIER_ID ||
    'eos-compute-worker-cli-verifier';

  const availableConfig = deps.availableConfig || null;
  let plan;
  try {
    plan = buildComputePlan({
      changeId,
      tasks,
      contextPackPath: CONTEXT_PACK,
      builderId,
      verifierId,
      plannedWrites,
      availableConfig,
      mcpRouter: deps.mcpRouter,
      mcpBaseDir: deps.mcpBaseDir || root,
      toolCalls: parsed.dispatchTools.length > 0 ? parsed.dispatchTools : null
    });
  } catch (err) {
    return {
      exitCode: 3,
      error: String(err && err.message ? err.message : err)
    };
  }

  if (parsed.dispatchTools.length > 0) {
    plan.toolCalls = parsed.dispatchTools.map((c) => ({ ...c }));
  }

  if (parsed.mcpCheck) {
    const projection = plan.mcpEnvelope;
    if (deps.print !== false) {
      const line = JSON.stringify(projection, null, 2);
      if (typeof deps.println === 'function') deps.println(line);
      else console.log(line);
    }
    return { exitCode: 0, result: { status: 'MCP_CHECK', mcpEnvelope: projection } };
  }

  let toolDispatcher = deps.toolDispatcher || null;
  if (!toolDispatcher && parsed.dispatchTools.length > 0) {
    toolDispatcher = new McpToolDispatcher({
      availableConfig: availableConfig || { servers: {} }
    });
  }

  // Optional standalone tool dry-run: dispatch only, no apply/verify.
  if (parsed.toolDryRun === true && parsed.dispatchTools.length > 0) {
    const toolOutputs = [];
    try {
      if (!toolDispatcher || typeof toolDispatcher.dispatch !== 'function') {
        return {
          exitCode: 1,
          error: 'MCP_TOOL_DISPATCHER_REQUIRED',
          result: { status: 'MCP_TOOL_DISPATCHER_REQUIRED', toolOutputs }
        };
      }
      const dispatchPromises = parsed.dispatchTools.map(async (call) => {
        const dispatched = await toolDispatcher.dispatch({
          serverName: call.serverName,
          toolName: call.toolName,
          arguments: call.arguments || {},
          envelope: plan.mcpEnvelope
        });
        return {
          serverName: call.serverName,
          toolName: call.toolName,
          ok: true,
          result: dispatched && Object.prototype.hasOwnProperty.call(dispatched, "result")
            ? dispatched.result
            : dispatched,
          meta: dispatched && dispatched.meta ? dispatched.meta : undefined
        };
      });
      const results = await Promise.all(dispatchPromises);
      toolOutputs.push(...results);
      const line = JSON.stringify({ status: 'TOOL_DRY_RUN', toolOutputs }, null, 2);
      if (deps.print !== false) {
        if (typeof deps.println === 'function') deps.println(line);
        else console.log(line);
      }
      return { exitCode: 0, result: { status: 'TOOL_DRY_RUN', toolOutputs } };
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      const code = err && err.code ? String(err.code) : 'MCP_TOOL_DISPATCH_FAILED';
      toolOutputs.push({ ok: false, error: message, errorCode: code });
      const line = JSON.stringify({ status: 'MCP_TOOL_DISPATCH_FAILED', toolOutputs }, null, 2);
      if (deps.print !== false) {
        if (typeof deps.println === 'function') deps.println(line);
        else console.error(line);
      }
      return {
        exitCode: 1,
        error: message,
        result: { status: 'MCP_TOOL_DISPATCH_FAILED', toolOutputs, errorCode: code }
      };
    }
  }

  const applyDiff =
    deps.applyDiff ||
    (async () => ({
      applied: true,
      mode: 'cli-noop',
      allowRoots: defaultAllowRoots(changeId)
    }));

  const runVerifier =
    deps.runVerifier ||
    (async (ctx) => defaultRunVerifier({ ...ctx, cwd: root }));

  const rollbackDiff =
    deps.rollbackDiff ||
    (async (args) => gitRollbackDiff({ ...args, cwd: root }));

  const result = await executeComputeRun({
    plan,
    applyDiff,
    runVerifier,
    rollbackDiff,
    custody: deps.custody,
    custodyBaseDir: deps.custodyBaseDir,
    controlPlaneRoot: deps.controlPlaneRoot || root,
    enforceMcp: parsed.enforceMcp === true,
    toolDispatcher,
    toolCalls: parsed.dispatchTools.length > 0 ? parsed.dispatchTools : undefined
  });

  if (result && result.status === 'MCP_CAPABILITY_DEFICIENT') {
    return {
      exitCode: 4,
      result,
      error: 'MCP_CAPABILITY_DEFICIENT'
    };
  }

  if (
    result &&
    (result.status === 'MCP_TOOL_DISPATCH_FAILED' ||
      result.status === 'MCP_TOOL_DISPATCHER_REQUIRED')
  ) {
    return {
      exitCode: 1,
      result,
      error: result.error || result.status
    };
  }

  if (result && result.ok === true && result.status === 'COMPLETED') {
    return { exitCode: 0, result };
  }

  return {
    exitCode: 1,
    result,
    error: (result && (result.error || result.status)) || 'COMPUTE_RUN_FAILED'
  };
}

async function main() {
  const outcome = await runComputeWorkerCli(process.argv.slice(2));
  if (outcome.error && outcome.exitCode !== 0) {
    console.error(`[eos-compute-worker-cli] ${outcome.error}`);
  } else if (outcome.result && outcome.result.status === 'COMPLETED') {
    console.log(
      `[eos-compute-worker-cli] COMPLETED change=${outcome.result.builderId ? '' : ''}${outcome.result.status}`
    );
  }
  process.exitCode = outcome.exitCode;
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirect) {
  main().catch((err) => {
    console.error(`[eos-compute-worker-cli] FATAL: ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  });
}

export { ComputeWorkerError, DEFAULT_ROOT, CONTEXT_PACK };
