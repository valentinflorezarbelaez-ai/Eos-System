import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosGoAccelerator } from "../src/core/eosGoAccelerator.ts";

describe("EOS Sovereign Go Native Titan Accelerator Suite", () => {
  const accelerator = new EosGoAccelerator(process.cwd());

  describe("Suite 1: Go Detection & Binary Availability (BDD-042)", () => {
    it("detects compiled binary or active Go compiler", () => {
      const avail = accelerator.isGoAvailable();
      assert.ok(typeof avail.binaryExists === "boolean");
      assert.ok(typeof avail.compilerAvailable === "boolean");
      // On this workstation Go is available
      assert.ok(avail.binaryExists || avail.compilerAvailable, "Expected Go binary or compiler to be present");
    });
  });

  describe("Suite 2: Go Goroutine Audio Streaming & SIMD Benchmark (BDD-042)", () => {
    it("achieves ultra-high throughput across concurrent goroutines", () => {
      const result = accelerator.runBenchmark(1000);
      assert.equal(result.status, "PASS");
      assert.ok(result.concurrencyGoroutines >= 1000);
      assert.ok(result.streamingThroughputMbSec > 500, `Expected > 500 MB/s, got ${result.streamingThroughputMbSec}`);
      assert.ok(result.cosineSimOpsSec > 500000, `Expected > 500,000 ops/s, got ${result.cosineSimOpsSec}`);
      assert.ok(result.optimalArmSelected.length > 0);
      assert.ok(result.totalDurationUs > 0);
    });
  });

  describe("Suite 3: Spotify BaRT Contextual Bandit Optimization", () => {
    it("converges to optimal arm using Thompson Sampling", () => {
      const res = accelerator.runBanditSimulation(1500);
      assert.equal(res.status, "PASS");
      assert.equal(res.mode, "bandit");
      assert.ok(res.arms.length >= 4);
      // The hidden gem arm (track-3) should be identified as optimal
      assert.equal(res.optimalArm, "track-3");
      const hiddenGem = res.arms.find((a) => a.trackId === "track-3");
      assert.ok(hiddenGem);
      assert.ok(hiddenGem.expectedMu > 0.85, `Expected expectedMu > 0.85, got ${hiddenGem.expectedMu}`);
    });
  });
});
