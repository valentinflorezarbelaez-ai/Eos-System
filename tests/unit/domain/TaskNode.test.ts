import { describe, it, expect } from 'vitest';
import { TaskNode } from '../../../src/core/domain/models/TaskNode.js';
import type { TaskStatus } from '../../../src/core/domain/models/TaskNode.js';

describe('TaskNode', () => {
  // --- Valid Construction ---

  it('creates a valid task node with defaults', () => {
    const task = new TaskNode('T-001', 'Implement feature', [], 'Feature deployed');
    expect(task.id).toBe('T-001');
    expect(task.description).toBe('Implement feature');
    expect(task.dependencies).toEqual([]);
    expect(task.doneCriteria).toBe('Feature deployed');
    expect(task.status).toBe('PENDING');
    expect(task.epistemicState).toBe('NOT_INITIALIZED');
  });

  it('creates a task node with dependencies', () => {
    const task = new TaskNode('T-002', 'Build UI', ['T-001'], 'UI renders', 'IN_PROGRESS', 'AUDIT_EXECUTED');
    expect(task.dependencies).toEqual(['T-001']);
    expect(task.status).toBe('IN_PROGRESS');
    expect(task.epistemicState).toBe('AUDIT_EXECUTED');
  });

  it('freezes the instance and dependencies', () => {
    const task = new TaskNode('T-003', 'Frozen task', ['T-001', 'T-002'], 'Done');
    expect(Object.isFrozen(task)).toBe(true);
    expect(Object.isFrozen(task.dependencies)).toBe(true);
  });

  it('trims whitespace from id, description, and doneCriteria', () => {
    const task = new TaskNode('  T-004  ', '  desc  ', [], '  criteria  ');
    expect(task.id).toBe('T-004');
    expect(task.description).toBe('desc');
    expect(task.doneCriteria).toBe('criteria');
  });

  // --- Invalid Construction ---

  it('throws on empty id', () => {
    expect(() => new TaskNode('', 'Desc', [], 'Done'))
      .toThrow('TaskNode ID cannot be empty');
  });

  it('throws on empty description', () => {
    expect(() => new TaskNode('T-X', '', [], 'Done'))
      .toThrow('TaskNode description cannot be empty');
  });

  it('throws on empty doneCriteria', () => {
    expect(() => new TaskNode('T-X', 'Desc', [], ''))
      .toThrow('TaskNode doneCriteria cannot be empty');
  });

  it('throws on whitespace-only id', () => {
    expect(() => new TaskNode('   ', 'Desc', [], 'Done'))
      .toThrow('TaskNode ID cannot be empty');
  });

  // --- isReady Logic ---

  it('isReady returns true when no dependencies exist', () => {
    const task = new TaskNode('T-010', 'Independent', [], 'Done');
    expect(task.isReady(new Set())).toBe(true);
  });

  it('isReady returns true when all dependencies are completed', () => {
    const task = new TaskNode('T-011', 'Dependent', ['T-001', 'T-002'], 'Done');
    const completed = new Set(['T-001', 'T-002', 'T-003']);
    expect(task.isReady(completed)).toBe(true);
  });

  it('isReady returns false when some dependencies are not completed', () => {
    const task = new TaskNode('T-012', 'Blocked', ['T-001', 'T-002'], 'Done');
    const completed = new Set(['T-001']);
    expect(task.isReady(completed)).toBe(false);
  });

  it('isReady returns false when no dependencies are completed', () => {
    const task = new TaskNode('T-013', 'Fully blocked', ['T-001'], 'Done');
    expect(task.isReady(new Set())).toBe(false);
  });

  // --- withStatus (Immutable State Transition) ---

  it('withStatus returns a new TaskNode with updated status', () => {
    const original = new TaskNode('T-020', 'Task', [], 'Done', 'PENDING');
    const updated = original.withStatus('IN_PROGRESS');
    expect(updated).not.toBe(original);
    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.epistemicState).toBe('NOT_INITIALIZED'); // preserved
    expect(original.status).toBe('PENDING'); // original unchanged
  });

  it('withStatus updates both status and epistemic state', () => {
    const original = new TaskNode('T-021', 'Task', [], 'Done', 'PENDING', 'NOT_INITIALIZED');
    const updated = original.withStatus('DONE', 'VERIFIED');
    expect(updated.status).toBe('DONE');
    expect(updated.epistemicState).toBe('VERIFIED');
  });

  it('withStatus preserves all other fields', () => {
    const original = new TaskNode('T-022', 'My Task', ['T-001'], 'Criteria');
    const updated = original.withStatus('BLOCKED');
    expect(updated.id).toBe('T-022');
    expect(updated.description).toBe('My Task');
    expect(updated.dependencies).toEqual(['T-001']);
    expect(updated.doneCriteria).toBe('Criteria');
  });

  // --- Serialization ---

  it('toJSON includes all fields', () => {
    const task = new TaskNode('T-030', 'Serialize', ['T-001'], 'Criteria', 'DONE', 'VERIFIED');
    const json = task.toJSON();
    expect(json).toEqual({
      id: 'T-030',
      description: 'Serialize',
      dependencies: ['T-001'],
      doneCriteria: 'Criteria',
      status: 'DONE',
      epistemicState: 'VERIFIED'
    });
  });
});
