#!/usr/bin/env node
/**
 * @file eos-compute-worker-cli.js
 * @description SPEC-0008 Phase 3 Tier-2 CLI for eos-compute-worker.
 *
 * Usage: node scripts/runners/eos-compute-worker-cli.js --change=<changeId>
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/**
 * Parse CLI argv for --change=<id> (and optional --root=).
 * @param {string[]} argv
 */
export function parseCliArgs(argv = []) {
  const out = { changeId: null, root: null, writes: null };
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

  let plan;
  try {
    plan = buildComputePlan({
      changeId,
      tasks,
      contextPackPath: CONTEXT_PACK,
      builderId,
      verifierId,
      plannedWrites
    });
  } catch (err) {
    return {
      exitCode: 3,
      error: String(err && err.message ? err.message : err)
    };
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
    controlPlaneRoot: deps.controlPlaneRoot || root
  });

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
