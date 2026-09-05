import test from 'node:test';
import assert from 'node:assert/strict';
import { JplSafetyAuditor } from '../src/core/formal/jpl-safety-auditor.js';

test('JplSafetyAuditor: audits code with bounded loops and asserts clean status', () => {
  const auditor = new JplSafetyAuditor();
  const cleanCode = `
    export function processItems(items) {
      if (!Array.isArray(items)) throw new Error('Invalid array');
      if (items.length === 0) return [];
      const MAX_ITERATIONS = 1000;
      for (let i = 0; i < Math.min(items.length, MAX_ITERATIONS); i++) {
        console.log(items[i]);
      }
      return items;
    }
  `;

  const report = auditor.auditContent(cleanCode, 'clean.js');
  assert.equal(report.status, 'JPL_COMPLIANT');
  assert.ok(report.jplComplianceIndex >= 85);
  assert.equal(report.findings.filter(f => f.severity === 'CRITICAL').length, 0);
});

test('JplSafetyAuditor: flags unbounded while(true) loop as critical Rule 2 violation', () => {
  const auditor = new JplSafetyAuditor();
  const dangerousCode = `
    export function spinForever() {
      while (true) {
        doSomething();
      }
    }
  `;

  const report = auditor.auditContent(dangerousCode, 'dangerous.js');
  assert.equal(report.status, 'JPL_DEFICIENT');
  assert.ok(report.findings.some(f => f.ruleId === 'JPL-RULE-02' && f.severity === 'CRITICAL'));
});

test('JplSafetyAuditor: detects assertion density deficit in exported functions', () => {
  const auditor = new JplSafetyAuditor({ minAssertionDensity: 2 });
  const noAssertionsCode = `
    export function op1() { return 1; }
    export function op2() { return 2; }
  `;

  const report = auditor.auditContent(noAssertionsCode, 'sparse.js');
  assert.ok(report.findings.some(f => f.ruleId === 'JPL-RULE-05'));
  assert.equal(report.metrics.exportedOperations, 2);
  assert.equal(report.metrics.assertionChecksFound, 0);
});
