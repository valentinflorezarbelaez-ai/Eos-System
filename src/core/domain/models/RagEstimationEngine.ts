/**
 * EOS Production-Ready RAG & IT Project Estimation Engine
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 * Inspired by the LIDR Academy / Antonio Pérez Production RAG Architecture
 */

export interface HistoricalQuoteLineItem {
  readonly id: string;
  readonly taskName: string;
  readonly blockName: string;
  readonly quantity: number;
  readonly unit: 'hours' | 'days';
  readonly normalizedHours: number;
  readonly hourlyRateEur: number;
  readonly totalCostEur: number;
  readonly technologies: readonly string[];
  readonly similarityScore: number; // 0.0 to 1.0 (cosine similarity)
}

export interface WbsTask {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly optimisticHours: number;
  readonly mostLikelyHours: number;
  readonly pessimisticHours: number;
  readonly pertHours: number;
  readonly confidenceScore: number;
  readonly historicalReferences: readonly string[];
}

export interface WbsBlock {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly tasks: readonly WbsTask[];
  readonly totalPertHours: number;
}

export interface SeniorityRoleAllocation {
  readonly roleName: 'Tech Lead' | 'Senior Fullstack' | 'Mid Developer' | 'QA Engineer' | 'DevOps Architect';
  readonly allocationPercentage: number; // 0.0 to 1.0
  readonly hourlyRateEur: number;
  readonly allocatedHours: number;
  readonly totalCostEur: number;
}

export interface ConfidenceFactors {
  readonly referencesCount: number;
  readonly referencesFactor: number;   // 0.0 to 1.0
  readonly avgSimilarity: number;       // 0.0 to 1.0
  readonly similarityFactor: number;   // 0.0 to 1.0
  readonly technologyMatchRatio: number; // 0.0 to 1.0
  readonly technologyFactor: number;   // 0.0 to 1.0
  readonly hourlyVariance: number;
  readonly varianceFactor: number;     // 0.0 to 1.0
}

export interface ConfidenceScore {
  readonly score: number; // 0.0 to 1.0
  readonly level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly factors: ConfidenceFactors;
}

export interface PertEstimate {
  readonly optimistic: number;
  readonly mostLikely: number;
  readonly pessimistic: number;
  readonly expectedDuration: number; // Te = (O + 4M + P) / 6
  readonly standardDeviation: number; // sigma = (P - O) / 6
}

export class RagEstimationEngine {
  /**
   * Preprocessing dictionary: Abbreviation expansions to bridge semantic embedding gaps
   */
  public static readonly ABBREVIATION_EXPANSIONS: Readonly<Record<string, string>> = {
    JWT: 'JWT (JSON Web Token)',
    API: 'API (Application Programming Interface)',
    REST: 'REST (Representational State Transfer)',
    CRUD: 'CRUD (Create, Read, Update, Delete)',
    'CI/CD': 'CI/CD (Continuous Integration / Continuous Deployment)',
    OAUTH: 'OAuth (Open Authorization 2.0)',
    SSO: 'SSO (Single Sign-On)',
    PWA: 'PWA (Progressive Web App)',
    SPA: 'SPA (Single Page Application)',
    ORM: 'ORM (Object-Relational Mapping)',
    CDN: 'CDN (Content Delivery Network)',
    E2E: 'E2E (End-to-End Automated Testing)',
    QA: 'QA (Quality Assurance & Automated Verification)',
    UI: 'UI (User Interface & Presentation Layer)',
    UX: 'UX (User Experience & Interaction Flow)',
    MVP: 'MVP (Minimum Viable Product)',
    RAG: 'RAG (Retrieval-Augmented Generation)',
    DSP: 'DSP (Digital Signal Processing)'
  };

  /**
   * Canonical technology aliases
   */
  public static readonly TECHNOLOGY_ALIASES: Readonly<Record<string, string>> = {
    react: 'React',
    reactjs: 'React',
    vue: 'Vue.js',
    vuejs: 'Vue.js',
    angular: 'Angular',
    next: 'Next.js',
    nextjs: 'Next.js',
    node: 'Node.js',
    nodejs: 'Node.js',
    express: 'Express',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    python: 'Python',
    fastapi: 'FastAPI',
    django: 'Django',
    rails: 'Ruby on Rails',
    postgres: 'PostgreSQL',
    postgresql: 'PostgreSQL',
    pgvector: 'PostgreSQL + pgvector',
    redis: 'Redis',
    docker: 'Docker',
    k8s: 'Kubernetes',
    kubernetes: 'Kubernetes',
    aws: 'AWS Cloud',
    gcp: 'Google Cloud Platform'
  };

  /**
   * Standard seniority role distribution and hourly rates (EUR)
   */
  public static readonly DEFAULT_ROLE_PROFILES = [
    { roleName: 'Tech Lead', percentage: 0.15, rateEur: 95 },
    { roleName: 'Senior Fullstack', percentage: 0.45, rateEur: 75 },
    { roleName: 'Mid Developer', percentage: 0.20, rateEur: 55 },
    { roleName: 'QA Engineer', percentage: 0.10, rateEur: 50 },
    { roleName: 'DevOps Architect', percentage: 0.10, rateEur: 85 }
  ] as const;

  /**
   * Calculates the PERT Beta Distribution: Te = (O + 4M + P) / 6
   */
  public static calculatePert(optimistic: number, mostLikely: number, pessimistic: number): PertEstimate {
    const o = Math.max(0, optimistic);
    const m = Math.max(o, mostLikely);
    const p = Math.max(m, pessimistic);

    const expected = (o + 4 * m + p) / 6;
    const stdDev = (p - o) / 6;

    return {
      optimistic: Math.round(o * 100) / 100,
      mostLikely: Math.round(m * 100) / 100,
      pessimistic: Math.round(p * 100) / 100,
      expectedDuration: Math.round(expected * 100) / 100,
      standardDeviation: Math.round(stdDev * 100) / 100
    };
  }

  /**
   * Calculates multi-factor confidence based on retrieved historical line items.
   */
  public static calculateConfidence(
    referencesCount: number,
    avgSimilarity: number,
    techMatchRatio: number,
    hourlyVariance: number = 0.05
  ): ConfidenceScore {
    // 1. Reference Count Factor (0 to 1.0)
    let refFactor = 0.0;
    if (referencesCount > 10) refFactor = 1.0;
    else if (referencesCount >= 6) refFactor = 0.85;
    else if (referencesCount >= 3) refFactor = 0.65;
    else if (referencesCount >= 1) refFactor = 0.40;

    // 2. Similarity Factor (0 to 1.0)
    const simFactor = Math.max(0, Math.min(1.0, (avgSimilarity - 0.5) / 0.45));

    // 3. Technology Match Factor
    const techFactor = Math.max(0, Math.min(1.0, techMatchRatio));

    // 4. Variance Factor (penalty for high dispersion in historical quotes)
    const varFactor = Math.max(0, 1.0 - Math.min(1.0, hourlyVariance * 2));

    // Weighted composite score: 30% references, 35% similarity, 20% tech, 15% low variance
    const compositeScore = (refFactor * 0.30) + (simFactor * 0.35) + (techFactor * 0.20) + (varFactor * 0.15);
    const rounded = Math.round(compositeScore * 100) / 100;

    let level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (rounded >= 0.80) level = 'VERY_HIGH';
    else if (rounded >= 0.65) level = 'HIGH';
    else if (rounded >= 0.45) level = 'MEDIUM';

    return {
      score: rounded,
      level,
      factors: {
        referencesCount,
        referencesFactor: Math.round(refFactor * 100) / 100,
        avgSimilarity: Math.round(avgSimilarity * 100) / 100,
        similarityFactor: Math.round(simFactor * 100) / 100,
        technologyMatchRatio: Math.round(techMatchRatio * 100) / 100,
        technologyFactor: Math.round(techFactor * 100) / 100,
        hourlyVariance: Math.round(hourlyVariance * 100) / 100,
        varianceFactor: Math.round(varFactor * 100) / 100
      }
    };
  }

  /**
   * Expands abbreviations and canonicalizes technologies in query text.
   */
  public static preprocessQuery(rawText: string): string {
    let expanded = rawText;

    for (const [abbr, full] of Object.entries(this.ABBREVIATION_EXPANSIONS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      expanded = expanded.replace(regex, full);
    }

    return expanded.trim();
  }
}
