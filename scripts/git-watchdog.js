import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHECKPOINTS_DIR = path.join(rootDir, '.eos', 'checkpoints');
const FAILURE_JOURNAL_PATH = path.join(rootDir, 'docs', 'audits', 'FAILURE_JOURNAL.jsonl');

/**
 * Calculates SHA-256 signature for deterministic payload verification.
 * @param {string|object} data
 * @returns {string}
 */
export function computeSignature(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Retrieves current Git HEAD commit SHA.
 * @param {string} [cwd]
 * @returns {string}
 */
export function getCurrentHeadSha(cwd = rootDir) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '0000000000000000000000000000000000000000';
  }
}

/**
 * Retrieves list of dirty / unstaged / untracked files.
 * @param {string} [cwd]
 * @returns {string[]}
 */
export function getAffectedFiles(cwd = rootDir) {
  try {
    const output = execSync('git status --porcelain', { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (!output) return [];
    return output.split('\n').map(line => line.substring(3).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Creates a transactional checkpoint before starting mutations.
 * @param {string} [taskId]
 * @param {object} [options]
 * @returns {object}
 */
export function createCheckpoint(taskId = `TASK-${Date.now()}`, options = {}) {
  const cwd = options.cwd || rootDir;
  const headSha = options.headSha || getCurrentHeadSha(cwd);
  const checkpointId = `CHK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const timestamp = new Date().toISOString();
  
  const checkpoint = {
    checkpointId,
    taskId,
    headSha,
    affectedFilesAtStart: getAffectedFiles(cwd),
    status: 'ACTIVE',
    createdAt: timestamp,
    signature: computeSignature(`${checkpointId}:${taskId}:${headSha}:${timestamp}`)
  };

  const storeDir = options.checkpointsDir || CHECKPOINTS_DIR;
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  const filePath = path.join(storeDir, `${checkpointId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf8');

  return checkpoint;
}

/**
 * Appends an entry into the Failure Journal.
 * @param {object} entry
 * @param {string} [journalPath]
 * @returns {object}
 */
export function appendFailureJournal(entry, journalPath = FAILURE_JOURNAL_PATH) {
  const dir = path.dirname(journalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payloadToSign = {
    journalId: entry.journalId,
    taskId: entry.taskId,
    checkpointId: entry.checkpointId,
    restoredHeadSha: entry.restoredHeadSha,
    failedPhase: entry.failedPhase,
    errorSummary: entry.errorSummary,
    timestamp: entry.timestamp
  };

  const fullEntry = {
    ...entry,
    signature: computeSignature(payloadToSign)
  };

  fs.appendFileSync(journalPath, JSON.stringify(fullEntry) + '\n', 'utf8');
  return fullEntry;
}

/**
 * Audits the Failure Journal for integrity and valid signatures.
 * @param {string} [journalPath]
 * @returns {object}
 */
export function auditFailureJournal(journalPath = FAILURE_JOURNAL_PATH) {
  if (!fs.existsSync(journalPath)) {
    return {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      integrityPassed: true,
      entries: []
    };
  }

  const lines = fs.readFileSync(journalPath, 'utf8').split('\n').filter(Boolean);
  const entries = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const payloadToVerify = {
        journalId: parsed.journalId,
        taskId: parsed.taskId,
        checkpointId: parsed.checkpointId,
        restoredHeadSha: parsed.restoredHeadSha,
        failedPhase: parsed.failedPhase,
        errorSummary: parsed.errorSummary,
        timestamp: parsed.timestamp
      };
      const expectedSignature = computeSignature(payloadToVerify);
      const isValid = parsed.signature === expectedSignature;

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      entries.push({
        ...parsed,
        _isValidSignature: isValid
      });
    } catch {
      invalidCount++;
    }
  }

  return {
    totalEntries: lines.length,
    validEntries: validCount,
    invalidEntries: invalidCount,
    integrityPassed: invalidCount === 0,
    entries
  };
}

/**
 * Asserts verification and test integrity; commits atomically if clean, or rolls back on failure.
 * @param {string} [taskId]
 * @param {object} [options]
 * @returns {object}
 */
export function assertIntegrityOrRollback(taskId = `TASK-${Date.now()}`, options = {}) {
  const cwd = options.cwd || rootDir;
  const journalPath = options.journalPath || FAILURE_JOURNAL_PATH;
  const checkpoint = options.checkpoint || createCheckpoint(taskId, { cwd });

  const verificationCommands = options.verificationCommands || [
    { name: 'verify:strict', cmd: 'node', args: ['scripts/verify-eos.js', '--strict'] },
    { name: 'test:core', cmd: 'node', args: ['--test', 'tests/authority-truth-source.test.js', 'tests/eos-negative-governance.test.js', 'tests/eos-e2e-local-fixture.test.js', 'tests/eos-local-contracts.test.js'] }
  ];

  let failedPhase = null;
  let errorOutput = '';

  // 1. Programmatic Verification Loop
  for (const step of verificationCommands) {
    try {
      const res = spawnSync(step.cmd, step.args, {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (res.status !== 0) {
        failedPhase = step.name;
        errorOutput = (res.stderr || res.stdout || `Process exited with code ${res.status}`).trim();
        break;
      }
    } catch (err) {
      failedPhase = step.name;
      errorOutput = err.message || String(err);
      break;
    }
  }

  // 2. Success Branch: Atomic Commit
  if (!failedPhase) {
    checkpoint.status = 'VERIFIED_COMMITTED';
    let committedSha = checkpoint.headSha;

    if (options.commit) {
      try {
        execSync('git add -A', { cwd, stdio: ['pipe', 'pipe', 'ignore'] });
        const commitMsg = options.commitMessage || `feat(watchdog): atomic transaction verified for [${taskId}]`;
        execSync(`git commit -m "${commitMsg}"`, { cwd, stdio: ['pipe', 'pipe', 'ignore'] });
        committedSha = getCurrentHeadSha(cwd);
      } catch (commitErr) {
        // If git commit fails (e.g. nothing to commit), keep current HEAD
      }
    }

    return {
      success: true,
      status: 'VERIFIED',
      checkpointId: checkpoint.checkpointId,
      taskId,
      headSha: committedSha,
      verifiedAt: new Date().toISOString()
    };
  }

  // 3. Failure Branch: Atomic Rollback & Journal Logging
  const affectedFiles = getAffectedFiles(cwd);

  try {
    if (!options.skipGitReset) {
      execSync(`git reset --hard ${checkpoint.headSha}`, { cwd, stdio: ['pipe', 'pipe', 'ignore'] });
    }
  } catch (resetErr) {
    errorOutput += `\n[ROLLBACK_WARN]: ${resetErr.message}`;
  }

  checkpoint.status = 'ROLLED_BACK';

  const failureEntry = appendFailureJournal({
    journalId: `FLR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    taskId,
    checkpointId: checkpoint.checkpointId,
    restoredHeadSha: checkpoint.headSha,
    failedPhase,
    errorSummary: errorOutput.substring(0, 1000),
    affectedFiles,
    timestamp: new Date().toISOString()
  }, journalPath);

  return {
    success: false,
    status: 'ROLLED_BACK',
    checkpointId: checkpoint.checkpointId,
    taskId,
    restoredHeadSha: checkpoint.headSha,
    failedPhase,
    failureJournalEntry: failureEntry
  };
}

// CLI Execution Support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const isCommit = args.includes('--commit') || args.includes('-c');
  const isAudit = args.includes('--audit') || args.includes('-a');
  const isCheckpoint = args.includes('--checkpoint');
  const taskId = args.find(a => !a.startsWith('-')) || `CLI-${Date.now()}`;

  if (isAudit) {
    const auditReport = auditFailureJournal();
    console.log(JSON.stringify(auditReport, null, 2));
    process.exit(auditReport.integrityPassed ? 0 : 1);
  }

  if (isCheckpoint) {
    const chk = createCheckpoint(taskId);
    console.log(`[WATCHDOG] Checkpoint created: ${chk.checkpointId} (HEAD: ${chk.headSha})`);
    process.exit(0);
  }

  const result = assertIntegrityOrRollback(taskId, { commit: isCommit });
  if (result.success) {
    console.log(`[WATCHDOG] SUCCESS: Transaction verified and sealed (${result.headSha})`);
    process.exit(0);
  } else {
    console.error(`[WATCHDOG] FAILURE in ${result.failedPhase}: Atomic rollback executed to ${result.restoredHeadSha}`);
    process.exit(1);
  }
}
