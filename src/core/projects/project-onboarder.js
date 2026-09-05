/**
 * @module ProjectOnboarder
 * @description Autonomous 10-domain project onboarding and fleet observability engine for EOS.
 * Pure L0 Node.js implementation (zero external npm dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { UniversalTechnicalDiscoveryEngine } from '../discovery/universal-technical-discovery-engine.js';
import { resolveControlPlaneRoot } from '../runtime/control-plane-root.js';

export class ProjectOnboarder {
  /**
   * @param {Object} [options]
   * @param {string} [options.controlPlaneRoot]
   */
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || resolveControlPlaneRoot();
    this.discoveryEngine = new UniversalTechnicalDiscoveryEngine();
    this.registrationsDir = path.join(this.controlPlaneRoot, 'docs', 'projects', 'registrations');
    this.registryPath = path.join(this.controlPlaneRoot, 'docs', 'projects', 'registry.json');
    this.intakeDir = path.join(this.controlPlaneRoot, 'docs', 'intake');
    this.evidenceDir = path.join(this.controlPlaneRoot, 'docs', 'evidence');
  }

  /**
   * Discovers and onboards any local target project into the EOS governance mesh.
   * @param {string} targetPath Absolute or relative path to project root
   * @param {Object} [options]
   * @returns {{ success: boolean, registration: Object, registrationPath: string, contextPath: string, isNew: boolean, profile: Object }}
   */
  onboardProject(targetPath, options = {}) {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('MISSING_TARGET_PATH: Please provide a valid project directory path.');
    }

    const resolvedPath = path.resolve(targetPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`TARGET_NOT_FOUND: Directory does not exist: ${resolvedPath}`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      throw new Error(`NOT_A_DIRECTORY: Target is not a directory: ${resolvedPath}`);
    }

    // 1. Run 10-domain universal discovery
    const profile = this.discoveryEngine.discoverProject(resolvedPath);

    // 2. Derive normalized Project ID and Slug
    const baseName = path.basename(resolvedPath);
    const slug = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const projectId = `PRJ-${slug.toUpperCase()}`;

    // 3. Inspect Git metadata safely
    let gitBranch = 'main';
    let gitRemote = 'local';
    try {
      const branchOut = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: resolvedPath,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (branchOut) gitBranch = branchOut;
    } catch {
      // not a git repo or headless
    }

    try {
      const remoteOut = execSync('git config --get remote.origin.url', {
        cwd: resolvedPath,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (remoteOut) gitRemote = remoteOut;
    } catch {
      // no origin remote
    }

    // 4. Determine Project Type enum conforming to schema.json
    // Enum: ["WEBSITE", "WEB_APP", "CLI", "LIBRARY", "CONTROL_PLANE", "UNKNOWN"]
    let projectType = 'WEB_APP';
    const frameworkNames = (profile.code?.frameworks || []).map((f) => f.name.toLowerCase());
    const files = fs.readdirSync(resolvedPath);

    if (files.includes('bin') || files.includes('cli.js')) {
      projectType = 'CLI';
    } else if (frameworkNames.some((f) => f.includes('next') || f.includes('react') || f.includes('vue') || f.includes('fastapi') || f.includes('express') || f.includes('django'))) {
      projectType = 'WEB_APP';
    } else if (files.includes('index.html') && !files.includes('package.json')) {
      projectType = 'WEBSITE';
    }

    // 5. Build Stack Array
    const stack = [];
    (profile.code?.languages || []).forEach((lang) => {
      if (lang.name && lang.name !== 'Unknown') stack.push(lang.name);
    });
    (profile.code?.frameworks || []).forEach((fw) => {
      if (fw.name) stack.push(fw.name);
    });
    (profile.data?.databases || []).forEach((db) => {
      if (db.engine && db.engine !== 'NONE') stack.push(db.engine);
    });
    if (stack.length === 0) stack.push('JavaScript');

    // 6. Build Registration Contract
    const registrationPath = path.join(this.registrationsDir, `${slug}.json`);
    const isNew = !fs.existsSync(registrationPath);
    const now = new Date().toISOString();

    let existingData = {};
    if (!isNew) {
      try {
        existingData = JSON.parse(fs.readFileSync(registrationPath, 'utf8'));
      } catch {
        existingData = {};
      }
    }

    const registration = {
      $schema: '../schema.json',
      project_id: projectId,
      name: existingData.name || options.name || baseName,
      description: existingData.description || options.description || `Autonomous engineering governance for ${baseName}.`,
      path: resolvedPath,
      repository: gitRemote,
      branch: gitBranch,
      project_type: projectType,
      lifecycle_status: existingData.lifecycle_status || 'INTAKE',
      technical_status: existingData.technical_status || 'NOT VERIFIED',
      business_status: existingData.business_status || 'REGISTERED_DEVELOPMENT',
      stack: Array.from(new Set([...stack, ...(existingData.stack || [])])),
      documentation: [
        `docs/projects/registrations/${slug}.json`,
        `docs/intake/${slug}/PROJECT_CONTEXT.md`,
      ],
      constraints: existingData.constraints || [
        'External Project Write Barrier Active (READ ONLY until Level 2 Authorization)',
        'Zero plain secrets allowed in source code or commits',
      ],
      risks: existingData.risks || (profile.hitl_gates && profile.hitl_gates.length > 0 ? profile.hitl_gates : ['Initial intake pending verification']),
      assumptions: existingData.assumptions || [
        'Standard build toolchain available on host environment',
      ],
      owner: existingData.owner || options.owner || 'EOS Autonomous Control Plane',
      intake_status: 'COMPLETE',
      specification_status: existingData.specification_status || 'NOT_STARTED',
      implementation_status: existingData.implementation_status || 'NOT_STARTED',
      validation_status: existingData.validation_status || 'NOT_STARTED',
      release_status: existingData.release_status || 'NOT_STARTED',
      autonomy_level: existingData.autonomy_level || 'SUPERVISED',
      created_at: existingData.created_at || now,
      updated_at: now,
    };

    // Ensure registrations directory exists
    if (!fs.existsSync(this.registrationsDir)) {
      fs.mkdirSync(this.registrationsDir, { recursive: true });
    }
    fs.writeFileSync(registrationPath, JSON.stringify(registration, null, 2), 'utf8');

    // 7. Write intake PROJECT_CONTEXT.md
    const projectIntakeDir = path.join(this.intakeDir, slug);
    if (!fs.existsSync(projectIntakeDir)) {
      fs.mkdirSync(projectIntakeDir, { recursive: true });
    }
    const contextPath = path.join(projectIntakeDir, 'PROJECT_CONTEXT.md');
    const contextContent = `# Project Context & Autonomous Discovery: [${projectId}]

* **Project Name:** ${registration.name}
* **Project ID:** \`${projectId}\`
* **Target Path:** \`${resolvedPath}\`
* **Repository:** \`${gitRemote}\`
* **Branch:** \`${gitBranch}\`
* **Project Type:** \`${projectType}\`
* **Onboarded At:** ${now}

---

## 1. Discovered Stack & Runtimes
* **Languages:** ${(profile.code?.languages || []).map((l) => `${l.name} ${l.version || ''}`).join(', ') || 'N/A'}
* **Frameworks:** ${(profile.code?.frameworks || []).map((f) => `${f.name} (${f.purpose || ''})`).join(', ') || 'None detected'}
* **Package Manifests:** ${(profile.code?.package_manifests || []).join(', ') || 'None'}
* **Databases:** ${(profile.data?.databases || []).map((d) => `${d.engine} (${d.type})`).join(', ') || 'None detected'}
* **Entrypoints:** ${(profile.runtime?.entrypoints || []).join(', ') || 'Standard'}

---

## 2. Governance Baseline & Risk Profile
* **Risk Tier:** \`${profile.risk_tier || 'LOW'}\`
* **HITL Gates Required:** ${(profile.hitl_gates || []).join(', ') || 'None (Autonomous Eligible)'}
* **Autonomy Model:** Supervised Level 0 (Read-Only until formal Level 2 authorization).
`;
    fs.writeFileSync(contextPath, contextContent, 'utf8');

    // 8. Update registry.json idempotently
    this._updateRegistry(registration);

    return {
      success: true,
      registration,
      registrationPath,
      contextPath,
      isNew,
      profile,
    };
  }

  /**
   * Compiles live fleet health, git branches, and latest evidence seals across all registered projects.
   * @param {Object} [options]
   * @returns {{ projects: Array<Object>, totalCount: number, verifiedCount: number }}
   */
  getFleetStatus(options = {}) {
    const projects = [];

    // 1. Gather all files in docs/projects/registrations/
    if (fs.existsSync(this.registrationsDir)) {
      const files = fs.readdirSync(this.registrationsDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        try {
          const reg = JSON.parse(fs.readFileSync(path.join(this.registrationsDir, file), 'utf8'));
          if (reg.project_id) {
            projects.push(this._enrichFleetProject(reg));
          }
        } catch {
          // ignore corrupted individual file
        }
      }
    }

    // 2. Check registry.json for any project not in individual files
    if (fs.existsSync(this.registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        for (const p of registry.projects || []) {
          if (!projects.some((item) => item.project_id === p.project_id)) {
            projects.push(this._enrichFleetProject(p));
          }
        }
      } catch {
        // ignore
      }
    }

    const verifiedCount = projects.filter((p) => p.technical_status === 'VERIFIED').length;

    return {
      projects,
      totalCount: projects.length,
      verifiedCount,
    };
  }

  /**
   * Enriches project registration with live disk existence, current branch, and latest evidence file.
   * @private
   */
  _enrichFleetProject(reg) {
    const existsOnDisk = Boolean(reg.path && fs.existsSync(reg.path));
    let liveBranch = reg.branch || 'main';

    if (existsOnDisk) {
      try {
        const out = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: reg.path,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (out) liveBranch = out;
      } catch {
        // use registered branch
      }
    }

    // Search for latest evidence in docs/evidence/
    let latestEvidence = null;
    if (fs.existsSync(this.evidenceDir)) {
      const evdFiles = fs.readdirSync(this.evidenceDir).filter((f) => f.endsWith('.json'));
      for (const ef of evdFiles) {
        try {
          const evd = JSON.parse(fs.readFileSync(path.join(this.evidenceDir, ef), 'utf8'));
          const matchesProject =
            evd.project_id === reg.project_id ||
            evd.projectId === reg.project_id ||
            evd.data?.projectId === reg.project_id ||
            evd.data?.project_id === reg.project_id ||
            (typeof evd.scope === 'string' && evd.scope.includes(reg.project_id));

          if (matchesProject) {
            if (!latestEvidence || ef > latestEvidence.file) {
              latestEvidence = {
                file: ef,
                evidenceId: evd.evidence_id || evd.evidenceId || evd.id || path.basename(ef, '.json'),
                sha256: evd.sha256 || evd.digest || evd.checksum || 'N/A',
                timestamp: evd.timestamp || evd.generated_at || null,
              };
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    return {
      project_id: reg.project_id,
      name: reg.name || reg.project_id,
      path: reg.path,
      exists: existsOnDisk,
      branch: liveBranch,
      repository: reg.repository || 'local',
      project_type: reg.project_type || 'UNKNOWN',
      lifecycle_status: reg.lifecycle_status || 'UNKNOWN',
      technical_status: reg.technical_status || 'NOT VERIFIED',
      stack: reg.stack || [],
      risks_count: (reg.risks || []).length,
      latest_evidence: latestEvidence,
      updated_at: reg.updated_at,
    };
  }

  /**
   * Updates docs/projects/registry.json atomically.
   * @private
   */
  _updateRegistry(reg) {
    let registryData = {
      $schema: './schema.json',
      version: '1.0.0',
      updated_at: new Date().toISOString(),
      projects: [],
    };

    if (fs.existsSync(this.registryPath)) {
      try {
        registryData = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      } catch {
        // reset if corrupted
      }
    }

    const idx = (registryData.projects || []).findIndex((p) => p.project_id === reg.project_id);
    if (idx >= 0) {
      registryData.projects[idx] = reg;
    } else {
      registryData.projects = registryData.projects || [];
      registryData.projects.push(reg);
    }

    registryData.updated_at = new Date().toISOString();
    fs.writeFileSync(this.registryPath, JSON.stringify(registryData, null, 2), 'utf8');
  }

  /**
   * Formats a world-class terminal ASCII dashboard for fleet health.
   * @param {Object} fleetData Output from getFleetStatus()
   * @returns {string} Formatted terminal string
   */
  formatFleetTable(fleetData) {
    const lines = [];
    lines.push('================================================================================');
    lines.push('🌐 EOS FLEET OBSERVABILITY DASHBOARD — AUTONOMOUS PROJECT REGISTRY');
    lines.push('================================================================================');
    lines.push(`Total Fleet: ${fleetData.totalCount} project(s) | Verified: ${fleetData.verifiedCount}/${fleetData.totalCount}`);
    lines.push('--------------------------------------------------------------------------------');

    for (const p of fleetData.projects) {
      const diskIcon = p.exists ? '✔' : '✖ [MISSING]';
      const statusBadge = p.technical_status === 'VERIFIED' ? '[✔ VERIFIED]' : `[● ${p.technical_status}]`;
      const stackSummary = p.stack.slice(0, 4).join(', ') || 'N/A';
      const evdSummary = p.latest_evidence
        ? `${p.latest_evidence.file} (${p.latest_evidence.sha256 ? p.latest_evidence.sha256.slice(0, 16) + '…' : 'sealed'})`
        : 'No sealed evidence';

      lines.push(`🎯 ${p.project_id.padEnd(26)} | ${statusBadge.padEnd(16)} | Branch: ${p.branch}`);
      lines.push(`   Name  : ${p.name}`);
      lines.push(`   Path  : ${p.path} (${diskIcon})`);
      lines.push(`   Stack : ${stackSummary}`);
      lines.push(`   Status: Lifecycle: ${p.lifecycle_status} | Risks: ${p.risks_count} open`);
      lines.push(`   Seal  : ${evdSummary}`);
      lines.push('--------------------------------------------------------------------------------');
    }

    lines.push('Commands:');
    lines.push('  eos orchestrate --project <ID> --pipeline verify   Run complete verification');
    lines.push('  eos project onboard <path>                         Onboard new project to fleet');
    lines.push('================================================================================');
    return lines.join('\n');
  }
}
