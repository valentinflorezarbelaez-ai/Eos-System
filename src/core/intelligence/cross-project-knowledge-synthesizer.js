/**
 * @module CrossProjectKnowledgeSynthesizer
 * @description Ingests, distills, and transfers architectural patterns, schemas, and lessons
 * learned across projects to ensure compounding wisdom and intelligent execution.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class CrossProjectKnowledgeSynthesizer {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.knowledgeRegistry = new Map(); // domain -> Array of project BKMs
  }

  /**
   * Scrubs sensitive tokens/secrets before storing structural knowledge
   * @param {string} text
   * @returns {string} Sanitized text
   */
  scrubSecrets(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/(?:api_key|token|password|secret|bearer)\s*[:=]\s*['"][^'"]+['"]/gi, '[REDACTED_SECRET]')
      .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GH_TOKEN]')
      .replace(/xox[baprs]-[0-9a-zA-Z]{10,48}/g, '[REDACTED_SLACK_TOKEN]');
  }

  /**
   * Ingests a completed project to extract reusable architectural knowledge
   * @param {object} projectData
   * @returns {object} Ingestion receipt
   */
  ingestCompletedProject(projectData) {
    if (!projectData || !projectData.project_id || !projectData.domain) {
      throw new Error('Project data must provide project_id and domain');
    }

    const domain = projectData.domain.toUpperCase();
    if (!this.knowledgeRegistry.has(domain)) {
      this.knowledgeRegistry.set(domain, []);
    }

    const sanitizedLessons = (projectData.lessons_learned || []).map(l => this.scrubSecrets(l));

    const bkmRecord = {
      project_id: projectData.project_id,
      domain,
      architecture: projectData.architecture || 'CLEAN_HEXAGONAL',
      patterns_used: projectData.patterns_used || ['PORTS_AND_ADAPTERS', 'TDD_FIRST'],
      reusable_schemas: projectData.schemas_defined || [],
      lessons_learned: sanitizedLessons,
      token_efficiency: projectData.token_efficiency || 1.0,
      timestamp: new Date().toISOString()
    };

    bkmRecord.sha256 = calculateSha256(JSON.stringify(bkmRecord));
    this.knowledgeRegistry.get(domain).push(bkmRecord);

    const receipt = {
      status: 'INGESTED_SUCCESSFULLY',
      project_id: projectData.project_id,
      domain,
      bkm_hash: bkmRecord.sha256,
      total_domain_records: this.knowledgeRegistry.get(domain).length,
      timestamp: new Date().toISOString()
    };

    receipt.sha256 = calculateSha256(JSON.stringify(receipt));
    return receipt;
  }

  /**
   * Recommends architectural patterns and mitigations for a new project based on prior knowledge
   * @param {object} intent
   * @param {string} intent.domain
   * @param {string} [intent.goal]
   * @returns {object} Recommendation synthesis
   */
  recommendForNewProject(intent) {
    if (!intent || !intent.domain) {
      return {
        recommended_architecture: 'CLEAN_HEXAGONAL_STANDARD',
        reusable_patterns: ['PORTS_AND_ADAPTERS', 'TDD_FIRST', 'ZERO_TRUST_BARRIER'],
        known_gotchas: [],
        confidence_score: 0.5,
        reference_projects_count: 0
      };
    }

    const domain = intent.domain.toUpperCase();
    const records = this.knowledgeRegistry.get(domain) || [];

    if (records.length === 0) {
      return {
        domain,
        recommended_architecture: 'CLEAN_HEXAGONAL_STANDARD',
        reusable_patterns: ['PORTS_AND_ADAPTERS', 'TDD_FIRST', 'ZERO_TRUST_BARRIER'],
        known_gotchas: [],
        confidence_score: 0.6,
        reference_projects_count: 0,
        note: 'First project in this domain; establishing baseline patterns.'
      };
    }

    // Aggregate patterns and lessons
    const patternCounts = new Map();
    const allLessons = [];
    const refProjects = [];

    for (const rec of records) {
      refProjects.push(rec.project_id);
      for (const p of rec.patterns_used) {
        patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
      }
      allLessons.push(...rec.lessons_learned);
    }

    const topPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);

    const confidenceScore = Number(Math.min(0.99, 0.7 + records.length * 0.1).toFixed(2));

    const recommendation = {
      domain,
      recommended_architecture: records[records.length - 1].architecture,
      reusable_patterns: topPatterns,
      known_gotchas: Array.from(new Set(allLessons)),
      confidence_score: confidenceScore,
      reference_projects: refProjects,
      reference_projects_count: records.length,
      timestamp: new Date().toISOString()
    };

    recommendation.sha256 = calculateSha256(JSON.stringify(recommendation));
    return recommendation;
  }
}
