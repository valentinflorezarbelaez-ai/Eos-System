import assert from "node:assert/strict";
import path from "node:path";

import {
  EosPerfBudgetGate,
  DEFAULT_PERF_BUDGETS
} from "../src/core/eosPerfBudgetGate.ts";

const root = process.cwd();

console.log("==================================================================");
console.log(" EOS SYSTEM — CRITICAL-PATH PERFORMANCE BUDGET GATE (FAIL-CLOSED) ");
console.log("==================================================================");

const gate = new EosPerfBudgetGate(root, { iterations: 5, warmupIterations: 1 });
const report = await gate.runDefaultSuite(DEFAULT_PERF_BUDGETS);

for (const sample of report.samples) {
  const headroom = Number.isFinite(sample.headroomRatio) ? `${sample.headroomRatio.toFixed(1)}x` : "n/a";
  console.log(
    `[${sample.status}] ${sample.id.padEnd(22)} median ${sample.medianMs.toFixed(1).padStart(7)} ms | ` +
      `p95 ${sample.p95Ms.toFixed(1).padStart(7)} ms | budget ${sample.budgetMs.toFixed(1).padStart(7)} ms | ` +
      `headroom ${headroom}`
  );
}

const evidencePath = EosPerfBudgetGate.writeEvidence(
  report,
  path.join(root, "docs", "evidence", "PERF-BUDGET.json")
);

console.log(`[INFO] Budget factor: ${report.factor}x | evidence: ${path.relative(root, evidencePath)}`);
console.log(`[INFO] Merkle receipt: ${report.sha256MerkleReceipt}`);

assert.equal(
  report.passed,
  true,
  `Performance budget breached: ${report.breaches.join(", ")} (see docs/evidence/PERF-BUDGET.json)`
);

console.log("------------------------------------------------------------------");
console.log(" CRITICAL-PATH PERFORMANCE BUDGETS: ALL WITHIN BUDGET (0 BREACHES) ");
console.log("==================================================================");
