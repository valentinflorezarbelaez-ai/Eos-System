# EOS U3 Doctor / fusion-light superficies T4–T8 - 2026-09-09

**Branch:** cursor/eos-u3-doctor-fusion-light-t4-t8
**Base main tip:** 782c6123c9d12175ce4bdead2c8e15e8e88f6b54 (U2 #93 merged)
**Alcance:** U3 ONLY (Ladder 9 K3) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only; HITL en navegador)
**AT_CEILING:** yes (no new docs/schemas JSON)

## Objetivo (U3 / K3 DoD)

Cerrar el hueco de honestidad operador entre doctor OBSERVED y verify DENY surfaces de T4–T8.

1. Extender POST_FUSION_CRITICAL_PATHS con MISSION_OS_EVD + KEEP_PO_PRUNE_HOLD + COMPLEXITY_CEILING_HOLD + AGY_WORKSTATION + DIRTY_DEFER_TRIAGE
2. Subconjunto fusion-light opcional con light exports (audit*Lock / observe-pack exports + REQUIRED_PATHS; sin ejecutar audits completos)
3. NON-CLAIM: doctor no equivale a verify:strict
4. Tests PASS; PRODUCTION_READY=NO
5. Evidencia docs/releases/; freeze U3; dirty DEFER

## Entregables

1. operator-doctor.js T4–T8 paths + DOCTOR_NON_CLAIMS
2. independent-fusion-light.js T4–T8 ids + light exports
3. tests eos-u3 + script test:u3
4. Ajuste n3/n5/q3/r3/t3 fixtures
5. verify-eos REQUIRED_PATHS U3
6. Esta nota + freeze U3 + matrix MEASURED
7. Dirty DEFER sin stage; no silent MCP prune

## Verificacion

- test:u3
- test:n3
- test:n5
- test:q3
- test:r3
- test:t3
- eos:doctor (opcional)
- verify:independent (opcional)

## No-claims

- Doctor no equivale a verify:strict (OBSERVED presencia/light).
- Fusion-light U3 no ejecuta audits completos de mission-os-evd / keep-po-prune-hold / complexity-ceiling-hold / agy-workstation / dirty-defer-triage.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin U4+ en esta rama.
- Compare-only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
- Inventory≠prune; HOLD≠executed prune; triage≠mass delete; CloudAgent out of SpecBoot default.
