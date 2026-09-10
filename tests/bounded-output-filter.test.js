import test from 'node:test';
import assert from 'node:assert/strict';
import { filterBoundedOutput } from '../src/core/runtime/bounded-output-filter.js';

test('V2: passthrough for outputs within budget', () => {
  const shortText = 'Line 1\nLine 2\nLine 3';
  const result = filterBoundedOutput(shortText, { maxLines: 10 });
  assert.equal(result.trimmed, false);
  assert.equal(result.output, shortText);
  assert.equal(result.totalLines, 3);
  assert.equal(result.omittedLines, 0);
});

test('V2: bounds output when exceeding line budget (head + notice + tail)', () => {
  const lines = Array.from({ length: 100 }, (_, i) => `Log line ${i + 1}`);
  const longText = lines.join('\n');
  const result = filterBoundedOutput(longText, { maxLines: 20, headLines: 5, tailLines: 5 });

  assert.equal(result.trimmed, true);
  assert.equal(result.totalLines, 100);
  assert.equal(result.omittedLines, 90);

  const outLines = result.output.split('\n');
  assert.equal(outLines[0], 'Log line 1');
  assert.equal(outLines[4], 'Log line 5');
  assert.ok(result.output.includes('[... 90 lines omitted for token context hygiene ...]'));
  assert.equal(outLines[outLines.length - 1], 'Log line 100');
  assert.equal(outLines[outLines.length - 5], 'Log line 96');
});

test('V2: bounds output by byte ceiling even if lines are few', () => {
  const giantLine = 'A'.repeat(50000);
  const result = filterBoundedOutput(giantLine, { maxBytes: 1000 });
  assert.equal(result.trimmed, true);
  assert.ok(result.output.length <= 1200);
  assert.ok(result.output.includes('bytes omitted'));
});

test('V2: resilient handling of non-string and empty inputs', () => {
  assert.equal(filterBoundedOutput('').output, '');
  assert.equal(filterBoundedOutput(null).output, '');
  assert.equal(filterBoundedOutput(undefined).output, '');
  assert.equal(filterBoundedOutput(12345).output, '12345');
});

test('V2: default options preserve reasonable terminal window (25 head, 25 tail)', () => {
  const lines = Array.from({ length: 200 }, (_, i) => `Output #${i + 1}`);
  const result = filterBoundedOutput(lines.join('\n'));
  assert.equal(result.trimmed, true);
  assert.equal(result.totalLines, 200);
  assert.equal(result.omittedLines, 150);
  assert.ok(result.output.includes('Output #1'));
  assert.ok(result.output.includes('Output #25'));
  assert.ok(result.output.includes('Output #176'));
  assert.ok(result.output.includes('Output #200'));
});
