/**
 * EOS SYSTEM — ENGINEERING INTEGRITY GATE TEST SUITE (Layer 0)
 * Governed by SPEC-001 & CHANGE-040
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  EosEngineeringIntegrityGate,
  MAX_REQUIREMENT_ID_COLLISIONS,
  inspectDocVersion,
  inspectFileSizes,
  inspectGovernance,
  inspectMcpContract
} from "../src/core/eosEngineeringIntegrityGate.ts";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const withRepo = (files, callback) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-integrity-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const full = path.join(tmpDir, relativePath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    return callback(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const earsSpec = (id) => `# ${id}: Sample\n\n## 2. Requirements (EARS)\n- SHALL behave.\n\nBDD-001\n`;

describe("EOS Engineering Integrity Gate Suite (SPEC-001, CHANGE-040)", () => {
  describe("Suite 1: Governance Identity & Requirement Form", () => {
    it("detects duplicate SPEC and CHANGE identifiers", () => {
      withRepo(
        {
          "openspec/specs/SPEC-001-A.md": earsSpec("SPEC-001"),
          "openspec/specs/SPEC-001-B.md": earsSpec("SPEC-001"),
          "openspec/changes/CHANGE-001-A.md": "# CHANGE-001: a\n",
          "openspec/changes/CHANGE-001-B.md": "# CHANGE-001: b\n"
        },
        (tmpDir) => {
          assert.deepEqual(inspectGovernance(tmpDir).duplicateIds, ["CHANGE-001", "SPEC-001"]);
        }
      );
    });

    it("requires EARS in specs, exempts changes and the Constitution", () => {
      withRepo(
        {
          "openspec/specs/SPEC-001-CONSTITUTION.md": "# SPEC-001: Laws\n\n## 1. Laws\n- Law I\n",
          "openspec/specs/SPEC-002-OK.md": earsSpec("SPEC-002"),
          "openspec/specs/SPEC-003-MISSING.md": "# SPEC-003: No requirement section\n",
          "openspec/changes/CHANGE-001-DELTA.md": "# CHANGE-001: delta without EARS\n"
        },
        (tmpDir) => {
          const report = inspectGovernance(tmpDir);

          assert.deepEqual(report.missingEars, ["specs/SPEC-003-MISSING.md"]);
          assert.equal(report.files.filter((file) => file.scope === "change").length, 1);
        }
      );
    });

    it("counts cross-spec FR/BDD collisions and reports specs without BDD", () => {
      withRepo(
        {
          "openspec/specs/SPEC-002-A.md": "FR-001\nBDD-001\nEARS\n",
          "openspec/specs/SPEC-003-B.md": "FR-001\nEARS\n"
        },
        (tmpDir) => {
          const report = inspectGovernance(tmpDir);

          assert.equal(report.requirementIdCollisions, 1);
          assert.deepEqual(report.missingBdd, ["specs/SPEC-003-B.md"]);
          assert.ok(MAX_REQUIREMENT_ID_COLLISIONS >= report.requirementIdCollisions);
        }
      );
    });
  });

  describe("Suite 2: Documentation Truth", () => {
    it("flags README drift against package.json", () => {
      withRepo(
        {
          "package.json": JSON.stringify({ version: "47.0.0" }),
          "README.md": "# EOS\n> Matrix v18.0 ready\n"
        },
        (tmpDir) => {
          const report = inspectDocVersion(tmpDir);

          assert.equal(report.packageVersion, "47.0.0");
          assert.equal(report.documentedVersion, "18.0");
          assert.equal(report.aligned, false);
        }
      );
    });

    it("accepts a matching major version and flags a missing version", () => {
      withRepo({ "package.json": JSON.stringify({ version: "47.2.1" }), "README.md": "# EOS v47.2\n" }, (tmpDir) => {
        assert.equal(inspectDocVersion(tmpDir).aligned, true);
      });
      withRepo({ "package.json": JSON.stringify({ version: "47.0.0" }), "README.md": "# EOS\n" }, (tmpDir) => {
        const report = inspectDocVersion(tmpDir);

        assert.equal(report.documentedVersion, null);
        assert.equal(report.aligned, false);
      });
    });
  });

  describe("Suite 3: MCP Contract Symmetry", () => {
    it("detects tools advertised without handlers and handlers without advertisements", () => {
      const source = [
        '  name: "eos_ok",',
        '  name: "eos_orphan_tool",',
        '  case "eos_ok": {',
        '  case "eos_orphan_handler": {'
      ].join("\n");

      const report = inspectMcpContract(source);

      assert.deepEqual(report.advertisedWithoutHandler, ["eos_orphan_tool"]);
      assert.deepEqual(report.handlerWithoutAdvertisement, ["eos_orphan_handler"]);
      assert.equal(report.symmetric, false);
    });

    it("accepts a symmetric contract", () => {
      const report = inspectMcpContract('  name: "eos_a",\n  name: "eos_b",\n  case "eos_a": {\n  case "eos_b": {');

      assert.equal(report.advertised, 2);
      assert.equal(report.handled, 2);
      assert.equal(report.symmetric, true);
    });
  });

  describe("Suite 4: Size Ratchet", () => {
    it("flags files above their budget and respects explicit budgets", () => {
      withRepo(
        {
          "src/core/small.ts": "export const a = 1;\n",
          "src/core/big.ts": "// line\n".repeat(30)
        },
        (tmpDir) => {
          const violations = inspectFileSizes(tmpDir, { "src/core/big.ts": 10 }, 50);

          assert.equal(violations.length, 1);
          assert.equal(violations[0].file, "src/core/big.ts");
          assert.equal(violations[0].budget, 10);
          assert.ok(violations[0].lines > 10);
        }
      );
    });
  });

  describe("Suite 5: Live Repository Integrity", () => {
    it("passes on the current repository with zero violations", () => {
      const report = new EosEngineeringIntegrityGate(root).inspect();

      assert.equal(report.passed, true, report.violations.join("; "));
      assert.deepEqual(report.violations, []);
      assert.deepEqual(report.governance.duplicateIds, []);
      assert.deepEqual(report.governance.missingEars, []);
      assert.equal(report.docVersion.aligned, true);
      assert.equal(report.mcpContract.symmetric, true);
      assert.match(report.sha256MerkleReceipt, /^[0-9a-f]{64}$/);
      assert.ok(report.governance.files.length > 50, "Expected the full governance surface to be audited");
    });
  });
});
