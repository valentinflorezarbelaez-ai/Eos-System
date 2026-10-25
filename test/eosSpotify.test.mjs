import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosSpotifyCodex } from "../src/core/eosSpotifyCodex.ts";

describe("EOS Sovereign Spotify Codex & Universal Project Engine Suite", () => {
  const codex = new EosSpotifyCodex(process.cwd());

  describe("Suite 1: ITU-R BS.1770 Loudness Normalization (BDD-037)", () => {
    it("computes exact gain adjustment and peak limiter for loud audio", () => {
      // Audio mastered at -10 LUFS with +0.5 dBTP peak
      const profile = codex.computeLoudnessProfile(-10.0, 0.5);
      assert.equal(profile.targetLufs, -14.0);
      assert.equal(profile.gainAdjustmentDb, -4.0);
      // After -4dB gain, peak becomes 0.5 - 4.0 = -3.5 dBTP, below -1.0 ceiling
      assert.equal(profile.limiterRequired, false);
      assert.equal(profile.recommendedCodec, "AAC_256");
    });

    it("requires peak limiter when boost exceeds -1 dBTP ceiling", () => {
      // Quiet audio mastered at -20 LUFS with -3 dBTP peak
      const profile = codex.computeLoudnessProfile(-20.0, -3.0);
      assert.equal(profile.targetLufs, -14.0);
      assert.equal(profile.gainAdjustmentDb, 6.0);
      // After +6dB gain, projected peak is -3 + 6 = +3.0 dBTP, which exceeds -1.0 ceiling!
      assert.equal(profile.limiterRequired, true);
      assert.equal(profile.recommendedCodec, "FLAC_LOSSLESS");
    });
  });

  describe("Suite 2: 8D Acoustic Vector Similarity & Camelot Wheel (BDD-037)", () => {
    const seedTrack = {
      tempo: 128,
      energy: 0.85,
      danceability: 0.78,
      valence: 0.65,
      acousticness: 0.05,
      instrumentalness: 0.2,
      liveness: 0.15,
      speechiness: 0.08
    };

    it("calculates exact cosine similarity = 1.0 for identical acoustic vectors", () => {
      const sim = codex.calculateCosineSimilarity(seedTrack, seedTrack);
      assert.equal(sim, 1.0);
    });

    it("evaluates Camelot harmonic transitions correctly", () => {
      // Key 0 (C), Mode 1 (Major) -> 8B
      // Key 7 (G), Mode 1 (Major) -> 9B (Energy Boost: +1 Camelot)
      const transitionBoost = codex.evaluateHarmonicTransition(0, 1, 7, 1);
      assert.equal(transitionBoost.compatible, true);
      assert.equal(transitionBoost.camelotA, "8B");
      assert.equal(transitionBoost.camelotB, "9B");
      assert.equal(transitionBoost.harmonicRelationship, "ENERGY_BOOST");

      // Key 0 (C), Mode 1 (Major) -> 8B vs Key 9 (A), Mode 0 (Minor) -> 8A (Mode Shift)
      const transitionMode = codex.evaluateHarmonicTransition(0, 1, 9, 0);
      assert.equal(transitionMode.compatible, true);
      assert.equal(transitionMode.camelotA, "8B");
      assert.equal(transitionMode.camelotB, "8A");
      assert.equal(transitionMode.harmonicRelationship, "MODE_SHIFT");

      // Clashing keys
      const clashing = codex.evaluateHarmonicTransition(0, 1, 6, 1); // F# Major (2B vs 8B)
      assert.equal(clashing.compatible, false);
      assert.equal(clashing.harmonicRelationship, "DISSONANT");
    });
  });

  describe("Suite 3: Multi-Track Recommendation Flow Ranking", () => {
    const seed = {
      id: "track-0",
      title: "Pleroma Ascendance",
      artist: "Aberamentho",
      key: 0, // C
      mode: 1, // Major (8B)
      features: {
        tempo: 128,
        energy: 0.8,
        danceability: 0.75,
        valence: 0.7,
        acousticness: 0.1,
        instrumentalness: 0.5,
        liveness: 0.1,
        speechiness: 0.05
      }
    };

    const candidates = [
      {
        id: "track-1",
        title: "Harmonic Elevation (Matching Key + Boost)",
        artist: "Aberamentho",
        key: 7, // G Major (9B)
        mode: 1,
        features: {
          tempo: 128,
          energy: 0.82,
          danceability: 0.76,
          valence: 0.72,
          acousticness: 0.12,
          instrumentalness: 0.48,
          liveness: 0.1,
          speechiness: 0.05
        }
      },
      {
        id: "track-2",
        title: "Dissonant Low Energy Ambient",
        artist: "Unknown",
        key: 6, // F# Major (2B - Dissonant)
        mode: 1,
        features: {
          tempo: 60,
          energy: 0.1,
          danceability: 0.1,
          valence: 0.1,
          acousticness: 0.95,
          instrumentalness: 0.9,
          liveness: 0.05,
          speechiness: 0.02
        }
      }
    ];

    it("ranks harmonic energy-boost track higher than dissonant track", () => {
      const ranked = codex.rankRecommendations(seed, candidates, 2);
      assert.equal(ranked.length, 2);
      assert.equal(ranked[0].id, "track-1");
      assert.ok(ranked[0].matchScore > ranked[1].matchScore);
      assert.equal(ranked[0].harmonic.compatible, true);
    });
  });

  describe("Suite 4: Universal Project Auditor & Backstage RFC-42 (BDD-036)", () => {
    it("audits active EOS System repository and certifies Backstage Golden Path", () => {
      const report = codex.auditUniversalProject(process.cwd());
      assert.equal(report.isBackstageCompliant, true);
      assert.ok(report.goldenPathScore >= 80, `Expected score >= 80, got ${report.goldenPathScore}`);
      assert.equal(report.catalogInfoExists, true);
      assert.ok(report.catalogInfoDetails);
      assert.equal(report.catalogInfoDetails.kind, "Component");
      assert.ok(typeof report.sha256Proof === "string" && report.sha256Proof.length === 64);
    });
  });

  describe("Suite 5: Spotify Web API Rate-Limit Resilience", () => {
    it("respects Retry-After header deterministically", () => {
      const backoff = codex.calculateBackoffMs(1, 200, 8000, 5);
      assert.equal(backoff, 5000); // Exactly 5 seconds
    });

    it("bounds exponential backoff with full jitter", () => {
      const backoff = codex.calculateBackoffMs(3, 100, 1000);
      assert.ok(backoff >= 0 && backoff <= 800);
    });
  });
});
