# EOS P4 Mission-local EVD seal / custody - 2026-09-09

**Branch:** `cursor/eos-p4-mission-local-evd-seal`
**Base main tip:** `49fd0acd6182aa3046486798e7ea06d3f10550ec` (post-P3 tip)
**Scope:** P4 ONLY (Ladder 4 J4) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Gap (J4 / DoD P4)

G7/N2 left mission-local evidence OUT OF SCOPE. mcp-mission-bridge and governed-task-executor still raw-write under .missions/<id>/evidence without sealEvd / EvidenceCustody while verify:strict still PASSED.

## Inventory (pre-fix)

| Path | Role | Disposition |
| --- | --- | --- |
| mcp-mission-bridge recordEvidence | mission-local EVD | ROUTED via sealEvd |
| governed-task-executor evidence receipt | mission-local EVD | ROUTED via sealEvd |
| governed-task-executor task/manifest | non-EVD | OUT OF SCOPE |
| evd-seal-path.js | SSOT | SANCTIONED |
| mission-runtime assessment files | non-EVD | OUT OF SCOPE |
| App satellites / Fundacion | untouched | Delta=0 |

## Fix design

1. Reuse sealEvd SSOT with evidenceDir = missionDir/evidence (no parallel ledger).
2. Custody advances EvidenceCustody under control-plane .eos/custody.
3. Add sourceWritesMissionLocalEvd + auditMissionLocalEvdWritePaths.
4. No false DENY on intentional sealEvd callers.
5. Canonical detector still ignores mission-local (G7 preserved).
6. Wire audits into verify:strict.

## Deliverables

1. evd-seal-path.js P4 helpers
2. mcp-mission-bridge via sealEvd
3. governed-task-executor via sealEvd
4. test:p4
5. verify-eos mission-local audit
6. freeze + matrix notes
7. dirty tree deferred

## Verify

Run test:p4, test:g7, test:n2, and verify:strict.

## Non-claims

- No Fundacion mutation.
- No P5+ in this branch.
- No parallel custody ledger.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.

