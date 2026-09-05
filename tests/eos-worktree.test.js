import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EosWorktreeManager } from '../bin/eos-worktree.js';

describe('EOS Worktree Manager (L0)', () => {
  const manager = new EosWorktreeManager();

  test('validates invalid taskId patterns', () => {
    assert.throws(() => manager.create(''), /Invalid taskId/);
    assert.throws(() => manager.create('task with spaces'), /Invalid taskId/);
    assert.throws(() => manager.create('../evil/path'), /Invalid taskId/);
  });

  test('list() returns array with main worktree', () => {
    const list = manager.list();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 1);
    const main = list.find((wt) => !wt.isEosWorktree);
    assert.ok(main, 'Main worktree must be found');
    assert.ok(main.path);
    assert.ok(main.head);
  });

  test('create and cleanup lifecycle with detached HEAD', () => {
    const taskId = `test-worktree-${Date.now()}`;
    const result = manager.create(taskId, { detached: true });
    assert.equal(result.success, true);
    assert.equal(result.taskId, taskId);
    assert.ok(result.path.includes(taskId));

    // Verify it appears in list()
    const listAfter = manager.list();
    const found = listAfter.find((wt) => wt.path.replace(/\\/g, '/').includes(taskId));
    assert.ok(found, 'New worktree should be in list');
    assert.equal(found.isEosWorktree, true);

    // Cleanup
    const cleanResult = manager.cleanup(taskId, { force: true });
    assert.equal(cleanResult.success, true);

    // Verify removed
    const listFinal = manager.list();
    const stillThere = listFinal.find((wt) => wt.path.replace(/\\/g, '/').includes(taskId));
    assert.equal(stillThere, undefined, 'Worktree should be cleaned up');
  });

  test('prune() executes without error', () => {
    const result = manager.prune();
    assert.equal(result.success, true);
  });
});
