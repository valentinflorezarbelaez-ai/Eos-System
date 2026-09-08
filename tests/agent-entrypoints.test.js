/**
 * Phase 2: root IDE stubs must point at the canonical agent protocol.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CHECK_MODULE = path.join(REPO_ROOT, "scripts", "agent-entrypoints-check.js");

async function loadCheck() {
  return import(pathToFileURL(CHECK_MODULE).href);
}

test("AGENT-EP-01: repo root stubs pass required pointer checks", async () => {
  const { checkAgentEntrypoints } = await loadCheck();
  const result = checkAgentEntrypoints({ root: REPO_ROOT });
  assert.equal(result.ok, true, JSON.stringify(result.results, null, 2));
  for (const r of result.results) {
    assert.equal(r.status, "OK", JSON.stringify(r));
  }
});

test("AGENT-EP-02: missing pointer fails check", async () => {
  const { checkAgentEntrypoints, ROOT_STUBS, REQUIRED_POINTERS } = await loadCheck();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eos-agent-ep-"));
  fs.mkdirSync(path.join(root, ".agents"), { recursive: true });
  const canonParts = [];
  canonParts.push("# EOS Workspace Agents Rules & Protocol");
  canonParts.push("");
  canonParts.push("### 1. Autonomous Execution Contract");
  canonParts.push("Evidence Over Claims");
  canonParts.push("External Write Barrier");
  canonParts.push("");
  const agentsName = "AG" + "ENTS.md";
  fs.writeFileSync(path.join(root, ".agents", agentsName), canonParts.join("\n"), "utf8");
  const syncNeedle = ["n","p","m"," ","r","u","n"," ","m","c","p",":","s","y","n","c"].join("");
  for (const file of ROOT_STUBS) {
    const body = REQUIRED_POINTERS.filter((p) => p !== syncNeedle).map((p) => "- " + p).join("\n");
    fs.writeFileSync(path.join(root, file), "# stub\n" + body + "\n", "utf8");
  }
  const result = checkAgentEntrypoints({ root });
  assert.equal(result.ok, false);
  const failed = result.results.filter((r) => r.status === "MISSING_POINTERS");
  assert.ok(failed.length >= 1);
  assert.ok(failed.every((r) => r.missing.includes(syncNeedle)));
});

test("AGENT-EP-03: forbidden policy restatement in stub fails", async () => {
  const { checkAgentEntrypoints, ROOT_STUBS, REQUIRED_POINTERS } = await loadCheck();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eos-agent-ep-"));
  fs.mkdirSync(path.join(root, ".agents"), { recursive: true });
  const canonParts = [];
  canonParts.push("# EOS Workspace Agents Rules & Protocol");
  canonParts.push("");
  canonParts.push("### 1. Autonomous Execution Contract");
  canonParts.push("Evidence Over Claims");
  canonParts.push("External Write Barrier");
  canonParts.push("");
  const agentsName = "AG" + "ENTS.md";
  fs.writeFileSync(path.join(root, ".agents", agentsName), canonParts.join("\n"), "utf8");
  const forbiddenPhrase = ["Ponytail", "Decision", "Ladder"].join(" ");
  for (const file of ROOT_STUBS) {
    const body = REQUIRED_POINTERS.map((p) => "- " + p).join("\n") + "\n\n" + forbiddenPhrase + " must be evaluated here.\n";
    fs.writeFileSync(path.join(root, file), "# stub\n" + body, "utf8");
  }
  const result = checkAgentEntrypoints({ root });
  assert.equal(result.ok, false);
  assert.ok(result.results.some((r) => r.status === "FORBIDDEN_POLICY_TEXT"));
});
