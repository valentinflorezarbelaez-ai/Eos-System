/**
 * TDD coverage for MCP SSOT sync.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SYNC_MODULE = path.join(REPO_ROOT, "scripts", "mcp-ssot-sync.js");

async function loadSync() {
  return import(pathToFileURL(SYNC_MODULE).href);
}

function writeMinimalSsot(root, overrides = {}) {
  const ssot = {
    version: "1.0.0",
    profiles: {
      L0_READONLY: {
        env: {
          EOS_MODE: "read-only",
          EOS_AUTONOMY_LEVEL: "LEVEL_0",
          EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: "false",
        },
      },
      L1_LOCAL_GOVERNED: {
        env: {
          EOS_MODE: "read-write",
          EOS_AUTONOMY_LEVEL: "LEVEL_1",
          EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: "false",
          EOS_SCOPE: "LOCAL_GOVERNED_MVP",
        },
      },
    },
    coreServers: {
      "eos-local": { command: "node", args: ["src/mcp-server.js"] },
      engram: { command: "engram", args: ["mcp", "--tools=agent"] },
    },
    consumers: {
      ".agents/mcp_config.json": {
        profile: "L0_READONLY",
        extraServers: {
          context7: { command: "npx", args: ["-y", "context7"] },
        },
      },
      ".cursor/mcp.json": {
        profile: "L1_LOCAL_GOVERNED",
        extraServers: {
          playwright: { command: "npx", args: ["-y", "playwright"] },
        },
      },
      ".windsurf/mcp.json": {
        profile: "L1_LOCAL_GOVERNED",
        gitignored: true,
        extraServers: {},
      },
    },
    ...overrides,
  };
  const ssotPath = path.join(root, "config", "mcp", "eos-mcp.ssot.json");
  fs.mkdirSync(path.dirname(ssotPath), { recursive: true });
  fs.writeFileSync(ssotPath, JSON.stringify(ssot, null, 2) + "\n");
  return ssotPath;
}

test("MCP-SSOT-01: sync is idempotent", async () => {
  const { runSync } = await loadSync();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eos-mcp-ssot-"));
  const ssotPath = writeMinimalSsot(root);
  const first = runSync({ root, ssotPath, check: false });
  assert.equal(first.ok, true);
  const second = runSync({ root, ssotPath, check: false });
  assert.equal(second.ok, true);
  const check = runSync({ root, ssotPath, check: true });
  assert.equal(check.ok, true);
  assert.equal(check.drifted, false);
  for (const r of check.results) {
    assert.equal(r.status, "OK");
  }
});

test("MCP-SSOT-02: generated eos-local env matches profile", async () => {
  const { runSync } = await loadSync();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eos-mcp-ssot-"));
  const ssotPath = writeMinimalSsot(root);
  runSync({ root, ssotPath, check: false });
  const agents = JSON.parse(fs.readFileSync(path.join(root, ".agents/mcp_config.json"), "utf8"));
  const cursor = JSON.parse(fs.readFileSync(path.join(root, ".cursor/mcp.json"), "utf8"));
  assert.deepEqual(agents.mcpServers["eos-local"].env, {
    EOS_MODE: "read-only",
    EOS_AUTONOMY_LEVEL: "LEVEL_0",
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: "false",
  });
  assert.deepEqual(cursor.mcpServers["eos-local"].env, {
    EOS_MODE: "read-write",
    EOS_AUTONOMY_LEVEL: "LEVEL_1",
    EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: "false",
    EOS_SCOPE: "LOCAL_GOVERNED_MVP",
  });
  assert.deepEqual(agents.mcpServers["eos-local"].args, ["src/mcp-server.js"]);
  assert.equal(agents.mcpServers.engram.command, "engram");
  assert.equal(cursor.mcpServers.engram.command, "engram");
});

test("MCP-SSOT-03: --check fails when eos-local drifts from SSOT", async () => {
  const { runSync } = await loadSync();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eos-mcp-ssot-"));
  const ssotPath = writeMinimalSsot(root);
  runSync({ root, ssotPath, check: false });
  const agentsPath = path.join(root, ".agents/mcp_config.json");
  const doc = JSON.parse(fs.readFileSync(agentsPath, "utf8"));
  doc.mcpServers["eos-local"].env.EOS_MODE = "read-write";
  fs.writeFileSync(agentsPath, JSON.stringify(doc, null, 2) + "\n");
  const check = runSync({ root, ssotPath, check: true });
  assert.equal(check.ok, false);
  assert.equal(check.drifted, true);
  const agentsResult = check.results.find((r) => r.path === ".agents/mcp_config.json");
  assert.equal(agentsResult.status, "DRIFT");
});
