import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RCAEngine } from '../src/core/elevate/rca-engine.js';
import { TDDAutoHealer } from '../src/core/elevate/tdd-auto-healer.js';

test('EOS-ELEVATE: RCA Engine & TDD Auto-Healing DAG', async (t) => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-elevate-rca-fixture-'));

  // Create sample code fixture
  const calcFile = path.join(fixtureDir, 'calculator.js');
  fs.writeFileSync(calcFile, `
    function divide(a, b) {
      return a / b; // Bug: no zero division guard
    }
    module.exports = { divide };
  `, 'utf8');

  await t.test('RCA-01: Groups correlated symptoms into single causal root issue', () => {
    const rawFindings = [
      { id: 'F1', ruleId: 'QUAL-UNCHECKED-ZERO', file: 'calculator.js', line: 3, symptom: 'Divide by zero returns Infinity' },
      { id: 'F2', ruleId: 'QUAL-UNCHECKED-ZERO', file: 'calculator.js', line: 3, symptom: 'Potential NaN propagation' },
      { id: 'F3', ruleId: 'SEC-HARDCODED-SECRET', file: 'config.js', line: 10, symptom: 'API key exposed' }
    ];

    const rca = new RCAEngine();
    const dag = rca.analyze(rawFindings);

    assert.equal(dag.rootCauses.length, 2, 'Should cluster 3 symptoms into 2 root causes');
    assert.equal(dag.tasks.length, 2, 'Should generate 2 remediation tasks');
  });

  await t.test('RCA-02: Orders remediation tasks topologically by blast radius and severity', () => {
    const rawFindings = [
      { id: 'F1', severity: 'LOW', file: 'docs.js', ruleId: 'DOCS-MISSING' },
      { id: 'F2', severity: 'CRITICAL', file: 'auth.js', ruleId: 'SEC-HARDCODED-SECRET' },
      { id: 'F3', severity: 'HIGH', file: 'payment.js', ruleId: 'QUAL-SWALLOWED-ERROR' }
    ];

    const rca = new RCAEngine();
    const dag = rca.analyze(rawFindings);

    assert.equal(dag.tasks[0].severity, 'CRITICAL');
    assert.equal(dag.tasks[1].severity, 'HIGH');
    assert.equal(dag.tasks[2].severity, 'LOW');
  });

  await t.test('HEAL-01: TDD Auto-Healer creates failing test, patches, and proves pass', async () => {
    const healer = new TDDAutoHealer({ targetPath: fixtureDir });

    const task = {
      id: 'TASK-DIVIDE-ZERO',
      file: 'calculator.js',
      description: 'Add division by zero guard throwing RangeError',
      testCode: `
        const assert = require('node:assert/strict');
        const { divide } = require('./calculator.js');
        assert.throws(() => divide(10, 0), RangeError);
      `,
      patch: (code) => {
        return code.replace('return a / b;', 'if (b === 0) throw new RangeError("Division by zero");\n      return a / b;');
      }
    };

    const result = await healer.executeTask(task);

    assert.equal(result.status, 'REMEDIATED');
    assert.equal(result.falsified, true, 'Must prove failure first (Red)');
    assert.equal(result.verified, true, 'Must prove pass post-patch (Green)');

    // Verify file content was patched
    const updatedCode = fs.readFileSync(calcFile, 'utf8');
    assert(updatedCode.includes('Division by zero'));
  });

  await t.test('HEAL-02: Executes atomic rollback if remediation breaks invariants', async () => {
    const healer = new TDDAutoHealer({ targetPath: fixtureDir });
    const originalContent = fs.readFileSync(calcFile, 'utf8');

    const breakingTask = {
      id: 'TASK-BROKEN-PATCH',
      file: 'calculator.js',
      description: 'Introduce syntax breaking change',
      testCode: `
        const assert = require('node:assert/strict');
        const { divide } = require('./calculator.js');
        assert.equal(divide(10, 2), 5);
      `,
      patch: () => {
        return 'ILLEGAL SYNTAX ::: BREAK EVERYTHING';
      }
    };

    const result = await healer.executeTask(breakingTask);

    assert.equal(result.status, 'ROLLED_BACK');
    assert.equal(result.verified, false);

    // Verify rollback restored original content
    const restoredContent = fs.readFileSync(calcFile, 'utf8');
    assert.equal(restoredContent, originalContent, 'Rollback must preserve exact pre-patch code');
  });

  // Cleanup
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});
