/**
 * CI suite reachability lock (fail-closed).
 *
 * Audits three execution-honesty invariants of the test harness:
 *
 *   1. REACHABILITY — every `tests/**​/*.test.js` suite is executed by at least one
 *      declared gate: the slim `npm test` discovery, an explicit file reference from a
 *      workflow-invoked npm script, or a full-corpus runner invocation (`--full`).
 *      Registering a suite in `SLIM_SUITE_EXCLUDES` without any opt-in gate makes the
 *      suite unverified while still looking maintained.
 *   2. SCRIPT REFERENCE INTEGRITY — every `tests/...` path referenced by a package.json
 *      script exists on disk. A dangling reference turns the script into a guaranteed
 *      failure that nobody runs.
 *   3. NO FOLDED `run:` STEPS — a workflow `run:` plain scalar must stay single-line.
 *      YAML folds more-indented continuation lines into the same command, so a list of
 *      commands written under `run: node x.js` silently becomes arguments of `x.js`
 *      and the listed commands never execute.
 *
 * Pure Layer-0 Node.js built-ins (L0 purity). Read-only: never mutates the workspace.
 * PRODUCTION_READY: NO — local governed gate; GHA remains BILLING_BLOCKED.
 */

import fs from 'node:fs';
import path from 'node:path';

export const CI_SUITE_REACHABILITY_REQUIRED_PATHS = Object.freeze([
  'scripts/lib/ci-suite-reachability-lock.js',
  'scripts/test-runner.js',
  '.github/workflows/ci.yml',
  '.github/workflows/cd-release-gate.yml',
  'docs/governance/CI_CD_CONTRACT.json',
  'tests/github-actions-cicd.test.js'
]);

export const AUDITED_WORKFLOWS = Object.freeze([
  '.github/workflows/ci.yml',
  '.github/workflows/cd-release-gate.yml'
]);

const FULL_CORPUS_RUNNER = /scripts\/test-runner\.js[^\n&|;]*--(?:full|include-excluded)/;
const SLIM_CORPUS_RUNNER = /scripts\/test-runner\.js(?![^\n&|;]*--(?:full|include-excluded))/;

/**
 * Lists every test suite path (relative to rootDir) under tests/.
 * @param {string} rootDir
 * @returns {string[]}
 */
export function collectTestSuites(rootDir) {
  const testsDir = path.join(rootDir, 'tests');
  if (!fs.existsSync(testsDir)) return [];
  const suites = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
        suites.push(path.relative(rootDir, full).split(path.sep).join('/'));
      }
    }
  };
  walk(testsDir);
  return suites.sort();
}

/**
 * Reads SLIM_SUITE_EXCLUDES basenames straight from the runner (single source of truth).
 * @param {string} rootDir
 * @returns {Set<string>}
 */
export function parseSlimSuiteExcludes(rootDir) {
  const runnerPath = path.join(rootDir, 'scripts/test-runner.js');
  const source = fs.readFileSync(runnerPath, 'utf8');
  const block = source.match(/SLIM_SUITE_EXCLUDES = new Set\(\[([\s\S]*?)\]\)/);
  if (!block) throw new Error('SLIM_SUITE_EXCLUDES not found in scripts/test-runner.js');
  return new Set([...block[1].matchAll(/['"]([^'"]+\.test\.js)['"]/g)].map((m) => m[1]));
}

/**
 * Collects npm script names invoked by the audited workflows.
 * @param {string} rootDir
 * @param {readonly string[]} [workflows]
 * @returns {Set<string>}
 */
export function collectWorkflowScripts(rootDir, workflows = AUDITED_WORKFLOWS) {
  const invoked = new Set();
  for (const rel of workflows) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) continue;
    const yaml = fs.readFileSync(full, 'utf8');
    for (const match of yaml.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) invoked.add(match[1]);
    if (/npm test\b/.test(yaml)) invoked.add('test');
  }
  return invoked;
}

/**
 * Expands a script body plus every script it chains through `npm run`.
 * @param {Record<string, string>} scripts
 * @param {string} name
 * @param {Set<string>} [seen]
 * @returns {string[]} script bodies
 */
export function expandScript(scripts, name, seen = new Set()) {
  if (seen.has(name) || typeof scripts[name] !== 'string') return [];
  seen.add(name);
  const body = scripts[name];
  const bodies = [body];
  for (const match of body.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) {
    bodies.push(...expandScript(scripts, match[1], seen));
  }
  return bodies;
}

/**
 * Resolves which suites the given scripts execute.
 * @param {Record<string, string>} scripts
 * @param {Iterable<string>} scriptNames
 * @returns {{ referenced: Set<string>, fullCorpus: boolean, slimCorpus: boolean }}
 */
export function collectScriptCoverage(scripts, scriptNames) {
  const referenced = new Set();
  let fullCorpus = false;
  let slimCorpus = false;
  for (const name of scriptNames) {
    for (const body of expandScript(scripts, name)) {
      for (const match of body.matchAll(/tests\/([A-Za-z0-9._/-]+\.test\.js)/g)) {
        referenced.add(path.basename(match[1]));
      }
      if (FULL_CORPUS_RUNNER.test(body)) fullCorpus = true;
      else if (SLIM_CORPUS_RUNNER.test(body)) slimCorpus = true;
    }
  }
  return { referenced, fullCorpus, slimCorpus };
}

/**
 * Finds package.json script references pointing at test files that do not exist.
 * @param {string} rootDir
 * @returns {{ script: string, reference: string }[]}
 */
export function findBrokenScriptReferences(rootDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const broken = [];
  for (const [script, body] of Object.entries(pkg.scripts || {})) {
    for (const match of body.matchAll(/tests\/([A-Za-z0-9._/-]+\.test\.js)/g)) {
      const reference = `tests/${match[1]}`;
      if (!fs.existsSync(path.join(rootDir, reference))) broken.push({ script, reference });
    }
  }
  return broken;
}

/**
 * Detects workflow `run:` plain scalars that continue onto more-indented lines.
 * YAML folds those lines into one command, so every listed command after the first
 * degrades into an argument and never executes.
 * @param {string} yaml
 * @returns {{ line: number, command: string, folded: string }[]}
 */
export function findFoldedRunSteps(yaml) {
  const lines = yaml.split(/\r?\n/);
  const offenders = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)(- )?run:[ \t]*(\S.*)$/);
    if (!match) continue;
    const value = match[3].trim();
    if (value.startsWith('|') || value.startsWith('>')) continue;
    const keyIndent = match[1].length + (match[2] ? match[2].length : 0);
    const next = lines[i + 1];
    if (!next || !next.trim()) continue;
    const nextIndent = next.length - next.trimStart().length;
    if (nextIndent > keyIndent) {
      offenders.push({ line: i + 1, command: value, folded: next.trim() });
    }
  }
  return offenders;
}

/**
 * Audits the three execution-honesty invariants.
 * @param {string} rootDir
 * @returns {{ checks: object[], failures: object[], unreachable: string[] }}
 */
export function auditCiSuiteReachabilityLock(rootDir) {
  const checks = [];
  const failures = [];
  const type = 'ci-suite-reachability-lock';

  for (const rel of CI_SUITE_REACHABILITY_REQUIRED_PATHS) {
    if (fs.existsSync(path.join(rootDir, rel))) {
      checks.push({ path: `${rel} exists`, status: 'VERIFIED', type });
    } else {
      failures.push({ path: rel, message: 'required path missing (fail-closed)', type });
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const scripts = pkg.scripts || {};
  const suites = collectTestSuites(rootDir);
  const excluded = parseSlimSuiteExcludes(rootDir);
  const workflowScripts = collectWorkflowScripts(rootDir);
  const coverage = collectScriptCoverage(scripts, workflowScripts);

  const unreachable = suites.filter((rel) => {
    const base = path.basename(rel);
    if (coverage.fullCorpus) return false;
    if (!excluded.has(base)) return !coverage.slimCorpus;
    return !coverage.referenced.has(base);
  });

  if (unreachable.length === 0) {
    checks.push({
      path: `every test suite reachable from a declared gate (${suites.length} suites, ${excluded.size} slim-excluded)`,
      status: 'VERIFIED',
      type
    });
  } else {
    failures.push({
      path: 'tests/**/*.test.js',
      message:
        `${unreachable.length} suite(s) excluded from npm test and not executed by any workflow gate: ` +
        `${unreachable.slice(0, 10).join(', ')}${unreachable.length > 10 ? ', …' : ''}`,
      type
    });
  }

  const broken = findBrokenScriptReferences(rootDir);
  if (broken.length === 0) {
    checks.push({ path: 'package.json test script references all resolve', status: 'VERIFIED', type });
  } else {
    for (const entry of broken) {
      failures.push({
        path: `package.json scripts.${entry.script}`,
        message: `references missing test file ${entry.reference}`,
        type
      });
    }
  }

  for (const rel of AUDITED_WORKFLOWS) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) continue;
    const folded = findFoldedRunSteps(fs.readFileSync(full, 'utf8'));
    if (folded.length === 0) {
      checks.push({ path: `${rel} has no folded run: scalars`, status: 'VERIFIED', type });
    } else {
      for (const entry of folded) {
        failures.push({
          path: `${rel}:${entry.line}`,
          message:
            `folded run: scalar — "${entry.folded}" is appended to "${entry.command}" instead of ` +
            'executing (use a run: | block scalar)',
          type
        });
      }
    }
  }

  return { checks, failures, unreachable };
}
