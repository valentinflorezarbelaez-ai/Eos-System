# Proposal — Mission BA Local Sandboxed Container / Worker Isolation Port (SPEC-0058)

## Why

Developer-engine and self-repair steps that need isolated execution require a
**local**, fail-closed sandbox / worker isolation port with sealed receipts —
without claiming K8s multi-tenant cloud, managed container SaaS, or a
CloudAgent remote fleet.

## What

- `runIsolated({ step, rootPrison, allowlist, timeoutMs, networkPolicy, ports })`
  → validate → gate → boundary → isolate → seal
- Hermetic in-process sandbox simulator (NO real Docker/daemon)
- Filesystem root prison, env scrubbing, process timeout, network block
- Sealed sha256 receipts
- Optional injectable `computeWorker` / `l9Worker` / `l10Isolation` (compose
  L9/L10; do not rewrite) plus AX/AY/AZ ports

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED; L18 OPEN; AX+AY+AZ MEASURED; BB pending
- Law VI audit scans **MODULE_DIR only** (`src/core/developer-engine`)

## Out of scope

BB; rewriting L9/L10/AX/AY/AZ; Fundacion writes; CloudAgent; real Docker;
flipping PRODUCTION_READY.
