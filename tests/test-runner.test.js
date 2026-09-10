import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { discoverTestFiles } from '../scripts/test-runner.js';

describe('EOS Test Runner: Discovery and Filtering', () => {
  it('TR-01: Discovers all test files recursively in tests directory', () => {
    const testsDir = path.resolve(process.cwd(), 'tests');
    const files = discoverTestFiles(testsDir);
    assert.ok(Array.isArray(files), 'Must return an array of file paths');
    // Floor: ROI2 engine quarantine removed research/canary harness suites.
    assert.ok(files.length >= 80, `Expected >= 80 live test files after ROI2 engine quarantine, discovered ${files.length}`);
    // Ceiling: stay slim vs pre-ROI2 bloat; Ladder 6-8 intentional governance
    // suites (R5 + Ladder8 T4/T5 locks) are CI-visible and
    // count as live — bump documented in EOS_R5 / EOS_T5 evidence (not a
    // quarantine reversal). Hard lock remains; do not inflate casually.
    assert.ok(files.length < 140, `Live tests/ should stay slim after ROI2 (+ Ladder6-8 intentional governance locks); discovered ${files.length}`);
    assert.ok(files.every(f => f.endsWith('.test.js')), 'All discovered files must end with .test.js');
  });

  it('TR-02: Returns empty array for non-existent directory', () => {
    const fakeDir = path.resolve(process.cwd(), 'non-existent-dir-12345');
    const files = discoverTestFiles(fakeDir);
    assert.deepEqual(files, []);
  });
});
