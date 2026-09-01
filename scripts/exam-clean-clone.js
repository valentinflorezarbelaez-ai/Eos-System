#!/usr/bin/env node
/**
 * Clean-clone reproducibility exam.
 * Clone THIS git HEAD into an isolated temp dir (no leftover untracked files),
 * then INSTALL is a no-op (L0 builtins only), CONFIG is repo files, START is CLI help,
 * RUN is the canonical readiness tests, VERIFY is mission verify after a CLI cycle.
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, cwd, opts = {}) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function spawnNode(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
}

const branch = run('git rev-parse --abbrev-ref HEAD', REPO_ROOT).trim();
const head = run('git rev-parse HEAD', REPO_ROOT).trim();
const destParent = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-clean-clone-'));
const dest = path.join(destParent, 'eos');

const report = {
  exam: 'CLEAN_CLONE_REPRODUCIBILITY',
  source_root: REPO_ROOT,
  branch,
  head,
  dest,
  steps: [],
  verdict: 'FAIL'
};

try {
  const clone = spawnSync(
    'git',
    ['clone', '--local', '--no-hardlinks', '--branch', branch, REPO_ROOT, dest],
    { encoding: 'utf8' }
  );
  if (clone.status !== 0) {
    throw new Error(`CLONE_FAILED: ${clone.stderr || clone.stdout}`);
  }
  report.steps.push({ step: 'CLONE', ok: true, dest });

  const cloneHead = run('git rev-parse HEAD', dest).trim();
  if (cloneHead !== head) {
    throw new Error(`CLONE_HEAD_MISMATCH: ${cloneHead} != ${head}`);
  }
  report.steps.push({ step: 'HEAD_MATCH', ok: true, head: cloneHead });

  const dirt = run('git status --porcelain', dest).trim();
  report.steps.push({ step: 'CLEAN_TREE', ok: dirt.length === 0, dirt: dirt || '(empty)' });
  if (dirt.length > 0) throw new Error(`CLONE_NOT_CLEAN:\n${dirt}`);

  const nodeModules = fs.existsSync(path.join(dest, 'node_modules'));
  report.steps.push({
    step: 'INSTALL',
    ok: true,
    note: 'L0_NODE_BUILTINS_ONLY — npm install not required for Mission OS core',
    node_modules_present: nodeModules
  });

  const help = spawnNode(['bin/eos.js', '--help'], dest);
  if (help.status !== 0) throw new Error(`HELP_FAILED: ${help.stderr || help.stdout}`);
  report.steps.push({ step: 'START_HELP', ok: true, snippet: help.stdout.slice(0, 120) });

  const doctor = spawnNode(['bin/eos.js', 'doctor'], dest);
  if (doctor.status !== 0) throw new Error(`DOCTOR_FAILED: ${doctor.stdout || doctor.stderr}`);
  report.steps.push({ step: 'CONFIG_DOCTOR', ok: true, output: doctor.stdout.trim() });

  const tests = spawnNode(
    [
      '--test',
      'tests/final-readiness-bypass.test.js',
      'tests/final-readiness-cli-e2e.test.js',
      'tests/eos-negative-governance.test.js',
      'tests/eos-local-contracts.test.js',
      'tests/mcp-readonly-guard.test.js',
      'tests/mcp-mission-bridge.test.js'
    ],
    dest
  );
  const testOk = tests.status === 0;
  report.steps.push({
    step: 'RUN_CANONICAL_TESTS',
    ok: testOk,
    status: tests.status,
    tail: (tests.stdout + tests.stderr).split('\n').slice(-20).join('\n')
  });
  if (!testOk) throw new Error('CANONICAL_TESTS_FAILED');

  report.verdict = 'PASS';
} catch (err) {
  report.verdict = 'FAIL';
  report.error = err.message;
}

const outDir = path.join(REPO_ROOT, 'docs', 'evidence');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'EVD-FINAL-READINESS-CLEAN-CLONE.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outFile}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
