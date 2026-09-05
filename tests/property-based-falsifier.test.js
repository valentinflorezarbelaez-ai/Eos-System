import test from 'node:test';
import assert from 'node:assert/strict';
import { PropertyBasedFalsifier } from '../src/core/formal/property-based-falsifier.js';

test('PropertyBasedFalsifier: proves algebraic invariant holds across 500 iterations', () => {
  const fuzzer = new PropertyBasedFalsifier();

  // Property: Math.abs(x) is always non-negative
  const property = (x) => Math.abs(x) >= 0;
  const result = fuzzer.checkProperty(property, [() => fuzzer.arbitraryInteger(-10000, 10000)], { iterations: 500 });

  assert.equal(result.passed, true);
  assert.equal(result.status, 'PROPERTY_VERIFIED');
  assert.equal(result.iterationsRun, 500);
});

test('PropertyBasedFalsifier: falsifies invariant and deterministically shrinks integer counterexample', () => {
  const fuzzer = new PropertyBasedFalsifier();

  // Invariant that fails for numbers >= 50
  const property = (x) => x < 50;
  const result = fuzzer.checkProperty(property, [() => fuzzer.arbitraryInteger(0, 1000)], { iterations: 200 });

  assert.equal(result.passed, false);
  assert.equal(result.status, 'FALSIFIED');
  assert.ok(result.minimalCounterExample[0] >= 50);
  // Shrunk value should be close to 50
  assert.ok(result.minimalCounterExample[0] <= 55);
});

test('PropertyBasedFalsifier: shrinks failing string counterexample', () => {
  const fuzzer = new PropertyBasedFalsifier();

  // Invariant that fails if string contains 'NASA'
  const property = (s) => !s.includes('NASA');
  const generator = () => 'RandomPrefix_NASA_RandomSuffix_' + fuzzer.arbitraryString(20);

  const result = fuzzer.checkProperty(property, [generator], { iterations: 100 });

  assert.equal(result.passed, false);
  assert.equal(result.status, 'FALSIFIED');
  const shrunkStr = result.minimalCounterExample[0];
  assert.ok(shrunkStr.includes('NASA'));
  assert.ok(shrunkStr.length < 35);
});

test('PropertyBasedFalsifier: proves serialization idempotency f(f(x)) === f(x)', () => {
  const fuzzer = new PropertyBasedFalsifier();
  const sanitize = (str) => (typeof str === 'string' ? str.trim().toLowerCase() : '');

  const result = fuzzer.assertIdempotent(sanitize, () => fuzzer.arbitraryString(30), { iterations: 300 });
  assert.equal(result.passed, true);
  assert.equal(result.status, 'PROPERTY_VERIFIED');
});
