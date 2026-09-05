/**
 * @module ScannerCouncil
 * @description Multi-vector static analysis and code audit council for EOS-ELEVATE.
 * Evaluates codebases across 5 core dimensions: Security, Architecture, Quality, Performance, and Accessibility/SEO.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.astro',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.system_generated'
]);

export class ScannerCouncil {
  /**
   * @param {object} options
   * @param {string} options.targetPath Base directory to scan
   */
  constructor(options = {}) {
    this.targetPath = path.resolve(options.targetPath || process.cwd());
  }

  /**
   * Recursively discovers all relevant source files in target directory
   * @returns {string[]}
   */
  discoverFiles() {
    const fileList = [];
    const walk = (dir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          fileList.push(fullPath);
        }
      }
    };
    walk(this.targetPath);
    return fileList;
  }

  /**
   * Reads file safely, rejecting binary or oversized files (>5MB)
   * @param {string} filePath
   * @returns {string|null}
   */
  readFileSafely(filePath) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > 5 * 1024 * 1024) return null; // Skip oversized files
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  /**
   * Vector 1: Security Audit
   * @returns {Promise<Array<object>>}
   */
  async scanSecurity() {
    const findings = [];
    const files = this.discoverFiles();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.env'].includes(ext)) continue;
      const content = this.readFileSafely(file);
      if (!content) continue;

      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const relPath = path.relative(this.targetPath, file);

        // Check for hardcoded API keys & cloud tokens
        if (/(?:sk-proj-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36})/i.test(line)) {
          findings.push({
            ruleId: 'SEC-HARDCODED-SECRET',
            vector: 'security',
            severity: 'CRITICAL',
            file: relPath,
            line: lineNum,
            message: 'High-entropy secret or API key credential detected in source code.',
            remediation: 'Extract credentials to environment variables or vault secrets manager.'
          });
        }

        // Check for unsafe eval or dynamic code execution
        if (/\beval\s*\(/.test(line) || /new\s+Function\s*\(/.test(line)) {
          findings.push({
            ruleId: 'SEC-UNSAFE-EVAL',
            vector: 'security',
            severity: 'HIGH',
            file: relPath,
            line: lineNum,
            message: 'Use of eval() or dynamic code constructor creates remote code execution hazards.',
            remediation: 'Refactor to safe static AST expression evaluators or JSON.parse.'
          });
        }
      });
    }

    return findings;
  }

  /**
   * Vector 2: Architecture & Boundary Leak Audit
   * @returns {Promise<Array<object>>}
   */
  async scanArchitecture() {
    const findings = [];
    const files = this.discoverFiles();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(ext)) continue;
      const content = this.readFileSafely(file);
      if (!content) continue;

      const relPath = path.relative(this.targetPath, file);
      const isUi = /view|component|ui|pages|templates/i.test(file);

      // Check presentation layer importing database/infrastructure directly
      if (isUi) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (/(?:require|import).*?(?:infra|database|db-pool|sql|knex|prisma)/i.test(line) || /SELECT\s+.*?\s+FROM/i.test(line)) {
            findings.push({
              ruleId: 'ARCH-LAYER-LEAK',
              vector: 'architecture',
              severity: 'MEDIUM',
              file: relPath,
              line: idx + 1,
              message: 'Presentation component communicates directly with Infrastructure/Database without Domain abstraction.',
              remediation: 'Route data queries through an Application Service or Port adapter.'
            });
          }
        });
      }

      // Check for monolithic God files (>600 lines)
      const lineCount = content.split('\n').length;
      if (lineCount > 600 && !file.includes('schema') && !file.includes('data')) {
        findings.push({
          ruleId: 'ARCH-MONOLITHIC-FILE',
          vector: 'architecture',
          severity: 'LOW',
          file: relPath,
          line: 1,
          message: `Monolithic file exceeds architectural complexity threshold (${lineCount} lines).`,
          remediation: 'Decompose module into focused atomic SRP (Single Responsibility Principle) units.'
        });
      }
    }

    return findings;
  }

  /**
   * Vector 3: Quality, Syntax & Anti-Pattern Audit
   * @returns {Promise<Array<object>>}
   */
  async scanQuality() {
    const findings = [];
    const files = this.discoverFiles();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(ext)) continue;
      const content = this.readFileSafely(file);
      if (!content) continue;

      const relPath = path.relative(this.targetPath, file);

      // Detect empty/swallowing catch blocks across single or multi-line
      const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|\s)*\}/g;
      let match;
      while ((match = emptyCatchRegex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        findings.push({
          ruleId: 'QUAL-SWALLOWED-ERROR',
          vector: 'quality',
          severity: 'HIGH',
          file: relPath,
          line: lineNum,
          message: 'Empty catch block silently swallows exceptions, obscuring runtime failures.',
          remediation: 'Log the error explicitly or propagate with context.'
        });
      }
    }

    return findings;
  }

  /**
   * Vector 4: Performance & Resource Efficiency Audit
   * @returns {Promise<Array<object>>}
   */
  async scanPerformance() {
    const findings = [];
    const files = this.discoverFiles();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(ext)) continue;
      const content = this.readFileSafely(file);
      if (!content) continue;

      const relPath = path.relative(this.targetPath, file);
      const isHandlerOrService = /service|handler|route|api|worker|controller|processor/i.test(file);

      if (isHandlerOrService) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (/fs\.readFileSync|fs\.writeFileSync|fs\.existsSync/.test(line)) {
            findings.push({
              ruleId: 'PERF-BLOCKING-SYNC-IO',
              vector: 'performance',
              severity: 'MEDIUM',
              file: relPath,
              line: idx + 1,
              message: 'Synchronous file I/O blocks the Node.js event loop in request/service paths.',
              remediation: 'Replace with non-blocking promises API (fs.promises).'
            });
          }
        });
      }
    }

    return findings;
  }

  /**
   * Vector 5: Accessibility & Semantic Structure Audit
   * @returns {Promise<Array<object>>}
   */
  async scanAccessibility() {
    const findings = [];
    const files = this.discoverFiles();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.html', '.jsx', '.tsx', '.astro', '.vue'].includes(ext)) continue;
      const content = this.readFileSafely(file);
      if (!content) continue;

      const relPath = path.relative(this.targetPath, file);
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Image missing alt attribute
        if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(line)) {
          findings.push({
            ruleId: 'A11Y-MISSING-ALT',
            vector: 'accessibility',
            severity: 'HIGH',
            file: relPath,
            line: idx + 1,
            message: 'Image element missing alt attribute violates WCAG 2.1 AA (1.1.1 Non-text Content).',
            remediation: 'Add descriptive alt text or alt="" for decorative images.'
          });
        }

        // Empty button element
        if (/<button\b[^>]*>\s*<\/button>/i.test(line)) {
          findings.push({
            ruleId: 'A11Y-EMPTY-BUTTON',
            vector: 'accessibility',
            severity: 'HIGH',
            file: relPath,
            line: idx + 1,
            message: 'Interactive button missing discernible text or aria-label violates WCAG 4.1.2.',
            remediation: 'Provide descriptive text or aria-label attribute.'
          });
        }
      });
    }

    return findings;
  }

  /**
   * Executes 360-degree multi-vector scan in parallel
   * @returns {Promise<object>}
   */
  async runFullScan() {
    const [security, architecture, quality, performance, accessibility] = await Promise.all([
      this.scanSecurity(),
      this.scanArchitecture(),
      this.scanQuality(),
      this.scanPerformance(),
      this.scanAccessibility()
    ]);

    const allFindings = [
      ...security,
      ...architecture,
      ...quality,
      ...performance,
      ...accessibility
    ];

    const summary = {
      totalScannedFiles: this.discoverFiles().length,
      totalFindings: allFindings.length,
      bySeverity: {
        critical: allFindings.filter(f => f.severity === 'CRITICAL').length,
        high: allFindings.filter(f => f.severity === 'HIGH').length,
        medium: allFindings.filter(f => f.severity === 'MEDIUM').length,
        low: allFindings.filter(f => f.severity === 'LOW').length
      },
      byVector: {
        security: security.length,
        architecture: architecture.length,
        quality: quality.length,
        performance: performance.length,
        accessibility: accessibility.length
      }
    };

    const digestPayload = JSON.stringify({ summary, findings: allFindings });
    const digest = crypto.createHash('sha256').update(digestPayload).digest('hex');

    return {
      timestamp: new Date().toISOString(),
      targetPath: this.targetPath,
      digest,
      summary,
      findings: allFindings
    };
  }
}
