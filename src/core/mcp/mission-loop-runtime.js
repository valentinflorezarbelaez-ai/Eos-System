/**
 * @module mission-loop-runtime
 * Phase 5 — per-mission loop state persistence + advance + Act write-scope.
 * Consumed by McpMissionBridge (prefer extend bridge over parallel OS).
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  MISSION_LOOP_STAGES,
  MISSION_LOOP_STATE_FILE,
  createInitialLoopState,
  evaluateStageTransition,
  assertArchiveAllowed,
  assertVerifyAdvanceAllowed,
  assertToolStageAllowed,
  isLoopReadonlyAllowlisted,
  isActWriteTool,
  isMissionLoopStage
} from './mission-loop.js';

import {
  withWriteScope,
  assertWritable,
  getActiveWriteScope,
  WriteBarrierDeniedError
} from '../write-barrier/index.js';

import { EvidenceCustody } from '../sdd/evidence-custody.js';

export class MissionLoopDeniedError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'MISSION_LOOP_DENIED') {
    super(message);
    this.name = 'MissionLoopDeniedError';
    this.code = code;
  }
}

export class MissionLoopRuntime {
  /**
   * @param {object} options
   * @param {string} options.baseDir
   * @param {(id: string) => string} options.getMissionDir
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.getMissionDir =
      options.getMissionDir ||
      ((missionId) => path.join(this.baseDir, '.missions', missionId));
    this.custodyEnabled = options.custody !== false && options.custodyEnabled !== false;
    this.custody = options.custody instanceof EvidenceCustody
      ? options.custody
      : (this.custodyEnabled
          ? new EvidenceCustody({
              controlPlaneRoot: this.baseDir,
              baseDir: options.custodyBaseDir,
              enabled: true
            })
          : null);
  }

  loopStatePath(missionId) {
    return path.join(this.getMissionDir(missionId), MISSION_LOOP_STATE_FILE);
  }

  /**
   * @param {string} missionId
   * @returns {object|null}
   */
  loadState(missionId) {
    const p = this.loopStatePath(missionId);
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      const e = new MissionLoopDeniedError(
        `MISSION_LOOP_STATE_CORRUPT: ${missionId}: ${err.message}`,
        'MISSION_LOOP_STATE_CORRUPT'
      );
      throw e;
    }
  }

  /**
   * @param {string} missionId
   * @param {object} state
   */
  saveState(missionId, state) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      const err = new MissionLoopDeniedError(
        `MISSION_NOT_FOUND: ${missionId}`,
        'MISSION_NOT_FOUND'
      );
      throw err;
    }
    const next = {
      ...state,
      mission_id: missionId,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(this.loopStatePath(missionId), JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  /**
   * Bootstrap at Intent after mission directory exists.
   * @param {string} missionId
   */
  initLoop(missionId) {
    const existing = this.loadState(missionId);
    if (existing) return existing;
    return this.saveState(missionId, createInitialLoopState(missionId));
  }

  /**
   * @param {string} missionId
   */
  requireState(missionId) {
    const state = this.loadState(missionId);
    if (!state) {
      throw new MissionLoopDeniedError(
        `MISSION_LOOP_MISSING: no mission-loop.json for ${missionId} — call eos.mission.start first`,
        'MISSION_LOOP_MISSING'
      );
    }
    if (!isMissionLoopStage(state.stage)) {
      throw new MissionLoopDeniedError(
        `MISSION_LOOP_STATE_CORRUPT: invalid stage '${state.stage}'`,
        'MISSION_LOOP_STATE_CORRUPT'
      );
    }
    return state;
  }

  /**
   * Append a receipt without changing stage.
   * @param {string} missionId
   * @param {object} receipt
   */
  appendReceipt(missionId, receipt) {
    const state = this.requireState(missionId);
    const entry = {
      recorded_at: new Date().toISOString(),
      ...receipt
    };
    state.receipts = Array.isArray(state.receipts) ? state.receipts : [];
    state.receipts.push(entry);
    const savedReceiptState = this.saveState(missionId, state);
    if (this.custody) {
      this.custody.sealMissionLoopReceipt({
        mission_id: missionId,
        kind: entry.kind || 'receipt',
        ...entry
      });
    }
    return savedReceiptState;
  }

  /**
   * Fail-closed stage advance.
   * @param {object} args
   * @param {string} args.missionId
   * @param {string} args.to
   * @param {object} [args.evidence]
   * @param {boolean} [args.ok]
   */
  advance(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      throw new MissionLoopDeniedError('MISSING_MISSION_ID', 'MISSING_MISSION_ID');
    }
    const to = args.to || args.target || args.stage;
    if (!to) {
      throw new MissionLoopDeniedError(
        'MISSING_TARGET_STAGE: provide to/target for advance',
        'MISSING_TARGET_STAGE'
      );
    }

    const state = this.requireState(missionId);
    const from = state.stage;
    const transition = evaluateStageTransition(from, to);
    if (!transition.ok) {
      throw new MissionLoopDeniedError(transition.reason, transition.code);
    }

    if (from === MISSION_LOOP_STAGES.EVIDENCE && to === MISSION_LOOP_STAGES.VERIFY) {
      const gate = assertVerifyAdvanceAllowed(state);
      if (!gate.allowed) {
        throw new MissionLoopDeniedError(gate.reason, gate.code);
      }
    }

    if (to === MISSION_LOOP_STAGES.ARCHIVE) {
      const gate = assertArchiveAllowed(state);
      if (!gate.allowed) {
        throw new MissionLoopDeniedError(gate.reason, gate.code);
      }
    }

    const receipt = {
      kind: 'stage_advance',
      from,
      to,
      stage: to,
      ok: args.ok !== false,
      evidence: args.evidence || null,
      recorded_at: new Date().toISOString()
    };
    state.receipts = Array.isArray(state.receipts) ? state.receipts : [];
    state.receipts.push(receipt);
    state.stage = to;
    state.last_transition = { from, to, at: receipt.recorded_at };
    const saved = this.saveState(missionId, state);
    let custody_event = null;
    if (this.custody) {
      custody_event = this.custody.sealMissionLoopAdvance({
        mission_id: missionId,
        from,
        to,
        ok: args.ok !== false
      });
    }
    return {
      mission_id: missionId,
      from,
      to,
      stage: saved.stage,
      receipts: saved.receipts,
      epistemic_class: 'MEASURED',
      custody_event
    };
  }

  /**
   * Enforce tool vs current stage. Read-only allowlist always passes.
   * Tools without missionId skip (pre-mission / global).
   * @param {string} toolName
   * @param {object} args
   */
  enforceTool(toolName, args = {}) {
    if (isLoopReadonlyAllowlisted(toolName)) {
      return { allowed: true, skipped: 'readonly_allowlist' };
    }
    // Bootstrap: mission.start creates the loop — no prior state required.
    if (toolName === 'eos.mission.start') {
      return { allowed: true, skipped: 'bootstrap' };
    }
    // Loop control tools always allowed to read/advance (advance validates itself).
    if (toolName === 'eos.mission.loop.advance' || toolName === 'eos.mission.loop.status') {
      return { allowed: true, skipped: 'loop_control' };
    }

    const missionId = args.missionId || args.mission_id || args.idMision || args.id;
    // verifier.run without missionId is schema_catalog (read-only style) — allow.
    if (toolName === 'eos.verifier.run' && !missionId) {
      return { allowed: true, skipped: 'verifier_catalog' };
    }

    // Act write tools require missionId + Act stage (no anonymous Act bypass).
    if (isActWriteTool(toolName)) {
      if (!missionId) {
        throw new MissionLoopDeniedError(
          `MISSION_LOOP_MISSION_REQUIRED: Act tool '${toolName}' requires missionId`,
          'MISSION_LOOP_MISSION_REQUIRED'
        );
      }
    }

    if (!missionId) {
      return { allowed: true, skipped: 'no_mission_id' };
    }

    const state = this.loadState(missionId);
    if (!state) {
      // Act delivery tools must not bypass the loop via anonymous missionIds.
      if (isActWriteTool(toolName)) {
        throw new MissionLoopDeniedError(
          `MISSION_LOOP_MISSING: Act tool '${toolName}' requires mission-loop.json (eos.mission.start)`,
          'MISSION_LOOP_MISSING'
        );
      }
      // Legacy ledger-only missionIds (no .missions loop) remain usable for non-Act tools.
      return { allowed: true, skipped: 'no_loop_state' };
    }
    const verdict = assertToolStageAllowed(toolName, state.stage);
    if (!verdict.allowed) {
      throw new MissionLoopDeniedError(verdict.reason, verdict.code);
    }
    return { allowed: true, stage: state.stage, mission_id: missionId };
  }

  /**
   * Run Act mutations inside Phase 4 withWriteScope. Fail-closed without scope.
   * @template T
   * @param {object} options
   * @param {string} options.missionId
   * @param {string[]} [options.roots]
   * @param {string[]} [options.assertPaths] paths that must pass assertWritable inside scope
   * @param {() => (T|Promise<T>)} fn
   * @returns {Promise<T>}
   */
  async runActWithWriteScope(options = {}, fn) {
    const missionId = options.missionId || options.mission_id;
    if (!missionId) {
      throw new MissionLoopDeniedError(
        'MISSION_LOOP_MISSION_REQUIRED: Act write scope requires missionId',
        'MISSION_LOOP_MISSION_REQUIRED'
      );
    }
    const state = this.requireState(missionId);
    if (state.stage !== MISSION_LOOP_STAGES.ACT) {
      throw new MissionLoopDeniedError(
        `MISSION_LOOP_STAGE_DENIED: Act write requires stage 'Act' but mission is at '${state.stage}'`,
        'MISSION_LOOP_STAGE_DENIED'
      );
    }

    const roots = options.roots || ['src', 'tests', 'docs', 'config', 'scripts'];
    return withWriteScope(
      {
        repoRoot: options.repoRoot || this.baseDir,
        roots,
        label: `mission-loop-act:${missionId}`
      },
      async () => {
        if (!getActiveWriteScope()) {
          throw new MissionLoopDeniedError(
            'ACT_WRITE_SCOPE_REQUIRED: withWriteScope did not activate',
            'ACT_WRITE_SCOPE_REQUIRED'
          );
        }
        for (const p of options.assertPaths || []) {
          try {
            assertWritable(p, { repoRoot: options.repoRoot || this.baseDir });
          } catch (err) {
            if (err instanceof WriteBarrierDeniedError) {
              const e = new MissionLoopDeniedError(
                `ACT_WRITE_DENIED: ${err.message}`,
                err.code || 'ACT_WRITE_DENIED'
              );
              throw e;
            }
            throw err;
          }
        }
        return fn();
      }
    );
  }
}

export {
  MISSION_LOOP_STAGES,
  isLoopReadonlyAllowlisted,
  isActWriteTool
};
