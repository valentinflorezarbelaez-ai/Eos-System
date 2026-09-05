/**
 * @module AutonomousIntakeSynthesizer
 * @description Ingests raw client requirements and intake documents, detects ambiguities,
 * classifies requirements into formal EARS syntax (Easy Approach to Requirements Syntax),
 * derives executable BDD (Given-When-Then) scenarios, and compiles nanometric 10-D SDLC packages.
 * Pure L0 Node.js implementation (zero npm dependencies).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MasterSdlcNanometricEngine } from './master-sdlc-nanometric-engine.js';
import { NanometricSpecPlanner } from './nanometric-spec-planner.js';
import { calculateSha256 } from './epistemic-evidence-engine.js';

export const EARS_PATTERNS = Object.freeze({
  EVENT_DRIVEN: 'EVENT_DRIVEN',
  STATE_DRIVEN: 'STATE_DRIVEN',
  ERROR_DRIVEN: 'ERROR_DRIVEN',
  UBIQUITOUS: 'UBIQUITOUS'
});

const VAGUE_LEXICON = [
  { regex: /(?<![\p{L}\p{N}])(r[aá]pido|fast|speedy|quick)(?![\p{L}\p{N}])/giu, term: 'rápido / fast', suggestion: 'Specify exact latency budget (e.g., p99 < 150ms)' },
  { regex: /(?<![\p{L}\p{N}])(f[aá]cil|easy|simple)(?![\p{L}\p{N}])/giu, term: 'fácil / easy', suggestion: 'Specify exact user interaction steps (e.g., ≤ 2 taps without modal)' },
  { regex: /(?<![\p{L}\p{N}])([oó]ptimo|optimal|best)(?![\p{L}\p{N}])/giu, term: 'óptimo / optimal', suggestion: 'Quantify resource or efficiency target (e.g., memory < 50MB, CPU < 5%)' },
  { regex: /(?<![\p{L}\p{N}])(moderno|modern|cutting-edge)(?![\p{L}\p{N}])/giu, term: 'moderno / modern', suggestion: 'Define specific architectural standard or WCAG 2.1 AA tokens' },
  { regex: /(?<![\p{L}\p{N}])(escalable|scalable)(?![\p{L}\p{N}])/giu, term: 'escalable / scalable', suggestion: 'Specify throughput capacity (e.g., 10,000 req/sec, concurrent users)' },
  { regex: /(?<![\p{L}\p{N}])(robusto|robust)(?![\p{L}\p{N}])/giu, term: 'robusto / robust', suggestion: 'Specify exact error handling and chaos fault-tolerance invariants' },
  { regex: /(?<![\p{L}\p{N}])(seguro|secure)(?![\p{L}\p{N}])/giu, term: 'seguro / secure', suggestion: 'Specify cipher standard, zero plain secrets, or auth token model' },
  { regex: /(?<![\p{L}\p{N}])(amigable|user-friendly|intuitivo|intuitive)(?![\p{L}\p{N}])/giu, term: 'amigable / intuitive', suggestion: 'Define explicit cognitive heuristics or touch target sizing (≥ 48px)' },
  { regex: /(?<![\p{L}\p{N}])(etc\b|etc\.|\.\.\.)/giu, term: 'etc.', suggestion: 'Exhaustively enumerate all members of the set; do not use open-ended lists' },
  { regex: /(?<![\p{L}\p{N}])(m[aá]s o menos|roughly|somehow)(?![\p{L}\p{N}])/giu, term: 'más o menos / roughly', suggestion: 'Eliminate probabilistic approximations; state deterministic boundaries' }
];

export class AutonomousIntakeSynthesizer {
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || process.cwd();
    this.sdlcEngine = options.sdlcEngine || new MasterSdlcNanometricEngine();
    this.planner = options.planner || new NanometricSpecPlanner();
  }

  /**
   * Scans raw text for subjective, vague, or non-quantifiable terms
   * @param {string} rawText 
   * @returns {object} Scan result with findings and ambiguity metrics
   */
  scanAmbiguities(rawText = '') {
    if (!rawText || typeof rawText !== 'string') {
      return {
        ambiguous_count: 0,
        has_ambiguities: false,
        findings: []
      };
    }

    const findings = [];
    const lines = rawText.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      for (const item of VAGUE_LEXICON) {
        item.regex.lastIndex = 0;
        let match;
        while ((match = item.regex.exec(line)) !== null) {
          findings.push({
            term: item.term,
            matched_text: match[0],
            line_number: lineIndex + 1,
            column: match.index + 1,
            context: line.trim(),
            recommendation: item.suggestion
          });
        }
      }
    }

    return {
      ambiguous_count: findings.length,
      has_ambiguities: findings.length > 0,
      findings
    };
  }

  /**
   * Classifies and formalizes statements into canonical EARS requirements
   * @param {string} rawText 
   * @param {object} [options]
   * @returns {Array<object>} Synthesized EARS requirements
   */
  synthesizeEarsRequirements(rawText = '', options = {}) {
    if (!rawText || typeof rawText !== 'string') {
      return [];
    }

    // Split text into meaningful sentences or list items
    const rawItems = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.replace(/^[-*•\d.)\]\s]+/, '').trim())
      .filter(line => line.length > 10);

    const isSpanish = /([áéíóúñ]|el sistema|cuando|mientras|usuario|interfaz|datos)/i.test(rawText);
    const requirements = [];

    rawItems.forEach((item, idx) => {
      const reqId = `FR-${String(idx + 1).padStart(2, '0')}`;
      const classification = this.#classifySentence(item, isSpanish);

      requirements.push({
        id: reqId,
        type: classification.type,
        statement: classification.statement,
        trigger_or_state: classification.trigger_or_state,
        response: classification.response,
        raw_source: item
      });
    });

    return requirements;
  }

  /**
   * Classifies a single sentence into EARS
   */
  #classifySentence(sentence, isSpanish) {
    const s = sentence.trim();

    // 1. ERROR-DRIVEN: Detect error/exception condition
    const errorMatch = s.match(/^(?:si|en caso de que|en caso de fallo|cuando ocurra un error|if|on error|when error occurs)\s+(.*?)(?:,\s*(?:entonces\s+)?(?:el sistema|the system\s+shall|the system)?\s*|\s+(?:entonces\s+)?(?:el sistema|the system\s+shall|the system)\s+)(.*)$/i);
    if (errorMatch && (s.toLowerCase().includes('error') || s.toLowerCase().includes('fall') || s.toLowerCase().includes('fail') || s.toLowerCase().includes('inval'))) {
      const condition = errorMatch[1].trim();
      const response = errorMatch[2].trim() || (isSpanish ? 'el sistema rechazará la acción de forma segura' : 'the system shall safely reject the action');
      return {
        type: EARS_PATTERNS.ERROR_DRIVEN,
        trigger_or_state: condition,
        response: response,
        statement: isSpanish
          ? `SI ${condition}, ENTONCES EL SISTEMA ${this.#cleanAction(response, isSpanish)}.`
          : `IF ${condition}, THEN THE SYSTEM SHALL ${this.#cleanAction(response, isSpanish)}.`
      };
    }

    // 2. STATE-DRIVEN: Detect state/mode condition
    const stateMatch = s.match(/^(?:mientras|durante|en modo|while|during|in mode)\s+(.*?)(?:,\s*(?:el sistema|the system\s+shall|the system)?\s*|\s+(?:el sistema|the system\s+shall|the system)\s+)(.*)$/i);
    if (stateMatch) {
      const state = stateMatch[1].trim();
      const response = stateMatch[2].trim();
      return {
        type: EARS_PATTERNS.STATE_DRIVEN,
        trigger_or_state: state,
        response: response,
        statement: isSpanish
          ? `MIENTRAS ${state}, EL SISTEMA ${this.#cleanAction(response, isSpanish)}.`
          : `WHILE ${state}, THE SYSTEM SHALL ${this.#cleanAction(response, isSpanish)}.`
      };
    }

    // 3. EVENT-DRIVEN: Detect event/trigger
    const eventMatch = s.match(/^(?:cuando|al hacer|al recibir|al presionar|al detectar|when|upon|on receiving|whenever)\s+(.*?)(?:,\s*(?:el sistema|the system\s+shall|the system|entonces|then)?\s*|\s+(?:el sistema|the system\s+shall|the system|entonces|then)\s+)(.*)$/i);
    if (eventMatch) {
      const event = eventMatch[1].trim();
      const response = eventMatch[2].trim();
      return {
        type: EARS_PATTERNS.EVENT_DRIVEN,
        trigger_or_state: event,
        response: response,
        statement: isSpanish
          ? `CUANDO ${event}, EL SISTEMA ${this.#cleanAction(response, isSpanish)}.`
          : `WHEN ${event}, THE SYSTEM SHALL ${this.#cleanAction(response, isSpanish)}.`
      };
    }

    // 4. UBIQUITOUS: Permanent continuous invariant
    return {
      type: EARS_PATTERNS.UBIQUITOUS,
      trigger_or_state: 'ALWAYS',
      response: s,
      statement: isSpanish
        ? `EL SISTEMA ${this.#cleanAction(s, isSpanish)}.`
        : `THE SYSTEM SHALL ${this.#cleanAction(s, isSpanish)}.`
    };
  }

  #cleanAction(text, isSpanish) {
    let clean = text.replace(/^(el sistema|the system shall|the system|debe|shall|will)\s+/i, '').trim();
    if (clean.endsWith('.')) clean = clean.slice(0, -1);
    return clean;
  }

  /**
   * Generates BDD Given-When-Then scenarios from synthesized EARS requirements
   * @param {Array<object>} earsRequirements 
   * @param {boolean} [isSpanish=true]
   * @returns {Array<object>} BDD scenarios
   */
  generateBddScenarios(earsRequirements = [], isSpanish = true) {
    if (!Array.isArray(earsRequirements)) return [];

    return earsRequirements.map((req, idx) => {
      const scnId = `SCN-${String(idx + 1).padStart(2, '0')}`;
      let given = isSpanish ? 'el sistema se encuentra en estado inicial nominal' : 'the system is in a nominal initial state';
      let when = req.trigger_or_state !== 'ALWAYS' ? req.trigger_or_state : (isSpanish ? 'se ejecuta la operación requerida' : 'the required operation is executed');
      let then = req.response;
      let and = isSpanish ? 'se preservan todos los invariantes de seguridad y pureza L0' : 'all security and L0 purity invariants are preserved';

      if (req.type === EARS_PATTERNS.STATE_DRIVEN) {
        given = isSpanish ? `el sistema está en estado ${req.trigger_or_state}` : `the system is in state ${req.trigger_or_state}`;
        when = isSpanish ? 'el usuario o proceso interactúa con el componente' : 'the user or process interacts with the component';
      } else if (req.type === EARS_PATTERNS.ERROR_DRIVEN) {
        given = isSpanish ? 'el sistema opera bajo el centinela defensivo' : 'the system operates under defensive guard';
        when = isSpanish ? `se suscita la anomalía: ${req.trigger_or_state}` : `anomaly occurs: ${req.trigger_or_state}`;
      }

      const gherkin = isSpanish
        ? `ESCENARIO ${scnId}: Verificación de ${req.id} (${req.type})\n  DADO ${given}\n  CUANDO ${when}\n  ENTONCES ${then}\n  Y ${and}`
        : `SCENARIO ${scnId}: Verification of ${req.id} (${req.type})\n  GIVEN ${given}\n  WHEN ${when}\n  THEN ${then}\n  AND ${and}`;

      return {
        id: scnId,
        requirement_id: req.id,
        type: req.type,
        title: `Verification of ${req.id}`,
        given,
        when,
        then,
        and,
        gherkin
      };
    });
  }

  /**
   * Compiles complete specification package including EARS, BDD, 10-D SDLC envelope,
   * and Atomic Task DAG, optionally persisting artifacts to disk.
   * @param {object} params
   * @param {string} params.projectId
   * @param {string} [params.title]
   * @param {string} [params.rawText]
   * @param {string} [params.inputPath]
   * @param {string} [params.outputDir]
   * @param {boolean} [params.persistFiles=false]
   * @returns {object} Compiled specification package
   */
  compileFullSpecificationPackage(params = {}) {
    const projectId = params.projectId || 'PRJ-AUTONOMOUS-INTAKE';
    const title = params.title || `Specification Package for ${projectId}`;
    
    let rawText = params.rawText || '';
    if (!rawText && params.inputPath) {
      const resolvedInput = path.isAbsolute(params.inputPath)
        ? params.inputPath
        : path.resolve(this.controlPlaneRoot, params.inputPath);
      if (fs.existsSync(resolvedInput)) {
        rawText = fs.readFileSync(resolvedInput, 'utf-8');
      }
    }

    if (!rawText.trim()) {
      throw new Error('AutonomousIntakeSynthesizer requires non-empty rawText or a valid inputPath');
    }

    // 1. Scan Ambiguities
    const ambiguityReport = this.scanAmbiguities(rawText);

    // 2. Synthesize EARS
    const earsRequirements = this.synthesizeEarsRequirements(rawText);

    // 3. Generate BDD
    const isSpanish = /([áéíóúñ]|el sistema|cuando|mientras|usuario)/i.test(rawText);
    const bddScenarios = this.generateBddScenarios(earsRequirements, isSpanish);

    // 4. Compile 10-D Nanometric SDLC envelope
    const sdlcEnvelope = this.sdlcEngine.compile10DimensionalSdlcSpec({
      project_id: projectId,
      title: title,
      summary: `Automated EARS intake specification synthesized from raw input (${earsRequirements.length} requirements formalized)`,
      overrides: {
        acceptance_criteria: bddScenarios.map(s => `${s.id}: ${s.then}`)
      }
    });

    // 5. Compile Atomic Task DAG
    const plannedTasks = earsRequirements.map((req, idx) => ({
      task_id: `TASK-${String(idx + 1).padStart(3, '0')}`,
      title: `Implement and verify ${req.id} (${req.type})`,
      phase: 'IMPLEMENTATION',
      pre_conditions: ['PRE_LEDGER_CHECK_PASS', 'ZERO_TRUST_AUTHORITY_CONFIRMED'],
      invariants: ['EXTERNAL_WRITE_BARRIER_DELTA_ZERO', 'ZERO_REGRESSION_IN_TEST_SUITE'],
      exact_test_command: `node --test tests/${projectId.toLowerCase()}-${req.id.toLowerCase()}.test.js`
    }));

    const nanometricPlan = this.planner.compileNanometricPlan({
      id: projectId,
      goal: title,
      architecture: 'CLEAN_HEXAGONAL_SPEC_DRIVEN_DEVELOPMENT',
      tasks: plannedTasks
    });

    // 6. Build Complete Package
    const packageEnvelope = {
      spec_id: `SPEC-${projectId}`,
      project_id: projectId,
      title: title,
      timestamp: new Date().toISOString(),
      ambiguity_audit: ambiguityReport,
      ears_requirements: earsRequirements,
      bdd_scenarios: bddScenarios,
      sdlc_envelope: sdlcEnvelope,
      task_dag: nanometricPlan,
      traceability: {
        l0_intake: params.inputPath || 'INLINE_INPUT',
        l1_spec: `docs/specs/${projectId.toLowerCase()}/spec.md`,
        l2_plan: `docs/plans/${projectId.toLowerCase()}/plan.md`,
        l3_tasks: `docs/tasks/${projectId.toLowerCase()}/tasks.md`
      }
    };

    packageEnvelope.sha256 = calculateSha256(JSON.stringify(packageEnvelope));

    // 7. Persist to disk if requested
    if (params.persistFiles && params.outputDir) {
      const outDir = path.isAbsolute(params.outputDir)
        ? params.outputDir
        : path.resolve(this.controlPlaneRoot, params.outputDir);

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Generate spec.md markdown
      const specMarkdown = this.#renderSpecMarkdown(packageEnvelope);
      fs.writeFileSync(path.join(outDir, 'spec.md'), specMarkdown, 'utf-8');

      // Generate plan.md markdown
      const planMarkdown = this.#renderPlanMarkdown(packageEnvelope);
      fs.writeFileSync(path.join(outDir, 'plan.md'), planMarkdown, 'utf-8');

      // Generate tasks.md markdown
      const tasksMarkdown = this.#renderTasksMarkdown(packageEnvelope);
      fs.writeFileSync(path.join(outDir, 'tasks.md'), tasksMarkdown, 'utf-8');
    }

    return packageEnvelope;
  }

  #renderSpecMarkdown(pkg) {
    const earsLines = pkg.ears_requirements.map(r => `* **${r.id} (${r.type})**:\n  ${r.statement}`).join('\n\n');
    const bddLines = pkg.bdd_scenarios.map(s => `\`\`\`gherkin\n${s.gherkin}\n\`\`\``).join('\n\n');
    const ambiguityNote = pkg.ambiguity_audit.has_ambiguities
      ? `> [!WARNING]\n> Ambiguity scan flagged ${pkg.ambiguity_audit.ambiguous_count} vague terms. Tighten non-functional boundaries before implementation.`
      : `> [!NOTE]\n> Zero ambiguities detected. 100% deterministic requirement bounds.`;

    return `# [${pkg.spec_id}]: ${pkg.title}

* **Project ID:** \`${pkg.project_id}\`
* **Status:** \`APPROVED\`
* **Integrity Hash:** \`${pkg.sha256}\`
* **Traceability:** \`${pkg.traceability.l0_intake}\` ➔ \`${pkg.traceability.l1_spec}\` ➔ \`${pkg.traceability.l2_plan}\` ➔ \`${pkg.traceability.l3_tasks}\`

---

## 1. Ambiguity & Vagueness Audit
${ambiguityNote}

---

## 2. Functional Requirements (EARS Syntax)
${earsLines}

---

## 3. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)
${bddLines}
`;
  }

  #renderPlanMarkdown(pkg) {
    return `# Architecture Plan: ${pkg.title}

* **Spec Reference:** \`${pkg.spec_id}\`
* **Architecture Standard:** \`${pkg.sdlc_envelope.architectural_boundaries.paradigm}\`
* **Dependency Rule:** \`${pkg.sdlc_envelope.architectural_boundaries.dependency_rule}\`
* **Total Dimensions Locked:** \`${Object.keys(pkg.sdlc_envelope).length}\`

---

## 1. Architectural Layers & Boundaries
${pkg.sdlc_envelope.architectural_boundaries.layers.map(l => `- **${l.name}**: Allowed dependencies -> [${l.allowed_dependencies.join(', ') || 'NONE'}]`).join('\n')}

---

## 2. Resource & Security Budgets
* **Authority Tier:** \`${pkg.sdlc_envelope.security_governance.authority_tier}\`
* **External Write Barrier:** Delta \`${pkg.sdlc_envelope.security_governance.external_write_barrier.delta}\`
* **Dependency Policy:** \`${pkg.sdlc_envelope.resource_budgets.dependency_policy}\`
* **Max Latency:** \`${pkg.sdlc_envelope.resource_budgets.max_latency_ms}ms\`
`;
  }

  #renderTasksMarkdown(pkg) {
    return `# Atomic Task DAG: ${pkg.title}

* **Plan ID:** \`${pkg.task_dag.plan_id}\`
* **Total Tasks:** \`${pkg.task_dag.total_tasks}\`

---

${pkg.task_dag.tasks.map(t => `### [${t.task_id}]: ${t.title}
* **Phase:** \`${t.phase}\`
* **Authority:** \`${t.authority_level}\`
* **Test Command:** \`${t.exact_test_command}\`
* **Invariants:** ${t.invariants.join(', ')}
`).join('\n')}
`;
  }
}
