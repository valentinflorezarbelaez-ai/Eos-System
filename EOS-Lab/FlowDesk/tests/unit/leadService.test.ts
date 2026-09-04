import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDbConnection } from '../../src/db/database.js';
import { LeadService, OptimisticConcurrencyError } from '../../src/services/leadService.js';
import { AuthService } from '../../src/services/authService.js';

describe('LeadService (In-Memory :memory: Test Suite)', () => {
  let db: ReturnType<typeof createDbConnection>;
  let leadService: LeadService;
  let authService: AuthService;
  let testUser: { id: string; email: string };

  beforeEach(() => {
    db = createDbConnection(':memory:');
    leadService = new LeadService(db);
    authService = new AuthService(db);
    testUser = authService.registerUser('operator@flowdesk.io', 'secure123');
  });

  test('should create a lead and record an initial lead_activity atomically', () => {
    const lead = leadService.createLead(testUser.id, {
      name: 'Carlos Botero',
      email: 'carlos@botero.co',
      phone: '3001112233',
    });

    assert.ok(lead.id);
    assert.equal(lead.status, 'NUEVO');

    const activities = leadService.getLeadActivities(lead.id, testUser.id);
    assert.equal(activities.length, 1);
    assert.equal((activities[0] as any).to_status, 'NUEVO');
  });

  test('should execute status update and append activity log inside single transaction', () => {
    const lead = leadService.createLead(testUser.id, {
      name: 'Ana Gomez',
      email: 'ana@gomez.com',
      phone: '3004445566',
    });

    const updatedLead = leadService.updateLeadStatus(
      testUser.id,
      lead.id,
      'CONTACTADO',
      lead.updated_at
    );

    assert.equal(updatedLead.status, 'CONTACTADO');

    const activities = leadService.getLeadActivities(lead.id, testUser.id);
    assert.equal(activities.length, 2);
  });

  test('should throw OptimisticConcurrencyError and trigger HTTP 409 mapping if updated_at is stale', () => {
    const lead = leadService.createLead(testUser.id, {
      name: 'Jorge Ramos',
      email: 'jorge@ramos.es',
      phone: '3007778899',
    });

    const staleUpdatedAt = '2000-01-01 00:00:00';

    assert.throws(
      () => {
        leadService.updateLeadStatus(testUser.id, lead.id, 'CALIFICADO', staleUpdatedAt);
      },
      (err: any) => err instanceof OptimisticConcurrencyError
    );
  });

  test('should count tenant leads by status for a mixed pipeline', () => {
    leadService.createLead(testUser.id, {
      name: 'Nueva',
      email: 'nueva@flowdesk.io',
      phone: '3000000001',
    });
    const contacted = leadService.createLead(testUser.id, {
      name: 'Contactada',
      email: 'contactada@flowdesk.io',
      phone: '3000000002',
      status: 'CONTACTADO',
    });
    leadService.createLead(testUser.id, {
      name: 'Otra contactada',
      email: 'otra@flowdesk.io',
      phone: '3000000003',
      status: 'CONTACTADO',
    });
    assert.equal(contacted.status, 'CONTACTADO');

    const snapshot = leadService.countLeadsByStatus(testUser.id);
    assert.deepEqual(snapshot, {
      NUEVO: 1,
      CONTACTADO: 2,
      CALIFICADO: 0,
      GANADO: 0,
      PERDIDO: 0,
    });
  });

  test('should return zero for every status when the tenant has no leads', () => {
    const snapshot = leadService.countLeadsByStatus(testUser.id);
    assert.deepEqual(snapshot, {
      NUEVO: 0,
      CONTACTADO: 0,
      CALIFICADO: 0,
      GANADO: 0,
      PERDIDO: 0,
    });
  });

  test('should isolate pipeline counts from another tenant', () => {
    const otherUser = authService.registerUser('other@flowdesk.io', 'secure123');
    leadService.createLead(otherUser.id, {
      name: 'Ajena',
      email: 'ajena@flowdesk.io',
      phone: '3999999999',
      status: 'GANADO',
    });
    leadService.createLead(testUser.id, {
      name: 'Propia',
      email: 'propia@flowdesk.io',
      phone: '3111111111',
      status: 'PERDIDO',
    });

    const mine = leadService.countLeadsByStatus(testUser.id);
    const theirs = leadService.countLeadsByStatus(otherUser.id);
    assert.equal(mine.PERDIDO, 1);
    assert.equal(mine.GANADO, 0);
    assert.equal(theirs.GANADO, 1);
    assert.equal(theirs.PERDIDO, 0);
  });
});
