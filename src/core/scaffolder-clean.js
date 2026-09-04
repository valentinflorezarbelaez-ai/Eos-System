/**
 * @module EOSScaffolderClean
 * @description Atomic Clean Architecture Scaffolder for EOS.
 * Governed strictly by EOSProcessGovernor to guarantee fault isolation,
 * ledger cryptographic sealing, and automated ontology graph registration.
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolveControlPlaneRoot } from './runtime/control-plane-root.js';
import { EOSKernel } from './kernel.js';
import { EOSProcessGovernor } from './process-governor.js';
import { EOSKnowledgeOntology } from './knowledge-ontology.js';

export class EOSScaffolderClean {
  /**
   * @param {object} [options]
   * @param {string} [options.rootPath]
   * @param {EOSKernel} [options.kernel]
   * @param {EOSProcessGovernor} [options.governor]
   * @param {EOSKnowledgeOntology} [options.ontology]
   */
  constructor(options = {}) {
    this.rootPath = options.rootPath || resolveControlPlaneRoot() || process.cwd();
    this.specsDir = path.join(this.rootPath, 'docs', 'specs');
    this.srcDir = path.join(this.rootPath, 'src', 'core');
    this.testsDir = path.join(this.rootPath, 'tests');

    this.kernel = options.kernel || new EOSKernel({ rootPath: this.rootPath });
    this.governor = options.governor || new EOSProcessGovernor();
    this.ontology = options.ontology || new EOSKnowledgeOntology();

    // Preload foundational core kernel node in ontology
    if (!this.ontology.nodos.has('CORE-KERNEL')) {
      try {
        this.ontology.registrarNodo('CORE-KERNEL', 'ARCHITECTURE', { layer: 'CORE' });
      } catch {}
    }
  }

  /**
   * Generates the atomic development triad, seals the ledger, and auto-registers in ontology under Governor supervision
   * @param {string} nombreComponente - Component name in kebab-case (e.g. 'telemetry-logger')
   * @returns {Promise<object>}
   */
  async generarEstructuraModulo(nombreComponente) {
    if (!nombreComponente || typeof nombreComponente !== 'string' || !/^[a-z0-9-]+$/.test(nombreComponente.trim())) {
      throw new Error('🚨 SCAFFOLDER FAULT: Nombre de componente inválido. Debe usar notación kebab-case estricta.');
    }

    const cleanName = nombreComponente.trim();
    const idOperacion = `SCAFFOLD-EMISSION-${cleanName.toUpperCase()}`;

    // Canalizamos todo el ciclo de vida a través del Árbitro del Proceso Perfecto
    const resultadoGobernado = await this.governor.ejecutarProcesoPerfecto(idOperacion, async () => {
      const specPath = path.join(this.specsDir, `${cleanName}_spec.md`);
      const srcPath = path.join(this.srcDir, `${cleanName}.js`);
      const testPath = path.join(this.testsDir, `${cleanName}.test.js`);

      if (fs.existsSync(specPath) || fs.existsSync(srcPath) || fs.existsSync(testPath)) {
        throw new Error(`SCAFFOLDER VIOLATION: El componente [${cleanName}] ya existe en la materia.`);
      }

      // 1. Consolidación física de la tríada inseparacional
      fs.mkdirSync(this.specsDir, { recursive: true });
      fs.mkdirSync(this.srcDir, { recursive: true });
      fs.mkdirSync(this.testsDir, { recursive: true });

      const className = `EOS${this._toPascalCase(cleanName)}`;

      const specContent = [
        `# LIVING SPEC: ${cleanName.toUpperCase()}`,
        `**ID de Misión:** \`MIS-${cleanName.toUpperCase()}-001\``,
        `**Estado:** \`SPECIFICATION_APPROVED\``,
        '',
        '## 1. Requerimientos Funcionales en Sintaxis EARS',
        `- **CUANDO** el usuario o agente invoque \`${className}\`, **EL SISTEMA DEBE** procesar la solicitud conforme a las invariantes.`,
        `- **SI** se detecta una anomalía de entrada, **ENTONCES EL SISTEMA DEBE** abortar de forma segura sin mutaciones residuales.`,
        '',
        '## 2. Criterios de Aceptación BDD',
        '```gherkin',
        `ESCENARIO: Ejecución nominal de ${className}`,
        '  DADO un estado inicial verificado',
        '  CUANDO se invoca la operación',
        '  ENTONCES el resultado es exitoso',
        '```',
        ''
      ].join('\n');
      fs.writeFileSync(specPath, specContent, 'utf-8');

      const srcContent = [
        `/**`,
        ` * @module ${className}`,
        ` * @description Hexagonal Clean Architecture component for ${cleanName}.`,
        ` */`,
        '',
        `export class ${className} {`,
        `  constructor(options = {}) {`,
        `    this.name = '${className}';`,
        `  }`,
        `}`,
        ''
      ].join('\n');
      fs.writeFileSync(srcPath, srcContent, 'utf-8');

      const testContent = [
        `import test from 'node:test';`,
        `import assert from 'node:assert/strict';`,
        `import { ${className} } from '../src/core/${cleanName}.js';`,
        '',
        `test('${className}: instantiates with nominal defaults', () => {`,
        `  const instance = new ${className}();`,
        `  assert.equal(instance.name, '${className}');`,
        `});`,
        ''
      ].join('\n');
      fs.writeFileSync(testPath, testContent, 'utf-8');

      console.log(`🔧 [EOS SCAFFOLDER] > Tríada consolidada localmente para: ${cleanName}`);

      // 2. Sello telemétrico inmutable en el Ledger
      const metadataEmanacion = {
        componente: cleanName,
        clase: 'SCAFFOLD_EMISSION',
        rutas: { specPath, srcPath, testPath }
      };
      const transaccionLedger = await this.kernel.registrarTransaccionLedger(idOperacion, metadataEmanacion);
      const hashLedger = transaccionLedger.registro ? transaccionLedger.registro.hash : transaccionLedger.hash;

      // 3. Auto-registro en la Ontología de Conocimiento
      const idNodoNuevo = `SRC-CORE-${cleanName.toUpperCase()}`;
      this.ontology.registrarNodo(idNodoNuevo, 'ARCHITECTURE', { rutas: metadataEmanacion.rutas });

      if (!this.ontology.nodos.has('CORE-KERNEL')) {
        this.ontology.registrarNodo('CORE-KERNEL', 'ARCHITECTURE', { layer: 'CORE' });
      }
      this.ontology.crearEnlace(idNodoNuevo, 'CORE-KERNEL', 'DEPENDS_ON');

      return {
        componente: cleanName,
        idNodo: idNodoNuevo,
        hashLedger,
        rutas: { specPath, srcPath, testPath }
      };
    });

    if (resultadoGobernado.estatus === 'REJECTED_BY_GOVERNANCE') {
      throw new Error(`🚨 SCAFFOLDER PANIC: Operación denegada por el Gobernador de Procesos: ${resultadoGobernado.motivo}`);
    }

    return resultadoGobernado;
  }

  // Alias con tilde para compatibilidad
  async generarEstructuraMódulo(nombreComponente) {
    return this.generarEstructuraModulo(nombreComponente);
  }

  _toPascalCase(str) {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }
}
