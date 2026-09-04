/**
 * @module FirstPrinciplesSimplifierEngine
 * @description First-Principles (Elon Musk Rule 2) code analyzer and architectural simplifier.
 * Detects code bloat, unnecessary wrapper layers, unused abstractions, and suggests minimal surgical simplifications.
 */

import { createHash, randomBytes } from 'node:crypto';

export class FirstPrinciplesSimplifierEngine {
  constructor(options = {}) {
    this.simplificationLog = [];
  }

  /**
   * Analyzes source code for architectural bloat and complexity
   * @param {string} sourceCode
   * @param {object} [options]
   * @returns {object} Complexity and bloat analysis
   */
  analyzeCodeComplexity(sourceCode = '', options = {}) {
    if (typeof sourceCode !== 'string') {
      throw new Error('SIMPLIFIER_ERROR: sourceCode must be a string');
    }

    const lines = sourceCode.split(/\r?\n/);
    const totalLines = lines.length;
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*'));
    const codeLines = nonEmptyLines.length - commentLines.length;

    // Cyclomatic complexity estimation via keyword branch counting
    const branchKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '??', '?'];
    let branchCount = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      for (const kw of branchKeywords) {
        // Regex word boundary match
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const matches = (trimmed.match(regex) || []).length;
        branchCount += matches;
      }
    }

    // Detect pass-through wrapper functions (e.g. return this.underlying.call())
    const passThroughWrappers = [];
    const functionRegex = /(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{\s*return\s+(?:await\s+)?this\.([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]+)\([^)]*\);\s*\}/g;
    let match;
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      passThroughWrappers.push({
        wrapperFunction: match[1],
        targetService: match[2],
        targetMethod: match[3]
      });
    }

    // Detect redundant empty class/interface stubs
    const emptyClassRegex = /class\s+([a-zA-Z0-9_$]+)\s*(?:extends\s+([a-zA-Z0-9_$]+))?\s*\{\s*\}/g;
    const emptyClasses = [];
    while ((match = emptyClassRegex.exec(sourceCode)) !== null) {
      emptyClasses.push(match[1]);
    }

    // Compute Bloat Index (0.0 to 10.0)
    let bloatScore = 0;
    if (totalLines > 300) bloatScore += 2.0;
    if (passThroughWrappers.length >= 3) bloatScore += 3.0;
    else if (passThroughWrappers.length > 0) bloatScore += 1.5;

    if (emptyClasses.length > 0) bloatScore += Math.min(3.0, emptyClasses.length * 1.5);
    if (branchCount > 25) bloatScore += 2.5;
    else if (branchCount > 12) bloatScore += 1.5;

    if (codeLines > 0 && commentLines.length / codeLines > 1.5) bloatScore += 1.0;

    const finalBloatIndex = Math.min(10.0, Math.round(bloatScore * 10) / 10);

    return {
      metrics: {
        totalLines,
        codeLines,
        commentLines: commentLines.length,
        estimatedCyclomaticComplexity: branchCount,
        passThroughWrappersCount: passThroughWrappers.length,
        emptyClassesCount: emptyClasses.length
      },
      bloatIndex: finalBloatIndex,
      isOverEngineered: finalBloatIndex >= 4.0,
      detectedPatterns: {
        passThroughWrappers,
        emptyClasses
      }
    };
  }

  /**
   * Generates actionable first-principles simplification plan
   * @param {object} analysis
   * @returns {object} Simplification plan
   */
  generateSimplificationPlan(analysis = {}) {
    const recommendations = [];
    const patterns = analysis.detectedPatterns || {};

    if (patterns.passThroughWrappers?.length > 0) {
      recommendations.push({
        action: 'INLINE_PASSTHROUGH_WRAPPERS',
        target: patterns.passThroughWrappers.map(p => p.wrapperFunction),
        rationale: 'Delete redundant delegation layers and call underlying service directly',
        estimatedLineReduction: patterns.passThroughWrappers.length * 4
      });
    }

    if (patterns.emptyClasses?.length > 0) {
      recommendations.push({
        action: 'ELIMINATE_EMPTY_STUBS',
        target: patterns.emptyClasses,
        rationale: 'Remove zero-behavior class definitions and replace with direct references',
        estimatedLineReduction: patterns.emptyClasses.length * 3
      });
    }

    if (analysis.metrics?.estimatedCyclomaticComplexity > 20) {
      recommendations.push({
        action: 'DECOMPOSE_BRANCH_COMPLEXITY',
        rationale: 'Extract branching logic into strategy table or lookup map',
        estimatedComplexityReduction: Math.floor(analysis.metrics.estimatedCyclomaticComplexity * 0.4)
      });
    }

    const totalLinesSaved = recommendations.reduce((acc, r) => acc + (r.estimatedLineReduction || 0), 0);

    const plan = {
      plan_id: `SMP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      bloatIndex: analysis.bloatIndex || 0,
      isOverEngineered: analysis.isOverEngineered || false,
      recommendations,
      estimated_lines_saved: totalLinesSaved,
      timestamp: new Date().toISOString()
    };

    this.simplificationLog.push(plan);
    return plan;
  }
}
