/**
 * @module mission-os-coherence
 * Operator map: ATS / SDD FSM ? MCP mission-loop overlay.
 *
 * ADR-0014: the mission loop is an MCP enforcement overlay. It does NOT replace
 * AuthorityTruthSource (ATS) / SDD_STATES (Mission OS FSM sole writer of
 * mission-package.phase). This module invents no second FSM ? it only exports
 * a deterministic correspondence map for HUD/docs.
 */

import { SDD_STATES } from '../sdd/sdd-fsm-engine.js';
import { MISSION_LOOP_ORDER, MISSION_LOOP_STAGES } from '../mcp/mission-loop.js';

export const COHERENCE_SCHEMA = 'eos.mission-os-coherence.v1';

export const FSM_ROLES = Object.freeze({
  ATS_SDD: Object.freeze({
    id: 'ATS_SDD',
    name: 'AuthorityTruthSource / SDD FSM (Mission OS)',
    sole_writer_of: 'mission-package.phase / authority-snapshot.state',
    module: 'src/core/authority/authority-truth-source.js',
    states_module: 'src/core/sdd/sdd-fsm-engine.js',
    replaces: null
  }),
  MISSION_LOOP: Object.freeze({
    id: 'MISSION_LOOP',
    name: 'MCP Mission Loop overlay',
    sole_writer_of: '.missions/<id>/mission-loop.json stage',
    module: 'src/core/mcp/mission-loop.js',
    states_module: 'src/core/mcp/mission-loop.js',
    adr: 'ADR-0014',
    replaces: null,
    claim: 'Does NOT replace ATS / Mission OS FSM'
  })
});

/** Happy-path ATS lifecycle order (control/terminal listed separately). */
export const ATS_LIFECYCLE_ORDER = Object.freeze([
  SDD_STATES.VISION_INTAKE,
  SDD_STATES.MISSION_FORMULATION,
  SDD_STATES.HUMAN_DIRECTION_GATE,
  SDD_STATES.DISCOVER,
  SDD_STATES.DEFINE,
  SDD_STATES.PLAN,
  SDD_STATES.DELEGATE,
  SDD_STATES.SUPERVISE,
  SDD_STATES.VERIFY,
  SDD_STATES.REVIEW,
  SDD_STATES.HUMAN_RELEASE_GATE,
  SDD_STATES.OPERATE_AND_LEARN,
  SDD_STATES.COMPLETED
]);

/** ATS control / exception states ? ATS-only; no invented mission-loop twin. */
export const ATS_CONTROL_STATES = Object.freeze([
  SDD_STATES.PAUSED,
  SDD_STATES.BLOCKED,
  SDD_STATES.FAILED,
  SDD_STATES.CANCELLED
]);

/**
 * Every mission-loop stage ? ATS/SDD stage set (operator correspondence).
 * Relation is overlay_corresponds ? not identity and not a merged FSM.
 */
export const MISSION_LOOP_TO_ATS = Object.freeze({
  [MISSION_LOOP_STAGES.INTENT]: Object.freeze({
    ats_stages: Object.freeze([
      SDD_STATES.VISION_INTAKE,
      SDD_STATES.MISSION_FORMULATION,
      SDD_STATES.HUMAN_DIRECTION_GATE
    ]),
    relation: 'overlay_corresponds',
    note: 'MCP Intent covers ATS intake, formulation, and human direction gate.'
  }),
  [MISSION_LOOP_STAGES.SPEC]: Object.freeze({
    ats_stages: Object.freeze([SDD_STATES.DISCOVER, SDD_STATES.DEFINE]),
    relation: 'overlay_corresponds',
    note: 'MCP Spec covers ATS discovery and definition / technical spec.'
  }),
  [MISSION_LOOP_STAGES.PLAN]: Object.freeze({
    ats_stages: Object.freeze([SDD_STATES.PLAN]),
    relation: 'overlay_corresponds',
    note: 'MCP Plan aligns with ATS PLAN (implementation plan / task graph).'
  }),
  [MISSION_LOOP_STAGES.ACT]: Object.freeze({
    ats_stages: Object.freeze([SDD_STATES.DELEGATE, SDD_STATES.SUPERVISE]),
    relation: 'overlay_corresponds',
    note: 'MCP Act (write-scoped delivery) aligns with ATS delegate + supervise.'
  }),
  [MISSION_LOOP_STAGES.EVIDENCE]: Object.freeze({
    ats_stages: Object.freeze([SDD_STATES.SUPERVISE]),
    relation: 'overlay_corresponds',
    note: 'MCP Evidence receipts sit beside ATS supervise outputs before VERIFY.'
  }),
  [MISSION_LOOP_STAGES.VERIFY]: Object.freeze({
    ats_stages: Object.freeze([SDD_STATES.VERIFY]),
    relation: 'overlay_corresponds',
    note: 'MCP Verify aligns with ATS VERIFY (fail-closed evidence).'
  }),
  [MISSION_LOOP_STAGES.ARCHIVE]: Object.freeze({
    ats_stages: Object.freeze([
      SDD_STATES.REVIEW,
      SDD_STATES.HUMAN_RELEASE_GATE,
      SDD_STATES.OPERATE_AND_LEARN,
      SDD_STATES.COMPLETED
    ]),
    relation: 'overlay_corresponds',
    note: 'MCP Archive overlays ATS review / release / operate / completed seal.'
  })
});

export const CLOSED_GAP_G7 = Object.freeze({
  id: 'G7',
  title: 'EVD write paths outside ContractEvidenceSealer may skip custody',
  status: 'CLOSED',
  note: 'Closed via sealEvd SSOT + fail-closed audit (docs/releases/EOS_G7_EVD_CUSTODY_SEAL_PATH_2026-09-08.md)'
});

export const DEFERRED_NEXT_GAP = Object.freeze({
  id: null,
  title: null,
  status: 'NONE',
  note: 'G7 closed; no deferred next gap declared in this change set',
  closed_gap: CLOSED_GAP_G7
});

/**
 * @returns {object} Canonical operator coherence map (HUD / docs SSOT export)
 */
export function getMissionOsCoherenceMap() {
  return {
    schema: COHERENCE_SCHEMA,
    epistemic: 'OBSERVED',
    claim:
      'Mission loop is an MCP overlay; it does not replace ATS / SDD Mission OS FSM (ADR-0014)',
    roles: FSM_ROLES,
    mission_loop_stages: [...MISSION_LOOP_ORDER],
    ats_sdd_stages: Object.freeze([...Object.values(SDD_STATES)]),
    ats_lifecycle_order: [...ATS_LIFECYCLE_ORDER],
    ats_control_states: [...ATS_CONTROL_STATES],
    map: MISSION_LOOP_TO_ATS,
    rows: MISSION_LOOP_ORDER.map((stage) => {
      const entry = MISSION_LOOP_TO_ATS[stage];
      return {
        mission_loop_stage: stage,
        ats_stages: [...entry.ats_stages],
        relation: entry.relation,
        note: entry.note
      };
    }),
    unmapped_ats_note:
      'ATS control states (PAUSED / BLOCKED / FAILED / CANCELLED) are ATS-only; the mission loop does not invent twin stages for them.',
    deferred_next_gap: DEFERRED_NEXT_GAP,
    closed_gap_g7: CLOSED_GAP_G7,
    docs: 'docs/orchestration/MISSION_OS_ATS_MISSION_LOOP_COHERENCE.md'
  };
}

/**
 * Fail-closed completeness checks used by TDD / HUD consumers.
 * @returns {{ ok: true, mission_loop_mapped: number, ats_documented: number }}
 */
export function assertCoherenceMapComplete() {
  const missingLoop = [];
  for (const stage of MISSION_LOOP_ORDER) {
    const entry = MISSION_LOOP_TO_ATS[stage];
    if (!entry || !Array.isArray(entry.ats_stages) || entry.ats_stages.length === 0) {
      missingLoop.push(stage);
    }
  }
  if (missingLoop.length) {
    const err = new Error(
      `COHERENCE_MAP_INCOMPLETE: mission-loop stages unmapped: ${missingLoop.join(', ')}`
    );
    err.code = 'COHERENCE_MAP_INCOMPLETE';
    throw err;
  }

  const documented = new Set();
  for (const stage of MISSION_LOOP_ORDER) {
    for (const ats of MISSION_LOOP_TO_ATS[stage].ats_stages) documented.add(ats);
  }
  for (const ats of ATS_CONTROL_STATES) documented.add(ats);

  const allAts = Object.values(SDD_STATES);
  const undocumented = allAts.filter((s) => !documented.has(s));
  if (undocumented.length) {
    const err = new Error(
      `COHERENCE_MAP_ATS_UNDOCUMENTED: ${undocumented.join(', ')}`
    );
    err.code = 'COHERENCE_MAP_ATS_UNDOCUMENTED';
    throw err;
  }

  // Guard: do not invent mission-loop stages beyond SSOT
  for (const key of Object.keys(MISSION_LOOP_TO_ATS)) {
    if (!MISSION_LOOP_ORDER.includes(key)) {
      const err = new Error(`COHERENCE_MAP_INVENTED_LOOP_STAGE: ${key}`);
      err.code = 'COHERENCE_MAP_INVENTED_LOOP_STAGE';
      throw err;
    }
  }

  return {
    ok: true,
    mission_loop_mapped: MISSION_LOOP_ORDER.length,
    ats_documented: allAts.length
  };
}

export { SDD_STATES, MISSION_LOOP_ORDER, MISSION_LOOP_STAGES };

