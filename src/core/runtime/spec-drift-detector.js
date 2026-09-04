import crypto from 'node:crypto';

/**
 * EOS Spec-to-Code Drift Detector & Delta Synchronization Engine
 * Automatically analyzes specification markdown (EARS/BDD) and source code AST declarations
 * to certify parity, detect unauthorized drift, and generate formal Delta-Spec proposals.
 */
export class SpecDriftDetector {
  /**
   * Parses EARS requirements and BDD scenarios from specification Markdown.
   * @param {string} specMarkdown
   * @returns {object}
   */
  parseSpecRequirements(specMarkdown = '') {
    const requirements = [];
    const scenarios = [];

    // Extract FR-XXX headers and content
    const frRegex = /###\s*(FR-[0-9]+):\s*([^\n]+)([\s\S]*?)(?=###|$)/gi;
    let frMatch;
    while ((frMatch = frRegex.exec(specMarkdown)) !== null) {
      const id = frMatch[1].trim();
      const name = frMatch[2].trim();
      const body = frMatch[3].trim();

      let pattern = 'UBIQUITOUS';
      if (body.includes('CUANDO')) pattern = 'EVENT_DRIVEN';
      else if (body.includes('MIENTRAS')) pattern = 'STATE_DRIVEN';
      else if (body.includes('SI')) pattern = 'UNWANTED_ERROR';

      requirements.push({
        id,
        name,
        pattern,
        raw: body
      });
    }

    // Extract BDD Scenarios (SCENARIO-XXX or ESCENARIO)
    const scRegex = /###\s*(SCENARIO-[0-9]+|ESCENARIO-[0-9]+):\s*([^\n]+)([\s\S]*?)(?=###|$)/gi;
    let scMatch;
    while ((scMatch = scRegex.exec(specMarkdown)) !== null) {
      const id = scMatch[1].trim();
      const name = scMatch[2].trim();
      const body = scMatch[3].trim();
      scenarios.push({ id, name, raw: body });
    }

    return { requirements, scenarios };
  }

  /**
   * Parses exported declarations, class methods, and functions from source code.
   * @param {string} sourceCode
   * @returns {object}
   */
  parseCodeDeclarations(sourceCode = '') {
    const declarations = [];
    const lines = sourceCode.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Export class Name
      const classMatch = trimmed.match(/^export\s+class\s+([A-Za-z0-9_$]+)/);
      if (classMatch) {
        declarations.push({ type: 'CLASS', name: classMatch[1] });
        continue;
      }

      // Export function name / async function name
      const fnMatch = trimmed.match(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
      if (fnMatch) {
        declarations.push({ type: 'FUNCTION', name: fnMatch[1] });
        continue;
      }

      // Class method: (async ) methodName(...)
      const methodMatch = trimmed.match(/^(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{?/);
      if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodMatch[1])) {
        declarations.push({ type: 'METHOD', name: methodMatch[1] });
        continue;
      }

      // Export const/let
      const constMatch = trimmed.match(/^export\s+const\s+([A-Za-z0-9_$]+)/);
      if (constMatch) {
        declarations.push({ type: 'CONSTANT', name: constMatch[1] });
      }
    }

    return { declarations };
  }

  /**
   * Compares specification requirements with source code declarations.
   * @param {string} specMarkdown
   * @param {string} sourceCode
   * @returns {object}
   */
  detectDrift(specMarkdown = '', sourceCode = '') {
    const spec = this.parseSpecRequirements(specMarkdown);
    const code = this.parseCodeDeclarations(sourceCode);

    // Build specific requirement keywords corpus
    const reqTokens = spec.requirements.map(r => 
      r.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2)
    );

    const matchedDeclarations = [];
    const untrackedDeclarations = [];

    for (const decl of code.declarations) {
      if (decl.type === 'CLASS') {
        matchedDeclarations.push(decl);
        continue;
      }

      // Tokenize declaration name (e.g. processCharge -> ['process', 'charge'])
      const declTokens = decl.name
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(w => w.length > 2);

      // Check if primary action verb/noun matches any requirement
      const matchesRequirement = reqTokens.some(reqWords => 
        declTokens.some(dt => reqWords.includes(dt))
      );

      if (matchesRequirement) {
        matchedDeclarations.push(decl);
      } else {
        untrackedDeclarations.push(decl);
      }
    }

    const isAligned = untrackedDeclarations.length === 0;
    const status = isAligned ? 'PARITY_VERIFIED' : 'UNTRACKED_CODE_DRIFT';

    return {
      status,
      isAligned,
      driftCount: untrackedDeclarations.length,
      matchedCount: matchedDeclarations.length,
      untrackedDeclarations,
      matchedDeclarations,
      specSummary: {
        totalRequirements: spec.requirements.length,
        totalScenarios: spec.scenarios.length
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a formal Delta-Spec proposal when untracked drift is detected.
   * @param {object} driftResult Result from detectDrift()
   * @param {object} [options] Context options (specId, targetModule)
   * @returns {object}
   */
  generateDeltaSpecProposal(driftResult, options = {}) {
    const specId = options.specId || 'SPEC-UNBOUND';
    const targetModule = options.targetModule || 'unknown.js';
    const deltaId = `DELTA-${Date.now()}`;

    const missingRequirementsText = driftResult.untrackedDeclarations.map((decl, idx) => `
### FR-DELTA-00${idx + 1}: Support for ${decl.name} (${decl.type})
- CUANDO el consumidor invoque \`${decl.name}\`, EL SISTEMA ejecutará la capacidad manteniendo el estado consistente.
`).join('\n');

    const proposalText = `
# DELTA-SPEC PROPOSAL: ${specId}

* **Delta ID:** \`${deltaId}\`
* **Target Module:** \`${targetModule}\`
* **Classification:** \`SPEC_DRIFT_SYNCHRONIZATION\`
* **Generated At:** \`${new Date().toISOString()}\`

---

## 1. Justification of Code Drift
The following code declarations were discovered in \`${targetModule}\` without a registered requirement in \`${specId}\`:

${driftResult.untrackedDeclarations.map(d => `- \`${d.type}\` **${d.name}**`).join('\n')}

---

## 2. Proposed Functional Requirements (EARS)

${missingRequirementsText}

---

## 3. Human Architect Approval Gate
- [ ] Approved by Product Owner / System Architect
- [ ] Specification merged into \`${specId}\`
`.trim();

    const sha256 = crypto.createHash('sha256').update(proposalText).digest('hex');

    return {
      deltaId,
      specId,
      targetModule,
      proposalText,
      sha256: `sha256-${sha256}`,
      generatedAt: new Date().toISOString()
    };
  }
}
