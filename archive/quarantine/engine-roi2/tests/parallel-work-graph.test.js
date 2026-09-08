import test from 'node:test';
import assert from 'node:assert/strict';
import { ParallelWorkGraphEngine } from '../scripts/engine/parallel-work-graph-engine.js';

// ====================================================
// PARALLEL WORK GRAPH ENGINE TESTS
// ====================================================

test('ParallelWorkGraphEngine dispatches independent tasks in parallel and gates dependent tasks', () => {
  const graph = new ParallelWorkGraphEngine();

  // 3 Independent Tasks (Research, Design, A11y)
  graph.addNode({ taskId: 'TASK-USER-RESEARCH', name: 'User Research Discovery' });
  graph.addNode({ taskId: 'TASK-TECH-RESEARCH', name: 'Tool & MCP Discovery' });
  graph.addNode({ taskId: 'TASK-DESIGN-UX', name: 'UX Information Architecture' });

  // 1 Dependent Task (Synthesis)
  graph.addNode({
    taskId: 'TASK-SYNTHESIS',
    name: 'Synthesis & Specification',
    dependencies: ['TASK-USER-RESEARCH', 'TASK-TECH-RESEARCH', 'TASK-DESIGN-UX']
  });

  // Check initial parallel readiness
  const initialReady = graph.getReadyParallelTasks();
  assert.equal(initialReady.length, 3);
  assert.equal(graph.nodes.get('TASK-SYNTHESIS').status, 'WAITING');

  // Complete first 2 independent tasks
  graph.updateNodeStatus('TASK-USER-RESEARCH', 'SUCCEEDED', 'Evidence recorded');
  graph.updateNodeStatus('TASK-TECH-RESEARCH', 'SUCCEEDED', 'Tool chosen');

  // Synthesis must STILL be WAITING
  assert.equal(graph.nodes.get('TASK-SYNTHESIS').status, 'WAITING');

  // Complete 3rd task
  graph.updateNodeStatus('TASK-DESIGN-UX', 'SUCCEEDED', 'Wireframes ready');

  // Now Synthesis must transition to READY
  const updatedReady = graph.getReadyParallelTasks();
  assert.equal(updatedReady.length, 1);
  assert.equal(updatedReady[0].taskId, 'TASK-SYNTHESIS');
});

test('ParallelWorkGraphEngine marks dependent nodes as BLOCKED when upstream dependency fails', () => {
  const graph = new ParallelWorkGraphEngine();

  graph.addNode({ taskId: 'TASK-A', name: 'Base Setup' });
  graph.addNode({ taskId: 'TASK-B', name: 'Downstream Build', dependencies: ['TASK-A'] });

  graph.updateNodeStatus('TASK-A', 'FAILED', 'Fatal compile error');
  assert.equal(graph.nodes.get('TASK-B').status, 'BLOCKED');
});
