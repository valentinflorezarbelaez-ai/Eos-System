# EOS Post-L26 Workstream D — Evidence Trail Ritual Binding CL↔CM↔CN

**Status:** `DESIGN_READY` (docs-only; CLI **not** implemented)  
**Date:** 2026-09-19 (America/Bogota)  
**Owner:** Valentin Florez  
**Track:** Post-L26 perfection backlog Workstream D (ADR-0059)  
**ADR:** ADR-0065  
**Host machineId:** `77c24295-69bc-4113-82ab-1d8f0359a5e7`  
**Host path:** `C:\Users\valen\Documents\Eos system`  
**PRODUCTION_READY:** **NO**  
**Fundacion:** **Δ=0** · Law VI held  
**L17–L26:** **CLOSED** — never reopen · **L27:** not started  

---

## 0. Guardrails / NON-CLAIMS

| Claim class | Statement |
| :--- | :--- |
| Scope | Design note + sample fixture only. **No** `eos evidence:trail` CLI lands in this package. |
| Host | No trail is generated on the Windows host by this package. No CL/CM/CN state is changed. |
| Ports | Sample trail demonstrates **append-only linkage** using already-**MEASURED** L26 seal facts (CL, CM, CN). It does **not** assert any pending port closed, does **not** reopen L26, and does **not** start L27. |
| Production | `PRODUCTION_READY=NO` remains permanent until an explicit human flip; this package performs no flip. |
| Fundacion | Fundacion Δ=0; no Fundacion writes. |
| Complexity | Schema is **inline** (and mirrored under `fixtures/`). **No** new `docs/schemas/**/*.json` — COMPLEXITY_BUDGET schemas already **35/35 AT_CEILING**. |
| Security product | Trail ritual ≠ WORM SaaS / ≠ external audit product / ≠ SIEM / ≠ Sigstore / ≠ GHE enforcement. |
| Implementation | Implementation requires **separate** human approval after design review. |

---

## 1. Intent

Define a **traceable evidence trail ritual** that binds Mission CL (Spec↔Code Traceability), Mission CM (Evidence Binding & Claim Custody), and Mission CN (Governed Artifact / SBOM Attestation) into a single append-only, fail-closed, machine-readable chain — **before** any CLI is implemented.

Future command sketch: `eos evidence:trail` (NOT implemented here).

**Why:** CL, CM, and CN each already seal nine-field SHA-256 receipts (`CL-RCPT-*`, `CM-RCPT-*`, `CN-RCPT-*`) with intra-port `prevReceiptHash` chains and optional cross-port digests (`linkDigest` on CM claims). Operators lack a single ritual document that:

1. Names the **cross-port** append-only order CL → CM → CN.
2. Carries port identity, revision/freeze identity, timestamp, operator, inputs, outputs, and **explicit non-claims**.
3. Fails closed on missing / dirty / mismatched / unverifiable links.
4. Records retention, review/approval points, and replay/duplication defenses.

---

## 2. Ritual overview (CL → CM → CN)

```text
Operator intent + freeze/HEAD honesty
        │
        ▼
┌───────────────────────────────────────┐
│ CL  Spec↔Code Traceability            │
│ SPEC-0095 · CL-RCPT-* · linkDigest    │
└───────────────────┬───────────────────┘
                    │ prevLinkHash / clReceiptHash
                    ▼
┌───────────────────────────────────────┐
│ CM  Evidence Binding & Claim Custody  │
│ SPEC-0096 · CM-RCPT-* · claims bind   │
│ (optional linkDigest → CL)            │
└───────────────────┬───────────────────┘
                    │ prevLinkHash / cmReceiptHash
                    ▼
┌───────────────────────────────────────┐
│ CN  Artifact / SBOM Attestation       │
│ SPEC-0097 · CN-RCPT-* · digests only  │
└───────────────────┬───────────────────┘
                    │ trailSealHash
                    ▼
        EvidenceTrail document (this ritual)
        decision: PASS | DENY (fail closed)
```

**Order is mandatory.** A trail that presents CN before CM, or CM without a prior CL link when the plan requires it, is **DENY**.

**Out of scope for this ritual (by design):** CO / CP receipts. Those are MEASURED under L26 closeout but are **not** part of Workstream D's CL↔CM↔CN binding. Extending the trail to CO/CP requires a separate ADR.

---

## 3. Schema (inline — NOT a new docs/schemas/*.json)

> **Budget honesty:** Q4 COMPLEXITY_BUDGET schemas = **35/35 AT_CEILING**. This design **must not** add `docs/schemas/**/*.json`. Canonical schema lives in this section; a normative sample instance lives at `fixtures/evidence-trail-cl-cm-cn.sample.json`. An optional non-counted draft may live under `fixtures/` only (never under `docs/schemas/`).

### 3.1 Top-level `EvidenceTrail` object

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `kind` | string | yes | Constant: `eos-evidence-trail-cl-cm-cn` |
| `schemaVersion` | string | yes | Semver of this ritual schema; sample uses `0.1.0-design` |
| `trailId` | string | yes | Unique id; prefix `EVD-TRAIL-` + opaque suffix |
| `decision` | enum | yes | `PASS` \| `DENY` |
| `timestamp` | string | yes | ISO-8601 with offset (prefer America/Bogota local or Z) |
| `operator` | object | yes | See §3.2 |
| `portIdentity` | object | yes | See §3.3 |
| `revisionFreezeIdentity` | object | yes | See §3.4 |
| `links` | array | yes | Ordered length **3**: `[CL, CM, CN]` — see §3.5 |
| `inputs` | object | yes | See §3.6 |
| `outputs` | object | yes | See §3.7 |
| `nonClaims` | string[] | yes | Explicit non-claims; must include PRODUCTION_READY=NO and Fundacion Δ=0 |
| `appendOnly` | object | yes | See §3.8 |
| `security` | object | yes | See §3.9 |
| `productionReady` | string | yes | Constant `"NO"` |
| `fundacionDelta` | number | yes | Constant `0` |
| `trailSealHash` | string \| null | no* | SHA-256 over canonical seal body (§3.10). *Required for PASS in a future implementation; sample may use a documented placeholder. |
| `reasons` | string[] | no | Required when `decision=DENY` |
| `sampleOnly` | boolean | no | `true` on design fixtures — never treat as live host trail |

### 3.2 `operator`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | string | yes | Operator identity (local governed handle; not a secret) |
| `role` | string | yes | e.g. `owner`, `reviewer`, `observer` |
| `machineId` | string | yes | Host machineId when trail is generated on host; sample may echo known host id |

### 3.3 `portIdentity`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `ladder` | number | yes | `26` |
| `ladderStatus` | string | yes | `CLOSED_FOR_LOCAL_GOVERNED_USE` (post-seal fact) |
| `ports` | array | yes | Exactly three entries, ordered CL → CM → CN |

Each `ports[]` entry:

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `port` | enum | yes | `CL` \| `CM` \| `CN` |
| `specId` | string | yes | `SPEC-0095` / `SPEC-0096` / `SPEC-0097` |
| `mission` | string | yes | Mission code |
| `receiptKind` | string | yes | `eos-spec-code-traceability-receipt` / `eos-evidence-binding-receipt` / `eos-artifact-attestation-receipt` |
| `receiptPrefix` | string | yes | `CL-RCPT-` / `CM-RCPT-` / `CN-RCPT-` |
| `l26Status` | string | yes | Must be `MEASURED` for PASS (post-L26 seal fact) |
| `npmScript` | string | yes | `test:mission-cl` / `test:mission-cm` / `test:mission-cn` |

### 3.4 `revisionFreezeIdentity`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `freezeMainTip` | string | yes | Full SHA of L26 freeze tip (Mission CP seal) |
| `tipSealSha` | string | yes | Tip honesty seal #366 SHA |
| `tipSealPr` | number | yes | `366` |
| `headSha` | string \| null | yes | Observed HEAD at trail time; `null` if unmeasured → **DENY** for live trails |
| `headFreezeLag` | string | yes | `ALIGNED` \| `AHEAD` \| `BEHIND` \| `DIVERGED` \| `UNMEASURED` |
| `dirtyTree` | boolean | yes | `true` → live trail **DENY** |
| `hostPath` | string | no | Absolute host path when known |

### 3.5 `links[]` — append-only CL → CM → CN hop

Each link (exactly one per port, in order):

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `seq` | number | yes | `1` (CL), `2` (CM), `3` (CN) |
| `port` | enum | yes | Must match seq mapping |
| `receiptId` | string | yes | `CL-RCPT-*` / `CM-RCPT-*` / `CN-RCPT-*` |
| `receiptHash` | string | yes | Port receipt seal hash (hex SHA-256) |
| `planId` | string | yes | Port plan id that produced the receipt |
| `decision` | enum | yes | Port decision; trail PASS requires all three `PASS` |
| `timestamp` | string | yes | Receipt timestamp |
| `inputsDigest` | string | yes | Digest of that hop's inputs (nodes/claims/artifacts) |
| `outputsDigest` | string | yes | Digest of that hop's outputs / binding / attestation |
| `prevLinkHash` | string \| null | yes | `null` for CL (seq=1); else SHA-256 of prior link seal body |
| `crossPortRefs` | object | yes | See below |
| `explicitNonClaims` | string[] | yes | Hop-local non-claims (may mirror port ADR) |

`crossPortRefs`:

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `clLinkDigest` | string \| null | CM/CN | On CM: optional/required `linkDigest` pointing at CL nodesDigest/receiptHash per plan policy. On CL: null. |
| `cmClaimsDigest` | string \| null | CN | On CN: reference to upstream CM `claimsDigest` when attestation binds claims. On CL/CM as producer: may echo self. |
| `priorReceiptHash` | string \| null | yes | Intra-port `prevReceiptHash` from the sealed receipt (may be null for first receipt in port) |

### 3.6 `inputs`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `clPlanRef` | string | yes | Path or id of CL link plan / evidence used |
| `cmPlanRef` | string | yes | Path or id of CM bind plan |
| `cnPlanRef` | string | yes | Path or id of CN attest plan |
| `evidencePaths` | string[] | yes | Relative paths of EVD / receipt fixtures consulted |
| `fixtureMode` | boolean | yes | `true` if inputs are design fixtures (this package) |

### 3.7 `outputs`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `trailPath` | string \| null | yes | Where the trail document would be written (null for sample-only) |
| `summary` | string | yes | One-line human summary |
| `linkCount` | number | yes | Must be `3` |
| `verifyResult` | object | yes | `{ ok: boolean, failedAt?: "CL"|"CM"|"CN"|"CHAIN"|"DIRTY"|"FREEZE"|"REPLAY", reason?: string }` |

### 3.8 `appendOnly`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `order` | string[] | yes | Constant `["CL","CM","CN"]` |
| `mutationPolicy` | string | yes | `append-only` — never rewrite prior links |
| `rewriteForbidden` | boolean | yes | `true` |
| `chainRule` | string | yes | Each `links[i].prevLinkHash` must equal hash of `links[i-1]` seal body; CL has `prevLinkHash=null` |

### 3.9 `security`

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `lawVI` | string | yes | `HELD` — no secrets in trail body |
| `replayProtection` | object | yes | See §7 |
| `hashAlg` | string | yes | `sha256` |
| `network` | string | yes | `none` — hermetic; no GH API |

### 3.10 Canonical seal body (for future `trailSealHash`)

Hash these fields only (stable JSON, sorted keys), via `node:crypto` SHA-256:

```text
{
  trailId, decision, timestamp,
  operator.id, operator.machineId,
  portIdentity.ladder, portIdentity.ladderStatus,
  revisionFreezeIdentity.freezeMainTip,
  revisionFreezeIdentity.tipSealSha,
  revisionFreezeIdentity.headSha,
  revisionFreezeIdentity.dirtyTree,
  links: [ { seq, port, receiptId, receiptHash, prevLinkHash } × 3 ],
  productionReady, fundacionDelta
}
```

Attached but **not** in the seal body alone: full `inputs`, `outputs`, `nonClaims`, `reasons`, narrative docs.

### 3.11 JSON Schema draft (informational — fixtures only)

A non-normative draft mirroring the above **may** be placed at:

`fixtures/evidence-trail-cl-cm-cn.schema.draft.json`

**Forbidden:** `docs/schemas/evidence-trail*.json` (would bump AT_CEILING 35/35).

This package ships the **sample instance** only; the draft schema file is optional and omitted by default to minimize surface. Field tables above are SSOT for design review.

---

## 4. CLI UX sketch — future `eos evidence:trail` (NOT implemented)

> Sketch only. No binary, no `package.json` script, no `src/` module in this package.

### 4.1 Commands (proposed)

```text
eos evidence:trail verify --trail <path> [--strict]
eos evidence:trail build  --cl <cl-rcpt.json> --cm <cm-rcpt.json> --cn <cn-rcpt.json> \
                          [--out <path>] [--operator <id>] [--fail-closed]
eos evidence:trail show   --trail <path>
eos evidence:trail doctor --trail <path>   # lag / dirty / non-claim chips
```

### 4.2 Default behavior

- **Fail closed** is the only mode for `verify` and `build` (no `--soft`).
- `build` refuses if `git` dirty (unless `--allow-dirty` is **absent by default** and itself requires a separate ADR to enable).
- `build` refuses if `headFreezeLag` is `BEHIND`, `DIVERGED`, or `UNMEASURED`.
- `verify` recomputes each port receipt hash (via existing CL/CM/CN verifiers when present), recomputes `prevLinkHash` chain, recomputes `trailSealHash`.
- Exit codes (proposed):

| Code | Meaning |
| ---: | :--- |
| 0 | PASS |
| 1 | DENY (generic / policy) |
| 2 | Missing link / evidence |
| 3 | Dirty tree |
| 4 | Freeze/HEAD mismatch or stale |
| 5 | Receipt hash mismatch / unverifiable |
| 6 | Chain / order / replay violation |
| 7 | Schema / kind / productionReady violation |

### 4.3 Operator UX notes

- Always print `NON-CLAIM` chips: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `≠ WORM/SIEM/Sigstore/GHE`.
- Never imply a port is closed beyond `l26Status` already recorded.
- `show` is read-only; never mutates receipts.

### 4.4 Stub docs (optional)

If a host stub is desired later: a one-line `docs/cli/eos-evidence-trail.md` stub pointing at this design. **Not** included in this package to keep surface minimal.

---

## 5. Failure modes (fail closed)

| Mode | Trigger | Decision | Exit (future CLI) |
| :--- | :--- | :--- | ---: |
| Missing link | `links.length ≠ 3` or any port absent | DENY | 2 |
| Missing receipt | `receiptId` / file absent | DENY | 2 |
| Dirty tree | `dirtyTree=true` on live build/verify | DENY | 3 |
| Freeze stale / lag | `headFreezeLag ∈ {BEHIND,DIVERGED,UNMEASURED}` or tip ≠ expected seal | DENY | 4 |
| Mismatched hash | Recomputed `receiptHash` ≠ recorded | DENY | 5 |
| Unverifiable | Port verifier missing / throws / kind mismatch | DENY | 5 |
| Order violation | Not CL→CM→CN | DENY | 6 |
| Chain break | `prevLinkHash` mismatch | DENY | 6 |
| Replay / duplicate | Same `trailId` or identical seal body re-submitted as new | DENY | 6 |
| Cross-port mismatch | CM `linkDigest` ≠ CL digest when required; CN ref ≠ CM digest when required | DENY | 5 |
| Non-claim violation | `productionReady≠"NO"` or `fundacionDelta≠0` or forbidden claim labels | DENY | 7 |
| Schema / kind | Wrong `kind` / `schemaVersion` unsupported | DENY | 7 |
| Port decision DENY | Any hop `decision=DENY` | DENY | 1 |
| Sample-as-live | `sampleOnly=true` presented as host live trail | DENY | 7 |

**Rule:** Ambiguity → DENY. Soft-fail / soak is **FORBIDDEN**.

---

## 6. Retention + review / approval points

### 6.1 Retention (design proposal)

| Artifact | Retain | Notes |
| :--- | :--- | :--- |
| Live `EvidenceTrail` JSON | With mission EVD set; min **2 tip-seal cycles** or **90 days**, whichever longer | Append-only store; no silent overwrite |
| Linked CL/CM/CN receipts | Same retention as trail | Trail without receipts is unverifiable → DENY |
| Design sample fixture | Permanent in repo as **sampleOnly** | Never counted as live custody |
| DENY trails | Retain with `reasons[]` | Required for audit of refusals |

### 6.2 Review / approval points

| Gate | Who | When | Blocks |
| :--- | :--- | :--- | :--- |
| **R0 Design review** | Owner + reviewer | This package | Implementation start |
| **R1 Schema freeze** | Owner | Before coding CLI | Field renames after R1 need new schemaVersion |
| **R2 Implementation ADR** | Owner | Separate ADR (not 0065) | Merge of `src/` CLI |
| **R3 First live trail** | Owner + observer | After hermetic tests green | Treating sample as live |
| **R4 Retention lock** | Owner | Before deleting any trail | Deletion without EVD addendum |

**Human sign-off decision for this package:** design may be accepted for inventory; **implementation remains separately approved**.

---

## 7. Security + replay / duplication

### 7.1 Threat considerations (local governed)

| Threat | Mitigation |
| :--- | :--- |
| Forged receipt | Re-verify `receiptHash` with port canonical seal body + `node:crypto` |
| Reordered hops | Fixed `order` + `seq` + `prevLinkHash` chain |
| Replay of old PASS trail | `trailId` uniqueness registry (future); refuse duplicate `trailSealHash` as new `trailId`; bind `timestamp` + `headSha` |
| Duplicate simultaneous builds | Advisory lock / refuse if dirty; single writer convention |
| Secret leakage | Law VI scan on trail body; DENY if vendor-key prefixes / credentials present |
| Network exfil | Hermetic; `security.network=none`; no GH API |
| Claiming production | Hard constant `productionReady="NO"` |
| Fundacion write | `fundacionDelta=0` + ALWAYS_DENY invariant |
| Sample confusion | `sampleOnly=true` + DENY if used as live |

### 7.2 Replay policy (normative for future CLI)

1. A trail is uniquely identified by `trailId`.
2. Content identity is `trailSealHash`.
3. Re-submitting the same seal body under a **new** `trailId` → DENY (`REPLAY`).
4. Re-verifying an existing trail file in place → allowed (read-only `verify`).
5. Mutating any `links[]` field after seal → DENY (append-only; issue a new trail that **references** prior `trailSealHash` in `inputs` if superseding is ever needed — out of scope for v0.1).

---

## 8. Sample trail (fixture)

Path: `fixtures/evidence-trail-cl-cm-cn.sample.json`

**Semantics:**

- `sampleOnly: true`
- `decision: PASS` **only** as a **design illustration** of a well-formed chain
- Port statuses are the already-**MEASURED** L26 seal facts (CL/CM/CN)
- Digests / receipt ids are **synthetic placeholders** prefixed `SAMPLE-` / obvious hex patterns — **not** host-live custody
- Freeze tip / tip-seal values echo OBSERVED L26 seal pins from backlog/RESULT packages
- `headSha` may be null or a documented sample placeholder with `headFreezeLag: "UNMEASURED"` at package time for the hermetic executor; live host must fill real HEAD before any PASS claim
- Does **not** claim CO/CP inside the trail links
- Does **not** claim `PRODUCTION_READY=YES`
- Does **not** change CL/CM/CN port state

See §5: presenting this sample as a live host trail must **DENY**.

---

## 9. L26 seal facts referenced (OBSERVED / MEASURED — not re-opened)

| Fact | Value | Claim class |
| :--- | :--- | :--- |
| L26 status | `CLOSED_FOR_LOCAL_GOVERNED_USE` | MEASURED (CP closeout + tip seal) |
| Freeze main tip | `47cf1a790c95f78a79e34830c4d6515d16dc67d0` | OBSERVED (tip-post-365 / backlog) |
| Tip-seal PR | `#366` | OBSERVED |
| Tip-seal SHA | `b7b844787cf4703c389751e8c1e0fa063870f5ad` | OBSERVED |
| CL / CM / CN | MEASURED | MEASURED (L26 closeout) |
| CO / CP | MEASURED (out of trail links) | MEASURED |
| Pending ports | none for L26 | OBSERVED backlog |
| PRODUCTION_READY | NO | Constant |

---

## 10. Implementation boundary (separate approval)

**In this package:**

- Design note (this file)
- ADR-0065
- Evidence note
- Sample fixture
- APPLY + RESULT + READY

**Explicitly out:**

- `src/core/**` trail module
- `eos evidence:trail` CLI
- package.json scripts
- Host live trail generation
- New `docs/schemas/*.json`
- Any change to CL/CM/CN port code
- L27 / reopen L17–L26 / Fundacion writes / PRODUCTION_READY flip

---

## 11. DoD checklist (Workstream D)

- [x] Design note with schema, CLI UX sketch, failure modes, retention, review points
- [x] Sample machine-readable trail CL→CM→CN without asserting pending ports closed
- [x] Security and replay/duplication considerations recorded
- [x] Implementation separately approved (not performed here)
- [x] No new `docs/schemas/*.json` (AT_CEILING 35/35 respected)
- [x] PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; hermetic; no git push from executor
