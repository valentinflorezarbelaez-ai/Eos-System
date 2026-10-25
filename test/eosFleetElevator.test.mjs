import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosFleetElevator } from "../src/core/eosFleetElevator.ts";

describe("EOS Sovereign Fleet Golden Path Elevator Suite", () => {
  const elevator = new EosFleetElevator(process.cwd());

  describe("Suite 1: Fleet Elevation Audit & Golden Path Index (BDD-044)", () => {
    it("audits all registered fleet repositories in dry-run mode", () => {
      const report = elevator.elevateFleet({ dryRun: true });
      assert.ok(report.totalProjects >= 4, `Expected at least 4 registered projects, got ${report.totalProjects}`);
      assert.ok(report.fleetGoldenPathScore >= 65, `Expected fleet score >= 65, got ${report.fleetGoldenPathScore}`);
      assert.equal(report.projects.length, report.totalProjects);

      const eosCore = report.projects.find((p) => p.id === "eos-system");
      assert.ok(eosCore);
      assert.equal(eosCore.goldenPathScore, 100);
      assert.equal(eosCore.catalogInfoStatus, "COMPLIANT");
    });

    it("evaluates target project elevation independently", () => {
      const report = elevator.elevateFleet({ dryRun: true, targetProject: "aberamentho" });
      assert.equal(report.totalProjects, 1);
      assert.equal(report.projects[0].id, "aberamentho");
      assert.ok(report.projects[0].goldenPathScore >= 70);
    });
  });
});
