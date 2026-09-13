# Mission BA — Local Sandboxed Container / Worker Isolation Port (SPEC-0058) — 2026-09-12

## Summary

Hermetic **Local Sandboxed Container / Worker Isolation Port** —
`runIsolated({ step, rootPrison, allowlist, timeoutMs, networkPolicy, ports })`
with phases **VALIDATE → GATE → BOUNDARY → ISOLATE → SEAL**, in-process
sandbox simulator (NO real Docker/daemon), filesystem root prison, env
scrubbing, process timeout, network block, optional L9/L10 compute-worker
injectable ports (**compose/extend, do not rewrite** L9/L10 / AX/AY/AZ),
fail-closed DENY on path escape / network egress / Fundacion / timeout /
policy breakout, and sealed EVD-style receipts (sha256 via `node:crypto`).
Additive under `src/core/developer-engine/` — **does not** implement BB,
**does not** flip PRODUCTION_READY, **does not** use CloudAgent, **does not**
claim K8s multi-tenant cloud / managed container SaaS / CloudAgent remote fleet.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `a4c79e4` (full `a4c79e4bcf8b74043353925ec2a9712fec6c440d`) |
| Branch | `grok/mission-ba-local-sandboxed-container-worker-isolation` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ba` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ba-payload` |
| Ladder 17 | **CLOSED** — never reopen |
| Ladder 18 | **OPEN** — AX+AY+AZ MEASURED; BA this mission; BB pending |
| Commit | `feat(engine): Local Sandboxed Container / Worker Isolation Port (SPEC-0058)` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `BA_PRODUCTION_READY='NO'` |
| K8s multi-tenant cloud | **NON-CLAIM** |
| managed container SaaS | **NON-CLAIM** |
| CloudAgent remote fleet | **NON-CLAIM** — Antigravity-first |
| BB | **NOT implemented** in this mission |
| L9/L10 / AX/AY/AZ rewrite | **NOT done** — optional injectable ports / fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Kind | `eos-local-sandboxed-container-worker-isolation` |
| Codes | `OK`, `COMPLETED`, `DENY`, `ESCAPE_DENY`, `NETWORK_DENY`, `FUNDACION_DENY`, `POLICY_DENY`, `TIMEOUT_DENY`, `INVALID_REQUEST`, `MISSING_DEP`, `ARTIFACT_NOT_ALLOWLISTED` |
| Tests | `tests/eos-ba-local-sandbox-container-port.test.js` (BA1–BA18) |
| Scripts | `test:local-sandbox-port` / `test:mission-ba` |
| Slim | exclude `eos-ba-local-sandbox-container-port.test.js` (≤145) |
| Patcher | `scripts/patch-mission-ba.mjs` (CRLF-safe) |

## EARS (L18 audit §BA)

1. WHEN developer-engine or self-repair step needs isolated execution → Local Sandboxed Container / Worker Isolation Port runs it + sealed receipt.
2. IF sandbox attempts policy escape, disallowed network egress, or Fundacion paths → DENY + sealed receipt.
3. WHILE isolation active → no K8s multi-tenant / managed SaaS claim.

## Law VI (CRITICAL)

In Law VI audit test, scan **ONLY** `MODULE_DIR` = `src/core/developer-engine`
(the BA modules). **Do NOT** scan the whole `tests/` directory (forensic
fixtures may contain patterns). Documented in BOX_GREEN and this release.

## Artifacts

- `src/core/developer-engine/local-sandbox-container-port.js`
- `src/core/developer-engine/sandbox-boundary.js`
- `src/core/developer-engine/isolation-receipt.js`
- `src/core/developer-engine/sandbox-policy-gate.js`
- `tests/eos-ba-local-sandbox-container-port.test.js`
- `scripts/patch-mission-ba.mjs`
- `openspec/changes/eos-mission-ba-local-sandboxed-container-worker-isolation/`
- `PACKAGE_SCRIPTS_NOTE.md`
- `MISSION_BA_BOOTSTRAP.ps1`

## Verify (box)

```bash
node --test tests/eos-ba-local-sandbox-container-port.test.js
node --check src/core/developer-engine/*.js
```

Host bootstrap NOT run in box (Antigravity-first payload-only).

## MEASURED (box-green)

See `BOX_GREEN.md` in payload root.
