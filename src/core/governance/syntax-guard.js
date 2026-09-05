/**
 * @module SyntaxGuard
 * @version 1.0.0
 * @description Boris Cherny Post-Tool-Use Syntax Guard for EOS (Pure L0).
 * Re-validates file syntax and AST integrity immediately after edits to prevent cascading defects.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';

export class SyntaxGuard {
  /**
   * Validates syntax of a given file by extension.
   * @param {string} filePath - Absolute or relative path to file.
   * @returns {{ valid: boolean, error: string|null, filePath: string, language: string }}
   */
  validateFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `File does not exist: ${filePath}`, filePath, language: 'unknown' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    return this.validateContent(content, ext, filePath);
  }

  /**
   * Validates syntax of raw content based on extension.
   * @param {string} content
   * @param {string} ext
   * @param {string} [filename='unknown']
   * @returns {{ valid: boolean, error: string|null, filePath: string, language: string }}
   */
  validateContent(content, ext, filename = 'inline') {
    switch (ext) {
      case '.json':
        return this.validateJSON(content, filename);
      case '.js':
      case '.mjs':
      case '.cjs':
        return this.validateJavaScript(content, filename);
      case '.md':
      case '.mdc':
        return this.validateMarkdown(content, filename);
      case '.py':
        return this.validatePython(filename);
      default:
        // Unsupported or arbitrary text format, pass as non-blocking
        return { valid: true, error: null, filePath: filename, language: ext || 'text' };
    }
  }

  /**
   * @private
   */
  validateJSON(content, filename) {
    try {
      JSON.parse(content);
      return { valid: true, error: null, filePath: filename, language: 'json' };
    } catch (err) {
      return { valid: false, error: `JSON Parse Error: ${err.message}`, filePath: filename, language: 'json' };
    }
  }

  /**
   * @private
   */
  validateJavaScript(content, filename) {
    try {
      // vm.Script validates JS syntax without executing side effects
      new vm.Script(content, { filename });
      return { valid: true, error: null, filePath: filename, language: 'javascript' };
    } catch (err) {
      return { valid: false, error: `JavaScript Syntax Error: ${err.message}`, filePath: filename, language: 'javascript' };
    }
  }

  /**
   * @private
   */
  validateMarkdown(content, filename) {
    // Check YAML frontmatter delimiter balance if present
    if (content.startsWith('---')) {
      const secondDelim = content.indexOf('\n---', 3);
      if (secondDelim === -1) {
        return { valid: false, error: 'Unclosed YAML frontmatter: missing closing "---"', filePath: filename, language: 'markdown' };
      }
    }
    return { valid: true, error: null, filePath: filename, language: 'markdown' };
  }

  /**
   * @private
   */
  validatePython(filename) {
    if (filename === 'inline' || !fs.existsSync(filename)) {
      return { valid: true, error: null, filePath: filename, language: 'python' };
    }

    try {
      execSync(`python -m py_compile "${filename}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5000
      });
      return { valid: true, error: null, filePath: filename, language: 'python' };
    } catch (err) {
      const msg = err.stderr ? err.stderr.trim() : err.message;
      return { valid: false, error: `Python Syntax Error: ${msg}`, filePath: filename, language: 'python' };
    }
  }

  /**
   * Validates an array of files.
   * @param {string[]} filePaths
   * @returns {{ allValid: boolean, results: Array<{ valid: boolean, error: string|null, filePath: string }> }}
   */
  validateFiles(filePaths = []) {
    const results = filePaths.map((fp) => this.validateFile(fp));
    const allValid = results.every((r) => r.valid);
    return { allValid, results };
  }
}
