#!/usr/bin/env node
/**
 * EOS Universal Cross-Platform Test Runner
 *
 * Traverses `tests/` recursively and executes test suites using Node's native test runner (`node --test`).
 * Solves cross-platform incompatibility of Unix subshell commands like `$(find tests -name '*.test.js')`
 * on Windows (PowerShell/cmd.exe) while strictly adhering to L0 purity (zero external npm dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

/**
 * Basenames excluded from default slim discovery (npm test / TR-01).
 * Opt-in via dedicated npm scripts (e.g. npm run test:compute-worker / test:mission-b).
 * Prefer exclude-from-slim over raising TR-01 ceiling for heavy adversarial fuzz
 * (Mission A fuzz + adversarial stress) and Mission B sensor mutation so the
 * default suite stays lean without silently weakening opt-in coverage.
 */
export const SLIM_SUITE_EXCLUDES = new Set([
  'eos-compute-worker-fuzz.test.js',
  'eos-compute-worker-adversarial.test.js',
  'eos-compute-worker-mission-d.test.js',
  'eos-mission-b-sensor-mutation-fortify.test.js',
  'eos-mission-c2-ci-compute-worker.test.js',
  'mcp-capability-router.test.js',
  'eos-compute-worker-mission-e.test.js',
  'eos-compute-worker-mission-f-adversarial.test.js',
  'mcp-tool-dispatcher.test.js',
  'eos-compute-worker-mission-h.test.js',
  'gemini-provider.test.js',
  'eos-compute-worker-mission-i.test.js',
  'eos-stitch-tool-bridge.test.js',
  'eos-browser-qa-runner.test.js',
  'eos-compute-worker-mission-l.test.js',
  'eos-compute-worker-mission-m.test.js',
  'eos-compute-worker-mission-n.test.js',
  'eos-compute-worker-mission-o-adversarial.test.js',
  'loop-compute-orchestrator.test.js',
  'worker-runtime-daemon.test.js',
  'fdir-sentinel-runtime.test.js',
  'specboot-agent-runner.test.js',
  'external-write-gateway.test.js',
  'eos-u-native-suite-seam-pack.test.js',

  'fdir-remediation-loop.test.js',

  'sovereign-session-coordinator.test.js',

  'interactive-developer-shell.test.js',

  'eos-y-ladder12-seam-pack.test.js',

  'eos-z-target-flight-sandbox.test.js',

  'eos-aa-multi-agent-swarm.test.js',

  'eos-ab-telemetry-server.test.js',

  'eos-ac-ladder13-seam-pack.test.js',

  'eos-ad-llm-provider-port.test.js',

  'eos-ae-token-budget-ecr.test.js',

  'eos-af-autonomous-execution-loop.test.js',

  'eos-ag-live-tool-engine.test.js',

  'eos-ah-ladder14-seam-pack.test.js',

  'eos-ai-multi-session-autonomy.test.js',

  'eos-aj-evidence-economy-ledger.test.js',

  'eos-ak-constitution-runtime-policy-gate.test.js',

  'eos-al-autonomy-replay-forensic-observer.test.js',

  'eos-am-ladder15-seam-pack.test.js',

  'eos-an-multi-workstation-session-federation.test.js',

  'eos-ao-provider-failover-resilience.test.js',

  'eos-ap-hitl-po-authority-channel.test.js',

  'eos-aq-evidence-export-notarization.test.js',

  'eos-ar-ladder16-seam-pack.test.js',

  'eos-as-cross-satellite-composition.test.js',

  'eos-at-operator-continuity-crash-recovery.test.js',

  'eos-au-law-vi-secret-runtime-broker.test.js',

  'eos-av-governed-state-freeze-drift-observer.test.js',

  'eos-aw-ladder17-seam-pack.test.js',

  'eos-ax-sovereign-developer-engine.test.js',

  'eos-ay-ast-semantic-port.test.js',

  'eos-az-self-repair-fdir-bridge.test.js',

  'eos-ba-local-sandbox-container-port.test.js',

  'eos-bb-ladder18-seam-pack.test.js',

  'eos-bc-governed-patch-diff-apply-port.test.js',

  'eos-bd-multi-worktree-multi-target-delivery-port.test.js',

  'eos-be-verification-replay-golden-receipt-port.test.js',

  'eos-bf-local-rc-packaging-artifact-notary-port.test.js',

  'eos-bg-ladder19-seam-pack.test.js',

  'eos-bh-mission-lifecycle-state-machine.test.js',

  'eos-bi-cross-session-continuity-replay-fabric.test.js',

  'eos-bj-operator-dashboard-hud-fabric.test.js',
]);

/**
 * Recursively scans a directory for files matching a test suffix.
 * Honors SLIM_SUITE_EXCLUDES (opt-in suites stay available via dedicated npm scripts).
 * @param {string} dir Directory to scan
 * @param {string} suffix File suffix to match (default: .test.js)
 * @returns {string[]} Relative or absolute paths to matching test files
 */
export function discoverTestFiles(dir, suffix = '.test.js') {
  if (!fs.existsSync(dir)) return [];
  const results = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules or temp dirs if any
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        if (SLIM_SUITE_EXCLUDES.has(entry.name)) continue;
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

/**
 * Main execution function
 */
export async function run() {
  const args = process.argv.slice(2);
  let filterPattern = null;
  const nodeTestFlags = [];

  // Parse args
  for (const arg of args) {
    if (arg.startsWith('--')) {
      nodeTestFlags.push(arg);
    } else if (!filterPattern) {
      filterPattern = arg;
    } else {
      nodeTestFlags.push(arg);
    }
  }

  let testFiles = discoverTestFiles(testsDir);

  if (filterPattern) {
    const normalizedFilter = filterPattern.replace(/\\/g, '/').toLowerCase();
    testFiles = testFiles.filter(file => {
      const normalizedFile = file.replace(/\\/g, '/').toLowerCase();
      return normalizedFile.includes(normalizedFilter);
    });
  }

  if (testFiles.length === 0) {
    console.error(`[EOS Test Runner]: No test files found matching criteria: "${filterPattern || '*'}"`);
    process.exit(1);
  }

  const relativePaths = testFiles.map(f => path.relative(rootDir, f));
  console.log(`[EOS Test Runner]: Executing ${relativePaths.length} test suite(s)...`);

  const childArgs = ['--test', ...nodeTestFlags, ...relativePaths];

  const child = spawn(process.execPath, childArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

// Run when called directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  run().catch(err => {
    console.error('[EOS Test Runner Error]:', err);
    process.exit(1);
  });
}
