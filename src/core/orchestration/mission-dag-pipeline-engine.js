/**
 * @module MissionDagPipelineEngine
 * @description High-throughput, deterministic Directed Acyclic Graph (DAG) pipeline orchestrator.
 * Computes topological waves using Kahn's algorithm, detects circular dependencies,
 * and executes independent tasks in parallel without race conditions.
 */

import { createHash, randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class MissionDagPipelineEngine {
  constructor(options = {}) {
    this.pipelineHistory = [];
  }

  /**
   * Builds and validates a DAG from task definitions and computes topological execution waves
   * @param {Array<object>} tasks Array of { task_id, dependencies: Array<string>, [duration_estimate_ms] }
   * @returns {object} { waves: Array<Array<string>>, totalTasks: number, criticalPath: Array<string> }
   */
  buildDag(tasks = []) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { waves: [], totalTasks: 0, criticalPath: [] };
    }

    const taskMap = new Map();
    const inDegree = new Map();
    const adjList = new Map();

    for (const t of tasks) {
      if (!t.task_id) throw new Error('DAG_VALIDATION_ERROR: All tasks must have a unique task_id');
      if (taskMap.has(t.task_id)) throw new Error(`DAG_VALIDATION_ERROR: Duplicate task_id detected: ${t.task_id}`);
      taskMap.set(t.task_id, t);
      inDegree.set(t.task_id, 0);
      adjList.set(t.task_id, []);
    }

    // Build dependency graph
    for (const t of tasks) {
      const deps = t.dependencies || [];
      for (const dep of deps) {
        if (!taskMap.has(dep)) {
          throw new Error(`DAG_VALIDATION_ERROR: Task ${t.task_id} depends on non-existent task ${dep}`);
        }
        adjList.get(dep).push(t.task_id);
        inDegree.set(t.task_id, inDegree.get(t.task_id) + 1);
      }
    }

    // Kahn's algorithm with wave grouping
    const waves = [];
    let currentWave = [];

    for (const [taskId, deg] of inDegree.entries()) {
      if (deg === 0) currentWave.push(taskId);
    }

    let processedCount = 0;

    while (currentWave.length > 0) {
      waves.push([...currentWave]);
      const nextWave = [];

      for (const u of currentWave) {
        processedCount++;
        for (const v of adjList.get(u)) {
          inDegree.set(v, inDegree.get(v) - 1);
          if (inDegree.get(v) === 0) {
            nextWave.push(v);
          }
        }
      }

      currentWave = nextWave;
    }

    if (processedCount !== tasks.length) {
      throw new Error('DAG_CYCLE_DETECTED: Circular dependency detected in task graph');
    }

    // Compute Critical Path
    const criticalPath = this._computeCriticalPath(tasks, adjList);

    return {
      waves,
      totalTasks: tasks.length,
      waveCount: waves.length,
      criticalPath
    };
  }

  /**
   * Executes DAG wave-by-wave in parallel
   * @param {Array<object>} tasks Task objects
   * @param {Function} executor (task, previousResults) => Promise<any>
   * @returns {Promise<object>} Execution report
   */
  async executePipeline(tasks = [], executor) {
    if (typeof executor !== 'function') {
      throw new Error('PIPELINE_ERROR: Async executor function is required');
    }

    const { waves, criticalPath } = this.buildDag(tasks);
    const taskMap = new Map(tasks.map(t => [t.task_id, t]));
    const results = new Map();
    const startTime = Date.now();
    const waveExecutions = [];

    for (let i = 0; i < waves.length; i++) {
      const waveTaskIds = waves[i];
      const waveStart = Date.now();

      // Execute wave in parallel
      const wavePromises = waveTaskIds.map(async (taskId) => {
        const task = taskMap.get(taskId);
        const depResults = (task.dependencies || []).map(d => results.get(d));
        const res = await executor(task, depResults);
        results.set(taskId, res);
        return { taskId, success: true, result: res };
      });

      const waveResults = await Promise.all(wavePromises);
      waveExecutions.push({
        wave_index: i + 1,
        tasks: waveTaskIds,
        duration_ms: Date.now() - waveStart,
        results: waveResults
      });
    }

    const totalDurationMs = Date.now() - startTime;
    const report = {
      pipeline_id: `DAG-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      total_tasks: tasks.length,
      total_waves: waves.length,
      critical_path: criticalPath,
      total_duration_ms: totalDurationMs,
      wave_executions: waveExecutions,
      completed_at: new Date().toISOString()
    };

    report.sha256 = calculateSha256(JSON.stringify(report));
    this.pipelineHistory.push(report);
    return report;
  }

  _computeCriticalPath(tasks, adjList) {
    // Simple longest path in DAG
    const longestDist = new Map();
    const predecessor = new Map();

    for (const t of tasks) {
      longestDist.set(t.task_id, t.duration_estimate_ms || 1);
    }

    for (const t of tasks) {
      const u = t.task_id;
      const uDist = longestDist.get(u);
      for (const v of adjList.get(u)) {
        const vWeight = (tasks.find(x => x.task_id === v)?.duration_estimate_ms || 1);
        if (uDist + vWeight > (longestDist.get(v) || 0)) {
          longestDist.set(v, uDist + vWeight);
          predecessor.set(v, u);
        }
      }
    }

    // Find end node with max distance
    let maxNode = tasks[0]?.task_id;
    let maxDist = 0;
    for (const [node, dist] of longestDist.entries()) {
      if (dist > maxDist) {
        maxDist = dist;
        maxNode = node;
      }
    }

    const path = [];
    let curr = maxNode;
    while (curr) {
      path.unshift(curr);
      curr = predecessor.get(curr);
    }

    return path;
  }
}
