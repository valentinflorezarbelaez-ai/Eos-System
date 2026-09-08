import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PolyglotLanguageHarness } from '../scripts/engine/polyglot-language-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Polyglot Rust WASM: Validates Cargo manifest, source structure, and test contracts', () => {
  const harness = new PolyglotLanguageHarness();
  const cargoPath = path.join(rootDir, 'EOS-Lab/Polyglot-Rust-Wasm/Cargo.toml');
  const libPath = path.join(rootDir, 'EOS-Lab/Polyglot-Rust-Wasm/src/lib.rs');

  // 1. Check file existence
  assert.ok(fs.existsSync(cargoPath), 'Cargo.toml must exist');
  assert.ok(fs.existsSync(libPath), 'lib.rs must exist');

  // 2. Cargo manifest contains wasm-bindgen
  const cargoContent = fs.readFileSync(cargoPath, 'utf8');
  assert.ok(cargoContent.includes('wasm-bindgen'));
  assert.ok(cargoContent.includes('cdylib'));

  // 3. lib.rs contains Rust unit tests
  const libContent = fs.readFileSync(libPath, 'utf8');
  assert.ok(libContent.includes('#[wasm_bindgen]'));
  assert.ok(libContent.includes('#[cfg(test)]'));
  assert.ok(libContent.includes('fn test_sanitize_strips_html'));

  // 4. Verify toolchain contract
  const contract = harness.getContract('RUST');
  assert.equal(contract.toolchain, 'cargo');
  assert.ok(contract.buildCommand.includes('cargo build'));
});
