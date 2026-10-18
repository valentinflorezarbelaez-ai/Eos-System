# EOS Corruption Purge — Encoding & Line Endings (2026-10-18)

**Status:** EXECUTED
**Scope:** Text encoding and line-ending corruption only
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

## 3. Verification

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
