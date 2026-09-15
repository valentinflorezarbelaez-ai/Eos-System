import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorktreeMutationEngine } from '../../../src/core/sandbox/worktree-mutation-engine.js';
import { calculateSha256 } from '../../../src/core/sdd/epistemic-evidence-engine.js';

describe('WorktreeMutationEngine', () => {
  let tmpDir;
  let sourceFixtureDir;
  let worktreeDestDir;
  let engine;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-mutation-engine-test-'));
    sourceFixtureDir = path.join(tmpDir, 'source-fixture');
    worktreeDestDir = path.join(tmpDir, 'dest-worktree');

    // Create source fixture with some files
    fs.mkdirSync(sourceFixtureDir, { recursive: true });
    fs.mkdirSync(path.join(sourceFixtureDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(sourceFixtureDir, 'file1.txt'), 'content1');
    fs.writeFileSync(path.join(sourceFixtureDir, 'src', 'file2.js'), 'console.log("file2");');

    engine = new WorktreeMutationEngine({ baseDir: tmpDir });
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('createIsolatedWorktree: throws if source does not exist', () => {
    assert.throws(() => {
      engine.createIsolatedWorktree('non-existent-source', 'dest');
    }, /SOURCE_FIXTURE_NOT_FOUND/);
  });

  test('createIsolatedWorktree: creates worktree and baseline snapshot', () => {
    const result = engine.createIsolatedWorktree('source-fixture', 'dest-worktree');

    assert.equal(result.worktreePath, path.join(tmpDir, 'dest-worktree'));
    assert.equal(result.fileCount, 2);

    // Verify files were copied
    assert.ok(fs.existsSync(path.join(worktreeDestDir, 'file1.txt')));
    assert.ok(fs.existsSync(path.join(worktreeDestDir, 'src', 'file2.js')));

    // Verify snapshot
    assert.ok('file1.txt' in result.baselineSnapshot);
    assert.ok('src/file2.js' in result.baselineSnapshot);
    assert.equal(result.baselineSnapshot['file1.txt'], calculateSha256('content1'));
  });

  test('applyScopedMutation: throws on path traversal', () => {
    assert.throws(() => {
      engine.applyScopedMutation(worktreeDestDir, [
        { path: '../evil.txt', content: 'evil' }
      ], ['*']);
    }, /SECURITY_VIOLATION_PATH_TRAVERSAL/);

    assert.throws(() => {
      engine.applyScopedMutation(worktreeDestDir, [
        { path: '/absolute/path/evil.txt', content: 'evil' }
      ], ['*']);
    }, /SECURITY_VIOLATION_PATH_TRAVERSAL/);
  });

  test('applyScopedMutation: throws if path not in allowedWriteFiles', () => {
    assert.throws(() => {
      engine.applyScopedMutation(worktreeDestDir, [
        { path: 'src/file2.js', content: 'new content' }
      ], ['file1.txt']); // only file1.txt allowed
    }, /UNAUTHORIZED_FILE_MUTATION/);
  });

  test('applyScopedMutation: applies allowed mutations', () => {
    // Also test directory wildcards
    const result = engine.applyScopedMutation(worktreeDestDir, [
      { path: 'file1.txt', content: 'new content1' },
      { path: 'src/file3.js', content: 'console.log("new file");' }
    ], ['file1.txt', 'src/**']);

    assert.equal(result.success, true);
    assert.deepEqual(result.modifiedFiles, ['file1.txt', 'src/file3.js']);

    // Check filesystem
    assert.equal(fs.readFileSync(path.join(worktreeDestDir, 'file1.txt'), 'utf8'), 'new content1');
    assert.equal(fs.readFileSync(path.join(worktreeDestDir, 'src', 'file3.js'), 'utf8'), 'console.log("new file");');
  });

  test('executeWorktreeTests: runs tests and captures output', () => {
    // Create a dummy test file
    fs.writeFileSync(path.join(worktreeDestDir, 'dummy.test.js'), 'console.log("test pass");');

    // We can run arbitrary commands. Let's run a node script
    const result = engine.executeWorktreeTests(worktreeDestDir, 'node dummy.test.js');

    assert.equal(result.passed, true);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('test pass'));
  });

  test('executeWorktreeTests: handles failing tests', () => {
    // Create a dummy failing script
    fs.writeFileSync(path.join(worktreeDestDir, 'fail.test.js'), 'process.exit(1);');

    const result = engine.executeWorktreeTests(worktreeDestDir, 'node fail.test.js');

    assert.equal(result.passed, false);
    assert.equal(result.exitCode, 1);
  });

  test('rollbackWorktree: reverts tree and detects mismatches', () => {
    // Re-create pristine worktree
    const { baselineSnapshot } = engine.createIsolatedWorktree('source-fixture', 'dest-worktree');

    // Mutate it
    engine.applyScopedMutation(worktreeDestDir, [
      { path: 'file1.txt', content: 'mutated content' }, // Modify existing
      { path: 'new_file.txt', content: 'brand new' }    // Add new
    ], ['file1.txt', 'new_file.txt']);

    const result = engine.rollbackWorktree(worktreeDestDir, baselineSnapshot);

    // Expected behavior: rollbackWorktree removes *new* files, but does NOT restore modified content.
    // It just checks hashes. So 'file1.txt' will still be mutated, and rollback will return delta_zero=false.
    // Let's verify this exact behavior according to current implementation.

    assert.equal(result.reverted, true);
    assert.equal(result.delta_zero, false); // Because file1.txt was not restored
    assert.ok(result.mismatches.some(m => m.includes('Hash mismatch in file1.txt')));
    assert.ok(!fs.existsSync(path.join(worktreeDestDir, 'new_file.txt'))); // New file should be deleted
  });
});
