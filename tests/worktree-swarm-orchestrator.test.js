import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { WorktreeSwarmOrchestrator } from '../src/core/orchestration/worktree-swarm-orchestrator.js';

function createTestGitRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-git-test-'));
  execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "EOS Test Runner"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@eos.local"', { cwd: tmpDir, stdio: 'pipe' });

  // Initial commit
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# EOS Test Repo\n');
  fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules\n');
  execSync('git add . && git commit -m "chore: initial commit"', { cwd: tmpDir, stdio: 'pipe' });

  return tmpDir;
}

test('WorktreeSwarmOrchestrator: provisions isolated worktree directory and dedicated branch', () => {
  const repoDir = createTestGitRepo();
  const orchestrator = new WorktreeSwarmOrchestrator({
    baseDir: repoDir,
    worktreeBaseDir: path.join(repoDir, '.eos', 'worktrees')
  });

  const spawned = orchestrator.spawnWorktree('task-01');

  assert.equal(spawned.taskId, 'task-01');
  assert.equal(spawned.branch, 'eos/swarm/task-01');
  assert.ok(fs.existsSync(spawned.worktreePath));
  assert.equal(spawned.status, 'PROVISIONED');

  // Verify list
  const list = orchestrator.listWorktrees();
  assert.ok(list.some(w => w.taskId === 'task-01'));

  // Clean up
  orchestrator.pruneWorktree('task-01');
  fs.rmSync(repoDir, { recursive: true, force: true });
});

test('WorktreeSwarmOrchestrator: executes commands inside the isolated worktree directory', () => {
  const repoDir = createTestGitRepo();
  const orchestrator = new WorktreeSwarmOrchestrator({
    baseDir: repoDir,
    worktreeBaseDir: path.join(repoDir, '.eos', 'worktrees')
  });

  orchestrator.spawnWorktree('task-exec');

  const execRes = orchestrator.executeInWorktree('task-exec', 'git branch --show-current');
  assert.equal(execRes.exitCode, 0);
  assert.equal(execRes.stdout, 'eos/swarm/task-exec');

  // Clean up
  orchestrator.pruneWorktree('task-exec');
  fs.rmSync(repoDir, { recursive: true, force: true });
});

test('WorktreeSwarmOrchestrator: gates reconciliation with Byzantine Arbitration and tests', () => {
  const repoDir = createTestGitRepo();
  const orchestrator = new WorktreeSwarmOrchestrator({
    baseDir: repoDir,
    worktreeBaseDir: path.join(repoDir, '.eos', 'worktrees')
  });

  orchestrator.spawnWorktree('task-reconcile');

  // 1. Reconcile with verified independent exit code 0
  const approved = orchestrator.reconcileWorktree('task-reconcile', {
    verificationCommand: 'git status'
  });

  assert.equal(approved.status, 'RECONCILED');
  assert.equal(approved.verdict, 'CONSENSUS_VERIFIED');
  assert.ok((approved.consensusEnvelope.consensus_id || approved.consensusEnvelope.consensusId).startsWith('CNS-'));

  // 2. Reconcile with failing verification command
  const rejected = orchestrator.reconcileWorktree('task-reconcile', {
    verificationCommand: 'node -e "process.exit(1)"'
  });

  assert.equal(rejected.status, 'RECONCILIATION_FAILED');
  assert.equal(rejected.verdict, 'REJECTED_MISSING_INDEPENDENT_EVIDENCE');

  // Clean up
  orchestrator.pruneWorktree('task-reconcile');
  fs.rmSync(repoDir, { recursive: true, force: true });
});

test('WorktreeSwarmOrchestrator: prunes worktree directory and ephemeral branch safely', () => {
  const repoDir = createTestGitRepo();
  const orchestrator = new WorktreeSwarmOrchestrator({
    baseDir: repoDir,
    worktreeBaseDir: path.join(repoDir, '.eos', 'worktrees')
  });

  orchestrator.spawnWorktree('task-prune');
  const targetPath = path.join(repoDir, '.eos', 'worktrees', 'task-prune');
  assert.ok(fs.existsSync(targetPath));

  const pruneResult = orchestrator.pruneWorktree('task-prune');
  assert.equal(pruneResult.status, 'PRUNED');
  assert.ok(!fs.existsSync(targetPath));

  // Clean up
  fs.rmSync(repoDir, { recursive: true, force: true });
});
