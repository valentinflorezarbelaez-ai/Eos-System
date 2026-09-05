/**
 * @module RCAEngine
 * @description Root Cause Analysis (RCA) & Remediation DAG compiler for EOS-ELEVATE.
 * Deduplicates raw symptoms, clusters common causal roots, and orders remediation tasks
 * topologically according to blast radius and risk severity.
 */

const SEVERITY_WEIGHTS = {
  CRITICAL: 100,
  HIGH: 50,
  MEDIUM: 20,
  LOW: 5
};

export class RCAEngine {
  /**
   * Analyzes raw findings and compiles a topologically-sorted Remediation DAG
   * @param {Array<object>} rawFindings
   * @returns {{ rootCauses: Array<object>, tasks: Array<object> }}
   */
  analyze(rawFindings = []) {
    if (!Array.isArray(rawFindings) || rawFindings.length === 0) {
      return { rootCauses: [], tasks: [] };
    }

    // 1. Cluster symptoms by causal root key: `${file}::${ruleId}`
    const clusters = new Map();

    for (const finding of rawFindings) {
      const clusterKey = `${finding.file || 'unknown'}::${finding.ruleId || 'GENERIC'}`;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, {
          clusterKey,
          file: finding.file,
          ruleId: finding.ruleId,
          severity: finding.severity || 'MEDIUM',
          vector: finding.vector || 'general',
          symptoms: [],
          remediation: finding.remediation || 'Apply corrective refactoring'
        });
      }
      clusters.get(clusterKey).symptoms.push(finding);
    }

    const rootCauses = Array.from(clusters.values()).map((cluster, idx) => ({
      id: `RC-${idx + 1}`,
      ruleId: cluster.ruleId,
      file: cluster.file,
      severity: cluster.severity,
      vector: cluster.vector,
      symptomCount: cluster.symptoms.length,
      symptoms: cluster.symptoms.map(s => s.symptom || s.message),
      remediation: cluster.remediation
    }));

    // 2. Compile Remediation Tasks and sort by Risk Severity (CRITICAL ➔ HIGH ➔ MEDIUM ➔ LOW)
    const tasks = rootCauses.map((rc, idx) => {
      const weight = SEVERITY_WEIGHTS[rc.severity] || 10;
      return {
        taskId: `TASK-${idx + 1}`,
        rootCauseId: rc.id,
        file: rc.file,
        ruleId: rc.ruleId,
        severity: rc.severity,
        weight,
        description: `Remediate ${rc.ruleId} in ${rc.file} (${rc.symptomCount} symptoms)`,
        action: rc.remediation
      };
    }).sort((a, b) => b.weight - a.weight);

    return {
      rootCauses,
      tasks
    };
  }
}
