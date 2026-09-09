# Delta Spec — ladder7-lidr-harness-adoption

## Requirement: Ladder 7 audit documents LIDR harness adoption gaps

The system SHALL publish an audit document that:

1. Records tip honesty gap between freeze pin `4753240eb003ecb3948e17d93e5511a7b35a40f0` and live main tip post R6.
2. Orders next work as S1–S6 with one-line Definitions of Done.
3. Folds LIDR concepts into DoD: context lifecycle (S2/S3), four-quadrant guides/sensors (S3), ratchet error→control (S6), MCP/tool KEEP (S5), worktree policy+smoke (S4).
4. States dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE and PRODUCTION_READY=NO.
5. Does NOT implement S1–S6 on the audit branch and does NOT change freeze `main_tip`.

## Requirement: Adoption evidence document

The system SHALL publish a Spanish adoption document citing:

- https://lidr.notion.site/material-workshop-harness-engineering-202609
- https://www.lidr.co/grabacion-workshop-harness-engineering/
- https://www.lidr.co/blog/que-es-harness-engineering/
- https://www.lidr.co/blog/como-ahorrar-tokens-en-desarrollo-de-software/
- https://github.com/LIDR-academy/lidr-specboot

with explicit NON-CLAIMS (no PRODUCTION_READY; adoption ≠ fusion rewrite; Fundacion untouched; no "solves any problem"; external tool/cache figures are material claims).

## Requirement: Freeze gate L7 note

The freeze gate status document SHALL gain a Ladder 7 audit section noting ordered S1–S6 and that tip refresh is S1 (pin unchanged in this change).
