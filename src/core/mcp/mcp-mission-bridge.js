/**
 * @module McpMissionBridge
 * @description Wires MCP tool calls to MissionRuntime / IntegrationGatekeeper / SchemaValidator.
 * Local governed use only — no network, no Fundación mutation.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { MissionRuntime } from '../runtime/mission-runtime.js';
import { IntegrationGatekeeper } from '../governance/integration-gatekeeper.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { CanonicalRulesIndex } from '../rules/canonical-rules-index.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';
import { sealEvd } from '../sdd/evd-seal-path.js';
import { EvidenceCustody } from '../sdd/evidence-custody.js';
import { MissionLedger } from '../../../scripts/engine/mission-ledger.js';
import {
  barrierCheck as writeBarrierCheck,
  isFundacionPath as wbIsFundacionPath
} from '../write-barrier/index.js';

import {
  MissionLoopRuntime,
  MissionLoopDeniedError,
  MISSION_LOOP_STAGES,
  isActWriteTool
} from './mission-loop-runtime.js';


/** RISK.json STRICT_HARD_WRITE_BLOCK plus POSIX / homedir Documents/Fundacion. */
export const RISK_EXTERNAL_FUNDACION_ROOTS = [
  'C:\\Users\\valen\\Documents\\Fundacion',
  '/Users/valen/Documents/Fundacion'
];

/**
 * @param {string} input
 * @returns {string}
 */
export function normalizeBarrierPath(input) {
  return String(input || '').replace(/\\/g, '/').toLowerCase();
}

/**
 * True for in-repo Fundacion segments and external Documents/Fundacion (Win/POSIX/homedir).
 * @param {...string} candidates
 * @returns {boolean}
 */
export function isFundacionWriteTarget(...candidates) {
  return candidates.some((candidate) => {
    const normalized = normalizeBarrierPath(candidate);
    if (!normalized) return false;
    if (normalized.includes('documents/fundacion')) return true;
    return /(^|\/)fundacion(\/|$)/.test(normalized);
  });
}

/**
 * @param {string} baseDir
 * @returns {string[]}
 */
export function collectProtectedWriteRoots(baseDir) {
  const roots = [
    path.resolve(baseDir, 'Fundacion'),
    path.resolve(baseDir, 'docs', 'governance'),
    ...RISK_EXTERNAL_FUNDACION_ROOTS.map((root) => path.resolve(root)),
    path.join(os.homedir(), 'Documents', 'Fundacion')
  ];
  return [...new Set(roots)];
}

export { MissionLoopDeniedError, MISSION_LOOP_STAGES, isActWriteTool };

export function normalizeToolName(name = '') {
  if (!name || typeof name !== 'string') return '';
  // Cursor/adapters often use underscores: eos_mission_status → eos.mission.status
  if (name.includes('_') && !name.includes('.')) {
    return name.replace(/_/g, '.');
  }
  return name;
}

export class McpMissionBridge {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   * @param {MissionRuntime} [options.runtime]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.runtime =
      options.runtime ||
      new MissionRuntime({
        baseDir: this.baseDir,
        allowLocalDirectorReceipt: true
      });
    // Prefer injected deps, else reuse MissionRuntime instances (avoid duplicate validators).
    this.integrationGate =
      options.integrationGate || this.runtime.integrationGate || new IntegrationGatekeeper();
    this.schemas = options.schemas || this.runtime.schemas || new SchemaValidator();
    this.rules = options.rules || this.runtime.rules || new CanonicalRulesIndex();
    this.loopRuntime =
      options.loopRuntime ||
      new MissionLoopRuntime({
        baseDir: this.baseDir,
        getMissionDir: (id) => this.runtime.getMissionDir(id)
      });
    this.custody = options.custody || null;
    this.custodyBaseDir = options.custodyBaseDir || null;
  }

  resolveIntent(args = {}) {
    const goal = args.goal || args.intent || args.raw || '';
    if (!goal) {
      const err = new Error('MISSING_GOAL: provide goal/intent for eos.mission.resolve');
      err.code = 'MISSING_GOAL';
      throw err;
    }
    return {
      schema_version: '1.0.0',
      epistemic_class: 'PROPOSED',
      goal,
      project_path: args.projectPath || args.project_path || '.',
      suggested_pipeline: [
        'mission.create',
        'mission.plan (canonical FSM + HITL)',
        'mission.package',
        'mission.report',
        'mission.close'
      ],
      rules_cited: this.rules.cite(['R-ATS-01', 'R-HITL-01', 'R-BOUNDARY-01']),
      note: 'Resolve does not mutate disk. Call eos.mission.start to initialize.'
    };
  }

  startMission(args = {}) {
    const goal = args.goal || args.intent || args.raw;
    if (!goal) {
      const err = new Error('MISSING_GOAL: provide goal for eos.mission.start');
      err.code = 'MISSING_GOAL';
      throw err;
    }
    const created = this.runtime.createMission({
      goal,
      projectPath: args.projectPath || args.project_path || this.baseDir,
      authorityLevel: args.authorityLevel || 'LEVEL_0',
      businessContext: args.businessContext
    });
    const missionId = created.mission_id || created.missionId;
    if (missionId) {
      const loop = this.loopRuntime.initLoop(missionId);
      created.mission_loop = {
        stage: loop.stage,
        schema_version: loop.schema_version
      };
    }
    return created;
  }

  missionStatus(args = {}) {
    const missionId = args.missionId || args.mission_id || args.id;
    if (missionId) {
      return this.runtime.inspectMission(missionId);
    }
    // List local missions
    const root = this.runtime.missionsRoot;
    if (!fs.existsSync(root)) {
      return { missions: [], count: 0, note: 'No .missions directory yet' };
    }
    const missions = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('MIS-'))
      .map((d) => {
        const pkgPath = path.join(root, d.name, 'mission-package.json');
        let phase = null;
        let status = null;
        let corrupt = false;
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            phase = pkg.phase ?? null;
            status = pkg.status ?? null;
          } catch {
            corrupt = true;
          }
        }
        return corrupt
          ? { mission_id: d.name, phase, status, corrupt: true }
          : { mission_id: d.name, phase, status };
      });
    return { missions, count: missions.length, baseDir: this.baseDir };
  }

  planMission(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    return this.runtime.planMission(missionId, {
      hitlReceipt: args.hitlReceipt || null,
      requireExternalHitl: args.requireExternalHitl === true
    });
  }

  reportMission(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    return this.runtime.reportMission(missionId, args.format || 'json');
  }

  discoverWorkspace(args = {}) {
    const target = path.resolve(this.baseDir, args.path || '.');
    const entries = fs.existsSync(target)
      ? fs.readdirSync(target, { withFileTypes: true }).slice(0, 100).map((e) => ({
          name: e.name,
          type: e.isDirectory() ? 'dir' : 'file'
        }))
      : [];
    let git = null;
    try {
      git = {
        head: execSync('git rev-parse --short HEAD', { cwd: this.baseDir, encoding: 'utf8' }).trim(),
        branch: execSync('git branch --show-current', { cwd: this.baseDir, encoding: 'utf8' }).trim()
      };
    } catch {
      git = { head: null, branch: null };
    }
    return {
      baseDir: this.baseDir,
      path: target,
      entries,
      git,
      has_mission_cli: fs.existsSync(path.join(this.baseDir, 'bin', 'eos.js')),
      has_mcp_server: fs.existsSync(path.join(this.baseDir, 'src', 'mcp-server.js')),
      epistemic_class: 'MEASURED'
    };
  }

  barrierCheck(args = {}) {
    // Phase 4: delegate to Write Barrier sandbox (Fundacion Δ=0 + SSOT / scope).
    const verdict = writeBarrierCheck({
      path: args.path || args.target || '',
      target: args.target,
      repoRoot: this.baseDir
    });
    const protectedRoots = collectProtectedWriteRoots(this.baseDir);
    const blocked =
      verdict.allowed === false ||
      isFundacionWriteTarget(args.path || args.target || '', verdict.path) ||
      wbIsFundacionPath(args.path || args.target || '', verdict.path);
    return {
      path: verdict.path || path.resolve(args.path || args.target || ''),
      allowed: !blocked,
      protected_roots: [...new Set([...(verdict.protected_roots || []), ...protectedRoots])],
      reason: blocked
        ? verdict.reason === 'OK'
          ? 'PROTECTED_SURFACE'
          : verdict.reason || 'PROTECTED_SURFACE'
        : 'OK',
      scope_active: Boolean(verdict.scope_active),
      epistemic_class: 'MEASURED'
    };
  }
  fdirStatus() {
    return {
      fdirSafeModeTripped: Boolean(this.integrationGate.fdirSafeModeTripped),
      trippedReason: this.integrationGate.trippedReason || null,
      epistemic_class: 'MEASURED'
    };
  }

  fdirTrip(args = {}) {
    return this.integrationGate.tripFdirKillSwitch(args.reason || 'MCP eos.fdir.trip');
  }

  verifierRun(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      // Verify local schemas load
      const directionSchema = this.schemas.loadSchema('direction.local.schema.json');
      return {
        mode: 'schema_catalog',
        ok: true,
        schemas: ['direction.local.schema.json', 'mission-package.local.schema.json', 'hitl-receipt.local.schema.json'],
        sample: directionSchema.title,
        epistemic_class: 'MEASURED'
      };
    }
    const missionDir = this.runtime.getMissionDir(missionId);
    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8'));
    const d = this.schemas.validate(direction, 'direction.local.schema.json');
    const p = this.schemas.validate(pkg, 'mission-package.local.schema.json');
    const ok = d.valid && p.valid;
    const verification = {
      mission_id: missionId,
      direction_valid: d.valid,
      package_valid: p.valid,
      errors: [...d.errors, ...p.errors],
      ok,
      epistemic_class: 'MEASURED'
    };
    try {
      this.loopRuntime.appendReceipt(missionId, {
        kind: 'verify',
        stage: MISSION_LOOP_STAGES.VERIFY,
        ok,
        direction_valid: d.valid,
        package_valid: p.valid
      });
    } catch (err) {
      if (err.code !== 'MISSION_LOOP_MISSING') throw err;
    }
    return verification;
  }

  policyValidate(args = {}) {
    const action = args.action || 'unknown';
    const cited = this.rules.cite(args.ruleIds || ['R-ATS-01', 'R-BOUNDARY-01', 'R-HITL-01']);
    return {
      action,
      allowed_local: !String(action).includes('production') && !String(action).includes('fundacion'),
      rules: cited,
      epistemic_class: 'MEASURED'
    };
  }

  getEvidence(args = {}) {
    const id = args.id || args.evidenceId || args.evidence_id;
    const missionId = args.missionId || args.mission_id;
    if (!missionId || !id) {
      return { found: false, reason: 'Provide missionId and id' };
    }
    const evidenceDir = path.join(this.runtime.getMissionDir(missionId), 'evidence');
    if (!fs.existsSync(evidenceDir)) return { found: false, reason: 'No evidence directory' };
    const candidates = fs.readdirSync(evidenceDir).filter((f) => f.includes(id) || f === `${id}.json`);
    if (candidates.length === 0) return { found: false, id, mission_id: missionId };
    const file = path.join(evidenceDir, candidates[0]);
    return {
      found: true,
      id,
      mission_id: missionId,
      path: file,
      content: JSON.parse(fs.readFileSync(file, 'utf8')),
      epistemic_class: 'MEASURED'
    };
  }

  /**
   * Persist an evidence receipt under .missions/<id>/evidence with SHA-256 of the body.
   * @param {object} [args]
   * @returns {{ evidence: object, path: string }}
   */
  recordEvidence(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    const missionDir = this.runtime.getMissionDir(missionId);
    if (!fs.existsSync(missionDir)) {
      const err = new Error(`MISSION_NOT_FOUND: ${missionId}`);
      err.code = 'MISSION_NOT_FOUND';
      throw err;
    }
    const evidenceDir = path.join(missionDir, 'evidence');
    const id = args.id || `EVD-${Date.now()}`;
    const receiptBody = {
      id,
      mission_id: missionId,
      status: args.status || 'RECORDED',
      category: args.category || 'MANUAL',
      recorded_at: new Date().toISOString(),
      payload: args.payload || {},
      epistemic_class: 'RECORDED_NOT_VERIFIED'
    };
    const receipt = {
      ...receiptBody,
      sha256: calculateSha256(JSON.stringify(receiptBody))
    };
    // P4: mission-local EVD write MUST go through sealEvd + EvidenceCustody (no raw bypass)
    const custody =
      this.custody instanceof EvidenceCustody
        ? this.custody
        : new EvidenceCustody({
            controlPlaneRoot: this.baseDir,
            baseDir: this.custodyBaseDir,
            enabled: true
          });
    const sealed = sealEvd({
      controlPlaneRoot: this.baseDir,
      evidenceDir,
      record: receipt,
      custody,
      custodyBaseDir: this.custodyBaseDir,
      dryRun: false
    });
    try {
      this.loopRuntime.appendReceipt(missionId, {
        kind: 'evidence',
        stage: MISSION_LOOP_STAGES.EVIDENCE,
        ok: true,
        evidence_id: id,
        path: sealed.path,
        custody_event_hash: sealed.custody_event?.event_hash || null
      });
    } catch (err) {
      if (err.code !== 'MISSION_LOOP_MISSING') throw err;
    }
    return {
      evidence: sealed.record,
      path: sealed.path,
      custody_event: sealed.custody_event
    };
  }

  ledgerGetFeatures(args = {}) {
    const missionId = args.missionId || args.id;
    if (!missionId) return null;
    const ledger = new MissionLedger({
      baseDir: path.join(this.baseDir, '.eos', 'ledger'),
      legacyDir: path.join(this.baseDir, 'EOS-MISSION-CONTROL')
    });
    return ledger.getFeatureList(missionId);
  }

  ledgerUpdateFeature(args = {}) {
    const missionId = args.missionId || args.id;
    const featureId = args.featureId;
    const newStatus = args.newStatus;
    const evidenceReceipt = args.evidenceReceipt || args.evidenceId || null;
    const ledger = new MissionLedger({
      baseDir: path.join(this.baseDir, '.eos', 'ledger'),
      legacyDir: path.join(this.baseDir, 'EOS-MISSION-CONTROL')
    });
    return ledger.updateFeatureStatus(missionId, featureId, newStatus, evidenceReceipt);
  }

  missionRecover(args = {}) {
    const missionId = args.missionId || args.id;
    const ledger = new MissionLedger({
      baseDir: path.join(this.baseDir, '.eos', 'ledger'),
      legacyDir: path.join(this.baseDir, 'EOS-MISSION-CONTROL')
    });
    return ledger.recover(missionId);
  }

  getMissionLoopRuntime() {
    return this.loopRuntime;
  }

  missionLoopStatus(args = {}) {
    const missionId = args.missionId || args.mission_id || args.id;
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    const state = this.loopRuntime.loadState(missionId);
    if (!state) {
      return {
        found: false,
        mission_id: missionId,
        note: 'No mission-loop.json — start mission to initialize Intent',
        epistemic_class: 'MEASURED'
      };
    }
    return { found: true, ...state };
  }

  advanceMissionLoop(args = {}) {
    return this.loopRuntime.advance(args);
  }

  enforceMissionLoop(toolName, args = {}) {
    return this.loopRuntime.enforceTool(toolName, args);
  }

  async runActWithWriteScope(options, fn) {
    return this.loopRuntime.runActWithWriteScope(options, fn);
  }
}

