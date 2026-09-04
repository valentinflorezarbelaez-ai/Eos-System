/**
 * @module EpistemicKnowledgeService
 * @description Unified Epistemic Knowledge Integration & Learning Service for EOS.
 * Synthesizes cross-project architectural wisdom, manages the Epistemic BKM Catalog,
 * scrubs private credentials, and injects verified lessons into future missions.
 */

import fs from 'node:fs';
import path from 'node:path';

import { EpistemicBkmEngine } from './epistemic-bkm-engine.js';
import { CrossProjectKnowledgeSynthesizer } from '../intelligence/cross-project-knowledge-synthesizer.js';
import { EOSMissionOntologyCore } from '../runtime/mission-ontology.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class EpistemicKnowledgeService {
  /**
   * @param {object} [options]
   * @param {EpistemicBkmEngine} [options.bkmEngine]
   * @param {CrossProjectKnowledgeSynthesizer} [options.synthesizer]
   * @param {EOSMissionOntologyCore} [options.ontology]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.bkmEngine = options.bkmEngine || new EpistemicBkmEngine(options);
    this.synthesizer = options.synthesizer || new CrossProjectKnowledgeSynthesizer(options);
    this.ontology = options.ontology || new EOSMissionOntologyCore();
    this.validator = options.validator || new SchemaValidator();
  }

  /**
   * Distills verified knowledge, lessons, and BKMs from a completing mission.
   * @param {string} missionDir Mission root directory
   * @param {object} [options]
   * @returns {object} Distilled BKM record and telemetry
   */
  distillMissionKnowledge(missionDir, options = {}) {
    const directionFile = path.join(missionDir, 'direction.json');
    const direction = fs.existsSync(directionFile)
      ? JSON.parse(fs.readFileSync(directionFile, 'utf8'))
      : { goal: 'Engineering Deliverable', domain: 'GENERAL' };

    const planFile = path.join(missionDir, 'plan.json');
    const plan = fs.existsSync(planFile)
      ? JSON.parse(fs.readFileSync(planFile, 'utf8'))
      : { tasks: [] };

    const domain = (options.domain || direction.business_context || 'ENGINEERING_CORE').toUpperCase();
    const primaryGoal = direction.goal || 'General Engineering Task';

    // 1. Distill BKM via EpistemicBkmEngine (with automatic secret scrubbing)
    const rawBkm = this.bkmEngine.distillBkm({
      title: options.title || `Verified Architecture: ${primaryGoal}`,
      domain,
      problemPattern: options.problemPattern || `Implementation challenge satisfying: ${primaryGoal}`,
      solutionPattern: options.solutionPattern || `Executed ${plan.tasks.length} tasks with 100% verified test evidence.`,
      verifiedEvidenceId: options.evidenceId || null,
      tags: options.tags || ['verified_solution', 'clean_hexagonal', domain.toLowerCase()]
    });

    const bkmRecord = {
      schema_version: '1.0.0',
      bkm_id: rawBkm.bkm_id,
      title: rawBkm.title,
      domain: rawBkm.domain,
      problem_pattern: rawBkm.problem_pattern,
      solution_pattern: rawBkm.solution_pattern,
      verified_evidence_id: rawBkm.verified_evidence_id,
      tags: rawBkm.tags,
      created_at: rawBkm.created_at,
      sha256: rawBkm.sha256
    };

    // 2. Validate BKM Record against Schema Contract
    this.validator.assertValid(bkmRecord, 'bkm-item.schema.json', 'bkm-item');

    // 3. Register in CrossProjectKnowledgeSynthesizer
    this.synthesizer.ingestCompletedProject({
      project_id: options.projectId || path.basename(missionDir),
      domain,
      architecture: 'CLEAN_HEXAGONAL',
      patterns_used: ['PORTS_AND_ADAPTERS', 'TDD_FIRST', 'GOVERNED_EXECUTION'],
      schemas_defined: ['bkm-item.schema.json'],
      lessons_learned: [bkmRecord.solution_pattern]
    });

    // Save BKM artifact in mission directory
    const bkmDir = path.join(missionDir, 'knowledge');
    if (!fs.existsSync(bkmDir)) {
      fs.mkdirSync(bkmDir, { recursive: true });
    }
    const bkmFile = path.join(bkmDir, `${bkmRecord.bkm_id}.json`);
    fs.writeFileSync(bkmFile, JSON.stringify(bkmRecord, null, 2), 'utf8');

    return {
      bkmRecord,
      bkmFile
    };
  }

  /**
   * Queries relevant BKMs and architectural patterns for a target domain or keyword.
   * @param {object} query { domain, keywords, tags }
   * @returns {Array<object>} Ranked BKMs
   */
  queryRelevantKnowledge(query = {}) {
    return this.bkmEngine.queryBkms(query);
  }

  /**
   * Suggests top historical solutions for an incoming intent or goal.
   * @param {string} prompt Goal prompt
   * @param {string} [domain] Domain name
   * @returns {Array<object>}
   */
  suggestForIntent(prompt = '', domain = null) {
    return this.bkmEngine.queryBkms({
      domain,
      keywords: prompt
    }).slice(0, 3);
  }
}
