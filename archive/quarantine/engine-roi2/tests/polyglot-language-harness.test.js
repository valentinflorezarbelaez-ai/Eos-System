import test from 'node:test';
import assert from 'node:assert/strict';
import { PolyglotLanguageHarness } from '../scripts/engine/polyglot-language-harness.js';

test('Polyglot Harness: Returns valid build, test, and lint contracts for Rust, Python, Java, Go, and JS/TS', () => {
  const harness = new PolyglotLanguageHarness();

  // Rust
  const rust = harness.getContract('RUST');
  assert.equal(rust.toolchain, 'cargo');
  assert.ok(rust.testCommand.includes('cargo test'));
  assert.ok(rust.linterCommand.includes('clippy'));

  // Python
  const python = harness.getContract('PYTHON');
  assert.ok(python.testCommand.includes('pytest'));
  assert.ok(python.linterCommand.includes('ruff'));

  // Java
  const java = harness.getContract('JAVA');
  assert.ok(java.buildCommand.includes('mvn'));
  assert.ok(java.testCommand.includes('mvn test'));

  // Go
  const go = harness.getContract('GO');
  assert.ok(go.testCommand.includes('go test'));

  // TypeScript / JavaScript
  const ts = harness.getContract('TYPESCRIPT_JAVASCRIPT');
  assert.ok(ts.testCommand.includes('node --test'));
});

test('Polyglot Harness: Recommends optimal language based on architectural requirements without bias', () => {
  const harness = new PolyglotLanguageHarness();

  assert.equal(harness.recommendLanguageForTask('AST_PARSER_HIGH_PERF').recommended, 'RUST');
  assert.equal(harness.recommendLanguageForTask('DATA_SCIENCE_AI_MODEL').recommended, 'PYTHON');
  assert.equal(harness.recommendLanguageForTask('ENTERPRISE_BANKING_BACKEND').recommended, 'JAVA');
  assert.equal(harness.recommendLanguageForTask('CLOUD_INFRA_DAEMON').recommended, 'GO');
  assert.equal(harness.recommendLanguageForTask('WEB_LANDING_APP').recommended, 'TYPESCRIPT_JAVASCRIPT');
});
