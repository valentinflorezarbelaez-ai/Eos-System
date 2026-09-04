import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * @file src/core/sandbox.js
 * @description Ephemeral sandbox directory manager with path boundary validation.
 */
export class EosSandbox {
  constructor(options = {}) {
    this.prefix = options.prefix || 'eos-sandbox-';
    this.baseTempDir = options.baseTempDir || os.tmpdir();
  }

  /**
   * Validates that a requested path does not attempt path traversal escaping the authorized root.
   * @param {string} targetPath
   * @param {string} [authorizedRoot]
   * @returns {string} Normalized absolute path
   */
  validatePath(targetPath, authorizedRoot = this.baseTempDir) {
    const resolved = path.resolve(authorizedRoot, targetPath);
    const normalizedRoot = path.resolve(authorizedRoot);
    if (!resolved.startsWith(normalizedRoot) && !resolved.startsWith(path.resolve(process.cwd()))) {
      throw new Error(`PATH_TRAVERSAL_PREVENTED: Path '${targetPath}' escapes authorized root '${authorizedRoot}'`);
    }
    return resolved;
  }

  /**
   * Creates an isolated ephemeral temporary directory.
   * @returns {Promise<string>} Created directory path
   */
  async create() {
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const dirName = `${this.prefix}${randomSuffix}`;
    const fullPath = path.join(this.baseTempDir, dirName);
    await fs.mkdir(fullPath, { recursive: true });
    return fullPath;
  }

  /**
   * Destroys an ephemeral directory and all its contents cleanly.
   * @param {string} dirPath
   */
  async destroy(dirPath) {
    if (!dirPath) return;
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }

  /**
   * Executes a callback inside an ephemeral sandbox directory and guarantees its cleanup.
   * @template T
   * @param {(dir: string) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  async runInside(callback) {
    const dir = await this.create();
    try {
      return await callback(dir);
    } finally {
      await this.destroy(dir);
    }
  }
}
