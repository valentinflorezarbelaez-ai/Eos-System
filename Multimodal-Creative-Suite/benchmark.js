import { MultimodalCreativeEngine } from './src/domain/creativeEngine.js';
import { performance } from 'node:perf_hooks';

async function runBenchmark() {
  const engine = new MultimodalCreativeEngine();
  const iterations = 10000;

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await engine.dispatchMission(`MIS-BENCH-${i}`, 'Benchmark prompt for testing');
  }
  const end = performance.now();

  console.log(`Total time for ${iterations} iterations: ${(end - start).toFixed(2)} ms`);
  console.log(`Average time per mission: ${((end - start) / iterations).toFixed(4)} ms`);
}

runBenchmark().catch(console.error);
