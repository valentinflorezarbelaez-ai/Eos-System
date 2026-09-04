#!/usr/bin/env node
/**
 * EOS Evidence Logger Hook
 * PostToolUse: run_command
 *
 * Appends every command execution result to EVIDENCE_STREAM.json
 * for full traceability and audit compliance.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const EOS_ROOT = process.env.EOS_ROOT || join(dirname(new URL(import.meta.url).pathname.slice(1)), '..', '..');
const EVIDENCE_PATH = join(EOS_ROOT, 'EOS-MISSION-CONTROL', 'EVIDENCE_STREAM.json');

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const event = JSON.parse(input);
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'COMMAND_EXECUTION',
        tool: event.toolName || 'run_command',
        command: event.toolInput?.CommandLine || event.toolInput?.command || 'unknown',
        exit_code: event.toolOutput?.exitCode ?? null,
        cwd: event.toolInput?.Cwd || event.toolInput?.cwd || null,
        sha256: createHash('sha256')
          .update(JSON.stringify(event))
          .digest('hex')
          .slice(0, 16),
        agent: event.agentName || 'unknown'
      };

      let stream = { entries: [] };
      if (existsSync(EVIDENCE_PATH)) {
        try {
          stream = JSON.parse(readFileSync(EVIDENCE_PATH, 'utf8'));
          if (!Array.isArray(stream.entries)) stream.entries = [];
        } catch {
          stream = { entries: [] };
        }
      } else {
        const dir = dirname(EVIDENCE_PATH);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      }

      // Keep last 500 entries to prevent unbounded growth
      if (stream.entries.length >= 500) {
        stream.entries = stream.entries.slice(-250);
      }

      stream.entries.push(entry);
      stream.last_updated = entry.timestamp;
      stream.total_logged = (stream.total_logged || 0) + 1;

      writeFileSync(EVIDENCE_PATH, JSON.stringify(stream, null, 2));
    } catch (err) {
      // Hooks must not break the agent — fail silently
      process.stderr.write(`[EOS:evidence-logger] ${err.message}\n`);
    }
  });
}

main();
