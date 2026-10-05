#!/usr/bin/env node
/**
 * MCP SSOT sync — generate consumer MCP configs from config/mcp/eos-mcp.ssot.json
 * Usage:
 *   node scripts/mcp-ssot-sync.js          # write consumers
 *   node scripts/mcp-ssot-sync.js --check   # exit 1 on drift
 *
 * Check policy:
 * - Tracked consumers (gitignored:false): must exist and match SSOT (MISSING/DRIFT fail).
 * - Gitignored consumers (gitignored:true): MISSING is OK in check (not in checkout);
 *   if present locally, content must still match SSOT (DRIFT fails).
 * Sync (write) still generates all declared consumers, including gitignored ones.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SSOT = path.join(DEFAULT_ROOT, 'config', 'mcp', 'eos-mcp.ssot.json');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadSsot(ssotPath) {
  const raw = fs.readFileSync(ssotPath, 'utf8');
  return JSON.parse(raw);
}

export function buildEosLocal(ssot, profileName, transport = null) {
  const profile = ssot.profiles?.[profileName];
  if (!profile?.env) {
    throw new Error(`Unknown or invalid profile: ${profileName}`);
  }
  const core = ssot.coreServers?.['eos-local'];
  if (!core?.command || !Array.isArray(core.args)) {
    throw new Error('SSOT coreServers.eos-local must define command and args');
  }
  const args = Array.isArray(transport?.args) ? [...transport.args] : [...core.args];
  const server = {
    command: core.command,
    args,
    env: { ...profile.env },
  };
  if (transport?.type) {
    return { type: transport.type, ...server };
  }
  return server;
}

export function buildEngram(ssot) {
  const core = ssot.coreServers?.engram;
  if (!core?.command || !Array.isArray(core.args)) {
    throw new Error('SSOT coreServers.engram must define command and args');
  }
  const out = {
    command: core.command,
    args: [...core.args],
  };
  if (core.description) out.description = core.description;
  return out;
}

export function buildConsumerDocument(ssot, consumerSpec) {
  if (!consumerSpec?.profile) {
    throw new Error('Consumer spec requires profile');
  }
  const mcpServers = {};
  mcpServers['eos-local'] = buildEosLocal(ssot, consumerSpec.profile, consumerSpec.eosLocalTransport || null);
  mcpServers.engram = buildEngram(ssot);
  const extras = consumerSpec.extraServers || {};
  for (const [name, cfg] of Object.entries(extras)) {
    if (name === 'eos-local' || name === 'engram') {
      throw new Error(`extraServers must not redefine core server: ${name}`);
    }
    mcpServers[name] = deepClone(cfg);
  }
  return { mcpServers };
}

export function serializeConsumer(doc) {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/**
 * Sync or check all consumers declared in SSOT.
 * Design: rebuild each consumer from profile + coreServers + extraServers (clean regenerate).
 * eos-local and engram always come from SSOT core; peripheral servers from consumer.extraServers.
 */
export function runSync(options = {}) {
  const root = options.root || DEFAULT_ROOT;
  const ssotPath = options.ssotPath || path.join(root, 'config', 'mcp', 'eos-mcp.ssot.json');
  const check = Boolean(options.check);
  const ssot = loadSsot(ssotPath);
  const consumers = ssot.consumers || {};
  const results = [];
  let drifted = false;

  for (const [relPath, spec] of Object.entries(consumers)) {
    const absPath = path.join(root, relPath);
    const desiredDoc = buildConsumerDocument(ssot, spec);
    const desiredText = serializeConsumer(desiredDoc);

    let currentText = null;
    if (fs.existsSync(absPath)) {
      currentText = fs.readFileSync(absPath, 'utf8');
    }

    const gitignored = Boolean(spec.gitignored);

    let status = 'OK';
    if (currentText === null) {
      if (check && gitignored) {
        // Gitignored consumers are generated locally; absence in CI/checkout is not drift.
        status = 'ABSENT_OK';
      } else {
        drifted = true;
        status = 'MISSING';
      }
    } else if (currentText !== desiredText) {
      try {
        const cur = JSON.parse(currentText);
        const sameAll = JSON.stringify(cur) === JSON.stringify(desiredDoc);
        if (!sameAll) {
          drifted = true;
          status = 'DRIFT';
        }
      } catch {
        drifted = true;
        status = 'DRIFT';
      }
    }

    if (!check) {
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, desiredText, 'utf8');
      status = status === 'OK' ? 'UNCHANGED' : 'WRITTEN';
    }

    results.push({
      path: relPath,
      status,
      gitignored,
      profile: spec.profile,
    });
  }

  if (check) {
    return { ok: !drifted, drifted, results, mode: 'check' };
  }
  return { ok: true, drifted: false, results, mode: 'sync' };
}

export function parseArgs(argv) {
  return { check: argv.includes('--check') };
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const result = runSync(opts);
  for (const r of result.results) {
    console.log("[mcp:sync]", r.status, r.path, r.profile);
  }
  if (opts.check && result.drifted) {
    console.error("[mcp:sync] consumer configs out of sync with SSOT");
    process.exitCode = 1;
  } else {
    console.log("[mcp:sync]", opts.check ? "check passed" : "sync complete");
  }
  return result;
}

const invokedDirectly =
  Boolean(process.argv[1]) && path.resolve(String(process.argv[1])) === path.resolve(__filename);
if (invokedDirectly) {
  main();
}
