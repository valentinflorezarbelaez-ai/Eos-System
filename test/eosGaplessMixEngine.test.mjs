import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosGaplessMixEngine } from "../src/core/eosGaplessMixEngine.ts";

describe("EOS Sovereign Gapless DJ Automix & 3-Band Crossfader Suite (SPEC-017)", () => {
  const engine = new EosGaplessMixEngine();

  describe("Suite 1: Camelot DJ Harmonic Transition Cost", () => {
    it("returns zero cost for identical keys", () => {
      const res = engine.computeHarmonicCost("8A", "8A");
      assert.equal(res.cost, 0.0);
      assert.equal(res.type, "IDENTICAL_TONALITY");
    });

    it("returns low cost for relative major/minor shifts", () => {
      const res = engine.computeHarmonicCost("8A", "8B");
      assert.equal(res.cost, 0.15);
      assert.equal(res.type, "RELATIVE_MODE_SHIFT");
    });

    it("detects harmonic energy jumps (+1 and -1 on Camelot wheel)", () => {
      const up = engine.computeHarmonicCost("8A", "9A");
      assert.equal(up.cost, 0.1);
      assert.equal(up.type, "HARMONIC_ENERGY_UP");

      const down = engine.computeHarmonicCost("8A", "7A");
      assert.equal(down.cost, 0.1);
      assert.equal(down.type, "HARMONIC_ENERGY_DOWN");
    });

    it("penalizes dissonant harmonic key jumps", () => {
      const clash = engine.computeHarmonicCost("8A", "2A");
      assert.equal(clash.cost, 0.85);
      assert.equal(clash.type, "DISSONANT_BREAKDOWN");
    });
  });

  describe("Suite 2: DJ Automix Transition Planning", () => {
    it("synthesizes equal-power transition plan for harmonic match", () => {
      const trackA = { trackId: "track-1", title: "Midnight City", bpm: 126, camelotKey: "8A", sampleRateHz: 44100 };
      const trackB = { trackId: "track-2", title: "Sunset Lover", bpm: 128, camelotKey: "9A", sampleRateHz: 44100 };

      const plan = engine.planTransition(trackA, trackB, 4.0);
      assert.equal(plan.durationSeconds, 4.0);
      assert.equal(plan.durationSamples, 176400);
      assert.ok(plan.tempoDeltaPercent < 2.0);
      assert.equal(plan.harmonicTransitionCost, 0.1);
      assert.ok(plan.recommendedStrategy.includes("Equal-power"));
      assert.equal(plan.sha256Proof.length, 64);
    });
  });

  describe("Suite 3: 3-Band Staggered Crossfade Audio Buffer Processing", () => {
    it("executes crossfade preserving energy with zero bass clash and true peak ceiling", () => {
      const N = 44100; // 1 second crossfade at 44.1kHz
      const bufA = new Float32Array(N);
      const bufB = new Float32Array(N);

      // Synthesize audio signals
      for (let i = 0; i < N; i++) {
        bufA[i] = Math.sin((i * 100 * 2 * Math.PI) / 44100) * 0.8; // 100 Hz sub-bass
        bufB[i] = Math.sin((i * 150 * 2 * Math.PI) / 44100) * 0.8; // 150 Hz sub-bass
      }

      const res = engine.executeCrossfade(bufA, bufB, 44100);
      assert.equal(res.totalFrames, N);
      assert.equal(res.bassOverlapDurationMs, 0); // Staggering eliminates clash
      assert.ok(res.maxTruePeakDb <= 0.0);
      assert.equal(res.energyPreserved, true);
      assert.equal(res.outputBuffer.length, N);
    });
  });
});
