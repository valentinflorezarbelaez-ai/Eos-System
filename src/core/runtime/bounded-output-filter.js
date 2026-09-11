/**
 * @file bounded-output-filter.js
 * @description Pure utility for bounding process/terminal output streams to protect
 * LLM context windows and maintain token hygiene (Ponytail Tier 2).
 */

const DEFAULT_OPTIONS = Object.freeze({
  maxLines: 50,
  headLines: 25,
  tailLines: 25,
  maxBytes: 200000
});

/**
 * Filter and bound string output to prevent token exhaustion and context window dilution.
 *
 * @param {string|unknown} rawOutput - Raw command or process output.
 * @param {object} [options] - Budgeting configuration options.
 * @param {number} [options.maxLines=50] - Maximum allowed lines before truncation kicks in.
 * @param {number} [options.headLines=25] - Number of lines to preserve from the start of the output.
 * @param {number} [options.tailLines=25] - Number of lines to preserve from the end of the output.
 * @param {number} [options.maxBytes=200000] - Hard byte ceiling for the output buffer.
 * @returns {{ output: string, trimmed: boolean, totalLines: number, omittedLines: number }}
 */
export function filterBoundedOutput(rawOutput, options = {}) {
  if (rawOutput === null || rawOutput === undefined) {
    return { output: '', trimmed: false, totalLines: 0, omittedLines: 0 };
  }

  const str = typeof rawOutput === 'string' ? rawOutput : String(rawOutput);
  if (str.length === 0) {
    return { output: '', trimmed: false, totalLines: 0, omittedLines: 0 };
  }

  const maxLines = Number.isInteger(options.maxLines) && options.maxLines > 0
    ? options.maxLines
    : DEFAULT_OPTIONS.maxLines;

  const headLines = Number.isInteger(options.headLines) && options.headLines >= 0
    ? options.headLines
    : DEFAULT_OPTIONS.headLines;

  const tailLines = Number.isInteger(options.tailLines) && options.tailLines >= 0
    ? options.tailLines
    : DEFAULT_OPTIONS.tailLines;

  const maxBytes = Number.isInteger(options.maxBytes) && options.maxBytes > 0
    ? options.maxBytes
    : DEFAULT_OPTIONS.maxBytes;

  let processed = str;
  let byteTrimmed = false;

  // 1. Hard byte capping to prevent single-line memory/token overflows
  if (Buffer.byteLength(processed, 'utf8') > maxBytes) {
    byteTrimmed = true;
    const halfBytes = Math.floor(maxBytes / 2);
    const headChunk = processed.slice(0, halfBytes);
    const tailChunk = processed.slice(-halfBytes);
    const omittedBytes = Buffer.byteLength(processed, 'utf8') - (Buffer.byteLength(headChunk, 'utf8') + Buffer.byteLength(tailChunk, 'utf8'));
    processed = `${headChunk}\n[... ${omittedBytes} bytes omitted for token context hygiene ...]\n${tailChunk}`;
  }

  // 2. Line-based windowing
  const lines = processed.split('\n');
  const totalLines = lines.length;

  if (totalLines <= maxLines) {
    return {
      output: processed,
      trimmed: byteTrimmed,
      totalLines,
      omittedLines: 0
    };
  }

  const effectiveHead = Math.min(headLines, totalLines);
  const effectiveTail = Math.min(tailLines, totalLines - effectiveHead);
  const omittedLines = totalLines - (effectiveHead + effectiveTail);

  const head = lines.slice(0, effectiveHead);
  const tail = effectiveTail > 0 ? lines.slice(-effectiveTail) : [];

  const notice = `[... ${omittedLines} lines omitted for token context hygiene ...]`;
  const boundedLines = [...head, notice, ...tail];

  return {
    output: boundedLines.join('\n'),
    trimmed: true,
    totalLines,
    omittedLines
  };
}
