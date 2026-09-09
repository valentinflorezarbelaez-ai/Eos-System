# Design — eos-ladder7-lidr-harness-adoption

## Approach

Docs-only audit branch mirroring Ladder 2–6 audit pattern:

1. Adoption map LIDR → EOS (Spanish) with quoted sources + NON-CLAIMS.
2. Maturity Ladder 7 audit with tip probe (4753240 vs e431e2c), closed table through #73, gaps S1–S6, recommend S1.
3. Freeze appendix section for L7 audit; **do not** edit `main_tip` / EXPECTED_TIP / matrix evaluated_tip.
4. OpenSpec change records the ladder proposal for substantial docs (base-standards / ADR-0010).

## Mapping new workshop concepts → ladder

| Concept | Ladder fold |
| --- | --- |
| Context lifecycle inject/compact/discard/reset | S2 index + S3 loop policy |
| 4-quadrant guides/sensors | S3 DoD |
| Ratchet error→control | S6 ritual (primary); surfaces in S3/S5 |
| Spec-Boot flow/skills/symlinks | Cite in adoption; S2/S4/S6 map without fork |
| Tool prune "¿Qué puedo dejar de hacer?" | S5 KEEP inventory |
| Token tools rtk/… | Adoption NON-CLAIM; install OUT OF SCOPE |

## Risks

- Over-claiming workshop depth without transcript → mitigated by citing blogs/Notion/Spec-Boot URLs only.
- Accidentally refreshing tip → explicit NON-goal; freeze section states pin unchanged until S1.

## Verification (this branch)

- Files exist; OpenSpec artifacts present; freeze tip still `4753240…`; PRODUCTION_READY still NO; Fundacion porcelain empty; DEFER dirty unstaged.
