/**
 * @module DoctorEngine
 * @description Clean-clone preflight for EOS Mission OS.
 *
 * Answers one question: does this checkout work on its own, or does it depend on state that
 * only exists on the machine it was authored on? Each check reports what it observed rather
 * than asserting health, so a failing checkout says which fact is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { SchemaValidator } from '../contracts/schema-validator.js';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Absolute paths rooted in one specific user's home directory. */
const HOST_PATH_PATTERNS = [
  /[A-Za-z]:\\{1,2}Users\\{1,2}[A-Za-z0-9._-]+/,
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//
];

/** Files a clean clone must contain for the canonical path to run at all. */
export const CANONICAL_ENTRYPOINTS = Object.freeze([
  'bin/eos.js',
  'src/cli/mission-cli.js',
  'src/core/runtime/mission-runtime.js',
  'src/core/authority/authority-truth-source.js',
  'src/core/sdd/sdd-fsm-engine.js',
  'src/core/sdd/hitl-gatekeeper.js',
  'src/mcp-server.js'
]);

export const LOCAL_SCHEMAS = Object.freeze([
  'direction.local.schema.json',
  'mission-package.local.schema.json',
  'hitl-receipt.local.schema.json'
]);

export class DoctorEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir] repository root to diagnose
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || DEFAULT_ROOT;
    this.schemas = options.schemas || new SchemaValidator();
  }

  /**
   * Runs every check.
   * @returns {{verdict: string, checks: Array, homedir_leak: string, summary: object}}
   */
  run() {
    const checks = [
      this._checkNodeRuntime(),
      this._checkDependencyPolicy(),
      this._checkCanonicalEntrypoints(),
      this._checkSchemaCatalog(),
      this._checkHomedirLeak(),
      this._checkCanonicalFilesTracked(),
      this._checkMissionStateIgnored(),
      this._checkProtectedSurfaces()
    ];

    const failed = checks.filter((c) => c.status === 'FAIL');
    const warned = checks.filter((c) => c.status === 'WARN');
    const leak = checks.find((c) => c.id === 'HOMEDIR_LEAK');

    return {
      schema_version: '1.0.0',
      base_dir: this.baseDir,
      generated_at: new Date().toISOString(),
      verdict: failed.length === 0 ? 'PASS' : 'FAIL',
      homedir_leak: leak && leak.status === 'PASS' ? 'NO' : 'YES',
      summary: {
        total: checks.length,
        passed: checks.filter((c) => c.status === 'PASS').length,
        warned: warned.length,
        failed: failed.length
      },
      checks,
      epistemic_class: 'MEASURED'
    };
  }

  /** Human-readable rendering of {@link run}. */
  render(result = this.run()) {
    const rows = result.checks.map((c) => {
      const icon = c.status === 'PASS' ? '✅' : c.status === 'WARN' ? '⚠️ ' : '❌';
      return `${icon} ${c.id.padEnd(24)} ${c.status.padEnd(5)} ${c.observed}`;
    });

    return [
      '================================================================================',
      'EOS DOCTOR — CLEAN-CLONE PREFLIGHT',
      '================================================================================',
      `Base dir: ${result.base_dir}`,
      '',
      ...rows,
      '',
      `HOMEDIR_LEAK: ${result.homedir_leak}`,
      `VERDICT: ${result.verdict} (${result.summary.passed} passed, ${result.summary.warned} warned, ${result.summary.failed} failed)`,
      '================================================================================'
    ].join('\n');
  }

  // ---------------------------------------------------------------- checks

  _checkNodeRuntime() {
    const major = Number(process.versions.node.split('.')[0]);
    return this._result(
      'NODE_RUNTIME',
      major >= 18 ? 'PASS' : 'FAIL',
      `node ${process.versions.node} (ESM + node:test require >= 18)`
    );
  }

  _checkDependencyPolicy() {
    const pkgPath = path.join(this.baseDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return this._result('DEPENDENCY_POLICY', 'FAIL', 'package.json not found');
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const runtimeDeps = Object.keys(pkg.dependencies || {});
    return this._result(
      'DEPENDENCY_POLICY',
      runtimeDeps.length === 0 ? 'PASS' : 'WARN',
      runtimeDeps.length === 0
        ? 'L0 satisfied: 0 runtime dependencies, no install needed'
        : `${runtimeDeps.length} runtime dependencies require npm install: ${runtimeDeps.join(', ')}`
    );
  }

  _checkCanonicalEntrypoints() {
    const missing = CANONICAL_ENTRYPOINTS.filter((rel) => !fs.existsSync(path.join(this.baseDir, rel)));
    return this._result(
      'CANONICAL_ENTRYPOINTS',
      missing.length === 0 ? 'PASS' : 'FAIL',
      missing.length === 0
        ? `${CANONICAL_ENTRYPOINTS.length}/${CANONICAL_ENTRYPOINTS.length} present`
        : `missing: ${missing.join(', ')}`,
      { missing }
    );
  }

  _checkSchemaCatalog() {
    const missing = [];
    for (const name of LOCAL_SCHEMAS) {
      try {
        this.schemas.loadSchema(name);
      } catch {
        missing.push(name);
      }
    }
    return this._result(
      'SCHEMA_CATALOG',
      missing.length === 0 ? 'PASS' : 'FAIL',
      missing.length === 0 ? `${LOCAL_SCHEMAS.length} local schemas load` : `unloadable: ${missing.join(', ')}`,
      { missing }
    );
  }

  _checkHomedirLeak() {
    const offenders = [];
    for (const dir of ['src', 'bin']) {
      for (const file of this._collect(path.join(this.baseDir, dir))) {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (/process\.env\.(USERPROFILE|HOME)/.test(line)) return;
          if (HOST_PATH_PATTERNS.some((p) => p.test(line))) {
            offenders.push(`${path.relative(this.baseDir, file)}:${i + 1}`);
          }
        });
      }
    }
    return this._result(
      'HOMEDIR_LEAK',
      offenders.length === 0 ? 'PASS' : 'FAIL',
      offenders.length === 0
        ? 'canonical runtime has no operator-specific absolute paths'
        : `host paths in: ${offenders.slice(0, 5).join(', ')}`,
      { offenders }
    );
  }

  _checkCanonicalFilesTracked() {
    let tracked;
    try {
      tracked = new Set(
        execFileSync('git', ['ls-files'], { cwd: this.baseDir, encoding: 'utf8' })
          .split('\n')
          .filter(Boolean)
      );
    } catch {
      return this._result('CANONICAL_TRACKED', 'WARN', 'not a git checkout; tracking cannot be verified');
    }

    const untracked = CANONICAL_ENTRYPOINTS.filter((rel) => !tracked.has(rel));

    // Beyond the named entrypoints, any uncommitted runtime file is simply absent from a
    // clean clone. That is expected mid-change, so it warns rather than fails.
    const untrackedRuntime = ['src', 'bin']
      .flatMap((dir) => this._collect(path.join(this.baseDir, dir)))
      .map((f) => path.relative(this.baseDir, f).split(path.sep).join('/'))
      .filter((rel) => !tracked.has(rel));

    if (untracked.length > 0) {
      return this._result(
        'CANONICAL_TRACKED',
        'FAIL',
        `canonical entrypoints absent from a clean clone: ${untracked.join(', ')}`,
        { untracked, untracked_runtime: untrackedRuntime }
      );
    }
    return this._result(
      'CANONICAL_TRACKED',
      untrackedRuntime.length === 0 ? 'PASS' : 'WARN',
      untrackedRuntime.length === 0
        ? 'every runtime file is committed and would survive a clean clone'
        : `${untrackedRuntime.length} uncommitted runtime file(s) would be missing from a clean clone: ${untrackedRuntime.slice(0, 3).join(', ')}`,
      { untracked, untracked_runtime: untrackedRuntime }
    );
  }

  _checkMissionStateIgnored() {
    const ignorePath = path.join(this.baseDir, '.gitignore');
    const ignored = fs.existsSync(ignorePath) && /^\.missions\/?$/m.test(fs.readFileSync(ignorePath, 'utf8'));
    return this._result(
      'MISSION_STATE_IGNORED',
      ignored ? 'PASS' : 'WARN',
      ignored
        ? '.missions/ operational state is excluded from commits'
        : '.missions/ is not gitignored; mission ledgers and receipts can leak into commits'
    );
  }

  _checkProtectedSurfaces() {
    const roots = ['Fundacion', path.join('docs', 'governance')];
    const details = roots.map((rel) => {
      const full = path.join(this.baseDir, rel);
      const exists = fs.existsSync(full);
      const populated = exists && fs.statSync(full).isDirectory() ? fs.readdirSync(full).length : 0;
      return { root: rel, exists, entries: populated };
    });

    const missing = details.filter((d) => !d.exists);
    const empty = details.filter((d) => d.exists && d.entries === 0);

    let status = 'PASS';
    let observed = `protected roots present: ${details.map((d) => `${d.root} (${d.entries} entries)`).join(', ')}`;
    if (missing.length > 0) {
      status = 'WARN';
      observed = `absent from this checkout: ${missing.map((d) => d.root).join(', ')}`;
    } else if (empty.length > 0) {
      // An empty external target makes "delta = 0" true only because there is nothing there.
      status = 'WARN';
      observed = `present but empty, so a zero-delta claim is vacuous: ${empty.map((d) => d.root).join(', ')}`;
    }
    return this._result('PROTECTED_SURFACES', status, observed, { details });
  }

  // ---------------------------------------------------------------- helpers

  _result(id, status, observed, extra = {}) {
    return { id, status, observed, ...extra };
  }

  _collect(dir, exts = ['.js', '.mjs']) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...this._collect(full, exts));
      else if (exts.includes(path.extname(entry.name))) out.push(full);
    }
    return out;
  }
}
