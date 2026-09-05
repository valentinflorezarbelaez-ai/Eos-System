/**
 * @module WorktreeSwarmOrchestrator
 * @description Implements Boris Cherny's Massive Parallelism Doctrine for EOS.
 * Provisions isolated git worktrees (.eos/worktrees/<taskId>) on dedicated branches,
 * runs sandboxed execution, and gates reconciliation via Byzantine Arbitration (SPEC-EOS-008).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { MultiAgentArbitrationEngine } from '../governance/multi-agent-arbitration-engine.js';

export class WorktreeSwarmOrchestrator {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir] Repository root path
   * @param {string} [options.worktreeBaseDir] Subdirectory for worktrees
   * @param {MultiAgentArbitrationEngine} [options.arbitrationEngine]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.worktreeBaseDir = options.worktreeBaseDir || path.resolve(this.baseDir, '.eos/worktrees');
    this.arbitrationEngine = options.arbitrationEngine || new MultiAgentArbitrationEngine({ baseDir: this.baseDir });
    this.registryPath = path.join(this.worktreeBaseDir, 'WORKTREE_REGISTRY.json');
  }

  /**
   * Provisions an isolated ephemeral git worktree for a task.
   * @param {string} taskId
   * @param {object} [options]
   * @param {string} [options.baseBranch='HEAD']
   * @returns {object} Worktree metadata
   */
  spawnWorktree(taskId, options = {}) {
    if (!taskId || typeof taskId !== 'string') {
      throw new Error('SWARM_FAULT: Valid taskId string is required.');
    }

    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
    const branchName = `eos/swarm/${safeTaskId}`;
    const targetPath = path.resolve(this.worktreeBaseDir, safeTaskId);

    this.ensureWorktreeBaseDir();

    if (fs.existsSync(targetPath)) {
      return {
        taskId: safeTaskId,
        worktreePath: targetPath,
        branch: branchName,
        status: 'ALREADY_EXISTS',
        reused: true
      };
    }

    const baseBranch = options.baseBranch || 'HEAD';

    try {
      // Create worktree with new isolated branch
      execSync(`git worktree add -b "${branchName}" "${targetPath}" "${baseBranch}"`, {
        cwd: this.baseDir,
        stdio: 'pipe',
        encoding: 'utf8'
      });
    } catch (err) {
      // If branch already exists, add without -b
      try {
        execSync(`git worktree add "${targetPath}" "${branchName}"`, {
          cwd: this.baseDir,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (nestedErr) {
        throw new Error(`SWARM_PROVISION_ERROR: Failed to add git worktree: ${err.message} (${nestedErr.message})`);
      }
    }

    const metadata = {
      taskId: safeTaskId,
      worktreePath: targetPath,
      branch: branchName,
      baseBranch,
      status: 'PROVISIONED',
      createdAt: new Date().toISOString()
    };

    this._recordWorktree(metadata);
    return metadata;
  }

  /**
   * Lists all active git worktrees discovered via git and registry.
   * @returns {object[]} List of active worktrees
   */
  listWorktrees() {
    const list = [];
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.baseDir,
        stdio: 'pipe',
        encoding: 'utf8'
      });

      const blocks = output.trim().split('\n\n');
      for (const block of blocks) {
        const lines = block.split('\n');
        let worktreePath = '';
        let branch = '';
        let head = '';

        for (const line of lines) {
          if (line.startsWith('worktree ')) worktreePath = line.replace('worktree ', '').trim();
          if (line.startsWith('branch ')) branch = line.replace('branch ', '').trim();
          if (line.startsWith('HEAD ')) head = line.replace('HEAD ', '').trim();
        }

        // Only include swarm worktrees
        if (worktreePath.includes('.eos') || branch.includes('eos/swarm/')) {
          const taskId = path.basename(worktreePath);
          list.push({
            taskId,
            worktreePath,
            branch,
            head,
            status: 'ACTIVE'
          });
        }
      }
    } catch {
      // Fallback to registry if git porcelain fails
      const registry = this._loadRegistry();
      return registry.worktrees || [];
    }

    return list;
  }

  /**
   * Executes a command inside the isolated worktree directory.
   * @param {string} taskId
   * @param {string} command
   * @param {object} [options]
   * @returns {object} { exitCode, stdout, stderr }
   */
  executeInWorktree(taskId, command, options = {}) {
    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
    const targetPath = path.resolve(this.worktreeBaseDir, safeTaskId);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`SWARM_FAULT: Worktree directory not found for task [${safeTaskId}] at ${targetPath}`);
    }

    try {
      const stdout = execSync(command, {
        cwd: targetPath,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: options.timeout || 30000,
        env: { ...process.env, ...options.env }
      });

      return {
        taskId: safeTaskId,
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: ''
      };
    } catch (err) {
      return {
        taskId: safeTaskId,
        exitCode: err.status || 1,
        stdout: err.stdout ? err.stdout.toString().trim() : '',
        stderr: err.stderr ? err.stderr.toString().trim() : err.message
      };
    }
  }

  /**
   * Reconciles a worktree: verifies tests and subjects to Byzantine Arbitration before merging.
   * @param {string} taskId
   * @param {object} [options]
   * @param {string} [options.verificationCommand]
   * @param {string} [options.targetBranch='main']
   * @returns {object} Reconciliation result
   */
  reconcileWorktree(taskId, options = {}) {
    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
    const targetPath = path.resolve(this.worktreeBaseDir, safeTaskId);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`SWARM_FAULT: Worktree directory not found for task [${safeTaskId}]`);
    }

    // 1. Run verification inside worktree if specified
    let verificationPassed = true;
    let verificationOutput = '';

    if (options.verificationCommand) {
      const execResult = this.executeInWorktree(safeTaskId, options.verificationCommand);
      if (execResult.exitCode !== 0) {
        verificationPassed = false;
        verificationOutput = execResult.stderr || execResult.stdout;
      }
    }

    // 2. Perform Byzantine Arbitration (SPEC-EOS-008)
    const proposal = {
      projectId: `SWARM-${safeTaskId}`,
      filePath: targetPath,
      scope: 'worktree-reconciliation',
      implementerClaim: 'DONE',
      verifierEvidence: {
        testsPassed: verificationPassed,
        exitCode: verificationPassed ? 0 : 1,
        logs: verificationOutput
      }
    };

    const deliberation = this.arbitrationEngine.conductCouncilDeliberation(proposal);

    if (deliberation.status !== 'CONSENSUS_VERIFIED') {
      return {
        taskId: safeTaskId,
        status: 'RECONCILIATION_FAILED',
        verdict: deliberation.status,
        vetoes: deliberation.veto_reasons || [],
        remediationOrder: deliberation.remediation_order,
        consensusEnvelope: deliberation
      };
    }

    // 3. Merging (if enabled and approved)
    const targetBranch = options.targetBranch || 'main';
    let merged = false;

    if (options.autoMerge) {
      try {
        const branchName = `eos/swarm/${safeTaskId}`;
        execSync(`git checkout "${targetBranch}" && git merge --ff-only "${branchName}"`, {
          cwd: this.baseDir,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        merged = true;
      } catch (err) {
        return {
          taskId: safeTaskId,
          status: 'MERGE_CONFLICT',
          error: err.message,
          deliberation
        };
      }
    }

    return {
      taskId: safeTaskId,
      status: 'RECONCILED',
      verdict: 'CONSENSUS_VERIFIED',
      merged,
      consensusEnvelope: deliberation
    };
  }

  /**
   * Prunes and cleans up an isolated worktree.
   * @param {string} taskId
   * @param {object} [options]
   * @param {boolean} [options.deleteBranch=true]
   * @returns {object}
   */
  pruneWorktree(taskId, options = {}) {
    const safeTaskId = taskId.replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase();
    const targetPath = path.resolve(this.worktreeBaseDir, safeTaskId);
    const branchName = `eos/swarm/${safeTaskId}`;

    if (fs.existsSync(targetPath)) {
      try {
        execSync(`git worktree remove --force "${targetPath}"`, {
          cwd: this.baseDir,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch {
        // Fallback: manual directory removal if git command fails
        fs.rmSync(targetPath, { recursive: true, force: true });
        try {
          execSync('git worktree prune', { cwd: this.baseDir, stdio: 'pipe' });
        } catch {
          // ignore
        }
      }
    }

    if (options.deleteBranch !== false) {
      try {
        execSync(`git branch -D "${branchName}"`, {
          cwd: this.baseDir,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch {
        // ignore branch deletion errors if not found
      }
    }

    this._removeWorktree(safeTaskId);

    return {
      taskId: safeTaskId,
      status: 'PRUNED',
      prunedAt: new Date().toISOString()
    };
  }

  /**
   * Ensures base worktree directory exists and is ignored in git.
   */
  ensureWorktreeBaseDir() {
    if (!fs.existsSync(this.worktreeBaseDir)) {
      fs.mkdirSync(this.worktreeBaseDir, { recursive: true });
    }

    // Ensure .gitignore has .eos/worktrees
    const gitignorePath = path.join(this.baseDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignore.includes('.eos/worktrees') && !gitignore.includes('.eos/')) {
        fs.appendFileSync(gitignorePath, '\n# EOS Isolated Worktrees\n.eos/worktrees/\n', 'utf8');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Registry Helpers
  // ---------------------------------------------------------------------------

  _loadRegistry() {
    if (!fs.existsSync(this.registryPath)) {
      return { schema_version: '1.0.0', worktrees: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
    } catch {
      return { schema_version: '1.0.0', worktrees: [] };
    }
  }

  _recordWorktree(meta) {
    const registry = this._loadRegistry();
    registry.worktrees = (registry.worktrees || []).filter(w => w.taskId !== meta.taskId);
    registry.worktrees.push(meta);
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2), 'utf8');
    } catch {
      // ignore
    }
  }

  _removeWorktree(taskId) {
    const registry = this._loadRegistry();
    registry.worktrees = (registry.worktrees || []).filter(w => w.taskId !== taskId);
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2), 'utf8');
    } catch {
      // ignore
    }
  }
}
