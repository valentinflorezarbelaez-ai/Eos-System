import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosOpenSpecSync } from "../src/core/eosOpenSpecSync.ts";

describe("EOS Living OpenSpec Architecture & Drift Synchronizer Suite", () => {
  const synchronizer = new EosOpenSpecSync(process.cwd());

  describe("Suite 1: Base Specifications & Delta Changes (BDD-032)", () => {
    it("discovers and parses living base specifications in openspec/specs/", () => {
      const specs = synchronizer.listSpecs();
      assert.ok(Array.isArray(specs));
      assert.ok(specs.length >= 3, `Expected at least 3 base specs, found ${specs.length}`);

      const constitution = specs.find((s) => s.id.includes("CONSTITUTION"));
      assert.ok(constitution, "Expected SPEC-001-CONSTITUTION to be found");
      assert.ok(constitution.content.includes("Zero Vibe Coding"));
    });

    it("discovers and parses change deltas in openspec/changes/", () => {
      const changes = synchronizer.listChanges();
      assert.ok(Array.isArray(changes));
      assert.ok(changes.length >= 3, `Expected at least 3 change deltas, found ${changes.length}`);

      const tier1Change = changes.find((c) => c.id.includes("PROMETHEUS"));
      assert.ok(tier1Change, "Expected CHANGE-001-TIER1-PROMETHEUS to be found");
      assert.equal(tier1Change.status, "APPLIED_AND_VERIFIED");
      assert.ok(tier1Change.authorizationLevel.includes("PRODUCTION_AUTHORIZED"));
    });
  });

  describe("Suite 2: Consistency Audit & Level 2+ Verification (BDD-033)", () => {
    it("certifies zero orphan links and valid Level 2+ authorizations", () => {
      const report = synchronizer.audit();
      assert.equal(report.valid, true, `Audit findings: ${report.findings.concat(report.orphanLinks).join(", ")}`);
      assert.equal(report.orphanLinks.length, 0);
      assert.equal(report.missingAuthorizations.length, 0);
      assert.ok(typeof report.sha256Proof === "string" && report.sha256Proof.length === 64);
    });
  });
});
