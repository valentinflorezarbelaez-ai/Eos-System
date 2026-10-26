import assert from "node:assert/strict";

import { EosEngineeringIntegrityGate, MAX_REQUIREMENT_ID_COLLISIONS } from "../src/core/eosEngineeringIntegrityGate.ts";

const root = process.cwd();
const emitJson = process.argv.includes("--json");
const log = emitJson ? () => {} : console.log;

log("==================================================================");
log(" EOS SYSTEM — ENGINEERING INTEGRITY GATE (GOVERNANCE & CONTRACTS)  ");
log("==================================================================");

const report = new EosEngineeringIntegrityGate(root).inspect();
const { governance, docVersion, mcpContract } = report;

log(
  `[INFO] Governance: ${governance.files.length} documents | duplicate IDs: ${governance.duplicateIds.length} | ` +
    `missing EARS: ${governance.missingEars.length}`
);
log(
  `[INFO] Requirements: ${governance.requirementIdCollisions} cross-spec FR/BDD collisions ` +
    `(frozen max ${MAX_REQUIREMENT_ID_COLLISIONS}) | ${governance.missingBdd.length} spec(s) without BDD`
);
log(
  `[INFO] Docs: package v${docVersion.packageVersion} | README v${docVersion.documentedVersion ?? "none"} | ` +
    `${docVersion.aligned ? "aligned" : "DRIFT"}`
);
log(`[INFO] MCP contract: ${mcpContract.advertised} advertised / ${mcpContract.handled} handled | symmetric=${mcpContract.symmetric}`);
log(`[INFO] Size ratchet: ${report.fileSizes.length} violation(s)`);

for (const warning of report.warnings) {
  log(`[WARN] ${warning}`);
}
for (const violation of report.violations) {
  log(`[FAIL] ${violation}`);
}

log(`[INFO] Merkle receipt: ${report.sha256MerkleReceipt}`);

if (emitJson) {
  console.log(JSON.stringify(report, null, 2));
}

assert.equal(report.passed, true, `Engineering integrity violations: ${report.violations.length} (see output above)`);

log("------------------------------------------------------------------");
log(" ENGINEERING INTEGRITY: UNIQUE IDs, EARS PRESENT, CONTRACTS IN SYNC ");
log("==================================================================");
