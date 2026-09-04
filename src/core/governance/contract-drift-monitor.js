/**
 * @module ContractDriftMonitor
 * @description Continuous contract, schema, and interface drift detector.
 * Identifies breaking changes, type mutations, and API regressions across evolving schemas.
 */

import { createHash, randomBytes } from 'node:crypto';

export const DRIFT_SEVERITY = Object.freeze({
  BREAKING: 'BREAKING',
  WARNING_DEPRECATION: 'WARNING_DEPRECATION',
  NON_BREAKING_ADDITION: 'NON_BREAKING_ADDITION',
  IDENTICAL: 'IDENTICAL'
});

export class ContractDriftMonitor {
  constructor(options = {}) {
    this.auditHistory = [];
  }

  /**
   * Compares a baseline schema against a candidate schema to detect semantic drift and breaking changes
   * @param {object} baselineSchema Original schema
   * @param {object} candidateSchema Evolved schema
   * @returns {object} Drift analysis report
   */
  compareSchemas(baselineSchema = {}, candidateSchema = {}) {
    const findings = [];

    const baseRequired = new Set(baselineSchema.required || []);
    const candRequired = new Set(candidateSchema.required || []);

    const baseProps = baselineSchema.properties || {};
    const candProps = candidateSchema.properties || {};

    // 1. Check for removed required properties (BREAKING)
    for (const req of baseRequired) {
      if (!candProps[req]) {
        findings.push({
          type: 'REMOVED_REQUIRED_PROPERTY',
          property: req,
          severity: DRIFT_SEVERITY.BREAKING,
          message: `Mandatory property "${req}" was removed in candidate schema`
        });
      }
    }

    // 2. Check for newly introduced required properties (BREAKING if clients don't provide it)
    for (const req of candRequired) {
      if (!baseRequired.has(req) && !baseProps[req]) {
        findings.push({
          type: 'NEW_MANDATORY_PROPERTY_ADDED',
          property: req,
          severity: DRIFT_SEVERITY.BREAKING,
          message: `New mandatory property "${req}" added without backwards-compatible default`
        });
      }
    }

    // 3. Check property type mutations
    for (const [propName, baseDef] of Object.entries(baseProps)) {
      const candDef = candProps[propName];
      if (candDef && baseDef.type && candDef.type) {
        const baseType = JSON.stringify(baseDef.type);
        const candType = JSON.stringify(candDef.type);
        if (baseType !== candType) {
          findings.push({
            type: 'TYPE_MUTATION',
            property: propName,
            base_type: baseDef.type,
            candidate_type: candDef.type,
            severity: DRIFT_SEVERITY.BREAKING,
            message: `Property "${propName}" mutated type from ${baseType} to ${candType}`
          });
        }
      }
    }

    // 4. Check for clean optional property additions (NON_BREAKING)
    for (const [propName, candDef] of Object.entries(candProps)) {
      if (!baseProps[propName] && !candRequired.has(propName)) {
        findings.push({
          type: 'OPTIONAL_PROPERTY_ADDED',
          property: propName,
          severity: DRIFT_SEVERITY.NON_BREAKING_ADDITION,
          message: `Backwards-compatible optional property "${propName}" added`
        });
      }
    }

    const hasBreaking = findings.some(f => f.severity === DRIFT_SEVERITY.BREAKING);
    const report = {
      audit_id: `DFT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      isCompatible: !hasBreaking,
      hasBreakingChanges: hasBreaking,
      total_findings: findings.length,
      findings,
      timestamp: new Date().toISOString()
    };

    this.auditHistory.push(report);
    return report;
  }
}
