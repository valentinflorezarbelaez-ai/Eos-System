/**
 * @module loop-compute-orchestrator
 * SPEC-0021 / Mission P — Mission Loop × Compute Worker governed orchestration.
 *
 * Thin overlay: advances the MCP mission loop legally (Intent→…→Archive) and
 * invokes executeComputeRun only at Act. Soft Browser QA requires HITL before
 * Archive. Infra tool failures fail-closed (never Archive).
 *
 * Distinct from ATS / SDD_STATES — this does NOT write mission-package.phase.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

import {
  MISSION_LOOP_STAGES,
  MISSION_LOOP_ORDER,
  evaluateStageTransition,
  assertArchiveAllowed,
  assertVerifyAdvanceAllowed,
  createInitialLoopState
} from '../mcp/mission-loop.js';
import {
  executeComputeRun,
  buildMultiNativeComposeToolCalls,
  buildComputePlan,
  hashToolOutputs,
  parseCheckboxTasks
} from '../../../scripts/runners/eos-compute-worker.js';

/** @type {'NO'} */
export const LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY = 'NO';

/**
 * Orchestrator-local tool → stage gate (does not mutate mission-loop.js SSOT).
 * eos.compute.run may only run at Act.
 */
export const LOOP_COMPUTE_TOOL_STAGES = Object.freeze({
  'eos.compute.run': Object.freeze([MISSION_LOOP_STAGES.ACT])
});

export const ARCHIVE_REQUIRES_HITL_SOFT_QA = 'ARCHIVE_REQUIRES_HITL_SOFT_QA';

/**
 * @param {string} toolName
 * @param {string} currentStage
 * @returns {{ allowed: boolean, code?: string, reason?: string }}
 */
export function assertLoopComputeToolStageAllowed(toolName, currentStage) {
  const required = LOOP_COMPUTE_TOOL_STAGES[toolName];
  if (!required) {
    return { allowed: true };
  }
  if (!required.includes(currentStage)) {
    return {
      allowed: false,
      code: 'LOOP_COMPUTE_STAGE_DENIED',
      reason: `LOOP_COMPUTE_STAGE_DENIED: tool '${toolName}' requires stage(s) [${required.join(', ')}] but mission is at '${currentStage}'`
    };
  }
  return { allowed: true };
}

/**
 * @param {object} state
 * @param {string} toStage
 * @returns {object} mutated state (same reference)
 */
export function advanceLoopOrThrow(state, toStage) {
  if (!state || typeof state !== 'object') {
    throw new Error('LOOP_STATE_REQUIRED');
  }
  const from = state.stage;
  const gate = evaluateStageTransition(from, toStage);
  if (!gate.ok) {
    const err = new Error(gate.reason || `ILLEGAL_STAGE_TRANSITION: ${from} → ${toStage}`);
    err.code = gate.code || 'ILLEGAL_STAGE_TRANSITION';
    err.from = from;
    err.to = toStage;
    throw err;
  }

  if (
    from === MISSION_LOOP_STAGES.EVIDENCE &&
    toStage === MISSION_LOOP_STAGES.VERIFY
  ) {
    const ev = assertVerifyAdvanceAllowed(state);
    if (!ev.allowed) {
      const err = new Error(ev.reason || 'VERIFY_REQUIRES_EVIDENCE');
      err.code = ev.code || 'VERIFY_REQUIRES_EVIDENCE';
      throw err;
    }
  }

  if (toStage === MISSION_LOOP_STAGES.ARCHIVE) {
    const ar = assertArchiveAllowed(state);
    if (!ar.allowed) {
      const err = new Error(ar.reason || 'ARCHIVE_REQUIRES_VERIFY');
      err.code = ar.code || 'ARCHIVE_REQUIRES_VERIFY';
      throw err;
    }
  }

  state.stage = toStage;
  state.updated_at = new Date().toISOString();
  return state;
}

/**
 * Soft Browser QA: toolOutputs entry ok:true but result.ok === false (CWV/a11y).
 * @param {Array} toolOutputs
 * @returns {boolean}
 */
export function detectSoftBrowserQaFailure(toolOutputs = []) {
  const list = Array.isArray(toolOutputs) ? toolOutputs : [];
  return list.some((o) => {
    if (!o || o.ok !== true) return false;
    const isQa =
      o.toolName === 'browser_qa_run' ||
      o.serverName === 'eos-browser-qa' ||
      (o.toolName && String(o.toolName).startsWith('browser_qa'));
    if (!isQa) return false;
    return o.result && typeof o.result === 'object' && o.result.ok === false;
  });
}

/**
 * @param {object} state
 * @param {object} receipt
 */
function pushReceipt(state, receipt) {
  if (!Array.isArray(state.receipts)) state.receipts = [];
  state.receipts.push({
    ...receipt,
    at: receipt.at || new Date().toISOString()
  });
  state.updated_at = new Date().toISOString();
}

/**
 * Advance Intent → Spec → Plan → Act without skipping (adjacency only).
 * @param {object} state
 */
function advanceToAct(state) {
  const actIdx = MISSION_LOOP_ORDER.indexOf(MISSION_LOOP_STAGES.ACT);
  while (state.stage !== MISSION_LOOP_STAGES.ACT) {
    const fromIdx = MISSION_LOOP_ORDER.indexOf(state.stage);
    if (fromIdx < 0) {
      throw new Error(`UNKNOWN_STAGE: ${state.stage}`);
    }
    if (fromIdx >= actIdx) {
      throw new Error(
        `CANNOT_ADVANCE_TO_ACT: current stage '${state.stage}' is at/after Act`
      );
    }
    const next = MISSION_LOOP_ORDER[fromIdx + 1];
    advanceLoopOrThrow(state, next);
  }
  return state;
}

/**
 * Default hermetic plan when caller does not supply one.
 * @param {object} opts
 */
function resolvePlan(opts = {}) {
  if (opts.plan && typeof opts.plan === 'object') return opts.plan;
  const po = opts.planOpts && typeof opts.planOpts === 'object' ? opts.planOpts : {};
  const changeId =
    po.changeId ||
    opts.changeId ||
    `eos-mission-p-${opts.missionId || 'loop-compute'}`;
  const availableConfig = po.availableConfig ||
    opts.availableConfig || {
      servers: {
        StitchMCP: { command: 'npx' },
        'chrome-devtools-mcp': { command: 'npx' },
        github: { command: 'npx' },
        engram: { command: 'engram' },
        'eos-local': { command: 'node' }
      }
    };
  return buildComputePlan({
    changeId,
    tasks:
      po.tasks ||
      parseCheckboxTasks(
        '- [ ] Mission P loop×compute orchestration @needs(VCS)\n'
      ),
    contextPackPath: po.contextPackPath || 'docs/harness/CONTEXT_PACK_TPC.md',
    builderId: po.builderId || 'mission-p-builder',
    verifierId: po.verifierId || 'mission-p-verifier-child',
    plannedWrites: po.plannedWrites || [
      `openspec/changes/${changeId}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig,
    toolCalls: po.toolCalls || null,
    mcpRouter: po.mcpRouter,
    mcpBaseDir: po.mcpBaseDir
  });
}

/**
 * Resolve toolCalls: explicit > compose builder > plan.toolCalls.
 * @param {object} opts
 * @param {object} plan
 */
function resolveToolCalls(opts, plan) {
  if (Array.isArray(opts.toolCalls)) return opts.toolCalls;
  if (opts.compose != null) {
    return buildMultiNativeComposeToolCalls(
      opts.compose && typeof opts.compose === 'object' ? opts.compose : {}
    );
  }
  if (Array.isArray(plan.toolCalls) && plan.toolCalls.length > 0) {
    return plan.toolCalls;
  }
  return buildMultiNativeComposeToolCalls({});
}

/**
 * Run governed Mission Loop with Act-stage compute composition.
 *
 * @param {object} opts
 * @returns {Promise<object>}
 */
export async function runLoopComputeOrchestration(opts = {}) {
  const missionId = opts.missionId || 'mission-p-loop-compute';
  const state =
    opts.loopState && typeof opts.loopState === 'object'
      ? opts.loopState
      : createInitialLoopState(missionId);

  const runCompute =
    typeof opts.executeComputeRunImpl === 'function'
      ? opts.executeComputeRunImpl
      : executeComputeRun;

  // Pre-Act advances (legal adjacency only)
  try {
    if (state.stage !== MISSION_LOOP_STAGES.ACT) {
      advanceToAct(state);
    }
  } catch (err) {
    return {
      ok: false,
      status: err && err.code ? err.code : 'ILLEGAL_STAGE_TRANSITION',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: String(err && err.message ? err.message : err),
      loopState: state,
      compute: null,
      hitlRequired: false,
      softQaFailed: false
    };
  }

  // Gate: eos.compute.run only at Act
  const stageGate = assertLoopComputeToolStageAllowed(
    'eos.compute.run',
    state.stage
  );
  if (!stageGate.allowed) {
    return {
      ok: false,
      status: stageGate.code || 'LOOP_COMPUTE_STAGE_DENIED',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: stageGate.reason,
      loopState: state,
      compute: null,
      hitlRequired: false,
      softQaFailed: false
    };
  }

  const plan = resolvePlan(opts);
  const toolCalls = resolveToolCalls(opts, plan);

  const compute = await runCompute({
    plan,
    toolCalls,
    applyDiff: opts.applyDiff,
    runVerifier: opts.runVerifier,
    rollbackDiff: opts.rollbackDiff,
    custody: opts.custody,
    custodyBaseDir: opts.custodyBaseDir,
    controlPlaneRoot: opts.controlPlaneRoot,
    enforceMcp: opts.enforceMcp === true,
    toolDispatcher: opts.toolDispatcher != null ? opts.toolDispatcher : null,
    geminiFetchImpl: opts.geminiFetchImpl,
    geminiQueryImpl: opts.geminiQueryImpl,
    geminiApiKey: opts.geminiApiKey,
    stitchClientImpl: opts.stitchClientImpl,
    stitchFetchImpl: opts.stitchFetchImpl,
    browserQaClientImpl: opts.browserQaClientImpl
  });

  const toolOutputs = Array.isArray(compute.toolOutputs)
    ? compute.toolOutputs
    : [];
  const { hashes: toolOutputHashes, joined: toolOutputsHashJoined } =
    hashToolOutputs(toolOutputs);

  // Act receipt
  pushReceipt(state, {
    stage: MISSION_LOOP_STAGES.ACT,
    kind: 'act',
    ok: compute.ok === true,
    status: compute.status,
    toolOutputsHashJoined,
    toolOutputHashes: [...toolOutputHashes],
    toolOutputCount: toolOutputs.length
  });

  // Infra fail mid-compose — fail-closed; stop advances; never Archive.
  // Verify/apply rollback (ROLLED_BACK) continues so Evidence/Verify receipts
  // can be recorded and assertArchiveAllowed can deny Archive honestly.
  const infraFailStatuses = new Set([
    'GEMINI_TOOL_FAILED',
    'STITCH_TOOL_FAILED',
    'BROWSER_QA_TOOL_FAILED',
    'MCP_TOOL_DISPATCH_FAILED',
    'MCP_TOOL_DISPATCHER_REQUIRED',
    'MCP_CAPABILITY_DEFICIENT',
    'APPLY_FAILED_ROLLED_BACK'
  ]);
  const statusStr = compute.status != null ? String(compute.status) : '';
  const isInfraFail =
    infraFailStatuses.has(compute.status) ||
    (compute.ok !== true && /_TOOL_FAILED$/.test(statusStr));
  if (isInfraFail) {
    return {
      ok: false,
      status: compute.status || 'COMPUTE_FAILED',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: compute.error || compute.status || 'COMPUTE_FAILED',
      loopState: state,
      compute,
      hitlRequired: false,
      softQaFailed: false
    };
  }

  const softQaFailed = detectSoftBrowserQaFailure(toolOutputs);
  let hitlRequired = false;

  // Advance Act → Evidence
  try {
    advanceLoopOrThrow(state, MISSION_LOOP_STAGES.EVIDENCE);
  } catch (err) {
    return {
      ok: false,
      status: err && err.code ? err.code : 'STAGE_ADVANCE_FAILED',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: String(err && err.message ? err.message : err),
      loopState: state,
      compute,
      hitlRequired: softQaFailed,
      softQaFailed
    };
  }

  // Evidence receipt from toolOutputs / custody
  const custodyHashes = toolOutputs
    .map((o) =>
      o && o.custody && o.custody.input_hash
        ? String(o.custody.input_hash)
        : null
    )
    .filter(Boolean);
  pushReceipt(state, {
    stage: MISSION_LOOP_STAGES.EVIDENCE,
    kind: 'evidence',
    ok: true,
    toolOutputsHashJoined,
    toolOutputHashes: [...toolOutputHashes],
    custodyHashes,
    custodyReceiptId:
      compute.custodyReceipt &&
      (compute.custodyReceipt.id || compute.custodyReceipt.event_id)
        ? compute.custodyReceipt.id || compute.custodyReceipt.event_id
        : null
  });

  // Soft QA HITL gate (before Verify/Archive)
  if (softQaFailed) {
    hitlRequired = true;
    state.hitlRequired = true;
    state.softQaFailed = true;
  }

  // Advance Evidence → Verify (requires evidence receipt)
  try {
    advanceLoopOrThrow(state, MISSION_LOOP_STAGES.VERIFY);
  } catch (err) {
    return {
      ok: false,
      status: err && err.code ? err.code : 'VERIFY_REQUIRES_EVIDENCE',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: String(err && err.message ? err.message : err),
      loopState: state,
      compute,
      hitlRequired,
      softQaFailed
    };
  }

  const verifyOk =
    compute.verify && compute.verify.ok === true
      ? true
      : compute.ok === true && compute.status === 'COMPLETED';

  pushReceipt(state, {
    stage: MISSION_LOOP_STAGES.VERIFY,
    kind: 'verify',
    ok: verifyOk === true,
    status: compute.status,
    verify: compute.verify || null
  });

  if (!verifyOk) {
    return {
      ok: false,
      status: compute.status || 'VERIFY_FAILED',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: 'VERIFY_FAILED: compute verify not ok — Archive denied',
      loopState: state,
      compute,
      hitlRequired,
      softQaFailed
    };
  }

  // Soft QA: block Archive unless HITL ok or explicit override
  if (softQaFailed) {
    const hitlOk = opts.hitlReceipt && opts.hitlReceipt.ok === true;
    const allow =
      opts.allowArchiveDespiteSoftQa === true || hitlOk === true;
    if (!allow) {
      return {
        ok: false,
        status: ARCHIVE_REQUIRES_HITL_SOFT_QA,
        PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
        error:
          'ARCHIVE_REQUIRES_HITL_SOFT_QA: soft Browser QA failed; HITL receipt required before Archive',
        loopState: state,
        compute,
        hitlRequired: true,
        softQaFailed: true
      };
    }
    if (hitlOk) {
      pushReceipt(state, {
        stage: MISSION_LOOP_STAGES.VERIFY,
        kind: 'hitl',
        ok: true,
        note: 'HITL cleared soft Browser QA for Archive'
      });
    }
  }

  // Archive gate
  const archiveGate = assertArchiveAllowed(state);
  if (!archiveGate.allowed) {
    return {
      ok: false,
      status: archiveGate.code || 'ARCHIVE_REQUIRES_VERIFY',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: archiveGate.reason,
      loopState: state,
      compute,
      hitlRequired,
      softQaFailed
    };
  }

  try {
    advanceLoopOrThrow(state, MISSION_LOOP_STAGES.ARCHIVE);
  } catch (err) {
    return {
      ok: false,
      status: err && err.code ? err.code : 'ARCHIVE_DENIED',
      PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
      error: String(err && err.message ? err.message : err),
      loopState: state,
      compute,
      hitlRequired,
      softQaFailed
    };
  }

  pushReceipt(state, {
    stage: MISSION_LOOP_STAGES.ARCHIVE,
    kind: 'archive',
    ok: true
  });

  return {
    ok: true,
    status: 'ARCHIVED',
    PRODUCTION_READY: LOOP_COMPUTE_ORCHESTRATOR_PRODUCTION_READY,
    loopState: state,
    compute,
    hitlRequired,
    softQaFailed
  };
}

export {
  MISSION_LOOP_STAGES,
  MISSION_LOOP_ORDER,
  evaluateStageTransition,
  assertArchiveAllowed,
  assertVerifyAdvanceAllowed,
  createInitialLoopState,
  hashToolOutputs,
  buildMultiNativeComposeToolCalls
};
