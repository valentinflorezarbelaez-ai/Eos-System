# EOS Corruption Purge — Encoding, Duplicates & Test Isolation (2026-10-18)

**Status:** EXECUTED
**Scope:** Encoding corruption, duplicate SSOT copies, and repo-mutating tests
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0 (untouched)

---

## 1. Findings (measured)

| Finding | Count | Evidence |
| --- | ---: | --- |
| JSON files rejected by `JSON.parse` | 1 | `docs/releases/EOS_PHASE_1B_4_RECEIPT_2026-09-11.json` started with UTF-8 BOM (`EF BB BF`). |
| Text files with UTF-8 BOM | 51 | Markdown, YAML, and JS under `docs/`, `openspec/`, `tests/`, root entrypoints. |
| Files with malformed `\r\r\n` line endings | 5 | `RELEASE_CAPABILITY_MATRIX.md` (3,772), 4 OpenSpec/release notes (28–29 each). |
| Syntax errors across tracked JS/MJS/CJS | 0 | `node --check` over 1,369 files. |
| Invalid UTF-8 / NUL bytes in text files | 0 | 4,929 text files decoded with fatal UTF-8 decoder. |

---

## 2. Actions

1. Removed the BOM from the invalid JSON receipt; file now parses.
2. Removed UTF-8 BOM from all 51 affected text files.
3. Normalized `\r\r\n` and lone `\r` to `\n` in the 5 affected files.
4. No content, schema, evidence value, lock, or test assertion was changed.

**NON-CLAIM:** Encoding normalization does not change any claim, maturity level,
closure, or `PRODUCTION_READY`. It is a storage hygiene fix.

---

## 3. Duplicate artifacts removed (SSOT de-duplication)

| Removed duplicate | Canonical copy retained |
| --- | --- |
| `docs/rationalization/EOS_SIMULATION_REGISTER.json` | `docs/mcp/EOS_MCP_DEAD_OR_ORPHAN_REGISTER.json` |
| `docs/rationalization/EOS_GOVERNANCE_ENFORCEMENT_MATRIX.md` | `docs/mcp/EOS_MCP_GOVERNANCE_PATH_MATRIX.md` |
| `docs/rationalization/EOS_DUPLICATION_REGISTER.json` | `docs/mcp/EOS_MCP_REDUNDANCY_REGISTER.json` |
| `docs/rationalization/EOS_DO_NOT_BUILD_REGISTER.md` | `docs/mcp/EOS_MCP_DO_NOT_BUILD_REGISTER.md` |
| `openspec/changes/eos-ladder-21-mission-bq/spec.md` | `openspec/changes/eos-ladder-21-mission-bq/specs/mission-bq-ladder21-closeout-seam-pack/spec.md` |

All removed files were byte-identical duplicates. Canonical copies are referenced by
locks, tests, or ADRs; the duplicates had no live references. The only textual
reference (`EOS_DOCUMENTATION_GAP_REGISTER.json`) was repointed to the canonical path.

**Non-action:** `.agents` ↔ `ai-specs` skill mirrors, OpenSpec spec deltas, evidence
receipts, and per-project fixture templates were left intact (intentional mirrors).

---

## 4. Test isolation fix (stops repository mutation)

Two tests were writing into tracked control-plane paths instead of isolated fixtures:

| Test | Mutation before | Fix |
| --- | --- | --- |
| `tests/executive-dossier-engine.test.js` | `save: true` wrote `docs/reports/executive/EXECUTIVE_DOSSIER_PRJ-APP-FUERZA.md` in the real repo. | Uses a temporary `reportsDir` and removes it in `finally`. |
| `tests/mcp-native-operator-tools.test.js` | `eos_audit_project` ran the audit pipeline against the real root and overwrote `docs/evidence/EVD-0060.json`. | Builds a temporary control-plane fixture and injects `baseDir` into `EosMcpServer`. |

The two contaminated files were restored to their pre-churn content. After the fix,
the full suite leaves `git status` clean.

---

## 5. Verification

```text
node --check (1,369 JS/MJS/CJS)      → 0 syntax failures
JSON.parse (559 tracked JSON)         → 0 failures
UTF-8 fatal decode (4,929 text)       → 0 failures
BOM byte scan                         → 0 remaining
\r\r\n scan                           → 0 remaining
npm test                              → 1460 tests, 1460 pass
npm run verify:strict                 → 913 checks, 0 failures
```

Any future encoding purge must repeat these scans and keep both commands green.
