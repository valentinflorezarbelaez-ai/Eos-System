/**
 * EOS SYSTEM — PERFORMANCE BUDGET GATE (Layer 0)
 * Governed by SPEC-032 (Big Tech Hyper-Optimization) & CHANGE-036
 *
 * Performance regressions are prevented by *budgets enforced in CI*, not by good intentions.
 * This gate measures the critical control-plane operations (repository audit, polyglot
 * fingerprint, source enumeration and the turbo verification pipeline) with a warm-up pass and
 * nearest-rank percentiles, then fails closed when the median exceeds the declared budget.
 *
 * Zero external runtime dependencies.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { EosUniversalProjectAdapter } from "./eosUniversalProjectAdapter.ts";
import { runTurboPipeline, collectSourceFiles } from "./eosTurboEngine.ts";

export interface PerfBudgetTarget {
  readonly id: string;
  readonly description: string;
  readonly budgetMs: number;
}

export interface PerfBudgetSample {
  readonly id: string;
  readonly description: string;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly iterations: number;
  readonly budgetMs: number;
  readonly headroomRatio: number;
  readonly status: "PASS" | "BREACH";
}

export interface PerfBudgetReport {
  readonly passed: boolean;
  readonly factor: number;
  readonly samples: readonly PerfBudgetSample[];
  readonly breaches: readonly string[];
  readonly totalDurationMs: number;
  readonly sha256MerkleReceipt: string;
  readonly timestamp: string;
}

export interface PerfBudgetOptions {
  readonly iterations?: number;
  readonly warmupIterations?: number;
  readonly factor?: number;
}

/** Critical-path budgets for the EOS control plane (measured on 4 vCPU, ~4x headroom). */
export const DEFAULT_PERF_BUDGETS: readonly PerfBudgetTarget[] = [
  {
    id: "repository_audit",
    description: "Universal polyglot audit (5 pillars + Merkle receipt)",
    budgetMs: 400
  },
  {
    id: "polyglot_fingerprint",
    description: "Polyglot stack fingerprint (language, PM, tests, container, CI)",
    budgetMs: 150
  },
  {
    id: "source_enumeration",
    description: "Git-visible source enumeration (SAST surface)",
    budgetMs: 150
  },
  {
    id: "turbo_pipeline",
    description: "Whole-project turbo verification (SAST + architecture + SBOM + assets)",
    budgetMs: 1200
  }
];

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/** Nearest-rank percentile (no interpolation, fully deterministic for small sample sets). */
export function percentile(durations: readonly number[], rank: number): number {
  if (durations.length === 0) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, rank));
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(clamped * sorted.length) - 1));
  return round3(sorted[index]);
}

export function median(durations: readonly number[]): number {
  return percentile(durations, 0.5);
}

/**
 * Pure budget evaluation: the whole pass/fail decision is a function of the measurements.
 */
export function evaluateSample(
  target: PerfBudgetTarget,
  durations: readonly number[],
  factor: number = 1
): PerfBudgetSample {
  const budgetMs = round3(target.budgetMs * factor);
  const medianMs = median(durations);
  const status: PerfBudgetSample["status"] = medianMs > budgetMs ? "BREACH" : "PASS";
  return {
    id: target.id,
    description: target.description,
    medianMs,
    p95Ms: percentile(durations, 0.95),
    minMs: durations.length > 0 ? round3(Math.min(...durations)) : 0,
    maxMs: durations.length > 0 ? round3(Math.max(...durations)) : 0,
    iterations: durations.length,
    budgetMs,
    headroomRatio: medianMs > 0 ? round3(budgetMs / medianMs) : Number.POSITIVE_INFINITY,
    status
  };
}

export interface PerfBaseline {
  readonly version: number;
  readonly tolerancePct: number;
  readonly mediansMs: Readonly<Record<string, number>>;
  readonly capturedAt: string;
}

export interface PerfDriftEntry {
  readonly id: string;
  readonly baselineMs: number | null;
  readonly currentMs: number;
  readonly deltaPct: number | null;
  readonly status: "OK" | "REGRESSION" | "IMPROVEMENT" | "NO_BASELINE";
}

const BASELINE_VERSION = 1;
const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Captures the current medians as the drift baseline (PerfCI-style trend tracking).
 */
export function createBaseline(report: PerfBudgetReport, tolerancePct: number = 25): PerfBaseline {
  const mediansMs: Record<string, number> = {};
  for (const sample of report.samples) {
    mediansMs[sample.id] = sample.medianMs;
  }
  return {
    version: BASELINE_VERSION,
    tolerancePct,
    mediansMs,
    capturedAt: new Date().toISOString()
  };
}

/**
 * Pure drift evaluation against a baseline. Drift is *telemetry*, never the gate criterion:
 * the gate remains the absolute budget, so shared CI runners cannot fail a build on noise.
 */
export function evaluateDrift(
  report: PerfBudgetReport,
  baseline: PerfBaseline | null,
  tolerancePct: number = baseline?.tolerancePct ?? 25
): PerfDriftEntry[] {
  return report.samples.map((sample) => {
    const baselineMs = baseline?.mediansMs[sample.id];
    if (baselineMs === undefined || baselineMs <= 0) {
      return { id: sample.id, baselineMs: null, currentMs: sample.medianMs, deltaPct: null, status: "NO_BASELINE" };
    }
    const deltaPct = round1(((sample.medianMs - baselineMs) / baselineMs) * 100);
    let status: PerfDriftEntry["status"] = "OK";
    if (deltaPct > tolerancePct) status = "REGRESSION";
    else if (deltaPct < -tolerancePct) status = "IMPROVEMENT";
    return { id: sample.id, baselineMs, currentMs: sample.medianMs, deltaPct, status };
  });
}

export function loadBaseline(filePath: string): PerfBaseline | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as PerfBaseline;
    if (!parsed || typeof parsed !== "object" || !parsed.mediansMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBaseline(baseline: PerfBaseline, targetPath: string): string {
  const directory = path.dirname(targetPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(targetPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return targetPath;
}

/**
 * Renders the human-readable table published to `$GITHUB_STEP_SUMMARY` and the CLI.
 */
export function renderPerfSummaryMarkdown(report: PerfBudgetReport, drift: readonly PerfDriftEntry[] = []): string {
  const driftById = new Map(drift.map((entry) => [entry.id, entry]));
  const lines = [
    "## EOS Critical-Path Performance Budgets",
    "",
    `Factor: \`${report.factor}x\` · Result: **${report.passed ? "PASS" : "BREACH"}** · Receipt: \`${report.sha256MerkleReceipt.slice(0, 16)}…\``,
    "",
    "| Target | Median | p95 | Budget | Headroom | Drift | Status |",
    "|---|---:|---:|---:|---:|---:|---|"
  ];
  for (const sample of report.samples) {
    const entry = driftById.get(sample.id);
    const driftLabel =
      entry && entry.deltaPct !== null ? `${entry.deltaPct > 0 ? "+" : ""}${entry.deltaPct.toFixed(1)}%` : "n/a";
    const headroom = Number.isFinite(sample.headroomRatio) ? `${sample.headroomRatio.toFixed(1)}x` : "n/a";
    lines.push(
      `| \`${sample.id}\` | ${sample.medianMs.toFixed(1)} ms | ${sample.p95Ms.toFixed(1)} ms | ` +
        `${sample.budgetMs.toFixed(1)} ms | ${headroom} | ${driftLabel} | ${sample.status} |`
    );
  }
  return `${lines.join("\n")}\n`;
}

export class EosPerfBudgetGate {
  private readonly rootDir: string;
  private readonly iterations: number;
  private readonly warmupIterations: number;
  private readonly factor: number;

  constructor(rootDir: string = process.cwd(), options: PerfBudgetOptions = {}) {
    this.rootDir = path.resolve(rootDir);
    this.iterations = Math.max(1, options.iterations ?? 5);
    this.warmupIterations = Math.max(0, options.warmupIterations ?? 1);
    const envFactor = Number.parseFloat(process.env.EOS_PERF_BUDGET_FACTOR ?? "1");
    this.factor = options.factor ?? (Number.isFinite(envFactor) && envFactor > 0 ? envFactor : 1);
  }

  /**
   * Measures a synchronous operation: warm-up passes (JIT + page cache) then N timed passes.
   * The median is the gate criterion; p95 is reported for observability.
   */
  public measure(target: PerfBudgetTarget, operation: () => unknown): PerfBudgetSample {
    for (let i = 0; i < this.warmupIterations; i += 1) {
      operation();
    }
    const durations: number[] = [];
    for (let i = 0; i < this.iterations; i += 1) {
      const start = process.hrtime.bigint();
      operation();
      durations.push(round3(Number(process.hrtime.bigint() - start) / 1_000_000));
    }
    return evaluateSample(target, durations, this.factor);
  }

  /**
   * Runs the default control-plane suite and seals a deterministic Merkle receipt.
   */
  public runDefaultSuite(budgets: readonly PerfBudgetTarget[] = DEFAULT_PERF_BUDGETS): PerfBudgetReport {
    const start = process.hrtime.bigint();
    const adapter = new EosUniversalProjectAdapter(this.rootDir);
    const operations: Readonly<Record<string, () => unknown>> = {
      repository_audit: () => adapter.audit(),
      polyglot_fingerprint: () => adapter.fingerprint(),
      source_enumeration: () => collectSourceFiles(this.rootDir, this.rootDir),
      turbo_pipeline: () => runTurboPipeline(this.rootDir)
    };

    const samples: PerfBudgetSample[] = [];
    for (const budget of budgets) {
      const operation = operations[budget.id];
      if (!operation) {
        throw new Error(`No measurement wired for performance budget target: ${budget.id}`);
      }
      samples.push(this.measure(budget, operation));
    }

    const breaches = samples.filter((sample) => sample.status === "BREACH").map((sample) => sample.id);
    const payload = JSON.stringify({
      factor: this.factor,
      iterations: this.iterations,
      samples: samples.map((sample) => ({
        id: sample.id,
        medianMs: sample.medianMs,
        p95Ms: sample.p95Ms,
        budgetMs: sample.budgetMs,
        status: sample.status
      })),
      breaches
    });
    const totalDurationMs = round3(Number(process.hrtime.bigint() - start) / 1_000_000);

    return {
      passed: breaches.length === 0,
      factor: this.factor,
      samples,
      breaches,
      totalDurationMs,
      sha256MerkleReceipt: crypto.createHash("sha256").update(payload).digest("hex"),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Persists the sealed report as evidence (auditable, machine-readable).
   */
  public static writeEvidence(report: PerfBudgetReport, targetPath: string): string {
    const directory = path.dirname(targetPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(targetPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return targetPath;
  }
}

