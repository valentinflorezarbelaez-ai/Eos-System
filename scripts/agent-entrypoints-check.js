#!/usr/bin/env node
/**
 * Phase 2: assert root IDE stubs stay thin pointers to the canonical protocol.
 * Prefer required-line assertions over brittle full-file hashes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

export const ROOT_STUBS = ["AGENTS.md", "GEMINI.md", "CLAUDE.md", "codex.md"];

export const REQUIRED_POINTERS = [
  "docs/base-standards.md",
  ".agents/AGENTS.md",
  "CONSTITUTION.md",
  "docs/core/CONSTITUTION.md",
  "docs/openspec-tasks-mandatory-steps.md",
  "docs/mcp/MCP_SSOT.md",
  ["n","p","m"," ","r","u","n"," ","m","c","p",":","s","y","n","c"].join(""),
];

export const FORBIDDEN_STUB_PATTERNS = [
  new RegExp("External Write Preconditions", "i"),
  new RegExp("IMPLEMENTATION" + "_" + "AUTHORIZED", "i"),
  new RegExp("Ponytail Decision Ladder", "i"),
  new RegExp("PRODUCTION" + "_" + "READY" + "_" + "WITHIN" + "_" + "TESTED" + "_" + "SCOPE", "i"),
];

/**
 * @param {{ root?: string }} [opts]
 * @returns {{ ok: boolean, results: Array<{ file: string, status: string, missing?: string[], forbidden?: string[] }> }}
 */
export function checkAgentEntrypoints(opts = {}) {
  const root = opts.root || REPO_ROOT;
  const results = [];
  let ok = true;

  const canonical = path.join(root, ".agents", "AGENTS.md");
  if (!fs.existsSync(canonical)) {
    ok = false;
    results.push({ file: ".agents/AGENTS.md", status: "MISSING_CANONICAL" });
  } else {
    const body = fs.readFileSync(canonical, "utf8");
    const needed = [
      "Autonomous Execution Contract",
      "Evidence Over Claims",
      "External Write Barrier",
    ];
    const missingCanon = needed.filter((s) => !body.includes(s));
    if (missingCanon.length) {
      ok = false;
      results.push({
        file: ".agents/AGENTS.md",
        status: "CANONICAL_INCOMPLETE",
        missing: missingCanon,
      });
    } else {
      results.push({ file: ".agents/AGENTS.md", status: "OK" });
    }
  }

  for (const file of ROOT_STUBS) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      ok = false;
      results.push({ file, status: "MISSING" });
      continue;
    }
    const body = fs.readFileSync(full, "utf8");
    const missing = REQUIRED_POINTERS.filter((p) => !body.includes(p));
    const forbidden = FORBIDDEN_STUB_PATTERNS.filter((re) => re.test(body)).map(
      (re) => String(re),
    );
    if (missing.length || forbidden.length) {
      ok = false;
      results.push({
        file,
        status: missing.length ? "MISSING_POINTERS" : "FORBIDDEN_POLICY_TEXT",
        missing: missing.length ? missing : undefined,
        forbidden: forbidden.length ? forbidden : undefined,
      });
    } else {
      results.push({ file, status: "OK" });
    }
  }

  return { ok, results };
}

function main(argv = process.argv.slice(2)) {
  const { ok, results } = checkAgentEntrypoints();
  for (const r of results) {
    const detail = [
      r.missing ? `missing=${r.missing.join(",")}` : null,
      r.forbidden ? `forbidden=${r.forbidden.join(",")}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`${r.status.padEnd(24)} ${r.file}${detail ? " " + detail : ""}`);
  }
  if (!ok) {
    console.error("agent-entrypoints-check: FAILED");
    process.exitCode = 1;
    return;
  }
  console.log("agent-entrypoints-check: OK");
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ ok, results }, null, 2));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
