#!/usr/bin/env node
/**
 * EOS Mission Sync Hook
 * PostToolUse: run_command
 *
 * Updates CURRENT_STATE.json with the latest activity timestamp
 * so Mission Control always reflects recent agent activity.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const EOS_ROOT = process.env.EOS_ROOT || join(dirname(new URL(import.meta.url).pathname.slice(1)), '..', '..');
const STATE_PATH = join(EOS_ROOT, 'EOS-MISSION-CONTROL', 'CURRENT_STATE.json');

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      let state = {};
      if (existsSync(STATE_PATH)) {
        try {
          state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
        } catch {
          state = {};
        }
      } else {
        const dir = dirname(STATE_PATH);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      }

      state.last_activity = new Date().toISOString();
      state.activity_count = (state.activity_count || 0) + 1;
      state.last_hook = 'mission-sync';

      writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (err) {
      process.stderr.write(`[EOS:mission-sync] ${err.message}\n`);
    }
  });
}

main();
