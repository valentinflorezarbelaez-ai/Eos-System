/**
 * @module McpMissionBridge
 * @description Wires MCP tool calls to MissionRuntime / IntegrationGatekeeper / SchemaValidator.
 * Local governed use only — no network, no Fundación mutation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { MissionRuntime } from '../runtime/mission-runtime.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { CanonicalRulesIndex } from '../rules/canonical-rules-index.js';

const LOCAL_SCHEMAS = [
  'direction.local.schema.json',
  'mission-package.local.schema.json',
  'hitl-receipt.local.schema.json'
];

// Mission and evidence ids are concatenated into filesystem paths, so any
// separator or traversal segment must be rejected before touching the disk.
const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertSafeId(kind, value) {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
    const err = new Error(`INVALID_${kind}: '${value}' must match ${SAFE_ID_PATTERN}`);
    err.code = `INVALID_${kind}`;
    throw err;
  }
  return value;
}

export function normalizeToolName(name) {
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
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    // Pure read-only readers: they load their source file on first use only.
    this.schemas = new SchemaValidator();
    this.rules = new CanonicalRulesIndex();
    this._runtime = null;
  }

  /**
   * Built on first use: constructing MissionRuntime provisions .missions/ and the
   * full engine graph, which must not happen for tool calls that never need it.
   */
  get runtime() {
    if (!this._runtime) {
      this._runtime = new MissionRuntime({
        baseDir: this.baseDir,
        allowLocalDirectorReceipt: true
      });
    }
    return this._runtime;
  }

  /** @private */
  _missionIdFrom(args, aliases = ['missionId', 'mission_id']) {
    const key = aliases.find((alias) => args[alias]);
    return key ? assertSafeId('MISSION_ID', args[key]) : null;
  }

  /** @private */
  _requireMissionId(args) {
    const missionId = this._missionIdFrom(args);
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    return missionId;
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
      project_path: args.projectPath || args.project_path || this.baseDir,
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
    return this.runtime.createMission({
      goal,
      projectPath: args.projectPath || args.project_path || this.baseDir,
      authorityLevel: args.authorityLevel || 'LEVEL_0',
      businessContext: args.businessContext
    });
  }

  missionStatus(args = {}) {
    const missionId = this._missionIdFrom(args, ['missionId', 'mission_id', 'id']);
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
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            phase = pkg.phase;
            status = pkg.status;
          } catch {
            /* ignore corrupt */
          }
        }
        return { mission_id: d.name, phase, status };
      });
    return { missions, count: missions.length, baseDir: this.baseDir };
  }

  reportMission(args = {}) {
    return this.runtime.reportMission(this._requireMissionId(args), args.format || 'json');
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
    const requested = args.path || args.target;
    if (!requested) {
      const err = new Error('MISSING_PATH: provide path/target for eos.workspace.barrier_check');
      err.code = 'MISSING_PATH';
      throw err;
    }
    const writePath = path.resolve(this.baseDir, requested);
    const protectedRoots = [
      path.resolve(this.baseDir, 'Fundacion'),
      path.resolve(this.baseDir, 'docs', 'governance')
    ];
    const blocked = protectedRoots.some(
      (root) => writePath === root || writePath.startsWith(root + path.sep)
    );
    return {
      path: writePath,
      allowed: !blocked,
      protected_roots: protectedRoots,
      reason: blocked ? 'PROTECTED_SURFACE' : 'OK',
      epistemic_class: 'MEASURED'
    };
  }

  fdirStatus() {
    const gate = this.runtime.integrationGate;
    return {
      fdirSafeModeTripped: Boolean(gate.fdirSafeModeTripped),
      trippedReason: gate.trippedReason || null,
      epistemic_class: 'MEASURED'
    };
  }

  fdirTrip(args = {}) {
    return this.runtime.integrationGate.tripFdirKillSwitch(args.reason || 'MCP eos.fdir.trip');
  }

  verifierRun(args = {}) {
    const missionId = this._missionIdFrom(args);
    if (!missionId) {
      // No mission scope: prove the local schema catalog is loadable
      return {
        mode: 'schema_catalog',
        ok: true,
        schemas: LOCAL_SCHEMAS.map((file) => ({
          file,
          title: this.schemas.loadSchema(file).title
        })),
        epistemic_class: 'MEASURED'
      };
    }
    const missionDir = this.runtime.getMissionDir(missionId);
    const direction = JSON.parse(fs.readFileSync(path.join(missionDir, 'direction.json'), 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(path.join(missionDir, 'mission-package.json'), 'utf8'));
    const d = this.schemas.validate(direction, 'direction.local.schema.json');
    const p = this.schemas.validate(pkg, 'mission-package.local.schema.json');
    return {
      mission_id: missionId,
      direction_valid: d.valid,
      package_valid: p.valid,
      errors: [...d.errors, ...p.errors],
      ok: d.valid && p.valid,
      epistemic_class: 'MEASURED'
    };
  }

  policyValidate(args = {}) {
    const action = String(args.action || 'unknown');
    const normalized = action.toLowerCase();
    return {
      action,
      allowed_local: !normalized.includes('production') && !normalized.includes('fundacion'),
      rules: this.rules.cite(args.ruleIds || ['R-ATS-01', 'R-BOUNDARY-01', 'R-HITL-01']),
      epistemic_class: 'MEASURED'
    };
  }

  recordEvidence(args = {}) {
    const missionId = this._requireMissionId(args);
    const id = assertSafeId('EVIDENCE_ID', args.id || `EVD-${Date.now()}`);
    const receipt = {
      id,
      mission_id: missionId,
      status: args.status || 'RECORDED',
      category: args.category || 'MANUAL',
      recorded_at: new Date().toISOString(),
      payload: args.payload || {},
      epistemic_class: 'RECORDED_NOT_VERIFIED'
    };
    const evidenceDir = path.join(this.runtime.getMissionDir(missionId), 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const file = path.join(evidenceDir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(receipt, null, 2), 'utf8');
    return { evidence: receipt, path: file };
  }

  getEvidence(args = {}) {
    const rawId = args.id || args.evidenceId || args.evidence_id;
    const missionId = this._missionIdFrom(args);
    if (!missionId || !rawId) {
      return { found: false, reason: 'Provide missionId and id' };
    }
    const id = assertSafeId('EVIDENCE_ID', rawId);
    const file = path.join(this.runtime.getMissionDir(missionId), 'evidence', `${id}.json`);
    if (!fs.existsSync(file)) {
      return { found: false, id, mission_id: missionId };
    }
    return {
      found: true,
      id,
      mission_id: missionId,
      path: file,
      content: JSON.parse(fs.readFileSync(file, 'utf8')),
      epistemic_class: 'MEASURED'
    };
  }
}
