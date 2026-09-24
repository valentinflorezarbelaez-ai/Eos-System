# Design — Mission DH Quarantine / Soft-Remove Execution Port

## Composition Triad

Conforms strictly to the canonical Layer-0 composition port triad (established across DA..DG):

1. **Receipt (`quarantine-execution-receipt.js`)**:
   - Nine-field canonical SHA-256 seal.
   - Identifier prefix: `DH-RCPT-*`.
   - Forces `productionReady='NO'`, `fundacionDelta=0`.
   - Attaches freeze soft-observe (`06af7278`, `readOnly=true`, `hardDeleteRefused=true`, `massPruneRefused=true`).
   - Attaches ceilingHold (`schemasAtCeiling=true`, `slimHold=true`).
   - Records `quarantinedPaths[]`, `quarantineDir`, `manifestDigest`.

2. **Policy Gate (`quarantine-execution-policy-gate.js`)**:
   - Pre-execution validation enforcing:
     - `planId`, `changeId`, `executionMode` (`ACTIVE` | `HOLD` | `DRY_RUN`), and `phase`.
     - Valid linked `dgReceipt` (must match approved namedPaths from Mission DG).
     - Strict rejection of destructive delete flags (`forceDelete`, `purge`, `unsupervised`).
     - Refusal of unapproved paths not present in the DG disposition receipt.
     - Universal fail-closed invariant enforcement: Law VI secrets rejection, Fundacion paths rejection (`FUNDACION_ALWAYS_DENY`), PRODUCTION_READY flip rejection, tip-pin rewrite rejection, L29 reopen rejection, L30 auto-close rejection.

3. **Port (`quarantine-execution-port.js`)**:
   - Methods: `govern(plan)`, `evaluate(plan)`, `getDecision(planId)`, `verifyTrail(receipt)`.
   - Executes non-destructive isolation: moves targets to `.quarantine/<timestamp>/` (or in-memory test doubles).
   - Generates deterministic JSON manifest with SHA-256 digests for all quarantined files.
   - Status mapping:
     - `ACTIVE` + verified DG linkage + quarantine completed ➔ `PASS` (sealed `DH-RCPT-*`).
     - `HOLD` ➔ `HOLD` (observation only, zero disk mutations).
     - Missing prerequisites / unapproved paths / violations ➔ `DENY`.

## Freeze Soft-Observe

Pin `06af7278` / full `06af7278d6bdf3b55c65a044bfb22ce93e6205cf`. Package soft-observes only — strictly does NOT rewrite tip pins. Formal L29 CLOSED retained. L30 OPEN.
