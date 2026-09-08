#!/usr/bin/env node
/**
 * EOS Governance Gate Hook
 * PreToolUse: write_to_file | replace_file_content | multi_replace_file_content
 *
 * Phase 4: delegates path policy to the Write Barrier sandbox SSOT
 * (realpath allowlist + Fundacion always-deny). No hardcoded user-home paths.
 *
 * Exit codes:
 *   0 = allowed
 *   2 = denied (blocks the tool call)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkWritePathPolicy,
  isFundacionPath,
  loadSsotRoots,
  resolveRepoRoot
} from '../../src/core/write-barrier/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolveRepoRoot(path.resolve(__dirname, '..', '..'));

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const event = JSON.parse(input);
      const targetFile =
        event.toolInput?.TargetFile ||
        event.toolInput?.targetFile ||
        event.toolInput?.file ||
        event.toolInput?.path ||
        '';

      if (!targetFile) {
        process.exit(0);
      }

      if (isFundacionPath(targetFile)) {
        const response = {
          permissionDecision: 'deny',
          reason: `GOVERNANCE VIOLATION: Path "${targetFile}" is under FROZEN boundary (PRJ-FUNDACION Δ=0). Write is strictly prohibited.`,
          rule: 'EOS_WRITE_BARRIER_FROZEN'
        };
        process.stdout.write(JSON.stringify(response));
        process.exit(2);
      }

      let ssot;
      try {
        ssot = loadSsotRoots({ repoRoot: REPO_ROOT });
      } catch (err) {
        process.stderr.write(
          `[EOS:governance-gate] FAIL-CLOSED SSOT: ${err.message}\n`
        );
        process.stdout.write(
          JSON.stringify({
            permissionDecision: 'deny',
            reason: `GOVERNANCE VIOLATION: Write barrier SSOT misconfig — fail-closed (${err.message})`,
            rule: 'EOS_WRITE_BARRIER_SSOT_MISCONFIG'
          })
        );
        process.exit(2);
      }

      // IDE PreToolUse has no ALS write scope; enforce SSOT policy path check.
      const verdict = checkWritePathPolicy(targetFile, { repoRoot: REPO_ROOT });
      if (!verdict.allowed) {
        const response = {
          permissionDecision: 'deny',
          reason: `GOVERNANCE VIOLATION: Path "${targetFile}" denied by Write Barrier (${verdict.reason}).`,
          rule:
            verdict.reason === 'FUNDACION_ALWAYS_DENY' ||
            verdict.reason === 'ALWAYS_DENY_ROOT'
              ? 'EOS_WRITE_BARRIER_FROZEN'
              : 'EOS_WRITE_BARRIER_POLICY'
        };
        process.stdout.write(JSON.stringify(response));
        process.exit(2);
      }

      for (const protectedFile of ssot.resolvedProtectedFiles || []) {
        if (
          String(verdict.path).replace(/\\/g, '/').toLowerCase() ===
          String(protectedFile).replace(/\\/g, '/').toLowerCase()
        ) {
          process.stderr.write(
            `[EOS:governance-gate] WARNING: Writing to protected file "${targetFile}". This is a CRITICAL governance document.\n`
          );
        }
      }

      process.exit(0);
    } catch (err) {
      process.stderr.write(`[EOS:governance-gate] FAIL-CLOSED: ${err.message}\n`);
      process.exit(2);
    }
  });
}

main();
