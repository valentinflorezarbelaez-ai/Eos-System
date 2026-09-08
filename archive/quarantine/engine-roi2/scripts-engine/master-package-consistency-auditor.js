import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class MasterPackageConsistencyAuditor {
  constructor() {
    this.masterBriefPath = path.join(rootDir, 'docs/workflows/MASTER_EXECUTION_BRIEF.md');
    this.gap002ProtocolPath = path.join(rootDir, 'docs/governance/GAP002_PROVENANCE_PROTOCOL.md');
    this.valExp002Path = path.join(rootDir, 'docs/intelligence/user/VAL_EXPERIMENT_002_EXECUTION_PROTOCOL.md');
    this.roadmapPath = path.join(rootDir, 'docs/architecture/EOS_MASTER_ROADMAP_NEXT_90_PERCENT.md');
  }

  auditMasterPackage() {
    const brief = fs.readFileSync(this.masterBriefPath, 'utf-8');
    const gap002 = fs.readFileSync(this.gap002ProtocolPath, 'utf-8');
    const valExp = fs.readFileSync(this.valExp002Path, 'utf-8');
    const roadmap = fs.readFileSync(this.roadmapPath, 'utf-8');

    const findings = [];

    // 1. Metric Targets Check (Trust >= 8.5, Completion >= 90%, Drop-off <= 10%)
    const hasTrustTarget = (doc) => /8\.5/.test(doc);
    const hasCompletionTarget = (doc) => /90(\.0)?\\?%/.test(doc);
    const hasDropoffTarget = (doc) => /10(\.0)?\\?%/.test(doc);

    if (!hasTrustTarget(brief) || !hasTrustTarget(valExp)) {
      findings.push({ rule: 'METRIC_TARGET_CONSISTENCY', finding: 'Trust score target (8.5) mismatch across documents' });
    }

    if (!hasCompletionTarget(brief) || !hasCompletionTarget(valExp)) {
      findings.push({ rule: 'METRIC_TARGET_CONSISTENCY', finding: 'Completion target (90%) mismatch across documents' });
    }

    if (!hasDropoffTarget(brief) || !hasDropoffTarget(valExp)) {
      findings.push({ rule: 'METRIC_TARGET_CONSISTENCY', finding: 'Drop-off target (10%) mismatch across documents' });
    }

    // 2. Variant Names Check (CONTROL, A, B, C / Accumulative Sequence)
    const variantsInBrief = brief.includes('CONTROL') && brief.includes('A') && brief.includes('A+B') && brief.includes('A+B+C');
    const variantsInVal = valExp.includes('CONTROL') && valExp.includes('A') && valExp.includes('A+B') && valExp.includes('A+B+C');
    if (!variantsInBrief || !variantsInVal) {
      findings.push({ rule: 'VARIANT_NAMING_CONSISTENCY', finding: 'Experimental variant structure mismatch across documents' });
    }

    // 3. Gate-13 State Check (CLOSED)
    const gate13Brief = brief.includes('GATE-13 CLOSED') || brief.includes('GATE-13 = CLOSED');
    const gate13Val = valExp.includes('GATE-13 = CLOSED');
    const gate13Roadmap = roadmap.includes('GATE-13');
    if (!gate13Brief || !gate13Val || !gate13Roadmap) {
      findings.push({ rule: 'GATE_13_STATE_CONSISTENCY', finding: 'Gate-13 status is not consistently defined as CLOSED' });
    }

    // 4. Invariant Isolation Model (ZERO UNAUTHORIZED DELTA)
    const deltaInBrief = brief.includes('ZERO UNAUTHORIZED DELTA');
    const deltaInRoadmap = roadmap.includes('ZERO UNAUTHORIZED DELTA') || roadmap.includes('Zero Unauthorized Delta');
    if (!deltaInBrief) {
      findings.push({ rule: 'ISOLATION_INVARIANT_CONSISTENCY', finding: 'Zero unauthorized delta invariant missing from master documents' });
    }

    return {
      auditedDocuments: [
        'docs/workflows/MASTER_EXECUTION_BRIEF.md',
        'docs/governance/GAP002_PROVENANCE_PROTOCOL.md',
        'docs/intelligence/user/VAL_EXPERIMENT_002_EXECUTION_PROTOCOL.md',
        'docs/architecture/EOS_MASTER_ROADMAP_NEXT_90_PERCENT.md'
      ],
      findingsCount: findings.length,
      findings,
      status: findings.length === 0 ? 'CONSISTENT_VERIFIED' : 'CONTRADICTIONS_FOUND'
    };
  }
}
