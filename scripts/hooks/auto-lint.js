#!/usr/bin/env node
/**
 * EOS Auto-Lint Hook
 * PostToolUse: write_to_file | replace_file_content | multi_replace_file_content
 *
 * Runs basic formatting/validation on edited files:
 * - JSON: validates parse-ability
 * - JS/TS: reports if file has obvious syntax issues
 * - MD: no-op (markdown is freeform)
 *
 * Non-blocking: logs issues but never fails the agent.
 */
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const event = JSON.parse(input);
      const targetFile = event.toolInput?.TargetFile
        || event.toolInput?.targetFile
        || event.toolInput?.file
        || '';

      if (!targetFile || !existsSync(targetFile)) {
        process.exit(0);
      }

      const ext = extname(targetFile).toLowerCase();

      if (ext === '.json') {
        try {
          const content = readFileSync(targetFile, 'utf8');
          JSON.parse(content);
          process.stderr.write(`[EOS:auto-lint] ✓ ${targetFile} — valid JSON\n`);
        } catch (parseErr) {
          process.stderr.write(
            `[EOS:auto-lint] ✗ ${targetFile} — INVALID JSON: ${parseErr.message}\n`
          );
        }
      } else if (['.js', '.mjs', '.ts', '.mts'].includes(ext)) {
        try {
          const content = readFileSync(targetFile, 'utf8');
          // Basic syntax check: try to detect unclosed brackets/parens
          const opens = (content.match(/[{([\[]/g) || []).length;
          const closes = (content.match(/[})\]]/g) || []).length;
          const diff = Math.abs(opens - closes);
          if (diff > 2) {
            process.stderr.write(
              `[EOS:auto-lint] ⚠ ${targetFile} — bracket imbalance detected (Δ=${diff})\n`
            );
          } else {
            process.stderr.write(`[EOS:auto-lint] ✓ ${targetFile} — syntax OK\n`);
          }
        } catch {
          // Can't read file — skip
        }
      }
      // MD, MDC, etc. — no validation needed
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[EOS:auto-lint] ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();
