/**
 * @module CausalAstEngine
 * @description Multi-language Causal AST Dependency Graph and Blast Radius Calculator.
 * Calculates do(mutate(file)) impact across JS/TS, Python, Rust, and Go codebases.
 */

import fs from 'node:fs';
import path from 'node:path';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class CausalAstEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.dependencyGraph = new Map(); // file -> Set of imported files
    this.reverseGraph = new Map();    // file -> Set of files that import it
  }

  /**
   * Extracts imported modules/files from source code text based on file extension
   * @param {string} filePath
   * @param {string} content
   * @returns {string[]} List of relative or resolved import paths
   */
  extractImports(filePath, content) {
    const ext = path.extname(filePath);
    const imports = [];

    if (ext === '.js' || ext === '.ts' || ext === '.mjs' || ext === '.jsx' || ext === '.tsx') {
      // ES Module & CommonJS imports
      const esmRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
      const cjsRegex = /require\(['"]([^'"]+)['"]\)/g;
      let match;
      while ((match = esmRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      while ((match = cjsRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (ext === '.py') {
      // Python imports: import foo, from foo import bar
      const pyImportRegex = /(?:from|import)\s+([a-zA-Z0-9_\.]+)/g;
      let match;
      while ((match = pyImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (ext === '.rs') {
      // Rust uses: use crate::foo, mod foo
      const rsRegex = /(?:use|mod)\s+([a-zA-Z0-9_:]+)/g;
      let match;
      while ((match = rsRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (ext === '.go') {
      // Go imports: import "foo/bar"
      const goRegex = /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g;
      let match;
      while ((match = goRegex.exec(content)) !== null) {
        const block = match[1] || match[2];
        if (block) {
          const lines = block.split('\n');
          for (const line of lines) {
            const clean = line.replace(/["\s]/g, '');
            if (clean) imports.push(clean);
          }
        }
      }
    }

    return imports;
  }

  /**
   * Builds the full dependency DAG for a directory
   * @param {string} [targetDir]
   * @returns {object} Graph metadata summary
   */
  buildGraph(targetDir = this.baseDir) {
    this.dependencyGraph.clear();
    this.reverseGraph.clear();
    const effectiveBase = targetDir || this.baseDir;

    const ignoredNames = new Set([
      'node_modules',
      '.git',
      '.missions',
      '.next',
      '.turbo',
      '.venv',
      'venv',
      'env',
      '__pycache__',
      'dist',
      'build',
      '.tempmediaStorage',
      'coverage',
      '.cache'
    ]);

    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (ignoredNames.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.missions') continue;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.ts', '.mjs', '.py', '.rs', '.go', '.jsx', '.tsx'].includes(ext)) {
            const relPath = path.relative(effectiveBase, fullPath).replace(/\\/g, '/');
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const imports = this.extractImports(fullPath, content);
              
              if (!this.dependencyGraph.has(relPath)) {
                this.dependencyGraph.set(relPath, new Set());
              }

              for (const imp of imports) {
                let resolvedImp = imp;
                if (imp.startsWith('.')) {
                  const dirOfFile = path.dirname(fullPath);
                  const resolvedTarget = path.resolve(dirOfFile, imp);
                  resolvedImp = path.relative(effectiveBase, resolvedTarget).replace(/\\/g, '/');
                  if (!path.extname(resolvedImp)) {
                    for (const testExt of ['.js', '.ts', '.mjs', '.jsx', '.tsx', '/index.js', '/index.ts']) {
                      if (fs.existsSync(path.resolve(effectiveBase, resolvedImp + testExt))) {
                        resolvedImp = (resolvedImp + testExt).replace(/\\/g, '/');
                        break;
                      }
                    }
                  }
                }

                this.dependencyGraph.get(relPath).add(resolvedImp);

                if (!this.reverseGraph.has(resolvedImp)) {
                  this.reverseGraph.set(resolvedImp, new Set());
                }
                this.reverseGraph.get(resolvedImp).add(relPath);

                if (resolvedImp !== imp) {
                  if (!this.reverseGraph.has(imp)) {
                    this.reverseGraph.set(imp, new Set());
                  }
                  this.reverseGraph.get(imp).add(relPath);
                }
              }
            } catch {
              // Ignore unreadable files gracefully
            }
          }
        }
      }
    };

    scanDirectory(targetDir);

    return {
      total_files: this.dependencyGraph.size,
      total_dependencies: Array.from(this.dependencyGraph.values()).reduce((acc, s) => acc + s.size, 0),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Computes the causal blast radius of mutating a specific target file
   * @param {string} targetFile
   * @returns {object} Blast radius analysis with risk score and affected paths
   */
  calculateBlastRadius(targetFile) {
    const normalizedTarget = targetFile.replace(/\\/g, '/');
    const directDependents = Array.from(this.reverseGraph.get(normalizedTarget) || []);
    const visited = new Set();
    const queue = [...directDependents];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!visited.has(current)) {
        visited.add(current);
        const nextLevel = Array.from(this.reverseGraph.get(current) || []);
        for (const dep of nextLevel) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }

    const transitiveDependents = Array.from(visited).filter(f => !directDependents.includes(f));
    const totalAffected = directDependents.length + transitiveDependents.length;

    let riskLevel = 'LOW';
    if (totalAffected >= 10) riskLevel = 'CRITICAL';
    else if (totalAffected >= 5) riskLevel = 'HIGH';
    else if (totalAffected >= 2) riskLevel = 'MEDIUM';

    const report = {
      target_file: normalizedTarget,
      direct_dependents: directDependents,
      transitive_dependents: transitiveDependents,
      total_affected_count: totalAffected,
      risk_level: riskLevel,
      recommended_action: riskLevel === 'CRITICAL' ? 'REQUIRE_PEER_REVIEW_AND_FULL_REGRESSION' : 'STANDARD_TDD_CYCLE',
      timestamp: new Date().toISOString()
    };

    report.sha256 = calculateSha256(JSON.stringify(report));
    return report;
  }
}
