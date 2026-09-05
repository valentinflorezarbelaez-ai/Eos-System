/**
 * @module CertificationReporter
 * @description Enterprise-grade certification and evidence reporting engine for EOS-ELEVATE.
 * Generates Tier-1 executive audit reports and cryptographic SHA-256 evidence records.
 */

import crypto from 'node:crypto';

export class CertificationReporter {
  /**
   * Generates formatted executive Markdown audit report
   * @param {object} scanResult Result from ScannerCouncil.runFullScan()
   * @param {object} [options]
   * @returns {string}
   */
  generateMarkdownReport(scanResult, options = {}) {
    const { summary, findings, targetPath, digest, timestamp } = scanResult;

    // Calculate quality index (100 base, minus weighted penalties)
    const penalty = (summary.bySeverity.critical * 25) +
                    (summary.bySeverity.high * 10) +
                    (summary.bySeverity.medium * 4) +
                    (summary.bySeverity.low * 1);
    const score = Math.max(0, 100 - penalty);
    const grade = score >= 90 ? 'A (Elite)' : score >= 80 ? 'B (Compliant)' : score >= 65 ? 'C (Needs Remediation)' : 'F (Non-Compliant)';

    let md = `# EOS-ELEVATE: Executive Quality & Security Audit Report\n\n`;
    md += `* **Target Scope:** \`${targetPath}\`\n`;
    md += `* **Audit Timestamp:** \`${timestamp}\`\n`;
    md += `* **Cryptographic Attestation (SHA-256):** \`${digest}\`\n`;
    md += `* **Overall Health Index:** **${score}/100** — \`${grade}\`\n\n`;

    md += `---\n\n`;
    md += `## Executive Compliance Scorecard\n\n`;
    md += `| Dimension / Vector | Findings Count | Status | Health Rating |\n`;
    md += `|---|---|---|---|\n`;
    md += `| **Security (OWASP/Secrets)** | ${summary.byVector.security} | ${summary.byVector.security === 0 ? '✅ PASSED' : '🚨 CRITICAL ATTENTION'} | ${summary.byVector.security === 0 ? '100%' : 'Compromised'} |\n`;
    md += `| **Architecture (Hexagonal/Boundaries)** | ${summary.byVector.architecture} | ${summary.byVector.architecture === 0 ? '✅ CLEAN' : '⚠️ COUPLING RISK'} | ${summary.byVector.architecture === 0 ? '100%' : 'Needs Decoupling'} |\n`;
    md += `| **Quality & Syntax (Reliability)** | ${summary.byVector.quality} | ${summary.byVector.quality === 0 ? '✅ STABLE' : '⚠️ DRIFT DETECTED'} | ${summary.byVector.quality === 0 ? '100%' : 'Refactor Advised'} |\n`;
    md += `| **Performance (Budgets & I/O)** | ${summary.byVector.performance} | ${summary.byVector.performance === 0 ? '✅ OPTIMIZED' : '⚠️ LATENCY HAZARD'} | ${summary.byVector.performance === 0 ? '100%' : 'Async Required'} |\n`;
    md += `| **Accessibility & SEO (WCAG 2.1)** | ${summary.byVector.accessibility} | ${summary.byVector.accessibility === 0 ? '✅ AA CONFORMANT' : '⚠️ NON-COMPLIANT'} | ${summary.byVector.accessibility === 0 ? '100%' : 'Remediation Required'} |\n\n`;

    md += `---\n\n`;
    md += `## Multi-Vector Findings Breakdown\n\n`;

    if (findings.length === 0) {
      md += `*No actionable anomalies or compliance defects detected. The target codebase satisfies Tier-1 architecture standards.*\n\n`;
    } else {
      findings.forEach((f, idx) => {
        md += `### ${idx + 1}. [${f.severity}] \`${f.ruleId}\` in \`${f.file}:${f.line}\`\n`;
        md += `- **Vector:** \`${f.vector}\`\n`;
        md += `- **Diagnosis:** ${f.message}\n`;
        md += `- **Remediation Action:** ${f.remediation}\n\n`;
      });
    }

    md += `---\n\n`;
    md += `## Cryptographic Attestation\n\n`;
    md += `\`\`\`text\n`;
    md += `SHA-256 Root Digest: ${digest}\n`;
    md += `Scanned Files: ${summary.totalScannedFiles}\n`;
    md += `Total Findings: ${summary.totalFindings}\n`;
    md += `Epistemic Classification: AUDIT_EXECUTED\n`;
    md += `\`\`\`\n`;

    return md;
  }

  /**
   * Generates standard evidence payload matching EOS schema
   * @param {object} scanResult
   * @param {string} evidenceId e.g. 'EVD-ELEVATE-0001'
   * @returns {object}
   */
  generateEvidencePayload(scanResult, evidenceId = 'EVD-ELEVATE-0001') {
    return {
      evidenceId,
      timestamp: scanResult.timestamp,
      status: 'AUDIT_EXECUTED',
      digest: scanResult.digest,
      summary: scanResult.summary,
      scope: scanResult.targetPath,
      engine: 'EOS-ELEVATE-v1.0.0',
      findingsCount: scanResult.findings.length
    };
  }
}
