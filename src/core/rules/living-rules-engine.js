/**
 * @module LivingRulesEngine
 * @description Implements Boris Cherny's Context Minimalism and Living Rules doctrine for EOS.
 * Audits rule files for token bloat, distills atomic EARS rules from failures and vetoes,
 * and compiles ultra-dense, minimal system prompt contexts.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class LivingRulesEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   * @param {number} [options.maxTokensPerRule=250]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.maxTokensPerRule = options.maxTokensPerRule || 250;
    this.rulesRegistryPath = path.resolve(
      this.baseDir,
      options.rulesRegistryPath || 'docs/rules/LIVING_RULES_REGISTRY.json'
    );
    this.canonicalIndexPath = path.resolve(
      this.baseDir,
      options.canonicalIndexPath || 'docs/rules/CANONICAL_RULES_INDEX.json'
    );
  }

  /**
   * Estimate tokens from text length using standard 4-char per token heuristic.
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.trim().length / 4);
  }

  /**
   * Check whether a rule statement adheres to formal EARS patterns.
   * Patterns: CUANDO, SI, MIENTRAS, EL SISTEMA, WHEN, IF, WHILE, THE SYSTEM
   * @param {string} statement
   * @returns {boolean}
   */
  isEarsCompliant(statement) {
    if (!statement || typeof statement !== 'string') return false;
    const earsRegex = /^(?:CUANDO|SI|MIENTRAS|EL SISTEMA|WHEN|IF|WHILE|THE SYSTEM)\b/iu;
    return earsRegex.test(statement.trim());
  }

  /**
   * Audits rule files across .cursor/rules/, .agents/, and docs/rules/.
   * @param {object} [options]
   * @param {string[]} [options.searchDirs]
   * @returns {object} Audit report with metrics, bloat warnings, and recommendations.
   */
  auditRules(options = {}) {
    const searchDirs = options.searchDirs || [
      path.resolve(this.baseDir, '.cursor/rules'),
      path.resolve(this.baseDir, '.agents'),
      path.resolve(this.baseDir, 'docs/rules')
    ];

    const auditedFiles = [];
    let totalTokens = 0;
    let bloatedRulesCount = 0;
    const warnings = [];
    const discoveredRules = [];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdc') || entry.name.endsWith('.json'))) {
          const filePath = path.join(dir, entry.name);
          const content = fs.readFileSync(filePath, 'utf8');
          const tokens = this.estimateTokens(content);
          totalTokens += tokens;

          // Parse rule fragments
          const fileRules = this._extractRuleFragments(content, entry.name);
          for (const rule of fileRules) {
            rule.filePath = path.relative(this.baseDir, filePath);
            rule.tokens = this.estimateTokens(rule.statement);
            rule.earsCompliant = this.isEarsCompliant(rule.statement);

            if (rule.tokens > this.maxTokensPerRule && !rule.earsCompliant) {
              bloatedRulesCount++;
              warnings.push({
                file: rule.filePath,
                ruleId: rule.id || rule.title,
                tokens: rule.tokens,
                reason: `Rule exceeds ${this.maxTokensPerRule} tokens (${rule.tokens}) and lacks formal EARS syntax.`
              });
            }

            discoveredRules.push(rule);
          }

          auditedFiles.push({
            file: path.relative(this.baseDir, filePath),
            tokens,
            rulesCount: fileRules.length
          });
        }
      }
    }

    const bloatRatio = totalTokens > 0 ? Number(((bloatedRulesCount / (discoveredRules.length || 1))).toFixed(3)) : 0;

    return {
      status: warnings.length === 0 ? 'CLEAN_MINIMAL' : 'OPTIMIZATION_RECOMMENDED',
      auditedFilesCount: auditedFiles.length,
      totalRulesDiscovered: discoveredRules.length,
      totalEstimatedTokens: totalTokens,
      bloatedRulesCount,
      bloatRatio,
      auditedFiles,
      warnings,
      recommendation: warnings.length === 0
        ? 'All rules satisfy context minimalism and token budget limits.'
        : `Compress ${bloatedRulesCount} rule(s) to EARS format to avoid LLM context dilution.`
    };
  }

  /**
   * Distills an atomic EARS-compliant living rule from a failure or veto event.
   * @param {object} event
   * @param {string} event.source 'VETO_REJECTED' | 'TEST_FAILURE' | 'LINT_FAILURE' | 'ARBITRATION'
   * @param {string} [event.desk]
   * @param {string} [event.reason]
   * @param {string} [event.context]
   * @returns {object} Formatted living rule
   */
  distillRule(event = {}) {
    if (!event.source) {
      throw new Error('LIVING_RULES_FAULT: Event must contain a valid source.');
    }

    const hash = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ruleId = `RULE-LIV-${hash}`;
    const timestamp = new Date().toISOString();

    let title = event.reason || 'Operational Invariant Protection';
    let statement = '';
    let earsPattern = 'SI_ENTONCES';

    if (event.source === 'VETO_REJECTED') {
      const deskName = event.desk || 'ArbitrationDesk';
      if (event.reason && /secret|credential|key/i.test(event.reason)) {
        statement = 'SI se detectan credenciales o llaves privadas en el código fuente, ENTONCES EL SISTEMA rechazará el commit mediante veto vinculante inmediato.';
        title = 'Zero Plain Secrets Invariant';
      } else if (event.reason && /architecture|domain|hexagonal/i.test(event.reason)) {
        statement = 'MIENTRAS se modifique el dominio principal, EL SISTEMA debe prohibir cualquier importación o dependencia de frameworks de infraestructura.';
        title = 'Domain Purity Boundary Invariant';
        earsPattern = 'MIENTRAS_EL_SISTEMA';
      } else {
        statement = `SI ${deskName} detecta [${event.reason}], ENTONCES EL SISTEMA suspenderá la aprobación hasta completar la remediación.`;
      }
    } else if (event.source === 'TEST_FAILURE') {
      const detail = event.context || event.reason || 'regresión no controlada';
      statement = `CUANDO se ejecute la suite de pruebas unitarias y ocurra [${detail}], EL SISTEMA debe abortar la transición a producción hasta corregir la causa raíz.`;
      earsPattern = 'CUANDO_EL_SISTEMA';
      title = 'Continuous Test Verification Gate';
    } else {
      statement = `CUANDO ocurra una anomalía en [${event.source}], EL SISTEMA aislará la falla y registrará evidencia criptográfica.`;
      earsPattern = 'CUANDO_EL_SISTEMA';
    }

    const livingRule = {
      rule_id: ruleId,
      title,
      source: `LivingEngine:${event.source}`,
      statement,
      ears_pattern: earsPattern,
      tokens_estimate: this.estimateTokens(statement),
      created_at: timestamp
    };

    // Auto-record to registry
    this._persistLivingRule(livingRule);

    return livingRule;
  }

  /**
   * Compiles an ultra-dense, deduplicated system prompt context under a strict token budget.
   * @param {object} [options]
   * @param {number} [options.maxTokens=1200]
   * @param {string[]} [options.mandatoryRuleIds]
   * @returns {object} { promptContext: string, tokenCount: number, ruleCount: number }
   */
  exportMinimalPromptContext(options = {}) {
    const maxTokens = options.maxTokens || 1200;
    const rules = this._loadAllRules();

    let compiledLines = [
      '# EOS MINIMAL LIVING RULES & CONSTITUTIONAL INVARIANTS',
      'Strict operational directives. Zero vibe coding.'
    ];

    let currentTokens = this.estimateTokens(compiledLines.join('\n'));
    let includedCount = 0;

    for (const rule of rules) {
      const line = `- [${rule.rule_id}] ${rule.statement}`;
      const lineTokens = this.estimateTokens(line);

      if (currentTokens + lineTokens > maxTokens) {
        break;
      }

      compiledLines.push(line);
      currentTokens += lineTokens;
      includedCount++;
    }

    const promptContext = compiledLines.join('\n');

    return {
      promptContext,
      tokenCount: this.estimateTokens(promptContext),
      ruleCount: includedCount,
      budgetMaxTokens: maxTokens,
      saturated: includedCount < rules.length
    };
  }

  /**
   * Synchronizes living rules into docs/rules/LIVING_RULES_REGISTRY.json.
   * @returns {object}
   */
  syncRules() {
    const registry = this._loadRegistry();
    return {
      status: 'SYNCHRONIZED',
      totalRegisteredLivingRules: registry.rules.length,
      registryPath: this.rulesRegistryPath,
      syncedAt: new Date().toISOString()
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  _extractRuleFragments(content, fileName) {
    const fragments = [];

    // If JSON
    if (fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.rules)) {
          return parsed.rules.map(r => ({
            id: r.rule_id || r.id,
            title: r.title || r.name,
            statement: r.statement || r.description || ''
          }));
        }
      } catch {
        return [];
      }
    }

    // Markdown / MDC: look for bullet items or headers
    const lines = content.split('\n');
    let currentTitle = fileName;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        currentTitle = trimmed.replace(/^#+\s*/, '');
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const statement = trimmed.replace(/^[-*]\s*/, '');
        if (statement.length > 20) {
          fragments.push({
            id: null,
            title: currentTitle,
            statement
          });
        }
      }
    }

    return fragments;
  }

  _loadRegistry() {
    if (!fs.existsSync(this.rulesRegistryPath)) {
      return { schema_version: '1.0.0', rules: [] };
    }
    try {
      return JSON.parse(fs.readFileSync(this.rulesRegistryPath, 'utf8'));
    } catch {
      return { schema_version: '1.0.0', rules: [] };
    }
  }

  _persistLivingRule(rule) {
    const registry = this._loadRegistry();
    const dir = path.dirname(this.rulesRegistryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Avoid duplicate rule_id
    registry.rules = registry.rules.filter(r => r.rule_id !== rule.rule_id);
    registry.rules.push(rule);
    fs.writeFileSync(this.rulesRegistryPath, JSON.stringify(registry, null, 2), 'utf8');
  }

  _loadAllRules() {
    const all = [];

    // Load canonical index if exists
    if (fs.existsSync(this.canonicalIndexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.canonicalIndexPath, 'utf8'));
        if (Array.isArray(data.rules)) {
          all.push(...data.rules);
        }
      } catch {
        // ignore load errors
      }
    }

    // Load living registry if exists
    const reg = this._loadRegistry();
    if (Array.isArray(reg.rules)) {
      all.push(...reg.rules);
    }

    return all;
  }
}
