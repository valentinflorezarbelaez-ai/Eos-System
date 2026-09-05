/**
 * @module JplSafetyAuditor
 * @description NASA / JPL 10 Rules for Developing Safety-Critical Code Static Analyzer for EOS.
 * Enforces bounded loops, strict assertion density, and deterministic control flow (Gerard Holzmann / JPL).
 */

import fs from 'node:fs';
import path from 'node:path';

export const JPL_RULES = Object.freeze({
  RULE_1_SIMPLE_CONTROL_FLOW: {
    id: 'JPL-RULE-01',
    name: 'Simple Control Flow',
    description: 'Do not use setjmp/longjmp, goto, or complex recursion; keep control flow predictable.'
  },
  RULE_2_FIXED_LOOP_BOUNDS: {
    id: 'JPL-RULE-02',
    name: 'Fixed Loop Upper Bounds',
    description: 'All loops must have a statically verifiable upper bound to prevent infinite loops.'
  },
  RULE_5_ASSERTION_DENSITY: {
    id: 'JPL-RULE-05',
    name: 'Assertion Density',
    description: 'Safety-critical functions must contain at least 2 assertions or invariant checks.'
  },
  RULE_7_CHECK_RETURN_VALUES: {
    id: 'JPL-RULE-07',
    name: 'Check Return Values',
    description: 'The return value of all non-void functions must be checked by each calling function.'
  }
});

export class JplSafetyAuditor {
  constructor(options = {}) {
    this.minAssertionDensity = options.minAssertionDensity || 2;
  }

  /**
   * Audits a file against NASA/JPL safety rules.
   * @param {string} filePath
   * @returns {object} Audit report
   */
  auditFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JPL_SAFETY_FAULT: Target file [${filePath}] does not exist.`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return this.auditContent(content, path.basename(filePath));
  }

  /**
   * Audits code string against NASA/JPL safety rules.
   * @param {string} content
   * @param {string} [fileName='anonymous.js']
   * @returns {object} Audit report
   */
  auditContent(content, fileName = 'anonymous.js') {
    const lines = content.split('\n');
    const findings = [];

    // 1. Check Rule 2: Unbounded loops (while(true) or for(;;) without explicit max bounds)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (/\bwhile\s*\(\s*(?:true|1)\s*\)/i.test(trimmed)) {
        // Look ahead for MAX_ or break inside the loop body
        const snippet = lines.slice(idx, idx + 15).join(' ');
        if (!/MAX_|break|return|throw/i.test(snippet)) {
          findings.push({
            ruleId: JPL_RULES.RULE_2_FIXED_LOOP_BOUNDS.id,
            ruleName: JPL_RULES.RULE_2_FIXED_LOOP_BOUNDS.name,
            severity: 'CRITICAL',
            line: lineNum,
            message: 'Unbounded while(true) loop detected without explicit bound or termination guarantee.',
            snippet: trimmed
          });
        }
      }

      if (/\bfor\s*\(\s*;\s*;\s*\)/i.test(trimmed)) {
        findings.push({
          ruleId: JPL_RULES.RULE_2_FIXED_LOOP_BOUNDS.id,
          ruleName: JPL_RULES.RULE_2_FIXED_LOOP_BOUNDS.name,
          severity: 'CRITICAL',
          line: lineNum,
          message: 'Unbounded for(;;) infinite loop detected.',
          snippet: trimmed
        });
      }

      // Check Rule 1: Recursive self-invocation pattern in simple methods
      if (/\bfunction\s+([a-zA-Z0-9_]+)\b/.test(trimmed)) {
        const fnName = trimmed.match(/\bfunction\s+([a-zA-Z0-9_]+)\b/)[1];
        const bodySnippet = lines.slice(idx + 1, idx + 25).join(' ');
        if (new RegExp(`\\b${fnName}\\s*\\(`, 'i').test(bodySnippet) && !/depth|limit|max/i.test(bodySnippet)) {
          findings.push({
            ruleId: JPL_RULES.RULE_1_SIMPLE_CONTROL_FLOW.id,
            ruleName: JPL_RULES.RULE_1_SIMPLE_CONTROL_FLOW.name,
            severity: 'WARNING',
            line: lineNum,
            message: `Potential un-bounded recursion detected in function [${fnName}].`,
            snippet: trimmed
          });
        }
      }
    });

    // 2. Check Rule 5: Assertion Density
    // Count exported functions and total assertions/checks
    let exportedFunctionsCount = 0;
    let assertionCount = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (/export\s+(?:async\s+)?function\b|export\s+class\b|\b(?:public|export)\s+[a-zA-Z0-9_]+\s*\(/i.test(trimmed)) {
        exportedFunctionsCount++;
      }
      if (/\bassert\b|\bif\s*\(.*?\)\s*throw\b|\bif\s*\(.*?\)\s*return\s+(?:false|null|undefined|{\s*success:\s*false)/i.test(trimmed)) {
        assertionCount++;
      }
    });

    const expectedMinAssertions = exportedFunctionsCount * this.minAssertionDensity;
    const assertionDensityDeficit = Math.max(0, expectedMinAssertions - assertionCount);

    if (exportedFunctionsCount > 0 && assertionCount < expectedMinAssertions) {
      findings.push({
        ruleId: JPL_RULES.RULE_5_ASSERTION_DENSITY.id,
        ruleName: JPL_RULES.RULE_5_ASSERTION_DENSITY.name,
        severity: 'RECOMMENDATION',
        line: 1,
        message: `Assertion density deficit: Found ${assertionCount} checks for ${exportedFunctionsCount} exported operations. Minimum recommended: ${expectedMinAssertions} (${this.minAssertionDensity} per operation).`
      });
    }

    // Calculate JPL Compliance Index (0.0 to 100.0)
    let deductions = 0;
    findings.forEach(f => {
      if (f.severity === 'CRITICAL') deductions += 25;
      else if (f.severity === 'WARNING') deductions += 10;
      else if (f.severity === 'RECOMMENDATION') deductions += 5;
    });

    const jplComplianceIndex = Math.max(0, Math.min(100, 100 - deductions));

    return {
      file: fileName,
      jplComplianceIndex,
      status: jplComplianceIndex >= 85 ? 'JPL_COMPLIANT' : 'JPL_DEFICIENT',
      findingsCount: findings.length,
      metrics: {
        totalLines: lines.length,
        exportedOperations: exportedFunctionsCount,
        assertionChecksFound: assertionCount,
        densityPerOperation: exportedFunctionsCount > 0 ? Number((assertionCount / exportedFunctionsCount).toFixed(2)) : 0
      },
      findings
    };
  }
}
