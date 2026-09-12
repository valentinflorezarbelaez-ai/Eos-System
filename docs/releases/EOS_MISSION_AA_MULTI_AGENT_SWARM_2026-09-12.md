# Mission AA — Multi-Agent Swarm Dispatcher (SPEC-0032) — 2026-09-12

## Summary

Fail-closed **Multi-Agent Swarm Dispatcher** that runs Architect → Builder →
Verifier via AgentHandoffEnvelope V3, enforces **BUILDER != VERIFIER**, caps
in-process concurrency (`maxConcurrent` default 1, hard cap 3), gates outbound
text through BoundedOutputFilter (TOKEN_BUDGET_EXCEEDED), and seals
hash-chained handoff receipts (prevHash + sha256). New modules under
`src/core/swarm/` — additive overlay; **does not** open real Fundacion,
**does not** flip PRODUCTION_READY, **does not** use CloudAgent, **does not**
claim unbounded swarm.

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| CloudAgent fleet | **NON-CLAIM** — not CloudAgent fleet |
| Unbounded swarm | **NON-CLAIM** — not unbounded swarm |
| Handoff receipts | **≠** PRODUCTION_READY |
| Dispatcher | **≠** production multi-agent autonomy |
| App Fuerza / Fundacion trees on disk | **untouched** |

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createMultiAgentDispatcher` → dispatch / run / health / getState / getReceipts / getHandoffs |
| Envelope | `validateAgentHandoffEnvelope` — AgentHandoffEnvelope V3 |
| Roles | ARCHITECT\|PLANNER → ARCHITECT; BUILDER\|CODER → BUILDER; VERIFIER\|QA → VERIFIER |
| Separation | BUILDER_EQUALS_VERIFIER fail-closed when builder_id === verifier_id |
| Retry | maxRounds default 2 (clamp ≥1); exhaust → ESCALATED_HITL |
| Tokens | `createBoundedOutputFilter` / filterOutbound / observeTokens |
| Concurrency | maxConcurrent default 1, cap 3; MAX_CONCURRENT_EXCEEDED |
| Ledger | hash-chained receipts; genesis prevHash = 64 zeros |
| AGY / CloudAgent | **NON-CLAIM** — no CloudAgent |

## State machine

`IDLE → PLANNING → BUILDING → VERIFYING → COMPLETED | ESCALATED_HITL | DENIED` (+ BUSY)

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/swarm/agent-handoff-validator.js` | **NEW** |
| `src/core/swarm/multi-agent-dispatcher.js` | **NEW** |
| `tests/eos-aa-multi-agent-swarm.test.js` | **NEW** |
| `scripts/patch-mission-aa.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-aa-payload && node --test tests/eos-aa-multi-agent-swarm.test.js
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AA1–AA16)

Slim exclude `eos-aa-multi-agent-swarm.test.js` + `npm run test:multi-agent-swarm` / `test:mission-aa`.

## Cases

| ID | Result |
| --- | --- |
| AA1 kind + PRODUCTION_READY NO | PASS |
| AA2 happy path architect→builder→verifier | PASS |
| AA3 BUILDER == VERIFIER same id → fail-closed | PASS |
| AA4 invalid envelope rejected by validator | PASS |
| AA5 schema V3 required | PASS |
| AA6 verify fail then recover within budget | PASS |
| AA7 exhaust rounds → ESCALATED_HITL | PASS |
| AA8 token budget exceeded via BoundedOutputFilter | PASS |
| AA9 role alias normalization | PASS |
| AA10 maxConcurrent / busy fail-closed | PASS |
| AA11 handoff receipt chain / custody | PASS |
| AA12 NON-CLAIM source strings | PASS |
| AA13 missing persona fail-closed | PASS |
| AA14 planner/coder/qa alias dispatch | PASS |
| AA15 custody optional + invalid custody | PASS |
| AA16 BoundedOutputFilter helpers | PASS |

## Package scripts (exact)

```json
"test:multi-agent-swarm": "node --test tests/eos-aa-multi-agent-swarm.test.js",
"test:mission-aa": "node --test tests/eos-aa-multi-agent-swarm.test.js"
```

SLIM_SUITE_EXCLUDES entry: `'eos-aa-multi-agent-swarm.test.js'`

Applied on host by `scripts/patch-mission-aa.mjs` (idempotent).

## API (public)

```js
import {
  createMultiAgentDispatcher,
  createBoundedOutputFilter,
  validateAgentHandoffEnvelope,
  normalizeRole,
  DISPATCHER_KIND,
  DISPATCHER_PRODUCTION_READY
} from './src/core/swarm/multi-agent-dispatcher.js';

const d = createMultiAgentDispatcher({
  architect: { id: 'a1', run: async ({ change }) => ({ ok: true, plan: {...} }) },
  builder:   { id: 'b1', run: async ({ plan }) => ({ ok: true, artifact: {...} }) },
  verifier:  { id: 'v1', run: async ({ artifact }) => ({ ok: true }) },
  maxRounds: 2,
  maxConcurrent: 1,
  tokenBudget: 4096
});

const result = await d.dispatch({ changeId: 'eos-mission-aa-…' });
// result.ok, .reason, .handoffs, .roundsUsed, .PRODUCTION_READY:'NO'
```

Aliases accepted: `planner`/`coder`/`qa` ports; `plan`/`build`/`verify` method names.

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: starts with `8604014` (Mission Z on main; tip refresh post-#188 may move)
- **NON-CLAIM:** not CloudAgent fleet; not unbounded swarm; not PRODUCTION_READY
- No AI commit attribution

## Branch

`grok/mission-aa-multi-agent-swarm-dispatcher`

## Payload

`/workspace/Eos-mission-aa-payload/` (host: `C:\Users\valen\Documents\Eos-mission-aa-payload`)
