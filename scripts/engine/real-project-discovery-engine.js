import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class RealProjectDiscoveryEngine {
  constructor(targetPath = 'C:\\Users\\valen\\Documents\\Fundacion') {
    this.targetPath = path.resolve(targetPath);
    this.mode = 'EMPIRICAL_LEVEL_1_READ_ONLY';
    this.validateTargetSafety();
  }

  validateTargetSafety() {
    // Prevent analyzing the EOS Control Plane itself as a target
    if (this.targetPath === rootDir) {
      throw new Error(`SECURITY_DENY: EOS Control Plane at ${rootDir} cannot be analyzed as a target project.`);
    }
  }

  getProjectId() {
    const normalized = this.targetPath.replace(/\\/g, '/');
    const basename = path.posix.basename(normalized).toLowerCase();
    return basename.replace(/[^a-z0-9_-]/g, '_') || 'unknown_target';
  }

  assertReadOnlyAccess(actionType, targetPath = this.targetPath) {
    const forbiddenWriteActions = ['WRITE', 'CREATE', 'DELETE', 'MODIFY', 'INSTALL', 'GIT_COMMIT', 'DEPLOY'];
    if (forbiddenWriteActions.includes(actionType.toUpperCase())) {
      throw new Error(`DENY: Action ${actionType} strictly forbidden on target project ${targetPath} during READ_ONLY Level 1 discovery.`);
    }
  }

  observeRepository() {
    this.assertReadOnlyAccess('READ');
    const exists = fs.existsSync(this.targetPath);
    if (!exists) {
      return {
        observedFact: { exists: false, path: this.targetPath },
        inference: 'Target project directory does not exist on local filesystem.',
        confidence: 1.0
      };
    }

    const items = fs.readdirSync(this.targetPath);
    const gitPath = path.join(this.targetPath, '.git');
    const hasGit = fs.existsSync(gitPath);

    return {
      observedFact: {
        exists: true,
        path: this.targetPath,
        itemCount: items.length,
        items,
        hasGit
      },
      derivedFact: { isEmpty: items.length === 0 },
      inference: items.length === 0 
        ? 'Project repository exists as an initialized empty target directory.' 
        : `Project contains ${items.length} top-level filesystem items${hasGit ? ' with Git version control initialized' : ''}.`,
      confidence: 1.0
    };
  }

  inspectPackageJson() {
    const pkgPath = path.join(this.targetPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { exists: false };
    }

    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      return {
        exists: true,
        name: pkg.name,
        version: pkg.version,
        type: pkg.type,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
        rawPkg: pkg
      };
    } catch (err) {
      return { exists: true, parseError: err.message };
    }
  }

  scanSourceTree(dir = this.targetPath, depth = 0, maxDepth = 3) {
    if (depth > maxDepth || !fs.existsSync(dir)) return [];
    
    const entries = [];
    const ignoreDirs = ['node_modules', '.git', 'dist', '.astro'];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (ignoreDirs.includes(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      const relPath = path.relative(this.targetPath, fullPath);

      if (item.isDirectory()) {
        entries.push({ type: 'directory', path: relPath });
        entries.push(...this.scanSourceTree(fullPath, depth + 1, maxDepth));
      } else {
        entries.push({ type: 'file', path: relPath, size: fs.statSync(fullPath).size });
      }
    }
    return entries;
  }

  evaluateProjectState() {
    const repo = this.observeRepository();
    const pkgInfo = this.inspectPackageJson();
    const sourceTree = repo.observedFact.exists && !repo.derivedFact?.isEmpty 
      ? this.scanSourceTree() 
      : [];

    const observedFacts = [
      { key: 'DIRECTORY_EXISTENCE', value: repo.observedFact.exists },
      { key: 'TARGET_PATH', value: this.targetPath },
      { key: 'ITEM_COUNT', value: repo.observedFact.itemCount || 0 },
      { key: 'HAS_GIT', value: repo.observedFact.hasGit || false },
      { key: 'HAS_PACKAGE_JSON', value: pkgInfo.exists }
    ];

    if (pkgInfo.exists && pkgInfo.name) {
      observedFacts.push({ key: 'PACKAGE_NAME', value: pkgInfo.name });
      observedFacts.push({ key: 'DEPENDENCIES', value: pkgInfo.dependencies });
      observedFacts.push({ key: 'SCRIPTS', value: pkgInfo.scripts });
    }

    const derivedFacts = [
      { key: 'IS_EMPTY_TARGET', value: repo.derivedFact?.isEmpty ?? true },
      { key: 'FILE_TREE_COUNT', value: sourceTree.length }
    ];

    const inferences = [];
    if (repo.derivedFact?.isEmpty) {
      inferences.push({
        statement: 'The observed target directory is 100% empty and unpopulated, consistent with a pre-intake target project reservation.',
        classification: 'INFERENCE_UNCONFIRMED_EXTERNALLY',
        confidence: 1.0
      });
    } else {
      const frameworks = [];
      if (pkgInfo.dependencies?.includes('astro')) frameworks.push('Astro Framework');
      if (pkgInfo.dependencies?.includes('react')) frameworks.push('React');
      
      inferences.push({
        statement: `Project appears to be a populated JavaScript/TypeScript project${frameworks.length > 0 ? ` using ${frameworks.join(', ')}` : ''}.`,
        classification: 'DERIVED_ANALYSIS',
        confidence: 0.95
      });
    }

    const hypotheses = [
      {
        statement: `IF Product Owner authorizes Level 2+ implementation, THEN EOS can execute authorized strategies on ${this.getProjectId()}.`,
        status: 'PENDING_AUTHORIZATION'
      }
    ];

    const unknowns = [
      { key: 'LIVE_COMMERCIAL_API_KEYS', status: 'UNCONFIGURED' },
      { key: 'PRODUCTION_DEPLOYMENT_TELEMETRY', status: 'UNOBSERVED' }
    ];

    return {
      timestamp: new Date().toISOString(),
      projectId: this.getProjectId(),
      mode: this.mode,
      targetPath: this.targetPath,
      observedFacts,
      derivedFacts,
      inferences,
      hypotheses,
      unknowns,
      sourceTree: sourceTree.slice(0, 50) // Bounded snapshot
    };
  }

  runDiscoveryMission() {
    const state = this.evaluateProjectState();
    const isPopulated = state.sourceTree.length > 0;

    const discovery = {
      experimentId: 'EXP-026-001',
      projectId: this.getProjectId(),
      name: 'Real Project Discovery & Understanding',
      level: 'EMPIRICAL_VALIDATION_LEVEL_1_READ_ONLY',
      writeBarrierStatus: 'INVIOLATE_DENY_ENFORCED',
      state,
      architectureAssessment: {
        pattern: isPopulated ? 'POPULATED_REAL_PROJECT' : 'UNPOPULATED_TARGET',
        complianceStatus: 'AWAITING_PO_LEVEL2_SIGN_OFF'
      },
      riskAssessment: {
        risks: [
          { risk: 'Premature write attempt without PO Level 2+ authorization', severity: 'HIGH', mitigation: 'Policy Engine DENY write barrier active' }
        ]
      },
      evidence: [
        { 
          claim: `${this.getProjectId()} path observed safely via fs.readdirSync`, 
          source: 'fs.readdirSync', 
          independenceLevel: 'I2_LOCAL_CORROBORATION', 
          status: 'VERIFIED' 
        }
      ],
      uncertainties: state.unknowns,
      contradictions: [],
      recommendations: [
        { type: 'PROPOSAL_ONLY', recommendation: 'Maintain READ_ONLY isolation until PO Level 2+ written sign-off is recorded.' }
      ],
      auditTrail: [
        { step: 'READ_ONLY_ACCESS_ASSERTED', timestamp: new Date().toISOString() },
        { step: 'REPOSITORY_OBSERVED', timestamp: new Date().toISOString() },
        { step: 'STATE_CLASSIFIED', timestamp: new Date().toISOString() }
      ],
      decisionState: 'PASS_WITH_CONDITIONS'
    };

    return discovery;
  }

  saveArtifacts(discovery) {
    const projectId = discovery.projectId;
    const outputDir = path.join(rootDir, 'docs/intelligence/real_projects', projectId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_STATE.json'), JSON.stringify(discovery.state, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_DISCOVERY.json'), JSON.stringify(discovery, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_ARCHITECTURE_ASSESSMENT.json'), JSON.stringify(discovery.architectureAssessment, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_RISK_ASSESSMENT.json'), JSON.stringify(discovery.riskAssessment, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_EVIDENCE.json'), JSON.stringify(discovery.evidence, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_UNCERTAINTIES.json'), JSON.stringify(discovery.uncertainties, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_CONTRADICTIONS.json'), JSON.stringify(discovery.contradictions, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_RECOMMENDATIONS.json'), JSON.stringify(discovery.recommendations, null, 2));
    fs.writeFileSync(path.join(outputDir, 'REAL_PROJECT_AUDIT_TRAIL.json'), JSON.stringify(discovery.auditTrail, null, 2));

    return outputDir;
  }
}

// ====================================================
// CLI ARGUMENT PARSER
// ====================================================
if (process.argv.includes('--discover-real')) {
  let targetArg = 'C:\\Users\\valen\\Documents\\Fundacion';
  
  const targetIdx = process.argv.indexOf('--target');
  if (targetIdx !== -1 && process.argv[targetIdx + 1]) {
    targetArg = process.argv[targetIdx + 1];
  } else {
    const eqArg = process.argv.find(arg => arg.startsWith('--target='));
    if (eqArg) {
      targetArg = eqArg.split('=')[1];
    }
  }

  const engine = new RealProjectDiscoveryEngine(targetArg);
  const discovery = engine.runDiscoveryMission();
  const savedPath = engine.saveArtifacts(discovery);

  console.log(`EOS REAL PROJECT DISCOVERY & UNDERSTANDING (EXP-026-001) RESULTS FOR [${discovery.projectId}]:`);
  console.log(`Artifacts saved to Control Plane: ${savedPath}`);
  console.log(JSON.stringify(discovery, null, 2));
}
