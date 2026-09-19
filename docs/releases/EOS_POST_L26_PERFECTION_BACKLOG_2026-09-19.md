# EOS Post-L26 Perfection Backlog

**Status:** `AUTHORIZED_ENTRY` — Ladder 26 sealed `CLOSED_FOR_LOCAL_GOVERNED_USE` at main tip `47cf1a79` (Mission CP #365) + tip honesty seal #366 (`b7b84478`).
**Owner:** Valentin Florez
**Track:** EOS perfection, after L26 seal

## Guardrails / NON-CLAIMS

- Ladder 26 is **CLOSED** (`CLOSED_FOR_LOCAL_GOVERNED_USE`; CL+CM+CN+CO+CP MEASURED + seam-pack + closeout). Seal evidence: Mission CP #365 @ `47cf1a79` + tip-seal #366 @ `b7b84478`. This backlog does **not** reopen L26 and does **not** start L27.
- L17–L25 remain `CLOSED` and must never be reopened.
- `PRODUCTION_READY=NO` remains permanent until an explicit human flip; this package performs no flip.
- Do not start L27 without a completed docs-only audit of this backlog and its evidence.
- This is a docs-only proposal. No host files, repository, deployment, or production state are changed.

## Ordered workstreams

### A) Complexity prune inventory

**Intent:** Make excess surface area visible before deleting or consolidating anything.

**Inventory:** `AT_CEILING` items; orphan scripts; duplicate or superseded docs; stale apply packs; ownership and dependency edges.

**DoD**
- A dated inventory exists with path, category, owner, dependency risk, and disposition (`retain`, `merge`, `archive`, `delete-later`).
- `AT_CEILING` items have an explicit no-growth rationale.
- Every proposed removal has a replacement/evidence link or is marked blocked.
- No deletion is performed by this backlog package.

**Evidence needed:** inventory export, duplicate comparison, references/consumer scan, human review record, and a before/after count proposal.

**NON-CLAIM:** An inventory is not proof that an item is safe to remove.

### B) Doctor + HUD honesty surfaces

**Intent:** Ensure status surfaces describe reality rather than implying a seal or readiness.

**Required surfaces:** freeze-vs-HEAD lag; dirty-defer state; explicit `NON-CLAIM` chips; pending-port visibility.

**DoD**
- Doctor and HUD show source revision/freeze revision and measurable lag when they differ.
- Dirty state defers or blocks an optimistic result and explains the reason.
- `NON-CLAIM` chips appear wherever closure, production readiness, or evidence completeness is not established.
- Tests cover clean, dirty, frozen, HEAD-lagging, and pending-port states.

**Evidence needed:** screenshots or machine-readable snapshots, fixture matrix, test output, and review of wording against the L26 evidence ledger.

**NON-CLAIM:** Better display text does not close L26 or make `PRODUCTION_READY` true.

### C) Local CI surrogate hardening

**Intent:** Provide a repeatable local gate while GitHub Actions is billing-blocked.

**DoD**
- `verify:strict` is runnable locally with documented prerequisites and deterministic exit behavior.
- Mission packs are the single source of truth (SSOT) for the surrogate gate; drift is detected, not silently tolerated.
- The gate records billing-blocked CI as an environment limitation, not as a passing CI result.
- A failure matrix covers missing evidence, dirty tree, stale freeze, and mission-pack drift.

**Evidence needed:** command transcript, version/toolchain pins, mission-pack hashes or equivalent identity, pass/fail fixtures, and a billing-blocked note.

**NON-CLAIM:** Local success is not GitHub Actions success and is not production readiness.

### D) Evidence trail ritual binding CL↔CM↔CN (design only)

**Intent:** Define a traceable ritual before implementation.

**Sketch:** `eos evidence:trail` would validate an append-only linkage from CL evidence to CM evidence to CN evidence, with port identity, revision/freeze identity, timestamp, operator, inputs, outputs, and explicit non-claims. It should fail closed on missing, dirty, mismatched, or unverifiable links.

**DoD**
- A design note specifies schema, CLI UX, failure modes, retention, and review/approval points.
- A sample trail demonstrates CL→CM→CN linkage without asserting any pending port is closed.
- Security and replay/duplication considerations are recorded.
- Implementation is separately approved; no CLI is added by this document.

**Evidence needed:** design review, sample machine-readable trail, negative-case examples, and a human sign-off decision.

**NON-CLAIM:** The command is only a design sketch here; no trail is generated and no CL/CM/CN state is changed.

### E) SpecBoot harness friction reduction

**Intent:** Reduce manual ceremony while increasing fail-closed behavior.

**DoD**
- A step-by-step friction inventory identifies manual copy/paste, repeated checks, and ambiguous operator decisions.
- Safe automation proposals preserve explicit human gates for seal and readiness claims.
- Missing prerequisites, stale inputs, dirty state, and ambiguous ownership fail closed with actionable diagnostics.
- A minimal harness test matrix proves both happy path and refusal path.

**Evidence needed:** friction log, proposed sequence diagram, failure transcripts, operator review, and reproducible harness fixtures.

**NON-CLAIM:** Fewer manual steps do not authorize automatic closure or a production flip.

### F) Fundacion Δ=0 game-day drill across L26 ports

**Intent:** Practice a zero-delta (`Δ=0`) evidence/reconciliation drill across the full L26 port set: CL, CM, CN, CO, CP.

**DoD**
- A scheduled dry run defines baseline, observer, inputs, stop conditions, and rollback/no-write boundaries for every port.
- The drill reconciles expected vs observed artifacts and records `Δ=0` only when independently checked.
- Any mismatch, missing artifact, dirty input, or pending status is surfaced and blocks a green conclusion.
- A retrospective captures gaps and backlog updates without reopening L17–L25.

**Evidence needed:** run sheet, per-port artifact manifest, independent reconciliation, timestamps, observer sign-off, mismatch log, and retrospective.

**NON-CLAIM:** A successful game-day drill is not an L26 seal and does not change `PRODUCTION_READY`.

## Entry and exit gates

**Entry:** L26 seal confirmed (CP #365 + tip-seal #366). Docs-only package may land. Parent still selects which workstreams to execute and when.

**Exit:** all selected workstreams have DoD evidence, unresolved risks are recorded, and a human decides whether any implementation work may begin. Do not start L27 without the docs-only audit. Never flip `PRODUCTION_READY` from this package.
