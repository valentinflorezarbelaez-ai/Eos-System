import { EpistemicState } from '../types.js';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

/**
 * TaskNode Entity (Pure Domain)
 * Represents an atomic unit of execution within the Directed Acyclic Graph (DAG).
 * Enforces zero-vibe execution with explicit done-criteria and dependency resolution.
 */
export class TaskNode {
  readonly id: string;
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly doneCriteria: string;
  readonly status: TaskStatus;
  readonly epistemicState: EpistemicState;

  constructor(
    id: string,
    description: string,
    dependencies: readonly string[] = [],
    doneCriteria: string,
    status: TaskStatus = 'PENDING',
    epistemicState: EpistemicState = 'NOT_INITIALIZED'
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('TaskNode ID cannot be empty');
    }
    if (!description || description.trim().length === 0) {
      throw new Error('TaskNode description cannot be empty');
    }
    if (!doneCriteria || doneCriteria.trim().length === 0) {
      throw new Error('TaskNode doneCriteria cannot be empty');
    }

    this.id = id.trim();
    this.description = description.trim();
    this.dependencies = Object.freeze([...dependencies]);
    this.doneCriteria = doneCriteria.trim();
    this.status = status;
    this.epistemicState = epistemicState;
    Object.freeze(this);
  }

  isReady(completedTaskIds: ReadonlySet<string>): boolean {
    return this.dependencies.every((depId) => completedTaskIds.has(depId));
  }

  withStatus(newStatus: TaskStatus, newEpistemicState?: EpistemicState): TaskNode {
    return new TaskNode(
      this.id,
      this.description,
      this.dependencies,
      this.doneCriteria,
      newStatus,
      newEpistemicState ?? this.epistemicState
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      description: this.description,
      dependencies: this.dependencies,
      doneCriteria: this.doneCriteria,
      status: this.status,
      epistemicState: this.epistemicState
    };
  }
}
