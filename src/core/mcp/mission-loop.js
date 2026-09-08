/**
 * @module mission-loop
 * Phase 5 — SSOT Mission Loop stages + fail-closed transitions.
 *
 * Canonical lifecycle (MCP mutating / delivery paths):
 *   Intent → Spec → Plan → Act → Evidence → Verify → Archive
 *
 * Distinct from the heavier SDD_STATES / ATS FSM: this loop is the thin MCP
 * enforcement seam. ATS remains sole writer for mission-package.phase.
 */

/** @typedef {'Intent'|'Spec'|'Plan'|'Act'|'Evidence'|'Verify'|'Archive'} MissionLoopStage */

export const MISSION_LOOP_STAGES = Object.freeze({
  INTENT: 'Intent',
  SPEC: 'Spec',
  PLAN: 'Plan',
  ACT: 'Act',
  EVIDENCE: 'Evidence',
  VERIFY: 'Verify',
  ARCHIVE: 'Archive'
});

/** Ordered happy-path sequence (index monotonic forward). */
export const MISSION_LOOP_ORDER = Object.freeze([
  MISSION_LOOP_STAGES.INTENT,
  MISSION_LOOP_STAGES.SPEC,
  MISSION_LOOP_STAGES.PLAN,
  MISSION_LOOP_STAGES.ACT,
  MISSION_LOOP_STAGES.EVIDENCE,
  MISSION_LOOP_STAGES.VERIFY,
  MISSION_LOOP_STAGES.ARCHIVE
]);

/**
 * Fail-closed adjacency: only listed targets are legal from each stage.
 * No skips (Intent→Act etc. denied).
 */
export const MISSION_LOOP_TRANSITIONS = Object.freeze({
  [MISSION_LOOP_STAGES.INTENT]: Object.freeze([MISSION_LOOP_STAGES.SPEC]),
  [MISSION_LOOP_STAGES.SPEC]: Object.freeze([MISSION_LOOP_STAGES.PLAN]),
  [MISSION_LOOP_STAGES.PLAN]: Object.freeze([MISSION_LOOP_STAGES.ACT]),
  [MISSION_LOOP_STAGES.ACT]: Object.freeze([MISSION_LOOP_STAGES.EVIDENCE]),
  [MISSION_LOOP_STAGES.EVIDENCE]: Object.freeze([MISSION_LOOP_STAGES.VERIFY]),
  [MISSION_LOOP_STAGES.VERIFY]: Object.freeze([MISSION_LOOP_STAGES.ARCHIVE]),
  [MISSION_LOOP_STAGES.ARCHIVE]: Object.freeze([])
});

/**
 * Read-only / advisory tools usable without a live mission loop.
 * Documented in docs/missions/MISSION_LOOP_ENFORCEMENT.md.
 */
export const MISSION_LOOP_READONLY_ALLOWLIST = Object.freeze([
  'eos.context.compile',
  'eos.ledger.get_features',
  'eos.authority.check',
  'eos.workspace.barrier_check',
  'eos.mission.status',
  'eos.mission.loop.status',
  'eos.mission.resolve',
  'eos.policy.validate',
  'eos.evidence.get',
  'eos.fdir.status',
  'eos.workspace.discover',
  'eos.doctor',
  'eos.drift.check',
  'eos.drift.detect',
  'eos.provider.route',
  'eos.provider.health',
  'eos.hud.dashboard',
  'eos.skill.route',
  'eos.ontology.query',
  'eos.report.generate',
  'eos.audit.run',
  'eos.verify.strict',
  'eos.kernel.boot',
  'eos.intent.expand',
  'eos.scaffolder.generate'
]);

/**
 * Tools that perform Act-stage disk mutation / delivery and MUST run inside
 * withWriteScope when a missionId is present.
 */
export const MISSION_LOOP_ACT_WRITE_TOOLS = Object.freeze([
  'eos.scaffolder.clean',
  'eos.scaffolder.execute',
  'eos.blueprint.run',
  'eos.environment.sandbox.execute',
  'eos.sdlc.engineer.autonomous'
]);

/**
 * Mutating tools gated to specific loop stage(s).
 */
export const MISSION_LOOP_TOOL_STAGES = Object.freeze({
  'eos.mission.start': Object.freeze([MISSION_LOOP_STAGES.INTENT]),
  'eos.orchestrator.init': Object.freeze([MISSION_LOOP_STAGES.INTENT, MISSION_LOOP_STAGES.SPEC]),
  'eos.scaffolder.clean': Object.freeze([MISSION_LOOP_STAGES.ACT]),
  'eos.scaffolder.execute': Object.freeze([MISSION_LOOP_STAGES.ACT]),
  'eos.blueprint.run': Object.freeze([MISSION_LOOP_STAGES.ACT]),
  'eos.environment.sandbox.execute': Object.freeze([MISSION_LOOP_STAGES.ACT]),
  'eos.sdlc.engineer.autonomous': Object.freeze([MISSION_LOOP_STAGES.ACT]),
  'eos.evidence.record': Object.freeze([
    MISSION_LOOP_STAGES.ACT,
    MISSION_LOOP_STAGES.EVIDENCE,
    MISSION_LOOP_STAGES.VERIFY
  ]),
  'eos.ledger.update_feature': Object.freeze([
    MISSION_LOOP_STAGES.PLAN,
    MISSION_LOOP_STAGES.ACT,
    MISSION_LOOP_STAGES.EVIDENCE
  ]),
  'eos.verifier.run': Object.freeze([MISSION_LOOP_STAGES.VERIFY]),
  'eos.orchestrator.advance': Object.freeze([
    MISSION_LOOP_STAGES.SPEC,
    MISSION_LOOP_STAGES.PLAN,
    MISSION_LOOP_STAGES.ACT,
    MISSION_LOOP_STAGES.EVIDENCE,
    MISSION_LOOP_STAGES.VERIFY
  ]),
  'eos.mission.loop.advance': Object.freeze(
    MISSION_LOOP_ORDER.filter((s) => s !== MISSION_LOOP_STAGES.ARCHIVE)
  ),
  'eos.kernel.ledger': Object.freeze([
    MISSION_LOOP_STAGES.ACT,
    MISSION_LOOP_STAGES.EVIDENCE,
    MISSION_LOOP_STAGES.VERIFY
  ]),
  'eos.kernel.evidence': Object.freeze([
    MISSION_LOOP_STAGES.EVIDENCE,
    MISSION_LOOP_STAGES.VERIFY
  ]),
  'eos.log.evidence': Object.freeze([
    MISSION_LOOP_STAGES.EVIDENCE,
    MISSION_LOOP_STAGES.VERIFY
  ])
});

export const MISSION_LOOP_STATE_FILE = 'mission-loop.json';

/**
 * @param {string} stage
 * @returns {boolean}
 */
export function isMissionLoopStage(stage) {
  return MISSION_LOOP_ORDER.includes(stage);
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: true } | { ok: false, code: string, reason: string }}
 */
export function evaluateStageTransition(from, to) {
  if (!isMissionLoopStage(from)) {
    return {
      ok: false,
      code: 'UNKNOWN_STAGE',
      reason: `ILLEGAL_STAGE_TRANSITION: unknown from stage '${from}'`
    };
  }
  if (!isMissionLoopStage(to)) {
    return {
      ok: false,
      code: 'UNKNOWN_STAGE',
      reason: `ILLEGAL_STAGE_TRANSITION: unknown to stage '${to}'`
    };
  }
  const allowed = MISSION_LOOP_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      code: 'ILLEGAL_STAGE_TRANSITION',
      reason: `ILLEGAL_STAGE_TRANSITION: cannot jump '${from}' → '${to}' (allowed: ${allowed.join(', ') || '∅'})`
    };
  }
  return { ok: true };
}

/**
 * @param {string} toolName
 * @returns {boolean}
 */
export function isLoopReadonlyAllowlisted(toolName) {
  return MISSION_LOOP_READONLY_ALLOWLIST.includes(toolName);
}

/**
 * @param {string} toolName
 * @returns {boolean}
 */
export function isActWriteTool(toolName) {
  return MISSION_LOOP_ACT_WRITE_TOOLS.includes(toolName);
}

/**
 * @param {string} toolName
 * @param {string} currentStage
 * @returns {{ allowed: boolean, code?: string, reason?: string }}
 */
export function assertToolStageAllowed(toolName, currentStage) {
  if (isLoopReadonlyAllowlisted(toolName)) {
    return { allowed: true };
  }
  const required = MISSION_LOOP_TOOL_STAGES[toolName];
  if (!required) {
    if (currentStage === MISSION_LOOP_STAGES.ARCHIVE) {
      return {
        allowed: false,
        code: 'MISSION_LOOP_ARCHIVED',
        reason: `MISSION_LOOP_ARCHIVED: tool '${toolName}' refused after Archive`
      };
    }
    return { allowed: true };
  }
  if (!required.includes(currentStage)) {
    return {
      allowed: false,
      code: 'MISSION_LOOP_STAGE_DENIED',
      reason: `MISSION_LOOP_STAGE_DENIED: tool '${toolName}' requires stage(s) [${required.join(', ')}] but mission is at '${currentStage}'`
    };
  }
  return { allowed: true };
}

/**
 * Archive gate: require a Verify receipt with ok===true.
 * @param {{ receipts?: Array<{ stage?: string, ok?: boolean, kind?: string }> }} state
 * @returns {{ allowed: boolean, code?: string, reason?: string }}
 */
export function assertArchiveAllowed(state = {}) {
  const receipts = Array.isArray(state.receipts) ? state.receipts : [];
  const verifyOk = receipts.some(
    (r) =>
      (r.stage === MISSION_LOOP_STAGES.VERIFY || r.kind === 'verify') &&
      r.ok === true
  );
  if (!verifyOk) {
    return {
      allowed: false,
      code: 'ARCHIVE_REQUIRES_VERIFY',
      reason:
        'ARCHIVE_REQUIRES_VERIFY: cannot Archive without Verify success evidence (receipt ok:true)'
    };
  }
  return { allowed: true };
}

/**
 * Evidence→Verify requires an evidence receipt hook.
 * @param {object} state
 * @param {object} [opts]
 * @param {boolean} [opts.requireEvidence=true]
 */
export function assertVerifyAdvanceAllowed(state = {}, opts = {}) {
  const requireEvidence = opts.requireEvidence !== false;
  if (!requireEvidence) return { allowed: true };
  const receipts = Array.isArray(state.receipts) ? state.receipts : [];
  const hasEvidence = receipts.some(
    (r) => r.stage === MISSION_LOOP_STAGES.EVIDENCE || r.kind === 'evidence'
  );
  if (!hasEvidence) {
    return {
      allowed: false,
      code: 'VERIFY_REQUIRES_EVIDENCE',
      reason:
        'VERIFY_REQUIRES_EVIDENCE: advance Evidence→Verify requires an evidence receipt hook'
    };
  }
  return { allowed: true };
}

/**
 * @param {string} missionId
 * @param {object} [extra]
 */
export function createInitialLoopState(missionId, extra = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: '1.0.0',
    mission_id: missionId,
    stage: MISSION_LOOP_STAGES.INTENT,
    receipts: [],
    created_at: now,
    updated_at: now,
    epistemic_class: 'MEASURED',
    ...extra
  };
}
