import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * EOS Holy Triamazikamno Validator - L0 (Node built-ins only)
 * Asserts the absolute balance of the three primary forces before permitting stable manifestation.
 * Forces the presence of Spec (Affirm), Test (Deny), and Code (Conciliate).
 */
export class EOSTriamazikamnoValidator {
  constructor(config = {}) {
    this.rootPath = config.rootPath || process.cwd();
  }

  #computeHash(filePath) {
    const buffer = fs.readFileSync(filePath);
    return `sha256-${crypto.createHash('sha256').update(buffer).digest('hex')}`;
  }

  /**
   * Asserts the mathematical and structural balance of an artifact triad.
   * @param {string} componentName Kebab-case name of the component (e.g., 'ledger-recovery').
   * @returns {Readonly<object>}
   */
  validateTriadBalance(componentName) {
    if (!componentName || typeof componentName !== 'string' || !/^[a-z0-9-]+$/.test(componentName)) {
      throw new Error('GOVERNANCE FAULT: Component name must adhere to strict kebab-case format.');
    }

    const specPath = path.join(this.rootPath, 'docs', 'specs', `${componentName}_spec.md`);
    const srcPath = path.join(this.rootPath, 'src', 'core', 'runtime', `${componentName}.js`);
    const legacySrcPath = path.join(this.rootPath, 'src', 'core', `${componentName}.js`);
    const testPath = path.join(this.rootPath, 'tests', `${componentName}.test.js`);

    const finalSrcPath = fs.existsSync(srcPath) ? srcPath : legacySrcPath;

    // 1. Fuerza 1: Santo Afirmar (La Intención / Spec)
    if (!fs.existsSync(specPath)) {
      throw new Error(`UNBALANCED_CREATIONAL_TRIAD: Holy Affirm force missing. Specification file not found at: ${specPath}`);
    }

    // 2. Fuerza 2: Santo Negar (La Resistencia / Test)
    if (!fs.existsSync(testPath)) {
      throw new Error(`UNBALANCED_CREATIONAL_TRIAD: Holy Deny force missing. Test suite file not found at: ${testPath}`);
    }

    // 3. Fuerza 3: Santo Conciliar (La Manifestación / Código de Producción)
    if (!fs.existsSync(finalSrcPath)) {
      throw new Error(`UNBALANCED_CREATIONAL_TRIAD: Holy Conciliate force missing. Production source file not found at: ${finalSrcPath}`);
    }

    const specHash = this.#computeHash(specPath);
    const srcHash = this.#computeHash(finalSrcPath);
    const testHash = this.#computeHash(testPath);

    const triadReceipt = {
      status: 'TRIAD_PERFECTLY_BALANCED',
      timestamp: new Date().toISOString(),
      component: componentName,
      forces: {
        affirm: { path: specPath, sha256: specHash },
        deny: { path: testPath, sha256: testHash },
        conciliate: { path: finalSrcPath, sha256: srcHash }
      }
    };

    const receiptMaterial = JSON.stringify({ componentName, specHash, srcHash, testHash });
    triadReceipt.triadChainHash = `sha256-${crypto.createHash('sha256').update(receiptMaterial).digest('hex')}`;

    return Object.freeze(triadReceipt);
  }
}
