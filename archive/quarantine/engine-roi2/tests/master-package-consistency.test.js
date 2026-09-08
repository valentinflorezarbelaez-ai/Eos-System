import test from 'node:test';
import assert from 'node:assert/strict';
import { MasterPackageConsistencyAuditor } from '../scripts/engine/master-package-consistency-auditor.js';

// ====================================================
// WS-07: MASTER PACKAGE CONSISTENCY AUDIT TESTS
// ====================================================

const auditor = new MasterPackageConsistencyAuditor();

test('WS-07.1: Master Package Consistency Auditor confirms 100% alignment across 4 master documents', () => {
  const result = auditor.auditMasterPackage();

  assert.equal(result.status, 'CONSISTENT_VERIFIED');
  assert.equal(result.findingsCount, 0);
  assert.equal(result.auditedDocuments.length, 4);
});
