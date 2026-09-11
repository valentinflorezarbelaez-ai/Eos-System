# Evidence — Mission F (SPEC-0010-ADV) 2026-09-11

## Box harness

- `node --test tests/runners/eos-compute-worker-mission-f-adversarial.test.js` → **12/12 PASS**
- `node --test tests/runners/eos-compute-worker-mission-e.test.js` → **10/10 PASS** (with change stub)

## Hardening (worker-only)

- Path traversal + percent-encoding gate on task text
- `sanitizeMcpTaskText` forbidden tokens
- Profile spoof guard (L0_READONLY ∧ writeAllowed)
- Seal: envelope required + structural + re-resolve compare → `MCP_ENVELOPE_TAMPERED`

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING (no new JSON schemas; exclude-from-slim vs TR-01 raise)
- Antigravity-first / no Cursor CloudAgent

## Pending host

- Bootstrap worktree → verify:strict → push → PR merge
