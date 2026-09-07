/**
 * @module ArchitecturalFitnessEngine
 * @description Enforces Clean Architecture dependency rules via static AST analysis.
 * Detects boundary violations where inner layers import from outer layers.
 * Implements the Fitness Function pattern (Building Evolutionary Architectures, Ford/Parsons/Kua).
 *
 * Layer hierarchy (inner → outer, dependency flows inward only):
 *   L0 DOMAIN (pure business logic) → imports nothing external
 *   L1 APPLICATION (use cases)       → may import DOMAIN only
 *   L2 INFRASTRUCTURE (adapters)     → may import DOMAIN, APPLICATION
 *   L3 PRESENTATION (UI/CLI)         → may import DOMAIN, APPLICATION, INFRASTRUCTURE
 *
 * Any import from an inner layer to an outer layer is a VIOLATION.
 * In addition, module dependency graphs must be strictly acyclic (0 circular dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CausalAstEngine } from './causal-ast-engine.js';

export const ARCHITECTURE_LAYERS = Object.freeze({
  L0_DOMAIN: 'L0_DOMAIN',
  L1_APPLICATION: 'L1_APPLICATION',
  L2_INFRASTRUCTURE: 'L2_INFRASTRUCTURE',
  L3_PRESENTATION: 'L3_PRESENTATION',
  UNKNOWN: 'UNKNOWN'
});

export const LAYER_RANK = {
  [ARCHITECTURE_LAYERS.L0_DOMAIN]: 0,
  [ARCHITECTURE_LAYERS.L1_APPLICATION]: 1,
  [ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE]: 2,
  [ARCHITECTURE_LAYERS.L3_PRESENTATION]: 3,
  [ARCHITECTURE_LAYERS.UNKNOWN]: -1
};

/**
 * Default layer classification rules based on directory path conventions.
 * Projects can override these via a `.fitness.json` config file.
 */
export const DEFAULT_LAYER_RULES = [
  // L0 Domain
  { pattern: /(?:^|\/)(?:domain|entities|value-objects|aggregates|core\/models?|core\/contracts|core\/doctrine)(?:\/|$)/i, layer: ARCHITECTURE_LAYERS.L0_DOMAIN },
  // L1 Application
  { pattern: /(?:^|\/)(?:application|use-cases|usecases|commands|queries|handlers|services|core\/sdd|core\/runtime|core\/formal|core\/intelligence)(?:\/|$)/i, layer: ARCHITECTURE_LAYERS.L1_APPLICATION },
  // L2 Infrastructure
  { pattern: /(?:^|\/)(?:infrastructure|adapters|repositories|persistence|database|config|api|ports|mcp)(?:\/|$)/i, layer: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE },
  // L3 Presentation
  { pattern: /(?:^|\/)(?:presentation|ui|views|pages|components|cli|controllers|routes|bin)(?:\/|$)/i, layer: ARCHITECTURE_LAYERS.L3_PRESENTATION }
];

/**
 * Clean layer definitions for fine-grained dependency filtering and cycle detection.
 */
export const DEFAULT_CLEAN_LAYERS = [
  {
    id: 'domain',
    name: 'Domain (Core Business Rules & Contracts)',
    level: 0,
    matches: (filePath) => {
      const p = filePath.replace(/\\/g, '/').replace(/^(\.\/)?src\//, '');
      return (
        p.includes('core/contracts/') ||
        p.includes('core/doctrine/') ||
        p.includes('/domain/')
      );
    },
    forbiddenImports: ['adapters', 'infra', 'cli', 'presentation', 'bin']
  },
  {
    id: 'application',
    name: 'Application (Use Cases & Orchestration)',
    level: 1,
    matches: (filePath) => {
      const p = filePath.replace(/\\/g, '/').replace(/^(\.\/)?src\//, '');
      return (
        (p.startsWith('core/') || p.includes('/application/')) &&
        !p.includes('core/contracts/') &&
        !p.includes('core/doctrine/') &&
        !p.includes('core/adapters/') &&
        !p.includes('/domain/')
      );
    },
    forbiddenImports: ['cli', 'presentation', 'bin']
  },
  {
    id: 'adapters',
    name: 'Adapters (Infrastructure & External Interfaces)',
    level: 2,
    matches: (filePath) => {
      const p = filePath.replace(/\\/g, '/').replace(/^(\.\/)?src\//, '');
      return (
        p.includes('core/adapters/') ||
        p.startsWith('adapters/') ||
        p.includes('/infrastructure/') ||
        p.includes('mcp')
      );
    },
    forbiddenImports: ['cli', 'bin']
  },
  {
    id: 'presentation',
    name: 'Presentation / Delivery (CLI & UI)',
    level: 3,
    matches: (filePath) => {
      const p = filePath.replace(/\\/g, '/').replace(/^(\.\/)?src\//, '');
      return (
        p.startsWith('cli/') ||
        p.startsWith('bin/') ||
        p.includes('/ui/') ||
        p.includes('/presentation/')
      );
    },
    forbiddenImports: []
  }
];

/**
 * Known framework/library imports that indicate an outer-layer dependency
 * when found in domain or application code.
 */
export const FRAMEWORK_BOUNDARY_MARKERS = Object.freeze({
  // React / Next.js (Presentation)
  react: ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'react-dom': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'next/router': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'next/navigation': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'next/link': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'next/image': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  // Express / Fastify / Hono (Infrastructure)
  express: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  fastify: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  hono: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  koa: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  // ORM / Database (Infrastructure)
  prisma: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  '@prisma/client': ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  sequelize: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  typeorm: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  mongoose: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  drizzle: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  'drizzle-orm': ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  knex: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  // Python frameworks (Infrastructure)
  fastapi: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  flask: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  django: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  sqlalchemy: ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE,
  // Angular (Presentation)
  '@angular/core': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  '@angular/router': ARCHITECTURE_LAYERS.L3_PRESENTATION,
  // Vue (Presentation)
  vue: ARCHITECTURE_LAYERS.L3_PRESENTATION,
  'vue-router': ARCHITECTURE_LAYERS.L3_PRESENTATION
});

export class ArchitecturalFitnessEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir] - Root directory of the target project
   * @param {Array<object>} [options.layerRules] - Custom layer classification rules
   * @param {object} [options.frameworkMarkers] - Custom framework boundary markers
   * @param {Array<string>} [options.excludePatterns] - Glob-like patterns to exclude from analysis
   * @param {Array<object>} [options.layers] - Clean layer definitions
   * @param {CausalAstEngine} [options.astEngine] - AST dependency engine
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.layerRules = options.layerRules || DEFAULT_LAYER_RULES;
    this.frameworkMarkers = options.frameworkMarkers || FRAMEWORK_BOUNDARY_MARKERS;
    this.excludePatterns = options.excludePatterns || [
      'node_modules', '.git', '.next', 'dist', 'build', '__pycache__',
      '.venv', 'venv', 'coverage', '.cache', '.turbo'
    ];
    this.layers = options.layers || DEFAULT_CLEAN_LAYERS;
    this.astEngine = options.astEngine || new CausalAstEngine({ baseDir: this.baseDir });
  }

  /**
   * Classifies a file path into an architectural layer based on directory conventions.
   * @param {string} filePath - Relative path from project root
   * @returns {string} The architectural layer constant
   */
  classifyLayer(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const rule of this.layerRules) {
      if (rule.pattern.test(normalized)) {
        return rule.layer;
      }
    }
    return ARCHITECTURE_LAYERS.UNKNOWN;
  }

  /**
   * Identifies which architectural clean layer definition a given file path belongs to.
   * @param {string} filePath
   * @returns {object|null}
   */
  classifyCleanLayer(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const layer of this.layers) {
      if (layer.matches(normalized)) {
        return layer;
      }
    }
    return null;
  }

  /**
   * Extracts import specifiers from a source file's content.
   * @param {string} filePath
   * @param {string} content
   * @returns {Array<{raw: string, resolved: string, line: number}>}
   */
  _extractImportsWithLines(filePath, content) {
    const ext = path.extname(filePath);
    const results = [];

    if (['.js', '.ts', '.mjs', '.jsx', '.tsx'].includes(ext)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // ES Module imports
        const esmMatch = line.match(/(?:import|from)\s+['"]([^'"]+)['"]/);
        if (esmMatch) {
          results.push({ raw: esmMatch[1], resolved: this._resolveImport(filePath, esmMatch[1]), line: i + 1 });
        }
        // CommonJS require
        const cjsMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
        if (cjsMatch) {
          results.push({ raw: cjsMatch[1], resolved: this._resolveImport(filePath, cjsMatch[1]), line: i + 1 });
        }
      }
    } else if (ext === '.py') {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pyMatch = line.match(/(?:from|import)\s+([a-zA-Z0-9_\.]+)/);
        if (pyMatch) {
          results.push({ raw: pyMatch[1], resolved: pyMatch[1], line: i + 1 });
        }
      }
    }

    return results;
  }

  /**
   * Resolves a relative import specifier to a project-root-relative path.
   * @param {string} sourceFile
   * @param {string} importSpecifier
   * @returns {string}
   */
  _resolveImport(sourceFile, importSpecifier) {
    if (!importSpecifier.startsWith('.')) return importSpecifier;
    const sourceDir = path.dirname(path.resolve(this.baseDir, sourceFile));
    const resolved = path.resolve(sourceDir, importSpecifier);
    return path.relative(this.baseDir, resolved).replace(/\\/g, '/');
  }

  /**
   * Determines if an import from sourceLayer to a targetLayer or framework marker violates the dependency rule.
   * @param {string} sourceLayer
   * @param {string} targetLayer
   * @returns {boolean} true if violation
   */
  _isViolation(sourceLayer, targetLayer) {
    if (sourceLayer === ARCHITECTURE_LAYERS.UNKNOWN || targetLayer === ARCHITECTURE_LAYERS.UNKNOWN) {
      return false;
    }
    return LAYER_RANK[sourceLayer] < LAYER_RANK[targetLayer];
  }

  /**
   * Scans a directory tree for all source files suitable for architectural analysis.
   * @param {string} [dir]
   * @returns {Array<{path: string, content: string}>}
   */
  _scanSourceFiles(dir = this.baseDir) {
    const files = [];
    const excludeSet = new Set(this.excludePatterns);

    const walk = (d) => {
      if (!fs.existsSync(d)) return;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        if (excludeSet.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.agents') continue;

        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.ts', '.mjs', '.jsx', '.tsx', '.py'].includes(ext)) {
            try {
              const relPath = path.relative(this.baseDir, full).replace(/\\/g, '/');
              // Skip test files from fitness analysis
              if (relPath.includes('test') || relPath.includes('__tests__') || relPath.includes('.spec.')) continue;
              const content = fs.readFileSync(full, 'utf8');
              files.push({ path: relPath, content });
            } catch {
              // Ignore unreadable files
            }
          }
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Detects all directed cycles in the module dependency graph using DFS.
   * @param {Map<string, Set<string>>} dependencyGraph
   * @returns {Array<string[]>}
   */
  findCycles(dependencyGraph) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Map(); // node -> index in current path
    const currentPath = [];

    const dfs = (node) => {
      visited.add(node);
      recStack.set(node, currentPath.length);
      currentPath.push(node);

      const neighbors = dependencyGraph.get(node) || new Set();
      for (const next of neighbors) {
        if (!dependencyGraph.has(next)) continue;

        if (recStack.has(next)) {
          const cycleStartIdx = recStack.get(next);
          const cycle = currentPath.slice(cycleStartIdx).concat(next);
          const cycleStr = cycle.join(' -> ');
          if (!cycles.some(c => c.join(' -> ') === cycleStr)) {
            cycles.push(cycle);
          }
        } else if (!visited.has(next)) {
          dfs(next);
        }
      }

      currentPath.pop();
      recStack.delete(node);
    };

    for (const node of dependencyGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Runs the full architectural fitness audit on a target directory.
   * Returns all detected dependency rule violations with actionable diagnostics.
   * @param {string} [targetDir]
   * @returns {object} Fitness audit report
   */
  audit(targetDir) {
    const effectiveDir = targetDir || this.baseDir;
    const originalBase = this.baseDir;
    this.baseDir = effectiveDir;

    const sourceFiles = this._scanSourceFiles(effectiveDir);
    const violations = [];
    const layerDistribution = {
      [ARCHITECTURE_LAYERS.L0_DOMAIN]: 0,
      [ARCHITECTURE_LAYERS.L1_APPLICATION]: 0,
      [ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE]: 0,
      [ARCHITECTURE_LAYERS.L3_PRESENTATION]: 0,
      [ARCHITECTURE_LAYERS.UNKNOWN]: 0
    };

    for (const file of sourceFiles) {
      const sourceLayer = this.classifyLayer(file.path);
      layerDistribution[sourceLayer]++;

      if (sourceLayer === ARCHITECTURE_LAYERS.UNKNOWN) continue;

      const imports = this._extractImportsWithLines(file.path, file.content);

      for (const imp of imports) {
        let targetLayer = ARCHITECTURE_LAYERS.UNKNOWN;

        // Check framework boundary markers first (e.g. 'react', 'express')
        const rawBase = imp.raw.split('/')[0];
        if (this.frameworkMarkers[imp.raw]) {
          targetLayer = this.frameworkMarkers[imp.raw];
        } else if (this.frameworkMarkers[rawBase]) {
          targetLayer = this.frameworkMarkers[rawBase];
        }

        // For relative imports, classify by resolved path
        if (targetLayer === ARCHITECTURE_LAYERS.UNKNOWN && imp.raw.startsWith('.')) {
          targetLayer = this.classifyLayer(imp.resolved);
        }

        if (this._isViolation(sourceLayer, targetLayer)) {
          violations.push({
            file: file.path,
            line: imp.line,
            source_layer: sourceLayer,
            target_layer: targetLayer,
            import_specifier: imp.raw,
            resolved_path: imp.resolved,
            severity: sourceLayer === ARCHITECTURE_LAYERS.L0_DOMAIN ? 'CRITICAL' : 'HIGH',
            rule: `${sourceLayer} MUST NOT import from ${targetLayer} (Dependency Rule)`
          });
        }
      }
    }

    // Compute fitness score
    const totalAnalyzed = sourceFiles.length;
    const filesWithViolations = new Set(violations.map(v => v.file)).size;
    const score = totalAnalyzed > 0
      ? Math.max(0, Math.round((1 - (filesWithViolations / totalAnalyzed)) * 100))
      : 100;

    let status = 'CLEAN';
    if (violations.some(v => v.severity === 'CRITICAL')) status = 'CRITICAL_VIOLATIONS';
    else if (violations.length > 0) status = 'VIOLATIONS_DETECTED';

    this.baseDir = originalBase;

    return {
      project_root: effectiveDir,
      timestamp: new Date().toISOString(),
      fitness_score: score,
      status,
      total_files_analyzed: totalAnalyzed,
      layer_distribution: layerDistribution,
      violations_count: violations.length,
      violations,
      sha256: crypto.createHash('sha256').update(JSON.stringify({
        score, status, violations_count: violations.length,
        files: violations.map(v => `${v.file}:${v.line}:${v.import_specifier}`)
      })).digest('hex')
    };
  }

  /**
   * Audits the target directory for architectural fitness (Dependency Rule & Cycle Freedom via AST).
   * @param {string} [targetDir]
   * @returns {object} Full fitness assessment report
   */
  auditArchitecture(targetDir = this.baseDir) {
    this.astEngine.buildGraph(targetDir);
    const graph = this.astEngine.dependencyGraph;

    const violations = [];
    let evaluatedEdges = 0;

    for (const [sourceFile, importedFiles] of graph.entries()) {
      const sourceLayer = this.classifyCleanLayer(sourceFile);
      if (!sourceLayer) continue;

      for (const importedFile of importedFiles) {
        evaluatedEdges++;
        const targetLayer = this.classifyCleanLayer(importedFile);
        if (!targetLayer) continue;

        if (sourceLayer.forbiddenImports.includes(targetLayer.id)) {
          violations.push({
            from: sourceFile,
            to: importedFile,
            fromLayer: sourceLayer.name,
            toLayer: targetLayer.name,
            reason: `Dependency Rule Violation: ${sourceLayer.name} (Level ${sourceLayer.level}) cannot depend on outer layer ${targetLayer.name} (Level ${targetLayer.level})`
          });
        }
      }
    }

    const cycles = this.findCycles(graph);
    const penalty = (violations.length * 15) + (cycles.length * 20);
    const score = Math.max(0, 100 - penalty);
    const compliant = violations.length === 0 && cycles.length === 0;

    return {
      compliant,
      score,
      total_files: graph.size,
      total_dependencies: evaluatedEdges,
      violations_count: violations.length,
      violations,
      cycles_count: cycles.length,
      cycles,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Formats the fitness audit report into an ASCII terminal report.
   * @param {object} auditData
   * @returns {string}
   */
  formatReport(auditData) {
    const statusBadges = {
      CLEAN: '🟢 CLEAN (Zero Boundary Violations)',
      VIOLATIONS_DETECTED: '🟠 VIOLATIONS DETECTED (Dependency Rule Breached)',
      CRITICAL_VIOLATIONS: '🔴 CRITICAL (Domain Purity Compromised)'
    };

    const lines = [
      '================================================================================',
      `🏛️ EOS ARCHITECTURAL FITNESS AUDIT`,
      '================================================================================',
      `Project Root   : ${auditData.project_root}`,
      `Fitness Score  : ${auditData.fitness_score} / 100`,
      `Status         : ${statusBadges[auditData.status] || auditData.status}`,
      `Files Analyzed : ${auditData.total_files_analyzed}`,
      '--------------------------------------------------------------------------------',
      '📊 LAYER DISTRIBUTION:',
      `  - L0 Domain           : ${auditData.layer_distribution[ARCHITECTURE_LAYERS.L0_DOMAIN]}`,
      `  - L1 Application      : ${auditData.layer_distribution[ARCHITECTURE_LAYERS.L1_APPLICATION]}`,
      `  - L2 Infrastructure   : ${auditData.layer_distribution[ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE]}`,
      `  - L3 Presentation     : ${auditData.layer_distribution[ARCHITECTURE_LAYERS.L3_PRESENTATION]}`,
      `  - Unclassified        : ${auditData.layer_distribution[ARCHITECTURE_LAYERS.UNKNOWN]}`,
    ];

    if (auditData.violations_count === 0) {
      lines.push('--------------------------------------------------------------------------------');
      lines.push('✅ ZERO BOUNDARY VIOLATIONS — Clean Architecture dependency rule fully enforced.');
    } else {
      lines.push('--------------------------------------------------------------------------------');
      lines.push(`🚨 VIOLATIONS (${auditData.violations_count}):`);
      const grouped = {};
      for (const v of auditData.violations) {
        if (!grouped[v.file]) grouped[v.file] = [];
        grouped[v.file].push(v);
      }
      for (const [file, vs] of Object.entries(grouped)) {
        lines.push(`  📄 ${file} [${vs[0].source_layer}]`);
        for (const v of vs.slice(0, 5)) {
          lines.push(`     L${v.line}: ${v.severity} — imports '${v.import_specifier}' (${v.target_layer})`);
        }
        if (vs.length > 5) {
          lines.push(`     ... and ${vs.length - 5} more violation(s)`);
        }
      }
    }

    lines.push('================================================================================');
    return lines.join('\n');
  }
}
