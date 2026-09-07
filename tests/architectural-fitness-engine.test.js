import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ArchitecturalFitnessEngine,
  ARCHITECTURE_LAYERS
} from '../src/core/ast/architectural-fitness-engine.js';

test('ArchitecturalFitnessEngine — Fitness Function Test Suite', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-fitness-test-'));

  // -----------------------------------------------------------------------
  // Fixture: Clean Architecture project with NO violations
  // -----------------------------------------------------------------------
  const cleanProject = path.join(tmpBase, 'clean-project');
  fs.mkdirSync(path.join(cleanProject, 'src', 'domain', 'entities'), { recursive: true });
  fs.mkdirSync(path.join(cleanProject, 'src', 'application', 'use-cases'), { recursive: true });
  fs.mkdirSync(path.join(cleanProject, 'src', 'infrastructure', 'repositories'), { recursive: true });
  fs.mkdirSync(path.join(cleanProject, 'src', 'presentation', 'pages'), { recursive: true });

  // Domain entity (pure, no external imports)
  fs.writeFileSync(
    path.join(cleanProject, 'src', 'domain', 'entities', 'user.js'),
    `export class User {\n  constructor(name, email) {\n    this.name = name;\n    this.email = email;\n  }\n}\n`,
    'utf8'
  );

  // Application use case (imports domain only)
  fs.writeFileSync(
    path.join(cleanProject, 'src', 'application', 'use-cases', 'create-user.js'),
    `import { User } from '../../domain/entities/user.js';\nexport function createUser(name, email) { return new User(name, email); }\n`,
    'utf8'
  );

  // Infrastructure adapter (imports domain and application)
  fs.writeFileSync(
    path.join(cleanProject, 'src', 'infrastructure', 'repositories', 'user-repo.js'),
    `import { User } from '../../domain/entities/user.js';\nexport class UserRepository { save(user) { return user; } }\n`,
    'utf8'
  );

  // Presentation page (imports application)
  fs.writeFileSync(
    path.join(cleanProject, 'src', 'presentation', 'pages', 'user-page.js'),
    `import { createUser } from '../../application/use-cases/create-user.js';\nexport function render() { return createUser('A', 'a@b.c'); }\n`,
    'utf8'
  );

  // -----------------------------------------------------------------------
  // Fixture: Dirty project with VIOLATIONS
  // -----------------------------------------------------------------------
  const dirtyProject = path.join(tmpBase, 'dirty-project');
  fs.mkdirSync(path.join(dirtyProject, 'src', 'domain', 'entities'), { recursive: true });
  fs.mkdirSync(path.join(dirtyProject, 'src', 'application', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dirtyProject, 'src', 'infrastructure', 'database'), { recursive: true });
  fs.mkdirSync(path.join(dirtyProject, 'src', 'presentation', 'components'), { recursive: true });

  // VIOLATION 1: Domain entity imports from infrastructure (Prisma ORM)
  fs.writeFileSync(
    path.join(dirtyProject, 'src', 'domain', 'entities', 'order.js'),
    `import { PrismaClient } from '@prisma/client';\nexport class Order { constructor() { this.db = new PrismaClient(); } }\n`,
    'utf8'
  );

  // VIOLATION 2: Domain entity imports from presentation (React)
  fs.writeFileSync(
    path.join(dirtyProject, 'src', 'domain', 'entities', 'product.js'),
    `import React from 'react';\nexport class Product { render() { return React.createElement('div'); } }\n`,
    'utf8'
  );

  // VIOLATION 3: Application service imports from presentation (next/router)
  fs.writeFileSync(
    path.join(dirtyProject, 'src', 'application', 'services', 'navigation.js'),
    `import { useRouter } from 'next/router';\nexport function navigate(path) { useRouter().push(path); }\n`,
    'utf8'
  );

  // Clean: Infrastructure importing domain (allowed)
  fs.writeFileSync(
    path.join(dirtyProject, 'src', 'infrastructure', 'database', 'order-repo.js'),
    `import { Order } from '../../domain/entities/order.js';\nexport class OrderRepo { find() { return new Order(); } }\n`,
    'utf8'
  );

  // Clean: Presentation importing application (allowed)
  fs.writeFileSync(
    path.join(dirtyProject, 'src', 'presentation', 'components', 'order-view.js'),
    `import { navigate } from '../../application/services/navigation.js';\nexport function view() { navigate('/orders'); }\n`,
    'utf8'
  );

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------
  await t.test('classifies file paths into correct architectural layers', () => {
    const engine = new ArchitecturalFitnessEngine();
    assert.equal(engine.classifyLayer('src/domain/entities/user.js'), ARCHITECTURE_LAYERS.L0_DOMAIN);
    assert.equal(engine.classifyLayer('src/application/use-cases/create-user.js'), ARCHITECTURE_LAYERS.L1_APPLICATION);
    assert.equal(engine.classifyLayer('src/infrastructure/repositories/user-repo.js'), ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE);
    assert.equal(engine.classifyLayer('src/presentation/pages/user-page.js'), ARCHITECTURE_LAYERS.L3_PRESENTATION);
    assert.equal(engine.classifyLayer('src/utils/helpers.js'), ARCHITECTURE_LAYERS.UNKNOWN);
  });

  await t.test('clean project passes fitness audit with score 100 and zero violations', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: cleanProject });
    const report = engine.audit(cleanProject);

    assert.equal(report.status, 'CLEAN');
    assert.equal(report.fitness_score, 100);
    assert.equal(report.violations_count, 0);
    assert.equal(report.violations.length, 0);
    assert.ok(report.total_files_analyzed >= 4);
    assert.ok(report.sha256);
  });

  await t.test('dirty project detects all dependency rule violations', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: dirtyProject });
    const report = engine.audit(dirtyProject);

    assert.equal(report.status, 'CRITICAL_VIOLATIONS');
    assert.ok(report.fitness_score < 100);
    assert.ok(report.violations_count >= 3);

    // Violation 1: Domain -> Infrastructure (@prisma/client)
    const prismaViolation = report.violations.find(v =>
      v.file.includes('order.js') && v.import_specifier === '@prisma/client'
    );
    assert.ok(prismaViolation, 'Should detect domain importing @prisma/client');
    assert.equal(prismaViolation.source_layer, ARCHITECTURE_LAYERS.L0_DOMAIN);
    assert.equal(prismaViolation.target_layer, ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE);
    assert.equal(prismaViolation.severity, 'CRITICAL');

    // Violation 2: Domain -> Presentation (react)
    const reactViolation = report.violations.find(v =>
      v.file.includes('product.js') && v.import_specifier === 'react'
    );
    assert.ok(reactViolation, 'Should detect domain importing react');
    assert.equal(reactViolation.source_layer, ARCHITECTURE_LAYERS.L0_DOMAIN);
    assert.equal(reactViolation.target_layer, ARCHITECTURE_LAYERS.L3_PRESENTATION);
    assert.equal(reactViolation.severity, 'CRITICAL');

    // Violation 3: Application -> Presentation (next/router)
    const routerViolation = report.violations.find(v =>
      v.file.includes('navigation.js') && v.import_specifier === 'next/router'
    );
    assert.ok(routerViolation, 'Should detect application importing next/router');
    assert.equal(routerViolation.source_layer, ARCHITECTURE_LAYERS.L1_APPLICATION);
    assert.equal(routerViolation.target_layer, ARCHITECTURE_LAYERS.L3_PRESENTATION);
    assert.equal(routerViolation.severity, 'HIGH');
  });

  await t.test('does not flag valid cross-layer imports as violations', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: dirtyProject });
    const report = engine.audit(dirtyProject);

    // Infrastructure -> Domain is ALLOWED
    const infraViolations = report.violations.filter(v =>
      v.file.includes('order-repo.js')
    );
    assert.equal(infraViolations.length, 0, 'Infrastructure importing Domain MUST NOT be a violation');

    // Presentation -> Application is ALLOWED
    const presViolations = report.violations.filter(v =>
      v.file.includes('order-view.js')
    );
    assert.equal(presViolations.length, 0, 'Presentation importing Application MUST NOT be a violation');
  });

  await t.test('formatReport produces readable ASCII output', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: dirtyProject });
    const report = engine.audit(dirtyProject);
    const formatted = engine.formatReport(report);

    assert.ok(formatted.includes('EOS ARCHITECTURAL FITNESS AUDIT'));
    assert.ok(formatted.includes('Fitness Score'));
    assert.ok(formatted.includes('LAYER DISTRIBUTION'));
    assert.ok(formatted.includes('VIOLATIONS'));
    assert.ok(formatted.includes('@prisma/client'));
  });

  await t.test('clean project formatReport shows zero violations message', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: cleanProject });
    const report = engine.audit(cleanProject);
    const formatted = engine.formatReport(report);

    assert.ok(formatted.includes('ZERO BOUNDARY VIOLATIONS'));
  });

  await t.test('layer distribution counts are accurate', () => {
    const engine = new ArchitecturalFitnessEngine({ baseDir: cleanProject });
    const report = engine.audit(cleanProject);

    assert.ok(report.layer_distribution[ARCHITECTURE_LAYERS.L0_DOMAIN] >= 1);
    assert.ok(report.layer_distribution[ARCHITECTURE_LAYERS.L1_APPLICATION] >= 1);
    assert.ok(report.layer_distribution[ARCHITECTURE_LAYERS.L2_INFRASTRUCTURE] >= 1);
    assert.ok(report.layer_distribution[ARCHITECTURE_LAYERS.L3_PRESENTATION] >= 1);
  });
});
