#!/usr/bin/env node
/**
 * @file mutation-harness-gate.js
 * @description Custody gate validating that MutationTestingHarness operates
 * deterministically (Fail-Closed) for AI-generated code.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0
 *   Law VII: standard professional English
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MutationTestingHarness } from '../../src/core/sdd/mutation-testing-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export async function runMutationHarnessGate() {
  const report = {
    schema: 'eos.mutation_harness_gate.v1',
    ok: true,
    mode: 'MUTATION_TESTING_VERIFICATION',
    PRODUCTION_READY: 'NO',
    checks: [],
    failures: []
  };

  const tempDir = path.join(rootDir, 'temp', 'mutation-gate-' + Date.now());

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Create a dummy source file with logic to test
    const targetFile = 'math-utils.js';
    const targetCode = `
      export function isPositive(a) {
        return a > 0;
      }
      export function add(a, b) {
        return a + b;
      }
    `;
    fs.writeFileSync(path.join(tempDir, targetFile), targetCode, 'utf8');

    // Create a weak test that passes but survives logic inversion
    const testFile = 'math-utils.test.js';
    const testCode = `
      import test from 'node:test';
      import assert from 'node:assert/strict';
      import { isPositive, add } from './math-utils.js';

      test('isPositive returns true for positive numbers', () => {
        assert.equal(isPositive(5), true);
      });

      test('add adds two numbers', () => {
        // If '+' is mutated to '-', 0 + 0 and 0 - 0 are equal; this weak test survives '-'
        assert.equal(add(0, 0), 0);
      });
    `;
    fs.writeFileSync(path.join(tempDir, testFile), testCode, 'utf8');

    const harness = new MutationTestingHarness({ worktreePath: tempDir });
    harness.mutantsConfig = [
      { id: 'MathAddition', find: /\+/g, replace: '-' }
    ];

    const testCommand = `node --test ${testFile}`;
    const resilienceReport = harness.evaluateResilience(targetFile, testCommand);

    if (resilienceReport.totalMutants === 0) {
      report.failures.push('Mutation harness injected zero mutants.');
    } else if (resilienceReport.mutationScore === 100) {
      report.failures.push('Weak test scored 100%. Expected failure due to surviving mutant.');
    } else {
      report.checks.push({
        type: 'mutation-resilience-fail-closed',
        status: 'VERIFIED',
        detail: `Harness correctly detected weak test suite. Mutation score: ${resilienceReport.mutationScore}%`
      });
    }

  } catch (err) {
    report.failures.push(`Gate exception: ${err.message}`);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  if (report.failures.length > 0) {
    report.ok = false;
  }

  return report;
}

function formatReport(report) {
  const lines = [
    '=========================================================================',
    '      EOS LADDER 11 — MUTATION TESTING HARNESS GATE (FAIL-CLOSED)',
    '=========================================================================',
    `schema: ${report.schema}`,
    `mode: ${report.mode}`,
    `ok: ${report.ok}`,
    `PRODUCTION_READY: ${report.PRODUCTION_READY}`,
    ''
  ];

  for (const c of report.checks) {
    lines.push(`[VERIFIED] (${c.type}) ${c.detail}`);
  }

  if (report.failures.length > 0) {
    lines.push('');
    lines.push('FAILURES:');
    for (const f of report.failures) {
      lines.push(` - ${f}`);
    }
  }

  return lines.join('\n');
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runMutationHarnessGate().then(report => {
    console.log(formatReport(report));
    process.exit(report.ok ? 0 : 1);
  });
}
