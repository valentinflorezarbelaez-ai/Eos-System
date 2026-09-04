/**
 * @module ContextualSkillRouterEngine
 * @description Just-In-Time (JIT) semantic skill auto-discovery and activation router.
 * Evaluates task intent, file types, and architectural goals to dynamically activate
 * the optimal specialized skills without token bloat.
 */

import fs from 'node:fs';
import path from 'node:path';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class ContextualSkillRouterEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.skillsRoot] Path to .agents/skills directory
   */
  constructor(options = {}) {
    this.skillsRoot = options.skillsRoot || path.join(process.cwd(), '.agents/skills');
    this.catalog = new Map();
    this.loadCatalog();
  }

  /**
   * Loads all skills and parses YAML frontmatter
   */
  loadCatalog() {
    this.catalog.clear();
    if (!fs.existsSync(this.skillsRoot)) return;

    const entries = fs.readdirSync(this.skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(this.skillsRoot, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf8');
          const frontmatter = this._parseFrontmatter(content);
          this.catalog.set(entry.name, {
            name: frontmatter.name || entry.name,
            description: frontmatter.description || '',
            skillPath
          });
        }
      }
    }
  }

  /**
   * Simple YAML frontmatter parser
   * @private
   */
  _parseFrontmatter(content = '') {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const yaml = match[1];
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*["']?([^"'\r\n]+)["']?$/m);
    return {
      name: nameMatch ? nameMatch[1].trim() : null,
      description: descMatch ? descMatch[1].trim() : null
    };
  }

  /**
   * Dynamically routes and activates the most relevant skills for a task
   * @param {object} taskContext
   * @param {string} [taskContext.intent] Task description or user prompt
   * @param {Array<string>} [taskContext.files] Files being inspected or edited
   * @param {number} [taskContext.minAffinityThreshold=0.35]
   * @returns {object} Skill routing result
   */
  routeSkills(taskContext = {}) {
    const {
      intent = '',
      files = [],
      minAffinityThreshold = 0.35
    } = taskContext;

    const lowerIntent = intent.toLowerCase();
    const fileExts = files.map(f => path.extname(f).toLowerCase());
    const fileNames = files.map(f => path.basename(f).toLowerCase());

    const keywordRules = {
      'security-auditor': ['security', 'vulnerability', 'owasp', 'secret', 'token', 'auth', 'injection', 'cve', 'xss', 'sqli'],
      'grill-me': ['grill', 'interview', 'tradeoff', 'challenge', 'assumption', 'interrogate', 'plan-review'],
      'architecture-auditor': ['architecture', 'hexagonal', 'clean', 'port', 'adapter', 'dependency', 'layer', 'solid', 'ddd'],
      'accessibility-auditor': ['wcag', 'aria', 'accessibility', 'screen-reader', 'contrast', 'a11y'],
      'seo-auditor': ['seo', 'opengraph', 'sitemap', 'schema.org', 'meta-tag', 'json-ld', 'crawler'],
      'browser-qa': ['browser', 'cypress', 'playwright', 'e2e', 'visual-regression', 'flow-qa'],
      'docker-ops': ['docker', 'container', 'dockerfile', 'compose', 'k8s'],
      'git-workflow': ['git', 'github', 'pr', 'pull-request', 'branch', 'merge', 'commit'],
      'performance-auditor': ['performance', 'bundle', 'latency', 'loading', 'core-web-vitals', 'benchmark'],
      'quality-auditor': ['quality', 'lint', 'coverage', 'tdd', 'test-coverage', 'eslint'],
      'sdd': ['sdd', 'spec', 'openspec', 'specification', 'contract', 'golden-blueprint'],
      'evidence-auditor': ['evidence', 'proof', 'epistemic', 'audit-trail', 'receipt', 'classification'],
      'deep-research': ['research', 'investigate', 'benchmark', 'state-of-the-art', 'explore', 'comparative']
    };

    const fileRules = {
      'docker-ops': ['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
      'accessibility-auditor': ['.html', '.tsx', '.jsx', '.vue', '.svelte'],
      'seo-auditor': ['.html', '.xml', 'robots.txt', 'sitemap.xml'],
      'quality-auditor': ['.test.js', '.test.ts', '.spec.js', '.spec.ts']
    };

    const matches = [];

    for (const [skillName, skillData] of this.catalog.entries()) {
      let score = 0;
      const keywords = keywordRules[skillName] || [skillName];

      // 1. Keyword intent matching
      for (const kw of keywords) {
        if (lowerIntent.includes(kw)) {
          score += 0.35;
        }
      }

      // 2. File association matching
      const targetExts = fileRules[skillName] || [];
      for (const target of targetExts) {
        if (target.startsWith('.')) {
          if (fileExts.includes(target)) score += 0.25;
        } else {
          if (fileNames.includes(target)) score += 0.40;
        }
      }

      // 3. Name or description direct match
      if (lowerIntent.includes(skillName.replace('-', ' '))) {
        score += 0.50;
      }

      const normalizedScore = Math.min(1.0, Math.round(score * 100) / 100);

      if (normalizedScore >= minAffinityThreshold) {
        matches.push({
          skill_name: skillName,
          affinity_score: normalizedScore,
          description: skillData.description,
          skill_path: skillData.skillPath,
          rationale: `Matched based on task intent and file patterns with score ${normalizedScore}`
        });
      }
    }

    // Sort descending by score
    matches.sort((a, b) => b.affinity_score - a.affinity_score);

    const result = {
      task_intent: intent,
      activated_skills_count: matches.length,
      matched_skills: matches,
      timestamp: new Date().toISOString()
    };

    result.sha256 = calculateSha256(JSON.stringify(result));
    return result;
  }
}
