/**
 * @file eos-compute-worker.js
 * @description SPEC-0008 headless compute worker (Phase 2) — Tier-2 helpers.
 *
 * BUILDER: plans/applies scoped diffs from OpenSpec checkbox tasks.
 * VERIFIER: distinct child identity running npm test + verify:strict (injected in tests).
 * Fail-closed rollback on verifier breach; reject out-of-scope writes.
 *
 * L0: lives under scripts/runners (no src/core mutation).
 * PRODUCTION_READY: NO | Fundacion Delta=0 | AT_CEILING
 */

import path from 'node:path';
import { assertBuilderVerifierDisjunction } from '../../src/core/governance/builder-verifier-custody.js';

export class ComputeWorkerError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   */
  constructor(message, code = 'COMPUTE_WORKER_ERROR') {
    super(message);
    this.name = 'ComputeWorkerError';
    this.code = code;
  }
}

const DEFAULT_CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';

/**
 * Fail-closed: reject task text that embeds traversal / absolute / null-byte paths.
 * @param {string} text
 */
function assertTaskTextPathSafe(text) {
  const s = String(text);
  if (s.includes('\0')) {
    throw new ComputeWorkerError(
      'PATH_TRAVERSAL_REJECTED: null byte in task text',
      'PATH_TRAVERSAL_REJECTED'
    );
  }
  // Path segment traversal
  if (/(?:^|[/\\])\.\.(?:[/\\]|$)/.test(s) || s.includes('../') || s.includes('..\\')) {
    throw new ComputeWorkerError(
      `PATH_TRAVERSAL_REJECTED: traversal segment in task text '${s}'`,
      'PATH_TRAVERSAL_REJECTED'
    );
  }
  // Absolute POSIX path fragment (e.g. /etc/shadow)
  if (/(?:^|[\s"'`(])\/(?:etc|var|usr|bin|sbin|home|root|tmp|proc|sys|dev)(?:\/|\s|$)/i.test(s) ||
      /(?:^|[\s"'`(])\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+/.test(s)) {
    throw new ComputeWorkerError(
      `PATH_TRAVERSAL_REJECTED: absolute path in task text '${s}'`,
      'PATH_TRAVERSAL_REJECTED'
    );
  }
  // Windows drive-absolute
  if (/[A-Za-z]:[\\/]/.test(s)) {
    throw new ComputeWorkerError(
      `PATH_TRAVERSAL_REJECTED: windows absolute path in task text '${s}'`,
      'PATH_TRAVERSAL_REJECTED'
    );
  }
}

/**
 * Parse markdown checkbox tasks (- [ ] / - [x]).
 * Requires GFM-shaped "- [ ] text" (whitespace between "-" and "[").
 * Rejects path-traversal / null-byte task texts fail-closed.
 * @param {string} markdown
 * @returns {{ text: string, done: boolean, checkbox: string, raw: string }[]}
 */
export function parseCheckboxTasks(markdown = '') {
  const lines = String(markdown).split(/\r?\n/);
  const tasks = [];
  for (const raw of lines) {
    // Require whitespace after "-" so "-[ ]" is not treated as a task.
    const m = raw.match(/^\s*-\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!m) continue;
    const mark = m[1];
    const text = m[2];
    assertTaskTextPathSafe(text);
    const done = mark.toLowerCase() === 'x';
    tasks.push({
      text,
      done,
      checkbox: done ? '[x]' : '[ ]',
      raw
    });
  }
  return tasks;
}

/**
 * Normalize to posix-ish relative path for allowlist checks.
 * @param {string} p
 */
function normalizeRel(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
}

/**
 * Default allow roots for a changeId.
 * @param {string} changeId
 */
export function defaultAllowRoots(changeId) {
  const id = String(changeId || '').trim();
  if (!id) {
    throw new ComputeWorkerError('CHANGE_ID_REQUIRED', 'CHANGE_ID_REQUIRED');
  }
  return [
    `openspec/changes/${id}/`,
    'scripts/runners/',
    'tests/runners/'
  ];
}

/**
 * Fail-closed write scope check.
 * @param {string[]} paths
 * @param {{ changeId: string, allowRoots?: string[] }} policy
 */
export function assertWritePathsInScope(paths = [], policy = {}) {
  const allowRoots = (policy.allowRoots || defaultAllowRoots(policy.changeId)).map(normalizeRel);
  const list = Array.isArray(paths) ? paths : [];
  for (const p of list) {
    const rel = normalizeRel(p);
    if (!rel || path.isAbsolute(rel) || rel.includes('..')) {
      throw new ComputeWorkerError(
        `OUT_OF_SCOPE_WRITE: invalid path '${p}'`,
        'OUT_OF_SCOPE_WRITE'
      );
    }
    const ok = allowRoots.some((root) => {
      const r = root.endsWith('/') ? root : root + '/';
      return rel === r.slice(0, -1) || rel.startsWith(r);
    });
    if (!ok) {
      throw new ComputeWorkerError(
        `OUT_OF_SCOPE_WRITE: '${rel}' outside allow roots [${allowRoots.join(', ')}]`,
        'OUT_OF_SCOPE_WRITE'
      );
    }
  }
  return true;
}

/**
 * BUILDER plan. Asserts BUILDER != VERIFIER and write scope.
 */
export function buildComputePlan({
  changeId,
  tasks = [],
  contextPackPath = DEFAULT_CONTEXT_PACK,
  builderId,
  verifierId,
  plannedWrites = []
} = {}) {
  if (!changeId || typeof changeId !== 'string') {
    throw new ComputeWorkerError('CHANGE_ID_REQUIRED', 'CHANGE_ID_REQUIRED');
  }
  assertBuilderVerifierDisjunction({ builder_id: builderId, verifier_id: verifierId });
  assertWritePathsInScope(plannedWrites, { changeId });

  return {
    schema: 'eos.compute_worker.plan.v1',
    role: 'BUILDER',
    verifierRole: 'VERIFIER',
    changeId,
    tasks: tasks.map((t) => ({ ...t })),
    contextPackPath: contextPackPath || DEFAULT_CONTEXT_PACK,
    builderId,
    verifierId,
    plannedWrites: plannedWrites.map(normalizeRel),
    PRODUCTION_READY: 'NO'
  };
}

/**
 * Mark all previously-pending tasks done for happy-path result projection.
 * @param {Array} tasks
 */
function markPendingDone(tasks) {
  return tasks.map((t) => {
    if (t.done) return { ...t };
    return { ...t, done: true, checkbox: '[x]' };
  });
}

/**
 * Execute BUILDER apply then VERIFIER child; rollback on breach.
 * @param {object} args
 */
export async function executeComputeRun({
  plan,
  applyDiff,
  runVerifier,
  rollbackDiff
} = {}) {
  if (!plan || plan.role !== 'BUILDER') {
    throw new ComputeWorkerError('PLAN_ROLE_MUST_BE_BUILDER', 'PLAN_INVALID');
  }
  if (typeof applyDiff !== 'function' || typeof runVerifier !== 'function') {
    throw new ComputeWorkerError('APPLY_AND_VERIFIER_REQUIRED', 'PLAN_INVALID');
  }

  assertWritePathsInScope(plan.plannedWrites || [], { changeId: plan.changeId });

  let applied = false;
  try {
    await applyDiff(plan);
    applied = true;
  } catch (err) {
    return {
      ok: false,
      status: 'APPLY_FAILED',
      PRODUCTION_READY: 'NO',
      error: String(err && err.message ? err.message : err),
      tasks: (plan.tasks || []).map((t) => ({ ...t })),
      builderId: plan.builderId,
      verifierId: plan.verifierId
    };
  }

  const verify = await runVerifier({
    role: 'VERIFIER',
    builderId: plan.builderId,
    verifierId: plan.verifierId,
    commands: ['npm test', 'npm run verify:strict']
  });

  if (verify && verify.ok === true) {
    return {
      ok: true,
      status: 'COMPLETED',
      PRODUCTION_READY: 'NO',
      verify,
      tasks: markPendingDone(plan.tasks || []),
      builderId: plan.builderId,
      verifierId: plan.verifierId,
      contextPackPath: plan.contextPackPath
    };
  }

  if (applied && typeof rollbackDiff === 'function') {
    await rollbackDiff({ plan, reason: verify && verify.reason ? verify.reason : 'verifier_failed' });
  }

  return {
    ok: false,
    status: 'ROLLED_BACK',
    PRODUCTION_READY: 'NO',
    verify,
    tasks: (plan.tasks || []).map((t) => ({ ...t, done: false, checkbox: '[ ]' })),
    builderId: plan.builderId,
    verifierId: plan.verifierId,
    contextPackPath: plan.contextPackPath
  };
}
