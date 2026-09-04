/**
 * @module EpistemicBkmEngine
 * @description Best Known Methods (BKM) knowledge extraction, persistent distillation,
 * and cross-mission transfer engine with strict secret scrubbing and integrity hashing.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const FORBIDDEN_LEAK_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /C:\\Users\\[a-zA-Z0-9_-]+/i,
  /\/home\/[a-zA-Z0-9_-]+/i
];

export class EpistemicBkmEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.storagePath]
   */
  constructor(options = {}) {
    this.storagePath = options.storagePath || null;
    this.catalog = new Map();
  }

  /**
   * Scrubs private paths, usernames, and credentials from text
   * @param {string} text
   * @returns {string} Sanitized text
   */
  scrubSensitiveContent(text = '') {
    if (typeof text !== 'string') return text;
    let sanitized = text;

    // Redact absolute home paths
    sanitized = sanitized.replace(/C:\\Users\\[a-zA-Z0-9_-]+/gi, '<REDACTED_HOME>');
    sanitized = sanitized.replace(/\/home\/[a-zA-Z0-9_-]+/gi, '<REDACTED_HOME>');

    // Redact potential bearer tokens or keys
    sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer <REDACTED_TOKEN>');
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/gi, '<REDACTED_KEY>');

    return sanitized;
  }

  /**
   * Distills a proven solution pattern into an immutable BKM record
   * @param {object} params { title, domain, problemPattern, solutionPattern, verifiedEvidenceId, tags }
   * @returns {object} BKM record with SHA-256 hash
   */
  distillBkm(params = {}) {
    if (!params.title || !params.domain || !params.solutionPattern) {
      throw new Error('BKM_DISTILLATION_ERROR: Missing required fields (title, domain, solutionPattern)');
    }

    const bkmId = params.bkm_id || `BKM-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const cleanTitle = this.scrubSensitiveContent(params.title);
    const cleanProblem = this.scrubSensitiveContent(params.problemPattern || '');
    const cleanSolution = this.scrubSensitiveContent(params.solutionPattern);
    const domain = (params.domain || 'GENERAL').toUpperCase();
    const tags = Array.isArray(params.tags) ? params.tags.map(t => String(t).toLowerCase().trim()) : [];

    const record = {
      bkm_id: bkmId,
      title: cleanTitle,
      domain,
      tags,
      problem_pattern: cleanProblem,
      solution_pattern: cleanSolution,
      verified_evidence_id: params.verifiedEvidenceId || null,
      created_at: new Date().toISOString()
    };

    record.sha256 = calculateSha256(JSON.stringify(record));
    this.catalog.set(bkmId, record);

    if (this.storagePath) {
      this._persistToDisk(record);
    }

    return record;
  }

  /**
   * Queries catalog for relevant BKMs matching domain and keywords
   * @param {object} query { domain, keywords, tags }
   * @returns {Array<object>} Ranked matching BKM records
   */
  queryBkms(query = {}) {
    const targetDomain = query.domain ? query.domain.toUpperCase() : null;
    const searchTerms = (query.keywords || query.queryText || '').toLowerCase().split(/\s+/).filter(Boolean);
    const targetTags = Array.isArray(query.tags) ? query.tags.map(t => t.toLowerCase()) : [];

    const matches = [];

    for (const bkm of this.catalog.values()) {
      let score = 0;

      // Domain match
      if (targetDomain && bkm.domain === targetDomain) score += 3.0;

      // Tag matches
      for (const tag of targetTags) {
        if (bkm.tags.includes(tag)) score += 2.0;
      }

      // Keyword matches in title, problem, solution
      const textCorpus = `${bkm.title} ${bkm.problem_pattern} ${bkm.solution_pattern}`.toLowerCase();
      for (const term of searchTerms) {
        if (textCorpus.includes(term)) score += 1.0;
      }

      if (score > 0 || (!targetDomain && searchTerms.length === 0 && targetTags.length === 0)) {
        matches.push({ ...bkm, match_score: score });
      }
    }

    return matches.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Suggests top BKM recommendations for an incoming task contract
   * @param {object} taskContract
   * @returns {Array<object>} Recommended BKMs
   */
  suggestForTask(taskContract = {}) {
    const taskType = taskContract.task_type || taskContract.type || '';
    const description = taskContract.description || taskContract.goal || '';
    const tags = taskContract.tags || [];

    return this.queryBkms({
      domain: taskContract.domain || null,
      keywords: `${taskType} ${description}`,
      tags
    }).slice(0, 3);
  }

  _persistToDisk(record) {
    try {
      const line = JSON.stringify(record) + '\n';
      fs.appendFileSync(this.storagePath, line, 'utf8');
    } catch (e) {
      // Non-blocking fallback
    }
  }
}
