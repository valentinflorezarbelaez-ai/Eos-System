#!/usr/bin/env node

/**
 * @file scripts/pre-push-hook.js
 * @description Local fail-closed main-push surrogate (EOS M2 / Ladder 2 G2).
 *
 * DENYs direct push and force-push to refs/heads/main unless
 * EOS_ALLOW_MAIN_PUSH=1 is set explicitly (dangerous override).
 *
 * This is a LOCAL surrogate only. It does NOT mean GitHub branch protection
 * is enforced (Free private: RULE_CREATED_NOT_ENFORCED).
 */

import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ZERO_SHA = '0'.repeat(40);
const PROTECTED_REMOTE_REFS = new Set(['refs/heads/main']);
export const ALLOW_ENV_KEY = 'EOS_ALLOW_MAIN_PUSH';

/**
 * Parse one pre-push stdin line: <local_ref> <local_sha> <remote_ref> <remote_sha>
 * @param {string} line
 * @returns {{ localRef: string, localSha: string, remoteRef: string, remoteSha: string } | null}
 */
export function parsePrePushLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 4) return null;
  return {
    localRef: parts[0],
    localSha: parts[1],
    remoteRef: parts[2],
    remoteSha: parts[3]
  };
}

/**
 * Default ancestry check via local git (no network). Injectable for tests.
 * @param {string} maybeAncestor
 * @param {string} maybeDescendant
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function gitIsAncestor(maybeAncestor, maybeDescendant, cwd = process.cwd()) {
  if (!maybeAncestor || !maybeDescendant || maybeAncestor === ZERO_SHA || maybeDescendant === ZERO_SHA) {
    return false;
  }
  const res = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', maybeAncestor, maybeDescendant],
    { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return res.status === 0;
}

/**
 * Classify an update that targets a protected main ref.
 * @param {{ localRef: string, localSha: string, remoteRef: string, remoteSha: string }} update
 * @param {{ isAncestor?: (a: string, b: string) => boolean }} [opts]
 * @returns {{ kind: string, force: boolean } | null}
 */
export function classifyMainUpdate(update, opts = {}) {
  if (!PROTECTED_REMOTE_REFS.has(update.remoteRef)) return null;

  if (update.localSha === ZERO_SHA) {
    return { kind: 'delete_main', force: true };
  }

  if (update.remoteSha === ZERO_SHA) {
    return { kind: 'direct_push_main', force: false };
  }

  const isAncestor = typeof opts.isAncestor === 'function' ? opts.isAncestor : null;
  let force = false;
  if (isAncestor) {
    force = !isAncestor(update.remoteSha, update.localSha);
  }

  return {
    kind: force ? 'force_push_main' : 'direct_push_main',
    force
  };
}

/**
 * Pure fail-closed evaluator for pre-push stdin lines (no network).
 * @param {object} params
 * @param {string[]} params.lines - stdin lines from git pre-push
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [params.env]
 * @param {string} [params.allowEnvKey]
 * @param {(a: string, b: string) => boolean} [params.isAncestor]
 * @returns {{ allowed: boolean, reason: string, denied: object[], danger?: boolean }}
 */
export function evaluateMainPushGuard({
  lines = [],
  env = process.env,
  allowEnvKey = ALLOW_ENV_KEY,
  isAncestor
} = {}) {
  const denied = [];

  for (const line of lines) {
    const update = parsePrePushLine(line);
    if (!update) continue;
    const classification = classifyMainUpdate(update, { isAncestor });
    if (!classification) continue;
    denied.push({ ...update, ...classification });
  }

  if (denied.length === 0) {
    return { allowed: true, reason: 'NO_MAIN_REF_UPDATE', denied: [] };
  }

  if (String(env?.[allowEnvKey] || '') === '1') {
    return {
      allowed: true,
      reason: 'EOS_ALLOW_MAIN_PUSH',
      denied,
      danger: true
    };
  }

  return { allowed: false, reason: 'MAIN_PUSH_DENIED', denied };
}

/**
 * Format a human deny / danger message.
 * @param {ReturnType<typeof evaluateMainPushGuard>} result
 * @returns {string}
 */
export function formatGuardMessage(result) {
  if (result.allowed && !result.danger) {
    return '[EOS PRE-PUSH] OK — no protected main ref update.';
  }

  const details = (result.denied || [])
    .map((d) => `  - ${d.kind} ${d.remoteRef} (${d.localSha.slice(0, 7)}.. remote was ${d.remoteSha.slice(0, 7)})`)
    .join('\n');

  if (result.danger) {
    return [
      '[EOS PRE-PUSH] WARNING: EOS_ALLOW_MAIN_PUSH=1 — allowing push to main (DANGEROUS).',
      'Local surrogate override only. This is NOT GitHub branch-protection enforcement.',
      details
    ].join('\n');
  }

  return [
    '[EOS PRE-PUSH] DENY: push to main blocked (local fail-closed surrogate).',
    'Direct push and force-push to refs/heads/main are denied.',
    'This is a LOCAL hook surrogate — GitHub Free private protection remains RULE_CREATED_NOT_ENFORCED.',
    'To override intentionally (dangerous): set EOS_ALLOW_MAIN_PUSH=1 for this command only.',
    'Preferred path: push a feature branch and open a PR.',
    details
  ].join('\n');
}

/**
 * Run the pre-push guard (reads stdin async when used as CLI).
 * @param {object} [options]
 * @returns {Promise<{ success: boolean, result: object }>}
 */
export async function runPrePushGuard(options = {}) {
  const cwd = options.cwd || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = options.env || process.env;
  const input = options.lines
    ? options.lines
    : await readStdinLines(options.stdin || process.stdin);

  const isAncestor =
    options.isAncestor ||
    ((a, b) => gitIsAncestor(a, b, cwd));

  const result = evaluateMainPushGuard({
    lines: input,
    env,
    allowEnvKey: options.allowEnvKey || ALLOW_ENV_KEY,
    isAncestor
  });

  const message = formatGuardMessage(result);
  if (result.allowed) {
    if (result.danger || options.verbose) {
      console.warn(message);
    }
    return { success: true, result };
  }

  console.error(message);
  return { success: false, result };
}

/**
 * @param {NodeJS.ReadableStream} stream
 * @returns {Promise<string[]>}
 */
function readStdinLines(stream) {
  return new Promise((resolve) => {
    const lines = [];
    if (stream.isTTY) {
      resolve([]);
      return;
    }
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runPrePushGuard()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error(`[EOS PRE-PUSH] ERROR: ${err.message || err}`);
      process.exit(1);
    });
}
