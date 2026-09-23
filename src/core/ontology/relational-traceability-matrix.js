/**
 * @module RelationalTraceabilityMatrix
 * @description Enterprise Relational Traceability Matrix (RTM) & Causal Blast Radius Engine for EOS.
 * Formalizes bidirectional 7-layer lineage (L0 Intake ↔ L1 Spec ↔ L2 Plan ↔ L3 Task ↔ L4 Code ↔ L5 Test ↔ L6 Evidence)
 * and computes multi-layer transitive blast radius with deterministic risk tiering.
 *
 * Implements SPEC-EOS-004 / IEEE 830 / ISO 26262 compliant traceability.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CausalAstEngine } from '../ast/causal-ast-engine.js';
import { resolveControlPlaneRoot } from '../runtime/control-plane-root.js';

export const TRACE_LAYERS = Object.freeze({
  L0_INTAKE: 'L0_INTAKE',
  L1_SPEC: 'L1_SPEC',
  L2_PLAN: 'L2_PLAN',
  L3_TASK: 'L3_TASK',
  L4_CODE: 'L4_CODE',
  L5_TEST: 'L5_TEST',
  L6_EVIDENCE: 'L6_EVIDENCE'
});

export const RELATION_TYPES = Object.freeze({
  // L0 <-> L1
  DERIVED_FROM: 'DERIVED_FROM',
  INFORMS: 'INFORMS',
  // L1 <-> L2
  ARCHITECTED_BY: 'ARCHITECTED_BY',
  DECIDED_IN: 'DECIDED_IN',
  // L2 <-> L3
  DECOMPOSED_INTO: 'DECOMPOSED_INTO',
  SCHEDULES: 'SCHEDULES',
  // L3 <-> L4
  IMPLEMENTED_BY: 'IMPLEMENTED_BY',
  MUTATES: 'MUTATES',
  // L4 <-> L4
  IMPORTS: 'IMPORTS',
  IMPORTED_BY: 'IMPORTED_BY',
  // L4 <-> L5
  VERIFIED_BY: 'VERIFIED_BY',
  COVERS: 'COVERS',
  // L5 <-> L6
  SEALED_BY: 'SEALED_BY',
  CERTIFIES: 'CERTIFIES'
});

export const RISK_TIERS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

const DEFAULT_REVERSE_RELATIONS = {
  [RELATION_TYPES.DERIVED_FROM]: RELATION_TYPES.INFORMS,
  [RELATION_TYPES.INFORMS]: RELATION_TYPES.DERIVED_FROM,
  [RELATION_TYPES.ARCHITECTED_BY]: RELATION_TYPES.DECIDED_IN,
  [RELATION_TYPES.DECIDED_IN]: RELATION_TYPES.ARCHITECTED_BY,
  [RELATION_TYPES.DECOMPOSED_INTO]: RELATION_TYPES.SCHEDULES,
  [RELATION_TYPES.SCHEDULES]: RELATION_TYPES.DECOMPOSED_INTO,
  [RELATION_TYPES.IMPLEMENTED_BY]: RELATION_TYPES.MUTATES,
  [RELATION_TYPES.MUTATES]: RELATION_TYPES.IMPLEMENTED_BY,
  [RELATION_TYPES.IMPORTS]: RELATION_TYPES.IMPORTED_BY,
  [RELATION_TYPES.IMPORTED_BY]: RELATION_TYPES.IMPORTS,
  [RELATION_TYPES.VERIFIED_BY]: RELATION_TYPES.COVERS,
  [RELATION_TYPES.COVERS]: RELATION_TYPES.VERIFIED_BY,
  [RELATION_TYPES.SEALED_BY]: RELATION_TYPES.CERTIFIES,
  [RELATION_TYPES.CERTIFIES]: RELATION_TYPES.SEALED_BY
};

export class RelationalTraceabilityMatrix {
  /**
   * @param {object} [options]
   * @param {string} [options.controlPlaneRoot]
   * @param {string} [options.baseDir]
   */
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || resolveControlPlaneRoot();
    this.baseDir = options.baseDir || this.controlPlaneRoot;
    this.nodes = new Map(); // nodeId -> TraceNode
    this.forwardEdges = new Map(); // sourceId -> Array<{ target: string, relation: string }>
    this.reverseEdges = new Map(); // targetId -> Array<{ source: string, relation: string }>
    this.astEngine = new CausalAstEngine({ baseDir: this.controlPlaneRoot });
  }

  /**
   * Clears the current in-memory graph
   */
  clear() {
    this.nodes.clear();
    this.forwardEdges.clear();
    this.reverseEdges.clear();
  }

  /**
   * Registers a node in the traceability matrix
   * @param {object} node
   * @param {string} node.id
   * @param {string} node.layer
   * @param {string} node.type
   * @param {string} [node.title]
   * @param {string} [node.path]
   * @param {string} [node.sha256]
   * @param {object} [node.metadata]
   * @returns {object} The stored node
   */
  addNode(node) {
    if (!node || !node.id || !node.layer) {
      throw new Error(`INVALID_TRACE_NODE: id and layer are required. Got: ${JSON.stringify(node)}`);
    }

    if (!Object.values(TRACE_LAYERS).includes(node.layer)) {
      throw new Error(`INVALID_TRACE_LAYER: '${node.layer}' is not a valid TRACE_LAYER.`);
    }

    const normalized = {
      id: node.id,
      layer: node.layer,
      type: node.type || 'GENERIC_ENTITY',
      title: node.title || node.id,
      path: node.path ? node.path.replace(/\\/g, '/') : null,
      sha256: node.sha256 || null,
      metadata: node.metadata || {},
      created_at: new Date().toISOString()
    };

    this.nodes.set(normalized.id, normalized);
    return normalized;
  }

  /**
   * Fluent alias for addNode
   */
  registerNode(node) {
    return this.addNode(node);
  }

  /**
   * Creates a bidirectional relation between two nodes
   * @param {string} sourceId
   * @param {string} targetId
   * @param {string} relation
   * @param {string} [reverseRelation]
   */
  addEdge(sourceId, targetId, relation, reverseRelation) {
    if (!sourceId || !targetId || !relation) return;

    if (!this.forwardEdges.has(sourceId)) {
      this.forwardEdges.set(sourceId, []);
    }
    const forwardList = this.forwardEdges.get(sourceId);
    if (!forwardList.some(e => e.target === targetId && e.relation === relation)) {
      forwardList.push({ target: targetId, relation });
    }

    const revRel = reverseRelation || DEFAULT_REVERSE_RELATIONS[relation] || 'RELATED_TO';
    if (!this.reverseEdges.has(targetId)) {
      this.reverseEdges.set(targetId, []);
    }
    const reverseList = this.reverseEdges.get(targetId);
    if (!reverseList.some(e => e.source === sourceId && e.relation === revRel)) {
      reverseList.push({ source: sourceId, relation: revRel });
    }
  }

  /**
   * Fluent alias for addEdge
   */
  connect(sourceId, targetId, relation, reverseRelation) {
    return this.addEdge(sourceId, targetId, relation, reverseRelation);
  }

  /**
   * Discovers and registers project registration and context
   * @param {string} projectId
   * @returns {object|null} Project registration object
   */
  _resolveProject(projectId) {
    if (!projectId) return null;
    const cleanId = projectId.toUpperCase().trim();

    // 1. Check docs/projects/registrations/*.json
    const regDir = path.join(this.controlPlaneRoot, 'docs', 'projects', 'registrations');
    if (fs.existsSync(regDir)) {
      const files = fs.readdirSync(regDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = JSON.parse(fs.readFileSync(path.join(regDir, file), 'utf8'));
          const pId = (content.project_id || content.projectId || '').toUpperCase();
          if (pId === cleanId || file.replace('.json', '').toUpperCase() === cleanId.replace('PRJ-', '')) {
            return content;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // 2. Check docs/projects/registry.json
    const registryPath = path.join(this.controlPlaneRoot, 'docs', 'projects', 'registry.json');
    if (fs.existsSync(registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const found = (registry.projects || []).find(p => (p.project_id || '').toUpperCase() === cleanId);
        if (found) return found;
      } catch {
        // Ignore parse errors
      }
    }

    return null;
  }

  /**
   * Helper to compute SHA-256 hash of a file or string
   * @param {string} contentOrPath
   * @param {boolean} [isFile=false]
   * @returns {string}
   */
  _sha256(contentOrPath, isFile = false) {
    const hash = crypto.createHash('sha256');
    if (isFile) {
      // PERF: Replacing TOCTOU (existsSync followed by readFileSync) with direct read and try/catch.
      // This is measurably faster as it avoids an extra syscall to the filesystem.
      try {
        hash.update(fs.readFileSync(contentOrPath));
        return hash.digest('hex');
      } catch (err) {
        if (err.code === 'ENOENT') {
          return '0000000000000000000000000000000000000000000000000000000000000000';
        }
        throw err;
      }
    }
    hash.update(contentOrPath);
    return hash.digest('hex');
  }

  /**
   * Builds the comprehensive 7-layer traceability matrix for a given project
   * @param {string} projectId
   * @param {object} [options]
   * @returns {object} Matrix build summary and relational data
   */
  buildProjectMatrix(projectId = 'PRJ-EOS-CONTROL-PLANE', options = {}) {
    this.clear();
    const resolvedInput = projectId || 'PRJ-EOS-CONTROL-PLANE';
    const project = this._resolveProject(resolvedInput);
    const resolvedId = project ? project.project_id : resolvedInput;
    const projectSlug = (resolvedId || 'eos-control-plane').toLowerCase().replace(/^prj-/, '');
    this.currentProjectId = resolvedId;

    // -------------------------------------------------------------------------
    // L0: INTAKE LAYER
    // -------------------------------------------------------------------------
    const intakeDir = path.join(this.controlPlaneRoot, 'docs', 'intake', projectSlug);
    const intakeFiles = [];
    if (fs.existsSync(intakeDir)) {
      const entries = fs.readdirSync(intakeDir);
      for (const entry of entries) {
        if (entry.endsWith('.md') || entry.endsWith('.json')) {
          intakeFiles.push(path.join(intakeDir, entry));
        }
      }
    }

    // Check project documentation array if empty
    if (intakeFiles.length === 0 && project?.documentation) {
      for (const doc of project.documentation) {
        if (doc.includes('intake')) {
          const fullDoc = path.resolve(this.controlPlaneRoot, doc);
          if (fs.existsSync(fullDoc)) intakeFiles.push(fullDoc);
        }
      }
    }

    const intakeNodeIds = [];
    if (intakeFiles.length > 0) {
      for (const file of intakeFiles) {
        const relPath = path.relative(this.controlPlaneRoot, file).replace(/\\/g, '/');
        const nodeId = `ITK-${projectSlug.toUpperCase()}-${path.basename(file, path.extname(file)).toUpperCase()}`;
        this.addNode({
          id: nodeId,
          layer: TRACE_LAYERS.L0_INTAKE,
          type: 'INTAKE_CONTEXT',
          title: `Intake: ${path.basename(file)}`,
          path: relPath,
          sha256: this._sha256(file, true),
          metadata: { project_id: resolvedId }
        });
        intakeNodeIds.push(nodeId);
      }
    } else {
      // Fallback synthetic root intake node
      const fallbackId = `ITK-${projectSlug.toUpperCase()}-ROOT`;
      this.addNode({
        id: fallbackId,
        layer: TRACE_LAYERS.L0_INTAKE,
        type: 'INTAKE_CONTEXT',
        title: `Intake Context for ${resolvedId}`,
        path: `docs/intake/${projectSlug}/PROJECT_CONTEXT.md`,
        metadata: { project_id: resolvedId, synthetic: true }
      });
      intakeNodeIds.push(fallbackId);
    }

    // -------------------------------------------------------------------------
    // L1: SPECIFICATIONS LAYER (EARS Specs)
    // -------------------------------------------------------------------------
    const specCandidates = [];
    const specsDir = path.join(this.controlPlaneRoot, 'docs', 'specs');
    const projectSpecsDir = path.join(specsDir, projectSlug);

    const scanSpecs = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.endsWith('.md')) {
          specCandidates.push(full);
        }
      }
    };

    scanSpecs(projectSpecsDir);
    scanSpecs(specsDir);

    const specNodeIds = [];
    const specContents = new Map();
    for (const specFile of specCandidates) {
      try {
        const content = fs.readFileSync(specFile, 'utf8');
        // Match project relevance or SPEC identifier
        const isProjectMatch = content.includes(resolvedId) ||
          content.toLowerCase().includes(projectSlug) ||
          specFile.includes(projectSlug);

        if (isProjectMatch || resolvedId === 'PRJ-EOS-CONTROL-PLANE') {
          const specMatch = content.match(/\[?(SPEC-[A-Z0-9-]+)\]?/i);
          const specId = specMatch ? specMatch[1].toUpperCase() : `SPEC-${path.basename(specFile, '.md').toUpperCase()}`;
          const relPath = path.relative(this.controlPlaneRoot, specFile).replace(/\\/g, '/');

          if (!this.nodes.has(specId)) {
            this.addNode({
              id: specId,
              layer: TRACE_LAYERS.L1_SPEC,
              type: 'EARS_SPEC',
              title: `Spec: ${path.basename(specFile, '.md')}`,
              path: relPath,
              sha256: this._sha256(specFile, true),
              metadata: { project_id: resolvedId }
            });
            specNodeIds.push(specId);
            specContents.set(specId, content);

            // Connect L0 <-> L1 (Intake informs Spec - surgical matching)
            const matchedIntakes = intakeNodeIds.filter(itkId => {
              const itkNode = this.nodes.get(itkId);
              const itkBase = itkNode?.path ? path.basename(itkNode.path) : '';
              const itkSlug = itkId.replace(/^ITK-[A-Z0-9_-]+-/, '');
              return content.includes(itkId) ||
                (itkBase && content.includes(itkBase)) ||
                (itkSlug && content.toLowerCase().includes(itkSlug.toLowerCase()));
            });

            if (matchedIntakes.length > 0) {
              for (const itkId of matchedIntakes) {
                this.addEdge(itkId, specId, RELATION_TYPES.INFORMS, RELATION_TYPES.DERIVED_FROM);
              }
            } else if (intakeNodeIds.length <= 2) {
              for (const itkId of intakeNodeIds) {
                this.addEdge(itkId, specId, RELATION_TYPES.INFORMS, RELATION_TYPES.DERIVED_FROM);
              }
            } else {
              const rootIntake = intakeNodeIds.find(id => id.includes('ROOT') || id.includes('CONTEXT')) || intakeNodeIds[0];
              if (rootIntake) {
                this.addEdge(rootIntake, specId, RELATION_TYPES.INFORMS, RELATION_TYPES.DERIVED_FROM);
              }
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // -------------------------------------------------------------------------
    // L2: ARCHITECTURE PLANS & ADRs
    // -------------------------------------------------------------------------
    const plansDir = path.join(this.controlPlaneRoot, 'docs', 'plans');
    const adrsDir = path.join(this.controlPlaneRoot, 'docs', 'architecture', 'adrs');
    const planCandidates = [];

    const scanPlans = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith('.md')) planCandidates.push(path.join(dir, entry));
      }
    };
    scanPlans(plansDir);
    scanPlans(adrsDir);

    const planNodeIds = [];
    const planContents = new Map();
    for (const planFile of planCandidates) {
      try {
        const content = fs.readFileSync(planFile, 'utf8');
        const matchesProject = content.includes(resolvedId) ||
          content.toLowerCase().includes(projectSlug) ||
          specNodeIds.some(sId => content.includes(sId));

        if (matchesProject || resolvedId === 'PRJ-EOS-CONTROL-PLANE') {
          const planMatch = content.match(/\[?(PLAN-[A-Z0-9-]+|ADR-[A-Z0-9-]+)\]?/i);
          const planId = planMatch ? planMatch[1].toUpperCase() : `PLAN-${path.basename(planFile, '.md').toUpperCase()}`;
          const relPath = path.relative(this.controlPlaneRoot, planFile).replace(/\\/g, '/');

          if (!this.nodes.has(planId)) {
            this.addNode({
              id: planId,
              layer: TRACE_LAYERS.L2_PLAN,
              type: planFile.includes('adr') ? 'ADR' : 'ARCHITECTURE_PLAN',
              title: `Plan: ${path.basename(planFile, '.md')}`,
              path: relPath,
              sha256: this._sha256(planFile, true),
              metadata: { project_id: resolvedId }
            });
            planNodeIds.push(planId);
            planContents.set(planId, content);

            // Connect L1 <-> L2 (Spec architected into Plan - surgical matching)
            const matchedSpecs = specNodeIds.filter(sId => {
              const sBase = sId.replace(/^SPEC-/, '');
              return content.includes(sId) || (sBase.length > 3 && content.includes(sBase));
            });

            if (matchedSpecs.length > 0) {
              for (const sId of matchedSpecs) {
                this.addEdge(sId, planId, RELATION_TYPES.ARCHITECTED_BY, RELATION_TYPES.DECIDED_IN);
              }
            } else if (specNodeIds.length <= 2) {
              for (const sId of specNodeIds) {
                this.addEdge(sId, planId, RELATION_TYPES.ARCHITECTED_BY, RELATION_TYPES.DECIDED_IN);
              }
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // -------------------------------------------------------------------------
    // L3: ATOMIC TASK DAG
    // -------------------------------------------------------------------------
    const tasksDir = path.join(this.controlPlaneRoot, 'docs', 'tasks');
    const taskCandidates = [];
    if (fs.existsSync(tasksDir)) {
      for (const entry of fs.readdirSync(tasksDir)) {
        if (entry.endsWith('.md') || entry.endsWith('.json')) {
          taskCandidates.push(path.join(tasksDir, entry));
        }
      }
    }

    const taskNodeIds = [];
    const taskContents = new Map();
    for (const taskFile of taskCandidates) {
      try {
        const content = fs.readFileSync(taskFile, 'utf8');
        const matchesProject = content.includes(resolvedId) ||
          content.toLowerCase().includes(projectSlug) ||
          planNodeIds.some(pId => content.includes(pId));

        if (matchesProject || resolvedId === 'PRJ-EOS-CONTROL-PLANE') {
          const taskMatch = content.match(/\[?(TASK-[A-Z0-9-]+|TSK-[A-Z0-9-]+)\]?/i);
          const taskId = taskMatch ? taskMatch[1].toUpperCase() : `TASK-${path.basename(taskFile, path.extname(taskFile)).toUpperCase()}`;
          const relPath = path.relative(this.controlPlaneRoot, taskFile).replace(/\\/g, '/');

          if (!this.nodes.has(taskId)) {
            this.addNode({
              id: taskId,
              layer: TRACE_LAYERS.L3_TASK,
              type: 'TASK_DAG',
              title: `Task DAG: ${path.basename(taskFile)}`,
              path: relPath,
              sha256: this._sha256(taskFile, true),
              metadata: { project_id: resolvedId }
            });
            taskNodeIds.push(taskId);
            taskContents.set(taskId, content);

            // Connect L2 <-> L3 (Plan decomposed into Task - surgical matching)
            const matchedPlans = planNodeIds.filter(pId => {
              const pBase = pId.replace(/^(PLAN|ADR)-/, '');
              return content.includes(pId) || (pBase.length > 3 && content.includes(pBase));
            });

            if (matchedPlans.length > 0) {
              for (const pId of matchedPlans) {
                this.addEdge(pId, taskId, RELATION_TYPES.DECOMPOSED_INTO, RELATION_TYPES.SCHEDULES);
              }
            } else if (planNodeIds.length <= 2) {
              for (const pId of planNodeIds) {
                this.addEdge(pId, taskId, RELATION_TYPES.DECOMPOSED_INTO, RELATION_TYPES.SCHEDULES);
              }
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // -------------------------------------------------------------------------
    // L4: SOURCE CODE & L5: TEST SUITES
    // -------------------------------------------------------------------------
    let targetCodeRoot = this.controlPlaneRoot;
    if (project?.path && fs.existsSync(project.path) && resolvedId !== 'PRJ-EOS-CONTROL-PLANE') {
      targetCodeRoot = project.path;
    }

    // Build AST dependency graph
    this.astEngine.buildGraph(targetCodeRoot);

    const codeNodeIds = [];
    const testNodeIds = [];

    // Classify AST files into L4 (Source Code) vs L5 (Test Suites)
    for (const [filePath] of this.astEngine.dependencyGraph.entries()) {
      const isTest = filePath.includes('test') ||
        filePath.includes('__tests__') ||
        filePath.endsWith('.test.js') ||
        filePath.endsWith('.test.ts') ||
        filePath.endsWith('.spec.js') ||
        filePath.endsWith('.spec.ts');

      const fullPath = path.resolve(targetCodeRoot, filePath);
      const nodeId = `FILE:${filePath}`;

      if (isTest) {
        this.addNode({
          id: nodeId,
          layer: TRACE_LAYERS.L5_TEST,
          type: 'TEST_SUITE',
          title: `Test: ${path.basename(filePath)}`,
          path: filePath,
          sha256: this._sha256(fullPath, true),
          metadata: { project_id: resolvedId }
        });
        testNodeIds.push(nodeId);
      } else {
        this.addNode({
          id: nodeId,
          layer: TRACE_LAYERS.L4_CODE,
          type: 'SOURCE_CODE',
          title: `Source: ${path.basename(filePath)}`,
          path: filePath,
          sha256: this._sha256(fullPath, true),
          metadata: { project_id: resolvedId }
        });
        codeNodeIds.push(nodeId);
      }
    }

    // Connect L3 <-> L4 (Tasks implement code - surgical path and name matching)
    for (const taskId of taskNodeIds) {
      const taskContent = taskContents.get(taskId) || '';
      const matchedCodes = [];

      for (const codeId of codeNodeIds) {
        const codeNode = this.nodes.get(codeId);
        const codePath = (codeNode?.path || '').replace(/\\/g, '/');
        const codeBase = path.basename(codePath);

        if (taskContent.includes(codePath) || (codeBase.length > 5 && taskContent.includes(codeBase))) {
          matchedCodes.push(codeId);
        }
      }

      if (matchedCodes.length > 0) {
        for (const codeId of matchedCodes) {
          this.addEdge(taskId, codeId, RELATION_TYPES.IMPLEMENTED_BY, RELATION_TYPES.MUTATES);
        }
      } else if (codeNodeIds.length <= 2) {
        for (const codeId of codeNodeIds) {
          this.addEdge(taskId, codeId, RELATION_TYPES.IMPLEMENTED_BY, RELATION_TYPES.MUTATES);
        }
      }
    }

    // Link L4 <-> L4 via imports
    for (const [filePath, imports] of this.astEngine.dependencyGraph.entries()) {
      const sourceNodeId = `FILE:${filePath}`;
      for (const imp of imports) {
        const targetNodeId = `FILE:${imp}`;
        if (this.nodes.has(targetNodeId)) {
          this.addEdge(sourceNodeId, targetNodeId, RELATION_TYPES.IMPORTS, RELATION_TYPES.IMPORTED_BY);
        }
      }
    }

    // Link L4 <-> L5 (Tests cover code)
    for (const testId of testNodeIds) {
      const testPath = this.nodes.get(testId).path;
      // 1. Direct AST imports from test to code
      const imports = Array.from(this.astEngine.dependencyGraph.get(testPath) || []);
      for (const imp of imports) {
        const codeId = `FILE:${imp}`;
        if (this.nodes.has(codeId) && this.nodes.get(codeId).layer === TRACE_LAYERS.L4_CODE) {
          this.addEdge(codeId, testId, RELATION_TYPES.VERIFIED_BY, RELATION_TYPES.COVERS);
        }
      }

      // 2. Name-based heuristic matching (e.g. tests/foo.test.js covers src/foo.js)
      const baseName = path.basename(testPath).replace(/\.(test|spec)\.[a-z]+$/, '');
      for (const codeId of codeNodeIds) {
        const codePath = this.nodes.get(codeId).path;
        if (path.basename(codePath, path.extname(codePath)) === baseName) {
          this.addEdge(codeId, testId, RELATION_TYPES.VERIFIED_BY, RELATION_TYPES.COVERS);
        }
      }
    }

    // -------------------------------------------------------------------------
    // L6: CRYPTOGRAPHIC EVIDENCE LAYER
    // -------------------------------------------------------------------------
    const evidenceDir = path.join(this.controlPlaneRoot, 'docs', 'evidence');
    const evidenceNodeIds = [];

    if (fs.existsSync(evidenceDir)) {
      const files = fs.readdirSync(evidenceDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fullEvidencePath = path.join(evidenceDir, file);
        try {
          const evd = JSON.parse(fs.readFileSync(fullEvidencePath, 'utf8'));
          const isEvdMatch = evd.data?.projectId === resolvedId ||
            evd.scope?.includes(resolvedId) ||
            file.toLowerCase().includes(projectSlug);

          if (isEvdMatch || resolvedId === 'PRJ-EOS-CONTROL-PLANE') {
            const evdId = evd.id || evd.evidenceId || `EVD-${path.basename(file, '.json')}`;
            const relPath = path.relative(this.controlPlaneRoot, fullEvidencePath).replace(/\\/g, '/');

            this.addNode({
              id: evdId,
              layer: TRACE_LAYERS.L6_EVIDENCE,
              type: 'EVIDENCE_RECEIPT',
              title: `Evidence [${evdId}]: ${evd.claim || evd.action || 'Audit Receipt'}`,
              path: relPath,
              sha256: evd.sha256 || evd.digest || this._sha256(fullEvidencePath, true),
              metadata: {
                project_id: resolvedId,
                status: evd.status || 'VERIFIED',
                actor: evd.actor,
                timestamp: evd.timestamp
              }
            });
            evidenceNodeIds.push(evdId);

            // Connect L5 <-> L6 and L4 <-> L6 via proxyResults or targeted context matching
            let hasSpecificLinks = false;
            if (evd.data?.proxyResults && Array.isArray(evd.data.proxyResults)) {
              for (const pr of evd.data.proxyResults) {
                const proxyFileId = `FILE:${pr.path}`;
                if (this.nodes.has(proxyFileId)) {
                  this.addEdge(proxyFileId, evdId, RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
                  hasSpecificLinks = true;
                }
              }
            }

            // Check if evidence mentions specific tests or code in command, scope, claim, or data
            const evdContext = `${evd.command || ''} ${evd.scope || ''} ${evd.claim || ''} ${JSON.stringify(evd.data || {})}`;
            for (const tId of testNodeIds) {
              const testPath = this.nodes.get(tId).path;
              const testBase = path.basename(testPath);
              if (evdContext.includes(testPath) || evdContext.includes(testBase)) {
                this.addEdge(tId, evdId, RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
                hasSpecificLinks = true;
              }
            }

            // 3. Contract-Based Linkage: L1 (Spec) <-> L6 (Evidence)
            const relatedSpec = evd.related_spec || evd.spec_id || evd.contract_provenance?.spec_file;
            for (const sId of specNodeIds) {
              const specNode = this.nodes.get(sId);
              const specPath = specNode?.path || '';
              const specBase = path.basename(specPath, '.md');
              if (
                (relatedSpec && (relatedSpec.includes(sId) || relatedSpec.includes(specBase) || (specPath && relatedSpec.includes(specPath)))) ||
                evdContext.includes(sId) ||
                (specBase && evdContext.includes(specBase))
              ) {
                this.addEdge(sId, evdId, RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
                hasSpecificLinks = true;
              }
            }

            // 4. Task-Based Linkage: L3 (Task) <-> L6 (Evidence)
            const relatedTask = evd.related_task || evd.task_id;
            for (const tkId of taskNodeIds) {
              if ((relatedTask && relatedTask === tkId) || evdContext.includes(tkId)) {
                this.addEdge(tkId, evdId, RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
                hasSpecificLinks = true;
              }
            }

            // If project-specific (not the general control plane) and no specific links, link project tests
            if (!hasSpecificLinks && resolvedId !== 'PRJ-EOS-CONTROL-PLANE' && evd.data?.projectId === resolvedId) {
              for (const tId of testNodeIds) {
                this.addEdge(tId, evdId, RELATION_TYPES.SEALED_BY, RELATION_TYPES.CERTIFIES);
              }
            }
          }
        } catch {
          // Skip invalid evidence files
        }
      }
    }

    // -------------------------------------------------------------------------
    // SUMMARY & METRICS COMPUTATION
    // -------------------------------------------------------------------------
    const nodesByLayer = {};
    for (const layer of Object.values(TRACE_LAYERS)) {
      nodesByLayer[layer] = Array.from(this.nodes.values()).filter(n => n.layer === layer).length;
    }

    let totalEdges = 0;
    for (const edges of this.forwardEdges.values()) {
      totalEdges += edges.length;
    }

    // Find orphans (0 degree)
    const orphans = [];
    for (const [id, node] of this.nodes.entries()) {
      const outDeg = (this.forwardEdges.get(id) || []).length;
      const inDeg = (this.reverseEdges.get(id) || []).length;
      if (outDeg === 0 && inDeg === 0) {
        orphans.push({ id, layer: node.layer, title: node.title });
      }
    }

    // Coverage metrics
    const coveredCodeCount = codeNodeIds.filter(id => (this.forwardEdges.get(id) || []).some(e => e.relation === RELATION_TYPES.VERIFIED_BY)).length;
    const testSealedCount = testNodeIds.filter(id => (this.forwardEdges.get(id) || []).some(e => e.relation === RELATION_TYPES.SEALED_BY)).length;

    const coverageRatio = codeNodeIds.length > 0 ? (coveredCodeCount / codeNodeIds.length) : 1.0;
    const evidenceCoverageRatio = testNodeIds.length > 0 ? (testSealedCount / testNodeIds.length) : 1.0;

    return {
      project_id: resolvedId,
      total_nodes: this.nodes.size,
      nodes_by_layer: nodesByLayer,
      total_edges: totalEdges,
      orphans_count: orphans.length,
      orphans,
      code_coverage_ratio: Number((coverageRatio * 100).toFixed(1)),
      evidence_coverage_ratio: Number((evidenceCoverageRatio * 100).toFixed(1)),
      sha256: this._sha256(JSON.stringify({
        project_id: resolvedId,
        nodes: Array.from(this.nodes.keys()),
        edges_count: totalEdges
      }))
    };
  }

  /**
   * Calculates the upstream and downstream blast radius of mutating an entity or file
   * @param {string} targetIdOrPath
   * @param {object} [options]
   * @returns {object} Blast radius analysis with risk tier and revalidation roadmap
   */
  calculateEntityBlastRadius(targetIdOrPath, options = {}) {
    if (!targetIdOrPath) {
      throw new Error('TARGET_REQUIRED: Target entity ID or file path is required to calculate blast radius.');
    }

    const normalizedTarget = targetIdOrPath.replace(/\\/g, '/');
    let targetNode = this.nodes.get(normalizedTarget) || this.nodes.get(`FILE:${normalizedTarget}`);

    // If node is not found in matrix, attempt dynamic file resolution
    if (!targetNode) {
      let resolvedFile = normalizedTarget;
      if (path.isAbsolute(normalizedTarget)) {
        resolvedFile = path.relative(this.controlPlaneRoot, normalizedTarget).replace(/\\/g, '/');
      }
      targetNode = {
        id: `FILE:${resolvedFile}`,
        layer: TRACE_LAYERS.L4_CODE,
        type: 'SOURCE_CODE',
        title: `Dynamic: ${path.basename(resolvedFile)}`,
        path: resolvedFile
      };
    }

    // 1. Traverse Downstream (Entities impacted by changes to target)
    const directDependents = new Set();
    const transitiveDependents = new Set();
    const testsToRevalidate = new Set();
    const invalidatedEvidence = new Set();
    const affectedDocumentation = new Set();

    // Check AST reverse graph for code dependencies
    const filePath = targetNode.path || targetNode.id.replace(/^FILE:/, '');
    const astDirect = this.astEngine.reverseGraph.get(filePath) || new Set();

    for (const dep of astDirect) {
      directDependents.add(dep);
      if (dep.includes('test') || dep.endsWith('.test.js') || dep.endsWith('.spec.js')) {
        testsToRevalidate.add(dep);
      }
    }

    // Check forward and reverse edges in RTM
    const forwardRtm = this.forwardEdges.get(targetNode.id) || [];
    for (const edge of forwardRtm) {
      const targetEntity = this.nodes.get(edge.target);
      if (targetEntity) {
        if (targetEntity.layer === TRACE_LAYERS.L5_TEST) {
          testsToRevalidate.add(targetEntity.path || targetEntity.id);
        } else if (targetEntity.layer === TRACE_LAYERS.L6_EVIDENCE) {
          invalidatedEvidence.add(targetEntity);
        } else if (targetEntity.layer === TRACE_LAYERS.L4_CODE) {
          directDependents.add(targetEntity.path || targetEntity.id);
        } else {
          affectedDocumentation.add(targetEntity);
        }
      }
    }

    // Transitive BFS search for code dependencies
    const queue = Array.from(directDependents);
    const visited = new Set(directDependents);

    while (queue.length > 0) {
      const current = queue.shift();
      const currentNext = this.astEngine.reverseGraph.get(current) || new Set();
      for (const nextDep of currentNext) {
        if (!visited.has(nextDep)) {
          visited.add(nextDep);
          transitiveDependents.add(nextDep);
          queue.push(nextDep);
          if (nextDep.includes('test') || nextDep.endsWith('.test.js') || nextDep.endsWith('.spec.js')) {
            testsToRevalidate.add(nextDep);
          }
        }
      }
    }

    // Direct and transitive tests also invalidate their sealing evidence receipts
    for (const testPath of testsToRevalidate) {
      const testId = `FILE:${testPath}`;
      const testEdges = this.forwardEdges.get(testId) || [];
      for (const edge of testEdges) {
        if (edge.relation === RELATION_TYPES.SEALED_BY) {
          const evdNode = this.nodes.get(edge.target);
          if (evdNode && evdNode.layer === TRACE_LAYERS.L6_EVIDENCE) {
            invalidatedEvidence.add(evdNode);
          }
        }
      }
    }

    // 2. Upstream Lineage (What specifications, plans, and intake led to this entity)
    const upstreamLineage = [];
    const revQueue = [targetNode.id];
    const revVisited = new Set();

    while (revQueue.length > 0) {
      const curr = revQueue.shift();
      if (!revVisited.has(curr)) {
        revVisited.add(curr);
        const incoming = this.reverseEdges.get(curr) || [];
        for (const edge of incoming) {
          const parentNode = this.nodes.get(edge.source);
          if (parentNode && !revVisited.has(parentNode.id)) {
            upstreamLineage.push({
              id: parentNode.id,
              layer: parentNode.layer,
              relation: edge.relation,
              title: parentNode.title
            });
            revQueue.push(parentNode.id);
          }
        }
      }
    }

    // 3. Risk Tier & Action Roadmap Classification
    const directList = Array.from(directDependents);
    const transitiveList = Array.from(transitiveDependents);
    const testList = Array.from(testsToRevalidate);
    const evidenceList = Array.from(invalidatedEvidence).map(e => ({
      id: e.id,
      path: e.path,
      sha256: e.sha256,
      status: 'STALE_REVALIDATION_REQUIRED'
    }));

    const totalAffectedCount = directList.length + transitiveList.length + testList.length + evidenceList.length;

    // Check if target is a high-governance architectural file
    const isCriticalContract = filePath.includes('CONSTITUTION.md') ||
      filePath.includes('GOVERNANCE.md') ||
      filePath.includes('schema.json') ||
      filePath.includes('package.json') ||
      filePath.includes('kernel.js');

    let riskTier = RISK_TIERS.LOW;
    let recommendedAction = 'STANDARD_TDD_CYCLE';

    if (isCriticalContract || totalAffectedCount >= 10) {
      riskTier = RISK_TIERS.CRITICAL;
      recommendedAction = 'REQUIRE_HITL_GATE_AND_FULL_REGRESSION';
    } else if (totalAffectedCount >= 5) {
      riskTier = RISK_TIERS.HIGH;
      recommendedAction = 'REQUIRE_FORMAL_AUDIT_BEFORE_MERGE';
    } else if (totalAffectedCount >= 2) {
      riskTier = RISK_TIERS.MEDIUM;
      recommendedAction = 'REQUIRE_INTEGRATION_SUITE_REVALIDATION';
    }

    const report = {
      target: targetNode.id,
      target_entity: targetNode.id,
      target_layer: targetNode.layer,
      target_path: filePath,
      risk_tier: riskTier,
      total_affected_count: totalAffectedCount,
      totalAffectedCount,
      recommended_action: recommendedAction,
      direct_dependents: directList,
      transitive_dependents: transitiveList,
      tests_to_revalidate: testList,
      invalidated_evidence: evidenceList,
      affected_documentation: Array.from(affectedDocumentation).map(d => ({ id: d.id, layer: d.layer, title: d.title })),
      upstream_lineage: upstreamLineage,
      timestamp: new Date().toISOString()
    };

    report.sha256 = this._sha256(JSON.stringify(report));
    return report;
  }

  /**
   * Fluent alias for calculateEntityBlastRadius
   */
  calculateBlastRadius(targetIdOrPath, options = {}) {
    return this.calculateEntityBlastRadius(targetIdOrPath, options);
  }

  /**
   * Formats the RTM into an ASCII hierarchical tree for terminal display
   * @param {object} matrixData
   * @returns {string}
   */
  formatTraceTree(matrixData) {
    const lines = [
      '================================================================================',
      `🌐 EOS RELATIONAL TRACEABILITY MATRIX: [${matrixData.project_id || 'WORKSPACE'}]`,
      '================================================================================'
    ];

    const layerOrder = [
      TRACE_LAYERS.L0_INTAKE,
      TRACE_LAYERS.L1_SPEC,
      TRACE_LAYERS.L2_PLAN,
      TRACE_LAYERS.L3_TASK,
      TRACE_LAYERS.L4_CODE,
      TRACE_LAYERS.L5_TEST,
      TRACE_LAYERS.L6_EVIDENCE
    ];

    const layerLabels = {
      [TRACE_LAYERS.L0_INTAKE]: 'L0: BUSINESS INTAKE',
      [TRACE_LAYERS.L1_SPEC]: 'L1: EARS SPECIFICATIONS',
      [TRACE_LAYERS.L2_PLAN]: 'L2: ARCHITECTURE PLANS & ADRs',
      [TRACE_LAYERS.L3_TASK]: 'L3: ATOMIC TASK DAG',
      [TRACE_LAYERS.L4_CODE]: 'L4: SOURCE CODE (AST)',
      [TRACE_LAYERS.L5_TEST]: 'L5: TEST SUITES',
      [TRACE_LAYERS.L6_EVIDENCE]: 'L6: CRYPTOGRAPHIC EVIDENCE'
    };

    const layerConnectors = {
      [TRACE_LAYERS.L0_INTAKE]: '     ↕ INFORMS / DERIVED_FROM',
      [TRACE_LAYERS.L1_SPEC]: '     ↕ ARCHITECTED_BY / DECIDED_IN',
      [TRACE_LAYERS.L2_PLAN]: '     ↕ DECOMPOSED_INTO / SCHEDULES',
      [TRACE_LAYERS.L3_TASK]: '     ↕ IMPLEMENTED_BY / MUTATES',
      [TRACE_LAYERS.L4_CODE]: '     ↕ VERIFIED_BY / COVERS',
      [TRACE_LAYERS.L5_TEST]: '     ↕ SEALED_BY / CERTIFIES',
      [TRACE_LAYERS.L6_EVIDENCE]: ''
    };

    for (const layer of layerOrder) {
      const layerNodes = Array.from(this.nodes.values()).filter(n => n.layer === layer);
      lines.push(`${layerLabels[layer]} (${layerNodes.length} nodes)`);

      if (layerNodes.length === 0) {
        lines.push('  └─ (None registered)');
      } else {
        const displayLimit = 6;
        const slice = layerNodes.slice(0, displayLimit);
        slice.forEach((node, idx) => {
          const isLast = idx === slice.length - 1 && layerNodes.length <= displayLimit;
          const prefix = isLast ? '  └─' : '  ├─';
          const shaTag = node.sha256 ? ` [${node.sha256.substring(0, 8)}...]` : '';
          lines.push(`${prefix} [${node.id}] ${node.path || node.title}${shaTag}`);
        });
        if (layerNodes.length > displayLimit) {
          lines.push(`  └─ ... and ${layerNodes.length - displayLimit} additional node(s)`);
        }
      }

      if (layerConnectors[layer]) {
        lines.push(layerConnectors[layer]);
      }
    }

    lines.push('--------------------------------------------------------------------------------');
    lines.push(`Summary: ${this.nodes.size} nodes, ${matrixData.total_edges || 0} edges | Code Coverage: ${matrixData.code_coverage_ratio || 0}% | Evidence Seals: ${matrixData.evidence_coverage_ratio || 0}%`);
    lines.push('================================================================================');

    return lines.join('\n');
  }

  /**
   * Formats blast radius analysis into an ASCII impact report for terminal display
   * @param {object} blastData
   * @returns {string}
   */
  formatBlastRadius(blastData) {
    const riskBadges = {
      [RISK_TIERS.LOW]: '🟢 LOW (TDD Cycle)',
      [RISK_TIERS.MEDIUM]: '🟡 MEDIUM (Integration Suite Revalidation)',
      [RISK_TIERS.HIGH]: '🟠 HIGH (Formal Audit Required)',
      [RISK_TIERS.CRITICAL]: '🔴 CRITICAL (HITL Gate & Full Regression)'
    };

    const lines = [
      '================================================================================',
      '💥 EOS CAUSAL BLAST RADIUS & IMPACT ANALYSIS',
      '================================================================================',
      `Target Entity  : ${blastData.target_entity}`,
      `Layer          : ${blastData.target_layer}`,
      `Path           : ${blastData.target_path}`,
      `Risk Tier      : ${riskBadges[blastData.risk_tier] || blastData.risk_tier}`,
      `Recommended    : ${blastData.recommended_action}`,
      `SHA-256 Digest : ${blastData.sha256}`,
      '--------------------------------------------------------------------------------',
      `📦 DIRECT DEPENDENTS (${blastData.direct_dependents.length}):`
    ];

    if (blastData.direct_dependents.length === 0) {
      lines.push('   (None detected)');
    } else {
      blastData.direct_dependents.slice(0, 8).forEach(d => lines.push(`   - ${d}`));
      if (blastData.direct_dependents.length > 8) {
        lines.push(`   ... and ${blastData.direct_dependents.length - 8} more`);
      }
    }

    lines.push(`🔄 TRANSITIVE DEPENDENTS (${blastData.transitive_dependents.length}):`);
    if (blastData.transitive_dependents.length === 0) {
      lines.push('   (None detected)');
    } else {
      blastData.transitive_dependents.slice(0, 8).forEach(d => lines.push(`   - ${d}`));
      if (blastData.transitive_dependents.length > 8) {
        lines.push(`   ... and ${blastData.transitive_dependents.length - 8} more`);
      }
    }

    lines.push(`🧪 TESTS TO REVALIDATE (${blastData.tests_to_revalidate.length}):`);
    if (blastData.tests_to_revalidate.length === 0) {
      lines.push('   (None required)');
    } else {
      blastData.tests_to_revalidate.forEach(t => lines.push(`   - 🎯 ${t}`));
    }

    lines.push(`📜 INVALIDATED EVIDENCE RECEIPTS (${blastData.invalidated_evidence.length}):`);
    if (blastData.invalidated_evidence.length === 0) {
      lines.push('   (Zero receipts affected)');
    } else {
      blastData.invalidated_evidence.forEach(e => lines.push(`   - ⚠️ [${e.id}] ${e.path} ➔ STALE_REVALIDATION_REQUIRED`));
    }

    if (blastData.upstream_lineage.length > 0) {
      lines.push('--------------------------------------------------------------------------------');
      lines.push(`🏛️ UPSTREAM LINEAGE ORIGIN (${blastData.upstream_lineage.length}):`);
      blastData.upstream_lineage.slice(0, 5).forEach(u => lines.push(`   ← [${u.layer}] ${u.id}: ${u.title}`));
    }

    lines.push('================================================================================');
    return lines.join('\n');
  }

  /**
   * Performs an enterprise relational integrity and orphan link audit on the project's matrix
   * @param {string} projectId
   * @param {object} [options]
   * @returns {object} Integrity audit report with health score and identified gaps
   */
  auditRelationalIntegrity(projectId, options = {}) {
    let effectiveProjectId = projectId;
    let effectiveOptions = options;
    if (typeof projectId === 'object' && projectId !== null) {
      effectiveOptions = projectId;
      effectiveProjectId = effectiveOptions.projectId;
    }

    let summary;
    if (this.nodes.size === 0 || effectiveProjectId) {
      summary = this.buildProjectMatrix(effectiveProjectId || 'PRJ-EOS-CONTROL-PLANE', effectiveOptions);
    } else {
      const nodesByLayer = {};
      for (const layer of Object.values(TRACE_LAYERS)) {
        nodesByLayer[layer] = Array.from(this.nodes.values()).filter(n => n.layer === layer).length;
      }
      let totalEdges = 0;
      for (const edges of this.forwardEdges.values()) {
        totalEdges += edges.length;
      }
      summary = {
        project_id: this.currentProjectId || 'PRJ-EOS-CONTROL-PLANE',
        total_nodes: this.nodes.size,
        nodes_by_layer: nodesByLayer,
        total_edges: totalEdges
      };
    }
    const gaps = {
      orphan_intakes: [],
      orphan_specs: [],
      orphan_plans: [],
      orphan_tasks: [],
      untested_code: [],
      unsealed_tests: [],
      dangling_references: []
    };

    // 1. Audit Intakes (L0): Should inform at least 1 spec
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L0_INTAKE) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.INFORMS);
        if (outEdges.length === 0) {
          gaps.orphan_intakes.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 2. Audit Specs (L1): Should be architected by at least 1 plan
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L1_SPEC) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.ARCHITECTED_BY);
        if (outEdges.length === 0) {
          gaps.orphan_specs.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 3. Audit Plans (L2): Should be decomposed into at least 1 task
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L2_PLAN) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.DECOMPOSED_INTO);
        if (outEdges.length === 0) {
          gaps.orphan_plans.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 4. Audit Tasks (L3): Should implement at least 1 code file
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L3_TASK) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.IMPLEMENTED_BY);
        if (outEdges.length === 0) {
          gaps.orphan_tasks.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 5. Audit Code (L4): Should be verified by at least 1 test suite
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L4_CODE) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.VERIFIED_BY);
        if (outEdges.length === 0) {
          gaps.untested_code.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 6. Audit Tests (L5): Should be sealed by at least 1 evidence receipt
    for (const [id, node] of this.nodes.entries()) {
      if (node.layer === TRACE_LAYERS.L5_TEST) {
        const outEdges = (this.forwardEdges.get(id) || []).filter(e => e.relation === RELATION_TYPES.SEALED_BY);
        if (outEdges.length === 0) {
          gaps.unsealed_tests.push({ id, title: node.title, path: node.path });
        }
      }
    }

    // 7. Check dangling references: examine physical existence of file paths in nodes
    for (const [id, node] of this.nodes.entries()) {
      if (node.path && !node.metadata?.synthetic) {
        const fullPath = path.resolve(this.controlPlaneRoot, node.path);
        if (!fs.existsSync(fullPath)) {
          const project = this._resolveProject(projectId);
          if (project?.path) {
            const altPath = path.resolve(project.path, node.path);
            if (!fs.existsSync(altPath)) {
              gaps.dangling_references.push({ id, layer: node.layer, path: node.path, reason: 'FILE_NOT_FOUND' });
            }
          } else {
            gaps.dangling_references.push({ id, layer: node.layer, path: node.path, reason: 'FILE_NOT_FOUND' });
          }
        }
      }
    }

    // Compute Health Score (0 - 100)
    let score = 100;
    const totalGaps = gaps.orphan_specs.length +
      gaps.orphan_plans.length +
      gaps.orphan_tasks.length +
      (gaps.dangling_references.length * 2);

    // Untested code penalty ratio (up to 30 points)
    const codeTotal = summary.nodes_by_layer[TRACE_LAYERS.L4_CODE] || 0;
    const codeUntestedRatio = codeTotal > 0 ? (gaps.untested_code.length / codeTotal) : 0;
    score -= Math.round(codeUntestedRatio * 30);

    // Unsealed test penalty ratio (up to 20 points)
    const testTotal = summary.nodes_by_layer[TRACE_LAYERS.L5_TEST] || 0;
    const testUnsealedRatio = testTotal > 0 ? (gaps.unsealed_tests.length / testTotal) : 0;
    score -= Math.round(testUnsealedRatio * 20);

    // Structural gap penalties (5 points per gap)
    score -= Math.min(50, totalGaps * 5);
    score = Math.max(0, Math.min(100, score));

    let status = 'EXCELLENT';
    if (score < 50) status = 'CRITICAL_GAPS';
    else if (score < 70) status = 'DEGRADED';
    else if (score < 90) status = 'ACCEPTABLE';

    return {
      project_id: summary.project_id,
      timestamp: new Date().toISOString(),
      health_score: score,
      healthScore: score,
      status,
      summary,
      gaps,
      total_gaps: totalGaps + gaps.untested_code.length + gaps.unsealed_tests.length,
      recommendations: this._generateRelationalRecommendations(gaps)
    };
  }

  /**
   * Generates actionable recommendations based on detected relational gaps
   * @param {object} gaps
   * @returns {Array<string>}
   */
  _generateRelationalRecommendations(gaps) {
    const recs = [];
    if (gaps.orphan_specs.length > 0) {
      recs.push(`Decompose ${gaps.orphan_specs.length} orphan specification(s) into Architecture Plans (ADRs) or Tasks: ${gaps.orphan_specs.slice(0, 3).map(s => s.id).join(', ')}`);
    }
    if (gaps.orphan_tasks.length > 0) {
      recs.push(`Specify target code file paths in ${gaps.orphan_tasks.length} task(s) to establish implementation lineage: ${gaps.orphan_tasks.slice(0, 3).map(t => t.id).join(', ')}`);
    }
    if (gaps.untested_code.length > 0) {
      recs.push(`Create test suites covering ${gaps.untested_code.length} unverified source module(s): ${gaps.untested_code.slice(0, 3).map(c => c.id).join(', ')}`);
    }
    if (gaps.unsealed_tests.length > 0) {
      recs.push(`Execute test runner and capture cryptographic evidence receipts for ${gaps.unsealed_tests.length} unsealed test(s): ${gaps.unsealed_tests.slice(0, 3).map(t => t.id).join(', ')}`);
    }
    if (gaps.dangling_references.length > 0) {
      recs.push(`Resolve ${gaps.dangling_references.length} dangling file reference(s) that do not exist on disk: ${gaps.dangling_references.slice(0, 3).map(d => d.path).join(', ')}`);
    }
    if (recs.length === 0) {
      recs.push('Relational matrix is fully synchronized and sealed with 0 open structural gaps.');
    }
    return recs;
  }

  /**
   * Formats relational integrity audit report into an ASCII report for terminal display
   * @param {object} auditData
   * @returns {string}
   */
  formatRelationalAudit(auditData) {
    const statusBadges = {
      EXCELLENT: '🟢 EXCELLENT (Fully Synchronized)',
      ACCEPTABLE: '🟡 ACCEPTABLE (Minor Lineage Gaps)',
      DEGRADED: '🟠 DEGRADED (Significant Unverified Surfaces)',
      CRITICAL_GAPS: '🔴 CRITICAL GAPS (Broken Traceability)'
    };

    const lines = [
      '================================================================================',
      `🛡️ EOS RELATIONAL INTEGRITY AUDIT: [${auditData.project_id}]`,
      '================================================================================',
      `Health Score   : ${auditData.health_score} / 100`,
      `Status         : ${statusBadges[auditData.status] || auditData.status}`,
      `Total Nodes    : ${auditData.summary.total_nodes} (${auditData.summary.total_edges} edges)`,
      `Coverage Ratios: Code ${auditData.summary.code_coverage_ratio}% | Evidence ${auditData.summary.evidence_coverage_ratio}%`,
      '--------------------------------------------------------------------------------',
      '🔍 GAPS BREAKDOWN:',
      `  - Orphan Intakes       : ${auditData.gaps.orphan_intakes.length}`,
      `  - Orphan Specs         : ${auditData.gaps.orphan_specs.length}`,
      `  - Orphan Plans         : ${auditData.gaps.orphan_plans.length}`,
      `  - Orphan Tasks         : ${auditData.gaps.orphan_tasks.length}`,
      `  - Untested Source Files: ${auditData.gaps.untested_code.length}`,
      `  - Unsealed Test Suites : ${auditData.gaps.unsealed_tests.length}`,
      `  - Dangling References  : ${auditData.gaps.dangling_references.length}`,
      '--------------------------------------------------------------------------------',
      '💡 ACTIONABLE RECOMMENDATIONS:'
    ];

    auditData.recommendations.forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`);
    });

    lines.push('================================================================================');
    return lines.join('\n');
  }
}
