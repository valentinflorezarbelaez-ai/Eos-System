/**
 * Final readiness exam — real Mission CLI chain, not an in-memory fixture double.
 * create → plan → package → submit-return → verify → report → close
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EOS_BIN = path.join(REPO_ROOT, 'bin', 'eos.js');

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-cli-e2e-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'eos-cli-e2e', type: 'module' }));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'ok.js'), 'export const ok = true;\n');
  return root;
}

function eos(cwd, args) {
  return spawnSync(process.execPath, [EOS_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  });
}

test('CLI-E2E-01: eos doctor PASS without homedir leak', () => {
  const cwd = fixtureRoot();
  const r = eos(cwd, ['doctor']);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /VERDICT: PASS/);
  assert.match(r.stdout, /HOMEDIR_LEAK: NO/);
});

test('CLI-E2E-02: create → plan → package → submit → verify → report → close', () => {
  const cwd = fixtureRoot();

  const created = eos(cwd, ['mission', 'create', '--goal', 'Final readiness CLI exam', '--project', '.']);
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const idMatch = created.stdout.match(/Mission ID:\s+(\S+)/);
  assert.ok(idMatch, created.stdout);
  const missionId = idMatch[1];

  const planned = eos(cwd, ['mission', 'plan', missionId]);
  assert.equal(planned.status, 0, planned.stderr || planned.stdout);
  assert.match(planned.stdout, /Phase: PLAN/);

  const packed = eos(cwd, ['mission', 'package', missionId, '--target', 'cursor']);
  assert.equal(packed.status, 0, packed.stderr || packed.stdout);
  assert.match(packed.stdout, /Manifest SHA-256/);

  const taskId = `TASK-${missionId.replace('MIS-', '')}-01`;
  const returnPkg = {
    schema_version: '1.0.0',
    mission_id: missionId,
    task_id: taskId,
    status: 'COMPLETED',
    summary: 'CLI E2E return: documented local fixture change with tests.',
    affected_files: [{ path: 'src/ok.js', action: 'MODIFY' }],
    diff: '--- a/src/ok.js\n+++ b/src/ok.js\n+export const ok = true;\n',
    commands_executed: ['node --test'],
    tools_used: ['read_file', 'grep_search'],
    test_results: { total_tests: 1, passed_tests: 1, failed_tests: 0, pass_rate: 1.0 },
    evidence: { receipt_hashes: ['b'.repeat(64)] },
    unknowns: [],
    risks: [],
    nonce: `cli-e2e-${missionId}`
  };
  const returnPath = path.join(cwd, 'return.json');
  fs.writeFileSync(returnPath, JSON.stringify(returnPkg, null, 2));

  const submitted = eos(cwd, ['mission', 'submit', missionId, '--file', returnPath]);
  assert.equal(submitted.status, 0, submitted.stderr || submitted.stdout);
  assert.match(submitted.stdout, /Ingestion Verdict: ACCEPT/);

  const verified = eos(cwd, ['mission', 'verify', missionId]);
  assert.equal(verified.status, 0, verified.stderr || verified.stdout);
  assert.match(verified.stdout, /Cryptographic Verification PASSED/);

  const reported = eos(cwd, ['mission', 'report', missionId, '--format', 'json']);
  assert.equal(reported.status, 0, reported.stderr || reported.stdout);
  const report = JSON.parse(reported.stdout);
  assert.equal(report.executive_summary.epistemic_verdict, 'NOT_PROVEN');

  const closed = eos(cwd, ['mission', 'close', missionId]);
  assert.equal(closed.status, 0, closed.stderr || closed.stdout);
  assert.match(closed.stdout, /CLOSED\/COMPLETED/);

  const status = eos(cwd, ['mission', 'status', missionId]);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.match(status.stdout, /COMPLETED/);
});

test('CLI-E2E-03: replay of the same return file via a second CLI process is DENY', () => {
  const cwd = fixtureRoot();
  const created = eos(cwd, ['mission', 'create', '--goal', 'CLI replay exam', '--project', '.']);
  const missionId = created.stdout.match(/Mission ID:\s+(\S+)/)[1];
  assert.equal(eos(cwd, ['mission', 'plan', missionId]).status, 0);

  const taskId = `TASK-${missionId.replace('MIS-', '')}-01`;
  const returnPath = path.join(cwd, 'return.json');
  fs.writeFileSync(
    returnPath,
    JSON.stringify({
      schema_version: '1.0.0',
      mission_id: missionId,
      task_id: taskId,
      status: 'COMPLETED',
      summary: 'First submit then replay.',
      affected_files: [{ path: 'src/ok.js', action: 'MODIFY' }],
      diff: 'diff',
      commands_executed: [],
      tools_used: ['read_file'],
      test_results: { total_tests: 1, passed_tests: 1, failed_tests: 0, pass_rate: 1.0 },
      evidence: { receipt_hashes: ['c'.repeat(64)] },
      unknowns: [],
      risks: [],
      nonce: `cli-replay-${missionId}`
    })
  );

  const first = eos(cwd, ['mission', 'submit', missionId, '--file', returnPath]);
  assert.equal(first.status, 0, first.stderr || first.stdout);

  const replay = eos(cwd, ['mission', 'submit', missionId, '--file', returnPath]);
  assert.notEqual(replay.status, 0);
  assert.match(replay.stdout + replay.stderr, /REJECT|REPLAY_ATTEMPT_DETECTED/);
});
