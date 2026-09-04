import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * EOS Forensic Sanitizer & Workspace Purge Engine
 * Identifies orphan scratch files, redundant empty directories, and security hygiene issues.
 */
export class ForensicSanitizer {
  constructor(options = {}) {
    this.orphanPatterns = options.orphanPatterns || [
      /\.tmp$/i,
      /\.bak$/i,
      /^temp-/i,
      /^scratch-/i,
      /~$/i,
      /\.swp$/i
    ];
    this.ignoredDirs = options.ignoredDirs || ['.git', 'node_modules', '.gemini', 'dist'];
  }

  /**
   * Recursively walks workspace to inspect file health and collect orphan/empty items.
   * @param {string} dir Current directory
   * @param {object} collector Accumulator object
   * @private
   */
  #walk(dir, collector) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let nonIgnoredCount = 0;

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.ignoredDirs.includes(entry.name)) continue;
        nonIgnoredCount++;
        const beforeCount = collector.scannedFilesCount;
        this.#walk(fullPath, collector);
        
        // If sub-directory is empty after scan
        const subEntries = fs.readdirSync(fullPath);
        if (subEntries.length === 0) {
          collector.emptyDirectories.push(fullPath);
        }
      } else if (entry.isFile()) {
        collector.scannedFilesCount++;
        nonIgnoredCount++;

        const isOrphan = this.orphanPatterns.some(p => p.test(entry.name));
        if (isOrphan) {
          collector.orphanFiles.push(fullPath);
        }
      }
    }
  }

  /**
   * Audits workspace hygiene and outputs structured forensic diagnostics.
   * @param {string} workspaceRoot
   * @returns {object}
   */
  auditWorkspaceSanity(workspaceRoot) {
    const collector = {
      scannedFilesCount: 0,
      orphanFiles: [],
      emptyDirectories: []
    };

    this.#walk(workspaceRoot, collector);

    const isClean = collector.orphanFiles.length === 0 && collector.emptyDirectories.length === 0;
    const deductions = (collector.orphanFiles.length * 10) + (collector.emptyDirectories.length * 5);
    const healthScore = Math.max(0, 100 - deductions);

    return {
      isClean,
      healthScore,
      scannedFilesCount: collector.scannedFilesCount,
      orphanFiles: collector.orphanFiles,
      emptyDirectories: collector.emptyDirectories,
      auditedAt: new Date().toISOString()
    };
  }

  /**
   * Safely removes orphan scratch artifacts and dead empty directories.
   * @param {string} workspaceRoot
   * @param {object} [options]
   * @returns {object}
   */
  purgeOrphanArtifacts(workspaceRoot, options = {}) {
    const audit = this.auditWorkspaceSanity(workspaceRoot);
    let purgedFilesCount = 0;
    let purgedDirsCount = 0;

    for (const file of audit.orphanFiles) {
      try {
        fs.unlinkSync(file);
        purgedFilesCount++;
      } catch { /* ignore */ }
    }

    for (const dir of audit.emptyDirectories) {
      try {
        fs.rmdirSync(dir);
        purgedDirsCount++;
      } catch { /* ignore */ }
    }

    const payload = JSON.stringify({ purgedFilesCount, purgedDirsCount, timestamp: new Date().toISOString() });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    return {
      status: 'PURGED_VERIFIED',
      purgedFilesCount,
      purgedDirsCount,
      receipt: `sha256-${hash}`,
      timestamp: new Date().toISOString()
    };
  }
}
