/**
 * @module GlobalKnowledge
 * @description Pinned operational knowledge for CURSOR_PROMPT injection.
 * Improves every mission without mutating the constitution.
 */

import fs from 'node:fs';
import path from 'node:path';

export function globalKnowledgePath(baseDir) {
  return path.join(baseDir, 'docs', 'intelligence', 'EOS_GLOBAL_KNOWLEDGE.json');
}

// ⚡ Bolt: Cache parsed knowledge in memory to prevent repeated synchronous file reads
// and JSON parsing which block the event loop during frequent access.
const _knowledgeCache = new Map();

/**
 * @param {string} baseDir EOS repo root
 * @param {{ positiveOnly?: boolean }} [opts]
 * @returns {{ id: string, source: string, title: string, text: string }[]}
 */
export function loadGlobalKnowledge(baseDir, opts = {}) {
  const file = globalKnowledgePath(baseDir);
  if (!fs.existsSync(file)) return [];

  const positiveOnly = opts.positiveOnly !== false;
  // ⚡ Bolt: Use file modification time to safely invalidate the cache if the file changes during runtime
  const stat = fs.statSync(file);
  const mtimeMs = stat.mtimeMs;
  const cacheKey = `${file}:${positiveOnly}`;

  const cached = _knowledgeCache.get(cacheKey);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.data;
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  const result = entries
    .filter((e) => e && e.text && (!positiveOnly || e.positive !== false))
    .map((e) => ({
      id: String(e.id || ''),
      source: String(e.source || ''),
      title: String(e.title || ''),
      text: String(e.text).slice(0, 400)
    }));

  _knowledgeCache.set(cacheKey, { mtimeMs, data: result });
  return result;
}

export function formatGlobalKnowledgeMarkdown(entries = []) {
  if (!entries.length) {
    return '- (global knowledge file missing — optional)';
  }
  return entries.map((e) => `- **[${e.id}]** ${e.title}: ${e.text}`).join('\n');
}
