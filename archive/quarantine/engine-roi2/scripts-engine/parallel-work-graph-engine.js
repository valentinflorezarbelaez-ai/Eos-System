import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ParallelWorkGraphEngine {
  constructor() {
    this.nodes = new Map();
    this.validStatuses = [
      'QUEUED',
      'READY',
      'RUNNING',
      'BLOCKED',
      'WAITING',
      'FAILED',
      'SUCCEEDED',
      'VERIFIED',
      'REJECTED'
    ];
  }

  addNode(task) {
    const {
      taskId,
      name,
      workerId = 'WORKER-DEFAULT',
      dependencies = [],
      inputs = [],
      outputs = [],
      risks = []
    } = task;

    if (!taskId || !name) {
      throw new Error('INVALID_TASK: taskId and name are strictly required');
    }

    const node = {
      taskId,
      name,
      workerId,
      dependencies,
      inputs,
      outputs,
      risks,
      status: dependencies.length === 0 ? 'READY' : 'WAITING',
      statusReason: dependencies.length === 0 ? 'No unresolved dependencies' : `Waiting for dependencies: ${dependencies.join(', ')}`,
      evidence: null
    };

    this.nodes.set(taskId, node);
    return node;
  }

  updateNodeStatus(taskId, status, reason = '', evidence = null) {
    if (!this.nodes.has(taskId)) {
      throw new Error(`TASK_NOT_FOUND: Task ${taskId} does not exist in work graph`);
    }
    if (!this.validStatuses.includes(status)) {
      throw new Error(`INVALID_STATUS: Status ${status} is not a valid work graph state`);
    }

    const node = this.nodes.get(taskId);
    node.status = status;
    node.statusReason = reason;
    if (evidence) node.evidence = evidence;

    // Trigger re-evaluation of waiting nodes
    this.evaluateDependencies();
    return node;
  }

  evaluateDependencies() {
    for (const [taskId, node] of this.nodes.entries()) {
      if (node.status === 'WAITING' || node.status === 'QUEUED') {
        const allDepsSatisfied = node.dependencies.every(depId => {
          const dep = this.nodes.get(depId);
          return dep && (dep.status === 'SUCCEEDED' || dep.status === 'VERIFIED');
        });

        const anyDepFailed = node.dependencies.some(depId => {
          const dep = this.nodes.get(depId);
          return dep && (dep.status === 'FAILED' || dep.status === 'REJECTED' || dep.status === 'BLOCKED');
        });

        if (anyDepFailed) {
          node.status = 'BLOCKED';
          node.statusReason = 'BLOCKED: Upstream dependency failed, rejected, or blocked';
        } else if (allDepsSatisfied) {
          node.status = 'READY';
          node.statusReason = 'All dependencies satisfied; ready for parallel execution';
        }
      }
    }
  }

  getReadyParallelTasks() {
    this.evaluateDependencies();
    const ready = [];
    for (const [taskId, node] of this.nodes.entries()) {
      if (node.status === 'READY') {
        ready.push(node);
      }
    }
    return ready;
  }

  getSummary() {
    const summary = {};
    this.validStatuses.forEach(s => { summary[s] = 0; });
    for (const node of this.nodes.values()) {
      summary[node.status] = (summary[node.status] || 0) + 1;
    }
    return {
      totalTasks: this.nodes.size,
      statusCounts: summary,
      isCompletelyResolved: summary.READY === 0 && summary.RUNNING === 0 && summary.WAITING === 0
    };
  }
}
