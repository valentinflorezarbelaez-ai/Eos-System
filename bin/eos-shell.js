#!/usr/bin/env node
/**
 * EOS Interactive Developer Shell — thin stdio entrypoint (SPEC-0029 / Mission X).
 *
 * Wires real process.stdin / process.stdout into createInteractiveDeveloperShell.
 * Mission W coordinator is loaded via dynamic import when available on the host;
 * otherwise the shell starts and /start fail-closed with SHELL_DEPENDENCY.
 *
 * PRODUCTION_READY: NO — NOT a Claude Code clone.
 * Usage: node bin/eos-shell.js   |   eos-shell   (after package.json bin patch)
 */
import { createInteractiveDeveloperShell } from '../src/cli/interactive-developer-shell.js';

async function loadCoordinatorFactory() {
  // Prefer host Mission W module when present in the worktree.
  const candidates = [
    new URL('../src/core/session/sovereign-session-coordinator.js', import.meta.url),
    new URL('../../src/core/session/sovereign-session-coordinator.js', import.meta.url)
  ];
  for (const href of candidates) {
    try {
      const mod = await import(href.href);
      if (typeof mod.createSovereignSessionCoordinator === 'function') {
        return mod.createSovereignSessionCoordinator;
      }
    } catch {
      // try next
    }
  }
  return null;
}

async function main() {
  const createSovereignSessionCoordinator = await loadCoordinatorFactory();

  const shell = createInteractiveDeveloperShell({
    stdin: process.stdin,
    stdout: process.stdout,
    createSovereignSessionCoordinator: createSovereignSessionCoordinator || undefined,
    color: process.stdout.isTTY !== false
  });

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode?.(false);
    } catch {
      // ignore
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
  }

  shell.start();

  const shutdown = () => {
    try {
      shell.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('eos-shell fatal:', err?.message || err);
  process.exit(1);
});
