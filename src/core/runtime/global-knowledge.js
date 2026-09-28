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

/**
 * @param {string} baseDir EOS repo root
 * @param {{ positiveOnly?: boolean }} [opts]
 * @returns {{ id: string, source: string, title: string, text: string }[]}
 */
export function loadGlobalKnowledge(baseDir, opts = {}) {
  const file = globalKnowledgePath(baseDir);
  let doc;
  try {
    // ⚡ Bolt: Avoid TOCTOU `fs.existsSync` for ~10% faster load
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  const positiveOnly = opts.positiveOnly !== false;
  return entries
    .filter((e) => e && e.text && (!positiveOnly || e.positive !== false))
    .map((e) => ({
      id: String(e.id || ''),
      source: String(e.source || ''),
      title: String(e.title || ''),
      text: String(e.text).slice(0, 400)
    }));
}

export function formatGlobalKnowledgeMarkdown(entries = []) {
  if (!entries.length) {
    return '- (global knowledge file missing — optional)';
  }
  return entries.map((e) => `- **[${e.id}]** ${e.title}: ${e.text}`).join('\n');
}
