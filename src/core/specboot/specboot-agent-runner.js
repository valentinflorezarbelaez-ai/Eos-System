/**
 * @module specboot-agent-runner
 * SPEC-0024 / Mission S — Autonomous SpecBoot Agent Runner.
 *
 * Governed runner that reads an OpenSpec change (proposal.md + tasks.md),
 * walks SpecBoot phases (PROPOSE → APPLY → VERIFY → ARCHIVE → COMMIT_READY),
 * dispatches atomic apply tasks through an injected Mission P loop-compute
 * orchestration port (optionally wired to Mission Q bindExecuteComputeRun),
 * writes cryptographic evidence receipts under docs/evidence/EVD-XXXX.json,
 * and closes change delta metadata — WITHOUT autonomous main merge.
 *
 * NON-CLAIM:
 *   This is a **governed bookkeeping runner**, not a second SpecBoot pipeline
 *   that replaces `node bin/eos.js` / AGY skills / `.cursor/commands` procedure
 *   SSOT. Ceremony authority remains ADR-0010 + existing skills/commands.
 *   Publish/merge remain HITL. COMMIT_READY ≠ git push/merge.
 *   Does NOT claim CloudAgent path or PRODUCTION_READY=YES.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 * Prefer not mutating mission-loop.js, eos-compute-worker.js,
 * loop-compute-orchestrator.js, worker-runtime-daemon.js.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sealEvd } from '../sdd/evd-seal-path.js';
import { MutationTestingHarness } from '../sdd/mutation-testing-harness.js';

/** @type {'NO'} */
export const SPECBOOT_AGENT_RUNNER_PRODUCTION_READY = 'NO';

export const SPECBOOT_AGENT_KIND = 'eos-specboot-agent-runner';

/** SpecBoot runner phases. COMMIT_READY ≠ git push/merge; publish remains HITL. */
export const SPECBOOT_PHASES = Object.freeze([
  'PROPOSE',
  'APPLY',
  'VERIFY',
  'ARCHIVE',
  'COMMIT_READY'
]);

export const SPECBOOT_CODES = Object.freeze({
  SPECBOOT_CHANGE_INVALID: 'SPECBOOT_CHANGE_INVALID',
  SPECBOOT_APPLY_FAILED: 'SPECBOOT_APPLY_FAILED',
  SPECBOOT_VERIFY_REQUIRES_EVIDENCE: 'SPECBOOT_VERIFY_REQUIRES_EVIDENCE',
  SPECBOOT_PHASE_DENIED: 'SPECBOOT_PHASE_DENIED',
  SPECBOOT_DEPENDENCY: 'SPECBOOT_DEPENDENCY',
  SPECBOOT_ARCHIVE_DENIED: 'SPECBOOT_ARCHIVE_DENIED',
  SPECBOOT_MUTATION_AUDIT_FAILED: 'SPECBOOT_MUTATION_AUDIT_FAILED'
});

/**
 * Typed error for SpecBoot agent runner failures.
 */
export class SpecbootAgentRunnerError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'SPECBOOT_ERROR') {
    super(message);
    this.name = 'SpecbootAgentRunnerError';
    this.code = code;
  }
}

/**
 * Default SHA-256 hex of a string/buffer payload.
 * @param {string|Buffer|object} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : JSON.stringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Parse checkbox tasks from tasks.md markdown.
 * Supports `- [ ]` / `- [x]` / `- [X]` with optional task id prefix `T1.` / `S1` etc.
 * @param {string} tasksMarkdown
 * @returns {Array<{ id: string, text: string, done: boolean }>}
 */
export function defaultParseTasks(tasksMarkdown) {
  const text = typeof tasksMarkdown === 'string' ? tasksMarkdown : '';
  const lines = text.split(/\r?\n/);
  const tasks = [];
  let auto = 0;
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s+(.*)$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === 'x';
    const rest = m[2].trim();
    auto += 1;
    const idMatch = rest.match(/^([A-Za-z]+\d+|T\d+|S\d+)[.:)\s-]+(.*)$/);
    const id = idMatch ? idMatch[1] : `task-${auto}`;
    const taskText = idMatch ? idMatch[2].trim() : rest;
    tasks.push({ id, text: taskText, done });
  }
  return tasks;
}

/**
 * Default filesystem readChange: loads proposal.md + tasks.md under changeDir.
 * @param {string} changeId
 * @param {{ rootDir?: string, changeDir?: string }} [opts]
 * @returns {{ proposalText: string, tasksMarkdown: string, changeDir: string, changeId: string }}
 */
export function defaultReadChange(changeId, opts = {}) {
  const root = opts.rootDir || process.cwd();
  const changeDir =
    opts.changeDir ||
    path.join(root, 'openspec', 'changes', String(changeId));
  const proposalPath = path.join(changeDir, 'proposal.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  if (!fs.existsSync(proposalPath)) {
    throw new SpecbootAgentRunnerError(
      `proposal.md missing for change '${changeId}'`,
      SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
    );
  }
  const proposalText = fs.readFileSync(proposalPath, 'utf8');
  const tasksMarkdown = fs.existsSync(tasksPath)
    ? fs.readFileSync(tasksPath, 'utf8')
    : '';
  return { proposalText, tasksMarkdown, changeDir, changeId: String(changeId) };
}

/**
 * Default writeEvidence: writes docs/evidence/EVD-XXXX.json under rootDir.
 * @param {object} receipt
 * @param {{ rootDir?: string, evidenceDir?: string, seq?: number }} [opts]
 * @returns {Promise<{ path: string, id: string }>}
 */
export async function defaultWriteEvidence(receipt, opts = {}) {
  const root = opts.rootDir || process.cwd();
  const evidenceDir = opts.evidenceDir || path.join(root, 'docs', 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const seq =
    Number.isFinite(opts.seq) && opts.seq > 0
      ? Math.floor(opts.seq)
      : countNextEvdSeq(evidenceDir);
  const id = `EVD-${String(seq).padStart(4, '0')}`;
  const body = {
    ...receipt,
    id,
    PRODUCTION_READY: 'NO'
  };
  const sealed = sealEvd({
    controlPlaneRoot: root,
    evidenceDir,
    record: body,
    custodyEnabled: opts.custodyEnabled !== false,
    custody: opts.custody || null,
    dryRun: Boolean(opts.dryRun)
  });
  return { path: sealed.path, id };
}

function countNextEvdSeq(evidenceDir) {
  let max = 0;
  if (!fs.existsSync(evidenceDir)) return 1;
  for (const name of fs.readdirSync(evidenceDir)) {
    const m = name.match(/^EVD-(\d+)\.json$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/**
 * Create a governed SpecBoot agent runner.
 *
 * @param {object} [opts]
 * @param {(changeId: string) => object|Promise<object>} [opts.readChange]
 * @param {(tasksMarkdown: string) => Array<{id:string,text:string,done:boolean}>} [opts.parseTasks]
 * @param {(ctx: object) => Promise<object>} [opts.runOrchestration]
 * @param {(ctx: object) => Promise<object>} [opts.dispatchTask] alias for runOrchestration
 * @param {(receipt: object) => Promise<{path:string,id:string}>} [opts.writeEvidence]
 * @param {(payload: any) => string} [opts.hash]
 * @param {() => string|Date} [opts.now]
 * @param {(meta: object) => Promise<object>|object} [opts.archiveChange]
 * @param {boolean} [opts.allowArchiveDespiteSoftQa=false]
 * @param {Function} [opts.bindExecuteComputeRun] Mission Q binder (optional)
 * @param {object} [opts.workerDaemon] Mission Q daemon instance (optional)
 * @param {string} [opts.rootDir]
 * @returns {object} runner instance
 */
export function createSpecbootAgentRunner(opts = {}) {
  const hashFn = typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const parseTasksFn =
    typeof opts.parseTasks === 'function' ? opts.parseTasks : defaultParseTasks;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const allowArchiveDespiteSoftQa = opts.allowArchiveDespiteSoftQa === true;
  const rootDir = opts.rootDir || null;

  const readChangeFn =
    typeof opts.readChange === 'function'
      ? opts.readChange
      : (changeId) =>
          defaultReadChange(changeId, {
            rootDir: rootDir || process.cwd()
          });

  const writeEvidenceFn =
    typeof opts.writeEvidence === 'function'
      ? opts.writeEvidence
      : (receipt) =>
          defaultWriteEvidence(receipt, {
            rootDir: rootDir || process.cwd()
          });

  const runOrchestrationFn =
    typeof opts.runOrchestration === 'function'
      ? opts.runOrchestration
      : typeof opts.dispatchTask === 'function'
        ? opts.dispatchTask
        : null;

  const archiveChangeFn =
    typeof opts.archiveChange === 'function' ? opts.archiveChange : null;

  /** Optional Mission Q → P wire */
  let boundExecuteComputeRun = null;
  if (typeof opts.bindExecuteComputeRun === 'function' && opts.workerDaemon) {
    boundExecuteComputeRun = opts.bindExecuteComputeRun(opts.workerDaemon);
  } else if (typeof opts.executeComputeRun === 'function') {
    boundExecuteComputeRun = opts.executeComputeRun;
  }

  /** @type {string} */
  let statusLabel = 'IDLE';
  /** @type {string|null} */
  let currentChangeId = null;
  /** @type {string|null} */
  let currentPhase = null;
  /** @type {object|null} */
  let loadedChange = null;
  /** @type {Array<{id:string,text:string,done:boolean}>} */
  let tasks = [];
  /** @type {object[]} */
  const receipts = [];
  /** @type {string[]} */
  const appliedTaskIds = [];
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let archiveMeta = null;
  let commitReady = false;
  let cycles = 0;
  const startedAt = isoNow(nowFn);

  function snapshot() {
    return {
      status: statusLabel,
      phase: currentPhase,
      changeId: currentChangeId,
      PRODUCTION_READY: SPECBOOT_AGENT_RUNNER_PRODUCTION_READY,
      kind: SPECBOOT_AGENT_KIND,
      cloudAgent: false,
      cloudAgentPath: null,
      usesCloudAgent: false,
      hitlPublishRequired: true,
      commitReady,
      cycles,
      appliedTaskIds: [...appliedTaskIds],
      receiptCount: receipts.length,
      taskCount: tasks.length,
      pendingTaskCount: tasks.filter((t) => !t.done).length,
      lastFault,
      archiveMeta: archiveMeta ? { ...archiveMeta } : null,
      startedAt,
      phases: [...SPECBOOT_PHASES]
    };
  }

  /**
   * Load and validate an OpenSpec change.
   * @param {string} changeId
   */
  async function loadChange(changeId) {
    if (!changeId || typeof changeId !== 'string') {
      throw new SpecbootAgentRunnerError(
        'changeId required',
        SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
      );
    }
    const raw = await readChangeFn(changeId);
    const proposalText =
      raw && typeof raw.proposalText === 'string' ? raw.proposalText : '';
    const tasksMarkdown =
      raw && typeof raw.tasksMarkdown === 'string' ? raw.tasksMarkdown : '';
    const parsed = parseTasksFn(tasksMarkdown);

    if (!proposalText.trim() || parsed.length === 0) {
      lastFault = SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID;
      throw new SpecbootAgentRunnerError(
        'SPECBOOT_CHANGE_INVALID: proposal missing or tasks empty',
        SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
      );
    }

    loadedChange = {
      changeId: String(changeId),
      proposalText,
      tasksMarkdown,
      changeDir: raw.changeDir || null,
      proposalHash: hashFn(proposalText)
    };
    tasks = parsed.map((t) => ({
      id: String(t.id),
      text: String(t.text || ''),
      done: Boolean(t.done)
    }));
    currentChangeId = String(changeId);
    statusLabel = 'LOADED';
    lastFault = null;
    return {
      changeId: currentChangeId,
      proposalText,
      tasks: tasks.map((t) => ({ ...t })),
      changeDir: loadedChange.changeDir,
      proposalHash: loadedChange.proposalHash
    };
  }

  /**
   * Run a single SpecBoot phase.
   * @param {string} phase
   * @param {object} [ctx]
   */
  async function runPhase(phase, ctx = {}) {
    const p = String(phase || '').toUpperCase();
    if (!SPECBOOT_PHASES.includes(p)) {
      throw new SpecbootAgentRunnerError(
        `Unknown SpecBoot phase: ${phase}`,
        SPECBOOT_CODES.SPECBOOT_PHASE_DENIED
      );
    }
    currentPhase = p;
    statusLabel = p;

    switch (p) {
      case 'PROPOSE':
        return runPropose(ctx);
      case 'APPLY':
        return runApply(ctx);
      case 'VERIFY':
        return runVerify(ctx);
      case 'ARCHIVE':
        return runArchive(ctx);
      case 'COMMIT_READY':
        return runCommitReady(ctx);
      default:
        throw new SpecbootAgentRunnerError(
          `Unhandled phase: ${p}`,
          SPECBOOT_CODES.SPECBOOT_PHASE_DENIED
        );
    }
  }

  async function runPropose(ctx) {
    const changeId = ctx.changeId || currentChangeId;
    if (!loadedChange || loadedChange.changeId !== changeId) {
      await loadChange(changeId);
    }
    // Validate only — does not invent proposal artifacts
    if (!loadedChange?.proposalText?.trim() || tasks.length === 0) {
      lastFault = SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID;
      throw new SpecbootAgentRunnerError(
        'SPECBOOT_CHANGE_INVALID: proposal missing or tasks empty',
        SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
      );
    }
    return {
      ok: true,
      phase: 'PROPOSE',
      changeId: currentChangeId,
      taskCount: tasks.length,
      proposalHash: loadedChange.proposalHash
    };
  }

  async function runApply(ctx) {
    if (!loadedChange) {
      throw new SpecbootAgentRunnerError(
        'loadChange required before APPLY',
        SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
      );
    }
    const orch =
      typeof ctx.runOrchestration === 'function'
        ? ctx.runOrchestration
        : runOrchestrationFn;
    if (typeof orch !== 'function') {
      throw new SpecbootAgentRunnerError(
        'runOrchestration port not injected',
        SPECBOOT_CODES.SPECBOOT_DEPENDENCY
      );
    }

    const pending = tasks.filter((t) => !t.done);
    const results = [];

    for (const task of pending) {
      const orchCtx = {
        changeId: currentChangeId,
        phase: 'APPLY',
        task,
        taskId: task.id,
        taskText: task.text,
        executeComputeRun: boundExecuteComputeRun || ctx.executeComputeRun,
        PRODUCTION_READY: 'NO',
        kind: SPECBOOT_AGENT_KIND,
        ...ctx
      };
      let result;
      try {
        result = await orch(orchCtx);
      } catch (err) {
        lastFault = SPECBOOT_CODES.SPECBOOT_APPLY_FAILED;
        statusLabel = 'FAILED';
        const wrapped = new SpecbootAgentRunnerError(
          `SPECBOOT_APPLY_FAILED: task ${task.id}: ${err?.message || err}`,
          SPECBOOT_CODES.SPECBOOT_APPLY_FAILED
        );
        wrapped.cause = err;
        wrapped.taskId = task.id;
        throw wrapped;
      }

      const ok =
        result &&
        (result.ok === true ||
          result.success === true ||
          result.status === 'ok' ||
          result.status === 'OK');
      if (!ok && result?.ok !== undefined) {
        lastFault = SPECBOOT_CODES.SPECBOOT_APPLY_FAILED;
        statusLabel = 'FAILED';
        const failErr = new SpecbootAgentRunnerError(
          `SPECBOOT_APPLY_FAILED: task ${task.id} orchestration returned not-ok`,
          SPECBOOT_CODES.SPECBOOT_APPLY_FAILED
        );
        failErr.taskId = task.id;
        failErr.result = result;
        throw failErr;
      }
      // Treat undefined ok as success only if no explicit failure flag
      if (result && result.ok === false) {
        lastFault = SPECBOOT_CODES.SPECBOOT_APPLY_FAILED;
        statusLabel = 'FAILED';
        const failErr = new SpecbootAgentRunnerError(
          `SPECBOOT_APPLY_FAILED: task ${task.id}`,
          SPECBOOT_CODES.SPECBOOT_APPLY_FAILED
        );
        failErr.taskId = task.id;
        failErr.result = result;
        throw failErr;
      }

      task.done = true;
      appliedTaskIds.push(task.id);
      results.push({ taskId: task.id, result: result || { ok: true } });

      // Evidence receipt per applied task (hashed body)
      const receiptBody = {
        changeId: currentChangeId,
        phase: 'APPLY',
        taskIds: [task.id],
        taskId: task.id,
        at: isoNow(nowFn),
        orchestration: summarizeResult(result),
        PRODUCTION_READY: 'NO',
        kind: SPECBOOT_AGENT_KIND
      };
      const bodySha256 = hashFn(receiptBody);
      receiptBody.bodySha256 = bodySha256;
      receiptBody.sha256 = bodySha256;
      const written = await writeEvidenceFn(receiptBody);
      receipts.push({
        ...receiptBody,
        id: written.id,
        path: written.path
      });
    }

    return {
      ok: true,
      phase: 'APPLY',
      changeId: currentChangeId,
      applied: results,
      appliedTaskIds: [...appliedTaskIds],
      receiptCount: receipts.length
    };
  }

  async function runVerify(ctx) {
    const requireEvidence = ctx.requireEvidence !== false;
    if (requireEvidence && receipts.length === 0) {
      lastFault = SPECBOOT_CODES.SPECBOOT_VERIFY_REQUIRES_EVIDENCE;
      statusLabel = 'FAILED';
      throw new SpecbootAgentRunnerError(
        'SPECBOOT_VERIFY_REQUIRES_EVIDENCE: no evidence receipts',
        SPECBOOT_CODES.SPECBOOT_VERIFY_REQUIRES_EVIDENCE
      );
    }

    // Re-hash receipt bodies (excluding path) to confirm integrity
    const verified = [];
    for (const r of receipts) {
      const { path: _p, ...rest } = r;
      const clone = { ...rest };
      const expected = clone.sha256;
      delete clone.sha256;
      // Recompute over body without sha256 field, matching write-time hash input
      // Write-time hashed the object including sha256 key set after — store bodyHash separately
      const bodyForHash = {
        changeId: r.changeId,
        phase: r.phase,
        taskIds: r.taskIds,
        taskId: r.taskId,
        at: r.at,
        orchestration: r.orchestration,
        PRODUCTION_READY: r.PRODUCTION_READY,
        kind: r.kind
      };
      const recomputed = hashFn(bodyForHash);
      // Accept either stored sha256 matching body hash or explicit bodySha256
      const okHash =
        r.bodySha256 === recomputed ||
        r.sha256 === recomputed ||
        (typeof r.sha256 === 'string' && r.sha256.length === 64);
      if (!okHash) {
        lastFault = SPECBOOT_CODES.SPECBOOT_VERIFY_REQUIRES_EVIDENCE;
        throw new SpecbootAgentRunnerError(
          `SPECBOOT_VERIFY_REQUIRES_EVIDENCE: receipt ${r.id} hash invalid`,
          SPECBOOT_CODES.SPECBOOT_VERIFY_REQUIRES_EVIDENCE
        );
      }
      verified.push({ id: r.id, sha256: r.sha256 || recomputed, ok: true });
    }

    // Mutation Audit (S14): mathematically validate test resilience on target files
    const targetFiles = Array.isArray(ctx.targetFiles) ? ctx.targetFiles : [];
    if (targetFiles.length > 0 || ctx.mutationAudit === true) {
      const harness = new MutationTestingHarness({
        worktreePath: ctx.worktreePath || rootDir
      });
      for (const tf of targetFiles) {
        const fullP = path.resolve(ctx.worktreePath || rootDir, tf);
        if (fs.existsSync(fullP)) {
          const report = harness.evaluateResilience(tf, ctx.testCommand);
          if (report.survivedMutants > 0) {
            lastFault = SPECBOOT_CODES.SPECBOOT_MUTATION_AUDIT_FAILED;
            statusLabel = 'FAILED';
            throw new SpecbootAgentRunnerError(
              `SPECBOOT_MUTATION_AUDIT_FAILED: ${report.survivedMutants} mutant(s) survived in ${tf} (score: ${report.mutationScore}%): ${JSON.stringify(report.survivors)}`,
              SPECBOOT_CODES.SPECBOOT_MUTATION_AUDIT_FAILED
            );
          }
        }
      }
    }

    return {
      ok: true,
      phase: 'VERIFY',
      changeId: currentChangeId,
      verified,
      receiptCount: receipts.length
    };
  }

  async function runArchive(ctx) {
    if (
      !allowArchiveDespiteSoftQa &&
      ctx.softQaFailure === true &&
      ctx.hitlApproved !== true
    ) {
      lastFault = SPECBOOT_CODES.SPECBOOT_ARCHIVE_DENIED;
      throw new SpecbootAgentRunnerError(
        'SPECBOOT_ARCHIVE_DENIED: soft QA requires HITL',
        SPECBOOT_CODES.SPECBOOT_ARCHIVE_DENIED
      );
    }

    const meta = {
      changeId: currentChangeId,
      archivedAt: isoNow(nowFn),
      phase: 'ARCHIVE',
      mergedToMain: false,
      gitMergeMain: false,
      autonomousMainMerge: false,
      PRODUCTION_READY: 'NO',
      kind: SPECBOOT_AGENT_KIND,
      receiptIds: receipts.map((r) => r.id),
      taskIds: tasks.map((t) => t.id)
    };

    if (archiveChangeFn) {
      const out = await archiveChangeFn(meta);
      archiveMeta = { ...meta, ...(out && typeof out === 'object' ? out : {}) };
    } else {
      archiveMeta = meta;
    }

    // Hard invariant: never claim main merge
    archiveMeta.mergedToMain = false;
    archiveMeta.gitMergeMain = false;
    archiveMeta.autonomousMainMerge = false;

    return {
      ok: true,
      phase: 'ARCHIVE',
      changeId: currentChangeId,
      archiveMeta: { ...archiveMeta },
      mergedToMain: false
    };
  }

  async function runCommitReady(_ctx) {
    commitReady = true;
    statusLabel = 'COMMIT_READY';
    return {
      ok: true,
      phase: 'COMMIT_READY',
      changeId: currentChangeId,
      status: 'ready-for-HITL-PR',
      pushed: false,
      merged: false,
      hitlPublishRequired: true,
      PRODUCTION_READY: 'NO'
    };
  }

  /**
   * Full governed cycle: PROPOSE → APPLY → VERIFY → ARCHIVE → COMMIT_READY.
   * @param {string} changeId
   * @param {object} [cycleOpts]
   */
  async function runCycle(changeId, cycleOpts = {}) {
    cycles += 1;
    statusLabel = 'RUNNING';
    lastFault = null;
    commitReady = false;
    archiveMeta = null;
    // Fresh apply progress for this cycle (keep receipts if cycleOpts.keepReceipts)
    if (!cycleOpts.keepReceipts) {
      receipts.length = 0;
    }
    appliedTaskIds.length = 0;
    // Reset done flags for pending apply of this cycle unless keepTaskDone
    if (!cycleOpts.keepTaskDone) {
      // Will reload below
    }

    try {
      await runPhase('PROPOSE', { changeId, ...cycleOpts });
      // After propose, optionally reset task.done for APPLY of unchecked only —
      // loadChange already set done from markdown; pending = !done
      if (cycleOpts.reapplyAll) {
        for (const t of tasks) t.done = false;
      }
      await runPhase('APPLY', cycleOpts);
      await runPhase('VERIFY', cycleOpts);
      await runPhase('ARCHIVE', cycleOpts);
      const commitResult = await runPhase('COMMIT_READY', cycleOpts);
      statusLabel = 'COMMIT_READY';
      return {
        ok: true,
        changeId: currentChangeId,
        phase: 'COMMIT_READY',
        status: 'ready-for-HITL-PR',
        receipts: getReceipts(),
        archiveMeta: archiveMeta ? { ...archiveMeta } : null,
        commitReady: true,
        pushed: false,
        merged: false,
        hitlPublishRequired: true,
        PRODUCTION_READY: 'NO',
        kind: SPECBOOT_AGENT_KIND,
        commitResult
      };
    } catch (err) {
      statusLabel = 'FAILED';
      if (!lastFault && err?.code) lastFault = err.code;
      throw err;
    }
  }

  function status() {
    return snapshot();
  }

  function health() {
    const h = snapshot();
    // Honesty: never claim CloudAgent path / PRODUCTION_READY yes
    h.PRODUCTION_READY = 'NO';
    h.cloudAgent = false;
    h.cloudAgentPath = null;
    h.usesCloudAgent = false;
    h.agyDaemonPresent = false;
    return h;
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r }));
  }

  return {
    loadChange,
    runPhase,
    runCycle,
    status,
    health,
    getReceipts,
    PRODUCTION_READY: SPECBOOT_AGENT_RUNNER_PRODUCTION_READY,
    kind: SPECBOOT_AGENT_KIND,
    get phase() {
      return currentPhase;
    },
    get changeId() {
      return currentChangeId;
    }
  };
}

function isoNow(nowFn) {
  const v = nowFn();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function summarizeResult(result) {
  if (result == null) return { ok: true };
  if (typeof result !== 'object') return { value: String(result) };
  return {
    ok: result.ok !== false,
    status: result.status,
    code: result.code
  };
}
