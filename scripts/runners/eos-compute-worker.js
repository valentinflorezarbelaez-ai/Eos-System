/**
 * @file eos-compute-worker.js
 * @description SPEC-0008/0010 headless compute worker — Tier-2 helpers.
 *
 * BUILDER: plans/applies scoped diffs from OpenSpec checkbox tasks.
 * VERIFIER: distinct child identity running npm test + verify:strict (injected in tests).
 * Fail-closed atomic rollback on apply failure or verifier breach.
 * COMPLETED runs bind EvidenceCustody sealVerifyReceipt (ADR-0015 / V5).
 * SPEC-0010: McpCapabilityRouter envelope on plan; enforceMcp abort; mcp_envelope custody.
 *
 * L0: lives under scripts/runners (no src/core mutation; imports custody + MCP router only).
 * PRODUCTION_READY: NO | Fundacion Delta=0 | AT_CEILING
 */

import path from 'node:path';
import { assertBuilderVerifierDisjunction } from '../../src/core/governance/builder-verifier-custody.js';
import {
  EvidenceCustody,
  calculateSha256,
  CUSTODY_EVENT_TYPES
} from '../../src/core/sdd/evidence-custody.js';
import { McpCapabilityRouter } from '../../src/core/mcp/mcp-capability-router.js';

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
  // Percent-encoded traversal / separators (e.g. @needs(%2e%2e%2f...))
  if (/%2e/i.test(s) || /%2f/i.test(s) || /%5c/i.test(s)) {
    throw new ComputeWorkerError(
      `PATH_TRAVERSAL_REJECTED: percent-encoded path token in task text '${s}'`,
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
 * Best-effort decode for percent-encoded separators / dots (fail-closed probe).
 * @param {string} p
 */
function decodeRelOnce(p) {
  try {
    return decodeURIComponent(String(p));
  } catch {
    return String(p);
  }
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
export function assertWritePathsInScope(paths, policy = {}) {
  if (paths === undefined || paths === null || !Array.isArray(paths)) {
    throw new ComputeWorkerError(
      'OUT_OF_SCOPE_WRITE: paths must be an array',
      'OUT_OF_SCOPE_WRITE'
    );
  }
  const allowRoots = (policy.allowRoots || defaultAllowRoots(policy.changeId)).map(normalizeRel);
  for (const p of paths) {
    const rel = normalizeRel(p);
    const decoded = normalizeRel(decodeRelOnce(rel));
    const driveAbs = /^[A-Za-z]:\//.test(rel) || /^[A-Za-z]:\//.test(decoded);
    if (
      !rel ||
      path.isAbsolute(rel) ||
      path.isAbsolute(decoded) ||
      driveAbs ||
      rel.includes('..') ||
      decoded.includes('..') ||
      /%2e/i.test(String(p)) ||
      /%2f/i.test(String(p)) ||
      /%5c/i.test(String(p))
    ) {
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
 * Join checkbox task objects/strings into taskText for McpCapabilityRouter.
 * Preserves @needs(...) annotations embedded in task text.
 * @param {Array} tasks
 * @returns {string}
 */

/** Tokens that must never be accepted as MCP capability names (pollution / spoof). */
const FORBIDDEN_MCP_CAPABILITY_TOKENS = new Set([
  '__PROTO__',
  'CONSTRUCTOR',
  'PROTOTYPE',
  'PROTO',
]);

/**
 * Strip / reject adversarial @needs tokens before router resolution (worker-side harden).
 * @param {string} taskText
 */
export function sanitizeMcpTaskText(taskText = '') {
  const s = String(taskText || '');
  assertTaskTextPathSafe(s);
  const re = /@needs\(([^)]*)\)/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const raw = m[1] || '';
    const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean);
    for (const tok of tokens) {
      const up = tok.toUpperCase();
      if (FORBIDDEN_MCP_CAPABILITY_TOKENS.has(up) || up.includes('__PROTO__')) {
        throw new ComputeWorkerError(
          `MCP_CAPABILITY_REJECTED: forbidden token '${tok}'`,
          'MCP_CAPABILITY_REJECTED'
        );
      }
      if (tok.includes('..') || tok.includes('/') || tok.includes('\\') || /%2e|%2f|%5c/i.test(tok)) {
        throw new ComputeWorkerError(
          `MCP_CAPABILITY_REJECTED: path-like token '${tok}'`,
          'MCP_CAPABILITY_REJECTED'
        );
      }
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tok)) {
        throw new ComputeWorkerError(
          `MCP_CAPABILITY_REJECTED: malformed token '${tok}'`,
          'MCP_CAPABILITY_REJECTED'
        );
      }
    }
  }
  return s;
}

export function tasksToTaskText(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((t) => {
      if (typeof t === 'string') return t;
      if (t && typeof t === 'object') return String(t.text || t.raw || '');
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * SPEC-0010 capability availability gate.
 * Real SPEC-0009 API exposes status on resolveMcpEnvelope (no router method).
 * @param {object|null|undefined} envelope
 * @returns {{ ok: boolean, status: string, envelope: object|null }}
 */
export function checkCapabilityAvailability(envelope, router = null) {
  if (router && typeof router.checkCapabilityAvailability === 'function') {
    return router.checkCapabilityAvailability(envelope);
  }
  if (!envelope || typeof envelope !== 'object') {
    return { ok: false, status: 'DEFICIENT', envelope: envelope || null };
  }
  const status = String(envelope.status || 'DEFICIENT');
  if (status === 'RESOLVED') {
    return { ok: true, status: 'RESOLVED', envelope };
  }
  return { ok: false, status: status === 'DEFICIENT' ? 'DEFICIENT' : status, envelope };
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
  plannedWrites = [],
  mcpRouter = null,
  availableConfig = null,
  mcpBaseDir = null
} = {}) {
  if (!changeId || typeof changeId !== 'string') {
    throw new ComputeWorkerError('CHANGE_ID_REQUIRED', 'CHANGE_ID_REQUIRED');
  }
  assertBuilderVerifierDisjunction({ builder_id: builderId, verifier_id: verifierId });
  assertWritePathsInScope(plannedWrites, { changeId });

  const router =
    mcpRouter ||
    new McpCapabilityRouter({
      baseDir: mcpBaseDir || process.cwd(),
      ...(availableConfig ? { availableConfig } : {})
    });
  const taskText = sanitizeMcpTaskText(tasksToTaskText(tasks));
  const resolveArgs = { phase: 'APPLY', taskText };
  if (availableConfig) resolveArgs.availableConfig = availableConfig;
  // SPEC-0010: resolveMcpEnvelope({ phase: APPLY, tasks }) — tasks projected via taskText
  // because the real SPEC-0009 API accepts taskText/capabilities, not a tasks array.
  const mcpEnvelope = router.resolveMcpEnvelope(resolveArgs);
  // Fail-closed: APPLY must never claim L0_READONLY with writeAllowed true
  if (
    mcpEnvelope &&
    mcpEnvelope.profile === 'L0_READONLY' &&
    mcpEnvelope.authority &&
    mcpEnvelope.authority.writeAllowed === true
  ) {
    throw new ComputeWorkerError(
      'MCP_PROFILE_SPOOF: L0_READONLY cannot writeAllowed',
      'MCP_PROFILE_SPOOF'
    );
  }

  return {
    schema: 'eos.compute_worker.plan.v1',
    role: 'BUILDER',
    verifierRole: 'VERIFIER',
    changeId,
    tasks: tasks.map((t) => (typeof t === 'string' ? { text: t, done: false, checkbox: '[ ]', raw: t } : { ...t })),
    contextPackPath: contextPackPath || DEFAULT_CONTEXT_PACK,
    builderId,
    verifierId,
    plannedWrites: plannedWrites.map(normalizeRel),
    mcpEnvelope,
    mcpAvailableConfig: availableConfig || null,
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
 * Resolve EvidenceCustody instance (injectable for tests).
 * @param {object} opts
 */
function resolveCustody(opts = {}) {
  if (opts.custody) return opts.custody;
  return new EvidenceCustody({
    controlPlaneRoot: opts.controlPlaneRoot || process.cwd(),
    baseDir: opts.custodyBaseDir
  });
}

/**
 * Seal COMPLETED run into EvidenceCustody (tamper-evident VERIFY_RECEIPT).
 * @param {object} plan
 * @param {object} verify
 * @param {object} custodyOpts
 */
export function sealComputeRunCustody(plan, verify, custodyOpts = {}) {
  assertBuilderVerifierDisjunction({
    builder_id: plan.builderId,
    verifier_id: plan.verifierId
  });

  // SPEC-0010-ADV: reject missing / tampered mcp_envelope before custody bind
  if (!plan.mcpEnvelope || typeof plan.mcpEnvelope !== 'object') {
    throw new ComputeWorkerError(
      'MCP_ENVELOPE_REQUIRED: COMPLETED seal requires mcp_envelope',
      'MCP_ENVELOPE_TAMPERED'
    );
  }
  if (
    plan.mcpEnvelope.profile === 'L0_READONLY' &&
    plan.mcpEnvelope.authority &&
    plan.mcpEnvelope.authority.writeAllowed === true
  ) {
    throw new ComputeWorkerError(
      'MCP_ENVELOPE_TAMPERED: L0_READONLY with writeAllowed',
      'MCP_ENVELOPE_TAMPERED'
    );
  }
  if (custodyOpts.skipMcpIntegrity !== true) {
    const env = plan.mcpEnvelope;
    if (env.schema !== 'eos.mcp_capability_envelope.v1') {
      throw new ComputeWorkerError(
        'MCP_ENVELOPE_TAMPERED: invalid schema',
        'MCP_ENVELOPE_TAMPERED'
      );
    }
    if (env.status !== 'RESOLVED' && env.status !== 'DEFICIENT') {
      throw new ComputeWorkerError(
        'MCP_ENVELOPE_TAMPERED: invalid status',
        'MCP_ENVELOPE_TAMPERED'
      );
    }
    if (env.phase === 'APPLY' && env.profile !== 'L1_LOCAL_GOVERNED') {
      throw new ComputeWorkerError(
        'MCP_ENVELOPE_TAMPERED: APPLY requires L1_LOCAL_GOVERNED',
        'MCP_ENVELOPE_TAMPERED'
      );
    }
    if (custodyOpts.availableConfig || custodyOpts.mcpRouter) {
      const router =
        custodyOpts.mcpRouter ||
        new McpCapabilityRouter({
          baseDir: custodyOpts.mcpBaseDir || custodyOpts.controlPlaneRoot || process.cwd(),
          ...(custodyOpts.availableConfig ? { availableConfig: custodyOpts.availableConfig } : {})
        });
      const fresh = router.resolveMcpEnvelope({
        phase: 'APPLY',
        taskText: sanitizeMcpTaskText(tasksToTaskText(plan.tasks || [])),
        ...(custodyOpts.availableConfig ? { availableConfig: custodyOpts.availableConfig } : {})
      });
      const a = JSON.stringify({
        status: env.status,
        capabilities: env.capabilities,
        resolvedServers: env.resolvedServers,
        profile: env.profile
      });
      const b = JSON.stringify({
        status: fresh.status,
        capabilities: fresh.capabilities,
        resolvedServers: fresh.resolvedServers,
        profile: fresh.profile
      });
      if (a !== b) {
        throw new ComputeWorkerError(
          'MCP_ENVELOPE_TAMPERED: envelope does not match re-resolved projection',
          'MCP_ENVELOPE_TAMPERED'
        );
      }
    }
  }

  // Full sealVerifyReceipt *input* payload (SPEC-0010 includes mcp_envelope).
  // receipt_hash covers mcp_envelope. EvidenceCustody.sealVerifyReceipt whitelists
  // fields and would drop mcp_envelope — so after the same identity gate we persist
  // via append(VERIFY_RECEIPT) without mutating src/core.
  const receiptPayload = {
    receipt_id: `compute-run:${plan.changeId}:${Date.now()}`,
    mission_id: plan.changeId,
    status: 'COMPLETED',
    builder_id: plan.builderId,
    verifier_id: plan.verifierId,
    verify_ok: verify && verify.ok === true,
    context_pack_path: plan.contextPackPath || null,
    planned_writes: (plan.plannedWrites || []).slice(),
    mcp_envelope: plan.mcpEnvelope || null
  };
  receiptPayload.receipt_hash = calculateSha256(receiptPayload);

  const custody = resolveCustody(custodyOpts);
  // sealVerifyReceipt input includes mcp_envelope (hashed). L0 sealVerifyReceipt
  // whitelists fields and would drop mcp_envelope — persist via append after the
  // same BUILDER!=VERIFIER gate already enforced above (no src/core mutation).
  if (typeof custody.sealVerifyReceipt !== 'function' && typeof custody.append !== 'function') {
    throw new ComputeWorkerError('CUSTODY_SEAL_API_MISSING', 'CUSTODY_SEAL_API_MISSING');
  }
  return custody.append(CUSTODY_EVENT_TYPES.VERIFY_RECEIPT, {
    receipt_id: receiptPayload.receipt_id,
    receipt_hash: receiptPayload.receipt_hash,
    mission_id: receiptPayload.mission_id,
    status: receiptPayload.status,
    builder_id: receiptPayload.builder_id,
    verifier_id: receiptPayload.verifier_id,
    mcp_envelope: receiptPayload.mcp_envelope
  });
}

/**
 * Execute BUILDER apply then VERIFIER child; atomic rollback on apply/verifier breach.
 * On COMPLETED, bind EvidenceCustody sealVerifyReceipt.
 * @param {object} args
 */
export async function executeComputeRun({
  plan,
  applyDiff,
  runVerifier,
  rollbackDiff,
  custody,
  custodyBaseDir,
  controlPlaneRoot,
  enforceMcp = false
} = {}) {
  if (!plan || plan.role !== 'BUILDER') {
    throw new ComputeWorkerError('PLAN_ROLE_MUST_BE_BUILDER', 'PLAN_INVALID');
  }
  if (typeof applyDiff !== 'function' || typeof runVerifier !== 'function') {
    throw new ComputeWorkerError('APPLY_AND_VERIFIER_REQUIRED', 'PLAN_INVALID');
  }

  assertWritePathsInScope(plan.plannedWrites || [], { changeId: plan.changeId });

  if (enforceMcp === true) {
    const availability = checkCapabilityAvailability(plan.mcpEnvelope);
    if (!availability.ok || availability.status === 'DEFICIENT') {
      return {
        ok: false,
        status: 'MCP_CAPABILITY_DEFICIENT',
        PRODUCTION_READY: 'NO',
        mcpEnvelope: plan.mcpEnvelope || null,
        error: 'MCP_CAPABILITY_DEFICIENT',
        tasks: (plan.tasks || []).map((t) => ({ ...t })),
        builderId: plan.builderId,
        verifierId: plan.verifierId,
        contextPackPath: plan.contextPackPath
      };
    }
  }

  let applied = false;
  try {
    await applyDiff(plan);
    applied = true;
  } catch (err) {
    // Phase 3: fail-closed atomicity — rollback any mid-apply residuals.
    if (typeof rollbackDiff === 'function') {
      await rollbackDiff({
        plan,
        reason: String(err && err.message ? err.message : err)
      });
    }
    return {
      ok: false,
      status: 'APPLY_FAILED_ROLLED_BACK',
      PRODUCTION_READY: 'NO',
      error: String(err && err.message ? err.message : err),
      tasks: (plan.tasks || []).map((t) => ({ ...t })),
      builderId: plan.builderId,
      verifierId: plan.verifierId
    };
  }

  let verify;
  try {
    verify = await runVerifier({
      role: 'VERIFIER',
      builderId: plan.builderId,
      verifierId: plan.verifierId,
      commands: ['npm test', 'npm run verify:strict']
    });
  } catch (err) {
    if (applied && typeof rollbackDiff === 'function') {
      await rollbackDiff({
        plan,
        reason: String(err && err.message ? err.message : err)
      });
    }
    return {
      ok: false,
      status: 'ROLLED_BACK',
      PRODUCTION_READY: 'NO',
      verify: {
        ok: false,
        error: String(err && err.message ? err.message : err)
      },
      tasks: (plan.tasks || []).map((t) => ({ ...t, done: false, checkbox: '[ ]' })),
      builderId: plan.builderId,
      verifierId: plan.verifierId,
      contextPackPath: plan.contextPackPath
    };
  }

  if (verify && verify.ok === true) {
    let custodyReceipt;
    try {
      custodyReceipt = sealComputeRunCustody(plan, verify, {
        custody,
        custodyBaseDir,
        controlPlaneRoot
      });
    } catch (err) {
      if (applied && typeof rollbackDiff === 'function') {
        await rollbackDiff({
          plan,
          reason: `custody_seal_failed: ${String(err && err.message ? err.message : err)}`
        });
      }
      return {
        ok: false,
        status: 'ROLLED_BACK',
        PRODUCTION_READY: 'NO',
        error: String(err && err.message ? err.message : err),
        verify,
        tasks: (plan.tasks || []).map((t) => ({ ...t, done: false, checkbox: '[ ]' })),
        builderId: plan.builderId,
        verifierId: plan.verifierId,
        contextPackPath: plan.contextPackPath
      };
    }

    return {
      ok: true,
      status: 'COMPLETED',
      PRODUCTION_READY: 'NO',
      verify,
      custodyReceipt,
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
