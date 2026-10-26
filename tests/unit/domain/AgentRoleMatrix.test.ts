import { describe, it, expect } from 'vitest';
import { AgentRoleMatrix } from '../../../src/core/domain/models/AgentRoleMatrix.js';
import type { AgentRoleName } from '../../../src/core/domain/models/AgentRoleMatrix.js';

describe('AgentRoleMatrix', () => {
  it('returns all 8 sovereign roles', () => {
    const roles = AgentRoleMatrix.getAllRoles();
    expect(roles).toHaveLength(8);

    const roleNames = roles.map(r => r.role);
    expect(roleNames).toEqual([
      'Architect',
      'RequirementsEngineer',
      'DomainCoder',
      'ApplicationOrchestrator',
      'SecurityAuditor',
      'QualityAuditor',
      'EvidenceAuditor',
      'Deployer'
    ]);
  });

  it('validates role definitions contain mandatory constitutional fields', () => {
    const roles = AgentRoleMatrix.getAllRoles();
    for (const r of roles) {
      expect(r.role).toBeDefined();
      expect(r.title).toBeTruthy();
      expect(r.primaryPhase).toBeTruthy();
      expect(r.mandate).toBeTruthy();
      expect(r.mandatoryDeliverables.length).toBeGreaterThan(0);
      expect(r.constitutionalLaw).toBeTruthy();
    }
  });

  it('retrieves specific roles by name', () => {
    const architect = AgentRoleMatrix.getRole('Architect');
    expect(architect).toBeDefined();
    expect(architect?.role).toBe('Architect');
    expect(architect?.title).toContain('Arquitecto');

    const secAuditor = AgentRoleMatrix.getRole('SecurityAuditor');
    expect(secAuditor).toBeDefined();
    expect(secAuditor?.constitutionalLaw).toContain('Ley VI');
  });

  it('returns undefined for non-existent role name', () => {
    const unknown = AgentRoleMatrix.getRole('NonExistentRole' as AgentRoleName);
    expect(unknown).toBeUndefined();
  });

  describe('getRoleForPhase', () => {
    it('maps early steps (1-5) to RequirementsEngineer', () => {
      expect(AgentRoleMatrix.getRoleForPhase(1).role).toBe('RequirementsEngineer');
      expect(AgentRoleMatrix.getRoleForPhase(3).role).toBe('RequirementsEngineer');
      expect(AgentRoleMatrix.getRoleForPhase(4).role).toBe('RequirementsEngineer');
      expect(AgentRoleMatrix.getRoleForPhase(5).role).toBe('RequirementsEngineer');
    });

    it('maps steps 6-9 to Architect', () => {
      expect(AgentRoleMatrix.getRoleForPhase(6).role).toBe('Architect');
      expect(AgentRoleMatrix.getRoleForPhase(7).role).toBe('Architect');
      expect(AgentRoleMatrix.getRoleForPhase(8).role).toBe('Architect');
      expect(AgentRoleMatrix.getRoleForPhase(9).role).toBe('Architect');
    });

    it('maps step 10 to DomainCoder', () => {
      expect(AgentRoleMatrix.getRoleForPhase(10).role).toBe('DomainCoder');
    });

    it('maps step 11 to ApplicationOrchestrator', () => {
      expect(AgentRoleMatrix.getRoleForPhase(11).role).toBe('ApplicationOrchestrator');
    });

    it('maps step 12 to SecurityAuditor', () => {
      expect(AgentRoleMatrix.getRoleForPhase(12).role).toBe('SecurityAuditor');
    });

    it('maps steps 13-17 to QualityAuditor', () => {
      expect(AgentRoleMatrix.getRoleForPhase(13).role).toBe('QualityAuditor');
      expect(AgentRoleMatrix.getRoleForPhase(15).role).toBe('QualityAuditor');
      expect(AgentRoleMatrix.getRoleForPhase(17).role).toBe('QualityAuditor');
    });

    it('maps steps 18-19 to EvidenceAuditor', () => {
      expect(AgentRoleMatrix.getRoleForPhase(18).role).toBe('EvidenceAuditor');
      expect(AgentRoleMatrix.getRoleForPhase(19).role).toBe('EvidenceAuditor');
    });

    it('maps step 20+ to Deployer', () => {
      expect(AgentRoleMatrix.getRoleForPhase(20).role).toBe('Deployer');
      expect(AgentRoleMatrix.getRoleForPhase(21).role).toBe('Deployer');
      expect(AgentRoleMatrix.getRoleForPhase(99).role).toBe('Deployer');
    });
  });
});
