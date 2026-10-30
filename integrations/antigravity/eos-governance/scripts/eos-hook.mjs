#!/usr/bin/env node

/**
 * EOS SYSTEM — ANTIGRAVITY LIFECYCLE HOOK HANDLER (Layer 1 Adapter)
 * Governed by SPEC-043, FR-130, BDD-126 (v49.0.0)
 *
 * Cross-platform Node.js lifecycle hook for Google Antigravity:
 * - SessionStart: Injects EOS Sovereign Control Plane context once per session.
 * - PreToolUse (run_command): Enforces EOS Gamma Security Barrier (Law VI) in <20ms.
 */

import fs from "node:fs";

const GAMMA_DESTRUCTIVE_PATTERNS = [
  { id: "GAMMA-001-ROOT-WIPE", regex: /(?:^|[;&|]\s*)rm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:\/|~|\*|\.\.)(?:\s|$)/i },
  { id: "GAMMA-002-FORCE-PUSH-MAIN", regex: /\bgit\s+push\s+(?:--force|-f)\s+\S+\s+(?:main|master)\b/i },
  { id: "GAMMA-003-SQL-DROP", regex: /\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/i },
  { id: "GAMMA-004-DISK-FORMAT", regex: /\b(?:Format-Volume|mkfs\.[a-z0-9]+|diskpart)\b/i },
  { id: "GAMMA-005-WIN-SYSTEM-DEL", regex: /\b(?:del|erase|rd|rmdir)\s+\/[a-z\s/]*[sq][a-z\s/]*\s+[a-z]:\\(?:\s|$|\*)/i }
];

export function evaluateHookEvent(eventName, rawStdin) {
  let payload = {};
  if (typeof rawStdin === "string" && rawStdin.trim().length > 0) {
    try {
      payload = JSON.parse(rawStdin);
    } catch {
      payload = {};
    }
  }

  if (eventName === "SessionStart") {
    return {
      injectSteps: [
        {
          systemMessage: {
            systemMessage:
              "EOS Sovereign Control Plane (MCP server `eos-system`) is ACTIVE. " +
              "For non-trivial engineering, architecture, security, or fleet tasks, invoke `eos_antigravity_direct` via `call_mcp_tool` " +
              "(ServerName: \"eos-system\") to classify the mission profile, verify Law IV write barriers, and follow the prescribed EOS MCP tool DAG."
          }
        }
      ]
    };
  }

  if (eventName === "PreToolUse") {
    const args = payload?.toolCall?.args ?? {};
    const commandLine = String(args.CommandLine ?? args.command ?? "");
    for (const rule of GAMMA_DESTRUCTIVE_PATTERNS) {
      if (rule.regex.test(commandLine)) {
        return {
          decision: "deny",
          reason: `Blocked by EOS Gamma Security Barrier (Law VI) [${rule.id}]: Destructive command pattern prohibited.`
        };
      }
    }
    return { decision: "allow" };
  }

  return {};
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("eos-hook.mjs")) {
  const eventName = process.argv[2] || "SessionStart";
  let rawInput = "";
  try {
    rawInput = fs.readFileSync(0, "utf8");
  } catch {
    rawInput = "";
  }
  const response = evaluateHookEvent(eventName, rawInput);
  process.stdout.write(JSON.stringify(response) + "\n");
}
