/**
 * @module write-barrier/hooks
 * Optional fail-closed hooks for fs write surfaces (and child_process cwd awareness).
 * Uses unbound originals to avoid recursion when the barrier loads config.
 */
import fs from 'node:fs';
import path from 'node:path';

import { assertWritable } from './authorize.js';

const originals = {
  writeFileSync: fs.writeFileSync.bind(fs),
  appendFileSync: fs.appendFileSync.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  renameSync: fs.renameSync.bind(fs),
  rmSync: fs.rmSync?.bind(fs),
  unlinkSync: fs.unlinkSync.bind(fs),
  copyFileSync: fs.copyFileSync?.bind(fs),
  writeFile: fs.writeFile.bind(fs),
  appendFile: fs.appendFile.bind(fs),
  mkdir: fs.mkdir.bind(fs),
  rename: fs.rename.bind(fs),
  rm: fs.rm?.bind(fs),
  unlink: fs.unlink.bind(fs),
  copyFile: fs.copyFile?.bind(fs)
};

let installed = false;
/** @type {object | null} */
let installOptions = null;

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 */
export function installWriteBarrierHooks(options = {}) {
  if (installed) {
    installOptions = { ...installOptions, ...options };
    return;
  }
  installOptions = { ...options };
  installed = true;

  const guard = (target) => {
    assertWritable(target, { repoRoot: installOptions?.repoRoot });
  };

  fs.writeFileSync = (file, data, opt) => {
    guard(file);
    return originals.writeFileSync(file, data, opt);
  };
  fs.appendFileSync = (file, data, opt) => {
    guard(file);
    return originals.appendFileSync(file, data, opt);
  };
  fs.mkdirSync = (dir, opt) => {
    guard(dir);
    return originals.mkdirSync(dir, opt);
  };
  fs.renameSync = (oldPath, newPath) => {
    guard(oldPath);
    guard(newPath);
    return originals.renameSync(oldPath, newPath);
  };
  if (originals.rmSync) {
    fs.rmSync = (p, opt) => {
      guard(p);
      return originals.rmSync(p, opt);
    };
  }
  fs.unlinkSync = (p) => {
    guard(p);
    return originals.unlinkSync(p);
  };
  if (originals.copyFileSync) {
    fs.copyFileSync = (src, dest, mode) => {
      guard(dest);
      return originals.copyFileSync(src, dest, mode);
    };
  }

  fs.writeFile = (file, data, opt, cb) => {
    try {
      guard(file);
    } catch (err) {
      if (typeof opt === 'function') return opt(err);
      if (typeof cb === 'function') return cb(err);
      throw err;
    }
    return originals.writeFile(file, data, opt, cb);
  };
  fs.appendFile = (file, data, opt, cb) => {
    try {
      guard(file);
    } catch (err) {
      if (typeof opt === 'function') return opt(err);
      if (typeof cb === 'function') return cb(err);
      throw err;
    }
    return originals.appendFile(file, data, opt, cb);
  };
  fs.mkdir = (dir, opt, cb) => {
    try {
      guard(dir);
    } catch (err) {
      if (typeof opt === 'function') return opt(err);
      if (typeof cb === 'function') return cb(err);
      throw err;
    }
    return originals.mkdir(dir, opt, cb);
  };
}

export function uninstallWriteBarrierHooks() {
  if (!installed) return;
  fs.writeFileSync = originals.writeFileSync;
  fs.appendFileSync = originals.appendFileSync;
  fs.mkdirSync = originals.mkdirSync;
  fs.renameSync = originals.renameSync;
  if (originals.rmSync) fs.rmSync = originals.rmSync;
  fs.unlinkSync = originals.unlinkSync;
  if (originals.copyFileSync) fs.copyFileSync = originals.copyFileSync;
  fs.writeFile = originals.writeFile;
  fs.appendFile = originals.appendFile;
  fs.mkdir = originals.mkdir;
  installed = false;
  installOptions = null;
}

export function isWriteBarrierHooksInstalled() {
  return installed;
}

/**
 * Extract likely write targets from a child_process-style command string.
 * Conservative heuristic for governance surfaces — not a shell parser.
 * @param {string} command
 * @returns {string[]}
 */
export function extractWriteTargetsFromCommand(command) {
  const text = String(command || '');
  const targets = [];
  const patterns = [
    /(?:^|[\s;|&])(?:tee|cp|mv|rm|mkdir|touch)\s+([^\s;|&]+)/g,
    />\s*([^\s;|&]+)/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1] && m[1] !== '/dev/null') targets.push(m[1]);
    }
  }
  return targets.map((t) => path.normalize(t));
}
