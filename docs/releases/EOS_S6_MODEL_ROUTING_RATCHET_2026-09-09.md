# EOS S6 Model routing + ratchet ritual - 2026-09-09

**Branch:** `cursor/eos-s6-model-routing-ratchet`
**Base tip:** origin/main @ `bf8b5b8` (tip #80 `7efb8b9` + S5 #81; linear stack post-merge)
**Alcance:** S6 ONLY (Ladder 7 K6) — EOS-only, **docs guidance + verify lock**
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only)
**Auto model switcher / middleware:** FORBIDDEN in this change set (guidance only)
**AT_CEILING:** no new `docs/schemas` JSON
**Silent MCP/tool delete:** FORBIDDEN

---

## 1. Goal (S6 / K6 DoD)

1. Doc routing by **task class → model tier** (Antigravity-first).
2. Doc **ratchet ritual** error→control (LIDR / Hashimoto; AGENTS/hooks/CI evals/cost+fail logs/subagents).
3. Light ADR-0018.
4. Verify lock fail-closed + `test:s6` meta-test presence.
5. NON-CLAIM: no auto model switch without evidence; ritual ≠ self-heal; no whiplash-solved claim; PRODUCTION_READY=NO; Fundacion Delta=0.

---

## 2. Deliverables (evidence)

| Artifact | Path |
| --- | --- |
| Model routing SSOT | `docs/harness/MODEL_ROUTING.md` |
| Ratchet ritual SSOT | `docs/harness/RATCHET_RITUAL.md` |
| ADR | `docs/architecture/adrs/ADR-0018-model-routing-ratchet.md` |
| Lock | `scripts/lib/model-routing-ratchet-lock.js` |
| Test | `tests/eos-s6-model-routing-ratchet.test.js` (`npm run test:s6`) |
| OpenSpec | `openspec/changes/eos-s6-model-routing-ratchet/` |
| verify:strict seam | block **3g15** in `scripts/verify-eos.js` |

---

## 3. Verify lock

Lock checks:

- Both harness docs exist.
- Required section needles present (task classes FAST/HIGH; ritual steps; control classes).
- PRODUCTION_READY: NO on both docs.
- NON-CLAIM no auto model switch / guidance≠auto-router.
- NON-CLAIM ritual≠autonomous self-heal.
- Companion paths (ADR, test, evidence, OpenSpec proposal) exist.

---

## 4. Freeze note

- Freeze `main_tip` pin **not** moved in S6 (main already carries tip #80 + S5 #81 @ bf8b5b8; S6 does not retip).
- Matrix row: Model routing + ratchet (S6) → MEASURED on this evidence.
- DEFER dirty unstaged files left untouched.

---

## 5. Fundacion / AT_CEILING / tools

- **Fundacion:** Delta=0 (no writes).
- **AT_CEILING:** no new `docs/schemas` JSON.
- **MCP catalog:** untouched (S5 KEEP inventory remains inventory-only; no silent delete).

---

## 6. NON-CLAIM / Non-claims

- Guidance ≠ runtime auto-router; **no auto model switch without evidence**.
- Ratchet ritual ≠ autonomous self-heal; adding a control ≠ proof error class never recurs.
- Ritual ≠ verify:strict; doctor ≠ verify.
- Does **not** claim whiplash METR/Faros solved.
- Does **not** claim PRODUCTION_READY.
- Does **not** open/merge PR in this step.
- organic-routing-gate = SDD ceremony routing — **not** model auto-router.

---

## 7. Related

- L7 audit S6 row: `docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`
- LIDR adoption §2.4 ratchet: `docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`
- Antigravity-first: `docs/harness/ANTIGRAVITY_FIRST.md`
- Token economics §4 phase matrix (numbers SSOT): `docs/architecture/EOS_TOKEN_ECONOMICS_AND_HARNESS_OPTIMIZATION.md`
