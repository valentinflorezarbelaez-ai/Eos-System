import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaywrightMcpBenchmarkHarness } from '../scripts/engine/playwright-mcp-benchmark.js';

// ====================================================
// PLAYWRIGHT MCP SANDBOX BENCHMARK TESTS
// ====================================================

const harness = new PlaywrightMcpBenchmarkHarness();

test('PlaywrightMcpBenchmarkHarness validates navigation, snapshot, a11y tree and security boundary', () => {
  const benchmarkResult = harness.runFullBenchmark();

  assert.equal(benchmarkResult.verdict, 'SANDBOX_BENCHMARK_VERIFIED');
  assert.equal(benchmarkResult.results.navigationAllowed, true);
  assert.equal(benchmarkResult.results.navigationBoundaryEnforced, true);
  assert.equal(benchmarkResult.results.a11yTreeExtracted, true);
  assert.equal(benchmarkResult.results.snapshotGenerated, true);
  assert.equal(benchmarkResult.results.timeoutGuardEffective, true);
});
