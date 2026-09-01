/**
 * @module McpMissionBridge
 * @description Wires MCP tool calls to MissionRuntime / IntegrationGatekeeper / SchemaValidator.
 * Local governed use only — no network, no Fundación mutation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { MissionRuntime } from '../runtime/mission-runtime.js';
import { IntegrationGatekeeper } from '../governance/integration-gatekeeper.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { CanonicalRulesIndex } from '../rules/canonical-rules-index.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

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
    return this.runtime.createMission({
      goal,
      projectPath: args.projectPath || args.project_path || this.baseDir,
      authorityLevel: args.authorityLevel || 'LEVEL_0',
      businessContext: args.businessContext
    });
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
    const writePath = path.resolve(args.path || args.target || '');
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
    const action = args.action || 'unknown';
    const cited = this.rules.cite(args.ruleIds || ['R-ATS-01', 'R-BOUNDARY-01', 'R-HITL-01']);
    return {
      action,
      allowed_local: !String(action).includes('production') && !String(action).includes('fundacion'),
      rules: cited,
      epistemic_class: 'MEASURED'
    };
  }

  recordEvidence(args = {}) {
    const missionId = args.missionId || args.mission_id;
    if (!missionId) {
      const err = new Error('MISSING_MISSION_ID');
      err.code = 'MISSING_MISSION_ID';
      throw err;
    }
    const evidenceDir = path.join(this.runtime.getMissionDir(missionId), 'evidence');
    const id = args.id || `EVD-${Date.now()}`;
    const receipt = {
      id,
      mission_id: missionId,
      status: args.status || 'RECORDED',
      category: args.category || 'MANUAL',
      recorded_at: new Date().toISOString(),
      payload: args.payload || {},
      epistemic_class: 'RECORDED_NOT_VERIFIED'
    };
    fs.mkdirSync(evidenceDir, { recursive: true });
    const file = path.join(evidenceDir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(receipt, null, 2), 'utf8');
    return { evidence: receipt, path: file };
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
    fs.mkdirSync(evidenceDir, { recursive: true });
    const file = path.join(evidenceDir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(receipt, null, 2), 'utf8');
    return { evidence: receipt, path: file };
  }
}
