# EOS AUTHORITY AND HITL WIRING SPECIFICATION
**Document ID:** `SPEC-EOS-AUTHORITY-HITL-2026`  
**Classification:** `AUTHORITY_AND_HITL_SPECIFICATION`  
**Enforcers:** `AuthorityTruthSource` + `HitlGatekeeper`  

---

## 1. Monotonic Authority Hierarchy

EOS recognizes four distinct, non-overlapping authority tiers:

| Authority Level | Token | Scope & Capabilities | Enforced Gate |
|---|---|---|---|
| **A0: Director / Observer** | `LEVEL_0` | Read-only discovery, context compilation, status inspection, telemetry. Zero filesystem or ledger mutations. | Tool Gate: `sideEffects === 'NONE' \|\| 'READ_ONLY'` |
| **A1: Autonomous Engineer** | `LEVEL_1` | Local scaffolding, unit test runs, TDD auto-healing, ledger event appending within `.missions/<id>/`. | Tool Gate: `sideEffects === 'LEDGER_WRITE'` |
| **A2: Reviewer / Approver** | `LEVEL_2` | Promotion to production review, external package deployment, FDIR safe mode tripping. | Tool Gate: Requires cryptographically signed HITL approval receipt. |
| **A3: Sovereign PO** | `LEVEL_3` | Constitution mutation, cursorrules changes, write barrier expansion, external repository write authorization. | Human Owner exclusive. Autonomous bypass strictly impossible. |

---

## 2. HITL Approval Receipt Contract

Advancing from `PLAN` to `TASK_DAG` or executing any `A2+` mutation requires a cryptographically valid HITL Receipt:

```json
{
  "receipt_id": "HITL-RCP-20260827-XXXX",
  "mission_id": "MIS-2026-XXXX",
  "decision": "APPROVED",
  "approved_by": "HUMAN_DIRECTOR",
  "target_action": "PROMOTE_PLAN_TO_TASK_DAG",
  "plan_hash": "sha256-403bd85eb3b40de6967489469a13274a4126a62dac8fc438c59b2fdeff43e017",
  "nonce": "NONCE-8F9E2A",
  "timestamp": "2026-08-27T21:00:00.000Z",
  "signature": "sha256-..."
}
```

### Anti-Replay & Anti-Forgery Invariants:
1. **Binding:** Receipt is bound to the exact `plan_hash` of the specification. Any edit to `spec.md` invalidates the receipt immediately.
2. **Anti-Replay:** Nonce is marked `CONSUMED` in `AuthorityTruthSource` after single use.
3. **Reasoning $\neq$ Authority:** An LLM agent asserting `"I approve this plan"` in chat does NOT generate a valid receipt. Only a structured call signed by the human operator satisfies the gate.
