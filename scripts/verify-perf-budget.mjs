import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  EosPerfBudgetGate,
  DEFAULT_PERF_BUDGETS,
  createBaseline,
  evaluateDrift,
  loadBaseline,
  renderPerfSummaryMarkdown,
  writeBaseline
} from "../src/core/eosPerfBudgetGate.ts";

const root = process.cwd();
const argv = process.argv.slice(2);
const flagValue = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

const baselinePath = path.resolve(root, flagValue("--baseline") ?? "docs/evidence/perf-baseline.json");
// Auto-publish to the GitHub Actions job summary when running inside CI (no extra invocation).
const summaryPath = flagValue("--summary-file") ?? process.env.GITHUB_STEP_SUMMARY;
const updateBaseline = argv.includes("--update-baseline");
const emitJson = argv.includes("--json");
const tolerancePct = Number.parseFloat(flagValue("--tolerance") ?? "25");
// Machine-readable mode: suppress all human output so stdout is valid JSON for jq/CI consumers.
const log = emitJson ? () => {} : console.log;

log("==================================================================");
log(" EOS SYSTEM — CRITICAL-PATH PERFORMANCE BUDGET GATE (FAIL-CLOSED) ");
log("==================================================================");

const gate = new EosPerfBudgetGate(root, { iterations: 5, warmupIterations: 1 });
const report = gate.runDefaultSuite(DEFAULT_PERF_BUDGETS);

const previousBaseline = loadBaseline(baselinePath);
const drift = evaluateDrift(report, previousBaseline);
const driftById = new Map(drift.map((entry) => [entry.id, entry]));

for (const sample of report.samples) {
  const headroom = Number.isFinite(sample.headroomRatio) ? `${sample.headroomRatio.toFixed(1)}x` : "n/a";
  const entry = driftById.get(sample.id);
  const driftLabel =
    entry && entry.deltaPct !== null ? `${entry.deltaPct > 0 ? "+" : ""}${entry.deltaPct.toFixed(1)}%` : "n/a";
  log(
    `[${sample.status}] ${sample.id.padEnd(22)} median ${sample.medianMs.toFixed(1).padStart(7)} ms | ` +
      `p95 ${sample.p95Ms.toFixed(1).padStart(7)} ms | budget ${sample.budgetMs.toFixed(1).padStart(7)} ms | ` +
      `headroom ${headroom.padStart(6)} | drift ${driftLabel.padStart(7)}`
  );
}

const evidencePath = EosPerfBudgetGate.writeEvidence(
  report,
  path.join(root, "docs", "evidence", "PERF-BUDGET.json")
);

if (updateBaseline) {
  const written = writeBaseline(createBaseline(report, Number.isFinite(tolerancePct) ? tolerancePct : 25), baselinePath);
  log(`[INFO] Drift baseline updated: ${path.relative(root, written)}`);
} else if (!previousBaseline) {
  log("[INFO] No drift baseline found; drift reporting disabled until --update-baseline is run.");
}

const regressions = drift.filter((entry) => entry.status === "REGRESSION");
if (regressions.length > 0) {
  log(
    `[WARN] Performance drift above tolerance (telemetry only): ${regressions
      .map((entry) => `${entry.id} ${entry.deltaPct > 0 ? "+" : ""}${entry.deltaPct.toFixed(1)}%`)
      .join(", ")}`
  );
}

if (summaryPath) {
  // Evidence publication must work even in --json mode: the JSON mode only silences stdout.
  const markdownPath = path.resolve(root, summaryPath);
  fs.appendFileSync(markdownPath, renderPerfSummaryMarkdown(report, drift), "utf8");
  log(`[INFO] Markdown summary appended: ${path.relative(root, markdownPath)}`);
}

log(`[INFO] Budget factor: ${report.factor}x | evidence: ${path.relative(root, evidencePath)}`);
log(`[INFO] Merkle receipt: ${report.sha256MerkleReceipt}`);

assert.equal(
  report.passed,
  true,
  `Performance budget breached: ${report.breaches.join(", ")} (see docs/evidence/PERF-BUDGET.json)`
);

if (emitJson) {
  console.log(JSON.stringify({ report, drift }, null, 2));
}

log("------------------------------------------------------------------");
log(" CRITICAL-PATH PERFORMANCE BUDGETS: ALL WITHIN BUDGET (0 BREACHES) ");
log("==================================================================");
