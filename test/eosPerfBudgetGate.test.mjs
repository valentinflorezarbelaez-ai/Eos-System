/**
 * EOS SYSTEM — PERFORMANCE BUDGET GATE TEST SUITE (Layer 0)
 * Governed by SPEC-032 & CHANGE-036
 *
 * Verifies:
 * 1. Deterministic nearest-rank percentile / median math.
 * 2. Pure budget evaluation (PASS vs BREACH, factor scaling, headroom).
 * 3. Fail-closed gate execution (a slow operation breaches; unknown targets are rejected).
 * 4. Sealed report invariants (64-hex Merkle receipt, ISO timestamp, evidence persistence).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  EosPerfBudgetGate,
  DEFAULT_PERF_BUDGETS,
  evaluateSample,
  median,
  percentile
} from "../src/core/eosPerfBudgetGate.ts";

const withFixtureRepo = async (callback) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-perf-gate-"));
  try {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "perf-fixture" }));
    fs.writeFileSync(path.join(tmpDir, "index.ts"), "export const boot = (): number => 42;\n");
    return await callback(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

describe("EOS Performance Budget Gate Suite (SPEC-032, CHANGE-036)", () => {
  describe("Suite 1: Deterministic Nearest-Rank Statistics", () => {
    it("computes median and p95 without interpolation", () => {
      const durations = [5, 1, 4, 2, 3];

      assert.equal(median(durations), 3);
      assert.equal(percentile(durations, 0.95), 5);
      assert.equal(percentile(durations, 1), 5);
      assert.equal(percentile(durations, 0), 1);
    });

    it("handles empty and out-of-range inputs defensively", () => {
      assert.equal(median([]), 0);
      assert.equal(percentile([], 0.5), 0);
      assert.equal(percentile([7, 9], -1), 7);
      assert.equal(percentile([7, 9], 42), 9);
    });

    it("does not mutate the caller's sample array", () => {
      const durations = [3, 1, 2];
      median(durations);
      assert.deepEqual(durations, [3, 1, 2]);
    });
  });

  describe("Suite 2: Pure Budget Evaluation", () => {
    const target = { id: "unit_op", description: "Synthetic operation", budgetMs: 20 };

    it("passes when the median sits inside the budget", () => {
      const sample = evaluateSample(target, [10, 12, 11]);

      assert.equal(sample.status, "PASS");
      assert.equal(sample.medianMs, 11);
      assert.equal(sample.budgetMs, 20);
      assert.equal(sample.headroomRatio, 1.818);
      assert.equal(sample.minMs, 10);
      assert.equal(sample.maxMs, 12);
      assert.equal(sample.iterations, 3);
    });

    it("fails closed as soon as the median exceeds the budget", () => {
      const sample = evaluateSample(target, [19, 21, 30]);

      assert.equal(sample.status, "BREACH");
      assert.equal(sample.medianMs, 21);
    });

    it("scales the budget by the CI runner factor", () => {
      const strict = evaluateSample(target, [21, 21, 21], 1);
      const relaxed = evaluateSample(target, [21, 21, 21], 2);

      assert.equal(strict.status, "BREACH");
      assert.equal(relaxed.status, "PASS");
      assert.equal(relaxed.budgetMs, 40);
    });
  });

  describe("Suite 3: Fail-Closed Gate Execution", () => {
    it("measures a real operation inside a generous budget", async () => {
      await withFixtureRepo(async (tmpDir) => {
        const gate = new EosPerfBudgetGate(tmpDir, { iterations: 1, warmupIterations: 0 });
        const sample = gate.measure({ id: "fixture_probe", description: "Probe", budgetMs: 5_000 }, () =>
          fs.existsSync(path.join(tmpDir, "index.ts"))
        );

        assert.equal(sample.status, "PASS");
        assert.equal(sample.iterations, 1);
      });
    });

    it("breaches when the operation exceeds an impossible budget", async () => {
      await withFixtureRepo(async (tmpDir) => {
        const gate = new EosPerfBudgetGate(tmpDir, { iterations: 1, warmupIterations: 0 });
        const sample = gate.measure({ id: "slow_op", description: "Slow", budgetMs: 0.0001 }, () => {
          const until = Date.now() + 2;
          while (Date.now() < until) {
            // Busy-wait ~2ms: deterministic breach of a sub-microsecond budget.
          }
          return true;
        });

        assert.equal(sample.status, "BREACH");
        assert.ok(sample.medianMs > sample.budgetMs);
      });
    });

    it("rejects budgets that are not wired to a measurement", async () => {
      await withFixtureRepo(async (tmpDir) => {
        const gate = new EosPerfBudgetGate(tmpDir, { iterations: 1, warmupIterations: 0 });
        await assert.rejects(
          () => gate.runDefaultSuite([{ id: "ghost_metric", description: "Not wired", budgetMs: 10 }]),
          /No measurement wired for performance budget target: ghost_metric/
        );
      });
    });
  });

  describe("Suite 4: Sealed Report & Evidence", () => {
    it("seals the default suite with a reproducible-shape receipt", async () => {
      await withFixtureRepo(async (tmpDir) => {
        const gate = new EosPerfBudgetGate(tmpDir, { iterations: 1, warmupIterations: 0 });
        const report = await gate.runDefaultSuite();

        assert.equal(report.passed, true);
        assert.deepEqual(report.breaches, []);
        assert.equal(report.samples.length, DEFAULT_PERF_BUDGETS.length);
        assert.match(report.sha256MerkleReceipt, /^[0-9a-f]{64}$/);
        assert.ok(!Number.isNaN(Date.parse(report.timestamp)), "Timestamp must be ISO-8601");
        assert.ok(report.totalDurationMs >= 0);

        const evidencePath = EosPerfBudgetGate.writeEvidence(
          report,
          path.join(tmpDir, "docs", "evidence", "PERF-BUDGET.json")
        );
        const persisted = JSON.parse(fs.readFileSync(evidencePath, "utf8"));

        assert.equal(persisted.sha256MerkleReceipt, report.sha256MerkleReceipt);
        assert.equal(persisted.samples.length, DEFAULT_PERF_BUDGETS.length);
      });
    });

    it("declares every critical-path budget as a positive bound", () => {
      const ids = DEFAULT_PERF_BUDGETS.map((budget) => budget.id);

      assert.deepEqual(ids, ["repository_audit", "polyglot_fingerprint", "source_enumeration", "turbo_pipeline"]);
      for (const budget of DEFAULT_PERF_BUDGETS) {
        assert.ok(budget.budgetMs > 0, `${budget.id} must declare a positive budget`);
        assert.ok(budget.description.length > 0, `${budget.id} must be documented`);
      }
    });
  });
});
