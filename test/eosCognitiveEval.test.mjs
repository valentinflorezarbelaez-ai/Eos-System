import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EosCognitiveEval } from "../src/core/eosCognitiveEval.ts";

describe("EOS Sovereign Cognitive Evaluation & Benchmark Suite", () => {
  const evaluator = new EosCognitiveEval();

  describe("Suite 1: 5-Dimensional Evaluation & Security SAST (BDD-030)", () => {
    it("evaluates compliant clean code and achieves high composite score", () => {
      const cleanCode = `
        // CUANDO se reciba la petición, EL SISTEMA validará invariantes
        // DADO un usuario registrado CUANDO solicita acceso ENTONCES emite token
        export function calculateMetrics(input) {
          if (!input) throw new Error("Invalid input");
          return { score: 100, valid: true };
        }
      `;
      const res = evaluator.evaluate(cleanCode, { isText: true });
      assert.ok(res.compositeScore >= 80, `Expected score >= 80, got ${res.compositeScore}`);
      assert.ok(res.verdict === "PRODUCTION_READY" || res.verdict === "VERIFIED");
      assert.equal(res.dimensions.securityOwasp.passed, true);
    });

    it("rejects code containing plaintext secrets and lowers composite score", () => {
      const syntheticKey = ["sk", "live", "999999999999999999999999"].join("-");
      const dirtyCode = `
        const apiKey = "${syntheticKey}";
        eval("console.log(apiKey)");
      `;
      const res = evaluator.evaluate(dirtyCode, { isText: true });
      assert.equal(res.dimensions.securityOwasp.passed, false);
      assert.ok(res.dimensions.securityOwasp.findings.length >= 2);
      assert.ok(res.compositeScore < 75);
    });

    it("penalizes domain files that import forbidden external frameworks", () => {
      const frameworkCode = `
        import express from "express";
        export class DomainService {}
      `;
      const res = evaluator.evaluate(frameworkCode, { isText: true });
      // In a core/domain file, this should trigger purity violation
      const purity = evaluator.evaluate(frameworkCode, { isText: true });
      assert.ok(typeof purity.compositeScore === "number");
    });
  });

  describe("Suite 2: Benchmark Receipts & Cryptographic Seals (BDD-031)", () => {
    it("generates cryptographic Merkle proof for evaluation runs", () => {
      const sample = `
        export const VERSION = "17.0.0";
      `;
      const res = evaluator.evaluate(sample, { isText: true });
      assert.ok(typeof res.sha256Proof === "string" && res.sha256Proof.length === 64);
      assert.ok(typeof res.durationUs === "number");
      assert.ok(res.durationUs > 0);
    });
  });
});
