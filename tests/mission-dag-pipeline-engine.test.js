import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MissionDagPipelineEngine } from '../src/core/orchestration/mission-dag-pipeline-engine.js';

describe('MissionDagPipelineEngine', () => {
  it('buildDag: should handle empty or invalid tasks array', () => {
    const engine = new MissionDagPipelineEngine();
    const result1 = engine.buildDag([]);
    assert.deepEqual(result1, { waves: [], totalTasks: 0, criticalPath: [] });

    const result2 = engine.buildDag(null);
    assert.deepEqual(result2, { waves: [], totalTasks: 0, criticalPath: [] });
  });

  it('buildDag: should validate tasks', () => {
    const engine = new MissionDagPipelineEngine();

    // Missing task_id
    assert.throws(() => {
      engine.buildDag([{ dependencies: [] }]);
    }, /DAG_VALIDATION_ERROR: All tasks must have a unique task_id/);

    // Duplicate task_id
    assert.throws(() => {
      engine.buildDag([
        { task_id: 'A' },
        { task_id: 'A' }
      ]);
    }, /DAG_VALIDATION_ERROR: Duplicate task_id detected: A/);

    // Non-existent dependency
    assert.throws(() => {
      engine.buildDag([
        { task_id: 'A', dependencies: ['B'] }
      ]);
    }, /DAG_VALIDATION_ERROR: Task A depends on non-existent task B/);
  });

  it('buildDag: should build DAG for independent tasks', () => {
    const engine = new MissionDagPipelineEngine();
    const tasks = [
      { task_id: 'A' },
      { task_id: 'B' },
      { task_id: 'C' }
    ];

    const result = engine.buildDag(tasks);
    assert.equal(result.totalTasks, 3);
    assert.equal(result.waveCount, 1);
    assert.deepEqual(result.waves[0].sort(), ['A', 'B', 'C'].sort());
  });

  it('buildDag: should build DAG for linear dependency chain', () => {
    const engine = new MissionDagPipelineEngine();
    const tasks = [
      { task_id: 'C', dependencies: ['B'] },
      { task_id: 'A' },
      { task_id: 'B', dependencies: ['A'] }
    ];

    const result = engine.buildDag(tasks);
    assert.equal(result.totalTasks, 3);
    assert.equal(result.waveCount, 3);
    assert.deepEqual(result.waves, [['A'], ['B'], ['C']]);
    assert.deepEqual(result.criticalPath, ['A', 'B', 'C']);
  });

  it('buildDag: should build DAG for diamond dependency graph', () => {
    const engine = new MissionDagPipelineEngine();
    const tasks = [
      { task_id: 'A' },
      { task_id: 'B', dependencies: ['A'] },
      { task_id: 'C', dependencies: ['A'] },
      { task_id: 'D', dependencies: ['B', 'C'] }
    ];

    const result = engine.buildDag(tasks);
    assert.equal(result.totalTasks, 4);
    assert.equal(result.waveCount, 3);
    assert.deepEqual(result.waves[0], ['A']);
    assert.deepEqual(result.waves[1].sort(), ['B', 'C'].sort());
    assert.deepEqual(result.waves[2], ['D']);
  });

  it('buildDag: should detect circular dependencies', () => {
    const engine = new MissionDagPipelineEngine();
    const tasks = [
      { task_id: 'A', dependencies: ['B'] },
      { task_id: 'B', dependencies: ['A'] }
    ];

    assert.throws(() => {
      engine.buildDag(tasks);
    }, /DAG_CYCLE_DETECTED: Circular dependency detected in task graph/);
  });
});
