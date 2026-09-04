import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'crypto';

export type LeadStatus = 'NUEVO' | 'CONTACTADO' | 'CALIFICADO' | 'GANADO' | 'PERDIDO';

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export class OptimisticConcurrencyError extends Error {
  constructor(message: string = 'The record was modified by another operator. Please refresh.') {
    super(message);
    this.name = 'OptimisticConcurrencyError';
  }
}

export class LeadService {
  private lastTime = 0;

  constructor(private db: DatabaseSync) {}

  private nowIso(): string {
    let now = Date.now();
    if (now <= this.lastTime) {
      now = this.lastTime + 1;
    }
    this.lastTime = now;
    return new Date(now).toISOString();
  }

  createLead(userId: string, data: { name: string; email: string; phone: string; status?: LeadStatus; notes?: string }): Lead {
    const id = randomUUID();
    const status: LeadStatus = data.status || 'NUEVO';
    const notes = data.notes || null;
    const now = this.nowIso();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO leads (id, user_id, name, email, phone, status, notes, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, data.name, data.email, data.phone, status, notes, now, now);

      const activityStmt = this.db.prepare(`
        INSERT INTO lead_activities (id, lead_id, user_id, from_status, to_status, created_at)
        VALUES (?, ?, ?, NULL, ?, ?)
      `);
      activityStmt.run(randomUUID(), id, userId, status, now);
      
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    return this.getLeadById(id, userId)!;
  }

  getLeads(userId: string, filterStatus?: LeadStatus, searchQuery?: string): Lead[] {
    let query = `SELECT * FROM leads WHERE user_id = ?`;
    const params: any[] = [userId];

    if (filterStatus) {
      query += ` AND status = ?`;
      params.push(filterStatus);
    }

    if (searchQuery) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      const term = `%${searchQuery}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY updated_at DESC`;
    return this.db.prepare(query).all(...params) as unknown as Lead[];
  }

  getLeadById(id: string, userId: string): Lead | null {
    const stmt = this.db.prepare(`SELECT * FROM leads WHERE id = ? AND user_id = ?`);
    const lead = stmt.get(id, userId) as unknown as Lead | undefined;
    return lead || null;
  }

  updateLeadStatus(
    userId: string,
    leadId: string,
    newStatus: LeadStatus,
    expectedUpdatedAt: string,
    notes?: string
  ): Lead {
    const currentLead = this.getLeadById(leadId, userId);
    if (!currentLead) {
      throw new Error('Lead not found');
    }

    const fromStatus = currentLead.status;
    const now = this.nowIso();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      const updateStmt = this.db.prepare(`
        UPDATE leads
        SET status = ?, notes = COALESCE(?, notes), updated_at = ?
        WHERE id = ? AND user_id = ? AND updated_at = ?
      `);

      const result = updateStmt.run(newStatus, notes ?? null, now, leadId, userId, expectedUpdatedAt);

      if (Number(result.changes) === 0) {
        throw new OptimisticConcurrencyError();
      }

      const activityStmt = this.db.prepare(`
        INSERT INTO lead_activities (id, lead_id, user_id, from_status, to_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      activityStmt.run(randomUUID(), leadId, userId, fromStatus, newStatus, now);

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    return this.getLeadById(leadId, userId)!;
  }

  getLeadActivities(leadId: string, userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM lead_activities 
      WHERE lead_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(leadId, userId);
  }

  countLeadsByStatus(userId: string): Record<LeadStatus, number> {
    const counts: Record<LeadStatus, number> = {
      NUEVO: 0,
      CONTACTADO: 0,
      CALIFICADO: 0,
      GANADO: 0,
      PERDIDO: 0,
    };

    const rows = this.db.prepare(`
      SELECT status, COUNT(*) AS n
      FROM leads
      WHERE user_id = ?
      GROUP BY status
    `).all(userId) as unknown as Array<{ status: LeadStatus; n: number | bigint }>;

    for (const row of rows) {
      if (Object.prototype.hasOwnProperty.call(counts, row.status)) {
        counts[row.status] = Number(row.n);
      }
    }

    return counts;
  }
}
