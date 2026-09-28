/**
 * @module AuthorityTruthSource
 * @description Sole constitutional authority and phase writer for EOS Mission OS.
 * All phase mutations MUST go through commitTransition(). Direct pkg.phase assignment is forbidden.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  SDD_STATES,
  TransitionEnforcer,
  CANONICAL_TRANSITIONS
} from '../sdd/sdd-fsm-engine.js';
import { HashChainedLedger, calculateSha256 } from '../sdd/epistemic-evidence-engine.js';
import { HitlGatekeeper } from '../sdd/hitl-gatekeeper.js';

const SNAPSHOT_FILE = 'authority-snapshot.json';
const PACKAGE_FILE = 'mission-package.json';

function statusFromState(state) {
  if (state === SDD_STATES.PAUSED) return 'paused';
  if (state === SDD_STATES.COMPLETED || state === SDD_STATES.CANCELLED) return 'completed';
  if (state === SDD_STATES.FAILED || state === SDD_STATES.BLOCKED) return 'blocked';
  return 'active';
}

export class AuthorityTruthSource {
  /**
   * @param {object} options
   * @param {string} options.missionsRoot absolute path to .missions
   * @param {TransitionEnforcer} [options.enforcer]
   */
  constructor(options = {}) {
    if (!options.missionsRoot) {
      throw new Error('ATS_CONFIG: missionsRoot is required');
    }
    this.missionsRoot = options.missionsRoot;
    this.enforcer = options.enforcer || new TransitionEnforcer();
    this.hitl = options.hitl || new HitlGatekeeper();
  }

  getMissionDir(missionId) {
    return path.join(this.missionsRoot, missionId);
  }

  _snapshotPath(missionId) {
    return path.join(this.getMissionDir(missionId), SNAPSHOT_FILE);
  }

  _packagePath(missionId) {
    return path.join(this.getMissionDir(missionId), PACKAGE_FILE);
  }

  /**
   * Read canonical authority snapshot. Fail-closed if missing/corrupt.
   */
  getSnapshot(missionId) {
    const p = this._snapshotPath(missionId);
    if (!fs.existsSync(p)) {
      const err = new Error(`ATS_SNAPSHOT_MISSING: No authority snapshot for ${missionId}`);
      err.code = 'ATS_SNAPSHOT_MISSING';
      throw err;
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  /**
   * Initialize mission authority at VISION_INTAKE. Sole writer for initial phase.
   */
  initMission({ missionId, authorityLevel = 'LEVEL_0', budgetLimits = {} }) {
    const missionDir = this.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      throw new Error(`ATS_MISSION_DIR_MISSING: ${missionDir}`);
    }

    const snapshotPath = this._snapshotPath(missionId);
    if (fs.existsSync(snapshotPath)) {
      const err = new Error(`ATS_ALREADY_INITIALIZED: ${missionId}`);
      err.code = 'ATS_ALREADY_INITIALIZED';
      throw err;
    }

    const snapshot = {
      mission_id: missionId,
      state: SDD_STATES.VISION_INTAKE,
      previous_state: null,
      sequence: 0,
      authority_level: authorityLevel,
      budget_limits: {
        max_input_tokens: budgetLimits.max_input_tokens || 50000,
        max_output_tokens: budgetLimits.max_output_tokens || 10000,
        max_duration_seconds: budgetLimits.max_duration_seconds || 3600
      },
      active_implementer: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this._persistSnapshotAndPackage(missionId, snapshot, {
      ledgerEvent: 'ATS_INITIALIZED',
      ledgerPayload: { state: snapshot.state, authority_level: authorityLevel }
    });

    return { success: true, snapshot };
  }

  /**
   * Sole phase-transition writer. Evaluates via TransitionEnforcer then persists atomically.
   * @param {object} request
   */
  commitTransition(request = {}) {
    const {
      missionId,
      event_type,
      to_state = null,
      authority_level = 'LEVEL_0',
      actor = { identity: 'eos-runtime', role: 'ORCHESTRATOR', identity_type: 'eos_orchestrator' },
      artifacts = [],
      hitlReceipt = null,
      evidence_refs = [],
      idempotency_key = null,
      context = {}
    } = request;

    if (!missionId || !event_type) {
      const err = new Error('ATS_INVALID_REQUEST: missionId and event_type are required');
      err.code = 'ATS_INVALID_REQUEST';
      throw err;
    }

    const snapshot = this.getSnapshot(missionId);
    const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const event = {
      event_id: eventId,
      mission_id: missionId,
      from_state: snapshot.state,
      to_state: to_state || snapshot.state,
      event_type,
      actor,
      authority_level,
      timestamp: new Date().toISOString(),
      artifacts,
      evidence_refs,
      idempotency_key: idempotency_key || eventId,
      receipt: hitlReceipt
    };

    // Control events: to_state may be ignored by enforcer
    if (['mission.pause', 'mission.cancel', 'mission.resume', 'mission.complete'].includes(event_type)) {
      event.to_state = to_state || snapshot.state;
    } else if (!to_state) {
      const err = new Error('ATS_INVALID_REQUEST: to_state required for non-control transitions');
      err.code = 'ATS_INVALID_REQUEST';
      throw err;
    }

    // Pre-enforce HITL via HitlGatekeeper when canonical rule requires receipt
    const rule = CANONICAL_TRANSITIONS.find(
      (t) => t.from === snapshot.state && t.event === event_type && t.to === (to_state || snapshot.state)
    );
    if (rule?.requiresHitlReceipt) {
      const validation = this.hitl.validateReceipt(
        hitlReceipt,
        { action: event_type, gate_id: rule.requiredGate },
        snapshot
      );
      if (!validation || validation.valid === false) {
        const err = new Error(
          `HITL_DENIED [${validation?.code || 'HITL_DENIED'}]: ${validation?.next_action || 'Provide valid HITL receipt'}`
        );
        err.code = validation?.code || 'HITL_DENIED';
        err.diagnostic = validation;
        throw err;
      }
    }

    let result;
    try {
      result = this.enforcer.evaluateTransition(snapshot, event, {
        ...context,
        artifacts,
        hitlReceipt,
        evidence_refs
      });
    } catch (e) {
      // Deny-by-default: do not mutate snapshot or package
      e.code = e.diagnostic?.code || e.code || 'TRANSITION_DENIED';
      throw e;
    }

    this._persistSnapshotAndPackage(missionId, result.snapshot, {
      ledgerEvent: 'TRANSITION_COMMITTED',
      ledgerPayload: {
        event_id: event.event_id,
        event_type,
        from_state: snapshot.state,
        to_state: result.snapshot.state,
        receipt_id: result.receipt?.receipt_id,
        snapshot_hash: result.receipt?.snapshot_hash
      },
      transitionReceipt: result.receipt
    });

    return {
      success: true,
      snapshot: result.snapshot,
      receipt: result.receipt,
      event_id: event.event_id
    };
  }

  /**
   * Persist snapshot + sync mission-package phase/status. On package write failure after
   * snapshot write, attempt snapshot restore from previous bytes (best-effort rollback).
   */
  _persistSnapshotAndPackage(missionId, snapshot, meta = {}) {
    const snapshotPath = this._snapshotPath(missionId);
    const packagePath = this._packagePath(missionId);

    let prevSnapshot = null;
    try { prevSnapshot = fs.readFileSync(snapshotPath); } catch (e) { if (e.code !== 'ENOENT') throw e; }

    let prevPackage = null;
    try { prevPackage = fs.readFileSync(packagePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }

    const snapshotStr = JSON.stringify(snapshot, null, 2);

    try {
      fs.writeFileSync(snapshotPath, snapshotStr, 'utf8');

      if (!fs.existsSync(packagePath)) {
        throw new Error(`ATS_PACKAGE_MISSING: ${packagePath}`);
      }
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      pkg.phase = snapshot.state;
      pkg.status = statusFromState(snapshot.state);
      pkg.authority_truth = {
        sequence: snapshot.sequence,
        last_event_id: snapshot.last_event_id || null,
        snapshot_sha256: calculateSha256(snapshotStr)
      };
      const pkgStr = JSON.stringify(pkg, null, 2);
      fs.writeFileSync(packagePath, pkgStr, 'utf8');

      const ledger = new HashChainedLedger({
        baseDir: path.join(this.getMissionDir(missionId), 'ledger')
      });
      ledger.appendEvent(missionId, meta.ledgerEvent || 'ATS_PERSIST', meta.ledgerPayload || {});
    } catch (persistErr) {
      // Rollback snapshot if package/ledger failed
      try {
        if (prevSnapshot) fs.writeFileSync(snapshotPath, prevSnapshot);
        else if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
        if (prevPackage) fs.writeFileSync(packagePath, prevPackage);
      } catch {
        // swallow secondary rollback errors; surface original
      }
      persistErr.code = persistErr.code || 'ATS_PERSIST_FAILED';
      throw persistErr;
    }
  }
}

/**
 * Module-level helper used by MissionRuntime and tests.
 */
export function createAuthorityTruthSource(missionsRoot, enforcer) {
  return new AuthorityTruthSource({ missionsRoot, enforcer });
}
