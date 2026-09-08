import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { discoverTestFiles } from '../scripts/test-runner.js';

describe('EOS Test Runner: Discovery and Filtering', () => {
  it('TR-01: Discovers all test files recursively in tests directory', () => {
    const testsDir = path.resolve(process.cwd(), 'tests');
    const files = discoverTestFiles(testsDir);
    assert.ok(Array.isArray(files), 'Must return an array of file paths');
    assert.ok(files.length >= 80, `Expected >= 80 live test files after ROI2 engine quarantine, discovered ${files.length}`);
    assert.ok(files.length < 120, `Live tests/ should stay slim after ROI2; discovered ${files.length}`);
    assert.ok(files.every(f => f.endsWith('.test.js')), 'All discovered files must end with .test.js');
  });

  it('TR-02: Returns empty array for non-existent directory', () => {
    const fakeDir = path.resolve(process.cwd(), 'non-existent-dir-12345');
    const files = discoverTestFiles(fakeDir);
    assert.deepEqual(files, []);
  });
});
