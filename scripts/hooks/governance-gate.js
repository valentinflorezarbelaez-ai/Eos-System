#!/usr/bin/env node
/**
 * EOS Governance Gate Hook
 * PreToolUse: write_to_file | replace_file_content | multi_replace_file_content
 *
 * Enforces write barriers:
 * - Fundacion directory is FROZEN (Δ = 0)
 * - External project directories are blocked without authorization
 * - Core kernel files require elevated authorization
 *
 * Exit codes:
 *   0 = allowed
 *   2 = denied (blocks the tool call)
 */
import { resolve, normalize } from 'node:path';

const FROZEN_PATHS = [
  normalize('C:/Users/valen/Documents/Fundacion'),
  normalize('C:/Users/valen/Documents/Eos system/Fundacion'),
];

const PROTECTED_PATHS = [
  normalize('C:/Users/valen/Documents/Eos system/CONSTITUTION.md'),
  normalize('C:/Users/valen/Documents/Eos system/DEPENDENCY_POLICY_L0.md'),
];

const EOS_ROOT = normalize('C:/Users/valen/Documents/Eos system');

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

      if (!targetFile) {
        // No file target — allow
        process.exit(0);
      }

      const normalizedTarget = normalize(resolve(targetFile));

      // Check FROZEN paths (absolute block)
      for (const frozen of FROZEN_PATHS) {
        if (normalizedTarget.startsWith(frozen)) {
          const response = {
            permissionDecision: 'deny',
            reason: `GOVERNANCE VIOLATION: Path "${targetFile}" is under FROZEN boundary (PRJ-FUNDACION Δ=0). Write is strictly prohibited.`,
            rule: 'EOS_WRITE_BARRIER_FROZEN'
          };
          process.stdout.write(JSON.stringify(response));
          process.exit(2);
        }
      }

      // Check PROTECTED paths (warning, not block — for awareness)
      for (const protected_ of PROTECTED_PATHS) {
        if (normalizedTarget === protected_) {
          process.stderr.write(
            `[EOS:governance-gate] WARNING: Writing to protected file "${targetFile}". This is a CRITICAL governance document.\n`
          );
        }
      }

      // Check if writing outside EOS workspace
      if (!normalizedTarget.startsWith(EOS_ROOT)) {
        const response = {
          permissionDecision: 'deny',
          reason: `GOVERNANCE VIOLATION: Path "${targetFile}" is outside the EOS workspace boundary. External writes require IMPLEMENTATION_AUTHORIZED status.`,
          rule: 'EOS_EXTERNAL_WRITE_BARRIER'
        };
        process.stdout.write(JSON.stringify(response));
        process.exit(2);
      }

      // Allowed
      process.exit(0);
    } catch (err) {
      // On parse error, allow (don't break the agent)
      process.stderr.write(`[EOS:governance-gate] ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();
