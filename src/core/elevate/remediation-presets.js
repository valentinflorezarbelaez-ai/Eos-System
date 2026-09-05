/**
 * @module RemediationPresets
 * @description Catalog of surgical code transformers and reproduction test generators
 * for autonomous self-healing of code violations detected by ScannerCouncil.
 */

export const RemediationPresets = {
  /**
   * Fixes empty catch blocks by injecting structured error logging
   */
  'QUAL-EMPTY-CATCH': {
    name: 'Auto-Fix Empty Catch Block',
    vector: 'quality',
    canApply(finding) {
      return (
        finding.ruleId === 'QUAL-EMPTY-CATCH' ||
        (finding.vector === 'quality' && /empty catch/i.test(finding.message))
      );
    },
    apply(code) {
      // Replaces catch (err) {} or catch {} with structured handling
      return code.replace(
        /catch\s*(?:\(([^)]+)\))?\s*\{\s*\}/g,
        (match, errVar) => {
          const variable = errVar ? errVar.trim() : 'error';
          return `catch (${variable}) { console.error('[EOS-AUTO-HEALED]:', ${variable}); }`;
        }
      );
    },
    generateTest(file, finding) {
      return `
        const fs = require('node:fs');
        const content = fs.readFileSync("${file.replace(/\\/g, '\\\\')}", 'utf8');
        const emptyCatch = /catch\\s*(?:\\([^)]+\\))?\\s*\\{\\s*\\}/.test(content);
        if (emptyCatch) {
          console.error('FAIL: Empty catch block detected');
          process.exit(1);
        }
        console.log('PASS: Empty catch block successfully remediated');
        process.exit(0);
      `;
    }
  },

  /**
   * Fixes images missing alt attributes for WCAG AA compliance
   */
  'A11Y-IMG-NO-ALT': {
    name: 'Auto-Fix Missing Image Alt Attribute',
    vector: 'accessibility',
    canApply(finding) {
      return (
        finding.ruleId === 'A11Y-IMG-NO-ALT' ||
        (finding.vector === 'accessibility' && /alt attribute/i.test(finding.message))
      );
    },
    apply(code) {
      return code.replace(/<img\s+(?![^>]*\balt=)([^>]*?)>/gi, (match, attrs) => {
        return `<img alt="" ${attrs.trim()}>`;
      });
    },
    generateTest(file, finding) {
      return `
        const fs = require('node:fs');
        const content = fs.readFileSync("${file.replace(/\\/g, '\\\\')}", 'utf8');
        const missingAlt = /<img\\s+(?![^>]*\\balt=)/i.test(content);
        if (missingAlt) {
          console.error('FAIL: Image without alt attribute found');
          process.exit(1);
        }
        console.log('PASS: Image alt attributes verified');
        process.exit(0);
      `;
    }
  },

  /**
   * Fixes empty buttons by adding aria-label
   */
  'A11Y-EMPTY-BUTTON': {
    name: 'Auto-Fix Empty Button Accessible Name',
    vector: 'accessibility',
    canApply(finding) {
      return (
        finding.ruleId === 'A11Y-EMPTY-BUTTON' ||
        (finding.vector === 'accessibility' && /empty button/i.test(finding.message))
      );
    },
    apply(code) {
      return code.replace(/<button\s*(?![^>]*\baria-label=)([^>]*)>\s*<\/button>/gi, (match, attrs) => {
        const cleanAttrs = attrs.trim() ? ` ${attrs.trim()}` : '';
        return `<button${cleanAttrs} aria-label="Action"></button>`;
      });
    },
    generateTest(file, finding) {
      return `
        const fs = require('node:fs');
        const content = fs.readFileSync("${file.replace(/\\/g, '\\\\')}", 'utf8');
        const emptyButtonNoAria = /<button\\s*(?![^>]*\\baria-label=)[^>]*>\\s*<\\/button>/i.test(content);
        if (emptyButtonNoAria) {
          console.error('FAIL: Button without text or aria-label found');
          process.exit(1);
        }
        console.log('PASS: Button accessibility verified');
        process.exit(0);
      `;
    }
  },

  /**
   * Fixes synchronous blocking I/O by replacing with async counterparts
   */
  'PERF-BLOCKING-SYNC-IO': {
    name: 'Auto-Fix Synchronous I/O',
    vector: 'performance',
    canApply(finding) {
      return (
        finding.ruleId === 'PERF-BLOCKING-SYNC-IO' ||
        (finding.vector === 'performance' && /synchronous i\/o/i.test(finding.message))
      );
    },
    apply(code) {
      let patched = code.replace(/fs\.readFileSync\s*\(/g, 'await fs.promises.readFile(');
      patched = patched.replace(/fs\.writeFileSync\s*\(/g, 'await fs.promises.writeFile(');
      return patched;
    },
    generateTest(file, finding) {
      return `
        const fs = require('node:fs');
        const content = fs.readFileSync("${file.replace(/\\/g, '\\\\')}", 'utf8');
        const hasSync = /fs\\.(?:readFileSync|writeFileSync)/.test(content);
        if (hasSync) {
          console.error('FAIL: Blocking synchronous I/O still present');
          process.exit(1);
        }
        console.log('PASS: Synchronous I/O converted to async');
        process.exit(0);
      `;
    }
  }
};

/**
 * Finds a matching remediation preset for a given finding
 * @param {object} finding
 * @returns {object|null}
 */
export function resolvePreset(finding) {
  if (!finding) return null;
  if (finding.ruleId && RemediationPresets[finding.ruleId]) {
    return RemediationPresets[finding.ruleId];
  }
  for (const preset of Object.values(RemediationPresets)) {
    if (preset.canApply(finding)) {
      return preset;
    }
  }
  return null;
}
