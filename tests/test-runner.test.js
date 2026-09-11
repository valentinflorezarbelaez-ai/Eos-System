import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { discoverTestFiles, SLIM_SUITE_EXCLUDES } from '../scripts/test-runner.js';

describe('EOS Test Runner: Discovery and Filtering', () => {
  it('TR-01: Discovers all test files recursively in tests directory', () => {
    const testsDir = path.resolve(process.cwd(), 'tests');
    const files = discoverTestFiles(testsDir);
    assert.ok(Array.isArray(files), 'Must return an array of file paths');
    // Floor: ROI2 engine quarantine removed research/canary harness suites.
    assert.ok(files.length >= 80, `Expected >= 80 live test files after ROI2 engine quarantine, discovered ${files.length}`);
    // Ceiling: stay slim vs pre-ROI2 bloat; Ladder 6-9 intentional governance
    // suites (R5, Ladder8 T-series, Ladder9 U-series) are CI-visible and
    // count as live. Mission A adversarial fuzz is opt-in via SLIM_SUITE_EXCLUDES
    // + npm run test:compute-worker (prefer exclude-from-slim over ceiling bump).
    // Hard lock remains; do not inflate casually.
    assert.ok(files.length <= 145, `Live tests/ should stay slim after ROI2 (+ Ladder6-9 intentional governance locks); discovered ${files.length}`);
    assert.ok(files.every(f => f.endsWith('.test.js')), 'All discovered files must end with .test.js');
  });

  it('TR-02: Returns empty array for non-existent directory', () => {
    const fakeDir = path.resolve(process.cwd(), 'non-existent-dir-12345');
    const files = discoverTestFiles(fakeDir);
    assert.deepEqual(files, []);
  });

  it('TR-03: Mission A fuzz is opt-in (excluded from slim discovery)', () => {
    const testsDir = path.resolve(process.cwd(), 'tests');
    const fuzzAbs = path.join(testsDir, 'runners', 'eos-compute-worker-fuzz.test.js');
    assert.ok(fs.existsSync(fuzzAbs), 'fuzz suite must remain on disk');
    assert.ok(SLIM_SUITE_EXCLUDES.has('eos-compute-worker-fuzz.test.js'), 'fuzz basename must be in SLIM_SUITE_EXCLUDES');
    const files = discoverTestFiles(testsDir);
    assert.ok(
      !files.some((f) => path.basename(f) === 'eos-compute-worker-fuzz.test.js'),
      'fuzz must not appear in default slim discovery'
    );
  });
});
