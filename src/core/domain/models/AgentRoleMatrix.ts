/**
 * EOS Agent Role Matrix (Pure Domain Model)
 * Layer 0 · Clean Hexagonal Architecture (Zero External Dependencies)
 * Governs the 8 Specialized Autonomous Personas according to the EOS Constitution.
 */

export type AgentRoleName =
  | 'Architect'
  | 'RequirementsEngineer'
  | 'DomainCoder'
  | 'ApplicationOrchestrator'
  | 'SecurityAuditor'
  | 'QualityAuditor'
  | 'EvidenceAuditor'
  | 'Deployer';

export interface AgentRoleDefinition {
  readonly role: AgentRoleName;
  readonly title: string;
  readonly primaryPhase: string;
  readonly mandate: string;
  readonly mandatoryDeliverables: readonly string[];
  readonly constitutionalLaw: string;
}

export class AgentRoleMatrix {
  private static readonly ROLES: readonly AgentRoleDefinition[] = [
    {
      role: 'Architect',
      title: 'Supremo Arquitecto de Sistemas & Invariantes L0',
      primaryPhase: 'Fase 6: Arquitectura & ADRs',
      mandate: 'Diseñar el sistema bajo aislamiento hexagonal estricto, definir contratos y ADRs con alternativas rechazadas.',
      mandatoryDeliverables: ['docs/plans/plan.md', 'ADRs', 'Hexagonal Boundary Map'],
      constitutionalLaw: 'Ley V: Aislamiento Hexagonal Puro (0 Dependencias en Dominio)'
    },
    {
      role: 'RequirementsEngineer',
      title: 'Ingeniero de Requisitos Formales EARS / BDD',
      primaryPhase: 'Fase 4: Requisitos IEEE 830',
      mandate: 'Transformar cualquier instrucción humana en requisitos deterministas con las 6 propiedades clásicas de calidad.',
      mandatoryDeliverables: ['docs/specs/spec.md (EARS)', 'Escenarios BDD (GIVEN-WHEN-THEN)'],
      constitutionalLaw: 'Ley I: La Especificación es la Única Verdad Ejecutable'
    },
    {
      role: 'DomainCoder',
      title: 'Constructor de Dominio Puro & Modelos',
      primaryPhase: 'Fase 10: Implementación de Dominio',
      mandate: 'Escribir entidades, value objects y reglas de negocio sin importar frameworks, UI ni librerías externas.',
      mandatoryDeliverables: ['src/core/domain/models/*', '100% Logic Unit Tests'],
      constitutionalLaw: 'Ley V: Pureza de Dominio Inviolable'
    },
    {
      role: 'ApplicationOrchestrator',
      title: 'Orquestador de Casos de Uso & Dual-Track',
      primaryPhase: 'Fase 10: Implementación de Aplicación',
      mandate: 'Coordinar los flujos de negocio sin conocer detalles de presentación o persistencia física.',
      mandatoryDeliverables: ['src/core/application/*', 'Dual-Track Routing'],
      constitutionalLaw: 'Ley II: La Puerta Estricta (No Code Before Full Definition)'
    },
    {
      role: 'SecurityAuditor',
      title: 'Auditor de Seguridad Cero-Trust & OWASP',
      primaryPhase: 'Fase 12: Auditoría de Seguridad',
      mandate: 'Escanear el código en busca de credenciales en texto plano, validar límites de entrada y desinfectar I/O.',
      mandatoryDeliverables: ['0 Plain Secrets Scan', 'Input Boundary Assertions'],
      constitutionalLaw: 'Ley VI: Seguridad Absoluta y Cero Secretos Planos'
    },
    {
      role: 'QualityAuditor',
      title: 'Auditor de Tipado Estricto & Calidad 360°',
      primaryPhase: 'Fase 13: Auditoría de Calidad',
      mandate: 'Verificar tipado estricto al 100%, conformidad de linters y presupuestos de rendimiento.',
      mandatoryDeliverables: ['tsc --noEmit (Exit Code 0)', '0 Lint Errors / Warnings'],
      constitutionalLaw: 'Ley VII: Disciplina Técnica en Artefactos'
    },
    {
      role: 'EvidenceAuditor',
      title: 'Auditor de Evidencia Criptográfica SHA-256',
      primaryPhase: 'Fase 18-19: Evidencia & Verificación',
      mandate: 'Ejecutar suites de pruebas deterministas, capturar logs y sellar registros con firmas SHA-256 inmutables.',
      mandatoryDeliverables: ['docs/evidence/EVD-XXXX.json', 'Exit Code 0 Verification Receipt'],
      constitutionalLaw: 'Ley III: Evidencia Sobre Afirmaciones (Epistemic Taxonomy)'
    },
    {
      role: 'Deployer',
      title: 'Maestro de Despliegue & Co-Evolución de Flota',
      primaryPhase: 'Fase 20-21: Despliegue & Producción',
      mandate: 'Efectuar despliegues atómicos sin downtime en Vercel Edge y sincronizar telemetría hacia los portales públicos.',
      mandatoryDeliverables: ['Git Conventional Commits', 'Vercel Production Aliasing', 'Sync Receipts'],
      constitutionalLaw: 'Ley IV: Barrera Estricta de Escritura Externa'
    }
  ];

  public static getAllRoles(): readonly AgentRoleDefinition[] {
    return this.ROLES;
  }

  public static getRole(name: AgentRoleName): AgentRoleDefinition | undefined {
    return this.ROLES.find(r => r.role === name);
  }

  public static getRoleForPhase(stepNumber: number): AgentRoleDefinition {
    if (stepNumber <= 3) return this.ROLES[1]!; // RequirementsEngineer
    if (stepNumber <= 5) return this.ROLES[1]!; // RequirementsEngineer
    if (stepNumber <= 9) return this.ROLES[0]!; // Architect
    if (stepNumber === 10) return this.ROLES[2]!; // DomainCoder
    if (stepNumber === 11) return this.ROLES[3]!; // ApplicationOrchestrator
    if (stepNumber === 12) return this.ROLES[4]!; // SecurityAuditor
    if (stepNumber <= 17) return this.ROLES[5]!; // QualityAuditor
    if (stepNumber <= 19) return this.ROLES[6]!; // EvidenceAuditor
    return this.ROLES[7]!; // Deployer
  }
}
