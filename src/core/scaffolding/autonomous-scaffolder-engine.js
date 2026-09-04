/**
 * @module AutonomousScaffolderEngine
 * @description Generates pure Clean/Hexagonal/Screaming Architecture modules
 * following Gentleman Programming and DDD principles. Enforces dependency rule invariants.
 */

import { createHash, randomBytes } from 'node:crypto';

export class AutonomousScaffolderEngine {
  constructor(options = {}) {
    this.scaffoldHistory = [];
  }

  /**
   * Generates a complete hexagonal module scaffold for an entity and its use cases
   * @param {object} params
   * @param {string} params.moduleName e.g. "auth" or "billing"
   * @param {string} params.entityName e.g. "User" or "Invoice"
   * @param {Array<string>} [params.properties] e.g. ["id", "email", "status"]
   * @param {Array<string>} [params.useCases] e.g. ["CreateUser", "GetUserById"]
   * @returns {Array<object>} Array of generated files { path, content, layer }
   */
  generateHexagonalModule(params = {}) {
    const {
      moduleName = 'core',
      entityName = 'Item',
      properties = ['id', 'name', 'createdAt'],
      useCases = [`Create${entityName}`, `Get${entityName}ById`]
    } = params;

    const lowerEntity = entityName.toLowerCase();
    const kebabEntity = entityName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const files = [];

    // 1. Domain Entity
    const entityPath = `src/modules/${moduleName}/domain/entities/${kebabEntity}.js`;
    const entityContent = `/**
 * @module ${entityName}Entity
 * @layer Domain
 */

export class ${entityName} {
  constructor(data = {}) {
    ${properties.map(p => `this.${p} = data.${p} !== undefined ? data.${p} : null;`).join('\n    ')}
    this.validate();
  }

  validate() {
    if (!this.id) {
      throw new Error('${entityName.toUpperCase()}_VALIDATION_ERROR: id is required');
    }
  }
}
`;
    files.push({ path: entityPath, content: entityContent, layer: 'domain' });

    // 2. Domain Repository Port (Interface)
    const portPath = `src/modules/${moduleName}/domain/ports/${kebabEntity}-repository-port.js`;
    const portContent = `/**
 * @interface ${entityName}RepositoryPort
 * @layer Domain (Outbound Port)
 */

export class ${entityName}RepositoryPort {
  async save(entity) { throw new Error('METHOD_NOT_IMPLEMENTED'); }
  async findById(id) { throw new Error('METHOD_NOT_IMPLEMENTED'); }
}
`;
    files.push({ path: portPath, content: portContent, layer: 'domain' });

    // 3. Application Use Cases
    for (const uc of useCases) {
      const kebabUc = uc.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      const ucPath = `src/modules/${moduleName}/application/use-cases/${kebabUc}.js`;
      const ucContent = `/**
 * @module ${uc}UseCase
 * @layer Application
 */

import { ${entityName} } from '../../domain/entities/${kebabEntity}.js';

export class ${uc} {
  constructor(repository) {
    if (!repository) throw new Error('${uc.toUpperCase()}_ERROR: repository dependency is required');
    this.repository = repository;
  }

  async execute(input = {}) {
    const entity = new ${entityName}(input);
    await this.repository.save(entity);
    return entity;
  }
}
`;
      files.push({ path: ucPath, content: ucContent, layer: 'application' });

      // 4. Unit Test for Use Case (TDD Boilerplate)
      const testPath = `tests/modules/${moduleName}/${kebabUc}.test.js`;
      const testContent = `import test from 'node:test';
import assert from 'node:assert/strict';

import { ${uc} } from '../../../src/modules/${moduleName}/application/use-cases/${kebabUc}.js';
import { InMemory${entityName}Repository } from '../../../src/modules/${moduleName}/infrastructure/adapters/in-memory-${kebabEntity}-repository.js';

test('TDD: ${uc} executes successfully with mock repository', async () => {
  const repo = new InMemory${entityName}Repository();
  const useCase = new ${uc}(repo);

  const result = await useCase.execute({ id: 'test-1', name: 'Sample' });
  assert.equal(result.id, 'test-1');
  const found = await repo.findById('test-1');
  assert.equal(found.id, 'test-1');
});
`;
      files.push({ path: testPath, content: testContent, layer: 'tests' });
    }

    // 5. Infrastructure In-Memory Adapter
    const adapterPath = `src/modules/${moduleName}/infrastructure/adapters/in-memory-${kebabEntity}-repository.js`;
    const adapterContent = `/**
 * @module InMemory${entityName}Repository
 * @layer Infrastructure
 */

import { ${entityName}RepositoryPort } from '../../domain/ports/${kebabEntity}-repository-port.js';

export class InMemory${entityName}Repository extends ${entityName}RepositoryPort {
  constructor() {
    super();
    this.items = new Map();
  }

  async save(entity) {
    this.items.set(entity.id, entity);
    return entity;
  }

  async findById(id) {
    return this.items.get(id) || null;
  }
}
`;
    files.push({ path: adapterPath, content: adapterContent, layer: 'infrastructure' });

    this.validateLayerDependencies(files);
    return files;
  }

  /**
   * Validates Clean Architecture dependency rule: Domain cannot import from Application or Infrastructure
   * @param {Array<object>} files
   */
  validateLayerDependencies(files = []) {
    for (const f of files) {
      if (f.layer === 'domain') {
        if (f.content.includes('/application/') || f.content.includes('/infrastructure/')) {
          throw new Error(`CLEAN_ARCHITECTURE_VIOLATION: Domain file ${f.path} must not import outer layers`);
        }
      }
      if (f.layer === 'application') {
        if (f.content.includes('/infrastructure/')) {
          throw new Error(`CLEAN_ARCHITECTURE_VIOLATION: Application file ${f.path} must not import Infrastructure directly`);
        }
      }
    }
    return true;
  }
}
