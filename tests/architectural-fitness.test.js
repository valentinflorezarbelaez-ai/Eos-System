import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArchitecturalFitnessEngine, DEFAULT_CLEAN_LAYERS } from '../src/core/ast/architectural-fitness-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('ArchitecturalFitnessEngine (Clean Architecture Fitness Functions)', () => {
  it('should audit EOS codebase with 0 violations, 0 cycles, and 100 score', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: rootDir });
    const report = engine.auditArchitecture(path.join(rootDir, 'src'));

    assert.equal(report.compliant, true, 'Codebase must strictly comply with Clean Architecture dependency rules');
    assert.equal(report.violations_count, 0, 'No layer violations must exist in src/');
    assert.equal(report.cycles_count, 0, 'Module dependency graph must be strictly acyclic (0 circular imports)');
    assert.equal(report.score, 100, 'Score must be 100/100');
    assert.ok(report.total_files > 150, 'Must have evaluated all production source files');
    assert.ok(report.total_dependencies > 400, 'Must have evaluated hundreds of dependency edges');
  });

  it('should detect Dependency Rule violations when an inner layer imports an outer layer', () => {
    const engine = new ArchitecturalFitnessEngine();

    // Mock graph with a synthetic violation: Domain importing CLI
    const mockGraph = new Map([
      ['src/core/contracts/authority-matrix.js', new Set(['src/cli/mission-cli.js'])],
      ['src/cli/mission-cli.js', new Set()]
    ]);

    // Force mock graph onto engine
    engine.astEngine.dependencyGraph = mockGraph;
    engine.classifyCleanLayer = (filePath) => {
      if (filePath.includes('contracts')) return DEFAULT_CLEAN_LAYERS[0]; // domain
      if (filePath.includes('cli')) return DEFAULT_CLEAN_LAYERS[3]; // presentation
      return null;
    };

    // Evaluate violations directly or override buildGraph
    engine.astEngine.buildGraph = () => {}; // no-op

    const report = engine.auditArchitecture();
    assert.equal(report.compliant, false, 'Report must fail compliance');
    assert.equal(report.violations_count, 1, 'Must catch exactly 1 violation');
    assert.match(report.violations[0].reason, /Dependency Rule Violation/);
    assert.equal(report.violations[0].from, 'src/core/contracts/authority-matrix.js');
    assert.equal(report.violations[0].to, 'src/cli/mission-cli.js');
    assert.ok(report.score < 100, 'Score must be penalized');
  });

  it('should detect circular dependencies in module DAG', () => {
    const engine = new ArchitecturalFitnessEngine();

    // Mock graph with a cycle: A -> B -> C -> A
    const cyclicGraph = new Map([
      ['module-a.js', new Set(['module-b.js'])],
      ['module-b.js', new Set(['module-c.js'])],
      ['module-c.js', new Set(['module-a.js'])]
    ]);

    const cycles = engine.findCycles(cyclicGraph);
    assert.ok(cycles.length >= 1, 'Must detect the cycle');
    assert.deepEqual(cycles[0], ['module-a.js', 'module-b.js', 'module-c.js', 'module-a.js']);
  });

  it('should classify layers accurately for both root-relative and src-relative paths', () => {
    const engine = new ArchitecturalFitnessEngine();

    const domain1 = engine.classifyCleanLayer('src/core/contracts/authority-matrix.js');
    const domain2 = engine.classifyCleanLayer('core/doctrine/eos-constitution.js');
    assert.equal(domain1.id, 'domain');
    assert.equal(domain2.id, 'domain');

    const app1 = engine.classifyCleanLayer('src/core/orchestrator.js');
    const app2 = engine.classifyCleanLayer('core/sdd/organic-routing-gate.js');
    assert.equal(app1.id, 'application');
    assert.equal(app2.id, 'application');

    const adapter = engine.classifyCleanLayer('src/core/adapters/gemini-adapter.js');
    assert.equal(adapter.id, 'adapters');

    const pres1 = engine.classifyCleanLayer('src/cli/mission-cli.js');
    const pres2 = engine.classifyCleanLayer('bin/eos.js');
    assert.equal(pres1.id, 'presentation');
    assert.equal(pres2.id, 'presentation');
  });
});
