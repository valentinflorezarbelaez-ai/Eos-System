#!/usr/bin/env node

/**
 * @file bin/eos-worktree.js
 * @version 1.0.0
 * @description Git Worktree Lifecycle Manager for EOS (Pure L0 Architecture).
 * Enables physical filesystem and branch isolation for concurrent agent sessions and subagents.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export class EosWorktreeManager {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot]
   * @param {string} [options.worktreeBaseDir]
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || process.cwd();
    this.worktreeBaseDir = options.worktreeBaseDir || path.join(this.repoRoot, '.eos-worktrees');
  }

  /**
   * Executes a git command safely in the repo root.
   * @param {string} cmd
   * @returns {string}
   */
  execGit(cmd) {
    return execSync(`git ${cmd}`, {
      cwd: this.repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  }

  /**
   * Creates an isolated worktree for a task.
   * @param {string} taskId - Unique task identifier (e.g., 'task-feat-auth-01')
   * @param {object} [opts]
   * @param {string} [opts.branch] - Custom branch name. Defaults to 'task/<taskId>'
   * @param {boolean} [opts.detached] - Whether to checkout in detached HEAD mode
   * @returns {{ success: boolean, taskId: string, path: string, branch: string }}
   */
  create(taskId, opts = {}) {
    if (!taskId || typeof taskId !== 'string' || !/^[a-zA-Z0-9_\-\.]+$/.test(taskId)) {
      throw new Error(`Invalid taskId: "${taskId}". Must contain only alphanumeric characters, hyphens, and underscores.`);
    }

    if (!fs.existsSync(this.worktreeBaseDir)) {
      fs.mkdirSync(this.worktreeBaseDir, { recursive: true });
    }

    const targetPath = path.join(this.worktreeBaseDir, taskId);
    if (fs.existsSync(targetPath)) {
      throw new Error(`Worktree already exists at destination: ${targetPath}`);
    }

    const branchName = opts.branch || `task/${taskId}`;
    let gitCmd = '';

    if (opts.detached) {
      gitCmd = `worktree add --detach "${targetPath}" HEAD`;
    } else {
      // Check if branch already exists
      let branchExists = false;
      try {
        this.execGit(`rev-parse --verify "${branchName}"`);
        branchExists = true;
      } catch {
        branchExists = false;
      }

      if (branchExists) {
        gitCmd = `worktree add "${targetPath}" "${branchName}"`;
      } else {
        gitCmd = `worktree add -b "${branchName}" "${targetPath}" HEAD`;
      }
    }

    this.execGit(gitCmd);

    return {
      success: true,
      taskId,
      path: targetPath,
      branch: branchName
    };
  }

  /**
   * Lists all currently registered Git worktrees.
   * @returns {Array<{ path: string, head: string, branch: string, bare: boolean, isEosWorktree: boolean }>}
   */
  list() {
    const raw = this.execGit('worktree list --porcelain');
    if (!raw) return [];

    const blocks = raw.split(/\r?\n\r?\n/);
    const worktrees = [];

    for (const block of blocks) {
      if (!block.trim()) continue;
      const lines = block.split(/\r?\n/);
      let wtPath = '';
      let head = '';
      let branch = '';
      let bare = false;

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          wtPath = line.substring(9).trim();
        } else if (line.startsWith('HEAD ')) {
          head = line.substring(5).trim();
        } else if (line.startsWith('branch ')) {
          branch = line.substring(7).trim().replace('refs/heads/', '');
        } else if (line === 'bare') {
          bare = true;
        }
      }

      const isEosWorktree = wtPath.includes('.eos-worktrees');
      worktrees.push({ path: wtPath, head, branch, bare, isEosWorktree });
    }

    return worktrees;
  }

  /**
   * Cleans up and deletes an isolated worktree.
   * @param {string} taskId
   * @param {object} [opts]
   * @param {boolean} [opts.force]
   * @returns {{ success: boolean, taskId: string, path: string }}
   */
  cleanup(taskId, opts = {}) {
    if (!taskId) {
      throw new Error('TaskId is required for worktree cleanup.');
    }

    const targetPath = path.join(this.worktreeBaseDir, taskId);
    const flag = opts.force ? '--force' : '';
    this.execGit(`worktree remove ${flag} "${targetPath}"`);

    // Clean up base directory if empty
    try {
      if (fs.existsSync(this.worktreeBaseDir)) {
        const files = fs.readdirSync(this.worktreeBaseDir);
        if (files.length === 0) {
          fs.rmdirSync(this.worktreeBaseDir);
        }
      }
    } catch {
      // Ignore cleanup error of empty dir
    }

    return {
      success: true,
      taskId,
      path: targetPath
    };
  }

  /**
   * Prunes stale worktree tracking information.
   * @returns {{ success: boolean }}
   */
  prune() {
    this.execGit('worktree prune');
    return { success: true };
  }
}

/**
 * CLI Entrypoint
 */
export async function runCLI(argv = process.argv.slice(2)) {
  const manager = new EosWorktreeManager();
  const command = argv[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
🌲 EOS GIT WORKTREE MANAGER (Harness Engineering Standard)
Usage:
  node bin/eos-worktree.js create <taskId> [--branch <name>] [--detached]
  node bin/eos-worktree.js list
  node bin/eos-worktree.js cleanup <taskId> [--force]
  node bin/eos-worktree.js prune
`);
    return;
  }

  try {
    switch (command) {
      case 'create': {
        const taskId = argv[1];
        if (!taskId) throw new Error('Usage: create <taskId>');
        let branch = null;
        let detached = false;

        for (let i = 2; i < argv.length; i++) {
          if (argv[i] === '--branch' && argv[i + 1]) branch = argv[++i];
          if (argv[i].startsWith('--branch=')) branch = argv[i].split('=')[1];
          if (argv[i] === '--detached') detached = true;
        }

        const res = manager.create(taskId, { branch, detached });
        console.log(`✔ [WORKTREE CREATED] Task: ${res.taskId}`);
        console.log(`   Path   : ${res.path}`);
        console.log(`   Branch : ${res.branch}`);
        break;
      }
      case 'list': {
        const list = manager.list();
        console.log(`🌲 Registered Git Worktrees (${list.length}):`);
        for (const wt of list) {
          const badge = wt.isEosWorktree ? '⚡ [EOS]' : '🏛️  [MAIN]';
          console.log(`   ${badge} ${wt.path} (${wt.branch || 'detached'}) [${wt.head.slice(0, 8)}]`);
        }
        break;
      }
      case 'cleanup': {
        const taskId = argv[1];
        if (!taskId) throw new Error('Usage: cleanup <taskId>');
        const force = argv.includes('--force');
        const res = manager.cleanup(taskId, { force });
        console.log(`✔ [WORKTREE REMOVED] Task: ${res.taskId}`);
        break;
      }
      case 'prune': {
        manager.prune();
        console.log('✔ [WORKTREES PRUNED] Stale tracking pruned successfully.');
        break;
      }
      default:
        throw new Error(`Unknown command: "${command}". Run with --help for usage.`);
    }
  } catch (err) {
    console.error(`🚨 [WORKTREE ERROR]: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('eos-worktree.js')) {
  runCLI();
}
