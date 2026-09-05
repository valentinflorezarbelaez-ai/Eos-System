import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SyntaxGuard } from '../src/core/governance/syntax-guard.js';

describe('EOS Syntax Guard (Boris Cherny Pattern)', () => {
  const guard = new SyntaxGuard();

  test('validates valid JSON', () => {
    const res = guard.validateContent('{"key": "value", "count": 42}', '.json', 'test.json');
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
  });

  test('catches malformed JSON', () => {
    const res = guard.validateContent('{"key": "value", trailing}', '.json', 'bad.json');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('JSON Parse Error'));
  });

  test('validates valid JavaScript syntax', () => {
    const code = 'const x = 10; function add(a, b) { return a + b; } export default add;';
    // vm.Script accepts ESM export syntax when in module or functions
    const validFn = 'function run() { const a = 1; return a * 2; } run();';
    const res = guard.validateContent(validFn, '.js', 'valid.js');
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
  });

  test('catches JavaScript syntax errors', () => {
    const badCode = 'const x = ; if (true) {';
    const res = guard.validateContent(badCode, '.js', 'broken.js');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('JavaScript Syntax Error'));
  });

  test('validates Markdown with closed frontmatter', () => {
    const md = '---\ntitle: Doc\n---\n# Body\nSome text';
    const res = guard.validateContent(md, '.mdc', 'test.mdc');
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
  });

  test('catches unclosed Markdown frontmatter', () => {
    const badMd = '---\ntitle: Broken without close';
    const res = guard.validateContent(badMd, '.md', 'broken.md');
    assert.equal(res.valid, false);
    assert.ok(res.error.includes('Unclosed YAML frontmatter'));
  });

  test('validates existing repo files with validateFile', () => {
    const res = guard.validateFile('package.json');
    assert.equal(res.valid, true);
    assert.equal(res.language, 'json');
  });

  test('validateFiles batches results correctly', () => {
    const batch = guard.validateFiles(['package.json', 'CONSTITUTION.md']);
    assert.equal(batch.allValid, true);
    assert.equal(batch.results.length, 2);
  });
});
