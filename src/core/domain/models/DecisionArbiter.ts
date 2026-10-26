/**
 * EOS Autonomous Multi-Agent Decision Arbiter & Consensus Protocol
 * Clean Hexagonal Architecture · Layer 0 Pure Domain Model
 * Zero External Dependencies (Node stdlib / pure TypeScript only)
 * Replaces uncalibrated heuristics with mathematical multi-agent arbitration (Jev Model).
 */

export type ArbiterRole = 'ARCHITECT' | 'SECURITY_AUDITOR' | 'PERFORMANCE_ENGINEER' | 'PRODUCT_ESTIMATOR';

export interface ArbiterProfile {
  readonly role: ArbiterRole;
  readonly personaName: string;
  readonly weight: number;
  readonly hasVetoPower: boolean;
  readonly primaryFocus: string;
}

export interface AgentVote {
  readonly role: ArbiterRole;
  readonly personaName: string;
  readonly score: number; // 0.0 to 1.0
  readonly approved: boolean;
  readonly vetoRaised: boolean;
  readonly vetoReason?: string | undefined;
  readonly keyTradeoffs: readonly string[];
  readonly recommendations: readonly string[];
}

export type ConsensusVerdict =
  | 'UNANIMOUS_APPROVAL'
  | 'MAJORITY_CONCURRENCE'
  | 'REJECTED_REMEDIATION_REQUIRED'
  | 'VETO_REJECTED';

export interface ConsensusCalculation {
  readonly compositeScore: number; // 0.0 to 1.0
  readonly verdict: ConsensusVerdict;
  readonly approvalPercentage: number;
  readonly vetoes: readonly { role: ArbiterRole; reason: string }[];
  readonly dissentCount: number;
}

export interface RejectedAlternative {
  readonly alternative: string;
  readonly rejectionRationale: string;
}

export interface FormalAdr {
  readonly adrId: string;
  readonly title: string;
  readonly status: 'APPROVED' | 'REJECTED';
  readonly context: string;
  readonly decision: string;
  readonly rejectedAlternatives: readonly RejectedAlternative[];
  readonly consequences: readonly string[];
  readonly voteBreakdown: readonly AgentVote[];
  readonly createdAt: string;
}

export class DecisionArbiter {
  /**
   * The 4 Specialized Council Profiles
   */
  public static readonly COUNCIL_PROFILES: Readonly<Record<ArbiterRole, ArbiterProfile>> = {
    ARCHITECT: {
      role: 'ARCHITECT',
      personaName: 'Lead Systems Architect',
      weight: 1.0,
      hasVetoPower: true,
      primaryFocus: 'Clean Hexagonal boundaries, Layer 0 domain purity, coupling, and modularity'
    },
    SECURITY_AUDITOR: {
      role: 'SECURITY_AUDITOR',
      personaName: 'Chief Security Officer',
      weight: 1.2,
      hasVetoPower: true,
      primaryFocus: 'OWASP compliance, zero plain secrets, encryption, and attack surfaces'
    },
    PERFORMANCE_ENGINEER: {
      role: 'PERFORMANCE_ENGINEER',
      personaName: 'Principal Reliability Engineer',
      weight: 0.9,
      hasVetoPower: false,
      primaryFocus: 'Sub-50ms latency budgets, memory heap footprint, and I/O scalability'
    },
    PRODUCT_ESTIMATOR: {
      role: 'PRODUCT_ESTIMATOR',
      personaName: 'Technical Product Director',
      weight: 0.8,
      hasVetoPower: false,
      primaryFocus: 'Implementation effort (PERT), operational overhead, and business feasibility'
    }
  };

  /**
   * Calculates weighted multi-agent consensus and enforces constitutional vetoes.
   */
  public static calculateConsensus(votes: readonly AgentVote[]): ConsensusCalculation {
    if (votes.length === 0) {
      return {
        compositeScore: 0.0,
        verdict: 'REJECTED_REMEDIATION_REQUIRED',
        approvalPercentage: 0.0,
        vetoes: [],
        dissentCount: 0
      };
    }

    const vetoes: { role: ArbiterRole; reason: string }[] = [];
    let totalWeight = 0;
    let weightedScoreSum = 0;
    let approvedCount = 0;

    for (const v of votes) {
      const profile = this.COUNCIL_PROFILES[v.role];
      const weight = profile ? profile.weight : 1.0;

      if (v.vetoRaised && profile?.hasVetoPower) {
        vetoes.push({
          role: v.role,
          reason: v.vetoReason || 'Constitutional Invariant Violation Detected'
        });
      }

      if (v.approved) {
        approvedCount++;
      }

      totalWeight += weight;
      weightedScoreSum += v.score * weight;
    }

    // 1. Constitutional Veto overrides all scores
    if (vetoes.length > 0) {
      return {
        compositeScore: 0.0,
        verdict: 'VETO_REJECTED',
        approvalPercentage: Math.round((approvedCount / votes.length) * 100),
        vetoes,
        dissentCount: votes.length - approvedCount
      };
    }

    // 2. Weighted Score Tally
    const compositeScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0.0;
    const roundedScore = Math.round(compositeScore * 100) / 100;
    const approvalPercentage = Math.round((approvedCount / votes.length) * 100);
    const dissentCount = votes.length - approvedCount;

    // 3. Verdict Determination
    let verdict: ConsensusVerdict = 'REJECTED_REMEDIATION_REQUIRED';
    if (approvedCount === votes.length && roundedScore >= 0.85) {
      verdict = 'UNANIMOUS_APPROVAL';
    } else if (roundedScore >= 0.70 && approvalPercentage >= 75) {
      verdict = 'MAJORITY_CONCURRENCE';
    } else {
      verdict = 'REJECTED_REMEDIATION_REQUIRED';
    }

    return {
      compositeScore: roundedScore,
      verdict,
      approvalPercentage,
      vetoes: [],
      dissentCount
    };
  }
}
