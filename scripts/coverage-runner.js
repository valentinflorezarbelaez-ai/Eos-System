#!/usr/bin/env node
/**
 * @file scripts/coverage-runner.js
 * @description L0 coverage gate for the default EOS test suite.
 * Runs the slim test discovery with Node's experimental coverage and fails
 * when line/branch/function coverage drops below the locked baseline.
 */

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { discoverTestFiles } from './test-runner.js';

const THRESHOLDS = Object.freeze({
  lines: Number(process.env.EOS_COVERAGE_MIN_LINES || 73),
  branches: Number(process.env.EOS_COVERAGE_MIN_BRANCHES || 66),
  functions: Number(process.env.EOS_COVERAGE_MIN_FUNCTIONS || 72)
});

const testsDir = path.resolve(process.cwd(), 'tests');
const files = discoverTestFiles(testsDir);
if (files.length === 0) {
  console.error('[EOS COVERAGE] No test files discovered.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--experimental-test-coverage', ...files],
  {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    timeout: 300000
  }
);

const clean = (value) => String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
const stdout = clean(result.stdout);
const stderr = clean(result.stderr);
if (stdout) process.stdout.write(result.stdout);
if (stderr) process.stderr.write(result.stderr);

const match = stdout.match(
  /all files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/
);
if (!match) {
  console.error('[EOS COVERAGE] Could not parse the "all files" coverage row.');
  process.exit(1);
}

const [lines, branches, functions] = match.slice(1).map(Number);
const failures = [];
if (lines < THRESHOLDS.lines) failures.push(`lines ${lines}% < ${THRESHOLDS.lines}%`);
if (branches < THRESHOLDS.branches) failures.push(`branches ${branches}% < ${THRESHOLDS.branches}%`);
if (functions < THRESHOLDS.functions) failures.push(`functions ${functions}% < ${THRESHOLDS.functions}%`);

console.log('');
console.log('[EOS COVERAGE] measured:', { lines, branches, functions });
console.log('[EOS COVERAGE] thresholds:', THRESHOLDS);

if (result.status !== 0) {
  console.error(`[EOS COVERAGE] Test runner exited with ${result.status}.`);
  process.exit(result.status ?? 1);
}
if (failures.length > 0) {
  console.error('[EOS COVERAGE] FAIL: ' + failures.join('; '));
  process.exit(1);
}
console.log('[EOS COVERAGE] PASS');
